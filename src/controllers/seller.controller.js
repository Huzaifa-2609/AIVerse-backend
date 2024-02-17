const httpStatus = require('http-status');
const sellerService = require('../services/seller.service');
const userService = require('../services/user.service');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const planService = require('../services/plan.service');

const createSeller = catchAsync(async (req, res) => {
  const seller = await sellerService.createSeller(req.body);
  res.status(httpStatus.OK).json({ seller });
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

module.exports = {
  selectPlan,
  createSeller,
};
