const cloudinary = require('cloudinary');
const Model = require('../models/model.model');
const Seller = require('../models/seller.model');
const { modelService } = require('../services');
const { hostModelToAWS } = require('../controllers/modelhost.controller');
const { deleteFromS3, deleteEcrImage, deleteAllModelConfigFromSagemaker } = require('../Helper/awshelper');
const ModelPurchase = require('../models/modelPurchase.model');

exports.createModel = async (req, res) => {
  const { name, description, img, price, seller, category, usecase } = req.body;

  try {
    let response;
    if (img) {
      response = await cloudinary.v2.uploader.upload(img, {
        folder: 'models',
        transformation: [{ width: 275, height: 170 }],
      });
    }

    var newModel = await Model.create({
      name,
      description,
      img: response?.secure_url,
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

    const stripeModel = await modelService.createStripeModel(newModel, existingSeller);
    newModel.priceId = stripeModel.priceId;
    newModel.save();
    res.status(201).json({ message: 'Model created successfully', model: newModel });
  } catch (error) {
    console.log(error);
    newModel?.remove();
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
exports.deleteModel = async (req, res) => {
  try {
    const { id } = req.params;
    const model = await Model.findByIdAndDelete(id);
    const repoName = 'aiverseecr';

    if (!model) {
      return res.status(404).json({ message: 'Model not found' });
    }

    deleteFromS3(model.bucketname, model.bucketobjectkey);
    deleteEcrImage(repoName, model.imagetag);
    deleteAllModelConfigFromSagemaker(model.name);

    res.status(200).json({ message: 'Model deleted successfully' });
  } catch (error) {
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
exports.hostModel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ isError: true, message: 'No files were uploaded.' });
    }
    console.log('The Uploaded File is : ', req.file);

    let model = await Model.findById(req.params.id);
    model.name = model.name.replace(/\s+/g, '');
    await hostModelToAWS(req, res, model);
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
    const purchase = await ModelPurchase.findOne({ model: model._id });
    const isPurchased = !!purchase;

    const modelWithPurchaseFlag = {
      ...model.toObject(),
      isPurchased,
    };

    return res.send(modelWithPurchaseFlag);
  } catch (error) {
    return res.status(404).send({ message: error.message });
  }
};

exports.getModels = async (req, res) => {
  try {
    const { currentPage = 1, category, usecase, q } = req.query;
    const perPage = 8;
    let query = { status: 'InService' };

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

    const offset = (currentPage - 1) * perPage;

    const totalCount = await Model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);
    const models = await Model.find(query).limit(perPage).skip(offset).sort({ createdAt: -1 });

    res.status(200).json({
      models,
      totalPages,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.getModelsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { modelName, page = 1 } = req.query;
    const perPage = 3;

    const query = { seller: sellerId };

    const offset = (page - 1) * perPage;

    if (modelName) {
      query.name = { $regex: new RegExp(modelName, 'i') };
    }

    const totalModels = await Model.countDocuments(query);
    const totalPages = Math.ceil(totalModels / perPage);

    const models = await Model.find(query).skip(offset).limit(perPage).sort({ createdAt: -1 });

    const modelsWithPurchaseFlag = await Promise.all(
      models.map(async (model) => {
        const purchase = await ModelPurchase.findOne({ model: model._id });
        return {
          ...model.toObject(),
          isPurchased: !!purchase,
        };
      })
    );

    res.status(200).json({ models: modelsWithPurchaseFlag, totalPages });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.createReview = async (req, res) => {
  try {
    const reviewData = req.body;
    const review = await modelService.createReview(reviewData);
    console.log({ review });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReviewsByModelId = async (req, res) => {
  try {
    const { modelId } = req.params;
    const reviews = await modelService.getReviewsByModelId(modelId);
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
