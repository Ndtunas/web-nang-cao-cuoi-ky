import React, { useState } from 'react';
import { Card, Space, Table, Tag, Button, InputNumber, Modal, Row, Col, Typography } from 'antd';
import { CalculatorOutlined, EyeOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const FilePdfOutlined = () => <span className="anticon"><svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor"><path d="M533.3 224v224h224L533.3 224z m288 288H477.3V160h-256v704h600V512zM365.3 437.3c0-35.3 28.7-64 64-64h64c35.3 0 64 28.7 64 64v64c0 35.3-28.7 64-64 64h-64c-35.3 0-64-28.7-64-64v-64z m16 64h96v-64h-96v64z"/></svg></span>;

export default function Payroll({
  payrollMonth,
  setPayrollMonth,
  payrollYear,
  setPayrollYear,
  payrollSalaries,
  calculatingPayroll,
  onCalculatePayroll,
  t
}) {
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const handleOpenPayslip = (record) => {
    setSelectedPayslip(record);
    setIsPayslipModalOpen(true);
  };

  return (
    <Card title="Tính toán và kết chuyển bảng lương" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Text>Tháng lương:</Text>
          <InputNumber min={1} max={12} value={payrollMonth} onChange={setPayrollMonth} />
          <Text>Năm:</Text>
          <InputNumber min={2026} max={2030} value={payrollYear} onChange={setPayrollYear} />
          <Button type="primary" icon={<CalculatorOutlined />} loading={calculatingPayroll} onClick={onCalculatePayroll}>Tính bảng lương tháng</Button>
        </Space>
      </div>

      <Table
        dataSource={payrollSalaries}
        columns={[
          { title: 'Mã nhân viên', dataIndex: ['employee', 'empCode'], key: 'empCode' },
          { title: 'Họ và tên', dataIndex: ['employee', 'fullName'], key: 'fullName' },
          { title: 'Lương cơ bản', dataIndex: 'baseSalary', key: 'baseSalary', render: (v) => `${Number(v).toLocaleString()} VND` },
          { title: 'Công thực tế (ngày)', dataIndex: 'workDays', key: 'workDays' },
          { title: 'Lương thực lĩnh', dataIndex: 'netSalary', key: 'netSalary', render: (v) => <Text strong style={{ color: '#10b981' }}>{`${Number(v).toLocaleString()} VND`}</Text> },
          { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'APPROVED' ? 'green' : 'orange'}>{s}</Tag> },
          {
            title: 'Chi tiết phiếu lương',
            key: 'actions',
            render: (_, record) => (
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenPayslip(record)}>Xem Phiếu lương</Button>
            )
          }
        ]}
        rowKey="id"
      />

      {/* MODAL: Detailed Payslip */}
      <Modal
        title="Phiếu Lương Chi Tiết Nhân Viên"
        open={isPayslipModalOpen}
        onCancel={() => setIsPayslipModalOpen(false)}
        footer={[
          <Button key="print" onClick={() => window.print()} icon={<FilePdfOutlined />}>In Phiếu Lương</Button>,
          <Button key="close" onClick={() => setIsPayslipModalOpen(false)}>Đóng</Button>
        ]}
      >
        {selectedPayslip && (
          <div style={{ padding: '16px 8px', color: '#cbd5e1' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Title level={4} style={{ margin: 0 }}>PHIẾU THANH TOÁN LƯƠNG</Title>
              <Text type="secondary">Tháng {selectedPayslip.month}/{selectedPayslip.year}</Text>
            </div>

            <Row style={{ marginBottom: 12 }}>
              <Col span={12}><strong>Họ và tên:</strong> {selectedPayslip.employee?.fullName}</Col>
              <Col span={12}><strong>Mã nhân viên:</strong> {selectedPayslip.employee?.empCode}</Col>
            </Row>
            <Row style={{ marginBottom: 24 }}>
              <Col span={12}><strong>Phòng ban:</strong> {selectedPayslip.employee?.department?.name}</Col>
              <Col span={12}><strong>Chức vụ:</strong> {selectedPayslip.employee?.position?.title}</Col>
            </Row>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>Lương cơ bản chức danh:</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.baseSalary).toLocaleString()} VND</Col>
              </Row>

              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>Số ngày công thực tế:</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{selectedPayslip.workDays} ngày</Col>
              </Row>

              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>Tổng tiền làm thêm giờ (Overtime):</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.otPayAmount).toLocaleString()} VND</Col>
              </Row>

              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>Các khoản phụ cấp phúc lợi:</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.allowance).toLocaleString()} VND</Col>
              </Row>

              <Row style={{ marginBottom: 8, color: '#ef4444' }}>
                <Col span={16}>Các khoản khấu trừ & BHXH:</Col>
                <Col span={8} style={{ textAlign: 'right' }}>-{Number(selectedPayslip.deduction).toLocaleString()} VND</Col>
              </Row>
            </div>

            <div style={{
              borderTop: '2px dashed rgba(255,255,255,0.2)',
              marginTop: 16,
              paddingTop: 16,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#10b981'
            }}>
              <Row>
                <Col span={16}>THỰC LĨNH CHUYỂN KHOẢN (NET):</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.netSalary).toLocaleString()} VND</Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
