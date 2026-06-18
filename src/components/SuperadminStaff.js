import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  message, Space, Card, Tag, Layout, Typography, Menu, Popconfirm, Row, Col
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  KeyOutlined
} from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const SuperadminStaff = () => {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientStaff, setClientStaff] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [addMode, setAddMode] = useState('existing'); // 'new' or 'existing'
  const [loadingClientStaff, setLoadingClientStaff] = useState(false);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchStaff();
    fetchClients();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/staff');
      if (res.data.success) {
        setStaff(res.data.staff);
      }
    } catch (e) {
      message.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/superadmin/clients');
      if (res.data.success) {
        setClients(res.data.clients);
      }
    } catch (e) {
      console.error('Failed to load clients');
    }
  };

  const fetchClientStaff = async (clientId) => {
    setLoadingClientStaff(true);
    try {
      const res = await api.get(`/superadmin/clients/${clientId}/staff`);
      if (res.data.success) {
        setClientStaff(res.data.staff);
      }
    } catch (e) {
      message.error('Failed to load client staff');
    } finally {
      setLoadingClientStaff(false);
    }
  };

  const handleAdd = () => {
    setEditingStaff(null);
    setAddMode('existing');
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingStaff(record);
    setAddMode('existing');
    form.setFieldsValue({
      phone: record.phone,
      leadsPermission: record.permissions?.leads || 'none',
      partnersPermission: record.permissions?.partners || 'none',
      clientsPermission: record.permissions?.clients || 'none',
      mailingPermission: record.permissions?.mailing || 'none',
      selectedClients: record.permissions?.selectedClients || []
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/superadmin/staff/${id}`);
      message.success('Staff access revoked');
      fetchStaff();
    } catch (e) {
      message.error('Delete failed');
    }
  };

  const handleSubmit = async (values) => {
    try {
      let data = {
        permissions: {
          leads: values.leadsPermission === 'none' ? null : values.leadsPermission,
          partners: values.partnersPermission === 'none' ? null : values.partnersPermission,
          clients: values.clientsPermission === 'none' ? null : values.clientsPermission,
          mailing: values.mailingPermission === 'none' ? null : values.mailingPermission,
          selectedClients: values.clientsPermission === 'manage_selected' ? values.selectedClients : null
        }
      };

      if (addMode === 'existing') {
        data.userId = values.userId;
      } else {
        data.phone = values.phone;
        data.password = values.password;
      }

      if (editingStaff) {
        await api.put(`/superadmin/staff/${editingStaff.id}`, data);
        message.success('Staff updated');
      } else {
        await api.post('/superadmin/staff', data);
        message.success('Staff created/promoted');
      }
      setIsModalVisible(false);
      fetchStaff();
    } catch (e) {
      message.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <div style={{
            width: '32px',
            height: '32px',
            background: '#e6f7ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1890ff',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {name ? name.charAt(0).toUpperCase() : <UserOutlined />}
          </div>
          <span style={{ fontWeight: 500 }}>{name || 'Not Set'}</span>
        </Space>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag color="blue" style={{ textTransform: 'capitalize', borderRadius: '4px', fontWeight: 500 }}>{role}</Tag>
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record) => {
        const p = record.permissions || {};
        const getPermColor = (val) => {
          if (val === 'manage_all') return 'green';
          if (val === 'manage_own') return 'orange';
          if (val === 'manage_selected') return 'cyan';
          return 'default';
        };
        const getPermLabel = (key, val) => {
          const label = val === 'manage_all' ? 'All' : (val === 'manage_own' ? 'Own' : (val === 'manage_selected' ? 'Selected' : 'No Access'));
          return `${key}: ${label}`;
        };
        return (
          <Row gutter={[8, 8]} style={{ maxWidth: '280px' }}>
            <Col span={12}><Tag color={getPermColor(p.leads)} style={{ width: '100%', textAlign: 'center', borderRadius: '4px' }}>{getPermLabel('Leads', p.leads)}</Tag></Col>
            <Col span={12}><Tag color={getPermColor(p.partners)} style={{ width: '100%', textAlign: 'center', borderRadius: '4px' }}>{getPermLabel('Partners', p.partners)}</Tag></Col>
            <Col span={12}>
              <Tag 
                color={getPermColor(p.clients)} 
                style={{ width: '100%', textAlign: 'center', borderRadius: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                title={p.clients === 'manage_selected' ? 'Selected Clients' : ''}
              >
                {p.clients === 'manage_selected' ? (() => {
                  const ids = Array.isArray(p.selectedClients) ? p.selectedClients : [];
                  return `Clients: ${ids.length}`;
                })() : getPermLabel('Clients', p.clients)}
              </Tag>
            </Col>
            <Col span={12}><Tag color={getPermColor(p.mailing)} style={{ width: '100%', textAlign: 'center', borderRadius: '4px' }}>{getPermLabel('Mailing', p.mailing)}</Tag></Col>
          </Row>
        );
      }
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Are you sure you want to delete?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} title="Revoke Access" />
          </Popconfirm>
        </Space>
      ),
    },
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
            <Title level={4} style={{ margin: 0 }}>Superadmin Staff Management</Title>
          </div>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
            <Space>
              <Input.Search
                placeholder="Search by name or phone"
                allowClear
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 280 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Staff User</Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={staff.filter(s => 
              (s.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
              (s.phone || '').includes(searchText)
            )}
            rowKey="id"
            loading={loading}
          />
        </Content>
      </Layout>

      <Modal
        title={editingStaff ? 'Edit Staff' : 'Add Staff User'}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingStaff && (
              <Form.Item label="Add Method">
                <Select value={addMode} onChange={setAddMode} placeholder="Select Method">
                  {/* <Option value="new">Add Method</Option> */}
                  <Option value="existing">Select Existing Organization Staff</Option>
                </Select>
              </Form.Item>
          )}

          {addMode === 'new' ? (
            <>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="10-digit phone" />
              </Form.Item>

              {/* <Form.Item
                name="password"
                label={editingStaff ? "New Password (leave blank to keep current)" : "Password"}
                rules={[{ required: !editingStaff, message: 'Required' }]}
              >
                <Input.Password prefix={<KeyOutlined />} placeholder="Password" />
              </Form.Item> */}
            </>
          ) : (
            <>
              <Form.Item label="Select Organization" rules={[{ required: true }]}>
                <Select showSearch placeholder="Search client" onChange={fetchClientStaff} filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
                  {clients.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="userId" label="Select Staff" rules={[{ required: true }]}>
                <Select placeholder="Select staff member" loading={loadingClientStaff}>
                  {clientStaff.map(s => <Option key={s.id} value={s.id}>{s.profile?.name || s.phone} ({s.phone})</Option>)}
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item
            name="leadsPermission"
            label="Leads Management Permission"
            initialValue="none"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="none">No Access</Option>
              <Option value="manage_own">Manage Own Leads Only</Option>
              <Option value="manage_all">Manage All Leads</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="partnersPermission"
            label="Channel Partner Permission"
            initialValue="none"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="none">No Access</Option>
              <Option value="manage_own">Manage Own Partners Only</Option>
              <Option value="manage_all">Manage All Partners</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="clientsPermission" 
            label="Clients Management Permission" 
            initialValue="none"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="none">No Access</Option>
              <Option value="manage_own">Manage Own Clients Only</Option>
              <Option value="manage_selected">Manage Selected Clients</Option>
              <Option value="manage_all">Manage All Clients</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.clientsPermission !== currentValues.clientsPermission}
          >
            {({ getFieldValue }) => 
              getFieldValue('clientsPermission') === 'manage_selected' ? (
                <Form.Item
                  name="selectedClients"
                  label="Select Clients"
                  rules={[{ required: true, message: 'Please select at least one client' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select organizations"
                    style={{ width: '100%' }}
                    filterOption={(input, option) =>
                      (option?.children || '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {clients.map(c => (
                      <Option key={c.id} value={c.id}>{c.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item 
            name="mailingPermission" 
            label="Bulk Email Permission" 
            initialValue="none"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="none">No Access</Option>
              <Option value="manage_own">Manage Own Emails Only</Option>
              <Option value="manage_all">Manage All Emails</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default SuperadminStaff;
