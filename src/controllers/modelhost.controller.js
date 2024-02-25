const AWS = require('aws-sdk');
const { SageMakerClient, S3Client } = require('@aws-sdk/client-sagemaker');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs')
const config = require('./../config/config')
const Docker = require('dockerode');
const tar = require('tar')
const path = require('path');


// FROM tensorflow:latest

// RUN pip install pandas numpy

// WORKDIR /app

// COPY model.tar.gz /app/model.tar.gz
// COPY serving_script.py /app/serving_script.py

// RUN tar -xvf /app/model.tar.gz -C /app

// EXPOSE 8080

// CMD ["python", "/app/serving_script.py"]


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
        // const dockerfileContent =
        //     `   FROM python:3.7
        //     COPY ./${req.file.filename} /app/
        //     RUN tar -xvf /app/${req.file.filename}
        //     EXPOSE 8080
        //     WORKDIR /app
        //     RUN pip install Flask transformers[torch]
        //     ENTRYPOINT ["python3", "/app/api.py"]`

        fs.writeFile(dockerfilePath, dockerfileContent, function (err) {
            if (err) {
                console.log('err.....', err)
            }
            console.log('Saved!');
        });

        // Build an image from the Dockerfile
        docker.buildImage(
            { context: normalPath, src: ["Dockerfile", `./${req.file.filename}`] },
            { t: imageName },
            // { t: normalPath },
            (err, stream) => {
                if (err) {
                    console.error(err);
                    return;
                }

                docker.modem.followProgress(stream, onFinished, onProgress);

                async function onFinished(err, output) {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log("Image built successfully:", output);

                        let imageId;
                        // output[0]?.stream?.split(' ')[2].trim()
                        for (let i = output.length - 1; i >= 0; i--) {
                            let element = output[i];
                            // if (element.stream && element.stream.includes('Successfully built')) {
                            //     imageId = element.stream.split(' ')[2]
                            if (element.aux && element.aux.ID) {
                                imageId = element.aux.ID
                                break;
                            }
                        }

                        console.log('IMAGE ID OUTPUT : ', output)
                        console.log('IMAGE ID : ', imageId)
                        // let getImg = docker.getImage(imageId);
                        let getImg = docker.getImage(encodeURIComponent(imageName));
                        console.log('GET IMAGE ID.... : ', getImg)
                        console.log('COMPLETE PATH : ', normalPath + '/manifest.json')
                        getImg.inspect(async (err, data) => {
                            if (err) {
                                console.log('Error in inspecting image : ', err)
                            } else {
                                // const manifest = JSON.stringify(data, null, 2)
                                data = {
                                    mediaType: "application/vnd.docker.distribution.manifest.v2+json",
                                    Config: {
                                        // ...data.Config,
                                        mediaType: "application/vnd.docker.container.image.v1+json",
                                        Image: data.Config.Image,
                                        WorkingDir: data.Config.WorkingDir,
                                        Entrypoint: data.Config.Entrypoint,
                                        Env: data.Config.Env
                                    },
                                    schemaVersion: "2",
                                    layers: [...data.RootFS.Layers]

                                }
                                await saveToECR('975050334693.dkr.ecr.us-east-1.amazonaws.com/aiverseecr', imageName, docker, data)
                                // fs.writeFile(normalPath + '/manifest.json', manifest, async function (err) {
                                //     if (err) {
                                //         console.log('err in writing manifest.....', err)
                                //     } else {
                                //         console.log('Saved manifest');
                                //     }
                                // });
                            }
                        })
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

const saveToECR = async (ecrRegistry, imageUri, docker, manifest) => {
    const ecr = new AWS.ECR({ apiVersion: '2015-09-21', region: config.aws.region });
    const getAuthorizationDataParams = {
        // registryIds: [`975050334693`],
    };
    const authData = await ecr.getAuthorizationToken(getAuthorizationDataParams).promise();
    console.log('authData : ', authData)
    const authToken = authData.authorizationData[0].authorizationToken;

    // const registryConfig = { url: ecrRegistry, auth: authToken };
    // const image = docker.getImage(imageUri);
    // console.log('image of image', image)
    // await image.push({ authConfig: registryConfig });
    // console.log(`Image pushed to ECR: ${imageUri}`);
    let imageManifestBase64 = JSON.stringify(manifest);
    // imageManifestBase64 = Buffer.from(imageManifestBase64).toString("base64");
    // let obj = {
    //     "ImageManifest": {
    //         ...manifest
    //     }
    // }
    console.log('THIS IS MANIFEST : ', imageManifestBase64)
    console.log('THIS IS MANIFEST TYPE OF : ', typeof imageManifestBase64)
    const params = {
        "imageManifest": JSON.stringify({
            "schemaVersion": 2,
            "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
            "config": {
              "mediaType": "application/vnd.docker.container.image.v1+json",
              "size": 1234,
              "digest": ""
            },
            "layers": [      "sha256:7c85cfa30cb11b7606c0ee84c713a8f6c9faad7cb7ba92f1f33ba36d4731cc82",
            "sha256:f6589095d5b5a4933db1a75edc905d20570c9f6e5dbebd9a7c39a8eef81bb3fd",
            "sha256:a981dddd4c650efa96d82013fba1d1189cf4648cd1e766b34120b32af9ce8a06",
            "sha256:01d6cdeac53917b874d5adac862ab90dcf22489b7914611a1bde7c84db0a99ae",
            "sha256:c26432533a6af2f6f59d50aba5f76f2b61c2e0088c7e01b5d2a8708b6cb9ef08",
            "sha256:aef22e07d5d7e259dca961a8e2587143dd9f0a6edc05c549af574031343372f4",
            "sha256:8e23f007f16f45451f325eb7d3f8e8d3bb5f355c4f8b12eb1e9392dc10d8da33",
            "sha256:45c430b35dba6c7aae97d666bb8a2edf6d6059e14cbe5a3b44118d6f4ca2221e",
            "sha256:b82b6b9d4b467971ef28dd8ee298e205d85738ac0c1ea1eddcc132a52de73b72",
            "sha256:26e99ea7e9318660970eb2886f40be2384302ead9e7af0911aabe8586a232e17",
            "sha256:e3c68c57048292fc8fc8c050bf1495fee5b565b7860d5930b6a8880fe756a315"]
          }),
        // "imageManifest": imageManifestBase64,
        // imageManifest: "{\n   \"schemaVersion\": 2,\n   \"mediaType\": \"application/vnd.docker.distribution.manifest.v2+json\",\n   \"config\": {\n      \"mediaType\": \"application/vnd.docker.container.image.v1+json\",\n      \"size\": 1486,\n      \"digest\": \"sha256:5b52b314511a611975c2c65e695d920acdf8ae8848fe0ef00b7d018d1f118b64\"\n   },\n   \"layers\": [\n      {\n         \"mediaType\": \"application/vnd.docker.image.rootfs.diff.tar.gzip\",\n         \"size\": 91768077,\n         \"digest\": \"sha256:8e3fa21c4cc40232e835a6761332d225c7af3235c5755f44ada2ed9d0e4ab7e8\"\n      }\n   ]\n}\n",

        "repositoryName": 'project-a/nginx-web-app',
        "imageTag": 'latest',
        // "imageManifestMediaType": 'application/vnd.docker.container.image.v1+json',
        // "imageManifestMediaType": 'application/json',
    }
    ecr.putImage(params, (err, data) => {
        if (err) {
            console.error('ERROR IN UPLOADING ECR : ', err);
            console.error('ERROR IN UPLOADING ECR : ', err['[__type]']);
            console.error('ERROR IN UPLOADING ECR : ', err['__type']);
        } else {
            console.log('UPLOADED TO ECR : ', data);
        }
    });
    // var params = {
    //     repositoryName: "project-a/nginx-web-app"
    // };
    // ecr.createRepository(params, function (err, data) {
    //     if (err) console.log(err, err.stack); // an error occurred
    //     else console.log("SUCESSFULLY CREATED REPO : ",data);           // successful response
    // });
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
        let imageUri = `aiverseecr:${req.file.filename}-${Date.now()}`
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