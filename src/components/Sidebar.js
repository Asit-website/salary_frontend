import React, { useEffect, useState } from 'react';
import { Layout, Menu } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  DollarOutlined, 
  FileTextOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [brand, setBrand] = useState('ThinkTech');
  const [orgLogo, setOrgLogo] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await api.get('/admin/settings/brand');
        const name = resp?.data?.brand?.displayName || 'ThinkTech';
        if (mounted) setBrand(String(name));
      } catch (_) {}
      try {
        const r2 = await api.get('/admin/settings/business-info');
        const url = r2?.data?.info?.logoUrl || '';
        if (mounted) setOrgLogo(url ? (url.startsWith('/') ? `${API_BASE_URL}${url}` : url) : '');
      } catch (_) {}
    };
    load();
    const onBrand = (e) => {
      if (e?.detail?.displayName) setBrand(String(e.detail.displayName));
    };
    const onLogo = (e) => {
      const url = e?.detail?.logoUrl || '';
      setOrgLogo(url ? (String(url).startsWith('/') ? `${API_BASE_URL}${url}` : url) : '');
    };
    window.addEventListener('brand-updated', onBrand);
    window.addEventListener('biz-logo-updated', onLogo);
    return () => { mounted = false; window.removeEventListener('brand-updated', onBrand); window.removeEventListener('biz-logo-updated', onLogo); };
  }, []);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/staff-management',
      icon: <UserOutlined />,
      label: 'Staff Management',
    },
    {
      key: '/attendance',
      icon: <CalendarOutlined />,
      label: 'Attendance',
    },
    {
      key: '/payroll',
      icon: <DollarOutlined />,
      label: 'Payroll',
    },
    {
      key: '/sales',
      icon: <DollarOutlined />,
      label: 'Sales',
    },
    // {
    //   key: '/salary',
    //   icon: <DollarOutlined />,
    //   label: 'Salary',
    // },
    // {
    //   key: '/reports',
    //   icon: <FileTextOutlined />,
    //   label: 'Reports',
    // },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      style={{ 
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        height: '100vh',
        zIndex: 100
      }}
    >
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        textAlign: 'center'
      }}>
        {collapsed ? (
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: '#1890ff', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            TT
          </div>
        ) : (
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#1890ff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {brand}
          </div>
        )}
      </div>
      
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          borderRight: 'none',
          flex: 1
        }}
      />
      
      <div style={{ 
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '8px 16px',
        textAlign: 'center'
      }}>
        {(orgLogo ? [orgLogo] : ["https://res.cloudinary.com/dgif730br/image/upload/v1768991385/thinktech-logo-blue-300x103_1_kh9gcg.png"]).map((src) => (
          collapsed ? (
            <img key="logo-collapsed" src={src} alt="Logo" style={{ width: 32, height: 'auto', opacity: 0.9 }} />
          ) : (
            <img key="logo-expanded" src={src} alt="Logo" style={{ width: 140, height: 'auto', opacity: 0.9 }} />
          )
        ))}
      </div>
    </Sider>
  );
};

export default Sidebar;
