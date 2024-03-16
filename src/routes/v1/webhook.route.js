const express = require('express');
const webhookController = require('../../controllers/webhook.controller');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);
router.post('/user', express.raw({ type: 'application/json' }), webhookController.handleConnectWebhook);

module.exports = router;
