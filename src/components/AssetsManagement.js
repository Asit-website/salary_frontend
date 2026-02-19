import React, { useState, useEffect } from 'react';
import moment from 'moment';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Upload,
  message,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Statistic,
  Progress,
  Layout,
  Menu,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  UploadOutlined,
  InboxOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const AssetsManagement = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    assignedTo: ''
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [returnForm] = Form.useForm();

  const { Header, Content } = Layout;

  // Load assets
  const loadAssets = async (params = {}) => {
    try {
      setLoading(true);
      const response = await api.get('/admin/assets', {
        params: {
          page: pagination.current,
          limit: pagination.pageSize,
          search: filters.search,
          category: filters.category,
          status: filters.status,
          assignedTo: filters.assignedTo,
          ...params
        }
      });

      if (response.data.success) {
        setAssets(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total
        }));
        setCategories(response.data.filters.categories);
      }
    } catch (error) {
      message.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await api.get('/admin/assets/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Load staff for assignments
  const loadStaff = async () => {
    try {
      const response = await api.get('/admin/staff');
      if (response.data.success) {
        setStaff(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load staff:', error);
    }
  };

  useEffect(() => {
    loadAssets();
    loadStats();
    loadStaff();
  }, []);

  // Handle table pagination change
  const handleTableChange = (pagination) => {
    setPagination(pagination);
    loadAssets();
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Apply filters
  const applyFilters = () => {
    loadAssets();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: '',
      assignedTo: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setTimeout(() => loadAssets(), 0);
  };

  // Create or update asset
  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
        warrantyExpiry: values.warrantyExpiry ? values.warrantyExpiry.format('YYYY-MM-DD') : null,
        lastMaintenanceDate: values.lastMaintenanceDate ? values.lastMaintenanceDate.format('YYYY-MM-DD') : null,
        nextMaintenanceDate: values.nextMaintenanceDate ? values.nextMaintenanceDate.format('YYYY-MM-DD') : null,
      };

      if (selectedAsset) {
        await api.put(`/admin/assets/${selectedAsset.id}`, payload);
        message.success('Asset updated successfully');
      } else {
        await api.post('/admin/assets', payload);
        message.success('Asset created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      setSelectedAsset(null);
      loadAssets();
      loadStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save asset');
    }
  };

  // Delete asset
  const handleDelete = async (assetId) => {
    try {
      await api.delete(`/admin/assets/${assetId}`);
      message.success('Asset deleted successfully');
      loadAssets();
      loadStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete asset');
    }
  };

  // Assign asset
  const handleAssign = async (values) => {
    try {
      await api.post(`/admin/assets/${selectedAsset.id}/assign`, values);
      message.success('Asset assigned successfully');
      setAssignModalVisible(false);
      assignForm.resetFields();
      setSelectedAsset(null);
      loadAssets();
      loadStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to assign asset');
    }
  };

  // Return asset
  const handleReturn = async (values) => {
    try {
      await api.post(`/admin/assets/${selectedAsset.id}/return`, values);
      message.success('Asset returned successfully');
      setReturnModalVisible(false);
      returnForm.resetFields();
      setSelectedAsset(null);
      loadAssets();
      loadStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to return asset');
    }
  };

  // Open edit modal
  const handleEdit = (asset) => {
    setSelectedAsset(asset);
    form.setFieldsValue({
      ...asset,
      purchaseDate: asset.purchaseDate ? moment(asset.purchaseDate) : null,
      warrantyExpiry: asset.warrantyExpiry ? moment(asset.warrantyExpiry) : null,
      lastMaintenanceDate: asset.lastMaintenanceDate ? moment(asset.lastMaintenanceDate) : null,
      nextMaintenanceDate: asset.nextMaintenanceDate ? moment(asset.nextMaintenanceDate) : null,
    });
    setModalVisible(true);
  };

  // Open assign modal
  const handleAssignModal = (asset) => {
    setSelectedAsset(asset);
    setAssignModalVisible(true);
  };

  // Open return modal
  const handleReturnModal = (asset) => {
    setSelectedAsset(asset);
    setReturnModalVisible(true);
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      available: 'green',
      in_use: 'blue',
      maintenance: 'orange',
      retired: 'red',
      lost: 'red'
    };
    return colors[status] || 'default';
  };

  // Condition color mapping
  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'green',
      good: 'blue',
      fair: 'orange',
      poor: 'red'
    };
    return colors[condition] || 'default';
  };

  const columns = [
    {
      title: 'Asset Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          {record.serialNumber && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              S/N: {record.serialNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Brand/Model',
      key: 'brandModel',
      render: (text, record) => (
        <div>
          {record.brand && <div>{record.brand}</div>}
          {record.model && <div style={{ fontSize: '12px', color: '#666' }}>{record.model}</div>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      render: (condition) => (
        <Tag color={getConditionColor(condition)}>
          {condition?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assignedTo',
      render: (text, record) => {
        if (record.assignedUser) {
          return (
            <div>
              <div>{record.assignedUser.phone}</div>
              {record.assignedUser.profile?.name && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {record.assignedUser.profile.name}
                </div>
              )}
            </div>
          );
        }
        return <span style={{ color: '#999' }}>Unassigned</span>;
      },
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location) => location || <span style={{ color: '#999' }}>Not set</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>

          {record.status === 'available' && (
            <Tooltip title="Assign">
              <Button
                type="link"
                icon={<UserOutlined />}
                onClick={() => handleAssignModal(record)}
              />
            </Tooltip>
          )}

          {record.status === 'in_use' && (
            <Tooltip title="Return">
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleReturnModal(record)}
              />
            </Tooltip>
          )}

          <Popconfirm
            title="Are you sure you want to delete this asset?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />

      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            padding: 0,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '18px',
                padding: '0 24px'
              }}
            />
            <Title level={4} style={{ margin: 0 }}>Assets Management</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
          />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div>
            {/* Statistics Cards */}
            {stats && (
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Total Assets"
                      value={stats.total}
                      prefix={<InboxOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Available"
                      value={stats.statusStats?.available || 0}
                      valueStyle={{ color: '#3f8600' }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="In Use"
                      value={stats.statusStats?.in_use || 0}
                      valueStyle={{ color: '#1890ff' }}
                      prefix={<UserOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Maintenance Due"
                      value={stats.maintenanceDue || 0}
                      valueStyle={{ color: '#fa8c16' }}
                      prefix={<ToolOutlined />}
                    />
                  </Card>
                </Col>
              </Row>
            )}

            <Card
              title="Assets Management"
              extra={
                <Space>
                  <Button
                    icon={<UserOutlined />}
                    onClick={() => navigate('/assets-management/asset-assignments')}
                  >
                    Asset Assignments
                  </Button>
                  <Button
                    icon={<ToolOutlined />}
                    onClick={() => navigate('/assets-management/asset-maintenance')}
                  >
                    Asset Maintenance
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedAsset(null);
                      form.resetFields();
                      setModalVisible(true);
                    }}
                  >
                    Add Asset
                  </Button>
                </Space>
              }
            >
              {/* Filters */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Search
                    placeholder="Search assets..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onSearch={applyFilters}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Category"
                    value={filters.category || undefined}
                    onChange={(value) => handleFilterChange('category', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {categories.map(cat => (
                      <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Status"
                    value={filters.status || undefined}
                    onChange={(value) => handleFilterChange('status', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="available">Available</Option>
                    <Option value="in_use">In Use</Option>
                    <Option value="maintenance">Maintenance</Option>
                    <Option value="retired">Retired</Option>
                    <Option value="lost">Lost</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Assigned To"
                    value={filters.assignedTo || undefined}
                    onChange={(value) => handleFilterChange('assignedTo', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {staff.map(member => (
                      <Option key={member.id} value={member.id}>
                        {member.name}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <Space>
                    <Button onClick={applyFilters} icon={<SearchOutlined />}>
                      Search
                    </Button>
                    <Button onClick={resetFilters}>Reset</Button>
                  </Space>
                </Col>
              </Row>

              {/* Assets Table */}
              <Table
                columns={columns}
                dataSource={assets}
                rowKey="id"
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} assets`,
                }}
                onChange={handleTableChange}
              />
            </Card>

            {/* Add/Edit Asset Modal */}
            <Modal
              title={selectedAsset ? 'Edit Asset' : 'Add New Asset'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setSelectedAsset(null);
              }}
              footer={null}
              width={800}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="name"
                      label="Asset Name"
                      rules={[{ required: true, message: 'Please enter asset name' }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="category"
                      label="Category"
                      rules={[{ required: true, message: 'Please select category' }]}
                    >
                      <Select>
                        <Option value="laptop">Laptop</Option>
                        <Option value="desktop">Desktop</Option>
                        <Option value="mobile">Mobile</Option>
                        <Option value="tablet">Tablet</Option>
                        <Option value="printer">Printer</Option>
                        <Option value="scanner">Scanner</Option>
                        <Option value="monitor">Monitor</Option>
                        <Option value="keyboard">Keyboard</Option>
                        <Option value="mouse">Mouse</Option>
                        <Option value="furniture">Furniture</Option>
                        <Option value="vehicle">Vehicle</Option>
                        <Option value="other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="serialNumber" label="Serial Number">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="brand" label="Brand">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="model" label="Model">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="purchaseDate" label="Purchase Date">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="purchaseCost" label="Purchase Cost">
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="currentValue" label="Current Value">
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="condition" label="Condition" initialValue="good">
                      <Select>
                        <Option value="excellent">Excellent</Option>
                        <Option value="good">Good</Option>
                        <Option value="fair">Fair</Option>
                        <Option value="poor">Poor</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="status" label="Status" initialValue="available">
                      <Select>
                        <Option value="available">Available</Option>
                        <Option value="in_use">In Use</Option>
                        <Option value="maintenance">Maintenance</Option>
                        <Option value="retired">Retired</Option>
                        <Option value="lost">Lost</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="location" label="Location">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="warrantyExpiry" label="Warranty Expiry">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="nextMaintenanceDate" label="Next Maintenance Date">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label="Description">
                  <TextArea rows={3} />
                </Form.Item>

                <Form.Item name="notes" label="Notes">
                  <TextArea rows={3} />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      {selectedAsset ? 'Update' : 'Create'}
                    </Button>
                    <Button onClick={() => {
                      setModalVisible(false);
                      form.resetFields();
                      setSelectedAsset(null);
                    }}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Assign Asset Modal */}
            <Modal
              title="Assign Asset"
              open={assignModalVisible}
              onCancel={() => {
                setAssignModalVisible(false);
                assignForm.resetFields();
                setSelectedAsset(null);
              }}
              footer={null}
            >
              <Form
                form={assignForm}
                layout="vertical"
                onFinish={handleAssign}
              >
                <Form.Item
                  name="assignedTo"
                  label="Assign To"
                  rules={[{ required: true, message: 'Please select staff member' }]}
                >
                  <Select placeholder="Select staff member">
                    {staff.map(member => (
                      <Option key={member.id} value={member.id}>
                        {member.name} - {member.profile?.department || 'No department'}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="notes" label="Notes">
                  <TextArea rows={3} placeholder="Add any notes about this assignment..." />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      Assign Asset
                    </Button>
                    <Button onClick={() => {
                      setAssignModalVisible(false);
                      assignForm.resetFields();
                      setSelectedAsset(null);
                    }}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Return Asset Modal */}
            <Modal
              title="Return Asset"
              open={returnModalVisible}
              onCancel={() => {
                setReturnModalVisible(false);
                returnForm.resetFields();
                setSelectedAsset(null);
              }}
              footer={null}
            >
              <Form
                form={returnForm}
                layout="vertical"
                onFinish={handleReturn}
              >
                <Form.Item name="conditionAtReturn" label="Condition at Return" initialValue="good">
                  <Select>
                    <Option value="excellent">Excellent</Option>
                    <Option value="good">Good</Option>
                    <Option value="fair">Fair</Option>
                    <Option value="poor">Poor</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="notes" label="Notes">
                  <TextArea rows={3} placeholder="Add any notes about the return..." />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      Return Asset
                    </Button>
                    <Button onClick={() => {
                      setReturnModalVisible(false);
                      returnForm.resetFields();
                      setSelectedAsset(null);
                    }}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AssetsManagement;
