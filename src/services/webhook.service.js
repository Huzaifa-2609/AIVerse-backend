const { userService, sellerService } = require('.');
const { Seller, Plan, Consumptions, User, SellerCustomers, Model, ModelPurchase } = require('../models');

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
      return null;
    }

    // Find the seller by userId
    const seller = await Seller.findOne({ userId: user.id });
    if (!seller) {
      console.log(`No user found with this stripe id: ${data.customer}`);
      return null;
    }

    // Find the plan by priceId
    const plan = await Plan.findOne({ priceId: data.plan.id });
    if (!plan) {
      console.log(`No plan found with this price id: ${data.plan.id}`);
      return null;
    }

    // Update seller with new plan
    await Seller.findByIdAndUpdate(seller._id, { isSubscriptionActive: true, planId: plan._id, cancellation_reason: null });
    await user.updateOne({ isDeveloper: true });
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
      return null;
    }

    // Find the seller by userId
    const seller = await Seller.findOne({ userId: user.id });
    if (!seller) {
      console.log(`No seller found with this stripe id: ${data.customer}`);
      return null;
    }

    // Update seller to remove planId and set isSubscriptionActive to false
    await seller.updateOne({
      planId: null,
      isSubscriptionActive: false,
      cancellation_reason: data.cancellation_details?.reason,
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

const createOrReturnSellerCustomer = async (account, customerEmail, stripeId) => {
  try {
    const seller = await Seller.findOne({ connectId: account });
    if (!seller) {
      console.log(`No seller found with this connect id: ${account}`);
      return null;
    }

    const user = await userService.getUserByEmail(customerEmail);
    if (!user) {
      console.log(`No user found with this email: ${customerEmail}`);
      return null;
    }

    return await sellerService.createSellerCustomerIfNotExists(seller.id, user.id, stripeId);
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

const updateUserPlan = async (event) => {
  try {
    const data = event.data.object;
    if (
      data.status !== 'active' ||
      data.cancellation_details?.reason === 'cancellation_requested' ||
      data.status === 'past_due'
    ) {
      return;
    }

    const sellerCustomer = await createOrReturnSellerCustomer(event.account, data.metadata.email, data.customer);

    if (!sellerCustomer) {
      console.log(`No user found with this stripe id: ${data.customer}`);
      return null;
    }

    const model = await Model.findOne({ priceId: data.plan.id });
    if (!model) {
      console.log(`No plan found with this price id: ${data.plan.id}`);
      return null;
    }

    const modelPurchaseData = {
      user: sellerCustomer.customerId,
      model: model.id,
      isActive: true,
      subscriptionId: data?.id,
    };

    await ModelPurchase.create(modelPurchaseData);
  } catch (error) {
    console.error('Error buying plan:', error);
    throw error;
  }
};

const deleteUserPlan = async (data) => {
  try {
    const user = await SellerCustomers.findOne({ stripeCustomerId: data.customer });
    if (!user) {
      console.log(`No user found with this stripe id: ${data.customer}`);
      return null;
    }

    const model = await Model.findOne({ priceId: data.plan.id });
    if (!model) {
      console.log(`No plan found with this price id: ${data.plan.id}`);
      return null;
    }

    await ModelPurchase.updateOne(
      { user: user.customerId, model: model.id },
      { isActive: false, cancellation_reason: data.cancellation_details?.reason }
    );
    return;
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error;
  }
};

const updateAccountStatus = async (event) => {
  try {
    const data = event.data.object;
    const isActive = data.charges_enabled && data.capabilities.card_payments === 'active';
    await Seller.findOneAndUpdate({ connectId: event.account }, { $set: { isAccountActive: isActive } }, { new: true });
  } catch (error) {
    console.error('Error updating the status of the account:', error);
    throw error;
  }
};

module.exports = {
  updatePlan,
  deletePlan,
  updateUserPlan,
  deleteUserPlan,
  updateAccountStatus,
};
