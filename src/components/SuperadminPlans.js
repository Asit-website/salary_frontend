import React, { useEffect, useState } from 'react';
import { Layout, Typography, Menu, Table, Button, Modal, Form, Input, InputNumber, Switch, message, Space, Row, Col } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SuperadminPlans() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscription/plans');
      setRows(res.data?.plans || []);
    } catch (e) {
      message.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const onEdit = (rec) => {
    setEditing(rec);
    form.setFieldsValue({
      code: rec.code,
      name: rec.name,
      periodDays: rec.periodDays,
      price: rec.price,
      salesEnabled: rec.salesEnabled,
      geolocationEnabled: rec.geolocationEnabled,
      expenseEnabled: rec.expenseEnabled,
      payrollEnabled: rec.payrollEnabled,
      performanceEnabled: rec.performanceEnabled,
      aiReportsEnabled: rec.aiReportsEnabled,
      aiAssistantEnabled: rec.aiAssistantEnabled,
      taskManagementEnabled: rec.taskManagementEnabled,
      rosterEnabled: rec.rosterEnabled,
      recruitmentEnabled: rec.recruitmentEnabled,
      communityEnabled: rec.communityEnabled,
      maxGeolocationStaff: rec.maxGeolocationStaff,
      active: rec.active,
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.put(`/subscription/plans/${editing.id}`, values);
        message.success('Plan updated');
      } else {
        await api.post('/subscription/plans', values);
        message.success('Plan created');
      }
      setOpen(false);
      load();
    } catch (e) {
      // validation or API error
      if (e?.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 120, fixed: 'left' },
    { title: 'Name', dataIndex: 'name', width: 150 },
    { title: 'Days', dataIndex: 'periodDays', width: 90 },
    { title: 'Price', dataIndex: 'price', width: 100, render: (v) => `₹ ${Number(v || 0)}` },
    { title: 'Sales', dataIndex: 'salesEnabled', width: 80, render: (v) => v ? '✅' : '❌' },
    { title: 'Geo', dataIndex: 'geolocationEnabled', width: 80, render: (v) => v ? '✅' : '❌' },
    { title: 'Exp', dataIndex: 'expenseEnabled', width: 80, render: (v) => v ? '✅' : '❌' },
    { title: 'Payroll', dataIndex: 'payrollEnabled', width: 90, render: (v) => v ? '✅' : '❌' },
    { title: 'Perf', dataIndex: 'performanceEnabled', width: 80, render: (v) => v ? '✅' : '❌' },
    { title: 'AI Rep', dataIndex: 'aiReportsEnabled', width: 100, render: (v) => v ? '✅' : '❌' },
    { title: 'AI Asst', dataIndex: 'aiAssistantEnabled', width: 100, render: (v) => v ? '✅' : '❌' },
    { title: 'Task Mgmt', dataIndex: 'taskManagementEnabled', width: 110, render: (v) => v ? '✅' : '❌' },
    { title: 'Roster', dataIndex: 'rosterEnabled', width: 80, render: (v) => v ? '✅' : '❌' },
    { title: 'ATS', dataIndex: 'recruitmentEnabled', width: 80, render: (v) => v ? '✅' : '❌' },
    { title: 'Community', dataIndex: 'communityEnabled', width: 100, render: (v) => v ? '✅' : '❌' },
    // { title: 'Max Geo Staff', dataIndex: 'maxGeolocationStaff', width: 120, render: (v) => v || 0 },
    { title: 'Active', dataIndex: 'active', width: 90, render: (v) => v ? 'Yes' : 'No' },
    {
      title: 'Actions', key: 'act', width: 100, fixed: 'right', render: (_, rec) => (
        <Space>
          <Button size="small" onClick={() => onEdit(rec)}>Edit</Button>
        </Space>
      )
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Title level={4} style={{ margin: 0 }}>Plans</Title>
          </div>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Plans</h2>
            <Button type="primary" onClick={onCreate}>New Plan</Button>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1300 }}
          />
        </Content>
      </Layout>

      <Modal
        title={editing ? 'Edit Plan' : 'Create Plan'}
        open={open}
        width={760}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? 'Update' : 'Create'}
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Code" name="code" rules={[{ required: true }]}>
            <Input placeholder="TRIAL, MONTHLY, YEARLY" />
          </Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Trial 3 Days" />
          </Form.Item>
          <Form.Item label="Period Days" name="periodDays" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Price" name="price" initialValue={0}>
            <InputNumber min={0} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={[16, 0]}>
            <Col span={8}>
              <Form.Item label="Sales Enabled" name="salesEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Geolocation Enabled" name="geolocationEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Expense Enabled" name="expenseEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Payroll Enabled" name="payrollEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Performance Enabled" name="performanceEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="AI Reports Enabled" name="aiReportsEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="AI Assistant Enabled" name="aiAssistantEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Task Management Enabled" name="taskManagementEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Roster Enabled" name="rosterEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Recruitment Enabled" name="recruitmentEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Community Enabled" name="communityEnabled" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Active" name="active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
