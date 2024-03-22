const { generateApiKey } = require('generate-api-key');

const generateModelApiKey = (modelId, userId) => {
  const pool = modelId + userId;
  const apiKey = generateApiKey({
    method: 'uuidv4',
    pool,
    prefix: 'aiv',
  });
  return apiKey;
};

module.exports = generateModelApiKey;
