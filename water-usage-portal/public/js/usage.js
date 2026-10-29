let page = 1, editing = null, recs = {};
const mod = new bootstrap.Modal('#uModal'), f = document.forms.u, ff = document.forms.filters;
ready.then((u) => { if (!u) return; f.usageDate.max = new Date().toISOString().slice(0, 10); load(); });
async function load() {
  const p = new URLSearchParams(new FormData(ff)), [sort, order] = p.get('sort').split(':');
  p.set('sort', sort); p.set('order', order); p.set('page', page); p.set('limit', 8);
  [...p].forEach(([k, v]) => { if (!v) p.delete(k); });
  try {
    const r = await api('/api/usage?' + p);
    recs = Object.fromEntries(r.data.map((x) => [x._id, x]));
    $('#empty').classList.toggle('d-none', r.data.length > 0);
    $('#rows').innerHTML = r.data.map((x) => `<tr><td>${fdate(x.usageDate)}</td><td><span class="badge badge-cat">${x.category}</span></td><td class="fw-semibold">${x.quantityLitres} L</td><td class="text-secondary">${esc(x.notes)}</td><td class="text-end text-nowrap"><button class="btn btn-sm btn-light" data-a="view" data-id="${x._id}" aria-label="View"><i class="bi bi-eye"></i></button> <button class="btn btn-sm btn-light" data-a="edit" data-id="${x._id}" aria-label="Edit"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-light text-danger" data-a="del" data-id="${x._id}" aria-label="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('');
    $('#pager').innerHTML = r.pages > 1 ? Array.from({ length: r.pages }, (_, i) => `<li class="page-item ${i + 1 === r.page ? 'active' : ''}"><button class="page-link" data-p="${i + 1}">${i + 1}</button></li>`).join('') : '';
  } catch (e) { toast(e.message, 'danger'); }
}
function openForm(rec, ro) {
  f.reset(); editing = rec?._id || null; f.classList.remove('was-validated');
  if (rec) { f.usageDate.value = rec.usageDate.slice(0, 10); f.category.value = rec.category; f.quantityLitres.value = rec.quantityLitres; f.notes.value = rec.notes; }
  [...f.elements].forEach((i) => { if (i.name) i.disabled = !!ro; });
  $('#saveBtn').classList.toggle('d-none', !!ro);
  $('#mTitle').textContent = ro ? 'Record details' : rec ? 'Edit usage' : 'Add usage';
  $('#smartBox').classList.toggle('d-none', !!ro || !!rec);
  mod.show();
}
$('#addBtn').addEventListener('click', () => openForm());
ff.addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); });
$('#pager').addEventListener('click', (e) => { const p = e.target.dataset.p; if (p) { page = +p; load(); } });
$('#rows').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const rec = recs[b.dataset.id];
  if (b.dataset.a === 'view') openForm(rec, true);
  if (b.dataset.a === 'edit') openForm(rec);
  if (b.dataset.a === 'del' && await confirmBox('Delete this ' + rec.quantityLitres + ' L ' + rec.category + ' record?')) {
    try { await api('/api/usage/' + rec._id, { method: 'DELETE' }); toast('Record deleted'); load(); } catch (er) { toast(er.message, 'danger'); }
  }
});
f.addEventListener('submit', async (e) => {
  e.preventDefault(); f.classList.add('was-validated');
  if (!f.checkValidity()) return;
  const body = { usageDate: f.usageDate.value, category: f.category.value, quantityLitres: +f.quantityLitres.value, notes: f.notes.value };
  try {
    await api(editing ? '/api/usage/' + editing : '/api/usage', { method: editing ? 'PUT' : 'POST', body });
    mod.hide(); toast(editing ? 'Record updated' : 'Record added'); load();
  } catch (er) { toast(er.message, 'danger'); }
});
$('#smartBtn').addEventListener('click', async () => {
  const t = $('#smartTxt').value.trim();
  if (t.length < 3) return toast('Describe your usage first', 'warning');
  const b = $('#smartBtn'); b.disabled = true;
  try {
    const r = (await api('/api/ai/parse', { method: 'POST', body: { text: t } })).data;
    f.category.value = r.category; f.quantityLitres.value = r.quantityLitres; f.notes.value = r.notes || t;
    if (!f.usageDate.value) f.usageDate.value = new Date().toISOString().slice(0, 10);
    toast('Filled ' + (r.source === 'ai' ? 'by AI' : 'by estimate') + '. Check the values and save.');
  } catch (e) { toast(e.message, 'danger'); }
  b.disabled = false;
});
