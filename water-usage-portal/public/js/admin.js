async function load() {
  const [d, us, rc] = await Promise.all([api('/api/admin/dashboard'), api('/api/admin/users'), api('/api/admin/usage')]), D = d.data;
  const card = (i, l, v) => `<div class="col-md-4"><div class="card-stat p-3 d-flex gap-3 align-items-center"><div class="stat-icon"><i class="bi bi-${i}"></i></div><div><div class="stat-label">${l}</div><div class="stat-val">${fmt(v)}</div></div></div></div>`;
  $('#cards').innerHTML = card('people', 'Registered users', D.users) + card('journal-text', 'Usage records', D.records) + card('droplet-fill', 'Total litres', D.totalLitres);
  window.ch?.forEach((c) => c.destroy());
  window.ch = [new Chart($('#c1'), { type: 'bar', data: { labels: D.byCategory.map((x) => x._id), datasets: [{ data: D.byCategory.map((x) => x.total), backgroundColor: '#0fa3a3', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } } } }),
    new Chart($('#c2'), { type: 'line', data: { labels: D.monthly.map((x) => x._id), datasets: [{ data: D.monthly.map((x) => x.total), borderColor: '#0b6fa8', tension: .3 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } })];
  $('#users').innerHTML = us.data.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td><span class="badge ${x.role === 'admin' ? 'text-bg-dark' : 'badge-cat'}">${x.role}</span></td><td>${fdate(x.createdAt)}</td><td class="text-end">${x.role === 'admin' ? '' : `<button class="btn btn-sm btn-light text-danger" data-id="${x._id}" data-n="${esc(x.name)}"><i class="bi bi-trash"></i></button>`}</td></tr>`).join('');
  $('#usage').innerHTML = rc.data.length ? rc.data.map((x) => `<tr><td>${esc(x.userId?.name || 'Deleted user')}</td><td>${fdate(x.usageDate)}</td><td><span class="badge badge-cat">${x.category}</span></td><td>${x.quantityLitres} L</td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-secondary p-4">No records yet.</td></tr>';
}
ready.then((u) => { if (u) load().catch((e) => toast(e.message, 'danger')); });
$('#users').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (await confirmBox('Delete ' + b.dataset.n + ' and all their records?')) {
    try { await api('/api/admin/users/' + b.dataset.id, { method: 'DELETE' }); toast('User deleted'); load(); } catch (er) { toast(er.message, 'danger'); }
  }
});
