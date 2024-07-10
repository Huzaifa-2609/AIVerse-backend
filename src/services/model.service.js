const { sellerService } = require('.');
const stripe = require('../config/stripe');
const { Model, ModelPurchase, Review } = require('../models');

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

const getModelPurchaseDetails = async (model, user) => {
  try {
    const modelPurchaseData = await ModelPurchase.findOne({ model, user });
    return modelPurchaseData;
  } catch (error) {
    console.error('Error finding model purchase details');
    throw error;
  }
};

const getPurchaseModelDataWithSellerInfoWithPurchaseID = async (purchaseId) => {
  try {
    const modelPurchaseData = await ModelPurchase.findById(purchaseId).populate({
      path: 'model',
      populate: {
        path: 'seller',
      },
    });
    return modelPurchaseData;
  } catch (error) {
    console.error('Error finding model purchase details');
    throw error;
  }
};

const createReview = async (reviewData) => {
  try {
    const review = new Review(reviewData);
    await review.save().then((r) => r.populate('userId'));
    const populatedReview = await Review.findById(review._id).populate('userId', 'name');

    const model = await Model.findById(reviewData.modelId);
    const reviews = await Review.find({ modelId: reviewData.modelId });
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((acc, cur) => acc + cur.rating, 0) / totalReviews;

    model.averageRating = averageRating;
    await model.save();

    return populatedReview;
  } catch (error) {
    console.error('Error creating model review');
    throw error;
  }
};

const getReviewsByModelId = async (modelId) => {
  try {
    return await Review.find({ modelId }).populate('userId', 'name');
  } catch (error) {
    console.error('Error finding model reviews');
    throw error;
  }
};

module.exports = {
  getModelWithSellerDetails,
  createStripeModel,
  getModelPurchaseDetails,
  getPurchaseModelDataWithSellerInfoWithPurchaseID,
  createReview,
  getReviewsByModelId,
};
