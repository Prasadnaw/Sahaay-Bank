/**
 * Sahaay Bank Realistic Personal QR Code & Camera Scanner Service
 */
window.SahaayQr = (function(){
  'use strict';

  /**
   * Generates a realistic 25x25 matrix SVG QR Code
   */
  function generateRealisticQrSvg(payloadText) {
    const size = 25;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));

    // 1. Add Finder Pattern (7x7) at (r, c)
    function addFinder(r, c) {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6) {
            matrix[r + i][c + j] = 1;
          } else if (i >= 2 && i <= 4 && j >= 2 && j <= 4) {
            matrix[r + i][c + j] = 1;
          } else {
            matrix[r + i][c + j] = 0;
          }
        }
      }
    }

    addFinder(0, 0);          // Top-Left
    addFinder(0, size - 7);   // Top-Right
    addFinder(size - 7, 0);   // Bottom-Left

    // 2. Add Alignment Pattern (5x5) at (16, 16)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (i === 0 || i === 4 || j === 0 || j === 4 || (i === 2 && j === 2)) {
          matrix[16 + i][16 + j] = 1;
        } else {
          matrix[16 + i][16 + j] = 0;
        }
      }
    }

    // 3. Timing Belts
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = (i % 2 === 0) ? 1 : 0;
      matrix[i][6] = (i % 2 === 0) ? 1 : 0;
    }

    // 4. Fill Data Modules based on simple hash of payloadText
    let hash = 0;
    for (let i = 0; i < payloadText.length; i++) {
      hash = ((hash << 5) - hash) + payloadText.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder zones
        if (r < 8 && c < 8) continue;
        if (r < 8 && c >= size - 8) continue;
        if (r >= size - 8 && c < 8) continue;
        // Skip alignment zone
        if (r >= 16 && r <= 20 && c >= 16 && c <= 20) continue;
        // Skip timing belts
        if (r === 6 || c === 6) continue;
        // Skip center logo zone (9..15, 9..15)
        if (r >= 10 && r <= 14 && c >= 10 && c <= 14) continue;

        const val = Math.abs(Math.sin((r * 29 + c * 31) ^ hash) * 10000);
        matrix[r][c] = (Math.floor(val) % 2 === 0) ? 1 : 0;
      }
    }

    // 5. Render SVG Rectangles
    const moduleSize = 8;
    const padding = 16;
    const totalDim = size * moduleSize + (padding * 2);

    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === 1) {
          const x = padding + (c * moduleSize);
          const y = padding + (r * moduleSize);
          rects += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="#0F172A"/>`;
        }
      }
    }

    const center = totalDim / 2;
    const svg = `
      <svg width="220" height="220" viewBox="0 0 ${totalDim} ${totalDim}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Authentic Realistic UPI QR Code">
        <rect width="${totalDim}" height="${totalDim}" fill="#FFFFFF" rx="8"/>
        ${rects}
        <!-- Centered Bank Emblem -->
        <circle cx="${center}" cy="${center}" r="22" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
        <circle cx="${center}" cy="${center}" r="17" fill="#4F46E5"/>
        <text x="${center}" y="${center + 6}" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#FFFFFF" text-anchor="middle">₹</text>
      </svg>
    `;

    return svg;
  }

  function renderQr(amount = null) {
    const frame = document.querySelector('#myQrModal .qr-frame');
    if (!frame) return;
    const upiId = window.SahaayConfig.defaultUpiId;
    let payload = `upi://pay?pa=${upiId}&pn=Asha%20Patel&cu=INR`;
    if (amount && Number(amount) > 0) payload += `&am=${amount}`;
    frame.innerHTML = generateRealisticQrSvg(payload);
  }

  function showMyQr(amount = null){
    const modal = document.getElementById('myQrModal');
    if(modal) {
      renderQr(amount);
      modal.classList.add('open');
      window.SahaayVoice.announce('Your personal UPI QR code is displayed on screen.', true);
    }
  }

  function closeMyQr(){
    const modal = document.getElementById('myQrModal');
    if(modal) modal.classList.remove('open');
  }

  function openScanner(){
    const modal = document.getElementById('qrScannerModal');
    if(modal) {
      modal.classList.add('open');
      window.SahaayVoice.announce('QR Code scanner active. Point camera or tap a demo merchant.', true);
    }
  }

  function closeScanner(){
    const modal = document.getElementById('qrScannerModal');
    if(modal) modal.classList.remove('open');
  }

  function init(){
    document.getElementById('openMyQrBtn')?.addEventListener('click', () => showMyQr());
    document.getElementById('openMyQrQuickBtn')?.addEventListener('click', () => showMyQr());
    document.getElementById('transferShowMyQrBtn')?.addEventListener('click', () => showMyQr());
    document.getElementById('closeMyQrBtn')?.addEventListener('click', closeMyQr);

    document.getElementById('openScannerBtn')?.addEventListener('click', openScanner);
    document.getElementById('openScannerQuickBtn')?.addEventListener('click', openScanner);
    document.getElementById('transferScanQrBtn')?.addEventListener('click', openScanner);
    document.getElementById('closeScannerModalBtn')?.addEventListener('click', closeScanner);

    document.getElementById('copyUpiIdBtn')?.addEventListener('click', ()=>{
      navigator.clipboard?.writeText(window.SahaayConfig.defaultUpiId);
      window.SahaayApp.showToast(`Copied: ${window.SahaayConfig.defaultUpiId}`);
      window.SahaayVoice.announce('UPI ID copied to clipboard.');
    });

    document.getElementById('applyQrAmountBtn')?.addEventListener('click', ()=>{
      const amt = document.getElementById('customQrAmount')?.value;
      renderQr(amt);
      if(amt && Number(amt) > 0){
        window.SahaayApp.showToast(`QR updated for ₹${amt}`);
        window.SahaayVoice.announce(`QR code updated to request ₹${amt}`, true);
      } else {
        window.SahaayApp.showToast('QR code reset to default');
      }
    });

    document.getElementById('downloadQrBtn')?.addEventListener('click', ()=>{
      window.SahaayApp.showToast('QR Code saved to Downloads');
      window.SahaayVoice.announce('Your UPI QR code has been saved.');
    });

    // Demo QR Merchant scans
    document.querySelectorAll('.demo-qr-scan-btn').forEach(btn => {
      btn.addEventListener('click', ()=>{
        const payee = btn.dataset.payee;
        const amt = btn.dataset.amount;
        closeScanner();
        window.SahaayApp.showToast(`✓ Scanned: ${payee} (₹${amt})`);
        window.SahaayUpi.openKeypad(payee, amt);
      });
    });

    // Initial render
    renderQr();
  }

  return {
    init,
    showMyQr,
    closeMyQr,
    openScanner,
    closeScanner,
    renderQr
  };
})();
