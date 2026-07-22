import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Form, Input, Button, Typography, ConfigProvider, theme } from 'antd';
import { LockOutlined, UserOutlined, GlobalOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Login({ onLogin, loading }) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 12,
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        }
      }}
    >
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
        {/* Floating Language Switcher in Top Right */}
        <div style={{
          position: 'absolute',
          top: 24,
          right: 24
        }}>
          <Button
            icon={<GlobalOutlined />}
            onClick={toggleLanguage}
            size="medium"
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff'
            }}
          >
            {i18n.language === 'vi' ? 'EN' : 'VI'}
          </Button>
        </div>

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
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#ffffff' }}>
              {t('appTitle')}
            </Title>
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>
              {t('login.subtitle')}
            </Text>
          </div>

          <Card style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <Form layout="vertical" onFinish={onLogin}>
              <Form.Item
                label={<span style={{ color: '#cbd5e1' }}>{t('login.username')}</span>}
                name="username"
                rules={[{ required: true, message: t('login.usernameRequired') }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Ví dụ: admin, employee" />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: '#cbd5e1' }}>{t('login.password')}</span>}
                name="password"
                rules={[{ required: true, message: t('login.passwordRequired') }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  border: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                }}>
                  {t('login.submitButton')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
}
