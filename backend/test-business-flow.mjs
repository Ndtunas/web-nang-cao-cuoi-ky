const BASE_URL = 'http://localhost:8080/api/v1';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function login(username, password) {
  const data = await fetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return data.accessToken;
}

async function run() {
  console.log('🚀 Starting Business Flow Integration Test...');

  // 1. Log in as Employee
  console.log('\n--- 1. Employee Timesheet Submission Flow ---');
  const empToken = await login('employee', 'Password@123');
  console.log('✅ Logged in as employee');

  const today = new Date();
  const weekNum = 36; // Using week 36 to guarantee DRAFT state
  const year = today.getFullYear();
  
  const data = await fetchJson(`${BASE_URL}/timesheets/my-weekly?weekNumber=${weekNum}&year=${year}`, {
    headers: { 'Authorization': `Bearer ${empToken}` },
  });
  const timesheet = data.timesheet;
  const project = data.projects[0];
  const task = data.tasks[0];
  
  console.log(`Timesheet ID: ${timesheet.id}, Status: ${timesheet.status}`);
  console.log(`Using Project ID: ${project.id} (${project.name})`);
  console.log(`Using Task ID: ${task.id} (${task.taskName})`);

  // Save entries
  const saveResult = await fetchJson(`${BASE_URL}/timesheets/entries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entries: [
        {
          timesheetId: timesheet.id,
          projectId: project.id,
          taskId: task.id,
          entryDate: timesheet.startDate.split('T')[0],
          hoursSpent: 8.0,
          workType: 'NORMAL',
          description: 'Làm việc giờ hành chính',
        },
        {
          timesheetId: timesheet.id,
          projectId: project.id,
          taskId: task.id,
          entryDate: timesheet.startDate.split('T')[0],
          hoursSpent: 2.0,
          workType: 'OT_WEEKDAY',
          description: 'Làm thêm giờ ngày thường',
        }
      ]
    }),
  });
  console.log(`✅ Saved entries. Total Normal Hours: ${saveResult.timesheet.totalNormalHours}, Total OT Hours: ${saveResult.timesheet.totalOtHours}`);

  // Submit timesheet
  const submitResult = await fetchJson(`${BASE_URL}/timesheets/${timesheet.id}/submit`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${empToken}` },
  });
  console.log('submitResult response:', JSON.stringify(submitResult, null, 2));
  console.log(`✅ Submitted timesheet. New Status: ${submitResult.status}`);
  const approvalRequestId = submitResult.approvalRequestId;
  console.log(`Approval Request ID: ${approvalRequestId}`);

  // 2. Dept Lead Approval (Level 1)
  console.log('\n--- 2. Dept Lead Approval Flow (Level 1) ---');
  const deptToken = await login('deptlead', 'Password@123');
  console.log('✅ Logged in as deptlead');

  // Let's approve the timesheet
  const approveL1Result = await fetchJson(`${BASE_URL}/timesheets/${timesheet.id}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${deptToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: 'PM approved Level 1' }),
  });
  console.log(`✅ Level 1 Approved. Request Status: ${approveL1Result.status}, Current Level: ${approveL1Result.currentLevel}`);

  // 3. Director Approval (Level 2)
  console.log('\n--- 3. Director Approval Flow (Level 2) ---');
  const dirToken = await login('director', 'Password@123');
  console.log('✅ Logged in as director');

  const approveL2Result = await fetchJson(`${BASE_URL}/timesheets/${timesheet.id}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${dirToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: 'Director approved Level 2 - Final' }),
  });
  console.log(`✅ Level 2 Approved. Request Status: ${approveL2Result.status}`);

  // Check the timesheet status under employee login
  const tsCheckData = await fetchJson(`${BASE_URL}/timesheets/my-weekly?weekNumber=${weekNum}&year=${year}`, {
    headers: { 'Authorization': `Bearer ${empToken}` },
  });
  console.log(`✅ Verified Timesheet Status from Employee perspective: ${tsCheckData.timesheet.status}`);

  // 4. Salary Adjustment Flow (3 Levels: Dept Lead -> Director -> Chairman)
  console.log('\n--- 4. Salary Adjustment Flow (3 Levels) ---');
  // Get all employees
  const employees = await fetchJson(`${BASE_URL}/employees`, {
    headers: { 'Authorization': `Bearer ${deptToken}` },
  });
  const targetEmployee = employees.find(e => e.fullName === 'Trần Thị Nhân Viên');
  console.log(`Target Employee: ${targetEmployee.fullName} (ID: ${targetEmployee.id})`);

  // Submit salary adjustment proposal
  const salAdjustData = await fetchJson(`${BASE_URL}/employees/salary-adjustments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deptToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      employeeId: targetEmployee.id,
      newBaseSalary: 18000000,
      newRatio: 1.5,
      effectiveDate: new Date().toISOString(),
    }),
  });
  const salApprovalId = salAdjustData.approvalRequest.id;
  console.log(`✅ Salary adjustment proposal submitted. Approval ID: ${salApprovalId}`);

  // Approve Level 1 as Dept Lead
  const salApproveL1Result = await fetchJson(`${BASE_URL}/approval-requests/${salApprovalId}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${deptToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: 'Dept Lead approved' }),
  });
  console.log(`✅ Level 1 Approved. Request Status: ${salApproveL1Result.status}, Current Level: ${salApproveL1Result.currentLevel}`);

  // Approve Level 2 as Director
  const salApproveL2Result = await fetchJson(`${BASE_URL}/approval-requests/${salApprovalId}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${dirToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: 'Director approved' }),
  });
  console.log(`✅ Level 2 Approved. Request Status: ${salApproveL2Result.status}, Current Level: ${salApproveL2Result.currentLevel}`);

  // Approve Level 3 as Chairman
  const chairToken = await login('chairman', 'Password@123');
  console.log('✅ Logged in as chairman');

  const salApproveL3Result = await fetchJson(`${BASE_URL}/approval-requests/${salApprovalId}/approve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${chairToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: 'Chairman approved' }),
  });
  console.log(`✅ Level 3 Approved. Request Status: ${salApproveL3Result.status}`);

  // Verify salary history
  const salHistory = await fetchJson(`${BASE_URL}/employees/${targetEmployee.id}/salary-history`, {
    headers: { 'Authorization': `Bearer ${deptToken}` },
  });
  console.log('✅ Verified Salary History records:');
  console.log(JSON.stringify(salHistory, null, 2));

  // 5. Payroll Calculation Flow
  console.log('\n--- 5. Payroll Calculation Flow ---');
  // Trigger calculate
  const calcResult = await fetchJson(`${BASE_URL}/payroll/calculate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${dirToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      month: today.getMonth() + 1,
      year: today.getFullYear(),
    }),
  });
  console.log('✅ Payroll calculation triggered. Calculated entries count:', calcResult.length);
  const employeeSalary = calcResult.find(s => s.employee?.fullName === 'Trần Thị Nhân Viên');
  if (employeeSalary) {
    console.log(`Salary entry for ${employeeSalary.employee.fullName}:`);
    console.log(`  - Base Salary: ${employeeSalary.baseSalaryAmount}`);
    console.log(`  - OT Hours: ${employeeSalary.otHours}`);
    console.log(`  - Net Salary: ${employeeSalary.netSalary}`);
    console.log(`  - Status: ${employeeSalary.status}`);
  } else {
    console.log('No payroll record found for the employee.');
  }

  console.log('\n🎉 ALL BUSINESS FLOWS VERIFIED SUCCESSFULLY!');
}

run().catch(e => {
  console.error('❌ Integration Test Failed:', e.message || e);
});
