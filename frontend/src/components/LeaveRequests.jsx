import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Form, Select, DatePicker, Input, Tag, Space, message, Popconfirm,
} from 'antd';
import AppModal from './AppModal.jsx';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { exportsService } from '../services/exports.service.js';
import dayjs from 'dayjs';
import { api } from '../api.js';

const LEAVE_TYPE_COLORS = {
  ANNUAL_LEAVE: 'blue',
  SICK_LEAVE: 'red',
  MATERNITY_LEAVE: 'magenta',
  UNPAID_LEAVE: 'orange',
  COMPASSIONATE_LEAVE: 'purple',
};

const STATUS_COLORS = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'default',
};

export default function LeaveRequests({ t, isAdminView = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = isAdminView ? await api.leave.getAll() : await api.leave.getMyRequests();
      setItems(data || []);
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('common.errorLoadLeaveRequests');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAdminView]);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const [start, end] = values.dateRange;
      await api.leave.submit({
        leaveType: values.leaveType,
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        reason: values.reason || '',
      });
      message.success(t('leave.msgSubmitted'));
      setModalOpen(false);
      form.resetFields();
      await load();
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('leave.msgSubmitError');
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (id) => {
    try {
      await api.leave.cancel(id);
      message.success(t('leave.msgCancelled'));
      await load();
    } catch (e) {
      const msg = e?.i18nKey ? t(e.i18nKey) : t('leave.msgCancelError');
      message.error(msg);
    }
  };

  const columns = [
    {
      title: t('leave.cols.code'),
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: t('leave.cols.type'),
      dataIndex: 'leaveType',
      key: 'leaveType',
      render: (v) => {
        const color = LEAVE_TYPE_COLORS[v];
        const label = t(`leave.typeLabels.${v}`, { defaultValue: v });
        return color ? <Tag color={color}>{label}</Tag> : label;
      },
    },
    {
      title: t('leave.cols.range'),
      key: 'range',
      render: (_, row) =>
        `${dayjs(row.startDate).format('YYYY-MM-DD')} → ${dayjs(row.endDate).format('YYYY-MM-DD')}`,
    },
    {
      title: t('leave.cols.days'),
      key: 'days',
      render: (_, row) => {
        const s = new Date(row.startDate);
        const e = new Date(row.endDate);
        return Math.floor((e - s) / 86400000) + 1;
      },
      width: 90,
    },
    ...(isAdminView
      ? [{
          title: t('leave.cols.requester'),
          key: 'requester',
          render: (_, row) => row.employee?.fullName || `#${row.employeeId}`,
        }]
      : []),
    {
      title: t('leave.cols.status'),
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const color = STATUS_COLORS[v];
        const label = t(`leave.statusLabels.${v}`, { defaultValue: v });
        return color ? <Tag color={color}>{label}</Tag> : label;
      },
    },
    {
      title: t('leave.cols.actions'),
      key: 'actions',
      render: (_, row) =>
        !isAdminView && row.status === 'PENDING' ? (
          <Popconfirm
            title={t('leave.confirmCancel')}
            onConfirm={() => onCancel(row.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <Card
      title={t('leave.cardTitle')}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            {t('common.refresh')}
          </Button>
          {!isAdminView && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              {t('leave.btnNew')}
            </Button>
          )}
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              const now = new Date();
              try {
                await exportsService.exportLeaveRequests(
                  now.getMonth() + 1,
                  now.getFullYear(),
                );
                message.success(t('exports.success'));
              } catch (e) {
                message.error(t('exports.failed'));
              }
            }}
          >
            {t('exports.button')}
          </Button>
        </Space>
      }
      style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
    >
      <Table
        rowKey="id"
        dataSource={items}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <AppModal
        title={t('leave.modalTitle')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={t('common.submit')}
        cancelText={t('common.cancel')}
        confirmLoading={submitting}
      >
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item
            label={t('leave.cols.type')}
            name="leaveType"
            rules={[{ required: true, message: t('leave.validation.typeRequired') }]}
          >
            <Select placeholder={t('leave.placeholderType')}>
              {Object.keys(LEAVE_TYPE_COLORS).map((k) => (
                <Select.Option key={k} value={k}>
                  {t(`leave.typeLabels.${k}`, { defaultValue: k })}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={t('leave.cols.range')}
            name="dateRange"
            rules={[{ required: true, message: t('leave.validation.rangeRequired') }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={t('leave.cols.reason')} name="reason">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </AppModal>
    </Card>
  );
}
