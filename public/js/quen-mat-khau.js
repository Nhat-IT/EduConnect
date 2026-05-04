// ═══ QUÊN MẬT KHẨU JS ═══

document.getElementById('form-reset-request')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const msg = document.getElementById('msg-request');
  btn.textContent = 'Đang gửi...'; btn.disabled = true;

  const fd = new FormData(e.target);
  try {
    const res  = await fetch('/quen-mat-khau', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email') })
    });
    const data = await res.json();
    if (data.success) {
      // Chuyển sang panel xác nhận
      document.getElementById('panel-request').classList.remove('active');
      document.getElementById('panel-done').classList.add('active');
    } else {
      msg.innerHTML = data.message;
      msg.className = 'form-message error';
      btn.textContent = 'Gửi Yêu Cầu →'; btn.disabled = false;
    }
  } catch {
    msg.textContent = 'Có lỗi xảy ra, vui lòng thử lại.';
    msg.className = 'form-message error';
    btn.textContent = 'Gửi Yêu Cầu →'; btn.disabled = false;
  }
});