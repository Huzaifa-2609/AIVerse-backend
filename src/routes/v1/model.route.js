const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');
const multer = require('multer');
const fs = require('fs');

const {
  createModel,
  updateModel,
  deleteModel,
  getModels,
  getModelByName,
  getCategories,
  getModelsBySeller,
  getUsecases,
  hostModel,
  createReview,
  getReviewsByModelId,
} = require('../../controllers/model.controller');

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define the directory path
    const directoryPath = `src/public/uploads/${file.originalname.split('.')[0] + '-' + Date.now()}`;

    // Check if the directory exists, if not, create it
    fs.mkdir(directoryPath, { recursive: true }, function (err) {
      if (err) {
        // Handle error, if any
        console.error('Error creating directory:', err);
      }
      // Callback with the directory path
      cb(null, directoryPath);
    });
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname.split('.')[0] + '-' + Date.now() + '.tar.gz'); // Set the file name for uploaded files
  },
});

const upload = multer({
  storage: storage,
});

router.get('/', getModels);
// router.post('/create', createModel);
router.put('/update/:id', updateModel);
router.delete('/delete/:id', deleteModel);
router.post('/create', createModel);
router.post('/host/:id', upload.single('file'), hostModel);
router.get('/categories', getCategories);
router.get('/usecases', getUsecases);
router.get('/seller/:sellerId', getModelsBySeller);
router.get('/:id', getModelByName);
router.post('/reviews', createReview);
router.get('/:modelId/reviews', getReviewsByModelId);

module.exports = router;
