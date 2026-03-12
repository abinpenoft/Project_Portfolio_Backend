import fetch from 'node-fetch';

const testSlug = async () => {
    try {
        const url = 'http://localhost:5000/api/projects/public/slug/karunyasparsham';
        console.log(`Testing URL: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Test failed:', err);
    }
};

testSlug();
