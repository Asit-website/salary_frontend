import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { 
  LogoutOutlined, 
  HomeOutlined, 
  MenuFoldOutlined, 
  MenuUnfoldOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;
const { Title } = Typography;

const MainHeader = ({ collapsed, setCollapsed, title, showHome }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('multi_account');
    sessionStorage.removeItem('selection_data');
    navigate('/');
  };

  const isMultiAccount = localStorage.getItem('multi_account') === 'true' || !!sessionStorage.getItem('impersonate_token');

  return (
    <Header style={{ 
      padding: 0, 
      background: '#fff', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      position: 'sticky', 
      top: 0, 
      zIndex: 90,
      boxShadow: '0 1px 4px rgba(0,21,41,.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
          className: 'trigger',
          onClick: () => setCollapsed(!collapsed),
          style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' }
        })}
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
      </div>
      <Menu
        theme="light"
        mode="horizontal"
        style={{ borderBottom: 'none' }}
        items={[
          ...(isMultiAccount && showHome ? [{
            key: 'home',
            icon: <HomeOutlined />,
            label: 'Go Home',
            onClick: () => navigate('/home')
          }] : []),
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            onClick: handleLogout
          }
        ]}
      />
    </Header>
  );
};

export default MainHeader;
