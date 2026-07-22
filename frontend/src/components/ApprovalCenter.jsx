import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Form, Input, Timeline, Tabs, Typography, Spin } from 'antd';
import AppModal from './AppModal';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function ApprovalCenter({
  pendingApprovals,
  mySubmittedApprovals,
  onApprove,
  onReject,
  onGetHistory,
  loading = false,
  loadingActions = {},
  t
}) {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalDecisionAction, setApprovalDecisionAction] = useState('approve');
  const [requestHistory, setRequestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionRequestId, setActionRequestId] = useState(null);

  const [approvalForm] = Form.useForm();

  const handleOpenDecisionModal = async (record, action) => {
    setSelectedRequest(record);
    setApprovalDecisionAction(action);
    approvalForm.resetFields();
    setRequestHistory([]);
    setHistoryLoading(true);
    setIsApprovalModalOpen(true);
    try {
      const history = await onGetHistory(record.id);
      setRequestHistory(history);
    } catch (e) {
      setRequestHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDecisionSubmit = (values) => {
    const actionType = approvalDecisionAction; // 'approve' or 'reject'
    setActionRequestId(selectedRequest.id);
    if (actionType === 'approve') {
      onApprove(selectedRequest.id, values.comment);
    } else {
      onReject(selectedRequest.id, values.comment);
    }
    if (!loadingActions[actionType]) setIsApprovalModalOpen(false);
  };

  const closeModal = () => {
    setIsApprovalModalOpen(false);
    setActionRequestId(null);
  };

  const isModalLoading = loadingActions.approve || loadingActions.reject;
  const isRowActionLoading = (recordId) =>
    actionRequestId === recordId && isModalLoading;

  return (
    <Card style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <Tabs defaultActiveKey="pending" items={[
        {
          key: 'pending',
          label: `${t('approvals.tabs.pending')} (${pendingApprovals.length})`,
          children: (
            <Table
              dataSource={pendingApprovals}
              loading={loading}
              columns={[
                { title: t('approvals.cols.code'), dataIndex: 'requestCode', key: 'requestCode', render: (val, record) => val || `REQ-${record.id}` },
                { title: t('approvals.cols.type'), dataIndex: 'transactionType', key: 'transactionType' },
                { title: t('approvals.cols.requester'), dataIndex: ['requester', 'fullName'], key: 'requester' },
                { title: t('approvals.cols.currentLevel'), dataIndex: 'currentLevel', key: 'currentLevel', render: (val, r) => `Cấp ${val} / ${r.totalLevels}` },
                { title: t('approvals.cols.requiredRole'), dataIndex: 'requiredRole', key: 'requiredRole' },
                {
                  title: t('approvals.cols.actions'),
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        loading={loadingActions.approve && actionRequestId === record.id}
                        disabled={isModalLoading && actionRequestId !== record.id}
                        onClick={() => handleOpenDecisionModal(record, 'approve')}
                      >
                        {t('approvals.actions.approve')}
                      </Button>
                      <Button
                        danger
                        size="small"
                        icon={<CloseOutlined />}
                        loading={loadingActions.reject && actionRequestId === record.id}
                        disabled={isModalLoading && actionRequestId !== record.id}
                        onClick={() => handleOpenDecisionModal(record, 'reject')}
                      >
                        {t('approvals.actions.reject')}
                      </Button>
                    </Space>
                  )
                }
              ]}
              rowKey="id"
            />
          )
        },
        {
          key: 'submitted',
          label: t('approvals.tabs.submitted'),
          children: (
            <Table
              dataSource={mySubmittedApprovals}
              loading={loading}
              columns={[
                { title: t('approvals.cols.code'), dataIndex: 'requestCode', key: 'requestCode', render: (val, record) => val || `REQ-${record.id}` },
                { title: t('approvals.cols.type'), dataIndex: 'transactionType', key: 'transactionType' },
                { title: t('approvals.cols.status'), dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'orange'}>{s}</Tag> },
                { title: t('approvals.cols.currentLevel'), dataIndex: 'currentLevel', key: 'currentLevel', render: (val, r) => `Cấp ${val} / ${r.totalLevels}` },
                {
                  title: t('approvals.cols.history'),
                  key: 'history',
                  render: (_, record) => (
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      loading={isRowActionLoading(record.id)}
                      onClick={() => handleOpenDecisionModal(record, 'view')}
                    >
                      {t('approvals.actions.history')}
                    </Button>
                  )
                }
              ]}
              rowKey="id"
            />
          )
        }
      ]} />

      {/* MODAL: Approver comments timeline decision */}
      <AppModal
        title={approvalDecisionAction === 'view' ? t('approvals.modal.historyTitle') : t('approvals.modal.commentTitle')}
        open={isApprovalModalOpen}
        onCancel={closeModal}
        onOk={() => {
          if (approvalDecisionAction === 'view') {
            closeModal();
          } else {
            approvalForm.submit();
          }
        }}
        confirmLoading={isModalLoading}
        okButtonProps={{ disabled: isModalLoading }}
        cancelButtonProps={{ disabled: isModalLoading }}
      >
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : requestHistory.length > 0 ? (
          <div style={{ marginBottom: 24, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>{t('approvals.modal.progress')}</Text>
            <Timeline items={requestHistory.map(h => ({
              color: h.action === 'APPROVE' ? 'green' : 'red',
              children: (
                <div>
                  <Text strong>{h.approverRole} - {h.approver?.fullName || t('approvals.modal.approver')}</Text>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{dayjs(h.actionAt).format('YYYY-MM-DD HH:mm')}</span>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={h.action === 'APPROVE' ? 'success' : 'error'}>{h.action}</Tag>
                    {h.comment && <Text type="secondary" italic style={{ fontSize: 12, marginLeft: 8 }}>"{h.comment}"</Text>}
                  </div>
                </div>
              )
            }))} />
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: 16 }}>{t('approvals.modal.noProgress')}</p>
        )}

        {approvalDecisionAction !== 'view' && (
          <Form form={approvalForm} layout="vertical" onFinish={handleDecisionSubmit} disabled={isModalLoading}>
            <Form.Item label={t('approvals.modal.commentLabel')} name="comment">
              <Input.TextArea placeholder={t('approvals.modal.commentPlaceholder')} rows={3} />
            </Form.Item>
          </Form>
        )}
      </AppModal>
    </Card>
  );
}
