import React from 'react';
import { Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';

const { Content } = Layout;

const PrivateRoute = ({ children }) => {
  // Check sessionStorage first (for impersonated sessions), then localStorage
  const token = sessionStorage.getItem('impersonate_token') || localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {children}
    </Layout>
  );
};

export default PrivateRoute;
