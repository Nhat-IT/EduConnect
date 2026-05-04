// ═══ LIÊN HỆ JS ═══
document.getElementById('contact-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Đang gửi...'; btn.disabled = true;
  try {
    const fd = new FormData(e.target);
    const body = { name: fd.get('name'), email: fd.get('email'), subject: fd.get('subject'), message: fd.get('message') };
    const res = await fetch('/lien-he', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    showFormMsg('contact-msg', data.message, data.success ? 'success' : 'error');
    if (data.success) e.target.reset();
  } catch {
    showFormMsg('contact-msg', 'Có lỗi xảy ra.', 'error');
  }
  btn.textContent = 'Gửi Tin Nhắn →'; btn.disabled = false;
});

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const ans = item.querySelector('.faq-answer');
  const isOpen = btn.classList.contains('open');
  document.querySelectorAll('.faq-question.open').forEach(q => {
    q.classList.remove('open');
    q.closest('.faq-item').querySelector('.faq-answer').classList.remove('open');
  });
  if (!isOpen) { btn.classList.add('open'); ans.classList.add('open'); }
}