require('dotenv').config();

const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const upload = multer();

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const hasRequiredDbEnv = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
const previewModeEnv = process.env.PREVIEW_MODE;
const PREVIEW_MODE =
  previewModeEnv === 'true'
    ? true
    : previewModeEnv === 'false'
      ? false
      : !hasRequiredDbEnv;

const rawTrustProxy = process.env.TRUST_PROXY;
if (rawTrustProxy && rawTrustProxy !== 'false') {
  const parsed = Number(rawTrustProxy);
  app.set('trust proxy', Number.isNaN(parsed) ? rawTrustProxy : parsed);
}

const routeMap = {
  trang_chu: '/',
  tat_ca_khoa_hoc: '/khoa-hoc',
  gioi_thieu: '/gioi-thieu',
  lien_he: '/lien-he',
  quen_mat_khau: '/quen-mat-khau',
  tai_khoan: '/tai-khoan',
  logout: '/logout'
};

let pool;

const previewInstructors = [
  { id: 1, name: 'Nguyễn Văn An', email: 'an.nguyen@educonnect.vn', created_at: '2024-01-10 09:00:00' },
  { id: 2, name: 'Trần Thị Bình', email: 'binh.tran@educonnect.vn', created_at: '2024-01-12 10:00:00' },
  { id: 3, name: 'Lê Minh Cường', email: 'cuong.le@educonnect.vn', created_at: '2024-01-15 08:30:00' }
];

const previewCategories = [
  { id: 1, name: 'Lập Trình Web', slug: 'lap-trinh-web' },
  { id: 2, name: 'Digital Marketing', slug: 'digital-marketing' },
  { id: 3, name: 'SEO', slug: 'seo' },
  { id: 4, name: 'Thiết Kế', slug: 'thiet-ke' },
  { id: 5, name: 'Kinh Doanh Online', slug: 'kinh-doanh-online' },
  { id: 6, name: 'Tiếp Thị Liên Kết', slug: 'tiep-thi-lien-ket' }
];

const previewCourses = [
  {
    id: 1,
    title: 'Lập Trình Web Từ Zero Đến Hero',
    slug: 'lap-trinh-web-zero-hero',
    description: 'Khóa học toàn diện từ HTML, CSS, JavaScript đến React và Node.js',
    price: 799000,
    original_price: 1200000,
    instructor_id: 1,
    instructor_name: 'Nguyễn Văn An',
    category_id: 1,
    category_name: 'Lập Trình Web',
    level: 'beginner',
    total_lessons: 120,
    total_students: 2340,
    rating: 4.8,
    is_featured: 1
  },
  {
    id: 2,
    title: 'SEO Thực Chiến 2024',
    slug: 'seo-thuc-chien-2024',
    description: 'Học SEO từ cơ bản đến nâng cao, tối ưu website lên top Google',
    price: 599000,
    original_price: 900000,
    instructor_id: 2,
    instructor_name: 'Trần Thị Bình',
    category_id: 3,
    category_name: 'SEO',
    level: 'intermediate',
    total_lessons: 80,
    total_students: 1890,
    rating: 4.7,
    is_featured: 1
  },
  {
    id: 3,
    title: 'Digital Marketing Tổng Thể',
    slug: 'digital-marketing-tong-the',
    description: 'Facebook Ads, Google Ads, Email Marketing - Toàn bộ trong 1 khóa học',
    price: 899000,
    original_price: 1400000,
    instructor_id: 1,
    instructor_name: 'Nguyễn Văn An',
    category_id: 2,
    category_name: 'Digital Marketing',
    level: 'intermediate',
    total_lessons: 140,
    total_students: 1560,
    rating: 4.6,
    is_featured: 1
  }
];

const previewReviews = [
  { id: 1, user_name: 'Hoàng Văn Hùng', rating: 5, comment: 'Khóa học rất dễ hiểu và thực tế.' },
  { id: 2, user_name: 'Lê Thị Lan', rating: 5, comment: 'Áp dụng được ngay vào công việc.' },
  { id: 3, user_name: 'Phạm Quốc Huy', rating: 5, comment: 'Nội dung chất lượng, hỗ trợ tốt.' }
];

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString('vi-VN');
}

function formatCurrency(value) {
  return `${formatNumber(Math.round(toNumber(value)))}₫`;
}

function levelLabel(level) {
  if (level === 'beginner') return 'Cơ bản';
  if (level === 'intermediate') return 'Trung cấp';
  if (level === 'advanced') return 'Nâng cao';
  return level || '';
}

function getDisplayJoinDate(createdAt, fallback = '2024') {
  if (!createdAt) return fallback;
  const raw = String(createdAt);
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function getDiscountPercent(price, originalPrice) {
  const p = toNumber(price);
  const op = toNumber(originalPrice);
  if (op <= 0 || op <= p) return 0;
  return Math.round((1 - p / op) * 100);
}

function buildPageItems(currentPage, totalPages) {
  const items = [];
  if (totalPages <= 1) return items;

  const visible = new Set([1, totalPages]);
  for (let p = currentPage - 2; p <= currentPage + 2; p += 1) {
    if (p >= 1 && p <= totalPages) visible.add(p);
  }

  let prev = 0;
  Array.from(visible)
    .sort((a, b) => a - b)
    .forEach((p) => {
      if (prev && p - prev > 1) items.push({ type: 'ellipsis' });
      items.push({ type: 'page', value: p, active: p === currentPage });
      prev = p;
    });

  return items;
}

async function queryOne(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

async function queryAll(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function queryExec(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

async function testDatabaseConnection() {
  await queryOne('SELECT 1 AS ok');
}

async function getCurrentUser(userId) {
  if (PREVIEW_MODE) return null;
  if (!userId) return null;
  return queryOne('SELECT * FROM users WHERE id = ?', [userId]);
}

function baseRenderData(endpoint, extra = {}) {
  return {
    request: { endpoint },
    ...extra
  };
}

function urlFor(name, args = {}) {
  if (name === 'static') {
    const filename = args.filename || '';
    return `/static/${filename}`;
  }
  return routeMap[name] || '#';
}

function getMySqlConfig() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !database) {
    throw new Error('Missing DB_HOST, DB_USER or DB_NAME in .env');
  }

  return {
    host,
    port: Number(process.env.DB_PORT || 3306),
    user,
    password: password || '',
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4'
  };
}

const viewEnv = nunjucks.configure(path.join(__dirname, 'templates'), {
  autoescape: true,
  express: app,
  noCache: process.env.NODE_ENV !== 'production'
});

viewEnv.addGlobal('url_for', urlFor);
viewEnv.addGlobal('range', (start, end) => {
  let from = toNumber(start, 0);
  let to = toNumber(end, 0);

  if (typeof end === 'undefined') {
    to = from;
    from = 0;
  }

  const output = [];
  for (let i = from; i < to; i += 1) {
    output.push(i);
  }
  return output;
});
viewEnv.addFilter('number', (value) => formatNumber(value));
viewEnv.addFilter('currency', (value) => formatCurrency(value));

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.json());
app.use((req, res, next) => {
  if (req.method === 'POST') {
    upload.none()(req, res, next);
    return;
  }
  next();
});

app.use(
  session({
    name: process.env.SESSION_NAME || 'educonnect.sid',
    secret: process.env.SESSION_SECRET || 'change_this_session_secret',
    resave: false,
    saveUninitialized: false,
    proxy: Boolean(rawTrustProxy && rawTrustProxy !== 'false'),
    cookie: {
      maxAge: Number(process.env.SESSION_MAX_AGE || 1000 * 60 * 60 * 24 * 7),
      httpOnly: true,
      secure:
        process.env.COOKIE_SECURE === 'true'
          ? true
          : process.env.COOKIE_SECURE === 'false'
            ? false
            : 'auto',
      sameSite: process.env.COOKIE_SAMESITE || 'lax'
    }
  })
);

app.use(async (req, res, next) => {
  try {
    if (PREVIEW_MODE) {
      req.currentUser = req.session.preview_user || null;
      return next();
    }
    req.currentUser = await getCurrentUser(req.session.user_id);
    next();
  } catch (error) {
    next(error);
  }
});

function loginRequired(req, res, next) {
  if (!req.currentUser) {
    return res.redirect('/');
  }
  return next();
}

const htmlAliasRoutes = {
  '/trang-chu.html': '/',
  '/tat-ca-khoa-hoc.html': '/khoa-hoc',
  '/gioi-thieu.html': '/gioi-thieu',
  '/lien-he.html': '/lien-he',
  '/quen-mat-khau.html': '/quen-mat-khau',
  '/tai-khoan-cua-toi.html': '/tai-khoan'
};

Object.entries(htmlAliasRoutes).forEach(([legacyPath, targetPath]) => {
  app.get(legacyPath, (req, res) => {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(`${targetPath}${query}`);
  });
});

app.get('/', async (req, res, next) => {
  try {
    if (PREVIEW_MODE) {
      const featuredCourses = previewCourses
        .filter((c) => c.is_featured === 1)
        .map((course) => ({
          ...course,
          rating_text: toNumber(course.rating).toFixed(1),
          discount_percent: getDiscountPercent(course.price, course.original_price)
        }));

      return res.render(
        'trang-chu.html',
        baseRenderData('trang_chu', {
          current_user: req.currentUser,
          featured_courses: featuredCourses,
          stats: {
            students: 3200,
            courses: previewCourses.length,
            lessons: 340,
            instructors: previewInstructors.length
          },
          reviews: previewReviews,
          categories: previewCategories,
          categories_top: previewCategories.slice(0, 5)
        })
      );
    }

    const featuredCoursesRaw = await queryAll(
      `SELECT c.*, u.name AS instructor_name, cat.name AS category_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.is_featured = 1
       LIMIT 6`
    );

    const featuredCourses = featuredCoursesRaw.map((course) => ({
      ...course,
      rating_text: toNumber(course.rating).toFixed(1),
      discount_percent: getDiscountPercent(course.price, course.original_price)
    }));

    const usersCount = await queryOne('SELECT COUNT(*) AS total FROM users');
    const coursesCount = await queryOne('SELECT COUNT(*) AS total FROM courses');
    const lessonsCount = await queryOne('SELECT SUM(total_lessons) AS total FROM courses');

    const reviews = await queryAll(
      `SELECT r.*, u.name AS user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC
       LIMIT 6`
    );

    const categories = await queryAll('SELECT * FROM categories');

    res.render(
      'trang-chu.html',
      baseRenderData('trang_chu', {
        current_user: req.currentUser,
        featured_courses: featuredCourses,
        stats: {
          students: toNumber(usersCount?.total) + 2847,
          courses: toNumber(coursesCount?.total),
          lessons: toNumber(lessonsCount?.total),
          instructors: 3
        },
        reviews,
        categories,
        categories_top: categories.slice(0, 5)
      })
    );
  } catch (error) {
    next(error);
  }
});

app.get('/khoa-hoc', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const priceFilter = (req.query.price || '').trim();
    const level = (req.query.level || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = 9;

    if (PREVIEW_MODE) {
      let courses = [...previewCourses];
      if (q) {
        const qn = q.toLowerCase();
        courses = courses.filter((c) => c.title.toLowerCase().includes(qn));
      }
      if (category) {
        courses = courses.filter((c) => previewCategories.find((cat) => cat.id === c.category_id)?.slug === category);
      }
      if (level) {
        courses = courses.filter((c) => c.level === level);
      }
      if (priceFilter === 'free') {
        courses = courses.filter((c) => Number(c.price) === 0);
      } else if (priceFilter === 'paid') {
        courses = courses.filter((c) => Number(c.price) > 0);
      }

      const total = courses.length;
      const totalPages = Math.max(Math.ceil(total / perPage), 1);
      const safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * perPage;

      const paged = courses.slice(offset, offset + perPage).map((course) => ({
        ...course,
        rating_text: toNumber(course.rating).toFixed(1),
        level_label: levelLabel(course.level),
        description_short: String(course.description || '').slice(0, 90),
        has_long_description: String(course.description || '').length > 90,
        discount_percent: getDiscountPercent(course.price, course.original_price)
      }));

      return res.render(
        'tat-ca-khoa-hoc.html',
        baseRenderData('tat_ca_khoa_hoc', {
          current_user: req.currentUser,
          courses: paged,
          categories: previewCategories,
          total,
          page: safePage,
          total_pages: totalPages,
          page_items: buildPageItems(safePage, totalPages),
          q,
          selected_category: category,
          selected_category_name: previewCategories.find((c) => c.slug === category)?.name || category,
          price_filter: priceFilter,
          price_filter_label: priceFilter === 'free' ? 'Miễn phí' : priceFilter === 'paid' ? 'Có phí' : '',
          level,
          level_label: levelLabel(level)
        })
      );
    }

    let baseQuery = `SELECT c.*, u.name AS instructor_name, cat.name AS category_name
                     FROM courses c
                     LEFT JOIN users u ON c.instructor_id = u.id
                     LEFT JOIN categories cat ON c.category_id = cat.id
                     WHERE 1 = 1`;
    const filterParams = [];

    if (q) {
      baseQuery += ' AND c.title LIKE ?';
      filterParams.push(`%${q}%`);
    }
    if (category) {
      baseQuery += ' AND cat.slug = ?';
      filterParams.push(category);
    }
    if (level) {
      baseQuery += ' AND c.level = ?';
      filterParams.push(level);
    }
    if (priceFilter === 'free') {
      baseQuery += ' AND c.price = 0';
    } else if (priceFilter === 'paid') {
      baseQuery += ' AND c.price > 0';
    }

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM (${baseQuery}) t`, filterParams);
    const total = toNumber(totalRow?.total);
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;

    const courseParams = [...filterParams, perPage, offset];
    const courses = await queryAll(`${baseQuery} LIMIT ? OFFSET ?`, courseParams);
    const categories = await queryAll('SELECT * FROM categories');

    const normalizedCourses = courses.map((course) => ({
      ...course,
      rating_text: toNumber(course.rating).toFixed(1),
      level_label: levelLabel(course.level),
      description_short: String(course.description || '').slice(0, 90),
      has_long_description: String(course.description || '').length > 90,
      discount_percent: getDiscountPercent(course.price, course.original_price)
    }));

    res.render(
      'tat-ca-khoa-hoc.html',
      baseRenderData('tat_ca_khoa_hoc', {
        current_user: req.currentUser,
        courses: normalizedCourses,
        categories,
        total,
        page: safePage,
        total_pages: totalPages,
        page_items: buildPageItems(safePage, totalPages),
        q,
        selected_category: category,
        selected_category_name: categories.find((c) => c.slug === category)?.name || category,
        price_filter: priceFilter,
        price_filter_label: priceFilter === 'free' ? 'Miễn phí' : priceFilter === 'paid' ? 'Có phí' : '',
        level,
        level_label: levelLabel(level)
      })
    );
  } catch (error) {
    next(error);
  }
});

app.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json([]);
    }

    if (PREVIEW_MODE) {
      const qn = q.toLowerCase();
      return res.json(previewCourses.filter((c) => c.title.toLowerCase().includes(qn)).slice(0, 5));
    }

    const results = await queryAll(
      `SELECT c.*, u.name AS instructor_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.title LIKE ?
       LIMIT 5`,
      [`%${q}%`]
    );

    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

app.get('/gioi-thieu', async (req, res, next) => {
  try {
    if (PREVIEW_MODE) {
      return res.render(
        'gioi-thieu.html',
        baseRenderData('gioi_thieu', {
          current_user: req.currentUser,
          instructors: previewInstructors
        })
      );
    }

    const instructors = await queryAll('SELECT * FROM users LIMIT 3');
    res.render(
      'gioi-thieu.html',
      baseRenderData('gioi_thieu', {
        current_user: req.currentUser,
        instructors
      })
    );
  } catch (error) {
    next(error);
  }
});

app.get('/lien-he', (req, res) => {
  res.render('lien-he.html', baseRenderData('lien_he', { current_user: req.currentUser }));
});

app.post('/lien-he', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const message = (req.body.message || '').trim();

    if (!name || !email || !message) {
      return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    if (PREVIEW_MODE) {
      return res.json({ success: true, message: 'Đã nhận liên hệ (chế độ xem trước local).' });
    }

    await queryExec('INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)', [name, email, message]);
    return res.json({ success: true, message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim();
    const password = req.body.password || '';

    if (PREVIEW_MODE) {
      if (!email || !password) {
        return res.json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
      }
      const name = email.split('@')[0] || 'Preview User';
      req.session.preview_user = {
        id: 1,
        name,
        email,
        created_at: '2024-01-01 00:00:00'
      };
      return res.json({ success: true, message: `Chào mừng ${name}!` });
    }

    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
    }

    req.session.user_id = user.id;
    req.session.user_name = user.name;

    return res.json({ success: true, message: `Chào mừng ${user.name}!` });
  } catch (error) {
    return next(error);
  }
});

app.post('/register', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const password = req.body.password || '';

    if (!name || !email || !password) {
      return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    if (PREVIEW_MODE) {
      req.session.preview_user = {
        id: 1,
        name,
        email,
        created_at: '2024-01-01 00:00:00'
      };
      return res.json({ success: true, message: `Đăng ký thành công! Chào mừng ${name}!` });
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.json({ success: false, message: 'Email đã được sử dụng.' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = await queryExec('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed]);

    req.session.user_id = result.insertId;
    req.session.user_name = name;

    return res.json({ success: true, message: `Đăng ký thành công! Chào mừng ${name}!` });
  } catch (error) {
    return next(error);
  }
});

app.get('/logout', (req, res) => {
  if (PREVIEW_MODE) {
    delete req.session.preview_user;
    return res.redirect('/');
  }
  req.session.destroy(() => res.redirect('/'));
});

app.get('/quen-mat-khau', (req, res) => {
  res.render('quen-mat-khau.html', baseRenderData('quen_mat_khau', { current_user: req.currentUser }));
});

app.post('/quen-mat-khau', async (req, res, next) => {
  try {
    const step = req.body.step;

    if (PREVIEW_MODE) {
      if (step === '1') return res.json({ success: true, message: 'Mã OTP đã gửi! (Demo: PREVIEW1)', demo_token: 'PREVIEW1' });
      if (step === '2') return res.json({ success: true, message: 'Xác thực thành công!' });
      if (step === '3') return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
      return res.json({ success: false, message: 'Yêu cầu không hợp lệ.' });
    }

    if (step === '1') {
      const email = (req.body.email || '').trim();
      const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        return res.json({ success: false, message: 'Email không tồn tại trong hệ thống.' });
      }

      const token = crypto.randomBytes(4).toString('hex').toUpperCase();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await queryExec('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)', [email, token, expiresAt]);

      return res.json({ success: true, message: `Mã OTP đã gửi! (Demo: ${token})`, demo_token: token });
    }

    if (step === '2') {
      const email = (req.body.email || '').trim();
      const token = (req.body.token || '').trim().toUpperCase();
      const now = new Date();

      const reset = await queryOne(
        `SELECT *
         FROM password_resets
         WHERE email = ? AND token = ? AND used = 0 AND expires_at > ?
         ORDER BY id DESC
         LIMIT 1`,
        [email, token, now]
      );

      if (!reset) {
        return res.json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
      }

      return res.json({ success: true, message: 'Xác thực thành công!' });
    }

    if (step === '3') {
      const email = (req.body.email || '').trim();
      const newPassword = req.body.new_password || '';
      const hashed = bcrypt.hashSync(newPassword, 10);

      await queryExec('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
      await queryExec('UPDATE password_resets SET used = 1 WHERE email = ?', [email]);

      return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    }

    return res.json({ success: false, message: 'Yêu cầu không hợp lệ.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/tai-khoan', loginRequired, async (req, res, next) => {
  try {
    if (PREVIEW_MODE) {
      const user = req.currentUser || {
        id: 1,
        name: 'Preview User',
        email: 'preview@educonnect.vn',
        created_at: '2024-01-01 00:00:00'
      };
      const enrolledCourses = previewCourses.slice(0, 2).map((c, idx) => ({ ...c, progress: idx === 0 ? 35 : 0 }));
      return res.render(
        'tai-khoan-cua-toi.html',
        baseRenderData('tai_khoan', {
          current_user: user,
          user: {
            ...user,
            join_date: getDisplayJoinDate(user?.created_at, '2024')
          },
          enrolled_courses: enrolledCourses
        })
      );
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.session.user_id]);
    const enrolledCourses = await queryAll(
      `SELECT c.*, e.progress, e.enrolled_at, u.name AS instructor_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE e.user_id = ?`,
      [req.session.user_id]
    );

    res.render(
      'tai-khoan-cua-toi.html',
      baseRenderData('tai_khoan', {
        current_user: req.currentUser,
        user: {
          ...user,
          join_date: getDisplayJoinDate(user?.created_at, '2024')
        },
        enrolled_courses: enrolledCourses
      })
    );
  } catch (error) {
    next(error);
  }
});

app.post('/update-profile', loginRequired, async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.json({ success: false, message: 'Tên không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      req.session.preview_user = {
        ...(req.session.preview_user || {}),
        id: 1,
        name,
        email: (req.session.preview_user && req.session.preview_user.email) || 'preview@educonnect.vn',
        created_at: '2024-01-01 00:00:00'
      };
      return res.json({ success: true, message: 'Cập nhật thành công!' });
    }

    await queryExec('UPDATE users SET name = ? WHERE id = ?', [name, req.session.user_id]);
    req.session.user_name = name;

    return res.json({ success: true, message: 'Cập nhật thành công!' });
  } catch (error) {
    return next(error);
  }
});

app.post('/enroll/:courseId', loginRequired, async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    if (!Number.isInteger(courseId)) {
      return res.json({ success: false, message: 'Khóa học không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      return res.json({ success: true, message: 'Đăng ký thành công! (chế độ xem trước local)' });
    }

    const existing = await queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [
      req.session.user_id,
      courseId
    ]);

    if (existing) {
      return res.json({ success: false, message: 'Bạn đã đăng ký khóa học này rồi.' });
    }

    await queryExec('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [req.session.user_id, courseId]);
    await queryExec('UPDATE courses SET total_students = total_students + 1 WHERE id = ?', [courseId]);

    return res.json({ success: true, message: 'Đăng ký thành công!' });
  } catch (error) {
    return next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);

  if (
    req.path.startsWith('/login') ||
    req.path.startsWith('/register') ||
    req.path.startsWith('/lien-he') ||
    req.path.startsWith('/quen-mat-khau') ||
    req.path.startsWith('/enroll') ||
    req.path.startsWith('/update-profile')
  ) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại.' });
  }

  return res.status(500).send('Có lỗi xảy ra trên máy chủ.');
});

(async () => {
  try {
    if (NODE_ENV === 'production' && !process.env.SESSION_SECRET && !PREVIEW_MODE) {
      throw new Error('Missing SESSION_SECRET in production environment');
    }

    if (PREVIEW_MODE) {
      if (!hasRequiredDbEnv) {
        console.warn('DB env is missing, server is running in PREVIEW_MODE.');
      }
      app.listen(PORT, () => {
        console.log(`EduConnect preview mode at http://127.0.0.1:${PORT}`);
      });
      return;
    }

    pool = mysql.createPool(getMySqlConfig());
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`EduConnect server running at http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Cannot start server:', error.message);
    process.exit(1);
  }
})();
