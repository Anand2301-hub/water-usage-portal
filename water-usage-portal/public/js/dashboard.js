ready.then(async (u) => {
  if (!u) return;
  try {
    const [s, t, c, l] = await Promise.all([api('/api/reports/summary'), api('/api/reports/trends'), api('/api/reports/categories'), api('/api/usage?limit=5')]);
    const S = s.data, card = (i, lab, v) => `<div class="col-6 col-lg"><div class="card-stat p-3 h-100"><div class="d-flex align-items-center gap-3"><div class="stat-icon"><i class="bi bi-${i}"></i></div><div><div class="stat-label">${lab}</div><div class="stat-val">${fmt(v)} <small class="fs-6">L</small></div></div></div></div></div>`;
    $('#cards').innerHTML = card('droplet-fill', 'Total consumed', S.total) + card('sun', 'Today', S.today) + card('calendar-week', 'Last 7 days', S.week) + card('calendar-month', 'This month', S.month) + card('piggy-bank', 'Estimated saved', S.saved);
    const pct = Math.min(100, S.month / S.goal.targetMonthlyLitres * 100);
    $('#bar').style.width = pct + '%'; $('#bar').className = 'progress-bar ' + (pct >= 100 ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-info');
    $('#goalTxt').textContent = `${fmt(S.month)} of ${fmt(S.goal.targetMonthlyLitres)} L used (${Math.round(pct)}%)`;
    $('#sug').innerHTML = personal(S, c.data).map((x) => '<li class="mb-2">' + esc(x) + '</li>').join('');
    new Chart($('#trend'), { type: 'line', data: { labels: t.data.map((d) => d._id.slice(5)), datasets: [{ label: 'Litres', data: t.data.map((d) => d.total), borderColor: '#0b6fa8', backgroundColor: 'rgba(15,163,163,.15)', fill: true, tension: .35, pointRadius: 2 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
    $('#recent').innerHTML = l.data.length ? l.data.map((r) => `<tr><td>${fdate(r.usageDate)}</td><td><span class="badge badge-cat">${r.category}</span></td><td>${r.quantityLitres} L</td></tr>`).join('') : '<tr><td colspan="3" class="text-center text-secondary p-4">No records yet. <a href="/usage.html">Add your first one</a>.</td></tr>';
  } catch (e) { toast(e.message, 'danger'); }
});
ready.then(async (u) => {
  if (!u) return;
  try {
    const D = (await api('/api/reports/insights')).data;
    const box = (cls, t, v) => `<div class="col-md-4"><div class="p-3 rounded h-100" style="background:var(--mist)"><small class="text-secondary">${t}</small><div class="fw-bold ${cls}">${v}</div></div></div>`;
    $('#ins').innerHTML = box(D.willExceed ? 'text-danger' : 'text-success', 'Month-end forecast', `${fmt(D.forecast)} L of ${fmt(D.monthlyTarget)} L ${D.willExceed ? '(on track to exceed)' : '(on track)'}`) +
      box('', 'Days under target in a row', `${D.streak} ${D.streak >= 7 ? '&#127942;' : ''}`) +
      box(D.alerts.length ? 'text-danger' : 'text-success', 'Usage alerts', D.alerts.length ? esc(D.alerts[D.alerts.length - 1].message) : 'No unusual usage this week');
  } catch (e) {}
});
