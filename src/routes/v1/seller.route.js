const express = require('express');
const router = express.Router();
const sellerController = require('../../controllers/seller.controller');
const auth = require('../../middlewares/auth');

router.post('/register-as-seller', auth('sellerRegistration'), sellerController.createSeller);
router.post('/create-checkout-session', auth('selectPlan'), sellerController.selectPlan);
router.post('/connect-registration', auth('connectRegistration'), sellerController.getConnectLink);
router.post('/manage-billing', auth('manageBilling'), sellerController.getManageBillingLink);
router.post('/send-verification-email', sellerController.sendSellerVerificationEmail);
router.post('/verify-email', sellerController.sellerEmailVerification);
router.get('/stats/:id', auth(), sellerController.getSellerDashboardStats);
router.get('/revenue/:id', auth(), sellerController.getAnnualRevenue);
router.get('/revenue-model/:id', auth(), sellerController.getAnnualRevenueModel);
router.get('/all-customers/:id', auth(), sellerController.getSellerAllCustomers);

module.exports = router;
