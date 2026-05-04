// scripts/migrate-passwords.js
// Chạy script này một lần sau khi deploy để reset password cho tài khoản seed
// Cú pháp: node scripts/migrate-passwords.js
//
// Script sẽ set lại mật khẩu mặc định "123456" cho tất cả tài khoản seed
// (tài khoản có password hash Werkzeug format - không tương thích với bcrypt)

const path   = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'elearning.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const DEFAULT_PASS = '123456';
const hash = bcrypt.hashSync(DEFAULT_PASS, 10);

// Tìm tất cả users có hash Werkzeug (bắt đầu bằng "scrypt:")
const users = db.prepare("SELECT id, email FROM users WHERE password LIKE 'scrypt:%'").all();

if (users.length === 0) {
  console.log('✅ Không có tài khoản nào cần migrate.');
  process.exit(0);
}

console.log(`🔄 Đang migrate ${users.length} tài khoản...`);
const stmt = db.prepare('UPDATE users SET password=? WHERE id=?');
const migrate = db.transaction(() => {
  for (const user of users) {
    stmt.run(hash, user.id);
    console.log(`   ✓ ${user.email}`);
  }
});

migrate();
console.log(`\n✅ Xong! Tất cả tài khoản trên đã được đặt mật khẩu: "${DEFAULT_PASS}"`);
console.log('   Hãy nhắc người dùng đổi mật khẩu sau khi đăng nhập lần đầu.\n');
db.close();
