const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, /*required: true*/ },
    img: { type: String },
    price: { type: Number, /*required: true*/ },
    category: { type: String, /*required: true*/ },
    usecase: { type: String, /*required: true*/ },
    priceId: { type: String, required: false },
    seller: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Seller',
      required: false,
    },
    endpoint: String,
    status: { type: String, enum: ['Creating', 'Failed', 'InService'], default: 'Creating' },
    bucketname: String,
    bucketobjectkey: String,
    imagetag: String,
    ecrreponame: String
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Model', modelSchema);
