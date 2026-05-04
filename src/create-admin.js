require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3307'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME     || 'educonnect',
  });

  // Xem user admin có trong DB không
  const [rows] = await pool.query("SELECT id, name, email, is_admin FROM users WHERE is_admin=1");
  console.log('Admin users:', rows);

  // Test password
  const [users] = await pool.query("SELECT * FROM users WHERE email='admin@educonnect.com'");
  if (users.length > 0) {
    const ok = bcrypt.compareSync('admin123', users[0].password);
    console.log('Password check:', ok ? '✅ ĐÚNG' : '❌ SAI');
  } else {
    console.log('❌ Không tìm thấy user!');
  }

  process.exit(0);
})();