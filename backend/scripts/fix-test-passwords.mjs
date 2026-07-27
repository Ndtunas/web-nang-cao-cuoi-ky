/**
 * Script fix password cho test users
 * Chạy: node scripts/fix-test-passwords.mjs
 * 
 * Cấu trúc hash theo spec:
 *   plaintext = empCode + password + dob
 *   password = "Temp@HrTTH" (chỉ phần empCode sau Temp@)
 * 
 * Ví dụ:
 *   empCode = HrTTH, password = Temp@HrTTH, dob = 1985-03-20
 *   → plaintext = "HrTTH" + "Temp@HrTTH" + "1985-03-20" = "HrTTHTemp@HrTTH1985-03-20"
 */

import pg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pg;

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'fcvn',
  password: process.env.DB_PASSWORD || '5303176aa620dd1f576e476a94b33630',
  database: process.env.DB_DATABASE || 'hrm_system',
};

// Mapping: username -> { empCode, dob }
// Password mặc định user sẽ nhập: "Temp@" + empCode
// VD: hr_lead với empCode HrTTH → password = "Temp@HrTTH"
const USERS = {
  'hr_lead': { empCode: 'HrTTH', dob: '1985-03-20' },
  'hr_staff': { empCode: 'HrNVM', dob: '1992-07-15' },
  'it_support': { empCode: 'ItPVT', dob: '1993-05-10' },
  'admin_staff': { empCode: 'AdminLTM', dob: '1990-11-25' },
};

async function fixPasswords() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    for (const [username, info] of Object.entries(USERS)) {
      const { empCode, dob } = info;
      
      // Password user nhập: "Temp@" + empCode
      const userPassword = `Temp@${empCode}`;
      
      // Plaintext theo spec: empCode + password + dob
      const plaintext = `${empCode}${userPassword}${dob}`;
      
      console.log(`\n${username}:`);
      console.log(`  empCode: ${empCode}`);
      console.log(`  dob: ${dob}`);
      console.log(`  password (user nhập): ${userPassword}`);
      console.log(`  plaintext (để hash): ${plaintext}`);
      
      // Hash plaintext
      const hash = await bcrypt.hash(plaintext, 10);
      
      // Update password hash
      const result = await client.query(`
        UPDATE users 
        SET password_hash = $1 
        WHERE username = $2
        RETURNING id, username
      `, [hash, username]);
      
      if (result.rows.length > 0) {
        console.log(`  ✅ Updated user: ${result.rows[0].username}`);
      } else {
        console.log(`  ❌ User not found: ${username}`);
      }
    }

    console.log('\n✅ Hoàn tất!');

    // Test login
    console.log('\n🧪 Testing login...');
    
    for (const [username, info] of Object.entries(USERS)) {
      const { empCode, dob } = info;
      const userPassword = `Temp@${empCode}`;
      const plaintext = `${empCode}${userPassword}${dob}`;
      
      const testRes = await client.query(`
        SELECT password_hash FROM users WHERE username = $1
      `, [username]);
      
      if (testRes.rows.length > 0) {
        const hash = testRes.rows[0].password_hash;
        const match = await bcrypt.compare(plaintext, hash);
        console.log(`  ${username} với password "${userPassword}": ${match ? '✅ PASS' : '❌ FAIL'}`);
      }
    }

    console.log('\n📋 Danh sách tài khoản cho accounts.txt:');
    console.log('='.repeat(60));
    for (const [username, info] of Object.entries(USERS)) {
      const { empCode, dob } = info;
      const userPassword = `Temp@${empCode}`;
      console.log(`  ${username.padEnd(15)} | Password: ${userPassword.padEnd(15)} | empCode: ${empCode}`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixPasswords().catch(console.error);