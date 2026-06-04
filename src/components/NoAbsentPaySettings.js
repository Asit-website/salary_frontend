import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Radio, Button, message, Space, Table, Input, InputNumber } from 'antd';
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

export default function NoAbsentPaySettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('none');
  const [globalAmount, setGlobalAmount] = useState(1000);
  const [q, setQ] = useState('');

  const fetchList = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/salary/no-absent-pay');
      const rows = resp?.data?.items || [];
      setItems(rows);

      // Determine initial mode based on rows
      const allHasValue = rows.length > 0 && rows.every(r => Number(r.noAbsentPay) > 0);
      const allZero = rows.length > 0 && rows.every(r => Number(r.noAbsentPay) === 0);
      
      if (allHasValue) {
        setMode('all');
        const firstVal = Number(rows[0].noAbsentPay);
        const allSame = rows.every(r => Number(r.noAbsentPay) === firstVal);
        if (allSame) setGlobalAmount(firstVal);
      } else if (allZero) {
        setMode('none');
      } else {
        setMode('selected');
      }
    } catch (e) {
      message.error('Failed to load No Absent Pay settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Update item amount inline in the table
  const handleAmountChange = (userId, value) => {
    setItems(prev => prev.map(item => {
      if (item.userId === userId) {
        return { ...item, noAbsentPay: value || 0 };
      }
      return item;
    }));
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r =>
      String(r.name || '').toLowerCase().includes(term) ||
      String(r.phone || '').toLowerCase().includes(term) ||
      String(r.staffId || '').toLowerCase().includes(term)
    );
  }, [items, q]);

  const onApplyGlobalAmount = () => {
    setItems(prev => prev.map(item => ({ ...item, noAbsentPay: globalAmount || 0 })));
    message.success(`Applied ₹${globalAmount} to all list entries`);
  };

  const onConfirm = async () => {
    try {
      setSaving(true);
      let payload = [];

      if (mode === 'all') {
        // Send bulk amount update for all users
        const userIds = items.map(r => r.userId);
        if (userIds.length) {
          await api.put('/admin/salary/no-absent-pay-bulk', { userIds, noAbsentPay: globalAmount });
        }
      } else if (mode === 'none') {
        // Clear/Set to 0 for all users
        const userIds = items.map(r => r.userId);
        if (userIds.length) {
          await api.put('/admin/salary/no-absent-pay-bulk', { userIds, noAbsentPay: 0 });
        }
      } else {
        // Send individual updates
        payload = items.map(r => ({
          userId: r.userId,
          noAbsentPay: Number(r.noAbsentPay || 0)
        }));
        if (payload.length) {
          await api.put('/admin/salary/no-absent-pay-bulk', { updates: payload });
        }
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
      title: 'Phone', 
      dataIndex: 'phone', 
      key: 'phone', 
      width: 160,
      render: (text) => <span style={{ color: '#64748b', fontSize: '13px' }}>{text || '—'}</span>
    },
    {
      title: 'No Absent Pay Amount (₹)', 
      key: 'noAbsentPay', 
      width: 220,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={r.noAbsentPay}
          onChange={(val) => handleAmountChange(r.userId, val)}
          disabled={mode === 'none' || mode === 'all'}
          formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/\₹\s?|(,*)/g, '')}
          style={{ width: '150px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />
      )
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="No Absent Pay Settings" 
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
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Configure No Absent Pay (Perfect Attendance Bonus)</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Set a dynamic allowance amount for staff members who maintain perfect attendance with zero absent days in a payroll month. If a staff member has zero absences, their assigned amount will be automatically added to their earnings under "NO ABSENT PAY".
                </div>
              </div>

              {/* Settings Toolbar Panel */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '16px', 
                padding: '20px', 
                background: '#f8fafc', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <Radio.Group 
                    value={mode} 
                    onChange={(e) => setMode(e.target.value)} 
                    optionType="button"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="all" style={{ borderRadius: '6px 0 0 6px' }}>All Staff (Same Amount)</Radio.Button>
                    <Radio.Button value="none">None (Disabled)</Radio.Button>
                    <Radio.Button value="selected" style={{ borderRadius: '0 6px 6px 0' }}>Selected Staff (Custom Amounts)</Radio.Button>
                  </Radio.Group>

                  {(mode === 'all') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Common Pay Amount:</span>
                      <InputNumber
                        min={0}
                        value={globalAmount}
                        onChange={setGlobalAmount}
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        style={{ width: '140px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                      <Button type="dashed" onClick={onApplyGlobalAmount} style={{ borderRadius: '8px' }}>
                        Preview on List
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {mode !== 'none' ? (
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
                    bordered={false}
                  />
                </div>
              ) : (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  color: '#64748b', 
                  background: '#f8fafc', 
                  borderRadius: '12px', 
                  border: '1px dashed #cbd5e1' 
                }}>
                  No Absent Pay is currently disabled. All staff will receive ₹0 attendance bonus. Toggle "All Staff" or "Selected Staff" to configure.
                </div>
              )}

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
