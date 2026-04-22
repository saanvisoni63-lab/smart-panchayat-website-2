const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/citizen-services',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Response is valid JSON:', json.success);
            console.log('Number of services:', json.services.length);
            console.log('First service:', json.services[0].title);
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
            console.log('Raw data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
