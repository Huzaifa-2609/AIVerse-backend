const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const config = require('./../config/config');
const Docker = require('dockerode');
const { exec } = require('child_process');
const Model = require('../models/model.model');
const User = require('../models/user.model');
const { deleteFromS3, deleteEcrImage, deleteAllModelConfigFromSagemaker } = require('../Helper/awshelper');
const os = require('os');
const SocketIo = require('./../utils/socketio.js')

const waitAndUpdateEndpointStatus = async (sm, endpointName, modelId, req) => {
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

    // Update status in db
    await updateModel({ status: status }, modelId);
    emitSocket(req, modelId);
  } catch (error) {
    console.error('Error checking endpoint status:', error);
    emitSocket(req, modelId);
    throw error;
  }
};

const updateModel = async (body, id) => {
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
          InstanceType: 'ml.t2.medium',
          // InstanceType: 'ml.p2.xlarge'
          // InstanceType: 'ml.p5.48xlarge',
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

    await updateModel({ endpoint: `${modelName}-endpoint` }, modelId);

    // Wait for the endpoint to be in service
    await waitAndUpdateEndpointStatus(sm, `${modelName}-endpoint`, modelId, req);

    return endpointResult.EndpointArn;
  } catch (error) {
    console.error('Error deploying model:', error);
    await updateModel({ status: 'Failed' }, modelId);
    emitSocket(req, modelId);
    throw error;
  }
};

const createDockerImage = async (req, res, imageName, modelId, name) => {
  try {
    const docker = os.platform() === 'linux' ? new Docker({ socketPath: '/var/run/docker.sock' }) : new Docker();
    let dockerfilePath = path.join(req.file.destination);
    let normalPath = dockerfilePath;
    dockerfilePath = path.join(dockerfilePath, 'Dockerfile');

    let dockerfileContent = req.body.dockerContent;
    dockerfileContent = dockerfileContent.replaceAll('${req.file.filename}', `${req.file.filename}`)
    console.log(dockerfileContent)

    fs.writeFile(dockerfilePath, dockerfileContent, async function (err) {
      if (err) {
        console.log('err.....', err);
        await updateModel({ status: 'Failed' }, modelId);
        deleteFolder(normalPath);
        emitSocket(req, modelId);
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
          await updateModel({ status: 'Failed' }, modelId);
          emitSocket(req, modelId);
          return;
        }

        docker.modem.followProgress(stream, onFinished, onProgress);

        async function onFinished(err, output) {
          if (err) {
            console.error(err);
            await updateModel({ status: 'Failed' }, modelId);
            deleteFolder(normalPath);
            emitSocket(req, modelId);
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
                await updateModel({ status: 'Failed' }, modelId);
                deleteFolder(normalPath);
                emitSocket(req, modelId);
                return;
              }
              console.log(`Login command: ${stdout}`);

              let tagCommand = `docker tag ${imageName} ${process.env.ECR_REPO_URI}${imageName}`;
              exec(tagCommand, async (error, stdout, stderr) => {
                if (error) {
                  console.error('Error getting tag command:', error);
                  await updateModel({ status: 'Failed' }, modelId);
                  deleteFolder(normalPath);
                  emitSocket(req, modelId);
                  return;
                }
                console.log(`Tag command: ${stdout}`);

                let pushCommand = `docker push ${process.env.ECR_REPO_URI}${imageName}`;
                exec(pushCommand, async (error, stdout, stderr) => {
                  if (error) {
                    console.error('Error getting Push command:', error);
                    await updateModel({ status: 'Failed' }, modelId);
                    deleteFolder(normalPath);
                    emitSocket(req, modelId);
                    return;
                  } else {
                    console.log(`Push command: ${stdout}`);
                    console.log('ImageName : ', imageName);
                    await updateModel({ imagetag: imageName, ecrreponame: process.env.ECR_REPO_NAME }, modelId);
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
    await updateModel({ status: 'Failed' }, modelId);
    emitSocket(req, modelId);
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
    await updateModel({ bucketname: result?.Bucket, bucketobjectkey: result?.Key }, modelId);
    console.log('Successfully uploaded to s3', result);
  } catch (error) {
    console.log('Error in uploading s3 ', error);
    emitSocket(req, modelId);
  }
};

const deleteS3 = async (modelId) => {
  try {
    const model = await Model.findById(modelId);
    if (model.bucketname && model.bucketobjectkey) {
      deleteFromS3(model.bucketname, model.bucketobjectkey);
      console.log('Successfully deleted from s3');
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
      console.log('Successfully deleted from sagemaker');
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteImage = async (modelId) => {
  try {
    const model = await Model.findById(modelId);
    if (model.imagetag && model.ecrreponame) {
      deleteEcrImage(model.ecrreponame, model.imagetag);
      console.log('Successfully deleted from ecr');
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

const emitSocket = async (req, id) => {
  if (req.user && req.user.id) {
    let connections = SocketIo.getConnections()
    let io = SocketIo.getIO();
    let socketid = connections[req.user.id]
    let model = await Model.findById(id);
    io.to(socketid).emit('reportmodelstatus', model)
  }
};

exports.hostModelToAWS = async (req, res, model) => {
  try {
    if (!req.file) {
      return res.status(400).json({ isError: true, message: 'No files were uploaded.' });
    }
    console.log('The Uploaded File is : ', req.file);
    // Get the uploaded file path
    let filePath = req.file.path;

    // Save in db
    let modelId = model && model._id ? model._id : null;

    // Upload tar file to s3 bucket
    await uploadToS3(req, filePath, modelId);

    // Build docker image
    let imageUri = `${req.file.filename}-${Date.now()}`;
    await createDockerImage(req, res, imageUri, modelId, model.name);

    res.status(200).json({ message: 'File uploaded and converted successfully.' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
