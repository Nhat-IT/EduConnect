-- Shared hosting often does not allow CREATE DATABASE.
-- Use the database already provisioned by your hosting provider.
USE bdlcbhmcoacr3f66ltng;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS courses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(12,2) DEFAULT 0,
    original_price DECIMAL(12,2) DEFAULT 0,
    image VARCHAR(255) DEFAULT NULL,
    instructor_id INT UNSIGNED,
    category_id INT UNSIGNED,
    level ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    duration VARCHAR(50) DEFAULT '0 giờ',
    total_lessons INT DEFAULT 0,
    total_students INT DEFAULT 0,
    rating DECIMAL(3,1) DEFAULT 0,
    is_featured TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lessons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(500) DEFAULT NULL,
    duration_minutes INT DEFAULT 0,
    order_num INT DEFAULT 0,
    is_free TINYINT(1) DEFAULT 0,
    CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enrollments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    progress INT DEFAULT 0,
    UNIQUE KEY uq_enrollment_user_course (user_id, course_id),
    CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contacts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(32) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categories (name, slug) VALUES
('Lập Trình Web', 'lap-trinh-web'),
('Digital Marketing', 'digital-marketing'),
('SEO', 'seo'),
('Thiết Kế', 'thiet-ke'),
('Kinh Doanh Online', 'kinh-doanh-online'),
('Tiếp Thị Liên Kết', 'tiep-thi-lien-ket')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed users (default password for seeded accounts: 123456)
INSERT INTO users (id, name, email, password, avatar) VALUES
(1, 'Nguyễn Văn An', 'an.nguyen@educonnect.vn', '$2a$10$cB/Gac0ydFwiqYV2KVdiB.05Y7r616qjI8hg0vXnRtHY8V1ZHvE3y', NULL),
(2, 'Trần Thị Bình', 'binh.tran@educonnect.vn', '$2a$10$cB/Gac0ydFwiqYV2KVdiB.05Y7r616qjI8hg0vXnRtHY8V1ZHvE3y', NULL),
(3, 'Lê Minh Cường', 'cuong.le@educonnect.vn', '$2a$10$cB/Gac0ydFwiqYV2KVdiB.05Y7r616qjI8hg0vXnRtHY8V1ZHvE3y', NULL)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
password = VALUES(password),
avatar = VALUES(avatar);

-- Seed courses
INSERT INTO courses (
    id, title, slug, description, price, original_price, instructor_id,
    category_id, level, duration, total_lessons, total_students, rating, is_featured
) VALUES
(
    1,
    'Lập Trình Web Từ Zero Đến Hero',
    'lap-trinh-web-zero-hero',
    'Khóa học toàn diện từ HTML, CSS, JavaScript đến React và Node.js',
    799000,
    1200000,
    1,
    1,
    'beginner',
    '40 giờ',
    120,
    2340,
    4.8,
    1
),
(
    2,
    'SEO Thực Chiến 2024',
    'seo-thuc-chien-2024',
    'Học SEO từ cơ bản đến nâng cao, tối ưu website lên top Google',
    599000,
    900000,
    2,
    3,
    'intermediate',
    '25 giờ',
    80,
    1890,
    4.7,
    1
),
(
    3,
    'Tiếp Thị Liên Kết Từ Tế',
    'tiep-thi-lien-ket-tu-te',
    'Kiếm tiền thụ động với Affiliate Marketing - Hướng dẫn chi tiết A-Z',
    699000,
    1000000,
    3,
    6,
    'beginner',
    '30 giờ',
    95,
    3120,
    4.9,
    1
),
(
    4,
    'Digital Marketing Tổng Thể',
    'digital-marketing-tong-the',
    'Facebook Ads, Google Ads, Email Marketing - Toàn bộ trong 1 khóa học',
    899000,
    1400000,
    1,
    2,
    'intermediate',
    '45 giờ',
    140,
    1560,
    4.6,
    1
),
(
    5,
    'Thiết Kế UI/UX Chuyên Nghiệp',
    'thiet-ke-ui-ux',
    'Figma, Adobe XD và nguyên tắc thiết kế hiện đại',
    749000,
    1100000,
    2,
    4,
    'beginner',
    '35 giờ',
    110,
    980,
    4.7,
    1
),
(
    6,
    'Kinh Doanh Online Từ A-Z',
    'kinh-doanh-online-az',
    'Xây dựng và phát triển cửa hàng online thành công',
    649000,
    950000,
    3,
    5,
    'beginner',
    '28 giờ',
    85,
    2100,
    4.5,
    1
)
ON DUPLICATE KEY UPDATE
title = VALUES(title),
description = VALUES(description),
price = VALUES(price),
original_price = VALUES(original_price),
instructor_id = VALUES(instructor_id),
category_id = VALUES(category_id),
level = VALUES(level),
duration = VALUES(duration),
total_lessons = VALUES(total_lessons),
total_students = VALUES(total_students),
rating = VALUES(rating),
is_featured = VALUES(is_featured);

-- Seed lessons (same sample as old DB)
INSERT INTO lessons (id, course_id, title, video_url, duration_minutes, order_num, is_free) VALUES
(1, 1, 'Giới thiệu khóa học', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 10, 1, 1),
(2, 1, 'HTML Cơ Bản - Phần 1', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 25, 2, 1),
(3, 1, 'HTML Cơ Bản - Phần 2', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 30, 3, 0),
(4, 1, 'CSS Căn Bản', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 35, 4, 0),
(5, 1, 'CSS Flexbox', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 40, 5, 0),
(6, 1, 'JavaScript Nhập Môn', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 45, 6, 0)
ON DUPLICATE KEY UPDATE
course_id = VALUES(course_id),
title = VALUES(title),
video_url = VALUES(video_url),
duration_minutes = VALUES(duration_minutes),
order_num = VALUES(order_num),
is_free = VALUES(is_free);

-- Seed reviews
INSERT INTO reviews (id, user_id, course_id, rating, comment) VALUES
(1, 1, 1, 5, 'Khóa học cực kỳ chi tiết và dễ hiểu! Giảng viên giải thích rất rõ ràng từng bước.'),
(2, 2, 2, 5, 'Mình đã tăng traffic từ 500 lên 5000/ngày sau khi học khóa này. Quá tuyệt!'),
(3, 3, 3, 5, 'Kiếm được 15 triệu/tháng sau 3 tháng áp dụng. Cảm ơn thầy rất nhiều!')
ON DUPLICATE KEY UPDATE
rating = VALUES(rating),
comment = VALUES(comment);
