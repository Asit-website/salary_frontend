import React, { useEffect, useState } from 'react';
import { Layout, Card, Radio, Button, message, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

const SalaryCalculationLogic = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('calendar');

  const fetchSettings = async () => {
    try {
      const resp = await api.get('/admin/settings/salary');
      const s = resp?.data?.settings || {};
      setMode(s.mode || 'calendar');
    } catch (e) {
      message.error('Failed to load salary calculation settings');
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async () => {
    try {
      setLoading(true);
      const payload = { mode };
      const resp = await api.put('/admin/settings/salary', payload);
      if (resp.data?.success) {
        message.success('Salary calculation logic saved');
      } else {
        message.error(resp.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(-1)}>Back</Button>
            <Title level={4} style={{ margin: 0 }}>Salary Calculation Logic</Title>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card title="Payable Days & Work Hours" style={{ borderRadius: 8 }} bodyStyle={{ padding: 16 }}>
            <div style={{ marginBottom: 14, color: '#57606a' }}>
              What is the effective payable days per month and work hours per day in your organization?
            </div>
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="calendar">
                  <div>
                    <b>Calendar Month</b>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>Ex: March will have 31 payable days, April will have 30 payable days, etc.</div>
                  </div>
                </Radio>
                <Radio value="fixed_30">
                  <div>
                    <b>Every Month 30 Days</b>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>Ex: All months considered 30 payable days.</div>
                  </div>
                </Radio>
                <Radio value="fixed_28">
                  <div>
                    <b>Every Month 28 Days</b>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>Ex: All months considered 28 payable days.</div>
                  </div>
                </Radio>
                <Radio value="fixed_26">
                  <div>
                    <b>Every Month 26 Days</b>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>Ex: All months considered 26 payable days.</div>
                  </div>
                </Radio>
                <Radio value="exclude_weekly_offs">
                  <div>
                    <b>Exclude Weekly Offs</b>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>Ex: If a month has 4 weekly offs, payable days reduce accordingly.</div>
                  </div>
                </Radio>
              </Space>
            </Radio.Group>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Space>
                <Button onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="primary" loading={loading} onClick={save}>Save</Button>
              </Space>
            </div>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SalaryCalculationLogic;
