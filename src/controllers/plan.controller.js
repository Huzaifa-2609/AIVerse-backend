const httpStatus = require('http-status');
const planService = require('../services/plan.service');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const getAllPlans = catchAsync(async (req, res) => {
  const allPlans = await planService.getAllPlans();
  res.status(httpStatus.OK).json({ plans: allPlans });
});

/**
 * Controller function to create a new plan.
 */
const createPlan = catchAsync(async (req, res) => {
  const planData = req.body;
  const plan = await planService.createPlan(planData);

  res.status(httpStatus.CREATED).json(plan);
});

module.exports = {
  getAllPlans,
  createPlan,
};
