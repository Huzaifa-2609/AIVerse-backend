const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    img: { type: String },
    price: { type: Number, required: true },
    owner: { type: String, required: true },
    category: { type: String, required: true },
    usecase: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Model', modelSchema);
