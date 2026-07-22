import React, { useEffect, useState } from 'react';
import {
  Card, Button, Tag, Table, Space, Statistic, Row, Col, message, Popconfirm, Alert, Tooltip,
} from 'antd';
import { LoginOutlined, LogoutOutlined, ReloadOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api.js';

const STATUS_COLORS = {
  PRESENT: 'green',
  LATE: 'gold',
  HALF_DAY: 'orange',
  ABSENT: 'red',
  OVERTIME: 'purple',
  INCOMPLETE: 'default',
};

// Mirrors backend src/modules/attendance/attendance.constants.ts
const CHECKIN_START_SEC = 7 * 3600 + 30 * 60; // 07:30:00
const CHECKOUT_LATEST_SEC = 23 * 3600 + 59 * 60; // 23:59:00
const CHECKOUT_EARLIEST_SEC = 15 * 3600 + 30 * 60; // 15:30:00

function timeStrToSec(t) {
  if (!t) return null;
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

export default function Attendance({ t, isAdminView = false }) {
  const [today, setToday] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t1, s1, h] = await Promise.all([
        api.attendance.getToday(),
        api.attendance.getTodayStatus().catch(() => null),
        api.attendance.getMyHistory(),
      ]);
      setToday(t1);
      setTodayStatus(s1);
      setHistory(Array.isArray(h) ? h.slice(0, 30) : []);

      const now = dayjs();
      try {
        const s = await api.attendance.getStatsMonth(now.month() + 1, now.year());
        setStats(s);
      } catch { setStats(null); }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCheckIn = async () => {
    try {
      const r = await api.attendance.checkIn();
      setToday(r);
      message.success(t('att.msgCheckInSuccess'));
      await load();
    } catch (e) {
      message.error(e?.i18nKey ? t(e.i18nKey) : t('att.msgCheckInError'));
    }
  };

  const onCheckOut = async () => {
    try {
      const r = await api.attendance.checkOut();
      setToday(r);
      const overtime = r?.status === 'OVERTIME';
      const halfDay = r?.status === 'HALF_DAY';
      if (overtime) {
        message.warning(t('att.msgCheckOutOvertime', { hours: r.workHours }));
      } else if (halfDay) {
        message.warning(t('att.msgCheckOutEarlyHalf'));
      } else {
        message.success(t('att.msgCheckOutSuccess'));
      }
      await load();
    } catch (e) {
      message.error(e?.i18nKey ? t(e.i18nKey) : t('att.msgCheckOutError'));
    }
  };

  // Decide checkout confirmation content based on current time
  const checkoutNowSec = dayjs().hour() * 3600 + dayjs().minute() * 60 + dayjs().second();
  const isCheckoutEarly = checkoutNowSec < CHECKOUT_EARLIEST_SEC && today?.checkIn && !today?.checkOut;
  const isCheckInTooEarly = checkoutNowSec < CHECKIN_START_SEC;
  const isCheckOutTooLate = checkoutNowSec > CHECKOUT_LATEST_SEC;

  const columns = [
    {
      title: t('att.cols.date'),
      dataIndex: 'workDate',
      key: 'workDate',
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
    },
    { title: t('att.cols.checkIn'), dataIndex: 'checkIn', key: 'checkIn' },
    { title: t('att.cols.checkOut'), dataIndex: 'checkOut', key: 'checkOut' },
    {
      title: t('att.cols.workHours'),
      dataIndex: 'workHours',
      key: 'workHours',
      render: (v) => `${Number(v || 0).toFixed(2)} h`,
    },
    {
      title: t('att.cols.status'),
      dataIndex: 'status',
      key: 'status',
      render: (v) => (
        <Tag color={STATUS_COLORS[v] || 'default'}>
          {t(`att.statusLabels.${v}`) || v}
        </Tag>
      ),
    },
  ];

  return (
    <Card
      title={t('att.cardTitle')}
      extra={(
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          {t('common.refresh')}
        </Button>
      )}
      style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
    >
      {/* Cảnh báo theo rule mới */}
      {todayStatus && !todayStatus.checkedIn && todayStatus.status === 'HALF_DAY' && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={t('att.warnHalfDayAbsent')}
          style={{ marginBottom: 16 }}
        />
      )}
      {todayStatus && !todayStatus.checkedIn && todayStatus.status === 'ABSENT' && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message={t('att.warnAbsent')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
            <Statistic
              title={t('att.today')}
              prefix={<ClockCircleOutlined />}
              value={todayStatus ? todayStatus.status : (today?.status ?? '-')}
              valueStyle={{ fontSize: 16 }}
            />
            {today && (
              <div style={{ marginTop: 12, color: '#94a3b8' }}>
                {t('att.cols.checkIn')}: {today.checkIn || '-'} |{' '}
                {t('att.cols.checkOut')}: {today.checkOut || '-'}
              </div>
            )}
          </Card>
        </Col>
        {stats && (
          <>
            <Col xs={12} md={4}>
              <Card style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                <Statistic title="PRESENT" value={stats.present} valueStyle={{ color: '#10b981' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                <Statistic title="LATE" value={stats.late} valueStyle={{ color: '#f59e0b' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                <Statistic title="OT" value={stats.overtime || 0} valueStyle={{ color: '#a78bfa' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                <Statistic title={t('att.cols.workHours')} value={Number(stats.workHoursSum || 0).toFixed(1)} suffix="h" />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Space style={{ marginBottom: 16 }}>
        {!today || !today.checkIn ? (
          <Tooltip title={isCheckInTooEarly ? t('att.confirmCheckInBeforeWindow') : ''}>
            <Popconfirm
              title={t('att.confirmCheckIn')}
              onConfirm={onCheckIn}
              disabled={isCheckInTooEarly}
            >
              <Button
                type="primary"
                icon={<LoginOutlined />}
                disabled={isCheckInTooEarly}
              >
                {t('att.checkIn')}
              </Button>
            </Popconfirm>
          </Tooltip>
        ) : (
          <Tag color="green">{t('att.checkedIn')} {today.checkIn}</Tag>
        )}
        {today && today.checkIn && !today.checkOut && (
          <Tooltip title={isCheckOutTooLate ? t('att.confirmCheckOutAfterWindow') : ''}>
            <Popconfirm
              title={
                isCheckoutEarly
                  ? t('att.confirmCheckOutEarly')
                  : t('att.confirmCheckOut')
              }
              description={isCheckoutEarly ? t('att.confirmCheckOutEarlyDesc') : undefined}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={onCheckOut}
              disabled={isCheckOutTooLate}
            >
              <Button
                type={isCheckoutEarly ? 'default' : 'default'}
                icon={<LogoutOutlined />}
                danger={isCheckoutEarly}
                disabled={isCheckOutTooLate}
              >
                {t('att.checkOut')}
              </Button>
            </Popconfirm>
          </Tooltip>
        )}
        {today && today.checkOut && (
          <Tag color="blue">{t('att.checkedOut')} {today.checkOut}</Tag>
        )}
      </Space>

      <h4 style={{ color: '#cbd5e1', marginBottom: 12 }}>{t('att.myHistory')}</h4>
      <Table
        rowKey="id"
        dataSource={history}
        columns={columns}
        pagination={{ pageSize: 10 }}
        loading={loading}
      />
    </Card>
  );
}
