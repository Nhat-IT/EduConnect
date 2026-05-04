// src/routes/auth.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { fetchOne, run } = require('../database');
const { loginRequired } = require('../middleware/auth');

// ── Login ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const email    = (req.body.email || '').trim();
  const password = req.body.password || '';
  const user = await fetchOne('SELECT * FROM users WHERE email=?', [email]);
  if (user && bcrypt.compareSync(password, convertHash(user.password))) {
    req.session.user_id   = user.id;
    req.session.user_name = user.name;
    
    // Kiểm tra nếu user phải đổi mật khẩu (mật khẩu tạm thời từ admin)
    if (user.must_change_password === 1) {
      return res.json({ 
        success: true, 
        message: `Chào mừng ${user.name}!`,
        must_change_password: true,
        redirect: '/doi-mat-khau'
      });
    }
    
    return res.json({ success: true, message: `Chào mừng ${user.name}!`, is_admin: !!user.is_admin });
  }
  res.json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
});

// ── Register ──────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const name     = (req.body.name || '').trim();
  const email    = (req.body.email || '').trim();
  const password = req.body.password || '';
  if (!name || !email || !password) {
    return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
  }
  if (await fetchOne('SELECT id FROM users WHERE email=?', [email])) {
    return res.json({ success: false, message: 'Email đã được sử dụng.' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  await run('INSERT INTO users (name, email, password) VALUES (?,?,?)', [name, email, hashed]);
  const user = await fetchOne('SELECT * FROM users WHERE email=?', [email]);
  req.session.user_id   = user.id;
  req.session.user_name = user.name;
  res.json({ success: true, message: `Đăng ký thành công! Chào mừng ${name}!` });
});

// ── Logout ────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ── Quên mật khẩu ────────────────────────────────────────────────────
router.get('/quen-mat-khau', (req, res) => {
  res.render('quen-mat-khau.html');
});

router.post('/quen-mat-khau', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.json({ success: false, message: 'Vui lòng nhập email.' });

  const user = await fetchOne('SELECT id, name FROM users WHERE email=? AND is_admin=0', [email]);
  if (!user) return res.json({ success: false, message: 'Email không tồn tại trong hệ thống.' });

  const existing = await fetchOne(
    "SELECT id FROM password_reset_requests WHERE user_id=? AND status='pending'",
    [user.id]
  );
  if (existing) {
    return res.json({ success: true, already: true, message: 'Yêu cầu của bạn đã được gửi trước đó và đang chờ admin xử lý.' });
  }

  await run('INSERT INTO password_reset_requests (user_id, email) VALUES (?,?)', [user.id, email]);
  return res.json({
    success: true,
    message: `Yêu cầu đặt lại mật khẩu đã được gửi! Admin sẽ cấp mật khẩu mới và liên hệ với bạn qua email <strong>${email}</strong> sớm nhất có thể.`
  });
});

// ── Helper ────────────────────────────────────────────────────────────
function convertHash(hash) {
  if (hash && (hash.startsWith('$2b$') || hash.startsWith('$2a$'))) {
    return hash;
  }
  return ''; // Werkzeug scrypt — fail so sánh, yêu cầu reset
}

module.exports = router;
module.exports.convertHash = convertHash;