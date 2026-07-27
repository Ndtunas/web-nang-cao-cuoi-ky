import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Space,
  Tag,
  Statistic,
  Empty,
  Tooltip,
  Popconfirm,
  message,
  Progress,
  Divider,
} from 'antd';
import AppModal from './AppModal';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  ReloadOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { projectsService, employeesService } from '../services/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ROLES, canDo } from '../constants/roles.js';
import { labelFor } from '../utils/labelMapping.js';

const STATUS_META = {
  PLANNING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  ACTIVE:   { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  COMPLETED:{ color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  SUSPENDED:{ color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export default function Projects({ t }) {
  const { role } = useAuth();
  const canCreateProject = canDo(role, 'PROJECT_CREATE');
  const canEditProject = canDo(role, 'PROJECT_EDIT');
  const canDeleteProject = canDo(role, 'PROJECT_DELETE');
  const canCreateTask = canDo(role, 'TASK_CREATE');
  const canEditTask = canDo(role, 'TASK_EDIT');
  const canDeleteTask = canDo(role, 'TASK_DELETE');
  const canAssignPM = canDo(role, 'PROJECT_ASSIGN_PM');

  const [projects, setProjects] = useState([]);
  const [tasksByProject, setTasksByProject] = useState({}); // { [projectId]: ProjectTask[] }
  const [laborByProject, setLaborByProject] = useState({}); // { [projectId]: { totalHours, entryCount } }
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm] = Form.useForm();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm] = Form.useForm();

  const selectedProject = useMemo(
    () => projects.find(p => String(p.id) === String(selectedProjectId)) || null,
    [projects, selectedProjectId]
  );
  const selectedTasks = selectedProjectId ? (tasksByProject[selectedProjectId] || []) : [];

  // PM dropdown: chỉ những role đủ cấp (DEPT_LEAD, DIRECTOR, CHAIRMAN) mới có thể được gán làm PM.
  // HR_LEAD đã được loại bỏ khỏi hệ thống.
  const PM_ELIGIBLE_ROLES = [ROLES.DEPT_LEAD, ROLES.DIRECTOR, ROLES.CHAIRMAN];
  const pmOptions = useMemo(
    () => employees
      .filter(e => PM_ELIGIBLE_ROLES.includes(e.role))
      .map(e => ({
        value: String(e.id),
        label: `${e.fullName} (${e.employeeCode || e.id})`,
        role: e.role,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    [employees]
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [projList, empList] = await Promise.all([
        projectsService.getAll(),
        employeesService.getAll(),
      ]);
      setProjects(projList);
      setEmployees(empList);

      // Pre-fetch tasks + labor hours in parallel for every project.
      const taskEntries = await Promise.all(
        projList.map(p => projectsService.getTasks(p.id).catch(() => []))
      );
      const taskMap = {};
      projList.forEach((p, idx) => { taskMap[p.id] = taskEntries[idx] || []; });
      setTasksByProject(taskMap);

      const laborEntries = await Promise.all(
        projList.map(p => projectsService.getLaborHours(p.id).catch(() => ({ totalHours: 0, entryCount: 0 })))
      );
      const laborMap = {};
      projList.forEach((p, idx) => { laborMap[p.id] = laborEntries[idx]; });
      setLaborByProject(laborMap);

      if (!selectedProjectId && projList.length > 0) {
        setSelectedProjectId(projList[0].id);
      }
    } catch (err) {
      message.error(err?.i18nKey ? t(err.i18nKey) : (err?.message || 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  // ---------- Project modal opens via button onClick (set editingProject first) ----------

  const handleSubmitProject = async () => {
    setSubmittingProject(true);
    try {
      const values = await projectForm.validateFields();
      const payload = {
        name: values.name,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD') || undefined,
        pmId: values.pmId || undefined,
        status: values.status,
      };
      if (editingProject) {
        await projectsService.update(editingProject.id, payload);
        message.success(t('projects.msg.updated'));
      } else {
        await projectsService.create(payload);
        message.success(t('projects.msg.created'));
      }
      setProjectModalOpen(false);
      setEditingProject(null);
      projectForm.resetFields();
      await loadAll();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.i18nKey ? t(err.i18nKey) : (err?.message || 'Save failed'));
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleDeleteProject = async (project) => {
    setDeletingProjectId(project.id);
    try {
      await projectsService.remove(project.id);
      message.success(t('projects.msg.deleted'));
      if (String(selectedProjectId) === String(project.id)) {
        setSelectedProjectId(null);
      }
      await loadAll();
    } catch (err) {
      message.error(err?.i18nKey ? t(err.i18nKey) : (err?.message || 'Delete failed'));
    } finally {
      setDeletingProjectId(null);
    }
  };

  // ---------- Task modal opens via button onClick (set editingTask first) ----------

  const handleSubmitTask = async () => {
    setSubmittingTask(true);
    try {
      const values = await taskForm.validateFields();
      const payload = {
        projectId: String(selectedProject.id),
        taskName: values.taskName,
        description: values.description || undefined,
        estimatedHours: values.estimatedHours,
      };
      if (editingTask) {
        await projectsService.updateTask(editingTask.id, payload);
        message.success(t('projects.msg.taskUpdated'));
      } else {
        await projectsService.createTask(payload);
        message.success(t('projects.msg.taskCreated'));
      }
      setTaskModalOpen(false);
      setEditingTask(null);
      taskForm.resetFields();
      const tasks = await projectsService.getTasks(selectedProject.id);
      setTasksByProject(prev => ({ ...prev, [selectedProject.id]: tasks }));
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.i18nKey ? t(err.i18nKey) : (err?.message || 'Save failed'));
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (task) => {
    setDeletingTaskId(task.id);
    try {
      await projectsService.removeTask(task.id);
      message.success(t('projects.msg.taskDeleted'));
      const tasks = await projectsService.getTasks(selectedProject.id);
      setTasksByProject(prev => ({ ...prev, [selectedProject.id]: tasks }));
    } catch (err) {
      message.error(err?.i18nKey ? t(err.i18nKey) : (err?.message || 'Delete failed'));
    } finally {
      setDeletingTaskId(null);
    }
  };

  // ---------- Table columns ----------
  const projectColumns = [
    {
      title: t('projects.cols.name'),
      dataIndex: 'name',
      key: 'name',
      render: (val, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{val}</span>
          {record.projectCode && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {record.projectCode}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: t('projects.cols.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const meta = STATUS_META[status] || STATUS_META.ACTIVE;
        return (
          <Tag style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}40`, fontWeight: 600 }}>
            {labelFor(t, 'projectStatus', status)}
          </Tag>
        );
      },
    },
    {
      title: t('projects.cols.tasks'),
      key: 'tasks',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const count = (tasksByProject[record.id] || []).length;
        return (
          <Tooltip title={t('projects.tooltips.taskCount', { count })}>
            <Tag color="purple">{count}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: t('projects.cols.actions'),
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          {canEditProject && (
            <Tooltip title={t('projects.tooltips.edit')}>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={(e) => { e.stopPropagation(); setEditingProject(record); setProjectModalOpen(true); }}
              />
            </Tooltip>
          )}
          {canDeleteProject && (
            <Popconfirm
              title={t('projects.confirm.deleteProject')}
              okText={t('projects.modal.ok')}
              cancelText={t('projects.modal.cancel')}
              onConfirm={(e) => { e?.stopPropagation?.(); handleDeleteProject(record); }}
              onCancel={(e) => e?.stopPropagation?.()}
            >
              <Tooltip title={t('projects.tooltips.delete')}>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={deletingProjectId === record.id ? <LoadingOutlined /> : <DeleteOutlined />}
                  loading={deletingProjectId === record.id}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const taskColumns = [
    {
      title: t('projects.cols.taskName'),
      dataIndex: 'taskName',
      key: 'taskName',
      render: (val, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{val}</span>
          {record.description && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {record.description}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: t('projects.cols.estimatedHours'),
      dataIndex: 'estimatedHours',
      key: 'estimatedHours',
      width: 130,
      align: 'right',
      render: (val) => <Tag color="geekblue">{Number(val).toFixed(2)} h</Tag>,
    },
    {
      title: t('projects.cols.actions'),
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          {canEditTask && (
            <Tooltip title={t('projects.tooltips.edit')}>
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditingTask(record); setTaskModalOpen(true); }} />
            </Tooltip>
          )}
          {canDeleteTask && (
            <Popconfirm
              title={t('projects.confirm.deleteTask')}
              okText={t('projects.modal.ok')}
              cancelText={t('projects.modal.cancel')}
              onConfirm={() => handleDeleteTask(record)}
            >
              <Tooltip title={t('projects.tooltips.delete')}>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={deletingTaskId === record.id ? <LoadingOutlined /> : <DeleteOutlined />}
                  loading={deletingTaskId === record.id}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ---------- Render ----------
  return (
    <>
      <Card
        style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}
        title={
          <Space>
            <ProjectOutlined style={{ color: '#6366f1' }} />
            <span>{t('projects.cardTitle')}</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
              {t('projects.btn.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingProject(null); setProjectModalOpen(true); }}
              disabled={!canCreateProject}
            >
              {t('projects.btn.addProject')}
            </Button>
          </Space>
        }
      >
        <Row gutter={[24, 24]}>
          {/* Left: Project list */}
          <Col xs={24} lg={11}>
            <Table
              dataSource={projects}
              columns={projectColumns}
              rowKey="id"
              loading={loading}
              size="middle"
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              onRow={(record) => ({
                onClick: () => setSelectedProjectId(record.id),
                style: {
                  cursor: 'pointer',
                  background:
                    String(selectedProjectId) === String(record.id)
                      ? 'rgba(99, 102, 241, 0.15)'
                      : undefined,
                },
              })}
              locale={{
                emptyText: <Empty description={t('projects.empty.projects')} />,
              }}
            />
          </Col>

          {/* Right: Selected project detail + tasks */}
          <Col xs={24} lg={13}>
            {!selectedProject ? (
              <Empty description={t('projects.empty.selectProject')} style={{ marginTop: 80 }} />
            ) : (
              <Card
                type="inner"
                title={
                  <Space>
                    <span>{selectedProject.name}</span>
                    {(() => {
                      const meta = STATUS_META[selectedProject.status] || STATUS_META.ACTIVE;
                      return (
                        <Tag style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}40` }}>
                          {t(`projects.statusLabels.${selectedProject.status}`)}
                        </Tag>
                      );
                    })()}
                  </Space>
                }
                extra={
                  <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { setEditingTask(null); setTaskModalOpen(true); }} disabled={!canCreateTask}>
                    {t('projects.btn.addTask')}
                  </Button>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Statistic
                      title={
                        <Space size={4}>
                          <UserOutlined />
                          <span>{t('projects.detail.pm')}</span>
                        </Space>
                      }
                      value={selectedProject.pm?.fullName || t('projects.detail.unassigned')}
                      valueStyle={{
                        fontSize: 14,
                        color: selectedProject.pm ? '#cbd5e1' : 'rgba(255,255,255,0.35)',
                      }}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title={
                        <Space size={4}>
                          <ClockCircleOutlined />
                          <span>{t('projects.detail.totalLabor')}</span>
                        </Space>
                      }
                      value={Number(laborByProject[selectedProject.id]?.totalHours || 0).toFixed(2)}
                      suffix="h"
                      valueStyle={{ fontSize: 16, color: '#a855f7' }}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title={t('projects.detail.entries')}
                      value={laborByProject[selectedProject.id]?.entryCount || 0}
                      valueStyle={{ fontSize: 16, color: '#10b981' }}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: '16px 0' }} />

                <Space wrap size={16} style={{ marginBottom: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {t('projects.detail.startDate')}: <strong>{selectedProject.startDate ? dayjs(selectedProject.startDate).format('DD/MM/YYYY') : '-'}</strong>
                  </span>
                  <ArrowRightOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {t('projects.detail.endDate')}: <strong>{selectedProject.endDate ? dayjs(selectedProject.endDate).format('DD/MM/YYYY') : t('projects.detail.ongoing')}</strong>
                  </span>
                </Space>

                {/* Estimated vs actual labor */}
                {(() => {
                  const totalEstimated = selectedTasks.reduce(
                    (sum, task) => sum + (Number(task.estimatedHours) || 0),
                    0
                  );
                  const totalActual = Number(laborByProject[selectedProject.id]?.totalHours || 0);
                  const pct = totalEstimated > 0 ? Math.min(100, (totalActual / totalEstimated) * 100) : 0;
                  return (
                    <div style={{ marginTop: 8 }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {t('projects.detail.estimatedVsActual')}
                        </span>
                        <span style={{ fontSize: 12 }}>
                          {totalActual.toFixed(2)}h / {totalEstimated.toFixed(2)}h
                        </span>
                      </Space>
                      <Progress
                        percent={Number(pct.toFixed(1))}
                        strokeColor={pct > 100 ? '#ef4444' : '#6366f1'}
                        showInfo={false}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  );
                })()}

                <Divider style={{ margin: '16px 0' }}>
                  <Space size={6}>
                    <CheckSquareOutlined />
                    <span>{t('projects.detail.tasksTitle')}</span>
                  </Space>
                </Divider>

                <Table
                  dataSource={selectedTasks}
                  columns={taskColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  locale={{
                    emptyText: <Empty description={t('projects.empty.tasks')} />,
                  }}
                />
              </Card>
            )}
          </Col>
        </Row>
      </Card>

      {/* Project modal */}
      <AppModal
        key={editingProject ? `edit-${editingProject.id}` : 'create'}
        title={editingProject ? t('projects.modal.titleEditProject') : t('projects.modal.titleAddProject')}
        open={projectModalOpen}
        onCancel={() => { setProjectModalOpen(false); setEditingProject(null); }}
        onOk={handleSubmitProject}
        okText={t('projects.modal.ok')}
        cancelText={t('projects.modal.cancel')}
        destroyOnClose
        confirmLoading={submittingProject}
        cancelButtonProps={{ disabled: submittingProject }}
        afterOpenChange={(open) => {
          if (open) {
            if (editingProject) {
              projectForm.setFieldsValue({
                name: editingProject.name,
                startDate: editingProject.startDate ? dayjs(editingProject.startDate) : null,
                endDate: editingProject.endDate ? dayjs(editingProject.endDate) : null,
                pmId: editingProject.pmId ? String(editingProject.pmId) : undefined,
                status: editingProject.status || 'ACTIVE',
              });
            } else {
              projectForm.setFieldsValue({ status: 'ACTIVE', startDate: dayjs() });
            }
          }
        }}
      >
        <Form form={projectForm} layout="vertical" disabled={submittingProject}>
          <Form.Item
            name="name"
            label={t('projects.modal.fields.name')}
            rules={[
              { required: true, message: t('projects.modal.validation.nameRequired') },
              { min: 2, message: t('projects.modal.validation.nameMin') },
              { max: 150, message: t('projects.modal.validation.nameMax') },
            ]}
          >
            <Input placeholder={t('projects.modal.placeholders.name')} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label={t('projects.modal.fields.startDate')}
                rules={[{ required: true, message: t('projects.modal.validation.startDateRequired') }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label={t('projects.modal.fields.endDate')}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="pmId" label={t('projects.modal.fields.pm')}>
                <Select
                  allowClear
                  showSearch
                  placeholder={t('projects.modal.placeholders.pm')}
                  optionFilterProp="label"
                  optionLabelProp="label"
                  options={pmOptions}
                  disabled={!canAssignPM}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('projects.modal.fields.status')}
                rules={[{ required: true }]}
              >
                <Select
                  options={['PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED'].map(s => ({
                    value: s,
                    label: t(`projects.statusLabels.${s}`),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </AppModal>

      {/* Task modal */}
      <AppModal
        key={editingTask ? `edit-task-${editingTask.id}` : 'create-task'}
        title={editingTask ? t('projects.modal.titleEditTask') : t('projects.modal.titleAddTask')}
        open={taskModalOpen}
        onCancel={() => { setTaskModalOpen(false); setEditingTask(null); }}
        onOk={handleSubmitTask}
        okText={t('projects.modal.ok')}
        cancelText={t('projects.modal.cancel')}
        destroyOnClose
        confirmLoading={submittingTask}
        cancelButtonProps={{ disabled: submittingTask }}
        afterOpenChange={(open) => {
          if (open && selectedProject) {
            if (editingTask) {
              taskForm.setFieldsValue({
                projectId: String(selectedProject.id),
                taskName: editingTask.taskName,
                description: editingTask.description,
                estimatedHours: Number(editingTask.estimatedHours) || 0,
              });
            } else {
              taskForm.setFieldsValue({
                projectId: String(selectedProject.id),
                estimatedHours: 0,
              });
            }
          }
        }}
      >
        <Form form={taskForm} layout="vertical" disabled={submittingTask}>
          <Form.Item name="projectId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="taskName"
            label={t('projects.modal.fields.taskName')}
            rules={[
              { required: true, message: t('projects.modal.validation.taskNameRequired') },
              { min: 2, message: t('projects.modal.validation.nameMin') },
              { max: 150, message: t('projects.modal.validation.nameMax') },
            ]}
          >
            <Input placeholder={t('projects.modal.placeholders.taskName')} />
          </Form.Item>
          <Form.Item name="description" label={t('projects.modal.fields.description')}>
            <Input.TextArea rows={3} placeholder={t('projects.modal.placeholders.description')} />
          </Form.Item>
          <Form.Item
            name="estimatedHours"
            label={t('projects.modal.fields.estimatedHours')}
            rules={[{ type: 'number', min: 0, max: 9999.99 }]}
          >
            <InputNumber min={0} max={9999.99} step={0.5} style={{ width: '100%' }} addonAfter="h" />
          </Form.Item>
        </Form>
      </AppModal>
    </>
  );
}
