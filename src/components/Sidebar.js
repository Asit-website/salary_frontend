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
  MailOutlined,
  TeamOutlined,
  ShareAltOutlined,
  ShopOutlined
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
      const perms = typeof user?.permissions === 'string' ? JSON.parse(user.permissions) : (user?.permissions || {});
      return {
        role: user?.role || 'admin',
        channelPartnerId: user?.channelPartnerId || null,
        permissions: perms,
        isSuperadminPanel: !!user?.isSuperadminPanel
      };
    } catch { return { role: 'admin', channelPartnerId: null, permissions: {}, isSuperadminPanel: false }; }
  })();
  const userRole = userInfo.role;
  const channelPartnerId = userInfo.channelPartnerId;
  const headerBrand = userRole === 'superadmin' ? SUPERADMIN_BRAND_TEXT : normalizeBrand(brand);

  const hasSidebarModulePermission = (moduleKey) => {
    if (userRole === 'admin' || userRole === 'superadmin') return true;
    if (moduleKey === 'switch_org') return true;
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
      social: 'community_tab',
      roster: 'roster_tab',
      ai_reports: 'ai_reports_tab',
      ai_assistant: 'ai_assistant_tab',
      recruitment: 'recruitment_tab',
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
      /* {
        key: '/home',
        icon: <ShopOutlined />,
        label: 'Switch Organization',
        module: 'switch_org'
      }, */
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
          {
            key: '/payroll/fnf',
            label: 'Full & Final (FnF)',
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
        icon: <span style={{ fontWeight: 'bold' }}>₹</span>,
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
        module: 'ai_reports',
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
        module: 'ai_assistant'
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
        module: 'roster',
      },
      {
        key: '/recruitment',
        icon: <TeamOutlined />,
        label: 'Recruitment (ATS)',
        module: 'recruitment'
      },
      {
        key: '/community-feed',
        icon: <ShareAltOutlined />,
        label: 'Community Feed',
        module: 'social',
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
    {
      key: '/superadmin/mailing',
      icon: <MailOutlined />,
      label: 'Bulk Email',
    },
    {
      key: '/superadmin/leads',
      icon: <TeamOutlined />,
      label: 'Leads',
    },
    {
      key: '/superadmin/staff',
      icon: <UserOutlined />,
      label: 'Staff',
    },
  ];

  const superadminStaffItems = (() => {
    const perms = userInfo.permissions || {};
    const items = [
      {
        key: '/superadmin/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      }
    ];

    // Always show leads if they have superadmin access? 
    // Or check if they have leads perm explicitly.
    // Based on user request, they have leads perm + want partners and clients.

    if (perms.leads) {
      items.push({
        key: '/superadmin/leads',
        icon: <TeamOutlined />,
        label: 'Leads',
      });
    }

    if (perms.partners) {
      items.push({
        key: '/superadmin/channel-partners',
        icon: <UserOutlined />,
        label: 'Channel Partners',
      });
    }

    if (perms.clients) {
      items.push({
        key: '/superadmin/clients',
        icon: <UserOutlined />,
        label: 'Clients',
      });
    }

    if (perms.mailing) {
      items.push({
        key: '/superadmin/mailing',
        icon: <MailOutlined />,
        label: 'Bulk Email',
      });
    }


    return items;
  })();

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
      const isSalesActive = subscriptionInfo && subscriptionInfo.salesEnabled !== undefined
        ? !!subscriptionInfo.salesEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.salesEnabled : true);
      if (!isSalesActive) {
        message.warning('You do not have permission to access Sales module');
        return;
      }
    }

    // Check for Geolocation access
    if (e.key === '/geolocation') {
      const isGeoActive = subscriptionInfo && subscriptionInfo.geolocationEnabled !== undefined
        ? !!subscriptionInfo.geolocationEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.geolocationEnabled : true);
      if (!isGeoActive) {
        message.warning('You do not have permission to access Geolocation module');
        return;
      }
    }

    // Check for Expense access
    if (e.key === '/expense-management') {
      const isExpActive = subscriptionInfo && subscriptionInfo.expenseEnabled !== undefined
        ? !!subscriptionInfo.expenseEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.expenseEnabled : true);
      if (!isExpActive) {
        message.warning('You do not have permission to access Expense module');
        return;
      }
    }

    // Check for Payroll access
    if (e.key.startsWith('/payroll') || e.key === '/employee-salary' || e.key === '/advances') {
      const isActive = subscriptionInfo && subscriptionInfo.payrollEnabled !== undefined
        ? !!subscriptionInfo.payrollEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.payrollEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access Payroll module');
        return;
      }
    }

    // Check for Performance access
    if (e.key.startsWith('/performance')) {
      const isActive = subscriptionInfo && subscriptionInfo.performanceEnabled !== undefined
        ? !!subscriptionInfo.performanceEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.performanceEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access Performance module');
        return;
      }
    }

    // Check for AI Reports access
    if (e.key.startsWith('/ai-reports/') && e.key !== '/ai-reports/assistant') {
      const isActive = subscriptionInfo && subscriptionInfo.aiReportsEnabled !== undefined
        ? !!subscriptionInfo.aiReportsEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.aiReportsEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access AI Reports');
        return;
      }
    }

    // Check for AI Assistant access
    if (e.key === '/ai-reports/assistant') {
      const isActive = subscriptionInfo && subscriptionInfo.aiAssistantEnabled !== undefined
        ? !!subscriptionInfo.aiAssistantEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.aiAssistantEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access AI Assistant');
        return;
      }
    }

    // Check for Task Management access
    if (e.key === '/task-management') {
      const isActive = subscriptionInfo && subscriptionInfo.taskManagementEnabled !== undefined
        ? !!subscriptionInfo.taskManagementEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.taskManagementEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access Task Management module');
        return;
      }
    }

    // Check for Roster access
    if (e.key === '/roster') {
      const isActive = subscriptionInfo && subscriptionInfo.rosterEnabled !== undefined
        ? !!subscriptionInfo.rosterEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.rosterEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access Roster module');
        return;
      }
    }

    // Check for Recruitment access
    if (e.key === '/recruitment') {
      const isActive = subscriptionInfo && subscriptionInfo.recruitmentEnabled !== undefined
        ? !!subscriptionInfo.recruitmentEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.recruitmentEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access Recruitment (ATS) module');
        return;
      }
    }

    // Check for Community access
    if (e.key === '/community-feed') {
      const isActive = subscriptionInfo && subscriptionInfo.communityEnabled !== undefined
        ? !!subscriptionInfo.communityEnabled
        : (subscriptionInfo?.plan ? !!subscriptionInfo.plan.communityEnabled : true);
      if (!isActive) {
        message.warning('You do not have permission to access Community Feed');
        return;
      }
    }

    navigate(e.key);
  };

  // Determine the selected key based on current pathname
  const getSelectedKey = () => {
    const pathname = location.pathname;

    // Handle asset management sub-routes
    if (pathname.startsWith('/assets-management')) return '/assets-management';

    // Handle payroll sub-routes — FnF must be checked before /payroll
    if (pathname.startsWith('/payroll/fnf')) return '/payroll/fnf';
    if (pathname.startsWith('/payroll')) return '/payroll';
    if (pathname.startsWith('/employee-salary')) return '/employee-salary';

    if (pathname.startsWith('/performance/appraisals')) return '/performance/appraisals';
    if (pathname.startsWith('/performance/ratings')) return '/performance/ratings';
    if (pathname.startsWith('/leave/requests')) return '/leave/requests';
    if (pathname.startsWith('/leave/encashment')) return '/leave/encashment';
    if (pathname.startsWith('/ai-reports/assistant')) return '/ai-reports/assistant';
    if (pathname.startsWith('/ai-reports/salary-forecast')) return '/ai-reports/salary-forecast';
    if (pathname.startsWith('/ai-reports/attendance-productivity')) return '/ai-reports/attendance-productivity';
    if (pathname.startsWith('/ai-reports/risk-detection')) return '/ai-reports/risk-detection';
    if (pathname.startsWith('/ai-reports')) return '/ai-reports/salary-forecast';
    if (pathname.startsWith('/community-feed')) return '/community-feed';
    if (pathname.startsWith('/settings/')) return '/settings';

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
        borderRight: '1px solid #eeeff2',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        height: '100vh',
        zIndex: 100,
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Brand Header */}
      <div style={{
        padding: collapsed ? '16px 8px' : '16px 18px',
        borderBottom: '1px solid #f0f2f5',
        minHeight: '73px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10,
        background: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #1677ff 0%, #4facfe 100%)',
          borderRadius: '0 0 2px 2px',
        }} />

        {collapsed ? (
          (sidebarHeaderType === 'logo' && orgLogo) ? (
            <img src={orgLogo} alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: 8 }} />
          ) : (
            headerBrand ? (
              <div style={{
                width: '38px',
                height: '38px',
                background: 'linear-gradient(135deg, #1677ff 0%, #4facfe 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '800',
                fontSize: '15px',
                boxShadow: '0 3px 10px rgba(22,119,255,0.25)',
                flexShrink: 0,
              }}>
                {headerBrand.substring(0, 2).toUpperCase()}
              </div>
            ) : null
          )
        ) : (
          (sidebarHeaderType === 'logo' && orgLogo) ? (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={orgLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '42px', objectFit: 'contain' }} />
            </div>
          ) : (
            headerBrand && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, #1677ff 0%, #4facfe 100%)',
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '14px',
                  boxShadow: '0 3px 10px rgba(22,119,255,0.25)',
                  flexShrink: 0,
                }}>
                  {headerBrand.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}>
                    {headerBrand}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600, marginTop: 1 }}>Organization</div>
                </div>
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
            userInfo.isSuperadminPanel ? superadminStaffItems :
              userRole === 'channel_partner' ? channelPartnerItems :
                getAdminItems()
        }
        onClick={handleMenuClick}
        style={{
          borderRight: 'none',
          flex: 1,
          paddingTop: 6,
        }}
      />

      {/* Footer logo */}
      <div style={{
        padding: collapsed ? '10px 8px' : '10px 16px',
        textAlign: 'center',
        borderTop: '1px solid #f0f2f5',
        flexShrink: 0,
        background: '#fafbfc',
      }}>
        <img
          src="https://res.cloudinary.com/dgif730br/image/upload/v1768991385/thinktech-logo-blue-300x103_1_kh9gcg.png"
          alt="ThinkTech Logo"
          style={{
            width: collapsed ? 28 : 120,
            height: 'auto',
            opacity: 0.75,
            transition: 'width 0.2s',
          }}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;
