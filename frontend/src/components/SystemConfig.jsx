import React from 'react';
import { Card, Row, Col, Table, InputNumber, Select, Space, Tag, Button } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.jsx';
import { canDo } from '../constants/roles.js';

export default function SystemConfig({
  workRates,
  approvalConfigs,
  loading = false,
  loadingActions = {},
  onUpdateWorkRate,
  onUpdateApprovalConfig,
  t
}) {
  const { role } = useAuth();
  const canEditWorkRate = canDo(role, 'CONFIG_EDIT_WORK_RATE');
  const canEditApprovalMatrix = canDo(role, 'CONFIG_EDIT_APPROVAL_MATRIX');

  const isRateLoading = (key) => Boolean(loadingActions.updateWorkRate?.[key]);
  const isConfigLoading = (type) => Boolean(loadingActions.updateApprovalConfig?.[type]);

  return (
    <Card title={t('config.cardTitle')} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card type="inner" title={t('config.ratesCard')}>
            <Table
              dataSource={workRates}
              loading={loading}
              pagination={false}
              columns={[
                { title: t('config.ratesCols.key'), dataIndex: 'configKey', key: 'configKey' },
                { title: t('config.ratesCols.name'), dataIndex: 'configName', key: 'configName' },
                {
                  title: t('config.ratesCols.multiplier'),
                  dataIndex: 'valueMultiplier',
                  key: 'valueMultiplier',
                  render: (val, record) => (
                    <WorkRateCell
                      initial={Number(val)}
                      recordKey={record.configKey}
                      loading={isRateLoading(record.configKey)}
                      onSave={(v) => onUpdateWorkRate(record.configKey, v)}
                      disabled={!canEditWorkRate}
                      t={t}
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
              loading={loading}
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
                      loading={isConfigLoading(record.transactionType)}
                      onChange={(v) => onUpdateApprovalConfig(record.transactionType, v)}
                      disabled={!canEditApprovalMatrix}
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

function WorkRateCell({ initial, recordKey, loading, onSave, disabled, t }) {
  const [value, setValue] = React.useState(initial);
  const dirty = Number(value) !== Number(initial);
  return (
    <Space size={4}>
      <InputNumber
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={(v) => setValue(v)}
        disabled={loading || disabled}
        onPressEnter={() => dirty && onSave(parseFloat(value))}
        style={{ width: 100 }}
      />
      <Button
        size="small"
        type="primary"
        icon={<CheckOutlined />}
        loading={loading}
        disabled={!dirty || loading || disabled}
        onClick={() => onSave(parseFloat(value))}
        title={t('config.ratesCols.multiplier')}
      />
    </Space>
  );
}
