const httpStatus = require('http-status');
const { tokenService, emailService, userService, sellerService } = require('.');
const { app } = require('../config/config');
const stripe = require('../config/stripe');
const { tokenTypes } = require('../config/tokens');
const { Seller, Token, SellerCustomers, Model, ModelPurchase } = require('../models');
const ApiError = require('../utils/ApiError');
const { groupBy } = require('../utils/arrayUtils');
const mongoose = require('mongoose');

/**
 * Find a seller object using id.
 * @param {string} id - Id of the seller.
 * @returns {Promise<Seller>} - Returns a Promise that resolves with the Seller.
 */

const findSellerById = async (id) => {
  const seller = await Seller.findById(id);
  return seller;
};

/**
 * Find a seller object using id.
 * @param {string} userId - userId of the seller.
 * @returns {Promise<Seller>} - Returns a Promise that resolves with the Seller.
 */

const findSellerByUserId = async (userId) => {
  const seller = await Seller.findOne({ userId });
  return seller;
};

/**
 * Creates a Stripe checkout session for subscription.
 * @param {object} details - Seller object containing user information.
 * @returns {Promise<Seller>} - Returns a Promise that resolves with the Seller.
 */

const createSeller = async (details) => {
  const seller = await Seller.create(details);
  return seller;
};

/**
 * Creates a Stripe checkout session for subscription.
 * @param {object} user - User object containing user information.
 * @param {object} plan - Plan object containing plan information.
 * @returns {Promise<string>} - Returns a Promise that resolves with the URL of the created Stripe checkout session.
 */

const createStripeCheckoutSession = async (user, plan) => {
  const { name, email, stripeId } = user;
  const { priceId } = plan;

  const session = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer: stripeId,
    metadata: {
      name: name,
      email,
    },
    mode: 'subscription',
    allow_promotion_codes: true,
    success_url: `${app.appUrl}/seller?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${app.appUrl}/seller?canceled=true`,
  });

  return session.url;
};

/**
 * Creates a Stripe Connect account for the user.
 * @param {string} email - The email address of the user.
 * @returns {Promise<object>} - A Promise resolving with the created Stripe account object.
 */

const createConnectAccount = async (email) => {
  const account = await stripe.accounts.create({
    type: 'express',
    email: email,
    capabilities: {
      card_payments: {
        requested: true,
      },
      transfers: {
        requested: true,
      },
    },
  });
  return account;
};

/**
 * Generates a URL link for onboarding and connecting a Stripe Connect account.
 * @param {string} connectId - The ID of the Stripe Connect account.
 * @returns {Promise<object>} - A Promise resolving with the Stripe account link object containing the URL link.
 */

const createConnectLink = async (connectId) => {
  const accountLink = await stripe.accountLinks.create({
    account: connectId,
    refresh_url: `${app.appUrl}/seller`,
    return_url: `${app.appUrl}/seller`,
    type: 'account_onboarding',
  });
  return accountLink;
};

/**
 * Generates a URL link for managing the customer portal on stripe.
 * @param {string} stripeId - The customer ID of the Stripe.
 * @returns {Promise<string>} - A Promise resolving with the Stripe account link object containing the URL link.
 */

const getManageBillingPortalLink = async (stripeId) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeId,
    return_url: `${app.appUrl}/seller`,
  });

  return session.url;
};

/**
 * For Sending Email to the seller after his registration.
 * @param {Seller} seller - The seller  ID of the Stripe.
 * @returns {Promise<void>} - A Promise resolving with the Stripe account link object containing the URL link.
 */

const sendSellerVerificationEmail = async (seller) => {
  const verifyEmailToken = await tokenService.generateVerifySellerEmailToken(seller);
  await emailService.sendVerificationEmail(seller.businessEmail, verifyEmailToken);
};

const verifySellerEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifySellerToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);

    const seller = await findSellerById(verifyEmailTokenDoc.seller);

    if (!seller) {
      throw new Error();
    }

    if (seller.isEmailVerified) {
      return;
    }

    await Token.deleteMany({ seller: seller.id, type: tokenTypes.VERIFY_EMAIL });
    await Seller.findByIdAndUpdate(seller.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

/**
 * Finds a seller's customer document in the MongoDB collection based on the provided user ID.
 * @param {string} userId - The ID of the user (customer) to find.
 * @returns {Promise<SellerCustomers|null>} - A promise that resolves with the found customer document or null if not found.
 * @throws {ApiError} - Throws an error with status code 500 if an unexpected error occurs during the database operation.
 */

const findSellerCustomer = async (userId) => {
  try {
    const sellerCustomer = await SellerCustomers.findOne({ customerId: userId });

    return sellerCustomer || null;
  } catch (error) {
    console.log(error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Oops! Something went wrong');
  }
};

/**
 * Creates a new seller-customer relationship in the MongoDB collection if the relationship does not already exist.
 * @param {string} sellerId - The ID of the seller.
 * @param {string} customerId - The ID of the customer.
 * @param {string} stripeCustomerId - The Stripe customer ID associated with the customer.
 */
async function createSellerCustomerIfNotExists(sellerId, customerId, stripeCustomerId) {
  try {
    const existingRelationship = await SellerCustomers.findOne({ sellerId: sellerId, customerId: customerId });

    if (!existingRelationship) {
      const newRelationship = new SellerCustomers({
        sellerId: sellerId,
        customerId: customerId,
        stripeCustomerId: stripeCustomerId,
      });

      await newRelationship.save();
      console.log('Seller-customer relationship created successfully ✔️.');
      return newRelationship;
    } else {
      console.log('Seller-customer relationship already exists.');
      return existingRelationship;
    }
  } catch (error) {
    // Log and handle errors
    console.error('Error creating seller-customer relationship:', error);
  }
}

/**
 * Fetches all balance transactions with pagination.
 * @param {Object} params - Parameters to filter transactions (e.g., date range).
 * @param {Object} options - Options Object like stripeAccount, etc.
 * @returns {Promise<Array>} - A promise that resolves to an array of balance transactions.
 */
async function fetchAllBalanceTransactions(params, options) {
  let transactions = [];
  let hasMore = true;
  while (hasMore) {
    const response = await stripe.balanceTransactions.list(
      {
        limit: 100,
        ...params,
      },
      options
    );

    transactions = transactions.concat(response.data);
    hasMore = response.has_more;
  }
  return transactions;
}

/**
 * Calculates total earnings from all transactions.
 *
 * @param {string} params - connect account id for the seller
 * @returns {Promise<number>} - A promise that resolves to the total earnings in the smallest currency unit (e.g., cents).
 */
async function getTotalEarnings(stripeAccount) {
  try {
    const transactions = await fetchAllBalanceTransactions({}, { stripeAccount });
    let totalEarnings = 0;
    transactions.forEach((transaction) => {
      totalEarnings += Math.abs(transaction.amount);
    });
    const totalEarningsFormatted = totalEarnings / 100;
    console.log(`Total Earnings: ${totalEarningsFormatted.toFixed(2)} ${transactions[0]?.currency}`);
    return totalEarningsFormatted;
  } catch (error) {
    console.error('Error fetching total earnings:', error);
    throw error;
  }
}

/**
 * Calculates earnings for the current month.
 * @param {string} stripeAccount - connect account0 id for the seller
 * @returns {Promise<number>} - A promise that resolves to the earnings for the current month in the smallest currency unit (e.g., cents).
 */
async function getMonthlyEarnings(stripeAccount) {
  try {
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000;
    const endDate = Math.floor(new Date().getTime() / 1000);
    const transactions = await fetchAllBalanceTransactions(
      {
        created: {
          gte: startDate,
          lte: endDate,
        },
      },
      { stripeAccount }
    );
    let monthlyEarnings = 0;
    transactions.forEach((transaction) => {
      monthlyEarnings += transaction.amount;
    });
    const monthlyEarningsFormatted = monthlyEarnings / 100;
    console.log(`This Month's Earnings: ${monthlyEarningsFormatted.toFixed(2)} ${transactions[0]?.currency}`);
    return monthlyEarningsFormatted;
  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    throw error;
  }
}

/**
 * Get the balance from stripe connect account
 * @param {string} stripeAccount - connect account id for the seller
 * @returns {Promise<object>} - A promise that resolves to the earnings for the current balance.
 */
async function getBalance(stripeAccount) {
  try {
    const balance = await stripe.balance.retrieve({ stripeAccount });
    return balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
}

/**
 * Get the balance from stripe connect account
 * @param {string} stripeAccount - connect account id for the seller
 * @returns {Promise<object>} - A promise that resolves to the earnings for the current balance.
 */
const getBalanceSummary = async (stripeAccount) => {
  try {
    // Fetch balance
    const balance = await getBalance(stripeAccount);

    // Fetch balance transactions
    const balanceTransactions = await fetchAllBalanceTransactions({}, { stripeAccount });

    // Calculate total earnings and total withdrawn
    let totalEarnings = 0;
    let totalWithdrawn = 0;
    let platformFee = 0;

    balanceTransactions.forEach((txn) => {
      platformFee += txn.fee;
      if (txn.type === 'charge' && txn.amount > 0) {
        totalEarnings += txn.amount;
      } else if (txn.type === 'payout' && txn.amount < 0) {
        totalWithdrawn += Math.abs(txn.amount);
      }
    });

    // Convert amounts from cents to dollar
    totalEarnings = totalEarnings / 100;
    totalWithdrawn = totalWithdrawn / 100;
    platformFee = platformFee / 100;

    const available = balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100;

    return { totalEarnings, totalWithdrawn, available, platformFee };
  } catch (error) {
    throw error;
  }
};

/**
 * Get the balance from stripe connect account
 * @param {string} sellerId - id of the seller
 * @returns {Promise<object>} - A promise that resolves to the earnings for the current stats.
 */

async function getSellerStatistics(sellerId) {
  try {
    //get the plan type of the seller
    const seller = await Seller.findById(sellerId).populate('planId');

    // Count the number of customers for the seller
    const customerCountPromise = SellerCustomers.countDocuments({ sellerId: sellerId }).exec();

    // Count the number of models hosted by the seller
    const modelCountPromise = Model.countDocuments({ seller: sellerId }).exec();

    // Wait for both counts to complete
    const [customerCount, modelCount] = await Promise.all([customerCountPromise, modelCountPromise]);

    return {
      customerCount,
      modelCount,
      planType: seller?.planId?.name,
    };
  } catch (error) {
    console.error('Error fetching seller statistics:', error);
    throw error;
  }
}

const getAnnualRevenue = async (connectId) => {
  let perMonthRevenueList = [];
  let revenueMonths = [];
  // const startDate = new Date();
  const transactions = await fetchAllBalanceTransactions({}, { stripeAccount: connectId });
  const perMonthTransactions = groupBy(
    transactions,
    ({ created }) =>
      `${String(new Date(created * 1000).getMonth()).padStart(2, '0')}-${new Date(created * 1000).getFullYear()}`
  );

  Object.keys(perMonthTransactions).forEach((item) => {
    let totalEarnings = 0;

    perMonthTransactions[item]?.forEach((txn) => {
      if (txn.type === 'charge' && txn.amount > 0) {
        totalEarnings += txn.amount - txn?.fee;
      }
    });

    perMonthRevenueList.push(totalEarnings);
    revenueMonths.push(item);
  });

  const finalData = { perMonthRevenueList, revenueMonths };
  return finalData;
};

const getAllSellerCustomers = async (sellerId) => {
  try {
    const customers = await SellerCustomers.find({ sellerId }).populate('customerId');
    return customers;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

const getAllSellerCustomersWithModels = async (id) => {
  try {
    const sellerId = mongoose.Types.ObjectId(id);

    const customers = await SellerCustomers.aggregate([
      // Match the sellerId
      { $match: { sellerId: sellerId } },

      // Lookup user details
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerDetails',
        },
      },

      // Unwind the customer details array
      { $unwind: '$customerDetails' },

      // Lookup purchased models
      {
        $lookup: {
          from: 'modelpurchases',
          localField: 'customerId',
          foreignField: 'user',
          as: 'purchasedModels',
        },
      },

      // Unwind the purchased models array
      { $unwind: { path: '$purchasedModels', preserveNullAndEmptyArrays: true } },

      // Lookup model details
      {
        $lookup: {
          from: 'models',
          localField: 'purchasedModels.model',
          foreignField: '_id',
          as: 'modelDetails',
        },
      },

      // Unwind the model details array
      { $unwind: { path: '$modelDetails', preserveNullAndEmptyArrays: true } },

      // Group by customer and aggregate models
      {
        $group: {
          _id: '$_id',
          sellerId: { $first: '$sellerId' },
          customerId: { $first: '$customerDetails' },
          stripeCustomerId: { $first: '$stripeCustomerId' },
          subscribedModels: {
            $push: {
              modelId: '$modelDetails._id',
              modelName: '$modelDetails.name',
            },
          },
        },
      },

      // Project the final structure
      {
        $project: {
          _id: 1,
          sellerId: 1,
          customerId: {
            role: '$customerId.role',
            name: '$customerId.name',
            email: '$customerId.email',
            stripeId: '$customerId.stripeId',
            id: '$customerId._id',
          },
          stripeCustomerId: 1,
          subscribedModels: {
            $filter: {
              input: '$subscribedModels',
              as: 'model',
              cond: { $ne: ['$$model.modelId', null] },
            },
          },
        },
      },
    ]);
    return customers;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

const getRevenueModelByCustomersAndSellerId = async (models) => {
  let modelsWithCustomerCount = [];
  try {
    for (const model of models) {
      const aggregationResult = await ModelPurchase.aggregate([
        {
          $match: {
            model: model._id,
            purchaseDate: { $gte: model.createdAt },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$purchaseDate' },
              year: { $year: '$purchaseDate' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      const monthlyCounts = {};
      console.log({ aggregationResult });
      aggregationResult.forEach((result) => {
        const monthYear = `${String(result._id.month).padStart(2, '0')}/${result._id.year}`;
        monthlyCounts[monthYear] = result.count;
      });

      modelsWithCustomerCount.push({ id: model._id, modelName: model.name, data: monthlyCounts });
    }

    return modelsWithCustomerCount;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

const getAllModels = async (seller) => {
  let charges = [];
  try {
    const models = await Model.find({ seller });
    return models;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

module.exports = {
  createStripeCheckoutSession,
  createSeller,
  createConnectAccount,
  createConnectLink,
  findSellerById,
  getManageBillingPortalLink,
  sendSellerVerificationEmail,
  verifySellerEmail,
  findSellerByUserId,
  findSellerCustomer,
  createSellerCustomerIfNotExists,
  fetchAllBalanceTransactions,
  getMonthlyEarnings,
  getTotalEarnings,
  getBalance,
  getBalanceSummary,
  getSellerStatistics,
  getAnnualRevenue,
  getAllSellerCustomers,
  getRevenueModelByCustomersAndSellerId,
  getAllModels,
  getAllSellerCustomersWithModels,
};
