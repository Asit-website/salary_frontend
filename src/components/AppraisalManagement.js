import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Card, Row, Col, Input, Button, Space, Table, Tag, Modal, Form, Select, InputNumber, DatePicker, message, Menu } from 'antd';
import { LogoutOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const STATUS_COLORS = {
  DRAFT: 'default',
  SUBMITTED: 'processing',
  COMPLETED: 'success',
};

export default function AppraisalManagement() {
  const navigate = useNavigate();
  const [staffOptions, setStaffOptions] = useState([]);
  const [periodMonth, setPeriodMonth] = useState(dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff');
      const list = Array.isArray(res?.data?.staff) ? res.data.staff : [];
      setStaffOptions(list.map((s) => ({
        value: s.id,
        label: s.name || s.phone || `Staff #${s.id}`,
      })));
    } catch (_) {}
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/performance/appraisals', { params: { periodMonth } });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load appraisals');
    } finally {
      setLoading(false);
    }
  }, [periodMonth]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const summary = useMemo(() => ({
    total: rows.length,
    completed: rows.filter((x) => x.status === 'COMPLETED').length,
    submitted: rows.filter((x) => x.status === 'SUBMITTED').length,
    draft: rows.filter((x) => x.status === 'DRAFT').length,
  }), [rows]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      periodMonth: dayjs(`${periodMonth}-01`),
      effectiveFrom: dayjs(),
      status: 'DRAFT',
      score: 0,
    });
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      userId: row.userId,
      title: row.title,
      periodMonth: dayjs(`${row.periodMonth}-01`),
      effectiveFrom: row.effectiveFrom ? dayjs(row.effectiveFrom) : dayjs(),
      score: row.score,
      status: row.status,
      remarks: row.remarks,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        userId: values.userId,
        title: values.title,
        periodMonth: values.periodMonth ? dayjs(values.periodMonth).format('YYYY-MM') : periodMonth,
        effectiveFrom: values.effectiveFrom ? dayjs(values.effectiveFrom).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        score: values.score,
        status: values.status,
        remarks: values.remarks || null,
      };
      if (editing?.id) {
        await api.put(`/admin/performance/appraisals/${editing.id}`, payload);
        message.success('Appraisal updated');
      } else {
        await api.post('/admin/performance/appraisals', payload);
        message.success('Appraisal created');
      }
      setOpen(false);
      loadRows();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save appraisal');
    }
  };

  const columns = [
    { title: 'Staff', dataIndex: 'staff', key: 'staff', render: (v, row) => <Space direction="vertical" size={0}><Text strong>{v}</Text><Text type="secondary">{row.phone}</Text></Space> },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Period', dataIndex: 'periodMonth', key: 'periodMonth' },
    { title: 'Effective From', dataIndex: 'effectiveFrom', key: 'effectiveFrom', render: (v) => (v || '-') },
    { title: 'Appraisal %', dataIndex: 'score', key: 'score', render: (v) => (v == null ? '-' : `${Number(v).toFixed(2)}%`) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
    { title: 'Action', key: 'action', render: (_, row) => <Button size="small" onClick={() => handleOpenEdit(row)}>Edit</Button> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
          <Title level={4} style={{ margin: 0 }}>Performance Management - Appraisal</Title>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} style={{ borderRight: 'none', backgroundColor: 'transparent' }} />
        </Header>
        <Content style={{ padding: 24 }}>
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}><Card><Text type="secondary">Total</Text><Title level={3} style={{ margin: 0 }}>{summary.total}</Title></Card></Col>
            <Col xs={24} sm={12} lg={6}><Card><Text type="secondary">Completed</Text><Title level={3} style={{ margin: 0, color: '#389e0d' }}>{summary.completed}</Title></Card></Col>
            <Col xs={24} sm={12} lg={6}><Card><Text type="secondary">Submitted</Text><Title level={3} style={{ margin: 0, color: '#1677ff' }}>{summary.submitted}</Title></Card></Col>
            <Col xs={24} sm={12} lg={6}><Card><Text type="secondary">Draft</Text><Title level={3} style={{ margin: 0 }}>{summary.draft}</Title></Card></Col>
          </Row>

          <Card
            title="Appraisal Records"
            extra={
              <Space>
                <DatePicker picker="month" value={dayjs(`${periodMonth}-01`)} onChange={(d) => setPeriodMonth(d ? d.format('YYYY-MM') : dayjs().format('YYYY-MM'))} />
                <Button icon={<ReloadOutlined />} onClick={loadRows}>Refresh</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>New Appraisal</Button>
              </Space>
            }
          >
            <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} />
          </Card>
        </Content>
      </Layout>

      <Modal
        open={open}
        title={editing ? 'Edit Appraisal' : 'Create Appraisal'}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="Staff" rules={[{ required: true, message: 'Select staff' }]}>
            <Select options={staffOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter title' }]}>
            <Input placeholder="Quarterly Appraisal" />
          </Form.Item>
          <Form.Item name="periodMonth" label="Period Month" rules={[{ required: true, message: 'Select month' }]}>
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Effective From" rules={[{ required: true, message: 'Select effective date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="score" label="Appraisal %" tooltip="0 to 100">
            <InputNumber
              min={0}
              max={100}
              step={0.1}
              style={{ width: '100%' }}
              formatter={(value) => `${value ?? ''}%`}
              parser={(value) => String(value || '').replace('%', '')}
            />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: 'DRAFT', label: 'DRAFT' }, { value: 'SUBMITTED', label: 'SUBMITTED' }, { value: 'COMPLETED', label: 'COMPLETED' }]} />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
