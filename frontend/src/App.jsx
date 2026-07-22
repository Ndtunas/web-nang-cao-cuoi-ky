import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ConfigProvider,
  Layout,
  Menu,
  Input,
  Tag,
  Button,
  Space,
  Popconfirm,
  message,
  theme,
  Result,
  Avatar
} from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import {
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  SettingOutlined,
  GlobalOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  AuditOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear.js';

import { api } from './api.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import EmployeeDirectory from './components/EmployeeDirectory.jsx';
import Timesheets from './components/Timesheets.jsx';
import ApprovalCenter from './components/ApprovalCenter.jsx';
import Payroll from './components/Payroll.jsx';
import SystemConfig from './components/SystemConfig.jsx';
import AuditLogs from './components/AuditLogs.jsx';

dayjs.extend(weekOfYear);

const { Header, Content, Sider } = Layout;

// Role permissions mapping to tabs
const ROLE_PERMISSIONS = {
  ADMIN: ['DASHBOARD', 'EMPLOYEES', 'TIMESHEETS', 'APPROVALS', 'PAYROLL', 'CONFIG', 'AUDIT_LOGS'],
  HR_LEAD: ['DASHBOARD', 'EMPLOYEES', 'TIMESHEETS', 'APPROVALS', 'PAYROLL', 'CONFIG'],
  DIRECTOR: ['DASHBOARD', 'APPROVALS', 'PAYROLL'],
  CHAIRMAN: ['DASHBOARD', 'APPROVALS', 'PAYROLL'],
  DEPT_LEAD: ['DASHBOARD', 'TIMESHEETS', 'APPROVALS'],
  EMPLOYEE: ['DASHBOARD', 'TIMESHEETS']
};

function App() {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // Master lists
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [workRates, setWorkRates] = useState([]);
  const [approvalConfigs, setApprovalConfigs] = useState([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Timesheets variables
  const [timesheetData, setTimesheetData] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(dayjs().week());
  const [selectedYear, setSelectedYear] = useState(dayjs().year());

  // Approvals variables
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [mySubmittedApprovals, setMySubmittedApprovals] = useState([]);

  // Audit Logs variables
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('');

  // Payroll variables
  const [payrollMonth, setPayrollMonth] = useState(dayjs().month() + 1);
  const [payrollYear, setPayrollYear] = useState(dayjs().year());
  const [payrollSalaries, setPayrollSalaries] = useState([]);
  const [calculatingPayroll, setCalculatingPayroll] = useState(false);

  const antdLocale = i18n.language === 'vi' ? viVN : enUS;

  useEffect(() => {
    if (token) {
      api.auth.getProfile()
        .then(profile => {
          setUser(profile);
          const allowed = ROLE_PERMISSIONS[profile.role] || ['DASHBOARD'];
          if (!allowed.includes(activeTab)) {
            setActiveTab(allowed[0]);
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    
    const allowed = ROLE_PERMISSIONS[user.role] || [];
    if (!allowed.includes(activeTab)) return;

    if (activeTab === 'EMPLOYEES') {
      loadEmployeesData();
    } else if (activeTab === 'TIMESHEETS') {
      loadTimesheetData();
    } else if (activeTab === 'APPROVALS') {
      loadApprovalsData();
    } else if (activeTab === 'PAYROLL') {
      loadPayrollData();
    } else if (activeTab === 'CONFIG') {
      loadConfigData();
    } else if (activeTab === 'AUDIT_LOGS') {
      loadAuditLogs();
    } else if (activeTab === 'DASHBOARD') {
      loadDashboardData();
    }
  }, [activeTab, token, user, selectedWeek, selectedYear, payrollMonth, payrollYear, auditActionFilter, auditEntityFilter]);

  const loadDashboardData = async () => {
    try {
      const emps = await api.employees.getAll();
      setEmployees(emps);
      if (['ADMIN', 'DIRECTOR', 'CHAIRMAN', 'DEPT_LEAD'].includes(user.role)) {
        const pending = await api.approvals.getPendingMyLevel();
        setPendingApprovals(pending);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadEmployeesData = async () => {
    try {
      const [emps, depts, posts] = await Promise.all([
        api.employees.getAll(),
        fetch('/api/v1/departments', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/v1/positions', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      ]);
      setEmployees(emps);
      setDepartments(depts.data || depts);
      setPositions(posts.data || posts);
    } catch (e) {
      message.error('Failed to load employee master lists');
    }
  };

  const loadTimesheetData = async () => {
    try {
      const data = await api.timesheets.getMyWeekly(selectedWeek, selectedYear);
      setTimesheetData(data.timesheet);
      setTimesheetEntries(data.entries);
      setProjectsList(data.projects);
      setTasksList(data.tasks);
    } catch (e) {
      message.error('Failed to load weekly timesheets');
    }
  };

  const loadApprovalsData = async () => {
    try {
      const [pending, submitted] = await Promise.all([
        api.approvals.getPendingMyLevel(),
        api.approvals.getMySubmitted()
      ]);
      setPendingApprovals(pending);
      setMySubmittedApprovals(submitted);
    } catch (e) {
      message.error('Failed to load approvals lists');
    }
  };

  const loadPayrollData = async () => {
    try {
      const salaries = await api.payroll.getSalaries(payrollMonth, payrollYear);
      setPayrollSalaries(salaries);
    } catch (e) {
      setPayrollSalaries([]);
    }
  };

  const loadConfigData = async () => {
    try {
      const [rates, configs] = await Promise.all([
        api.configs.getWorkRates(),
        api.configs.getApprovalConfigs()
      ]);
      setWorkRates(rates);
      setApprovalConfigs(configs);
    } catch (e) {
      message.error('Failed to load configurations');
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await api.auditLogs.getAll({
        actionType: auditActionFilter,
        entityName: auditEntityFilter
      });
      setAuditLogs(logs);
    } catch (e) {
      message.error('Failed to load system audit logs');
    }
  };

  const handleLogin = async (values) => {
    try {
      const response = await api.auth.login(values.username, values.password);
      setToken(response.accessToken);
      setUser(response.user);
      message.success(i18n.language === 'vi' ? 'Đăng nhập thành công!' : 'Logged in successfully!');
      
      const allowed = ROLE_PERMISSIONS[response.user.role] || ['DASHBOARD'];
      setActiveTab(allowed[0]);
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : (error.message || 'Login failed');
      message.error(msg);
    }
  };

  const handleLogout = async () => {
    await api.auth.logout();
    setToken(null);
    setUser(null);
    setActiveTab('DASHBOARD');
  };

  const handleSaveEmployee = async (values) => {
    try {
      if (values.id) {
        await api.employees.updatePersonalInfo(values.id, values);
        message.success(t('modal.titleEdit') + ' thành công!');
      } else {
        await api.employees.create(values);
        message.success(t('modal.titleAdd') + ' thành công!');
      }
      loadEmployeesData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : 'Error saving employee profile';
      message.error(msg);
    }
  };

  const handleTransfer = async (values) => {
    try {
      await api.employees.submitJobTransfer(values);
      message.success('Đã gửi yêu cầu điều chuyển công tác lên ma trận duyệt!');
      loadEmployeesData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : 'Error submitting transfer';
      message.error(msg);
    }
  };

  const handleAdjustSalary = async (values) => {
    try {
      await api.employees.submitSalaryAdjustment(values);
      message.success('Đã gửi yêu cầu điều chỉnh lương lên ma trận duyệt!');
      loadEmployeesData();
    } catch (error) {
      message.error('Error submitting salary adjustments');
    }
  };

  const handleDiscipline = async (values) => {
    try {
      await api.employees.submitDisciplineReward(values);
      message.success('Ghi nhận khen thưởng/kỷ luật thành công!');
    } catch (error) {
      message.error('Error submitting discipline/reward');
    }
  };

  const handleSaveTimesheetDraft = async (entries) => {
    try {
      const validEntries = entries.filter(e => Number(e.hoursSpent) > 0);
      if (validEntries.length === 0) {
        message.warning('Không có dòng chấm công hợp lệ (giờ > 0)');
        return;
      }
      await api.timesheets.saveEntries({ entries: validEntries });
      message.success('Lưu nháp timesheet thành công!');
      loadTimesheetData();
    } catch (e) {
      const msg = e.i18nKey ? t(e.i18nKey) : 'Error saving timesheet';
      message.error(msg);
    }
  };

  const handleSubmitTimesheet = async () => {
    try {
      await api.timesheets.submit(timesheetData.id);
      message.success('Đã nộp bảng chấm công tuần lên quản lý duyệt!');
      loadTimesheetData();
    } catch (e) {
      const msg = e.i18nKey ? t(e.i18nKey) : 'Error submitting timesheet';
      message.error(msg);
    }
  };

  const handleApprove = async (id, comment) => {
    try {
      await api.approvals.approve(id, comment);
      message.success('Đã duyệt phiếu yêu cầu thành công!');
      loadApprovalsData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : 'Error approving request';
      message.error(msg);
    }
  };

  const handleReject = async (id, comment) => {
    try {
      await api.approvals.reject(id, comment);
      message.success('Đã từ chối phiếu yêu cầu!');
      loadApprovalsData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : 'Error rejecting request';
      message.error(msg);
    }
  };

  const handleUpdateWorkRate = async (key, value) => {
    try {
      await api.configs.updateWorkRate(key, value);
      message.success('Cập nhật hệ số công thành công!');
      loadConfigData();
    } catch (e) {
      message.error('Failed to update config key');
    }
  };

  const handleUpdateApprovalConfig = async (type, levels) => {
    try {
      await api.configs.updateApprovalConfig(type, levels);
      message.success('Cập nhật ma trận duyệt thành công!');
      loadConfigData();
    } catch (e) {
      message.error('Failed to update approval levels');
    }
  };

  const handleCalculatePayroll = async () => {
    setCalculatingPayroll(true);
    try {
      const salaries = await api.payroll.calculate(payrollMonth, payrollYear);
      setPayrollSalaries(salaries);
      message.success(`Đã tính toán xong bảng lương tháng ${payrollMonth}/${payrollYear}!`);
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : 'Error calculating payroll';
      message.error(msg);
    } finally {
      setCalculatingPayroll(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  };

  const checkAccess = (tab) => {
    if (!user) return false;
    const allowed = ROLE_PERMISSIONS[user.role] || [];
    return allowed.includes(tab);
  };

  const renderWithGuard = (tab, element) => {
    if (!checkAccess(tab)) {
      return (
        <Result
          status="403"
          title="403"
          subTitle={t('error.auth.accessDenied')}
          extra={<Button type="primary" onClick={() => setActiveTab('DASHBOARD')}>Back to Dashboard</Button>}
        />
      );
    }
    return element;
  };

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 12,
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        }
      }}
      locale={antdLocale}
    >
      <Layout style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        {/* Sider Sidebar Navigation */}
        <Sider width={260} style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '24px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)'
            }}>
              H
            </div>
            <span style={{
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '0.05em',
              background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>HRM SYSTEM</span>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => setActiveTab(key)}
            style={{ background: 'transparent', padding: '16px 8px' }}
            items={[
              checkAccess('DASHBOARD') && { key: 'DASHBOARD', icon: <DashboardOutlined />, label: t('nav.dashboard') },
              checkAccess('EMPLOYEES') && { key: 'EMPLOYEES', icon: <TeamOutlined />, label: t('nav.employees') },
              checkAccess('TIMESHEETS') && { key: 'TIMESHEETS', icon: <CalendarOutlined />, label: t('nav.attendance') },
              checkAccess('APPROVALS') && { key: 'APPROVALS', icon: <CheckCircleOutlined />, label: 'Phê duyệt' },
              checkAccess('PAYROLL') && { key: 'PAYROLL', icon: <DollarOutlined />, label: t('nav.payroll') },
              checkAccess('CONFIG') && { key: 'CONFIG', icon: <SettingOutlined />, label: t('nav.settings') },
              checkAccess('AUDIT_LOGS') && { key: 'AUDIT_LOGS', icon: <AuditOutlined />, label: 'Audit Logs' }
            ].filter(Boolean)}
          />
        </Sider>

        <Layout style={{ background: 'transparent' }}>
          {/* Header */}
          <Header style={{
            height: 70,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {activeTab === 'EMPLOYEES' && (
                <Input
                  prefix={<SearchOutlined />}
                  placeholder={t('header.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: 280, borderRadius: 20, background: 'rgba(30, 41, 59, 0.6)' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Button icon={<GlobalOutlined />} onClick={toggleLanguage} size="small">
                {i18n.language === 'vi' ? 'EN' : 'VI'}
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar style={{ backgroundColor: '#6366f1', verticalAlign: 'middle', fontWeight: 600 }} size="default">
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{user.username}</div>
                  <Tag color="indigo" style={{ margin: 0, fontSize: 10 }}>{user.role}</Tag>
                </div>
                <Popconfirm title="Đăng xuất khỏi hệ thống?" onConfirm={handleLogout} okText="OK" cancelText="Hủy">
                  <Button type="text" icon={<LogoutOutlined />} danger />
                </Popconfirm>
              </div>
            </div>
          </Header>

          {/* Render Active View */}
          <Content style={{ padding: 32, overflowY: 'auto' }}>
            {activeTab === 'DASHBOARD' && renderWithGuard('DASHBOARD', (
              <Dashboard
                employees={employees}
                pendingApprovals={pendingApprovals}
                onOpenDecisionModal={(record) => {
                  // Delegate opening approval decision modal directly
                  setActiveTab('APPROVALS');
                }}
                onNavigate={setActiveTab}
                t={t}
              />
            ))}

            {activeTab === 'EMPLOYEES' && renderWithGuard('EMPLOYEES', (
              <EmployeeDirectory
                employees={employees}
                departments={departments}
                positions={positions}
                searchQuery={searchQuery}
                onSaveEmployee={handleSaveEmployee}
                onTransfer={handleTransfer}
                onAdjustSalary={handleAdjustSalary}
                onDiscipline={handleDiscipline}
                t={t}
              />
            ))}

            {activeTab === 'TIMESHEETS' && renderWithGuard('TIMESHEETS', (
              <Timesheets
                timesheetData={timesheetData}
                timesheetEntries={timesheetEntries}
                projectsList={projectsList}
                tasksList={tasksList}
                selectedWeek={selectedWeek}
                setSelectedWeek={setSelectedWeek}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                onSaveTimesheetDraft={handleSaveTimesheetDraft}
                onSubmitTimesheet={handleSubmitTimesheet}
                t={t}
              />
            ))}

            {activeTab === 'APPROVALS' && renderWithGuard('APPROVALS', (
              <ApprovalCenter
                pendingApprovals={pendingApprovals}
                mySubmittedApprovals={mySubmittedApprovals}
                onApprove={handleApprove}
                onReject={handleReject}
                onGetHistory={api.approvals.getHistory}
                t={t}
              />
            ))}

            {activeTab === 'PAYROLL' && renderWithGuard('PAYROLL', (
              <Payroll
                payrollMonth={payrollMonth}
                setPayrollMonth={setPayrollMonth}
                payrollYear={payrollYear}
                setPayrollYear={setPayrollYear}
                payrollSalaries={payrollSalaries}
                calculatingPayroll={calculatingPayroll}
                onCalculatePayroll={handleCalculatePayroll}
                t={t}
              />
            ))}

            {activeTab === 'CONFIG' && renderWithGuard('CONFIG', (
              <SystemConfig
                workRates={workRates}
                approvalConfigs={approvalConfigs}
                onUpdateWorkRate={handleUpdateWorkRate}
                onUpdateApprovalConfig={handleUpdateApprovalConfig}
                t={t}
              />
            ))}

            {activeTab === 'AUDIT_LOGS' && renderWithGuard('AUDIT_LOGS', (
              <AuditLogs
                auditLogs={auditLogs}
                auditActionFilter={auditActionFilter}
                setAuditActionFilter={setAuditActionFilter}
                auditEntityFilter={auditEntityFilter}
                setAuditEntityFilter={setAuditEntityFilter}
                onGetDiff={api.auditLogs.getDiff}
                t={t}
              />
            ))}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
