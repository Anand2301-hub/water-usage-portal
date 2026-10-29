ready.then((u) => { if (u) location.href = '/dashboard.html'; });
const f = document.querySelector('form');
f.addEventListener('submit', async (e) => {
  e.preventDefault();
  f.confirmPassword?.setCustomValidity(f.password.value === f.confirmPassword.value ? '' : 'Passwords must match');
  f.classList.add('was-validated');
  if (!f.checkValidity()) return;
  const btn = f.querySelector('button'); btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Please wait';
  try { await api('/api/auth/' + f.id, { method: 'POST', body: Object.fromEntries(new FormData(f)) }); location.href = '/dashboard.html'; }
  catch (err) { document.querySelector('#msg').innerHTML = '<div class="alert alert-danger">' + esc(err.message) + '</div>'; btn.disabled = false; btn.textContent = f.id === 'login' ? 'Log in' : 'Create account'; }
});
f.confirmPassword?.addEventListener('input', () => f.confirmPassword.setCustomValidity(''));
