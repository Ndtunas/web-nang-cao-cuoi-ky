import React from 'react';
import { Space, Row, Col, Card, Statistic, Progress, List, Button, Typography } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export default function Dashboard({ employees, pendingApprovals, onOpenDecisionModal, onNavigate, t }) {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.totalEmployees')}
              value={employees.length}
              prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.activeEmployees')}
              value={employees.filter(e => e.status === 'ACTIVE' || e.status === 'ONBOARDING').length}
              valueStyle={{ color: '#10b981' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.onLeave')}
              value={2}
              valueStyle={{ color: '#f59e0b' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Statistic
              title={t('stats.newHires')}
              value={3}
              prefix={<PlusOutlined style={{ color: '#a855f7' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card title={t('dashboard.recruitmentChart')} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ padding: '10px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>Phòng Công nghệ thông tin (IT Department)</Text>
                  <Text strong>45%</Text>
                </div>
                <Progress percent={45} strokeColor={{ '0%': '#6366f1', '100%': '#a855f7' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>Phòng Nhân sự (HR Department)</Text>
                  <Text strong>20%</Text>
                </div>
                <Progress percent={20} strokeColor={{ '0%': '#10b981', '100%': '#34d399' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>Phòng Tài chính - Kế toán (Finance & Accounting)</Text>
                  <Text strong>15%</Text>
                </div>
                <Progress percent={15} strokeColor={{ '0%': '#f59e0b', '100%': '#fbbf24' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>Ban Giám đốc & Marketing (Board & Marketing)</Text>
                  <Text strong>20%</Text>
                </div>
                <Progress percent={20} strokeColor={{ '0%': '#ef4444', '100%': '#f87171' }} />
              </div>
            </div>
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
                    description={`${item.transactionType} - ${t('dashboard.submittedBy')} ${item.requester?.fullName || 'Staff'}`}
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
