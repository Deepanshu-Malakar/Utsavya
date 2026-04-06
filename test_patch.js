const pool = require('./src/config/db');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

(async () => {
    try {
        const reqs = await pool.query("SELECT * FROM vendor_requests WHERE status='pending' LIMIT 1");
        if(reqs.rows.length===0) { console.log('No requests'); return; }
        const reqId = reqs.rows[0].id;
        
        // Find an admin user to make a valid token
        const adminRes = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
        const adminId = adminRes.rows.length > 0 ? adminRes.rows[0].id : '00000000-0000-0000-0000-000000000000';
        
        const token = jwt.sign({userId:adminId, role:'admin'}, process.env.JWT_SECRET);
        const data = JSON.stringify({status:'approved'});
        
        const req = http.request({
            hostname:'localhost',
            port:5000,
            path:'/api/admin/vendor-requests/'+reqId,
            method:'PATCH',
            headers:{
                'Content-Type':'application/json',
                'Authorization':'Bearer '+token,
                'Content-Length':data.length
            }
        }, (res) => {
            let body='';
            res.on('data', d=>body+=d);
            res.on('end', ()=>console.log('HTTP', res.statusCode, body));
        });
        
        req.on('error', e=>console.error('REQ ERROR', e));
        req.write(data);
        req.end();
    } catch(e) {
        console.error(e);
    } finally {
        // give HTTP request a second to finish before closing pool
        setTimeout(()=>pool.end(), 1000);
    }
})();
