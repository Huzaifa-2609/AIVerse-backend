const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true, maxlength: 250 },
    img: { type: String, required: true },
    price: { type: String },
    seller: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Seller',
      required: true,
    },
    category: { type: String },
    usecase: { type: String },
    documentation: { type: String },
    priceId: { type: String, required: false },
    endpoint: String,
    status: { type: String, enum: ['Creating', 'Failed', 'InService'], default: 'Creating' },
    bucketname: String,
    bucketobjectkey: String,
    imagetag: String,
    ecrreponame: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Model', modelSchema);
