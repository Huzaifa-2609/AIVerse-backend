const Model = require('../models/model.model');

const cloudinary = require('cloudinary');
const { modelService } = require('../services');

exports.createModel = async (req, res) => {
  const { name, description, img, price, owner, category, usecase, seller } = req.body;

  let model = null;
  try {
    // const response = await cloudinary.v2.uploader.upload(img, {
    //   folder: 'models',
    //   transformation: [{ width: 275, height: 170 }],
    // });

    model = await Model.create({
      name,
      description,
      img: 'response.secure_url',
      price,
      owner,
      category,
      usecase,
      seller,
    });

    const stripeModel = await modelService.createStripeModel(model, seller);
    model.priceId = stripeModel.priceId;
    model.save();
    res.status(201).json({ message: 'Model created successfully' });
  } catch (error) {
    console.log(error);
    model?.remove();
    res.status(500).json({ message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    let totalCategories = await Model.distinct('category');
    res.status(200).json({ categories: totalCategories });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.getUsecases = async (req, res) => {
  try {
    let totalUsecases = await Model.distinct('usecase');
    res.status(200).json({ usecases: totalUsecases });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.getModelByName = async (req, res) => {
  try {
    const { name } = req.params;
    const model = await Model.findOne({ name });

    return res.send(model);
  } catch (error) {
    return res.status(404).send({ message: error.message });
  }
};

exports.getModels = async (req, res) => {
  try {
    const { currentPage = 1, category, usecase, q } = req.query;
    const perPage = 12;
    let query = {};

    if (category) {
      const categoryArray = category.split(',');
      query.category = Array.isArray(categoryArray) ? { $in: categoryArray } : categoryArray;
    }

    if (usecase) {
      const usecaseArray = usecase.split(',');
      query.usecase = Array.isArray(usecaseArray) ? { $in: usecaseArray } : usecaseArray;
    }

    if (q) {
      const searchQuery = {
        $or: [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }],
      };
      query = { ...query, ...searchQuery };
    }

    const totalCount = await Model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);
    const models = await Model.find(query)
      .limit(perPage)
      .skip((currentPage - 1) * perPage);

    res.status(200).json({
      models,
      currentPage,
      totalPages,
      totalCount,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
