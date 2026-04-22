require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-panchayat';

const username = process.argv[2] || 'user';
const password = process.argv[3] || 'user123';
const email = process.argv[4] || 'user@example.com';
const phone = process.argv[5] || '+919876543210';

async function createUser() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        const existing = await User.findOne({ username });
        if (existing) {
            console.log(`❌ User with username "${username}" already exists!`);
            console.log(`   To create a different user, use: node create-user.js <username> <password> <email> <phone>`);
            process.exit(1);
        }

        // Hash password
        console.log('🔐 Hashing password...');
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        console.log('👤 Creating user account...');
        await User.create({
            username,
            password_hash: passwordHash,
            email,
            phone
        });

        console.log('✅ User account created successfully!');
        console.log('\n📋 User Credentials:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log(`   Email: ${email}`);
        console.log(`   Phone: ${phone}`);
        console.log('\n🚀 You can now login as a citizen at: http://localhost:3000');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating user:', err.message);
        process.exit(1);
    }
}

createUser();
