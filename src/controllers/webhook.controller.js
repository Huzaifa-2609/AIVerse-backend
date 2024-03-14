const stripe = require('../config/stripe');
const config = require('../config/config');
const { events } = require('../constants/events');
const webhookService = require('../services/webhook.service');
const catchAsync = require('../utils/catchAsync');

const handleStripeWebhook = catchAsync(async (req, res) => {
  //   const payload = req.body;

  const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripe.webhookSecret);

  switch (event.type) {
    case events.SUBSCRIPTION_CREATED:
      console.log(event.data.object);
      await webhookService.updatePlan(event.data.object);
      break;

    case events.SUBSCRIPTION_UPDATED:
      await webhookService.updatePlan(event.data.object);
      break;

    case events.SUBSCRIPTION_DELETED:
      await webhookService.deletePlan(event.data.object);
      break;
  }

  res.sendStatus(200);
});

module.exports = {
  handleStripeWebhook,
};
