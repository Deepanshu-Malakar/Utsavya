const fs = require('fs');
const pool = require('./src/config/db');
const q = `SELECT vr.*, u.full_name as requester_name, u.email as requester_email FROM vendor_requests vr JOIN users u ON vr.user_id = u.id WHERE vr.status = 'pending' ORDER BY vr.created_at ASC`;
pool.query(q)
  .then(r => fs.writeFileSync('err.log', 'OK Rows: ' + r.rows.length))
  .catch(e => fs.writeFileSync('err.log', e.message))
  .finally(() => pool.end());
