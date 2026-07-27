// Verify: tất cả hashes trong seed.sql với cơ chế đơn giản (hash trực tiếp password thuần)
import bcrypt from 'bcrypt';
import fs from 'node:fs';

const seedSql = fs.readFileSync('../database/04_seed.sql', 'utf8');

// Trích xuất tất cả bcrypt hashes + context từ file
const inserts = [...seedSql.matchAll(/VALUES \('(\w+)', '(\$2b\$[^']+)'/g)];

const expected = {
  admin:    'Admin@123',
  director: 'Password@123',
  deptlead: 'Password@123',
  employee: 'Password@123',
};

let pass = 0, total = 0;
for (const [, user, hash] of inserts) {
  const plain = expected[user];
  if (!plain) continue;
  total++;
  const ok = await bcrypt.compare(plain, hash);
  console.log(`${ok ? '✅' : '❌'} ${user.padEnd(10)} → "${plain}"`);
  if (ok) pass++;
}
console.log(`\n${pass}/${total} hashes OK`);
process.exit(pass === total ? 0 : 1);