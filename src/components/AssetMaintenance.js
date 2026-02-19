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
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Descriptions,
  Badge,
  Progress,
  Layout,
  Alert,
  Menu,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  ToolOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
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

const AssetMaintenance = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
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
    maintenanceType: '',
    assetId: '',
    performedBy: ''
  });
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  const { Header, Content } = Layout;

  // Load maintenance records
  const loadMaintenanceRecords = async (params = {}) => {
    try {
      setLoading(true);
      const response = await api.get('/admin/asset-maintenance', {
        params: {
          page: pagination.current,
          limit: pagination.pageSize,
          ...filters,
          ...params
        }
      });

      console.log('Maintenance records response:', response.data);
      console.log('First record sample:', response.data.data?.[0]);

      setMaintenanceRecords(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        current: response.data.pagination?.page || 1
      }));
    } catch (error) {
      console.error('Error loading maintenance records:', error);
      message.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await api.get('/admin/asset-maintenance/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Load assets for maintenance
  const loadAssets = async () => {
    try {
      const response = await api.get('/admin/assets');
      if (response.data.success) {
        setAssets(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  // Load staff for maintenance
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
    loadMaintenanceRecords();
    loadStats();
    loadAssets();
    loadStaff();
  }, []);

  // Handle table pagination change
  const handleTableChange = (pagination) => {
    setPagination(pagination);
    loadMaintenanceRecords();
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Apply filters
  const applyFilters = () => {
    loadMaintenanceRecords();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      maintenanceType: '',
      assetId: '',
      performedBy: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    setTimeout(() => loadMaintenanceRecords(), 0);
  };

  // Create or update maintenance record
  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        scheduledDate: values.scheduledDate.format('YYYY-MM-DD'),
        completedDate: values.completedDate ? values.completedDate.format('YYYY-MM-DD') : null,
      };

      if (selectedMaintenance) {
        await api.put(`/admin/asset-maintenance/${selectedMaintenance.id}`, payload);
        message.success('Maintenance record updated successfully');
      } else {
        await api.post('/admin/asset-maintenance', payload);
        message.success('Maintenance record created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      setSelectedMaintenance(null);
      loadMaintenanceRecords();
      loadStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save maintenance record');
    }
  };

  // Complete maintenance
  const handleCompleteMaintenance = async (recordId, values) => {
    try {
      // Format the date properly before sending to backend
      const payload = {
        ...values,
        completedDate: values.completedDate ? values.completedDate.format('YYYY-MM-DD') : null,
      };

      console.log('Complete maintenance payload:', payload);

      await api.post(`/admin/asset-maintenance/${recordId}/complete`, payload);
      message.success('Maintenance completed successfully');
      Modal.destroyAll();
      loadMaintenanceRecords();
      loadStats();
    } catch (error) {
      console.error('Error completing maintenance:', error);
      message.error(error.response?.data?.message || 'Failed to complete maintenance');
    }
  };

  // View maintenance details
  const handleViewDetails = (record) => {
    setSelectedMaintenance(record);
    setDetailsModalVisible(true);
  };

  // Open create maintenance modal
  const handleCreateMaintenance = () => {
    setSelectedMaintenance(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Open edit maintenance modal
  const handleEditMaintenance = (record) => {
    setSelectedMaintenance(record);
    form.setFieldsValue({
      ...record,
      scheduledDate: moment(record.scheduledDate),
      completedDate: record.completedDate ? moment(record.completedDate) : null,
    });
    setModalVisible(true);
  };

  // Open complete maintenance modal
  const openCompleteMaintenanceModal = (record) => {
    let completeFormRef = null;

    Modal.confirm({
      title: 'Complete Maintenance',
      content: (
        <Form
          ref={(form) => { completeFormRef = form; }}
          layout="vertical"
          onFinish={(values) => handleCompleteMaintenance(record.id, values)}
          style={{ marginTop: 20 }}
        >
          <Form.Item name="completedDate" label="Completion Date" initialValue={moment()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="cost" label="Actual Cost">
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/(,*)/g, '')}
              placeholder="Enter actual cost"
            />
          </Form.Item>

          <Form.Item name="performedBy" label="Performed By">
            <Select placeholder="Select who performed the maintenance">
              {staff.map(member => (
                <Option key={member.id} value={member.id}>
                  {member.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Completion Notes">
            <TextArea rows={3} placeholder="Add notes about the maintenance completion..." />
          </Form.Item>
        </Form>
      ),
      okText: 'Complete Maintenance',
      cancelText: 'Cancel',
      onOk: () => {
        return new Promise((resolve, reject) => {
          if (completeFormRef) {
            completeFormRef
              .validateFields()
              .then((values) => {
                handleCompleteMaintenance(record.id, values);
                resolve();
              })
              .catch((error) => {
                console.error('Form validation failed:', error);
                reject();
              });
          } else {
            reject();
          }
        });
      }
    });
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'blue',
      in_progress: 'orange',
      completed: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'default';
  };

  // Maintenance type color mapping
  const getMaintenanceTypeColor = (type) => {
    const colors = {
      preventive: 'green',
      corrective: 'orange',
      emergency: 'red'
    };
    return colors[type] || 'default';
  };

  // Check if maintenance is overdue
  const isOverdue = (scheduledDate, status) => {
    return status === 'scheduled' && moment(scheduledDate).isBefore(moment(), 'day');
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
      title: 'Maintenance Type',
      dataIndex: 'maintenanceType',
      key: 'maintenanceType',
      render: (type) => (
        <Tag color={getMaintenanceTypeColor(type)}>
          {type?.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (date, record) => (
        <div>
          <div>{moment(date).format('DD MMM YYYY')}</div>
          {isOverdue(date, record.status) && (
            <Tag color="red" size="small" style={{ marginTop: 4 }}>
              OVERDUE
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Completed Date',
      dataIndex: 'completedDate',
      key: 'completedDate',
      render: (date) => date ? moment(date).format('DD MMM YYYY') : '-',
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
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => cost ? `${parseFloat(cost).toFixed(2)}` : '-',
    },
    {
      title: 'Performed By',
      key: 'performedBy',
      render: (text, record) => {
        if (record.performingUser?.name) {
          return record.performingUser.name;
        } else if (record.performingUser?.phone) {
          return record.performingUser.phone;
        } else if (record.performingUser?.id) {
          return `User ID: ${record.performingUser.id}`;
        }
        return '-';
      },
      width: 150,
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

          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditMaintenance(record)}
            />
          </Tooltip>

          {record.status === 'scheduled' && (
            <Tooltip title="Complete">
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => openCompleteMaintenanceModal(record)}
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
            <Title level={4} style={{ margin: 0 }}>Asset Maintenance</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
          />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div>
            {/* Overdue Maintenance Alert */}
            {stats && stats.overdueCount > 0 && (
              <Alert
                message={`${stats.overdueCount} maintenance tasks overdue`}
                description="Please review and complete overdue maintenance tasks."
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {/* Statistics Cards */}
            {stats && (
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Total Maintenance"
                      value={stats.total}
                      prefix={<ToolOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Scheduled"
                      value={stats.statusStats?.scheduled || 0}
                      valueStyle={{ color: '#1890ff' }}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="In Progress"
                      value={stats.statusStats?.in_progress || 0}
                      valueStyle={{ color: '#fa8c16' }}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Completed"
                      value={stats.statusStats?.completed || 0}
                      valueStyle={{ color: '#3f8600' }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
              </Row>
            )}

            <Card
              title="Asset Maintenance"
              extra={
                <Space>
                  <Button
                    icon={<SearchOutlined />}
                    onClick={() => loadMaintenanceRecords()}
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
                    onClick={handleCreateMaintenance}
                    disabled={assets.length === 0}
                  >
                    Schedule Maintenance
                  </Button>
                </Space>
              }
            >
              {/* Filters */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Search
                    placeholder="Search maintenance records..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    onSearch={() => loadMaintenanceRecords()}
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
                    <Option value="scheduled">Scheduled</Option>
                    <Option value="in_progress">In Progress</Option>
                    <Option value="completed">Completed</Option>
                    <Option value="cancelled">Cancelled</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Maintenance Type"
                    value={filters.maintenanceType || undefined}
                    onChange={(value) => setFilters(prev => ({ ...prev, maintenanceType: value }))}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="preventive">Preventive</Option>
                    <Option value="corrective">Corrective</Option>
                    <Option value="emergency">Emergency</Option>
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
                {/* <Col span={4}>
                  <Select
                    placeholder="Assigned To"
                    value={filters.performedBy || undefined}
                    onChange={(value) => setFilters(prev => ({ ...prev, performedBy: value }))}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {staff.map(member => (
                      <Option key={member.id} value={member.id}>
                        {member.name}
                      </Option>
                    ))}
                  </Select>
                </Col> */}
                <Col span={4}>
                  <Space>
                    <Button onClick={() => loadMaintenanceRecords()} icon={<SearchOutlined />}>
                      Search
                    </Button>
                    <Button onClick={() => {
                      setFilters({
                        search: '',
                        status: '',
                        maintenanceType: '',
                        assetId: '',
                        performedBy: ''
                      });
                      loadMaintenanceRecords();
                    }}>Reset</Button>
                  </Space>
                </Col>
              </Row>

              {/* Maintenance Records Table */}
              <Table
                columns={columns}
                dataSource={maintenanceRecords}
                rowKey="id"
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} maintenance records`,
                }}
                onChange={handleTableChange}
                rowClassName={(record) => {
                  if (isOverdue(record.scheduledDate, record.status)) {
                    return 'overdue-row';
                  }
                  return '';
                }}
              />
            </Card>

            {/* Maintenance Form Modal */}
            <Modal
              title={selectedMaintenance ? 'Edit Maintenance' : 'Schedule Maintenance'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                setSelectedMaintenance(null);
                form.resetFields();
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
                      name="assetId"
                      label="Asset"
                      rules={[{ required: true, message: 'Please select an asset' }]}
                    >
                      <Select placeholder="Select asset">
                        {assets.map(asset => (
                          <Option key={asset.id} value={asset.id}>
                            {asset.name} - {asset.serialNumber}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="maintenanceType"
                      label="Maintenance Type"
                      rules={[{ required: true, message: 'Please select maintenance type' }]}
                    >
                      <Select placeholder="Select maintenance type">
                        <Option value="preventive">Preventive</Option>
                        <Option value="corrective">Corrective</Option>
                        <Option value="emergency">Emergency</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="description"
                  label="Description"
                  rules={[{ required: true, message: 'Please enter description' }]}
                >
                  <TextArea rows={3} placeholder="Describe the maintenance work" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="scheduledDate"
                      label="Scheduled Date"
                      rules={[{ required: true, message: 'Please select scheduled date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="cost"
                      label="Estimated Cost"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0.00"
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="performedBy"
                      label="Performed By"
                    >
                      <Select placeholder="Select staff" allowClear>
                        {staff.map(member => (
                          <Option key={member.id} value={member.id}>
                            {member.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="vendor"
                      label="Vendor"
                    >
                      <Input placeholder="Vendor name (optional)" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="completedDate"
                      label="Completed Date"
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="notes"
                  label="Notes"
                >
                  <TextArea rows={2} placeholder="Additional notes (optional)" />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      {selectedMaintenance ? 'Update' : 'Schedule'} Maintenance
                    </Button>
                    <Button onClick={() => {
                      setModalVisible(false);
                      setSelectedMaintenance(null);
                      form.resetFields();
                    }}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Maintenance Details Modal */}
            <Modal
              title="Maintenance Details"
              open={detailsModalVisible}
              onCancel={() => {
                setDetailsModalVisible(false);
                setSelectedMaintenance(null);
              }}
              footer={[
                <Button key="close" onClick={() => {
                  setDetailsModalVisible(false);
                  setSelectedMaintenance(null);
                }}>
                  Close
                </Button>
              ]}
              width={800}
            >
              {selectedMaintenance && (
                <div>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Asset Name">
                      {selectedMaintenance.asset?.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Asset Category">
                      {selectedMaintenance.asset?.category}
                    </Descriptions.Item>
                    <Descriptions.Item label="Maintenance Type">
                      <Tag color={getMaintenanceTypeColor(selectedMaintenance.maintenanceType)}>
                        {selectedMaintenance.maintenanceType?.replace('_', ' ').toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={getStatusColor(selectedMaintenance.status)}>
                        {selectedMaintenance.status?.replace('_', ' ').toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Scheduled Date">
                      {moment(selectedMaintenance.scheduledDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Completed Date">
                      {selectedMaintenance.completedDate
                        ? moment(selectedMaintenance.completedDate).format('DD MMM YYYY')
                        : '-'
                      }
                    </Descriptions.Item>
                    <Descriptions.Item label="Estimated Cost">
                      {selectedMaintenance.cost ? `$${parseFloat(selectedMaintenance.cost).toFixed(2)}` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Vendor">
                      {selectedMaintenance.vendor || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Performed By">
                      {selectedMaintenance.performedBy?.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created By">
                      {selectedMaintenance.creator?.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description" span={2}>
                      {selectedMaintenance.description}
                    </Descriptions.Item>
                    <Descriptions.Item label="Notes" span={2}>
                      {selectedMaintenance.notes || '-'}
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

export default AssetMaintenance;
