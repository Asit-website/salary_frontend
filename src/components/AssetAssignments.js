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
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Descriptions,
  Badge,
  Layout,
  Menu,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  EyeOutlined, 
  UserOutlined, 
  SearchOutlined,
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

const AssetAssignments = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assetId: '',
    assignedTo: ''
  });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const { Header, Content } = Layout;

  // Load assignment statistics
  const loadStats = async () => {
    try {
      const response = await api.get('/admin/asset-assignments/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load assignments
  const loadAssignments = async (params = {}) => {
    try {
      setLoading(true);
      const response = await api.get('/admin/asset-assignments', {
        params: {
          page: pagination.current,
          limit: pagination.pageSize,
          search: filters.search,
          status: filters.status,
          assetId: filters.assetId,
          assignedTo: filters.assignedTo,
          ...params
        }
      });
      
      if (response.data.success) {
        setAssignments(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total
        }));
      }
    } catch (error) {
      message.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  // Load assets for assignment
  const loadAssets = async () => {
    try {
      const response = await api.get('/admin/assets?status=available');
      if (response.data.success) {
        setAssets(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
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
    loadAssignments();
    loadAssets();
    loadStaff();
    loadStats();
  }, []);

  // Handle table pagination change
  const handleTableChange = (pagination) => {
    setPagination(pagination);
    loadAssignments();
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Apply filters
  const applyFilters = () => {
    loadAssignments();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      assetId: '',
      assignedTo: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setTimeout(() => loadAssignments(), 0);
  };

  // View assignment details
  const handleViewDetails = (assignment) => {
    setSelectedAssignment(assignment);
    setDetailsModalVisible(true);
  };

  // Create new assignment
  const handleCreateAssignment = async (values) => {
    try {
      await api.post(`/admin/assets/${values.assetId}/assign`, {
        assignedTo: values.assignedTo,
        notes: values.notes
      });
      message.success('Asset assigned successfully');
      Modal.destroyAll();
      loadAssignments();
      loadAssets(); // Refresh available assets
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to assign asset');
    }
  };

  // Return asset
  const handleReturnAsset = async (assignmentId, values) => {
    try {
      await api.post(`/admin/asset-assignments/${assignmentId}/return`, values);
      message.success('Asset returned successfully');
      Modal.destroyAll();
      loadAssignments();
      loadAssets(); // Refresh available assets
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to return asset');
    }
  };

  // Open create assignment modal
  const openCreateAssignmentModal = () => {
    Modal.confirm({
      title: 'Assign New Asset',
      content: (
        <Form
          layout="vertical"
          onFinish={handleCreateAssignment}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="assetId"
            label="Select Asset"
            rules={[{ required: true, message: 'Please select an asset' }]}
          >
            <Select placeholder="Select asset to assign">
              {assets.map(asset => (
                <Option key={asset.id} value={asset.id}>
                  {asset.name} - {asset.category}
                </Option>
              ))}
            </Select>
          </Form.Item>

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
        </Form>
      ),
      okText: 'Assign Asset',
      cancelText: 'Cancel',
      onOk: () => {
        const form = document.querySelector('.ant-modal-body form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    });
  };

  // Open return asset modal
  const openReturnAssetModal = (assignment) => {
    Modal.confirm({
      title: 'Return Asset',
      content: (
        <Form
          layout="vertical"
          onFinish={(values) => handleReturnAsset(assignment.id, values)}
          initialValues={{ conditionAtReturn: 'good' }}
          style={{ marginTop: 20 }}
        >
          <Form.Item name="conditionAtReturn" label="Condition at Return">
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
        </Form>
      ),
      okText: 'Return Asset',
      cancelText: 'Cancel',
      onOk: () => {
        const form = document.querySelector('.ant-modal-body form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    });
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      returned: 'blue',
      overdue: 'red'
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
      title: 'Asset',
      key: 'asset',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.asset?.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.asset?.category} - {record.asset?.serialNumber}
          </div>
        </div>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assignedTo',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.assignedUser?.phone || '-'}</div>
          {record.assignedUser?.profile?.department && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.assignedUser.profile.department}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Assigned By',
      key: 'assignedBy',
      render: (text, record) => record.assignedBy?.name || 'System',
    },
    {
      title: 'Assigned Date',
      dataIndex: 'assignedDate',
      key: 'assignedDate',
      render: (date) => moment(date).format('DD MMM YYYY'),
    },
    {
      title: 'Returned Date',
      dataIndex: 'returnedDate',
      key: 'returnedDate',
      render: (date) => date ? moment(date).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Condition',
      key: 'condition',
      render: (text, record) => (
        <div>
          <Tag color={getConditionColor(record.conditionAtAssignment)}>
            Assignment: {record.conditionAtAssignment?.toUpperCase()}
          </Tag>
          {record.conditionAtReturn && (
            <div style={{ marginTop: 4 }}>
              <Tag color={getConditionColor(record.conditionAtReturn)}>
                Return: {record.conditionAtReturn?.toUpperCase()}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          
          {record.status === 'active' && (
            <Tooltip title="Return Asset">
              <Button 
                type="link" 
                icon={<CheckCircleOutlined />} 
                onClick={() => openReturnAssetModal(record)}
              />
            </Tooltip>
          )}
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
            <Title level={4} style={{ margin: 0 }}>Asset Assignments</Title>
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
                      title="Total Assignments"
                      value={stats.total}
                      prefix={<UserOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Active"
                      value={stats.statusStats?.active || 0}
                      valueStyle={{ color: '#3f8600' }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Returned"
                      value={stats.statusStats?.returned || 0}
                      valueStyle={{ color: '#1890ff' }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Overdue"
                      value={stats.statusStats?.overdue || 0}
                      valueStyle={{ color: '#fa8c16' }}
                      prefix={<ExclamationCircleOutlined />}
                    />
                  </Card>
                </Col>
              </Row>
            )}

            <Card
              title="Asset Assignments"
              extra={
                <Space>
                  <Button 
                    icon={<SearchOutlined />}
                    onClick={() => loadAssignments()}
                  >
                    Refresh
                  </Button>
                  <Button 
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/assets-management')}
                  >
                    View Assets
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={openCreateAssignmentModal}
                    disabled={assets.length === 0}
                  >
                    Assign Asset
                  </Button>
                </Space>
              }
            >
              {/* Filters */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Search
                    placeholder="Search assignments..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    onSearch={() => loadAssignments()}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Status"
                    value={filters.status || undefined}
                    onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="active">Active</Option>
                    <Option value="returned">Returned</Option>
                    <Option value="overdue">Overdue</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Asset"
                    value={filters.assetId || undefined}
                    onChange={(value) => setFilters(prev => ({ ...prev, assetId: value }))}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {assets.map(asset => (
                      <Option key={asset.id} value={asset.id}>
                        {asset.name}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Assigned To"
                    value={filters.assignedTo || undefined}
                    onChange={(value) => setFilters(prev => ({ ...prev, assignedTo: value }))}
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
                    <Button onClick={() => loadAssignments()} icon={<SearchOutlined />}>
                      Search
                    </Button>
                    <Button onClick={() => {
                      setFilters({
                        search: '',
                        status: '',
                        assetId: '',
                        assignedTo: ''
                      });
                      loadAssignments();
                    }}>Reset</Button>
                  </Space>
                </Col>
              </Row>

              {/* Assignments Table */}
              <Table
                columns={columns}
                dataSource={assignments}
                rowKey="id"
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} assignments`,
                }}
                onChange={handleTableChange}
              />
            </Card>

            {/* Assignment Details Modal */}
            <Modal
              title="Assignment Details"
              open={detailsModalVisible}
              onCancel={() => {
                setDetailsModalVisible(false);
                setSelectedAssignment(null);
              }}
              footer={[
                <Button key="close" onClick={() => {
                  setDetailsModalVisible(false);
                  setSelectedAssignment(null);
                }}>
                  Close
                </Button>
              ]}
              width={800}
            >
              {selectedAssignment && (
                <div>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Asset Name">
                      {selectedAssignment.asset?.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Asset Category">
                      {selectedAssignment.asset?.category}
                    </Descriptions.Item>
                    <Descriptions.Item label="Assigned To">
                      {selectedAssignment.assignedUser?.phone || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Department">
                      {selectedAssignment.assignedUser?.profile?.department || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Badge 
                        status={selectedAssignment.status === 'active' ? 'success' : 'default'}
                        text={selectedAssignment.status?.toUpperCase()}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="Condition at Assignment">
                      <Tag color={getConditionColor(selectedAssignment.conditionAtAssignment)}>
                        {selectedAssignment.conditionAtAssignment?.toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Condition at Return">
                      {selectedAssignment.conditionAtReturn ? (
                        <Tag color={getConditionColor(selectedAssignment.conditionAtReturn)}>
                          {selectedAssignment.conditionAtReturn?.toUpperCase()}
                        </Tag>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Assigned Date">
                      {moment(selectedAssignment.assignedDate).format('DD MMM YYYY HH:mm')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Returned Date">
                      {selectedAssignment.returnedDate 
                        ? moment(selectedAssignment.returnedDate).format('DD MMM YYYY HH:mm')
                        : '-'
                      }
                    </Descriptions.Item>
                    <Descriptions.Item label="Notes" span={2}>
                      {selectedAssignment.notes || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}
            </Modal>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AssetAssignments;
