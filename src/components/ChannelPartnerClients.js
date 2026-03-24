import React, { useEffect, useState } from 'react';
import { Layout, Menu, Table, Tag, Card, Typography, Spin, message, Input, Space, Button, Modal } from 'antd';
import { LogoutOutlined, MenuUnfoldOutlined, MenuFoldOutlined, UserOutlined } from '@ant-design/icons';
import api from '../api';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;

const ChannelPartnerClients = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
  const [selectedClientPlan, setSelectedClientPlan] = useState({});
  const [staffCounts, setStaffCounts] = useState({});
  const [geoStaffCounts, setGeoStaffCounts] = useState({});

  useEffect(() => {
    fetchClients();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/channel-partner/clients');
      if (resp.data.success) {
        setClients(resp.data.clients);
        loadStaffCounts(resp.data.clients);
      } else {
        message.error(resp.data.message || 'Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      message.error('Error fetching clients');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffCounts = async (clients) => {
    const counts = {};
    const geoCounts = {};
    for (const client of clients) {
      try {
        const staffRes = await api.get(`/channel-partner/client/${client.id}/staff-count`);
        counts[client.id] = staffRes.data?.count || 0;

        const geoRes = await api.get(`/channel-partner/client/${client.id}/geo-staff-count`);
        geoCounts[client.id] = geoRes.data?.count || 0;
      } catch (e) { }
    }
    setStaffCounts(counts);
    setGeoStaffCounts(geoCounts);
  };

  const openPlanDetails = async (client) => {
    try {
      const res = await api.get(`/channel-partner/clients/${client.id}/plan-details`);
      setSelectedClientPlan({
        clientName: client.name,
        ...res.data.planDetails
      });
      setPlanDetailsOpen(true);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load plan details');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id) => <span style={{ color: '#8c8c8c' }}>#{id}</span>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span style={{ fontWeight: 500, color: '#1890ff' }}>{name}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : status === 'DISABLED' ? 'red' : 'orange'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      width: 140,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      width: 160,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 400,
      render: (_, rec) => {
        const staffCount = staffCounts[rec.id] || 0;
        const staffLimit = rec.staffLimit || '0';
        const isOverLimit = staffLimit !== 'Unlimited' && staffCount > parseInt(staffLimit);

        const geoStaffCount = geoStaffCounts[rec.id] || 0;
        
        return (
          <Space direction="vertical" size="small">
            <Space>
              <Button size="small" onClick={() => openPlanDetails(rec)}>View Plan</Button>
            </Space>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
              <div>
                <span>Staff: </span>
                <Tag color={isOverLimit ? 'red' : staffCount >= parseInt(staffLimit) * 0.8 ? 'orange' : 'green'}>
                  {staffCount}/{staffLimit}
                </Tag>
                {isOverLimit && <span style={{ color: 'red', marginLeft: 4 }}>⚠️ Over limit</span>}
              </div>
              <div>
                 <span>Geo Staff: </span>
                 <Tag color="blue">{geoStaffCount}</Tag>
              </div>
            </div>
          </Space>
        );
      }
    }
  ];

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
            <Title level={4} style={{ margin: 0 }}>My Clients</Title>
          </div>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Clients</h2>
            <Space>
              <Input.Search
                placeholder="Search by name or phone"
                allowClear
                onSearch={v => setSearchText(v)}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
            </Space>
          </div>

          <Card bordered={false} className="shadow-sm" bodyStyle={{ padding: 0 }}>
            <Table 
              loading={loading}
              dataSource={clients.filter(r => 
                (r.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (r.phone || '').includes(searchText)
              )} 
              columns={columns} 
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Content>

        <Modal
          title="Plan Details"
          open={planDetailsOpen}
          onCancel={() => setPlanDetailsOpen(false)}
          footer={[
            <Button key="close" onClick={() => setPlanDetailsOpen(false)}>Close</Button>
          ]}
          width={600}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Client Name</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedClientPlan.clientName || 'N/A'}</div>
            </div>

            <div>
              <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Plan Name</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedClientPlan.planName || 'No Plan'}</div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Start Date</div>
                <div style={{ fontSize: 14 }}>
                  {selectedClientPlan.startDate ? dayjs(selectedClientPlan.startDate).format('DD MMM YYYY') : 'N/A'}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Expiry Date</div>
                <div style={{ fontSize: 14 }}>
                  {selectedClientPlan.endDate ? dayjs(selectedClientPlan.endDate).format('DD MMM YYYY') : 'N/A'}
                </div>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Status</div>
              <Tag color={selectedClientPlan.status === 'active' ? '#52c41a' : 
                         selectedClientPlan.status === 'expired' ? '#ff4d4f' : '#faad14'}>
                {selectedClientPlan.status ? selectedClientPlan.status.charAt(0).toUpperCase() + selectedClientPlan.status.slice(1) : 'Unknown'}
              </Tag>
            </div>

            {selectedClientPlan.features && Array.isArray(selectedClientPlan.features) && (
              <div>
                <div style={{ marginBottom: 8, color: '#6b7280', fontSize: 12 }}>Features</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedClientPlan.features.map((feature, index) => (
                    <div key={index} style={{ fontSize: 13, color: '#262626' }}>
                      • {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </Layout>
    </Layout>
  );
};

export default ChannelPartnerClients;
