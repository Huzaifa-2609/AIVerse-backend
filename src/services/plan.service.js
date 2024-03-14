const { Plan } = require('../models');

/**
 * Get plan by planId
 * @param {string} planId
 * @returns {Promise<Plan>}
 */

const getPlanById = async (planId) => {
  const plan = await Plan.findById(planId);
  return plan;
};

/**
 * Get plan by planId
 * @returns {Promise<Plan[]>}
 */
const getAllPlans = async () => {
  const plans = await Plan.find();
  return plans;
};

/**
 * Create a plan
 * @param {object} plan
 * @returns {Promise<Plan[]>}
 */
const createPlan = async (plan) => {
  return await Plan.create(plan);
};

module.exports = {
  getPlanById,
  getAllPlans,
  createPlan,
};
