import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Table, 
  Button, 
  Space, 
  Tabs, 
  Tag, 
  Form, 
  Select, 
  Input, 
  InputNumber, 
  Switch, 
  Modal, 
  message, 
  Tooltip,
  Typography,
  Divider,
  Row,
  Col,
  Descriptions
} from 'antd';
import { 
  PlusOutlined, 
  DownloadOutlined, 
  CreditCardOutlined, 
  EyeOutlined,
  EditOutlined,
  SettingOutlined,
  SaveOutlined,
  UserOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const FnFSettlementList = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('settlements');
  
  // Settings State
  const [settingsForm] = Form.useForm();
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Payment Record Modal State
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [payForm] = Form.useForm();
  const [payLoading, setPayLoading] = useState(false);

  // Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [settlementDetails, setSettlementDetails] = useState(null);

  // Filter State
  const [searchText, setSearchText] = useState('');
  const [filterDepartment, setFilterDepartment] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  // Derived: unique departments from settlements
  const departmentOptions = [...new Set(
    settlements
      .map(s => s.user?.profile?.department)
      .filter(Boolean)
  )].map(d => ({ label: d, value: d }));

  // Filtered data
  const filteredSettlements = settlements.filter(s => {
    const profile = s.user?.profile || {};
    const name = (profile.name || '').toLowerCase();
    const staffId = (profile.staffId || '').toLowerCase();
    const dept = profile.department || '';
    const status = s.status || '';

    const matchSearch = !searchText || name.includes(searchText.toLowerCase()) || staffId.includes(searchText.toLowerCase());
    const matchDept = !filterDepartment || dept === filterDepartment;
    const matchStatus = !filterStatus || status === filterStatus;

    return matchSearch && matchDept && matchStatus;
  });

  useEffect(() => {
    loadSettlements();
    loadFnFSettings();
  }, []);

  const loadSettlements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/payroll/fnf');
      if (response.data?.success) {
        setSettlements(response.data.data || []);
      }
    } catch (error) {
      message.error('Failed to load FnF settlements');
    } finally {
      setLoading(false);
    }
  };

  const loadFnFSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await api.get('/admin/payroll/fnf/settings');
      if (response.data?.success && response.data.data) {
        settingsForm.setFieldsValue(response.data.data);
      }
    } catch (error) {
      message.error('Failed to load FnF settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (values) => {
    try {
      setSettingsLoading(true);
      const response = await api.post('/admin/payroll/fnf/settings', values);
      if (response.data?.success) {
        message.success('FnF Settings saved successfully');
      }
    } catch (error) {
      message.error('Failed to save FnF settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDownloadPDF = (record) => {
    if (!record.payslipPath) {
      message.warning('PDF Statement not generated yet');
      return;
    }
    const downloadUrl = `${API_BASE_URL}/admin/payroll/fnf/${record.id}/pdf`;
    // Use impersonate token if available (superadmin viewing a client's org)
    const token = sessionStorage.getItem('impersonate_token') || localStorage.getItem('token');

    // Build the same headers the axios interceptor builds (X-Org-Id is critical for superadmin)
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    const userStr = sessionStorage.getItem('impersonate_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.orgAccountId) {
          headers['X-Org-Id'] = user.orgAccountId;
        }
      } catch (_) {}
    }

    fetch(downloadUrl, { headers })
    .then(response => {
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fnf-statement-${record.user?.profile?.name || 'employee'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(() => {
      message.error('Failed to download FnF statement PDF');
    });
  };

  const openPayModal = (record) => {
    setSelectedSettlement(record);
    payForm.resetFields();
    setPayModalVisible(true);
  };

  const handleRecordPayment = async (values) => {
    try {
      setPayLoading(true);
      const response = await api.post(`/admin/payroll/fnf/${selectedSettlement.id}/pay`, values);
      if (response.data?.success) {
        message.success('Payment recorded successfully');
        setPayModalVisible(false);
        loadSettlements();
      }
    } catch (error) {
      message.error('Failed to record payment');
    } finally {
      setPayLoading(false);
    }
  };

  const viewSettlementDetails = (record) => {
    setSettlementDetails(record);
    setDetailsModalVisible(true);
  };

  const handleConfirmSettle = (record) => {
    Modal.confirm({
      title: 'Settle FnF Settlement',
      content: `Are you sure you want to finalize and settle this FnF settlement for ${record.user?.profile?.name || 'this employee'}? This will deactivate their employee profile and mark all pending payrolls, loans, advances, and expense claims as settled.`,
      okText: 'Yes, Settle',
      cancelText: 'Cancel',
      okType: 'primary',
      onOk: async () => {
        try {
          const response = await api.post(`/admin/payroll/fnf/${record.id}/settle`);
          if (response.data?.success) {
            message.success('Settlement finalized and settled successfully!');
            loadSettlements();
          }
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to settle settlement');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Employee Details',
      key: 'employee',
      render: (text, record) => {
        const profile = record.user?.profile || {};
        return (
          <Space direction="vertical" size={1}>
            <Text strong style={{ color: '#1e293b', fontSize: '14px' }}>
              {profile.name || record.user?.phone || 'No Name'}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ID: {profile.staffId || '—'} | {profile.designation || '—'}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Last Working Day',
      dataIndex: 'finalWorkingDate',
      key: 'finalWorkingDate',
      render: (date) => date ? new Date(date).toLocaleDateString('en-IN') : '—'
    },
    {
      title: 'Notice Served',
      key: 'notice',
      render: (text, record) => (
        <span>{record.noticeDaysServed} / {record.noticeDaysRequired} Days</span>
      )
    },
    {
      title: 'Total Earnings',
      dataIndex: 'totalEarnings',
      key: 'totalEarnings',
      render: (val) => <Text strong style={{ color: '#10b981' }}>₹{Number(val).toLocaleString('en-IN')}</Text>
    },
    {
      title: 'Total Deductions',
      dataIndex: 'totalDeductions',
      key: 'totalDeductions',
      render: (val) => <Text strong style={{ color: '#ef4444' }}>₹{Number(val).toLocaleString('en-IN')}</Text>
    },
    {
      title: 'Net Settled Payout',
      dataIndex: 'netAmount',
      key: 'netAmount',
      render: (val) => (
        <Tag color="blue" style={{ fontSize: '13px', padding: '4px 8px', fontWeight: 'bold' }}>
          ₹{Number(val).toLocaleString('en-IN')}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let className = 'sales-status-tag sales-status-active';
        if (status === 'SETTLED') className = 'sales-status-tag sales-status-inprogress';
        if (status === 'PAID') className = 'sales-status-tag sales-status-complete';
        if (status === 'DRAFT') className = 'sales-status-tag sales-status-pending';
        return <span className={className}>{status}</span>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="middle">
          <Tooltip title="View Breakdown">
            <Button 
              type="text" 
              icon={<EyeOutlined style={{ color: '#475569' }} />} 
              onClick={() => viewSettlementDetails(record)}
            />
          </Tooltip>
          {record.status !== 'PAID' && (
            <Tooltip title="Edit Settlement">
              <Button 
                type="text" 
                icon={<EditOutlined style={{ color: '#0ea5e9' }} />} 
                onClick={() => navigate('/payroll/fnf/process', { state: { editRecord: record } })}
              />
            </Tooltip>
          )}
          {record.status === 'DRAFT' && (
            <Tooltip title="Settle Settlement">
              <Button 
                type="text" 
                icon={<CheckCircleOutlined style={{ color: '#10b981' }} />} 
                onClick={() => handleConfirmSettle(record)}
              />
            </Tooltip>
          )}
          {record.status === 'SETTLED' && (
            <Tooltip title="Record Payout Payment">
              <Button 
                type="text" 
                icon={<CreditCardOutlined style={{ color: '#d97706' }} />} 
                onClick={() => openPayModal(record)}
              />
            </Tooltip>
          )}
          {record.payslipPath && (
            <Tooltip title="Download Statement PDF">
              <Button 
                type="text" 
                icon={<DownloadOutlined style={{ color: '#1677ff' }} />} 
                onClick={() => handleDownloadPDF(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Card className="sales-content-card" bodyStyle={{ padding: '24px' }}>
            
            <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fafafa', padding: '16px', borderRadius: '12px', border: '1px solid #f0f2f5' }}>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>
                  Full & Final (FnF) Settlement
                </Title>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  Manage and process final settlements for exiting employee profiles
                </Text>
              </div>
              {activeTab === 'settlements' && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => navigate('/payroll/fnf/process')}
                  shape="round"
                >
                  New FnF Settlement
                </Button>
              )}
            </div>

            <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k)} type="line" size="large" className="sales-tabs">
              
              <TabPane tab="Settlements List" key="settlements">
                {/* Search & Filter Row */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e8ecf0' }}>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="Search by name or staff ID"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 240, borderRadius: 8 }}
                  />
                  <Select
                    placeholder={<span><FilterOutlined /> Department</span>}
                    value={filterDepartment}
                    onChange={val => setFilterDepartment(val)}
                    allowClear
                    style={{ width: 180, borderRadius: 8 }}
                    options={departmentOptions}
                  />
                  <Select
                    placeholder={<span><FilterOutlined /> Status</span>}
                    value={filterStatus}
                    onChange={val => setFilterStatus(val)}
                    allowClear
                    style={{ width: 150, borderRadius: 8 }}
                  >
                    <Option value="DRAFT">Draft</Option>
                    <Option value="SETTLED">Settled</Option>
                    <Option value="PAID">Paid</Option>
                  </Select>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => { setSearchText(''); setFilterDepartment(null); setFilterStatus(null); }}
                    style={{ borderRadius: 8 }}
                  >Reset</Button>
                  <Text type="secondary" style={{ marginLeft: 'auto', fontSize: '13px' }}>
                    Showing <strong>{filteredSettlements.length}</strong> of <strong>{settlements.length}</strong> records
                  </Text>
                </div>
                <Table 
                  columns={columns} 
                  dataSource={filteredSettlements} 
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  style={{ marginTop: '4px' }}
                  className="sales-table"
                />
              </TabPane>

              <TabPane tab="FnF Settings Policy" key="settings">
                <Form
                  form={settingsForm}
                  layout="vertical"
                  onFinish={handleSaveSettings}
                  initialValues={{
                    leaveBasis: 'basic_da',
                    leaveDivisor: 'calendar_month',
                    leaveMaxDays: null,
                    noticeBasis: 'gross',
                    noticeDivisor: 'calendar_month',
                    gratuityEnabled: true,
                    gratuityMinYears: 4.80,
                    gratuityDivisor: 26,
                    gratuityMultiplierDays: 15
                  }}
                  style={{ width: '100%', marginTop: '15px' }}
                >
                  <Row gutter={24}>
                    <Col xl={12} lg={12} md={24} sm={24} xs={24}>
                      <Card 
                        title={<span style={{ fontWeight: '700', color: '#1e293b' }}>Leave Encashment Policy</span>}
                        bordered={false}
                        style={{ background: '#f8fafc', marginBottom: '20px', borderRadius: '12px' }}
                      >
                        <Row gutter={24}>
                          <Col span={12}>
                            <Form.Item 
                              name="leaveBasis" 
                              label="Daily Rate Basis Salary" 
                              tooltip="Formula base used to calculate leaves encashment daily rate"
                              rules={[{ required: true }]}
                            >
                              <Select placeholder="Select basis">
                                <Option value="basic">Basic Salary</Option>
                                <Option value="basic_da">Basic Salary + DA</Option>
                                <Option value="gross">Gross Salary</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item 
                              name="leaveDivisor" 
                              label="Working Days Divisor"
                              tooltip="Divide basis salary by this number to get daily leave encashment rate"
                              rules={[{ required: true }]}
                            >
                              <Select placeholder="Select divisor">
                                <Option value="calendar_month">Calendar Month Days (Dynamic)</Option>
                                <Option value="30">30 Days</Option>
                                <Option value="26">26 Days</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>
                        {/* <Row gutter={24}>
                          <Col span={12}>
                            <Form.Item 
                              name="leaveMaxDays" 
                              label="Maximum Encashed Leaves (Limit)"
                              tooltip="Set maximum limit of leaves that can be encashed. Leave empty for no limit."
                            >
                              <InputNumber min={0} max={365} placeholder="No Limit (Encash all remaining)" style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row> */}
                      </Card>

                      <Card 
                        title={<span style={{ fontWeight: '700', color: '#1e293b' }}>Notice Period Recovery Policy</span>}
                        bordered={false}
                        style={{ background: '#f8fafc', marginBottom: '20px', borderRadius: '12px' }}
                      >
                        <Row gutter={24}>
                          <Col span={12}>
                            <Form.Item 
                              name="noticeBasis" 
                              label="Daily Rate Basis Salary" 
                              tooltip="Formula base used to calculate notice recovery daily rate"
                              rules={[{ required: true }]}
                            >
                              <Select placeholder="Select basis">
                                <Option value="basic">Basic Salary</Option>
                                <Option value="basic_da">Basic Salary + DA</Option>
                                <Option value="gross">Gross Salary</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item 
                              name="noticeDivisor" 
                              label="Working Days Divisor"
                              tooltip="Divide basis salary by this number to get daily notice recovery rate"
                              rules={[{ required: true }]}
                            >
                              <Select placeholder="Select divisor">
                                <Option value="calendar_month">Calendar Month Days (Dynamic)</Option>
                                <Option value="30">30 Days</Option>
                                <Option value="26">26 Days</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    <Col xl={12} lg={12} md={24} sm={24} xs={24}>
                      <Card 
                        title={<span style={{ fontWeight: '700', color: '#1e293b' }}>Gratuity Payout Policy</span>}
                        bordered={false}
                        style={{ background: '#f8fafc', marginBottom: '20px', borderRadius: '12px', minHeight: 'calc(100% - 20px)' }}
                      >
                        <Row gutter={24} align="middle">
                          <Col span={12}>
                            <Form.Item name="gratuityEnabled" label="Enable Gratuity Calculation" valuePropName="checked">
                              <Switch checkedChildren="Yes" unCheckedChildren="No" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item 
                              name="gratuityMinYears" 
                              label="Minimum Service Tenure (Years)"
                              tooltip="Continuous service threshold to eligibility"
                              rules={[{ required: true }]}
                            >
                              <InputNumber min={1} max={10} step={0.1} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={24} style={{ marginTop: '15px' }}>
                          <Col span={12}>
                            <Form.Item 
                              name="gratuityDivisor" 
                              label="Gratuity Divisor Days"
                              rules={[{ required: true }]}
                            >
                              <InputNumber min={20} max={31} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item 
                              name="gratuityMultiplierDays" 
                              label="Multiplier Days per Completed Year"
                              tooltip="Typically 15 days of salary paid per completed year"
                              rules={[{ required: true }]}
                            >
                              <InputNumber min={5} max={30} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>

                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      icon={<SaveOutlined />} 
                      loading={settingsLoading}
                      shape="round"
                    >
                      Save Policy Rules
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>
            </Tabs>

          </Card>
        </Content>

        {/* 1. Record Payment Details Modal */}
        <Modal
          title={<span style={{ fontWeight: '700', color: '#1e293b' }}><CreditCardOutlined /> Record Payment Payout</span>}
          open={payModalVisible}
          onCancel={() => setPayModalVisible(false)}
          footer={null}
          destroyOnClose
          width={500}
          className="sales-modal"
        >
          <Form form={payForm} layout="vertical" onFinish={handleRecordPayment}>
            <Divider style={{ margin: '10px 0 20px 0' }} />
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Finalizing payout of net settlement amount: 
            </Text>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9', margin: '10px 0 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>{selectedSettlement?.user?.profile?.name || 'Employee'}</Text>
              <Text strong style={{ color: '#1677ff', fontSize: '16px' }}>₹{Number(selectedSettlement?.netAmount).toLocaleString('en-IN')}</Text>
            </div>

            <Form.Item 
              name="paymentMode" 
              label={<span className="modal-field-label">Payment Payout Mode</span>} 
              rules={[{ required: true, message: 'Please select payment mode' }]}
              initialValue="Bank Transfer"
            >
              <Select>
                <Option value="Bank Transfer">Bank Transfer (IMPS/NEFT/RTGS)</Option>
                <Option value="UPI">UPI Payout</Option>
                <Option value="Cheque">Bank Cheque</Option>
                <Option value="Cash">Cash Handover</Option>
              </Select>
            </Form.Item>

            <Form.Item 
              name="referenceNumber" 
              label={<span className="modal-field-label">Transaction Reference Number</span>} 
              rules={[{ required: true, message: 'Please enter reference number/UTR' }]}
            >
              <Input placeholder="Enter UTR, Cheque number or reference" />
            </Form.Item>

            <Form.Item name="remarks" label={<span className="modal-field-label">Payment Remarks/Notes</span>}>
              <TextArea rows={2} placeholder="Add payment notes here" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setPayModalVisible(false)} shape="round">Cancel</Button>
                <Button type="primary" htmlType="submit" loading={payLoading} shape="round">Record Paid Payout</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 2. View Settlement Details Modal */}
        <Modal
          title={<span style={{ fontWeight: '700', color: '#1e293b' }}><EyeOutlined /> FnF Settlement Breakdown</span>}
          open={detailsModalVisible}
          onCancel={() => setDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailsModalVisible(false)} shape="round">Close</Button>,
            settlementDetails?.payslipPath && (
              <Button key="pdf" type="primary" icon={<DownloadOutlined />} onClick={() => handleDownloadPDF(settlementDetails)} shape="round">Download Statement</Button>
            )
          ]}
          width={650}
          destroyOnClose
          className="sales-modal"
        >
          {settlementDetails && (
            <div>
              <Divider style={{ margin: '10px 0 20px 0' }} />
              
              <Row gutter={24} style={{ marginBottom: '20px' }}>
                <Col span={12}>
                  <Text type="secondary">Employee Details:</Text>
                  <div><Text strong style={{ fontSize: '15px' }}>{settlementDetails.user?.profile?.name || 'No Name'}</Text></div>
                  <div>ID: {settlementDetails.user?.profile?.staffId || '—'}</div>
                  <div>Designation: {settlementDetails.user?.profile?.designation || '—'}</div>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Text type="secondary">Settlement Metadata:</Text>
                  <div>Settlement Date: <Text strong>{new Date(settlementDetails.settlementDate).toLocaleDateString('en-IN')}</Text></div>
                  <div>LWD: <Text strong>{new Date(settlementDetails.finalWorkingDate).toLocaleDateString('en-IN')}</Text></div>
                  <div>Status: <Tag color={settlementDetails.status === 'PAID' ? 'gold' : 'green'}>{settlementDetails.status}</Tag></div>
                </Col>
              </Row>

              <Descriptions title={<span style={{ fontSize: '14px', color: '#1e293b' }}>Settled Dues & Additions</span>} bordered column={1} size="small" style={{ marginBottom: '20px' }}>
                <Descriptions.Item label="Final Month Prorated Salary">₹{Number(settlementDetails.pendingSalaryAmount || 0).toLocaleString('en-IN')}</Descriptions.Item>
                <Descriptions.Item label={`Leave Encashment (${settlementDetails.leaveEncashmentDays} days)`}>₹{Number(settlementDetails.leaveEncashmentAmount || 0).toLocaleString('en-IN')}</Descriptions.Item>
                <Descriptions.Item label="Gratuity Payout">₹{Number(settlementDetails.gratuityAmount || 0).toLocaleString('en-IN')}</Descriptions.Item>
                <Descriptions.Item label="Expense Claim Reimbursements">₹{Number(settlementDetails.expenseReimbursementAmount || 0).toLocaleString('en-IN')}</Descriptions.Item>
                {(typeof settlementDetails.otherEarnings === 'string' ? JSON.parse(settlementDetails.otherEarnings || '[]') : (settlementDetails.otherEarnings || [])).map((e, idx) => (
                  <Descriptions.Item key={`oth-e-${idx}`} label={e.label}>{`₹${Number(e.amount).toLocaleString('en-IN')}`}</Descriptions.Item>
                ))}
                <Descriptions.Item label={<Text strong>Total Earnings (A)</Text>} labelStyle={{ fontWeight: 'bold' }}>
                  <Text strong style={{ color: '#10b981' }}>₹{Number(settlementDetails.totalEarnings || 0).toLocaleString('en-IN')}</Text>
                </Descriptions.Item>
              </Descriptions>

              <Descriptions title={<span style={{ fontSize: '14px', color: '#1e293b' }}>Settled Recoveries & Deductions</span>} bordered column={1} size="small" style={{ marginBottom: '20px' }}>
                <Descriptions.Item label={`Notice Recovery (${settlementDetails.noticeDaysRequired - settlementDetails.noticeDaysServed} gap days)`}>₹{Number(settlementDetails.noticeRecoveryAmount || 0).toLocaleString('en-IN')}</Descriptions.Item>
                <Descriptions.Item label="Outstanding Loans Recovered">₹{Number(settlementDetails.loansDeductionAmount || 0).toLocaleString('en-IN')}</Descriptions.Item>
                <Descriptions.Item label="Pending Cash Advances Recovered">₹{Number(settlementDetails.advancesDeductionAmount || 0).toLocaleString('en-IN')}</Descriptions.Item>
                {(typeof settlementDetails.otherDeductions === 'string' ? JSON.parse(settlementDetails.otherDeductions || '[]') : (settlementDetails.otherDeductions || [])).map((d, idx) => (
                  <Descriptions.Item key={`oth-d-${idx}`} label={d.label}>{`₹${Number(d.amount).toLocaleString('en-IN')}`}</Descriptions.Item>
                ))}
                <Descriptions.Item label={<Text strong>Total Deductions (B)</Text>} labelStyle={{ fontWeight: 'bold' }}>
                  <Text strong style={{ color: '#ef4444' }}>₹{Number(settlementDetails.totalDeductions || 0).toLocaleString('en-IN')}</Text>
                </Descriptions.Item>
              </Descriptions>

              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <Text strong style={{ fontSize: '14px' }}>Net Payable Settlement Amount (A - B):</Text>
                <Text strong style={{ fontSize: '18px', color: '#1677ff' }}>₹{Number(settlementDetails.netAmount || 0).toLocaleString('en-IN')}</Text>
              </div>

              {settlementDetails.remarks && (
                <div style={{ fontStyle: 'italic', fontSize: '12px', color: '#64748b' }}>
                  <strong>Remarks:</strong> {settlementDetails.remarks}
                </div>
              )}
            </div>
          )}
        </Modal>

      </Layout>
    </Layout>
  );
};

export default FnFSettlementList;
