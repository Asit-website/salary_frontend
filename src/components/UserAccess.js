import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, message, Row, Col, Typography, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined, TeamOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';
import './UserAccess.css';

const { Content } = Layout;
const { Title } = Typography;

export default function UserAccess() {
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

  const getPermissionTagColor = (permissionKey) => {
    const colors = ['blue', 'geekblue', 'purple', 'cyan', 'green', 'gold', 'orange', 'magenta'];
    const index = Math.abs(String(permissionKey || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  };

  const loadPermissionOptions = async () => {
    try {
      const res = await api.get('/admin/user-access/permission-options');
      setPermissionOptions(res?.data?.options || []);
    } catch (_) {
      message.error('Failed to load permissions');
    }
  };

  const loadBadges = async () => {
    try {
      setLoadingBadges(true);
      const res = await api.get('/admin/user-access/badges');
      setBadges(res?.data?.badges || []);
    } catch (_) {
      message.error('Failed to load badges');
    } finally {
      setLoadingBadges(false);
    }
  };

  const loadStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await api.get('/admin/user-access/staff');
      setStaff(res?.data?.staff || []);
    } catch (_) {
      message.error('Failed to load staff');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadPermissionOptions();
    loadBadges();
    loadStaff();
  }, []);

  const openCreateBadge = () => {
    setEditingBadge(null);
    badgeForm.resetFields();
    setBadgeModalOpen(true);
  };

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
      loadBadges();
      loadStaff();
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
    } finally {
      setBadgeSaving(false);
    }
  };

  const deleteBadge = async (badgeId) => {
    try {
      await api.delete(`/admin/user-access/badges/${badgeId}`);
      message.success('Badge deleted');
      loadBadges();
      loadStaff();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to delete badge');
    }
  };

  const openAssignBadges = (staffRow) => {
    setSelectedStaff(staffRow);
    assignForm.setFieldsValue({
      badgeIds: (staffRow?.badges || []).map((x) => x.id),
    });
    setAssignModalOpen(true);
  };

  const submitAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      setAssignSaving(true);
      await api.post('/admin/user-access/assign-badges', {
        userId: selectedStaff?.id,
        badgeIds: values?.badgeIds || [],
      });
      message.success('Badges assigned');
      setAssignModalOpen(false);
      loadStaff();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to assign badges');
    } finally {
      setAssignSaving(false);
    }
  };

  const badgeColumns = [
    {
      title: 'Badge Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="ua-badge-pill">{name}</span>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v || '-' },
    {
      title: 'Managed Staff',
      key: 'managedStaff',
      render: (_, row) => {
        const hasAttendance = (row.permissions || []).some(p => p.permissionKey === 'attendance_tab');
        if (!hasAttendance) return <Tag>N/A</Tag>;
        const count = (row.managedStaffAssignments || []).length;
        if (count === 0) return <Tag color="blue">All Staff</Tag>;
        return <Tag color="purple">{count} Assigned</Tag>;
      }
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, row) => (
        <Space wrap>
          {(row?.permissions || []).map((p) => (
            <Tag key={p.id || p.permissionKey} color={getPermissionTagColor(p.permissionKey)}>
              {permissionLabelMap.get(p.permissionKey) || p.permissionLabel || p.permissionKey}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditBadge(row)}>Edit</Button>
          <Popconfirm title="Delete this badge?" onConfirm={() => deleteBadge(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const staffColumns = [
    {
      title: 'Staff',
      key: 'staff',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row?.profile?.name || row?.phone || `User #${row?.id}`}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>ID: {row?.id}</div>
        </div>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Assigned Badges',
      key: 'badges',
      render: (_, row) => (
        <Space wrap>
          {(row?.badges || []).length === 0 ? <span>-</span> : (row.badges || []).map((b) => <Tag key={b.id}>{b.name}</Tag>)}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Button size="small" type="primary" ghost onClick={() => openAssignBadges(row)}>Assign Badges</Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: 'linear-gradient(180deg, #f3f7ff 0%, #f7f9fc 100%)' }}>
        <Content style={{ padding: 24 }}>
          <Card className="ua-hero-card" bordered={false}>
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
              <Col>
                <Title level={2} style={{ margin: 0, color: '#0f172a' }}>User Access</Title>
                <div style={{ color: '#475569', marginTop: 6 }}>
                  Create badges, map sidebar permissions, and assign access to staff.
                </div>
              </Col>
              <Col>
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreateBadge}>
                  Create Badge
                </Button>
              </Col>
            </Row>
            <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
              <Col xs={24} md={8}>
                <Card size="small" className="ua-stat-card">
                  <Statistic title="Total Badges" value={stats.totalBadges} prefix={<SafetyCertificateOutlined />} />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" className="ua-stat-card">
                  <Statistic title="Permissions Used" value={stats.totalPermissionsUsed} prefix={<AppstoreOutlined />} />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" className="ua-stat-card">
                  <Statistic title="Staff With Access" value={stats.staffWithAccess} prefix={<TeamOutlined />} />
                </Card>
              </Col>
            </Row>
          </Card>

          <Card title="Badges & Permissions" style={{ marginBottom: 16 }} className="ua-section-card">
            <div className="ua-table-toolbar">
              <Input
                allowClear
                placeholder="Search badges, description, permissions"
                prefix={<SearchOutlined />}
                value={badgeSearch}
                onChange={(e) => setBadgeSearch(e.target.value)}
                style={{ maxWidth: 420 }}
              />
            </div>
            <Table
              rowKey="id"
              loading={loadingBadges}
              columns={badgeColumns}
              dataSource={filteredBadges}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 900 }}
              className="ua-table"
              locale={{ emptyText: 'No badges yet. Create your first badge.' }}
            />
          </Card>

          <Card title="Staff Access Assignment" className="ua-section-card">
            <div className="ua-table-toolbar">
              <Input
                allowClear
                placeholder="Search staff by name or phone"
                prefix={<SearchOutlined />}
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                style={{ maxWidth: 320 }}
              />
            </div>
            <Table
              rowKey="id"
              loading={loadingStaff}
              columns={staffColumns}
              dataSource={filteredStaff}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 700 }}
              className="ua-table"
              locale={{ emptyText: 'No staff found for assignment.' }}
            />
          </Card>
        </Content>
      </Layout>

      <Modal
        title={editingBadge ? 'Edit Badge' : 'Create Badge'}
        open={badgeModalOpen}
        onCancel={() => setBadgeModalOpen(false)}
        onOk={submitBadge}
        okButtonProps={{ loading: badgeSaving }}
      >
        <Form layout="vertical" form={badgeForm}>
          <Form.Item label="Badge Name" name="name" rules={[{ required: true, message: 'Badge name required' }]}>
            <Input placeholder="e.g. Sales Executive" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>
          <Form.Item
            label="Permissions"
            name="permissionKeys"
            rules={[{ required: true, message: 'Select at least one permission' }]}
          >
            <Select mode="multiple" placeholder="Select sidebar tabs">
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
                  label="Managed Staff (For Attendance Scoping)"
                  name="managedStaffIds"
                  help="If none selected, badge grants access to ALL staff attendance."
                >
                  <Select
                    mode="multiple"
                    placeholder="Select employees this badge manages"
                    optionFilterProp="children"
                    showSearch
                  >
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

      <Modal
        title={`Assign Badges - ${selectedStaff?.profile?.name || selectedStaff?.phone || ''}`}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={submitAssign}
        okButtonProps={{ loading: assignSaving }}
      >
        <Form layout="vertical" form={assignForm}>
          <Form.Item label="Badges" name="badgeIds">
            <Select mode="multiple" placeholder="Select badges">
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
