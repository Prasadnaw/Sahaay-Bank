/**
 * SAHAAY BANK — MODERN TRANSACTION ANALYTICS ENGINE
 * Pure zero-dependency SVG spline chart & cashflow intelligence service.
 * Supports dual-series Credit (Inflow) vs Debit (Outflow) visualization,
 * interactive touch/hover tooltips, time-range filtering, category breakdown,
 * and dynamic AI financial health insights.
 */

(function() {
  'use strict';

  let currentPeriod = '30D'; // '7D' | '30D' | 'MONTH' | 'ALL'
  let currentSeriesMode = 'ALL'; // 'ALL' | 'CREDIT' | 'DEBIT'
  let cachedTransactions = [];
  let hoveredIndex = null;

  // Helper: Format Currency (INR)
  function formatINR(val) {
    const num = Number(val) || 0;
    return '₹ ' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Helper: Format Compact Currency for Y-axis (e.g. ₹15k, ₹500)
  function formatCompactINR(val) {
    const num = Number(val) || 0;
    if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return '₹' + (num / 1000).toFixed(0) + 'k';
    return '₹' + Math.round(num);
  }

  // Helper: Parse Date into Date object
  function parseTxDate(tx) {
    if (tx.timestamp) {
      const d = new Date(tx.timestamp);
      if (!isNaN(d.getTime())) return d;
    }
    if (tx.date) {
      const d = new Date(tx.date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Identify Credit vs Debit
  function isCreditTx(tx) {
    const dir = (tx.direction || '').toUpperCase();
    const type = (tx.type || '').toUpperCase();
    const tag = (tx.tag || '').toUpperCase();
    const desc = (tx.description || '').toLowerCase();
    return (
      dir === 'CREDIT' ||
      type === 'TRANSFER_RECEIVED' ||
      type === 'CREDIT' ||
      type === 'DEPOSIT' ||
      tag === 'DEPOSIT' ||
      desc.includes('salary') ||
      desc.includes('from ') ||
      desc.includes('deposit') ||
      desc.includes('credit')
    );
  }

  // Filter transactions by selected time range
  function filterTransactionsByPeriod(transactions, period) {
    const now = new Date();
    const cutoff = new Date();

    if (period === '7D') {
      cutoff.setDate(now.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
    } else if (period === '30D') {
      cutoff.setDate(now.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
    } else if (period === 'MONTH') {
      cutoff.setDate(1);
      cutoff.setHours(0, 0, 0, 0);
    } else {
      // ALL
      return transactions;
    }

    return transactions.filter(tx => {
      const d = parseTxDate(tx);
      return d >= cutoff;
    });
  }

  // Aggregate Transactions into Daily Series
  function aggregateTimeline(filteredTxs, period) {
    const dateMap = new Map();
    const now = new Date();
    let numDays = 7;
    if (period === '7D') numDays = 7;
    else if (period === '30D') numDays = 30;
    else if (period === 'MONTH') numDays = now.getDate();
    else numDays = 14;

    // If period is 7D, 30D, or MONTH, pre-populate consecutive days
    if (period !== 'ALL') {
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = formatDateKey(d);
        dateMap.set(key, {
          dateKey: key,
          dateObj: d,
          displayDate: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          credit: 0,
          debit: 0,
          creditCount: 0,
          debitCount: 0,
          txs: []
        });
      }
    }

    // Populate actual transaction amounts
    filteredTxs.forEach(tx => {
      const d = parseTxDate(tx);
      const key = formatDateKey(d);
      if (!dateMap.has(key)) {
        dateMap.set(key, {
          dateKey: key,
          dateObj: d,
          displayDate: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          credit: 0,
          debit: 0,
          creditCount: 0,
          debitCount: 0,
          txs: []
        });
      }
      const entry = dateMap.get(key);
      const amt = Number(tx.amount) || 0;
      if (isCreditTx(tx)) {
        entry.credit += amt;
        entry.creditCount += 1;
      } else {
        entry.debit += amt;
        entry.debitCount += 1;
      }
      entry.txs.push(tx);
    });

    // Convert map to sorted array
    const sorted = Array.from(dateMap.values()).sort((a, b) => a.dateObj - b.dateObj);

    // If only 1 data point in ALL, add an initial zero baseline point for visual aesthetics
    if (sorted.length === 1) {
      const prevDate = new Date(sorted[0].dateObj);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevKey = formatDateKey(prevDate);
      sorted.unshift({
        dateKey: prevKey,
        dateObj: prevDate,
        displayDate: prevDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        credit: 0,
        debit: 0,
        creditCount: 0,
        debitCount: 0,
        txs: []
      });
    }

    return sorted;
  }

  // Smooth Cubic Bezier Spline Generator (Catmull-Rom to Cubic Bezier)
  function getSplinePath(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

    let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i !== points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return path;
  }

  // Render Modern SVG Chart
  function generateModernChartSvg(timeline, width = 640, height = 280) {
    const padLeft = 60;
    const padRight = 30;
    const padTop = 35;
    const padBottom = 45;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;
    const zeroY = padTop + plotHeight;

    // Find max value
    let maxVal = 1000;
    timeline.forEach(item => {
      if (item.credit > maxVal) maxVal = item.credit;
      if (item.debit > maxVal) maxVal = item.debit;
    });
    // Add 18% headroom for graceful visuals
    maxVal = Math.ceil(maxVal * 1.18 / 500) * 500;
    if (maxVal === 0) maxVal = 1000;

    // Map points to SVG coordinates
    const numPoints = timeline.length;
    const stepX = numPoints > 1 ? plotWidth / (numPoints - 1) : plotWidth;

    const creditPoints = [];
    const debitPoints = [];

    timeline.forEach((item, idx) => {
      const x = padLeft + idx * stepX;
      const cy = zeroY - (item.credit / maxVal) * plotHeight;
      const dy = zeroY - (item.debit / maxVal) * plotHeight;
      creditPoints.push({ x, y: Math.max(padTop, Math.min(zeroY, cy)), item, idx });
      debitPoints.push({ x, y: Math.max(padTop, Math.min(zeroY, dy)), item, idx });
    });

    // Spline Curves
    const creditSpline = getSplinePath(creditPoints);
    const debitSpline = getSplinePath(debitPoints);

    // Closed Area Paths
    const firstX = creditPoints[0]?.x || padLeft;
    const lastX = creditPoints[creditPoints.length - 1]?.x || (padLeft + plotWidth);
    const creditAreaPath = creditPoints.length > 0
      ? `${creditSpline} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} L ${firstX.toFixed(1)},${zeroY.toFixed(1)} Z`
      : '';
    const debitAreaPath = debitPoints.length > 0
      ? `${debitSpline} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} L ${firstX.toFixed(1)},${zeroY.toFixed(1)} Z`
      : '';

    // Horizontal Gridlines & Y-Axis Labels (4 ticks)
    const gridTicks = [0, 0.33, 0.66, 1.0];
    let gridLinesSvg = '';
    gridTicks.forEach(tick => {
      const yVal = maxVal * tick;
      const yPos = zeroY - tick * plotHeight;
      gridLinesSvg += `
        <line x1="${padLeft}" y1="${yPos.toFixed(1)}" x2="${width - padRight}" y2="${yPos.toFixed(1)}" stroke="rgba(255, 255, 255, 0.08)" stroke-dasharray="4 4" stroke-width="1" />
        <text x="${padLeft - 10}" y="${(yPos + 4).toFixed(1)}" fill="#94A3B8" font-size="11" font-weight="600" text-anchor="end" font-family="'IBM Plex Sans', sans-serif">${formatCompactINR(yVal)}</text>
      `;
    });

    // X-Axis Labels (Sampled to avoid overlapping)
    let xLabelsSvg = '';
    const labelStep = Math.max(1, Math.ceil(numPoints / 6));
    timeline.forEach((item, idx) => {
      if (idx % labelStep === 0 || idx === numPoints - 1) {
        const xPos = padLeft + idx * stepX;
        xLabelsSvg += `
          <text x="${xPos.toFixed(1)}" y="${height - 14}" fill="#94A3B8" font-size="11" font-weight="500" text-anchor="middle" font-family="'IBM Plex Sans', sans-serif">${item.displayDate}</text>
        `;
      }
    });

    // Datapoint nodes
    let nodesSvg = '';
    timeline.forEach((item, idx) => {
      const cx = creditPoints[idx].x;
      const cy = creditPoints[idx].y;
      const dy = debitPoints[idx].y;

      const isHovered = hoveredIndex === idx;
      const activePulse = isHovered ? 'r="7" stroke-width="3.5"' : 'r="4.5" stroke-width="2"';

      if (currentSeriesMode === 'ALL' || currentSeriesMode === 'CREDIT') {
        if (item.credit > 0 || isHovered) {
          nodesSvg += `
            <circle class="chart-point credit-point" data-idx="${idx}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" ${activePulse} fill="#059669" stroke="#10B981" filter="url(#glowGreen)" />
          `;
        }
      }
      if (currentSeriesMode === 'ALL' || currentSeriesMode === 'DEBIT') {
        if (item.debit > 0 || isHovered) {
          nodesSvg += `
            <circle class="chart-point debit-point" data-idx="${idx}" cx="${cx.toFixed(1)}" cy="${dy.toFixed(1)}" ${activePulse} fill="#E11D48" stroke="#F43F5E" filter="url(#glowRed)" />
          `;
        }
      }
    });

    // Active Vertical Cursor
    let cursorSvg = '';
    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < numPoints) {
      const curX = creditPoints[hoveredIndex].x;
      cursorSvg = `
        <line x1="${curX.toFixed(1)}" y1="${padTop}" x2="${curX.toFixed(1)}" y2="${zeroY}" stroke="#E8B648" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.85" />
      `;
    }

    const showCredit = currentSeriesMode === 'ALL' || currentSeriesMode === 'CREDIT';
    const showDebit = currentSeriesMode === 'ALL' || currentSeriesMode === 'DEBIT';

    return `
      <svg class="modern-cashflow-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Credit versus Debit Spline Chart">
        <defs>
          <!-- Emerald Glow Filter -->
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <!-- Rose Glow Filter -->
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <!-- Credit Gradient Area Fill -->
          <linearGradient id="creditAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.38" />
            <stop offset="60%" stop-color="#10B981" stop-opacity="0.10" />
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.00" />
          </linearGradient>
          <!-- Debit Gradient Area Fill -->
          <linearGradient id="debitAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.38" />
            <stop offset="60%" stop-color="#F43F5E" stop-opacity="0.10" />
            <stop offset="100%" stop-color="#F43F5E" stop-opacity="0.00" />
          </linearGradient>
        </defs>

        <!-- Subtle Background Canvas -->
        <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />

        <!-- Grid Lines & Y-Labels -->
        ${gridLinesSvg}

        <!-- X-Axis Baseline -->
        <line x1="${padLeft}" y1="${zeroY}" x2="${width - padRight}" y2="${zeroY}" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" />

        <!-- X-Axis Labels -->
        ${xLabelsSvg}

        <!-- Hover Cursor Line -->
        ${cursorSvg}

        <!-- Debit Series (Area + Spline Line) -->
        ${showDebit ? `
          <path class="chart-area-path debit-area" d="${debitAreaPath}" fill="url(#debitAreaGrad)" />
          <path class="chart-line-path debit-line" d="${debitSpline}" fill="none" stroke="#F43F5E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ` : ''}

        <!-- Credit Series (Area + Spline Line) -->
        ${showCredit ? `
          <path class="chart-area-path credit-area" d="${creditAreaPath}" fill="url(#creditAreaGrad)" />
          <path class="chart-line-path credit-line" d="${creditSpline}" fill="none" stroke="#10B981" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        ` : ''}

        <!-- Interactive Datapoints -->
        ${nodesSvg}

        <!-- Interactive Transparent Overlay Columns for Mouse / Touch -->
        <g class="chart-interactive-overlay">
          ${timeline.map((_, i) => {
            const colWidth = stepX;
            const colX = padLeft + i * stepX - colWidth / 2;
            return `<rect class="chart-touch-zone" data-idx="${i}" x="${Math.max(0, colX)}" y="${padTop}" width="${colWidth}" height="${plotHeight + 20}" fill="transparent" style="cursor:pointer;" />`;
          }).join('')}
        </g>
      </svg>
    `;
  }

  // Compute Summary Statistics
  function calculateMetrics(filteredTxs, period) {
    let totalCredit = 0;
    let totalDebit = 0;
    let creditTxCount = 0;
    let debitTxCount = 0;

    const categoryMap = {
      TRANSFER: { label: 'Transfers & UPI', icon: '💸', amount: 0, count: 0, color: '#3B82F6' },
      UTILITY: { label: 'Bills & Utilities', icon: '⚡', amount: 0, count: 0, color: '#F59E0B' },
      GROCERY: { label: 'Groceries & Stores', icon: '🛒', amount: 0, count: 0, color: '#10B981' },
      SALARY: { label: 'Salary & Income', icon: '💼', amount: 0, count: 0, color: '#8B5CF6' },
      HEALTH: { label: 'Healthcare & Medical', icon: '🏥', amount: 0, count: 0, color: '#EC4899' },
      DEPOSIT: { label: 'Demo Deposits', icon: '➕', amount: 0, count: 0, color: '#14B8A6' },
      OTHER: { label: 'Other Expenses', icon: '🏷️', amount: 0, count: 0, color: '#6B7280' }
    };

    filteredTxs.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const isCr = isCreditTx(tx);
      if (isCr) {
        totalCredit += amt;
        creditTxCount++;
      } else {
        totalDebit += amt;
        debitTxCount++;

        // Categorize debits
        let tag = (tx.tag || '').toUpperCase();
        if (!categoryMap[tag]) {
          const desc = (tx.description || '').toLowerCase();
          if (desc.includes('transfer') || desc.includes('upi') || desc.includes('to ')) tag = 'TRANSFER';
          else if (desc.includes('bill') || desc.includes('electricity') || desc.includes('recharge')) tag = 'UTILITY';
          else if (desc.includes('grocery') || desc.includes('market') || desc.includes('food')) tag = 'GROCERY';
          else if (desc.includes('doctor') || desc.includes('pharma') || desc.includes('hospital')) tag = 'HEALTH';
          else tag = 'OTHER';
        }
        categoryMap[tag].amount += amt;
        categoryMap[tag].count++;
      }
    });

    const netCashflow = totalCredit - totalDebit;
    const savingsRate = totalCredit > 0
      ? Math.max(0, Math.min(100, Math.round((netCashflow / totalCredit) * 100)))
      : 0;

    let daysCount = 30;
    if (period === '7D') daysCount = 7;
    else if (period === 'MONTH') daysCount = new Date().getDate();
    else if (period === 'ALL') daysCount = Math.max(1, Math.min(60, filteredTxs.length));
    const avgDailySpend = totalDebit / daysCount;

    const categories = Object.values(categoryMap)
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return {
      totalCredit,
      totalDebit,
      creditTxCount,
      debitTxCount,
      netCashflow,
      savingsRate,
      avgDailySpend,
      categories
    };
  }

  // Generate AI Financial Health Summary
  function generateAiInsights(metrics, period) {
    const { totalCredit, totalDebit, netCashflow, savingsRate, categories } = metrics;
    let healthTier = 'EXCELLENT';
    let headline = 'Healthy Cashflow & Positive Growth';
    let advice = '';

    if (netCashflow >= 0) {
      if (savingsRate > 50) {
        healthTier = 'EXCELLENT';
        headline = '🌟 Exceptional Financial Health';
        advice = `You have retained <strong>${savingsRate}%</strong> of all incoming money over this timeframe. Inflow (+${formatINR(totalCredit)}) significantly exceeds expenses (−${formatINR(totalDebit)}).`;
      } else {
        healthTier = 'STABLE';
        headline = '✅ Balanced & Resilient';
        advice = `Your income comfortably covers your expenses with a net surplus of <strong>+${formatINR(netCashflow)}</strong>. Keep an eye on recurring transfers to boost your savings rate.`;
      }
    } else {
      healthTier = 'WARNING';
      headline = '⚠️ Outflow Outpacing Inflow';
      advice = `Expenses (−${formatINR(totalDebit)}) exceed credits (+${formatINR(totalCredit)}) by <strong>${formatINR(Math.abs(netCashflow))}</strong> during this period. Review discretionary spending.`;
    }

    if (categories.length > 0) {
      const topCat = categories[0];
      advice += ` Your highest expenditure category was <strong>${topCat.icon} ${topCat.label}</strong> representing <strong>${formatINR(topCat.amount)}</strong>.`;
    }

    return { healthTier, headline, advice };
  }

  // Bind Chart Interaction Handlers (Hover & Touch)
  function attachChartInteractions(containerId, timeline) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tooltipEl = container.querySelector('.chart-floating-tooltip');
    const zones = container.querySelectorAll('.chart-touch-zone');

    function updateTooltip(idx, clientX, clientY) {
      if (idx < 0 || idx >= timeline.length) return;
      const item = timeline[idx];
      hoveredIndex = idx;

      if (tooltipEl) {
        const net = item.credit - item.debit;
        const netSign = net >= 0 ? '+' : '−';
        const netColor = net >= 0 ? '#10B981' : '#F43F5E';

        tooltipEl.innerHTML = `
          <div class="tooltip-date-header">${item.displayDate}</div>
          <div class="tooltip-metric-row">
            <span class="tooltip-dot credit-dot"></span>
            <span class="tooltip-label">Credit (Inflow):</span>
            <span class="tooltip-val credit-val">+${formatINR(item.credit)}</span>
          </div>
          <div class="tooltip-metric-row">
            <span class="tooltip-dot debit-dot"></span>
            <span class="tooltip-label">Debit (Outflow):</span>
            <span class="tooltip-val debit-val">−${formatINR(item.debit)}</span>
          </div>
          <div class="tooltip-divider"></div>
          <div class="tooltip-metric-row">
            <span class="tooltip-label">Daily Net:</span>
            <span class="tooltip-val" style="color:${netColor}; font-weight:700;">${netSign}${formatINR(Math.abs(net))}</span>
          </div>
          <div class="tooltip-subtext">${item.txs.length} transaction(s) recorded</div>
        `;
        tooltipEl.removeAttribute('hidden');
        tooltipEl.classList.add('visible');

        const rect = container.getBoundingClientRect();
        let left = (clientX ? clientX - rect.left : 100);
        let top = (clientY ? clientY - rect.top - 120 : 20);

        const maxLeft = rect.width - 210;
        if (left > maxLeft) left = maxLeft;
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
      }

      const points = container.querySelectorAll('.chart-point');
      points.forEach(pt => {
        const ptIdx = Number(pt.dataset.idx);
        if (ptIdx === idx) {
          pt.setAttribute('r', '7.5');
          pt.setAttribute('stroke-width', '3.5');
        } else {
          pt.setAttribute('r', '4.5');
          pt.setAttribute('stroke-width', '2');
        }
      });
    }

    function hideTooltip() {
      hoveredIndex = null;
      if (tooltipEl) {
        tooltipEl.setAttribute('hidden', '');
        tooltipEl.classList.remove('visible');
      }
      const points = container.querySelectorAll('.chart-point');
      points.forEach(pt => {
        pt.setAttribute('r', '4.5');
        pt.setAttribute('stroke-width', '2');
      });
    }

    zones.forEach(zone => {
      const idx = Number(zone.dataset.idx);
      zone.addEventListener('mouseenter', (e) => updateTooltip(idx, e.clientX, e.clientY));
      zone.addEventListener('mousemove', (e) => updateTooltip(idx, e.clientX, e.clientY));
      zone.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          updateTooltip(idx, e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });
    });

    container.addEventListener('mouseleave', hideTooltip);
  }

  // Master Render Method: Renders both Mobile and Desktop Views
  function renderAnalytics(transactions = null) {
    if (transactions && Array.isArray(transactions)) {
      cachedTransactions = transactions;
    } else if (!cachedTransactions || cachedTransactions.length === 0) {
      cachedTransactions = (window.SahaayApp && window.SahaayApp.getCurrentTxList)
        ? window.SahaayApp.getCurrentTxList()
        : [];
    }

    const filtered = filterTransactionsByPeriod(cachedTransactions, currentPeriod);
    const timeline = aggregateTimeline(filtered, currentPeriod);
    const metrics = calculateMetrics(filtered, currentPeriod);
    const aiInsight = generateAiInsights(metrics, currentPeriod);

    // Render to Mobile View: #mobileViewAnalytics
    renderAnalyticsToContainer({
      prefix: 'mobile',
      timeline,
      metrics,
      aiInsight,
      chartContainerId: 'mobileAnalyticsChartWrap',
      kpiCreditId: 'mobileAnalyticsKpiCredit',
      kpiDebitId: 'mobileAnalyticsKpiDebit',
      kpiNetId: 'mobileAnalyticsKpiNet',
      kpiAvgSpendId: 'mobileAnalyticsKpiAvgSpend',
      savingsRateBarId: 'mobileAnalyticsSavingsBar',
      categoriesContainerId: 'mobileAnalyticsCategoriesList',
      aiCardId: 'mobileAnalyticsAiCard',
      aiAdviceId: 'mobileAnalyticsAiAdvice',
      aiVoiceBtnId: 'mobileAnalyticsVoiceReadBtn'
    });

    // Render to Desktop View: #section-analytics
    renderAnalyticsToContainer({
      prefix: 'desktop',
      timeline,
      metrics,
      aiInsight,
      chartContainerId: 'desktopAnalyticsChartWrap',
      kpiCreditId: 'desktopAnalyticsKpiCredit',
      kpiDebitId: 'desktopAnalyticsKpiDebit',
      kpiNetId: 'desktopAnalyticsKpiNet',
      kpiAvgSpendId: 'desktopAnalyticsKpiAvgSpend',
      savingsRateBarId: 'desktopAnalyticsSavingsBar',
      categoriesContainerId: 'desktopAnalyticsCategoriesList',
      aiCardId: 'desktopAnalyticsAiCard',
      aiAdviceId: 'desktopAnalyticsAiAdvice',
      aiVoiceBtnId: 'desktopAnalyticsVoiceReadBtn'
    });
  }

  function renderAnalyticsToContainer(cfg) {
    const kpiCr = document.getElementById(cfg.kpiCreditId);
    if (kpiCr) kpiCr.textContent = `+${formatINR(cfg.metrics.totalCredit)}`;

    const kpiDb = document.getElementById(cfg.kpiDebitId);
    if (kpiDb) kpiDb.textContent = `−${formatINR(cfg.metrics.totalDebit)}`;

    const kpiNet = document.getElementById(cfg.kpiNetId);
    if (kpiNet) {
      const isPos = cfg.metrics.netCashflow >= 0;
      kpiNet.textContent = `${isPos ? '+' : '−'}${formatINR(Math.abs(cfg.metrics.netCashflow))}`;
      kpiNet.style.color = isPos ? '#10B981' : '#F43F5E';
    }

    const kpiAvg = document.getElementById(cfg.kpiAvgSpendId);
    if (kpiAvg) kpiAvg.textContent = `${formatINR(cfg.metrics.avgDailySpend)} / day`;

    const savingsBar = document.getElementById(cfg.savingsRateBarId);
    if (savingsBar) {
      savingsBar.style.width = `${cfg.metrics.savingsRate}%`;
      savingsBar.setAttribute('aria-valuenow', cfg.metrics.savingsRate);
    }
    const savingsPctEl = document.getElementById(`${cfg.prefix}AnalyticsSavingsPct`);
    if (savingsPctEl) savingsPctEl.textContent = `${cfg.metrics.savingsRate}%`;

    // 2. Render Modern SVG Chart
    const chartWrap = document.getElementById(cfg.chartContainerId);
    if (chartWrap) {
      const isMobile = cfg.prefix === 'mobile';
      const chartWidth = isMobile ? 580 : 720;
      const chartHeight = isMobile ? 260 : 290;
      const svgHtml = generateModernChartSvg(cfg.timeline, chartWidth, chartHeight);

      chartWrap.innerHTML = `
        <div class="chart-inner-canvas-wrap">
          ${svgHtml}
          <div class="chart-floating-tooltip" hidden></div>
        </div>
      `;

      attachChartInteractions(cfg.chartContainerId, cfg.timeline);
    }

    // 3. Render Category Breakdown
    const catContainer = document.getElementById(cfg.categoriesContainerId);
    if (catContainer) {
      const totalOutflow = cfg.metrics.totalDebit || 1;
      if (cfg.metrics.categories.length === 0) {
        catContainer.innerHTML = `<div class="empty-cat-msg">No outflow expenses recorded for this period.</div>`;
      } else {
        catContainer.innerHTML = cfg.metrics.categories.map(cat => {
          const pct = Math.min(100, Math.round((cat.amount / totalOutflow) * 100));
          return `
            <div class="category-breakdown-row">
              <div class="category-info-col">
                <div class="category-title-wrap">
                  <span class="category-icon">${cat.icon}</span>
                  <span class="category-name">${cat.label}</span>
                </div>
                <div class="category-amount-wrap">
                  <span class="category-amount">−${formatINR(cat.amount)}</span>
                  <span class="category-pct">${pct}%</span>
                </div>
              </div>
              <div class="category-bar-track">
                <div class="category-bar-fill" style="width:${pct}%; background:${cat.color};"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 4. Render AI Financial Health Insights
    const aiAdvice = document.getElementById(cfg.aiAdviceId);
    if (aiAdvice) {
      aiAdvice.innerHTML = `
        <div class="ai-insight-headline">${cfg.aiInsight.headline}</div>
        <div class="ai-insight-body">${cfg.aiInsight.advice}</div>
      `;
    }

    // Hook Voice Reading Button
    const voiceBtn = document.getElementById(cfg.aiVoiceBtnId);
    if (voiceBtn) {
      voiceBtn.onclick = () => {
        const text = `${cfg.aiInsight.headline}. Inflow is ${formatINR(cfg.metrics.totalCredit)}. Outflow is ${formatINR(cfg.metrics.totalDebit)}. Net balance change is ${cfg.metrics.netCashflow >= 0 ? 'surplus' : 'deficit'} of ${formatINR(Math.abs(cfg.metrics.netCashflow))}. Savings rate is ${cfg.metrics.savingsRate} percent.`;
        if (window.SahaayVoice && window.SahaayVoice.speakText) {
          window.SahaayVoice.speakText(text);
        } else if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-IN';
          window.speechSynthesis.speak(utterance);
        }
      };
    }
  }

  // Public Service API
  window.SahaayAnalytics = {
    renderAnalytics,
    setPeriod: function(period) {
      currentPeriod = period;
      document.querySelectorAll('.analytics-period-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
      });
      renderAnalytics();
    },
    setSeriesFilter: function(mode) {
      currentSeriesMode = mode;
      document.querySelectorAll('.analytics-series-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.series === mode);
      });
      renderAnalytics();
    },
    getTimeline: function() {
      const filtered = filterTransactionsByPeriod(cachedTransactions, currentPeriod);
      return aggregateTimeline(filtered, currentPeriod);
    },
    getMetrics: function() {
      const filtered = filterTransactionsByPeriod(cachedTransactions, currentPeriod);
      return calculateMetrics(filtered, currentPeriod);
    }
  };

})();
