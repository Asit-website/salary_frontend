import React, { useMemo, useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, message, Select } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SignupAdmin() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
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
      const res = await api.post('/auth/signup-admin', { phone, name, businessName, password, businessEmail, state, city, channelPartnerId, roleDescription, employeeCount });
      if (res.data?.success) {
        message.success('Signup successful. Super Admin will enable your account after assigning a plan.');
        setTimeout(() => navigate('/'), 1000);
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
        <Card title="Admin Signup" style={{ width: 480, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <Form layout="vertical" size="large" onFinish={onFinish} initialValues={{ phone: phonePrefill }}>
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
            {/* Password removed as per request; server defaults to 123456 */}
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
                Create Account
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}
