const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },

    planDescription: {
      type: String,
      required: false,
    },

    priceId: {
      type: String,
      required: true,
    },

    planType: {
      type: String,
      enum: ['subscription', 'one-time'],
      required: true,
      default: 'subscription',
    },

    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: false,
    },

    noOfModelsAllowed: {
      type: Number,
      required: false,
    },
  },
  { timestamps: true }
);

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
