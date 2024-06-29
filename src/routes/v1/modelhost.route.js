const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs')

const { hostModelToAWS } = require('../../controllers/modelhost.controller');

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
        cb(null, file.originalname.split('.')[0] + '-' + Date.now() + '.tar.gz') // Set the file name for uploaded files
    }
})

const upload = multer({
    storage: storage
});

// router.post('/', upload.single('file'), hostModelToAWS);
router.post('/', upload.single('file'), hostModelToAWS);

module.exports = router;
