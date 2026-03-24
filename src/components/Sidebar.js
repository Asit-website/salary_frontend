import React, { useEffect, useState } from 'react';
import { Layout, Menu, message } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  FileProtectOutlined,
  ShoppingOutlined,
  GoldOutlined,
  SafetyOutlined,
  FileTextOutlined,
  SettingOutlined,
  BarChartOutlined,
  BankOutlined,
  WalletOutlined,
  TrophyOutlined,
  RobotOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const DEFAULT_BRAND_TEXT = 'Your Company Name';
  const SUPERADMIN_BRAND_TEXT = 'THINKTECH';
  const [brand, setBrand] = useState(DEFAULT_BRAND_TEXT);
  const [orgLogo, setOrgLogo] = useState('');
  const [sidebarHeaderType, setSidebarHeaderType] = useState('name');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [sidebarPermissionKeys, setSidebarPermissionKeys] = useState([]);
  const normalizeBrand = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return DEFAULT_BRAND_TEXT;
    return raw;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (userRole === 'channel_partner') {
        if (mounted) {
          setBrand('Partner Portal');
          setSidebarHeaderType('name');
        }
        return;
      }
      if (userRole === 'staff') {
        // Staff cannot access /admin/settings/* endpoints.
        try {
          const staffBrandResp = await api.get('/admin/user-access/sidebar-brand');
          const name = staffBrandResp?.data?.brand?.displayName || '';
          const url = staffBrandResp?.data?.info?.logoUrl || '';
          const hType = staffBrandResp?.data?.info?.sidebarHeaderType || 'name';
          if (mounted) {
            setBrand(normalizeBrand(name));
            setOrgLogo(url ? (url.startsWith('/') ? `${API_BASE_URL}${url}` : url) : '');
            setSidebarHeaderType(hType);
          }
        } catch (_) { }
      } else {
        try {
          const resp = await api.get('/admin/settings/brand');
          const name = resp?.data?.brand?.displayName || '';
          if (mounted) setBrand(normalizeBrand(name));
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
      }
      // Load subscription info to control menu items
      try {
        const subResp = await api.get('/subscription/subscription-info');
        if (mounted) setSubscriptionInfo(subResp.data?.subscriptionInfo);
      } catch (_) { }
      // Load badge-based sidebar permissions for current user
      try {
        const permResp = await api.get('/admin/user-access/my-sidebar-permissions');
        const keys = Array.isArray(permResp?.data?.permissionKeys) ? permResp.data.permissionKeys : [];
        if (mounted) setSidebarPermissionKeys(keys);
      } catch (_) {
        if (mounted) setSidebarPermissionKeys([]);
      }
    };
    load();
    const onBrand = (e) => {
      if (e?.detail?.displayName !== undefined) setBrand(normalizeBrand(e.detail.displayName));
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

  const userInfo = (() => {
    try {
      // Check sessionStorage first (for impersonated sessions), then localStorage
      const userStr = sessionStorage.getItem('impersonate_user') || localStorage.getItem('user');
      const user = JSON.parse(userStr);
      return {
        role: user?.role || 'admin',
        channelPartnerId: user?.channelPartnerId || null
      };
    } catch { return { role: 'admin', channelPartnerId: null }; }
  })();
  const userRole = userInfo.role;
  const channelPartnerId = userInfo.channelPartnerId;
  const headerBrand = userRole === 'superadmin' ? SUPERADMIN_BRAND_TEXT : normalizeBrand(brand);

  const hasSidebarModulePermission = (moduleKey) => {
    if (userRole === 'admin' || userRole === 'superadmin') return true;
    const map = {
      dashboard: 'dashboard_tab',
      staff: 'staff_management_tab',
      attendance: 'attendance_tab',
      payroll: 'payroll_tab',
      loans: 'loans_tab',
      sales: 'sales_tab',
      reports: 'reports_tab',
      assets: 'assets_tab',
      expenses: 'expenses_tab',
      geolocation: 'geolocation_tab',
      letters: 'letters_tab',
      settings: 'settings_tab',
      performance: 'performance_tab',
      task_management: 'task_management_tab',
    };
    const key = map[moduleKey];
    return !!key && sidebarPermissionKeys.includes(key);
  };

  // Filter admin items based on subscription AND permissions
  const getAdminItems = () => {
    const items = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        module: 'dashboard'
      },
      {
        key: '/staff-management',
        icon: <UserOutlined />,
        label: 'Staff Management',
        module: 'staff',
      },
      {
        key: '/attendance',
        icon: <CalendarOutlined />,
        label: 'Attendance',
        module: 'attendance'
      },
      {
        key: 'leave-group',
        icon: <CalendarOutlined />,
        label: 'Leave Management',
        module: 'leave',
        children: [
          {
            key: '/leave/requests',
            label: 'Leave Requests',
          },
          {
            key: '/leave/encashment',
            label: 'Leave Encashment Claims',
          },
        ]
      },
      {
        key: 'payroll-group',
        icon: <FileProtectOutlined />,
        label: 'Payroll',
        module: 'payroll',
        children: [
          {
            key: '/payroll',
            label: 'Payroll List',
          },
          {
            key: '/employee-salary',
            label: 'Employee Salary',
          },
        ]
      },
      {
        key: '/loans',
        icon: <BankOutlined />,
        label: 'Loans',
        module: 'loans'
      },
      {
        key: '/advances',
        icon: <DollarOutlined />,
        label: 'Advances',
        module: 'payroll'
      },
      {
        key: '/sales',
        icon: <ShoppingOutlined />,
        label: 'Sales',
        module: 'sales'
      },
      {
        key: '/task-management',
        icon: <FileProtectOutlined />,
        label: 'Task Management',
        module: 'task_management'
      },
      {
        key: 'performance-group',
        icon: <TrophyOutlined />,
        label: 'Performance Management',
        module: 'performance',
        children: [
          {
            key: '/performance/appraisals',
            label: 'Appraisal',
          },
          {
            key: '/performance/ratings',
            label: 'Rating System',
          },
        ]
      },
      {
        key: '/org-reports',
        icon: <BarChartOutlined />,
        label: 'Reports',
        module: 'reports'
      },
      {
        key: 'ai-reports-group',
        icon: <BarChartOutlined />,
        label: 'AI Reports',
        module: 'reports',
        children: [
          {
            key: '/ai-reports/attendance-productivity',
            label: 'Attendance Productivity',
          },
          {
            key: '/ai-reports/salary-forecast',
            label: 'Salary Forecast',
          },
          {
            key: '/ai-reports/risk-detection',
            label: 'Risk Detection',
          },
        ]
      },
      {
        key: '/ai-reports/assistant',
        icon: <RobotOutlined />,
        label: 'AI Assistant',
        module: 'reports'
      },
      {
        key: '/assets-management',
        icon: <GoldOutlined />,
        label: 'Assets',
        module: 'assets'
      },
      {
        key: '/expense-management',
        icon: <WalletOutlined />,
        label: 'Expenses',
        module: 'expenses'
      },
      {
        key: '/geolocation',
        icon: <SafetyOutlined />,
        label: 'Geolocation',
        module: 'geolocation'
      },
      {
        key: '/roster',
        icon: <CalendarOutlined />,
        label: 'Roster',
        module: 'staff',
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Settings',
        module: 'settings'
      },
    ];

    if (userRole === 'admin' && channelPartnerId) {
        items.push({
            key: '/partner/clients',
            icon: <UserOutlined />,
            label: 'My Clients',
            module: 'partner_clients'
        });
    }

    if (userRole === 'staff') {
      return items.filter((item) => hasSidebarModulePermission(item.module));
    }
    return items;
  };

  const superadminItems = [
    {
      key: '/superadmin/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/superadmin/channel-partners',
      icon: <UserOutlined />,
      label: 'Channel Partners',
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

  const channelPartnerItems = [
    {
        key: '/partner/clients',
        icon: <UserOutlined />,
        label: 'My Clients',
    }
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

    // Check for Expense access
    if (e.key === '/expense-management') {
      const isExpActive = !!subscriptionInfo?.expenseEnabled || !!subscriptionInfo?.plan?.expenseEnabled;
      if (!isExpActive) {
        message.warning('You do not have permission to access Expense module');
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
    if (pathname.startsWith('/performance/appraisals')) return '/performance/appraisals';
    if (pathname.startsWith('/performance/ratings')) return '/performance/ratings';
    if (pathname.startsWith('/leave/requests')) return '/leave/requests';
    if (pathname.startsWith('/leave/encashment')) return '/leave/encashment';
    if (pathname.startsWith('/ai-reports/assistant')) return '/ai-reports/assistant';
    if (pathname.startsWith('/ai-reports/salary-forecast')) return '/ai-reports/salary-forecast';
    if (pathname.startsWith('/ai-reports/attendance-productivity')) return '/ai-reports/attendance-productivity';
    if (pathname.startsWith('/ai-reports/risk-detection')) return '/ai-reports/risk-detection';
    if (pathname.startsWith('/ai-reports')) return '/ai-reports/salary-forecast';

    // Handle report query params for sidebar selection
    const search = location.search;
    if (pathname === '/org-reports') {
      if (search.includes('type=leave-balance')) return '/org-reports?type=leave-balance';
      if (search.includes('type=applied-leave')) return '/org-reports?type=applied-leave';
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
    if (pathname.startsWith('/performance/appraisals') || pathname.startsWith('/performance/ratings')) {
      keys.push('performance-group');
    }
    if (pathname.startsWith('/leave/') || (pathname === '/org-reports' && (location.search.includes('leave') || location.search.includes('applied-leave')))) {
      keys.push('leave-group');
    }
    if (
      pathname.startsWith('/ai-reports/salary-forecast') ||
      pathname.startsWith('/ai-reports/attendance-productivity') ||
      pathname.startsWith('/ai-reports/risk-detection')
    ) {
      keys.push('ai-reports-group');
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
            headerBrand ? (
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
                {headerBrand.substring(0, 2).toUpperCase()}
              </div>
            ) : null
          )
        ) : (
          (sidebarHeaderType === 'logo' && orgLogo) ? (
            <div style={{ padding: '4px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <img src={orgLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '45px', objectFit: 'contain' }} />
            </div>
          ) : (
            headerBrand && (
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1890ff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                padding: '0 8px'
              }}>
                {headerBrand}
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
        items={
            userRole === 'superadmin' ? superadminItems : 
            userRole === 'channel_partner' ? channelPartnerItems : 
            getAdminItems()
        }
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
