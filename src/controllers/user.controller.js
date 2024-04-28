const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, sellerService, modelService } = require('../services');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  let seller = null;
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user?.isDeveloper) {
    seller = await sellerService.findSellerByUserId(user.id);
  }
  res.send({ user, seller: seller });
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const updatePassword = catchAsync(async (req, res) => {
  const user = await userService.updatePasswordById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const createUserCheckoutSession = catchAsync(async (req, res) => {
  const { userId, modelId } = req.body;

  const isAlreadyTaken = await modelService.getModelPurchaseDetails(modelId, userId);

  if (isAlreadyTaken) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'User has already purchase the model' });
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'There may be an issue with the user id' });
  }

  const model = await modelService.getModelWithSellerDetails(modelId);
  if (!model) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'There may be an issue with the model id' });
  }

  const sellerCustomer = await sellerService.findSellerCustomer(userId);

  const url = await userService.createUserCheckoutSession(model, user, sellerCustomer);
  res.status(httpStatus.OK).json({ url });
});

const getUserModels = async (req, res) => {
  const { userId } = req.params;
  const allModels = await userService.getAllModelsByUserId(userId);
  res.status(httpStatus.OK).json({ allModels });
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  updatePassword,
  deleteUser,
  createUserCheckoutSession,
  getUserModels,
};
