// src/routes/admin.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { fetchOne, fetchAll, run, getDb } = require('../database');
const { adminRequired } = require('../middleware/auth');

// ── Login / Logout ────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  res.render('admin/login.html');
});

router.post('/login', async (req, res) => {
  const email    = (req.body.email || '').trim();
  const password = req.body.password || '';
  const bcrypt   = require('bcryptjs');
  const user = await fetchOne('SELECT * FROM users WHERE email=? AND is_admin=1', [email]);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user_id   = user.id;
    req.session.user_name = user.name;
    return req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Lỗi phiên đăng nhập, vui lòng thử lại.');
        return res.render('admin/login.html');
      }
      res.redirect('/admin');
    });
  }
  req.flash('error', 'Sai thông tin đăng nhập.');
  res.render('admin/login.html');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ── Dashboard ─────────────────────────────────────────────────────────
router.get('/', adminRequired, async (req, res) => {
  const [rowUsers, rowCourses, rowEnrolls, rowRevenue, rowNewUsers, rowContacts] = await Promise.all([
    fetchOne('SELECT COUNT(*) as n FROM users WHERE is_admin=0'),
    fetchOne('SELECT COUNT(*) as n FROM courses'),
    fetchOne('SELECT COUNT(*) as n FROM enrollments'),
    fetchOne('SELECT COALESCE(SUM(c.price),0) as n FROM enrollments e JOIN courses c ON e.course_id=c.id'),
    fetchOne("SELECT COUNT(*) as n FROM users WHERE is_admin=0 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
    fetchOne('SELECT COUNT(*) as n FROM contacts'),
  ]);
  const stats = {
    users:        Number(rowUsers.n),
    courses:      Number(rowCourses.n),
    enrolls:      Number(rowEnrolls.n),
    contacts:     Number(rowContacts.n),
    total_users:  Number(rowUsers.n),
    total_courses:Number(rowCourses.n),
    total_enrolls:Number(rowEnrolls.n),
    total_revenue:Number(rowRevenue.n),
    new_users_week:Number(rowNewUsers.n),
  };
  const [recent_enrolls, top_courses, monthly] = await Promise.all([
    fetchAll('SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title, c.price as price FROM enrollments e JOIN users u ON e.user_id=u.id JOIN courses c ON e.course_id=c.id ORDER BY e.enrolled_at DESC LIMIT 10'),
    fetchAll('SELECT c.*, cat.name as category_name, u.name as instructor_name FROM courses c LEFT JOIN categories cat ON c.category_id=cat.id LEFT JOIN users u ON c.instructor_id=u.id ORDER BY c.total_students DESC LIMIT 5'),
    // MySQL: DATE_FORMAT thay cho strftime
    fetchAll("SELECT DATE_FORMAT(enrolled_at,'%Y-%m') as month, COUNT(*) as count FROM enrollments GROUP BY month ORDER BY month DESC LIMIT 6"),
  ]);
  res.render('admin/dashboard.html', { stats, recent_enrolls, top_courses, monthly: monthly.reverse() });
});

// ── Courses ───────────────────────────────────────────────────────────
router.get('/courses', adminRequired, async (req, res) => {
  const q        = req.query.q || '';
  const page     = parseInt(req.query.page) || 1;
  const per_page = 10;
  let base   = 'SELECT c.*, cat.name as category_name, u.name as instructor_name FROM courses c LEFT JOIN categories cat ON c.category_id=cat.id LEFT JOIN users u ON c.instructor_id=u.id WHERE 1=1';
  const params = [];
  if (q) { base += ' AND c.title LIKE ?'; params.push(`%${q}%`); }
  const pool = getDb();
  const [[countRow]]  = await pool.execute(`SELECT COUNT(*) as n FROM (${base}) sub`, params);
  const total         = Number(countRow.n);
  const [courses]     = await pool.execute(base + ` ORDER BY c.id DESC LIMIT ${per_page} OFFSET ${(page-1)*per_page}`, params);
  const categories    = await fetchAll('SELECT * FROM categories');
  const instructors   = await fetchAll('SELECT id,name FROM users WHERE is_admin=0');
  res.render('admin/courses.html', { courses, categories, instructors, total, page, total_pages: Math.ceil(total/per_page), q });
});

router.get('/courses/get/:cid', adminRequired, async (req, res) => {
  const c = await fetchOne('SELECT * FROM courses WHERE id=?', [req.params.cid]);
  if (c) return res.json(c);
  res.status(404).json({ error: 'Not found' });
});

router.post('/courses/add', adminRequired, async (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.json({ success: false, message: 'Tên khóa học không được trống.' });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + crypto.randomBytes(2).toString('hex');
  try {
    await run('INSERT INTO courses (title,slug,description,price,original_price,instructor_id,category_id,level,duration,total_lessons,is_featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [title, slug, req.body.description||'', parseFloat(req.body.price||0), parseFloat(req.body.original_price||0),
       req.body.instructor_id||null, req.body.category_id||null,
       req.body.level||'beginner', req.body.duration||'0 giờ',
       parseInt(req.body.total_lessons||0), parseInt(req.body.is_featured||0)]);
    res.json({ success: true, message: `Đã thêm khóa học "${title}"!` });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/courses/edit/:cid', adminRequired, async (req, res) => {
  const cid = parseInt(req.params.cid);
  try {
    await run('UPDATE courses SET title=?,description=?,price=?,original_price=?,instructor_id=?,category_id=?,level=?,duration=?,total_lessons=?,is_featured=? WHERE id=?',
      [req.body.title, req.body.description||'', parseFloat(req.body.price||0), parseFloat(req.body.original_price||0),
       req.body.instructor_id||null, req.body.category_id||null,
       req.body.level||'beginner', req.body.duration||'0 giờ',
       parseInt(req.body.total_lessons||0), parseInt(req.body.is_featured||0), cid]);
    res.json({ success: true, message: 'Cập nhật khóa học thành công!' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/courses/delete/:cid', adminRequired, async (req, res) => {
  const cid = parseInt(req.params.cid);
  await run('DELETE FROM enrollments WHERE course_id=?', [cid]);
  const lesson_ids = (await fetchAll('SELECT id FROM lessons WHERE course_id=?', [cid])).map(r => r.id);
  for (const lid of lesson_ids) {
    await run('DELETE FROM lesson_materials WHERE lesson_id=?', [lid]);
    await run('DELETE FROM lesson_exercises WHERE lesson_id=?', [lid]);
  }
  await run('DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=?)', [cid]);
  await run('DELETE FROM lessons WHERE course_id=?', [cid]);
  await run('DELETE FROM reviews WHERE course_id=?', [cid]);
  await run('DELETE FROM courses WHERE id=?', [cid]);
  res.json({ success: true, message: 'Đã xóa khóa học!' });
});

router.post('/courses/lock/:cid', adminRequired, async (req, res) => {
  const cid    = parseInt(req.params.cid);
  const locked = parseInt(req.body.locked || 1);
  await run('UPDATE courses SET is_locked=? WHERE id=?', [locked, cid]);
  res.json({ success: true, message: locked ? 'Đã khóa khóa học!' : 'Đã mở khóa khóa học!' });
});

// ── Users ─────────────────────────────────────────────────────────────
router.get('/users', adminRequired, async (req, res) => {
  const q        = req.query.q || '';
  const page     = parseInt(req.query.page) || 1;
  const per_page = 12;
  let base   = 'SELECT u.*, COUNT(e.id) as enroll_count FROM users u LEFT JOIN enrollments e ON u.id=e.user_id WHERE u.is_admin=0';
  const params = [];
  if (q) { base += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  base += ' GROUP BY u.id';
  const pool = getDb();
  const [[countRow]] = await pool.execute(`SELECT COUNT(*) as n FROM (${base}) sub`, params);
  const total        = Number(countRow.n);
  const [users]      = await pool.execute(base + ` ORDER BY u.id DESC LIMIT ${per_page} OFFSET ${(page-1)*per_page}`, params);
  res.render('admin/users.html', { users, total, page, total_pages: Math.ceil(total/per_page), q });
});

router.get('/users/get/:uid', adminRequired, async (req, res) => {
  const uid  = parseInt(req.params.uid);
  const user = await fetchOne('SELECT id,name,email,created_at FROM users WHERE id=?', [uid]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const enrolls = await fetchAll('SELECT c.title,e.enrolled_at,e.progress FROM enrollments e JOIN courses c ON e.course_id=c.id WHERE e.user_id=?', [uid]);
  res.json({ user, enrollments: enrolls });
});

router.post('/users/delete/:uid', adminRequired, async (req, res) => {
  const uid = parseInt(req.params.uid);
  await run('DELETE FROM enrollments WHERE user_id=?', [uid]);
  await run('DELETE FROM reviews WHERE user_id=?', [uid]);
  await run('DELETE FROM users WHERE id=? AND is_admin=0', [uid]);
  res.json({ success: true, message: 'Đã xóa học viên!' });
});

router.post('/users/add-balance/:uid', adminRequired, async (req, res) => {
  const uid = parseInt(req.params.uid);
  let amount;
  try { amount = parseFloat(req.body.amount || 0); } catch { return res.json({ success: false, message: 'Số tiền không hợp lệ.' }); }
  if (amount <= 0) return res.json({ success: false, message: 'Số tiền phải lớn hơn 0.' });
  const note = (req.body.note || 'Admin cộng tiền thủ công').trim() || 'Admin cộng tiền thủ công';
  const user = await fetchOne('SELECT id,name FROM users WHERE id=? AND is_admin=0', [uid]);
  if (!user) return res.json({ success: false, message: 'Không tìm thấy người dùng.' });
  await run('UPDATE users SET wallet_balance=wallet_balance+? WHERE id=?', [amount, uid]);
  await run('INSERT INTO wallet_transactions (user_id,type,amount,description,status) VALUES (?,?,?,?,?)', [uid, 'deposit', amount, note, 'completed']);
  const updated = await fetchOne('SELECT wallet_balance FROM users WHERE id=?', [uid]);
  res.json({ success: true, message: `Đã cộng ${amount.toLocaleString('vi-VN')}₫ vào tài khoản ${user.name}!`, new_balance: updated.wallet_balance });
});

// ── Contacts ──────────────────────────────────────────────────────────
router.get('/contacts', adminRequired, async (req, res) => {
  const page     = parseInt(req.query.page) || 1;
  const per_page = 15;
  const rowTotal = await fetchOne('SELECT COUNT(*) as n FROM contacts');
  const total    = Number(rowTotal.n);
  const contacts = await fetchAll(`SELECT * FROM contacts ORDER BY created_at DESC LIMIT ${per_page} OFFSET ${(page-1)*per_page}`);
  res.render('admin/contacts.html', { contacts, total, page, total_pages: Math.ceil(total/per_page) });
});

router.post('/contacts/delete/:cid', adminRequired, async (req, res) => {
  await run('DELETE FROM contacts WHERE id=?', [parseInt(req.params.cid)]);
  res.json({ success: true, message: 'Đã xóa liên hệ!' });
});

// ── Categories ────────────────────────────────────────────────────────
router.get('/categories', adminRequired, async (req, res) => {
  const cats = await fetchAll('SELECT cat.*, COUNT(c.id) as course_count FROM categories cat LEFT JOIN courses c ON cat.id=c.category_id GROUP BY cat.id ORDER BY cat.id');
  res.render('admin/categories.html', { categories: cats });
});

router.post('/categories/add', adminRequired, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.json({ success: false, message: 'Tên danh mục không được trống.' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    await run('INSERT INTO categories (name,slug) VALUES (?,?)', [name, slug]);
    res.json({ success: true, message: `Đã thêm danh mục "${name}"!` });
  } catch { res.json({ success: false, message: 'Tên hoặc slug đã tồn tại.' }); }
});

router.post('/categories/edit/:cid', adminRequired, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.json({ success: false, message: 'Tên không được trống.' });
  await run('UPDATE categories SET name=? WHERE id=?', [name, parseInt(req.params.cid)]);
  res.json({ success: true, message: 'Đã cập nhật danh mục!' });
});

router.post('/categories/delete/:cid', adminRequired, async (req, res) => {
  const cid  = parseInt(req.params.cid);
  const row  = await fetchOne('SELECT COUNT(*) as n FROM courses WHERE category_id=?', [cid]);
  const count = Number(row.n);
  if (count) return res.json({ success: false, message: `Không thể xóa! Có ${count} khóa học đang dùng.` });
  await run('DELETE FROM categories WHERE id=?', [cid]);
  res.json({ success: true, message: 'Đã xóa danh mục!' });
});

// ── Withdrawals ───────────────────────────────────────────────────────
router.get('/withdrawals', adminRequired, async (req, res) => {
  const page          = parseInt(req.query.page) || 1;
  const per_page      = 15;
  const status_filter = req.query.status || '';
  let base   = `SELECT wt.*, u.name as user_name, u.email as user_email, u.bank_name, u.bank_account, u.bank_holder
     FROM wallet_transactions wt JOIN users u ON wt.user_id=u.id WHERE wt.type='withdraw'`;
  const params = [];
  if (status_filter) { base += ' AND wt.status=?'; params.push(status_filter); }
  const pool    = getDb();
  const [[countRow]] = await pool.execute(`SELECT COUNT(*) as n FROM (${base}) sub`, params);
  const total        = Number(countRow.n);
  const [requests]   = await pool.execute(base + ` ORDER BY wt.created_at DESC LIMIT ${per_page} OFFSET ${(page-1)*per_page}`, params);
  const [[pendingRow]] = await pool.execute(`SELECT COUNT(*) as n FROM wallet_transactions WHERE type='withdraw' AND status='pending'`);
  const pending_count  = Number(pendingRow.n);
  res.render('admin/withdrawals.html', { requests, total, page, total_pages: Math.ceil(total/per_page), status_filter, pending_count });
});

router.post('/withdrawals/complete/:wid', adminRequired, async (req, res) => {
  const wid = parseInt(req.params.wid);
  const txn = await fetchOne("SELECT * FROM wallet_transactions WHERE id=? AND type='withdraw'", [wid]);
  if (!txn) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
  if (txn.status === 'completed') return res.json({ success: false, message: 'Yêu cầu này đã hoàn thành rồi.' });
  await run("UPDATE wallet_transactions SET status='completed' WHERE id=?", [wid]);
  res.json({ success: true, message: 'Đã đánh dấu hoàn thành!' });
});

router.post('/withdrawals/reject/:wid', adminRequired, async (req, res) => {
  const wid  = parseInt(req.params.wid);
  const note = (req.body.note || '').trim();
  const txn  = await fetchOne("SELECT * FROM wallet_transactions WHERE id=? AND type='withdraw'", [wid]);
  if (!txn) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
  if (txn.status !== 'pending') return res.json({ success: false, message: 'Yêu cầu này đã được xử lý rồi.' });
  // Hoàn tiền lại vào ví người dùng
  await run('UPDATE users SET wallet_balance=wallet_balance+? WHERE id=?', [txn.amount, txn.user_id]);
  await run("UPDATE wallet_transactions SET status='rejected', description=CONCAT(description, ' | Từ chối: ', ?) WHERE id=?", [note || 'Admin từ chối', wid]);
  res.json({ success: true, message: `Đã từ chối và hoàn ${Number(txn.amount).toLocaleString('vi-VN')}₫ vào ví người dùng.` });
});

// ── Deposits ──────────────────────────────────────────────────────────
router.get('/deposits', adminRequired, async (req, res) => {
  const page          = parseInt(req.query.page) || 1;
  const per_page      = 15;
  const status_filter = req.query.status || '';
  let base   = 'SELECT dp.*, u.name as user_name, u.email as user_email FROM deposit_requests dp JOIN users u ON dp.user_id=u.id WHERE 1=1';
  const params = [];
  if (status_filter) { base += ' AND dp.status=?'; params.push(status_filter); }
  const pool    = getDb();
  const [[countRow]] = await pool.execute(`SELECT COUNT(*) as n FROM (${base}) sub`, params);
  const total        = Number(countRow.n);
  const [deposits]   = await pool.execute(base + ` ORDER BY dp.created_at DESC LIMIT ${per_page} OFFSET ${(page-1)*per_page}`, params);
  res.render('admin/deposit.html', { deposits, total, page, total_pages: Math.ceil(total/per_page), status_filter });
});

router.post('/deposits/approve/:did', adminRequired, async (req, res) => {
  const did = parseInt(req.params.did);
  const dep = await fetchOne('SELECT * FROM deposit_requests WHERE id=?', [did]);
  if (!dep) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
  if (dep.status === 'approved') return res.json({ success: false, message: 'Yêu cầu này đã được duyệt rồi.' });
  await run('UPDATE users SET wallet_balance=wallet_balance+? WHERE id=?', [dep.amount, dep.user_id]);
  await run("INSERT INTO wallet_transactions (user_id,type,amount,description,status) VALUES (?,?,?,?,'completed')",
    [dep.user_id, 'deposit', dep.amount, 'Nạp tiền được duyệt bởi Admin']);
  await run("UPDATE deposit_requests SET status='approved' WHERE id=?", [did]);
  res.json({ success: true, message: `Đã duyệt và cộng ${Number(dep.amount).toLocaleString('vi-VN')}₫ vào tài khoản!` });
});

router.post('/deposits/reject/:did', adminRequired, async (req, res) => {
  const note = (req.body.note || '').trim();
  await run("UPDATE deposit_requests SET status='rejected', note=? WHERE id=?", [note, parseInt(req.params.did)]);
  res.json({ success: true, message: 'Đã từ chối yêu cầu nạp tiền.' });
});

// ── Password Reset Requests ───────────────────────────────────────────
router.get('/password-resets', adminRequired, async (req, res) => {
  const page     = parseInt(req.query.page) || 1;
  const per_page = 15;
  const status_f = req.query.status || 'pending';
  const pool     = getDb();
  const [[countRow]]   = await pool.execute(`SELECT COUNT(*) as n FROM password_reset_requests WHERE status=?`, [status_f]);
  const total          = Number(countRow.n);
  const [requests]     = await pool.execute(
    `SELECT r.*, u.name as user_name, u.email as user_email
     FROM password_reset_requests r JOIN users u ON r.user_id=u.id
     WHERE r.status=? ORDER BY r.created_at DESC LIMIT ${per_page} OFFSET ${(page - 1) * per_page}`,
    [status_f]
  );
  const [[pendingRow]] = await pool.execute(`SELECT COUNT(*) as n FROM password_reset_requests WHERE status='pending'`);
  const pending_count  = Number(pendingRow.n);
  res.render('admin/password-resets.html', { requests, total, page, total_pages: Math.ceil(total / per_page), status_f, pending_count });
});

router.post('/password-resets/grant/:rid', adminRequired, async (req, res) => {
  const bcrypt   = require('bcryptjs');
  const rid      = parseInt(req.params.rid);
  const new_pass = (req.body.new_password || '').trim();
  if (!new_pass || new_pass.length < 6)
    return res.json({ success: false, message: 'Mật khẩu tối thiểu 6 ký tự.' });
  const reset_req = await fetchOne('SELECT * FROM password_reset_requests WHERE id=?', [rid]);
  if (!reset_req) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
  if (reset_req.status !== 'pending') return res.json({ success: false, message: 'Yêu cầu này đã được xử lý.' });
  await run('UPDATE users SET password=?, must_change_password=1 WHERE id=?',
    [bcrypt.hashSync(new_pass, 10), reset_req.user_id]);
  await run(`UPDATE password_reset_requests SET status='granted', handled_at=NOW() WHERE id=?`, [rid]);
  const user = await fetchOne('SELECT name, email FROM users WHERE id=?', [reset_req.user_id]);
  res.json({ success: true, message: `Đã cấp mật khẩu mới cho ${user.name}! Hãy thông báo mật khẩu "${new_pass}" đến email ${user.email} hoặc SĐT của họ.`, password: new_pass, user_name: user.name, user_email: user.email });
});

router.post('/password-resets/reject/:rid', adminRequired, async (req, res) => {
  const rid  = parseInt(req.params.rid);
  const req_ = await fetchOne("SELECT id FROM password_reset_requests WHERE id=? AND status='pending'", [rid]);
  if (!req_) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
  await run(`UPDATE password_reset_requests SET status='rejected', handled_at=NOW() WHERE id=?`, [rid]);
  res.json({ success: true, message: 'Đã từ chối yêu cầu.' });
});

// ── Delete Requests ───────────────────────────────────────────────────
router.get('/delete-requests', adminRequired, async (req, res) => {
  const page          = parseInt(req.query.page) || 1;
  const per_page      = 15;
  const status_filter = req.query.status || 'pending';
  const pool          = getDb();
  const [[countRow]]  = await pool.execute(`SELECT COUNT(*) as n FROM delete_requests WHERE status=?`, [status_filter]);
  const total         = Number(countRow.n);
  const [requests]    = await pool.execute(
    `SELECT dr.*, COALESCE(u.name,'(Đã xóa)') as user_name, COALESCE(u.email,'—') as user_email
     FROM delete_requests dr LEFT JOIN users u ON dr.user_id=u.id
     WHERE dr.status=? ORDER BY dr.created_at DESC LIMIT ${per_page} OFFSET ${(page-1)*per_page}`,
    [status_filter]
  );
  const [[pendingRow]] = await pool.execute(`SELECT COUNT(*) as n FROM delete_requests WHERE status='pending'`);
  const pending_count  = Number(pendingRow.n);
  res.render('admin/delete_requests.html', { requests, total, page, total_pages: Math.ceil(total/per_page), status_filter, pending_count });
});

router.post('/delete-requests/approve/:rid', adminRequired, async (req, res) => {
  const rid  = parseInt(req.params.rid);
  const req_ = await fetchOne('SELECT * FROM delete_requests WHERE id=?', [rid]);
  if (!req_) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
  const uid = req_.user_id;
  const created_courses = await fetchAll('SELECT id FROM courses WHERE instructor_id=?', [uid]);
  for (const c of created_courses) {
    const cid        = c.id;
    const lesson_ids = (await fetchAll('SELECT id FROM lessons WHERE course_id=?', [cid])).map(r => r.id);
    for (const lid of lesson_ids) {
      await run('DELETE FROM lesson_materials WHERE lesson_id=?', [lid]);
      await run('DELETE FROM lesson_exercises WHERE lesson_id=?', [lid]);
    }
    await run('DELETE FROM lessons WHERE course_id=?', [cid]);
    await run('DELETE FROM enrollments WHERE course_id=?', [cid]);
    await run('DELETE FROM reviews WHERE course_id=?', [cid]);
  }
  await run('DELETE FROM courses WHERE instructor_id=?', [uid]);
  await run('DELETE FROM enrollments WHERE user_id=?', [uid]);
  await run('DELETE FROM reviews WHERE user_id=?', [uid]);
  await run('DELETE FROM wallet_transactions WHERE user_id=?', [uid]);
  await run('DELETE FROM delete_requests WHERE user_id=?', [uid]);
  await run('DELETE FROM users WHERE id=? AND is_admin=0', [uid]);
  res.json({ success: true, message: 'Đã xóa tài khoản và toàn bộ khóa học của người dùng!' });
});

router.post('/delete-requests/reject/:rid', adminRequired, async (req, res) => {
  await run("UPDATE delete_requests SET status='rejected' WHERE id=?", [parseInt(req.params.rid)]);
  res.json({ success: true, message: 'Đã từ chối yêu cầu xóa tài khoản.' });
});
router.post('/login', async (req, res) => {
  const email    = (req.body.email || '').trim();
  const password = req.body.password || '';
  const bcrypt   = require('bcryptjs');
  
  console.log('🔑 Login attempt:', email); // thêm dòng này
  
  const user = await fetchOne('SELECT * FROM users WHERE email=? AND is_admin=1', [email]);
  
  console.log('👤 User found:', user ? 'YES' : 'NO'); // thêm dòng này
  
  if (user && bcrypt.compareSync(password, user.password)) {
    console.log('✅ Password OK'); // thêm dòng này
    req.session.user_id   = user.id;
    req.session.user_name = user.name;
    return req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Lỗi phiên đăng nhập, vui lòng thử lại.');
        return res.render('admin/login.html');
      }
      res.redirect('/admin');
    });
  }
  console.log('❌ Login failed'); // thêm dòng này
  req.flash('error', 'Sai thông tin đăng nhập.');
  res.render('admin/login.html');
});
module.exports = router;