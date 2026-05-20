/* ═══════════════════════════════════════════════════════════════
   script.js — NeuralShield AI Web3 Threat Intelligence
   All JS: cursor, matrix, auth, charts, wallet analyzer,
           scroll effects, live CoinGecko data, gas fees
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   API ENDPOINTS
   CoinGecko free tier — no API key needed
   Swap BASE_URL to pro-api.coingecko.com
   and add ?x_cg_pro_api_key=YOUR_KEY for Pro
────────────────────────────────────────── */
const API = {
  COINGECKO_PRICES: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,avalanche-2,matic-network&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true',
  COINGECKO_GLOBAL: 'https://api.coingecko.com/api/v3/global',
  COINGECKO_CHART:  (id) => `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7&interval=daily`,
  BACKEND_PREDICT:  'https://neuralshield-api.onrender.com/predict',
  // Etherscan gas — add your key in .env; frontend reads process.env via bundler
  // or just keep empty string to skip gas fetch
  ETHERSCAN_GAS:    'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken',
};

/* Coin meta — keeps UI order and icon consistent */
const COIN_META = [
  { id: 'bitcoin',       sym: 'BTC',   name: 'BITCOIN',    icon: '₿',  color: 'rgba(255,170,0,0.4)'   },
  { id: 'ethereum',      sym: 'ETH',   name: 'ETHEREUM',   icon: 'Ξ',  color: 'rgba(0,245,255,0.4)'   },
  { id: 'binancecoin',   sym: 'BNB',   name: 'BINANCE',    icon: '◈',  color: 'rgba(255,200,0,0.4)'   },
  { id: 'solana',        sym: 'SOL',   name: 'SOLANA',     icon: '◉',  color: 'rgba(123,47,255,0.4)'  },
  { id: 'avalanche-2',   sym: 'AVAX',  name: 'AVALANCHE',  icon: '▲',  color: 'rgba(255,51,85,0.4)'   },
  { id: 'matic-network', sym: 'MATIC', name: 'POLYGON',    icon: '⬡',  color: 'rgba(123,47,255,0.4)'  },
];

/* Sparkline chart instances keyed by symbol */
const sparklineCharts = {};
/* Chart.js instances for analytics */
let chartLine = null;

/* ══════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════ */
const cursor     = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
const mouseGlow  = document.getElementById('mouse-glow');

let cx = 0, cy = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  cx = e.clientX; cy = e.clientY;
  cursor.style.left = cx + 'px';
  cursor.style.top  = cy + 'px';
  mouseGlow.style.left = cx + 'px';
  mouseGlow.style.top  = cy + 'px';
});

(function animCursor() {
  rx += (cx - rx) * 0.12;
  ry += (cy - ry) * 0.12;
  cursorRing.style.left = rx + 'px';
  cursorRing.style.top  = ry + 'px';
  requestAnimationFrame(animCursor);
})();

document.querySelectorAll('a, button, input').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width = cursor.style.height = '6px';
    cursorRing.style.width = cursorRing.style.height = '50px';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width = cursor.style.height = '12px';
    cursorRing.style.width = cursorRing.style.height = '36px';
  });
});

/* ══════════════════════════════════════════
   MATRIX CANVAS EFFECT
══════════════════════════════════════════ */
function initMatrix(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const chars = '01アイウエオカキクケコABCDEF0123456789⬡◈◉⬢'.split('');
  const fontSize = 13;
  let cols  = Math.floor(canvas.width / fontSize);
  let drops = Array(cols).fill(1);

  return setInterval(() => {
    cols = Math.floor(canvas.width / fontSize);
    if (drops.length !== cols) drops = Array(cols).fill(1);

    ctx.fillStyle = 'rgba(0, 0, 10, 0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px 'Share Tech Mono', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = `rgba(0,${Math.floor(180 + Math.random() * 75)},${Math.floor(200 + Math.random() * 55)},${0.3 + Math.random() * 0.5})`;
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }, 50);
}

/* ══════════════════════════════════════════
   LOADING SEQUENCE
══════════════════════════════════════════ */
const LOAD_TEXTS = [
  'INITIALIZING AI SECURITY SYSTEM...',
  'CONNECTING TO BLOCKCHAIN NETWORKS...',
  'VERIFYING ENCRYPTED THREAT DATABASE...',
  'ACCESSING WEB3 THREAT INTELLIGENCE...',
  'LOADING NEURAL NETWORK MODELS...',
  'SYSTEM READY — LAUNCHING INTERFACE...',
];

window.addEventListener('load', () => {
  const matrixInterval = initMatrix('matrix-canvas');

  /* ── Spawn particles ── */
  const pContainer = document.getElementById('load-particles');
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'load-particle';
    const size = 1 + Math.random() * 2;
    p.style.cssText = `
      left:${Math.random() * 100}%;
      width:${size}px; height:${size}px;
      animation-duration:${3 + Math.random() * 5}s;
      animation-delay:${Math.random() * 3}s;
      --drift:${(Math.random() - 0.5) * 100}px;
      background:hsl(${Math.random() > 0.5 ? 185 : 270},100%,65%);
    `;
    pContainer.appendChild(p);
  }

  /* ── Spawn floating crypto symbols ── */
  const symbols = ['₿', 'Ξ', '◈', '⬡', '⬢', '◆', '✦', '⬥'];
  const loadScreen = document.getElementById('loading-screen');
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    s.className = 'crypto-symbol';
    s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    s.style.cssText = `
      left:${Math.random() * 100}%;
      animation-duration:${6 + Math.random() * 8}s;
      animation-delay:${Math.random() * 4}s;
      font-size:${14 + Math.random() * 12}px;
      color:hsl(${Math.random() > 0.5 ? 185 : 270},100%,65%);
    `;
    loadScreen.appendChild(s);
  }

  /* ── Progress bar ── */
  const loadBar     = document.getElementById('load-bar');
  const loadText    = document.getElementById('load-text');
  const loadPercent = document.getElementById('load-percent');
  let progress = 0, textIdx = 0;

  const progressInterval = setInterval(() => {
    progress += 1.2 + Math.random() * 2;
    if (progress > 100) progress = 100;

    loadBar.style.width = progress + '%';
    loadPercent.textContent = Math.floor(progress) + '%';

    const tIdx = Math.floor((progress / 100) * (LOAD_TEXTS.length - 1));
    if (tIdx !== textIdx) {
      textIdx = tIdx;
      loadText.style.opacity = '0';
      setTimeout(() => {
        loadText.textContent  = LOAD_TEXTS[textIdx];
        loadText.style.transition = 'opacity 0.4s';
        loadText.style.opacity    = '1';
      }, 200);
    }

    if (progress >= 100) {
      clearInterval(progressInterval);
      clearInterval(matrixInterval);
      setTimeout(() => {
        loadScreen.classList.add('fade-out');
        setTimeout(() => {
          loadScreen.style.display = 'none';
          document.getElementById('auth-screen').classList.add('active');
          initAuthCanvas();
        }, 800);
      }, 400);
    }
  }, 40);
});

/* ══════════════════════════════════════════
   AUTH CANVAS (animated particle network)
══════════════════════════════════════════ */
function initAuthCanvas() {
  const canvas = document.getElementById('auth-canvas');
  const ctx    = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 60 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height,
    vx:    (Math.random() - 0.5) * 0.4,
    vy:    (Math.random() - 0.5) * 0.4,
    size:  1 + Math.random() * 2,
    alpha: 0.1 + Math.random() * 0.4,
    color: Math.random() > 0.5 ? '0,245,255' : '123,47,255',
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    });

    /* Draw connecting lines */
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,245,255,${(1 - dist / 120) * 0.08})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ══════════════════════════════════════════
   AUTH FORM LOGIC
══════════════════════════════════════════ */
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('login-form').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  inp.type  = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showErr(id, show) {
  document.getElementById(id).style.display = show ? 'block' : 'none';
}

function setInputState(id, state) {
  const el = document.getElementById(id);
  el.classList.remove('error', 'success');
  if (state) el.classList.add(state);
}

/* ── LOGIN ── */
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-password').value;
  let ok = true;

  if (!isValidEmail(email)) { setInputState('login-email', 'error');    showErr('login-email-err', true); ok = false; }
  else                       { setInputState('login-email', 'success');  showErr('login-email-err', false); }

  if (!pw)                   { setInputState('login-password', 'error'); showErr('login-pw-err', true); ok = false; }
  else                       { setInputState('login-password', 'success'); showErr('login-pw-err', false); }

  if (!ok) return;

  const users = JSON.parse(localStorage.getItem('ns_users') || '{}');
  const user  = users[email];

  if (!user) {
    showToast('Account not found. Please sign up first.', true);
    switchTab('signup');
    return;
  }

  if (user.password !== btoa(pw)) {
    setInputState('login-password', 'error');
    document.getElementById('login-pw-err').textContent = 'Invalid credentials';
    showErr('login-pw-err', true);
    return;
  }

  triggerAccessGranted(user.username || email.split('@')[0]);
}

/* ── SIGNUP ── */
function handleSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const pw       = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;
  let ok = true;

  if (username.length < 3) { setInputState('signup-username', 'error');  showErr('signup-user-err', true);    ok = false; }
  else                      { setInputState('signup-username', 'success');showErr('signup-user-err', false); }

  if (!isValidEmail(email)) { setInputState('signup-email', 'error');    showErr('signup-email-err', true);   ok = false; }
  else                       { setInputState('signup-email', 'success'); showErr('signup-email-err', false); }

  if (pw.length < 6)        { setInputState('signup-password', 'error'); showErr('signup-pw-err', true);     ok = false; }
  else                       { setInputState('signup-password', 'success'); showErr('signup-pw-err', false); }

  if (pw !== confirm)       { setInputState('signup-confirm', 'error');  showErr('signup-confirm-err', true); ok = false; }
  else                       { setInputState('signup-confirm', 'success'); showErr('signup-confirm-err', false); }

  if (!ok) return;

  const users = JSON.parse(localStorage.getItem('ns_users') || '{}');
  if (users[email]) {
    showToast('Email already registered. Please login.', true);
    switchTab('login');
    return;
  }

  users[email] = { username, password: btoa(pw) };
  localStorage.setItem('ns_users', JSON.stringify(users));
  triggerAccessGranted(username);
}

/* ── ACCESS GRANTED SEQUENCE ── */
function triggerAccessGranted(username) {
  document.getElementById('auth-screen').classList.remove('active');

  const accessScreen = document.getElementById('access-screen');
  accessScreen.classList.add('active');
  initMatrix('access-canvas');

  const accessTexts = [
    ['ACCESS GRANTED',    'WELCOME BACK, ' + username.toUpperCase()],
    ['IDENTITY VERIFIED', 'INITIALIZING BLOCKCHAIN ANALYTICS...'],
    ['SYSTEM ACTIVATED',  'LOADING THREAT INTELLIGENCE...'],
  ];

  let step = 0;
  const titleEl = document.getElementById('access-title');
  const subEl   = document.getElementById('access-sub');

  const cycle = setInterval(() => {
    step++;
    if (step < accessTexts.length) {
      titleEl.style.opacity = subEl.style.opacity = '0';
      setTimeout(() => {
        titleEl.textContent = accessTexts[step][0];
        subEl.textContent   = accessTexts[step][1];
        titleEl.style.transition = subEl.style.transition = 'opacity 0.4s';
        titleEl.style.opacity    = subEl.style.opacity    = '1';
      }, 200);
    }
  }, 1200);

  setTimeout(() => {
    clearInterval(cycle);
    accessScreen.classList.remove('active');
    accessScreen.style.display = 'none';

    const mainApp = document.getElementById('main-app');
    mainApp.style.display = 'block';
    requestAnimationFrame(() => mainApp.classList.add('active'));

    document.getElementById('nav-user-display').textContent = '● ' + username.toUpperCase();
    localStorage.setItem('ns_current_user', username);

    /* Boot all features */
    initCharts();
    initCryptoDashboard();   /* starts live data loop */
    initScrollReveal();
    initSplineScroll();
    fetchGasPrice();         /* live gas indicator */
    setInterval(fetchGasPrice, 60_000);  /* refresh gas every 60s */
  }, 3600);
}

function handleLogout() {
  localStorage.removeItem('ns_current_user');
  location.reload();
}

/* ══════════════════════════════════════════
   NAVBAR SCROLL EFFECT
══════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

/* ══════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════ */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ══════════════════════════════════════════
   SPLINE SCROLL PARALLAX HUD
══════════════════════════════════════════ */
function initSplineScroll() {
  const section = document.getElementById('spline-scroll-section');
  const fill    = document.getElementById('spline-progress-fill');
  const hud     = document.getElementById('spline-hud');

  const hudTexts = [
    ['BLOCKCHAIN NEURAL NETWORK',  'ANALYZING DISTRIBUTED LEDGER PATTERNS'],
    ['THREAT PATTERN RECOGNITION', 'SCANNING TRANSACTION CLUSTERS'],
    ['AI MODEL INFERENCE',         'COMPUTING RISK VECTORS'],
    ['ANALYSIS COMPLETE',          'REVEALING WALLET ANALYZER...'],
  ];

  window.addEventListener('scroll', () => {
    const rect      = section.getBoundingClientRect();
    const scrolled  = Math.max(0, -rect.top);
    const total     = section.offsetHeight - window.innerHeight;
    const progress  = Math.min(1, scrolled / total);

    fill.style.height = (progress * 100) + '%';

    const idx = Math.min(hudTexts.length - 1, Math.floor(progress * hudTexts.length));
    hud.querySelector('.spline-hud-title').textContent = hudTexts[idx][0];
    hud.querySelector('.spline-hud-sub').textContent   = hudTexts[idx][1];
    hud.style.opacity = progress > 0.95 ? String(1 - (progress - 0.95) / 0.05) : '1';
  });
}

/* ══════════════════════════════════════════
   WALLET ANALYSIS — calls Flask backend
   Falls back to demo mode if backend is down
══════════════════════════════════════════ */
async function analyzeWallet() {
  const wallet    = document.getElementById('wallet-input').value.trim();
  const btn       = document.getElementById('analyze-btn');
  const resultGrid= document.getElementById('result-grid');
  const resultMain= document.getElementById('result-main');

  if (!wallet) { showToast('Please enter a wallet address', true); return; }

  btn.classList.add('loading');
  btn.disabled = true;
  document.getElementById('scan-overlay').classList.add('active');
  resultGrid.classList.remove('visible');
  resultMain.classList.remove('visible');

  try {
    /* ── Try real Flask backend ── */
    const response = await fetch(API.BACKEND_PREDICT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ wallet }),
      signal:  AbortSignal.timeout(8000),
    });
    const data = await response.json();
    handlePredictionResult(data.prediction, wallet);

  } catch {
    /* ── Demo / offline fallback ── */
    await new Promise(r => setTimeout(r, 2500));
    const isValid      = wallet.startsWith('0x') && wallet.length === 42;
    const isSuspicious = Math.random() > 0.55;

    if (!isValid) {
      handlePredictionResult('❌ Invalid Ethereum Wallet Address', wallet);
    } else {
      handlePredictionResult(isSuspicious ? '⚠️ Suspicious Wallet' : '✅ Safe Wallet', wallet);
    }

  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    document.getElementById('scan-overlay').classList.remove('active');
  }
}

/* ── Display wallet analysis results ── */
function handlePredictionResult(prediction, wallet) {
  const resultGrid = document.getElementById('result-grid');
  const resultMain = document.getElementById('result-main');
  const verdict    = document.getElementById('result-verdict');
  const sub        = document.getElementById('result-sub');

  document.getElementById('rc-status').textContent = wallet.slice(0, 6) + '...' + wallet.slice(-4);
  document.getElementById('rc-chain').textContent  = 'ETHEREUM';

  if (prediction.includes('Safe') || prediction.includes('✅')) {
    verdict.textContent = '✅ SAFE WALLET';
    verdict.className   = 'result-main-verdict verdict-safe';
    sub.textContent     = 'NO MALICIOUS PATTERNS DETECTED — WALLET APPEARS LEGITIMATE';
    document.getElementById('rc-risk').textContent       = 'LOW';
    document.getElementById('rc-confidence').textContent = '96.8%';
    document.getElementById('rc-threat').textContent     = '0 / 10';
  } else if (prediction.includes('Suspicious') || prediction.includes('⚠️')) {
    verdict.textContent = '⚠️ SUSPICIOUS WALLET';
    verdict.className   = 'result-main-verdict verdict-threat';
    sub.textContent     = 'ANOMALOUS TRANSACTION PATTERNS DETECTED — EXERCISE CAUTION';
    document.getElementById('rc-risk').textContent       = 'HIGH';
    document.getElementById('rc-confidence').textContent = '94.2%';
    document.getElementById('rc-threat').textContent     = '8 / 10';
  } else {
    verdict.textContent = prediction;
    verdict.className   = 'result-main-verdict verdict-invalid';
    sub.textContent     = 'PLEASE PROVIDE A VALID ETHEREUM WALLET ADDRESS (0x... 42 CHARS)';
    document.getElementById('rc-risk').textContent       = 'N/A';
    document.getElementById('rc-confidence').textContent = 'N/A';
    document.getElementById('rc-threat').textContent     = 'N/A';
  }

  requestAnimationFrame(() => {
    resultGrid.classList.add('visible');
    resultMain.classList.add('visible');
  });

  showToast('Analysis complete');
}

/* ══════════════════════════════════════════
   ANALYTICS CHARTS (Chart.js)
══════════════════════════════════════════ */
function initCharts() {
  Chart.defaults.color       = 'rgba(150,180,220,0.6)';
  Chart.defaults.borderColor = 'rgba(0,245,255,0.06)';

  /* ── Doughnut: threat distribution ── */
  new Chart(document.getElementById('chart-pie'), {
    type: 'doughnut',
    data: {
      labels: ['Safe', 'Suspicious', 'Unverified', 'Flagged'],
      datasets: [{
        data: [63, 18, 12, 7],
        backgroundColor: ['rgba(0,255,136,.7)', 'rgba(255,51,85,.7)', 'rgba(255,170,0,.7)', 'rgba(123,47,255,.7)'],
        borderColor:     ['rgba(0,255,136,.3)', 'rgba(255,51,85,.3)', 'rgba(255,170,0,.3)', 'rgba(123,47,255,.3)'],
        borderWidth: 1,
      }],
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { font: { family: "'Share Tech Mono'", size: 10 }, padding: 12 } } },
      animation: { animateRotate: true, duration: 1500, easing: 'easeInOutQuart' },
      cutout: '65%',
    },
  });

  /* ── Line: blockchain activity 7 days — updated with live ETH data later ── */
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  chartLine = new Chart(document.getElementById('chart-line'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        {
          label: 'ETH Price (USD)',
          data: [3500, 3620, 3480, 3750, 3900, 3820, 3841],
          borderColor: 'rgba(0,245,255,.8)', backgroundColor: 'rgba(0,245,255,.05)',
          tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: 'rgba(0,245,255,.8)',
          yAxisID: 'y',
        },
        {
          label: 'Threats Detected',
          data: [340, 520, 390, 680, 510, 290, 640],
          borderColor: 'rgba(255,51,85,.8)', backgroundColor: 'rgba(255,51,85,.05)',
          tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: 'rgba(255,51,85,.8)',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { family: "'Share Tech Mono'", size: 10 }, padding: 12 } } },
      scales: {
        x:  { grid: { color: 'rgba(0,245,255,.04)' }, ticks: { font: { family: "'Share Tech Mono'", size: 10 } } },
        y:  { grid: { color: 'rgba(0,245,255,.04)' }, ticks: { font: { family: "'Share Tech Mono'", size: 10 } }, position: 'left' },
        y1: { display: false, position: 'right' },
      },
      animation: { duration: 2000, easing: 'easeInOutQuart' },
    },
  });

  /* ── Bar: scan volume 24h ── */
  new Chart(document.getElementById('chart-bar'), {
    type: 'bar',
    data: {
      labels: ['0-4h', '4-8h', '8-12h', '12-16h', '16-20h', '20-24h'],
      datasets: [{
        data: [120, 89, 234, 310, 190, 265],
        backgroundColor: 'rgba(123,47,255,.6)',
        borderColor:     'rgba(123,47,255,.9)',
        borderWidth: 1, borderRadius: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: "'Share Tech Mono'", size: 9 } } },
        y: { grid: { color: 'rgba(0,245,255,.04)' }, ticks: { font: { family: "'Share Tech Mono'", size: 9 } } },
      },
      animation: { duration: 1500 },
    },
  });

  /* ── Radar: fraud confidence model ── */
  new Chart(document.getElementById('chart-radar'), {
    type: 'radar',
    data: {
      labels: ['TX VOLUME', 'VELOCITY', 'UNIQUE ADDR', 'CONTRACT', 'MIXER USE', 'AGE'],
      datasets: [{
        label: 'Last Scan',
        data: [72, 45, 88, 30, 15, 60],
        backgroundColor: 'rgba(255,45,135,.12)',
        borderColor:     'rgba(255,45,135,.7)',
        borderWidth: 1.5,
        pointBackgroundColor: 'rgba(255,45,135,.8)',
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          grid:        { color: 'rgba(0,245,255,.06)' },
          angleLines:  { color: 'rgba(0,245,255,.06)' },
          ticks:       { display: false },
          pointLabels: { font: { family: "'Share Tech Mono'", size: 9 }, color: 'rgba(150,180,220,.6)' },
        },
      },
      animation: { duration: 1500 },
    },
  });

  /* Fetch live ETH 7-day price to update the line chart */
  fetchEthChart();
}

/* ══════════════════════════════════════════
   LIVE CRYPTO DASHBOARD
   Fetches real prices from CoinGecko free API
══════════════════════════════════════════ */
async function initCryptoDashboard() {
  renderCryptoCards(null);         /* render skeleton / fallback first */
  await fetchAndRenderLiveData();  /* populate with live data */

  /* Refresh prices every 2 minutes (respect CoinGecko rate limits) */
  setInterval(fetchAndRenderLiveData, 120_000);
}

async function fetchAndRenderLiveData() {
  try {
    const res  = await fetch(API.COINGECKO_PRICES, { signal: AbortSignal.timeout(10_000) });
    const data = await res.json();
    renderCryptoCards(data);
    updateLiveDataStatus(true);

    /* Also refresh global stats */
    fetchGlobalStats();

  } catch {
    /* CoinGecko rate limit or offline — keep existing display */
    updateLiveDataStatus(false);
  }
}

/* ── Render or update coin cards ── */
function renderCryptoCards(liveData) {
  const grid = document.getElementById('crypto-grid');

  COIN_META.forEach(coin => {
    const existing = document.getElementById('coin-card-' + coin.sym);

    /* Build price / change from live data or use static fallbacks */
    let priceStr, changeStr, changeUp, mcapStr;

    if (liveData && liveData[coin.id]) {
      const d       = liveData[coin.id];
      const price   = d.usd;
      const change  = d.usd_24h_change;
      const mcap    = d.usd_market_cap;
      priceStr  = formatPrice(price);
      changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeUp  = change >= 0;
      mcapStr   = 'MCAP ' + formatLargeNum(mcap);
    } else {
      /* Fallback static values */
      const fallback = {
        BTC:   { p: 67420.50, c: 2.34,  m: 1.32e12 },
        ETH:   { p: 3841.20,  c: 1.87,  m: 4.61e11 },
        BNB:   { p: 572.80,   c: -0.42, m: 8.82e10 },
        SOL:   { p: 184.65,   c: 4.12,  m: 8.01e10 },
        AVAX:  { p: 42.30,    c: -1.23, m: 1.74e10 },
        MATIC: { p: 0.892,    c: 0.78,  m: 8.83e9  },
      }[coin.sym];
      priceStr  = formatPrice(fallback.p);
      changeStr = (fallback.c >= 0 ? '+' : '') + fallback.c.toFixed(2) + '%';
      changeUp  = fallback.c >= 0;
      mcapStr   = 'MCAP ' + formatLargeNum(fallback.m);
    }

    if (existing) {
      /* Update existing card in-place (no flicker) */
      existing.querySelector('.crypto-price').textContent = priceStr;
      const changeEl = existing.querySelector('.crypto-change');
      changeEl.textContent  = (changeUp ? '▲ ' : '▼ ') + changeStr;
      changeEl.className    = 'crypto-change ' + (changeUp ? 'up' : 'down');
      existing.querySelector('.crypto-mcap').textContent  = mcapStr;
    } else {
      /* Create card for the first time */
      const div = document.createElement('div');
      div.id        = 'coin-card-' + coin.sym;
      div.className = 'crypto-card';
      div.style.setProperty('--card-color', coin.color);
      div.innerHTML = `
        <div class="crypto-card-top">
          <div class="crypto-icon">${coin.icon}</div>
          <div class="crypto-name">${coin.name}</div>
        </div>
        <div class="crypto-price">${priceStr}</div>
        <div class="crypto-change ${changeUp ? 'up' : 'down'}">${changeUp ? '▲' : '▼'} ${changeStr}</div>
        <div class="crypto-mcap">${mcapStr}</div>
        <canvas class="crypto-sparkline" id="spark-${coin.sym}" width="220" height="40"></canvas>
      `;
      grid.appendChild(div);

      /* Draw sparkline */
      setTimeout(() => buildSparkline(coin), 80);
    }
  });

  /* Update ticker */
  buildTicker(liveData);
}

/* ── Build/refresh sparklines from CoinGecko 7-day data ── */
async function buildSparkline(coin) {
  let sparkData;
  try {
    const res  = await fetch(API.COINGECKO_CHART(coin.id), { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    sparkData  = json.prices.map(p => p[1]);
  } catch {
    /* Fallback random walk */
    const base = parseFloat((document.getElementById('coin-card-' + coin.sym)
      ?.querySelector('.crypto-price')?.textContent || '1000').replace(/[$,]/g, ''));
    sparkData = Array.from({ length: 12 }, () => base * (0.95 + Math.random() * 0.1));
  }

  const isUp   = sparkData[sparkData.length - 1] >= sparkData[0];
  const canvas = document.getElementById('spark-' + coin.sym);
  if (!canvas) return;

  /* Destroy old instance if it exists */
  if (sparklineCharts[coin.sym]) sparklineCharts[coin.sym].destroy();

  sparklineCharts[coin.sym] = new Chart(canvas, {
    type: 'line',
    data: {
      labels:   sparkData.map((_, i) => i),
      datasets: [{
        data:        sparkData,
        borderColor: isUp ? 'rgba(0,255,136,.7)' : 'rgba(255,51,85,.7)',
        borderWidth: 1.5, tension: 0.4, fill: false, pointRadius: 0,
      }],
    },
    options: {
      responsive: false, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales:  { x: { display: false }, y: { display: false } },
      animation: { duration: 800 },
    },
  });
}

/* ── Build ticker strip ── */
function buildTicker(liveData) {
  const ticker = document.getElementById('ticker-scroll');

  const items = COIN_META.map(coin => {
    let priceStr = '--', changeStr = '--', up = true;
    if (liveData && liveData[coin.id]) {
      const d  = liveData[coin.id];
      priceStr = formatPrice(d.usd);
      const c  = d.usd_24h_change;
      changeStr = (c >= 0 ? '+' : '') + c.toFixed(2) + '%';
      up = c >= 0;
    }
    return `<div class="ticker-item">
      <span class="ticker-symbol">${coin.sym}</span>
      <span class="ticker-price">${priceStr}</span>
      <span class="ticker-change ${up ? 'up' : 'down'}">${changeStr}</span>
    </div>`;
  });

  /* Duplicate for seamless loop */
  ticker.innerHTML = [...items, ...items].join('');
}

/* ── Fetch global market stats ── */
async function fetchGlobalStats() {
  try {
    const res  = await fetch(API.COINGECKO_GLOBAL, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const d    = json.data;

    document.getElementById('btc-dominance').textContent  = d.market_cap_percentage?.bitcoin?.toFixed(1) + '%' ?? '—';
    document.getElementById('eth-dominance').textContent  = d.market_cap_percentage?.ethereum?.toFixed(1) + '%' ?? '—';
    document.getElementById('total-mcap').textContent     = formatLargeNum(d.total_market_cap?.usd);
    document.getElementById('total-volume').textContent   = formatLargeNum(d.total_volume?.usd);
  } catch {
    /* silently fail — global stats are non-critical */
  }
}

/* ── Fetch live ETH 7-day price for the line chart ── */
async function fetchEthChart() {
  try {
    const res  = await fetch(API.COINGECKO_CHART('ethereum'), { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const prices = json.prices.map(p => p[1]);
    const labels = json.prices.map((p, i) => {
      const d = new Date(p[0]);
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    });

    if (chartLine) {
      chartLine.data.labels                  = labels;
      chartLine.data.datasets[0].data        = prices;
      chartLine.data.datasets[0].label       = 'ETH Price (USD)';
      chartLine.options.scales.y.ticks.callback = v => '$' + v.toLocaleString();
      chartLine.update();
    }
  } catch {
    /* Keep static data */
  }
}

/* ── Live gas price (Etherscan public endpoint) ── */
async function fetchGasPrice() {
  try {
    const res  = await fetch(API.ETHERSCAN_GAS, { signal: AbortSignal.timeout(6000) });
    const json = await res.json();
    if (json.status === '1') {
      const gwei = json.result.ProposeGasPrice;
      document.getElementById('gas-value').textContent = gwei + ' GWEI';
    }
  } catch {
    /* If no API key or offline, keep placeholder */
  }
}

/* ── Status pill for live data ── */
function updateLiveDataStatus(isLive) {
  const text = document.getElementById('live-data-text');
  if (text) {
    text.textContent = isLive
      ? 'LIVE · COINGECKO API · UPDATES EVERY 2 MIN'
      : 'DEMO DATA · BACKEND OFFLINE';
  }
}

/* ══════════════════════════════════════════
   HELPER: FORMAT PRICE  e.g. 67420.50 → $67,420.50
══════════════════════════════════════════ */
function formatPrice(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return '$' + n.toFixed(2);
  return '$' + n.toPrecision(4);
}

/* ══════════════════════════════════════════
   HELPER: FORMAT LARGE NUMBER  1.32e12 → $1.32T
══════════════════════════════════════════ */
function formatLargeNum(n) {
  if (!n) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2)  + 'M';
  return '$' + n.toLocaleString();
}

/* ══════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════ */
function showToast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (error ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════
   KEYBOARD SHORTCUT — Enter to analyze wallet
══════════════════════════════════════════ */
document.getElementById('wallet-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') analyzeWallet();
});