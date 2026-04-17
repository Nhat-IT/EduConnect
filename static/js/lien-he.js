// ═══ LIÊN HỆ JS ═══
document.getElementById('contact-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Đang gửi...'; btn.disabled = true;
  try {
    const res = await fetch('/lien-he', { method: 'POST', body: new FormData(e.target) });
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
