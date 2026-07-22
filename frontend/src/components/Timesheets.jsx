import React, { useState, useEffect } from 'react';
import { Card, Space, Table, Button, Input, InputNumber, Select, Tag, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

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
  t
}) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(initialEntries || []);
  }, [initialEntries]);

  const handleAddTimesheetRow = () => {
    if (projectsList.length === 0 || tasksList.length === 0) {
      message.warning('Vui lòng tạo dự án và tác vụ trước.');
      return;
    }
    const defaultProject = projectsList[0].id;
    const defaultTask = tasksList[0].id;

    const janFirst = new Date(selectedYear, 0, 1);
    const dateOffset = (selectedWeek - 1) * 7;
    const monday = new Date(janFirst.setDate(janFirst.getDate() + dateOffset - janFirst.getDay() + 1));
    
    const newRows = Array.from({ length: 7 }).map((_, idx) => {
      const entryDate = new Date(monday);
      entryDate.setDate(monday.getDate() + idx);
      return {
        id: `temp-${Date.now()}-${idx}`,
        timesheetId: timesheetData?.id,
        projectId: defaultProject,
        taskId: defaultTask,
        entryDate: entryDate.toISOString().split('T')[0],
        hoursSpent: 0,
        workType: 'NORMAL',
        description: ''
      };
    });

    setEntries([...entries, ...newRows]);
  };

  const handleUpdateEntryField = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const handleSave = () => {
    onSaveTimesheetDraft(entries);
  };

  return (
    <Card title="Ghi nhận chấm công tuần" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Text>Tuần:</Text>
          <InputNumber min={1} max={53} value={selectedWeek} onChange={setSelectedWeek} />
          <Text>Năm:</Text>
          <InputNumber min={2026} max={2030} value={selectedYear} onChange={setSelectedYear} />
          <Tag color="indigo">Trạng thái timesheet: {timesheetData?.status || 'Chưa tạo'}</Tag>
        </Space>

        <Space>
          {(!timesheetData || timesheetData.status === 'DRAFT' || timesheetData.status === 'REJECTED') && (
            <>
              <Button icon={<PlusOutlined />} onClick={handleAddTimesheetRow}>Thêm dòng chấm công</Button>
              <Button type="primary" onClick={handleSave}>Lưu nháp</Button>
              <Button type="primary" style={{ background: '#10b981', border: 'none' }} onClick={onSubmitTimesheet}>Nộp phê duyệt</Button>
            </>
          )}
        </Space>
      </div>

      <Table
        dataSource={entries}
        pagination={false}
        columns={[
          {
            title: 'Dự án',
            dataIndex: 'projectId',
            key: 'projectId',
            render: (val, record, idx) => (
              <Select style={{ width: 160 }} value={val} onChange={(v) => handleUpdateEntryField(idx, 'projectId', v)}>
                {projectsList.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
              </Select>
            )
          },
          {
            title: 'Tác vụ',
            dataIndex: 'taskId',
            key: 'taskId',
            render: (val, record, idx) => (
              <Select style={{ width: 140 }} value={val} onChange={(v) => handleUpdateEntryField(idx, 'taskId', v)}>
                {tasksList.map(t => <Select.Option key={t.id} value={t.id}>{t.taskName}</Select.Option>)}
              </Select>
            )
          },
          {
            title: 'Ngày làm việc',
            dataIndex: 'entryDate',
            key: 'entryDate',
            render: (val) => val
          },
          {
            title: 'Số giờ',
            dataIndex: 'hoursSpent',
            key: 'hoursSpent',
            render: (val, record, idx) => (
              <InputNumber min={0.5} max={16} value={val} onChange={(v) => handleUpdateEntryField(idx, 'hoursSpent', v)} />
            )
          },
          {
            title: 'Loại công',
            dataIndex: 'workType',
            key: 'workType',
            render: (val, record, idx) => (
              <Select style={{ width: 140 }} value={val} onChange={(v) => handleUpdateEntryField(idx, 'workType', v)}>
                <Select.Option value="NORMAL">Normal Work (1.0x)</Select.Option>
                <Select.Option value="OT_WEEKDAY">OT Weekday (1.5x)</Select.Option>
                <Select.Option value="OT_WEEKEND">OT Weekend (2.0x)</Select.Option>
                <Select.Option value="OT_HOLIDAY">OT Holiday (3.0x)</Select.Option>
                <Select.Option value="NIGHT_SHIFT">Night Shift (+30%)</Select.Option>
              </Select>
            )
          },
          {
            title: 'Ghi chú công việc',
            dataIndex: 'description',
            key: 'description',
            render: (val, record, idx) => (
              <Input value={val} onChange={(e) => handleUpdateEntryField(idx, 'description', e.target.value)} placeholder="Nhập mô tả" />
            )
          },
          {
            title: 'Xóa',
            key: 'delete',
            render: (_, record, idx) => (
              <Button danger type="text" icon={<DeleteOutlined />} onClick={() => {
                setEntries(entries.filter((_, i) => i !== idx));
              }} />
            )
          }
        ]}
        rowKey={(record, idx) => record.id || `idx-${idx}`}
      />
    </Card>
  );
}
