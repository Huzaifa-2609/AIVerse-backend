const mongoose = require('mongoose');
const generateModelApiKey = require('../Helper/generateApiKey');

const modelPurchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    model: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Model',
      required: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
    apiKey: {
      type: String,
      unique: true,
      default: function () {
        const modelId = this.model;
        const userId = this.user;
        return generateModelApiKey(modelId, userId);
      },
    },
  },
  {
    timestamps: true,
  }
);

const ModelPurchase = mongoose.model('ModelPurchase', modelPurchaseSchema);

module.exports = ModelPurchase;
