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
  logout: '/logout',
  admin_login: '/admin/login',
  admin_dashboard: '/admin/dashboard',
  admin_courses: '/admin/courses',
  admin_users: '/admin/users',
  admin_categories: '/admin/categories',
  admin_contacts: '/admin/contacts',
  admin_logout: '/admin/logout'
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

const previewUsers = [
  ...previewInstructors,
  { id: 4, name: 'Ngô Hải Yến', email: 'yen.ngo@educonnect.vn', created_at: '2024-02-02 09:10:00' },
  { id: 5, name: 'Đỗ Minh Đức', email: 'duc.do@educonnect.vn', created_at: '2024-02-14 11:40:00' }
];

const previewEnrollments = [
  { id: 1, user_id: 4, course_id: 1, enrolled_at: '2024-03-05 09:00:00', progress: 40 },
  { id: 2, user_id: 4, course_id: 2, enrolled_at: '2024-03-08 12:30:00', progress: 15 },
  { id: 3, user_id: 5, course_id: 3, enrolled_at: '2024-03-16 17:20:00', progress: 55 }
];

const previewContacts = [
  {
    id: 1,
    name: 'Nguyễn Hữu Khang',
    email: 'khang.nguyen@gmail.com',
    message: 'Mình cần tư vấn khóa SEO cho người mới bắt đầu.',
    created_at: '2024-03-18 08:45:00'
  },
  {
    id: 2,
    name: 'Lê Trang',
    email: 'trang.le@gmail.com',
    message: 'Website học có hỗ trợ học trên điện thoại không?',
    created_at: '2024-03-22 15:05:00'
  }
];

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@educonnect.vn';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function paginateList(list, page = 1, perPage = 10) {
  const total = list.length;
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: list.slice(start, start + perPage),
    total,
    page: safePage,
    totalPages
  };
}

function pushAdminFlash(req, type, message) {
  req.session.admin_flash_messages = req.session.admin_flash_messages || [];
  req.session.admin_flash_messages.push([type, message]);
}

function popAdminFlash(req) {
  const messages = req.session.admin_flash_messages || [];
  delete req.session.admin_flash_messages;
  return messages;
}

function ensureAdmin(req, res, next) {
  if (!req.session.admin_user) {
    return res.redirect('/admin/login');
  }
  return next();
}

async function getContactCount() {
  if (PREVIEW_MODE) {
    return previewContacts.length;
  }
  const row = await queryOne('SELECT COUNT(*) AS total FROM contacts');
  return toNumber(row?.total);
}

async function adminRenderData(req, endpoint, extra = {}) {
  const adminUserName = req.session.admin_user?.name || 'Admin';
  const contactCount = await getContactCount();
  return baseRenderData(endpoint, {
    admin_user_name: adminUserName,
    flash_messages: popAdminFlash(req),
    contact_count: contactCount,
    ...extra
  });
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
viewEnv.addFilter('slice_text', (value, start, end) => String(value || '').slice(toNumber(start), toNumber(end)));

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    
    // ĐÃ SỬA LỖI Ở ĐÂY: Xử lý trường hợp người dùng nhập chữ vào số trang (tránh ra NaN)
    let parsedPage = parseInt(req.query.page, 10);
    const page = isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1);
    
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

// =========================================================
// !!! CÁC ROUTE PHÍA DƯỚI (/search, /gioi-thieu, /login...) 
// BẠN VẪN GIỮ NGUYÊN NHƯ FILE GỐC, KHÔNG CẦN CHỈNH SỬA !!!
// =========================================================

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

app.get('/admin', (req, res) => {
  if (!req.session.admin_user) {
    return res.redirect('/admin/login');
  }
  return res.redirect('/admin/dashboard');
});

// Static admin pages - serve HTML files
app.get('/admin/login', (req, res) => {
  if (req.session.admin_user) {
    return res.redirect('/admin/dashboard');
  }
  return res.sendFile(path.join(__dirname, 'templates/admin/login.html'));
});

app.get('/admin/login.html', (req, res) => {
  if (req.session.admin_user) {
    return res.redirect('/admin/dashboard');
  }
  return res.sendFile(path.join(__dirname, 'templates/admin/login.html'));
});

app.post('/admin/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (email !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return res.json({success: false, message: 'Email hoặc mật khẩu không đúng.'});
  }

  req.session.admin_user = {
    name: 'Admin',
    email: ADMIN_EMAIL
  };
  return res.json({success: true, message: 'Đăng nhập thành công'});
});

app.get('/admin/logout', (req, res) => {
  delete req.session.admin_user;
  return res.redirect('/admin/login');
});

// API endpoints for admin static pages
app.get('/api/admin/dashboard', ensureAdmin, async (req, res, next) => {
  try {
    if (PREVIEW_MODE) {
      const monthlyMap = new Map();
      previewEnrollments.forEach((e) => {
        const month = String(e.enrolled_at || '').slice(0, 7);
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
      });

      const monthly = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({
          month,
          count,
          month_label: `${String(month).slice(5, 7)}/${String(month).slice(2, 4)}`
        }));
      const maxMonthCount = Math.max(1, ...monthly.map((row) => toNumber(row.count)));

      const topCourses = previewCourses
        .slice()
        .sort((a, b) => toNumber(b.total_students) - toNumber(a.total_students))
        .slice(0, 5);

      const recentEnrolls = previewEnrollments
        .slice()
        .sort((a, b) => String(b.enrolled_at).localeCompare(String(a.enrolled_at)))
        .slice(0, 10)
        .map((e) => {
          const user = previewUsers.find((u) => u.id === e.user_id) || {};
          const course = previewCourses.find((c) => c.id === e.course_id) || {};
          return {
            ...e,
            user_name: user.name || '—',
            user_email: user.email || '—',
            course_title: course.title || '—',
            price: toNumber(course.price)
          };
        });

      const stats = {
        total_users: previewUsers.length,
        new_users_week: 2,
        total_courses: previewCourses.length,
        total_enrolls: previewEnrollments.length,
        total_revenue: previewEnrollments.reduce((sum, e) => {
          const course = previewCourses.find((c) => c.id === e.course_id);
          return sum + toNumber(course?.price);
        }, 0)
      };

      return res.json({
        success: true,
        stats: {
          total_users: previewUsers.length,
          total_courses: previewCourses.length,
          total_enrollments: previewEnrollments.length,
          total_revenue: previewEnrollments.reduce((sum, e) => {
            const course = previewCourses.find((c) => c.id === e.course_id);
            return sum + toNumber(course?.price);
          }, 0)
        },
        top_courses: topCourses,
        recent_enrollments: recentEnrolls,
        contact_count: previewContacts.length,
        user_name: req.session.admin_user?.name || 'Admin'
      });
    }

    const [usersCount, coursesCount, enrollCount, revenueRow, topCourses, recentEnrolls, monthlyRows, contactCount] = await Promise.all([
      queryOne('SELECT COUNT(*) AS total FROM users'),
      queryOne('SELECT COUNT(*) AS total FROM courses'),
      queryOne('SELECT COUNT(*) AS total FROM enrollments'),
      queryOne('SELECT COALESCE(SUM(c.price), 0) AS total FROM enrollments e JOIN courses c ON c.id = e.course_id'),
      queryAll(
        `SELECT c.*, cat.name AS category_name, u.name AS instructor_name
         FROM courses c
         LEFT JOIN categories cat ON cat.id = c.category_id
         LEFT JOIN users u ON u.id = c.instructor_id
         ORDER BY c.total_students DESC, c.id DESC
         LIMIT 5`
      ),
      queryAll(
        `SELECT e.id, e.enrolled_at, u.name AS user_name, u.email AS user_email, c.title AS course_title, c.price
         FROM enrollments e
         JOIN users u ON u.id = e.user_id
         JOIN courses c ON c.id = e.course_id
         ORDER BY e.enrolled_at DESC, e.id DESC
         LIMIT 10`
      ),
      queryAll(
        `SELECT DATE_FORMAT(enrolled_at, '%Y-%m') AS month, COUNT(*) AS count
         FROM enrollments
         GROUP BY DATE_FORMAT(enrolled_at, '%Y-%m')
         ORDER BY month ASC
         LIMIT 12`
      ),
      queryOne('SELECT COUNT(*) AS total FROM contacts')
    ]);

    return res.json({
      success: true,
      stats: {
        total_users: toNumber(usersCount?.total),
        total_courses: toNumber(coursesCount?.total),
        total_enrollments: toNumber(enrollCount?.total),
        total_revenue: toNumber(revenueRow?.total)
      },
      top_courses: topCourses,
      recent_enrollments: recentEnrolls,
      contact_count: toNumber(contactCount?.total),
      user_name: req.session.admin_user?.name || 'Admin'
    });
  } catch (error) {
    return next(error);
  }
});

// Serve admin dashboard HTML
app.get('/admin/dashboard', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/dashboard.html'));
});

app.get('/admin/dashboard.html', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/dashboard.html'));
});

app.get('/admin/users', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/users.html'));
});

app.get('/admin/users.html', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/users.html'));
});

app.get('/api/admin/users', ensureAdmin, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = 10;

    if (PREVIEW_MODE) {
      const enriched = previewUsers.map((u) => ({
        ...u,
        enroll_count: previewEnrollments.filter((e) => e.user_id === u.id).length
      }));

      const filtered = q
        ? enriched.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        : enriched;

      const pager = paginateList(filtered, page, perPage);
      return res.json({
        success: true,
        users: pager.items,
        total: pager.total,
        page: pager.page,
        total_pages: pager.totalPages
      });
    }

    let whereSql = '';
    const params = [];
    if (q) {
      whereSql = ' WHERE LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? ';
      params.push(`%${q}%`, `%${q}%`);
    }

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
    const total = toNumber(totalRow?.total);
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;

    const users = await queryAll(
      `SELECT u.*, COUNT(e.id) AS enroll_count
       FROM users u
       LEFT JOIN enrollments e ON e.user_id = u.id
       ${whereSql}
       GROUP BY u.id
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    return res.json({
      success: true,
      users,
      total,
      page: safePage,
      total_pages: totalPages
    });
  } catch (error) {
    return next(error);
  }
});


app.get('/admin/users/get/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const user = previewUsers.find((u) => u.id === id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
      }
      const enrollments = previewEnrollments
        .filter((e) => e.user_id === id)
        .map((e) => ({ ...e, title: previewCourses.find((c) => c.id === e.course_id)?.title || '—' }));
      return res.json({ success: true, user, enrollments });
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
    }

    const enrollments = await queryAll(
      `SELECT e.*, c.title
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC, e.id DESC`,
      [id]
    );

    return res.json({ success: true, user, enrollments });
  } catch (error) {
    return next(error);
  }
});

app.post('/admin/users/delete/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const userIdx = previewUsers.findIndex((u) => u.id === id);
      if (userIdx === -1) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
      }
      previewUsers.splice(userIdx, 1);
      for (let i = previewEnrollments.length - 1; i >= 0; i -= 1) {
        if (previewEnrollments[i].user_id === id) previewEnrollments.splice(i, 1);
      }
      return res.json({ success: true, message: 'Đã xóa học viên.' });
    }

    const result = await queryExec('DELETE FROM users WHERE id = ?', [id]);
    if (toNumber(result.affectedRows) < 1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
    }
    return res.json({ success: true, message: 'Đã xóa học viên.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/admin/categories', ensureAdmin, async (req, res, next) => {
  try {
    if (PREVIEW_MODE) {
      const categories = previewCategories.map((cat) => ({
        ...cat,
        course_count: previewCourses.filter((c) => c.category_id === cat.id).length
      }));
      return res.render('admin/categories.html', await adminRenderData(req, 'admin_categories', { categories }));
    }

    const categories = await queryAll(
      `SELECT cat.*, COUNT(c.id) AS course_count
       FROM categories cat
       LEFT JOIN courses c ON c.category_id = cat.id
       GROUP BY cat.id
       ORDER BY cat.id DESC`
    );

    return res.render('admin/categories.html', await adminRenderData(req, 'admin_categories', { categories }));
  } catch (error) {
    return next(error);
  }
});

app.post('/admin/categories/add', ensureAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.json({ success: false, message: 'Vui lòng nhập tên danh mục.' });
    }

    if (PREVIEW_MODE) {
      const slugBase = slugify(name) || `danh-muc-${Date.now()}`;
      let slug = slugBase;
      let idx = 1;
      while (previewCategories.some((cat) => cat.slug === slug)) {
        idx += 1;
        slug = `${slugBase}-${idx}`;
      }
      const id = Math.max(0, ...previewCategories.map((c) => c.id)) + 1;
      previewCategories.push({ id, name, slug });
      return res.json({ success: true, message: 'Đã thêm danh mục.' });
    }

    const slugBase = slugify(name) || `danh-muc-${Date.now()}`;
    let slug = slugBase;
    let idx = 1;
    while (await queryOne('SELECT id FROM categories WHERE slug = ?', [slug])) {
      idx += 1;
      slug = `${slugBase}-${idx}`;
    }

    await queryExec('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    return res.json({ success: true, message: 'Đã thêm danh mục.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/admin/categories/edit/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const name = String(req.body.name || '').trim();
    if (!Number.isInteger(id) || !name) {
      return res.json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const category = previewCategories.find((cat) => cat.id === id);
      if (!category) return res.json({ success: false, message: 'Không tìm thấy danh mục.' });
      category.name = name;
      category.slug = slugify(name) || category.slug;
      return res.json({ success: true, message: 'Đã cập nhật danh mục.' });
    }

    const category = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) return res.json({ success: false, message: 'Không tìm thấy danh mục.' });

    const slugBase = slugify(name) || category.slug;
    let slug = slugBase;
    let idx = 1;
    while (await queryOne('SELECT id FROM categories WHERE slug = ? AND id <> ?', [slug, id])) {
      idx += 1;
      slug = `${slugBase}-${idx}`;
    }

    await queryExec('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
    return res.json({ success: true, message: 'Đã cập nhật danh mục.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/admin/categories/delete/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      if (previewCourses.some((c) => c.category_id === id)) {
        return res.json({ success: false, message: 'Danh mục đang có khóa học, không thể xóa.' });
      }
      const idx = previewCategories.findIndex((cat) => cat.id === id);
      if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy danh mục.' });
      previewCategories.splice(idx, 1);
      return res.json({ success: true, message: 'Đã xóa danh mục.' });
    }

    const hasCourse = await queryOne('SELECT id FROM courses WHERE category_id = ? LIMIT 1', [id]);
    if (hasCourse) {
      return res.json({ success: false, message: 'Danh mục đang có khóa học, không thể xóa.' });
    }

    const result = await queryExec('DELETE FROM categories WHERE id = ?', [id]);
    if (toNumber(result.affectedRows) < 1) {
      return res.json({ success: false, message: 'Không tìm thấy danh mục.' });
    }

    return res.json({ success: true, message: 'Đã xóa danh mục.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/admin/courses', ensureAdmin, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = 10;

    if (PREVIEW_MODE) {
      const filtered = q
        ? previewCourses.filter((c) => c.title.toLowerCase().includes(q))
        : previewCourses.slice();
      const pager = paginateList(filtered, page, perPage);
      return res.render(
        'admin/courses.html',
        await adminRenderData(req, 'admin_courses', {
          courses: pager.items,
          total: pager.total,
          page: pager.page,
          total_pages: pager.totalPages,
          q,
          categories: previewCategories,
          instructors: previewInstructors
        })
      );
    }

    let where = '';
    const params = [];
    if (q) {
      where = ' WHERE LOWER(c.title) LIKE ? ';
      params.push(`%${q}%`);
    }

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM courses c ${where}`, params);
    const total = toNumber(totalRow?.total);
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;

    const courses = await queryAll(
      `SELECT c.*, cat.name AS category_name, u.name AS instructor_name
       FROM courses c
       LEFT JOIN categories cat ON cat.id = c.category_id
       LEFT JOIN users u ON u.id = c.instructor_id
       ${where}
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    const [categories, instructors] = await Promise.all([
      queryAll('SELECT * FROM categories ORDER BY name ASC'),
      queryAll('SELECT id, name FROM users ORDER BY name ASC')
    ]);

    return res.render(
      'admin/courses.html',
      await adminRenderData(req, 'admin_courses', {
        courses,
        total,
        page: safePage,
        total_pages: totalPages,
        q,
        categories,
        instructors
      })
    );
  } catch (error) {
    return next(error);
  }
});

app.get('/admin/courses/get/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });

    if (PREVIEW_MODE) {
      const course = previewCourses.find((c) => c.id === id);
      if (!course) return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
      return res.json(course);
    }

    const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);
    if (!course) return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
    return res.json(course);
  } catch (error) {
    return next(error);
  }
});

app.post('/admin/courses/add', ensureAdmin, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.json({ success: false, message: 'Vui lòng nhập tên khóa học.' });
    }

    const payload = {
      title,
      description: String(req.body.description || '').trim(),
      price: toNumber(req.body.price),
      original_price: toNumber(req.body.original_price),
      instructor_id: req.body.instructor_id ? toNumber(req.body.instructor_id) : null,
      category_id: req.body.category_id ? toNumber(req.body.category_id) : null,
      level: String(req.body.level || 'beginner'),
      duration: String(req.body.duration || '0 giờ').trim(),
      total_lessons: toNumber(req.body.total_lessons),
      is_featured: toNumber(req.body.is_featured) ? 1 : 0
    };

    if (PREVIEW_MODE) {
      const slugBase = slugify(title) || `khoa-hoc-${Date.now()}`;
      let slug = slugBase;
      let idx = 1;
      while (previewCourses.some((c) => c.slug === slug)) {
        idx += 1;
        slug = `${slugBase}-${idx}`;
      }

      const newId = Math.max(0, ...previewCourses.map((c) => c.id)) + 1;
      const instructor = previewInstructors.find((i) => i.id === payload.instructor_id);
      const category = previewCategories.find((c) => c.id === payload.category_id);

      previewCourses.push({
        id: newId,
        slug,
        rating: 0,
        total_students: 0,
        image: null,
        instructor_name: instructor?.name || '—',
        category_name: category?.name || '—',
        ...payload
      });
      return res.json({ success: true, message: 'Đã thêm khóa học.' });
    }

    const slugBase = slugify(title) || `khoa-hoc-${Date.now()}`;
    let slug = slugBase;
    let idx = 1;
    while (await queryOne('SELECT id FROM courses WHERE slug = ?', [slug])) {
      idx += 1;
      slug = `${slugBase}-${idx}`;
    }

    await queryExec(
      `INSERT INTO courses
      (title, slug, description, price, original_price, instructor_id, category_id, level, duration, total_lessons, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        slug,
        payload.description,
        payload.price,
        payload.original_price,
        payload.instructor_id,
        payload.category_id,
        payload.level,
        payload.duration,
        payload.total_lessons,
        payload.is_featured
      ]
    );

    return res.json({ success: true, message: 'Đã thêm khóa học.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/admin/courses/edit/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.json({ success: false, message: 'Vui lòng nhập tên khóa học.' });
    }

    const payload = {
      title,
      description: String(req.body.description || '').trim(),
      price: toNumber(req.body.price),
      original_price: toNumber(req.body.original_price),
      instructor_id: req.body.instructor_id ? toNumber(req.body.instructor_id) : null,
      category_id: req.body.category_id ? toNumber(req.body.category_id) : null,
      level: String(req.body.level || 'beginner'),
      duration: String(req.body.duration || '0 giờ').trim(),
      total_lessons: toNumber(req.body.total_lessons),
      is_featured: toNumber(req.body.is_featured) ? 1 : 0
    };

    if (PREVIEW_MODE) {
      const course = previewCourses.find((c) => c.id === id);
      if (!course) return res.json({ success: false, message: 'Không tìm thấy khóa học.' });
      const instructor = previewInstructors.find((i) => i.id === payload.instructor_id);
      const category = previewCategories.find((c) => c.id === payload.category_id);
      Object.assign(course, payload, {
        slug: slugify(payload.title) || course.slug,
        instructor_name: instructor?.name || '—',
        category_name: category?.name || '—'
      });
      return res.json({ success: true, message: 'Đã cập nhật khóa học.' });
    }

    const current = await queryOne('SELECT slug FROM courses WHERE id = ?', [id]);
    if (!current) return res.json({ success: false, message: 'Không tìm thấy khóa học.' });

    const slugBase = slugify(title) || current.slug;
    let slug = slugBase;
    let idx = 1;
    while (await queryOne('SELECT id FROM courses WHERE slug = ? AND id <> ?', [slug, id])) {
      idx += 1;
      slug = `${slugBase}-${idx}`;
    }

    await queryExec(
      `UPDATE courses
       SET title = ?, slug = ?, description = ?, price = ?, original_price = ?,
           instructor_id = ?, category_id = ?, level = ?, duration = ?, total_lessons = ?, is_featured = ?
       WHERE id = ?`,
      [
        payload.title,
        slug,
        payload.description,
        payload.price,
        payload.original_price,
        payload.instructor_id,
        payload.category_id,
        payload.level,
        payload.duration,
        payload.total_lessons,
        payload.is_featured,
        id
      ]
    );

    return res.json({ success: true, message: 'Đã cập nhật khóa học.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/admin/courses/delete/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const idx = previewCourses.findIndex((c) => c.id === id);
      if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy khóa học.' });
      previewCourses.splice(idx, 1);
      for (let i = previewEnrollments.length - 1; i >= 0; i -= 1) {
        if (previewEnrollments[i].course_id === id) previewEnrollments.splice(i, 1);
      }
      return res.json({ success: true, message: 'Đã xóa khóa học.' });
    }

    const result = await queryExec('DELETE FROM courses WHERE id = ?', [id]);
    if (toNumber(result.affectedRows) < 1) {
      return res.json({ success: false, message: 'Không tìm thấy khóa học.' });
    }
    return res.json({ success: true, message: 'Đã xóa khóa học.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/admin/contacts', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/contacts.html'));
});

app.get('/api/admin/contacts', ensureAdmin, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = 10;

    if (PREVIEW_MODE) {
      const sorted = previewContacts.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const pager = paginateList(sorted, page, perPage);
      return res.json({
        success: true,
        contacts: pager.items,
        total: pager.total,
        page: pager.page,
        total_pages: pager.totalPages
      });
    }

    const totalRow = await queryOne('SELECT COUNT(*) AS total FROM contacts');
    const total = toNumber(totalRow?.total);
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;

    const contacts = await queryAll('SELECT * FROM contacts ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?', [
      perPage,
      offset
    ]);

    return res.json({
      success: true,
      contacts,
      total,
      page: safePage,
      total_pages: totalPages
    });
  } catch (error) {
    return next(error);
  }
});

// Routes for static HTML admin pages
app.get('/admin/categories', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/categories.html'));
});

app.get('/admin/categories.html', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/categories.html'));
});

app.get('/admin/courses', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/courses.html'));
});

app.get('/admin/courses.html', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/courses.html'));
});

app.get('/admin/contacts', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/contacts.html'));
});

app.get('/admin/contacts.html', ensureAdmin, (req, res) => {
  return res.sendFile(path.join(__dirname, 'templates/admin/contacts.html'));
});

// API endpoints for static pages
app.get('/api/admin/categories', ensureAdmin, async (req, res, next) => {
  try {
    if (PREVIEW_MODE) {
      const categories = previewCategories.map((cat) => ({
        ...cat,
        course_count: previewCourses.filter((c) => c.category_id === cat.id).length
      }));
      return res.json({ success: true, total: categories.length, categories });
    }

    const categories = await queryAll(
      `SELECT cat.*, COUNT(c.id) AS course_count
       FROM categories cat
       LEFT JOIN courses c ON c.category_id = cat.id
       GROUP BY cat.id
       ORDER BY cat.id DESC`
    );

    return res.json({ success: true, total: categories.length, categories });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/categories/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const cat = previewCategories.find((c) => c.id === id);
      return res.json({ success: !!cat, category: cat });
    }

    const cat = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    return res.json({ success: !!cat, category: cat });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/categories', ensureAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.json({ success: false, message: 'Vui lòng nhập tên danh mục.' });
    }

    if (PREVIEW_MODE) {
      const slugBase = slugify(name) || `danh-muc-${Date.now()}`;
      let slug = slugBase;
      let idx = 1;
      while (previewCategories.some((cat) => cat.slug === slug)) {
        idx += 1;
        slug = `${slugBase}-${idx}`;
      }
      const newCat = { id: Math.max(...previewCategories.map((c) => c.id), 0) + 1, name, slug };
      previewCategories.push(newCat);
      return res.json({ success: true, message: 'Đã thêm danh mục.', category: newCat });
    }

    const slug = slugify(name);
    const result = await queryExec('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    return res.json({ success: true, message: 'Đã thêm danh mục.', id: result.insertId });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/admin/categories/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const name = String(req.body.name || '').trim();
    if (!Number.isInteger(id) || !name) {
      return res.json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const cat = previewCategories.find((c) => c.id === id);
      if (!cat) return res.json({ success: false, message: 'Không tìm thấy danh mục.' });
      cat.name = name;
      cat.slug = slugify(name);
      return res.json({ success: true, message: 'Đã cập nhật danh mục.' });
    }

    await queryExec('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slugify(name), id]);
    return res.json({ success: true, message: 'Đã cập nhật danh mục.' });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/admin/categories/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const idx = previewCategories.findIndex((c) => c.id === id);
      if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy danh mục.' });
      previewCategories.splice(idx, 1);
      return res.json({ success: true, message: 'Đã xóa danh mục.' });
    }

    await queryExec('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Đã xóa danh mục.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/users/get/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const user = previewUsers.find((u) => u.id === id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
      }
      const enrollments = previewEnrollments
        .filter((e) => e.user_id === id)
        .map((e) => ({ ...e, title: previewCourses.find((c) => c.id === e.course_id)?.title || '—' }));
      return res.json({ success: true, user, enrollments });
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
    }

    const enrollments = await queryAll(
      `SELECT e.*, c.title
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC, e.id DESC`,
      [id]
    );

    return res.json({ success: true, user, enrollments });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/users/delete/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const userIdx = previewUsers.findIndex((u) => u.id === id);
      if (userIdx === -1) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
      }
      previewUsers.splice(userIdx, 1);
      for (let i = previewEnrollments.length - 1; i >= 0; i -= 1) {
        if (previewEnrollments[i].user_id === id) previewEnrollments.splice(i, 1);
      }
      return res.json({ success: true, message: 'Đã xóa học viên.' });
    }

    const result = await queryExec('DELETE FROM users WHERE id = ?', [id]);
    if (toNumber(result.affectedRows) < 1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
    }
    return res.json({ success: true, message: 'Đã xóa học viên.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/courses', ensureAdmin, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = 10;

    if (PREVIEW_MODE) {
      const enriched = previewCourses.map((c) => ({
        ...c,
        category_name: previewCategories.find((cat) => cat.id === c.category_id)?.name || 'N/A',
        enroll_count: previewEnrollments.filter((e) => e.course_id === c.id).length
      }));

      const filtered = q ? enriched.filter((c) => c.title.toLowerCase().includes(q)) : enriched;
      const pager = paginateList(filtered, page, perPage);
      return res.json({
        success: true,
        courses: pager.items,
        total: pager.total,
        page: pager.page,
        total_pages: pager.totalPages
      });
    }

    let whereSql = '';
    const params = [];
    if (q) {
      whereSql = ' WHERE LOWER(c.title) LIKE ? ';
      params.push(`%${q}%`);
    }

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM courses c ${whereSql}`, params);
    const total = toNumber(totalRow?.total);
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;

    const courses = await queryAll(
      `SELECT c.*, cat.name AS category_name, COUNT(e.id) AS enroll_count
       FROM courses c
       LEFT JOIN categories cat ON cat.id = c.category_id
       LEFT JOIN enrollments e ON e.course_id = c.id
       ${whereSql}
       GROUP BY c.id
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    return res.json({
      success: true,
      courses,
      total,
      page: safePage,
      total_pages: totalPages
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/courses/get/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const course = previewCourses.find((c) => c.id === id);
      return res.json({ success: !!course, course });
    }

    const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);
    return res.json({ success: !!course, course });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/courses', ensureAdmin, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.json({ success: false, message: 'Vui lòng nhập tên khóa học.' });
    }

    if (PREVIEW_MODE) {
      const newCourse = {
        id: Math.max(...previewCourses.map((c) => c.id), 0) + 1,
        title,
        category_id: req.body.category_id,
        price: req.body.price || 0,
        description: req.body.description || ''
      };
      previewCourses.push(newCourse);
      return res.json({ success: true, message: 'Đã thêm khóa học.', course: newCourse });
    }

    const result = await queryExec(
      'INSERT INTO courses (title, category_id, price, description) VALUES (?, ?, ?, ?)',
      [title, req.body.category_id || null, req.body.price || 0, req.body.description || '']
    );
    return res.json({ success: true, message: 'Đã thêm khóa học.', id: result.insertId });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/admin/courses/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const title = String(req.body.title || '').trim();
    if (!Number.isInteger(id) || !title) {
      return res.json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const course = previewCourses.find((c) => c.id === id);
      if (!course) return res.json({ success: false, message: 'Không tìm thấy khóa học.' });
      course.title = title;
      course.category_id = req.body.category_id;
      course.price = req.body.price || 0;
      course.description = req.body.description || '';
      return res.json({ success: true, message: 'Đã cập nhật khóa học.' });
    }

    await queryExec(
      'UPDATE courses SET title = ?, category_id = ?, price = ?, description = ? WHERE id = ?',
      [title, req.body.category_id || null, req.body.price || 0, req.body.description || '', id]
    );
    return res.json({ success: true, message: 'Đã cập nhật khóa học.' });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/admin/courses/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const idx = previewCourses.findIndex((c) => c.id === id);
      if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy khóa học.' });
      previewCourses.splice(idx, 1);
      return res.json({ success: true, message: 'Đã xóa khóa học.' });
    }

    await queryExec('DELETE FROM courses WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Đã xóa khóa học.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/contacts', ensureAdmin, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const perPage = 10;

    if (PREVIEW_MODE) {
      const pager = paginateList(previewContacts, page, perPage);
      return res.json({
        success: true,
        contacts: pager.items,
        total: pager.total,
        page: pager.page,
        total_pages: pager.totalPages
      });
    }

    const totalRow = await queryOne('SELECT COUNT(*) AS total FROM contacts');
    const total = toNumber(totalRow?.total);
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;

    const contacts = await queryAll(
      'SELECT * FROM contacts ORDER BY id DESC LIMIT ? OFFSET ?',
      [perPage, offset]
    );

    return res.json({
      success: true,
      contacts,
      total,
      page: safePage,
      total_pages: totalPages
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/contacts/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const contact = previewContacts.find((c) => c.id === id);
      return res.json({ success: !!contact, contact });
    }

    const contact = await queryOne('SELECT * FROM contacts WHERE id = ?', [id]);
    return res.json({ success: !!contact, contact });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/admin/contacts/:id', ensureAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.json({ success: false, message: 'ID không hợp lệ.' });
    }

    if (PREVIEW_MODE) {
      const idx = previewContacts.findIndex((c) => c.id === id);
      if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy liên hệ.' });
      previewContacts.splice(idx, 1);
      return res.json({ success: true, message: 'Đã xóa liên hệ.' });
    }

    const result = await queryExec('DELETE FROM contacts WHERE id = ?', [id]);
    if (toNumber(result.affectedRows) < 1) {
      return res.json({ success: false, message: 'Không tìm thấy liên hệ.' });
    }
    return res.json({ success: true, message: 'Đã xóa liên hệ.' });
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
