// ─── Utilities ────────────────────────────────────────────────────────────────

const exampleIP = [192, 168, 1, 42];

function ipToBits(o) {
  return o.flatMap(v => Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1));
}

function bitsToMask(p) {
  return Array.from({ length: 32 }, (_, i) => i < p ? 1 : 0);
}

function bitsToIP(b) {
  return [0, 8, 16, 24].map(s => parseInt(b.slice(s, s + 8).join(''), 2)).join('.');
}

function prefixToMask(p) {
  return bitsToIP(bitsToMask(p));
}

function calcNetBcast(ip, prefix) {
  const ib = ipToBits(ip);
  const mb = bitsToMask(prefix);
  const nb = ib.map((b, i) => b & mb[i]);
  const bb = nb.map((b, i) => i < prefix ? b : 1);
  return { net: bitsToIP(nb), bcast: bitsToIP(bb) };
}

function parseIP(s) {
  const p = s.split('.').map(Number);
  if (p.length !== 4 || p.some(v => isNaN(v) || v < 0 || v > 255)) return null;
  return p;
}

// ─── IP Class Logic ───────────────────────────────────────────────────────────

const CLASS_INFO = {
  A:        { range: '1.0.0.0 – 126.255.255.255',   defaultMask: '255.0.0.0',     defaultPrefix: 8,  hosts: '16,777,214', desc: 'Very large networks — governments, ISPs', color: '#4f8ef7' },
  B:        { range: '128.0.0.0 – 191.255.255.255', defaultMask: '255.255.0.0',   defaultPrefix: 16, hosts: '65,534',     desc: 'Mid-size networks — universities, enterprises', color: '#3ecf8e' },
  C:        { range: '192.0.0.0 – 223.255.255.255', defaultMask: '255.255.255.0', defaultPrefix: 24, hosts: '254',        desc: 'Small networks — offices, homes', color: '#f6ad55' },
  D:        { range: '224.0.0.0 – 239.255.255.255', defaultMask: 'N/A',           defaultPrefix: null, hosts: 'N/A',      desc: 'Multicast — routing protocols, video streaming', color: '#a78bfa' },
  E:        { range: '240.0.0.0 – 255.255.255.255', defaultMask: 'N/A',           defaultPrefix: null, hosts: 'N/A',      desc: 'Reserved / Experimental — not publicly used', color: '#f56565' },
  LOOPBACK: { range: '127.0.0.0 – 127.255.255.255', defaultMask: '255.0.0.0',     defaultPrefix: 8,  hosts: 'N/A',       desc: 'Loopback — local host only (127.0.0.1)', color: '#9096b0' },
};

function detectIPClass(ip) {
  const first = ip[0];
  if (first === 127)                return 'LOOPBACK';
  if (first >= 1   && first <= 126) return 'A';
  if (first >= 128 && first <= 191) return 'B';
  if (first >= 192 && first <= 223) return 'C';
  if (first >= 224 && first <= 239) return 'D';
  return 'E';
}

function isPrivateIP(ip) {
  const [a, b] = ip;
  if (a === 10)                          return '10.0.0.0/8 — Class A private';
  if (a === 172 && b >= 16 && b <= 31)   return '172.16.0.0/12 — Class B private';
  if (a === 192 && b === 168)            return '192.168.0.0/16 — Class C private';
  if (a === 127)                         return '127.0.0.0/8 — Loopback';
  if (a === 169 && b === 254)            return '169.254.0.0/16 — Link-local (APIPA)';
  return null;
}

function renderClassBadge(cls) {
  const info = CLASS_INFO[cls];
  const color = info ? info.color : '#9096b0';
  const label = cls === 'LOOPBACK' ? 'Loopback' : `Class ${cls}`;
  return `<span class="class-badge" style="background:${color}22;color:${color};border:1px solid ${color}55">${label}</span>`;
}

// ─── Core Idea Tab ────────────────────────────────────────────────────────────

let manualClassOverride = null;

function updateBits() {
  const prefix = +document.getElementById('prefix-slider').value;
  document.getElementById('prefix-label').textContent = prefix;

  const bits = ipToBits(exampleIP);
  const c = document.getElementById('bit-display');
  c.innerHTML = '';

  bits.forEach((b, i) => {
    if (i > 0 && i % 8 === 0) {
      const s = document.createElement('div');
      s.className = 'bit-sep';
      c.appendChild(s);
    }
    const el = document.createElement('div');
    el.className = 'bit ' + (i < prefix ? 'bit-net' : 'bit-host');
    el.textContent = b;
    c.appendChild(el);
  });

  const pct = Math.round((prefix / 32) * 100);
  document.getElementById('bar-net').style.width = pct + '%';
  document.getElementById('bar-net').textContent = prefix <= 14 ? '/' + prefix : '/' + prefix + ' — network';
  document.getElementById('bar-host').textContent = (32 - prefix) + ' host bits';

  document.getElementById('mask-val').textContent = prefixToMask(prefix);

  const hb = 32 - prefix;
  const hosts = hb >= 2 ? Math.pow(2, hb) - 2 : 0;
  document.getElementById('hosts-val').textContent = hosts > 0 ? hosts.toLocaleString() : '(point-to-point)';

  const { net, bcast } = calcNetBcast(exampleIP, prefix);
  document.getElementById('net-addr').textContent = net;
  document.getElementById('bcast-addr').textContent = bcast;

  updateCoreClassUI();
}

function updateCoreClassUI() {
  const autoClass = detectIPClass(exampleIP);
  const cls = manualClassOverride || autoClass;
  const info = CLASS_INFO[cls];

  // Highlight active class button
  document.querySelectorAll('.class-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cls === cls);
  });

  // Badge row
  const badgeEl = document.getElementById('auto-class-badge');
  if (badgeEl) {
    let html = renderClassBadge(autoClass) + '<span class="auto-note"> auto-detected</span>';
    if (manualClassOverride && manualClassOverride !== autoClass) {
      html += ` <span class="override-arrow">→ overridden to</span> ${renderClassBadge(manualClassOverride)}`;
    }
    badgeEl.innerHTML = html;
  }

  // Info panel
  const panel = document.getElementById('class-info-panel');
  if (panel && info) {
    panel.style.borderLeftColor = info.color;
    panel.innerHTML = `
      <div class="ci-row"><span class="ci-label">Range</span><span class="ci-val">${info.range}</span></div>
      <div class="ci-row"><span class="ci-label">Default mask</span><span class="ci-val">${info.defaultMask}${info.defaultPrefix ? ' (/' + info.defaultPrefix + ')' : ''}</span></div>
      <div class="ci-row"><span class="ci-label">Max hosts</span><span class="ci-val">${info.hosts}</span></div>
      <div class="ci-row"><span class="ci-label">Use case</span><span class="ci-val">${info.desc}</span></div>
    `;
  }
}

function setClassOverride(cls) {
  manualClassOverride = (manualClassOverride === cls) ? null : cls;
  updateCoreClassUI();
}

// ─── Calculator ───────────────────────────────────────────────────────────────

function calcSubnet() {
  const raw = document.getElementById('cidr-input').value.trim();
  const err = document.getElementById('calc-err');
  const m = raw.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);

  if (!m) { err.textContent = 'Use format: 192.168.1.0/24'; clearCalc(); return; }

  const ip = parseIP(m[1]);
  const prefix = +m[2];

  if (!ip || prefix < 0 || prefix > 32) { err.textContent = 'Invalid IP or prefix length'; clearCalc(); return; }
  err.textContent = '';

  const { net, bcast } = calcNetBcast(ip, prefix);
  const np = net.split('.').map(Number);
  const bp = bcast.split('.').map(Number);
  const fp = [...np]; fp[3] += 1;
  const lp = [...bp]; lp[3] -= 1;

  const hb = 32 - prefix;
  const hosts = hb >= 2 ? Math.pow(2, hb) - 2 : 0;

  document.getElementById('c-net').textContent   = net;
  document.getElementById('c-bcast').textContent = bcast;
  document.getElementById('c-first').textContent = prefix <= 30 ? fp.join('.') : 'N/A';
  document.getElementById('c-last').textContent  = prefix <= 30 ? lp.join('.') : 'N/A';
  document.getElementById('c-mask').textContent  = prefixToMask(prefix);
  document.getElementById('c-hosts').textContent = hosts > 0 ? hosts.toLocaleString() : '0';
  document.getElementById('c-range').textContent = prefix <= 30 ? fp.join('.') + '  –  ' + lp.join('.') : 'No usable hosts';

  // IP Class
  const cls = detectIPClass(ip);
  document.getElementById('c-class').innerHTML = renderClassBadge(cls);

  // Private / Public
  const priv = isPrivateIP(ip);
  const privEl = document.getElementById('c-private');
  privEl.innerHTML = priv
    ? `<span class="badge-priv">🔒 Private — ${priv}</span>`
    : `<span class="badge-pub">🌐 Public (internet routable)</span>`;

  // Binary mask
  const mb = bitsToMask(prefix);
  const bw = document.getElementById('c-binmask');
  bw.innerHTML = '';
  mb.forEach((b, i) => {
    if (i > 0 && i % 8 === 0) { const s = document.createElement('div'); s.className = 'bit-sep'; bw.appendChild(s); }
    const el = document.createElement('div');
    el.className = 'bit ' + (b ? 'bit-net' : 'bit-host');
    el.textContent = b;
    bw.appendChild(el);
  });

  // Subnet splitter
  renderSplitter(ip, prefix);
}

function clearCalc() {
  ['c-net','c-bcast','c-first','c-last','c-mask','c-hosts','c-range'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  document.getElementById('c-binmask').innerHTML = '';
  document.getElementById('c-class').innerHTML   = '';
  document.getElementById('c-private').innerHTML = '';
  document.getElementById('splitter-result').innerHTML = '';
}

// ─── Subnet Splitter ──────────────────────────────────────────────────────────

function renderSplitter(ip, prefix) {
  const splitInto = +document.getElementById('split-select').value;
  const bitsNeeded = Math.log2(splitInto);
  const newPrefix  = prefix + bitsNeeded;
  const result     = document.getElementById('splitter-result');

  if (newPrefix > 30) {
    result.innerHTML = `<span style="color:var(--red);font-size:0.78rem">Cannot split /${prefix} into ${splitInto} — new prefix /${newPrefix} exceeds /30.</span>`;
    return;
  }

  const { net } = calcNetBcast(ip, prefix);
  const netParts  = net.split('.').map(Number);
  const blockSize = Math.pow(2, 32 - newPrefix);
  let base = (netParts[0] << 24 | netParts[1] << 16 | netParts[2] << 8 | netParts[3]) >>> 0;

  const toIP = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

  let html = `<div class="split-header">Splitting /${prefix} → ${splitInto} × /${newPrefix} subnets (${(blockSize - 2).toLocaleString()} hosts each)</div>`;
  for (let i = 0; i < splitInto; i++) {
    const start    = (base + i * blockSize) >>> 0;
    const end      = (start + blockSize - 1) >>> 0;
    html += `
      <div class="split-row">
        <span class="split-num">#${i + 1}</span>
        <span class="split-net">${toIP(start)}/${newPrefix}</span>
        <span class="split-range">${toIP(start + 1)} – ${toIP(end - 1)}</span>
        <span class="split-bc">bcast: ${toIP(end)}</span>
      </div>`;
  }
  result.innerHTML = html;
}

function onSplitChange() {
  const raw = document.getElementById('cidr-input').value.trim();
  const m   = raw.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
  if (!m) return;
  const ip = parseIP(m[1]);
  if (ip) renderSplitter(ip, +m[2]);
}

// ─── Cheat sheet ──────────────────────────────────────────────────────────────

const cheatData = [
  ['/8',  '255.0.0.0',       16777214, 'Class A, large orgs'],
  ['/16', '255.255.0.0',     65534,    'Class B, mid orgs'],
  ['/20', '255.255.240.0',   4094,     'AWS default VPC'],
  ['/22', '255.255.252.0',   1022,     'Campus / large office'],
  ['/24', '255.255.255.0',   254,      'Small office / home'],
  ['/25', '255.255.255.128', 126,      'Half a /24'],
  ['/26', '255.255.255.192', 62,       'Quarter of a /24'],
  ['/27', '255.255.255.224', 30,       'Small team / VLAN'],
  ['/28', '255.255.255.240', 14,       'Small subnet'],
  ['/29', '255.255.255.248', 6,        'Point-to-multipoint'],
  ['/30', '255.255.255.252', 2,        'Point-to-point links'],
  ['/32', '255.255.255.255', 0,        'Single host / loopback'],
];

function buildCheat() {
  const body = document.getElementById('cheat-body');
  cheatData.forEach(([cidr, mask, hosts, use]) => {
    const row = document.createElement('div');
    row.className = 'cheat-row';
    row.innerHTML = `
      <span class="cheat-cidr">${cidr}</span>
      <span class="cheat-mask">${mask}</span>
      <span class="cheat-hosts">${hosts > 0 ? hosts.toLocaleString() : '—'}</span>
      <span class="cheat-use">${use}</span>`;
    body.appendChild(row);
  });
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const questions = [
  { q: 'How many usable hosts does a /28 subnet have?', opts: ['14','16','30','254'], ans: 0, expl: '/28 → 4 host bits → 2⁴=16 addresses − 2 reserved = 14 usable hosts.' },
  { q: 'What is the broadcast address of 10.0.0.0/29?', opts: ['10.0.0.6','10.0.0.7','10.0.0.8','10.0.0.255'], ans: 1, expl: '/29 → 3 host bits → block size 8. Network: 10.0.0.0, broadcast: 10.0.0.7 (all host bits = 1).' },
  { q: 'A /25 subnet mask is…', opts: ['255.255.255.0','255.255.255.128','255.255.255.192','255.255.255.224'], ans: 1, expl: '/25 means 25 bits set to 1. Last octet = 10000000 = 128.' },
  { q: 'You need a subnet for exactly 50 hosts. Smallest prefix that fits?', opts: ['/25','/26','/27','/28'], ans: 1, expl: '/26 → 62 usable. /27 → 30 (too small). /26 is the tightest fit.' },
  { q: 'What does the network address of a subnet represent?', opts: ['First usable host','Gateway router','The subnet itself — no device uses it','DNS server'], ans: 2, expl: 'All host bits = 0. Identifies the subnet — never assigned to a device.' },
  { q: 'How many /26 subnets fit inside a /24?', opts: ['2','4','8','16'], ans: 1, expl: '/26 borrows 2 bits → 2² = 4 subnets, each with 62 usable hosts.' },
  { q: 'Which IP class is 172.20.5.1?', opts: ['Class A','Class B','Class C','Class D'], ans: 1, expl: 'First octet 172 is in 128–191 → Class B. Default mask: 255.255.0.0 (/16).' },
  { q: 'What type of address is 192.168.10.50?', opts: ['Public routable','Private (RFC 1918)','Multicast','Loopback'], ans: 1, expl: '192.168.0.0/16 is an RFC 1918 private range. Not routable on the public internet.' },
];

let qIdx = 0, answered = false;

function renderQ() {
  answered = false;
  document.getElementById('next-btn').style.display = 'none';
  const q = questions[qIdx];
  document.getElementById('quiz-meta').textContent = `Question ${qIdx + 1} of ${questions.length}`;
  document.getElementById('quiz-q').textContent = q.q;
  document.getElementById('quiz-opts').innerHTML = q.opts
    .map((o, i) => `<button class="quiz-opt" onclick="answer(${i})">${o}</button>`).join('');
  const fb = document.getElementById('feedback');
  fb.textContent = '';
  fb.classList.remove('show');
}

function answer(i) {
  if (answered) return;
  answered = true;
  const q = questions[qIdx];
  document.querySelectorAll('.quiz-opt').forEach((b, j) => {
    b.classList.toggle('correct', j === q.ans);
    b.classList.toggle('wrong', j === i && j !== q.ans);
  });
  const fb = document.getElementById('feedback');
  fb.textContent = q.expl;
  fb.classList.add('show');
  if (qIdx < questions.length - 1) document.getElementById('next-btn').style.display = 'inline-block';
}

function nextQ() { qIdx = (qIdx + 1) % questions.length; renderQ(); }

// ─── Tab switching ────────────────────────────────────────────────────────────

function switchTab(id) {
  const ids = ['bits','calc','cheat','quiz'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', ids[i] === id));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + id));
}

// ─── Init ─────────────────────────────────────────────────────────────────────

updateBits();
calcSubnet();
buildCheat();
renderQ();