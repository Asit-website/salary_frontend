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
  DeleteOutlined, 
  EyeOutlined,
  CalendarOutlined,
  ReloadOutlined,
  EditOutlined,
  WalletOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

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
      render: (text, record) => {
        const name = record.staffMember?.profile?.name || 'Unknown';
        const phone = record.staffMember?.phone || 'No phone';
        return (
          <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <div style={{
              width: '36px',
              height: '36px',
              flexShrink: 0,
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
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <span style={{ fontWeight: '600', color: '#262626' }}>₹{(Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
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
            icon={<EditOutlined style={{ color: '#1677ff' }} />} 
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button 
            size="small" 
            shape="round"
            danger
            icon={<DeleteOutlined />} 
            onClick={() => {
              Modal.confirm({
                title: 'Are you sure you want to delete this advance?',
                content: 'This action cannot be undone.',
                okButtonProps: { shape: 'round' },
                cancelButtonProps: { shape: 'round' },
                onOk: () => handleDelete(record.id)
              });
            }}
          >
            Delete
          </Button>
        </div>
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
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Staff Advances" 
        />
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div>
            {/* Beautiful Custom KPI Statistics Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} md={8}>
                <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Total Advances</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#262626', lineHeight: '1.2' }}>{advances.length}</div>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: '20px', boxShadow: '0 4px 10px rgba(22, 119, 255, 0.1)' }}>
                      <WalletOutlined />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Pending Deductions</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#ff4d4f', lineHeight: '1.4' }}>
                        ₹{advances.filter(a => a.deductionMonth > dayjs().format('YYYY-MM')).reduce((sum, a) => sum + parseFloat(a.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#fff1f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', fontSize: '20px', boxShadow: '0 4px 10px rgba(255, 77, 79, 0.1)' }}>
                      <CalendarOutlined />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Total Deducted</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#52c41a', lineHeight: '1.4' }}>
                        ₹{advances.filter(a => a.deductionMonth <= dayjs().format('YYYY-MM')).reduce((sum, a) => sum + parseFloat(a.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: '20px', boxShadow: '0 4px 10px rgba(82, 196, 26, 0.1)' }}>
                      <CheckCircleOutlined />
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
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Active Advances Registry</Title>
                <Space size={12}>
                  <Button icon={<ReloadOutlined />} shape="round" onClick={loadAdvances}>Refresh</Button>
                  <Button 
                    type="primary" 
                    shape="round"
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
              </div>

              <Table
                columns={columns}
                dataSource={advances}
                rowKey="id"
                loading={loading}
                className="sales-table"
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
              title={selectedAdvance && modalVisible ? 'Edit Staff Advance Record' : 'Record Staff Advance payment'}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                setSelectedAdvance(null);
                form.resetFields();
              }}
              footer={null}
              width={700}
              className="sales-modal"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ advanceDate: dayjs(), deductionMonth: dayjs() }}
                style={{ marginTop: '12px' }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="staffId"
                      label={<span className="modal-field-label">Select Staff Member</span>}
                      rules={[{ required: true, message: 'Please select staff' }]}
                    >
                      <Select 
                        showSearch 
                        placeholder="Search staff member"
                        optionFilterProp="children"
                        dropdownStyle={{ borderRadius: '8px' }}
                      >
                        {staff.map(s => <Option key={s.id} value={s.id}>{s.name} ({s.phone})</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="amount"
                      label={<span className="modal-field-label">Advance Amount</span>}
                      rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={1} placeholder="0.00" prefix="₹" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="advanceDate"
                      label={<span className="modal-field-label">Date Given</span>}
                      rules={[{ required: true, message: 'Please select date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="deductionMonth"
                      label={<span className="modal-field-label">Deduction Month</span>}
                      rules={[{ required: true, message: 'Please select deduction month' }]}
                    >
                      <DatePicker picker="month" style={{ width: '100%' }} format="MMMM YYYY" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="notes" label={<span className="modal-field-label">Notes</span>}>
                  <TextArea rows={3} placeholder="Provide descriptive notes for this payment (optional)" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space size={10}>
                    <Button onClick={() => {
                      setModalVisible(false);
                      setSelectedAdvance(null);
                      form.resetFields();
                    }} shape="round">
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading} shape="round">
                      {selectedAdvance ? 'Save Changes' : 'Record Advance'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>

            {/* Details Modal */}
            <Modal
              title="Overview of Staff Advance"
              open={detailsModalVisible}
              onCancel={() => setDetailsModalVisible(false)}
              footer={[
                <Button key="close" type="primary" shape="round" onClick={() => setDetailsModalVisible(false)}>
                  Dismiss Details
                </Button>
              ]}
              className="sales-modal"
              width={600}
            >
              {selectedAdvance && (
                <div style={{ marginTop: '16px' }}>
                  <Descriptions bordered column={1} contentStyle={{ fontSize: '13px', color: '#434343' }} labelStyle={{ fontWeight: '600', color: '#595959', fontSize: '13px', width: '150px' }}>
                    <Descriptions.Item label="Staff Member">
                      <span style={{ fontWeight: 'bold', color: '#1677ff' }}>{selectedAdvance.staffMember?.profile?.name}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Amount">
                      <span style={{ fontWeight: '700', color: '#262626' }}>₹{(Number(selectedAdvance.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date Given">
                      {dayjs(selectedAdvance.advanceDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Deduction Month">
                      {dayjs(selectedAdvance.deductionMonth, 'YYYY-MM').format('MMMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Notes">
                      {selectedAdvance.notes || <Text type="secondary" style={{ fontStyle: 'italic' }}>No additional notes</Text>}
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

export default Advances;
