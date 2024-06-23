const { execSync } = require('child_process');
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCES_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_DEFAULT_REGION = process.env.S3_REGION;

function configureAwsCli() {
    try {
        execSync(`aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}`);
        execSync(`aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}`);
        execSync(`aws configure set region ${AWS_DEFAULT_REGION}`);
        console.log('AWS CLI configured successfully');
    } catch (error) {
        console.error('Error configuring AWS CLI:', error);
    }
}

configureAwsCli();
