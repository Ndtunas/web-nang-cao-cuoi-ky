import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Input, Form, Select, Tag, message, Popconfirm, Space, DatePicker,
} from 'antd';
import { ReloadOutlined, CheckOutlined, PlusOutlined, ArrowUpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api.js';

const STATUS_COLORS = {
  PENDING: 'gold',
  COMPLETED: 'green',
};

export default function Onboarding({ t }) {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initOpen, setInitOpen] = useState(false);
  const [initSubmitting, setInitSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [taskData, empData] = await Promise.all([
        api.onboarding.getAllTasks(),
        api.employees.getAll(),
      ]);
      setTasks(taskData || []);
      setEmployees((empData || []).filter((e) => e.status === 'ONBOARDING' || e.status === 'PROBATION'));
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('common.errorLoadOnboarding');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onInitiate = async () => {
    setInitSubmitting(true);
    try {
      const values = await form.validateFields();
      await api.onboarding.initiate({
        employeeId: values.employeeId,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      });
      message.success(t('onb.initSuccess'));
      setInitOpen(false);
      form.resetFields();
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
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('common.errorCompleteTask');
      message.error(msg);
    }
  };

  const onPromote = async (employeeId) => {
    try {
      await api.onboarding.promote(employeeId);
      message.success(t('onb.promoteSuccess'));
      await load();
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('onb.promoteError');
      message.error(msg);
    }
  };

  const columns = [
    { title: t('onb.cols.code'), dataIndex: 'id', key: 'id', width: 80 },
    {
      title: t('onb.cols.employee'),
      key: 'employee',
      render: (_, row) => row.employee?.fullName || `#${row.employeeId}`,
    },
    { title: t('onb.cols.taskTitle'), dataIndex: 'taskTitle', key: 'taskTitle' },
    {
      title: t('onb.cols.department'),
      dataIndex: 'targetDepartment',
      key: 'targetDepartment',
      render: (v) => <Tag color="cyan">{v}</Tag>,
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
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
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
            <Popconfirm title={t('onb.confirmPromote')} onConfirm={() => onPromote(row.employeeId)}>
              <Button size="small" icon={<ArrowUpOutlined />} type="default">
                {t('onb.btnPromote')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={t('onb.cardTitle')}
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setInitOpen(true)}>
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

      <Modal
        title={t('onb.modalInitTitle')}
        open={initOpen}
        onCancel={() => setInitOpen(false)}
        onOk={onInitiate}
        confirmLoading={initSubmitting}
        okText={t('onb.btnInitiate')}
        cancelText={t('common.cancel')}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label={t('onb.cols.employee')}
            name="employeeId"
            rules={[{ required: true, message: t('onb.validation.empRequired') }]}
          >
            <Select placeholder={t('onb.placeholderEmployee')} showSearch optionFilterProp="children">
              {employees.map((e) => (
                <Select.Option key={e.id} value={e.id}>
                  {e.fullName} ({e.empCode || `#${e.id}`})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label={t('onb.cols.dueDate')} name="dueDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
