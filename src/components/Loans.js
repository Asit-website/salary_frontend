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
  Descriptions,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BankOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import moment from 'moment';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const Loans = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loans, setLoans] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form] = Form.useForm();
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
      render: (text, record) => {
        const name = record.staffMember?.profile?.name || 'No Name';
        const phone = record.staffMember?.phone || 'No phone';
        return (
          <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#e6f7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '10px',
              color: '#1677ff',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(22, 119, 255, 0.06)'
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: '600', color: '#1677ff', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '1px', whiteSpace: 'nowrap' }}>{phone}</div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Loan Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => {
        const numAmount = parseFloat(amount);
        const val = isNaN(numAmount) ? 0 : numAmount;
        return <span style={{ fontWeight: '500', color: '#262626' }}>₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
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
        const val = isNaN(numEmi) ? 0 : numEmi;
        return <span style={{ fontWeight: '600', color: '#262626' }}>₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const map = {
          active: 'sales-status-active',
          completed: 'sales-status-complete',
          defaulted: 'sales-status-inactive'
        };
        const cls = map[status] || 'sales-status-pending';
        return (
          <span className={`sales-status-tag ${cls}`} style={{ textTransform: 'capitalize', fontSize: '12px' }}>
            {status || 'pending'}
          </span>
        );
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <Button 
            size="small" 
            shape="round"
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(record)}
          >
            Details
          </Button>
          <Button 
            size="small" 
            shape="round"
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button 
            size="small" 
            shape="round"
            danger
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </div>
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
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Loans Management" 
        />
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div>
            {/* Elegant Dynamic Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6}>
                <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Total Loans</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#262626', lineHeight: '1.2' }}>{loans.length}</div>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: '20px', boxShadow: '0 4px 10px rgba(22, 119, 255, 0.1)' }}>
                      <BankOutlined />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Active Loans</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#52c41a', lineHeight: '1.2' }}>
                        {loans.filter(l => l.status === 'active').length}
                      </div>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: '20px', boxShadow: '0 4px 10px rgba(82, 196, 26, 0.1)' }}>
                      <span style={{ fontWeight: 'bold' }}>✓</span>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Total Amount</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#262626', lineHeight: '1.4' }}>
                        ₹{loans.reduce((sum, loan) => sum + (parseFloat(loan.amount || 0)), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fa8c16', fontSize: '20px', boxShadow: '0 4px 10px rgba(250, 140, 22, 0.1)' }}>
                      <span>₹</span>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Monthly EMI</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#722ed1', lineHeight: '1.4' }}>
                        ₹{loans.filter(l => l.status === 'active').reduce((sum, loan) => sum + (parseFloat(loan.emiAmount || 0)), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f9f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#722ed1', fontSize: '20px', boxShadow: '0 4px 10px rgba(114, 46, 209, 0.1)' }}>
                      <CalendarOutlined />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Card
              className="sales-content-card"
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Active Loan Registry</Title>
                <Space size={12}>
                  <Button 
                    shape="round"
                    onClick={loadLoans}
                  >
                    Refresh
                  </Button>
                  <Button 
                    type="primary" 
                    shape="round"
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
              </div>

              <Table
                columns={columns}
                dataSource={loans}
                rowKey="id"
                loading={loading}
                className="sales-table"
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
              title={selectedLoan ? 'Edit Loan Entry' : 'Issue New Staff Loan'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                setSelectedLoan(null);
                form.resetFields();
              }}
              footer={null}
              width={800}
              className="sales-modal"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={handleFormValuesChange}
                style={{ marginTop: '12px' }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="staffId"
                      label={<span className="modal-field-label">Staff Member</span>}
                      rules={[{ required: true, message: 'Please select staff member' }]}
                    >
                      <Select placeholder="Select staff member" dropdownStyle={{ borderRadius: '8px' }}>
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
                      label={<span className="modal-field-label">Loan Type</span>}
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
                      label={<span className="modal-field-label">Loan Amount</span>}
                      rules={[{ required: true, message: 'Please enter loan amount' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0.00"
                        min={0}
                        precision={2}
                        prefix="₹"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="interestRate"
                      label={<span className="modal-field-label">Interest Rate (%)</span>}
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
                      label={<span className="modal-field-label">Tenure (Months)</span>}
                      rules={[{ required: true, message: 'Please enter tenure' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0"
                        min={1}
                        max={360}
                        suffix=" months"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label={<span className="modal-field-label">Calculated EMI Amount</span>}>
                      <InputNumber
                        style={{ width: '100%', background: '#fafafa', color: '#1677ff', fontWeight: 'bold' }}
                        value={emiAmount}
                        disabled
                        precision={2}
                        placeholder="0.00"
                        prefix="₹"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    {/* Spacing alignment */}
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="issueDate"
                      label={<span className="modal-field-label">Issue Date</span>}
                      rules={[{ required: true, message: 'Please select issue date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="startDate"
                      label={<span className="modal-field-label">EMI Start Date</span>}
                      rules={[{ required: true, message: 'Please select start date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item
                  name="purpose"
                  label={<span className="modal-field-label">Purpose</span>}
                  rules={[{ required: true, message: 'Please enter purpose' }]}
                >
                  <TextArea rows={3} placeholder="Describe the purpose of this loan" />
                </Form.Item>
                
                <Form.Item
                  name="notes"
                  label={<span className="modal-field-label">Notes</span>}
                >
                  <TextArea rows={2} placeholder="Additional notes (optional)" />
                </Form.Item>
                
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space size={10}>
                    <Button onClick={() => {
                      setModalVisible(false);
                      setSelectedLoan(null);
                      form.resetFields();
                    }} shape="round">
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" shape="round">
                      {selectedLoan ? 'Save Changes' : 'Issue Loan'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Loan Details Modal */}
            <Modal
              title="Overview of Loan Agreement"
              open={detailsModalVisible}
              onCancel={() => {
                setDetailsModalVisible(false);
                setSelectedLoan(null);
              }}
              footer={[
                <Button key="close" type="primary" shape="round" onClick={() => {
                  setDetailsModalVisible(false);
                  setSelectedLoan(null);
                }}>
                  Dismiss Details
                </Button>
              ]}
              width={800}
              className="sales-modal"
            >
              {selectedLoan && (
                <div style={{ marginTop: '16px' }}>
                  <Descriptions bordered column={2} className="sales-descriptions" contentStyle={{ fontSize: '13px', color: '#434343' }} labelStyle={{ fontWeight: '600', color: '#595959', fontSize: '13px', width: '150px' }}>
                    <Descriptions.Item label="Staff Member">
                      <span style={{ fontWeight: 'bold', color: '#1677ff' }}>{selectedLoan.staffMember?.profile?.name}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Staff Phone">
                      {selectedLoan.staffMember?.phone}
                    </Descriptions.Item>
                    <Descriptions.Item label="Loan Type">
                      {selectedLoan.loanType}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      {(() => {
                        const map = {
                          active: 'sales-status-active',
                          completed: 'sales-status-complete',
                          defaulted: 'sales-status-inactive'
                        };
                        const cls = map[selectedLoan.status] || 'sales-status-pending';
                        return (
                          <span className={`sales-status-tag ${cls}`} style={{ textTransform: 'capitalize', fontSize: '11px' }}>
                            {selectedLoan.status || 'pending'}
                          </span>
                        );
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Loan Amount">
                      <span style={{ fontWeight: '600', color: '#262626' }}>₹{parseFloat(selectedLoan.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Interest Rate">
                      {parseFloat(selectedLoan.interestRate || 0).toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="Tenure">
                      {selectedLoan.tenure} months
                    </Descriptions.Item>
                    <Descriptions.Item label="EMI Amount">
                      <span style={{ fontWeight: '700', color: '#1677ff' }}>₹{parseFloat(selectedLoan.emiAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                      {selectedLoan.notes || <Text type="secondary" style={{ fontStyle: 'italic' }}>No additional notes</Text>}
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
