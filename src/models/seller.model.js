const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema(
  {
    user_id: {
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

    isEmailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    connectId: {
      type: String,
      required: false,
    },
    businessEmail: {
      type: String,
      required: true,
    },
    occupation: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;
