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
    <Card title={t('audit.cardTitle')} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Select value={auditActionFilter} onChange={setAuditActionFilter} style={{ width: 180 }} placeholder="Bộ lọc thao tác">
          <Select.Option value="">{t('audit.actionFilterAll')}</Select.Option>
          <Select.Option value="INSERT">{t('audit.actionFilterInsert')}</Select.Option>
          <Select.Option value="UPDATE">{t('audit.actionFilterUpdate')}</Select.Option>
          <Select.Option value="DELETE">{t('audit.actionFilterDelete')}</Select.Option>
        </Select>

        <Input
          placeholder={t('audit.entityFilterPlaceholder')}
          value={auditEntityFilter}
          onChange={(e) => setAuditEntityFilter(e.target.value)}
          style={{ width: 240 }}
        />
      </div>

      <Table
        dataSource={auditLogs}
        columns={[
          { title: t('audit.cols.time'), dataIndex: 'timestamp', key: 'timestamp', render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss') },
          { title: t('audit.cols.action'), dataIndex: 'actionType', key: 'actionType', render: (t) => <Tag color={t === 'INSERT' ? 'green' : t === 'UPDATE' ? 'blue' : 'red'}>{t}</Tag> },
          { title: t('audit.cols.table'), dataIndex: 'entityName', key: 'entityName' },
          { title: t('audit.cols.recordId'), dataIndex: 'entityId', key: 'entityId' },
          { title: t('audit.cols.actor'), dataIndex: ['actor', 'username'], key: 'actor' },
          {
            title: t('audit.cols.diff'),
            key: 'actions',
            render: (_, record) => (
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewAuditDiff(record)}>{t('audit.viewDiff')}</Button>
            )
          }
        ]}
        rowKey="id"
      />

      {/* MODAL: Side-by-side JSON Diff Viewer */}
      <Modal
        title={t('audit.modalTitle')}
        open={isDiffModalOpen}
        onCancel={() => setIsDiffModalOpen(false)}
        width={850}
        footer={[<Button key="close" onClick={() => setIsDiffModalOpen(false)}>{t('audit.btnClose')}</Button>]}
      >
        {selectedLogDiff && (
          <Row gutter={16}>
            <Col span={12}>
              <Card title={t('audit.oldState')} type="inner" bodyStyle={{ padding: 12 }}>
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
              <Card title={t('audit.newState')} type="inner" bodyStyle={{ padding: 12 }}>
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
