const mongoose = require('mongoose');

const consumptionSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Plan',
    },

    sellerId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Seller',
      required: true,
    },

    noOfModels: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

const Consumptions = mongoose.model('Consumptions', consumptionSchema);

module.exports = Consumptions;
