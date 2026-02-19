import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, Button, Card, message, Layout, Typography, Space } from 'antd';
import { PhoneOutlined, SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

const Login = () => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [counter, setCounter] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  // countdown for resend
  useEffect(() => {
    if (!counter) return;
    const t = setInterval(() => setCounter((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [counter]);

  const normalizePhone = (p) => String(p || '').replace(/[^0-9]/g, '').slice(-10);

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
      message.error('Failed to send OTP');
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
      // Do not auto-verify on paste; wait for user to click Verify
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

  const verify = async (codeOverride) => {
    const ph = normalizePhone(phone);
    const code = codeOverride || otp.join('');
    if (!ph || code.length !== 6) {
      message.error('Enter 6-digit OTP');
      return;
    }
    try {
      setVerifying(true);
      const res = await api.post('/auth/verify-otp', { phone: ph, code });
      if (res.data?.requireSignup) {
        message.info('Not registered. Please complete signup.');
        setTimeout(() => navigate(`/signup-admin?phone=${ph}`), 500);
        return;
      }
      if (res.data?.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        message.success('Login successful');
        const role = res.data?.user?.role || 'admin';
        const dest = role === 'superadmin' ? '/superadmin/clients' : '/dashboard';
        setTimeout(() => navigate(dest), 800);
      } else {
        message.error('Your subscription is expired');
      }
    } catch (e) {
      message.error('Your suscription is expired');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f3ff 0%, #f8fbff 35%, #eff6ff 100%)',
      }}
    >
      <Content
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px' }}
      >
        <div style={{ width: 420 }}>

          <Card
            style={{
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
              border: '1px solid #eef2ff',
            }}
            bodyStyle={{ padding: 24 }}
          >
            {step === 'phone' && (
              <>
                <Form layout="vertical" size="large" onFinish={sendOtp}>
                  <Form.Item label="" required>
                    <Title style={{ fontSize: 14 }} level={5}>start your
                      hassle-free payroll management journey today!</Title>
                    <p style={{ fontSize: 14 }} level={5}>Enter your mobile number to continue</p>
                    <Input
                      style={{ marginTop: 12 }}
                      prefix={<PhoneOutlined />}
                      placeholder="Enter 10-digit phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={sending} style={{ width: '100%', height: 40, fontWeight: 600 }}>
                      Continue
                    </Button>
                  </Form.Item>
                </Form>
              </>
            )}

            {step === 'otp' && (
              <>
                <div style={{ marginBottom: 8, color: '#475467' }}>Enter the 6-digit OTP sent to +91-{phone}</div>
                <Space size={10} onPaste={onPasteOtp}>
                  {otp.map((v, i) => (
                    <Input
                      key={i}
                      ref={(el) => (inputsRef.current[i] = el)}
                      value={v}
                      onChange={(e) => setOtpAt(i, e.target.value)}
                      maxLength={1}
                      style={{
                        width: 48,
                        height: 48,
                        textAlign: 'center',
                        borderRadius: 10,
                        fontSize: 18,
                        boxShadow: '0 2px 6px rgba(2,6,23,0.06)'
                      }}
                      inputMode="numeric"
                    />
                  ))}
                </Space>
                <div style={{ marginTop: 14 }}>
                  <Button type="primary" icon={<SafetyCertificateOutlined />} loading={verifying} onClick={() => verify()} style={{ width: '100%', height: 40, fontWeight: 600 }}>
                    Verify & Login
                  </Button>
                </div>
                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <Button type="link" icon={<ReloadOutlined />} onClick={sendOtp} disabled={counter > 0}>
                    Resend OTP {counter > 0 ? `(${counter}s)` : ''}
                  </Button>
                </div>
              </>
            )}
          </Card>
          <div style={{ textAlign: 'center', marginTop: 14, color: '#98a2b3', fontSize: 12 }}>
            By continuing you agree to our Terms & Privacy Policy
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default Login;
