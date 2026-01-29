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
        setTimeout(() => inputsRef.current?.[0]?.focus?.(), 100);
        // Optional dev autofill
        try {
          const latest = await api.get('/auth/otp/latest', { params: { phone: ph } });
          const code = String(latest.data?.otp || '');
          if (code.length === 6) {
            // Prefill but do NOT auto-verify; user can review then tap Verify
            setOtp(code.split(''));
          }
        } catch {}
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
      if (res.data?.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        message.success('Login successful');
        // Small delay before redirect so the user can see success
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        message.error(res.data?.message || 'Invalid OTP');
      }
    } catch (e) {
      message.error('Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#001529', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
          ThinkTech Attendance Admin
        </div>
      </Header>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '50px' }}>
        <Card 
          title="Admin Login" 
          style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          {step === 'phone' && (
            <>
              <Form layout="vertical" size="large" onFinish={sendOtp}>
                <Form.Item label="Phone Number" required>
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="Enter 10-digit phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={10}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={sending} style={{ width: '100%' }}>
                    Send OTP
                  </Button>
                </Form.Item>
              </Form>
            </>
          )}

          {step === 'otp' && (
            <>
              <div style={{ marginBottom: 8 }}>Enter the 6-digit OTP sent to +91-{phone}</div>
              <Space size={8} onPaste={onPasteOtp}>
                {otp.map((v, i) => (
                  <Input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    value={v}
                    onChange={(e) => setOtpAt(i, e.target.value)}
                    maxLength={1}
                    style={{ width: 40, textAlign: 'center' }}
                    inputMode="numeric"
                  />
                ))}
              </Space>
              <div style={{ marginTop: 12 }}>
                <Button type="primary" icon={<SafetyCertificateOutlined />} loading={verifying} onClick={() => verify()} style={{ width: '100%' }}>
                  Verify & Login
                </Button>
              </div>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Button type="link" icon={<ReloadOutlined />} onClick={sendOtp} disabled={counter > 0}>
                  Resend OTP {counter > 0 ? `(${counter}s)` : ''}
                </Button>
              </div>
            </>
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default Login;
