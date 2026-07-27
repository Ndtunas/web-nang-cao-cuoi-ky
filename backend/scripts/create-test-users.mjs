/**
 * Script tạo bộ test users đầy đủ cho tất cả phòng ban
 * Chạy: node scripts/create-test-users.mjs
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

async function createTestUsers() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // ====================================================================
    // BƯỚC 1: Tạo positions cho HR và ADMIN
    // ====================================================================
    console.log('\n📦 Creating positions...');
    
    await client.query(`
      INSERT INTO positions (title, base_salary_ratio, description) 
      VALUES ('HR_MANAGER', 2.00, 'Quản lý Nhân sự')
      ON CONFLICT DO NOTHING
    `);
    
    await client.query(`
      INSERT INTO positions (title, base_salary_ratio, description) 
      VALUES ('IT_SUPPORT', 1.10, 'Nhân viên Hỗ trợ IT')
      ON CONFLICT DO NOTHING
    `);
    
    await client.query(`
      INSERT INTO positions (title, base_salary_ratio, description) 
      VALUES ('ADMIN_STAFF', 1.00, 'Nhân viên Hành chính')
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Positions created');

    // ====================================================================
    // BƯỚC 2: Lấy IDs cần thiết
    // ====================================================================
    const deptIT = await client.query(`SELECT id FROM departments WHERE dept_code = 'IT'`);
    const deptHR = await client.query(`SELECT id FROM departments WHERE dept_code = 'HR'`);
    const deptBOD = await client.query(`SELECT id FROM departments WHERE dept_code = 'BOD'`);
    
    // Tạo ADMIN department nếu chưa có
    let adminDept = await client.query(`SELECT id FROM departments WHERE dept_code = 'ADMIN'`);
    if (adminDept.rows.length === 0) {
      const result = await client.query(`
        INSERT INTO departments (dept_code, name, description) 
        VALUES ('ADMIN', 'Phòng Hành chính', 'Phòng quản trị và hành chính')
        RETURNING id
      `);
      adminDept = { rows: [{ id: result.rows[0].id }] };
    }
    
    const posLead = await client.query(`SELECT id FROM positions WHERE title = 'DEPT_LEAD'`);
    const posHRManager = await client.query(`SELECT id FROM positions WHERE title = 'HR_MANAGER'`);
    const posITSupport = await client.query(`SELECT id FROM positions WHERE title = 'IT_SUPPORT'`);
    const posAdminStaff = await client.query(`SELECT id FROM positions WHERE title = 'ADMIN_STAFF'`);

    const deptITId = deptIT.rows[0]?.id;
    const deptHRId = deptHR.rows[0]?.id;
    const deptBODId = deptBOD.rows[0]?.id;
    const deptAdminId = adminDept.rows[0]?.id;
    const posLeadId = posLead.rows[0]?.id;
    const posHRManagerId = posHRManager.rows[0]?.id;
    const posITSupportId = posITSupport.rows[0]?.id;
    const posAdminStaffId = posAdminStaff.rows[0]?.id;

    console.log('📍 Departments:', { IT: deptITId, HR: deptHRId, BOD: deptBODId, ADMIN: deptAdminId });

    // ====================================================================
    // BƯỚC 3: Tạo Users cho HR Department
    // ====================================================================
    console.log('\n👥 Creating HR users...');
    
    // HR Manager
    const hrManagerHash = await bcrypt.hash('Temp@1234567890123', 10); // placeholder
    const hrManagerResult = await client.query(`
      INSERT INTO users (username, password_hash, role, status)
      VALUES ('hr_lead', $1, 'DEPT_LEAD', 'ACTIVE')
      ON CONFLICT (username) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [hrManagerHash]);
    
    // HR Staff
    const hrStaffHash = await bcrypt.hash('Temp@1234567890123', 10);
    const hrStaffResult = await client.query(`
      INSERT INTO users (username, password_hash, role, status)
      VALUES ('hr_staff', $1, 'EMPLOYEE', 'ACTIVE')
      ON CONFLICT (username) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [hrStaffHash]);

    const hrLeadUserId = hrManagerResult.rows[0].id;
    const hrStaffUserId = hrStaffResult.rows[0].id;

    console.log('✅ HR Users created:', { hr_lead: hrLeadUserId, hr_staff: hrStaffUserId });

    // ====================================================================
    // BƯỚC 4: Tạo Employees cho HR Department
    // ====================================================================
    console.log('\n👤 Creating HR employees...');
    
    // HR Lead Employee
    const hrLeadEmp = await client.query(`
      INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
      VALUES ('Trần Thị Hương HR', 'hr_lead@company.com', '0911111111', 'FEMALE', '1985-03-20', '100 Hoàng Quốc Việt, Hà Nội', 'OFFICIAL', $1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        department_id = $1,
        position_id = $2,
        user_id = $3
      RETURNING id, emp_code
    `, [deptHRId, posHRManagerId, hrLeadUserId]);

    // HR Staff Employee
    const hrStaffEmp = await client.query(`
      INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
      VALUES ('Nguyễn Văn Minh HR', 'hr_staff@company.com', '0911111112', 'MALE', '1992-07-15', '101 Hoàng Quốc Việt, Hà Nội', 'OFFICIAL', $1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        department_id = $1,
        position_id = $2,
        user_id = $3
      RETURNING id, emp_code
    `, [deptHRId, posHRManagerId, hrStaffUserId]);

    const hrLeadEmpId = hrLeadEmp.rows[0].id;
    const hrStaffEmpId = hrStaffEmp.rows[0].id;
    const hrLeadEmpCode = hrLeadEmp.rows[0].emp_code;
    const hrStaffEmpCode = hrStaffEmp.rows[0].emp_code;

    console.log('✅ HR Employees created:', { 
      hr_lead: { id: hrLeadEmpId, empCode: hrLeadEmpCode },
      hr_staff: { id: hrStaffEmpId, empCode: hrStaffEmpCode }
    });

    // Update HR department manager
    await client.query(`UPDATE departments SET manager_id = $1 WHERE dept_code = 'HR'`, [hrLeadEmpId]);

    // ====================================================================
    // BƯỚC 5: Tạo Users/Employees cho IT Department
    // ====================================================================
    console.log('\n👥 Creating IT users...');
    
    // IT Staff (additional IT staff)
    const itStaffHash = await bcrypt.hash('Temp@1234567890123', 10);
    const itStaffResult = await client.query(`
      INSERT INTO users (username, password_hash, role, status)
      VALUES ('it_support', $1, 'EMPLOYEE', 'ACTIVE')
      ON CONFLICT (username) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [itStaffHash]);

    const itStaffUserId = itStaffResult.rows[0].id;

    // IT Support Employee
    const itStaffEmp = await client.query(`
      INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
      VALUES ('Phạm Văn Tùng IT', 'it_support@company.com', '0911111113', 'MALE', '1993-05-10', '200 Nguyễn Phong Sắc, Hà Nội', 'OFFICIAL', $1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        department_id = $1,
        position_id = $2,
        user_id = $3
      RETURNING id, emp_code
    `, [deptITId, posITSupportId, itStaffUserId]);

    const itStaffEmpId = itStaffEmp.rows[0].id;
    const itStaffEmpCode = itStaffEmp.rows[0].emp_code;

    console.log('✅ IT Support created:', { id: itStaffEmpId, empCode: itStaffEmpCode });

    // ====================================================================
    // BƯỚC 6: Tạo Users/Employees cho ADMIN Department
    // ====================================================================
    console.log('\n👥 Creating ADMIN users...');
    
    // Admin Staff
    const adminStaffHash = await bcrypt.hash('Temp@1234567890123', 10);
    const adminStaffResult = await client.query(`
      INSERT INTO users (username, password_hash, role, status)
      VALUES ('admin_staff', $1, 'EMPLOYEE', 'ACTIVE')
      ON CONFLICT (username) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [adminStaffHash]);

    const adminStaffUserId = adminStaffResult.rows[0].id;

    // Admin Staff Employee
    const adminStaffEmp = await client.query(`
      INSERT INTO employees (full_name, email, phone, gender, dob, address, status, department_id, position_id, user_id)
      VALUES ('Lê Thị Mai Admin', 'admin_staff@company.com', '0911111114', 'FEMALE', '1990-11-25', '300 Trần Duy Hưng, Hà Nội', 'OFFICIAL', $1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        department_id = $1,
        position_id = $2,
        user_id = $3
      RETURNING id, emp_code
    `, [deptAdminId, posAdminStaffId, adminStaffUserId]);

    const adminStaffEmpId = adminStaffEmp.rows[0].id;
    const adminStaffEmpCode = adminStaffEmp.rows[0].emp_code;

    console.log('✅ Admin Staff created:', { id: adminStaffEmpId, empCode: adminStaffEmpCode });

    // ====================================================================
    // BƯỚC 7: Update Password Hashes với empCode thực tế
    // ====================================================================
    console.log('\n🔑 Updating password hashes...');
    
    // Password format: empCode + "Temp@" + empCode + dob
    const defaultPassword = 'Temp@';
    
    // HR Lead
    const hrLeadPassword = `${hrLeadEmpCode}${defaultPassword}${hrLeadEmpCode}1985-03-20`;
    const hrLeadNewHash = await bcrypt.hash(hrLeadPassword, 10);
    await client.query(`UPDATE users SET password_hash = $1 WHERE username = 'hr_lead'`, [hrLeadNewHash]);

    // HR Staff
    const hrStaffPassword = `${hrStaffEmpCode}${defaultPassword}${hrStaffEmpCode}1992-07-15`;
    const hrStaffNewHash = await bcrypt.hash(hrStaffPassword, 10);
    await client.query(`UPDATE users SET password_hash = $1 WHERE username = 'hr_staff'`, [hrStaffNewHash]);

    // IT Support
    const itStaffPassword = `${itStaffEmpCode}${defaultPassword}${itStaffEmpCode}1993-05-10`;
    const itStaffNewHash = await bcrypt.hash(itStaffPassword, 10);
    await client.query(`UPDATE users SET password_hash = $1 WHERE username = 'it_support'`, [itStaffNewHash]);

    // Admin Staff
    const adminStaffPassword = `${adminStaffEmpCode}${defaultPassword}${adminStaffEmpCode}1990-11-25`;
    const adminStaffNewHash = await bcrypt.hash(adminStaffPassword, 10);
    await client.query(`UPDATE users SET password_hash = $1 WHERE username = 'admin_staff'`, [adminStaffNewHash]);

    console.log('✅ Password hashes updated');

    // ====================================================================
    // BƯỚC 8: Verify
    // ====================================================================
    console.log('\n📊 Verifying users...');
    
    const users = await client.query(`
      SELECT 
        u.id, u.username, u.role, e.department_id, d.dept_code, e.emp_code
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE u.username IN ('admin', 'director', 'deptlead', 'employee', 'hr_lead', 'hr_staff', 'it_support', 'admin_staff')
      ORDER BY u.username
    `);

    console.log('\n' + '='.repeat(80));
    console.log('TÀI KHOẢN TEST ĐÃ TẠO:');
    console.log('='.repeat(80));
    console.log('| Username       | Role       | Dept | EmpCode | Password        |');
    console.log('-'.repeat(80));
    
    const userMap = {
      'admin': { role: 'ADMIN', dept: 'BOD', password: 'Admin@123' },
      'director': { role: 'DIRECTOR', dept: 'BOD', password: 'DocLM + Password@ + dob' },
      'deptlead': { role: 'DEPT_LEAD', dept: 'IT', password: 'Password@123 + dob' },
      'employee': { role: 'EMPLOYEE', dept: 'IT', password: 'Password@123 + dob' },
      'hr_lead': { role: 'DEPT_LEAD', dept: 'HR', password: `${hrLeadEmpCode}${defaultPassword}${hrLeadEmpCode}1985-03-20` },
      'hr_staff': { role: 'EMPLOYEE', dept: 'HR', password: `${hrStaffEmpCode}${defaultPassword}${hrStaffEmpCode}1992-07-15` },
      'it_support': { role: 'EMPLOYEE', dept: 'IT', password: `${itStaffEmpCode}${defaultPassword}${itStaffEmpCode}1993-05-10` },
      'admin_staff': { role: 'EMPLOYEE', dept: 'ADMIN', password: `${adminStaffEmpCode}${defaultPassword}${adminStaffEmpCode}1990-11-25` },
    };

    for (const user of users.rows) {
      const info = userMap[user.username] || {};
      console.log(`| ${(user.username || '').padEnd(14)} | ${(user.role || '').padEnd(11)} | ${(user.dept_code || '').padEnd(4)} | ${(user.emp_code || 'N/A').padEnd(7)} | Temp@ + empCode + dob |`);
    }
    
    console.log('='.repeat(80));
    console.log('\n✅ HOÀN TẤT! Đã tạo đầy đủ users cho tất cả phòng ban.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createTestUsers().catch(console.error);
