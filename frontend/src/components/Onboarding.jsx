import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Input, Form, Select, Tag, message, Popconfirm, Space,
  DatePicker, Steps, Descriptions, Progress, Divider, Alert, Modal,
} from 'antd';
import {
  ReloadOutlined, CheckOutlined, PlusOutlined, ArrowUpOutlined,
  UserAddOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api.js';
import { labelFor } from '../utils/labelMapping.js';

const STATUS_COLORS = {
  PENDING: 'gold',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};

export default function Onboarding({ t, departments = [], positions = [] }) {
  const [tasks, setTasks] = useState([]);
  const [onboardingList, setOnboardingList] = useState([]); // list nhân viên đang onboarding
  const [loading, setLoading] = useState(false);
  const [initOpen, setInitOpen] = useState(false);
  const [initSubmitting, setInitSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: form, 1: checklist
  const [createdData, setCreatedData] = useState(null); // { employee, tasks }
  const [form] = Form.useForm();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [detailTasks, setDetailTasks] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [taskData, allEmps] = await Promise.all([
        api.onboarding.getAllTasks(),
        api.employees.getAll ? api.employees.getAll() : Promise.resolve([]),
      ]);
      setTasks(taskData || []);

      // Lọc nhân viên đang onboarding
      const onboardingEmps = (allEmps || []).filter(
        (e) => e.status === 'ONBOARDING' || e.status === 'PROBATION'
      );
      setOnboardingList(onboardingEmps);
    } catch (e) {
      message.error(t('common.errorLoadOnboarding'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (employeeId) => {
    try {
      const tasks = await api.onboarding.getByEmployee(employeeId);
      const emp = onboardingList.find((e) => e.id === employeeId);
      setDetailEmployee(emp);
      setDetailTasks(tasks || []);
      setDetailOpen(true);
    } catch (e) {
      message.error(t('common.errorLoadOnboarding'));
    }
  };

  const onInitiate = async () => {
    setInitSubmitting(true);
    try {
      const values = await form.validateFields();
      const payload = {
        employee: {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          gender: values.gender,
          dob: values.dob ? values.dob.format('YYYY-MM-DD') : undefined,
          address: values.address,
          taxCode: values.taxCode,
          bankName: values.bankName,
          bankAccount: values.bankAccount,
          joinDate: values.joinDate ? values.joinDate.format('YYYY-MM-DD') : undefined,
          departmentId: values.departmentId,
          positionId: values.positionId,
        },
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      };

      const result = await api.onboarding.initiate(payload);
      setCreatedData(result);
      setCurrentStep(1);
      message.success(t('onb.initSuccess'));
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      const msg = e?.i18nKey ? t(e.i18nKey) : t('common.errorInitOnboarding');
      message.error(msg);
    } finally {
      setInitSubmitting(false);
    }
  };

  const onComplete = async (taskId) => {
    try {
      await api.onboarding.completeTask(taskId);
      message.success(t('common.successCompleteTask'));
      await load();
      // Refresh detail if open
      if (detailOpen && detailEmployee) {
        const updatedTasks = await api.onboarding.getByEmployee(detailEmployee.id);
        setDetailTasks(updatedTasks || []);
      }
    } catch (e) {
      message.error(t('common.errorCompleteTask'));
    }
  };

  const onPromote = async (employeeId) => {
    try {
      await api.onboarding.promote(employeeId);
      message.success(t('onb.promoteSuccess'));
      await load();
      if (detailOpen) setDetailOpen(false);
    } catch (e) {
      message.error(t('onb.promoteError'));
    }
  };

  const resetModal = () => {
    setInitOpen(false);
    setCurrentStep(0);
    setCreatedData(null);
    form.resetFields();
  };

  // --- Main Task Table Columns ---
  const columns = [
    {
      title: t('onb.cols.employee'),
      key: 'employee',
      render: (_, row) => (
        <Button type="link" onClick={() => openDetail(row.employeeId)} style={{ padding: 0 }}>
          {row.employee?.fullName || `#${row.employeeId}`}
        </Button>
      ),
    },
    { title: t('onb.cols.taskTitle'), dataIndex: 'taskTitle', key: 'taskTitle' },
    {
      title: t('onb.cols.department'),
      dataIndex: 'targetDepartment',
      key: 'targetDepartment',
      render: (v) => <Tag color="cyan">{labelFor(t, 'onboardingTaskDepartment', v)}</Tag>,
    },
    {
      title: t('onb.cols.dueDate'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
    },
    {
      title: t('onb.cols.status'),
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{labelFor(t, 'onbOffbTaskStatus', v)}</Tag>,
    },
    {
      title: t('onb.cols.actions'),
      key: 'actions',
      render: (_, row) => (
        <Space size="small">
          {row.status === 'PENDING' && (
            <Popconfirm title={t('onb.confirmComplete')} onConfirm={() => onComplete(row.id)}>
              <Button type="primary" size="small" icon={<CheckOutlined />}>
                {t('onb.btnComplete')}
              </Button>
            </Popconfirm>
          )}
          {row.targetDepartment === 'HR' && row.status === 'COMPLETED' && (
            <Popconfirm
              title={t('onb.confirmPromote')}
              onConfirm={() => onPromote(row.employeeId)}
            >
              <Button size="small" icon={<ArrowUpOutlined />} type="default">
                {t('onb.btnPromote')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // --- Step 2: Checklist View ---
  const renderStep2 = () => {
    if (!createdData) return null;
    const { employee, tasks: empTasks } = createdData;
    const completed = empTasks.filter((t) => t.status === 'COMPLETED').length;
    const total = empTasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const allDone = completed === total;

    const taskColumns = [
      {
        title: t('onb.cols.taskTitle'),
        dataIndex: 'taskTitle',
        key: 'taskTitle',
      },
      {
        title: t('onb.cols.department'),
        dataIndex: 'targetDepartment',
        key: 'targetDepartment',
        render: (v) => <Tag color="cyan">{labelFor(t, 'onboardingTaskDepartment', v)}</Tag>,
      },
      {
        title: t('onb.cols.status'),
        dataIndex: 'status',
        key: 'status',
        render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{labelFor(t, 'onbOffbTaskStatus', v)}</Tag>,
      },
      {
        title: t('onb.cols.actions'),
        key: 'actions',
        render: (_, row) => (
          <>
            {row.status === 'PENDING' && (
              <Popconfirm title={t('onb.confirmComplete')} onConfirm={() => onComplete(row.id)}>
                <Button type="primary" size="small" icon={<CheckOutlined />}>
                  {t('onb.btnComplete')}
                </Button>
              </Popconfirm>
            )}
          </>
        ),
      },
    ];

    return (
      <div>
        <Alert
          type="success"
          icon={<CheckCircleFilled />}
          message={t('onb.createdSuccess')}
          description={`${employee.fullName} (${employee.empCode || `#${employee.id}`}) — ${t('onb.accountCreated')}`}
          style={{ marginBottom: 16 }}
        />

        <Descriptions
          title={t('onb.employeeInfo')}
          column={2}
          size="small"
          style={{ marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}
        >
          <Descriptions.Item label={t('modal.fields.name')}>{employee.fullName}</Descriptions.Item>
          <Descriptions.Item label={t('modal.fields.email')}>{employee.email}</Descriptions.Item>
          <Descriptions.Item label={t('directory.modals.dob')}>
            {employee.dob ? dayjs(employee.dob).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('modal.fields.department')}>
            {employee.department?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('modal.fields.position')}>
            {employee.position?.title || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('directory.modals.taxCode')}>
            {employee.taxCode || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('onb.bankName')}>
            {employee.bankName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('onb.bankAccount')}>
            {employee.bankAccount || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('onb.tempPassword')}>
            <Tag color="purple">Temp@{employee.empCode || 'XXXX'}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">{t('onb.checklistProgress')}</Divider>

        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Progress percent={percent} status={allDone ? 'success' : 'active'} style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
            {completed}/{total} {t('onb.tasksCompleted')}
          </span>
        </div>

        <Table
          rowKey="id"
          dataSource={empTasks}
          columns={taskColumns}
          pagination={false}
          size="small"
        />

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={resetModal}>{t('common.close')}</Button>
          {allDone && (
            <Popconfirm
              title={t('onb.confirmPromote')}
              onConfirm={() => onPromote(employee.id)}
            >
              <Button type="primary" icon={<ArrowUpOutlined />}>
                {t('onb.btnPromote')}
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>
    );
  };

  // --- Step 1: Employee Form ---
  const renderStep1 = () => (
    <Form layout="vertical" form={form} initialValues={{ gender: 'MALE' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Form.Item
          label={t('modal.fields.name')}
          name="fullName"
          rules={[{ required: true, message: t('onb.validation.nameRequired') }]}
        >
          <Input placeholder={t('onb.placeholder.name')} />
        </Form.Item>

        <Form.Item
          label={t('modal.fields.email')}
          name="email"
          rules={[
            { required: true, message: t('onb.validation.emailRequired') },
            { type: 'email', message: t('onb.validation.emailInvalid') },
          ]}
        >
          <Input placeholder={t('onb.placeholder.email')} />
        </Form.Item>

        <Form.Item label={t('modal.fields.phone')} name="phone">
          <Input placeholder={t('onb.placeholder.phone')} />
        </Form.Item>

        <Form.Item label={t('modal.fields.gender')} name="gender">
          <Select>
            <Select.Option value="MALE">{t('onb.gender.male')}</Select.Option>
            <Select.Option value="FEMALE">{t('onb.gender.female')}</Select.Option>
            <Select.Option value="OTHER">{t('onb.gender.other')}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('directory.modals.dob')}
          name="dob"
          rules={[{ required: true, message: t('onb.validation.dobRequired') }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={t('directory.modals.address')} name="address">
          <Input.TextArea rows={1} placeholder={t('onb.placeholder.address')} />
        </Form.Item>

        <Form.Item label={t('directory.modals.taxCode')} name="taxCode">
          <Input placeholder={t('onb.placeholder.taxCode')} />
        </Form.Item>

        <Form.Item label={t('onb.bankName')} name="bankName">
          <Select
            placeholder={t('onb.placeholder.bankName')}
            showSearch
            optionFilterProp="children"
            options={[
              { value: 'VCB', label: 'Vietcombank' },
              { value: 'VTB', label: 'VietinBank' },
              { value: 'BIDV', label: 'BIDV' },
              { value: 'ACB', label: 'ACB' },
              { value: 'TPB', label: 'TPBank' },
              { value: 'MBB', label: 'MB Bank' },
              { value: 'VPB', label: 'VPBank' },
              { value: 'TCB', label: 'Techcombank' },
              { value: 'STB', label: 'Sacombank' },
              { value: 'EXIM', label: 'Eximbank' },
              { value: 'ABB', label: 'ABBANK' },
              { value: 'SHB', label: 'SHB' },
              { value: 'HDB', label: 'HDBank' },
              { value: 'MSB', label: 'MSB' },
              { value: 'OCB', label: 'OCB' },
              { value: 'OTHER', label: t('onb.bankOther') },
            ]}
          />
        </Form.Item>

        <Form.Item label={t('onb.bankAccount')} name="bankAccount">
          <Input placeholder={t('onb.placeholder.bankAccount')} />
        </Form.Item>

        <Form.Item label={t('onb.joinDate')} name="joinDate">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={t('modal.fields.department')} name="departmentId">
          <Select placeholder={t('onb.placeholder.department')} allowClear showSearch>
            {departments.map((d) => (
              <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={t('modal.fields.position')} name="positionId">
          <Select placeholder={t('onb.placeholder.position')} allowClear showSearch>
            {positions.map((p) => (
              <Select.Option key={p.id} value={p.id}>{p.title}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={t('onb.dueDate')} name="dueDate">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </div>
    </Form>
  );

  // --- Detail Modal for existing onboarding employee ---
  const renderDetailContent = () => {
    if (!detailEmployee) return null;
    const completed = detailTasks.filter((t) => t.status === 'COMPLETED').length;
    const total = detailTasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const allDone = completed === total && total > 0;

    const detailCols = [
      { title: t('onb.cols.taskTitle'), dataIndex: 'taskTitle', key: 'taskTitle' },
      {
        title: t('onb.cols.department'),
        dataIndex: 'targetDepartment',
        key: 'targetDepartment',
        render: (v) => <Tag color="cyan">{labelFor(t, 'onboardingTaskDepartment', v)}</Tag>,
      },
      {
        title: t('onb.cols.dueDate'),
        dataIndex: 'dueDate',
        key: 'dueDate',
        render: (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
      },
      {
        title: t('onb.cols.status'),
        dataIndex: 'status',
        key: 'status',
        render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{labelFor(t, 'onbOffbTaskStatus', v)}</Tag>,
      },
      {
        title: t('onb.cols.actions'),
        key: 'actions',
        render: (_, row) => (
          <>
            {row.status === 'PENDING' && (
              <Popconfirm title={t('onb.confirmComplete')} onConfirm={() => onComplete(row.id)}>
                <Button type="primary" size="small" icon={<CheckOutlined />}>
                  {t('onb.btnComplete')}
                </Button>
              </Popconfirm>
            )}
          </>
        ),
      },
    ];

    return (
      <div>
        <Descriptions
          title={detailEmployee.fullName}
          column={2}
          size="small"
          extra={
            <Tag color={detailEmployee.status === 'ONBOARDING' ? 'processing' : detailEmployee.status === 'PROBATION' ? 'cyan' : 'warning'}>
              {labelFor(t, 'employeeStatus', detailEmployee.status)}
            </Tag>
          }
          style={{ marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}
        >
          <Descriptions.Item label={t('employeeTable.id')}>
            {detailEmployee.empCode || `#${detailEmployee.id}`}
          </Descriptions.Item>
          <Descriptions.Item label={t('modal.fields.email')}>{detailEmployee.email}</Descriptions.Item>
          <Descriptions.Item label={t('modal.fields.department')}>
            {detailEmployee.department?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('modal.fields.position')}>
            {detailEmployee.position?.title || '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">{t('onb.checklistProgress')}</Divider>

        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Progress percent={percent} status={allDone ? 'success' : 'active'} style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
            {completed}/{total} {t('onb.tasksCompleted')}
          </span>
        </div>

        {total === 0 && (
          <Alert
            type="info"
            message={t('onb.noTasksYet')}
            description={t('onb.noTasksYetDesc')}
            style={{ marginBottom: 12 }}
          />
        )}

        <Table
          rowKey="id"
          dataSource={detailTasks}
          columns={detailCols}
          pagination={false}
          size="small"
        />

        {allDone && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Popconfirm
              title={t('onb.confirmPromote')}
              onConfirm={() => onPromote(detailEmployee.id)}
            >
              <Button type="primary" icon={<ArrowUpOutlined />}>
                {t('onb.btnPromote')}
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      title={t('onb.cardTitle')}
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setInitOpen(true)}>
            {t('onb.btnInitiate')}
          </Button>
        </Space>
      )}
      style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
    >
      <Table
        rowKey="id"
        dataSource={tasks}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal Khởi tạo Onboarding */}
      <Modal
        title={t('onb.modalInitTitle')}
        open={initOpen}
        onCancel={resetModal}
        width={760}
        footer={
          currentStep === 0 ? (
            <Space>
              <Button onClick={resetModal}>{t('common.cancel')}</Button>
              <Button type="primary" loading={initSubmitting} onClick={onInitiate}>
                {t('onb.btnInitiate')}
              </Button>
            </Space>
          ) : null
        }
        destroyOnClose
      >
        <Steps
          current={currentStep}
          items={[
            { title: t('onb.step1Title'), icon: <UserAddOutlined /> },
            { title: t('onb.step2Title'), icon: <CheckCircleFilled /> },
          ]}
          style={{ marginBottom: 24 }}
        />

        {currentStep === 0 ? renderStep1() : renderStep2()}
      </Modal>

      {/* Modal Chi tiết Onboarding của nhân viên đã có */}
      <Modal
        title={t('onb.detailModalTitle')}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={760}
        footer={null}
        destroyOnClose
      >
        {renderDetailContent()}
      </Modal>
    </Card>
  );
}
