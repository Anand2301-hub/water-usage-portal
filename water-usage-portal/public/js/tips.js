$('#all').innerHTML = TIPS.map((t) => `<div class="col-md-6 col-lg-3"><div class="card-stat tip-card p-3 h-100"><h6>${t[0]}</h6><p class="mb-0 text-secondary">${t[1]}</p></div></div>`).join('');
ready.then(async (u) => {
  if (!u) return;
  try { const [s, c] = await Promise.all([api('/api/reports/summary'), api('/api/reports/categories')]); $('#mine').innerHTML = personal(s.data, c.data).map((x) => '<li class="mb-2">' + esc(x) + '</li>').join(''); } catch (e) { toast(e.message, 'danger'); }
});
