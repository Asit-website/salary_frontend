import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Radio, Button, message, Space, Switch, Table, Input } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
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

export default function EsiAsTaSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('none');
  const [enabled, setEnabled] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [q, setQ] = useState('');

  const fetchList = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/salary/esi-as-ta');
      const rows = resp?.data?.items || [];
      setItems(rows);
      const allTrue = rows.length > 0 && rows.every(r => !!r.esiAsTa);
      const allFalse = rows.length > 0 && rows.every(r => !r.esiAsTa);
      if (allTrue) setMode('all');
      else if (allFalse) setMode('none');
      else setMode('selected');
      setSelectedIds(rows.filter(r => r.esiAsTa).map(r => r.userId));
      setEnabled(rows.some(r => r.esiAsTa));
    } catch (e) {
      message.error('Failed to load ESI as TA list');
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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r =>
      String(r.name || '').toLowerCase().includes(term) ||
      String(r.phone || '').toLowerCase().includes(term) ||
      String(r.staffId || '').toLowerCase().includes(term)
    );
  }, [items, q]);

  const onConfirm = async () => {
    try {
      setSaving(true);
      if (!enabled) {
        if (allIds.length) await api.put('/admin/salary/esi-as-ta-bulk', { userIds: allIds, esiAsTa: false });
        message.success('Settings saved successfully');
        fetchList();
        return;
      }
      if (mode === 'all') {
        if (allIds.length) await api.put('/admin/salary/esi-as-ta-bulk', { userIds: allIds, esiAsTa: true });
      } else if (mode === 'none') {
        if (allIds.length) await api.put('/admin/salary/esi-as-ta-bulk', { userIds: allIds, esiAsTa: false });
      } else {
        const sel = Array.from(new Set(selectedIds));
        const unSel = allIds.filter(id => !sel.includes(id));
        if (sel.length) await api.put('/admin/salary/esi-as-ta-bulk', { userIds: sel, esiAsTa: true });
        if (unSel.length) await api.put('/admin/salary/esi-as-ta-bulk', { userIds: unSel, esiAsTa: false });
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
      width: 140,
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
            {getInitials(text)}
          </div>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>{text}</span>
        </div>
      )
    },
    { 
      title: 'Phone', 
      dataIndex: 'phone', 
      key: 'phone', 
      width: 160,
      render: (text) => <span style={{ color: '#64748b', fontSize: '13px' }}>{text || '—'}</span>
    },
    {
      title: 'Assignment Status', 
      key: 'esiAsTa', 
      width: 160,
      render: (_, r) => r.esiAsTa ? (
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '11px', 
          fontWeight: '700', 
          color: '#16a34a', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          letterSpacing: '0.5px'
        }}>
          ENABLED (ESI as TA)
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
          DISABLED
        </span>
      )
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
          title="ESI as TA Mapping Settings" 
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
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Configure ESI as Travel Allowance Mapping</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Assign ESI reimbursement rules for your staff. For selected staff, ESI deductions will remain visible in the payroll but will be automatically added as Travel Allowance (TA) earnings.
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Switch checked={enabled} onChange={setEnabled} />
                  <span style={{ fontWeight: '600', color: '#334155', fontSize: '13px' }}>Reimburse ESI as Travel Allowance (TA)</span>
                </div>
              </div>

              {mode === 'selected' ? (
                <div style={{ marginTop: 16 }}>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="Search by name, phone or staff ID..." 
                    allowClear 
                    style={{ width: 280, borderRadius: '20px', marginBottom: '16px' }} 
                    value={q} 
                    onChange={(e) => setQ(e.target.value)} 
                  />
                  <Table
                    loading={loading}
                    dataSource={filtered}
                    columns={columns}
                    rowKey="userId"
                    pagination={{ pageSize: 10 }}
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
                    style={{ fontWeight: '600', minWidth: '100px', boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
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
