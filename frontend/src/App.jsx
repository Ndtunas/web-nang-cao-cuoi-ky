import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ConfigProvider,
  Layout,
  Menu,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Card,
  Statistic,
  Space,
  Popconfirm,
  message,
  theme
} from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import {
  TeamOutlined,
  BankOutlined,
  CalendarOutlined,
  DollarOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserAddOutlined,
  DashboardOutlined
} from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

const initialEmployees = [
  { key: '1', id: 'NV001', name: 'Nguyễn Văn An', email: 'an.nguyen@company.com', phone: '0901234567', department: 'Công nghệ thông tin', position: 'Kỹ sư Phần mềm', status: 'active' },
  { key: '2', id: 'NV002', name: 'Trần Thị Bình', email: 'binh.tran@company.com', phone: '0912345678', department: 'Nhân sự', position: 'Trưởng phòng HR', status: 'active' },
  { key: '3', id: 'NV003', name: 'Lê Hoàng Cường', email: 'cuong.le@company.com', phone: '0923456789', department: 'Kế toán', position: 'Chuyên viên Kế toán', status: 'onLeave' },
  { key: '4', id: 'NV004', name: 'Phạm Minh Đức', email: 'duc.pham@company.com', phone: '0934567890', department: 'Marketing', position: 'Quản lý Marketing', status: 'active' },
  { key: '5', id: 'NV005', name: 'Vũ Thị Giang', email: 'giang.vu@company.com', phone: '0945678901', department: 'Công nghệ thông tin', position: 'DevOps Engineer', status: 'terminated' }
];

function App() {
  const { t, i18n } = useTranslation();
  const [employees, setEmployees] = useState(initialEmployees);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();

  // Switch Antd Locale according to i18next
  const antdLocale = i18n.language === 'vi' ? viVN : enUS;

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  };

  const handleAddOrEdit = (values) => {
    if (editingEmployee) {
      setEmployees(employees.map(emp => emp.key === editingEmployee.key ? { ...emp, ...values } : emp));
      message.success(t('modal.titleEdit') + ' thành công!');
    } else {
      const newEmp = {
        key: Date.now().toString(),
        id: `NV00${employees.length + 1}`,
        ...values
      };
      setEmployees([...employees, newEmp]);
      message.success(t('modal.titleAdd') + ' thành công!');
    }
    setIsModalOpen(false);
    form.resetFields();
    setEditingEmployee(null);
  };

  const handleDelete = (key) => {
    setEmployees(employees.filter(emp => emp.key !== key));
    message.success(t('employeeTable.delete') + ' thành công!');
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingEmployee(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      title: t('employeeTable.id'),
      dataIndex: 'id',
      key: 'id',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: t('employeeTable.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>{record.email}</div>
        </div>
      )
    },
    {
      title: t('employeeTable.department'),
      dataIndex: 'department',
      key: 'department'
    },
    {
      title: t('employeeTable.position'),
      dataIndex: 'position',
      key: 'position'
    },
    {
      title: t('employeeTable.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'green';
        if (status === 'onLeave') color = 'gold';
        if (status === 'terminated') color = 'red';
        return (
          <Tag color={color} key={status}>
            {t(`employeeTable.${status}`)}
          </Tag>
        );
      }
    },
    {
      title: t('employeeTable.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#6366f1' }} />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa nhân viên này không?"
            onConfirm={() => handleDelete(record.key)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8
        }
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* Sidebar */}
        <Sider width={250} style={{ background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
              <TeamOutlined />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Phenikaa HRM</span>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['employees']}
            style={{ background: 'transparent', marginTop: 16 }}
            items={[
              { key: 'dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
              { key: 'employees', icon: <TeamOutlined />, label: t('nav.employees') },
              { key: 'departments', icon: <BankOutlined />, label: t('nav.departments') },
              { key: 'attendance', icon: <CalendarOutlined />, label: t('nav.attendance') },
              { key: 'payroll', icon: <DollarOutlined />, label: t('nav.payroll') },
              { key: 'settings', icon: <SettingOutlined />, label: t('nav.settings') }
            ]}
          />
        </Sider>

        <Layout>
          {/* Header */}
          <Header style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 300 }}
            />

            <Button icon={<GlobalOutlined />} onClick={toggleLanguage}>
              {i18n.language === 'vi' ? 'VI (Tiếng Việt)' : 'EN (English)'}
            </Button>
          </Header>

          {/* Content Body */}
          <Content style={{ margin: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stats Cards */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card style={{ background: '#1e293b' }}>
                  <Statistic
                    title={t('stats.totalEmployees')}
                    value={employees.length}
                    prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card style={{ background: '#1e293b' }}>
                  <Statistic
                    title={t('stats.activeEmployees')}
                    value={employees.filter(e => e.status === 'active').length}
                    prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card style={{ background: '#1e293b' }}>
                  <Statistic
                    title={t('stats.onLeave')}
                    value={employees.filter(e => e.status === 'onLeave').length}
                    prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card style={{ background: '#1e293b' }}>
                  <Statistic
                    title={t('stats.newHires')}
                    value={3}
                    prefix={<UserAddOutlined style={{ color: '#a855f7' }} />}
                  />
                </Card>
              </Col>
            </Row>

            {/* Employee Directory Section */}
            <Card
              title={t('employeeTable.title')}
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                  {t('employeeTable.addEmployee')}
                </Button>
              }
              style={{ background: '#1e293b' }}
            >
              <Table
                columns={columns}
                dataSource={filteredEmployees}
                pagination={{ pageSize: 5 }}
              />
            </Card>

            {/* Modal Add/Edit */}
            <Modal
              title={editingEmployee ? t('modal.titleEdit') : t('modal.titleAdd')}
              open={isModalOpen}
              onCancel={() => setIsModalOpen(false)}
              onOk={() => form.submit()}
              okText={t('modal.save')}
              cancelText={t('modal.cancel')}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleAddOrEdit}
                initialValues={{ status: 'active' }}
              >
                <Form.Item
                  name="name"
                  label={t('modal.fields.name')}
                  rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                >
                  <Input placeholder="Nhập họ và tên" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label={t('modal.fields.email')}
                  rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ!' }]}
                >
                  <Input placeholder="email@company.com" />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label={t('modal.fields.phone')}
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
                >
                  <Input placeholder="0901234567" />
                </Form.Item>

                <Form.Item
                  name="department"
                  label={t('modal.fields.department')}
                  rules={[{ required: true, message: 'Vui lòng chọn phòng ban!' }]}
                >
                  <Select placeholder="Chọn phòng ban">
                    <Select.Option value="Công nghệ thông tin">Công nghệ thông tin</Select.Option>
                    <Select.Option value="Nhân sự">Nhân sự</Select.Option>
                    <Select.Option value="Kế toán">Kế toán</Select.Option>
                    <Select.Option value="Marketing">Marketing</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="position"
                  label={t('modal.fields.position')}
                  rules={[{ required: true, message: 'Vui lòng nhập chức vụ!' }]}
                >
                  <Input placeholder="Nhập chức vụ" />
                </Form.Item>

                <Form.Item
                  name="status"
                  label={t('modal.fields.status')}
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Select.Option value="active">{t('employeeTable.active')}</Select.Option>
                    <Select.Option value="onLeave">{t('employeeTable.onLeave')}</Select.Option>
                    <Select.Option value="terminated">{t('employeeTable.terminated')}</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Modal>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
