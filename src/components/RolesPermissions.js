import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, Select, Space, message, Tag, Tooltip, Popconfirm, Row, Col, Statistic } from 'antd';
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

  const onDelete = async (roleId) => {
    try {
      await api.delete(`/admin/roles/roles/${roleId}`);
      message.success('Role deleted successfully');
      loadRoles();
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to delete role');
    }
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Check if we're assigning geolocation permission
      const geolocationPermission = permissions.find(p => p.name === 'geolocation_access');
      if (values.permissionIds && geolocationPermission && values.permissionIds.includes(geolocationPermission.id)) {
        try {
          // Check geolocation limits
          const limitsRes = await api.get('/admin/roles/geolocation-limits');

          // Check if we can assign more staff with geolocation
          if (limitsRes.data.maxStaff > 0 && // Geolocation is enabled
            limitsRes.data.currentStaff >= limitsRes.data.maxStaff) {
            message.error(`Cannot assign geolocation access. Maximum limit of ${limitsRes.data.maxStaff} staff reached.`);
            return;
          }
        } catch (e) {
          console.error('Error checking geolocation limits:', e);
          // Continue with the request if we can't verify the limit
        }
      }

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

      // Check if we're assigning a role with geolocation permission
      const selectedRoles = roles.filter(r => values.roleIds.includes(r.id));
      const hasGeolocationAccess = selectedRoles.some(role =>
        role.permissions?.some(p => p.name === 'geolocation_access')
      );

      if (hasGeolocationAccess) {
        try {
          // Check geolocation limits
          const limitsRes = await api.get('/admin/roles/geolocation-limits');

          // Check if we can assign more staff with geolocation
          if (limitsRes.data.maxStaff > 0 && // Geolocation is enabled
            limitsRes.data.currentStaff >= limitsRes.data.maxStaff) {
            message.error(`Cannot assign geolocation access. Maximum limit of ${limitsRes.data.maxStaff} staff reached.`);
            return;
          }
        } catch (e) {
          console.error('Error checking geolocation limits:', e);
          // Continue with the request if we can't verify the limit
        }
      }

      await api.post('/admin/roles/assign-role', {
        userId: assigningUser.id,
        roleIds: values.roleIds
      });
      message.success('Roles assigned successfully');
      setAssignOpen(false);
      loadStaff();
      loadGeoLimits();
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const roleColumns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Display Name', dataIndex: 'displayName' },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      render: (permissions) => (
        <Space wrap>
          {permissions?.map(p => (
            <Tag key={p.id} color="blue">{p.displayName}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          <Popconfirm
            title="Delete this role?"
            description="This action cannot be undone."
            onConfirm={() => onDelete(record.id)}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const staffColumns = [
    { title: 'Name', dataIndex: 'profile', render: (profile) => profile?.name || 'N/A' },
    { title: 'Phone', dataIndex: 'phone' },
    {
      title: 'Roles',
      dataIndex: 'roles',
      render: (roles) => (
        <Space wrap>
          {roles?.map(r => (
            <Tag key={r.id} color="green">{r.displayName}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Has Geolocation',
      dataIndex: 'roles',
      render: (roles) => {
        const geolocationPermission = permissions.find(p => p.name === 'geolocation_access');
        const hasGeo = roles?.some(r => r.permissions?.some(p => p.id === geolocationPermission?.id));
        return hasGeo ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          onClick={() => onAssignRole(record)}
        >
          Assign Roles
        </Button>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 48px)', overflow: 'auto' }}>
          <h1>Roles & Permissions</h1>

          {/* Geolocation Limits */}
          {geoLimits?.geolocationEnabled && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Geolocation Staff Limit"
                    value={geoLimits.maxStaff}
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Current Geolocation Staff"
                    value={geoLimits.currentStaff}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: geoLimits.canAssignMore ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Remaining Slots"
                    value={Math.max(0, geoLimits.maxStaff - geoLimits.currentStaff)}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: (geoLimits.maxStaff - geoLimits.currentStaff) > 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Roles Management */}
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

          {/* Staff Role Assignment */}
          <Card title="Staff Role Assignment">
            <div style={{ marginBottom: 16 }}>
              <h3>Assign Roles to Staff</h3>
              {geoLimits?.geolocationEnabled && !geoLimits.canAssignMore && (
                <div style={{ color: '#cf1322', marginBottom: 8 }}>
                  Geolocation staff limit reached! Cannot assign more staff with geolocation access.
                </div>
              )}
            </div>
            <Table
              rowKey="id"
              loading={loading}
              columns={staffColumns}
              dataSource={staff}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          {/* Create/Edit Role Modal */}
          <Modal
            title={editing ? 'Edit Role' : 'Create Role'}
            open={open}
            onCancel={() => setOpen(false)}
            onOk={onSubmit}
            okText={editing ? 'Update' : 'Create'}
            width={600}
          >
            <Form layout="vertical" form={form}>
              <Form.Item label="Role Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="sales_manager" />
              </Form.Item>
              <Form.Item label="Display Name" name="displayName" rules={[{ required: true }]}>
                <Input placeholder="Sales Manager" />
              </Form.Item>
              <Form.Item label="Description" name="description">
                <TextArea rows={3} placeholder="Role description" />
              </Form.Item>
              <Form.Item label="Permissions" name="permissionIds">
                <Select mode="multiple" placeholder="Select permissions">
                  {permissions.map(p => (
                    <Option key={p.id} value={p.id}>
                      {p.displayName}
                      {p.name === 'geolocation_access' && geoLimits?.geolocationEnabled && (
                        <Tag color="orange" style={{ marginLeft: 8 }}>Limited</Tag>
                      )}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>

          {/* Assign Roles Modal */}
          <Modal
            title={`Assign Roles to ${assigningUser?.name}`}
            open={assignOpen}
            onCancel={() => setAssignOpen(false)}
            onOk={onAssignSubmit}
            okText="Assign"
          >
            <Form layout="vertical" form={assignForm}>
              <Form.Item label="Roles" name="roleIds" rules={[{ required: true }]}>
                <Select mode="multiple" placeholder="Select roles">
                  {roles.map(r => (
                    <Option key={r.id} value={r.id}>
                      {r.displayName}
                      {r.permissions?.some(p => p.name === 'geolocation_access') && (
                        <Tag color="orange" style={{ marginLeft: 8 }}>Geo</Tag>
                      )}
                    </Option>
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
