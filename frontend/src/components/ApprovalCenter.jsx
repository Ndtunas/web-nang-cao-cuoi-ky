import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Timeline, Tabs, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function ApprovalCenter({
  pendingApprovals,
  mySubmittedApprovals,
  onApprove,
  onReject,
  onGetHistory,
  t
}) {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalDecisionAction, setApprovalDecisionAction] = useState('approve'); // approve, reject, view
  const [requestHistory, setRequestHistory] = useState([]);
  
  const [approvalForm] = Form.useForm();

  const handleOpenDecisionModal = async (record, action) => {
    setSelectedRequest(record);
    setApprovalDecisionAction(action);
    approvalForm.resetFields();
    try {
      const history = await onGetHistory(record.id);
      setRequestHistory(history);
    } catch (e) {
      setRequestHistory([]);
    }
    setIsApprovalModalOpen(true);
  };

  const handleDecisionSubmit = (values) => {
    if (approvalDecisionAction === 'approve') {
      onApprove(selectedRequest.id, values.comment);
    } else {
      onReject(selectedRequest.id, values.comment);
    }
    setIsApprovalModalOpen(false);
  };

  return (
    <Card style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <Tabs defaultActiveKey="pending" items={[
        {
          key: 'pending',
          label: `${t('approvals.tabs.pending')} (${pendingApprovals.length})`,
          children: (
            <Table
              dataSource={pendingApprovals}
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
                      <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleOpenDecisionModal(record, 'approve')}>{t('approvals.actions.approve')}</Button>
                      <Button danger size="small" icon={<CloseOutlined />} onClick={() => handleOpenDecisionModal(record, 'reject')}>{t('approvals.actions.reject')}</Button>
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
              columns={[
                { title: t('approvals.cols.code'), dataIndex: 'requestCode', key: 'requestCode', render: (val, record) => val || `REQ-${record.id}` },
                { title: t('approvals.cols.type'), dataIndex: 'transactionType', key: 'transactionType' },
                { title: t('approvals.cols.status'), dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'orange'}>{s}</Tag> },
                { title: t('approvals.cols.currentLevel'), dataIndex: 'currentLevel', key: 'currentLevel', render: (val, r) => `Cấp ${val} / ${r.totalLevels}` },
                {
                  title: t('approvals.cols.history'),
                  key: 'history',
                  render: (_, record) => (
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenDecisionModal(record, 'view')}>{t('approvals.actions.history')}</Button>
                  )
                }
              ]}
              rowKey="id"
            />
          )
        }
      ]} />

      {/* MODAL: Approver comments timeline decision */}
      <Modal
        title={approvalDecisionAction === 'view' ? t('approvals.modal.historyTitle') : t('approvals.modal.commentTitle')}
        open={isApprovalModalOpen}
        onCancel={() => setIsApprovalModalOpen(false)}
        onOk={() => {
          if (approvalDecisionAction === 'view') {
            setIsApprovalModalOpen(false);
          } else {
            approvalForm.submit();
          }
        }}
      >
        {requestHistory.length > 0 ? (
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
          <Form form={approvalForm} layout="vertical" onFinish={handleDecisionSubmit}>
            <Form.Item label={t('approvals.modal.commentLabel')} name="comment">
              <Input.TextArea placeholder={t('approvals.modal.commentPlaceholder')} rows={3} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
}
