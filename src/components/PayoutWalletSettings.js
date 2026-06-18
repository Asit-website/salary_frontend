import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, message, Space, Table, Input, Typography, Modal, Row, Col, Statistic, Tag, Radio } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, KeyOutlined, WalletOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
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
  const [keys, setKeys] = useState({ clientId: '', clientSecret: '' });
  const [razorpayBalance, setRazorpayBalance] = useState({ balance: 0, availableBalance: 0 });
  const [cfError, setCfError] = useState(null);
  const [disbursementStatusFilter, setDisbursementStatusFilter] = useState('SUCCESS');
  // Modals state
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null); // { paymentId, amount }
  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/settings/payout-wallet');
      if (resp?.data?.success) {
        setWallet(resp.data.wallet || { balance: 0, used: 0, transactions: [] });
        setKeys(resp.data.keys || { clientId: '', clientSecret: '' });
        setRazorpayBalance(resp.data.cashfreeBalance || { balance: 0, availableBalance: 0 });
        setCfError(resp.data.cfError || null);
      }
    } catch (e) {
      message.error('Failed to load wallet information');
    } finally {
      setLoading(false);
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



  const ledgerColumns = [
    {
      title: 'Transaction ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id}</Text>
    },
    {
      title: 'Staff Name',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name, record) => {
        const staffName = name || (record.remarks?.match(/Salary to\s+(.+?)\s+via/) || [])[1] || '—';
        return <Text strong style={{ color: '#1e293b' }}>{staffName}</Text>;
      }
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

  const depositColumns = [
    {
      title: 'Transaction ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id}</Text>
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

  const depositTransactions = (wallet.transactions || []).filter(tx => tx.type === 'DEPOSIT');
  const disbursementTransactions = (wallet.transactions || []).filter(tx => tx.type === 'DISBURSEMENT');
  const filteredDisbursementTransactions = disbursementTransactions.filter(tx => {
    if (disbursementStatusFilter === 'ALL') return true;
    return tx.status === disbursementStatusFilter;
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
                  {paymentSuccess.paymentId && paymentSuccess.paymentLinkId && paymentSuccess.paymentId !== paymentSuccess.paymentLinkId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', marginTop: '12px' }}>
                      <Text style={{ color: '#64748b', fontWeight: '600', fontSize: '13px' }}>Payment Link ID</Text>
                      <Text style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1e293b', fontWeight: '700', maxWidth: '220px', wordBreak: 'break-all', textAlign: 'right' }}>
                        {paymentSuccess.paymentLinkId}
                      </Text>
                    </div>
                  )}

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

          {/* Added Funds Ledger Card */}
          <Card 
            title={<span style={{ fontWeight: '700', color: '#10b981' }}>Added Funds (Deposits) History</span>}
            style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px' }}
          >
            <Table 
              dataSource={depositTransactions}
              columns={depositColumns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
              loading={loading}
              bordered
            />
          </Card>

          {/* Disbursement Ledger Card */}
          <Card 
            title={<span style={{ fontWeight: '700', color: '#3b82f6' }}>Salary Disbursement (Payouts) History</span>}
            style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
            extra={
              <Radio.Group 
                value={disbursementStatusFilter} 
                onChange={(e) => setDisbursementStatusFilter(e.target.value)} 
                size="small"
                buttonStyle="solid"
              >
                <Radio.Button value="SUCCESS">Success</Radio.Button>
                <Radio.Button value="FAILED">Failed</Radio.Button>
                <Radio.Button value="ALL">All</Radio.Button>
              </Radio.Group>
            }
          >
            <Table 
              dataSource={filteredDisbursementTransactions}
              columns={ledgerColumns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
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
