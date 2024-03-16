const AWS = require('aws-sdk');
const axios = require('axios');
const aws4 = require('aws4');


exports.makeModelInference = async (req, res) => {
    // console.log(req.user._id)
    try {
        let requestData = {
            data: req.body,
            endpoint: 'test-MODEL-TEST-UPLOAD-2-endpoint'
        }
        let request = {
            host: process.env.API_GATEWAY_HOST,
            method: 'POST',
            url: process.env.API_GATEWAY_ENDPOINT,
            data: requestData, // object describing the foo
            body: JSON.stringify(requestData), // aws4 looks for body; axios for data
            path: process.env.API_GATEWAY_PATH,
            headers: {
                'content-type': 'application/json'
            }
        }

        let signedRequest = aws4.sign(request,
            {
                secretAccessKey: process.env.API_GATEWAY_SECRET_ACCESS_KEY,
                accessKeyId: process.env.API_GATEWAY_ACCESSKEY_ID,
                sessionToken: AWS.config.credentials.sessionToken
            })

        delete signedRequest.headers['Host']
        delete signedRequest.headers['Content-Length']

        let { data } = await axios(signedRequest)

        res.status(200).json({ data })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};
