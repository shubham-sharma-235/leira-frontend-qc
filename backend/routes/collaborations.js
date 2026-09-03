const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  createCollaborationLead,
  getCollaborationLeads,
  updateCollaborationLeadStatus,
} = require('../controllers/collaborationController');

// Public form submit
router.post('/', createCollaborationLead);

// Admin lead management
router.get('/', protectAdmin, getCollaborationLeads);
router.patch('/:id/status', protectAdmin, updateCollaborationLeadStatus);

module.exports = router;

