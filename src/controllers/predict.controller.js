const AWS = require('aws-sdk');
const axios = require('axios');
const aws4 = require('aws4');
const ModelPurchase = require('../models/modelPurchase.model')
const Model = require('../models/model.model')


const getApikeyForUser = async (userid, modelid) => {
    try {
        let apikey = null
        let data = await ModelPurchase.find({ user: userid, model: modelid });
        if (data && data[0]) {
            apikey = data[0].apiKey;
        }
        return apikey
    } catch (error) {
        console.log(error)
        return null
    }
}

const isUserLegitimate = async (req) => {
    let userAuthorized = false;
    let apikey = await getApikeyForUser(req.user._id, req.params.modelid)
    if (req.headers && req.headers['apikey'] && apikey && apikey === req.headers['apikey']) {
        userAuthorized = true;
    }
    return userAuthorized
}

exports.makeModelInference = async (req, res) => {
    try {
        let isValidUser = await isUserLegitimate(req)
        if (!isValidUser) {
            res.status(401).json({ isError: true, message: 'Authorization is required to access the resource' })
        }
        let endPoint;
        let modelData = await Model.findById(req.params.modelid);
        if (modelData.endpoint) {
            endPoint = modelData.endpoint
        }
        if (endPoint) {
            let requestData = {
                data: req.body,
                endpoint: endPoint
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

            res.status(200).json({ isError: false, data })
        } else {
            res.status(500).json({ isError: true.valueOf, message: 'Internal Server Error' })
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};
