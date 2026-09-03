/**
 * One-time: rename Complete Trio product slug (remove Mother's Day from URL).
 *
 * Usage:
 *   node scripts/renameCompleteTrioSlug.js
 *   DRY_RUN=true node scripts/renameCompleteTrioSlug.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Product = require('../models/Product');

const OLD_ID = 'complete-trio-full-mother-s-day-description';
const NEW_ID = 'the-complete-trio-all-3';
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leira');

  const product = await Product.findOne({ id: OLD_ID });
  if (!product) {
    const existing = await Product.findOne({ id: NEW_ID });
    if (existing) {
      console.log(`Already migrated — product id is "${NEW_ID}".`);
      await mongoose.disconnect();
      return;
    }
    console.log(`No product found with id "${OLD_ID}". Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const conflict = await Product.findOne({ id: NEW_ID });
  if (conflict && String(conflict._id) !== String(product._id)) {
    throw new Error(`Cannot rename: another product already uses id "${NEW_ID}".`);
  }

  const updates = {
    id: NEW_ID,
    folderPath: `/uploads/products/${NEW_ID}`,
  };

  console.log(DRY_RUN ? '[DRY RUN] Would update:' : 'Updating:', {
    _id: product._id,
    name: product.name,
    from: OLD_ID,
    to: NEW_ID,
  });

  if (!DRY_RUN) {
    await Product.updateOne({ _id: product._id }, { $set: updates });
    console.log('Done. Restart frontend/backend and old URL will redirect via next.config.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
