import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, Select, Space, message, Tag, Tooltip, Popconfirm, Row, Col, Statistic, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';
import './RolesPermissions.css';

const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

const RolesPermissions = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [geoLimits, setGeoLimits] = useState(null);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigningUser, setAssigningUser] = useState(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadStaff();
    loadGeoLimits();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/roles/roles');
      setRoles(res.data?.roles || []);
    } catch (e) {
      message.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.get('/admin/roles/permissions');
      setPermissions(res.data?.permissions || []);
    } catch (e) {
      message.error('Failed to load permissions');
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/admin/roles/staff-with-roles');
      setStaff(res.data?.staff || []);
    } catch (e) {
      message.error('Failed to load staff');
    }
  };

  const loadGeoLimits = async () => {
    try {
      const res = await api.get('/admin/roles/geolocation-limits');
      console.log('Frontend received geolocation limits:', res.data);
      setGeoLimits({
        ...res.data,
        // Respect backend geolocationEnabled flag (which already implements Plan + Override logic)
        geolocationEnabled: !!res.data.geolocationEnabled
      });
    } catch (e) {
      console.error('Failed to load geolocation limits', e);
      setGeoLimits({
        geolocationEnabled: false,
        maxStaff: 0,
        currentStaff: 0,
        canAssignMore: false
      });
    }
  };

  const onCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'staff', label: 'Staff Management' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'payroll', label: 'Payroll' },
    { key: 'loans', label: 'Loans' },
    { key: 'sales', label: 'Sales' },
    { key: 'reports', label: 'Reports' },
    { key: 'assets', label: 'Assets' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'geolocation', label: 'Geolocation' },
    { key: 'letters', label: 'Letters' },
    { key: 'settings', label: 'Settings' },
  ];

  const onEdit = (role) => {
    setEditing(role);
    form.setFieldsValue({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissionIds: role.permissions?.map(p => p.id) || []
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.put(`/admin/roles/roles/${editing.id}`, values);
        message.success('Role updated');
      } else {
        await api.post('/admin/roles/roles', values);
        message.success('Role created');
      }
      setOpen(false);
      loadRoles();
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/admin/roles/roles/${id}`);
      message.success('Role deleted');
      loadRoles();
    } catch (e) {
      message.error('Failed to delete role');
    }
  };

  const onAssignRole = (user) => {
    setAssigningUser(user);
    assignForm.setFieldsValue({
      roleIds: user.roles?.map(r => r.id) || []
    });
    setAssignOpen(true);
  };

  const onAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      await api.post('/admin/roles/assign-role', {
        userId: assigningUser.id,
        roleIds: values.roleIds
      });
      message.success('Roles assigned');
      setAssignOpen(false);
      loadStaff();
      loadGeoLimits();
    } catch (e) {
      message.error('Failed to assign Roles');
    }
  };

  const roleColumns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Display Name', dataIndex: 'displayName' },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          <Popconfirm
            title="Delete this role?"
            onConfirm={() => onDelete(record.id)}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const staffColumns = [
    { title: 'Staff', dataIndex: 'profile', render: (p, record) => p?.name || record.phone },
    {
      title: 'Roles',
      dataIndex: 'roles',
      render: (roles) => (
        <Space wrap>
          {roles?.map(r => <Tag key={r.id} color="blue">{r.displayName}</Tag>)}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" onClick={() => onAssignRole(record)}>Assign Roles</Button>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 48px)', overflow: 'auto' }}>
          <h1>Roles & Permissions</h1>

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card bordered={false} className="stats-card">
                <Statistic
                  title="Total Roles"
                  value={roles.length}
                  prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="stats-card">
                <Statistic
                  title="Geostaff Assigned"
                  value={geoLimits?.currentStaff || 0}
                  suffix={`/ ${geoLimits?.maxStaff || 0}`}
                  prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: (geoLimits?.currentStaff >= geoLimits?.maxStaff) ? '#f5222d' : '#3f8600' }}
                />
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                  {geoLimits?.geolocationEnabled ? 'Limit based on active plan' : 'Geofencing not enabled'}
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="stats-card">
                <Statistic
                  title="Total Staff"
                  value={staff.length}
                  prefix={<TeamOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Roles" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Manage Roles</h3>
              <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
                Create Role
              </Button>
            </div>
            <Table
              rowKey="id"
              loading={loading}
              columns={roleColumns}
              dataSource={roles}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          <Card title="Staff Role Assignment">
            <Table
              rowKey="id"
              loading={loading}
              columns={staffColumns}
              dataSource={staff}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          <Modal
            title={editing ? 'Edit Role' : 'Create Role'}
            open={open}
            onCancel={() => setOpen(false)}
            onOk={onSubmit}
            okText={editing ? 'Update' : 'Create'}
            width={800}
          >
            <Form layout="vertical" form={form}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Role Name" name="name" rules={[{ required: true }]}>
                    <Input placeholder="finance_manager" disabled={!!editing} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Display Name" name="displayName" rules={[{ required: true }]}>
                    <Input placeholder="Finance Manager" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Description" name="description">
                <Input placeholder="Has access to payroll and expenses" />
              </Form.Item>

              <Form.Item label="Permissions" name="permissionIds">
                <Select mode="multiple" placeholder="Select permissions" style={{ width: '100%' }}>
                  {permissions.map(p => (
                    <Option key={p.id} value={p.id}>{p.displayName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title={`Assign Roles to ${assigningUser?.profile?.name || assigningUser?.phone}`}
            open={assignOpen}
            onCancel={() => setAssignOpen(false)}
            onOk={onAssignSubmit}
            okText="Assign"
          >
            <Form layout="vertical" form={assignForm}>
              <Form.Item label="Selected Roles" name="roleIds" rules={[{ required: true }]}>
                <Select mode="multiple" placeholder="Select roles">
                  {roles.map(r => (
                    <Option key={r.id} value={r.id}>{r.displayName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default RolesPermissions;
