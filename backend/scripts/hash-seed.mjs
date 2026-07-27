// Helper to generate seed bcrypt hashes for default passwords
// Cơ chế đơn giản: hash trực tiếp từ password thuần (không ghép empCode/dob)
// Usage: node scripts/hash-seed.mjs
import bcrypt from 'bcrypt';

const ROUNDS = 10;

const SEED_USERS = [
  { username: 'admin',    password: 'Admin@123',    role: 'ADMIN' },
  { username: 'director', password: 'Password@123', role: 'DIRECTOR' },
  { username: 'deptlead', password: 'Password@123', role: 'DEPT_LEAD' },
  { username: 'employee', password: 'Password@123', role: 'EMPLOYEE' },
];

console.log('-- ====================================================================');
console.log('-- Regenerate bcrypt hashes (hash trực tiếp từ password thuần)');
console.log('-- Run: node scripts/hash-seed.mjs');
console.log('-- ====================================================================\n');

for (const u of SEED_USERS) {
  const hash = await bcrypt.hash(u.password, ROUNDS);
  const ok = await bcrypt.compare(u.password, hash);
  console.log(`-- ${u.username.padEnd(10)} | password="${u.password}"`);
  console.log(`INSERT INTO users (username, password_hash, role, status) VALUES ('${u.username}', '${hash}', '${u.role}', 'ACTIVE');`);
  console.log(`-- verify: ${ok ? 'OK' : 'FAIL'}\n`);
}