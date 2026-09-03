const express = require('express');
const router = express.Router();
const { protect, protectAdmin } = require('../middleware/auth');
const {
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  trackMyOrder,
  getAdminOrders,
  updateAdminOrderStatus,
  deleteAdminOrder,
  markAdminOrderPaid,
  retryAdminOrderSms,
  retryAdminOrderWhatsApp,
  retryAdminOrderShippedWhatsApp,
  retryAdminOrderDeliveredWhatsApp,
  retryAdminEshipzSync,
} = require('../controllers/orderController');

// Customer routes
router.get('/my', protect, getMyOrders);
router.get('/my/track/:query', protect, trackMyOrder);
router.patch('/my/:id/cancel', protect, cancelMyOrder);
router.get('/my/:id', protect, getMyOrderById);

// Admin routes
router.get('/admin', protectAdmin, getAdminOrders);
router.patch('/admin/:id/status', protectAdmin, updateAdminOrderStatus);
router.patch('/admin/:id/mark-paid', protectAdmin, markAdminOrderPaid);
router.patch('/admin/:id/order-sms', protectAdmin, retryAdminOrderSms);
router.patch('/admin/:id/order-whatsapp', protectAdmin, retryAdminOrderWhatsApp);
router.patch('/admin/:id/order-shipped-whatsapp', protectAdmin, retryAdminOrderShippedWhatsApp);
router.patch('/admin/:id/order-delivered-whatsapp', protectAdmin, retryAdminOrderDeliveredWhatsApp);
router.patch('/admin/:id/eshipz-sync', protectAdmin, retryAdminEshipzSync);
router.delete('/admin/:id', protectAdmin, deleteAdminOrder);

module.exports = router;

