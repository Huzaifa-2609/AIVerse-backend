const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    contact_info: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;
