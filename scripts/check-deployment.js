// 배포 상태 확인 스크립트
const https = require('https');

const checkDeployment = () => {
  const options = {
    hostname: 'naraddon.com',
    path: '/api/auth/providers',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response Body:', data);

      // 배포 시간 확인
      if (res.headers['x-vercel-id']) {
        console.log('Vercel Deployment ID:', res.headers['x-vercel-id']);
      }
      if (res.headers['age']) {
        console.log('Cache Age:', res.headers['age'], 'seconds');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request Error:', error);
  });

  req.end();
};

// Session 엔드포인트 체크
const checkSession = () => {
  const options = {
    hostname: 'naraddon.com',
    path: '/api/auth/session',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  };

  const req = https.request(options, (res) => {
    console.log('\nSession Endpoint:');
    console.log(`Status Code: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (data) {
        try {
          const json = JSON.parse(data);
          console.log('Parsed Response:', json);
        } catch (e) {
          console.log('Raw Response:', data);
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('Session Request Error:', error);
  });

  req.end();
};

console.log('Checking Deployment Status...\n');
checkDeployment();
setTimeout(() => checkSession(), 1000);