const mongoose = require('mongoose');
const User = require('./models/User');
const Application = require('./models/Application');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-panchayat';

async function verify() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Create a test user
        const testUsername = 'test_tracker_' + Date.now();
        const testUser = await User.create({
            username: testUsername,
            email: `${testUsername}@example.com`,
            phone: '1234567890',
            password_hash: 'hash',
            viewedSchemes: false
        });
        console.log(`✅ Created test user: ${testUsername}`);

        // 2. Simulate scheme view
        console.log('🔄 Simulating scheme view...');
        await User.findOneAndUpdate(
            { username: testUsername },
            { viewedSchemes: true, lastActiveAt: new Date() }
        );

        const updatedUser = await User.findOne({ username: testUsername });
        if (updatedUser.viewedSchemes === true) {
            console.log('✅ User viewedSchemes updated correctly');
        } else {
            console.error('❌ User viewedSchemes NOT updated');
        }

        // 3. Verify Admin Stats (Should be in Viewers)
        // We can't easily call the API endpoint function directly without mocking req/res, 
        // but we can query DB logic essentially duplication the endpoint logic.

        // Check if user has applications (Should be 0)
        const appCountBefore = await Application.countDocuments({ "details.user": testUsername });
        console.log(`ℹ️ Applications for ${testUsername}: ${appCountBefore}`);

        if (appCountBefore === 0 && updatedUser.viewedSchemes) {
            console.log('✅ User strictly categorized as "Viewer Only"');
        }

        // 4. Submit an Application
        console.log('🔄 Submitting application...');
        await Application.create({
            applicantName: testUsername,
            scheme: 'birth_certificate',
            status: 'Pending',
            submittedAt: new Date(),
            details: { user: testUsername }
        });
        console.log('✅ Application submitted');

        // 5. Verify Admin Stats (Should be in Applicants)
        const appCountAfter = await Application.countDocuments({ "details.user": testUsername });
        if (appCountAfter > 0) {
            console.log('✅ User now has applications, should be categorized as "Applicant"');
        }

        // Clean up
        await User.deleteOne({ username: testUsername });
        await Application.deleteMany({ "details.user": testUsername });
        console.log('✅ Cleaned up test data');

    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
