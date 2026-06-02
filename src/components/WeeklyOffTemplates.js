import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, Select, DatePicker, message, Table, Popconfirm, Divider } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;

const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];
const WEEK_COLS = [
  { label: 'All', value: 'all' },
  { label: '1st', value: 1 },
  { label: '2nd', value: 2 },
  { label: '3rd', value: 3 },
  { label: '4th', value: 4 },
  { label: '5th', value: 5 },
];

function normalizeWeeksInput(input) {
  const arr = Array.isArray(input) ? input : (input == null ? [] : [input]);
  const normalized = arr
    .map((w) => (typeof w === 'string' ? w.trim().toLowerCase() : w))
    .filter((w) => w !== '' && w !== null && w !== undefined);
  const nums = [...new Set(normalized.map((w) => Number(w)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5))];
  const hasAll = normalized.includes('all') || normalized.includes(0) || normalized.includes('0');
  if (hasAll && nums.length === 0) return 'all';
  if (hasAll && nums.length > 0) return nums;
  return nums;
}

function parseConfigArray(raw) {
  let cfg = raw;
  let guard = 0;
  while (typeof cfg === 'string' && guard < 3) {
    try {
      const p = JSON.parse(cfg);
      if (p === cfg) break;
      cfg = p;
      guard += 1;
    } catch { break; }
  }
  return Array.isArray(cfg) ? cfg : [];
}

const TemplateCard = ({ tpl, onEdit, onAssign }) => {
  const statusColor = tpl.active ? '#10b981' : '#dc2626';
  
  const summary = () => {
    const cfg = parseConfigArray(tpl.config);
    const parts = cfg.map((c) => {
      const d = DAYS.find((x) => x.value === Number(c.day))?.label || c.day;
      const w = c.weeks === "all" ? "All weeks" : Array.isArray(c.weeks) ? `Weeks ${c.weeks.join(",")}` : "";
      return `${d}: ${w}`;
    });
    return parts.join(" • ");
  };

  return (
    <Card 
      className="sales-content-card" 
      style={{ height: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
      bodyStyle={{ padding: '20px' }}
      hoverable
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b', textTransform: 'capitalize' }}>{tpl.name}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>
              Weekly Off Config
            </div>
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
              icon={<EditOutlined style={{ fontSize: '12px', color: '#2563eb' }} />} 
              onClick={() => onEdit?.(tpl)} 
            />
          </Space>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: '500', flexShrink: 0 }}>Rules</span>
            <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '11px', textAlign: 'right' }}>{summary()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Assigned Staff</span>
            <span 
              onClick={() => onAssign?.openAssignedList?.(tpl)}
              style={{ 
                color: '#2563eb', 
                fontWeight: '700', 
                backgroundColor: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '11px',
                cursor: 'pointer',
                border: '1px solid #bfdbfe',
                boxShadow: '0 1px 2px rgba(37,99,235,0.05)',
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
}

export default function WeeklyOffTemplates() {
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
  const [q, setQ] = useState('');

  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedListTpl, setAssignedListTpl] = useState(null);
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/weekly-off/templates');
      const rows = Array.isArray(res.data?.templates) ? res.data.templates : [];
      setList(rows.map(t => ({
        ...t,
        config: parseConfigArray(t?.config),
      })));
    } catch (e) {
      message.error('Failed to load weekly off templates');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
    try {
      form.resetFields();
      form.setFieldsValue({
        name: '',
        active: true,
        config: [],
      });
    } catch (_) {}
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setOpen(true);
    try {
      const mappedCfg = parseConfigArray(tpl?.config).map(c => ({
        day: Number(c.day),
        weeks: normalizeWeeksInput(c.weeks) === 'all' ? ['all'] : normalizeWeeksInput(c.weeks),
      }));
      const values = {
        name: tpl?.name || '',
        active: tpl?.active !== false,
        config: mappedCfg.length > 0 ? mappedCfg : [{ day: 0, weeks: ['all'] }],
      };
      form.resetFields();
      form.setFieldsValue(values);
    } catch (_) {}
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        name: v.name,
        active: v.active !== false,
        config: (v.config || []).map(c => {
          const weeks = normalizeWeeksInput(c.weeks);
          return { day: Number(c.day), weeks };
        }),
      };
      if (editing) {
        await api.put(`/admin/weekly-off/templates/${editing.id}`, payload);
        message.success('Template updated');
      } else {
        await api.post('/admin/weekly-off/templates', payload);
        message.success('Template created');
      }
      setOpen(false); setEditing(null);
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save');
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
      await api.post('/admin/weekly-off/assign', { userIds: selectedStaffIds, weeklyOffTemplateId: assigningTpl.id, effectiveFrom: fromStr, effectiveTo: toStr });
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
      if (!keepOpen) setAssignedListOpen(true);
      setAssignedListLoading(true);
      const res = await api.get(`/admin/weekly-off/templates/${tpl.id}/assignments`);
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
      await api.delete(`/admin/weekly-off/assign/${assignmentId}`);
      message.success('Staff unassigned');
      if (assignedListTpl?.id) await openAssignedList(assignedListTpl, true);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to unassign staff');
    }
  };

  const filtered = (list || []).filter(t => !q || String(t.name).toLowerCase().includes(String(q).toLowerCase()));

  const [collapsed, setCollapsed] = useState(false);
  const [assignedSearch, setAssignedSearch] = useState('');
  const navigate = useNavigate();

  const filteredList = useMemo(() => {
    const searchVal = (q || '').trim().toLowerCase();
    if (!searchVal) return list;
    return list.filter(t => (t.name || '').toLowerCase().includes(searchVal));
  }, [list, q]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Weekly Off Templates" 
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

            {/* Elegant Search and Action Card */}
            <Card 
              className="sales-content-card" 
              bodyStyle={{ padding: '20px' }} 
              style={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <Input 
                  prefix={<SearchOutlined style={{ color: '#94a3b8', marginRight: '6px' }} />}
                  placeholder="Search templates..." 
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
                  New Template
                </Button>
              </div>
            </Card>

            {/* Templates Card List */}
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
          key={editing?.id || 'create'} 
          title={<span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>{editing ? 'Edit Weekly Off Template' : 'Create Weekly Off Template'}</span>} 
          open={open} 
          onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }} 
          onOk={save} 
          okText="Save Changes" 
          width={720}
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
            <Form 
              key={editing?.id ? `edit-${editing.id}` : 'create'}
              layout="vertical" 
              form={form}
              initialValues={{
                name: editing?.name || '',
                active: editing?.active !== false ? true : false,
                config: editing ? (() => {
                  const mapped = parseConfigArray(editing?.config).map(c => ({
                    day: Number(c.day),
                    weeks: normalizeWeeksInput(c.weeks) === 'all' ? ['all'] : normalizeWeeksInput(c.weeks),
                  }));
                  return mapped.length > 0 ? mapped : [{ day: 0, weeks: ['all'] }];
                })() : [],
              }}
            >
              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Template Name</span>} rules={[{ required: true, message: 'Template name is required' }]}>
                    <Input placeholder="Weekly Off Name" style={{ borderRadius: '10px', height: '40px' }} />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="active" label={<span style={{ fontWeight: '600', color: '#475569' }}>Status</span>} initialValue={true}>
                    <Select 
                      options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} 
                      style={{ borderRadius: '10px', height: '40px' }} 
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain>
                <span style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Weekly Off Rules</span>
              </Divider>

              <Form.List name="config">
                {(fields, { add, remove }) => (
                  <>
                    <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                      {fields.map(({ key, name, ...rest }) => (
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
                          <Col span={10}>
                            <Form.Item {...rest} name={[name, 'day']} label={<span style={{ fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Day</span>} rules={[{ required: true }]}>
                              <Select options={DAYS} style={{ borderRadius: '8px' }} />
                            </Form.Item>
                          </Col>
                          <Col span={10}>
                            <Form.Item {...rest} name={[name, 'weeks']} label={<span style={{ fontWeight: '600', color: '#64748b', fontSize: '12px' }}>Weeks</span>} rules={[{ required: true }]}>
                              <Select mode="multiple" options={WEEK_COLS} placeholder="Select weeks" style={{ borderRadius: '8px' }} dropdownStyle={{ borderRadius: '10px' }} />
                            </Form.Item>
                          </Col>
                          <Col span={4} style={{ display: 'flex', justifyContent: 'flex-end', height: '56px', alignItems: 'center', marginTop: '10px' }}>
                            <Popconfirm title="Remove this rule?" onConfirm={() => remove(name)}>
                              <Button 
                                type="text"
                                danger 
                                shape="circle"
                                icon={<DeleteOutlined style={{ fontSize: '14px' }} />} 
                              />
                            </Popconfirm>
                          </Col>
                        </Row>
                      ))}
                    </div>
                    <Button 
                      type="dashed" 
                      block 
                      onClick={() => add({ day: 0, weeks: ['all'] })}
                      icon={<PlusOutlined />}
                      style={{ height: '40px', borderRadius: '12px', fontWeight: '600' }}
                    >
                      Add Weekly Off Rule
                    </Button>
                  </>
                )}
              </Form.List>
            </Form>
          </div>
        </Modal>

        {/* Assign Modal */}
        <Modal 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TeamOutlined style={{ color: '#2563eb', fontSize: '18px' }} />
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
                {assigningTpl ? `Assign Staff • ${assigningTpl.name}` : 'Assign Staff'}
              </span>
            </div>
          } 
          open={assignOpen} 
          onCancel={() => setAssignOpen(false)} 
          onOk={saveAssign} 
          okText="Assign"
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
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-8px' }}>
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
                  style={{ fontWeight: '600', padding: 0 }}
                >
                  {selectedStaffIds.length === staffOptions.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <Select
                mode="multiple"
                options={staffOptions}
                value={selectedStaffIds}
                onChange={setSelectedStaffIds}
                style={{ width: '100%', borderRadius: '8px' }}
                placeholder="Select staff to assign"
                dropdownStyle={{ borderRadius: '12px' }}
              />
              <Row gutter={12}>
                <Col span={12}>
                  <DatePicker 
                    value={effectiveFrom} 
                    onChange={setEffectiveFrom} 
                    style={{ width: '100%', borderRadius: '8px', height: '38px' }} 
                    placeholder="Effective from" 
                  />
                </Col>
                <Col span={12}>
                  <DatePicker 
                    value={effectiveTo} 
                    onChange={setEffectiveTo} 
                    style={{ width: '100%', borderRadius: '8px', height: '38px' }} 
                    placeholder="Effective to (optional)" 
                  />
                </Col>
              </Row>
            </Space>
          </div>
        </Modal>

        {/* Assigned Staff List Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TeamOutlined style={{ color: '#2563eb', fontSize: '18px' }} />
              <span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>
                {`Assigned Staff${assignedListTpl ? ` - ${assignedListTpl.name}` : ''}`}
              </span>
            </div>
          }
          open={assignedListOpen}
          onCancel={() => setAssignedListOpen(false)}
          footer={null}
          width={900}
          style={{ borderRadius: '20px' }}
        >
          <div style={{ paddingTop: '16px' }}>
            <div style={{ marginBottom: 16 }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#bfbfbf', marginRight: '6px' }} />}
                placeholder="Search staff by name, ID or phone..."
                allowClear
                value={assignedSearch}
                onChange={e => setAssignedSearch(e.target.value)}
                style={{ width: 320, borderRadius: '20px', height: '38px' }}
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
              pagination={{ pageSize: 6 }}
              bordered={false}
              className="premium-table"
              style={{ borderRadius: '12px', overflow: 'hidden' }}
              columns={[
                { 
                  title: 'Name', 
                  render: (_, r) => {
                    const name = r.user?.profile?.name || '-';
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
                  render: (_, r) => <span style={{ fontWeight: '600', color: '#334155' }}>{r.user?.profile?.staffId || '—'}</span> 
                },
                { 
                  title: 'Department', 
                  render: (_, r) => <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{r.user?.profile?.department || '—'}</span> 
                },
                { 
                  title: 'Designation', 
                  render: (_, r) => <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{r.user?.profile?.designation || '—'}</span> 
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
                  align: 'center',
                  render: (_, r) => (
                    <Popconfirm title="Unassign this staff?" onConfirm={() => unassignStaff(r.id)}>
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
    </Layout>
  );
}
