const $ = (s, r = document) => r.querySelector(s);
const CATS = ['drinking', 'bathing', 'washing', 'cooking', 'gardening', 'other'];
const TIPS = [
  ['Fix leaks fast', 'A dripping tap can waste over 15 litres a day. Tighten or replace the washer.'],
  ['Shorten showers', 'Cutting two minutes from a shower saves roughly 20 litres.'],
  ['Turn off while brushing', 'Closing the tap while you brush saves up to 6 litres each time.'],
  ['Water plants early', 'Water in the morning or evening so less evaporates.'],
  ['Run full loads', 'Wash clothes and dishes only with a full load.'],
  ['Reuse rinse water', 'Use water from washing vegetables for plants.'],
  ['Use a bucket', 'A bucket bath uses far less water than a running shower.'],
  ['Collect rainwater', 'Store rainwater for gardening and cleaning.']];
const SUG = {
  drinking: 'Carry a refillable bottle and pour only what you will drink.',
  bathing: 'Bathing is your biggest use. Try shorter showers or a bucket bath.',
  washing: 'Wash clothes and dishes in full loads and rinse in a basin, not under a running tap.',
  cooking: 'Soak and rinse produce in a bowl, then reuse that water for plants.',
  gardening: 'Water plants early morning or evening and add mulch to hold moisture.',
  other: 'Check for leaks and use a bucket and mug for cleaning.'};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('en-IN');
const fdate = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
async function api(url, opt = {}) {
  const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.message || 'Request failed'); e.status = r.status; throw e; }
  return d;
}
function toast(msg, type = 'success') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toast-container position-fixed top-0 end-0 p-3'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast align-items-center text-bg-' + type + ' border-0';
  t.innerHTML = '<div class="d-flex"><div class="toast-body">' + esc(msg) + '</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>';
  box.append(t);
  const bt = new bootstrap.Toast(t, { delay: 3500 });
  t.addEventListener('hidden.bs.toast', () => t.remove());
  bt.show();
}
function confirmBox(msg, ok = 'Delete') {
  return new Promise((res) => {
    const d = document.createElement('div');
    d.className = 'modal fade';
    d.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-body p-4"><h5>Please confirm</h5><p>' + esc(msg) + '</p><div class="text-end"><button class="btn btn-light" data-v="0">Cancel</button> <button class="btn btn-danger" data-v="1">' + ok + '</button></div></div></div></div>';
    document.body.append(d);
    const m = new bootstrap.Modal(d);
    d.addEventListener('click', (e) => { const v = e.target.dataset.v; if (v !== undefined) { res(v === '1'); m.hide(); } });
    d.addEventListener('hidden.bs.modal', () => { res(false); d.remove(); });
    m.show();
  });
}
function personal(s, cats) {
  const g = s.goal, out = [];
  out.push(s.month > g.targetMonthlyLitres ? `You have used ${fmt(s.month)} L this month, above your ${fmt(g.targetMonthlyLitres)} L goal. Start by cutting your biggest category.` : `You are within your monthly goal, with ${fmt(g.targetMonthlyLitres - s.month)} L to spare.`);
  if (s.today > g.targetDailyLitres) out.push(`Today's usage (${fmt(s.today)} L) is above your daily target of ${fmt(g.targetDailyLitres)} L.`);
  const top = cats[0];
  out.push(top ? `Top category: ${top._id} (${fmt(top.total)} L). ${SUG[top._id]}` : 'Add your first usage record to get tips based on your habits.');
  return out;
}
async function boot() {
  const b = document.body.dataset;
  let user = null;
  try { user = (await api('/api/auth/me')).user; } catch {}
  if (b.auth !== 'no' && !user) { location.href = '/login.html'; return null; }
  if (b.admin === 'yes' && user.role !== 'admin') { location.href = '/dashboard.html'; return null; }
  const links = user ? [['dashboard', 'Dashboard', 'speedometer2'], ['usage', 'Usage', 'droplet-half'], ['reports', 'Reports', 'bar-chart-line'], ['tips', 'Tips', 'lightbulb'], ['coach', 'AI Coach', 'stars'], ...(user.role === 'admin' ? [['admin', 'Admin', 'shield-lock']] : []), ['profile', 'Profile', 'person-circle']] : [['tips', 'Tips', 'lightbulb']];
  const cur = location.pathname.split('/').pop().replace('.html', '') || 'index';
  $('#nav').innerHTML = '<nav class="navbar navbar-expand-lg navbar-dark navbar-water sticky-top"><div class="container"><a class="navbar-brand fw-bold" href="/"><span class="brand-drop"></span>AquaTrack</a><button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#mn" aria-label="Menu"><span class="navbar-toggler-icon"></span></button><div class="collapse navbar-collapse" id="mn"><ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1">' +
    links.map((l) => `<li class="nav-item"><a class="nav-link ${cur === l[0] ? 'active' : ''}" href="/${l[0]}.html"><i class="bi bi-${l[2]}"></i> ${l[1]}</a></li>`).join('') +
    (user ? '<li class="nav-item"><button id="navLogout" class="btn btn-sm btn-outline-light ms-lg-2">Log out</button></li>' : '<li class="nav-item"><a class="nav-link" href="/login.html">Log in</a></li><li class="nav-item"><a class="btn btn-sm btn-light ms-lg-2" href="/register.html">Register</a></li>') + '</ul></div></div></nav>';
  $('#footer').innerHTML = '<div class="container">Water Usage Monitoring and Conservation Portal &middot; Web Technology IA3</div>';
  $('#navLogout')?.addEventListener('click', logout);
  document.querySelectorAll('select.cat').forEach((s) => CATS.forEach((c) => s.add(new Option(c[0].toUpperCase() + c.slice(1), c))));
  const dt = $('#dailyTip'); if (dt) { const t = TIPS[new Date().getDate() % TIPS.length]; dt.innerHTML = '<strong>' + t[0] + '.</strong> ' + t[1]; }
  return user;
}
async function logout() { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); location.href = '/login.html'; }
const ready = new Promise((r) => document.addEventListener('DOMContentLoaded', () => r(boot())));
