const express = require('express');
const router = express.Router();

const { createModel, getModels, getModelByName, getCategories, getUsecases } = require('../../controllers/model.controller');

router.get('/', getModels);
router.post('/create', createModel);
router.get('/categories', getCategories);
router.get('/usecases', getUsecases);
router.get('/:name', getModelByName);

module.exports = router;
