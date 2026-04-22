const http = require('http');

function postRequest(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function getRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET'
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTest() {
    try {
        console.log('--- Testing Application API ---');

        // 1. Submit Application
        console.log('\n1. Submitting new application...');
        const appData = JSON.stringify({
            applicantName: 'Test User',
            scheme: 'birth',
            username: 'testuser1',
            details: {
                Name: 'Test User',
                Child: 'Baby Test',
                Date: '2024-01-01'
            }
        });

        const submitRes = await postRequest('/api/applications', appData);
        console.log('Submit Response:', submitRes);

        if (!submitRes.success || !submitRes.applicationId) {
            console.error('FAILED: Application submission failed');
            return;
        }
        const newAppId = submitRes.applicationId;

        // 2. Get Applications for user
        console.log('\n2. Fetching applications for testuser1...');
        const getRes = await getRequest('/api/applications?username=testuser1');
        console.log(`Fetched ${getRes.applications?.length} applications`);

        const found = getRes.applications.find(a => a._id === newAppId);
        if (found) {
            console.log('SUCCESS: Submitted application found in user list!');
            console.log('App Details:', found);
        } else {
            console.error('FAILED: Submitted application NOT found in user list');
        }

    } catch (err) {
        console.error('Test Error:', err);
    }
}

runTest();
