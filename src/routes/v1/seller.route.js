const express = require('express');
const router = express.Router();
const sellerController = require('../../controllers/seller.controller');
const auth = require('../../middlewares/auth');

router.post('/create-checkout-session', auth('selectPlan'), sellerController.selectPlan);
router.post('/register-as-seller', auth('sellerRegistration'), sellerController.createSeller);

module.exports = router;
