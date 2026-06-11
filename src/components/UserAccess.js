import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, message, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined, TeamOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Text } = Typography;

const getInitials = (name) => {
  if (!name) return '??';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
};

const PERM_COLORS = ['blue', 'geekblue', 'purple', 'cyan', 'green', 'gold', 'orange', 'magenta'];
const getPermColor = (key) => PERM_COLORS[
  Math.abs(String(key || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PERM_COLORS.length
];

export default function UserAccess() {
  const [collapsed, setCollapsed] = useState(false);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [badges, setBadges] = useState([]);
  const [staff, setStaff] = useState([]);
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [badgeSearch, setBadgeSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [badgeSaving, setBadgeSaving] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [badgeForm] = Form.useForm();

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [assignForm] = Form.useForm();

  const permissionLabelMap = useMemo(() => {
    const map = new Map();
    permissionOptions.forEach((p) => map.set(p.key, p.label));
    return map;
  }, [permissionOptions]);

  const stats = useMemo(() => {
    const totalBadges = badges.length;
    const permissions = new Set();
    badges.forEach((b) => (b.permissions || []).forEach((p) => permissions.add(p.permissionKey)));
    const totalPermissionsUsed = permissions.size;
    const staffWithAccess = staff.filter((s) => (s.badges || []).length > 0).length;
    return { totalBadges, totalPermissionsUsed, staffWithAccess };
  }, [badges, staff]);

  const filteredBadges = useMemo(() => {
    const q = badgeSearch.trim().toLowerCase();
    if (!q) return badges;
    return badges.filter((b) => {
      const text = `${b.name || ''} ${b.description || ''} ${(b.permissions || []).map((p) => p.permissionLabel || p.permissionKey).join(' ')}`.toLowerCase();
      return text.includes(q);
    });
  }, [badges, badgeSearch]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => {
      const name = s?.profile?.name || '';
      const phone = s?.phone || '';
      return `${name} ${phone}`.toLowerCase().includes(q);
    });
  }, [staff, staffSearch]);

  const loadPermissionOptions = async () => {
    try {
      const res = await api.get('/admin/user-access/permission-options');
      setPermissionOptions(res?.data?.options || []);
    } catch (_) { message.error('Failed to load permissions'); }
  };

  const loadBadges = async () => {
    try {
      setLoadingBadges(true);
      const res = await api.get('/admin/user-access/badges');
      setBadges(res?.data?.badges || []);
    } catch (_) { message.error('Failed to load badges'); }
    finally { setLoadingBadges(false); }
  };

  const loadStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await api.get('/admin/user-access/staff');
      setStaff(res?.data?.staff || []);
    } catch (_) { message.error('Failed to load staff'); }
    finally { setLoadingStaff(false); }
  };

  useEffect(() => { loadPermissionOptions(); loadBadges(); loadStaff(); }, []);

  const openCreateBadge = () => { setEditingBadge(null); badgeForm.resetFields(); setBadgeModalOpen(true); };
  const openEditBadge = (badge) => {
    setEditingBadge(badge);
    badgeForm.setFieldsValue({
      name: badge?.name || '',
      description: badge?.description || '',
      permissionKeys: (badge?.permissions || []).map((x) => x.permissionKey),
      managedStaffIds: (badge?.managedStaffAssignments || []).map(a => a.staffUserId),
    });
    setBadgeModalOpen(true);
  };

  const submitBadge = async () => {
    try {
      const values = await badgeForm.validateFields();
      setBadgeSaving(true);
      if (editingBadge?.id) {
        await api.put(`/admin/user-access/badges/${editingBadge.id}`, values);
        message.success('Badge updated');
      } else {
        await api.post('/admin/user-access/badges', values);
        message.success('Badge created');
      }
      setBadgeModalOpen(false);
      loadBadges(); loadStaff();
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
    } finally { setBadgeSaving(false); }
  };

  const deleteBadge = async (badgeId) => {
    try {
      await api.delete(`/admin/user-access/badges/${badgeId}`);
      message.success('Badge deleted');
      loadBadges(); loadStaff();
    } catch (e) { message.error(e?.response?.data?.message || 'Failed to delete badge'); }
  };

  const openAssignBadges = (staffRow) => {
    setSelectedStaff(staffRow);
    assignForm.setFieldsValue({ badgeIds: (staffRow?.badges || []).map((x) => x.id) });
    setAssignModalOpen(true);
  };

  const submitAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      setAssignSaving(true);
      await api.post('/admin/user-access/assign-badges', { userId: selectedStaff?.id, badgeIds: values?.badgeIds || [] });
      message.success('Badges assigned');
      setAssignModalOpen(false);
      loadStaff();
    } catch (e) { message.error(e?.response?.data?.message || 'Failed to assign badges'); }
    finally { setAssignSaving(false); }
  };

  const handleUnassignBadges = async (userId) => {
    try {
      await api.post('/admin/user-access/assign-badges', { userId, badgeIds: [] });
      message.success('Badges unassigned');
      loadStaff();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to unassign badges');
    }
  };

  // Stat card component matching StaffManagement style
  const StatCard = ({ label, value, icon, bg, iconColor, shadow }) => (
    <Card
      style={{
        background: '#ffffff',
        border: '1px solid #f0f2f5',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        borderRadius: '16px',
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          <div style={{ color: '#1f1f1f', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: '46px', height: '46px', background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
          {React.cloneElement(icon, { style: { color: iconColor, fontSize: '20px' } })}
        </div>
      </div>
    </Card>
  );

  const badgeColumns = [
    {
      title: 'Badge Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            backgroundColor: '#e6f7ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 2, color: '#1677ff', fontSize: 14, fontWeight: 700,
            boxShadow: '0 2px 6px rgba(22,119,255,0.08)',
          }}>
            {getInitials(name)}
          </div>
          <span style={{ fontWeight: 600, color: '#1677ff', fontSize: 14 }}>{name}</span>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v) => <span style={{ color: '#64748b', fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Managed Staff',
      key: 'managedStaff',
      render: (_, row) => {
        const hasAttendance = (row.permissions || []).some(p => p.permissionKey === 'attendance_tab');
        if (!hasAttendance) return <span className="sales-status-tag sales-status-inactive">N/A</span>;
        const count = (row.managedStaffAssignments || []).length;
        if (count === 0) return <span className="sales-status-tag sales-status-active">All Staff</span>;
        return <span className="sales-status-tag" style={{ background: '#f5f0ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>{count} Assigned</span>;
      },
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, row) => (
        <Space wrap size={4}>
          {(row?.permissions || []).map((p) => (
            <Tag key={p.id || p.permissionKey} color={getPermColor(p.permissionKey)} style={{ borderRadius: 20, fontSize: 11 }}>
              {permissionLabelMap.get(p.permissionKey) || p.permissionLabel || p.permissionKey}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, row) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditBadge(row)}
            style={{
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              height: 28, paddingInline: 12,
              color: '#1677ff', border: '1px solid #bfdbfe',
              background: '#eff6ff',
            }}
          >
            Edit
          </Button>
          <Popconfirm title="Delete this badge?" onConfirm={() => deleteBadge(row.id)}>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              style={{
                borderRadius: 20, fontSize: 12, fontWeight: 600,
                height: 28, paddingInline: 12,
                color: '#dc2626', border: '1px solid #fca5a5',
                background: '#fff1f0',
              }}
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
              color: '#1677ff', fontSize: 14, fontWeight: 700,
              boxShadow: '0 2px 6px rgba(22,119,255,0.08)',
            }}>
              {getInitials(name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1677ff' }}>{name}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>ID: {row?.id}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (v) => <span style={{ fontSize: 14, color: '#434343', fontWeight: 500 }}>{v || '—'}</span>,
    },
    {
      title: 'Assigned Badges',
      key: 'badges',
      render: (_, row) => (
        <Space wrap size={4}>
          {(row?.badges || []).length === 0
            ? <span style={{ color: '#cbd5e1' }}>—</span>
            : (row.badges || []).map((b) => (
              <Tag key={b.id} style={{ borderRadius: 20, fontSize: 11 }}>{b.name}</Tag>
            ))
          }
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space size={6}>
          <Button
            size="small"
            onClick={() => openAssignBadges(row)}
            style={{
              borderRadius: 20, fontWeight: 600, fontSize: 12,
              height: 28, paddingInline: 14,
              color: '#1677ff', border: '1px solid #bfdbfe',
              background: '#eff6ff',
            }}
          >
            Assign Badges
          </Button>
          {(row.badges || []).length > 0 && (
            <Popconfirm
              title="Unassign all badges from this staff?"
              onConfirm={() => handleUnassignBadges(row.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                size="small"
                style={{
                  borderRadius: 20, fontWeight: 600, fontSize: 12,
                  height: 28, paddingInline: 14,
                  color: '#dc2626', border: '1px solid #fca5a5',
                  background: '#fff1f0',
                }}
              >
                Unassign
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="User Access" />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>

          {/* Stat Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Total Badges"
                value={stats.totalBadges}
                icon={<SafetyCertificateOutlined />}
                bg="#e6f7ff" iconColor="#1677ff"
                shadow="0 4px 10px rgba(22,119,255,0.1)"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Permissions Used"
                value={stats.totalPermissionsUsed}
                icon={<AppstoreOutlined />}
                bg="#f6ffed" iconColor="#52c41a"
                shadow="0 4px 10px rgba(82,196,26,0.1)"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Staff With Access"
                value={stats.staffWithAccess}
                icon={<TeamOutlined />}
                bg="#fff7e6" iconColor="#fa8c16"
                shadow="0 4px 10px rgba(250,140,22,0.1)"
              />
            </Col>
          </Row>

          {/* Badges & Permissions Table */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: 0 }}
            style={{ marginBottom: 20 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#e6f7ff', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1677ff', fontSize: 15,
                }}>
                  <SafetyCertificateOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Badges & Permissions</span>
              </div>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateBadge}
                style={{ borderRadius: 20, fontWeight: 600 }}
              >
                Create Badge
              </Button>
            }
          >
            {/* Search */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f5' }}>
              <Input
                allowClear
                placeholder="Search badges, description, permissions..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={badgeSearch}
                onChange={(e) => setBadgeSearch(e.target.value)}
                style={{ maxWidth: 380, borderRadius: 20 }}
              />
            </div>
            <Table
              className="sales-table"
              rowKey="id"
              loading={loadingBadges}
              columns={badgeColumns}
              dataSource={filteredBadges}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 900 }}
              bordered={false}
              locale={{ emptyText: 'No badges yet. Create your first badge.' }}
            />
          </Card>

          {/* Staff Access Assignment Table */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: 0 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#f6ffed', border: '1px solid #b7eb8f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#52c41a', fontSize: 15,
                }}>
                  <TeamOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Staff Access Assignment</span>
              </div>
            }
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f5' }}>
              <Input
                allowClear
                placeholder="Search staff by name or phone..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                style={{ maxWidth: 320, borderRadius: 20 }}
              />
            </div>
            <Table
              className="sales-table"
              rowKey="id"
              loading={loadingStaff}
              columns={staffColumns}
              dataSource={filteredStaff}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 700 }}
              bordered={false}
              locale={{ emptyText: 'No staff found for assignment.' }}
            />
          </Card>
        </Content>
      </Layout>

      {/* Create / Edit Badge Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#e6f7ff', border: '1px solid #bfdbfe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1677ff', fontSize: 14,
            }}>
              <SafetyCertificateOutlined />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
              {editingBadge ? 'Edit Badge' : 'Create Badge'}
            </span>
          </div>
        }
        open={badgeModalOpen}
        onCancel={() => setBadgeModalOpen(false)}
        onOk={submitBadge}
        okButtonProps={{ loading: badgeSaving, style: { borderRadius: 20, fontWeight: 600, paddingInline: 20 } }}
        cancelButtonProps={{ style: { borderRadius: 20, paddingInline: 20 } }}
        okText={editingBadge ? 'Save Changes' : 'Create'}
      >
        <Form layout="vertical" form={badgeForm} style={{ marginTop: 8 }}>
          <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Badge Name</span>} name="name" rules={[{ required: true, message: 'Badge name required' }]}>
            <Input placeholder="e.g. Sales Executive" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Description</span>} name="description">
            <Input.TextArea rows={3} placeholder="Optional description" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Permissions</span>} name="permissionKeys" rules={[{ required: true, message: 'Select at least one permission' }]}>
            <Select mode="multiple" placeholder="Select sidebar tabs" style={{ borderRadius: 8 }}>
              {permissionOptions.map((p) => (
                <Select.Option key={p.key} value={p.key}>{p.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.permissionKeys !== curr.permissionKeys}>
            {({ getFieldValue }) => {
              const keys = getFieldValue('permissionKeys') || [];
              if (!keys.includes('attendance_tab')) return null;
              return (
                <Form.Item
                  label={<span style={{ fontWeight: 600, fontSize: 13 }}>Managed Staff (Attendance Scoping)</span>}
                  name="managedStaffIds"
                  help="If none selected, badge grants access to ALL staff attendance."
                >
                  <Select mode="multiple" placeholder="Select employees this badge manages" optionFilterProp="children" showSearch style={{ borderRadius: 8 }}>
                    {staff.map((s) => (
                      <Select.Option key={s.id} value={s.id}>
                        {s.profile?.name || s.phone || `User #${s.id}`}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Badges Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#f6ffed', border: '1px solid #b7eb8f',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#52c41a', fontSize: 14,
            }}>
              <TeamOutlined />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
              Assign Badges — {selectedStaff?.profile?.name || selectedStaff?.phone || ''}
            </span>
          </div>
        }
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={submitAssign}
        okButtonProps={{ loading: assignSaving, style: { borderRadius: 20, fontWeight: 600, paddingInline: 20 } }}
        cancelButtonProps={{ style: { borderRadius: 20, paddingInline: 20 } }}
        okText="Assign"
      >
        <Form layout="vertical" form={assignForm} style={{ marginTop: 8 }}>
          <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Badges</span>} name="badgeIds">
            <Select mode="multiple" placeholder="Select badges" style={{ borderRadius: 8 }}>
              {badges.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
