import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, Select, DatePicker, message, Divider } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MoreOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { Table, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;

const MONTHS = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];

const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const TemplateCard = ({ tpl, onEdit, onAssign }) => {
  const statusColor = tpl.active ? '#10b981' : '#dc2626';
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
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>
              Active Period: {MONTHS[tpl.startMonth - 1] || 'Jan'} - {MONTHS[tpl.endMonth - 1] || 'Dec'} {tpl.financialYear ? `(${tpl.financialYear})` : ''}
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
              icon={<MoreOutlined style={{ fontSize: '13px' }} />} 
              onClick={() => onEdit?.(tpl)} 
            />
          </Space>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Holidays Included</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>{(tpl.holidays || []).length} days</span>
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

export default function HolidayTemplates(){
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

  const [masterHolidays, setMasterHolidays] = useState([]);
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [selectedMasterHolidays, setSelectedMasterHolidays] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);

  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedListTpl, setAssignedListTpl] = useState(null);
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);
  const [assignedSearch, setAssignedSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/holidays/templates');
      setList(res.data?.templates || []);
    } catch (e) {
      message.error('Failed to load holiday templates');
      setList([]);
    } finally { setLoading(false); }
  };

  const handleFinancialYearChange = async (date) => {
    if (!date) {
      setMasterHolidays([]);
      return;
    }
    const year = date.year();
    const nextYearShort = (year + 1) % 100;
    const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
    const fy = `${year}-${nextYearStr}`;

    form.setFieldsValue({ startMonth: 4, endMonth: 3 });
    fetchMasterHolidays(fy);
  };

  const fetchMasterHolidays = async (fy) => {
    setLoadingMaster(true);
    try {
      const res = await api.get('/admin/holidays/master', { params: { financialYear: fy } });
      if (res.data.success) {
        setMasterHolidays(res.data.holidays || []);
        setSelectedMasterHolidays(res.data.holidays || []);
      } else {
        setMasterHolidays([]);
      }
    } catch (e) {
      message.error('Failed to load master holidays');
      setMasterHolidays([]);
    } finally {
      setLoadingMaster(false);
    }
  };

  const importMasterHolidays = () => {
    const currentHols = form.getFieldValue('holidays') || [];
    const imported = selectedMasterHolidays.map(h => ({
      name: h.name,
      date: dayjs(h.date),
      active: true
    }));

    const merged = [...currentHols];
    imported.forEach(imp => {
      const exists = merged.some(existing => 
        existing && existing.date && existing.date.format('YYYY-MM-DD') === imp.date.format('YYYY-MM-DD')
      );
      if (!exists) {
        merged.push(imp);
      }
    });

    form.setFieldsValue({ holidays: merged });
    setMasterModalOpen(false);
    message.success(`${imported.length} holidays imported`);
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
      financialYear: null,
      startMonth: null,
      endMonth: null,
      active: true,
      holidays: [],
    });
    setMasterHolidays([]);
    setOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    form.resetFields();
    let fyDayjs = null;
    if (tpl.financialYear) {
      const parts = tpl.financialYear.split('-');
      const startYear = parseInt(parts[0], 10);
      if (!isNaN(startYear)) {
        fyDayjs = dayjs().year(startYear);
      }
    }

    form.setFieldsValue({
      name: tpl.name,
      financialYear: fyDayjs,
      startMonth: tpl.startMonth || null,
      endMonth: tpl.endMonth || null,
      active: tpl.active !== false,
      holidays: (tpl.holidays || []).map(h => ({ name: h.name, date: dayjs(h.date), active: h.active !== false })),
    });
    if (tpl.financialYear) {
      fetchMasterHolidays(tpl.financialYear);
    } else {
      setMasterHolidays([]);
    }
    setOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      let fyStr = null;
      if (v.financialYear) {
        const year = v.financialYear.year();
        const nextYearShort = (year + 1) % 100;
        const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
        fyStr = `${year}-${nextYearStr}`;
      }

      const payload = {
        name: v.name,
        financialYear: fyStr,
        startMonth: v.startMonth || null,
        endMonth: v.endMonth || null,
        active: v.active !== false,
        holidays: (v.holidays || []).filter(Boolean).map(h => ({ name: h.name, date: h.date?.format?.('YYYY-MM-DD'), active: h.active !== false })),
      };
      if (editing) {
        await api.put(`/admin/holidays/templates/${editing.id}` , payload);
        message.success('Template updated');
      } else {
        await api.post('/admin/holidays/templates', payload);
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
      await api.post('/admin/holidays/assign', { userIds: selectedStaffIds, holidayTemplateId: assigningTpl.id, effectiveFrom: fromStr, effectiveTo: toStr });
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
      const res = await api.get(`/admin/holidays/templates/${tpl.id}/assignments`);
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
      await api.delete(`/admin/holidays/assign/${assignmentId}`);
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
          title="Holiday Templates" 
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
          title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{editing ? 'Edit Holiday Template' : 'Create Holiday Template'}</span>} 
          open={open} 
          onCancel={() => { setOpen(false); setEditing(null); }} 
          onOk={save} 
          okText="Save"
          cancelButtonProps={{ shape: 'round' }}
          okButtonProps={{ shape: 'round' }}
        >
          <div style={{ paddingTop: '12px' }}>
            <Form layout="vertical" form={form}>
              <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Template Name</span>} rules={[{ required: true, message: 'Template name is required' }]}> 
                <Input placeholder="Template Name" style={{ borderRadius: '8px' }} />
              </Form.Item>
              <Form.Item name="financialYear" label={<span style={{ fontWeight: '600', color: '#475569' }}>Financial Year</span>}>
                <DatePicker 
                  picker="year" 
                  placeholder="Select Financial Year" 
                  style={{ width: '100%', borderRadius: '8px' }} 
                  format={(value) => {
                    if (!value) return '';
                    const year = value.year();
                    const nextYearShort = (year + 1) % 100;
                    const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
                    return `${year}-${nextYearStr}`;
                  }}
                  onChange={handleFinancialYearChange}
                />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="startMonth" label={<span style={{ fontWeight: '600', color: '#475569' }}>Start Month</span>}>
                    <Select placeholder="Select month" allowClear options={MONTHS.map((m,i)=>({ label:m, value:i+1 }))} style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endMonth" label={<span style={{ fontWeight: '600', color: '#475569' }}>End Month</span>}>
                    <Select placeholder="Select month" allowClear options={MONTHS.map((m,i)=>({ label:m, value:i+1 }))} style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="active" label={<span style={{ fontWeight: '600', color: '#475569' }}>Status</span>} initialValue={true}>
                <Select options={[{ value:true, label:'Active' }, { value:false, label:'Inactive' }]} style={{ borderRadius: '8px' }} />
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.financialYear !== currentValues.financialYear} style={{ marginBottom: 12 }}>
                {() => {
                  const fy = form.getFieldValue('financialYear');
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <span style={{ fontWeight: '700', color: '#475569' }}>Holidays List</span>
                      {fy && masterHolidays.length > 0 && (
                        <Button 
                          type="primary" 
                          size="small" 
                          onClick={() => setMasterModalOpen(true)}
                          shape="round"
                        >
                          Import Master Holidays ({masterHolidays.length})
                        </Button>
                      )}
                    </div>
                  );
                }}
              </Form.Item>
              <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
                <Form.List name="holidays">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <Row key={key} gutter={12} align="middle" style={{ marginBottom: 12, background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <Col span={11}>
                            <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Holiday name required' }]} style={{ marginBottom: 0 }}>
                              <Input placeholder="Holiday Name" style={{ borderRadius: '8px' }} />
                            </Form.Item>
                          </Col>
                          <Col span={11}>
                            <Form.Item shouldUpdate={(prev, curr) => prev.financialYear !== curr.financialYear} style={{ marginBottom: 0 }}>
                              {() => {
                                const fyValue = form.getFieldValue('financialYear');
                                const defaultVal = fyValue ? dayjs().year(fyValue.year()).month(3).date(1) : undefined;
                                return (
                                  <Form.Item {...rest} name={[name, 'date']} rules={[{ required: true, message: 'Date required' }]} style={{ marginBottom: 0 }}>
                                    <DatePicker 
                                      style={{ width: '100%', borderRadius: '8px' }} 
                                      defaultPickerValue={defaultVal}
                                      disabledDate={(current) => {
                                        if (!current || !fyValue) return false;
                                        const year = fyValue.year();
                                        const startDate = dayjs().year(year).month(3).date(1).startOf('day');
                                        const endDate = dayjs().year(year + 1).month(2).date(31).endOf('day');
                                        return current.isBefore(startDate) || current.isAfter(endDate);
                                      }}
                                    />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                          </Col>
                          <Col span={2} style={{ display: 'flex', justifyContent: 'flex-end', height: '32px', alignItems: 'center' }}>
                            <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                          </Col>
                        </Row>
                      ))}
                      <Button 
                        type="dashed" 
                        block 
                        onClick={() => add({ name:'', date:null })}
                        icon={<PlusOutlined />}
                        style={{ borderRadius: '8px', marginTop: '8px' }}
                      >
                        Add Holiday Date
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
          width={900}
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

        {/* Master Holidays Select Sub-Modal */}
        <Modal
          title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>Select Master Holidays to Import</span>}
          open={masterModalOpen}
          onCancel={() => setMasterModalOpen(false)}
          onOk={importMasterHolidays}
          okText="Import Selected"
          cancelButtonProps={{ shape: 'round' }}
          okButtonProps={{ shape: 'round' }}
          width={500}
        >
          <div style={{ paddingTop: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {loadingMaster ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Typography.Text>Loading master holidays...</Typography.Text>
              </div>
            ) : masterHolidays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Typography.Text type="secondary">No master holidays found for this financial year.</Typography.Text>
              </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => {
                      if (selectedMasterHolidays.length === masterHolidays.length) {
                        setSelectedMasterHolidays([]);
                      } else {
                        setSelectedMasterHolidays([...masterHolidays]);
                      }
                    }}
                    style={{ fontWeight: '600' }}
                  >
                    {selectedMasterHolidays.length === masterHolidays.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                {masterHolidays.map((h, idx) => {
                  const isChecked = selectedMasterHolidays.some(sh => sh.name === h.name && sh.date === h.date);
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '8px 12px', 
                        background: '#f8fafc', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        marginBottom: 6
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#334155' }}>{h.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{dayjs(h.date).format('DD MMMM YYYY')}</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMasterHolidays([...selectedMasterHolidays, h]);
                          } else {
                            setSelectedMasterHolidays(selectedMasterHolidays.filter(sh => !(sh.name === h.name && sh.date === h.date)));
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </Space>
            )}
          </div>
        </Modal>
      </Layout>
    </Layout>
  );
}
