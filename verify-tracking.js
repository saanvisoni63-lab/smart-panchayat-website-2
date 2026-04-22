const axios = require('axios'); // You might need to install axios or use http/https
const { spawn } = require('child_process');

async function testApplicationFlow() {
    const baseUrl = 'http://localhost:3000/api';
    let userId, adminId, appId;

    console.log('🚀 Starting Application Flow Test...');

    // 1. Create a User
    const uniqueUser = `testuser_${Date.now()}`;
    try {
        await axios.post(`${baseUrl}/signup`, {
            username: uniqueUser,
            email: `${uniqueUser}@example.com`,
            phone: '9876543210',
            password: 'password123'
        });
        console.log(`✅ User ${uniqueUser} created`);
    } catch (error) {
        if (error.response?.status !== 409) {
            console.error('❌ Signup failed:', error.message);
            return;
        }
        console.log(`ℹ️ User ${uniqueUser} already exists (or conflict)`);
    }

    // 2. Login User to get ID (simulated, backend doesn't return token but user info)
    // In this app, we don't have tokens, just storing session in frontend.
    // We can just proceed with creating application using the username.

    // 3. Create an Application
    try {
        const res = await axios.post(`${baseUrl}/applications`, {
            applicantName: 'Test Applicant',
            scheme: 'PM Kisan',
            username: uniqueUser, // Backend expects this for mapping
            details: {
                amount: 6000,
                land_area: '2 acres'
            }
        });
        appId = res.data.applicationId;
        console.log(`✅ Application created with ID: ${appId}`);
    } catch (error) {
        console.error('❌ Application creation failed:', error.message);
        return;
    }

    // 4. Admin Action: Mark as 'Under Process'
    try {
        const res = await axios.post(`${baseUrl}/admin/applications/${appId}/status`, {
            status: 'Under Process'
        });
        if (res.data.status === 'Under Process') {
            console.log(`✅ Application stauts updated to 'Under Process'`);
        } else {
            console.error(`❌ Status mismatch: expected 'Under Process', got '${res.data.status}'`);
        }
    } catch (error) {
        console.error('❌ Status update failed:', error.message);
        // If 400, it might mean enum isn't updated
        if (error.response?.status === 400) {
            console.error('   -> Likely due to invalid status enum.');
        }
    }

    console.log('🎉 Test Completed');
}

testApplicationFlow();
