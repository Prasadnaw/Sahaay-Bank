const { spawn } = require('child_process');
const http = require('http');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('Launching headless Edge browser...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + process.env.TEMP + '\\edge_test_' + Date.now(),
    'http://localhost:5050/'
  ]);

  try {
    await sleep(2000);
    const tabs = await getJson('http://localhost:9222/json');
    const tab = tabs.find(t => t.url.includes('5050') && t.type === 'page') || tabs[0];
    if (!tab) throw new Error('No debugger tab found');

    const wsUrl = tab.webSocketDebuggerUrl;
    console.log('Connecting to WebSocket CDP:', wsUrl);

    const WebSocket = require('./backend/node_modules/ws') || require('ws');
    const ws = new WebSocket(wsUrl);

    let idCounter = 1;
    function sendCommand(method, params = {}) {
      return new Promise(resolve => {
        const id = idCounter++;
        const onMsg = (msg) => {
          const parsed = JSON.parse(msg.toString());
          if (parsed.id === id) {
            ws.removeListener('message', onMsg);
            resolve(parsed.result);
          }
        };
        ws.on('message', onMsg);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise(r => ws.on('open', r));
    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');

    console.log('Navigating page to http://localhost:5050/...');
    await sendCommand('Page.navigate', { url: 'http://localhost:5050/' });
    await sleep(2500);

    // Collect console errors
    const consoleErrors = [];
    ws.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
    });

    console.log('Evaluating interactive browser tests...');

    const evalResult = await sendCommand('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const results = [];

          // Wait for scripts and DOM to initialize
          for (let i = 0; i < 50; i++) {
            if (document.readyState === 'complete' && window.SahaayApp && window.SahaayAPI) break;
            await new Promise(r => setTimeout(r, 100));
          }

          // 1. Initial view should be assessment
          const assess = document.getElementById('accessibilityAssessmentView');
          results.push({ test: 'Assessment View Visible', pass: assess && assess.style.display !== 'none' });

          // 2. Click skip assessment direct button to proceed to login
          const skipBtn = document.getElementById('skipAssessmentDirectBtn');
          if (skipBtn) skipBtn.click();
          else document.querySelector('.select-pre-login-btn[data-profile="standard"]')?.click();
          await new Promise(r => setTimeout(r, 500));

          const loginView = document.getElementById('loginView');
          results.push({ test: 'Login View Opened', pass: loginView && loginView.style.display !== 'none' });

          // 3. Switch to Register Mode
          const tabReg = document.getElementById('tabModeRegister');
          tabReg?.click();
          await new Promise(r => setTimeout(r, 200));

          const regContainer = document.getElementById('registerFormContainer');
          results.push({ test: 'Register Form Displayed', pass: regContainer && !regContainer.hidden });

          // 4. Fill registration form
          document.getElementById('regFullName').value = 'Ramesh Chandra';
          document.getElementById('regUsername').value = 'ramesh.' + Date.now();
          document.getElementById('regPassword').value = 'RameshSafe2026!';
          document.getElementById('regConfirmPassword').value = 'RameshSafe2026!';
          document.getElementById('regPhone').value = '9876543210';
          
          // Trigger form submission
          const form = document.getElementById('registrationForm');
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          await new Promise(r => setTimeout(r, 700));

          // 5. Verify Dashboard entered as Ramesh
          const dash = document.getElementById('dashboardView');
          const welcome = document.querySelector('#section-overview h1')?.textContent;
          results.push({ test: 'Dashboard Visible After Register', pass: dash && !dash.hidden });
          results.push({ test: 'Greeting Contains Registered Name', pass: welcome && welcome.includes('Ramesh') });

          // 6. Test Deposit Modal
          document.getElementById('openDepositModalBtn')?.click();
          await new Promise(r => setTimeout(r, 250));
          const depModal = document.getElementById('addMoneyModal');
          results.push({ test: 'Deposit Modal Opened', pass: depModal && depModal.classList.contains('open') });

          // Click + ₹1,000 quick chip
          document.querySelector('.quick-deposit-chip[data-amt="1000"]')?.click();
          const depVal = document.getElementById('depositAmountInput')?.value;
          results.push({ test: 'Deposit Quick Chip Populated (1000)', pass: depVal === '1000' });

          // Confirm deposit
          document.getElementById('confirmDepositBtn')?.click();
          await new Promise(r => setTimeout(r, 700));

          const balText = document.getElementById('mainBalanceText')?.dataset.real;
          results.push({ test: 'Balance Updated After Deposit', pass: balText && balText.includes('1,000') });

          // 7. Test QR Modal reflects registered user's UPI ID
          document.getElementById('openMyQrBtn')?.click();
          await new Promise(r => setTimeout(r, 250));
          const myQrModal = document.getElementById('myQrModal');
          const qrUpiText = document.getElementById('myQrCardUpi')?.textContent;
          results.push({ test: 'My QR Modal Opened', pass: myQrModal && myQrModal.classList.contains('open') });
          results.push({ test: 'QR Code Encodes Ramesh UPI ID', pass: qrUpiText && qrUpiText.includes('ramesh.') });
          document.getElementById('closeMyQrBtn')?.click();

          // 8. Sign Out
          document.getElementById('signOutBtn')?.click();
          await new Promise(r => setTimeout(r, 300));
          results.push({ test: 'Signed Out Successfully', pass: dash.hidden === true });

          // 9. Sign in as Asha Patel
          document.querySelector('.select-pre-login-btn[data-profile="standard"]')?.click();
          await new Promise(r => setTimeout(r, 200));
          document.getElementById('tabModeLogin')?.click();
          document.getElementById('username').value = 'asha.patel';
          document.getElementById('password').value = 'SahaaySafe2026!';
          const chk = document.getElementById('captchaCheckbox');
          if (chk) chk.checked = true;

          document.getElementById('loginBtn')?.click();
          await new Promise(r => setTimeout(r, 700));

          const ashaWelcome = document.querySelector('#section-overview h1')?.textContent;
          results.push({ test: 'Asha Patel Login & Greeting', pass: ashaWelcome && ashaWelcome.includes('Asha') });

          return {
            results,
            consoleErrors: window.__errors || []
          };
        })()
      `
    });

    console.log('\n--- BROWSER INTERACTION TEST RESULTS ---');
    console.log('evalResult:', JSON.stringify(evalResult, null, 2));
    const out = evalResult?.result?.value;
    if (out && out.results) {
      out.results.forEach(r => {
        console.log(`[${r.pass ? 'PASS ✓' : 'FAIL ✕'}] ${r.test}`);
      });
    }

    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors Detected:', consoleErrors);
    } else {
      console.log('\n[PASS ✓] Zero JavaScript Console Errors Detected!');
    }

    const allPassed = out.results.every(r => r.pass);
    if (!allPassed) {
      console.error('\nSome UI tests failed!');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL BROWSER INTERACTION TESTS PASSED BEAUTIFULLY!');
    }

    ws.close();
  } finally {
    edge.kill();
  }
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
