// Helper to generate seed bcrypt hashes for default passwords
// Format theo spec 05 §6:
//   - Admin (no employee): plaintext = username + password
//   - Other roles:        plaintext = empCode + password + dob
// Usage: node scripts/hash-seed.mjs
import bcrypt from 'bcrypt';

const ROUNDS = 10;

// Default empCodes (must match trigger fn_generate_emp_code output)
// Format: first_name + initials (capitalized), accented stripped
const SEED_USERS = [
  { username: 'admin',    password: 'Admin@123',    empCode: null,       dob: null },
  { username: 'director', password: 'Password@123', empCode: 'DocLM',    dob: '1980-05-15' },
  { username: 'deptlead', password: 'Password@123', empCode: 'PhongNVT', dob: '1988-08-20' },
  { username: 'employee', password: 'Password@123', empCode: 'VienTTN',  dob: '1995-11-30' },
];

function buildPlaintext(u) {
  if (!u.empCode) return `${u.username}${u.password}`;
  return `${u.empCode}${u.password}${u.dob}`;
}

console.log('-- ====================================================================');
console.log('-- Regenerate bcrypt hashes theo spec 05 §6');
console.log('-- Run: node scripts/hash-seed.mjs');
console.log('-- ====================================================================\n');

for (const u of SEED_USERS) {
  const plaintext = buildPlaintext(u);
  const hash = await bcrypt.hash(plaintext, ROUNDS);
  const ok = await bcrypt.compare(plaintext, hash);
  console.log(`-- ${u.username.padEnd(10)} | plaintext="${plaintext}"`);
  console.log(`INSERT INTO users (username, password_hash, role, status) VALUES ('${u.username}', '${hash}', '${u.username === 'admin' ? 'ADMIN' : u.username === 'director' ? 'DIRECTOR' : u.username === 'deptlead' ? 'DEPT_LEAD' : 'EMPLOYEE'}', 'ACTIVE');`);
  console.log(`-- verify: ${ok ? 'OK' : 'FAIL'}\n`);
}