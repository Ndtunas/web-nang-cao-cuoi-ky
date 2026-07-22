import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, InputNumber, Select, Tag, Typography, Space, Badge, Tooltip, Empty, Progress, Row, Col, Statistic, Alert, Spin } from 'antd';
import { PlusOutlined, SaveOutlined, SendOutlined, ClockCircleOutlined, FireOutlined, BulbOutlined, CalendarOutlined, HomeOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const WORK_TYPE_CONFIG = {
  NORMAL: { color: '#6366f1', rate: 1.0 },
  OT_WEEKDAY: { color: '#f59e0b', rate: 1.5 },
  OT_WEEKEND: { color: '#ef4444', rate: 2.0 },
  OT_HOLIDAY: { color: '#dc2626', rate: 3.0 },
  NIGHT_SHIFT: { color: '#8b5cf6', rate: 0.3 },
};

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEK_DAYS_FULL = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const getStatusConfig = (t) => ({
  DRAFT: { color: '#f59e0b', text: t('timesheets.statusLabels.DRAFT'), bg: 'rgba(245, 158, 11, 0.1)' },
  PENDING_APPROVAL: { color: '#3b82f6', text: t('timesheets.statusLabels.SUBMITTED'), bg: 'rgba(59, 130, 246, 0.1)' },
  SUBMITTED: { color: '#3b82f6', text: t('timesheets.statusLabels.SUBMITTED'), bg: 'rgba(59, 130, 246, 0.1)' },
  APPROVED: { color: '#10b981', text: t('timesheets.statusLabels.APPROVED'), bg: 'rgba(16, 185, 129, 0.1)' },
  REJECTED: { color: '#ef4444', text: t('timesheets.statusLabels.REJECTED'), bg: 'rgba(239, 68, 68, 0.1)' },
});

export default function Timesheets({
  timesheetData,
  timesheetEntries: initialEntries,
  projectsList,
  tasksList,
  selectedWeek,
  setSelectedWeek,
  selectedYear,
  setSelectedYear,
  onSaveTimesheetDraft,
  onSubmitTimesheet,
  loading = false,
  loadingActions = {},
  t
}) {
  const [entries, setEntries] = useState([]);
  const [originalEntries, setOriginalEntries] = useState([]);
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    // Assign rowId to entries if not present (entries from API don't have rowId)
    const processedEntries = (initialEntries || []).map(entry => ({
      ...entry,
      rowId: entry.rowId || `${entry.projectId}-${entry.taskId}-${entry.workType}`
    }));
    setEntries(processedEntries);
    setOriginalEntries(processedEntries);
  }, [initialEntries]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(entries) !== JSON.stringify(originalEntries);
  }, [entries, originalEntries]);

  const getWeekDates = () => {
    const janFirst = new Date(selectedYear, 0, 1);
    const dayOfWeek = janFirst.getDay();
    const offset = (selectedWeek - 1) * 7 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const monday = new Date(janFirst);
    monday.setDate(janFirst.getDate() + offset);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const weekDates = useMemo(() => getWeekDates(), [selectedWeek, selectedYear]);

  const entriesByProjectTask = useMemo(() => {
    const grouped = {};
    entries.forEach(entry => {
      // Key includes workType so same project+task with different workTypes are separate rows
      const key = entry.rowId || `${entry.projectId}-${entry.taskId}-${entry.workType}`;
      if (!grouped[key]) {
        grouped[key] = { rowId: entry.rowId || key, projectId: entry.projectId, taskId: entry.taskId, workType: entry.workType, days: {} };
      }
      grouped[key].days[entry.entryDate] = entry;
    });
    return Object.values(grouped);
  }, [entries]);

  const summaryByType = useMemo(() => {
    const summary = {};
    entries.forEach(entry => {
      if (!summary[entry.workType]) {
        summary[entry.workType] = 0;
      }
      summary[entry.workType] += Number(entry.hoursSpent) || 0;
    });
    return summary;
  }, [entries]);

  const totalHours = useMemo(() => {
    return entries.reduce((sum, e) => sum + (Number(e.hoursSpent) || 0), 0);
  }, [entries]);

  const standardHours = 8 * 5;

  const handleAddRow = () => {
    if (projectsList.length === 0 || tasksList.length === 0) {
      return;
    }
    // Pick first available project/task combo (allow duplicates)
    const defaultProject = projectsList[0];
    const defaultTask = tasksList[0];

    const rowId = `row-${Date.now()}`;
    const newEntries = weekDates.map(date => ({
      id: `temp-${Date.now()}-${date}`,
      rowId,
      timesheetId: timesheetData?.id,
      projectId: defaultProject.id,
      taskId: defaultTask.id,
      entryDate: date,
      hoursSpent: 0,
      workType: 'NORMAL',
      description: ''
    }));
    setEntries([...entries, ...newEntries]);
  };

  const handleUpdateEntry = (date, field, value) => {
    const key = `${date}`;
    const idx = entries.findIndex(e => e.entryDate === date && editingCell?.key?.includes(e.projectId) && editingCell?.key?.includes(e.taskId));
    
    if (idx !== -1) {
      const updated = [...entries];
      updated[idx][field] = value;
      setEntries(updated);
    }
  };

  const handleUpdateCell = (rowId, date, field, value) => {
    const updated = entries.map(e => {
      // Match by rowId (which now includes workType in fallback key)
      if (e.rowId === rowId && e.entryDate === date) {
        return { ...e, [field]: value };
      }
      return e;
    });
    setEntries(updated);
  };

  const getEntry = (rowId, date) => {
    return entries.find(e => e.rowId === rowId && e.entryDate === date);
  };

  const isEditable = !timesheetData || timesheetData.status === 'DRAFT' || timesheetData.status === 'REJECTED';

  const statusConfig = getStatusConfig(t);
  const currentStatus = timesheetData?.status ? statusConfig[timesheetData.status] : { color: '#94a3b8', text: t('timesheets.notCreated'), bg: 'rgba(148, 163, 184, 0.1)' };

  return (
    <Spin spinning={loading} tip={t('common.loading') || 'Loading...'} size="large">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header với tuần/năm và thống kê */}
      <Card style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <Row gutter={[24, 16]} align="middle">
          <Col flex="none">
            <Space size="large" align="center">
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('timesheets.week').toUpperCase()}</Text>
                <InputNumber
                  min={1}
                  max={53}
                  value={selectedWeek}
                  onChange={setSelectedWeek}
                  style={{ width: 70, fontWeight: 700, fontSize: 18 }}
                />
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('timesheets.year').toUpperCase()}</Text>
                <InputNumber
                  min={2024}
                  max={2030}
                  value={selectedYear}
                  onChange={setSelectedYear}
                  style={{ width: 90, fontWeight: 700, fontSize: 18 }}
                />
              </div>
              <div>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>&nbsp;</Text>
                <Tooltip title={t('timesheets.currentWeek') || 'Current Week'}>
                  <Button
                    icon={<HomeOutlined />}
                    onClick={() => {
                      const now = new Date();
                      const jan1 = new Date(now.getFullYear(), 0, 1);
                      const currentWeek = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
                      setSelectedWeek(currentWeek);
                      setSelectedYear(now.getFullYear());
                    }}
                    style={{ height: 38 }}
                  >
                    {t('timesheets.currentWeek') || 'Current'}
                  </Button>
                </Tooltip>
              </div>
            </Space>
          </Col>
          
          <Col flex="auto">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {weekDates.map((date, i) => (
                <div key={date} style={{
                  padding: '8px 16px',
                  background: i === 5 || i === 6 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                  borderRadius: 8,
                  textAlign: 'center',
                  minWidth: 70
                }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{WEEK_DAYS[i]}</Text>
                  <Text style={{ color: i === 5 || i === 6 ? '#f87171' : '#818cf8', fontWeight: 600, fontSize: 16 }}>
                    {new Date(date).getDate()}
                  </Text>
                </div>
              ))}
            </div>
          </Col>
          
          <Col flex="none">
            <Tag style={{ 
              background: currentStatus.bg, 
              color: currentStatus.color, 
              border: `1px solid ${currentStatus.color}40`,
              padding: '4px 12px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 20
            }}>
              {currentStatus.text}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Thống kê tổng giờ */}
      <Row gutter={16}>
        <Col span={8}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)', 
              border: '1px solid rgba(99, 102, 241, 0.3)',
              minHeight: 140,
              display: 'flex',
              flexDirection: 'column'
            }}
            styles={{ body: { flex: 1 } }}
          >
            <Statistic
              title={<Text style={{ color: '#94a3b8' }}>{t('timesheets.totalHoursLabel')}</Text>}
              value={totalHours}
              suffix="/ 40"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#818cf8', fontWeight: 700 }}
            />
            <Progress 
              percent={Math.min((totalHours / standardHours) * 100, 100)} 
              showInfo={false}
              strokeColor="#6366f1"
              trailColor="rgba(99, 102, 241, 0.2)"
              style={{ marginTop: 'auto' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)', 
              border: '1px solid rgba(245, 158, 11, 0.3)',
              minHeight: 140,
              display: 'flex',
              flexDirection: 'column'
            }}
            styles={{ body: { flex: 1 } }}
          >
            <Statistic
              title={<Text style={{ color: '#94a3b8' }}>{t('timesheets.otHoursLabel')}</Text>}
              value={(summaryByType.OT_WEEKDAY || 0) + (summaryByType.OT_WEEKEND || 0) + (summaryByType.OT_HOLIDAY || 0)}
              suffix=""
              prefix={<FireOutlined />}
              valueStyle={{ color: '#fbbf24', fontWeight: 700 }}
            />
            <Space size={8} style={{ marginTop: 'auto', flexWrap: 'wrap' }}>
              {summaryByType.OT_WEEKDAY ? (
                <Tag style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: 'none', margin: 0 }}>
                  {t('timesheets.otWeekday')}: {summaryByType.OT_WEEKDAY}h
                </Tag>
              ) : null}
              {summaryByType.OT_WEEKEND ? (
                <Tag style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: 'none', margin: 0 }}>
                  {t('timesheets.otWeekend')}: {summaryByType.OT_WEEKEND}h
                </Tag>
              ) : null}
              {summaryByType.OT_HOLIDAY ? (
                <Tag style={{ background: 'rgba(220, 38, 38, 0.2)', color: '#fca5a5', border: 'none', margin: 0 }}>
                  {t('timesheets.otHoliday')}: {summaryByType.OT_HOLIDAY}h
                </Tag>
              ) : null}
              {!summaryByType.OT_WEEKDAY && !summaryByType.OT_WEEKEND && !summaryByType.OT_HOLIDAY && (
                <Text style={{ color: '#64748b', fontSize: 12 }}>{t('timesheets.noOtHours')}</Text>
              )}
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)', 
              border: '1px solid rgba(16, 185, 129, 0.3)',
              minHeight: 140,
              display: 'flex',
              flexDirection: 'column'
            }}
            styles={{ body: { flex: 1 } }}
          >
            <Statistic
              title={<Text style={{ color: '#94a3b8' }}>{t('timesheets.workTypeCount')}</Text>}
              value={Object.entries(summaryByType).filter(([_, v]) => v > 0).length}
              suffix=""
              prefix={<BulbOutlined />}
              valueStyle={{ color: '#34d399', fontWeight: 700 }}
            />
            <Space size={4} style={{ marginTop: 'auto', flexWrap: 'wrap' }}>
              {Object.entries(summaryByType).filter(([_, v]) => v > 0).map(([type, hours]) => (
                <Tag 
                  key={type}
                  style={{ 
                    background: `${WORK_TYPE_CONFIG[type]?.color || '#666'}20`, 
                    color: WORK_TYPE_CONFIG[type]?.color || '#fff',
                    border: 'none',
                    fontSize: 11,
                    margin: 0
                  }}
                >
                  {t(`timesheets.workTypeLabels.${type}`)}: {hours}h
                </Tag>
              ))}
              {Object.entries(summaryByType).filter(([_, v]) => v > 0).length === 0 && (
                <Text style={{ color: '#64748b', fontSize: 12 }}>{t('timesheets.noWorkTypes')}</Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Banner cảnh báo khi có thay đổi chưa lưu */}
      {isEditable && hasUnsavedChanges && (
        <Alert
          banner
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={<Text strong>{t('timesheets.unsavedChangesBanner')}</Text>}
          description={t('timesheets.unsavedChangesHint')}
          style={{ borderRadius: 12 }}
        />
      )}

      {/* Nút hành động */}
      {isEditable && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<PlusOutlined />} onClick={handleAddRow} disabled={projectsList.length === 0}>
              {t('timesheets.addWorkRowBtn')}
            </Button>
          </Space>
          <Space>
            <Badge dot={hasUnsavedChanges}>
              <Button
                icon={<SaveOutlined />}
                onClick={() => onSaveTimesheetDraft(entries)}
                loading={loadingActions.saveDraft}
                disabled={loadingActions.saveDraft || loadingActions.submit}
                style={{ background: '#374151' }}
              >
                {t('timesheets.saveDraftBtn')}
              </Button>
            </Badge>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => onSubmitTimesheet(entries)}
              loading={loadingActions.submit}
              disabled={loadingActions.saveDraft || loadingActions.submit}
              style={{ background: '#10b981', border: 'none' }}
            >
              {t('timesheets.submitApprovalBtn')}
            </Button>
          </Space>
        </div>
      )}

      {/* Bảng chấm công theo ngày */}
      <Card 
        title={
          <Space>
            <CalendarOutlined />
            <span>{t('timesheets.weeklyTimesheet')} {selectedWeek}/{selectedYear}</span>
          </Space>
        }
        style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
      >
        {entriesByProjectTask.length === 0 ? (
          <Empty 
            description={
              <Text style={{ color: '#94a3b8' }}>
                {t('timesheets.noTimesheetData')}
                {isEditable && ` ${t('timesheets.clickToStart')}`}
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {isEditable && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
                {t('timesheets.addWorkRowBtn')}
              </Button>
            )}
          </Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: 12, minWidth: 200 }}>{t('timesheets.projectTask')}</th>
                  {weekDates.map((date, i) => (
                    <th key={date} style={{ 
                      padding: '12px 8px', 
                      textAlign: 'center', 
                      color: i === 5 || i === 6 ? '#f87171' : '#94a3b8',
                      fontWeight: 600,
                      fontSize: 12,
                      background: i === 5 || i === 6 ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                    }}>
                      <div>{WEEK_DAYS[i]}</div>
                      <div style={{ fontSize: 14, color: i === 5 || i === 6 ? '#f87171' : '#cbd5e1' }}>
                        {new Date(date).getDate()}
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 12, minWidth: 80 }}>{t('timesheets.total')}</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 12, minWidth: 120 }}>{t('timesheets.workType')}</th>
                  {isEditable && <th style={{ padding: '12px 8px', width: 50 }}></th>}
                </tr>
              </thead>
              <tbody>
                {entriesByProjectTask.map(group => {
                  const project = projectsList.find(p => p.id === group.projectId);
                  const task = tasksList.find(t => t.id === group.taskId);
                  const dayEntries = weekDates.map(date => getEntry(group.rowId, date));
                  const totalHours = dayEntries.reduce((sum, e) => sum + (Number(e?.hoursSpent) || 0), 0);
                  // Lấy workType từ entry có dữ liệu đầu tiên trong group (không phải entry đầu tuần)
                  const groupWorkType = dayEntries.find(e => e)?.workType || group.workType || 'NORMAL';
                  
                  return (
                    <tr key={group.rowId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px 16px', minWidth: 280 }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          {isEditable ? (
                            <>
                              <Select
                                showSearch
                                optionFilterProp="children"
                                value={group.projectId}
                                onChange={(v) => {
                                  const updated = entries.map(e => {
                                if (e.rowId === group.rowId) {
                                      return { ...e, projectId: v };
                                    }
                                    return e;
                                  });
                                  setEntries(updated);
                                }}
                                style={{ width: '100%' }}
                                size="small"
                                placeholder="Chọn dự án"
                              >
                                {projectsList.map(p => (
                                  <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                                ))}
                              </Select>
                              <Select
                                showSearch
                                optionFilterProp="children"
                                value={group.taskId}
                                onChange={(v) => {
                                  const updated = entries.map(e => {
                                if (e.rowId === group.rowId) {
                                      return { ...e, taskId: v };
                                    }
                                    return e;
                                  });
                                  setEntries(updated);
                                }}
                                style={{ width: '100%' }}
                                size="small"
                                placeholder="Chọn công việc"
                              >
                                {tasksList.map(t => (
                                  <Select.Option key={t.id} value={t.id}>{t.taskName}</Select.Option>
                                ))}
                              </Select>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{project?.name || 'N/A'}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{task?.taskName || 'N/A'}</div>
                            </>
                          )}
                        </Space>
                      </td>
                      {weekDates.map((date, i) => {
                        const entry = getEntry(group.rowId, date);
                        const hours = entry?.hoursSpent || 0;
                        const workType = groupWorkType;
                        const isWeekend = i === 5 || i === 6;
                        const isWeekday = i < 5;
                        const hasData = Number(hours) > 0;

                        // Logic disable:
                        // NORMAL: disable T7, CN
                        // OT_WEEKDAY: disable T7, CN
                        // OT_WEEKEND: disable T2-T6 (ngược lại OT_WEEKDAY)
                        // OT_HOLIDAY, NIGHT_SHIFT: không disable
                        // Nếu đã có dữ liệu thực tế -> không disable (ưu tiên dữ liệu từ API)
                        const isDisabledByRule = 
                          (workType === 'NORMAL' && isWeekend) ||
                          (workType === 'OT_WEEKDAY' && isWeekend) ||
                          (workType === 'OT_WEEKEND' && !isWeekend);
                        const isDisabled = isDisabledByRule && !hasData;
                        
                        return (
                          <td key={date} style={{ 
                            padding: '8px', 
                            textAlign: 'center',
                            background: isWeekend ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                          }}>
                            {isEditable ? (
                              <InputNumber
                                min={0}
                                max={24}
                                value={isDisabled ? null : hours}
                                disabled={isDisabled}
                                onChange={(v) => !isDisabled && handleUpdateCell(group.rowId, date, 'hoursSpent', v)}
                                style={{ 
                                  width: 60, 
                                  textAlign: 'center',
                                  background: isDisabled ? 'rgba(30, 41, 59, 0.3)' : hours > 8 ? 'rgba(245, 158, 11, 0.1)' : hours > 0 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(30, 41, 59, 0.8)',
                                  borderColor: isDisabled ? 'rgba(255, 255, 255, 0.05)' : hours > 8 ? '#f59e0b' : hours > 0 ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'
                                }}
                                formatter={value => `${value}`}
                                parser={value => value.replace(/[^0-9.]/g, '')}
                              />
                            ) : (
                              <Text style={{ 
                                color: hours > 8 ? '#fbbf24' : hours > 0 ? '#818cf8' : '#475569',
                                fontWeight: hours > 0 ? 600 : 400
                              }}>
                                {hours || '-'}
                              </Text>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <Text style={{ color: '#818cf8', fontWeight: 700, fontSize: 16 }}>
                          {totalHours}h
                        </Text>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {isEditable ? (
                          <Select
                            value={groupWorkType}
                            onChange={(v) => {
                              const currentWorkType = groupWorkType;
                              if (v === currentWorkType) return; // Không đổi gì

                              // Tạo row mới với workType mới
                              const newRowId = `${group.projectId}-${group.taskId}-${v}`;
                              const existingEntries = entries.filter(e => e.rowId === group.rowId);
                              const newEntries = weekDates.map(date => {
                                const existing = existingEntries.find(e => e.entryDate === date);
                                return {
                                  id: existing?.id || `temp-${Date.now()}-${date}`,
                                  rowId: newRowId,
                                  timesheetId: timesheetData?.id,
                                  projectId: group.projectId,
                                  taskId: group.taskId,
                                  entryDate: date,
                                  hoursSpent: existing?.hoursSpent || 0,
                                  workType: v,
                                  description: existing?.description || ''
                                };
                              });

                              // Xóa row cũ, thêm row mới
                              setEntries([
                                ...entries.filter(e => e.rowId !== group.rowId),
                                ...newEntries
                              ]);
                            }}
                            style={{ width: 140 }}
                            size="small"
                          >
                            {Object.entries(WORK_TYPE_CONFIG).map(([key, config]) => (
                              <Select.Option key={key} value={key}>
                                <Text style={{ color: config.color }}>{t(`timesheets.workTypeLabels.${key}`)}</Text>
                              </Select.Option>
                            ))}
                          </Select>
                        ) : (
                          <Tag style={{ 
                            background: `${WORK_TYPE_CONFIG[groupWorkType]?.color || '#666'}20`, 
                            color: WORK_TYPE_CONFIG[groupWorkType]?.color || '#fff',
                            border: 'none'
                          }}>
                            {t(`timesheets.workTypeLabels.${groupWorkType}`) || 'N/A'}
                          </Tag>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {isEditable && (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              setEntries(entries.filter(e => e.rowId !== group.rowId));
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
    </Spin>
  );
}
