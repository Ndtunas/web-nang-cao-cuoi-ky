import React, { useState } from 'react';
import { Table, Tag, Button, Form, Input, Select, Space, Badge, Tabs, Row, Col, message } from 'antd';
import AppModal from './AppModal';
import { PlusOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext.jsx';
import { canDo } from '../constants/roles.js';
import { exportsService } from '../services/exports.service.js';
import { labelFor } from '../utils/labelMapping.js';

// Custom swap icon
const SwapOutlined = () => <span className="anticon"><svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor"><path d="M847.9 592H152c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h605.2L612.9 812c-3.1 3.1-3.1 8.2 0 11.3l42.4 42.4c3.1 3.1 8.2 3.1 11.3 0L882 650.3c1.5-1.5 2.3-3.5 2.3-5.6v-15.3c0-2-0.8-4-2.3-5.5L666.6 408.4c-3.1-3.1-8.2-3.1-11.3 0l-42.4 42.4c-3.1 3.1-3.1 8.2 0 11.3L847.9 592zM176 364h695.9c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8H266.7l144.3-144.3c3.1-3.1 3.1-8.2 0-11.3l-42.4-42.4c-3.1-3.1-8.2-3.1-11.3 0L142 305.7c-1.5 1.5-2.3 3.5-2.3 5.6v15.3c0 2 0.8 4 2.3 5.5l215.4 215.4c3.1 3.1 8.2 3.1 11.3 0l42.4-42.4c3.1-3.1 3.1-8.2 0-11.3L176 364z"/></svg></span>;
const WarningOutlined = () => <span className="anticon"><svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor"><path d="M955.7 856L547.3 141.6c-17.4-30.7-61.2-30.7-78.6 0L60.3 856c-17.1 30.2 4.7 68 39.3 68h816.9c34.6 0 56.4-37.8 39.2-68zM512 792c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm40-160c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8V392c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v240z"/></svg></span>;
const DollarOutlined = () => <span className="anticon"><svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 488 448 488 488-200.6 488-488S759.4 64 512 64zm0 820c-183.4 0-332-148.6-332-332s148.6-332 332-332 332 148.6 332 332-148.6 332-332 332zm148-436h-40v-40c0-11-9-20-20-20h-64c-11 0-20 9-20 20v40h-8c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64h64v48h-88c-11 0-20 9-20 20v32c0 11 9 20 20 20h40v40c0 11 9 20 20 20h64c11 0 20-9 20-20v-40h8c35.3 0 64-28.7 64-64v-32c0-35.3-28.7-64-64-64h-64v-48h88c11 0 20-9 20-20v-32c0-11-9-20-20-20z"/></svg></span>;

export default function EmployeeDirectory({
  employees,
  departments,
  positions,
  searchQuery,
  loading = false,
  loadingActions = {},
  onSaveEmployee,
  onTransfer,
  onAdjustSalary,
  onDiscipline,
  t
}) {
  const { role } = useAuth();
  const canCreate = canDo(role, 'EMPLOYEE_CREATE');
  const canEdit = canDo(role, 'EMPLOYEE_EDIT');
  const canTransfer = canDo(role, 'EMPLOYEE_TRANSFER');
  const canAdjustSalary = canDo(role, 'EMPLOYEE_SALARY_ADJUST');
  const canDiscipline = canDo(role, 'EMPLOYEE_DISCIPLINE');

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);

  const [employeeForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [salaryForm] = Form.useForm();
  const [disciplineForm] = Form.useForm();

  const handleOpenAddModal = () => {
    employeeForm.resetFields();
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    employeeForm.setFieldsValue({
      ...record,
      dob: record.dob ? dayjs(record.dob).format('YYYY-MM-DD') : null,
      joinDate: record.joinDate ? dayjs(record.joinDate).format('YYYY-MM-DD') : null
    });
    setIsEmployeeModalOpen(true);
  };

  const handleEmployeeSubmit = (values) => {
    onSaveEmployee(values);
    // Modal is closed from inside the async handler in App.jsx by checking loading state
    if (!loadingActions.saveEmployee) setIsEmployeeModalOpen(false);
  };

  const handleTransferSubmit = (values) => {
    onTransfer(values);
    if (!loadingActions.transfer) {
      setIsTransferModalOpen(false);
      transferForm.resetFields();
    }
  };

  const handleSalarySubmit = (values) => {
    onAdjustSalary(values);
    if (!loadingActions.adjustSalary) {
      setIsSalaryModalOpen(false);
      salaryForm.resetFields();
    }
  };

  const handleDisciplineSubmit = (values) => {
    onDiscipline(values);
    if (!loadingActions.discipline) {
      setIsDisciplineModalOpen(false);
      disciplineForm.resetFields();
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.empCode && e.empCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <Tabs defaultActiveKey="list" items={[
        {
          key: 'list',
          label: t('directory.tabs.profiles'),
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <Space wrap>
                  {canCreate && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                      {t('employeeTable.addEmployee')}
                    </Button>
                  )}
                  {canTransfer && (
                    <Button icon={<SwapOutlined />} onClick={() => setIsTransferModalOpen(true)}>
                      {t('directory.actions.transfer')}
                    </Button>
                  )}
                  {canAdjustSalary && (
                    <Button icon={<DollarOutlined />} onClick={() => setIsSalaryModalOpen(true)}>
                      {t('directory.actions.salary')}
                    </Button>
                  )}
                  {canDiscipline && (
                    <Button icon={<WarningOutlined />} onClick={() => setIsDisciplineModalOpen(true)}>
                      {t('directory.actions.discipline')}
                    </Button>
                  )}
                  {(role === 'ADMIN' || role === 'DEPT_LEAD' || role === 'DIRECTOR' || role === 'CHAIRMAN') && (
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        try {
                          await exportsService.exportEmployees();
                          message.success(t('exports.success'));
                        } catch (e) {
                          message.error(t('exports.failed'));
                        }
                      }}
                    >
                      {t('exports.button')}
                    </Button>
                  )}
                </Space>
              </div>
              <Table
                dataSource={filteredEmployees}
                loading={loading}
                columns={[
                  { title: t('employeeTable.id'), dataIndex: 'empCode', key: 'empCode' },
                  { title: t('employeeTable.name'), dataIndex: 'fullName', key: 'fullName' },
                  { title: t('modal.fields.email'), dataIndex: 'email', key: 'email' },
                  { title: t('employeeTable.department'), dataIndex: ['department', 'name'], key: 'department' },
                  { title: t('employeeTable.position'), dataIndex: ['position', 'title'], key: 'position' },
                  {
                    title: t('employeeTable.status'),
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => {
                      let color = 'green';
                      if (status === 'ONBOARDING') color = 'blue';
                      if (status === 'PROBATION') color = 'cyan';
                      if (status === 'SUSPENDED') color = 'gold';
                      if (status === 'NOTICE_PERIOD') color = 'orange';
                      if (status === 'TERMINATED') color = 'red';
                      return <Tag color={color}>{labelFor(t, 'employeeStatus', status)}</Tag>;
                    }
                  },
                  {
                    title: t('employeeTable.actions'),
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        {canEdit && (
                          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
                        )}
                      </Space>
                    )
                  }
                ]}
                rowKey="id"
              />
            </div>
          )
        },
        {
          key: 'onboarding',
          label: t('directory.tabs.onboarding'),
          children: (
            <Table
              dataSource={employees.filter(e => e.status === 'ONBOARDING')}
              columns={[
                { title: t('employeeTable.name'), dataIndex: 'fullName', key: 'fullName' },
                { title: t('employeeTable.department'), dataIndex: ['department', 'name'], key: 'department' },
                {
                  title: t('directory.onboardingCols.contract'),
                  key: 'contract',
                  render: () => <Badge status="success" text={t('directory.onboardingCols.done')} />
                },
                {
                  title: t('directory.onboardingCols.device'),
                  key: 'device',
                  render: () => <Badge status="processing" text={t('directory.onboardingCols.pendingDevice')} />
                },
                {
                  title: t('directory.onboardingCols.account'),
                  key: 'account',
                  render: () => <Badge status="processing" text={t('directory.onboardingCols.pendingAccount')} />
                }
              ]}
              rowKey="id"
            />
          )
        },
        {
          key: 'offboarding',
          label: t('directory.tabs.offboarding'),
          children: (
            <Table
              dataSource={employees.filter(e => e.status === 'TERMINATED' || e.status === 'NOTICE_PERIOD')}
              columns={[
                { title: t('employeeTable.name'), dataIndex: 'fullName', key: 'fullName' },
                {
                  title: t('employeeTable.status'),
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => (
                    <Tag color={status === 'TERMINATED' ? 'red' : 'orange'}>
                      {labelFor(t, 'employeeStatus', status)}
                    </Tag>
                  )
                },
                {
                  title: t('directory.offboardingCols.assets'),
                  key: 'assets',
                  render: () => <Badge status="warning" text={t('directory.offboardingCols.returning')} />
                },
                {
                  title: t('directory.offboardingCols.handover'),
                  key: 'handover',
                  render: () => <Badge status="processing" text={t('directory.offboardingCols.handingOver')} />
                },
                {
                  title: t('directory.offboardingCols.settlement'),
                  key: 'payroll',
                  render: () => <Badge status="default" text={t('directory.offboardingCols.refused')} />
                }
              ]}
              rowKey="id"
            />
          )
        }
      ]} />

      {/* MODAL: Employee Form (Add/Edit) */}
      <AppModal
        title={employeeForm.getFieldValue('id') ? t('modal.titleEdit') : t('modal.titleAdd')}
        open={isEmployeeModalOpen}
        onCancel={() => setIsEmployeeModalOpen(false)}
        onOk={() => employeeForm.submit()}
        confirmLoading={loadingActions.saveEmployee}
      >
        <Form
          form={employeeForm}
          layout="vertical"
          onFinish={handleEmployeeSubmit}
        >
          <Form.Item name="id" hidden><Input /></Form.Item>

          {/* Row 1: Full name + Email */}
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label={t('modal.fields.name')} name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('modal.fields.email')} name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2: Phone + DOB */}
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label={t('modal.fields.phone')} name="phone">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('directory.modals.dob')} name="dob">
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3: Tax code + Bank account */}
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label={t('directory.modals.taxCode')} name="taxCode">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('directory.modals.bankAccount')} name="bankAccount">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4: Department + Position */}
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label={t('modal.fields.department')} name="departmentId">
                <Select allowClear placeholder={t('modal.placeholders.department')}>
                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('modal.fields.position')} name="positionId">
                <Select allowClear placeholder={t('modal.placeholders.position')}>
                  {positions.map(p => <Select.Option key={p.id} value={p.id}>{p.title}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Row 5: Status (full width, optional) */}
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label={t('modal.fields.status')} name="status" initialValue="ONBOARDING">
                <Select>
                  <Select.Option value="ONBOARDING">{labelFor(t, 'employeeStatus', 'ONBOARDING')}</Select.Option>
                  <Select.Option value="ACTIVE">{labelFor(t, 'employeeStatus', 'OFFICIAL')}</Select.Option>
                  <Select.Option value="NOTICE_PERIOD">{labelFor(t, 'employeeStatus', 'NOTICE_PERIOD')}</Select.Option>
                  <Select.Option value="TERMINATED">{labelFor(t, 'employeeStatus', 'TERMINATED')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Row 6: Address (full width) */}
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label={t('directory.modals.address')} name="address">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </AppModal>

      {/* MODAL: Group B - Job Transfer Request */}
      <AppModal
        title={t('directory.modals.transferTitle')}
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        onOk={() => transferForm.submit()}
        confirmLoading={loadingActions.transfer}
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransferSubmit}>
          <Form.Item label={t('directory.modals.transferEmp')} name="employeeId" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
            <Select>
              {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.fullName} ({e.empCode})</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item label={t('directory.modals.newDept')} name="newDepartmentId" rules={[{ required: true, message: 'Vui lòng chọn phòng ban' }]}>
            <Select>
              {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item label={t('directory.modals.newPos')} name="newPositionId" rules={[{ required: true, message: 'Vui lòng chọn chức vụ' }]}>
            <Select>
              {positions.map(p => <Select.Option key={p.id} value={p.id}>{p.title}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item label={t('directory.modals.effectiveDate')} name="effectiveDate" rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực' }]}>
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </AppModal>

      {/* MODAL: Group C - Salary Adjustment Request */}
      <AppModal
        title={t('directory.modals.salaryTitle')}
        open={isSalaryModalOpen}
        onCancel={() => setIsSalaryModalOpen(false)}
        onOk={() => salaryForm.submit()}
        confirmLoading={loadingActions.adjustSalary}
      >
        <Form form={salaryForm} layout="vertical" onFinish={handleSalarySubmit}>
          <Form.Item label={t('directory.modals.salaryEmp')} name="employeeId" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
            <Select>
              {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.fullName} ({e.empCode})</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item label={t('directory.modals.newSalary')} name="newBaseSalary" rules={[{ required: true, message: 'Nhập lương cơ bản mới' }]}>
            <Input placeholder="Ví dụ: 18000000" />
          </Form.Item>

          <Form.Item label={t('directory.modals.newRatio')} name="newRatio" rules={[{ required: true, message: 'Nhập hệ số' }]}>
            <Input placeholder="Ví dụ: 1.2" />
          </Form.Item>

          <Form.Item label={t('directory.modals.applyDate')} name="effectiveDate" rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực' }]}>
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </AppModal>

      {/* MODAL: Group D - Discipline/Reward */}
      <AppModal
        title={t('directory.modals.disciplineTitle')}
        open={isDisciplineModalOpen}
        onCancel={() => setIsDisciplineModalOpen(false)}
        onOk={() => disciplineForm.submit()}
        confirmLoading={loadingActions.discipline}
      >
        <Form form={disciplineForm} layout="vertical" onFinish={handleDisciplineSubmit}>
          <Form.Item label={t('employeeTable.name')} name="employeeId" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
            <Select>
              {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.fullName} ({e.empCode})</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item label={t('directory.modals.disciplineType')} name="type" rules={[{ required: true, message: 'Chọn phân loại' }]}>
            <Select>
              <Select.Option value="REWARD">{labelFor(t, 'disciplineType', 'REWARD')}</Select.Option>
              <Select.Option value="DISCIPLINE">{labelFor(t, 'disciplineType', 'DISCIPLINE')}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label={t('directory.modals.amount')} name="amount" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <Input placeholder="Ví dụ: 2000000" />
          </Form.Item>

          <Form.Item label={t('directory.modals.reason')} name="reason" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </AppModal>
    </div>
  );
}
