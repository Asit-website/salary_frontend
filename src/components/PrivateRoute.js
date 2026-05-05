import React from 'react';
import { Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';

const { Content } = Layout;

const PrivateRoute = ({ children, allowedRoles }) => {
  const token = sessionStorage.getItem('impersonate_token') || localStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('impersonate_user') || localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const isSuperadminPanel = !!user.isSuperadminPanel;
  const perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || {});
  const hasSuperAccess = isSuperadminPanel || perms.superadmin_access === true;
  const role = user.role;

  console.log('PrivateRoute check:', { path: window.location.pathname, role, isSuperadminPanel, hasSuperAccess, allowedRoles });

  if (allowedRoles) {
    const requiresSuper = allowedRoles.includes('superadmin') || allowedRoles.includes('superadmin_staff');
    const hasAccess = allowedRoles.includes(role) || (isSuperadminPanel && requiresSuper);

    if (!hasAccess) {
      console.log('Access denied, redirecting...');
      if (role === 'superadmin') return <Navigate to="/superadmin/clients" replace />;
      if (isSuperadminPanel) return <Navigate to="/superadmin/dashboard" replace />;
      if (role === 'channel_partner') return <Navigate to="/partner/clients" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {children}
    </Layout>
  );
};

export default PrivateRoute;
