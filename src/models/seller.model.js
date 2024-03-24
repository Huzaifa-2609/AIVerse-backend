const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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

    isAccountActive: {
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
      unique: true,
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
    models: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Model',
      },
    ],
  },
  {
    timestamps: true,
  }
);

sellerSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Seller already exists'));
  } else {
    next();
  }
});

/**
 * @typedef Seller
 */
const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;
