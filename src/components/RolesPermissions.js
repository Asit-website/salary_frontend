import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, Select, Space, message, Tag, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined, SearchOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { Option } = Select;

const getInitials = (name) => {
  if (!name) return '??';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
};

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
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    loadRoles(); loadPermissions(); loadStaff(); loadGeoLimits();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/roles/roles');
      setRoles(res.data?.roles || []);
    } catch (e) { message.error('Failed to load roles'); }
    finally { setLoading(false); }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.get('/admin/roles/permissions');
      setPermissions(res.data?.permissions || []);
    } catch (e) { message.error('Failed to load permissions'); }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/admin/roles/staff-with-roles');
      setStaff(res.data?.staff || []);
    } catch (e) { message.error('Failed to load staff'); }
  };

  const loadGeoLimits = async () => {
    try {
      const res = await api.get('/admin/roles/geolocation-limits');
      setGeoLimits({ ...res.data, geolocationEnabled: !!res.data.geolocationEnabled });
    } catch (e) {
      setGeoLimits({ geolocationEnabled: false, maxStaff: 0, currentStaff: 0, canAssignMore: false });
    }
  };

  const onCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const onEdit = (role) => {
    setEditing(role);
    form.setFieldsValue({ name: role.name, displayName: role.displayName, description: role.description, permissionIds: role.permissions?.map(p => p.id) || [] });
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) { await api.put(`/admin/roles/roles/${editing.id}`, values); message.success('Role updated'); }
      else { await api.post('/admin/roles/roles', values); message.success('Role created'); }
      setOpen(false); loadRoles();
    } catch (e) { if (e?.response?.data?.message) message.error(e.response.data.message); }
  };

  const onDelete = async (id) => {
    try { await api.delete(`/admin/roles/roles/${id}`); message.success('Role deleted'); loadRoles(); }
    catch (e) { message.error('Failed to delete role'); }
  };

  const onAssignRole = (user) => {
    setAssigningUser(user);
    assignForm.setFieldsValue({ roleIds: user.roles?.map(r => r.id) || [] });
    setAssignOpen(true);
  };

  const onBulkAssign = () => { setAssigningUser(null); assignForm.resetFields(); setAssignOpen(true); };

  const onAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      if (assigningUser) {
        await api.post('/admin/roles/assign-role', { userId: assigningUser.id, roleIds: values.roleIds });
      } else {
        await api.post('/admin/roles/bulk-assign-role', { userIds: selectedRowKeys, roleIds: values.roleIds });
        setSelectedRowKeys([]);
      }
      message.success('Roles assigned'); setAssignOpen(false); loadStaff(); loadGeoLimits();
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
      else message.error('Failed to assign Roles');
    }
  };

  // Stat card exactly like StaffManagement
  const StatCard = ({ label, value, suffix, sub, icon, bg, iconColor, shadow, valueColor }) => (
    <Card
      style={{ background: '#ffffff', border: '1px solid #f0f2f5', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', borderRadius: '16px' }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          <div style={{ color: valueColor || '#1f1f1f', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>
            {value}{suffix && <span style={{ fontSize: 16, color: '#8c8c8c', fontWeight: 500 }}> {suffix}</span>}
          </div>
          {sub && <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>{sub}</div>}
        </div>
        <div style={{ width: '46px', height: '46px', background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
          {React.cloneElement(icon, { style: { color: iconColor, fontSize: '20px' } })}
        </div>
      </div>
    </Card>
  );

  const roleColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            backgroundColor: '#e6f7ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1677ff', fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 6px rgba(22,119,255,0.08)',
          }}>
            {getInitials(name)}
          </div>
          <span style={{ fontWeight: 600, color: '#1677ff', fontSize: 14 }}>{name}</span>
        </div>
      ),
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (v) => <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{v || '—'}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v) => <span style={{ fontSize: 13, color: '#64748b' }}>{v || '—'}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, height: 28, paddingInline: 12, color: '#1677ff', border: '1px solid #bfdbfe', background: '#eff6ff' }}
          >
            Edit
          </Button>
          <Popconfirm title="Delete this role?" onConfirm={() => onDelete(record.id)}>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, height: 28, paddingInline: 12, color: '#dc2626', border: '1px solid #fca5a5', background: '#fff1f0', marginRight: 12 }}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const staffColumns = [
    {
      title: 'Staff',
      key: 'staff',
      render: (_, row) => {
        const name = row?.profile?.name || row?.phone || `User #${row?.id}`;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '12px',
              backgroundColor: '#e6f7ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1677ff', fontSize: 13, fontWeight: 700,
              boxShadow: '0 2px 6px rgba(22,119,255,0.08)',
            }}>
              {getInitials(name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1677ff' }}>{name}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{row?.phone || ''}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Assigned Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles) => (
        <Space wrap size={4}>
          {(roles || []).length === 0
            ? <span style={{ color: '#cbd5e1' }}>—</span>
            : roles.map(r => (
              <Tag key={r.id} color="blue" style={{ borderRadius: 20, fontSize: 11 }}>{r.displayName}</Tag>
            ))
          }
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => onAssignRole(record)}
          style={{ borderRadius: 20, fontWeight: 600, fontSize: 12, height: 28, paddingInline: 14, color: '#1677ff', border: '1px solid #bfdbfe', background: '#eff6ff' }}
        >
          Assign Roles
        </Button>
      ),
    },
  ];

  const filteredStaff = staff.filter(s =>
    (s.profile?.name || '').toLowerCase().includes(staffSearch.toLowerCase()) ||
    (s.phone || '').toLowerCase().includes(staffSearch.toLowerCase())
  );

  const isOverLimit = (geoLimits?.currentStaff || 0) >= (geoLimits?.maxStaff || 0);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Roles & Permissions" />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>

          {/* Stat Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Total Roles" value={roles.length}
                icon={<SafetyCertificateOutlined />}
                bg="#e6f7ff" iconColor="#1677ff"
                shadow="0 4px 10px rgba(22,119,255,0.1)"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Geostaff Assigned"
                value={geoLimits?.currentStaff || 0}
                suffix={`/ ${geoLimits?.maxStaff || 0}`}
                sub={geoLimits?.geolocationEnabled ? 'Limit based on active plan' : 'Geofencing not enabled'}
                icon={<UserOutlined />}
                bg="#f6ffed" iconColor="#52c41a"
                shadow="0 4px 10px rgba(82,196,26,0.1)"
                valueColor={isOverLimit ? '#f5222d' : '#3f8600'}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Total Staff" value={staff.length}
                icon={<TeamOutlined />}
                bg="#fff7e6" iconColor="#fa8c16"
                shadow="0 4px 10px rgba(250,140,22,0.1)"
              />
            </Col>
          </Row>

          {/* Roles Table */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: 0 }}
            style={{ marginBottom: 20 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e6f7ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: 15 }}>
                  <SafetyCertificateOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Manage Roles</span>
              </div>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onCreate}
                style={{ borderRadius: 20, fontWeight: 600 }}
              >
                Create Role
              </Button>
            }
          >
            <Table
              className="sales-table"
              rowKey="id"
              loading={loading}
              columns={roleColumns}
              dataSource={roles}
              pagination={{ pageSize: 10 }}
              bordered={false}
              scroll={{ x: 700 }}
              locale={{ emptyText: 'No roles yet. Create your first role.' }}
            />
          </Card>

          {/* Staff Role Assignment Table */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: 0 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: 15 }}>
                  <TeamOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Staff Role Assignment</span>
              </div>
            }
            extra={
              selectedRowKeys.length > 0 && (
                <Button
                  type="primary"
                  icon={<TeamOutlined />}
                  onClick={onBulkAssign}
                  style={{ borderRadius: 20, fontWeight: 600 }}
                >
                  Bulk Assign ({selectedRowKeys.length})
                </Button>
              )
            }
          >
            {/* Search bar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f5' }}>
              <Input
                allowClear
                placeholder="Search staff by name or phone..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                style={{ maxWidth: 320, borderRadius: 20 }}
              />
            </div>
            <Table
              className="sales-table"
              rowKey="id"
              loading={loading}
              rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
              columns={staffColumns}
              dataSource={filteredStaff}
              pagination={{ pageSize: 10 }}
              bordered={false}
              locale={{ emptyText: 'No staff found for assignment.' }}
            />
          </Card>
        </Content>
      </Layout>

      {/* Create / Edit Role Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e6f7ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: 14 }}>
              <SafetyCertificateOutlined />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{editing ? 'Edit Role' : 'Create Role'}</span>
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? 'Save Changes' : 'Create'}
        okButtonProps={{ style: { borderRadius: 20, fontWeight: 600, paddingInline: 20 } }}
        cancelButtonProps={{ style: { borderRadius: 20, paddingInline: 20 } }}
        width={680}
      >
        <Form layout="vertical" form={form} style={{ marginTop: 8 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Role Name</span>} name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. finance_manager" disabled={!!editing} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Display Name</span>} name="displayName" rules={[{ required: true }]}>
                <Input placeholder="e.g. Finance Manager" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Description</span>} name="description">
            <Input placeholder="Has access to payroll and expenses" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Permissions</span>} name="permissionIds">
            <Select mode="multiple" placeholder="Select permissions" style={{ width: '100%', borderRadius: 8 }}>
              {permissions.map(p => (
                <Option key={p.id} value={p.id}>{p.displayName}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Roles Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: 14 }}>
              <TeamOutlined />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
              {assigningUser
                ? `Assign Roles — ${assigningUser?.profile?.name || assigningUser?.phone}`
                : `Bulk Assign Roles — ${selectedRowKeys.length} Staff`}
            </span>
          </div>
        }
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={onAssignSubmit}
        okText="Assign"
        okButtonProps={{ style: { borderRadius: 20, fontWeight: 600, paddingInline: 20 } }}
        cancelButtonProps={{ style: { borderRadius: 20, paddingInline: 20 } }}
      >
        <Form layout="vertical" form={assignForm} style={{ marginTop: 8 }}>
          <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Selected Roles</span>} name="roleIds" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select roles" style={{ borderRadius: 8 }}>
              {roles.map(r => (
                <Option key={r.id} value={r.id}>{r.displayName}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default RolesPermissions;
