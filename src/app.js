// src/app.js
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const flash          = require('express-flash');
const nunjucks       = require('nunjucks');
const path           = require('path');
require('express-async-errors');

const { initDb, fetchOne, getDb } = require('./database');
const { getCurrentUser }     = require('./middleware/auth');

const publicRoutes  = require('./routes/public');
const authRoutes    = require('./routes/auth');
const userRoutes    = require('./routes/user');
const adminRoutes   = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Session store ─────────────────────────────────────────────────────
// Dùng MySQL store để tránh lỗi EPERM rename trên Windows
const MySQLStore = require('express-mysql-session')(session);

app.use(session({
  store: new MySQLStore({
    expiration:          7 * 24 * 60 * 60 * 1000,
    createDatabaseTable: true,
    schema: { tableName: 'sessions' }
  }, getDb()),
  secret: process.env.SECRET_KEY || 'educonnect_secret_key_2024_dev_only',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(flash());

// ── Body parsers ──────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ── Static files ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads/materials', express.static(path.join(__dirname, '..', 'public', 'uploads', 'materials')));

// ── Nunjucks template engine ──────────────────────────────────────────
const env = nunjucks.configure(path.join(__dirname, '..', 'views'), {
  autoescape: true,
  express: app,
  noCache: process.env.NODE_ENV !== 'production'
});

// Thêm global helpers tương đương Flask context_processor
app.use(async (req, res, next) => {
  try {
  // current_user — await vì getCurrentUser là async
  res.locals.current_user = await getCurrentUser(req);

  // get_contact_count (dùng trong admin layout)
  res.locals.get_contact_count = async () => {
    try { const r = await fetchOne('SELECT COUNT(*) as n FROM contacts'); return r ? r.n : 0; } catch { return 0; }
  };

  // get_password_reset_count — badge sidebar admin
  res.locals.get_password_reset_count = async () => {
    try { const r = await fetchOne("SELECT COUNT(*) as n FROM password_reset_requests WHERE status='pending'"); return r ? r.n : 0; } catch { return 0; }
  };

  // get_deposit_count — badge yêu cầu nạp tiền
  res.locals.get_deposit_count = async () => {
    try { const r = await fetchOne("SELECT COUNT(*) as n FROM deposit_requests WHERE status='pending'"); return r ? r.n : 0; } catch { return 0; }
  };

  // get_withdrawal_count — badge yêu cầu rút tiền
  res.locals.get_withdrawal_count = async () => {
    try { const r = await fetchOne("SELECT COUNT(*) as n FROM wallet_transactions WHERE type='withdraw' AND status='pending'"); return r ? r.n : 0; } catch { return 0; }
  };

  // get_delete_request_count — badge yêu cầu xóa tài khoản
  res.locals.get_delete_request_count = async () => {
    try { const r = await fetchOne("SELECT COUNT(*) as n FROM delete_requests WHERE status='pending'"); return r ? r.n : 0; } catch { return 0; }
  };

  // url_for — ánh xạ tên route Flask sang URL Node.js
  res.locals.url_for = (name, params = {}) => {
    const map = {
      'trang_chu':          '/',
      'tat_ca_khoa_hoc':    '/khoa-hoc',
      'gioi_thieu':         '/gioi-thieu',
      'lien_he':            '/lien-he',
      'tai_khoan':          '/tai-khoan',
      'logout':             '/logout',
      'admin_login':        '/admin/login',
      'admin_logout':       '/admin/logout',
      'admin_dashboard':    '/admin',
      'admin_courses':      '/admin/courses',
      'admin_users':        '/admin/users',
      'admin_contacts':     '/admin/contacts',
      'admin_categories':   '/admin/categories',
      'admin_withdrawals':  '/admin/withdrawals',
      'admin_deposits':     '/admin/deposits',
      'admin_delete_requests': '/admin/delete-requests',
      'quen_mat_khau':      '/quen-mat-khau',
      'static':             params.filename ? `/${params.filename}` : '/static'
    };
    let url = map[name] || '/';
    // Thay thế dynamic segments
    Object.entries(params).forEach(([k, v]) => {
      if (k !== 'filename') url = url.replace(`:${k}`, v);
    });
    return url;
  };

  // request object tương đương Flask's request
  res.locals.request = {
    endpoint: getEndpointName(req),
    args:     req.query
  };

  // flash messages
  res.locals.get_flashed_messages = (category) => {
    return req.flash(category || 'info');
  };

  next();
  } catch (err) { next(err); }
});

// Nunjucks custom filters
env.addFilter('currency', (val) => {
  if (val == null) return '0';
  return Number(val).toLocaleString('vi-VN');
});

env.addFilter('numfmt', (val, decimals=0) => {
  if (val == null) return '0';
  return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
});

env.addFilter('rating', (val) => {
  if (val == null) return '0.0';
  return Number(val).toFixed(1);
});

env.addFilter('date', (val, fmt) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return val;
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
});

// Nunjucks global functions
env.addFilter('tojson', (val) => {
  return JSON.stringify(val);
});

env.addFilter('map', (arr, opts) => {
  if (!Array.isArray(arr)) return [];
  if (opts && opts.attribute) return arr.map(item => item[opts.attribute]);
  return arr;
});

env.addFilter('max', (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return Math.max(...arr);
});

env.addFilter('min', (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return Math.min(...arr);
});

env.addFilter('sum', (arr, attr) => {
  if (!Array.isArray(arr)) return 0;
  if (attr) return arr.reduce((s, item) => s + (item[attr] || 0), 0);
  return arr.reduce((s, v) => s + (v || 0), 0);
});

env.addFilter('substr', (val, start, end) => {
  if (val == null) return '';
  return String(val).substring(start, end === undefined ? undefined : end);
});

env.addGlobal('range', (start, end) => {
  const result = [];
  for (let i = start; i < end; i++) result.push(i);
  return result;
});

// ── Routes ────────────────────────────────────────────────────────────
app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send('<h1>404 - Trang không tồn tại</h1>');
});

// ── Error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) return next(err);
  res.status(500).send(`<h1>Lỗi máy chủ</h1><pre>${err.message}</pre>`);
});

// ── Endpoint name helper ──────────────────────────────────────────────
function getEndpointName(req) {
  const map = {
    'GET /':                     'trang_chu',
    'GET /khoa-hoc':             'tat_ca_khoa_hoc',
    'GET /gioi-thieu':           'gioi_thieu',
    'GET /lien-he':              'lien_he',
    'GET /tai-khoan':            'tai_khoan',
    'GET /quen-mat-khau':        'quen_mat_khau',
    'GET /admin':                'admin_dashboard',
    'GET /admin/courses':        'admin_courses',
    'GET /admin/users':          'admin_users',
    'GET /admin/contacts':       'admin_contacts',
    'GET /admin/categories':     'admin_categories',
    'GET /admin/withdrawals':    'admin_withdrawals',
    'GET /admin/deposits':       'admin_deposits',
    'GET /admin/password-resets': 'admin_password_resets',
    'GET /doi-mat-khau':         'doi_mat_khau',
  };
  return map[`${req.method} ${req.path}`] || req.path;
}

// ── Start ─────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🎓 EduConnect chạy tại http://localhost:${PORT}`);
    console.log(`   Admin panel: http://localhost:${PORT}/admin`);
  });
});

module.exports = app;