import React, { useEffect, useState } from 'react';
import { Layout, Typography, Row, Col, Card, Statistic, Table, Tag, message, Skeleton } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SuperadminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/dashboard');
      setData(res.data);
    } catch (e) {
      message.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const counts = data?.counts || { active: 0, disabled: 0, suspended: 0, expired: 0 };
  const revenue = data?.revenue || { month: 0, year: 0 };
  const growth = Array.isArray(data?.growth) ? data.growth : [];

  const growthColumns = [
    { title: 'Month', dataIndex: 'month' },
    { title: 'New Clients', dataIndex: 'clients', width: 140 },
  ];

  // Build a tiny inline SVG line chart for growth
  const GrowthChart = () => {
    const items = growth.slice(-12);
    const values = items.map(i => Number(i.clients || 0));
    const max = Math.max(1, ...values);
    const width = 600; const height = 200; const pad = 30;
    const stepX = items.length > 1 ? (width - pad * 2) / (items.length - 1) : 0;
    const points = items.map((it, idx) => {
      const x = pad + idx * stepX;
      const y = pad + (height - pad * 2) * (1 - (Number(it.clients || 0) / max));
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="200">
        <defs>
          <linearGradient id="gLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1890ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1890ff" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* axes */}
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#e8e8e8" />
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e8e8e8" />
        {/* max label */}
        <text x={5} y={pad + 4} fontSize="10" fill="#999">{max}</text>
        {/* zero label */}
        <text x={5} y={height - pad} fontSize="10" fill="#999">0</text>
        {/* line */}
        {items.length > 1 && (
          <polyline points={points} fill="none" stroke="#1890ff" strokeWidth="2" />
        )}
        {/* dots */}
        {items.map((it, idx) => {
          const x = pad + idx * stepX;
          const y = pad + (height - pad * 2) * (1 - (Number(it.clients || 0) / max));
          return <circle key={idx} cx={x} cy={y} r={3} fill="#1890ff" />
        })}
        {/* month labels */}
        {items.map((it, idx) => {
          const x = pad + idx * stepX;
          return <text key={`m-${idx}`} x={x} y={height - pad + 12} fontSize="10" textAnchor="middle" fill="#888">{it.month.slice(5)}</text>
        })}
      </svg>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
          </div>
          <div style={{ paddingRight: 12 }}>
            <LogoutOutlined onClick={handleLogout} style={{ fontSize: 16, cursor: 'pointer' }} />
          </div>
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          {loading && <Skeleton active paragraph={{ rows: 6 }} />}
          {!loading && (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card><Statistic title="Active Clients" value={counts.active} valueStyle={{ color: '#52c41a' }} /></Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card><Statistic title="Disabled Clients" value={counts.disabled} valueStyle={{ color: '#ff4d4f' }} /></Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card><Statistic title="Suspended Clients" value={counts.suspended} valueStyle={{ color: '#faad14' }} /></Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} md={12}>
                  <Card>
                    <Statistic title="Revenue (This Month)" precision={2} prefix={<span>₹</span>} value={Number(revenue.month || 0)} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={12}>
                  <Card>
                    <Statistic title="Revenue (This Year)" precision={2} prefix={<span>₹</span>} value={Number(revenue.year || 0)} />
                  </Card>
                </Col>
              </Row>

              <Card style={{ marginTop: 16 }} title="Client Growth (Last 12 months)">
                <div style={{ marginBottom: 12 }}>
                  <GrowthChart />
                </div>
                <Table rowKey={(r) => r.month} dataSource={growth} columns={growthColumns} pagination={false} size="small" />
              </Card>
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
