const AWS = require('aws-sdk');
const fs = require('fs')
const config = require('./../config/config')
const Docker = require('dockerode');
const tar = require('tar')
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const aws4 = require('aws4');


const hostModelToSageMaker = async (s3Filename, imageName) => {
    try {
        const sm = new AWS.SageMaker();
        let s3URL = `${process.env.S3_BUCKET_URI}${s3Filename}`
        let dockerImage = `${process.env.ECR_REPO_URI}${imageName}`
        let modelName = "AIVERSE-MODEL-TEST-UPLOAD-2"
        const createModelParams = {
            ModelName: modelName,
            PrimaryContainer: {
                Image: dockerImage,
                ModelDataUrl: s3URL
            },
            ExecutionRoleArn: process.env.SAGEMAKER_EXECUTION_ROLE_ARN
        };
        const modelResult = await sm.createModel(createModelParams).promise();
        console.log('Model created:', modelResult);

        const createEndpointConfigParams = {
            EndpointConfigName: `${modelName}-config`,
            ProductionVariants: [{
                VariantName: 'default-variant',
                ModelName: modelName,
                InitialInstanceCount: 1,
                InstanceType: 'ml.t2.medium'
            }]
        };
        const endpointConfigResult = await sm.createEndpointConfig(createEndpointConfigParams).promise();
        console.log('Endpoint config created:', endpointConfigResult);

        const createEndpointParams = {
            EndpointName: `${modelName}-endpoint`,
            EndpointConfigName: `${modelName}-config`
        };
        const endpointResult = await sm.createEndpoint(createEndpointParams).promise();
        console.log('Endpoint created:', endpointResult);

        return endpointResult.EndpointArn;
    } catch (error) {
        console.error('Error deploying model:', error);
        throw error;
    }
}

const createDockerImage = async (req, res, imageName) => {
    try {
        const docker = new Docker();
        let dockerfilePath = `${req.file.destination}`; // Path to your Dockerfile template

        let normalPath = dockerfilePath
        dockerfilePath = dockerfilePath + '/Dockerfile'


        // const dockerfileContent =
        //     `   FROM python:3.7
        // COPY ./${req.file.filename} /app/
        // WORKDIR /app/
        // RUN tar -xvf ${req.file.filename} && rm ${req.file.filename}
        // EXPOSE 8080
        // RUN pip install Flask transformers[torch]
        // ENTRYPOINT ["python3", "api.py"]`
        const dockerfileContent =
            `   FROM python:3.7
        COPY ./${req.file.filename} /app/
        WORKDIR /app/
        RUN tar -xvf ${req.file.filename} && rm ${req.file.filename}
        EXPOSE 8080
        RUN pip install --no-cache-dir -r requirements.txt
        ENTRYPOINT ["python3", "api.py"]`

        fs.writeFile(dockerfilePath, dockerfileContent, function (err) {
            if (err) {
                console.log('err.....', err)
                deleteFolder(normalPath)
            }
            console.log('Saved!');
        });

        // Build an image from the Dockerfile
        docker.buildImage(
            { context: normalPath, src: ["Dockerfile", `./${req.file.filename}`] },
            { t: imageName },
            (err, stream) => {
                if (err) {
                    console.error(err);
                    return;
                }

                docker.modem.followProgress(stream, onFinished, onProgress);

                async function onFinished(err, output) {
                    if (err) {
                        console.error(err);
                        deleteFolder(normalPath)
                    } else {
                        console.log("Image built successfully:", output);

                        for (let i = output.length - 1; i >= 0; i--) {
                            let element = output[i];
                            if (element.aux && element.aux.ID) {
                                imageId = element.aux.ID
                                break;
                            }
                        }

                        exec(process.env.ECR_LOGIN_COMMAND, (error, stdout, stderr) => {
                            if (error) {
                                console.error('Error getting login command:', error);
                                deleteFolder(normalPath)
                                return;
                            }
                            console.log(`Login command: ${stdout}`);

                            let tagCommand = `docker tag ${imageName} ${process.env.ECR_REPO_URI}${imageName}`
                            exec(tagCommand, (error, stdout, stderr) => {
                                if (error) {
                                    console.error('Error getting tag command:', error);
                                    deleteFolder(normalPath)
                                    return;
                                }
                                console.log(`Tag command: ${stdout}`);

                                let pushCommand = `docker push ${process.env.ECR_REPO_URI}${imageName}`
                                exec(pushCommand, async (error, stdout, stderr) => {
                                    if (error) {
                                        console.error('Error getting Push command:', error);
                                        deleteFolder(normalPath)
                                        return;
                                    } else {
                                        console.log(`Push command: ${stdout}`);
                                        await hostModelToSageMaker(req.file.filename, imageName)
                                    }
                                    deleteFolder(normalPath)
                                })
                            })
                        });
                    }
                }

                function onProgress(event) {
                    console.log(event);
                }
            }
        );
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
}

const uploadToS3 = async (req, filePath) => {
    const s3 = new AWS.S3();
    const uploadParams = {
        Bucket: config.aws.bucketName,
        Key: `${req.file.filename}`,
        Body: fs.readFileSync(filePath)
    };
    await s3.upload(uploadParams).promise();
}


const deleteFile = (path) => {
    fs.unlink(path, err => {
        if (err) console.log(err)
    })
}
const deleteFolder = (path) => {
    fs.rm(path, { recursive: true, force: true }, err => {
        if (err) {
            throw err;
        }
        console.log(`${path} is deleted!`);
    });
}

exports.hostModelToAWS = async (req, res) => {
    try {
        console.log(req.files)
        if (!req.file) {
            return res.status(400).send('No files were uploaded.');
        }

        console.log("The Uploaded File is : ", req.file)

        // Get the uploaded file path
        let filePath = req.file.path;

        // let destination = req.file.destination

        // // Create a tar.gz archive
        // var archivePath = `${filePath}.tar.gz`;

        // // Create tar stream
        // const tarStream = fs.createWriteStream(archivePath);

        // // Create a tar archive from the uploaded file
        // const files = [req.file.filename];
        // await tar.c({ gzip: true, file: archivePath, cwd: destination }, files);

        // upload tar file to s3 bucket
        await uploadToS3(req, filePath)

        //build docker image

        let imageUri = `${req.file.filename}-${Date.now()}`
        await createDockerImage(req, res, imageUri)

        //save image to ECR
        // await saveToECR(imageUri, req, res)

        //delete the original uploaded file
        // deleteFile(filePath);

        //delete the tar file
        // deleteFile(archivePath);

        // await getRepoConfig()

        res.status(200).json({ message: 'File uploaded and converted successfully.' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};