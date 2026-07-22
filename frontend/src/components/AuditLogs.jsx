import React, { useState } from 'react';
import { Card, Select, Input, Table, Tag, Button, Modal, Row, Col, Typography, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function AuditLogs({
  auditLogs,
  auditActionFilter,
  setAuditActionFilter,
  auditEntityFilter,
  setAuditEntityFilter,
  onGetDiff,
  t
}) {
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [selectedLogDiff, setSelectedLogDiff] = useState(null);

  const handleViewAuditDiff = async (record) => {
    try {
      const diff = await onGetDiff(record.id);
      setSelectedLogDiff({
        log: record,
        oldData: diff.oldData,
        newData: diff.newData
      });
      setIsDiffModalOpen(true);
    } catch (e) {
      message.error('Failed to load state difference');
    }
  };

  return (
    <Card title="Nhật ký tác động hệ thống (System Audit Logs)" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Select value={auditActionFilter} onChange={setAuditActionFilter} style={{ width: 180 }} placeholder="Bộ lọc thao tác">
          <Select.Option value="">Tất cả thao tác</Select.Option>
          <Select.Option value="INSERT">Thêm mới (INSERT)</Select.Option>
          <Select.Option value="UPDATE">Cập nhật (UPDATE)</Select.Option>
          <Select.Option value="DELETE">Xóa (DELETE)</Select.Option>
        </Select>

        <Input
          placeholder="Tên bảng dữ liệu (e.g. employees, users)"
          value={auditEntityFilter}
          onChange={(e) => setAuditEntityFilter(e.target.value)}
          style={{ width: 240 }}
        />
      </div>

      <Table
        dataSource={auditLogs}
        columns={[
          { title: 'Thời gian', dataIndex: 'timestamp', key: 'timestamp', render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss') },
          { title: 'Thao tác', dataIndex: 'actionType', key: 'actionType', render: (t) => <Tag color={t === 'INSERT' ? 'green' : t === 'UPDATE' ? 'blue' : 'red'}>{t}</Tag> },
          { title: 'Bảng chịu tác động', dataIndex: 'entityName', key: 'entityName' },
          { title: 'ID bản ghi', dataIndex: 'entityId', key: 'entityId' },
          { title: 'Người thực hiện', dataIndex: ['actor', 'username'], key: 'actor' },
          {
            title: 'So sánh thay đổi',
            key: 'actions',
            render: (_, record) => (
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewAuditDiff(record)}>Xem thay đổi</Button>
            )
          }
        ]}
        rowKey="id"
      />

      {/* MODAL: Side-by-side JSON Diff Viewer */}
      <Modal
        title="Chi tiết Thay đổi Trạng thái Dữ liệu (State Diff)"
        open={isDiffModalOpen}
        onCancel={() => setIsDiffModalOpen(false)}
        width={850}
        footer={[<Button key="close" onClick={() => setIsDiffModalOpen(false)}>Đóng</Button>]}
      >
        {selectedLogDiff && (
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Trạng thái TRƯỚC thay đổi (OLD STATE)" type="inner" bodyStyle={{ padding: 12 }}>
                <pre style={{
                  maxHeight: 380,
                  overflowY: 'auto',
                  fontSize: 11,
                  background: '#1e293b',
                  padding: 8,
                  borderRadius: 6
                }}>
                  {JSON.stringify(selectedLogDiff.oldData, null, 2)}
                </pre>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="Trạng thái SAU thay đổi (NEW STATE)" type="inner" bodyStyle={{ padding: 12 }}>
                <pre style={{
                  maxHeight: 380,
                  overflowY: 'auto',
                  fontSize: 11,
                  background: '#1e293b',
                  padding: 8,
                  borderRadius: 6
                }}>
                  {JSON.stringify(selectedLogDiff.newData, null, 2)}
                </pre>
              </Card>
            </Col>
          </Row>
        )}
      </Modal>
    </Card>
  );
}
