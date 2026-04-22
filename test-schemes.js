const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/schemes',
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
            if (json.schemes) {
                console.log('Number of schemes:', json.schemes.length);
                if (json.schemes.length > 0) {
                    console.log('First scheme:', json.schemes[0].title);
                    console.log('Last scheme:', json.schemes[json.schemes.length - 1].title);
                }
            } else {
                console.log('No schemes property found in response');
            }
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
