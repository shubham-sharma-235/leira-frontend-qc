const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  getPublicHomeCombos,
  getAdminHomeCombos,
  upsertHomeCombos,
} = require('../controllers/homeComboController');

router.get('/', getPublicHomeCombos);
router.get('/admin', protectAdmin, getAdminHomeCombos);
router.put('/', protectAdmin, upsertHomeCombos);

module.exports = router;
