import React from 'react';
import { Card, Row, Col, Table, InputNumber, Select, Space, Tag } from 'antd';

export default function SystemConfig({
  workRates,
  approvalConfigs,
  onUpdateWorkRate,
  onUpdateApprovalConfig,
  t
}) {
  return (
    <Card title="Cấu hình hệ thống" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card type="inner" title="Hệ số làm việc & Đơn giá công">
            <Table
              dataSource={workRates}
              pagination={false}
              columns={[
                { title: 'Khóa cấu hình', dataIndex: 'configKey', key: 'configKey' },
                { title: 'Mô tả', dataIndex: 'configName', key: 'configName' },
                {
                  title: 'Hệ số multiplier',
                  dataIndex: 'valueMultiplier',
                  key: 'valueMultiplier',
                  render: (val, record) => (
                    <InputNumber
                      min={0}
                      max={10}
                      step={0.1}
                      defaultValue={Number(val)}
                      onPressEnter={(e) => onUpdateWorkRate(record.configKey, parseFloat(e.target.value))}
                      style={{ width: 100 }}
                    />
                  )
                }
              ]}
              rowKey="id"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card type="inner" title="Ma trận phê duyệt (Cấp phê duyệt)">
            <Table
              dataSource={approvalConfigs}
              pagination={false}
              columns={[
                { title: 'Loại nghiệp vụ', dataIndex: 'transactionType', key: 'transactionType' },
                {
                  title: 'Số cấp duyệt yêu cầu',
                  dataIndex: 'requiredLevels',
                  key: 'requiredLevels',
                  render: (val, record) => (
                    <Select
                      defaultValue={val}
                      style={{ width: 100 }}
                      onChange={(v) => onUpdateApprovalConfig(record.transactionType, v)}
                    >
                      <Select.Option value={1}>1 cấp</Select.Option>
                      <Select.Option value={2}>2 cấp</Select.Option>
                      <Select.Option value={3}>3 cấp</Select.Option>
                    </Select>
                  )
                },
                {
                  title: 'Luồng vai trò duyệt',
                  dataIndex: 'approverRolesSequence',
                  key: 'approverRolesSequence',
                  render: (val) => (
                    <Space>
                      {val.map((role, i) => (
                        <Tag key={i} color="blue">{role}</Tag>
                      ))}
                    </Space>
                  )
                }
              ]}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
