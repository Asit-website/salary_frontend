import React, { useEffect, useState } from 'react';
import { Layout, Typography, Row, Col, Card, Statistic, Table, Tag, message, Skeleton, Menu, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SuperadminDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperadmin = user.role === 'superadmin';
  const staffName = user.name || 'Staff Member';

  const load = async () => {
    if (!isSuperadmin) return;
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

  useEffect(() => { load(); }, [isSuperadmin]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (!isSuperadmin) {
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
            <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
          </Header>

          <Content style={{ 
            margin: '24px 16px', 
            padding: 24, 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
            height: 'calc(100vh - 64px - 48px)', 
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ 
              textAlign: 'center',
              padding: '60px 40px',
              background: '#fff',
              borderRadius: 32,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: 600,
              width: '100%',
              animation: 'fadeInUp 0.8s ease-out'
            }}>
              <div style={{ 
                width: 120, 
                height: 120, 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px',
                boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
              }}>
                <span style={{ fontSize: 48, color: '#fff', fontWeight: 700 }}>{staffName.charAt(0)}</span>
              </div>
              
              <Title level={1} style={{ 
                marginBottom: 16, 
                fontSize: 42, 
                fontWeight: 800, 
                background: 'linear-gradient(to right, #1e293b, #334155)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-1px'
              }}>
                Hello, {staffName}!
              </Title>
              
              <Typography.Text style={{ 
                fontSize: 18, 
                color: '#64748b',
                display: 'block',
                marginBottom: 32,
                fontWeight: 500
              }}>
                Welcome to the ThinkTech Super Admin Panel. <br/>
                We're glad to have you back!
              </Typography.Text>
              
              <div style={{ 
                height: 4, 
                width: 60, 
                background: '#3b82f6', 
                margin: '0 auto 32px', 
                borderRadius: 2 
              }} />

              <Button 
                type="primary" 
                icon={<HomeOutlined />} 
                size="large"
                onClick={() => navigate('/home')}
                style={{ 
                  borderRadius: 12, 
                  height: 48, 
                  padding: '0 32px',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                }}
              >
                Go to Home
              </Button>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(40px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}} />
          </Content>
        </Layout>
      </Layout>
    );
  }

  const counts = data?.counts || { active: 0, disabled: 0, suspended: 0, expired: 0 };
  const revenue = data?.revenue || { month: 0, year: 0 };
  const growth = Array.isArray(data?.growth) ? data.growth : [];

  const growthColumns = [
    { title: 'Month', dataIndex: 'month' },
    { title: 'New Clients', dataIndex: 'clients', width: 140 },
  ];

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
        <polyline points={points} fill="none" stroke="#1890ff" strokeWidth="2" />
        {items.map((it, idx) => {
          const x = pad + idx * stepX;
          const y = pad + (height - pad * 2) * (1 - (Number(it.clients || 0) / max));
          return <circle key={idx} cx={x} cy={y} r={3} fill="#1890ff" />
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
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card bordered={false} className="stat-card">
                <Statistic title="Active Clients" value={counts.active} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card bordered={false} className="stat-card">
                <Statistic title="Disabled Clients" value={counts.disabled} valueStyle={{ color: '#f5222d' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card bordered={false} className="stat-card">
                <Statistic title="Suspended Clients" value={counts.suspended} valueStyle={{ color: '#faad14' }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={12}>
              <Card bordered={false} className="stat-card">
                <Statistic title="Revenue (This Month)" value={revenue.month} precision={2} prefix="₹" />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card bordered={false} className="stat-card">
                <Statistic title="Revenue (This Year)" value={revenue.year} precision={2} prefix="₹" />
              </Card>
            </Col>
          </Row>

          <Card title="Client Growth (Last 12 months)" bordered={false} style={{ marginTop: 16 }}>
            {loading ? <Skeleton active /> : (
              <Row gutter={24}>
                <Col span={16}>
                  <GrowthChart />
                </Col>
                <Col span={8}>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={growth.slice(-5).reverse()}
                    columns={growthColumns}
                    rowKey="month"
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
