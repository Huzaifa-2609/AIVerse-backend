const AWS = require('aws-sdk');
const fs = require('fs');
const config = require('./../config/config');
const Docker = require('dockerode');
const { exec } = require('child_process');
const Model = require('../models/model.model');
const User = require('../models/user.model');
const { deleteFromS3, deleteEcrIamge, deleteAllModelConfigFromSagemaker } = require('../Helper/awshelper');
const { io } = require('../index');

const waitAndUpdateEndpointStatus = async (sm, endpointName, modelId) => {
  try {
    let status = 'Creating';
    while (status === 'Creating') {
      const describeEndpointParams = {
        EndpointName: endpointName,
      };
      const endpointDescription = await sm.describeEndpoint(describeEndpointParams).promise();
      status = endpointDescription.EndpointStatus;

      console.log(`Endpoint status: ${status}`);

      // Wait for a few seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    //update status in db
    await updatModel({ status: status }, modelId);
    emitSocket(status === 'Failed', status);
  } catch (error) {
    console.error('Error checking endpoint status:', error);
    emitSocket(true, 'Failed');
    throw error;
  }
};

const updatModel = async (body, id) => {
  try {
    await Model.findByIdAndUpdate(id, body);
  } catch (error) {
    console.log('Error in updating model in db ', error);
  }
};

const hostModelToSageMaker = async (req, s3Filename, imageName, modelId, name) => {
  try {
    const sm = new AWS.SageMaker();
    let s3URL = `${process.env.S3_BUCKET_URI}${s3Filename}`;
    let dockerImage = `${process.env.ECR_REPO_URI}${imageName}`;
    let modelName = name;
    const createModelParams = {
      ModelName: modelName,
      PrimaryContainer: {
        Image: dockerImage,
        ModelDataUrl: s3URL,
      },
      ExecutionRoleArn: process.env.SAGEMAKER_EXECUTION_ROLE_ARN,
    };
    const modelResult = await sm.createModel(createModelParams).promise();
    console.log('Model created:', modelResult);

    const createEndpointConfigParams = {
      EndpointConfigName: `${modelName}-config`,
      ProductionVariants: [
        {
          VariantName: 'default-variant',
          ModelName: modelName,
          InitialInstanceCount: 1,
          // InstanceType: 'ml.t2.medium'
          // InstanceType: 'ml.p2.xlarge'
          InstanceType: 'ml.p5.48xlarge',
        },
      ],
    };
    const endpointConfigResult = await sm.createEndpointConfig(createEndpointConfigParams).promise();
    console.log('Endpoint config created:', endpointConfigResult);

    const createEndpointParams = {
      EndpointName: `${modelName}-endpoint`,
      EndpointConfigName: `${modelName}-config`,
    };
    const endpointResult = await sm.createEndpoint(createEndpointParams).promise();
    console.log('Endpoint created:', endpointResult);

    await updatModel({ endpoint: `${modelName}-endpoint` }, modelId);

    // Wait for the endpoint to be in service
    await waitAndUpdateEndpointStatus(sm, `${modelName}-endpoint`, modelId);

    return endpointResult.EndpointArn;
  } catch (error) {
    console.error('Error deploying model:', error);
    await updatModel({ status: 'Failed' }, modelId);
    emitSocket(true, 'Failed');
    throw error;
  }
};

const createDockerImage = async (req, res, imageName, modelId, name) => {
  try {
    const docker = new Docker();
    let dockerfilePath = `${req.file.destination}`; // Path to your Dockerfile template

    let normalPath = dockerfilePath;
    dockerfilePath = dockerfilePath + '/Dockerfile';

    // const dockerfileContent =
    //     `   FROM python:3.8
    // COPY ./${req.file.filename} /app/
    // WORKDIR /app/
    // RUN tar -xvf ${req.file.filename} && rm ${req.file.filename}
    // EXPOSE 8080
    // RUN pip install Flask
    // ENTRYPOINT ["python3", "api.py"]`
    // const dockerfileContent =
    //     `    FROM python:3.8
    // COPY ./${req.file.filename} /app/
    // WORKDIR /app/
    // RUN tar -xvf ${req.file.filename} && rm ${req.file.filename}
    // EXPOSE 8080
    // RUN pip install --no-cache-dir -r requirements.txt
    // ENTRYPOINT ["python3", "api.py"]`
    // const dockerfileContent =
    //     `
    //     FROM tensorflow/tensorflow:latest-gpu
    //     RUN apt-get update && apt-get install -y \
    //     cuda-toolkit-11-0 && \
    //     apt-get install -y --no-install-recommends \
    //     libcudnn8=8.0.5.39-1+cuda11.0 && \
    //     rm -rf /var/lib/apt/lists/*
    //     ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64:/usr/local/cuda-11.0/lib64:/usr/local/cuda/extras/CUPTI/lib64:$LD_LIBRARY_PATH \
    //     PATH=/usr/local/cuda-11.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games
    //     COPY ./${req.file.filename} /app/
    //     WORKDIR /app/
    //     RUN tar -xvf ${req.file.filename} && rm ${req.file.filename}
    //     EXPOSE 8080
    //     RUN pip install --no-cache-dir -r requirements.txt
    //     ENTRYPOINT ["python3", "api.py"]`
    const dockerfileContent = `   
            FROM nvcr.io/nvidia/tensorflow:21.04-tf2-py3
            RUN apt-get update
            COPY ./${req.file.filename} /app/
            WORKDIR /app/
            RUN tar -xvf ${req.file.filename} && rm ${req.file.filename}
            EXPOSE 8080
            RUN pip install --no-cache-dir -r requirements.txt
            ENTRYPOINT ["python3", "api.py"]`;

    fs.writeFile(dockerfilePath, dockerfileContent, async function (err) {
      if (err) {
        console.log('err.....', err);
        await updatModel({ status: 'Failed' }, modelId);
        deleteFolder(normalPath);
        emitSocket(true, 'Failed');
      }
      console.log('Saved!');
    });

    // Build an image from the Dockerfile
    docker.buildImage(
      { context: normalPath, src: ['Dockerfile', `./${req.file.filename}`] },
      { t: imageName },
      async (err, stream) => {
        if (err) {
          console.error(err);
          await updatModel({ status: 'Failed' }, modelId);
          emitSocket(true, 'Failed');
          return;
        }

        docker.modem.followProgress(stream, onFinished, onProgress);

        async function onFinished(err, output) {
          if (err) {
            console.error(err);
            await updatModel({ status: 'Failed' }, modelId);
            deleteFolder(normalPath);
            emitSocket(true, 'Failed');
          } else {
            console.log('Image built successfully:', output);

            for (let i = output.length - 1; i >= 0; i--) {
              let element = output[i];
              if (element.aux && element.aux.ID) {
                imageId = element.aux.ID;
                break;
              }
            }

            exec(process.env.ECR_LOGIN_COMMAND, async (error, stdout, stderr) => {
              if (error) {
                console.error('Error getting login command:', error);
                await updatModel({ status: 'Failed' }, modelId);
                deleteFolder(normalPath);
                emitSocket(true, 'Failed');
                return;
              }
              console.log(`Login command: ${stdout}`);

              let tagCommand = `docker tag ${imageName} ${process.env.ECR_REPO_URI}${imageName}`;
              exec(tagCommand, async (error, stdout, stderr) => {
                if (error) {
                  console.error('Error getting tag command:', error);
                  await updatModel({ status: 'Failed' }, modelId);
                  deleteFolder(normalPath);
                  emitSocket(true, 'Failed');
                  return;
                }
                console.log(`Tag command: ${stdout}`);

                let pushCommand = `docker push ${process.env.ECR_REPO_URI}${imageName}`;
                exec(pushCommand, async (error, stdout, stderr) => {
                  if (error) {
                    console.error('Error getting Push command:', error);
                    await updatModel({ status: 'Failed' }, modelId);
                    deleteFolder(normalPath);
                    emitSocket(true, 'Failed');
                    return;
                  } else {
                    console.log(`Push command: ${stdout}`);
                    console.log('ImageName : ', imageName);
                    await updatModel({ imagetag: imageName, ecrreponame: process.env.ECR_REPO_NAME }, modelId);
                    await hostModelToSageMaker(req, req.file.filename, imageName, modelId, name);
                  }
                  deleteFolder(normalPath);
                });
              });
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
    await updatModel({ status: 'Failed' }, modelId);
    emitSocket(true, 'Failed');
    return res.status(500).json({ message: error.message });
  }
};

const uploadToS3 = async (req, filePath, modelId) => {
  try {
    const s3 = new AWS.S3();
    const uploadParams = {
      Bucket: config.aws.bucketName,
      Key: `${req.file.filename}`,
      Body: fs.readFileSync(filePath),
    };
    let result = await s3.upload(uploadParams).promise();
    await updatModel({ bucketname: result?.Bucket, bucketobjectkey: result?.Key }, modelId);
    console.log('Successfully uploaded to s3', result);
  } catch (error) {
    console.log('Error in uploading s3 ', error);
    emitSocket(true, 'Failed');
  }
};

const deleteS3 = async (modelId) => {
  try {
    const model = await Model.findById(modelId);
    if (model.bucketname && model.bucketobjectkey) {
      deleteFromS3(model.bucketname, model.bucketobjectkey);
      console.log('successfully deleted from s3');
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteSagemakerConfigs = async (modelId) => {
  try {
    const model = await Model.findById(modelId);
    if (model.name) {
      deleteAllModelConfigFromSagemaker(model.name);
      console.log('successfully deleted from sagemaker');
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteImage = async (modelId) => {
  try {
    const model = await Model.findById(modelId);
    if (model.imagetag && model.ecrreponame) {
      deleteEcrIamge(model.ecrreponame, model.imagetag);
      console.log('successfully deleted from ecr');
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteFile = (path) => {
  fs.unlink(path, (err) => {
    if (err) console.log(err);
  });
};
const deleteFolder = (path) => {
  fs.rm(path, { recursive: true, force: true }, (err) => {
    if (err) {
      throw err;
    }
    console.log(`${path} is deleted!`);
  });
};

const emitSocket = (isError, modelStatus) => {
  io.emit('model-status', {
    isError,
    modelStatus,
  });
};

// const insertInModel = async (req) => {
//     let obj = {
//         'name': req.body.modelName
//     }
//     try {
//         let model = await Model.create(obj)
//         console.log('Model Is Created ', model)
//         return model;
//     } catch (e) {
//         console.log('Error in creating model in db', e)
//     }

//     return {}
// }

exports.hostModelToAWS = async (req, res, model) => {
  try {
    if (!req.file) {
      return res.status(400).json({ isError: true, message: 'No files were uploaded.' });
    }
    console.log('The Uploaded File is : ', req.file);

    // Get the uploaded file path
    let filePath = req.file.path;

    //save in db
    let modelId = model && model._id ? model._id : null;

    // upload tar file to s3 bucket
    await uploadToS3(req, filePath, modelId);

    //build docker image
    let imageUri = `${req.file.filename}-${Date.now()}`;
    await createDockerImage(req, res, imageUri, modelId, model.name);

    res.status(200).json({ message: 'File uploaded and converted successfully.' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
