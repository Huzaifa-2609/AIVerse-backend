const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const stripe = require('../config/stripe');
const { app } = require('../config/config');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already taken');
  }
  if (updateBody.name && (await User.isNameTaken(updateBody.name, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Name is already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const updatePasswordById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const { password, newPassword, confirm } = updateBody;
  const isPasswordMatch = await user.isPasswordMatch(password);
  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect current password');
  } else if (newPassword !== confirm) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password and confirm password must match');
  } else if (password === newPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password must be different from the current password');
  } else if (newPassword.length < 8) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'password must be at least 8 characters long');
  } else if (!newPassword.match(/\d/) || !newPassword.match(/[a-zA-Z]/)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'password must contain at least one letter and one number');
  }
  user.password = newPassword;
  Object.assign(user);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

/**
 * Creates a new customer in the Stripe payment system.
 * @param {string} name - The name of the customer.
 * @param {string} email - The email address of the customer.
 * @returns {Promise<object>} - A Promise that resolves with the created customer object from Stripe.
 * @throws {Error} - If there is an error during the customer creation process.
 */

const createStripeCustomer = async (name, email) => {
  try {
    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      name: name,
      email: email,
    });

    // Return the created customer object
    return customer;
  } catch (error) {
    // Handle any errors that occur during the customer creation process
    console.error('Error creating Stripe customer:', error);
    throw new Error('Failed to create Stripe customer');
  }
};

/**
 * Creates a Stripe checkout session for subscription.
 * @param {object} seller - Seller object containing user information.
 * @param {object} model - Model object containing model information.
 * @param {object} sellerCustomer - sellerCustomer object containing customer of seller information.
 * @returns {Promise<string>} - Returns a Promise that resolves with the URL of the created Stripe checkout session.
 */

const createUserCheckoutSession = async (model, user, sellerCustomer) => {
  const { name, email, stripeId } = user;
  const { seller, priceId } = model;
  if (!seller) {
    throw new Error('There is no seller associated with this model id');
  }
  const connectId = seller.connectId;
  const customer = sellerCustomer?.stripeCustomerId;

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: 'auto',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customer,
      subscription_data: {
        application_fee_percent: 10,
        metadata: {
          name: name,
          email,
        },
      },
      customer_email: customer ? undefined : email,
      metadata: {
        name: name,
        email,
      },
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: `${app.appUrl}/marketplace?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${app.appUrl}/pricing?canceled=true`,
    },
    {
      stripeAccount: connectId,
    }
  );

  return session.url;
};

/**
 * Retrieves a customer from Stripe using the customer ID.
 * @param {string} customerId - The ID of the customer to retrieve.
 * @param {string|null} connectId - (Optional) The ID of the connected Stripe account.
 * @returns {Promise<Object>} - A promise that resolves with the customer object.
 */
async function retrieveCustomer(customerId, connectId = null) {
  try {
    const options = connectId ? { stripeAccount: connectId } : undefined;
    const customer = await stripe.customers.retrieve(customerId, options);
    return customer;
  } catch (error) {
    throw new Error(`Error retrieving customer: ${error.message}`);
  }
}

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  updatePasswordById,
  deleteUserById,
  createStripeCustomer,
  createUserCheckoutSession,
  retrieveCustomer,
};
