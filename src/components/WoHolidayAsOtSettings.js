import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Radio, Button, message, Space, Switch, Table, Input, Select } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, CheckSquareOutlined, BorderOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
  const [mode, setMode] = useState('none');
  const [enabled, setEnabled] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [q, setQ] = useState('');
  
  // Advanced Filter States
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedDesg, setSelectedDesg] = useState('ALL');

  const fetchList = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/salary/wo-holiday-as-ot');
      const rows = resp?.data?.items || [];
      setItems(rows);
      const allTrue = rows.length > 0 && rows.every(r => !!r.woHolidayAsOt);
      const allFalse = rows.length > 0 && rows.every(r => !r.woHolidayAsOt);
      if (allTrue) setMode('all');
      else if (allFalse) setMode('none');
      else setMode('selected');
      setSelectedIds(rows.filter(r => r.woHolidayAsOt).map(r => r.userId));
      setEnabled(rows.some(r => r.woHolidayAsOt));
    } catch (e) {
      message.error('Failed to load Weekly Off & Holiday Work as OT status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    if (mode === 'all') setSelectedIds(items.map(r => r.userId));
    if (mode === 'none') setSelectedIds([]);
  }, [mode, items]);

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

  // Filter Logic
  const filtered = useMemo(() => {
    let list = items;
    if (selectedDept !== 'ALL') {
      list = list.filter(r => r.department === selectedDept);
    }
    if (selectedDesg !== 'ALL') {
      list = list.filter(r => r.designation === selectedDesg);
    }
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(r =>
      String(r.name || '').toLowerCase().includes(term) ||
      String(r.phone || '').toLowerCase().includes(term) ||
      String(r.staffId || '').toLowerCase().includes(term)
    );
  }, [items, q, selectedDept, selectedDesg]);

  // Bulk Selection Handlers
  const handleSelectAllFiltered = () => {
    const filteredIds = filtered.map(r => r.userId);
    setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    message.info(`Selected all ${filteredIds.length} matching staff members locally.`);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = filtered.map(r => r.userId);
    setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    message.info(`Deselected all matching staff members locally.`);
  };

  const onConfirm = async () => {
    try {
      setSaving(true);
      if (!enabled) {
        if (allIds.length) await api.put('/admin/salary/wo-holiday-as-ot-bulk', { userIds: allIds, woHolidayAsOt: false });
        message.success('Settings saved successfully');
        fetchList();
        return;
      }
      if (mode === 'all') {
        if (allIds.length) await api.put('/admin/salary/wo-holiday-as-ot-bulk', { userIds: allIds, woHolidayAsOt: true });
      } else if (mode === 'none') {
        if (allIds.length) await api.put('/admin/salary/wo-holiday-as-ot-bulk', { userIds: allIds, woHolidayAsOt: false });
      } else {
        const sel = Array.from(new Set(selectedIds));
        const unSel = allIds.filter(id => !sel.includes(id));
        if (sel.length) await api.put('/admin/salary/wo-holiday-as-ot-bulk', { userIds: sel, woHolidayAsOt: true });
        if (unSel.length) await api.put('/admin/salary/wo-holiday-as-ot-bulk', { userIds: unSel, woHolidayAsOt: false });
      }
      message.success('Settings saved successfully');
      fetchList();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
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
      title: 'Status', 
      key: 'woHolidayAsOtStatus', 
      width: 140,
      render: (_, r) => {
        const isSelected = selectedIds.includes(r.userId);
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
            ACTIVE
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

  const rowSelection = mode === 'selected' ? {
    selectedRowKeys: selectedIds,
    onChange: (keys) => setSelectedIds(keys),
    getCheckboxProps: () => ({ disabled: !enabled }),
  } : undefined;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Weekly Off & Holiday Work as OT Settings" 
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

            {/* Main Card */}
            <Card 
              className="sales-content-card" 
              style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Weekly Off & Holiday Work as Overtime (OT)</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Configure weekly off and holiday work rules. For assigned staff, hours worked on Weekly Offs or Holidays will not count towards normal "present" days, but will instead be paid as Overtime according to their active Overtime rules.
                </div>
              </div>

              {/* Settings Toolbar Panel */}
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
                  value={mode} 
                  onChange={(e) => setMode(e.target.value)} 
                  disabled={!enabled}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="all" style={{ borderRadius: '6px 0 0 6px' }}>All Staff</Radio.Button>
                  <Radio.Button value="none">None</Radio.Button>
                  <Radio.Button value="selected" style={{ borderRadius: '0 6px 6px 0' }}>Selected Staff</Radio.Button>
                </Radio.Group>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {mode === 'selected' && enabled && (
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', background: '#f5f3ff', padding: '4px 12px', borderRadius: '15px' }}>
                      Selected: {selectedIds.length} / {items.length}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Switch checked={enabled} onChange={setEnabled} />
                    <span style={{ fontWeight: '600', color: '#334155', fontSize: '13px' }}>Enable Weekly Off / Holiday Work as OT</span>
                  </div>
                </div>
              </div>

              {mode === 'selected' ? (
                <div style={{ marginTop: 16 }}>
                  {/* Advanced Filter Toolbar */}
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
                        value={q} 
                        onChange={(e) => setQ(e.target.value)} 
                      />
                      
                      <Select
                        value={selectedDept}
                        onChange={setSelectedDept}
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
                        value={selectedDesg}
                        onChange={setSelectedDesg}
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
                        onClick={handleSelectAllFiltered}
                        disabled={!enabled || filtered.length === 0}
                        style={{ fontSize: '13px', fontWeight: '500', color: '#7c3aed', borderColor: '#ddd6fe' }}
                      >
                        Select All Matching ({filtered.length})
                      </Button>
                      <Button 
                        type="text" 
                        danger
                        icon={<BorderOutlined />}
                        shape="round"
                        onClick={handleDeselectAllFiltered}
                        disabled={!enabled || filtered.length === 0}
                        style={{ fontSize: '13px', fontWeight: '500' }}
                      >
                        Deselect All Matching
                      </Button>
                    </Space>
                  </div>

                  <Table
                    loading={loading}
                    dataSource={filtered}
                    columns={columns}
                    rowKey="userId"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    rowSelection={rowSelection}
                    bordered={false}
                  />
                </div>
              ) : null}

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
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
                    style={{ fontWeight: '600', minWidth: '100px', boxShadow: '0 2px 6px rgba(124, 58, 237, 0.15)', backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                  >
                    Save Settings
                  </Button>
                </Space>
              </div>
            </Card>
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
