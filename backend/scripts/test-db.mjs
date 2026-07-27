/**
 * Test database connection script
 * Usage: node scripts/test-db.mjs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Load .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'fcvn',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'hrm_system',
};

console.log('\n================================================');
console.log('  Database Connection Test');
console.log('================================================\n');

console.log('Configuration:');
console.log(`  Host: ${DB_CONFIG.host}`);
console.log(`  Port: ${DB_CONFIG.port}`);
console.log(`  User: ${DB_CONFIG.user}`);
console.log(`  Database: ${DB_CONFIG.database}`);
console.log('');

const client = new Client(DB_CONFIG);

client.connect()
  .then(() => {
    console.log('✅ Connected to database successfully!\n');
    
    // Test query
    return client.query('SELECT NOW() as current_time, version() as pg_version');
  })
  .then(res => {
    console.log('Query Result:');
    console.log(`  Server Time: ${res.rows[0].current_time}`);
    console.log(`  PostgreSQL: ${res.rows[0].pg_version.split(' ')[0]}\n`);
    
    // Check tables
    return client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
  })
  .then(res => {
    console.log('Tables in database:');
    res.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\n✅ All checks passed!\n');
    client.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:');
    console.error(`  Error: ${err.message}\n`);
    
    console.log('Troubleshooting:');
    console.log('  1. Make sure PostgreSQL is running');
    console.log('  2. Check database exists:', DB_CONFIG.database);
    console.log('  3. Check user has access:', DB_CONFIG.user);
    console.log('  4. Verify .env configuration\n');
    
    client.end();
    process.exit(1);
  });
