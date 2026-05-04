// src/routes/user.js
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const multer  = require('multer');
const { fetchOne, fetchAll, run, getDb } = require('../database');
const { loginRequired, checkPasswordChange } = require('../middleware/auth');

// ── Multer setup ──────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../public/images/courses');
fs.mkdirSync(uploadDir, { recursive: true });

// Multer cho ảnh thumbnail khóa học
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `course_${req.params.course_id || Date.now()}_${uuidv4().replace(/-/g,'').slice(0,12)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.gif','.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Định dạng ảnh không hợp lệ'));
  }
});

// Multer cho file tài liệu bài học (PDF, Word, txt, ảnh, zip...)
const materialUploadDir = path.join(__dirname, '../../public/uploads/materials');
fs.mkdirSync(materialUploadDir, { recursive: true });

const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, materialUploadDir),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').slice(0, 40);
    cb(null, `mat_${Date.now()}_${base}${ext}`);
  }
});
const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.doc','.docx','.txt','.md','.png','.jpg','.jpeg','.gif','.webp','.zip','.xlsx','.pptx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Định dạng file không được hỗ trợ'));
  }
});

// ── Helper: parse ID an toàn, trả về 0 nếu không hợp lệ ─────────────
function parseId(val) {
  const n = parseInt(val);
  return isNaN(n) || n <= 0 ? 0 : n;
}

// ── Tài khoản ─────────────────────────────────────────────────────────
router.get('/tai-khoan', loginRequired, checkPasswordChange, async (req, res) => {
  const user = await fetchOne('SELECT * FROM users WHERE id=?', [req.session.user_id]);
  const enrolled_courses = await fetchAll(`
    SELECT c.*, u.name as instructor_name, e.progress, e.enrolled_at,
    COALESCE(
      (SELECT l.id FROM lessons l
       WHERE l.course_id = c.id
         AND l.id NOT IN (SELECT lp.lesson_id FROM lesson_progress lp WHERE lp.user_id = ?)
       ORDER BY l.order_num ASC LIMIT 1),
      (SELECT l.id FROM lessons l WHERE l.course_id = c.id ORDER BY l.order_num ASC LIMIT 1)
    ) as first_lesson_id
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN users u ON c.instructor_id = u.id
    WHERE e.user_id = ?
    ORDER BY e.enrolled_at DESC
  `, [req.session.user_id, req.session.user_id]);

  const created_courses = await fetchAll(`
    SELECT c.*, cat.name as category_name,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE c.instructor_id = ?
    ORDER BY c.created_at DESC
  `, [req.session.user_id]);

  const wallet_txns = await fetchAll('SELECT * FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 20', [req.session.user_id]);
  const categories  = await fetchAll('SELECT * FROM categories');

  res.render('tai-khoan-cua-toi.html', { user, enrolled_courses, created_courses, wallet_txns, categories });
});

// Cập nhật profile
router.post('/update-profile', loginRequired, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.json({ success: false, message: 'Tên không được để trống.' });
  if (name.length < 2)  return res.json({ success: false, message: 'Tên phải có ít nhất 2 ký tự.' });
  if (name.length > 60) return res.json({ success: false, message: 'Tên không được quá 60 ký tự.' });

  function normName(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }
  const nameNorm = normName(name);
  const others   = await fetchAll('SELECT name FROM users WHERE id!=?', [req.session.user_id]);
  const duplicate = others.find(r => normName(r.name) === nameNorm);
  if (duplicate) return res.json({ success: false, message: `Tên "${name}" đã được sử dụng bởi tài khoản khác. Vui lòng chọn tên khác.` });

  await run('UPDATE users SET name=? WHERE id=?', [name, req.session.user_id]);
  req.session.user_name = name;
  res.json({ success: true, message: 'Cập nhật tên thành công!' });
});

// ── Đăng ký khóa học ─────────────────────────────────────────────────
router.post('/enroll/:course_id', loginRequired, async (req, res) => {
  const course_id = parseId(req.params.course_id);
  if (!course_id) return res.json({ success: false, message: 'ID khóa học không hợp lệ.' });

  const user   = await fetchOne('SELECT * FROM users WHERE id=?', [req.session.user_id]);
  const course = await fetchOne('SELECT * FROM courses WHERE id=?', [course_id]);
  if (!course) return res.json({ success: false, message: 'Khóa học không tồn tại.' });
  if (course.instructor_id === req.session.user_id)
    return res.json({ success: false, message: 'Bạn không thể đăng ký khóa học của chính mình!' });
  if (await fetchOne('SELECT id FROM enrollments WHERE user_id=? AND course_id=?', [req.session.user_id, course_id]))
    return res.json({ success: false, message: 'Bạn đã đăng ký khóa học này rồi!' });

  const price = course.price || 0;
  if (price > 0) {
    if (user.wallet_balance < price)
      return res.json({ success: false, message: `Số dư ví không đủ! Cần ${price.toLocaleString('vi-VN')}₫ nhưng bạn chỉ có ${user.wallet_balance.toLocaleString('vi-VN')}₫.` });
    await run('UPDATE users SET wallet_balance=wallet_balance-? WHERE id=?', [price, req.session.user_id]);
    await run('INSERT INTO wallet_transactions (user_id,type,amount,description) VALUES (?,?,?,?)',
        [req.session.user_id, 'purchase', price, `Mua khóa học: ${course.title}`]);
  }
  await run('INSERT INTO enrollments (user_id,course_id) VALUES (?,?)', [req.session.user_id, course_id]);
  await run('UPDATE courses SET total_students=total_students+1 WHERE id=?', [course_id]);
  const first_lesson = await fetchOne('SELECT id FROM lessons WHERE course_id=? ORDER BY order_num, id LIMIT 1', [course_id]);
  res.json({ success: true, message: 'Đăng ký khóa học thành công!', first_lesson_id: first_lesson?.id || null });
});

// ── Tạo khóa học ─────────────────────────────────────────────────────
router.post('/tao-khoa-hoc', loginRequired, (req, res, next) => {
  upload.single('thumbnail_file')(req, res, async (err) => {
    if (err) return res.json({ success: false, message: err.message });
    const title = (req.body.title || '').trim();
    if (!title) return res.json({ success: false, message: 'Tên khóa học không được trống.' });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + crypto.randomBytes(3).toString('hex');
    let image_url = null;
    if (req.file) {
      image_url = `/images/courses/${req.file.filename}`;
    } else {
      const url_input = (req.body.thumbnail || '').trim();
      if (url_input) image_url = url_input;
    }
    try {
      await run(
        'INSERT INTO courses (title,slug,description,price,original_price,instructor_id,category_id,level,duration,total_lessons,is_featured,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [title, slug, req.body.description||'', parseFloat(req.body.price||0), parseFloat(req.body.original_price||0)||0,
         req.session.user_id, req.body.category_id||null,
         req.body.level||'beginner', req.body.duration||'0 giờ',
         parseInt(req.body.total_lessons||0), 0, image_url]
      );
      res.json({ success: true, message: `Tạo khóa học "${title}" thành công!` });
    } catch (e) {
      res.json({ success: false, message: e.message });
    }
  });
});

// Xóa khóa học
router.post('/xoa-khoa-hoc/:cid', loginRequired, async (req, res) => {
  const cid = parseId(req.params.cid);
  if (!cid) return res.json({ success: false, message: 'ID khóa học không hợp lệ.' });

  const course = await fetchOne('SELECT * FROM courses WHERE id=? AND instructor_id=?', [cid, req.session.user_id]);
  if (!course) return res.json({ success: false, message: 'Không có quyền xóa khóa học này.' });
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

// ── Chỉnh sửa khóa học ───────────────────────────────────────────────
router.get('/chinh-sua-khoa-hoc/:course_id', loginRequired, async (req, res) => {
  const course_id = parseId(req.params.course_id);
  if (!course_id) { req.flash('error', 'ID khóa học không hợp lệ.'); return res.redirect('/tai-khoan'); }

  const course = await fetchOne('SELECT * FROM courses WHERE id=? AND instructor_id=?', [course_id, req.session.user_id]);
  if (!course) { req.flash('error', 'Không tìm thấy khóa học.'); return res.redirect('/tai-khoan'); }
  const lessons    = await fetchAll('SELECT * FROM lessons WHERE course_id=? ORDER BY order_num', [course_id]);
  const categories = await fetchAll('SELECT * FROM categories ORDER BY name');
  res.render('chinh-sua-khoa-hoc.html', { course, lessons, categories });
});

router.post('/cap-nhat-khoa-hoc/:course_id', loginRequired, (req, res, next) => {
  upload.single('thumbnail_file')(req, res, async (err) => {
    if (err) return res.json({ success: false, message: err.message });
    const course_id = parseId(req.params.course_id);
    if (!course_id) return res.json({ success: false, message: 'ID khóa học không hợp lệ.' });
    try {
      const course = await fetchOne('SELECT * FROM courses WHERE id=? AND instructor_id=?', [course_id, req.session.user_id]);
      if (!course) return res.json({ success: false, message: 'Không có quyền chỉnh sửa khóa học này.' });
      const title = (req.body.title || '').trim();
      if (!title) return res.json({ success: false, message: 'Tên khóa học không được trống.' });
      const price     = parseFloat(req.body.price || 0) || 0;
      const ori_raw   = (req.body.original_price || '').trim();
      const ori_price = ori_raw ? parseFloat(ori_raw) : null;
      let image_url   = course.image;
      if (req.file) {
        image_url = `/images/courses/${req.file.filename}`;
      } else {
        const url_input = (req.body.thumbnail || '').trim();
        if (url_input) image_url = url_input;
      }
      await run('UPDATE courses SET title=?,description=?,price=?,original_price=?,category_id=?,level=?,image=? WHERE id=?',
        [title, req.body.description||'', price, ori_price, req.body.category_id||null, req.body.level||'beginner', image_url, course_id]);
      res.json({ success: true, message: `Đã cập nhật khóa học "${title}"!`, thumbnail: image_url||'' });
    } catch (e) {
      res.json({ success: false, message: `Lỗi máy chủ: ${e.message}` });
    }
  });
});


// ── Helper: tính lại progress cho tất cả học viên sau khi thêm/xóa bài học ──
async function recalcEnrollmentProgress(course_id) {
  const enrollments = await fetchAll('SELECT user_id FROM enrollments WHERE course_id=?', [course_id]);
  const total = Number((await fetchOne('SELECT COUNT(*) as n FROM lessons WHERE course_id=?', [course_id])).n);
  for (const enr of enrollments) {
    const done = Number((await fetchOne(
      'SELECT COUNT(*) as n FROM lesson_progress lp JOIN lessons l ON lp.lesson_id=l.id WHERE lp.user_id=? AND l.course_id=?',
      [enr.user_id, course_id]
    )).n);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    await run('UPDATE enrollments SET progress=? WHERE user_id=? AND course_id=?', [pct, enr.user_id, course_id]);
  }
}

// ── Xem bài học ───────────────────────────────────────────────────────
router.get('/xem-bai-hoc/:lesson_id', loginRequired, checkPasswordChange, async (req, res) => {
  const lesson_id = parseId(req.params.lesson_id);
  if (!lesson_id) {
    req.flash('error', 'Khóa học này chưa có bài học nào.');
    return res.redirect('/tai-khoan');
  }
  const lesson = await fetchOne(
    'SELECT l.*, c.title as course_title, c.id as course_id, c.instructor_id ' +
    'FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?',
    [lesson_id]
  );
  if (!lesson) { req.flash('error', 'Bài học không tồn tại.'); return res.redirect('/tai-khoan'); }

  const is_enrolled   = await fetchOne('SELECT id FROM enrollments WHERE user_id=? AND course_id=?', [req.session.user_id, lesson.course_id]);
  const is_instructor = Number(lesson.instructor_id) === Number(req.session.user_id);
  if (!is_enrolled && !is_instructor && !lesson.is_free) {
    req.flash('warning', 'Vui lòng đăng ký khóa học để xem bài học này.');
    return res.redirect('/khoa-hoc');
  }

  const [materials, exercises, all_lessons] = await Promise.all([
    fetchAll('SELECT * FROM lesson_materials WHERE lesson_id=? ORDER BY order_num', [lesson_id]),
    fetchAll('SELECT * FROM lesson_exercises WHERE lesson_id=? ORDER BY order_num', [lesson_id]),
    fetchAll('SELECT * FROM lessons WHERE course_id=? ORDER BY order_num', [lesson.course_id]),
  ]);

  let completed_lessons = [];
  try {
    const cl = await fetchAll(
      'SELECT lp.lesson_id FROM lesson_progress lp JOIN lessons l ON lp.lesson_id=l.id WHERE lp.user_id=? AND l.course_id=?',
      [req.session.user_id, lesson.course_id]
    );
    completed_lessons = cl.map(r => r.lesson_id);
  } catch {}

  const currentIdx      = all_lessons.findIndex(l => l.id === lesson.id);
  const prev_lesson_id  = currentIdx > 0 ? String(all_lessons[currentIdx - 1].id) : null;
  const next_lesson_id  = currentIdx < all_lessons.length - 1 ? String(all_lessons[currentIdx + 1].id) : null;
  const progress_pct    = all_lessons.length ? Math.round((completed_lessons.length / all_lessons.length) * 100) : 0;

  res.render('xem-bai-hoc.html', { lesson, materials, exercises, all_lessons, is_instructor, completed_lessons, is_enrolled: !!is_enrolled, prev_lesson_id, next_lesson_id, progress_pct });
});

// Đánh dấu hoàn thành bài học
router.post('/mark-lesson-complete', loginRequired, async (req, res) => {
  const lesson_id = parseId(req.body.lesson_id);
  if (!lesson_id) return res.json({ success: false, message: 'Thiếu lesson_id.' });
  try {
    const lesson = await fetchOne('SELECT l.course_id FROM lessons l WHERE l.id=?', [lesson_id]);
    if (!lesson) return res.json({ success: false, message: 'Bài học không tồn tại.' });
    const is_enrolled       = await fetchOne('SELECT id FROM enrollments WHERE user_id=? AND course_id=?', [req.session.user_id, lesson.course_id]);
    const is_instructor_row = await fetchOne('SELECT instructor_id FROM courses WHERE id=?', [lesson.course_id]);
    const is_instructor     = is_instructor_row && Number(is_instructor_row.instructor_id) === Number(req.session.user_id);
    if (!is_enrolled && !is_instructor)
      return res.json({ success: false, message: 'Bạn chưa đăng ký khóa học này.' });

    // MySQL: INSERT IGNORE thay cho INSERT OR IGNORE
    await run('INSERT IGNORE INTO lesson_progress (user_id, lesson_id) VALUES (?,?)', [req.session.user_id, lesson_id]);
    const total = (await fetchOne('SELECT COUNT(*) as n FROM lessons WHERE course_id=?', [lesson.course_id])).n;
    const done  = (await fetchOne('SELECT COUNT(*) as n FROM lesson_progress lp JOIN lessons l ON lp.lesson_id=l.id WHERE lp.user_id=? AND l.course_id=?', [req.session.user_id, lesson.course_id])).n;
    const pct   = total ? Math.round((Number(done) / Number(total)) * 100) : 0;
    if (is_enrolled) {
      await run('UPDATE enrollments SET progress=? WHERE user_id=? AND course_id=?', [pct, req.session.user_id, lesson.course_id]);
    }
    res.json({ success: true, message: 'Đã đánh dấu hoàn thành!', progress_pct: pct });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ── Chỉnh sửa bài học ────────────────────────────────────────────────
router.get('/chinh-sua-bai-hoc/:lesson_id', loginRequired, async (req, res) => {
  const lesson_id = parseId(req.params.lesson_id);
  if (!lesson_id) { req.flash('error', 'ID bài học không hợp lệ.'); return res.redirect('/tai-khoan'); }

  const lesson = await fetchOne(
    'SELECT l.*, c.title as course_title, c.instructor_id, c.id as course_id FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?',
    [lesson_id]
  );
  if (!lesson) { req.flash('error', 'Bài học không tồn tại.'); return res.redirect('/tai-khoan'); }
  if (Number(lesson.instructor_id) !== Number(req.session.user_id)) { req.flash('error', 'Bạn không có quyền chỉnh sửa bài học này.'); return res.redirect('/tai-khoan'); }
  const [materials, exercises] = await Promise.all([
    fetchAll('SELECT * FROM lesson_materials WHERE lesson_id=? ORDER BY order_num', [lesson_id]),
    fetchAll('SELECT * FROM lesson_exercises WHERE lesson_id=? ORDER BY order_num', [lesson_id]),
  ]);
  res.render('chinh-sua-bai-hoc.html', { lesson, materials, exercises });
});

router.post('/chinh-sua-bai-hoc/:lesson_id', loginRequired, async (req, res) => {
  const lesson_id = parseId(req.params.lesson_id);
  if (!lesson_id) return res.json({ success: false, message: 'ID bài học không hợp lệ.' }); // ← FIX chính

  const lesson = await fetchOne('SELECT l.*, c.instructor_id FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?', [lesson_id]);
  if (!lesson || Number(lesson.instructor_id) !== Number(req.session.user_id))
    return res.json({ success: false, message: 'Không có quyền.' });
  const title = (req.body.title || '').trim();
  if (!title) return res.json({ success: false, message: 'Tiêu đề không được trống.' });
  const is_free = req.body.is_free === '1' ? 1 : 0;
  await run('UPDATE lessons SET title=?,order_num=?,video_url=?,is_free=? WHERE id=?',
    [title, parseInt(req.body.order_num)||1, (req.body.video_url||'').trim(), is_free, lesson_id]);
  res.json({ success: true, message: 'Đã lưu thông tin bài học!' });
});

// ── Thêm bài học ──────────────────────────────────────────────────────
router.post('/them-bai-hoc', loginRequired, async (req, res) => {
  const course_id = parseId(req.body.course_id);
  const title     = (req.body.title || '').trim();
  if (!course_id || !title) return res.json({ success: false, message: 'Thiếu thông tin.' });
  const course = await fetchOne('SELECT * FROM courses WHERE id=? AND instructor_id=?', [course_id, req.session.user_id]);
  if (!course) return res.json({ success: false, message: 'Không có quyền.' });
  const result = await run(
    'INSERT INTO lessons (course_id,title,order_num,duration_minutes,video_url,is_free) VALUES (?,?,?,?,?,?)',
    [course_id, title, parseInt(req.body.order_num)||1, parseInt(req.body.duration_minutes)||null, (req.body.video_url||'').trim()||null, 1]
  );
  await run('UPDATE courses SET total_lessons=(SELECT COUNT(*) FROM lessons WHERE course_id=?) WHERE id=?', [course_id, course_id]);
  // Tính lại progress cho tất cả học viên (bài mới → không ai hoàn thành → pct giảm)
  await recalcEnrollmentProgress(course_id);
  res.json({ success: true, message: 'Đã thêm bài học!', lesson_id: result.insertId });
});

// Xóa bài học
router.post('/xoa-bai-hoc/:lesson_id', loginRequired, async (req, res) => {
  const lesson_id = parseId(req.params.lesson_id);
  if (!lesson_id) return res.json({ success: false, message: 'ID bài học không hợp lệ.' });

  const lesson = await fetchOne('SELECT l.*, c.instructor_id, l.course_id FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?', [lesson_id]);
  if (!lesson || lesson.instructor_id !== req.session.user_id)
    return res.json({ success: false, message: 'Không có quyền xóa bài học này.' });
  await run('DELETE FROM lesson_materials WHERE lesson_id=?', [lesson_id]);
  await run('DELETE FROM lesson_exercises WHERE lesson_id=?', [lesson_id]);
  await run('DELETE FROM lessons WHERE id=?', [lesson_id]);
  await run('UPDATE courses SET total_lessons=(SELECT COUNT(*) FROM lessons WHERE course_id=?) WHERE id=?', [lesson.course_id, lesson.course_id]);
  // Tính lại progress cho tất cả học viên sau khi xóa bài
  await recalcEnrollmentProgress(lesson.course_id);
  res.json({ success: true, message: 'Đã xóa bài học!' });
});

// ── Material CRUD ─────────────────────────────────────────────────────
router.post('/them-material', loginRequired, (req, res, next) => {
  uploadMaterial.single('material_file')(req, res, async (err) => {
    if (err) return res.json({ success: false, message: err.message });
    const lesson_id = parseId(req.body.lesson_id);
    const title     = (req.body.title || '').trim();
    const mat_type  = req.body.material_type || 'document';
    const content   = req.body.content || '';
    if (!lesson_id || !title) return res.json({ success: false, message: 'Thiếu thông tin.' });
    const ok = await fetchOne('SELECT c.instructor_id FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?', [lesson_id]);
    if (!ok || ok.instructor_id !== req.session.user_id) return res.json({ success: false, message: 'Không có quyền.' });
    const fileUrl = req.file ? `/uploads/materials/${req.file.filename}` : '';
    const maxRow  = await fetchOne('SELECT COALESCE(MAX(order_num),0)+1 as n FROM lesson_materials WHERE lesson_id=?', [lesson_id]);
    await run('INSERT INTO lesson_materials (lesson_id,title,material_type,content,url,order_num) VALUES (?,?,?,?,?,?)',
      [lesson_id, title, mat_type, content, fileUrl, maxRow.n]);
    res.json({ success: true, message: 'Đã thêm tài liệu!' });
  });
});

router.post('/chinh-sua-material/:mat_id', loginRequired, (req, res, next) => {
  uploadMaterial.single('material_file')(req, res, async (err) => {
    if (err) return res.json({ success: false, message: err.message });
    const mat_id   = parseId(req.params.mat_id);
    if (!mat_id) return res.json({ success: false, message: 'ID tài liệu không hợp lệ.' });

    const title    = (req.body.title || '').trim();
    const mat_type = req.body.material_type || 'document';
    const content  = req.body.content || '';
    if (!title) return res.json({ success: false, message: 'Tiêu đề không được trống.' });
    const ok = await fetchOne('SELECT c.instructor_id, lm.url as old_url FROM lesson_materials lm JOIN lessons l ON lm.lesson_id=l.id JOIN courses c ON l.course_id=c.id WHERE lm.id=?', [mat_id]);
    if (!ok || ok.instructor_id !== req.session.user_id) return res.json({ success: false, message: 'Không có quyền.' });

    let fileUrl = ok.old_url || '';
    if (req.file) {
      // Xóa file cũ nếu có
      if (ok.old_url) {
        const oldPath = path.join(__dirname, '../../public', ok.old_url);
        fs.unlink(oldPath, () => {});
      }
      fileUrl = `/uploads/materials/${req.file.filename}`;
    }
    await run('UPDATE lesson_materials SET title=?,material_type=?,content=?,url=? WHERE id=?', [title, mat_type, content, fileUrl, mat_id]);
    res.json({ success: true, message: 'Đã lưu tài liệu!' });
  });
});

router.post('/xoa-material/:mat_id', loginRequired, async (req, res) => {
  const mat_id = parseId(req.params.mat_id);
  if (!mat_id) return res.json({ success: false, message: 'ID tài liệu không hợp lệ.' });

  const ok = await fetchOne('SELECT c.instructor_id, lm.url FROM lesson_materials lm JOIN lessons l ON lm.lesson_id=l.id JOIN courses c ON l.course_id=c.id WHERE lm.id=?', [mat_id]);
  if (!ok || ok.instructor_id !== req.session.user_id) return res.json({ success: false, message: 'Không có quyền.' });
  if (ok.url) {
    const filePath = path.join(__dirname, '../../public', ok.url);
    fs.unlink(filePath, () => {}); // Xóa file vật lý, ignore lỗi nếu không tồn tại
  }
  await run('DELETE FROM lesson_materials WHERE id=?', [mat_id]);
  res.json({ success: true, message: 'Đã xóa tài liệu!' });
});

// ── Exercise CRUD ─────────────────────────────────────────────────────
router.post('/them-exercise', loginRequired, async (req, res) => {
  const lesson_id = parseId(req.body.lesson_id);
  const question  = (req.body.question || '').trim();
  const correct   = (req.body.correct_answer || '').trim().toUpperCase();
  if (!lesson_id || !question || !correct) return res.json({ success: false, message: 'Thiếu thông tin bắt buộc.' });
  const ok = await fetchOne('SELECT c.instructor_id FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?', [lesson_id]);
  if (!ok || ok.instructor_id !== req.session.user_id) return res.json({ success: false, message: 'Không có quyền.' });
  const maxRow = await fetchOne('SELECT COALESCE(MAX(order_num),0)+1 as n FROM lesson_exercises WHERE lesson_id=?', [lesson_id]);
  await run('INSERT INTO lesson_exercises (lesson_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,order_num) VALUES (?,?,?,?,?,?,?,?,?)',
    [lesson_id, question, req.body.option_a||'', req.body.option_b||'', req.body.option_c||'', req.body.option_d||'', correct, req.body.explanation||'', maxRow.n]);
  res.json({ success: true, message: 'Đã thêm câu hỏi!' });
});

router.post('/chinh-sua-exercise/:ex_id', loginRequired, async (req, res) => {
  const ex_id   = parseId(req.params.ex_id);
  if (!ex_id) return res.json({ success: false, message: 'ID câu hỏi không hợp lệ.' });

  const question = (req.body.question || '').trim();
  const correct  = (req.body.correct_answer || '').trim().toUpperCase();
  if (!question || !correct) return res.json({ success: false, message: 'Câu hỏi và đáp án đúng là bắt buộc.' });
  const ok = await fetchOne('SELECT c.instructor_id FROM lesson_exercises le JOIN lessons l ON le.lesson_id=l.id JOIN courses c ON l.course_id=c.id WHERE le.id=?', [ex_id]);
  if (!ok || ok.instructor_id !== req.session.user_id) return res.json({ success: false, message: 'Không có quyền.' });
  await run('UPDATE lesson_exercises SET question=?,option_a=?,option_b=?,option_c=?,option_d=?,correct_answer=?,explanation=? WHERE id=?',
    [question, req.body.option_a||'', req.body.option_b||'', req.body.option_c||'', req.body.option_d||'', correct, req.body.explanation||'', ex_id]);
  res.json({ success: true, message: 'Đã lưu câu hỏi!' });
});

router.post('/xoa-exercise/:ex_id', loginRequired, async (req, res) => {
  const ex_id = parseId(req.params.ex_id);
  if (!ex_id) return res.json({ success: false, message: 'ID câu hỏi không hợp lệ.' });

  const ok = await fetchOne('SELECT c.instructor_id FROM lesson_exercises le JOIN lessons l ON le.lesson_id=l.id JOIN courses c ON l.course_id=c.id WHERE le.id=?', [ex_id]);
  if (!ok || ok.instructor_id !== req.session.user_id) return res.json({ success: false, message: 'Không có quyền.' });
  await run('DELETE FROM lesson_exercises WHERE id=?', [ex_id]);
  res.json({ success: true, message: 'Đã xóa câu hỏi!' });
});

// ── Wallet ────────────────────────────────────────────────────────────
router.post('/wallet/deposit',  loginRequired, (req, res) => res.json({ success: false, message: 'Vui lòng sử dụng chức năng Gửi Yêu Cầu Nạp Tiền để được admin xác nhận.' }));
router.post('/wallet/withdraw', loginRequired, (req, res) => res.json({ success: false, message: 'Vui lòng sử dụng chức năng Gửi Yêu Cầu Rút Tiền để được admin xác nhận.' }));

router.post('/wallet/clear-history', loginRequired, async (req, res) => {
  await run('DELETE FROM wallet_transactions WHERE user_id=?', [req.session.user_id]);
  res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử giao dịch.' });
});

router.post('/wallet/deposit-request', loginRequired, async (req, res) => {
  let amount;
  try { amount = parseFloat(req.body.amount || 0); } catch { return res.json({ success: false, message: 'Số tiền không hợp lệ.' }); }
  if (amount < 10000) return res.json({ success: false, message: 'Số tiền nạp tối thiểu là 10.000₫.' });
  const transfer_content = (req.body.transfer_content || '').trim();
  const bank_name        = (req.body.bank_name || '').trim();
  await run('INSERT INTO deposit_requests (user_id,amount,transfer_content,bank_name) VALUES (?,?,?,?)', [req.session.user_id, amount, transfer_content, bank_name]);
  res.json({ success: true, message: 'Yêu cầu nạp tiền đã được gửi! Admin sẽ xác nhận trong vòng 24h.' });
});

router.post('/wallet/withdraw-request', loginRequired, async (req, res) => {
  let amount;
  try { amount = parseFloat(req.body.amount || 0); } catch { return res.json({ success: false, message: 'Số tiền không hợp lệ.' }); }
  if (amount < 100000) return res.json({ success: false, message: 'Số tiền rút tối thiểu là 100.000₫.' });
  const user = await fetchOne('SELECT * FROM users WHERE id=?', [req.session.user_id]);
  if (user.wallet_balance < amount) return res.json({ success: false, message: 'Số dư không đủ!' });
  if (!user.bank_account) return res.json({ success: false, message: 'Vui lòng cập nhật thông tin ngân hàng trước khi rút tiền.' });
  await run('UPDATE users SET wallet_balance=wallet_balance-? WHERE id=?', [amount, req.session.user_id]);
  await run('INSERT INTO wallet_transactions (user_id,type,amount,description,status) VALUES (?,?,?,?,?)',
    [req.session.user_id, 'withdraw', amount, `Rút tiền về TK ${user.bank_account} (${user.bank_name})`, 'pending']);
  const updated = await fetchOne('SELECT wallet_balance FROM users WHERE id=?', [req.session.user_id]);
  res.json({ success: true, message: 'Yêu cầu rút tiền đã được gửi! Admin sẽ chuyển khoản trong 1-3 ngày làm việc.', new_balance: updated.wallet_balance });
});

// ── Bank Info ─────────────────────────────────────────────────────────
router.post('/update-bank-info', loginRequired, async (req, res) => {
  const bank_name    = (req.body.bank_name || '').trim();
  const bank_account = (req.body.bank_account || '').trim();
  const bank_holder  = (req.body.bank_holder || '').trim();
  if (!bank_name || !bank_account || !bank_holder)
    return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin ngân hàng.' });
  const dupAccount = await fetchOne('SELECT id FROM users WHERE bank_account=? AND id!=?', [bank_account, req.session.user_id]);
  if (dupAccount) return res.json({ success: false, message: 'Số tài khoản ngân hàng này đã được đăng ký bởi tài khoản khác. Vui lòng kiểm tra lại.' });
  await run('UPDATE users SET bank_name=?,bank_account=?,bank_holder=? WHERE id=?',
    [bank_name, bank_account, bank_holder.toUpperCase(), req.session.user_id]);
  res.json({ success: true, message: 'Cập nhật thông tin ngân hàng thành công!' });
});

// ── Delete Account Request ────────────────────────────────────────────
router.post('/request-delete-account', loginRequired, async (req, res) => {
  const reason = (req.body.reason || '').trim();
  if (!reason) return res.json({ success: false, message: 'Vui lòng nhập lý do xóa tài khoản.' });
  const existing = await fetchOne("SELECT id FROM delete_requests WHERE user_id=? AND status='pending'", [req.session.user_id]);
  if (existing) return res.json({ success: false, message: 'Bạn đã có yêu cầu xóa tài khoản đang chờ xử lý.' });
  await run('INSERT INTO delete_requests (user_id,reason) VALUES (?,?)', [req.session.user_id, reason]);
  res.json({ success: true, message: 'Yêu cầu xóa tài khoản đã được gửi! Admin sẽ xử lý sớm nhất.' });
});

// ── Đổi mật khẩu bắt buộc ────────────────────────────────────────────
router.get('/doi-mat-khau', (req, res) => {
  // Không destroy session - chỉ render trang đổi mật khẩu
  res.render('doi-mat-khau.html');
});

router.post('/doi-mat-khau', loginRequired, async (req, res) => {
  const bcrypt      = require('bcryptjs');
  const new_password = (req.body.new_password || '').trim();
  const confirm      = (req.body.confirm_password || '').trim();
  if (!new_password || new_password.length < 6)
    return res.json({ success: false, message: 'Mật khẩu tối thiểu 6 ký tự.' });
  if (new_password !== confirm)
    return res.json({ success: false, message: 'Mật khẩu xác nhận không khớp.' });
  await run('UPDATE users SET password=?, must_change_password=0 WHERE id=?',
    [bcrypt.hashSync(new_password, 10), req.session.user_id]);
  res.json({ success: true, message: 'Đổi mật khẩu thành công!', redirect: '/' });
});

// ── Đánh giá khóa học ────────────────────────────────────────────────
router.post('/review', loginRequired, async (req, res) => {
  const user_id  = req.session.user_id;
  const { course_id, rating, comment } = req.body;

  if (!course_id || !rating || !comment) {
    return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
  }
  const r = parseInt(rating);
  if (r < 1 || r > 5) {
    return res.json({ success: false, message: 'Đánh giá không hợp lệ.' });
  }
  if (!comment.trim() || comment.trim().length < 5) {
    return res.json({ success: false, message: 'Nhận xét quá ngắn.' });
  }

  // Kiểm tra đã đăng ký khóa học chưa
  const enrolled = await fetchOne(
    'SELECT id FROM enrollments WHERE user_id=? AND course_id=?',
    [user_id, course_id]
  );
  if (!enrolled) {
    return res.json({ success: false, message: 'Bạn chưa đăng ký khóa học này.' });
  }

  // Kiểm tra đã đánh giá chưa — nếu rồi thì update
  const existing = await fetchOne(
    'SELECT id FROM reviews WHERE user_id=? AND course_id=?',
    [user_id, course_id]
  );
  if (existing) {
    await run(
      'UPDATE reviews SET rating=?, comment=?, created_at=CURRENT_TIMESTAMP WHERE id=?',
      [r, comment.trim(), existing.id]
    );
  } else {
    await run(
      'INSERT INTO reviews (user_id, course_id, rating, comment) VALUES (?,?,?,?)',
      [user_id, course_id, r, comment.trim()]
    );
  }

  // Cập nhật rating trung bình của khóa học
  try {
    const avgRow = await fetchOne(
      'SELECT AVG(rating) as avg FROM reviews WHERE course_id=?',
      [course_id]
    );
    if (avgRow && avgRow.avg != null) {
      await run(
        'UPDATE courses SET rating=? WHERE id=?',
        [Math.round(Number(avgRow.avg) * 10) / 10, course_id]
      );
    }
  } catch (e) {
    console.warn('Cập nhật rating thất bại:', e.message);
  }

  res.json({ success: true, message: 'Cảm ơn bạn đã đánh giá!' });
});

// ── Thảo luận bài học ─────────────────────────────────────────────────
router.get('/lesson-comments/:lesson_id', loginRequired, async (req, res) => {
  const lesson_id = parseId(req.params.lesson_id);
  if (!lesson_id) return res.json({ success: false, message: 'Thiếu lesson_id.' });

  const lesson = await fetchOne(
    'SELECT l.course_id, c.instructor_id FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?',
    [lesson_id]
  );
  if (!lesson) return res.json({ success: false, message: 'Bài học không tồn tại.' });

  const is_enrolled   = await fetchOne('SELECT id FROM enrollments WHERE user_id=? AND course_id=?', [req.session.user_id, lesson.course_id]);
  const is_instructor = Number(lesson.instructor_id) === Number(req.session.user_id);
  const is_free_lesson = await fetchOne('SELECT is_free FROM lessons WHERE id=?', [lesson_id]);
  if (!is_enrolled && !is_instructor && !is_free_lesson?.is_free) {
    return res.json({ success: false, message: 'Không có quyền xem thảo luận.' });
  }

  const comments = await fetchAll(
    `SELECT lc.*, u.name as user_name, u.is_admin,
            (c2.instructor_id = lc.user_id) as is_instructor_comment
     FROM lesson_comments lc
     JOIN users u ON lc.user_id = u.id
     JOIN lessons l2 ON lc.lesson_id = l2.id
     JOIN courses c2 ON l2.course_id = c2.id
     WHERE lc.lesson_id = ?
     ORDER BY lc.created_at ASC`,
    [lesson_id]
  );
  res.json({ success: true, comments, current_user_id: req.session.user_id });
});

router.post('/lesson-comments', loginRequired, async (req, res) => {
  const lesson_id = parseId(req.body.lesson_id);
  const content   = (req.body.content || '').trim();
  const parent_id = req.body.parent_id ? parseId(req.body.parent_id) : null;

  if (!lesson_id || !content) return res.json({ success: false, message: 'Nội dung không được trống.' });
  if (content.length > 2000)  return res.json({ success: false, message: 'Bình luận tối đa 2000 ký tự.' });

  const lesson = await fetchOne(
    'SELECT l.course_id, c.instructor_id FROM lessons l JOIN courses c ON l.course_id=c.id WHERE l.id=?',
    [lesson_id]
  );
  if (!lesson) return res.json({ success: false, message: 'Bài học không tồn tại.' });

  const is_enrolled   = await fetchOne('SELECT id FROM enrollments WHERE user_id=? AND course_id=?', [req.session.user_id, lesson.course_id]);
  const is_instructor = Number(lesson.instructor_id) === Number(req.session.user_id);
  const is_free_lesson = await fetchOne('SELECT is_free FROM lessons WHERE id=?', [lesson_id]);
  if (!is_enrolled && !is_instructor && !is_free_lesson?.is_free) {
    return res.json({ success: false, message: 'Vui lòng đăng ký khóa học để thảo luận.' });
  }

  if (parent_id) {
    const parent = await fetchOne('SELECT id FROM lesson_comments WHERE id=? AND lesson_id=?', [parent_id, lesson_id]);
    if (!parent) return res.json({ success: false, message: 'Bình luận gốc không hợp lệ.' });
  }

  const result = await run(
    'INSERT INTO lesson_comments (lesson_id, user_id, parent_id, content) VALUES (?,?,?,?)',
    [lesson_id, req.session.user_id, parent_id, content]
  );

  const newComment = await fetchOne(
    `SELECT lc.*, u.name as user_name, u.is_admin,
            (c2.instructor_id = lc.user_id) as is_instructor_comment
     FROM lesson_comments lc
     JOIN users u ON lc.user_id = u.id
     JOIN lessons l2 ON lc.lesson_id = l2.id
     JOIN courses c2 ON l2.course_id = c2.id
     WHERE lc.id=?`,
    [result.insertId]
  );
  res.json({ success: true, comment: newComment });
});

router.post('/lesson-comments/:id/edit', loginRequired, async (req, res) => {
  const id      = parseId(req.params.id);
  if (!id) return res.json({ success: false, message: 'ID bình luận không hợp lệ.' });

  const content = (req.body.content || '').trim();
  if (!content)           return res.json({ success: false, message: 'Nội dung không được trống.' });
  if (content.length > 2000) return res.json({ success: false, message: 'Bình luận tối đa 2000 ký tự.' });

  const comment = await fetchOne('SELECT * FROM lesson_comments WHERE id=?', [id]);
  if (!comment)                               return res.json({ success: false, message: 'Bình luận không tồn tại.' });
  if (comment.user_id !== req.session.user_id) return res.json({ success: false, message: 'Không có quyền sửa.' });

  await run('UPDATE lesson_comments SET content=? WHERE id=?', [content, id]);
  res.json({ success: true, message: 'Đã cập nhật bình luận.' });
});

router.post('/lesson-comments/:id/delete', loginRequired, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.json({ success: false, message: 'ID bình luận không hợp lệ.' });

  const comment = await fetchOne(
    `SELECT lc.*, c.instructor_id FROM lesson_comments lc
     JOIN lessons l ON lc.lesson_id = l.id
     JOIN courses c ON l.course_id = c.id
     WHERE lc.id=?`,
    [id]
  );
  if (!comment) return res.json({ success: false, message: 'Bình luận không tồn tại.' });

  const canDelete = comment.user_id === req.session.user_id || comment.instructor_id === req.session.user_id;
  if (!canDelete) return res.json({ success: false, message: 'Không có quyền xóa.' });

  await run('DELETE FROM lesson_comments WHERE parent_id=?', [id]);
  await run('DELETE FROM lesson_comments WHERE id=?', [id]);
  res.json({ success: true, message: 'Đã xóa bình luận.' });
});

module.exports = router;