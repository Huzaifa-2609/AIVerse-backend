const { Seller, Plan, Consumptions, User } = require('../models');

const updatePlan = async (data) => {
  try {
    // Check if the subscription status allows for updating the plan
    if (
      data.status !== 'active' ||
      data.cancellation_details?.reason === 'cancellation_requested' ||
      data.status === 'past_due'
    ) {
      return;
    }

    // Find the user by customerId (Stripe ID)
    const user = await User.findOne({ stripeId: data.customer });
    if (!user) {
      console.log(`No user found with this stripe id: ${data.customer}`);
      return;
    }

    // Find the seller by userId
    const seller = await Seller.findOne({ userId: user.id });
    if (!seller) {
      console.log(`No user found with this stripe id: ${data.customer}`);
      return;
    }

    // Find the plan by priceId
    const plan = await Plan.findOne({ priceId: data.plan.id });
    if (!plan) {
      throw new Error('No plan found with this id');
    }

    // Update seller with new plan
    await Seller.findByIdAndUpdate(seller._id, { isSubscriptionActive: true, planId: plan._id });

    // Check if consumption entry exists for the seller
    let consumption = await Consumptions.findOne({ sellerId: seller._id });

    // If consumption entry doesn't exist, create a new one
    if (!consumption) {
      consumption = await Consumptions.create({ sellerId: seller._id, planId: plan._id, noOfModels: 0 });
    } else {
      // Update the planId in existing consumption entry
      await Consumptions.findByIdAndUpdate(consumption._id, { planId: plan._id });
    }

    return consumption;
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

const deletePlan = async (data) => {
  try {
    // Find the user by customerId (Stripe ID)
    const user = await User.findOne({ stripeId: data.customer });
    if (!user) {
      console.log(`No user found with this stripe id: ${data.customer}`);
      return;
    }

    // Find the seller by userId
    const seller = await Seller.findOne({ userId: user.id });
    if (!seller) {
      console.log(`No seller found with this stripe id: ${data.customer}`);
      return;
    }

    // Update seller to remove planId and set isSubscriptionActive to false
    await seller.updateOne({ planId: null, isSubscriptionActive: false });
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
module.exports = {
  updatePlan,
  deletePlan,
};
