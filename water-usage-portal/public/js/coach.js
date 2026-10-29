const log = $('#log'), inp = $('#q');
function add(t, me) { const d = document.createElement('div'); d.className = 'bubble ' + (me ? 'me' : 'bot'); d.textContent = t; log.append(d); log.scrollTop = log.scrollHeight; return d; }
ready.then((u) => { if (u) add('Hi ' + u.name.split(' ')[0] + '! Ask me how to cut your water use.', false); });
async function ask(q) {
  add(q, true); const w = add('Thinking...', false);
  try { w.textContent = (await api('/api/ai/coach', { method: 'POST', body: { question: q } })).answer; } catch (e) { w.textContent = e.message; }
}
$('#cf').addEventListener('submit', (e) => { e.preventDefault(); const q = inp.value.trim(); if (q.length < 3) return; inp.value = ''; ask(q); });
document.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.q)));
