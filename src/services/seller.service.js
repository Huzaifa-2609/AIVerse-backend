const httpStatus = require('http-status');
const { tokenService, emailService } = require('.');
const { app } = require('../config/config');
const stripe = require('../config/stripe');
const { tokenTypes } = require('../config/tokens');
const { Seller, Token, SellerCustomers } = require('../models');
const ApiError = require('../utils/ApiError');

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
    success_url: `${app.appUrl}/pricing-success?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${app.appUrl}/pricing?canceled=true`,
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
    refresh_url: app.appUrl,
    return_url: app.appUrl,
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
    return_url: `${app.appUrl}`,
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
};
