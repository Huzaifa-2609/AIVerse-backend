const { sellerService } = require('.');
const stripe = require('../config/stripe');
const { Model } = require('../models');

/**
 * Get user by id
 * @param {string} modelId
 * @returns {Promise<Model>}
 */
async function getModelWithSellerDetails(modelId) {
  try {
    const model = await Model.findById(modelId).populate('seller');
    return model;
  } catch (error) {
    console.error('Error retrieving model with seller details:', error);
    throw error;
  }
}

/**
 * Create a new model product in Stripe
 * @param {string} name - Name of the Model
 * @param {string} connectId - ID of the connected Stripe account
 * @returns {Promise<{ id: string, priceId: string | null }>} - Promise that resolves to the created product's ID and price ID
 */
const createModelProduct = async (name, connectId) => {
  try {
    const stripeProduct = await stripe.products.create(
      {
        name: name,
      },
      {
        stripeAccount: connectId,
      }
    );
    return { id: stripeProduct.id, priceId: null };
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    throw error;
  }
};

/**
 * Create a new price (product variant) in Stripe
 * @param {string} productId - ID of the stripe product the price belongs to
 * @param {number} price - Price of the product
 * @param {string} connectId - ID of the connected Stripe account
 * @returns {Promise<Object>} - Promise that resolves to the created price object
 */
const createModelPrice = async (productId, price, connectId) => {
  try {
    const stripePrice = await stripe.prices.create(
      {
        unit_amount: price * 100,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        product: productId,
      },
      {
        stripeAccount: connectId,
      }
    );
    return stripePrice;
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    throw error;
  }
};

/**
 * Create a new product and its price in Stripe
 * @param {Object} product - Product details
 * @param {string} product.name - Name of the product
 * @param {number} product.price - Price of the product
 * @param {string} seller - ID of the seller
 * @returns {Promise<{ id: string, priceId: string }>} - Promise that resolves to the created product's ID and price ID
 */
const createStripeModel = async (product, seller) => {
  try {
    const { price, name } = product;
    const { connectId } = await sellerService.findSellerById(seller);
    const { id } = await createModelProduct(name, connectId);
    const stripePrice = await createModelPrice(id, price, connectId);
    return { id: id, priceId: stripePrice.id };
  } catch (error) {
    console.error('Error creating Stripe product and price:', error);
    throw error;
  }
};

module.exports = {
  getModelWithSellerDetails,
  createStripeModel,
};
