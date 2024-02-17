const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Plan',
    },
    isSubscriptionActive: {
      type: Boolean,
      required: true,
      default: false,
    },
    // connectId: {
    //   type: String,
    //   required: true,
    // },
    contactInfo: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * @typedef Seller
 */
const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;
