import React, { useEffect, useState } from 'react';
import { Layout, Typography, Menu, Table, Button, Modal, Form, Input, Select, message, Space, Tag, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SuperadminChannelPartners() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/channel-partners');
      setRows(res.data?.channelPartners || []);
    } catch (_) {
      message.error('Failed to load channel partners');
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

  const onEdit = (record) => {
    setEditing(record);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    if (!editing) return;
    form.setFieldsValue({
      channelPartnerId: editing.channelPartnerId || '',
      name: editing.name || '',
      phone: editing.phone || '',
      businessEmail: editing.businessEmail || '',
      status: editing.status || 'ACTIVE',
      state: editing.state || '',
      city: editing.city || '',
      roleDescription: editing.roleDescription || '',
      employeeCount: editing.employeeCount || '',
      contactPersonName: editing.contactPersonName || '',
      address: editing.address || '',
      birthDate: editing.birthDate ? dayjs(editing.birthDate) : null,
      anniversaryDate: editing.anniversaryDate ? dayjs(editing.anniversaryDate) : null,
      gstNumber: editing.gstNumber || ''
    });
  }, [open, editing, form]);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
        anniversaryDate: values.anniversaryDate ? values.anniversaryDate.format('YYYY-MM-DD') : null
      };

      if (editing) {
        await api.put(`/superadmin/channel-partners/${editing.id}`, payload);
        message.success('Channel partner updated');
      } else {
        await api.post('/superadmin/channel-partners', payload);
        message.success('Channel partner created');
      }
      setOpen(false);
      load();
    } catch (e) {
      if (e?.response?.data?.message) {
        message.error(e.response.data.message);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const columns = [
    {
      title: 'Partner ID',
      dataIndex: 'channelPartnerId',
      width: 120,
      render: (id) => <Tag color="blue">{id || '-'}</Tag>
    },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Contact Person', dataIndex: 'contactPersonName' },
    { title: 'Phone', dataIndex: 'phone', width: 150 },
    { title: 'Business Email', dataIndex: 'businessEmail', width: 220 },
    { title: 'State', dataIndex: 'state', width: 140 },
    { title: 'City', dataIndex: 'city', width: 140 },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : v === 'DISABLED' ? 'red' : 'orange'}>{v}</Tag>
    },
    {
      title: 'Actions',
      width: 120,
      render: (_, rec) => (
        <Space>
          <Button size="small" onClick={() => onEdit(rec)}>Edit</Button>
        </Space>
      )
    }
  ];

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
            <Title level={4} style={{ margin: 0 }}>Channel Partners</Title>
          </div>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Channel Partners</h2>
            <Space>
              <Input.Search
                placeholder="Search ID, name or phone"
                allowClear
                onSearch={v => setSearchText(v)}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
              <Button type="primary" onClick={onCreate}>New Channel Partner</Button>
            </Space>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows.filter(r =>
              (r.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
              (r.phone || '').includes(searchText) ||
              (r.channelPartnerId || '').toLowerCase().includes(searchText.toLowerCase())
            )}
            pagination={{ pageSize: 10 }}
          />
        </Content>
      </Layout>

      <Modal
        title={editing ? 'Edit Channel Partner' : 'Create Channel Partner'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? 'Update' : 'Create'}
        forceRender
        destroyOnClose
      >
        <Form layout="vertical" form={form} preserve={false}>
          <Form.Item label="Channel Partner ID" name="channelPartnerId" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Business Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Phone" name="phone"><Input maxLength={10} /></Form.Item>
          <Form.Item label="Business Email" name="businessEmail"><Input type="email" /></Form.Item>
          <Form.Item label="Status" name="status"><Select options={[{ value: 'ACTIVE' }, { value: 'DISABLED' }, { value: 'SUSPENDED' }]} /></Form.Item>
          <Form.Item label="State" name="state"><Input /></Form.Item>
          <Form.Item label="City" name="city"><Input /></Form.Item>
          <Form.Item label="Describe role in organization" name="roleDescription"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="Employees in business" name="employeeCount">
            <Select placeholder="Select" options={[
              { value: 'Less than 20', label: 'Less than 20' },
              { value: '20-100', label: '20-100' },
              { value: '100-500', label: '100-500' },
              { value: 'More than 500', label: 'More than 500' },
            ]} />
          </Form.Item>
          <Form.Item label="Contact Person Name" name="contactPersonName"><Input /></Form.Item>
          <Form.Item label="Address" name="address"><Input.TextArea rows={2} /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label="Birth Date" name="birthDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Anniversary Date" name="anniversaryDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item label="GST Number" name="gstNumber"><Input /></Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
