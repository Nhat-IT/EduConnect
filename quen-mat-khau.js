// ═══ QUÊN MẬT KHẨU JS ═══
let userEmail = '';

function goStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`step-${n}`)?.classList.add('active');

  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < n) s.classList.add('done');
    else if (i + 1 === n) s.classList.add('active');
  });
  document.querySelectorAll('.step-line').forEach((l, i) => {
    l.classList.toggle('done', i + 1 < n);
  });
}

// Step 1 — Email
document.getElementById('form-step1')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Đang gửi...'; btn.disabled = true;
  const fd = new FormData(e.target);
  fd.append('step', '1');
  userEmail = fd.get('email');
  try {
    const res = await fetch('/quen-mat-khau', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showFormMsg('msg-1', data.message, 'success');
      setTimeout(() => goStep(2), 900);
    } else {
      showFormMsg('msg-1', data.message, 'error');
    }
  } catch {
    showFormMsg('msg-1', 'Có lỗi xảy ra.', 'error');
  }
  btn.textContent = 'Gửi Mã OTP →'; btn.disabled = false;
});

// Step 2 — OTP
document.getElementById('form-step2')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Đang xác nhận...'; btn.disabled = true;
  const fd = new FormData(e.target);
  fd.append('step', '2');
  fd.append('email', userEmail);
  try {
    const res = await fetch('/quen-mat-khau', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showFormMsg('msg-2', data.message, 'success');
      setTimeout(() => goStep(3), 800);
    } else {
      showFormMsg('msg-2', data.message, 'error');
    }
  } catch {
    showFormMsg('msg-2', 'Có lỗi xảy ra.', 'error');
  }
  btn.textContent = 'Xác Nhận →'; btn.disabled = false;
});

// Step 3 — New password
document.getElementById('form-step3')?.addEventListener('submit', async e => {
  e.preventDefault();
  const newPass = document.getElementById('new-pass').value;
  const confirmPass = document.getElementById('confirm-pass').value;
  if (newPass !== confirmPass) {
    showFormMsg('msg-3', 'Mật khẩu xác nhận không khớp.', 'error');
    return;
  }
  const btn = e.target.querySelector('button');
  btn.textContent = 'Đang xử lý...'; btn.disabled = true;
  const fd = new FormData(e.target);
  fd.append('step', '3');
  fd.append('email', userEmail);
  try {
    const res = await fetch('/quen-mat-khau', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showFormMsg('msg-3', data.message, 'success');
      setTimeout(() => goStep(4), 800);
    } else {
      showFormMsg('msg-3', data.message, 'error');
    }
  } catch {
    showFormMsg('msg-3', 'Có lỗi xảy ra.', 'error');
  }
  btn.textContent = 'Đặt Lại Mật Khẩu →'; btn.disabled = false;
});

// Password strength indicator
document.getElementById('new-pass')?.addEventListener('input', function () {
  const val = this.value;
  const el = document.getElementById('pass-strength');
  if (!el) return;
  el.innerHTML = '<span></span><span></span><span></span>';
  if (val.length === 0) { el.className = 'pass-strength'; return; }
  if (val.length < 6) el.className = 'pass-strength weak';
  else if (val.length < 10) el.className = 'pass-strength medium';
  else el.className = 'pass-strength strong';
});

// OTP auto-uppercase
document.getElementById('otp-input')?.addEventListener('input', function () {
  this.value = this.value.toUpperCase();
});
