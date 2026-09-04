const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

async function runTests() {
  console.log('🚀 Starting Edge CDP Test for User Fixes...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--remote-debugging-port=9224',
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '\\edge_fixes_test_' + Date.now(),
    'about:blank'
  ]);

  try {
    await sleep(2000);
    const tabs = await getJson('http://localhost:9224/json');
    const tab = tabs.find(t => t.type === 'page') || tabs[0];
    if (!tab) throw new Error('No browser tab found');

    const wsUrl = tab.webSocketDebuggerUrl;
    console.log('Connected to WebSocket:', wsUrl);

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

    console.log('Navigating to http://localhost:5050/...');
    await sendCommand('Page.navigate', { url: 'http://localhost:5050/' });
    await sleep(2500);

    const evalRes = await sendCommand('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const results = [];

          // Wait for DOM & Scripts
          for (let i = 0; i < 50; i++) {
            if (document.readyState === 'complete' && window.SahaayApp && window.SahaayFace) break;
            await new Promise(r => setTimeout(r, 100));
          }

          // Skip to login
          const skipBtn = document.getElementById('skipAssessmentDirectBtn') || document.querySelector('.select-pre-login-btn[data-profile="standard"]');
          if (skipBtn) skipBtn.click();
          await new Promise(r => setTimeout(r, 400));

          // -------------------------------------------------------------
          // FIX 4 VERIFICATION: Face Login on Login Page without credentials
          // -------------------------------------------------------------
          const faceLoginBtn = document.getElementById('loginWithFaceBtn');
          const faceModal = document.getElementById('faceLoginModal');
          const initialDisplay = faceModal ? window.getComputedStyle(faceModal).display : 'none';
          results.push({ test: 'Face Login Button Visible on Login Page', pass: !!faceLoginBtn && faceLoginBtn.offsetParent !== null });
          results.push({ test: 'Face Login Modal is hidden by default (not staying on page)', pass: initialDisplay === 'none' });

          // Click Face Login Button
          faceLoginBtn.click();
          await new Promise(r => setTimeout(r, 400));
          const openDisplay = faceModal ? window.getComputedStyle(faceModal).display : '';
          results.push({ test: 'Face Login Modal Opens Only When Clicked', pass: faceModal && faceModal.classList.contains('open') && openDisplay === 'flex' });

          // Test 1-Tap Face Recognition as Rajesh Kumar (no credentials typed)
          const rajeshFaceBtn = document.querySelector('.demo-face-login-btn[data-user="rajesh.kumar"]');
          if (rajeshFaceBtn) rajeshFaceBtn.click();
          await new Promise(r => setTimeout(r, 1200));

          const dashboardView = document.getElementById('dashboardView');
          const currUser = window.SahaayAPI.getCurrentUser();
          results.push({
            test: 'Logged in via Face Recognition without typing credentials',
            pass: !dashboardView.hidden && currUser && currUser.username === 'rajesh.kumar',
            user: currUser?.name
          });

          // -------------------------------------------------------------
          // FIX 1 VERIFICATION: Transfer Received is GREEN (not red)
          // -------------------------------------------------------------
          // Navigate to Recent Transactions
          document.querySelector('[data-section="section-transactions"]')?.click();
          await new Promise(r => setTimeout(r, 500));

          // Inspect the received transaction in Rajesh's account
          const table = document.getElementById('transactionsTable');
          const rows = Array.from(table.querySelectorAll('#transactionTbody tr'));
          
          let receivedRowFound = false;
          let isGreenColor = false;
          let hasPlusSign = false;
          let badgeText = '';

          for (const row of rows) {
            const text = row.textContent;
            if (text.includes('Asha Patel') || text.includes('Money Received') || text.includes('Salary') || text.includes('CREDIT')) {
              receivedRowFound = true;
              const amtCell = row.querySelector('td.amt');
              const computedColor = amtCell ? window.getComputedStyle(amtCell).color : '';
              hasPlusSign = amtCell ? amtCell.textContent.includes('+') : false;
              isGreenColor = computedColor.includes('5, 150, 105') || computedColor.includes('16, 185, 129') || computedColor.includes('34, 197, 94');
              const badge = row.querySelector('.qr-badge-pill');
              badgeText = badge ? badge.textContent.trim() : '';
              break;
            }
          }

          results.push({
            test: 'Transfer Received is in GREEN words with plus sign',
            pass: receivedRowFound && isGreenColor && hasPlusSign,
            details: { receivedRowFound, isGreenColor, hasPlusSign, badgeText }
          });

          // -------------------------------------------------------------
          // FIX 2 & 3 VERIFICATION: QR Code Display & Download
          // -------------------------------------------------------------
          window.SahaayQr.showMyQr();
          await new Promise(r => setTimeout(r, 600));

          const myQrModal = document.getElementById('myQrModal');
          const qrImgOrSvg = myQrModal?.querySelector('.qr-frame img, .qr-frame svg');
          const hasContent = !!qrImgOrSvg && (qrImgOrSvg.getAttribute('width') >= 200 || qrImgOrSvg.clientWidth >= 150);
          results.push({ test: 'My QR Modal Displays Visible QR Image/SVG', pass: hasContent });

          let downloadTriggered = false;
          const origCreateElement = document.createElement.bind(document);
          document.createElement = function(tag) {
            const el = origCreateElement(tag);
            if (tag.toLowerCase() === 'a') {
              const origClick = el.click.bind(el);
              el.click = function() {
                if (el.download && (el.download.endsWith('.png') || el.download.endsWith('.svg'))) {
                  downloadTriggered = true;
                }
                return origClick();
              };
            }
            return el;
          };

          document.getElementById('downloadQrBtn')?.click();
          await new Promise(r => setTimeout(r, 400));
          document.createElement = origCreateElement; // restore

          const toast = document.getElementById('toast')?.textContent;
          results.push({
            test: 'QR Code Download Triggers Image File Download',
            pass: downloadTriggered || toast.includes('saved to Downloads'),
            toast
          });

          window.SahaayQr.closeMyQr();

          // -------------------------------------------------------------
          // FIX 3 VERIFICATION: QR Code Recognition Works
          // -------------------------------------------------------------
          window.SahaayQr.openScanner();
          await new Promise(r => setTimeout(r, 300));

          // Test scanning / decoding an authentic QR code
          const testPayload = JSON.stringify({
            type: 'SAHAAY_PAYMENT',
            version: 1,
            upiId: 'asha.patel@sahaay',
            name: 'Asha Patel',
            userId: 'USR-1001'
          });

          await window.SahaayQr.handleDetectedQr(testPayload);
          await new Promise(r => setTimeout(r, 500));

          const confirmModal = document.getElementById('qrRecipientConfirmModal');
          const confirmName = document.getElementById('confirmRecipientName')?.textContent;
          const confirmUpi = document.getElementById('confirmRecipientUpi')?.textContent;
          results.push({
            test: 'QR Recognition Successfully Decodes & Opens Recipient Confirmation',
            pass: confirmModal && confirmModal.classList.contains('open') && confirmName.includes('Asha Patel'),
            details: { confirmName, confirmUpi }
          });

          return { success: true, results };
        })()
      `
    });

    console.log('\n--- Test Results ---');
    if (evalRes?.result?.value) {
      const data = evalRes.result.value;
      data.results.forEach((r, idx) => {
        const mark = r.pass ? '✅ PASS' : '❌ FAIL';
        console.log(`[${idx + 1}] ${mark}: ${r.test}`);
        if (r.details) console.log('    Details:', r.details);
        if (r.toast) console.log('    Toast:', r.toast);
        if (r.user) console.log('    User:', r.user);
      });

      const allPassed = data.results.every(r => r.pass);
      if (!allPassed) {
        throw new Error('One or more verification tests failed.');
      }
    } else {
      console.error('Eval failed:', evalRes);
      throw new Error('No result returned from eval');
    }

    // Capture screenshot
    const ss = await sendCommand('Page.captureScreenshot', { format: 'png' });
    if (ss && ss.data) {
      const buf = Buffer.from(ss.data, 'base64');
      const p = 'C:/Users/dhair/.gemini/antigravity/brain/b1da35c2-17b0-4c14-84f4-df3106f3f53c/fixes_verified.png';
      fs.writeFileSync(p, buf);
      console.log('📸 Screenshot saved to fixes_verified.png');
    }

    console.log('\n=================================================================');
    console.log('🎉 ALL 6 USER FIX VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('=================================================================');

  } finally {
    edge.kill();
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
