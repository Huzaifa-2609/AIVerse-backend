const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');

const {
  createModel,
  updateModel,
  getModels,
  getModelByName,
  getCategories,
  getModelsBySeller,
  getUsecases,
} = require('../../controllers/model.controller');

router.get('/', getModels);
router.post('/create', createModel);
router.put('/update/:id', updateModel);
router.get('/categories', getCategories);
router.get('/usecases', getUsecases);
router.get('/seller/:sellerId', getModelsBySeller);
router.get('/:id', getModelByName);

module.exports = router;
