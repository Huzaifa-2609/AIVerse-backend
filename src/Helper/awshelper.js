const AWS = require('aws-sdk');

const deleteFromS3 = (bucketName, objectKey) => {
    // Create S3 service object
    const s3 = new AWS.S3();

    // Set parameters for the delete operation
    const params = {
        Bucket: bucketName,
        Key: objectKey
    };

    // Delete the object
    s3.deleteObject(params, function (err, data) {
        if (err) {
            console.error("Error deleting object:", err);
        } else {
            console.log("Object deleted successfully:", data);
        }
    });
}

const deleteEcrIamge = (repoName, imageTag) => {
    // Create ECR service object
    const ecr = new AWS.ECR();

    // Set parameters for the delete image operation
    const params = {
        imageIds: [
            {
                imageTag: imageTag // The digest of the image you want to delete
            }
        ],
        repositoryName: repoName // The name of the ECR repository
    };

    // Delete the image
    ecr.batchDeleteImage(params, function (err, data) {
        if (err) {
            console.error("Error deleting image:", err);
        } else {
            console.log("Image deleted successfully:", data);
        }
    });
}

const deleteAllModelConfigFromSagemaker = async (modelName) => {
    // Create SageMaker service object
    const sagemaker = new AWS.SageMaker();
    try {
        await sagemaker.deleteEndpoint(
            {
                EndpointName: `${modelName}-endpoint`
            }
        ).promise();

        await sagemaker.deleteEndpointConfig(
            {
                EndpointConfigName: `${modelName}-config`
            }
        ).promise();

        await sagemaker.deleteModel(
            {
                ModelName: modelName
            }
        ).promise();
        console.log(`Sagemaker configuration deleted successfully.`);
    } catch (error) {
        console.error("Error deleting sagemaker configuration : ", error);
    }
}

module.exports = { deleteFromS3, deleteEcrIamge, deleteAllModelConfigFromSagemaker }