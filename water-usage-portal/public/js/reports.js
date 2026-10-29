ready.then(async (u) => {
  if (!u) return;
  try {
    const [s, c, t] = await Promise.all([api('/api/reports/summary'), api('/api/reports/categories'), api('/api/reports/trends?days=30')]), S = s.data, g = S.goal;
    const box = (lab, v, tgt, note) => { const p = Math.min(100, v / tgt * 100); return `<div class="col-md-4"><div class="card-stat p-3"><div class="stat-label">${lab}</div><div class="stat-val">${fmt(v)} L</div><div class="progress my-2" style="height:8px"><div class="progress-bar ${v > tgt ? 'bg-danger' : 'bg-info'}" style="width:${p}%"></div></div><small class="text-secondary">${note}: ${fmt(tgt)} L target</small></div></div>`; };
    $('#sum').innerHTML = box('Today', S.today, g.targetDailyLitres, 'Daily') + box('Last 7 days', S.week, g.targetDailyLitres * 7, 'Weekly') + box('This month', S.month, g.targetMonthlyLitres, 'Monthly');
    new Chart($('#catChart'), { type: 'bar', data: { labels: c.data.map((x) => x._id), datasets: [{ label: 'Litres', data: c.data.map((x) => x.total), backgroundColor: '#0fa3a3', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
    new Chart($('#trChart'), { type: 'line', data: { labels: t.data.map((x) => x._id.slice(5)), datasets: [{ label: 'Litres', data: t.data.map((x) => x.total), borderColor: '#0b6fa8', tension: .35, pointRadius: 2 }, { label: 'Daily target', data: t.data.map(() => g.targetDailyLitres), borderColor: '#e0566b', borderDash: [6, 4], pointRadius: 0 }] }, options: { scales: { y: { beginAtZero: true } } } });
  } catch (e) { toast(e.message, 'danger'); }
});
document.forms.ex.addEventListener('submit', (e) => {
  e.preventDefault();
  const p = new URLSearchParams(new FormData(e.target)); [...p].forEach(([k, v]) => { if (!v) p.delete(k); });
  location.href = '/api/usage/export?' + p;
});
