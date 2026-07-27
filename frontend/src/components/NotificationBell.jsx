import React, { useEffect, useState } from 'react';
import { Badge, Popover, Empty, Button, List, Tag, Space } from 'antd';
import { BellOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api.js';

const POLL_INTERVAL_MS = 5000;

export default function NotificationBell({ t, onNotificationClick }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    try {
      const [list, countRes] = await Promise.all([
        api.notifications.getAll(),
        api.notifications.getUnreadCount(),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setUnread(typeof countRes?.count === 'number' ? countRes.count : 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const handleOpen = (next) => {
    setOpen(next);
  };

  const onItemClick = async (item) => {
    // Navigate to detail if callback provided
    if (onNotificationClick) {
      onNotificationClick(item);
    }
    // Mark as read
    if (!item.isRead) {
      try {
        await api.notifications.markAsRead(item.id);
        await fetchAll();
      } catch { /* no-op */ }
    }
  };

  const onMarkAll = async () => {
    setLoading(true);
    try {
      await api.notifications.markAllRead();
      await fetchAll();
    } catch { /* no-op */ }
    setLoading(false);
  };

  const content = (
    <div style={{ width: 360, maxHeight: 480, overflowY: 'auto' }}>
      <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
        <strong>{t ? t('notif.title') || 'Thông báo' : 'Thông báo'}</strong>
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={fetchAll}
          />
          <Button
            size="small"
            type="link"
            icon={<CheckOutlined />}
            loading={loading}
            disabled={unread === 0}
            onClick={onMarkAll}
          >
            {t ? t('notif.markAllRead') || 'Đánh dấu đã đọc' : 'Đánh dấu đã đọc'}
          </Button>
        </Space>
      </Space>
      {items.length === 0 ? (
        <Empty
          description={t ? t('notif.empty') || 'Không có thông báo' : 'Không có thông báo'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              style={{
                background: item.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                padding: '8px 12px',
                cursor: 'pointer',
              }}
              onClick={() => onItemClick(item)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {!item.isRead && <Badge status="processing" />}
                    <span>{item.title}</span>
                  </Space>
                }
                description={
                  <>
                    <div style={{ fontSize: 12 }}>{item.message}</div>
                    <small style={{ color: '#94a3b8' }}>
                      {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </small>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpen}
      placement="bottomRight"
      arrow={false}
    >
      <Badge count={unread} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18, color: '#cbd5e1' }} />}
        />
      </Badge>
    </Popover>
  );
}
