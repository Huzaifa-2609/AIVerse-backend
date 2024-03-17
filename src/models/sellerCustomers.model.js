const mongoose = require('mongoose');

// Define a schema
const sellerCustomersSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripeCustomerId: {
    type: String,
    required: true,
  },
});

/**
 * @typedef SellerCustomers
 */
const SellerCustomers = mongoose.model('SellerCustomers', sellerCustomersSchema);

module.exports = SellerCustomers;
