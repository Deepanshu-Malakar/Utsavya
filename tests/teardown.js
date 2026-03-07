const pool = require("../src/config/db");

module.exports = async () => {
    await pool.end();
};