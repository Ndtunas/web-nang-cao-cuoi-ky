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
  Avatar,
  Dropdown
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
  ProjectOutlined,
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
import Projects from './components/Projects.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { TAB_KEYS, ROLES, canAccessTab, canDo, getFirstAllowedTab } from './constants/roles.js';

dayjs.extend(weekOfYear);

const { Header, Content, Sider } = Layout;

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const { user, token, role, isAuthenticated, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_KEYS.DASHBOARD);

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

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState(null);

  // Payroll variables
  const [payrollMonth, setPayrollMonth] = useState(dayjs().month() + 1);
  const [payrollYear, setPayrollYear] = useState(dayjs().year());
  const [payrollSalaries, setPayrollSalaries] = useState([]);
  const [calculatingPayroll, setCalculatingPayroll] = useState(false);

  // Per-tab loading flags so tables show skeleton while fetching
  const [tableLoading, setTableLoading] = useState({
    DASHBOARD: false,
    EMPLOYEES: false,
    TIMESHEETS: false,
    APPROVALS: false,
    PAYROLL: false,
    CONFIG: false,
    AUDIT_LOGS: false,
  });
  const [actionLoading, setActionLoading] = useState({
    saveEmployee: false,
    transfer: false,
    adjustSalary: false,
    discipline: false,
    saveTimesheetDraft: false,
    submitTimesheet: false,
    approve: false,
    reject: false,
    updateWorkRate: {},
    updateApprovalConfig: {},
    login: false,
  });

  const antdLocale = i18n.language === 'vi' ? viVN : enUS;

  useEffect(() => {
    if (!token || !user) return;

    if (!canAccessTab(role, activeTab)) return;

    if (activeTab === TAB_KEYS.EMPLOYEES) {
      loadEmployeesData();
    } else if (activeTab === TAB_KEYS.TIMESHEETS) {
      loadTimesheetData();
    } else if (activeTab === TAB_KEYS.APPROVALS) {
      loadApprovalsData();
    } else if (activeTab === TAB_KEYS.PAYROLL) {
      loadPayrollData();
    } else if (activeTab === TAB_KEYS.CONFIG) {
      loadConfigData();
    } else if (activeTab === TAB_KEYS.AUDIT_LOGS) {
      loadAuditLogs();
    } else if (activeTab === TAB_KEYS.PROJECTS) {
      // Projects component loads its own data
    } else if (activeTab === TAB_KEYS.DASHBOARD) {
      loadDashboardData();
    }
  }, [activeTab, token, user, role, selectedWeek, selectedYear, payrollMonth, payrollYear, auditActionFilter, auditEntityFilter]);

  const loadDashboardData = async () => {
    setTableLoading(prev => ({ ...prev, DASHBOARD: true }));
    try {
      const [emps, stats] = await Promise.all([
        api.employees.getAll(),
        api.employees.getStats().catch(() => null),
      ]);
      setEmployees(emps);
      setDashboardStats(stats);
      if (canDo(role, 'DASHBOARD_QUICK_APPROVE')) {
        const pending = await api.approvals.getPendingMyLevel();
        setPendingApprovals(pending);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTableLoading(prev => ({ ...prev, DASHBOARD: false }));
    }
  };

  const loadEmployeesData = async () => {
    setTableLoading(prev => ({ ...prev, EMPLOYEES: true }));
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
      message.error(t('common.errorLoadEmployees'));
    } finally {
      setTableLoading(prev => ({ ...prev, EMPLOYEES: false }));
    }
  };

  const loadTimesheetData = async () => {
    setTableLoading(prev => ({ ...prev, TIMESHEETS: true }));
    try {
      const data = await api.timesheets.getMyWeekly(selectedWeek, selectedYear);
      setTimesheetData(data.timesheet);
      setTimesheetEntries(data.entries);
      setProjectsList(data.projects);
      setTasksList(data.tasks);
    } catch (e) {
      message.error(t('common.errorLoadTimesheets'));
    } finally {
      setTableLoading(prev => ({ ...prev, TIMESHEETS: false }));
    }
  };

  const loadApprovalsData = async () => {
    setTableLoading(prev => ({ ...prev, APPROVALS: true }));
    try {
      const [pending, submitted] = await Promise.all([
        api.approvals.getPendingMyLevel(),
        api.approvals.getMySubmitted()
      ]);
      setPendingApprovals(pending);
      setMySubmittedApprovals(submitted);
    } catch (e) {
      message.error(t('common.errorLoadApprovals'));
    } finally {
      setTableLoading(prev => ({ ...prev, APPROVALS: false }));
    }
  };

  const loadPayrollData = async () => {
    setTableLoading(prev => ({ ...prev, PAYROLL: true }));
    try {
      const salaries = await api.payroll.getSalaries(payrollMonth, payrollYear);
      setPayrollSalaries(salaries);
    } catch (e) {
      setPayrollSalaries([]);
    } finally {
      setTableLoading(prev => ({ ...prev, PAYROLL: false }));
    }
  };

  const loadConfigData = async () => {
    setTableLoading(prev => ({ ...prev, CONFIG: true }));
    try {
      const [rates, configs] = await Promise.all([
        api.configs.getWorkRates(),
        api.configs.getApprovalConfigs()
      ]);
      setWorkRates(rates);
      setApprovalConfigs(configs);
    } catch (e) {
      message.error(t('common.errorLoadConfigs'));
    } finally {
      setTableLoading(prev => ({ ...prev, CONFIG: false }));
    }
  };

  const loadAuditLogs = async () => {
    setTableLoading(prev => ({ ...prev, AUDIT_LOGS: true }));
    try {
      const logs = await api.auditLogs.getAll({
        actionType: auditActionFilter,
        entityName: auditEntityFilter
      });
      setAuditLogs(logs);
    } catch (e) {
      message.error(t('common.errorLoadAuditLogs'));
    } finally {
      setTableLoading(prev => ({ ...prev, AUDIT_LOGS: false }));
    }
  };

  const handleLogin = async (values) => {
    setActionLoading(prev => ({ ...prev, login: true }));
    try {
      const loggedInUser = await login(values);
      message.success(i18n.language === 'vi' ? 'Đăng nhập thành công!' : 'Logged in successfully!');

      setActiveTab(getFirstAllowedTab(loggedInUser.role));
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : (error.message || 'Login failed');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, login: false }));
    }
  };

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch (e) { /* logout is best-effort */ }
    logout();
    setActiveTab(TAB_KEYS.DASHBOARD);
  };

  const handleSaveEmployee = async (values) => {
    setActionLoading(prev => ({ ...prev, saveEmployee: true }));
    try {
      if (values.id) {
        await api.employees.updatePersonalInfo(values.id, values);
        message.success(t('modal.titleEdit') + ' thành công!');
      } else {
        await api.employees.create(values);
        message.success(t('modal.titleAdd') + ' thành công!');
      }
      await loadEmployeesData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : t('common.errorSaveEmployee');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, saveEmployee: false }));
    }
  };

  const handleTransfer = async (values) => {
    setActionLoading(prev => ({ ...prev, transfer: true }));
    try {
      await api.employees.submitJobTransfer(values);
      message.success(t('common.successTransfer'));
      await loadEmployeesData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : t('common.errorTransfer');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, transfer: false }));
    }
  };

  const handleAdjustSalary = async (values) => {
    setActionLoading(prev => ({ ...prev, adjustSalary: true }));
    try {
      await api.employees.submitSalaryAdjustment(values);
      message.success(t('common.successSalaryAdjust'));
      await loadEmployeesData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : t('common.errorSalaryAdjust');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, adjustSalary: false }));
    }
  };

  const handleDiscipline = async (values) => {
    setActionLoading(prev => ({ ...prev, discipline: true }));
    try {
      await api.employees.submitDisciplineReward(values);
      message.success(t('common.successDiscipline'));
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : t('common.errorDiscipline');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, discipline: false }));
    }
  };

  const handleSaveTimesheetDraft = async (entries) => {
    setActionLoading(prev => ({ ...prev, saveTimesheetDraft: true }));
    try {
      const validEntries = entries.filter(e => Number(e.hoursSpent) > 0);
      if (validEntries.length === 0) {
        message.warning(t('timesheets.msgNoValidEntries'));
        return;
      }
      await api.timesheets.saveEntries(validEntries.map(e => ({
        timesheetId: e.timesheetId || timesheetData.id,
        projectId: e.projectId,
        taskId: e.taskId,
        entryDate: e.entryDate,
        hoursSpent: e.hoursSpent,
        workType: e.workType,
        description: e.description || '',
      })));
      message.success(t('timesheets.msgDraftSaved'));
      await loadTimesheetData();
    } catch (e) {
      const msg = e.i18nKey ? t(e.i18nKey) : t('common.errorSaveTimesheet');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, saveTimesheetDraft: false }));
    }
  };

  const handleSubmitTimesheet = async (currentEntries) => {
    setActionLoading(prev => ({ ...prev, submitTimesheet: true }));
    try {
      const entriesToSave = currentEntries || timesheetEntries;
      const validEntries = entriesToSave.filter(e => Number(e.hoursSpent) > 0);
      if (validEntries.length > 0) {
        await api.timesheets.saveEntries(validEntries.map(e => ({
          timesheetId: timesheetData.id,
          projectId: e.projectId,
          taskId: e.taskId,
          entryDate: e.entryDate,
          hoursSpent: e.hoursSpent,
          workType: e.workType,
          description: e.description || '',
        })));
      }
      await api.timesheets.submit(timesheetData.id);
      message.success(t('timesheets.msgSubmitted'));
      await loadTimesheetData();
    } catch (e) {
      const msg = e.i18nKey ? t(e.i18nKey) : t('common.errorSubmitTimesheet');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, submitTimesheet: false }));
    }
  };

  const handleApprove = async (id, comment) => {
    setActionLoading(prev => ({ ...prev, approve: true }));
    try {
      await api.approvals.approve(id, comment);
      message.success(t('common.successApprove'));
      await loadApprovalsData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : t('common.errorApprove');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, approve: false }));
    }
  };

  const handleReject = async (id, comment) => {
    setActionLoading(prev => ({ ...prev, reject: true }));
    try {
      await api.approvals.reject(id, comment);
      message.success(t('common.successReject'));
      await loadApprovalsData();
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : t('common.errorReject');
      message.error(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, reject: false }));
    }
  };

  const handleUpdateWorkRate = async (key, value) => {
    setActionLoading(prev => ({ ...prev, updateWorkRate: { ...prev.updateWorkRate, [key]: true } }));
    try {
      await api.configs.updateWorkRate(key, value);
      message.success(t('common.successUpdateWorkRate'));
      await loadConfigData();
    } catch (e) {
      message.error(t('common.errorUpdateWorkRate'));
    } finally {
      setActionLoading(prev => ({ ...prev, updateWorkRate: { ...prev.updateWorkRate, [key]: false } }));
    }
  };

  const handleUpdateApprovalConfig = async (type, levels) => {
    setActionLoading(prev => ({ ...prev, updateApprovalConfig: { ...prev.updateApprovalConfig, [type]: true } }));
    try {
      await api.configs.updateApprovalConfig(type, levels);
      message.success(t('common.successUpdateApprovalMatrix'));
      await loadConfigData();
    } catch (e) {
      message.error(t('common.errorUpdateApprovalMatrix'));
    } finally {
      setActionLoading(prev => ({ ...prev, updateApprovalConfig: { ...prev.updateApprovalConfig, [type]: false } }));
    }
  };

  const handleCalculatePayroll = async () => {
    setCalculatingPayroll(true);
    try {
      const salaries = await api.payroll.calculate(payrollMonth, payrollYear);
      setPayrollSalaries(salaries);
      message.success(`Đã tính toán xong bảng lương tháng ${payrollMonth}/${payrollYear}!`);
    } catch (error) {
      const msg = error.i18nKey ? t(error.i18nKey) : t('common.errorCalculatePayroll');
      message.error(msg);
    } finally {
      setCalculatingPayroll(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  };

  const checkAccess = (tab) => canAccessTab(role, tab);

  const renderWithGuard = (tab, element) => {
    if (!checkAccess(tab)) {
      return (
        <Result
          status="403"
          title="403"
          subTitle={t('error.auth.accessDenied')}
          extra={<Button type="primary" onClick={() => setActiveTab('DASHBOARD')}>{t('common.back')}</Button>}
        />
      );
    }
    return element;
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} loading={actionLoading.login} />;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 12,
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        },
        components: {
          Modal: {
            contentBg: 'rgba(15, 23, 42, 0.96)',
            headerBg: 'transparent',
            colorIcon: '#cbd5e1',
            colorIconHover: '#ffffff',
            borderRadiusLG: 16,
          }
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
              checkAccess(TAB_KEYS.DASHBOARD) && { key: TAB_KEYS.DASHBOARD, icon: <DashboardOutlined />, label: t('nav.dashboard') },
              checkAccess(TAB_KEYS.EMPLOYEES) && { key: TAB_KEYS.EMPLOYEES, icon: <TeamOutlined />, label: t('nav.employees') },
              checkAccess(TAB_KEYS.PROJECTS) && { key: TAB_KEYS.PROJECTS, icon: <ProjectOutlined />, label: t('nav.projects') },
              checkAccess(TAB_KEYS.TIMESHEETS) && { key: TAB_KEYS.TIMESHEETS, icon: <CalendarOutlined />, label: t('nav.attendance') },
              checkAccess(TAB_KEYS.APPROVALS) && { key: TAB_KEYS.APPROVALS, icon: <CheckCircleOutlined />, label: t('nav.approvals') },
              checkAccess(TAB_KEYS.PAYROLL) && { key: TAB_KEYS.PAYROLL, icon: <DollarOutlined />, label: t('nav.payroll') },
              checkAccess(TAB_KEYS.CONFIG) && { key: TAB_KEYS.CONFIG, icon: <SettingOutlined />, label: t('nav.settings') },
              checkAccess(TAB_KEYS.AUDIT_LOGS) && { key: TAB_KEYS.AUDIT_LOGS, icon: <AuditOutlined />, label: t('nav.auditLogs') }
            ].filter(Boolean)}
          />
        </Sider>

        <Layout style={{ background: 'transparent' }}>
          {/* Header */}
          <Header style={{
            height: 70,
            lineHeight: 'normal',
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
              <Button
                type="text"
                icon={<GlobalOutlined style={{ color: '#94a3b8' }} />}
                onClick={toggleLanguage}
                style={{
                  color: '#cbd5e1',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontWeight: 500
                }}
              >
                {i18n.language === 'vi' ? 'EN' : 'VI'}
              </Button>

              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      label: (
                        <div style={{ padding: '8px 12px', minWidth: 160 }}>
                          <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{user.username}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                            {user.role}
                          </div>
                        </div>
                      ),
                      disabled: true,
                    },
                    {
                      type: 'divider',
                    },
                    {
                      key: 'logout',
                      danger: true,
                      icon: <LogoutOutlined />,
                      label: t('nav.logout') || 'Đăng xuất',
                      onClick: handleLogout,
                    },
                  ],
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'all 0.2s',
                }}>
                  <Avatar
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                    }}
                    size="default"
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{user.username}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{user.role}</span>
                  </div>
                </div>
              </Dropdown>
            </div>
          </Header>

          {/* Render Active View */}
          <Content style={{ padding: 32, overflowY: 'auto' }}>
            {activeTab === 'DASHBOARD' && renderWithGuard('DASHBOARD', (
              <Dashboard
                employees={employees}
                stats={dashboardStats}
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
                loading={tableLoading.EMPLOYEES}
                loadingActions={{
                  saveEmployee: actionLoading.saveEmployee,
                  transfer: actionLoading.transfer,
                  adjustSalary: actionLoading.adjustSalary,
                  discipline: actionLoading.discipline,
                }}
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
                loading={tableLoading.TIMESHEETS}
                loadingActions={{
                  saveDraft: actionLoading.saveTimesheetDraft,
                  submit: actionLoading.submitTimesheet,
                }}
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
                loading={tableLoading.APPROVALS}
                loadingActions={{
                  approve: actionLoading.approve,
                  reject: actionLoading.reject,
                }}
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
                loading={tableLoading.PAYROLL}
                t={t}
              />
            ))}

            {activeTab === 'CONFIG' && renderWithGuard('CONFIG', (
              <SystemConfig
                workRates={workRates}
                approvalConfigs={approvalConfigs}
                onUpdateWorkRate={handleUpdateWorkRate}
                onUpdateApprovalConfig={handleUpdateApprovalConfig}
                loading={tableLoading.CONFIG}
                loadingActions={{
                  updateWorkRate: actionLoading.updateWorkRate,
                  updateApprovalConfig: actionLoading.updateApprovalConfig,
                }}
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
                loading={tableLoading.AUDIT_LOGS}
                t={t}
              />
            ))}

            {activeTab === 'PROJECTS' && renderWithGuard('PROJECTS', (
              <Projects t={t} />
            ))}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
