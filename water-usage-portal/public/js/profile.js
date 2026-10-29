const { pf, gl, pw } = document.forms;
ready.then(async (u) => {
  if (!u) return;
  pf.email.value = u.email; pf.name.value = u.name; pf.address.value = u.address;
  const g = (await api('/api/reports/goal')).data; gl.targetDailyLitres.value = g.targetDailyLitres; gl.targetMonthlyLitres.value = g.targetMonthlyLitres;
});
const handle = (form, url, body, msg, after) => form.addEventListener('submit', async (e) => {
  e.preventDefault(); form.classList.add('was-validated');
  if (!form.checkValidity()) return;
  try { await api(url, { method: 'PUT', body: body() }); toast(msg); after?.(); } catch (er) { toast(er.message, 'danger'); }
});
handle(pf, '/api/auth/profile', () => ({ name: pf.name.value, address: pf.address.value }), 'Profile updated');
handle(gl, '/api/reports/goal', () => ({ targetDailyLitres: +gl.targetDailyLitres.value, targetMonthlyLitres: +gl.targetMonthlyLitres.value }), 'Goal saved');
handle(pw, '/api/auth/password', () => ({ currentPassword: pw.currentPassword.value, newPassword: pw.newPassword.value }), 'Password updated', () => { pw.reset(); pw.classList.remove('was-validated'); });
$('#lo').addEventListener('click', logout);
