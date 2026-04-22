
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-panchayat';

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin123';
const email = process.argv[4] || 'admin@panchayat.gov';
const phone = process.argv[5] || '+919999999999';

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected.');

    const existing = await Admin.findOne({ username });
    if (existing) {
      console.log(`❌ Admin with username "${username}" already exists!`);
      console.log(`   To create a different admin, use: node create-admin.js <username> <password> <email> <phone>`);
      process.exit(1);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin
    console.log('👤 Creating admin account...');
    await Admin.create({
      username,
      password_hash: passwordHash,
      email,
      phone
    });

    console.log('✅ Admin account created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${phone}`);
    console.log('\n⚠️  Please save these credentials securely!');
    console.log('\n🚀 You can now login as admin at: http://localhost:3000');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
