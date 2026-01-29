import React from 'react';
import { Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';

const { Content } = Layout;

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
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
