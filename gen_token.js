require('dotenv').config();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const pool = require('./src/config/db');

async function createTokenAndTest() {
  try {
    const adminQuery = "SELECT id, full_name, email FROM users WHERE role = 'admin' LIMIT 1";
    let admin = (await pool.query(adminQuery)).rows[0];
    
    if (!admin) {
        // Create one if it doesn't exist
        const insertAdmin = "INSERT INTO users (full_name, email, role) VALUES ('Super Admin', 'admin@example.com', 'admin') RETURNING id, full_name, email";
        admin = (await pool.query(insertAdmin)).rows[0];
    }
    
    const token = jwt.sign(
        { userId: admin.id, role: 'admin', full_name: admin.full_name, email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: "10d" }
    );
    
    fs.writeFileSync('admin_test_token.txt', token);
    
    // Also create a test page that sets the local storage and redirects to admin dashboard
    const html = `
    <html><body>
    <script>
      localStorage.setItem('accessToken', '${token}');
      window.location.href = '/admin/dashboard';
    </script>
    </body></html>
    `;
    fs.writeFileSync('src/public/auto_login.html', html);
    console.log("READY");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
createTokenAndTest();
