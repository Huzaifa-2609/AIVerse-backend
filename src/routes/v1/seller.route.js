const express = require('express');
const router = express.Router();
const sellerController = require('../../controllers/seller.controller');
const auth = require('../../middlewares/auth');

router.post('/register-as-seller', sellerController.createSeller);
router.post('/create-checkout-session', sellerController.selectPlan);
router.post('/connect-registration', sellerController.getConnectLink);
router.post('/manage-billing', auth('manageBilling'), sellerController.getManageBillingLink);
router.post('/send-verification-email', auth(), sellerController.sendSellerVerificationEmail);
router.post('/verify-email', auth(), sellerController.sellerEmailVerification);

module.exports = router;
