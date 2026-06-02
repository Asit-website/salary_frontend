import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, message, Select, Table, Popconfirm, Divider } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, TeamOutlined, SearchOutlined, EditOutlined, ShopOutlined, CrownOutlined, BuildOutlined, SolutionOutlined, UserOutlined, AppstoreOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';
import { useState, useEffect, useMemo } from 'react';

const { Content } = Layout;

const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getDeptTheme = (name) => {
  const n = String(name || '').toLowerCase().trim();
  if (n.includes('sales')) {
    return {
      icon: <ShopOutlined style={{ fontSize: '20px', color: '#2563eb' }} />,
      bgColor: '#eff6ff',
      textColor: '#1e3a8a',
      borderColor: '#bfdbfe'
    };
  }
  if (n.includes('hr')) {
    return {
      icon: <TeamOutlined style={{ fontSize: '20px', color: '#db2777' }} />,
      bgColor: '#fdf2f8',
      textColor: '#701a75',
      borderColor: '#fbcfe8'
    };
  }
  if (n.includes('manager')) {
    return {
      icon: <CrownOutlined style={{ fontSize: '20px', color: '#ca8a04' }} />,
      bgColor: '#fef9c3',
      textColor: '#713f12',
      borderColor: '#fef08a'
    };
  }
  if (n.includes('labour') || n.includes('majdoor')) {
    return {
      icon: <BuildOutlined style={{ fontSize: '20px', color: '#ea580c' }} />,
      bgColor: '#fff7ed',
      textColor: '#7c2d12',
      borderColor: '#ffedd5'
    };
  }
  if (n.includes('assistant')) {
    return {
      icon: <UserOutlined style={{ fontSize: '20px', color: '#059669' }} />,
      bgColor: '#ecfdf5',
      textColor: '#064e3b',
      borderColor: '#a7f3d0'
    };
  }
  return {
    icon: <AppstoreOutlined style={{ fontSize: '20px', color: '#4f46e5' }} />,
    bgColor: '#e0e7ff',
    textColor: '#312e81',
    borderColor: '#c7d2fe'
  };
};

function FnCard({ fn, onEdit, onDelete }) {
  const statusColor = fn.active ? '#10b981' : '#dc2626';
  return (
    <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', marginBottom: '24px' }}>
      <style>{`
        .dept-hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1), 0 4px 12px -2px rgba(0, 0, 0, 0.05) !important;
          border-color: #3b82f6 !important;
        }
      `}</style>
      
      {/* Header of the Business Function */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: fn.active ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TeamOutlined style={{ fontSize: '20px', color: fn.active ? '#10b981' : '#ef4444' }} />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' }}>
              {fn.name} Configurations
            </span>
            <span style={{ 
                padding: '3px 8px', 
                borderRadius: '12px', 
                fontSize: '10px', 
                fontWeight: '700', 
                color: statusColor, 
                backgroundColor: `${statusColor}12`, 
                border: `1px solid ${statusColor}30`,
                letterSpacing: '0.5px',
                marginLeft: '12px'
            }}>
              {fn.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>
        <Space size={8}>
          <Button 
            shape="round" 
            icon={<EditOutlined style={{ color: '#2563eb', fontSize: '13px' }} />} 
            onClick={() => onEdit?.openEdit?.(fn)}
            style={{ fontWeight: '600', borderColor: '#2563eb', color: '#2563eb' }}
          >
            Edit Settings
          </Button>
          <Popconfirm title={`Delete this ${fn.name}?`} onConfirm={() => onDelete?.(fn)} okButtonProps={{ danger: true }}>
            <Button 
              shape="round" 
              danger 
              icon={<DeleteOutlined style={{ fontSize: '13px' }} />}
              style={{ fontWeight: '600' }}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Grid of Department Tiles */}
      <Row gutter={[20, 20]}>
        {(fn.values || []).map(v => {
          const vStatusColor = v.active ? '#10b981' : '#dc2626';
          const theme = getDeptTheme(v.value);
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={v.id}>
              <div 
                style={{ 
                  borderRadius: '16px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                  background: '#fff',
                  padding: '20px',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box'
                }}
                className="dept-hover-card"
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '12px', 
                      background: theme.bgColor, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: `1px solid ${theme.borderColor}`
                    }}>
                      {theme.icon}
                    </div>
                    <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '20px', 
                        fontSize: '9px', 
                        fontWeight: '700', 
                        color: vStatusColor, 
                        backgroundColor: `${vStatusColor}12`, 
                        border: `1px solid ${vStatusColor}30`,
                        letterSpacing: '0.5px'
                    }}>
                      {v.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', textTransform: 'capitalize', marginBottom: '16px' }}>
                    {v.value}
                  </div>
                </div>
                
                {String(fn.name).toLowerCase() === 'department' && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: '#f8fafc', 
                    padding: '10px 12px', 
                    borderRadius: '12px', 
                    border: '1px solid #f1f5f9',
                    marginTop: 'auto'
                  }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Assigned Staff</span>
                    <Button
                      type="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.openAssignedList?.(v.value);
                      }}
                      style={{ 
                        fontSize: '12px', 
                        fontWeight: '700', 
                        color: '#2563eb', 
                        padding: 0,
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      View Staff <RightOutlined style={{ fontSize: '10px' }} />
                    </Button>
                  </div>
                )}
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

export default function BusinessFunctions() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignForm] = Form.useForm();
  const [staffOptions, setStaffOptions] = useState([]);

  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedDeptName, setAssignedDeptName] = useState('');
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/business-functions');
      setList(res.data?.data || []);
    } catch {
      message.error('Failed to load business functions');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      const rows = res.data?.data || res.data?.staff || [];
      setStaffOptions(rows.map(s => ({
        label: `${s.name || s.phone || `Staff ${s.id}`} (${s.phone || 'No phone'})`,
        value: s.id,
      })));
    } catch {
      setStaffOptions([]);
    }
  };

  useEffect(() => {
    load();
    loadStaff();
  }, []);

  const departmentFn = useMemo(() => {
    return (list || []).find(fn => String(fn.name || '').trim().toLowerCase() === 'department');
  }, [list]);

  const departmentValues = useMemo(() => {
    return (departmentFn?.values || [])
      .filter(v => v?.active !== false && String(v?.value || '').trim())
      .map(v => ({ label: String(v.value), value: String(v.value) }));
  }, [departmentFn]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ name: 'Department', active: true, values: [{ value: '', active: true, sortOrder: 0 }] });
    setOpen(true);
  };

  const openEdit = (fn) => {
    setEditing(fn);
    form.resetFields();
    form.setFieldsValue({
      name: fn.name,
      active: fn.active !== false,
      values: (fn.values || []).map((v, idx) => ({ value: v.value, active: v.active !== false, sortOrder: v.sortOrder ?? idx })),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        name: v.name,
        active: v.active !== false,
        values: (v.values || [])
          .filter(x => x && typeof x.value === 'string' && x.value.trim())
          .map((x, idx) => ({ value: x.value.trim(), active: x.active !== false, sortOrder: x.sortOrder ?? idx })),
      };
      if (editing) {
        await api.put(`/admin/business-functions/${editing.id}`, payload);
        message.success('Updated');
      } else {
        await api.post('/admin/business-functions', payload);
        message.success('Created');
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (fn) => {
    Modal.confirm({
      title: `Delete ${fn.name}?`,
      content: 'This will remove the function and all its values.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/business-functions/${fn.id}`);
          message.success('Deleted');
          await load();
        } catch (e) {
          message.error(e?.response?.data?.message || 'Failed to delete');
        }
      }
    });
  };

  const handleAssignDepartment = async () => {
    try {
      const values = await assignForm.validateFields();
      setAssigning(true);
      const res = await api.post('/admin/business-functions/assign-department', {
        department: values.department,
        staffUserIds: values.staffUserIds,
      });
      message.success(res.data?.message || 'Department assigned');
      assignForm.resetFields();
      await loadStaff();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to assign department');
    } finally {
      setAssigning(false);
    }
  };

  const openAssignedList = async (deptName, keepOpen = false) => {
    try {
      setAssignedDeptName(deptName);
      if (!keepOpen) setAssignedListOpen(true);
      setAssignedListLoading(true);
      const res = await api.get(`/admin/business-functions/department/${encodeURIComponent(deptName)}/staff`);
      setAssignedListRows(res?.data?.staff || []);
    } catch (_) {
      setAssignedListRows([]);
      message.error('Failed to load assigned staff');
    } finally {
      setAssignedListLoading(false);
    }
  };

  const unassignStaff = async (userId) => {
    try {
      if (!assignedDeptName) return;
      await api.delete(`/admin/business-functions/department/${encodeURIComponent(assignedDeptName)}/staff/${userId}`);
      message.success('Staff removed from department');
      await openAssignedList(assignedDeptName, true);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to remove staff');
    }
  };

  const filtered = (list || []).filter(fn => !q || String(fn.name).toLowerCase().includes(String(q).toLowerCase()));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Manage Departments" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            {/* Toolbar Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/settings')}
                style={{ fontWeight: 600, color: '#475569' }}
                shape="round"
              >
                Back to Settings
              </Button>
            </div>

            {/* Search Card */}
            <Card 
              className="sales-content-card" 
              bodyStyle={{ padding: '20px' }} 
              style={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <Input 
                  prefix={<SearchOutlined style={{ color: '#94a3b8', marginRight: '6px' }} />}
                  placeholder="Search departments or configurations..." 
                  allowClear 
                  style={{ width: 320, borderRadius: '20px', height: '40px', paddingLeft: '12px' }} 
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button 
                  type="primary" 
                  shape="round" 
                  icon={<PlusOutlined />} 
                  onClick={openCreate}
                  style={{ 
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    height: '40px',
                    padding: '0 24px',
                    fontWeight: '600'
                  }}
                >
                  New Department
                </Button>
              </div>
            </Card>

            {/* Assign Panel Card */}
            <Card
              className="sales-content-card"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TeamOutlined style={{ color: '#2563eb', fontSize: '16px' }} />
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>Assign Department To Staff</span>
                </div>
              }
              loading={loading}
              style={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
              bodyStyle={{ padding: '24px' }}
            >
              <Form form={assignForm} layout="vertical">
                <Row gutter={[20, 20]} align="bottom">
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="department"
                      label={<span style={{ fontWeight: '600', color: '#475569' }}>Department</span>}
                      rules={[{ required: true, message: 'Select department' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder="Select department"
                        options={departmentValues}
                        disabled={!departmentValues.length}
                        style={{ width: '100%' }}
                        dropdownStyle={{ borderRadius: '12px' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="staffUserIds"
                      label={<span style={{ fontWeight: '600', color: '#475569' }}>Select Staff (Multiple)</span>}
                      rules={[{ required: true, message: 'Select at least one staff' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select staff"
                        options={staffOptions}
                        showSearch
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                        dropdownStyle={{ borderRadius: '12px' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={4}>
                    <Button 
                      type="primary" 
                      shape="round"
                      block 
                      loading={assigning} 
                      onClick={handleAssignDepartment}
                      style={{ 
                        height: '38px', 
                        fontWeight: '600', 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      Assign Staff
                    </Button>
                  </Col>
                </Row>
              </Form>
              {!departmentValues.length && (
                <div style={{ marginTop: '12px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '12px' }}>
                  <Typography.Text type="warning" style={{ fontSize: '13px', fontWeight: '500' }}>
                    Create `Department` configurations first (Sales, HR, etc.) under New Department.
                  </Typography.Text>
                </div>
              )}
            </Card>

            {/* Department Configurations Cards */}
            <div>
              {filtered.map(fn => (
                <FnCard key={fn.id} fn={fn} onEdit={{ openEdit, openAssignedList }} onDelete={handleDelete} />
              ))}
            </div>
          </Space>
        </Content>
      </Layout>

      {/* Create/Edit Modal */}
      <Modal
        title={<span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>{editing ? 'Edit Department Configurations' : 'Create Department Configurations'}</span>}
        open={open}
        onCancel={() => { setOpen(false); setEditing(null); }}
        onOk={save}
        okText="Save Changes"
        width={680}
        cancelButtonProps={{ shape: 'round', style: { fontWeight: '600' } }}
        okButtonProps={{ 
          shape: 'round', 
          style: { 
            fontWeight: '600', 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
            border: 'none', 
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' 
          } 
        }}
      >
        <div style={{ paddingTop: '16px' }}>
          <Form layout="vertical" form={form}>
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Function Name</span>} rules={[{ required: true, message: 'Enter name' }]}>
                  <Input placeholder="e.g. Department" disabled style={{ borderRadius: '10px', height: '40px' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="active" label={<span style={{ fontWeight: '600', color: '#475569' }}>Status</span>} initialValue={true}>
                  <Select 
                    options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} 
                    style={{ borderRadius: '10px', height: '40px' }} 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" plain>
              <span style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Department Values</span>
            </Divider>
            <Form.Item style={{ marginBottom: 0 }}>
              <Form.List name="values">
                {(fields, { add, remove }) => (
                  <>
                    <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                      {fields.map(({ key, name, ...rest }, idx) => (
                        <Row 
                          key={key} 
                          gutter={12} 
                          align="middle" 
                          style={{ 
                            marginBottom: 12, 
                            background: '#f8fafc', 
                            padding: '14px 16px', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0',
                            position: 'relative'
                          }}
                        >
                          <Col flex="1">
                            <Form.Item {...rest} name={[name, 'value']} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                              <Input placeholder="e.g. Sales, HR, Finance" style={{ borderRadius: '8px', height: '36px' }} />
                            </Form.Item>
                            <Form.Item {...rest} name={[name, 'sortOrder']} initialValue={idx} hidden><Input /></Form.Item>
                          </Col>
                          <Col style={{ width: 120 }}>
                            <Form.Item {...rest} name={[name, 'active']} initialValue={true} style={{ marginBottom: 0 }}>
                              <Select 
                                size="middle" 
                                options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} 
                                style={{ borderRadius: '8px', height: '36px' }} 
                              />
                            </Form.Item>
                          </Col>
                          <Col style={{ width: 40, display: 'flex', justifyContent: 'flex-end', height: '36px', alignItems: 'center' }}>
                            <Popconfirm title="Remove this value?" onConfirm={() => remove(name)}>
                              <Button
                                type="text"
                                danger
                                shape="circle"
                                icon={<DeleteOutlined />}
                              />
                            </Popconfirm>
                          </Col>
                        </Row>
                      ))}
                    </div>
                    <Button 
                      type="dashed" 
                      block 
                      icon={<PlusOutlined />} 
                      onClick={() => add({ value: '', active: true })} 
                      style={{ height: '40px', borderRadius: '12px', fontWeight: '600' }}
                    >
                      Add Department Value
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Assigned Staff List Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamOutlined style={{ color: '#2563eb', fontSize: '18px' }} />
            <span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>{`Staff in Department: ${assignedDeptName}`}</span>
          </div>
        }
        open={assignedListOpen}
        onCancel={() => setAssignedListOpen(false)}
        footer={null}
        width={850}
        style={{ borderRadius: '20px' }}
      >
        <div style={{ paddingTop: '16px' }}>
          <Table
            rowKey="id"
            loading={assignedListLoading}
            dataSource={assignedListRows}
            pagination={{ pageSize: 6 }}
            bordered={false}
            className="premium-table"
            style={{ borderRadius: '12px', overflow: 'hidden' }}
            columns={[
              { 
                title: 'Name', 
                render: (_, r) => {
                  const name = r.name || '-';
                  const phone = r.user?.phone || '-';
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: '700',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
                        border: '1px solid #bfdbfe'
                      }}>
                        {getInitials(name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{phone}</div>
                      </div>
                    </div>
                  );
                }
              },
              { 
                title: 'Staff ID', 
                render: (_, r) => <span style={{ fontWeight: '600', color: '#334155' }}>{r.staffId || '—'}</span> 
              },
              { 
                title: 'Designation', 
                render: (_, r) => <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{r.designation || '—'}</span> 
              },
              {
                title: 'Action',
                key: 'action',
                width: 100,
                align: 'center',
                render: (_, r) => (
                  <Popconfirm title="Remove from this department?" onConfirm={() => unassignStaff(r.userId)}>
                    <Button 
                      shape="circle" 
                      danger 
                      type="text"
                      icon={<DeleteOutlined style={{ fontSize: '14px' }} />} 
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                  </Popconfirm>
                )
              },
            ]}
          />
        </div>
      </Modal>
    </Layout>
  );
}
