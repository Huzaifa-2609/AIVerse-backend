const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true, maxlength: 250 },
    img: { type: String, required: true },
    price: { type: Number },
    owner: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Seller',
      required: true,
    },
    category: { type: String },
    usecase: { type: String },
    documentation: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Model', modelSchema);
