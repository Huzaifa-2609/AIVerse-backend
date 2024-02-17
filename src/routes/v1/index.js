const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const modelRoute = require('./model.route');
const sellerRoute = require('./seller.route');
const planRoutes = require('./plans.route');
const webhookRoutes = require('./webhook.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/models',
    route: modelRoute,
  },
  {
    path: '/seller',
    route: sellerRoute,
  },
  {
    path: '/plan',
    route: planRoutes,
  },
  // {
  //   path: '/webhook',
  //   route: webhookRoutes,
  // },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
