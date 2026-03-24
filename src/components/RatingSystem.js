import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Card, Row, Col, Button, Space, Table, Modal, Form, Select, InputNumber, Input, DatePicker, message, Menu } from 'antd';
import { LogoutOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function RatingSystem() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [staffOptions, setStaffOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff');
      const list = Array.isArray(res?.data?.staff) ? res.data.staff : [];
      setStaffOptions(list.map((s) => ({ value: s.id, label: s.name || s.phone || `Staff #${s.id}` })));
    } catch (_) {}
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/performance/ratings', { params: { month } });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const summary = useMemo(() => {
    const total = rows.length;
    const avg = total ? (rows.reduce((acc, x) => acc + Number(x.rating || 0), 0) / total) : 0;
    return { total, avg };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ maxRating: 5, ratedAt: dayjs(), rating: 0 });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      userId: row.userId,
      metric: row.metric,
      rating: row.rating,
      maxRating: row.maxRating,
      ratedAt: dayjs(row.ratedAt),
      note: row.note,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        userId: v.userId,
        metric: v.metric,
        rating: v.rating,
        maxRating: v.maxRating,
        ratedAt: v.ratedAt ? dayjs(v.ratedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        note: v.note || null,
      };
      if (editing?.id) {
        await api.put(`/admin/performance/ratings/${editing.id}`, payload);
        message.success('Rating updated');
      } else {
        await api.post('/admin/performance/ratings', payload);
        message.success('Rating created');
      }
      setOpen(false);
      loadRows();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save rating');
    }
  };

  const columns = [
    { title: 'Staff', dataIndex: 'staff', key: 'staff', render: (v, r) => <Space direction="vertical" size={0}><Text strong>{v}</Text><Text type="secondary">{r.phone}</Text></Space> },
    { title: 'Metric', dataIndex: 'metric', key: 'metric' },
    { title: 'Rating', dataIndex: 'rating', key: 'rating', render: (v, r) => `${Number(v || 0).toFixed(2)} / ${Number(r.maxRating || 5).toFixed(2)}` },
    { title: 'Date', dataIndex: 'ratedAt', key: 'ratedAt' },
    { title: 'Action', key: 'action', render: (_, row) => <Button size="small" onClick={() => openEdit(row)}>Edit</Button> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
          <Title level={4} style={{ margin: 0 }}>Performance Management - Rating System</Title>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} style={{ borderRight: 'none', backgroundColor: 'transparent' }} />
        </Header>
        <Content style={{ padding: 24 }}>
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}><Card><Text type="secondary">Total Ratings</Text><Title level={3} style={{ margin: 0 }}>{summary.total}</Title></Card></Col>
            <Col xs={24} sm={12}><Card><Text type="secondary">Average Rating</Text><Title level={3} style={{ margin: 0, color: '#1677ff' }}>{summary.avg.toFixed(2)}</Title></Card></Col>
          </Row>

          <Card
            title="Rating Records"
            extra={
              <Space>
                <DatePicker picker="month" value={dayjs(`${month}-01`)} onChange={(d) => setMonth(d ? d.format('YYYY-MM') : dayjs().format('YYYY-MM'))} />
                <Button icon={<ReloadOutlined />} onClick={loadRows}>Refresh</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Rating</Button>
              </Space>
            }
          >
            <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} />
          </Card>
        </Content>
      </Layout>

      <Modal
        open={open}
        title={editing ? 'Edit Rating' : 'Create Rating'}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText={editing ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="Staff" rules={[{ required: true, message: 'Select staff' }]}>
            <Select options={staffOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="metric" label="Metric" rules={[{ required: true, message: 'Enter metric' }]}>
            <Input placeholder="Punctuality / Quality / Teamwork" />
          </Form.Item>
          <Form.Item name="rating" label="Rating" rules={[{ required: true, message: 'Enter rating' }]}>
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxRating" label="Max Rating">
            <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ratedAt" label="Rated Date" rules={[{ required: true, message: 'Select date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

