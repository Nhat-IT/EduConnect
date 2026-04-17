-- EduConnect Database Schema
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price REAL DEFAULT 0,
    original_price REAL DEFAULT 0,
    image TEXT DEFAULT NULL,
    instructor_id INTEGER,
    category_id INTEGER,
    level TEXT DEFAULT 'beginner',
    duration TEXT DEFAULT '0 giờ',
    total_lessons INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    video_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    order_num INTEGER DEFAULT 0,
    is_free INTEGER DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0,
    UNIQUE(user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0
);

-- Seed data
INSERT INTO categories (name, slug) VALUES
('Lập Trình Web', 'lap-trinh-web'),
('Digital Marketing', 'digital-marketing'),
('SEO', 'seo'),
('Thiết Kế', 'thiet-ke'),
('Kinh Doanh Online', 'kinh-doanh-online'),
('Tiếp Thị Liên Kết', 'tiep-thi-lien-ket');

-- Instructor accounts (password: 123456 - hashed with werkzeug)
INSERT INTO users (name, email, password, avatar) VALUES
('Nguyễn Văn An', 'an.nguyen@educonnect.vn', 'scrypt:32768:8:1$iPjysbuGC5TaZAHH$daae1cb180b7addfb212492364ac153f6c2ebfb3954d2f95e56b5c0a7e437e702143542485d327c08250efb2fa05e46529987b8c4a31cc6a1a1427aa806812e5', NULL),
('Trần Thị Bình', 'binh.tran@educonnect.vn', 'scrypt:32768:8:1$iPjysbuGC5TaZAHH$daae1cb180b7addfb212492364ac153f6c2ebfb3954d2f95e56b5c0a7e437e702143542485d327c08250efb2fa05e46529987b8c4a31cc6a1a1427aa806812e5', NULL),
('Lê Minh Cường', 'cuong.le@educonnect.vn', 'scrypt:32768:8:1$iPjysbuGC5TaZAHH$daae1cb180b7addfb212492364ac153f6c2ebfb3954d2f95e56b5c0a7e437e702143542485d327c08250efb2fa05e46529987b8c4a31cc6a1a1427aa806812e5', NULL);

-- Sample courses
INSERT INTO courses (title, slug, description, price, original_price, instructor_id, category_id, level, duration, total_lessons, total_students, rating, is_featured) VALUES
('Lập Trình Web Từ Zero Đến Hero', 'lap-trinh-web-zero-hero', 'Khóa học toàn diện từ HTML, CSS, JavaScript đến React và Node.js', 799000, 1200000, 1, 1, 'beginner', '40 giờ', 120, 2340, 4.8, 1),
('SEO Thực Chiến 2024', 'seo-thuc-chien-2024', 'Học SEO từ cơ bản đến nâng cao, tối ưu website lên top Google', 599000, 900000, 2, 3, 'intermediate', '25 giờ', 80, 1890, 4.7, 1),
('Tiếp Thị Liên Kết Từ Tế', 'tiep-thi-lien-ket-tu-te', 'Kiếm tiền thụ động với Affiliate Marketing - Hướng dẫn chi tiết A-Z', 699000, 1000000, 3, 6, 'beginner', '30 giờ', 95, 3120, 4.9, 1),
('Digital Marketing Tổng Thể', 'digital-marketing-tong-the', 'Facebook Ads, Google Ads, Email Marketing - Toàn bộ trong 1 khóa học', 899000, 1400000, 1, 2, 'intermediate', '45 giờ', 140, 1560, 4.6, 1),
('Thiết Kế UI/UX Chuyên Nghiệp', 'thiet-ke-ui-ux', 'Figma, Adobe XD và nguyên tắc thiết kế hiện đại', 749000, 1100000, 2, 4, 'beginner', '35 giờ', 110, 980, 4.7, 1),
('Kinh Doanh Online Từ A-Z', 'kinh-doanh-online-az', 'Xây dựng và phát triển cửa hàng online thành công', 649000, 950000, 3, 5, 'beginner', '28 giờ', 85, 2100, 4.5, 1);

-- Sample lessons for first course
INSERT INTO lessons (course_id, title, video_url, duration_minutes, order_num, is_free) VALUES
(1, 'Giới thiệu khóa học', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 10, 1, 1),
(1, 'HTML Cơ Bản - Phần 1', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 25, 2, 1),
(1, 'HTML Cơ Bản - Phần 2', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 30, 3, 0),
(1, 'CSS Căn Bản', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 35, 4, 0),
(1, 'CSS Flexbox', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 40, 5, 0),
(1, 'JavaScript Nhập Môn', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 45, 6, 0);

-- Sample reviews
INSERT INTO reviews (user_id, course_id, rating, comment) VALUES
(1, 1, 5, 'Khóa học cực kỳ chi tiết và dễ hiểu! Giảng viên giải thích rất rõ ràng từng bước.'),
(2, 2, 5, 'Mình đã tăng traffic từ 500 lên 5000/ngày sau khi học khóa này. Quá tuyệt!'),
(3, 3, 5, 'Kiếm được 15 triệu/tháng sau 3 tháng áp dụng. Cảm ơn thầy rất nhiều!');

-- Admin account
INSERT OR IGNORE INTO users (name,email,password,is_admin) VALUES ('Administrator','admin@educonnect.vn','scrypt:32768:8:1$nBCzaAjYGBissXnu$31b16c083e4ba090bd7fc749a5021471f9699db16c5c9fe87b0d785f449623356ae576c0ae594465aab60c9e7fcd4d2d3936882a0fb5e46f66de83cb92e8eae7',1);
