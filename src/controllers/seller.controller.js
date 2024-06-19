const httpStatus = require('http-status');
const sellerService = require('../services/seller.service');
const userService = require('../services/user.service');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const planService = require('../services/plan.service');

const createSeller = catchAsync(async (req, res) => {
  const { userId, businessEmail, occupation, phone, country, address } = req.body;
  const seller = await sellerService.createSeller({ userId, businessEmail, occupation, phone, country, address });
  try {
    const connectAccount = await sellerService.createConnectAccount(businessEmail);
    await userService.updateUserById(userId, { isDeveloper: true });
    seller.connectId = connectAccount.id;
    seller.save();
    await sellerService.sendSellerVerificationEmail(seller);
    res.status(httpStatus.OK).json({ seller });
  } catch (err) {
    seller.remove();
    await userService.updateUserById(userId, { isDeveloper: false });
    throw err;
  }
});

const sendSellerVerificationEmail = catchAsync(async (req, res) => {
  const { sellerId } = req.body;
  const seller = await sellerService.findSellerById(sellerId);
  if (!seller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Seller not found');
  }
  await sellerService.sendSellerVerificationEmail(seller);
  res.status(httpStatus.NO_CONTENT).send();
});

const selectPlan = catchAsync(async (req, res) => {
  const { userId, planId } = req.body;
  const user = await userService.getUserById(userId);
  const plan = await planService.getPlanById(planId);
  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found');
  }
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const url = await sellerService.createStripeCheckoutSession(user, plan);
  res.status(httpStatus.OK).json({ url });
});

const getConnectLink = catchAsync(async (req, res) => {
  const { sellerId } = req.body;
  const seller = await sellerService.findSellerById(sellerId);
  const connectAccount = await sellerService.createConnectLink(seller.connectId);
  res.status(httpStatus.OK).json({ url: connectAccount?.url });
});

const getManageBillingLink = catchAsync(async (req, res) => {
  const { sellerId } = req.body;
  const seller = await sellerService.findSellerById(sellerId);
  if (!seller) {
    throw new Error("There's some mistake in the id you provided");
  }

  const user = await userService.getUserById(seller?.userId);
  if (!user) {
    throw new Error("There's some mistake in the id you provided");
  }

  const url = await sellerService.getManageBillingPortalLink(user?.stripeId);
  res.status(httpStatus.OK).json({ portalLink: url });
});

const sellerEmailVerification = catchAsync(async (req, res) => {
  await sellerService.verifySellerEmail(req.body.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const getSellerDashboardStats = catchAsync(async (req, res) => {
  const { id } = req.params;
  const seller = await sellerService.findSellerById(id);
  if (!seller) {
    throw new Error('There is a mistake in the provided id');
  }
  const summary = await sellerService.getBalanceSummary(seller?.connectId);
  const data = await sellerService.getSellerStatistics(id);
  return res.status(httpStatus.OK).json({
    ...summary,
    ...data,
  });
});

const getAnnualRevenue = catchAsync(async (req, res) => {
  const { id } = req.params;
  const seller = await sellerService.findSellerById(id);
  if (!seller) {
    throw new Error('There is a mistake in the provided id');
  }
  const data = await sellerService.getAnnualRevenue(seller?.connectId);
  return res.status(httpStatus.OK).json({
    data,
  });
});

module.exports = {
  selectPlan,
  createSeller,
  getConnectLink,
  getManageBillingLink,
  sendSellerVerificationEmail,
  sellerEmailVerification,
  getAnnualRevenue,
  getSellerDashboardStats,
};
