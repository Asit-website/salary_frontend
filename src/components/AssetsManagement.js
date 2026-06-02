import React, { useState, useEffect } from 'react';
import moment from 'moment';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Row,
  Col,
  Layout,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  InboxOutlined,
  ToolOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { Content } = Layout;

const AssetsManagement = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
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

  const columns = [
    {
      title: 'Asset Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: '600', color: '#1677ff' }}>{text}</div>
          {record.serialNumber && (
            <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>
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
      render: (text) => <span className="sales-status-tag sales-status-active" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{text}</span>,
    },
    {
      title: 'Brand/Model',
      key: 'brandModel',
      render: (text, record) => (
        <div>
          {record.brand && <div style={{ fontWeight: '500', color: '#262626' }}>{record.brand}</div>}
          {record.model && <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '1px' }}>{record.model}</div>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const map = {
          available: 'sales-status-complete',
          in_use: 'sales-status-active',
          maintenance: 'sales-status-pending',
          retired: 'sales-status-inactive',
          lost: 'sales-status-inactive'
        };
        const cls = map[status] || 'sales-status-pending';
        return (
          <span className={`sales-status-tag ${cls}`} style={{ textTransform: 'capitalize', fontSize: '12px' }}>
            {status?.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      render: (condition) => {
        const map = {
          excellent: 'sales-status-complete',
          good: 'sales-status-active',
          fair: 'sales-status-pending',
          poor: 'sales-status-inactive'
        };
        const cls = map[condition] || 'sales-status-pending';
        return (
          <span className={`sales-status-tag ${cls}`} style={{ textTransform: 'capitalize', fontSize: '12px' }}>
            {condition}
          </span>
        );
      },
    },
    {
      title: 'Assigned To',
      key: 'assignedTo',
      render: (text, record) => {
        if (record.assignedUser) {
          const name = record.assignedUser.profile?.name || 'Assigned User';
          return (
            <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#e6f7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px',
                color: '#1677ff',
                fontWeight: '700',
                fontSize: '12px',
                boxShadow: '0 2px 6px rgba(22, 119, 255, 0.04)'
              }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div style={{ whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: '600', color: '#1677ff', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '1px', whiteSpace: 'nowrap' }}>{record.assignedUser.phone}</div>
              </div>
            </div>
          );
        }
        return <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>Unassigned</span>;
      },
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location) => location || <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>Not set</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <Button 
            size="small" 
            shape="round"
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>

          {record.status === 'available' && (
            <Button
              size="small" 
              shape="round"
              type="primary"
              icon={<UserOutlined />}
              onClick={() => handleAssignModal(record)}
            >
              Assign
            </Button>
          )}

          {record.status === 'in_use' && (
            <Button
              size="small" 
              shape="round"
              type="default"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              onClick={() => handleReturnModal(record)}
            >
              Return
            </Button>
          )}

          <Popconfirm
            title="Are you sure you want to delete this asset?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ shape: 'round' }}
            cancelButtonProps={{ shape: 'round' }}
          >
            <Button
              size="small" 
              shape="round"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />

      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Assets Management" 
        />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div>
            {/* dynamic custom kpi card row with justifyContent: center centered icons */}
            {stats && (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Total Assets</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#262626', lineHeight: '1.2' }}>{stats.total}</div>
                      </div>
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: '20px', boxShadow: '0 4px 10px rgba(22, 119, 255, 0.1)' }}>
                        <InboxOutlined />
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Available</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#52c41a', lineHeight: '1.2' }}>{stats.statusStats?.available || 0}</div>
                      </div>
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: '20px', boxShadow: '0 4px 10px rgba(82, 196, 26, 0.1)' }}>
                        <CheckCircleOutlined />
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>In Use</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#722ed1', lineHeight: '1.2' }}>{stats.statusStats?.in_use || 0}</div>
                      </div>
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f9f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#722ed1', fontSize: '20px', boxShadow: '0 4px 10px rgba(114, 46, 209, 0.1)' }}>
                        <UserOutlined />
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Maintenance Due</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#fa8c16', lineHeight: '1.2' }}>{stats.maintenanceDue || 0}</div>
                      </div>
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fa8c16', fontSize: '20px', boxShadow: '0 4px 10px rgba(250, 140, 22, 0.1)' }}>
                        <ToolOutlined />
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}

            <Card
              className="sales-content-card"
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '16px' }}>
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Active Asset Inventory</Title>
                <Space size={12}>
                  <Button
                    shape="round"
                    icon={<UserOutlined />}
                    onClick={() => navigate('/assets-management/asset-assignments')}
                  >
                    Asset Assignments
                  </Button>
                  <Button
                    shape="round"
                    icon={<ToolOutlined />}
                    onClick={() => navigate('/assets-management/asset-maintenance')}
                  >
                    Asset Maintenance
                  </Button>
                  <Button
                    type="primary"
                    shape="round"
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
              </div>

              {/* Filters Panel */}
              <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                  <Search
                    placeholder="Search assets..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onSearch={applyFilters}
                    style={{ width: 250, borderRadius: '8px' }}
                  />
                  <Select
                    placeholder="Category"
                    value={filters.category || undefined}
                    onChange={(value) => handleFilterChange('category', value)}
                    allowClear
                    style={{ width: 160 }}
                    dropdownStyle={{ borderRadius: '8px' }}
                  >
                    {categories.map(cat => (
                      <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                  </Select>
                  <Select
                    placeholder="Status"
                    value={filters.status || undefined}
                    onChange={(value) => handleFilterChange('status', value)}
                    allowClear
                    style={{ width: 160 }}
                    dropdownStyle={{ borderRadius: '8px' }}
                  >
                    <Option value="available">Available</Option>
                    <Option value="in_use">In Use</Option>
                    <Option value="maintenance">Maintenance</Option>
                    <Option value="retired">Retired</Option>
                    <Option value="lost">Lost</Option>
                  </Select>
                  <Select
                    placeholder="Assigned To"
                    value={filters.assignedTo || undefined}
                    onChange={(value) => handleFilterChange('assignedTo', value)}
                    allowClear
                    style={{ width: 180 }}
                    dropdownStyle={{ borderRadius: '8px' }}
                  >
                    {staff.map(member => (
                      <Option key={member.id} value={member.id}>
                        {member.name}
                      </Option>
                    ))}
                  </Select>
                </div>
                <Space>
                  <Button type="primary" shape="round" onClick={applyFilters} icon={<SearchOutlined />}>
                    Search
                  </Button>
                  <Button shape="round" onClick={resetFilters}>Reset</Button>
                </Space>
              </div>

              {/* Assets Table */}
              <Table
                columns={columns}
                dataSource={assets}
                rowKey="id"
                loading={loading}
                className="sales-table"
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
              title={selectedAsset ? 'Edit Asset Particulars' : 'Add New Asset to Registry'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setSelectedAsset(null);
              }}
              footer={null}
              width={800}
              className="sales-modal"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                style={{ marginTop: '12px' }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="name"
                      label={<span className="modal-field-label">Asset Name</span>}
                      rules={[{ required: true, message: 'Please enter asset name' }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="category"
                      label={<span className="modal-field-label">Category</span>}
                      rules={[{ required: true, message: 'Please select category' }]}
                    >
                      <Select dropdownStyle={{ borderRadius: '8px' }}>
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
                    <Form.Item name="serialNumber" label={<span className="modal-field-label">Serial Number</span>}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="brand" label={<span className="modal-field-label">Brand</span>}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="model" label={<span className="modal-field-label">Model</span>}>
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="purchaseDate" label={<span className="modal-field-label">Purchase Date</span>}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="purchaseCost" label={<span className="modal-field-label">Purchase Cost</span>}>
                      <InputNumber
                        style={{ width: '100%' }}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="currentValue" label={<span className="modal-field-label">Current Value</span>}>
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
                    <Form.Item name="condition" label={<span className="modal-field-label">Condition</span>} initialValue="good">
                      <Select dropdownStyle={{ borderRadius: '8px' }}>
                        <Option value="excellent">Excellent</Option>
                        <Option value="good">Good</Option>
                        <Option value="fair">Fair</Option>
                        <Option value="poor">Poor</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="status" label={<span className="modal-field-label">Status</span>} initialValue="available">
                      <Select dropdownStyle={{ borderRadius: '8px' }}>
                        <Option value="available">Available</Option>
                        <Option value="in_use">In Use</Option>
                        <Option value="maintenance">Maintenance</Option>
                        <Option value="retired">Retired</Option>
                        <Option value="lost">Lost</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="location" label={<span className="modal-field-label">Location</span>}>
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="warrantyExpiry" label={<span className="modal-field-label">Warranty Expiry</span>}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="nextMaintenanceDate" label={<span className="modal-field-label">Next Maintenance Date</span>}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label={<span className="modal-field-label">Description</span>}>
                  <TextArea rows={3} placeholder="Describe the specifications of this asset..." />
                </Form.Item>

                <Form.Item name="notes" label={<span className="modal-field-label">Notes</span>}>
                  <TextArea rows={3} placeholder="Add optional operational notes..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space size={10}>
                    <Button onClick={() => {
                      setModalVisible(false);
                      form.resetFields();
                      setSelectedAsset(null);
                    }} shape="round">
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" shape="round">
                      {selectedAsset ? 'Save Changes' : 'Add Asset'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Assign Asset Modal */}
            <Modal
              title="Assign Asset to Employee"
              open={assignModalVisible}
              onCancel={() => {
                setAssignModalVisible(false);
                assignForm.resetFields();
                setSelectedAsset(null);
              }}
              footer={null}
              className="sales-modal"
            >
              <Form
                form={assignForm}
                layout="vertical"
                onFinish={handleAssign}
                style={{ marginTop: '12px' }}
              >
                <Form.Item
                  name="assignedTo"
                  label={<span className="modal-field-label">Assign To</span>}
                  rules={[{ required: true, message: 'Please select staff member' }]}
                >
                  <Select placeholder="Select staff member" dropdownStyle={{ borderRadius: '8px' }}>
                    {staff.map(member => (
                      <Option key={member.id} value={member.id}>
                        {member.name} - {member.profile?.department || 'No department'}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="notes" label={<span className="modal-field-label">Assignment Notes</span>}>
                  <TextArea rows={3} placeholder="Add notes about this assignment (optional)..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space size={10}>
                    <Button onClick={() => {
                      setAssignModalVisible(false);
                      assignForm.resetFields();
                      setSelectedAsset(null);
                    }} shape="round">
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" shape="round">
                      Confirm Assignment
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Return Asset Modal */}
            <Modal
              title="Record Return of Company Asset"
              open={returnModalVisible}
              onCancel={() => {
                setReturnModalVisible(false);
                returnForm.resetFields();
                setSelectedAsset(null);
              }}
              footer={null}
              className="sales-modal"
            >
              <Form
                form={returnForm}
                layout="vertical"
                onFinish={handleReturn}
                style={{ marginTop: '12px' }}
              >
                <Form.Item name="conditionAtReturn" label={<span className="modal-field-label">Condition at Return</span>} initialValue="good">
                  <Select dropdownStyle={{ borderRadius: '8px' }}>
                    <Option value="excellent">Excellent</Option>
                    <Option value="good">Good</Option>
                    <Option value="fair">Fair</Option>
                    <Option value="poor">Poor</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="notes" label={<span className="modal-field-label">Return Notes</span>}>
                  <TextArea rows={3} placeholder="Add feedback notes about the return condition (optional)..." />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space size={10}>
                    <Button onClick={() => {
                      setReturnModalVisible(false);
                      returnForm.resetFields();
                      setSelectedAsset(null);
                    }} shape="round">
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" shape="round">
                      Process Return
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
