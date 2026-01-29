import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, Select, message, Space, Typography, Tag, Menu, Row, Col, DatePicker, Dropdown, Switch } from 'antd';
import { 
  UserOutlined, 
  PlusOutlined, 
  DownloadOutlined,
  MoreOutlined,
  CalendarOutlined,
  FilterOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;
const { RangePicker } = DatePicker;

const StaffManagement = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [salaryTemplates, setSalaryTemplates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStaff();
    fetchSalaryTemplates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [staff, searchText, filterRole, filterStatus, filterDepartment]);

  const applyFilters = () => {
    let filtered = [...staff];
    
    if (searchText) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchText.toLowerCase()) ||
        member.email.toLowerCase().includes(searchText.toLowerCase()) ||
        member.staffId.toLowerCase().includes(searchText.toLowerCase()) ||
        member.phone.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (filterRole) {
      filtered = filtered.filter(member => member.role === filterRole);
    }
    
    if (filterStatus) {
      filtered = filtered.filter(member => member.status === filterStatus);
    }
    
    if (filterDepartment) {
      filtered = filtered.filter(member => member.department === filterDepartment);
    }
    
    setFilteredStaff(filtered);
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleFilterReset = () => {
    setSearchText('');
    setFilterRole('');
    setFilterStatus('');
    setFilterDepartment('');
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/staff');
      console.log('Staff API response:', response.data); // Debug log
      if (response.data.success) {
        const staffData = response.data.staff || response.data.data || [];
        // Map API response to frontend structure
        const mappedData = staffData.map(staff => ({
          id: staff.id,
          name: staff.name || 'Unknown',
          email: staff.email || '',
          staffId: staff.staffId || 'N/A',
          phone: staff.phone || '',
          role: 'staff', // Default role since API doesn't specify
          status: (staff.active === undefined ? 'active' : (staff.active ? 'active' : 'inactive')), // Default to active if not provided
          department: staff.department || 'General', // Use actual department from API
          createdAt: staff.createdAt || staff.created_at || null // Use null if no creation date
        }));
        setStaff(mappedData);
        setFilteredStaff(mappedData);
        console.log('Staff data loaded:', mappedData.length); // Debug log
      } else {
        console.error('API returned unsuccessful response');
        // Fallback to empty array
        setStaff([]);
        setFilteredStaff([]);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      message.error('Failed to fetch staff');
      // Set empty array on error to prevent undefined
      setStaff([]);
      setFilteredStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryTemplates = async () => {
    try {
      const response = await api.get('/admin/salary-templates');
      if (response.data.success) {
        setSalaryTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch salary templates:', error);
    }
  };

  // Calculate stats
  const totalEmployees = filteredStaff.length;
  const activeEmployees = filteredStaff.filter(s => s.status === 'active').length;
  const onLeaveEmployees = filteredStaff.filter(s => s.status === 'inactive').length;
  
  // Get unique departments for filter
  const uniqueDepartments = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  
  // Calculate new hires from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newHires = filteredStaff.filter(s => {
    if (!s.createdAt) return false; // Skip if no creation date
    const createdDate = new Date(s.createdAt);
    return createdDate >= sevenDaysAgo && !isNaN(createdDate.getTime());
  }).length;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAddRegularStaff = () => {
    navigate('/add-regular-staff');
  };

  const handleAddContractualStaff = () => {
    // For now, just show a message
    message.info('Contractual staff feature coming soon');
  };

  const staffMenuItems = [
    {
      key: 'regular',
      label: 'Regular Staff',
      icon: <UserOutlined />,
    },
    {
      key: 'contractual',
      label: 'Contractual Staff',
      icon: <UserOutlined />,
    }
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'regular') {
      handleAddRegularStaff();
    } else if (key === 'contractual') {
      handleAddContractualStaff();
    }
  };

  const handleViewStaff = (staffMember) => {
    navigate(`/staff/${staffMember.id}/profile`);
  };

  const handleEditStaff = (staffMember) => {
    // Navigate to AddRegularStaff page with prefilled data
    navigate('/add-regular-staff', { state: { staff: staffMember } });
  };

  const handleDeleteStaff = async (staffId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this staff member?',
      onOk: async () => {
        try {
          await api.delete(`/admin/staff/${staffId}`);
          message.success('Staff member deleted successfully');
          fetchStaff();
        } catch (error) {
          console.error('Failed to delete staff member:', error);
          message.error(error.response?.data?.message || 'Failed to delete staff member');
        }
      },
    });
  };

  const handleSubmit = async (values) => {
    try {
      // Calculate total salary components
      const basic_salary = parseFloat(values.basic_salary) || 0;
      const hra = parseFloat(values.hra) || 0;
      const da = parseFloat(values.da) || 0;
      const special_allowance = parseFloat(values.special_allowance) || 0;
      const conveyance_allowance = parseFloat(values.conveyance_allowance) || 0;
      const medical_allowance = parseFloat(values.medical_allowance) || 0;
      const telephone_allowance = parseFloat(values.telephone_allowance) || 0;
      const other_allowances = parseFloat(values.other_allowances) || 0;
      
      const total_earnings = basic_salary + hra + da + special_allowance + conveyance_allowance + medical_allowance + telephone_allowance + other_allowances;
      
      // Create staff member with all details
      const staffData = {
        staffId: values.staffId,
        phone: values.phone,
        name: values.name,
        email: values.email,
        department: values.department,
        designation: values.designation,
        password: values.password,
        active: values.active,
        // Salary components
        basic_salary,
        hra,
        da,
        special_allowance,
        conveyance_allowance,
        medical_allowance,
        telephone_allowance,
        other_allowances,
        total_earnings,
        // Calculate gross and net salary (simplified calculation)
        gross_salary: total_earnings,
        net_salary: total_earnings * 0.85 // Assuming 15% deductions
      };

      await api.post('/admin/staff', staffData);
      message.success('Regular staff member added successfully');
      setModalVisible(false);
      fetchStaff();
    } catch (error) {
      console.error('Failed to save staff member:', error);
      message.error(error.response?.data?.message || 'Failed to save staff member');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleViewStaff(record)}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#f0f5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            color: '#1890ff',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {text.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#262626', textDecoration: 'underline' }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Staff ID',
      dataIndex: 'staffId',
      key: 'staffId',
      render: (text) => (
        <Tag color="blue" style={{ fontSize: '12px' }}>{text}</Tag>
      ),
    },
    {
      title: 'Contact',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => (
        <div style={{ fontSize: '14px', color: '#262626' }}>{text}</div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department) => (
        <Tag color="purple" style={{ fontSize: '12px' }}>
          {department || 'General'}
        </Tag>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'} style={{ fontSize: '12px' }}>
          {role}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          color={status === 'active' ? 'green' : 'red'}
          style={{ fontSize: '12px' }}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined style={{ color: '#1890ff' }} />,
                label: 'View',
                onClick: () => handleViewStaff(record)
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
                label: 'Delete',
                onClick: () => handleDeleteStaff(record.id),
                danger: true
              }
            ]
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            style={{ 
              border: 'none', 
              boxShadow: 'none',
              padding: '4px 8px',
              height: 'auto'
            }}
          />
        </Dropdown>
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
            <Title level={4} style={{ margin: 0 }}>Staff Management</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Logout',
                onClick: handleLogout
              }
            ]}
          />
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          {/* Search Filter at Top */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <Card 
                style={{ 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Search
                      placeholder="Search by name, email, staff ID, phone..."
                      allowClear
                      enterButton={<SearchOutlined />}
                      size="large"
                      onSearch={handleSearch}
                      onChange={(e) => handleSearch(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} md={4}>
                    <Select
                      placeholder="Filter by Role"
                      allowClear
                      size="large"
                      style={{ width: '100%' }}
                      value={filterRole || undefined}
                      onChange={setFilterRole}
                    >
                      <Option value="admin">Admin</Option>
                      <Option value="staff">Staff</Option>
                    </Select>
                  </Col>
                  <Col xs={24} md={4}>
                    <Select
                      placeholder="Filter by Status"
                      allowClear
                      size="large"
                      style={{ width: '100%' }}
                      value={filterStatus || undefined}
                      onChange={setFilterStatus}
                    >
                      <Option value="active">Active</Option>
                      <Option value="inactive">Inactive</Option>
                    </Select>
                  </Col>
                  <Col xs={24} md={4}>
                    <Select
                      placeholder="Filter by Department"
                      allowClear
                      size="large"
                      style={{ width: '100%' }}
                      value={filterDepartment || undefined}
                      onChange={setFilterDepartment}
                    >
                      {uniqueDepartments.map(dept => (
                        <Option key={dept} value={dept}>{dept}</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col xs={24} md={4}>
                    <Button 
                      icon={<FilterOutlined />}
                      size="large"
                      onClick={handleFilterReset}
                      style={{ width: '100%' }}
                    >
                      Reset Filters
                    </Button>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* Top Stats Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Total Employees</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{totalEmployees}</div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#e6f7ff', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Active Employees</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>
                      {activeEmployees}
                    </div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#f6ffed', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                
                
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>On Leave</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>
                      {onLeaveEmployees}
                    </div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#fff2e8', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarOutlined style={{ color: '#fa8c16', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 
                
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>New Hires</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{newHires}</div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#f9f0ff', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PlusOutlined style={{ color: '#722ed1', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  
                 
                </div>
              </Card>
            </Col>
          </Row>

          {/* Upcoming Anniversaries - Commented Out */}
          {/* <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <Card 
                title={<span style={{ fontSize: '15px', fontWeight: '500', color: '#262626' }}>Upcoming Anniversaries</span>}
                style={{ 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Row gutter={[16, 16]}>
                  {[
                    { name: 'John Doe', department: 'IT', years: 5, date: 'Dec 20', color: '#52c41a' },
                    { name: 'Jane Smith', department: 'HR', years: 3, date: 'Dec 22', color: '#1890ff' },
                    { name: 'Mike Johnson', department: 'Sales', years: 2, date: 'Dec 25', color: '#faad14' },
                    { name: 'Sarah Williams', department: 'Marketing', years: 1, date: 'Dec 28', color: '#722ed1' }
                  ].map((anniversary, index) => (
                    <Col xs={24} sm={12} md={6} key={index}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px',
                        background: '#fafafa',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: anniversary.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}>
                          {anniversary.years}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#262626', marginBottom: '2px' }}>
                            {anniversary.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {anniversary.department} • {anniversary.years} years
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'right' }}>
                          {anniversary.date}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row> */}

          <Card 
            style={{ 
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
              borderRadius: '4px',
              border: '1px solid #e8e8e8'
            }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Title level={4} style={{ margin: 0, color: '#262626' }}>Staff Management</Title>
                <Space>
                  <Button 
                    icon={<DownloadOutlined />}
                    type="text"
                    style={{ color: '#1890ff' }}
                  >
                    Export
                  </Button>
                  <Dropdown 
                    menu={{ 
                      items: staffMenuItems,
                      onClick: handleMenuClick
                    }}
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <Button type="primary" icon={<PlusOutlined />}>
                      Add Staff
                    </Button>
                  </Dropdown>
                </Space>
              </div>
            }
          >

            {/* Table */}
            <Table
              columns={columns}
              dataSource={filteredStaff}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                size: 'default'
              }}
              scroll={{ x: 1000 }}
              size="middle"
              style={{ 
                background: '#fff',
                borderRadius: '4px'
              }}
            />
          </Card>

          <Modal
            title="Add Regular Staff"
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
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
                    name="staffId"
                    label="Staff ID"
                    rules={[{ required: true, message: 'Please enter staff ID' }]}
                  >
                    <Input placeholder="Enter unique staff ID" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[{ required: true, message: 'Please enter phone number' }]}
                  >
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please enter full name' }]}
                  >
                    <Input placeholder="Enter full name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      { type: 'email', message: 'Please enter valid email' }
                    ]}
                  >
                    <Input placeholder="Enter email address" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="department"
                    label="Department"
                    rules={[{ required: true, message: 'Please select department' }]}
                  >
                    <Select placeholder="Select department">
                      <Option value="IT">IT</Option>
                      <Option value="HR">HR</Option>
                      <Option value="Sales">Sales</Option>
                      <Option value="Marketing">Marketing</Option>
                      <Option value="Finance">Finance</Option>
                      <Option value="Operations">Operations</Option>
                      <Option value="General">General</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="designation"
                    label="Designation"
                    rules={[{ required: true, message: 'Please enter designation' }]}
                  >
                    <Input placeholder="Enter job designation" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="basic_salary"
                    label="Basic Salary"
                    rules={[{ required: true, message: 'Please enter basic salary' }]}
                  >
                    <Input type="number" placeholder="Enter basic salary" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="hra"
                    label="HRA"
                    rules={[{ required: true, message: 'Please enter HRA' }]}
                  >
                    <Input type="number" placeholder="Enter HRA amount" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="da"
                    label="DA"
                    rules={[{ required: true, message: 'Please enter DA' }]}
                  >
                    <Input type="number" placeholder="Enter DA amount" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="special_allowance"
                    label="Special Allowance"
                  >
                    <Input type="number" placeholder="Enter special allowance" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="conveyance_allowance"
                    label="Conveyance Allowance"
                  >
                    <Input type="number" placeholder="Enter conveyance allowance" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="medical_allowance"
                    label="Medical Allowance"
                  >
                    <Input type="number" placeholder="Enter medical allowance" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="telephone_allowance"
                    label="Telephone Allowance"
                  >
                    <Input type="number" placeholder="Enter telephone allowance" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="other_allowances"
                    label="Other Allowances"
                  >
                    <Input type="number" placeholder="Enter other allowances" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please enter password' }]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>

              <Form.Item
                name="active"
                label="Status"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setModalVisible(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Create Staff
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default StaffManagement;
