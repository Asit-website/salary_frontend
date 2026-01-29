import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, Button, Typography, Menu, message } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function PayrollList() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [value, setValue] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthText = useMemo(() => {
    const [y, m] = value.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [value]);

  const onOpenCycle = async () => {
    try {
      const res = await api.get('/admin/payroll', { params: { monthKey: value } });
      if (res?.data?.success) {
        // Navigate using YYYY-MM; detail page will fetch cycle by month and then compute
        navigate(`/payroll/${value}`);
      } else {
        message.error('Failed to open cycle');
      }
    } catch (e) {
      message.error('Failed to open cycle');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
            <Title level={4} style={{ margin: 0 }}>Payroll</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
          />
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Card style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <Text strong>Select Month:</Text>
              <input
                type="month"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{ padding: 6, border: '1px solid #E5E7EB', borderRadius: 6 }}
              />
              <Button type="primary" onClick={onOpenCycle}>Open Cycle</Button>
            </div>
            <Text type="secondary">Selected: {monthText}</Text>
            <div style={{ marginTop: 12 }}>
              <Text>Use Open Cycle to view and compute payroll for this month.</Text>
            </div>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
