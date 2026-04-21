-- EduConnect Database Schema (Updated)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT NULL,
    is_admin INTEGER DEFAULT 0,
    wallet_balance REAL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS lesson_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    material_type TEXT DEFAULT 'document',
    order_num INTEGER DEFAULT 0,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE IF NOT EXISTS lesson_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT,
    explanation TEXT,
    order_num INTEGER DEFAULT 0,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
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

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('deposit','withdraw','purchase','refund')),
    amount REAL NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'completed' CHECK(status IN ('pending','completed','failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SEED DATA
INSERT INTO categories (name, slug) VALUES
('Lập Trình Web', 'lap-trinh-web'),
('Digital Marketing', 'digital-marketing'),
('SEO', 'seo'),
('Thiết Kế', 'thiet-ke'),
('Kinh Doanh Online', 'kinh-doanh-online'),
('Tiếp Thị Liên Kết', 'tiep-thi-lien-ket');

INSERT INTO users (name, email, password, wallet_balance) VALUES
('Nguyễn Văn An', 'an.nguyen@educonnect.vn', 'scrypt:32768:8:1$iPjysbuGC5TaZAHH$daae1cb180b7addfb212492364ac153f6c2ebfb3954d2f95e56b5c0a7e437e702143542485d327c08250efb2fa05e46529987b8c4a31cc6a1a1427aa806812e5', 5200000),
('Trần Thị Bình', 'binh.tran@educonnect.vn', 'scrypt:32768:8:1$iPjysbuGC5TaZAHH$daae1cb180b7addfb212492364ac153f6c2ebfb3954d2f95e56b5c0a7e437e702143542485d327c08250efb2fa05e46529987b8c4a31cc6a1a1427aa806812e5', 3800000),
('Lê Minh Cường', 'cuong.le@educonnect.vn', 'scrypt:32768:8:1$iPjysbuGC5TaZAHH$daae1cb180b7addfb212492364ac153f6c2ebfb3954d2f95e56b5c0a7e437e702143542485d327c08250efb2fa05e46529987b8c4a31cc6a1a1427aa806812e5', 7100000);

INSERT INTO courses (title, slug, description, price, original_price, instructor_id, category_id, level, duration, total_lessons, total_students, rating, is_featured) VALUES
('Lập Trình Web Từ Zero Đến Hero', 'lap-trinh-web-zero-hero', 'Khóa học toàn diện từ HTML, CSS, JavaScript đến React và Node.js. Bạn sẽ xây dựng 5 dự án thực tế và sẵn sàng đi làm sau khóa học.', 799000, 1200000, 1, 1, 'beginner', '40 giờ', 8, 2340, 4.8, 1),
('SEO Thực Chiến 2024', 'seo-thuc-chien-2024', 'Học SEO từ cơ bản đến nâng cao, tối ưu website lên top Google. Bao gồm On-page SEO, Off-page SEO, Technical SEO và Local SEO.', 599000, 900000, 2, 3, 'intermediate', '25 giờ', 5, 1890, 4.7, 1),
('Tiếp Thị Liên Kết Từ Tế', 'tiep-thi-lien-ket-tu-te', 'Kiếm tiền thụ động với Affiliate Marketing - Hướng dẫn chi tiết A-Z. Từ chọn sản phẩm, xây kênh, đến tối ưu tỉ lệ chuyển đổi.', 699000, 1000000, 3, 6, 'beginner', '30 giờ', 5, 3120, 4.9, 1),
('Digital Marketing Tổng Thể', 'digital-marketing-tong-the', 'Facebook Ads, Google Ads, Email Marketing - Toàn bộ trong 1 khóa học. Phù hợp cho người muốn làm Marketing tổng thể.', 899000, 1400000, 1, 2, 'intermediate', '45 giờ', 140, 1560, 4.6, 1),
('Thiết Kế UI/UX Chuyên Nghiệp', 'thiet-ke-ui-ux', 'Figma, Adobe XD và nguyên tắc thiết kế hiện đại. Học cách tư duy thiết kế lấy người dùng làm trung tâm.', 749000, 1100000, 2, 4, 'beginner', '35 giờ', 110, 980, 4.7, 1),
('Kinh Doanh Online Từ A-Z', 'kinh-doanh-online-az', 'Xây dựng và phát triển cửa hàng online thành công. Bao gồm chọn sản phẩm, setup kho, vận hành và scale-up.', 649000, 950000, 3, 5, 'beginner', '28 giờ', 85, 2100, 4.5, 1);

INSERT INTO lessons (course_id, title, duration_minutes, order_num, is_free) VALUES
(1, 'Giới thiệu khóa học & Lộ trình học tập', 10, 1, 1),
(1, 'HTML Cơ Bản - Cấu trúc trang web', 25, 2, 1),
(1, 'HTML Nâng Cao - Semantic & Form', 30, 3, 0),
(1, 'CSS Căn Bản - Selector & Box Model', 35, 4, 0),
(1, 'CSS Flexbox - Layout hiện đại', 40, 5, 0),
(1, 'CSS Grid - Bố cục 2 chiều', 38, 6, 0),
(1, 'JavaScript Nhập Môn - Biến & Hàm', 45, 7, 0),
(1, 'JavaScript DOM - Tương tác giao diện', 50, 8, 0),
(2, 'SEO là gì? Tổng quan và cách hoạt động', 15, 1, 1),
(2, 'Nghiên cứu từ khóa với Google Keyword Planner', 30, 2, 1),
(2, 'On-page SEO - Tối ưu nội dung', 35, 3, 0),
(2, 'Technical SEO - Tốc độ & Cấu trúc', 40, 4, 0),
(2, 'Link Building - Xây dựng backlink chất lượng', 45, 5, 0),
(3, 'Affiliate Marketing là gì? Mô hình kiếm tiền', 20, 1, 1),
(3, 'Chọn sản phẩm & nền tảng Affiliate', 25, 2, 1),
(3, 'Xây dựng kênh traffic miễn phí', 35, 3, 0),
(3, 'Chạy quảng cáo cho Affiliate', 40, 4, 0),
(3, 'Tối ưu tỉ lệ chuyển đổi (CRO)', 30, 5, 0);

INSERT INTO lesson_materials (lesson_id, title, content, material_type, order_num) VALUES
(1, 'Lộ trình học Web Developer 2024', '# Lộ trình Học Lập Trình Web

## Giai đoạn 1: Nền Tảng (Tháng 1-2)
Bắt đầu với những kiến thức cơ bản nhất:

- **HTML5**: Cấu trúc trang web, các thẻ semantic, form và validation
- **CSS3**: Selectors, Box model, Flexbox, Grid, Animation
- **JavaScript cơ bản**: Biến, hàm, điều kiện, vòng lặp, DOM

## Giai đoạn 2: Front-end Nâng Cao (Tháng 3-4)
- **React.js**: Component, State, Props, Hooks, Router
- **TypeScript**: Typed JavaScript cho dự án lớn
- **Công cụ**: Git, VS Code, npm, Webpack/Vite

## Giai đoạn 3: Back-end & Full-stack (Tháng 5-6)
- **Node.js + Express**: API RESTful, Middleware
- **Database**: MySQL, PostgreSQL, MongoDB cơ bản
- **Deploy**: Vercel, Railway, AWS cơ bản

## Dự Án Thực Tế
1. Landing Page cá nhân (HTML/CSS)
2. Todo App (JavaScript thuần)
3. Blog với React
4. E-commerce mini (Full-stack)
5. Portfolio hoàn chỉnh

> Mẹo: Học lý thuyết 30%, thực hành 70%. Code mỗi ngày ít nhất 1 giờ!', 'document', 1),

(1, 'Công cụ cần chuẩn bị trước khi học', '# Công Cụ Cần Chuẩn Bị

## Editor Code
**Visual Studio Code** - Miễn phí, nhẹ, nhiều extension hỗ trợ.

Extensions cần cài:
- Prettier (tự format code)
- ESLint (kiểm tra lỗi)
- Live Server (xem kết quả real-time)
- Auto Rename Tag (đổi tên thẻ HTML tự động)

## Trình Duyệt
Dùng **Google Chrome** - có DevTools mạnh nhất để debug.

## Tài Khoản Cần Tạo
- **GitHub**: Lưu code và làm portfolio
- **Vercel/Netlify**: Deploy website miễn phí
- **CodePen**: Thực hành nhanh không cần setup', 'document', 2),

(2, 'Tổng hợp các thẻ HTML quan trọng', '# Các Thẻ HTML Cần Nhớ

## Thẻ Cấu Trúc
```html
<!DOCTYPE html>
<html lang="vi">
<head>  <!-- metadata -->
<body>  <!-- nội dung -->
```

## Thẻ Semantic HTML5
```html
<header>   <!-- Đầu trang/section -->
<nav>      <!-- Menu điều hướng -->
<main>     <!-- Nội dung chính (1 lần/trang) -->
<article>  <!-- Bài viết độc lập -->
<section>  <!-- Nhóm nội dung có chủ đề -->
<aside>    <!-- Sidebar, nội dung phụ -->
<footer>   <!-- Cuối trang/section -->
```

## Thẻ Text & Heading
```html
<h1> đến <h6>   <!-- Tiêu đề (h1 quan trọng nhất) -->
<p>              <!-- Đoạn văn -->
<strong>         <!-- In đậm - ngữ nghĩa quan trọng -->
<em>             <!-- In nghiêng - nhấn mạnh -->
<span>           <!-- Inline container -->
<div>            <!-- Block container -->
```

## Thẻ Liên Kết & Media
```html
<a href="url" target="_blank">Mở tab mới</a>
<img src="path.jpg" alt="Mô tả ảnh" width="300">
```

> Lưu ý: Luôn có thuộc tính alt cho img để tối ưu SEO và accessibility!', 'document', 1),

(9, 'Tổng quan về SEO và cách Google hoạt động', '# SEO - Search Engine Optimization

## Google Hoạt Động Như Thế Nào?

### 1. Crawling (Thu thập dữ liệu)
Googlebot liên tục duyệt internet và thu thập nội dung các trang web thông qua các liên kết.

### 2. Indexing (Lập chỉ mục)
Google phân tích và lưu trữ thông tin đã thu thập vào cơ sở dữ liệu khổng lồ (Index).

### 3. Ranking (Xếp hạng)
Khi người dùng tìm kiếm, Google chạy thuật toán phức tạp (200+ yếu tố) để xếp hạng kết quả phù hợp nhất.

## 3 Trụ Cột Của SEO

| Trụ cột | Mô tả | Ví dụ |
|---------|-------|-------|
| **On-page SEO** | Tối ưu nội dung trên trang | Title, meta, nội dung, từ khóa |
| **Off-page SEO** | Xây dựng uy tín bên ngoài | Backlink, social signal |
| **Technical SEO** | Tối ưu kỹ thuật website | Tốc độ, mobile, cấu trúc URL |

## Tại Sao SEO Quan Trọng?
- 93% trải nghiệm online bắt đầu từ công cụ tìm kiếm
- 75% người dùng không click qua trang 2
- Traffic organic miễn phí và bền vững hơn paid traffic', 'document', 1),

(14, 'Affiliate Marketing - Mô hình kiếm tiền thụ động', '# Affiliate Marketing Là Gì?

## Định Nghĩa
Affiliate Marketing (Tiếp thị liên kết) là hình thức kiếm tiền bằng cách quảng bá sản phẩm/dịch vụ của người khác và nhận hoa hồng khi có người mua hàng qua link của bạn.

## Cách Hoạt Động
1. **Bạn** đăng ký làm Affiliate của một công ty
2. **Công ty** cung cấp link tracking độc đáo cho bạn
3. **Bạn** quảng bá sản phẩm qua blog, mạng xã hội, email...
4. **Khách hàng** click link và mua hàng
5. **Bạn** nhận hoa hồng (thường 5-50% giá trị đơn hàng)

## Các Nền Tảng Affiliate Phổ Biến Tại VN
- **Accesstrade**: Hoa hồng 5-15%, nhiều thương hiệu lớn
- **Civi**: Chuyên sản phẩm số và khóa học
- **Lazada/Shopee Affiliate**: Sản phẩm vật lý
- **Booking/Traveloka**: Du lịch, khách sạn

## Thu Nhập Thực Tế
Người mới: 2-5 triệu/tháng sau 3-6 tháng
Người có kinh nghiệm: 20-100 triệu/tháng

> Affiliate Marketing cần thời gian xây dựng ban đầu nhưng sau đó tạo thu nhập thụ động!', 'document', 1);

INSERT INTO lesson_exercises (lesson_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, order_num) VALUES
(1, 'Ngôn ngữ nào dùng để tạo cấu trúc trang web?', 'CSS', 'JavaScript', 'HTML', 'Python', 'C', 'HTML (HyperText Markup Language) là ngôn ngữ đánh dấu tạo cấu trúc trang web. CSS tạo kiểu dáng, JavaScript tạo tương tác.', 1),
(1, 'Front-end Developer chủ yếu làm việc với?', 'Python & Django', 'HTML, CSS, JavaScript', 'Java & Spring', 'PHP & Laravel', 'B', 'Front-end Developer tập trung giao diện người dùng với HTML (cấu trúc), CSS (giao diện) và JavaScript (tương tác).', 2),
(1, 'Đâu KHÔNG phải framework JavaScript?', 'React', 'Vue.js', 'Angular', 'Bootstrap', 'D', 'Bootstrap là framework CSS. React, Vue.js và Angular là framework/thư viện JavaScript.', 3),
(2, 'Thẻ tiêu đề quan trọng nhất trong HTML là?', '<h6>', '<title>', '<h1>', '<header>', 'C', '<h1> là thẻ tiêu đề cấp cao nhất. Mỗi trang nên có 1 thẻ <h1> để tối ưu SEO.', 1),
(2, 'Thuộc tính "alt" của <img> dùng để?', 'Thay đổi kích thước ảnh', 'Mô tả nội dung ảnh', 'Tạo link cho ảnh', 'Thêm viền cho ảnh', 'B', 'Alt cung cấp văn bản thay thế khi ảnh không hiển thị, giúp SEO và accessibility.', 2),
(2, 'Cú pháp đúng để tạo liên kết HTML?', '<link href="url">Text</link>', '<a href="url">Text</a>', '<url>Text</url>', '<hyperlink="url">Text</hyperlink>', 'B', 'Thẻ <a> với thuộc tính href là cú pháp chuẩn tạo liên kết trong HTML.', 3),
(9, 'SEO là viết tắt của?', 'Search Engine Optimization', 'Social Engagement Online', 'Search Engine Operation', 'Site Engagement Optimization', 'A', 'SEO = Search Engine Optimization - Tối ưu hóa công cụ tìm kiếm để cải thiện thứ hạng website.', 1),
(9, 'Yếu tố quan trọng nhất trong On-page SEO?', 'Màu sắc website', 'Từ khóa và nội dung chất lượng', 'Số lượng hình ảnh', 'Font chữ đẹp', 'B', 'Nội dung và từ khóa là cốt lõi On-page SEO. Google đánh giá cao nội dung có giá trị, đáp ứng đúng search intent.', 2),
(14, 'Affiliate Marketing kiếm tiền bằng cách nào?', 'Bán sản phẩm tự tạo', 'Quảng bá sản phẩm người khác và nhận hoa hồng', 'Chạy quảng cáo Google', 'Xây dựng ứng dụng', 'B', 'Affiliate nhận hoa hồng khi có người mua qua link tracking của bạn - không cần tạo sản phẩm riêng.', 1),
(14, 'Nền tảng Affiliate nào phổ biến nhất tại Việt Nam?', 'ClickBank', 'Amazon Associates', 'Accesstrade', 'ShareASale', 'C', 'Accesstrade là nền tảng affiliate lớn nhất tại Việt Nam, hợp tác với nhiều thương hiệu lớn trong nước.', 2);

INSERT INTO reviews (user_id, course_id, rating, comment) VALUES
(1, 2, 5, 'Khóa học SEO cực kỳ chi tiết! Mình tăng traffic từ 800 lên 8.000 lượt/ngày sau 2 tháng áp dụng.'),
(2, 1, 5, 'Thầy An giảng dạy rất dễ hiểu. Mình đã build được website đầu tiên sau 3 tuần học!'),
(3, 4, 5, 'Digital Marketing tổng thể nhất mình từng học. Đáng từng đồng học phí!');

INSERT INTO wallet_transactions (user_id, type, amount, description, status) VALUES
(1, 'deposit', 2000000, 'Nạp tiền qua chuyển khoản ngân hàng', 'completed'),
(1, 'purchase', 599000, 'Mua khóa học: SEO Thực Chiến 2024', 'completed'),
(2, 'deposit', 5000000, 'Nạp tiền qua chuyển khoản ngân hàng', 'completed'),
(2, 'purchase', 799000, 'Mua khóa học: Lập Trình Web Từ Zero Đến Hero', 'completed'),
(3, 'deposit', 10000000, 'Nạp tiền qua chuyển khoản ngân hàng', 'completed'),
(3, 'purchase', 899000, 'Mua khóa học: Digital Marketing Tổng Thể', 'completed');

INSERT OR IGNORE INTO users (name,email,password,is_admin) VALUES ('Administrator','admin@educonnect.vn','scrypt:32768:8:1$nBCzaAjYGBissXnu$31b16c083e4ba090bd7fc749a5021471f9699db16c5c9fe87b0d785f449623356ae576c0ae594465aab60c9e7fcd4d2d3936882a0fb5e46f66de83cb92e8eae7',1);
