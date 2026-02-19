import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  DatePicker, 
  message, 
  Row, 
  Col, 
  Statistic,
  Descriptions,
  Tag,
  Tooltip,
  Menu,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BankOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import moment from 'moment';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const Loans = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loans, setLoans] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form] = Form.useForm();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };
  const [emiAmount, setEmiAmount] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Load loans
  const loadLoans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/loans', {
        params: {
          page: pagination.current,
          limit: pagination.pageSize
        }
      });
      setLoans(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      message.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  // Load staff
  const loadStaff = async () => {
    try {
      console.log('Loading staff...');
      const response = await api.get('/admin/staff');
      console.log('Staff response:', response.data);
      setStaff(response.data.data || []);
    } catch (error) {
      console.error('Failed to load staff:', error);
      message.error('Failed to load staff');
    }
  };

  // Calculate EMI
  const calculateEMI = (principal, rate, tenure) => {
    if (!principal || !rate || !tenure) return 0;
    
    const monthlyRate = rate / 12 / 100;
    const months = tenure;
    
    if (monthlyRate === 0) {
      return principal / months;
    }
    
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    
    return Math.round(emi * 100) / 100;
  };

  // Handle form value changes to calculate EMI
  const handleFormValuesChange = (changedValues) => {
    const { amount, interestRate, tenure } = { ...form.getFieldsValue(), ...changedValues };
    
    if (amount && interestRate && tenure) {
      const emi = calculateEMI(amount, interestRate, tenure);
      setEmiAmount(emi);
    } else {
      setEmiAmount(0);
    }
  };

  // Create or update loan
  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        issueDate: values.issueDate.format('YYYY-MM-DD'),
        startDate: values.startDate.format('YYYY-MM-DD'),
        emiAmount: calculateEMI(values.amount, values.interestRate, values.tenure)
      };

      console.log('Submitting loan payload:', payload);

      if (selectedLoan) {
        await api.put(`/admin/loans/${selectedLoan.id}`, payload);
        message.success('Loan updated successfully');
      } else {
        await api.post('/admin/loans', payload);
        message.success('Loan created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      setSelectedLoan(null);
      setEmiAmount(0);
      loadLoans();
    } catch (error) {
      console.error('Error saving loan:', error);
      console.error('Error response:', error.response?.data);
      message.error(error.response?.data?.message || 'Failed to save loan');
    }
  };

  // Delete loan
  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/loans/${id}`);
      message.success('Loan deleted successfully');
      loadLoans();
    } catch (error) {
      message.error('Failed to delete loan');
    }
  };

  // View loan details
  const handleViewDetails = (record) => {
    setSelectedLoan(record);
    setDetailsModalVisible(true);
  };

  // Edit loan
  const handleEdit = (record) => {
    setSelectedLoan(record);
    form.setFieldsValue({
      ...record,
      issueDate: moment(record.issueDate),
      startDate: moment(record.startDate)
    });
    setModalVisible(true);
  };

  // Table columns
  const columns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.staffMember?.profile?.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.staffMember?.phone}</div>
        </div>
      ),
    },
    {
      title: 'Loan Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => {
        const numAmount = parseFloat(amount);
        return isNaN(numAmount) ? '0.00' : numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
    },
    {
      title: 'Interest Rate',
      dataIndex: 'interestRate',
      key: 'interestRate',
      render: (rate) => `${parseFloat(rate || 0).toFixed(2)}%`,
    },
    {
      title: 'Tenure',
      dataIndex: 'tenure',
      key: 'tenure',
      render: (tenure) => `${tenure} months`,
    },
    {
      title: 'EMI Amount',
      dataIndex: 'emiAmount',
      key: 'emiAmount',
      render: (emi) => {
        const numEmi = parseFloat(emi);
        return isNaN(numEmi) ? '0.00' : numEmi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          active: 'green',
          completed: 'blue',
          defaulted: 'red'
        };
        return <Tag color={colors[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Issue Date',
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (date) => moment(date).format('DD MMM YYYY'),
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
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    loadLoans();
    loadStaff();
  }, []);

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
            <Title level={4} style={{ margin: 0 }}>Loans Management</Title>
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
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Loans"
                    value={loans.length}
                    prefix={<BankOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Active Loans"
                    value={loans.filter(l => l.status === 'active').length}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<DollarOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Amount"
                    value={loans.reduce((sum, loan) => sum + (parseFloat(loan.amount || 0)), 0)}
                    prefix={<DollarOutlined />}
                    formatter={(value) => value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Monthly EMI"
                    value={loans.filter(l => l.status === 'active').reduce((sum, loan) => sum + (parseFloat(loan.emiAmount || 0)), 0)}
                    prefix={<CalendarOutlined />}
                    formatter={(value) => value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title="Loans Management"
              extra={
                <Space>
                  <Button 
                    icon={<PlusOutlined />}
                    onClick={loadLoans}
                  >
                    Refresh
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedLoan(null);
                      form.resetFields();
                      setModalVisible(true);
                    }}
                  >
                    Create Loan
                  </Button>
                </Space>
              }
            >
              <Table
                columns={columns}
                dataSource={loans}
                rowKey="id"
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} loans`,
                }}
                onChange={(newPagination) => {
                  setPagination(newPagination);
                  loadLoans();
                }}
              />
            </Card>

            {/* Loan Form Modal */}
            <Modal
              title={selectedLoan ? 'Edit Loan' : 'Create Loan'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                setSelectedLoan(null);
                form.resetFields();
              }}
              footer={null}
              width={800}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={handleFormValuesChange}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="staffId"
                      label="Staff Member"
                      rules={[{ required: true, message: 'Please select staff member' }]}
                    >
                      <Select placeholder="Select staff member">
                        {staff.map(member => (
                          <Option key={member.id} value={member.id}>
                            {member.name} - {member.phone}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="loanType"
                      label="Loan Type"
                      rules={[{ required: true, message: 'Please enter loan type' }]}
                    >
                      <Input placeholder="e.g., Personal, Car, Home" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="amount"
                      label="Loan Amount"
                      rules={[{ required: true, message: 'Please enter loan amount' }]}
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
                      name="interestRate"
                      label="Interest Rate (%)"
                      rules={[{ required: true, message: 'Please enter interest rate' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0.00"
                        min={0}
                        max={100}
                        precision={2}
                        suffix="%"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="tenure"
                      label="Tenure (Months)"
                      rules={[{ required: true, message: 'Please enter tenure' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0"
                        min={1}
                        max={360}
                        suffix="months"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="EMI Amount">
                      <InputNumber
                        style={{ width: '100%' }}
                        value={emiAmount}
                        disabled
                        precision={2}
                        placeholder="0.00"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    {/* Empty column for spacing */}
                  </Col>
                  <Col span={8}>
                    {/* Empty column for spacing */}
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="issueDate"
                      label="Issue Date"
                      rules={[{ required: true, message: 'Please select issue date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="startDate"
                      label="EMI Start Date"
                      rules={[{ required: true, message: 'Please select start date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item
                  name="purpose"
                  label="Purpose"
                  rules={[{ required: true, message: 'Please enter purpose' }]}
                >
                  <TextArea rows={3} placeholder="Describe the purpose of this loan" />
                </Form.Item>
                
                <Form.Item
                  name="notes"
                  label="Notes"
                >
                  <TextArea rows={2} placeholder="Additional notes (optional)" />
                </Form.Item>
                
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      {selectedLoan ? 'Update' : 'Create'} Loan
                    </Button>
                    <Button onClick={() => {
                      setModalVisible(false);
                      setSelectedLoan(null);
                      form.resetFields();
                    }}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Loan Details Modal */}
            <Modal
              title="Loan Details"
              open={detailsModalVisible}
              onCancel={() => {
                setDetailsModalVisible(false);
                setSelectedLoan(null);
              }}
              footer={[
                <Button key="close" onClick={() => {
                  setDetailsModalVisible(false);
                  setSelectedLoan(null);
                }}>
                  Close
                </Button>
              ]}
              width={800}
            >
              {selectedLoan && (
                <div>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Staff Member">
                      {selectedLoan.staffMember?.profile?.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Staff Phone">
                      {selectedLoan.staffMember?.phone}
                    </Descriptions.Item>
                    <Descriptions.Item label="Loan Type">
                      {selectedLoan.loanType}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={selectedLoan.status === 'active' ? 'green' : 'default'}>
                        {selectedLoan.status?.toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Loan Amount">
                      {parseFloat(selectedLoan.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Descriptions.Item>
                    <Descriptions.Item label="Interest Rate">
                      {parseFloat(selectedLoan.interestRate || 0).toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Tenure">
                      {selectedLoan.tenure} months
                    </Descriptions.Item>
                    <Descriptions.Item label="EMI Amount">
                      {parseFloat(selectedLoan.emiAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Descriptions.Item>
                    <Descriptions.Item label="Issue Date">
                      {moment(selectedLoan.issueDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="EMI Start Date">
                      {moment(selectedLoan.startDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Purpose" span={2}>
                      {selectedLoan.purpose}
                    </Descriptions.Item>
                    <Descriptions.Item label="Notes" span={2}>
                      {selectedLoan.notes || '-'}
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

export default Loans;
