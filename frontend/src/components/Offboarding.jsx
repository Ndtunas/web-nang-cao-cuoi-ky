import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Input, Tag, message, Popconfirm, Form,
} from 'antd';
import { LogoutOutlined, ReloadOutlined, CheckOutlined } from '@ant-design/icons';
import { api } from '../api.js';

const STATUS_COLORS = {
  PENDING: 'gold',
  COMPLETED: 'green',
};

export default function Offboarding({ t, role }) {
  const isLead = ['ADMIN', 'DIRECTOR', 'CHAIRMAN', 'DEPT_LEAD'].includes(role);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    if (!isLead) return;
    setLoading(true);
    try {
      const data = await api.offboarding.getAllPendingTasks();
      setTasks(data || []);
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('common.errorLoadOffboarding');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isLead]);

  const onResign = async () => {
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      await api.offboarding.submitResignation(values.reason || '');
      message.success(t('common.successCreate'));
      setModalOpen(false);
      form.resetFields();
      await load();
    } catch (e) {
      if (e?.errorFields) return; // antd validation error
      const msg = e?.i18nKey ? t(e.i18nKey) : t('common.errorResign');
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onComplete = async (taskId) => {
    try {
      await api.offboarding.completeTask(taskId);
      message.success(t('common.successCompleteTask'));
      await load();
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('common.errorCompleteTask');
      message.error(msg);
    }
  };

  const columns = [
    {
      title: t('offb.cols.code'),
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: t('offb.cols.employee'),
      key: 'employee',
      render: (_, row) => row.employee?.fullName || `#${row.employeeId}`,
    },
    {
      title: t('offb.cols.taskTitle'),
      dataIndex: 'taskTitle',
      key: 'taskTitle',
    },
    {
      title: t('offb.cols.department'),
      dataIndex: 'targetDepartment',
      key: 'targetDepartment',
      render: (v) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: t('offb.cols.status'),
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: t('offb.cols.actions'),
      key: 'actions',
      render: (_, row) =>
        row.status === 'PENDING' ? (
          <Popconfirm
            title={t('offb.confirmComplete')}
            onConfirm={() => onComplete(row.id)}
          >
            <Button type="primary" size="small" icon={<CheckOutlined />}>
              {t('offb.btnComplete')}
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  if (!isLead) {
    return (
      <Card
        title={t('offb.cardTitle')}
        extra={(
          <Button type="primary" icon={<LogoutOutlined />} onClick={() => setModalOpen(true)}>
            {t('offb.btnResign')}
          </Button>
        )}
        style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
      >
        <p style={{ color: '#94a3b8' }}>{t('offb.employeeHint')}</p>
        <Modal
          title={t('offb.modalResignTitle')}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={onResign}
          confirmLoading={submitting}
          okText={t('offb.btnSubmit')}
          cancelText={t('common.cancel')}
        >
          <Form layout="vertical" form={form}>
            <Form.Item label={t('offb.cols.reason')} name="reason" rules={[{ required: true, message: t('offb.validation.reasonRequired') }]}>
              <Input.TextArea rows={4} maxLength={500} showCount />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    );
  }

  return (
    <Card
      title={t('offb.cardTitle')}
      extra={(
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          {t('common.refresh')}
        </Button>
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
    </Card>
  );
}
