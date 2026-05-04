// src/middleware/auth.js
const { fetchOne } = require('../database');

// Middleware yêu cầu đăng nhập
function loginRequired(req, res, next) {
  if (!req.session || !req.session.user_id) {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }
    return res.redirect('/');
  }
  next();
}

// Middleware yêu cầu quyền admin
async function adminRequired(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.redirect('/admin/login');
  }
  const user = await fetchOne('SELECT is_admin FROM users WHERE id=?', [req.session.user_id]);
  if (!user || !user.is_admin) {
    return res.redirect('/');
  }
  next();
}

// Middleware kiểm tra user có phải đổi mật khẩu không
async function checkPasswordChange(req, res, next) {
  // Nếu chưa login thì bỏ qua
  if (!req.session || !req.session.user_id) {
    return next();
  }
  
  // Nếu đang ở trang đổi mật khẩu hoặc logout thì cho qua
  const exemptPaths = ['/doi-mat-khau', '/logout'];
  if (exemptPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Kiểm tra user có phải đổi mật khẩu không
  const user = await fetchOne('SELECT must_change_password FROM users WHERE id=?', [req.session.user_id]);
  
  if (user && user.must_change_password === 1) {
    // Nếu là AJAX request, trả về JSON
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn cần đổi mật khẩu trước khi tiếp tục.',
        redirect: '/doi-mat-khau'
      });
    }
    // Nếu là page request, redirect
    return res.redirect('/doi-mat-khau');
  }
  
  next();
}

// Helper lấy thông tin user hiện tại
async function getCurrentUser(req) {
  if (!req.session || !req.session.user_id) {
    return null;
  }
  const user = await fetchOne('SELECT * FROM users WHERE id=?', [req.session.user_id]);
  return user || null;
}

module.exports = {
  loginRequired,
  adminRequired,
  checkPasswordChange,
  getCurrentUser
};