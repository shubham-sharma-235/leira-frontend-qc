const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Load .env from backend folder (PM2 cwd may differ)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { isS3Enabled, getBucket, getCloudFrontUrl } = require('./services/s3Media');

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for image serving
})); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev')); // Logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leira', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
})
.catch((err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1);
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Leira API Server is running!',
    version: '1.0.0',
    status: 'active'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Legacy local uploads — only when S3 is off (migration complete: USE_S3_MEDIA=true)
const localUploadsDir = path.join(__dirname, 'uploads');
if (!isS3Enabled() && fs.existsSync(localUploadsDir)) {
  app.use('/uploads', express.static(localUploadsDir));
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/collaborations', require('./routes/collaborations'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/home-videos', require('./routes/homeVideos'));
app.use('/api/home-combos', require('./routes/homeCombos'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (isS3Enabled()) {
    console.log(`☁️  Media storage: S3 (${getBucket()}) via ${getCloudFrontUrl() || 'direct S3 URL'}`);
  } else {
    console.log('📁 Media storage: local backend/uploads (set USE_S3_MEDIA=true for S3)');
  }
});

