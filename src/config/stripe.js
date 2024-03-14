const config = require('../config/config');

const stripe = require('stripe')(config.stripe.secretKey);

module.exports = stripe;
