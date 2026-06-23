import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, message, Space, Table, Input, Typography, Modal, Row, Col, Statistic, Tag, Radio, DatePicker } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, KeyOutlined, WalletOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function PayoutWalletSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState({ balance: 0, used: 0, transactions: [] });
  const [keys, setKeys] = useState({ keyId: '', hasKeySecret: false, accountNumber: '' });
  const [keyIdInput, setKeyIdInput] = useState('');
  const [keySecretInput, setKeySecretInput] = useState('');
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [razorpayBalance, setRazorpayBalance] = useState({ balance: 0, availableBalance: 0 });
  const [cfError, setCfError] = useState(null);
  // Modals state
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null); // { paymentId, amount }
  const [activeTab, setActiveTab] = useState('DEPOSIT'); // 'DEPOSIT' or 'DISBURSEMENT'
  const [dateRange, setDateRange] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const handleExportExcel = async () => {
    try {
      message.loading('Generating Excel report...', 1.5);
      const startStr = dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : '';
      const endStr = dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : '';
      const response = await api.get('/admin/settings/payout-wallet/export-excel', {
        params: {
          type: activeTab,
          startDate: startStr,
          endDate: endStr,
          status: statusFilter
        },
        responseType: 'blob'
      });

      // Create file link
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `wallet_${activeTab.toLowerCase()}_report_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Excel report downloaded successfully!');
    } catch (e) {
      console.error(e);
      message.error('Failed to export Excel report: ' + (e.response?.data?.message || e.message || ''));
    }
  };
  
  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/settings/payout-wallet');
      if (resp?.data?.success) {
        setWallet(resp.data.wallet || { balance: 0, used: 0, transactions: [] });
        const returnedKeys = resp.data.keys || { keyId: '', hasKeySecret: false, accountNumber: '' };
        setKeys(returnedKeys);
        setKeyIdInput(returnedKeys.keyId || '');
        setKeySecretInput(returnedKeys.hasKeySecret ? '••••••••••••' : '');
        setAccountNumberInput(returnedKeys.accountNumber || '');
        setRazorpayBalance(resp.data.cashfreeBalance || { balance: 0, availableBalance: 0 });
        setCfError(resp.data.cfError || null);
      }
    } catch (e) {
      message.error('Failed to load wallet information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!keyIdInput.trim()) {
      message.warning('Please enter Razorpay Key ID');
      return;
    }
    if (!keySecretInput.trim()) {
      message.warning('Please enter Razorpay Key Secret');
      return;
    }

    try {
      setIsSavingKeys(true);
      const resp = await api.post('/admin/settings/payout-wallet/credentials', {
        keyId: keyIdInput,
        keySecret: keySecretInput,
        accountNumber: accountNumberInput
      });

      if (resp?.data?.success) {
        message.success('Razorpay credentials saved successfully!');
        fetchWalletDetails();
      } else {
        throw new Error(resp?.data?.message || 'Failed to save credentials');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || e.message || 'Failed to save credentials');
    } finally {
      setIsSavingKeys(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const linkId = urlParams.get('link_id');
    const razorpayPaymentId = urlParams.get('razorpay_payment_id');
    
    if (linkId) {
      const verifyPayment = async () => {
        try {
          setLoading(true);
          const verifyResp = await api.post('/admin/settings/payout-wallet/verify-pg-payment', { 
            linkId, 
            razorpayPaymentId 
          });
          if (verifyResp?.data?.success) {
            // Show success page with payment details. Prefer Razorpay payment id if provided.
            setPaymentSuccess({
              paymentId: verifyResp?.data?.paymentId || verifyResp?.data?.rzpPaymentId || razorpayPaymentId || null,
              paymentLinkId: verifyResp?.data?.rzpLinkId || linkId,
              amount: verifyResp?.data?.amount || null,
              message: verifyResp?.data?.message || 'Payment successful! Wallet balance updated.'
            });
            // Clean the URL without reloading
            window.history.replaceState({}, document.title, '/settings/payout-wallet');
          } else {
            message.error('Payment verification failed');
            navigate('/settings/payout-wallet', { replace: true });
          }
        } catch (err) {
          message.error(err?.response?.data?.message || 'Payment verification failed');
          navigate('/settings/payout-wallet', { replace: true });
        } finally {
          fetchWalletDetails();
          setLoading(false);
        }
      };
      verifyPayment();
    } else {
      fetchWalletDetails();
    }
  }, []);

  const handleTopup = async () => {
    const amt = Number(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      message.warning('Please enter a valid deposit amount');
      return;
    }

    try {
      setLoading(true);
      const resp = await api.post('/admin/settings/payout-wallet/create-pg-link', { amount: amt });
      if (resp?.data?.success) {
        if (resp.data.isSimulated) {
          message.success(resp.data.message || 'Direct deposit simulated successfully');
          setTopupAmount('');
          setIsTopupModalOpen(false);
          fetchWalletDetails();
        } else if (resp.data.linkUrl) {
          message.loading('Redirecting to Razorpay Payment Gateway...', 2);
          window.location.href = resp.data.linkUrl;
        } else {
          throw new Error('Failed to generate payment link');
        }
      } else {
        throw new Error(resp?.data?.message || 'Failed to generate payment link');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || e.message || 'Failed to initialize payment gateway');
      setLoading(false);
    }
  };



  const depositColumns = [
    {
      title: 'Payment ID',
      dataIndex: 'rzpPaymentId',
      key: 'rzpPaymentId',
      render: (rzpPaymentId, record) => <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{rzpPaymentId || record.id}</Text>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: '#0f172a' }}>
          ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <Text>{new Date(date).toLocaleString('en-IN')}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'SUCCESS' ? 'success' : status === 'PENDING' ? 'warning' : 'error'} style={{ borderRadius: '6px' }}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Remarks/Details',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (remarks) => <Text type="secondary" style={{ fontSize: '13px' }}>{remarks}</Text>
    }
  ];

  const payoutColumns = [
    {
      title: 'Payout ID',
      dataIndex: 'payoutId',
      key: 'payoutId',
      render: (payoutId, record) => <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{payoutId || record.id}</Text>
    },
    {
      title: 'Employee',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name, record) => (
        <div>
          <Text strong style={{ fontSize: '13px' }}>{name || 'Unknown'}</Text>
          {record.staffId && <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {record.staffId}</div>}
        </div>
      )
    },
    {
      title: 'Bank Details',
      key: 'bankDetails',
      render: (_, record) => (
        <div>
          {record.bankAccount ? (
            <>
              <div style={{ fontSize: '12px', fontWeight: '500' }}>A/c: {record.bankAccount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>IFSC: {record.bankIfsc}</div>
            </>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: '#0f172a' }}>
          ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <Text>{new Date(date).toLocaleString('en-IN')}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'SUCCESS' || status === 'PROCESSED') color = 'success';
        else if (status === 'PENDING' || status === 'PROCESSING' || status === 'QUEUED') color = 'warning';
        else if (status === 'FAILED' || status === 'REJECTED') color = 'error';
        return (
          <Tag color={color} style={{ borderRadius: '6px' }}>
            {status}
          </Tag>
        );
      }
    },
    {
      title: 'Remarks / Failure Reason',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (remarks) => <Text type="secondary" style={{ fontSize: '13px' }}>{remarks}</Text>
    }
  ];

  const filteredTransactions = (wallet.transactions || []).filter(tx => {
    if (tx.type !== activeTab) return false;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const txDate = new Date(tx.date);
      const start = dateRange[0].toDate ? dateRange[0].toDate() : new Date(dateRange[0]);
      const end = dateRange[1].toDate ? dateRange[1].toDate() : new Date(dateRange[1]);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (txDate < start || txDate > end) return false;
    }
    if (statusFilter && statusFilter !== 'ALL') {
      if (String(tx.status).toUpperCase() !== String(statusFilter).toUpperCase()) return false;
    }
    return true;
  });


  // ── Payment Success Screen ──────────────────────────────────────────────────
  if (paymentSuccess) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} />
        <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
          <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Payroll Wallet" />
          <Content style={{ margin: '0', padding: 0, background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)', height: 'calc(100vh - 64px)', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%', padding: '32px 24px' }}>
              {/* Success Icon */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  width: '96px', height: '96px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 0 16px rgba(16,185,129,0.1), 0 0 0 32px rgba(16,185,129,0.05)'
                }}>
                  <CheckCircleOutlined style={{ fontSize: '48px', color: '#fff' }} />
                </div>
                <Title level={2} style={{ margin: '0 0 8px', color: '#065f46', fontWeight: '800' }}>
                  Payment Successful! 🎉
                </Title>
                <Text type="secondary" style={{ fontSize: '15px' }}>
                  Your funds have been added to your Payroll Wallet successfully.
                </Text>
              </div>

              {/* Details Card */}
              <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -5px rgba(0,0,0,0.04)',
                marginBottom: '28px',
                border: '1px solid #d1fae5'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Payment ID */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px' }}>
                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: '13px' }}>Payment ID</Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1e293b', fontWeight: '700', maxWidth: '220px', wordBreak: 'break-all', textAlign: 'right' }}>
                      {paymentSuccess.paymentId || paymentSuccess.paymentLinkId}
                    </Text>
                  </div>


                  {/* Amount */}
                  {paymentSuccess.amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <Text style={{ color: '#064e3b', fontWeight: '600', fontSize: '13px' }}>Amount Added</Text>
                      <Text style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>
                        ₹{Number(paymentSuccess.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </div>
                  )}

                  {/* Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px' }}>
                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: '13px' }}>Status</Text>
                    <Tag color="success" style={{ borderRadius: '20px', fontWeight: '700', fontSize: '13px', padding: '2px 14px', margin: 0 }}>SUCCESS</Tag>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <Button
                type="primary"
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={() => setPaymentSuccess(null)}
                style={{
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  height: '48px',
                  paddingLeft: '28px',
                  paddingRight: '28px',
                  fontWeight: '700',
                  fontSize: '15px',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
                }}
              >
                Back to Payroll Wallet
              </Button>
            </div>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Payroll Wallet" />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          
          {/* Title Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                shape="circle" 
                onClick={() => navigate('/settings')} 
                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
              />
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>Payroll Wallet</Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Add funds, check ledger, and disburse instant payouts via Razorpay</Text>
              </div>
            </div>
            
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsTopupModalOpen(true)}
                style={{ borderRadius: '8px', background: '#10b981', borderColor: '#10b981' }}
              >
                Add Funds
              </Button>
            </Space>
          </div>

          {/* Stats Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12}>
              <Card style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
                <Statistic 
                  title={<span style={{ fontWeight: '600', color: '#64748b' }}>Wallet Balance</span>}
                  value={wallet.balance}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#10b981', fontWeight: '800' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #ef4444' }}>
                <Statistic 
                  title={<span style={{ fontWeight: '600', color: '#64748b' }}>Total Used / Paid Funds</span>}
                  value={wallet.used}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#ef4444', fontWeight: '800' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Razorpay Credentials Card */}
          <Card 
            title={
              <Space>
                <KeyOutlined style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: '700', color: '#1e293b' }}>Razorpay API Credentials</span>
              </Space>
            }
            style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                {keys.keyId ? (
                  <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: '6px', fontSize: '13px', padding: '4px 10px' }}>
                    Connected
                  </Tag>
                ) : (
                  <Tag color="warning" icon={<InfoCircleOutlined />} style={{ borderRadius: '6px', fontSize: '13px', padding: '4px 10px' }}>
                    Not Configured (Payouts & deposits will not work)
                  </Tag>
                )}
              </div>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: '4px' }}><Text strong>Razorpay Key ID</Text></div>
                  <Input 
                    placeholder="rzp_live_..." 
                    value={keyIdInput} 
                    onChange={(e) => setKeyIdInput(e.target.value)} 
                    style={{ borderRadius: '6px' }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: '4px' }}><Text strong>Razorpay Key Secret</Text></div>
                  <Input.Password 
                    placeholder="Enter Secret Key" 
                    value={keySecretInput} 
                    onChange={(e) => setKeySecretInput(e.target.value)} 
                    style={{ borderRadius: '6px' }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: '4px' }}><Text strong>RazorpayX Account Number (Virtual Account)</Text></div>
                  <Input 
                    placeholder="e.g. 2323230077283719" 
                    value={accountNumberInput} 
                    onChange={(e) => setAccountNumberInput(e.target.value)} 
                    style={{ borderRadius: '6px' }}
                  />
                </Col>
              </Row>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button 
                  type="primary" 
                  onClick={handleSaveKeys} 
                  loading={isSavingKeys}
                  style={{ borderRadius: '8px', background: '#3b82f6', borderColor: '#3b82f6' }}
                >
                  Save Credentials
                </Button>
              </div>
            </div>
          </Card>

          {/* CF Info Banner */}
          {cfError && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <CloseCircleOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <div>
                <Text strong style={{ color: '#9f1239' }}>Razorpay API Auth Issue:</Text>
                <div style={{ fontSize: '13px', color: '#be123c' }}>{cfError}. Please check your Razorpay API credentials in settings.</div>
              </div>
            </div>
          )}

          {/* Wallet Transaction Ledger Card */}
          <Card 
            title={
              <span style={{ fontWeight: '700', color: '#10b981' }}>Wallet Deposits Ledger</span>
            }
            style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px' }}
          >
            {/* Filter controls row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Space wrap>
                <div>
                  <span style={{ marginRight: '8px', fontWeight: '500', color: '#64748b' }}>Date Range:</span>
                  <DatePicker.RangePicker 
                    value={dateRange} 
                    onChange={(values) => setDateRange(values)} 
                    size="small"
                    style={{ width: '250px', borderRadius: '6px' }}
                    placeholder={['Start Date', 'End Date']}
                  />
                </div>
                <div>
                  <span style={{ marginRight: '8px', fontWeight: '500', color: '#64748b' }}>Status:</span>
                  <Radio.Group
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="small"
                    style={{ borderRadius: '6px' }}
                  >
                    <Radio.Button value="ALL">All</Radio.Button>
                    <Radio.Button value="SUCCESS">Success</Radio.Button>
                    <Radio.Button value="PENDING">Pending</Radio.Button>
                    <Radio.Button value="FAILED">Failed</Radio.Button>
                  </Radio.Group>
                </div>
              </Space>

              <Button
                type="primary"
                onClick={handleExportExcel}
                icon={<FileExcelOutlined />}
                style={{ 
                  borderRadius: '8px', 
                  background: '#16a34a', 
                  borderColor: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: '600'
                }}
              >
                Export to Excel
              </Button>
            </div>

            <Table 
              dataSource={filteredTransactions}
              columns={depositColumns}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '25', '50'] }}
              size="middle"
              loading={loading}
              bordered
            />
          </Card>



        </Content>
      </Layout>
      {/* Topup Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WalletOutlined style={{ color: '#10b981' }} />
            <span style={{ fontWeight: '700' }}>Add Funds</span>
          </div>
        }
        open={isTopupModalOpen}
        onOk={handleTopup}
        onCancel={() => setIsTopupModalOpen(false)}
        okText="Proceed to Pay"
        cancelText="Cancel"
      >
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
            Enter the amount you wish to add to your Payout Wallet. We will redirect you to Razorpay's checkout page to complete the deposit.
          </Text>
          <Input 
            prefix="₹" 
            placeholder="e.g. 50000" 
            value={topupAmount} 
            onChange={(e) => setTopupAmount(e.target.value)} 
            style={{ borderRadius: '6px', fontSize: '16px' }}
            onPressEnter={handleTopup}
          />
        </div>
      </Modal>
    </Layout>
  );
}
