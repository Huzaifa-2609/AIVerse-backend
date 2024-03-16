const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');

const { makeModelInference } = require('../../controllers/predict.controller');

router.post('/', auth(), makeModelInference);

module.exports = router;
