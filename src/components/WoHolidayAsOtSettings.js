import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Radio, Button, message, Space, Switch, Table, Input, Select, DatePicker, InputNumber, Tabs } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, CheckSquareOutlined, BorderOutlined, SafetyCertificateOutlined, DollarOutlined } from '@ant-design/icons';
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

export default function WoHolidayAsOtSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);

  // Option 1: WO/Holiday as OT
  const [otEnabled, setOtEnabled] = useState(false);
  const [otMode, setOtMode] = useState('none');
  const [otSelectedIds, setOtSelectedIds] = useState([]);
  const [otQ, setOtQ] = useState('');
  const [otSelectedDept, setOtSelectedDept] = useState('ALL');
  const [otSelectedDesg, setOtSelectedDesg] = useState('ALL');

  // Option 2: 1 Extra Day Salary
  const [extraDayEnabled, setExtraDayEnabled] = useState(false);
  const [extraDayMode, setExtraDayMode] = useState('none');
  const [extraDaySelectedIds, setExtraDaySelectedIds] = useState([]);
  const [extraDayQ, setExtraDayQ] = useState('');
  const [extraDaySelectedDept, setExtraDaySelectedDept] = useState('ALL');
  const [extraDaySelectedDesg, setExtraDaySelectedDesg] = useState('ALL');

  // Grace, Min Work Hours and Recalculate States
  const [graceMinutes, setGraceMinutes] = useState(0);
  const [minWorkHours, setMinWorkHours] = useState(0);
  const [recalculateFrom, setRecalculateFrom] = useState(dayjs().startOf('month'));

  const fetchList = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/salary/wo-holiday-as-ot');
      const rows = resp?.data?.items || [];
      setItems(rows);
      setGraceMinutes(resp?.data?.graceMinutes || 0);
      setMinWorkHours(resp?.data?.minWorkHours || 0);

      // OT Setup
      const otSelected = rows.filter(r => r.woHolidayAsOt).map(r => r.userId);
      setOtSelectedIds(otSelected);
      const otAllTrue = rows.length > 0 && rows.every(r => !!r.woHolidayAsOt);
      const otAllFalse = rows.length > 0 && rows.every(r => !r.woHolidayAsOt);
      if (otAllTrue) setOtMode('all');
      else if (otAllFalse) setOtMode('none');
      else setOtMode('selected');
      setOtEnabled(rows.some(r => r.woHolidayAsOt));

      // Extra Day Setup
      const extraSelected = rows.filter(r => r.woHolidayAsExtraDay).map(r => r.userId);
      setExtraDaySelectedIds(extraSelected);
      const extraAllTrue = rows.length > 0 && rows.every(r => !!r.woHolidayAsExtraDay);
      const extraAllFalse = rows.length > 0 && rows.every(r => !r.woHolidayAsExtraDay);
      if (extraAllTrue) setExtraDayMode('all');
      else if (extraAllFalse) setExtraDayMode('none');
      else setExtraDayMode('selected');
      setExtraDayEnabled(rows.some(r => r.woHolidayAsExtraDay));

    } catch (e) {
      message.error('Failed to load Weekly Off & Holiday Work settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    if (otMode === 'all') setOtSelectedIds(items.map(r => r.userId));
    if (otMode === 'none') setOtSelectedIds([]);
  }, [otMode, items]);

  useEffect(() => {
    if (extraDayMode === 'all') setExtraDaySelectedIds(items.map(r => r.userId));
    if (extraDayMode === 'none') setExtraDaySelectedIds([]);
  }, [extraDayMode, items]);

  const allIds = useMemo(() => items.map(r => r.userId), [items]);

  // Compute Unique Departments & Designations for Filters
  const departments = useMemo(() => {
    const set = new Set();
    items.forEach(r => { if (r.department) set.add(r.department); });
    return ['ALL', ...Array.from(set)].sort();
  }, [items]);

  const designations = useMemo(() => {
    const set = new Set();
    items.forEach(r => { if (r.designation) set.add(r.designation); });
    return ['ALL', ...Array.from(set)].sort();
  }, [items]);

  // Filter Logic for OT Table
  const otFiltered = useMemo(() => {
    let list = items;
    if (otSelectedDept !== 'ALL') {
      list = list.filter(r => r.department === otSelectedDept);
    }
    if (otSelectedDesg !== 'ALL') {
      list = list.filter(r => r.designation === otSelectedDesg);
    }
    const term = otQ.trim().toLowerCase();
    if (!term) return list;
    return list.filter(r =>
      String(r.name || '').toLowerCase().includes(term) ||
      String(r.phone || '').toLowerCase().includes(term) ||
      String(r.staffId || '').toLowerCase().includes(term)
    );
  }, [items, otQ, otSelectedDept, otSelectedDesg]);

  // Filter Logic for Extra Day Table
  const extraDayFiltered = useMemo(() => {
    let list = items;
    if (extraDaySelectedDept !== 'ALL') {
      list = list.filter(r => r.department === extraDaySelectedDept);
    }
    if (extraDaySelectedDesg !== 'ALL') {
      list = list.filter(r => r.designation === extraDaySelectedDesg);
    }
    const term = extraDayQ.trim().toLowerCase();
    if (!term) return list;
    return list.filter(r =>
      String(r.name || '').toLowerCase().includes(term) ||
      String(r.phone || '').toLowerCase().includes(term) ||
      String(r.staffId || '').toLowerCase().includes(term)
    );
  }, [items, extraDayQ, extraDaySelectedDept, extraDaySelectedDesg]);

  // Bulk Selection Handlers for OT
  const handleOtSelectAll = () => {
    const ids = otFiltered.map(r => r.userId);
    setOtSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    message.info(`Selected all ${ids.length} matching staff members.`);
  };

  const handleOtDeselectAll = () => {
    const ids = otFiltered.map(r => r.userId);
    setOtSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    message.info(`Deselected matching staff members.`);
  };

  // Bulk Selection Handlers for Extra Day
  const handleExtraDaySelectAll = () => {
    const ids = extraDayFiltered.map(r => r.userId);
    setExtraDaySelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    message.info(`Selected all ${ids.length} matching staff members.`);
  };

  const handleExtraDayDeselectAll = () => {
    const ids = extraDayFiltered.map(r => r.userId);
    setExtraDaySelectedIds(prev => prev.filter(id => !ids.includes(id)));
    message.info(`Deselected matching staff members.`);
  };

  const onConfirm = async () => {
    try {
      setSaving(true);
      
      const updates = items.map(r => {
        const userId = r.userId;
        let isOt = false;
        if (otEnabled) {
          if (otMode === 'all') isOt = true;
          else if (otMode === 'selected') isOt = otSelectedIds.includes(userId);
        }

        let isExtraDay = false;
        if (extraDayEnabled) {
          if (extraDayMode === 'all') isExtraDay = true;
          else if (extraDayMode === 'selected') isExtraDay = extraDaySelectedIds.includes(userId);
        }

        return {
          userId,
          woHolidayAsOt: isOt,
          woHolidayAsExtraDay: isExtraDay
        };
      });

      await api.put('/admin/salary/wo-holiday-as-ot-bulk', {
        graceMinutes,
        minWorkHours,
        recalculateFrom: recalculateFrom ? recalculateFrom.format('YYYY-MM-DD') : null,
        updates
      });

      message.success('Weekly Off & Holiday Work settings saved successfully');
      fetchList();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const columnsOT = [
    { 
      title: 'Staff ID', 
      dataIndex: 'staffId', 
      key: 'staffId', 
      width: 120,
      render: (text) => <span style={{ fontWeight: '600', color: '#475569' }}>{text || '—'}</span>
    },
    { 
      title: 'Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#f5f3ff',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            flexShrink: 0,
            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.08)'
          }}>
            {getInitials(text)}
          </div>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>{text}</span>
        </div>
      )
    },
    { 
      title: 'Department', 
      dataIndex: 'department', 
      key: 'department', 
      width: 150,
      render: (text) => <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{text || '—'}</span>
    },
    { 
      title: 'Designation', 
      dataIndex: 'designation', 
      key: 'designation', 
      width: 150,
      render: (text) => <span style={{ color: '#64748b', fontSize: '13px' }}>{text || '—'}</span>
    },
    { 
      title: 'Phone', 
      dataIndex: 'phone', 
      key: 'phone', 
      width: 140,
      render: (text) => <span style={{ color: '#64748b', fontSize: '13px' }}>{text || '—'}</span>
    },
    {
      title: 'OT Status', 
      key: 'woHolidayAsOtStatus', 
      width: 140,
      render: (_, r) => {
        const isSelected = otSelectedIds.includes(r.userId);
        return isSelected ? (
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            fontWeight: '700', 
            color: '#7c3aed', 
            backgroundColor: '#f5f3ff', 
            border: '1px solid #ddd6fe',
            letterSpacing: '0.5px'
          }}>
            ACTIVE (OT)
          </span>
        ) : (
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            fontWeight: '700', 
            color: '#64748b', 
            backgroundColor: '#f1f5f9', 
            border: '1px solid #cbd5e1',
            letterSpacing: '0.5px'
          }}>
            INACTIVE
          </span>
        );
      }
    },
  ];

  const columnsExtraDay = [
    { 
      title: 'Staff ID', 
      dataIndex: 'staffId', 
      key: 'staffId', 
      width: 120,
      render: (text) => <span style={{ fontWeight: '600', color: '#475569' }}>{text || '—'}</span>
    },
    { 
      title: 'Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            flexShrink: 0,
            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.08)'
          }}>
            {getInitials(text)}
          </div>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>{text}</span>
        </div>
      )
    },
    { 
      title: 'Department', 
      dataIndex: 'department', 
      key: 'department', 
      width: 150,
      render: (text) => <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{text || '—'}</span>
    },
    { 
      title: 'Designation', 
      dataIndex: 'designation', 
      key: 'designation', 
      width: 150,
      render: (text) => <span style={{ color: '#64748b', fontSize: '13px' }}>{text || '—'}</span>
    },
    { 
      title: 'Phone', 
      dataIndex: 'phone', 
      key: 'phone', 
      width: 140,
      render: (text) => <span style={{ color: '#64748b', fontSize: '13px' }}>{text || '—'}</span>
    },
    {
      title: 'Extra Day Status', 
      key: 'woHolidayAsExtraDayStatus', 
      width: 160,
      render: (_, r) => {
        const isSelected = extraDaySelectedIds.includes(r.userId);
        return isSelected ? (
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            fontWeight: '700', 
            color: '#059669', 
            backgroundColor: '#ecfdf5', 
            border: '1px solid #a7f3d0',
            letterSpacing: '0.5px'
          }}>
            ACTIVE (1 EXTRA DAY)
          </span>
        ) : (
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            fontWeight: '700', 
            color: '#64748b', 
            backgroundColor: '#f1f5f9', 
            border: '1px solid #cbd5e1',
            letterSpacing: '0.5px'
          }}>
            INACTIVE
          </span>
        );
      }
    },
  ];

  const otRowSelection = otMode === 'selected' ? {
    selectedRowKeys: otSelectedIds,
    onChange: (keys) => setOtSelectedIds(keys),
    getCheckboxProps: () => ({ disabled: !otEnabled }),
  } : undefined;

  const extraDayRowSelection = extraDayMode === 'selected' ? {
    selectedRowKeys: extraDaySelectedIds,
    onChange: (keys) => setExtraDaySelectedIds(keys),
    getCheckboxProps: () => ({ disabled: !extraDayEnabled }),
  } : undefined;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Weekly Off & Holiday Work Settings" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            {/* Toolbar Row */}
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
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

            {/* Recalculate Global Setting Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>Attendance Recalculation Date:</span>
                <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '10px' }}>Select start date to automatically recalculate attendance & payroll records upon saving settings.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Recalculate From:</span>
                <DatePicker
                  value={recalculateFrom}
                  onChange={setRecalculateFrom}
                  format="YYYY-MM-DD"
                  style={{ width: '140px', borderRadius: '6px' }}
                  allowClear={false}
                />
              </div>
            </div>

            {/* TAB / SECTION CARDS */}
            <Tabs defaultActiveKey="1" type="card" style={{ width: '100%' }} items={[
              {
                key: '1',
                label: (
                  <span style={{ fontWeight: '600', padding: '0 8px' }}>
                    <SafetyCertificateOutlined style={{ marginRight: 8, color: '#7c3aed' }} />
                    Option 1: Overtime (OT) Pay
                  </span>
                ),
                children: (
                  <Card 
                    style={{ borderRadius: '0 16px 16px 16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
                    bodyStyle={{ padding: '24px' }}
                  >
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Weekly Off & Holiday Work as Overtime (OT)</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        Configure weekly off and holiday work rules. For assigned staff, hours worked on Weekly Offs or Holidays will not count towards normal "present" days, but will instead be paid as Overtime according to their active Overtime rules.
                      </div>
                    </div>

                    {/* Toolbar Panel */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      flexWrap: 'wrap', 
                      gap: '16px', 
                      padding: '16px 20px', 
                      background: '#f8fafc', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      marginBottom: '24px'
                    }}>
                      <Radio.Group 
                        value={otMode} 
                        onChange={(e) => setOtMode(e.target.value)} 
                        disabled={!otEnabled}
                        optionType="button"
                        buttonStyle="solid"
                      >
                        <Radio.Button value="all" style={{ borderRadius: '6px 0 0 6px' }}>All Staff</Radio.Button>
                        <Radio.Button value="none">None</Radio.Button>
                        <Radio.Button value="selected" style={{ borderRadius: '0 6px 6px 0' }}>Selected Staff</Radio.Button>
                      </Radio.Group>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {otMode === 'selected' && otEnabled && (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', background: '#f5f3ff', padding: '4px 12px', borderRadius: '15px' }}>
                            Selected: {otSelectedIds.length} / {items.length}
                          </span>
                        )}
                        {otEnabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Grace (mins):</span>
                            <InputNumber
                              min={0}
                              style={{ width: '80px', borderRadius: '6px' }}
                              value={graceMinutes}
                              onChange={(val) => setGraceMinutes(val || 0)}
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Switch checked={otEnabled} onChange={setOtEnabled} />
                          <span style={{ fontWeight: '600', color: '#334155', fontSize: '13px' }}>Enable Weekly Off / Holiday Work as OT</span>
                        </div>
                      </div>
                    </div>

                    {otMode === 'selected' && otEnabled ? (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          flexWrap: 'wrap', 
                          gap: '12px',
                          marginBottom: '20px',
                          paddingBottom: '16px',
                          borderBottom: '1px dashed #e2e8f0'
                        }}>
                          <Space size={12} wrap>
                            <Input
                              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                              placeholder="Search by name, phone or ID..." 
                              allowClear 
                              style={{ width: 240, borderRadius: '20px' }} 
                              value={otQ} 
                              onChange={(e) => setOtQ(e.target.value)} 
                            />
                            
                            <Select
                              value={otSelectedDept}
                              onChange={setOtSelectedDept}
                              style={{ width: 180 }}
                              placeholder="Select Department"
                            >
                              {departments.map(d => (
                                <Select.Option key={d} value={d}>
                                  {d === 'ALL' ? 'All Departments' : d}
                                </Select.Option>
                              ))}
                            </Select>

                            <Select
                              value={otSelectedDesg}
                              onChange={setOtSelectedDesg}
                              style={{ width: 180 }}
                              placeholder="Select Designation"
                            >
                              {designations.map(d => (
                                <Select.Option key={d} value={d}>
                                  {d === 'ALL' ? 'All Designations' : d}
                                </Select.Option>
                              ))}
                            </Select>
                          </Space>
                          
                          <Space size={12}>
                            <Button 
                              type="dashed" 
                              icon={<CheckSquareOutlined />}
                              shape="round"
                              onClick={handleOtSelectAll}
                              disabled={!otEnabled || otFiltered.length === 0}
                              style={{ fontSize: '13px', fontWeight: '500', color: '#7c3aed', borderColor: '#ddd6fe' }}
                            >
                              Select All Matching ({otFiltered.length})
                            </Button>
                            <Button 
                              type="text" 
                              danger
                              icon={<BorderOutlined />}
                              shape="round"
                              onClick={handleOtDeselectAll}
                              disabled={!otEnabled || otFiltered.length === 0}
                              style={{ fontSize: '13px', fontWeight: '500' }}
                            >
                              Deselect All Matching
                            </Button>
                          </Space>
                        </div>

                        <Table
                          loading={loading}
                          dataSource={otFiltered}
                          columns={columnsOT}
                          rowKey="userId"
                          pagination={{ pageSize: 10, showSizeChanger: true }}
                          rowSelection={otRowSelection}
                          bordered={false}
                        />
                      </div>
                    ) : null}
                  </Card>
                )
              },
              {
                key: '2',
                label: (
                  <span style={{ fontWeight: '600', padding: '0 8px' }}>
                    <DollarOutlined style={{ marginRight: 8, color: '#059669' }} />
                    Option 2: Pay 1 Extra Day Salary
                  </span>
                ),
                children: (
                  <Card 
                    style={{ borderRadius: '0 16px 16px 16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
                    bodyStyle={{ padding: '24px' }}
                  >
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Pay 1 Extra Day Full Salary for Weekly Off / Holiday Work</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        When enabled, if an employee works on a Weekly Off (e.g. Sunday) or Holiday, their paid Weekly Off/Holiday count remains preserved, AND they receive 1 extra full day's salary added to their payable present days in payroll (2 days' total pay for working on off day).
                      </div>
                    </div>

                    {/* Toolbar Panel */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      flexWrap: 'wrap', 
                      gap: '16px', 
                      padding: '16px 20px', 
                      background: '#ecfdf5', 
                      borderRadius: '12px', 
                      border: '1px solid #a7f3d0',
                      marginBottom: '24px'
                    }}>
                      <Radio.Group 
                        value={extraDayMode} 
                        onChange={(e) => setExtraDayMode(e.target.value)} 
                        disabled={!extraDayEnabled}
                        optionType="button"
                        buttonStyle="solid"
                      >
                        <Radio.Button value="all" style={{ borderRadius: '6px 0 0 6px' }}>All Staff</Radio.Button>
                        <Radio.Button value="none">None</Radio.Button>
                        <Radio.Button value="selected" style={{ borderRadius: '0 6px 6px 0' }}>Selected Staff</Radio.Button>
                      </Radio.Group>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {extraDayMode === 'selected' && extraDayEnabled && (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669', background: '#d1fae5', padding: '4px 12px', borderRadius: '15px' }}>
                            Selected: {extraDaySelectedIds.length} / {items.length}
                          </span>
                        )}
                        {extraDayEnabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#065f46', fontWeight: '500' }}>Min Work Hours:</span>
                            <InputNumber
                              min={0}
                              max={24}
                              step={0.5}
                              placeholder="0 (1 min default)"
                              style={{ width: '130px', borderRadius: '6px' }}
                              value={minWorkHours}
                              onChange={(val) => setMinWorkHours(val !== null ? val : 0)}
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Switch checked={extraDayEnabled} onChange={setExtraDayEnabled} />
                          <span style={{ fontWeight: '600', color: '#065f46', fontSize: '13px' }}>Enable 1 Extra Day Salary for Weekly Off / Holiday Work</span>
                        </div>
                      </div>
                    </div>

                    {extraDayMode === 'selected' && extraDayEnabled ? (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          flexWrap: 'wrap', 
                          gap: '12px',
                          marginBottom: '20px',
                          paddingBottom: '16px',
                          borderBottom: '1px dashed #e2e8f0'
                        }}>
                          <Space size={12} wrap>
                            <Input
                              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                              placeholder="Search by name, phone or ID..." 
                              allowClear 
                              style={{ width: 240, borderRadius: '20px' }} 
                              value={extraDayQ} 
                              onChange={(e) => setExtraDayQ(e.target.value)} 
                            />
                            
                            <Select
                              value={extraDaySelectedDept}
                              onChange={setExtraDaySelectedDept}
                              style={{ width: 180 }}
                              placeholder="Select Department"
                            >
                              {departments.map(d => (
                                <Select.Option key={d} value={d}>
                                  {d === 'ALL' ? 'All Departments' : d}
                                </Select.Option>
                              ))}
                            </Select>

                            <Select
                              value={extraDaySelectedDesg}
                              onChange={setExtraDaySelectedDesg}
                              style={{ width: 180 }}
                              placeholder="Select Designation"
                            >
                              {designations.map(d => (
                                <Select.Option key={d} value={d}>
                                  {d === 'ALL' ? 'All Designations' : d}
                                </Select.Option>
                              ))}
                            </Select>
                          </Space>
                          
                          <Space size={12}>
                            <Button 
                              type="dashed" 
                              icon={<CheckSquareOutlined />}
                              shape="round"
                              onClick={handleExtraDaySelectAll}
                              disabled={!extraDayEnabled || extraDayFiltered.length === 0}
                              style={{ fontSize: '13px', fontWeight: '500', color: '#059669', borderColor: '#a7f3d0' }}
                            >
                              Select All Matching ({extraDayFiltered.length})
                            </Button>
                            <Button 
                              type="text" 
                              danger
                              icon={<BorderOutlined />}
                              shape="round"
                              onClick={handleExtraDayDeselectAll}
                              disabled={!extraDayEnabled || extraDayFiltered.length === 0}
                              style={{ fontSize: '13px', fontWeight: '500' }}
                            >
                              Deselect All Matching
                            </Button>
                          </Space>
                        </div>

                        <Table
                          loading={loading}
                          dataSource={extraDayFiltered}
                          columns={columnsExtraDay}
                          rowKey="userId"
                          pagination={{ pageSize: 10, showSizeChanger: true }}
                          rowSelection={extraDayRowSelection}
                          bordered={false}
                        />
                      </div>
                    ) : null}
                  </Card>
                )
              }
            ]} />

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', padding: '20px 24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Space size={12}>
                <Button 
                  shape="round" 
                  onClick={() => navigate('/settings')}
                  style={{ fontWeight: '500' }}
                >
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  shape="round" 
                  loading={saving} 
                  onClick={onConfirm}
                  style={{ fontWeight: '600', minWidth: '120px', boxShadow: '0 2px 6px rgba(124, 58, 237, 0.15)', backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  Save Settings
                </Button>
              </Space>
            </div>

          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
