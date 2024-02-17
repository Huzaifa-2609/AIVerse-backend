const { app } = require('../config/config');
const stripe = require('../config/stripe');
const { Seller } = require('../models');

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

module.exports = {
  createStripeCheckoutSession,
  createSeller,
};
