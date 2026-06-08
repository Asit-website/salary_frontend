import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Button, message, Space, Table, Input, InputNumber } from 'antd';
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

export default function RmoSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [targetHours, setTargetHours] = useState(480);
  const [selectedIds, setSelectedIds] = useState([]);
  const [q, setQ] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch RMO settings
      const settingsResp = await api.get('/admin/rmo-settings');
      const settings = settingsResp?.data?.settings || { targetHours: 480, staffIds: [] };
      setTargetHours(settings.targetHours || 480);
      setSelectedIds(settings.staffIds || []);

      // Fetch all staff
      const staffResp = await api.get('/admin/staff');
      setStaff(staffResp?.data?.staff || staffResp?.data?.data || []);
    } catch (e) {
      message.error('Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter(r =>
      String(r.name || '').toLowerCase().includes(term) ||
      String(r.phone || '').toLowerCase().includes(term) ||
      String(r.staffId || '').toLowerCase().includes(term)
    );
  }, [staff, q]);

  const onConfirm = async () => {
    try {
      setSaving(true);
      const payload = {
        targetHours: Number(targetHours || 480),
        staffIds: selectedIds.map(Number),
      };
      await api.post('/admin/rmo-settings', payload);
      message.success('Settings saved successfully');
      fetchData();
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
      title: 'Department/Designation',
      key: 'deptDesg',
      render: (_, r) => (
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          {[r.department, r.designation].filter(Boolean).join(' / ') || '—'}
        </span>
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
      title: 'RMO Status', 
      key: 'status', 
      width: 160,
      render: (_, r) => selectedIds.includes(r.id) ? (
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
          RMO STAFF
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
          REGULAR
        </span>
      )
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedIds,
    onChange: (keys) => setSelectedIds(keys),
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="RMO Settings" 
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
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Configure RMO Target Hours & Staff Mapping</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Assign staff as Resident Medical Officers (RMOs). RMOs work continuous multi-day duties (open shifts). Their salary is dynamically pro-rated against the monthly target hours defined below.
                </div>
              </div>

              {/* Settings Toolbar Panel */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '16px 20px', 
                background: '#f8fafc', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
              }}>
                <span style={{ fontWeight: '600', color: '#334155', fontSize: '13px' }}>Target Monthly Hours:</span>
                <InputNumber
                  min={1}
                  max={720}
                  style={{ width: 120 }}
                  value={targetHours}
                  onChange={setTargetHours}
                  addonAfter="hrs"
                />
              </div>

              {/* Staff Table */}
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
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  rowSelection={rowSelection}
                  bordered={false}
                />
              </div>

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
