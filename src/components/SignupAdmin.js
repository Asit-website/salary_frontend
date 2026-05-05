import React, { useMemo, useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, message, Select, DatePicker, Tag, Row, Col, Space } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneOutlined, UserOutlined, MailOutlined, ShopOutlined, EnvironmentOutlined, IdcardOutlined, TeamOutlined, HomeOutlined, CalendarOutlined, SafetyCertificateOutlined, ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function SignupAdmin() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const phonePrefill = useMemo(() => (params.get('phone') || ''), [params]);

  const normalizePhone = (p) => String(p || '').replace(/[^0-9]/g, '').slice(-10);

  const onFinish = async (values) => {
    const phone = normalizePhone(values.phone);
    const name = String(values.name || '').trim();
    const businessName = String(values.businessName || '').trim();
    const password = String(values.password || '123456');
    const businessEmail = String(values.businessEmail || '').trim();
    const state = String(values.state || '').trim();
    const city = String(values.city || '').trim();
    const channelPartnerId = String(values.channelPartnerId || '').trim();
    const roleDescription = String(values.roleDescription || '').trim();
    const employeeCount = String(values.employeeCount || '').trim();
    const contactPersonName = String(values.contactPersonName || '').trim();
    const address = String(values.address || '').trim();
    const birthDate = values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null;
    const anniversaryDate = values.anniversaryDate ? values.anniversaryDate.format('YYYY-MM-DD') : null;
    const gstNumber = String(values.gstNumber || '').trim();

    if (!phone || phone.length !== 10) {
      message.error('Enter valid 10-digit phone');
      return;
    }
    if (!name || !businessName) {
      message.error('Name and Business Name are required');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/signup-admin', {
        phone, name, businessName, password, businessEmail, state, city,
        channelPartnerId, roleDescription, employeeCount,
        contactPersonName, address, birthDate, anniversaryDate, gstNumber
      });
      if (res.data?.success) {
        setSubmitted(true);
      } else {
        message.error(res.data?.message || 'Signup failed');
      }
    } catch (e) {
      message.error('Signup failed');
    } finally {
      setLoading(false);
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
              justifyContent: 'flex-start',
              padding: '100px 60px',
              borderRight: '1px solid #f0f0f0'
            }}
          >
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
                <div style={{ maxWidth: 640 }}>
                  <img 
                    src="/pina.png" 
                    alt="Dashboard Illustration" 
                    style={{ width: '100%' }} 
                  />
                </div>
              </div>
            </div>
          </Col>

          {/* Right Column - Form */}
          <Col xs={24} md={14} lg={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: 540, padding: '60px 40px' }}>
              
              {submitted ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 24, fontSize: 64 }}>✅</div>
                  <Title level={2} style={{ fontWeight: 800, marginBottom: 16, color: '#2564EB' }}>Signup Received</Title>
                  <Text type="secondary" style={{ fontSize: 18, color: '#667085', display: 'block', marginBottom: 32 }}>
                    Thank you for reaching out to us. Your message has been received and one of our team members will respond within 24–48 hours.
                  </Text>
                  <Button 
                    type="primary" 
                    size="large" 
                    onClick={() => navigate('/')}
                    style={{ 
                      height: 52, 
                      padding: '0 40px', 
                      borderRadius: 12, 
                      background: '#2463EB', 
                      fontWeight: 600,
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(36,99,235,0.25)'
                    }}
                  >
                    Go to Login
                  </Button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 40 }}>
                    <Title level={2} style={{ fontWeight: 800, marginBottom: 12, color: '#2564EB', fontSize: 32 }}>
                      Claim your spot in the future
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16, color: '#667085' }}>
                      Start your journey with full attendance and payroll support.
                    </Text>
                  </div>

                  <Form 
                    layout="vertical" 
                    size="large" 
                    onFinish={onFinish} 
                    initialValues={{ phone: phonePrefill }}
                    requiredMark={false}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label={<Text strong>Your Name</Text>} name="name" rules={[{ required: true, message: 'Please enter your name' }]}>
                          <Input prefix={<UserOutlined style={{ color: '#98a2b3' }} />} placeholder="Full Name" style={{ borderRadius: 10 }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label={<Text strong>Phone Number</Text>} name="phone" rules={[{ required: true, message: 'Please enter your phone' }]}>
                          <Input prefix={<PhoneOutlined style={{ color: '#98a2b3' }} />} maxLength={10} placeholder="10-digit phone" style={{ borderRadius: 10 }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label={<Text strong>Business Name</Text>} name="businessName" rules={[{ required: true, message: 'Please enter business name' }]}>
                      <Input prefix={<ShopOutlined style={{ color: '#98a2b3' }} />} placeholder="Company / Shop name" style={{ borderRadius: 10 }} />
                    </Form.Item>

                    <Form.Item label={<Text strong>Business Email</Text>} name="businessEmail">
                      <Input prefix={<MailOutlined style={{ color: '#98a2b3' }} />} placeholder="name@company.com" type="email" style={{ borderRadius: 10 }} />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label={<Text strong>State</Text>} name="state">
                          <Input placeholder="State" style={{ borderRadius: 10 }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label={<Text strong>City</Text>} name="city">
                          <Input placeholder="City" style={{ borderRadius: 10 }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label={<Text strong>GST Number</Text>} name="gstNumber">
                      <Input prefix={<SafetyCertificateOutlined style={{ color: '#98a2b3' }} />} placeholder="22AAAAA0000A1Z5" style={{ borderRadius: 10 }} />
                    </Form.Item>

                    <Form.Item label={<Text strong>Employee Count</Text>} name="employeeCount">
                      <Select placeholder="How many employees?" style={{ borderRadius: 10 }}>
                        <Select.Option value="Less than 20">Less than 20</Select.Option>
                        <Select.Option value="20-100">20-100</Select.Option>
                        <Select.Option value="100-500">100-500</Select.Option>
                        <Select.Option value="More than 500">More than 500</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item label={<Text strong>Role Description</Text>} name="roleDescription">
                      <Input.TextArea rows={2} placeholder="e.g. Owner/HR/Manager" style={{ borderRadius: 10 }} />
                    </Form.Item>

                    <Form.Item label={<Text strong>Detailed Address</Text>} name="address">
                      <Input.TextArea rows={2} placeholder="Building, Street, Area..." style={{ borderRadius: 10 }} />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label={<Text strong>Birth Date</Text>} name="birthDate">
                          <DatePicker style={{ width: '100%', borderRadius: 10 }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label={<Text strong>Anniversary Date</Text>} name="anniversaryDate">
                          <DatePicker style={{ width: '100%', borderRadius: 10 }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label={<Text strong>Channel Partner Id</Text>} name="channelPartnerId">
                      <Input prefix={<IdcardOutlined style={{ color: '#98a2b3' }} />} placeholder="Optional" style={{ borderRadius: 10 }} />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24 }}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={loading} 
                        icon={<ArrowRightOutlined />}
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
                        Onboard Now
                      </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <Text type="secondary">Already part of the ecosystem? </Text>
                      <Button type="link" onClick={() => navigate('/')} style={{ padding: 0, fontWeight: 700, color: '#2463EB' }}>
                        Log In
                      </Button>
                    </div>
                  </Form>
                </>
              )}

              <div style={{ marginTop: 48, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 14, color: '#667085' }}>
                  By continuing you agree to our <a href="/terms" style={{ color: '#2463EB', fontWeight: 600 }}>Privacy Policy</a> and <a href="/terms" style={{ color: '#2463EB', fontWeight: 600 }}>Terms of Use</a>
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
