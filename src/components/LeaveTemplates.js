import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, Select, InputNumber, DatePicker, message, Switch, Radio, Divider } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MoreOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Table, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;

const CYCLE_OPTIONS = [
  { label: 'Yearly', value: 'yearly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
];

const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const TemplateCard = ({ tpl, onEdit, onAssign }) => {
  const statusColor = tpl.active ? '#10b981' : '#dc2626';
  const totalLeaves = (tpl.categories || []).reduce((s,c)=> s + Number(c.leaveCount || 0), 0);
  return (
    <Card 
      className="sales-content-card" 
      style={{ height: '100%', borderRadius: '12px' }}
      bodyStyle={{ padding: '20px' }}
      hoverable
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b', textTransform: 'capitalize' }}>{tpl.name}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>Cycle: {tpl.cycle || 'Yearly'}</div>
          </div>
          <Space size={6}>
            <span style={{ 
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontSize: '10px', 
                fontWeight: '700', 
                color: statusColor, 
                backgroundColor: `${statusColor}12`, 
                border: `1px solid ${statusColor}30`,
                letterSpacing: '0.5px'
            }}>
              {tpl.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <Button 
              size="small" 
              shape="circle" 
              icon={<MoreOutlined style={{ fontSize: '13px' }} />} 
              onClick={() => onEdit?.(tpl)} 
            />
          </Space>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Total Leaves</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>{totalLeaves} days</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Assigned Staff</span>
            <span 
              onClick={() => onAssign?.openAssignedList?.(tpl)}
              style={{ 
                color: '#0284c7', 
                fontWeight: '700', 
                backgroundColor: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '11px',
                cursor: 'pointer',
                border: '1px solid #bae6fd',
                boxShadow: '0 1px 2px rgba(3,105,161,0.05)',
                transition: 'all 0.2s'
              }}
            >
              {tpl.assignedCount || 0} staff
            </span>
          </div>
        </div>

        <Button 
          type="primary" 
          ghost 
          shape="round" 
          size="middle"
          style={{ width: '100%', fontWeight: '600' }}
          onClick={() => onAssign?.openAssign?.(tpl)}
        >
          Assign to Staff
        </Button>
      </div>
    </Card>
  );
};

export default function LeaveTemplates(){
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningTpl, setAssigningTpl] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(null);
  const [effectiveTo, setEffectiveTo] = useState(null);

  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedListTpl, setAssignedListTpl] = useState(null);
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);
  const [assignedSearch, setAssignedSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/leave/templates');
      setList(res.data?.templates || []);
    } catch (e) {
      message.error('Failed to load leave templates');
      setList([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filteredList = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(t => (t.name || '').toLowerCase().includes(q));
  }, [list, search]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      cycle: 'yearly',
      countSandwich: false,
      approvalLevel: 1,
      active: true,
      cycleStartDate: dayjs().startOf('year'),
      cycleStartDay: 1,
      categories: [],
    });
    setOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    form.resetFields();
    form.setFieldsValue({
      name: tpl.name,
      cycle: tpl.cycle || 'yearly',
      countSandwich: !!tpl.countSandwich,
      approvalLevel: tpl.approvalLevel || 1,
      active: tpl.active !== false,
      cycleStartDate: tpl.cycleStartDate ? dayjs(tpl.cycleStartDate) : (tpl.cycle === 'monthly' ? null : dayjs().startOf('year')),
      cycleStartDay: tpl.cycleStartDay || 1,
      categories: (tpl.categories || []).map(c => ({
        key: c.key,
        name: c.name,
        leaveCount: Number(c.leaveCount || 0),
        unusedRule: c.unusedRule || 'lapse',
        carryLimitDays: c.carryLimitDays == null ? null : Number(c.carryLimitDays),
        encashLimitDays: c.encashLimitDays == null ? null : Number(c.encashLimitDays),
        carryForward: c.carryForward === true || c.carryForward === 1 || c.carry_forward === true || c.carry_forward === 1,
      })),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        name: v.name,
        cycle: v.cycle,
        countSandwich: !!v.countSandwich,
        approvalLevel: Number(v.approvalLevel || 1),
        active: v.active !== false,
        categories: (v.categories || []).filter(Boolean).map(c => ({
          key: c.key,
          name: c.name,
          leaveCount: Number(c.leaveCount || 0),
          unusedRule: c.unusedRule || 'lapse',
          carryLimitDays: c.carryLimitDays == null ? null : Number(c.carryLimitDays),
          encashLimitDays: c.encashLimitDays == null ? null : Number(c.encashLimitDays),
          carryForward: !!c.carryForward,
        })),
        cycleStartDate: v.cycleStartDate ? v.cycleStartDate.format('YYYY-MM-DD') : null,
        cycleStartDay: v.cycleStartDay,
      };
      if (editing) {
        await api.put(`/admin/leave/templates/${editing.id}`, payload);
        await api.post(`/admin/leave/templates/${editing.id}/categories-bulk`, { categories: payload.categories });
        message.success('Template updated');
      } else {
        await api.post('/admin/leave/templates', payload);
        message.success('Template created');
      }
      setOpen(false); setEditing(null);
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save template');
    }
  };

  const openAssign = async (tpl) => {
    try {
      setAssigningTpl(tpl);
      setAssignOpen(true);
      setSelectedStaffIds([]);
      setEffectiveFrom(null);
      setEffectiveTo(null);
      const staffRes = await api.get('/admin/staff');
      setStaffOptions((staffRes.data?.staff || staffRes.data?.data || []).map(s => ({ label: s.name || `Staff ${s.id}`, value: s.id })));
    } catch (e) {
      message.error('Failed to load staff');
    }
  };

  const saveAssign = async () => {
    try {
      if (!assigningTpl) return;
      if (selectedStaffIds.length === 0) return message.warning('Select at least one staff');
      if (!effectiveFrom) return message.warning('Select effective from date');
      const fromStr = effectiveFrom.format('YYYY-MM-DD');
      const toStr = effectiveTo ? effectiveTo.format('YYYY-MM-DD') : null;
      await api.post('/admin/leave/assign', { userIds: selectedStaffIds, leaveTemplateId: assigningTpl.id, effectiveFrom: fromStr, effectiveTo: toStr });
      message.success('Assigned');
      setAssignOpen(false);
      setAssigningTpl(null);
      setSelectedStaffIds([]);
      setEffectiveFrom(null);
      setEffectiveTo(null);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to assign');
    }
  };

  const openAssignedList = async (tpl, keepOpen = false) => {
    try {
      setAssignedListTpl(tpl);
      if (!keepOpen) {
        setAssignedListOpen(true);
        setAssignedSearch('');
      }
      setAssignedListLoading(true);
      const res = await api.get(`/admin/leave/templates/${tpl.id}/assignments`);
      setAssignedListRows(res?.data?.assignments || []);
    } catch (_) {
      setAssignedListRows([]);
      message.error('Failed to load assigned staff');
    } finally {
      setAssignedListLoading(false);
    }
  };

  const unassignStaff = async (assignmentId) => {
    try {
      await api.delete(`/admin/leave/assign/${assignmentId}`);
      message.success('Staff unassigned');
      if (assignedListTpl?.id) await openAssignedList(assignedListTpl, true);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to unassign staff');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Leave Templates" 
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

            {/* Search and Create Card */}
            <Card className="sales-content-card" bodyStyle={{ padding: '16px' }} style={{ borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <Input 
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Search templates..." 
                  allowClear 
                  style={{ width: 280, borderRadius: '20px' }} 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button 
                  type="primary" 
                  shape="round" 
                  icon={<PlusOutlined />} 
                  onClick={openCreate}
                  style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                >
                  New Template
                </Button>
              </div>
            </Card>

            {/* Template Card Grid */}
            <Row gutter={[16, 16]}>
              {(filteredList || []).map((t) => (
                <Col key={t.id} xs={24} sm={12} lg={8}>
                  <TemplateCard tpl={t} onEdit={openEdit} onAssign={{ openAssign, openAssignedList }} />
                </Col>
              ))}
            </Row>
          </Space>
        </Content>

        {/* Create/Edit Modal */}
        <Modal 
          title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{editing ? 'Edit Leave Template' : 'Create Leave Template'}</span>} 
          open={open} 
          onCancel={() => { setOpen(false); setEditing(null); }} 
          onOk={save} 
          okText="Save" 
          width={720}
          cancelButtonProps={{ shape: 'round' }}
          okButtonProps={{ shape: 'round' }}
        >
          <div style={{ paddingTop: '12px' }}>
            <Form layout="vertical" form={form}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Template Name</span>} rules={[{ required: true, message: 'Template name is required' }]}> 
                    <Input placeholder="Leave Policy" style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="cycle" label={<span style={{ fontWeight: '600', color: '#475569' }}>Leave Policy Cycle</span>} rules={[{ required: true }]}> 
                    <Select options={CYCLE_OPTIONS} style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.cycle !== cur.cycle}>
                {({ getFieldValue }) => {
                  const cycle = getFieldValue('cycle');
                  if (cycle === 'monthly') {
                    return (
                      <Form.Item name="cycleStartDay" label={<span style={{ fontWeight: '600', color: '#475569' }}>Cycle Start Day</span>} rules={[{ required: true, message: 'Required' }]}>
                        <InputNumber min={1} max={31} style={{ width: '100%', borderRadius: '8px' }} placeholder="e.g. 1 or 26" />
                      </Form.Item>
                    );
                  } else if (cycle === 'yearly' || cycle === 'quarterly') {
                    return (
                      <Form.Item name="cycleStartDate" label={<span style={{ fontWeight: '600', color: '#475569' }}>Cycle Start Date</span>} rules={[{ required: true, message: 'Required' }]}>
                        <DatePicker format="DD MMM" style={{ width: '100%', borderRadius: '8px' }} />
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="countSandwich" label={<span style={{ fontWeight: '600', color: '#475569' }}>Count Sandwich Leaves</span>}>
                    <Select options={[{ value:true, label:'Yes' }, { value:false, label:'No' }]} style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="active" label={<span style={{ fontWeight: '600', color: '#475569' }}>Status</span>} initialValue={true}>
                    <Select options={[{ value:true, label:'Active' }, { value:false, label:'Inactive' }]} style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain><span style={{ fontWeight: '600', color: '#475569' }}>Leave Categories</span></Divider>
              <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
                <Form.List name="categories">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <Card key={key} size="small" style={{ marginBottom: 12, borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }} bodyStyle={{ padding: '16px' }}>
                          <Row gutter={12} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <Col span={8}>
                              <Form.Item {...rest} name={[name, 'name']} label={<span style={{ fontSize: '11px', color: '#64748b' }}>Name</span>} rules={[{ required: true, message: 'Name is required' }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="Casual Leave" style={{ borderRadius: '8px' }} />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item {...rest} name={[name, 'key']} label={<span style={{ fontSize: '11px', color: '#64748b' }}>Key</span>} style={{ marginBottom: 0 }}> 
                                <Input placeholder="CL" style={{ borderRadius: '8px' }} />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item {...rest} name={[name, 'leaveCount']} label={<span style={{ fontSize: '11px', color: '#64748b' }}>Leave Count</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}> 
                                <InputNumber min={0} step={0.5} style={{ width:'100%', borderRadius: '8px' }} />
                              </Form.Item>
                            </Col>
                            <Col span={2} style={{ display:'flex', justifyContent: 'flex-end', height: '32px', alignItems: 'center', marginTop: '16px' }}>
                              <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                            </Col>
                          </Row>
                          <Row gutter={12} style={{ marginTop: '12px' }}>
                            <Col span={12} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Carry Forward:</span>
                              <Form.Item {...rest} name={[name, 'carryForward']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                <Switch size="small" />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                      <Button 
                        type="dashed" 
                        block 
                        onClick={() => add({ name:'', key:'', leaveCount:0, unusedRule:'lapse' })}
                        icon={<PlusOutlined />}
                        style={{ borderRadius: '8px', marginTop: '8px' }}
                      >
                        Add Leave Category
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </Form>
          </div>
        </Modal>

        {/* Assign Modal */}
        <Modal 
          title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{assigningTpl ? `Assign Staff • ${assigningTpl.name}` : 'Assign Staff'}</span>} 
          open={assignOpen} 
          onCancel={() => setAssignOpen(false)} 
          onOk={saveAssign} 
          okText="Assign"
          cancelButtonProps={{ shape: 'round' }}
          okButtonProps={{ shape: 'round' }}
        >
          <div style={{ paddingTop: '12px' }}>
            <Space direction="vertical" style={{ width:'100%' }} size={12}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    if (selectedStaffIds.length === staffOptions.length) {
                      setSelectedStaffIds([]);
                    } else {
                      setSelectedStaffIds(staffOptions.map(o => o.value));
                    }
                  }}
                  style={{ fontWeight: '600' }}
                >
                  {selectedStaffIds.length === staffOptions.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                options={staffOptions}
                value={selectedStaffIds}
                onChange={setSelectedStaffIds}
                style={{ width: '100%', borderRadius: '8px' }}
                placeholder="Select staff to assign"
              />
              <Row gutter={12}>
                <Col span={12}><DatePicker value={effectiveFrom} onChange={setEffectiveFrom} style={{ width:'100%', borderRadius: '8px' }} placeholder="Effective from" /></Col>
                <Col span={12}><DatePicker value={effectiveTo} onChange={setEffectiveTo} style={{ width:'100%', borderRadius: '8px' }} placeholder="Effective to (optional)" /></Col>
              </Row>
            </Space>
          </div>
        </Modal>

        {/* Assigned Staff List Modal */}
        <Modal
          title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{`Assigned Staff${assignedListTpl ? ` - ${assignedListTpl.name}` : ''}`}</span>}
          open={assignedListOpen}
          onCancel={() => setAssignedListOpen(false)}
          footer={null}
          width={950}
        >
          <div style={{ paddingTop: '12px' }}>
            <div style={{ marginBottom: 16 }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Search staff by name, ID or phone..."
                allowClear
                value={assignedSearch}
                onChange={e => setAssignedSearch(e.target.value)}
                style={{ width: 320, borderRadius: '20px' }}
              />
            </div>
            <Table
              rowKey="id"
              loading={assignedListLoading}
              dataSource={(assignedListRows || []).filter(r => {
                if (!assignedSearch) return true;
                const s = assignedSearch.toLowerCase();
                const name = (r.user?.profile?.name || '').toLowerCase();
                const sid = (r.user?.profile?.staffId || '').toLowerCase();
                const phone = (r.user?.phone || '').toLowerCase();
                return name.includes(s) || sid.includes(s) || phone.includes(s);
              })}
              pagination={{ pageSize: 8 }}
              bordered={false}
              columns={[
                { 
                  title: 'Name', 
                  render: (_, r) => {
                    const name = r.user?.profile?.name || '-';
                    const phone = r.user?.phone || '-';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(3, 105, 161, 0.08)'
                        }}>
                          {getInitials(name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{name}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>{phone}</div>
                        </div>
                      </div>
                    );
                  }
                },
                { 
                  title: 'Staff ID', 
                  render: (_, r) => <span style={{ fontWeight: '600', color: '#475569' }}>{r.user?.profile?.staffId || '—'}</span> 
                },
                { 
                  title: 'Department', 
                  render: (_, r) => <span style={{ color: '#475569', fontSize: '13px' }}>{r.user?.profile?.department || '—'}</span> 
                },
                { 
                  title: 'Designation', 
                  render: (_, r) => <span style={{ color: '#475569', fontSize: '13px' }}>{r.user?.profile?.designation || '—'}</span> 
                },
                { 
                  title: 'Effective From', 
                  dataIndex: 'effectiveFrom', 
                  render: (v) => <span style={{ color: '#475569', fontWeight: '500', fontSize: '12px' }}>{v || '—'}</span> 
                },
                {
                  title: 'Action',
                  key: 'action',
                  width: 100,
                  render: (_, r) => (
                    <Popconfirm title="Unassign this staff?" onConfirm={() => unassignStaff(r.id)}>
                      <Button 
                        shape="circle" 
                        danger 
                        icon={<DeleteOutlined style={{ fontSize: '13px' }} />} 
                        style={{ border: '1px solid #ffccc7', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                      />
                    </Popconfirm>
                  )
                },
              ]}
            />
          </div>
        </Modal>
      </Layout>
    </Layout>
  );
}
