import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Form, Input, Button, Typography } from 'antd';
import { LockOutlined, UserOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Login({ onLogin }) {
  const { t } = useTranslation();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.18) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.18) 0px, transparent 50%)',
      backgroundColor: '#0f172a',
      position: 'relative',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 24,
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            marginBottom: 16
          }}>
            <LockOutlined />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>{t('appTitle')}</Title>
          <Text type="secondary">Vui lòng đăng nhập để bắt đầu phiên làm việc</Text>
        </div>

        <Card style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
        }}>
          <Form layout="vertical" onFinish={onLogin}>
            <Form.Item
              label="Tên đăng nhập / Email"
              name="username"
              rules={[{ required: true, message: 'Nhập tên đăng nhập hoặc email' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Ví dụ: admin, employee" />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Nhập mật khẩu' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large" style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                border: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}>
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div style={{
            marginTop: 16,
            padding: '12px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 8,
            fontSize: 12
          }}>
            <Text type="warning" strong style={{ display: 'block', marginBottom: 4 }}>
              <ExclamationCircleOutlined /> Rule mật khẩu:
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Mã nhân viên + mật khẩu + ngày tháng năm sinh (Bcrypted). Mật khẩu mặc định hệ thống: <strong>[username]123456[YYYYMMDD]</strong> (e.g. employee12345619950101)
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
