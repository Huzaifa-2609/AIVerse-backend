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
 * @param {Object} model - Model details
 * @returns {Promise<{ id: string, priceId: string | null }>} - Promise that resolves to the created product's ID and price ID
 */
const createModelProduct = async (model) => {
  try {
    const stripeProduct = await stripe.products.create({
      name: model.name,
    });
    return { id: stripeProduct.id, priceId: null };
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    throw error;
  }
};

/**
 * Create a new price (product variant) in Stripe
 * @param {string} productId - ID of the stripe product the price belongs to
 * @param {Object} product - Product details
 * @returns {Promise<Object>} - Promise that resolves to the created price object
 */
const createModelPrice = async (productId, product) => {
  try {
    const price = await stripe.prices.create({
      unit_amount: product.price * 100,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      product: productId,
    });
    return price;
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    throw error;
  }
};

/**
 * Create a new product and its price in Stripe
 * @param {Object} product - Product details
 * @returns {Promise<{ id: string, priceId: string }>} - Promise that resolves to the created product's ID and price ID
 */
const createStripeModel = async (product) => {
  try {
    const { id } = await createModelProduct(product);
    const price = await createModelPrice(id, product);
    return { id: id, priceId: price.id };
  } catch (error) {
    console.error('Error creating Stripe product and price:', error);
    throw error;
  }
};

module.exports = {
  getModelWithSellerDetails,
  createStripeModel,
};
