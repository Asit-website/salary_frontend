import React, { useEffect, useState } from 'react';
import { Layout, Menu, message } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  SettingOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  BankOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [brand, setBrand] = useState('');
  const [orgLogo, setOrgLogo] = useState('');
  const [sidebarHeaderType, setSidebarHeaderType] = useState('name');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await api.get('/admin/settings/brand');
        const name = resp?.data?.brand?.displayName || '';
        if (mounted) setBrand(String(name));
      } catch (_) { }
      try {
        const r2 = await api.get('/admin/settings/business-info');
        const url = r2?.data?.info?.logoUrl || '';
        const hType = r2?.data?.info?.sidebarHeaderType || 'name';
        if (mounted) {
          setOrgLogo(url ? (url.startsWith('/') ? `${API_BASE_URL}${url}` : url) : '');
          setSidebarHeaderType(hType);
        }
      } catch (_) { }
      // Load subscription info to control menu items
      try {
        const subResp = await api.get('/subscription/subscription-info');
        if (mounted) setSubscriptionInfo(subResp.data?.subscriptionInfo);
      } catch (_) { }
    };
    load();
    const onBrand = (e) => {
      if (e?.detail?.displayName) setBrand(String(e.detail.displayName));
    };
    const onLogo = (e) => {
      const url = e?.detail?.logoUrl || '';
      setOrgLogo(url ? (String(url).startsWith('/') ? `${API_BASE_URL}${url}` : url) : '');
    };
    const onHeaderType = (e) => {
      if (e?.detail?.sidebarHeaderType) setSidebarHeaderType(e.detail.sidebarHeaderType);
    };
    window.addEventListener('brand-updated', onBrand);
    window.addEventListener('biz-logo-updated', onLogo);
    window.addEventListener('sidebar-header-updated', onHeaderType);
    return () => {
      mounted = false;
      window.removeEventListener('brand-updated', onBrand);
      window.removeEventListener('biz-logo-updated', onLogo);
      window.removeEventListener('sidebar-header-updated', onHeaderType);
    };
  }, []);

  const userRole = (() => {
    try {
      // Check sessionStorage first (for impersonated sessions), then localStorage
      const userStr = sessionStorage.getItem('impersonate_user') || localStorage.getItem('user');
      return JSON.parse(userStr)?.role || 'admin';
    } catch { return 'admin'; }
  })();

  // Filter admin items based on subscription
  const getAdminItems = () => {
    const items = [
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
        key: 'payroll-group',
        icon: <DollarOutlined />,
        label: 'Payroll',
        children: [
          {
            key: '/payroll',
            label: 'Payroll Generate',
          },
          {
            key: '/employee-salary',
            label: 'Employee Salary',
          },
        ],
      },
      {
        key: '/loans',
        icon: <BankOutlined />,
        label: 'Loans',
      },
      {
        key: '/sales',
        icon: <DollarOutlined />,
        label: 'Sales',
      },
      {
        key: '/org-reports',
        icon: <BarChartOutlined />,
        label: 'Reports',
      },
      {
        key: '/assets-management',
        icon: <InboxOutlined />,
        label: 'Assets',
      },
      {
        key: '/expense-management',
        icon: <WalletOutlined />,
        label: 'Expenses',
      },
      {
        key: '/geolocation',
        icon: <EnvironmentOutlined />,
        label: 'Geolocation',
      },
      {
        key: '/settings/letters',
        icon: <FileTextOutlined />,
        label: 'Letters',
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Settings',
      },
    ];

    return items;
  };

  const superadminItems = [
    {
      key: '/superadmin/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/superadmin/clients',
      icon: <UserOutlined />,
      label: 'Clients',
    },
    {
      key: '/superadmin/plans',
      icon: <SettingOutlined />,
      label: 'Plans',
    },
  ];

  const handleMenuClick = (e) => {
    // Check for Sales access
    if (e.key === '/sales') {
      const isSalesActive = !!subscriptionInfo?.salesEnabled || !!subscriptionInfo?.plan?.salesEnabled;
      if (!isSalesActive) {
        message.warning('You do not have permission to access Sales module');
        return;
      }
    }

    // Check for Geolocation access
    if (e.key === '/geolocation') {
      const isGeoActive = !!subscriptionInfo?.geolocationEnabled || !!subscriptionInfo?.plan?.geolocationEnabled;
      if (!isGeoActive) {
        message.warning('You do not have permission to access Geolocation module');
        return;
      }
    }

    navigate(e.key);
  };

  // Determine the selected key based on current pathname
  const getSelectedKey = () => {
    const pathname = location.pathname;

    // Handle asset management sub-routes
    if (pathname.startsWith('/assets-management')) {
      return '/assets-management';
    }

    // Handle payroll sub-routes
    if (pathname.startsWith('/payroll') || pathname.startsWith('/employee-salary')) {
      return pathname.startsWith('/payroll') ? '/payroll' : '/employee-salary';
    }

    // Default to exact pathname match
    return pathname;
  };

  // Determine which submenus should be open based on current pathname
  const getOpenKeys = () => {
    const pathname = location.pathname;
    const keys = [];
    if (pathname.startsWith('/payroll') || pathname.startsWith('/employee-salary')) {
      keys.push('payroll-group');
    }
    return keys;
  };

  return (
    <Sider
      className="sidebar-sider"
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
        textAlign: 'center',
        minHeight: '73px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff'
      }}>
        {collapsed ? (
          (sidebarHeaderType === 'logo' && orgLogo) ? (
            <img src={orgLogo} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          ) : (
            brand ? (
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
                {brand.substring(0, 2).toUpperCase()}
              </div>
            ) : null
          )
        ) : (
          (sidebarHeaderType === 'logo' && orgLogo) ? (
            <div style={{ padding: '4px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <img src={orgLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '45px', objectFit: 'contain' }} />
            </div>
          ) : (
            brand && (
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1890ff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                padding: '0 8px'
              }}>
                {brand}
              </div>
            )
          )
        )}
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        defaultOpenKeys={getOpenKeys()}
        items={userRole === 'superadmin' ? superadminItems : getAdminItems()}
        onClick={handleMenuClick}
        style={{
          borderRight: 'none',
          flex: 1
        }}
      />

      <div style={{
        padding: '8px 16px',
        textAlign: 'center',
        borderTop: '1px solid #f0f0f0',
        flexShrink: 0
      }}>
        <img
          src="https://res.cloudinary.com/dgif730br/image/upload/v1768991385/thinktech-logo-blue-300x103_1_kh9gcg.png"
          alt="ThinkTech Logo"
          style={{
            width: collapsed ? 32 : 140,
            height: 'auto',
            opacity: 0.9
          }}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;
