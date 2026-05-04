// src/routes/public.js
const express = require('express');
const router  = express.Router();
const { fetchOne, fetchAll, run, getDb } = require('../database');
const { getCurrentUser } = require('../middleware/auth');

// ── Trang chủ ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  // Lấy khóa học is_featured=1 trước, nếu chưa đủ 6 thì bổ sung bằng khóa học mới nhất
  let featured_courses = await fetchAll(
    'SELECT c.*, u.name as instructor_name, cat.name as category_name ' +
    'FROM courses c LEFT JOIN users u ON c.instructor_id=u.id ' +
    'LEFT JOIN categories cat ON c.category_id=cat.id ' +
    'WHERE c.is_featured=1 ORDER BY c.created_at DESC LIMIT 6'
  );
  if (featured_courses.length < 6) {
    const existingIds = featured_courses.map(c => c.id);
    const exclude     = existingIds.length > 0
      ? `AND c.id NOT IN (${existingIds.map(() => '?').join(',')})` : '';
    const needed      = 6 - featured_courses.length;
    const extra = await fetchAll(
      `SELECT c.*, u.name as instructor_name, cat.name as category_name
       FROM courses c LEFT JOIN users u ON c.instructor_id=u.id
       LEFT JOIN categories cat ON c.category_id=cat.id
       WHERE 1=1 ${exclude} ORDER BY c.created_at DESC LIMIT ${needed}`,
      existingIds
    );
    featured_courses = [...featured_courses, ...extra];
  }
  const [statsUsers, statsCourses, statsLessons] = await Promise.all([
    fetchOne('SELECT COUNT(*) as n FROM users WHERE is_admin=0'),
    fetchOne('SELECT COUNT(*) as n FROM courses'),
    fetchOne('SELECT COALESCE(SUM(total_lessons),0) as n FROM courses'),
  ]);
  const stats = {
    students:    statsUsers.n,
    courses:     statsCourses.n,
    lessons:     statsLessons.n,
    instructors: 3
  };
  const reviews    = await fetchAll('SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id=u.id ORDER BY r.created_at DESC LIMIT 6');
  const categories = await fetchAll('SELECT * FROM categories');
  res.render('trang-chu.html', { featured_courses, stats, reviews, categories });
});

// ── Tất cả khóa học ───────────────────────────────────────────────────
router.get('/khoa-hoc', async (req, res) => {
  const q            = req.query.q || '';
  const category     = req.query.category || '';
  const price_filter = req.query.price || '';
  const level        = req.query.level || '';
  const page         = parseInt(req.query.page) || 1;
  const per_page     = 9;
  const current_user = await getCurrentUser(req);

  let base   = 'SELECT c.*, u.name as instructor_name, cat.name as category_name ' +
               'FROM courses c LEFT JOIN users u ON c.instructor_id=u.id ' +
               'LEFT JOIN categories cat ON c.category_id=cat.id WHERE 1=1';
  const params = [];
  if (q)        { base += ' AND c.title LIKE ?'; params.push(`%${q}%`); }
  if (category) { base += ' AND cat.slug=?';     params.push(category); }
  if (level)    { base += ' AND c.level=?';      params.push(level); }
  if (price_filter === 'free')  base += ' AND c.price=0';
  else if (price_filter === 'paid') base += ' AND c.price>0';

  const pool = getDb();
  const [[countRow]] = await pool.execute(`SELECT COUNT(*) as n FROM (${base}) sub`, params);
  const total        = Number(countRow.n);
  const [[...courses]] = await pool.execute(
    base + ` ORDER BY c.id DESC LIMIT ${per_page} OFFSET ${(page - 1) * per_page}`,
    params
  );
  const categories = await fetchAll('SELECT * FROM categories');

  let enrolled_ids      = new Set();
  let created_ids       = new Set();
  let first_lesson_ids  = {};
  let last_lesson_ids   = {};
  let enrollment_progress = {};

  if (current_user) {
    const enr = await fetchAll('SELECT course_id, progress FROM enrollments WHERE user_id=?', [current_user.id]);
    enr.forEach(r => {
      enrolled_ids.add(r.course_id);
      enrollment_progress[r.course_id] = Number(r.progress || 0);
    });

    const cre = await fetchAll('SELECT id FROM courses WHERE instructor_id=?', [current_user.id]);
    cre.forEach(r => created_ids.add(r.id));

    if (enrolled_ids.size > 0) {
      const placeholders = [...enrolled_ids].map(() => '?').join(',');
      const fl = await fetchAll(
        `SELECT course_id, MIN(id) as first_id FROM lessons WHERE course_id IN (${placeholders}) GROUP BY course_id`,
        [...enrolled_ids]
      );
      fl.forEach(r => { first_lesson_ids[r.course_id] = r.first_id; });

      const ll = await fetchAll(
        `SELECT course_id, MAX(id) as last_id FROM lessons WHERE course_id IN (${placeholders}) GROUP BY course_id`,
        [...enrolled_ids]
      );
      ll.forEach(r => { last_lesson_ids[r.course_id] = r.last_id; });
    }
  }

  res.render('tat-ca-khoa-hoc.html', {
    courses, categories, total, page,
    total_pages: Math.ceil(total / per_page),
    q, selected_category: category, price_filter, level,
    enrolled_ids: [...enrolled_ids], created_ids: [...created_ids], first_lesson_ids, last_lesson_ids, enrollment_progress
  });
});

// ── Search AJAX ───────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  const results = await fetchAll(
    'SELECT c.*, u.name as instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id=u.id WHERE c.title LIKE ? LIMIT 5',
    [`%${q}%`]
  );
  res.json(results);
});

// ── Giới thiệu ────────────────────────────────────────────────────────
router.get('/gioi-thieu', async (req, res) => {
  const instructors = await fetchAll('SELECT DISTINCT u.* FROM users u JOIN courses c ON c.instructor_id=u.id WHERE u.is_admin=0 LIMIT 3');
  res.render('gioi-thieu.html', { instructors });
});

// ── Liên hệ ───────────────────────────────────────────────────────────
router.get('/lien-he', (req, res) => {
  res.render('lien-he.html');
});

router.post('/lien-he', async (req, res) => {
  const name    = (req.body.name || '').trim();
  const email   = (req.body.email || '').trim();
  const message = (req.body.message || '').trim();
  if (name && email && message) {
    await run('INSERT INTO contacts (name, email, message) VALUES (?,?,?)', [name, email, message]);
    return res.json({ success: true, message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.' });
  }
  res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
});

module.exports = router;