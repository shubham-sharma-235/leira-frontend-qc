const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

dotenv.config();

// Creates admin in separate Admin collection (not in User DB)
const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leira');
    console.log('✅ MongoDB Connected');

    const existingAdmin = await Admin.findOne({ email: 'admin@leira.com' });

    if (existingAdmin) {
      console.log('⚠️  Admin already exists (separate Admin collection)');
      process.exit(0);
    }

    const admin = await Admin.create({
      name: 'Admin',
      email: 'admin@leira.com',
      password: 'Admin@123'  // Change in production!
    });

    console.log('✅ Admin created successfully (separate DB/collection)');
    console.log('📧 Email: admin@leira.com');
    console.log('🔑 Password: Admin@123');
    console.log('⚠️  Change password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
