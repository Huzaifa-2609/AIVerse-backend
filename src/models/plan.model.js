const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },
    plan_description: {
      type: String,
      required: false,
    },
    plan_type: {
      type: String,
      enum: ['subscription', 'one-time'],
      required: true,
    },
  },
  { timestamps: true }
);

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
