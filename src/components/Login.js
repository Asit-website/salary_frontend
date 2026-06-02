import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, Button, Card, message, Layout, Typography, Space, Tag, Row, Col } from 'antd';
import { PhoneOutlined, SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Login = () => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [counter, setCounter] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  // Clear any existing session token/cookie on login mount (Failsafe for logout)
  useEffect(() => {
    const clearSession = async () => {
      try {
        await api.post('/auth/logout');
      } catch (_) {}
    };
    clearSession();
  }, []);

  // countdown for resend
  useEffect(() => {
    if (!counter) return;
    const t = setInterval(() => setCounter((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [counter]);

  const normalizePhone = (p) => String(p || '').replace(/[^0-9]/g, '').slice(-10);
  const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

  const sendOtp = async () => {
    const ph = normalizePhone(phone);
    if (!ph || ph.length !== 10) {
      message.error('Enter valid 10-digit phone number');
      return;
    }
    try {
      setSending(true);
      const res = await api.post('/auth/send-otp', { phone: ph });
      if (res.data?.success) {
        message.success('OTP sent');
        setStep('otp');
        setCounter(60);
        setOtp(['', '', '', '', '', '']); // Reset OTP fields
      } else {
        message.error(res.data?.message || 'Failed to send OTP');
      }
    } catch (e) {
      message.error(getErrorMessage(e, 'Failed to send OTP'));
    } finally {
      setSending(false);
    }
  };

  const onPasteOtp = (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const digits = String(text || '').replace(/\D/g, '').slice(0, 6);
    if (digits.length) {
      const arr = new Array(6).fill('');
      for (let i = 0; i < Math.min(6, digits.length); i++) arr[i] = digits[i];
      setOtp(arr);
      e.preventDefault();
    }
  };

  const setOtpAt = (idx, val) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = d;
    setOtp(next);
    if (d && idx < 5) inputsRef.current[idx + 1]?.focus?.();
  };

  const [organizations, setOrganizations] = useState([]);

  const verify = async (codeOverride, orgIdOverride) => {
    const ph = normalizePhone(phone);
    const code = codeOverride || otp.join('');
    if (!ph || code.length !== 6) {
      message.error('Enter 6-digit OTP');
      return;
    }
    try {
      setVerifying(true);
      const res = await api.post('/auth/verify-otp', { phone: ph, code, orgId: orgIdOverride });
      if (res.data?.requireSignup) {
        message.info('Not registered. Please complete signup.');
        setTimeout(() => navigate(`/signup-admin?phone=${ph}`), 500);
        return;
      }
      if (res.data?.requireSelection) {
        sessionStorage.clear(); 
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (res.data.token) localStorage.setItem('token', res.data.token);
        const selectionData = { organizations: res.data.organizations, phone: ph, code, canCreateOrg: res.data.canCreateOrg };
        sessionStorage.setItem('selection_data', JSON.stringify(selectionData));
        navigate('/home', { state: selectionData });
        return;
      }
      if (res.data?.success) {
        sessionStorage.clear();
        localStorage.removeItem('multi_account'); 
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        message.success('Login successful');
        const role = res.data?.user?.role || 'admin';
        const isSuperadminPanel = !!res.data?.user?.isSuperadminPanel;
        
        let dest = '/dashboard';
        if (role === 'superadmin') dest = '/superadmin/clients';
        else if (isSuperadminPanel) dest = '/superadmin/dashboard';
        else if (role === 'channel_partner') dest = '/partner/clients';
        
        setTimeout(() => navigate(dest), 800);
      } else {
        message.error(res.data?.message || 'Login failed');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Login failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Content style={{ padding: 0 }}>
        <Row style={{ minHeight: '100vh' }}>
          {/* Left Column - Design Illustration */}
          <Col 
            xs={0} 
            md={10} 
            lg={12} 
            style={{ 
              background: 'linear-gradient(135deg, #f8fbff 0%, #e0eaff 100%)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px',
              borderRight: '1px solid #f0f0f0'
            }}
          >
            {/* Background decorative elements with the theme colors */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(36,99,235,0.05)' }}></div>
            <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(18,101,205,0.05)' }}></div>
            
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ marginBottom: 24 }}>
                <Tag color="blue" style={{ borderRadius: 20, padding: '2px 12px', fontWeight: 600, background: 'rgba(36,99,235,0.1)', color: '#2463EB', border: 'none' }}>
                  SYSTEM STATUS
                </Tag>
              </div>
              <Title level={1} style={{ color: '#101828', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
                Advanced Intelligence for <span style={{ color: '#2463EB' }}>Modern Enterprise.</span>
              </Title>
              
              <div style={{ marginTop: 48, position: 'relative' }}>
                <div style={{ 
                  maxWidth: 640
                }}>
                  <img 
                    src="/pina.png" 
                    alt="Dashboard Preview" 
                    style={{ width: '100%' }} 
                  />
                </div>
              </div>
            </div>
          </Col>

          {/* Right Column - Form */}
          <Col xs={24} md={14} lg={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            <div style={{ width: '100%', maxWidth: 460, padding: '40px' }}>
              <div style={{ marginBottom: 48 }}>
                <Title level={2} style={{ fontWeight: 800, marginBottom: 12, color: '#2564EB', fontSize: 32 }}>
                  Welcome back
                </Title>
                <Text type="secondary" style={{ fontSize: 16, color: '#667085' }}>
                  Enter your credentials to access your workspace.
                </Text>
              </div>

              {step === 'phone' && (
                <div className="login-form-container">
                  <Form layout="vertical" size="large" onFinish={sendOtp}>
                    <Form.Item 
                      required
                    >
                      <Input
                        prefix={<PhoneOutlined style={{ color: '#98a2b3' }} />}
                        placeholder="Enter 10-digit phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        maxLength={10}
                        style={{ height: 52, borderRadius: 12, border: '1px solid #d0d5dd' }}
                      />
                    </Form.Item>
                    <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={sending} 
                        style={{ 
                          width: '100%', 
                          height: 52, 
                          fontWeight: 600, 
                          fontSize: 16, 
                          borderRadius: 12, 
                          background: '#2463EB', 
                          border: 'none',
                          boxShadow: '0 4px 14px rgba(36,99,235,0.25)' 
                        }}
                      >
                        Continue
                      </Button>
                    </Form.Item>
                    
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                      <Text type="secondary" style={{ fontSize: 15 }}>
                        Don't have an account? {' '}
                        <span 
                          onClick={() => navigate('/signup-admin')} 
                          style={{ color: '#2463EB', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Sign up
                        </span>
                      </Text>
                    </div>
                  </Form>
                </div>
              )}

              {step === 'otp' && (
                <div className="otp-form-container">
                  <div style={{ marginBottom: 32 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 18, color: '#101828' }}>Confirm the OTP</Text>
                    <Text style={{ color: '#667085', fontSize: 15 }}>Enter the 6-digit OTP sent to <span style={{ color: '#2463EB', fontWeight: 700 }}>+91-{phone}</span></Text>
                  </div>
                  
                  <Space size={8} onPaste={onPasteOtp} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: 32 }}>
                    {otp.map((v, i) => (
                      <Input
                        key={i}
                        ref={(el) => (inputsRef.current[i] = el)}
                        value={v}
                        onChange={(e) => setOtpAt(i, e.target.value)}
                        maxLength={1}
                        style={{
                          width: 48,
                          height: 52,
                          textAlign: 'center',
                          borderRadius: 12,
                          fontSize: 20,
                          fontWeight: 700,
                          border: '2px solid #eaecf0',
                          background: '#f9fafb',
                          color: '#101828'
                        }}
                        inputMode="numeric"
                      />
                    ))}
                  </Space>
                  
                  <Button 
                    type="primary" 
                    icon={<SafetyCertificateOutlined />} 
                    loading={verifying} 
                    onClick={() => verify()} 
                    style={{ 
                      width: '100%', 
                      height: 52, 
                      fontWeight: 600, 
                      fontSize: 16, 
                      borderRadius: 12, 
                      background: '#2463EB', 
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(36,99,235,0.25)', 
                      marginBottom: 16 
                    }}
                  >
                    Log In
                  </Button>
                  
                  <div style={{ textAlign: 'center' }}>
                    <Button type="link" icon={<ReloadOutlined />} onClick={sendOtp} disabled={counter > 0} style={{ color: '#667085', fontWeight: 500 }}>
                      Resend OTP {counter > 0 ? `(${counter}s)` : ''}
                    </Button>
                  </div>
                </div>
              )}

              {step === 'selection' && (
                <div className="selection-form-container">
                  <div style={{ marginBottom: 32, textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#101828' }}>Select Account</Title>
                    <Text style={{ color: '#667085' }}>Multiple accounts found for this number.</Text>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {organizations.map((org, idx) => (
                      <div 
                        key={idx}
                        onClick={() => verify(null, org.id === null ? 'null' : org.id)}
                        style={{
                          padding: '18px',
                          border: '2px solid #eaecf0',
                          borderRadius: 14,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#fff'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#2463EB';
                          e.currentTarget.style.background = '#f5f8ff';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#eaecf0';
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#101828', fontSize: 16 }}>{org.name}</div>
                        <Tag color="blue" style={{ borderRadius: 8, margin: 0, fontWeight: 700, padding: '2px 10px' }}>{org.role.toUpperCase()}</Tag>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 32, textAlign: 'center' }}>
                    <Button type="link" onClick={() => setStep('phone')} style={{ color: '#667085', fontWeight: 500 }}>
                      Use different number
                    </Button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 64, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 14, color: '#667085' }}>
                  By continuing you agree to our <a href="https://vetansutra.com/policy.html" target="_blank" rel="noopener noreferrer" style={{ color: '#2463EB', fontWeight: 600 }}>Privacy Policy</a>
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default Login;
