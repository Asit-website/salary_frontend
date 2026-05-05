import React, { useState } from 'react';
import { Card, Typography, Tag, Layout, Button, Row, Col, message, Spin, Modal, Form, Input, Pagination } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShopOutlined,
  ArrowRightOutlined,
  LogoutOutlined,
  GlobalOutlined,
  UserOutlined,
  SafetyOutlined,
  PlusOutlined
} from '@ant-design/icons';
import api from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Try state first, then sessionStorage
  const getInitialData = () => {
    if (location.state && location.state.organizations) {
      return location.state;
    }
    const saved = sessionStorage.getItem('selection_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  };

  const initialData = getInitialData();
  const [organizations, setOrganizations] = useState(initialData.organizations || []);
  const phone = initialData.phone;
  const code = initialData.code;

  const [loadingOrg, setLoadingOrg] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  const hasSuperadminPanel = organizations.some(o => o.isSuperadminPanel);
  const canCreate = !hasSuperadminPanel && initialData.canCreateOrg;

  // We want the Add card on every page, so each page will have 1 Add card + (pageSize - 1) orgs
  const orgsPerPage = canCreate ? pageSize - 1 : pageSize;
  const paginatedOrgs = organizations.slice((currentPage - 1) * orgsPerPage, currentPage * orgsPerPage);
  
  const displayItems = [];
  if (canCreate) {
    displayItems.push({ isAddCard: true });
  }
  displayItems.push(...paginatedOrgs);

  const totalPages = Math.ceil(organizations.length / orgsPerPage);
  const totalItemsForPagination = totalPages * pageSize;

  if (!organizations || organizations.length === 0) {
    return (
      <Layout style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <Card style={{ textAlign: 'center', borderRadius: 16 }}>
          <Title level={4}>No Accounts Found</Title>
          <Button type="primary" onClick={() => navigate('/')}>Go to Login</Button>
        </Card>
      </Layout>
    );
  }

  const handleSelect = async (orgId) => {
    if (loadingOrg) return;
    setLoadingOrg(orgId);
    try {
      let res;
      const currentToken = localStorage.getItem('token');
      const org = organizations.find(o => (String(o.id) === String(orgId) || (o.id === null && orgId === 'null')));

      if (currentToken) {
        // Always try switch-account if we have a token
        res = await api.post('/auth/switch-account', {
          orgId: orgId === null ? 'null' : orgId,
          isSuperadminPanel: org?.isSuperadminPanel
        });
      } else if (code) {
        // Fallback to verify-otp ONLY if no token but we have a code
        res = await api.post('/auth/verify-otp', {
          phone,
          code,
          orgId: orgId === null ? 'null' : orgId,
          isSuperadminPanel: org?.isSuperadminPanel
        });
      } else {
        throw new Error('No active session found. Please login again.');
      }

      if (res.data?.success) {
        const isImpersonating = !!sessionStorage.getItem('impersonate_token');
        if (isImpersonating) {
          sessionStorage.setItem('impersonate_token', res.data.token);
          sessionStorage.setItem('impersonate_user', JSON.stringify(res.data.user));
        } else {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          localStorage.setItem('multi_account', 'true');
        }

        const role = res.data?.user?.role || 'admin';
        const isSuperadminPanel = !!res.data?.user?.isSuperadminPanel;
        const perms = typeof res.data?.user?.permissions === 'string' ? JSON.parse(res.data.user.permissions) : (res.data?.user?.permissions || {});
        const hasSuperAccess = isSuperadminPanel || perms.superadmin_access === true;

        console.log('Account selected:', { role, isSuperadminPanel, hasSuperAccess });

        let dest = '/dashboard';
        if (role === 'superadmin') dest = '/superadmin/clients';
        else if (hasSuperAccess) dest = '/superadmin/dashboard';
        else if (role === 'channel_partner') dest = '/partner/clients';

        console.log('Redirecting to:', dest);
        navigate(dest);
      }
    } catch (e) {
      console.error('Account selection failed', e);
      const msg = e.response?.data?.message || e.message || 'Failed to select account.';
      message.error(msg);
    } finally {
      setLoadingOrg(null);
    }
  };

  const handleCreateOrg = async (values) => {
    setCreating(true);
    try {
      const res = await api.post('/auth/add-organization', values);
      if (res.data?.success) {
        message.success('Organization created successfully!');
        setOrganizations(res.data.organizations);

        // Update sessionStorage too
        const saved = sessionStorage.getItem('selection_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.organizations = res.data.organizations;
          sessionStorage.setItem('selection_data', JSON.stringify(parsed));
        }

        setIsModalVisible(false);
        form.resetFields();
      }
    } catch (e) {
      console.error('Create org failed', e);
      const msg = e.response?.data?.message || 'Failed to create organization.';
      message.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '40px 20px'
    }}>
      <Content style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2} style={{ color: '#0f172a', marginBottom: 8, fontWeight: 700 }}>
            Welcome Back
          </Title>
          {hasSuperadminPanel ? (
            <Text style={{ color: '#64748b', fontSize: 18, fontWeight: 500 }}>
              Do you want to go to your <span style={{ color: '#2563eb' }}>organization admin</span> or <span style={{ color: '#2563eb' }}>permissions</span>? <br />
              <span style={{ fontSize: 14, color: '#94a3b8' }}>Please choose one</span>
            </Text>
          ) : (
            <Text style={{ color: '#64748b', fontSize: 16 }}>
              Multiple accounts found for <span style={{ fontWeight: 600, color: '#0f172a' }}>+91 {phone}</span>. Please choose an organization to continue.
            </Text>
          )}
        </div>

        <Row gutter={[24, 24]} justify="center">
          {displayItems.map((item, idx) => (
            <Col xs={24} sm={12} md={8} key={item.isAddCard ? `add-card-${currentPage}` : (item.id || idx)}>
              {item.isAddCard ? (
                <Card
                  hoverable
                  onClick={() => setIsModalVisible(true)}
                  style={{
                    borderRadius: 20,
                    border: '2px dashed #e2e8f0',
                    background: 'rgba(255, 255, 255, 0.5)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '40px 0'
                  }}
                  bodyStyle={{ textAlign: 'center' }}
                >
                  <PlusOutlined style={{ fontSize: 32, color: '#64748b', marginBottom: 12 }} />
                  <Title level={4} style={{ margin: 0, fontSize: 18, color: '#64748b' }}>
                    Add Organization
                  </Title>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>Create a new business panel</Text>
                </Card>
              ) : (
                <Card
                  hoverable
                  loading={loadingOrg === item.id}
                  onClick={() => handleSelect(item.id)}
                  style={{
                    borderRadius: 20,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  bodyStyle={{
                    padding: 24,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  className="org-selection-card"
                >
                  <div>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20
                    }}>
                      {item.role === 'superadmin' ? (
                        <SafetyOutlined style={{ fontSize: 24, color: '#2563eb' }} />
                      ) : item.role === 'channel_partner' ? (
                        <GlobalOutlined style={{ fontSize: 24, color: '#2563eb' }} />
                      ) : (
                        <ShopOutlined style={{ fontSize: 24, color: '#2563eb' }} />
                      )}
                    </div>

                    <Title level={4} style={{ margin: '0 0 8px 0', fontSize: 18, color: '#1e293b' }}>
                      {item.name === 'Super Admin Leads' ? 'Super Admin Permissions' : (item.name || (item.role === 'superadmin' ? 'Super Admin' : 'Channel Partner'))}
                    </Title>

                    <Tag color={
                      item.role === 'superadmin' ? 'volcano' :
                        item.role === 'channel_partner' ? 'purple' : 'blue'
                    } style={{
                      borderRadius: 6,
                      padding: '2px 10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      fontSize: 10,
                      marginBottom: 16
                    }}>
                      {item.role.replace('_', ' ')}
                    </Tag>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <Text style={{ color: '#64748b', fontSize: 13 }}>Enter Dashboard</Text>
                    <ArrowRightOutlined style={{ color: '#2563eb' }} />
                  </div>
                </Card>
              )}
            </Col>
          ))}
        </Row>

        {organizations.length > orgsPerPage && (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={totalItemsForPagination}
              onChange={setCurrentPage}
              showSizeChanger={false}
              style={{ display: 'inline-block' }}
            />
          </div>
        )}

        <Modal
          title="Create New Organization"
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          centered
          bodyStyle={{ padding: 32 }}
          width={450}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateOrg}
          >
            <Form.Item
              name="name"
              label="Business Name"
              rules={[{ required: true, message: 'Please enter business name' }]}
            >
              <Input placeholder="e.g. My Awesome Company" size="large" />
            </Form.Item>

            <Form.Item
              name="businessEmail"
              label="Business Email"
            >
              <Input placeholder="e.g. info@company.com" size="large" />
            </Form.Item>

            <Form.Item
              name="address"
              label="Address"
            >
              <Input.TextArea placeholder="Enter full address" rows={3} />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={creating}
              style={{ marginTop: 12, height: 48, borderRadius: 8 }}
            >
              Create Organization
            </Button>
          </Form>
        </Modal>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => navigate('/')}
            style={{ color: '#64748b' }}
          >
            Logout
          </Button>
        </div>
      </Content>

      <style dangerouslySetInnerHTML={{
        __html: `
        .org-selection-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border-color: #3b82f6 !important;
        }
        .org-selection-card:hover .ant-typography {
          color: #2563eb !important;
        }
      `}} />
    </Layout>
  );
};

export default Home;
