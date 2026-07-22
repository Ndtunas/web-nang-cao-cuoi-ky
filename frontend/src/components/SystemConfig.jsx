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
    <Card title={t('config.cardTitle')} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card type="inner" title={t('config.ratesCard')}>
            <Table
              dataSource={workRates}
              pagination={false}
              columns={[
                { title: t('config.ratesCols.key'), dataIndex: 'configKey', key: 'configKey' },
                { title: t('config.ratesCols.name'), dataIndex: 'configName', key: 'configName' },
                {
                  title: t('config.ratesCols.multiplier'),
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
          <Card type="inner" title={t('config.matrixCard')}>
            <Table
              dataSource={approvalConfigs}
              pagination={false}
              columns={[
                { title: t('config.matrixCols.type'), dataIndex: 'transactionType', key: 'transactionType' },
                {
                  title: t('config.matrixCols.levels'),
                  dataIndex: 'requiredLevels',
                  key: 'requiredLevels',
                  render: (val, record) => (
                    <Select
                      defaultValue={val}
                      style={{ width: 110 }}
                      onChange={(v) => onUpdateApprovalConfig(record.transactionType, v)}
                    >
                      <Select.Option value={1}>1 {t('config.levelsSelect')}</Select.Option>
                      <Select.Option value={2}>2 {t('config.levelsSelect')}</Select.Option>
                      <Select.Option value={3}>3 {t('config.levelsSelect')}</Select.Option>
                    </Select>
                  )
                },
                {
                  title: t('config.matrixCols.sequence'),
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
