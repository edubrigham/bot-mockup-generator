// server/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mockup_db',
  password: '',
  port: 5432,
});

module.exports = { pool };