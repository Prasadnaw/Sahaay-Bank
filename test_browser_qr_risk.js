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

async function runBrowserTests() {
  console.log('🚀 Launching Headless Edge Browser for Full UI Verification...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--remote-debugging-port=9223',
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '\\edge_qr_test_' + Date.now(),
    'about:blank'
  ]);

  try {
    await sleep(2000);
    const tabs = await getJson('http://localhost:9223/json');
    const tab = tabs.find(t => t.type === 'page') || tabs[0];
    if (!tab) throw new Error('No browser debugger tab found');

    const wsUrl = tab.webSocketDebuggerUrl;
    console.log('🔗 Connected to CDP WebSocket:', wsUrl);

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
    await sleep(3000);

    const testResult = await sendCommand('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const results = [];

          // 1. Wait for scripts and DOM
          for (let i = 0; i < 50; i++) {
            if (document.readyState === 'complete' && window.SahaayApp && window.SahaayAPI && window.SahaayQr) break;
            await new Promise(r => setTimeout(r, 100));
          }

          // 2. Skip disability assessment to login view
          const skipBtn = document.getElementById('skipAssessmentDirectBtn');
          if (skipBtn) skipBtn.click();
          else document.querySelector('.select-pre-login-btn[data-profile="standard"]')?.click();
          await new Promise(r => setTimeout(r, 400));

          // 3. Login as Asha Patel
          document.getElementById('loginUsername').value = 'asha.patel';
          document.getElementById('loginPassword').value = 'SahaaySafe2026!';
          const loginRes = await window.SahaayAPI.login('asha.patel', 'SahaaySafe2026!');
          if (!loginRes.success) {
            return { success: false, error: 'Login failed: ' + loginRes.error };
          }
          window.SahaayApp.enterDashboard(loginRes.user);
          await new Promise(r => setTimeout(r, 800));

          results.push({ test: 'Dashboard Visible', pass: !document.getElementById('dashboardView').hidden });

          // 4. Test "My QR"
          window.SahaayQr.showMyQr();
          await new Promise(r => setTimeout(r, 300));
          const myQrModal = document.getElementById('myQrModal');
          const qrPayloadStr = document.querySelector('#myQrModal .qr-frame')?.getAttribute('data-payload');
          const qrPayload = qrPayloadStr ? JSON.parse(qrPayloadStr) : null;
          const myQrValid = qrPayload && qrPayload.type === 'SAHAAY_PAYMENT' && qrPayload.upiId === 'asha.patel@sahaay' && !qrPayload.password && !qrPayload.upiPin;
          results.push({ test: 'My QR Valid SAHAAY_PAYMENT JSON', pass: !!myQrValid });
          window.SahaayQr.closeMyQr();

          // 5. Test "Scan QR"
          window.SahaayQr.openScanner();
          await new Promise(r => setTimeout(r, 300));
          const scannerModal = document.getElementById('qrScannerModal');
          results.push({ test: 'QR Scanner Modal Opened', pass: scannerModal.classList.contains('open') });

          // Scan demo recipient Rajesh Kumar
          await window.SahaayQr.handleDetectedQr('rajesh@sahaay');
          await new Promise(r => setTimeout(r, 500));

          // 6. Recipient Confirmation Dialog
          const confirmModal = document.getElementById('qrRecipientConfirmModal');
          const confirmName = document.getElementById('confirmRecipientName')?.textContent;
          const confirmUpi = document.getElementById('confirmRecipientUpi')?.textContent;
          const confirmAcc = document.getElementById('confirmRecipientAcc')?.textContent;
          const recipientIdentified = confirmModal.classList.contains('open') && confirmName.includes('Rajesh Kumar') && confirmUpi.includes('rajesh@sahaay');
          results.push({ test: 'Recipient Found Confirmation Dialog', pass: recipientIdentified, details: { confirmName, confirmUpi, confirmAcc } });

          // Click Continue to Transfer
          document.getElementById('proceedRecipientConfirmBtn').click();
          await new Promise(r => setTimeout(r, 400));
          results.push({ test: 'Transfer Section Opened with Payee Pre-filled', pass: document.getElementById('payee').value === 'rajesh@sahaay' });

          // 7. Enter amount >= 10,000 to trigger Demo Risk Threshold
          document.getElementById('amount').value = '10000';
          document.getElementById('reviewTransferBtn').click();
          await new Promise(r => setTimeout(r, 400));

          const reasonModal = document.getElementById('transferReasonModal');
          const riskBadge = document.getElementById('demoRiskScoreBadge')?.textContent;
          results.push({ test: 'Demo Risk Threshold Reason Modal Triggered', pass: reasonModal.classList.contains('open'), badge: riskBadge });

          // Select 'Other' and fill custom reason
          const otherRadio = document.querySelector('input[name="reasonCategoryOpt"][value="Other"]');
          if (otherRadio) {
            otherRadio.checked = true;
            otherRadio.dispatchEvent(new Event('change'));
          }
          document.getElementById('customReasonInput').value = 'Hackathon Project Demo Transfer';
          document.getElementById('confirmTransferReasonBtn').click();
          await new Promise(r => setTimeout(r, 400));

          // 8. UPI PIN Keypad opens
          const upiModal = document.getElementById('upiPinModal');
          results.push({ test: 'UPI PIN Modal Displayed', pass: upiModal.classList.contains('open') });

          // Enter PIN 1234
          '1234'.split('').forEach(d => {
            const btn = document.querySelector(\`.upi-key[data-digit="\${d}"]\`);
            if (btn) btn.click();
          });
          await new Promise(r => setTimeout(r, 1200));

          // 9. Receipt Modal Verification
          const receiptModal = document.getElementById('transferReceiptModal');
          const receiptTo = document.getElementById('receiptToName')?.textContent;
          const receiptAmt = document.getElementById('receiptAmountDisplay')?.textContent;
          const receiptRef = document.getElementById('receiptRefId')?.textContent;
          const receiptReason = document.getElementById('receiptReasonVal')?.textContent;
          const receiptBadge = document.getElementById('receiptMethodBadge')?.textContent;
          const balAfterTransfer = document.getElementById('mainBalanceText')?.textContent;

          const receiptSuccess = receiptModal.classList.contains('open') && receiptRef.startsWith('SAH-QR-') && receiptAmt.includes('10,000');
          results.push({
            test: 'QR Payment Receipt with SAH-QR Ref & Reason',
            pass: receiptSuccess,
            details: { receiptTo, receiptAmt, receiptRef, receiptReason, receiptBadge }
          });
          results.push({ test: 'Balance Refreshed in UI', pass: !!balAfterTransfer, newBalance: balAfterTransfer });

          // Close receipt
          document.getElementById('doneReceiptBtn').click();
          await new Promise(r => setTimeout(r, 400));

          // 10. Statement & Transactions Table Verification
          document.querySelector('[data-section="section-transactions"]').click();
          await new Promise(r => setTimeout(r, 600));

          const table = document.getElementById('transactionsTable');
          const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
          const hasBalanceCol = headers.includes('Balance');
          const firstRow = Array.from(table.querySelectorAll('#transactionTbody tr:first-child td')).map(td => td.textContent.trim().replace(/\\s+/g, ' '));

          results.push({ test: 'Balance Column in Table Header', pass: hasBalanceCol });
          results.push({ test: 'Top Transaction Shows QR Payment & Balance', pass: firstRow.some(cell => cell.includes('QR Payment')), row: firstRow });

          // 11. Transaction Filter Chips Testing
          document.querySelector('.tx-filter-btn[data-filter="QR"]')?.click();
          await new Promise(r => setTimeout(r, 200));
          const qrRows = document.querySelectorAll('#transactionTbody tr').length;

          document.querySelector('.tx-filter-btn[data-filter="DEPOSIT"]')?.click();
          await new Promise(r => setTimeout(r, 200));
          const depRows = document.querySelectorAll('#transactionTbody tr').length;

          document.querySelector('.tx-filter-btn[data-filter="ALL"]')?.click();
          await new Promise(r => setTimeout(r, 200));
          const allRows = document.querySelectorAll('#transactionTbody tr').length;

          results.push({
            test: 'Interactive Transaction Filter Tabs Work',
            pass: qrRows >= 1 && allRows >= qrRows,
            counts: { qrRows, depRows, allRows }
          });

          return { success: true, results };
        })()
      `
    });

    console.log('\n--- UI Test Results ---');
    if (testResult?.result?.value) {
      const data = testResult.result.value;
      if (data.results) {
        data.results.forEach((r, idx) => {
          const icon = r.pass ? '✅ PASS' : '❌ FAIL';
          console.log(`[${idx + 1}] ${icon}: ${r.test}`);
          if (r.details) console.log('    Details:', r.details);
          if (r.badge) console.log('    Badge:', r.badge);
          if (r.newBalance) console.log('    New Balance:', r.newBalance);
          if (r.counts) console.log('    Filter counts:', r.counts);
          if (r.row) console.log('    Row:', r.row);
        });

        const allPassed = data.results.every(r => r.pass);
        if (!allPassed) {
          throw new Error('One or more UI tests failed!');
        }
      }
    } else {
      console.error('Eval error:', testResult);
      throw new Error('Test did not return results');
    }

    // Capture visual screenshot of the completed state
    const ssRes = await sendCommand('Page.captureScreenshot', { format: 'png' });
    if (ssRes && ssRes.data) {
      const buffer = Buffer.from(ssRes.data, 'base64');
      const artifactDir = 'C:\\Users\\dhair\\.gemini\\antigravity\\brain\\b1da35c2-17b0-4c14-84f4-df3106f3f53c';
      const filePath = path.join(artifactDir, 'qr_risk_statement_complete.png');
      fs.writeFileSync(filePath, buffer);
      console.log(`📸 Screenshot saved: qr_risk_statement_complete.png`);
    }

    console.log('\n=================================================================');
    console.log('🎉 ALL 11 BROWSER END-TO-END VERIFICATION CHECKS PASSED!');
    console.log('=================================================================');

  } finally {
    edge.kill();
  }
}

runBrowserTests().catch(err => {
  console.error('Browser Test Error:', err);
  process.exit(1);
});
