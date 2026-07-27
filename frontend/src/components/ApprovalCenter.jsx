import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Form, Input, Timeline, Tabs, Typography, Spin, Descriptions, Divider } from 'antd';
import AppModal from './AppModal';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { approvalsService } from '../services/approvals.service.js';

const { Text, Title } = Typography;

const ACTION_LABELS = {
  approve: 'approvals.actions.approve',
  reject: 'approvals.actions.reject',
  view: 'approvals.actions.viewDetail',
};

export default function ApprovalCenter({
  pendingApprovals,
  mySubmittedApprovals,
  onApprove,
  onReject,
  onGetHistory,
  loading = false,
  loadingActions = {},
  t,
  mode = 'full',
  initialRequestId = null,
}) {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalDecisionAction, setApprovalDecisionAction] = useState('approve');
  const [requestHistory, setRequestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionRequestId, setActionRequestId] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [approvalForm] = Form.useForm();

  const isSubmittedOnly = mode === 'submitted-only';
  const isViewOnly = isSubmittedOnly || approvalDecisionAction === 'view';

  // Mở modal khi có notification click
  React.useEffect(() => {
    if (initialRequestId) {
      const request = pendingApprovals.find(r => r.id === initialRequestId)
        || mySubmittedApprovals.find(r => r.id === initialRequestId);
      if (request) {
        handleOpenDecisionModal(request, 'view');
      }
    }
  }, [initialRequestId]);

  const handleOpenDecisionModal = async (record, action) => {
    setSelectedRequest(record);
    setApprovalDecisionAction(action);
    approvalForm.resetFields();
    setRequestHistory([]);
    setModalDetail(null);
    setHistoryLoading(true);
    setDetailLoading(true);
    setIsApprovalModalOpen(true);
    try {
      const [history, detail] = await Promise.all([
        onGetHistory(record.id),
        approvalsService.getDetail(record.id),
      ]);
      setRequestHistory(history);
      setModalDetail(detail);
    } catch (e) {
      setRequestHistory([]);
      setModalDetail(null);
    } finally {
      setHistoryLoading(false);
      setDetailLoading(false);
    }
  };

  const handleDecisionSubmit = (values) => {
    const actionType = approvalDecisionAction;
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

  const getRequestTypeLabel = (type) => {
    const labels = {
      LEAVE_SHORT: t('approvals.requestTypes.leaveShort', { defaultValue: 'Nghỉ phép ngắn ngày' }),
      LEAVE_LONG: t('approvals.requestTypes.leaveLong', { defaultValue: 'Nghỉ phép dài ngày' }),
      JOB_TRANSFER: t('approvals.requestTypes.jobTransfer', { defaultValue: 'Điều chuyển công tác' }),
      SALARY_ADJUSTMENT: t('approvals.requestTypes.salaryAdjustment', { defaultValue: 'Tăng lương' }),
      TIMESHEET: t('approvals.requestTypes.timesheet', { defaultValue: 'Chấm công' }),
      OFFBOARDING: t('approvals.requestTypes.offboarding', { defaultValue: 'Nghỉ việc' }),
      PERSONAL_INFO_CHANGE: t('approvals.requestTypes.personalInfoChange', { defaultValue: 'Thay đổi thông tin' }),
      DISCIPLINE_REWARD: t('approvals.requestTypes.disciplineReward', { defaultValue: 'Kỷ luật/Thưởng' }),
      RESET_PASSWORD: t('approvals.requestTypes.resetPassword', { defaultValue: 'Đặt lại mật khẩu' }),
    };
    return labels[type] || type;
  };

  const renderRequestDetail = () => {
    if (detailLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      );
    }
    if (!modalDetail?.detail) {
      return <Text type="secondary">{t('approvals.modal.noDetail', { defaultValue: 'Không có chi tiết' })}</Text>;
    }

    const d = modalDetail.detail;
    const type = modalDetail.transactionType;

    if (type === 'LEAVE_SHORT' || type === 'LEAVE_LONG') {
      return (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('leave.cols.type', { defaultValue: 'Loại' })}>
            <Tag color="blue">{d.leaveType}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('leave.cols.range', { defaultValue: 'Thời gian' })}>
            {d.startDate ? `${dayjs(d.startDate).format('DD/MM/YYYY')} → ${dayjs(d.endDate).format('DD/MM/YYYY')}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('leave.cols.days', { defaultValue: 'Số ngày' })}>
            {d.startDate && d.endDate
              ? Math.floor((new Date(d.endDate) - new Date(d.startDate)) / 86400000) + 1
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('leave.cols.reason', { defaultValue: 'Lý do' })}>
            {d.reason || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.requester', { defaultValue: 'Người gửi' })}>
            {modalDetail.requester?.fullName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.submittedAt', { defaultValue: 'Thời gian gửi' })}>
            {modalDetail.createdAt ? dayjs(modalDetail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
        </Descriptions>
      );
    }

    if (type === 'JOB_TRANSFER') {
      return (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('approvals.modal.employee', { defaultValue: 'Nhân viên' })}>
            {d.employeeName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.currentDept', { defaultValue: 'Phòng ban hiện tại' })}>
            {d.oldDepartmentName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.currentPos', { defaultValue: 'Vị trí hiện tại' })}>
            {d.oldPositionName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.newDept', { defaultValue: 'Phòng ban mới' })}>
            <Text strong style={{ color: '#52c41a' }}>{d.newDepartmentName || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.newPos', { defaultValue: 'Vị trí mới' })}>
            <Text strong style={{ color: '#52c41a' }}>{d.newPositionName || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.effectiveDate', { defaultValue: 'Ngày hiệu lực' })}>
            {d.effectiveDate ? dayjs(d.effectiveDate).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.submittedAt', { defaultValue: 'Thời gian gửi' })}>
            {modalDetail.createdAt ? dayjs(modalDetail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
        </Descriptions>
      );
    }

    if (type === 'SALARY_ADJUSTMENT') {
      return (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('approvals.modal.employee', { defaultValue: 'Nhân viên' })}>
            {d.employeeName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.oldSalary', { defaultValue: 'Lương cũ' })}>
            {d.oldSalaryAmount ? Number(d.oldSalaryAmount).toLocaleString() + ' VND' : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.newSalary', { defaultValue: 'Lương mới' })}>
            <Text strong style={{ color: '#52c41a' }}>
              {d.newSalaryAmount ? Number(d.newSalaryAmount).toLocaleString() + ' VND' : '—'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.adjustReason', { defaultValue: 'Lý do' })}>
            {d.reason || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.submittedAt', { defaultValue: 'Thời gian gửi' })}>
            {modalDetail.createdAt ? dayjs(modalDetail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
        </Descriptions>
      );
    }

    if (type === 'TIMESHEET') {
      return (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('approvals.modal.period', { defaultValue: 'Kỳ chấm công' })}>
            {d.period || d.month ? `${d.month || ''} ${d.year || ''}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.totalHours', { defaultValue: 'Tổng giờ' })}>
            {d.totalHours || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.notes', { defaultValue: 'Ghi chú' })}>
            {d.notes || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.submittedAt', { defaultValue: 'Thời gian gửi' })}>
            {modalDetail.createdAt ? dayjs(modalDetail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
        </Descriptions>
      );
    }

    if (type === 'OFFBOARDING') {
      return (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('approvals.modal.employee', { defaultValue: 'Nhân viên' })}>
            {d.employeeName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.employeeCode', { defaultValue: 'Mã NV' })}>
            {d.employeeCode || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.department', { defaultValue: 'Phòng ban' })}>
            {d.departmentName || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.lastWorkingDay', { defaultValue: 'Ngày làm việc cuối' })}>
            {d.lastWorkingDay ? dayjs(d.lastWorkingDay).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('approvals.modal.submittedAt', { defaultValue: 'Thời gian gửi' })}>
            {modalDetail.createdAt ? dayjs(modalDetail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
        </Descriptions>
      );
    }

    return (
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t('approvals.modal.reference', { defaultValue: 'Mã tham chiếu' })}>
          {modalDetail.referenceEntityId || '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('approvals.modal.submittedAt', { defaultValue: 'Thời gian gửi' })}>
          {modalDetail.createdAt ? dayjs(modalDetail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
        </Descriptions.Item>
      </Descriptions>
    );
  };

  const renderApprovalTimeline = () => {
    if (historyLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin />
        </div>
      );
    }
    if (!modalDetail?.config?.approverRolesSequence) {
      return <Text type="secondary">{t('approvals.modal.noConfig', { defaultValue: 'Chưa có cấu hình duyệt' })}</Text>;
    }

    const sequence = modalDetail.config.approverRolesSequence || [];
    const steps = sequence.map((role, idx) => {
      const historyEntry = requestHistory.find((h) => h.stepLevel === idx + 1);
      return { level: idx + 1, role, entry: historyEntry };
    });

    return (
      <div>
        <Title level={5} style={{ marginBottom: 12, marginTop: 0 }}>
          {t('approvals.modal.approvalLevels', { defaultValue: 'Các cấp duyệt' })}
        </Title>
        <Timeline
          items={steps.map((step) => {
            const isCurrent = step.level === modalDetail.currentLevel;
            const isPending = !step.entry;
            return {
              color: isPending ? 'gray' : step.entry?.action === 'APPROVE' ? 'green' : 'red',
              children: (
                <div>
                  <Space>
                    <Text strong style={{ color: isCurrent ? '#1890ff' : undefined }}>
                      {t(`roles.labels.${step.role}`, { defaultValue: step.role })}
                    </Text>
                    {isCurrent && <Tag color="blue">{t('approvals.modal.currentLevel', { defaultValue: 'Cấp hiện tại' })}</Tag>}
                    {isPending && <Tag color="default">{t('approvals.modal.pending', { defaultValue: 'Chờ duyệt' })}</Tag>}
                    {!isPending && (
                      <Tag color={step.entry?.action === 'APPROVE' ? 'success' : 'error'}>
                        {t(`approvals.actionLabels.${step.entry?.action}`, { defaultValue: step.entry?.action })}
                      </Tag>
                    )}
                  </Space>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {step.entry?.approver?.fullName
                      ? `${step.entry.approver.fullName} · ${dayjs(step.entry.actionAt).format('DD/MM HH:mm')}`
                      : t('approvals.modal.awaitingApproval', { defaultValue: 'Chờ phê duyệt' })}
                  </div>
                  {step.entry?.comment && (
                    <Text
                      type="secondary"
                      italic
                      style={{ fontSize: 12, display: 'block', marginTop: 2, marginLeft: 4 }}
                    >
                      "{step.entry.comment}"
                    </Text>
                  )}
                </div>
              ),
            };
          })}
        />
      </div>
    );
  };

  const renderActionForm = () => {
    if (isViewOnly) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
        <Form
          form={approvalForm}
          layout="vertical"
          onFinish={handleDecisionSubmit}
          disabled={isModalLoading}
          style={{ flex: 1 }}
        >
          <Form.Item name="comment" style={{ marginBottom: 8 }}>
            <Input.TextArea
              placeholder={t('approvals.modal.commentPlaceholder', { defaultValue: 'Nhập ý kiến (không bắt buộc)...' })}
              rows={3}
              style={{ resize: 'none' }}
            />
          </Form.Item>
        </Form>
        <Space style={{ justifyContent: 'flex-end' }}>
          <Button
            danger
            icon={<CloseOutlined />}
            loading={loadingActions.reject && actionRequestId === selectedRequest?.id}
            disabled={isModalLoading}
            onClick={() => {
              setApprovalDecisionAction('reject');
              approvalForm.submit();
            }}
          >
            {t('approvals.actions.reject', { defaultValue: 'Từ chối' })}
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={loadingActions.approve && actionRequestId === selectedRequest?.id}
            disabled={isModalLoading}
            onClick={() => {
              setApprovalDecisionAction('approve');
              approvalForm.submit();
            }}
          >
            {t('approvals.actions.approve', { defaultValue: 'Duyệt' })}
          </Button>
        </Space>
      </div>
    );
  };

  // ============== Tab items ==============
  const tabItems = [
    {
      key: 'pending',
      label: `${t('approvals.tabs.pending')} (${pendingApprovals.length})`,
      children: (
        <Table
          dataSource={pendingApprovals}
          loading={loading}
          columns={[
            { title: t('approvals.cols.code'), dataIndex: 'requestCode', key: 'requestCode', render: (val, record) => val || `REQ-${record.id}` },
            { title: t('approvals.cols.type'), dataIndex: 'transactionType', key: 'transactionType', render: (v) => getRequestTypeLabel(v) },
            { title: t('approvals.cols.requester'), dataIndex: ['requester', 'fullName'], key: 'requester' },
            { title: t('approvals.cols.currentLevel'), dataIndex: 'currentLevel', key: 'currentLevel', render: (val, r) => `Cấp ${val} / ${r.totalLevels}` },
            { title: t('approvals.cols.requiredRole'), dataIndex: 'requiredRole', key: 'requiredRole', render: (v) => t(`roles.labels.${v}`, { defaultValue: v }) },
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
            { title: t('approvals.cols.type'), dataIndex: 'transactionType', key: 'transactionType', render: (v) => getRequestTypeLabel(v) },
            { title: t('approvals.cols.status'), dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'orange'}>{t(`approvals.statusLabels.${s}`, { defaultValue: s })}</Tag> },
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
  ];

  return (
    <Card style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <Tabs
        defaultActiveKey={isSubmittedOnly ? 'submitted' : 'pending'}
        items={isSubmittedOnly ? tabItems.filter(i => i.key === 'submitted') : tabItems}
      />

      {/* MODAL: 2-column layout */}
      <AppModal
        title={selectedRequest
          ? `${getRequestTypeLabel(selectedRequest.transactionType)} — ${selectedRequest.requestCode || `REQ-${selectedRequest.id}`}`
          : t('approvals.modal.title', { defaultValue: 'Chi tiết phiếu duyệt' })
        }
        open={isApprovalModalOpen}
        onCancel={closeModal}
        footer={null}
      >
        <div style={{ display: 'flex', gap: 16, minHeight: 480, maxHeight: '70vh' }}>
          {/* LEFT COLUMN (70%) */}
          <div style={{ flex: 7, overflowY: 'auto', paddingRight: 4 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              {t('approvals.modal.requestContent', { defaultValue: 'Nội dung phiếu yêu cầu' })}
            </Title>
            <Divider style={{ margin: '8px 0' }} />
            {renderRequestDetail()}
          </div>

          {/* RIGHT COLUMN (30%) */}
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* ROW 1: Approval timeline */}
            <div style={{ flex: 7, overflowY: 'auto', paddingBottom: 8 }}>
              {renderApprovalTimeline()}
            </div>

            {/* Divider between rows */}
            {!isViewOnly && <Divider style={{ margin: '4px 0' }} />}

            {/* ROW 2: Comment + action buttons (only for approvers) */}
            {!isViewOnly && (
              <div style={{ flex: 3, minHeight: 0 }}>
                {renderActionForm()}
              </div>
            )}
          </div>
        </div>
      </AppModal>
    </Card>
  );
}
