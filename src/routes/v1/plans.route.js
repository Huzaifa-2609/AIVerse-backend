const express = require('express');
const router = express.Router();
const planController = require('../../controllers/plan.controller');

router.get('/', planController.getAllPlans);
router.post('/create', planController.createPlan);

module.exports = router;
