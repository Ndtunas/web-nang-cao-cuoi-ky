import React from 'react';
import { Space, Row, Col, Card, Statistic, Progress, List, Button, Typography, Empty } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const DEPT_COLORS = [
  ['#6366f1', '#a855f7'],
  ['#10b981', '#34d399'],
  ['#f59e0b', '#fbbf24'],
  ['#ef4444', '#f87171'],
  ['#06b6d4', '#22d3ee'],
  ['#8b5cf6', '#a78bfa'],
];

export default function Dashboard({ employees, stats, pendingApprovals, onOpenDecisionModal, onNavigate, t }) {
  const totalEmployees = stats?.totalEmployees ?? employees.length;
  const activeEmployees = stats?.activeEmployees ?? employees.filter(
    (e) => e.status === 'OFFICIAL' || e.status === 'PROBATION'
  ).length;
  const onLeave = stats?.onLeave ?? 0;
  const newHires = stats?.newHires ?? 0;
  const departments = stats?.departments ?? [];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.totalEmployees')}
              value={totalEmployees}
              prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.activeEmployees')}
              value={activeEmployees}
              valueStyle={{ color: '#10b981' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.onLeave')}
              value={onLeave}
              valueStyle={{ color: '#f59e0b' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.newHires')}
              value={newHires}
              prefix={<PlusOutlined style={{ color: '#a855f7' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card title={t('dashboard.recruitmentChart')} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            {departments.length === 0 ? (
              <Empty description={t('dashboard.noDepartments')} />
            ) : (
              <div style={{ padding: '10px 0' }}>
                {departments.slice(0, 6).map((d, idx) => {
                  const [from, to] = DEPT_COLORS[idx % DEPT_COLORS.length];
                  return (
                    <div key={d.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text>{d.name}</Text>
                      </div>
                      <Progress percent={d.percent} strokeColor={{ '0%': from, '100%': to }} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={t('dashboard.pendingQuick')} extra={<Button type="link" onClick={() => onNavigate('APPROVALS')}>{t('dashboard.viewAll')}</Button>} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <List
              dataSource={pendingApprovals.slice(0, 3)}
              renderItem={item => (
                <List.Item actions={[
                  <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => onOpenDecisionModal(item, 'approve')} />,
                  <Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => onOpenDecisionModal(item, 'reject')} />
                ]}>
                  <List.Item.Meta
                    title={item.requestCode || `REQ-${item.id}`}
                    description={`${item.transactionType} - ${t('common.submittedByLabel')} ${item.requester?.fullName || 'Staff'}`}
                  />
                </List.Item>
              )}
              locale={{ emptyText: t('dashboard.noPending') }}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
