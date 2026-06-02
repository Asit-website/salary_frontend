import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Card, Row, Col, Table, Tag, Button, Input, Space, Typography, message } from 'antd';
import { MobileOutlined, SyncOutlined, CheckCircleOutlined, StopOutlined, WarningOutlined, SearchOutlined, LaptopOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Text } = Typography;

const getInitials = (name) => {
  if (!name) return '??';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
};

const statusTag = (status) => {
  if (status === 'online') return (
    <span style={{ background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <CheckCircleOutlined /> Online
    </span>
  );
  if (status === 'idle') return (
    <span style={{ background: '#fffbe6', color: '#d48806', border: '1px solid #ffe58f', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <WarningOutlined /> Idle
    </span>
  );
  return (
    <span style={{ background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <StopOutlined /> Offline
    </span>
  );
};

const platformBadge = (platform) => {
  if (!platform) return <span style={{ color: '#cbd5e1' }}>—</span>;
  const lower = String(platform).toLowerCase();
  let bg = '#f1f5f9', color = '#475569', border = '#e2e8f0';
  if (lower.includes('mobile') || lower.includes('apk')) { bg = '#eff6ff'; color = '#2563eb'; border = '#bfdbfe'; }
  else if (lower.includes('web')) { bg = '#f5f0ff'; color = '#7c3aed'; border = '#ddd6fe'; }
  else if (lower.includes('admin')) { bg = '#fff7ed'; color = '#c2410c'; border = '#fed7aa'; }
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
      {platform}
    </span>
  );
};

const formatLastSeen = (ts) => {
  if (!ts) return '—';
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return '—';
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function DeviceManagementSettings() {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, online: 0, idle: 0, offline: 0 });
  const [loading, setLoading] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/device-management/devices');
      const list = Array.isArray(resp?.data?.devices) ? resp.data.devices : [];
      setDevices(list);
      setSummary(resp?.data?.summary || {
        total: list.length,
        online: list.filter((d) => d.status === 'online').length,
        idle: list.filter((d) => d.status === 'idle').length,
        offline: list.filter((d) => d.status === 'offline').length,
      });
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load devices');
      setDevices([]);
      setSummary({ total: 0, online: 0, idle: 0, offline: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      `${d.staff} ${d.phone} ${d.model} ${d.platform} ${d.status} ${d.deviceId || ''}`.toLowerCase().includes(q)
    );
  }, [query, devices]);

  // Stat card matching StaffManagement exactly
  const StatCard = ({ label, value, icon, bg, iconColor, shadow, valueColor }) => (
    <Card
      style={{ background: '#ffffff', border: '1px solid #f0f2f5', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', borderRadius: '16px' }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          <div style={{ color: valueColor || '#1f1f1f', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: '46px', height: '46px', background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
          {React.cloneElement(icon, { style: { color: iconColor, fontSize: '20px' } })}
        </div>
      </div>
    </Card>
  );

  const columns = [
    {
      title: 'Staff',
      dataIndex: 'staff',
      key: 'staff',
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            backgroundColor: '#e6f7ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1677ff', fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 6px rgba(22,119,255,0.08)',
            flexShrink: 0,
          }}>
            {getInitials(v)}
          </div>
          <Text strong style={{ color: '#1677ff', fontSize: 14 }}>{v || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (v) => <span style={{ fontSize: 13, color: '#434343', fontWeight: 500 }}>{v || '—'}</span>,
    },
    {
      title: 'Device',
      dataIndex: 'model',
      key: 'model',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: '#f5f0ff', border: '1px solid #ddd6fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#7c3aed', fontSize: 13, flexShrink: 0,
          }}>
            <MobileOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{row.model || 'Unknown Device'}</div>
            {row.deviceId && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{row.deviceId}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (v) => platformBadge(v),
    },
    {
      title: 'App Version',
      dataIndex: 'appVersion',
      key: 'appVersion',
      render: (v) => v ? (
        <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>{v}</span>
      ) : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: 'Last Seen',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      render: (v) => <span style={{ fontSize: 12, color: '#64748b' }}>{formatLastSeen(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => statusTag(v),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Device Management" />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>

          {/* Stat Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                label="Total Devices" value={summary.total}
                icon={<LaptopOutlined />}
                bg="#e6f7ff" iconColor="#1677ff"
                shadow="0 4px 10px rgba(22,119,255,0.1)"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                label="Online" value={summary.online}
                icon={<CheckCircleOutlined />}
                bg="#f6ffed" iconColor="#52c41a"
                shadow="0 4px 10px rgba(82,196,26,0.1)"
                valueColor="#389e0d"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                label="Idle" value={summary.idle}
                icon={<WarningOutlined />}
                bg="#fffbe6" iconColor="#faad14"
                shadow="0 4px 10px rgba(250,173,20,0.1)"
                valueColor="#d48806"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                label="Offline" value={summary.offline}
                icon={<StopOutlined />}
                bg="#fff1f0" iconColor="#ff4d4f"
                shadow="0 4px 10px rgba(255,77,79,0.1)"
                valueColor="#cf1322"
              />
            </Col>
          </Row>

          {/* Device Registry Table */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: 0 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#f5f0ff', border: '1px solid #ddd6fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#7c3aed', fontSize: 15,
                }}>
                  <MobileOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Device Registry</span>
              </div>
            }
            extra={
              <Button
                icon={<SyncOutlined />}
                loading={loading}
                onClick={loadDevices}
                style={{ borderRadius: 20, fontWeight: 600 }}
              >
                Refresh
              </Button>
            }
          >
            {/* Search */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f5' }}>
              <Input
                placeholder="Search staff, phone, device, platform..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                allowClear
                style={{ maxWidth: 380, borderRadius: 20 }}
              />
            </div>
            <Table
              className="sales-table"
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              loading={loading}
              pagination={{ pageSize: 10 }}
              bordered={false}
              scroll={{ x: 900 }}
              locale={{ emptyText: 'No devices found.' }}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
