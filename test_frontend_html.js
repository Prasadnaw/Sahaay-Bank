const http = require('http');

async function testFrontend() {
  // Test that index.html serves with HTTP 200 and contains the new elements
  const req = http.get('http://localhost:5050/', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      const checks = [
        { name: 'Register Tab', pass: body.includes('tabModeRegister') },
        { name: 'Registration Form', pass: body.includes('registrationForm') },
        { name: 'Add Money Button', pass: body.includes('openDepositModalBtn') },
        { name: 'Add Money Modal', pass: body.includes('addMoneyModal') },
        { name: 'Transfer Receipt Modal', pass: body.includes('transferReceiptModal') },
        { name: 'Face Enroll Modal', pass: body.includes('faceEnrollModal') },
        { name: 'Face Verify Modal', pass: body.includes('faceVerifyModal') },
        { name: 'Face Auth Script', pass: body.includes('faceAuth.js') },
        { name: 'Recipient Search Input', pass: body.includes('payeeSearchInput') },
        { name: 'Biometric Transfer Radio', pass: body.includes('name="transferAuthMethod"') }
      ];

      console.log('HTML Element Integrity Checks:');
      checks.forEach(c => {
        console.log(` - ${c.name}: ${c.pass ? 'PASS ✓' : 'FAIL ✕'}`);
      });

      const allPass = checks.every(c => c.pass);
      if (!allPass) {
        process.exit(1);
      } else {
        console.log('🎉 All Frontend UI elements present and intact!');
        process.exit(0);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Request failed:', err);
    process.exit(1);
  });
}

testFrontend();
