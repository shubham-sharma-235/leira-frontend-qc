/**
 * One-time DB migration: rewrite legacy /uploads/... paths to CloudFront URLs.
 *
 * Usage (on EC2 after media is in S3):
 *   cd backend
 *   USE_S3_MEDIA=true AWS_CLOUDFRONT_URL=https://media.yourdomain.com node scripts/migrateMediaUrls.js
 *
 * Dry run:
 *   DRY_RUN=true AWS_CLOUDFRONT_URL=https://media.yourdomain.com node scripts/migrateMediaUrls.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Blog = require('../models/Blog');
const HomeVideo = require('../models/HomeVideo');

const mediaBase = String(process.env.AWS_CLOUDFRONT_URL || process.env.MEDIA_PUBLIC_URL || '').replace(/\/$/, '');
const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

if (!mediaBase) {
  console.error('Set AWS_CLOUDFRONT_URL or MEDIA_PUBLIC_URL before running migration.');
  process.exit(1);
}

function rewriteValue(value) {
  if (value == null) return value;
  const raw = String(value);
  if (!raw.trim()) return raw;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const uploadsIdx = raw.indexOf('/uploads/');
    if (uploadsIdx === -1) return raw;
    const key = raw.slice(uploadsIdx + '/uploads/'.length);
    return `${mediaBase}/${key.replace(/^\/+/, '')}`;
  }

  const normalized = raw.replace(/\\/g, '/');
  if (
    normalized.startsWith('/uploads/') ||
    normalized.startsWith('uploads/') ||
    normalized.startsWith('/api/uploads/') ||
    normalized.startsWith('api/uploads/')
  ) {
    const key = normalized.replace(/^\/?api\//, '').replace(/^\/?uploads\/?/, '');
    return `${mediaBase}/${key.replace(/^\/+/, '')}`;
  }

  return raw;
}

function rewriteHtml(html) {
  if (!html) return html;
  let out = String(html);
  out = out.replace(/https?:\/\/[^"'\\s]+\/uploads\//gi, `${mediaBase}/`);
  out = out.replace(/\/uploads\//g, `${mediaBase}/`);
  return out;
}

async function migrateProducts() {
  const products = await Product.find({});
  let updated = 0;
  for (const product of products) {
    const next = {
      folderPath: rewriteValue(product.folderPath),
      homeCardImage: rewriteValue(product.homeCardImage),
      shopCardImage: rewriteValue(product.shopCardImage),
      images: Array.isArray(product.images) ? product.images.map(rewriteValue) : product.images,
    };
    const changed =
      next.folderPath !== product.folderPath ||
      next.homeCardImage !== product.homeCardImage ||
      next.shopCardImage !== product.shopCardImage ||
      JSON.stringify(next.images) !== JSON.stringify(product.images);

    if (changed) {
      updated += 1;
      if (!dryRun) {
        await Product.updateOne({ _id: product._id }, { $set: next });
      }
    }
  }
  console.log(`Products updated: ${updated}${dryRun ? ' (dry run)' : ''}`);
}

async function migrateBlogs() {
  const blogs = await Blog.find({});
  let updated = 0;
  for (const blog of blogs) {
    const next = {
      imageUrl: rewriteValue(blog.imageUrl),
      coverImageMobile: rewriteValue(blog.coverImageMobile),
      content: rewriteHtml(blog.content),
      blocks: Array.isArray(blog.blocks)
        ? blog.blocks.map((block) => ({
            ...block.toObject?.() || block,
            html: block.html ? rewriteHtml(block.html) : block.html,
            imageUrl: block.imageUrl ? rewriteValue(block.imageUrl) : block.imageUrl,
          }))
        : blog.blocks,
    };

    const changed =
      next.imageUrl !== blog.imageUrl ||
      next.coverImageMobile !== blog.coverImageMobile ||
      next.content !== blog.content ||
      JSON.stringify(next.blocks) !== JSON.stringify(blog.blocks);

    if (changed) {
      updated += 1;
      if (!dryRun) {
        await Blog.updateOne({ _id: blog._id }, { $set: next });
      }
    }
  }
  console.log(`Blogs updated: ${updated}${dryRun ? ' (dry run)' : ''}`);
}

async function migrateVideos() {
  const videos = await HomeVideo.find({});
  let updated = 0;
  for (const video of videos) {
    const next = {
      videoUrl: rewriteValue(video.videoUrl),
      posterUrl: rewriteValue(video.posterUrl),
    };
    const changed = next.videoUrl !== video.videoUrl || next.posterUrl !== video.posterUrl;
    if (changed) {
      updated += 1;
      if (!dryRun) {
        await HomeVideo.updateOne({ _id: video._id }, { $set: next });
      }
    }
  }
  console.log(`Home videos updated: ${updated}${dryRun ? ' (dry run)' : ''}`);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leira');
  console.log(`Media base: ${mediaBase}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  await migrateProducts();
  await migrateBlogs();
  await migrateVideos();

  await mongoose.disconnect();
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
