import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Card, Typography, Row, Col, Table, Tag, Button, Input, Space, Menu, message } from 'antd';
import { MobileOutlined, LogoutOutlined, SyncOutlined, CheckCircleOutlined, StopOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const statusTag = (status) => {
  if (status === 'online') return <Tag color="green" icon={<CheckCircleOutlined />}>Online</Tag>;
  if (status === 'idle') return <Tag color="gold" icon={<WarningOutlined />}>Idle</Tag>;
  return <Tag color="red" icon={<StopOutlined />}>Offline</Tag>;
};

const formatLastSeen = (ts) => {
  if (!ts) return '-';
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return '-';
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
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, online: 0, idle: 0, offline: 0 });
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

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

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      `${d.staff} ${d.phone} ${d.model} ${d.platform} ${d.status} ${d.deviceId || ''}`.toLowerCase().includes(q)
    );
  }, [query, devices]);

  const columns = [
    { title: 'Staff', dataIndex: 'staff', key: 'staff', render: (v) => <Text strong>{v}</Text> },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Device',
      dataIndex: 'model',
      key: 'model',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text>{row.model || 'Unknown Device'}</Text>
          {row.deviceId ? <Text type="secondary" style={{ fontSize: 12 }}>{row.deviceId}</Text> : null}
        </Space>
      ),
    },
    { title: 'Platform', dataIndex: 'platform', key: 'platform' },
    { title: 'App Version', dataIndex: 'appVersion', key: 'appVersion' },
    { title: 'Last Seen', dataIndex: 'lastSeenAt', key: 'lastSeenAt', render: (v) => formatLastSeen(v) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => statusTag(v) },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Device Management</Title>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
            style={{ borderRight: 'none', backgroundColor: 'transparent' }}
          />
        </Header>

        <Content style={{ padding: 24 }}>
          <Card bordered={false} style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small"><Text type="secondary">Total Devices</Text><Title level={3} style={{ margin: '8px 0 0' }}>{summary.total}</Title></Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small"><Text type="secondary">Online</Text><Title level={3} style={{ margin: '8px 0 0', color: '#389e0d' }}>{summary.online}</Title></Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small"><Text type="secondary">Idle</Text><Title level={3} style={{ margin: '8px 0 0', color: '#d48806' }}>{summary.idle}</Title></Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small"><Text type="secondary">Offline</Text><Title level={3} style={{ margin: '8px 0 0', color: '#cf1322' }}>{summary.offline}</Title></Card>
              </Col>
            </Row>
          </Card>

          <Card
            title={<Space><MobileOutlined /> Device Registry</Space>}
            extra={<Button icon={<SyncOutlined />} loading={loading} onClick={loadDevices}>Refresh</Button>}
          >
            <div style={{ marginBottom: 12 }}>
              <Input.Search
                placeholder="Search staff, phone, device, platform..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                allowClear
                style={{ maxWidth: 380 }}
              />
            </div>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
