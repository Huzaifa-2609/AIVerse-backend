const Model = require('../models/model.model');

const cloudinary = require('cloudinary');

exports.createModel = async (req, res) => {
  try {
    const { name, description, img, price, owner, category, usecase } = req.body;

    const response = await cloudinary.v2.uploader.upload(img, {
      folder: 'models',
      transformation: [{ width: 275, height: 170 }],
    });

    await Model.create({
      name,
      description,
      img: response.secure_url,
      price,
      owner,
      category,
      usecase,
    });

    res.status(201).json({ message: 'Model created successfully' });
  } catch (error) {
    console.log(error);
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
    const { currentPage = 1, category, usecase } = req.query;
    const perPage = 12;
    let query = {};

    if (category) {
      query.category = Array.isArray(category) ? { $in: category } : category;
    }

    if (usecase) {
      query.usecase = Array.isArray(usecase) ? { $in: usecase } : usecase;
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

exports.getModelsBySearch = async (req, res) => {
  try {
    const { q } = req.query;

    const models = await Model.find({
      $or: [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }],
    }).limit(12);

    return res.status(200).json({ message: 'success', data: models });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
