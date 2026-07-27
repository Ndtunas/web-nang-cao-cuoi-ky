import React, { useState } from 'react';
import { Card, Space, Table, Tag, Button, InputNumber, Row, Col, Typography, message } from 'antd';
import AppModal from './AppModal';
import { CalculatorOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.jsx';
import { canDo } from '../constants/roles.js';
import { exportsService } from '../services/exports.service.js';
import { labelFor } from '../utils/labelMapping.js';

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
  loading = false,
  t
}) {
  const { role } = useAuth();
  const canCalculate = canDo(role, 'PAYROLL_CALCULATE');

  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const handleOpenPayslip = (record) => {
    setSelectedPayslip(record);
    setIsPayslipModalOpen(true);
  };

  return (
    <Card title={t('payroll.cardTitle')} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Text>{t('payroll.month')}</Text>
          <InputNumber min={1} max={12} value={payrollMonth} onChange={setPayrollMonth} />
          <Text>{t('payroll.year')}</Text>
          <InputNumber min={2026} max={2030} value={payrollYear} onChange={setPayrollYear} />
          <Button type="primary" icon={<CalculatorOutlined />} loading={calculatingPayroll} onClick={onCalculatePayroll} disabled={!canCalculate}>{t('payroll.btnCalculate')}</Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                await exportsService.exportSalaries(payrollMonth, payrollYear);
                message.success(t('exports.success'));
              } catch (e) {
                message.error(t('exports.failed'));
              }
            }}
          >
            {t('exports.button')}
          </Button>
        </Space>
      </div>

      <Table
        dataSource={payrollSalaries}
        loading={loading}
        columns={[
          { title: t('payroll.cols.code'), dataIndex: ['employee', 'empCode'], key: 'empCode' },
          { title: t('payroll.cols.name'), dataIndex: ['employee', 'fullName'], key: 'fullName' },
          { title: t('payroll.cols.baseSalary'), dataIndex: 'baseSalary', key: 'baseSalary', render: (v) => `${Number(v).toLocaleString()} VND` },
          { title: t('payroll.cols.workDays'), dataIndex: 'workDays', key: 'workDays' },
          { title: t('payroll.cols.netSalary'), dataIndex: 'netSalary', key: 'netSalary', render: (v) => <Text strong style={{ color: '#10b981' }}>{`${Number(v).toLocaleString()} VND`}</Text> },
          { title: t('payroll.cols.status'), dataIndex: 'status', key: 'status', render: (s) => {
            const color = s === 'APPROVED' ? 'green' : s === 'PAID' ? 'blue' : s === 'PENDING_APPROVAL' ? 'gold' : 'orange';
            return <Tag color={color}>{labelFor(t, 'payrollStatus', s)}</Tag>;
          } },
          {
            title: t('payroll.cols.action'),
            key: 'actions',
            render: (_, record) => (
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenPayslip(record)}>{t('payroll.viewPayslip')}</Button>
            )
          }
        ]}
        rowKey="id"
      />

      {/* MODAL: Detailed Payslip */}
      <AppModal
        title={t('payroll.modalTitle')}
        open={isPayslipModalOpen}
        onCancel={() => setIsPayslipModalOpen(false)}
        footer={[
          <Button key="print" onClick={() => window.print()} icon={<FilePdfOutlined />}>{t('payroll.btnPrint')}</Button>,
          <Button key="close" onClick={() => setIsPayslipModalOpen(false)}>{t('payroll.btnClose')}</Button>
        ]}
      >
        {selectedPayslip && (
          <div style={{ padding: '16px 8px', color: '#cbd5e1' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Title level={4} style={{ margin: 0 }}>{t('payroll.payslipHeader')}</Title>
              <Text type="secondary">{t('payroll.payslipMonth')} {selectedPayslip.month}/{selectedPayslip.year}</Text>
            </div>

            <Row style={{ marginBottom: 12 }}>
              <Col span={12}><strong>{t('payroll.fullName')}</strong> {selectedPayslip.employee?.fullName}</Col>
              <Col span={12}><strong>{t('payroll.empCode')}</strong> {selectedPayslip.employee?.empCode}</Col>
            </Row>
            <Row style={{ marginBottom: 24 }}>
              <Col span={12}><strong>{t('payroll.department')}</strong> {selectedPayslip.employee?.department?.name}</Col>
              <Col span={12}><strong>{t('payroll.position')}</strong> {selectedPayslip.employee?.position?.title}</Col>
            </Row>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>{t('payroll.baseSalaryLabel')}</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.baseSalary).toLocaleString()} VND</Col>
              </Row>

              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>{t('payroll.workDaysLabel')}</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{selectedPayslip.workDays} ngày</Col>
              </Row>

              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>{t('payroll.otPayLabel')}</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.otPayAmount).toLocaleString()} VND</Col>
              </Row>

              <Row style={{ marginBottom: 8 }}>
                <Col span={16}>{t('payroll.allowanceLabel')}</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.allowance).toLocaleString()} VND</Col>
              </Row>

              <Row style={{ marginBottom: 8, color: '#ef4444' }}>
                <Col span={16}>{t('payroll.deductionLabel')}</Col>
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
                <Col span={16}>{t('payroll.netLabel')}</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{Number(selectedPayslip.netSalary).toLocaleString()} VND</Col>
              </Row>
            </div>
          </div>
        )}
      </AppModal>
    </Card>
  );
}
