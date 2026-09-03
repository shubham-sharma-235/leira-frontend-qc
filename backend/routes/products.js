const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protectAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/slug/:id', getProductBySlug);
router.get('/:id', getProduct);

// Admin-only routes (separate Admin collection)
router.post('/', protectAdmin, createProduct);
router.put('/:id', protectAdmin, updateProduct);
router.delete('/:id', protectAdmin, deleteProduct);

module.exports = router;

