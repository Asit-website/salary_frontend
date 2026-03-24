import React, { useMemo, useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, message, Select, DatePicker } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

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
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* <Header style={{ background: '#001529', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
          ThinkTech Attendance Admin
        </div>
      </Header> */}
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '50px' }}>
        <Card title={submitted ? "Signup Received" : "Admin Signup"} style={{ width: 480, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Typography.Title level={4} style={{ color: '#52c41a', marginBottom: 24 }}>
                Thank you for reaching out to us.
              </Typography.Title>
              <Typography.Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
                Your message has been received and one of our team members will respond within 24–48 hours.
              </Typography.Paragraph>
              <Button type="primary" size="large" onClick={() => navigate('/')} style={{ marginTop: 24 }}>
                Go to Login
              </Button>
            </div>
          ) : (
            <Form layout="vertical" size="large" onFinish={onFinish} initialValues={{ phone: phonePrefill }}>
              {/* Form items remain same */}
              <Form.Item label="Phone" name="phone" required>
                <Input maxLength={10} placeholder="10-digit phone" />
              </Form.Item>
              <Form.Item label="Your Name" name="name" required>
                <Input placeholder="Enter your name" />
              </Form.Item>
              <Form.Item label="Business Email" name="businessEmail">
                <Input placeholder="name@company.com" type="email" />
              </Form.Item>
              <Form.Item label="Business Name" name="businessName" required>
                <Input placeholder="Your company / shop name" />
              </Form.Item>
              <Form.Item label="State" name="state">
                <Input placeholder="State" />
              </Form.Item>
              <Form.Item label="City" name="city">
                <Input placeholder="City" />
              </Form.Item>
              <Form.Item label="Channel Partner Id" name="channelPartnerId">
                <Input placeholder="Channel Partner Id" />
              </Form.Item>
              <Form.Item label="Describe your role in the organization" name="roleDescription">
                <Input.TextArea rows={3} placeholder="e.g. Owner/HR/Manager" />
              </Form.Item>
              <Form.Item label="How many employees are there in your business?" name="employeeCount">
                <Select options={[
                  { value: 'Less than 20', label: 'Less than 20' },
                  { value: '20-100', label: '20-100' },
                  { value: '100-500', label: '100-500' },
                  { value: 'More than 500', label: 'More than 500' },
                ]} placeholder="Select" />
              </Form.Item>
              <Form.Item label="Contact Person Name" name="contactPersonName">
                <Input placeholder="Full Name" />
              </Form.Item>
              <Form.Item label="Detailed Address" name="address">
                <Input.TextArea rows={2} placeholder="Building, Street, Area..." />
              </Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item label="Birth Date" name="birthDate">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="Anniversary Date" name="anniversaryDate">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <Form.Item label="GST Number" name="gstNumber">
                <Input placeholder="22AAAAA0000A1Z5" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
                  Create Account
                </Button>
              </Form.Item>
            </Form>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
