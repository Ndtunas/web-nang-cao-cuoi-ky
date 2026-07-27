// Final verify: tất cả hashes trong seed.sql với format mới (director dùng Password@123)
import bcrypt from 'bcrypt';
import fs from 'node:fs';

const seedSql = fs.readFileSync('../database/04_seed.sql', 'utf8');

// Trích xuất tất cả bcrypt hashes + context từ file
const inserts = [...seedSql.matchAll(/VALUES \('(\w+)', '(\$2b\$[^']+)'/g)];

const expected = {
  admin:    'adminAdmin@123',
  director: 'DocLMPassword@1231980-05-15',
  deptlead: 'PhongNVTPassword@1231988-08-20',
  employee: 'VienTTNPassword@1231995-11-30',
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