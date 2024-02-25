const AWS = require('aws-sdk');
const { SageMakerClient, S3Client } = require('@aws-sdk/client-sagemaker');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs')
const config = require('./../config/config')
const Docker = require('dockerode');
const tar = require('tar')
const path = require('path');
const { exec, spawn } = require('child_process');


const createDockerImage = async (filepath, req, res, imageName) => {
    try {
        const docker = new Docker();
        let dockerfilePath = `${req.file.destination}`; // Path to your Dockerfile template

        let normalPath = dockerfilePath
        dockerfilePath = dockerfilePath + '/Dockerfile'

        const dockerfileContent =
            `   FROM python:3.7
            COPY ./${req.file.filename} /app/
            RUN tar -xvf /app/${req.file.filename}
            EXPOSE 8080
            WORKDIR /app
            RUN pip install Flask
            ENTRYPOINT ["python3", "/app/api.py"]`

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

                        let imageId;
                        for (let i = output.length - 1; i >= 0; i--) {
                            let element = output[i];
                            if (element.aux && element.aux.ID) {
                                imageId = element.aux.ID
                                break;
                            }
                        }
                        // let getImg = docker.getImage(encodeURIComponent(imageName));
                        const ecrLoginCommand = `aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 975050334693.dkr.ecr.us-east-2.amazonaws.com`;

                        exec(ecrLoginCommand, (error, stdout, stderr) => {
                            if (error) {
                                console.error('Error getting login command:', error);
                                deleteFolder(normalPath)
                                return;
                            }
                            console.log(`Login command: ${stdout}`);
                            let tagCommand = `docker tag ${imageName} 975050334693.dkr.ecr.us-east-2.amazonaws.com/aiverseecr:${imageName}`
                            exec(tagCommand, (error, stdout, stderr) => {
                                if (error) {
                                    console.error('Error getting tag command:', error);
                                    deleteFolder(normalPath)
                                    return;
                                }
                                console.log(`Tag command: ${stdout}`);
                                let pushCommand = `docker push 975050334693.dkr.ecr.us-east-2.amazonaws.com/aiverseecr:${imageName}`
                                exec(pushCommand, (error, stdout, stderr) => {
                                    if (error) {
                                        console.error('Error getting Push command:', error);
                                        deleteFolder(normalPath)
                                        return;
                                    }
                                    console.log(`Push command: ${stdout}`);
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
        Key: `${req.file.filename}.tar.gz`,
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
        if (!req.file) {
            return res.status(400).send('No files were uploaded.');
        }

        console.log(req.file)

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

        //upload tar file to s3 bucket
        // await uploadToS3(req, filePath)

        //build docker image
        // let imageUri = `aiverseecr:${req.file.filename}-${Date.now()}`
        let imageUri = `${req.file.filename}-${Date.now()}`
        await createDockerImage(filePath, req, res, imageUri)

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
