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
  DeleteOutlined, 
  EyeOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LogoutOutlined,
  ReloadOutlined,
  EditOutlined,
  WalletOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const Advances = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [form] = Form.useForm();
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Load advances
  const loadAdvances = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/advances', {
        params: {
          page: pagination.current,
          limit: pagination.pageSize
        }
      });
      setAdvances(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      message.error('Failed to load advances');
    } finally {
      setLoading(false);
    }
  };

  // Load staff
  const loadStaff = async () => {
    try {
      const response = await api.get('/admin/staff');
      setStaff(response.data.data || []);
    } catch (error) {
      message.error('Failed to load staff');
    }
  };

  // Submit advance (Create/Edit)
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        advanceDate: values.advanceDate.format('YYYY-MM-DD'),
        deductionMonth: values.deductionMonth.format('YYYY-MM'),
      };

      if (selectedAdvance && modalVisible) {
        await api.put(`/admin/advances/${selectedAdvance.id}`, payload);
        message.success('Advance updated successfully');
      } else {
        await api.post('/admin/advances', payload);
        message.success('Advance recorded successfully');
      }

      setModalVisible(false);
      setSelectedAdvance(null);
      form.resetFields();
      loadAdvances();
    } catch (error) {
      console.error('Submit error:', error);
      message.error(error.response?.data?.message || 'Failed to process advance');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setSelectedAdvance(record);
    form.setFieldsValue({
      ...record,
      advanceDate: dayjs(record.advanceDate),
      deductionMonth: dayjs(record.deductionMonth, 'YYYY-MM')
    });
    setModalVisible(true);
  };

  // Delete advance
  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/advances/${id}`);
      message.success('Advance deleted successfully');
      loadAdvances();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete advance');
    }
  };

  // View advance details
  const handleViewDetails = (record) => {
    setSelectedAdvance(record);
    setDetailsModalVisible(true);
  };

  // Table columns
  const columns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.staffMember?.profile?.name || 'Unknown'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.staffMember?.phone}</div>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Advance Date',
      dataIndex: 'advanceDate',
      key: 'advanceDate',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Deduction Month',
      dataIndex: 'deductionMonth',
      key: 'deductionMonth',
      render: (month) => dayjs(month, 'YYYY-MM').format('MMMM YYYY'),
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
          <Tooltip title="Edit Advance">
            <Button 
              type="link" 
              icon={<EditOutlined style={{ color: '#1890ff' }} />} 
              onClick={() => handleEdit(record)} 
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => {
                Modal.confirm({
                  title: 'Are you sure you want to delete this advance?',
                  content: 'This action cannot be undone.',
                  onOk: () => handleDelete(record.id)
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    loadAdvances();
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
            <Title level={4} style={{ margin: 0 }}>Staff Advances</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
          />
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Total Advances"
                    value={advances.length}
                    prefix={<WalletOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Pending Deductions"
                    value={advances.filter(a => a.deductionMonth > dayjs().format('YYYY-MM')).reduce((sum, a) => sum + parseFloat(a.amount), 0)}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CalendarOutlined />}
                    formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Total Deducted"
                    value={advances.filter(a => a.deductionMonth <= dayjs().format('YYYY-MM')).reduce((sum, a) => sum + parseFloat(a.amount), 0)}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                    formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title="Advances List"
              extra={
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={loadAdvances}>Refresh</Button>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedAdvance(null);
                      form.resetFields();
                      setModalVisible(true);
                    }}
                  >
                    Give Advance
                  </Button>
                </Space>
              }
            >
              <Table
                columns={columns}
                dataSource={advances}
                rowKey="id"
                loading={loading}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} advances`,
                }}
                onChange={(p) => {
                  setPagination(p);
                  loadAdvances();
                }}
              />
            </Card>

            {/* Give Advance Modal */}
            <Modal
              title={selectedAdvance && modalVisible ? 'Edit Staff Advance' : 'Give Staff Advance'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                setSelectedAdvance(null);
                form.resetFields();
              }}
              footer={null}
              width={700}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ advanceDate: dayjs(), deductionMonth: dayjs() }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="staffId"
                      label="Select Staff"
                      rules={[{ required: true, message: 'Please select staff' }]}
                    >
                      <Select 
                        showSearch 
                        placeholder="Search staff"
                        optionFilterProp="children"
                      >
                        {staff.map(s => <Option key={s.id} value={s.id}>{s.name} ({s.phone})</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="amount"
                      label="Advance Amount"
                      rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={1} placeholder="0.00" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="advanceDate"
                      label="Date Given"
                      rules={[{ required: true, message: 'Please select date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="deductionMonth"
                      label="Deduction Month"
                      rules={[{ required: true, message: 'Please select deduction month' }]}
                    >
                      <DatePicker picker="month" style={{ width: '100%' }} format="MMMM YYYY" />
                    </Form.Item>
                  </Col>
                </Row>


                <Form.Item name="notes" label="Notes">
                  <TextArea rows={3} placeholder="Optional notes" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => {
                      setModalVisible(false);
                      setSelectedAdvance(null);
                      form.resetFields();
                    }}>
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      {selectedAdvance ? 'Update Advance' : 'Give Advance'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Details Modal */}
            <Modal
              title="Advance Details"
              open={detailsModalVisible}
              onCancel={() => setDetailsModalVisible(false)}
              footer={[<Button key="close" onClick={() => setDetailsModalVisible(false)}>Close</Button>]}
            >
              {selectedAdvance && (
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Staff Member">{selectedAdvance.staffMember?.profile?.name}</Descriptions.Item>
                  <Descriptions.Item label="Amount">₹{parseFloat(selectedAdvance.amount).toLocaleString('en-IN')}</Descriptions.Item>
                  <Descriptions.Item label="Date Given">{dayjs(selectedAdvance.advanceDate).format('DD MMM YYYY')}</Descriptions.Item>
                  <Descriptions.Item label="Deduction Month">{dayjs(selectedAdvance.deductionMonth, 'YYYY-MM').format('MMMM YYYY')}</Descriptions.Item>
                  <Descriptions.Item label="Notes">{selectedAdvance.notes || '-'}</Descriptions.Item>
                </Descriptions>
              )}
            </Modal>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Advances;
