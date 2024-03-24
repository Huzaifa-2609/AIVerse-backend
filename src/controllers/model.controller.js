const cloudinary = require('cloudinary');
const Model = require('../models/model.model');
const Seller = require('../models/seller.model');
const { modelService } = require('../services');

exports.createModel = async (req, res) => {
  const { name, description, img, price, seller, category, usecase } = req.body;

  let model = null;
  try {
    const response = await cloudinary.v2.uploader.upload(img, {
      folder: 'models',
      transformation: [{ width: 275, height: 170 }],
    });

    const newModel = await Model.create({
      name,
      description,
      img: img ? response.secure_url : '',
      price,
      seller,
      category,
      usecase,
    });

    const existingSeller = await Seller.findOne({ _id: seller });

    if (existingSeller) {
      existingSeller.models.push(newModel._id);
      await existingSeller.save();
    }

    const stripeModel = await modelService.createStripeModel(model, existingSeller);
    model.priceId = stripeModel.priceId;
    model.save();
    res.status(201).json({ message: 'Model created successfully' });
  } catch (error) {
    console.log(error);
    model?.remove();
    res.status(500).json({ message: error.message });
  }
};

exports.updateModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, img, category, usecase, documentation } = req.body;
    let updatedFields = {};

    if (name) {
      updatedFields.name = name;
    }

    if (description) {
      updatedFields.description = description;
    }

    if (img) {
      const response = await cloudinary.v2.uploader.upload(img, {
        folder: 'models',
        transformation: [{ width: 275, height: 170 }],
      });
      updatedFields.img = response.secure_url;
    }

    if (category) {
      updatedFields.category = category;
    }

    if (usecase) {
      updatedFields.usecase = usecase;
    }

    if (documentation) {
      updatedFields.documentation = documentation;
    }

    const updatedModel = await Model.findByIdAndUpdate(id, updatedFields, { new: true });

    res.status(200).json({ message: 'Model updated successfully', model: updatedModel });
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
    const { id } = req.params;
    const model = await Model.findById(id);
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

exports.getModelsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { modelName } = req.query;

    const query = { seller: sellerId };

    if (modelName) {
      query.name = { $regex: new RegExp(modelName, 'i') };
    }

    const models = await Model.find(query).limit(3);

    res.status(200).json({ models });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
