const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs')
const auth = require('../../middlewares/auth');

const { hostModelToAWS, makeModelInference } = require('../../controllers/modelhost.controller');

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
    // destination: function (req, file, cb) {
    //     cb(null, `src/public/uploads/`) // Set the destination folder for uploaded files
    // },
    filename: function (req, file, cb) {
        cb(null, file.originalname.split('.')[0] + '-' + Date.now() + '.tar.gz') // Set the file name for uploaded files
        // cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)) // Set the file name for uploaded files
    }
})

const upload = multer({
    storage: storage,
    /*fileFilter: (req, file, cb) => {
        // Check if the file name is either 'file' or 'requirement'
        if (file.fieldname === 'file' || file.fieldname === 'requirement') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file fieldname'));
        }
    }*/
});

// router.post('/', upload.single('file'), hostModelToAWS);
router.post('/', upload.single('file'), hostModelToAWS);

router.post('/inference', auth(), makeModelInference);

module.exports = router;
