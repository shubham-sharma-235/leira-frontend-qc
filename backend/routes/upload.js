const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const uploadVideo = require('../middleware/uploadVideo');
const { uploadProductImage, uploadProductImages, uploadHomeVideo } = require('../controllers/uploadController');
const { protectAdmin } = require('../middleware/auth');

// Single image upload
router.post('/product', protectAdmin, upload.single('image'), uploadProductImage);

// Multiple images upload
router.post('/products', protectAdmin, upload.array('images', 10), uploadProductImages);

// Home video upload
router.post('/home-video', protectAdmin, uploadVideo.single('video'), uploadHomeVideo);

module.exports = router;

