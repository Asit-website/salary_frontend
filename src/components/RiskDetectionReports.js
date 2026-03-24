import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Card, Space, Button, Spin, message, Alert, Tag, Row, Col, Statistic, Empty } from 'antd';
import { RobotOutlined, ReloadOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function RiskDetectionReports() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const fetchRisk = async (force = false) => {
    try {
      setLoading(true);
      const url = force ? '/admin/ai/salary-forecast?refresh=true' : '/admin/ai/salary-forecast';
      const resp = await api.get(url);
      if (resp.data?.success) {
        setSummary(resp.data.summary || null);
        setMonth(resp.data.month);
        setYear(resp.data.year);
        if (force) message.success('AI Risk Detection recomputed successfully');
      } else {
        message.error('Failed to load risk detection');
      }
    } catch (error) {
      console.error('Error fetching risk:', error);
      message.error(error.response?.data?.message || 'Failed to load risk detection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRisk(); }, []);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const riskDetections = useMemo(() => {
    const arr = summary?.riskDetections;
    return Array.isArray(arr) ? arr : [];
  }, [summary]);

  const counts = useMemo(() => {
    const out = { total: riskDetections.length, high: 0, medium: 0, low: 0 };
    riskDetections.forEach((r) => {
      const s = String(r.severity || '').toLowerCase();
      if (s === 'high') out.high += 1;
      else if (s === 'medium') out.medium += 1;
      else out.low += 1;
    });
    return out;
  }, [riskDetections]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s', background: 'transparent' }}>
        <Header style={{ background: 'linear-gradient(135deg, #2f54eb 0%, #722ed1 100%)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <Space>
            <RobotOutlined style={{ fontSize: '24px', color: '#fff' }} />
            <Title level={4} style={{ margin: 0, color: '#fff' }}>AI Risk Detection</Title>
            {month ? <Tag color="white" style={{ color: '#722ed1', fontWeight: 'bold' }}>{monthNames[(month || 1) - 1]} {year}</Tag> : null}
          </Space>
          <Button
            type="primary"
            ghost
            icon={<ReloadOutlined />}
            onClick={() => fetchRisk(true)}
            loading={loading}
            style={{ borderRadius: '8px', borderColor: '#fff', color: '#fff' }}
          >
            Refresh Risks
          </Button>
        </Header>

        <Content style={{ padding: '24px' }}>
          <Spin spinning={loading} tip="AI is detecting risk patterns...">
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 12 }}>
                  <Statistic title="Total At Risk" value={counts.total} prefix={<WarningOutlined style={{ color: '#fa8c16' }} />} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 12 }}>
                  <Statistic title="High Risk" value={counts.high} prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} valueStyle={{ color: '#ff4d4f' }} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 12 }}>
                  <Statistic title="Medium Risk" value={counts.medium} valueStyle={{ color: '#faad14' }} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 12 }}>
                  <Statistic title="Low Risk" value={counts.low} valueStyle={{ color: '#1890ff' }} />
                </Card>
              </Col>
            </Row>

            <Card
              bordered={false}
              title={<Space><WarningOutlined style={{ color: '#fa541c' }} /><span>Employees At Risk</span></Space>}
              style={{ borderRadius: '12px' }}
            >
              {riskDetections.length === 0 ? (
                <Empty description={<Text type="secondary">No risk detected for this month.</Text>} />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {riskDetections.map((risk) => (
                    <Alert
                      key={risk.userId}
                      type={risk.severity === 'high' ? 'error' : risk.severity === 'medium' ? 'warning' : 'info'}
                      showIcon
                      message={<Text strong>{risk.userName} is at risk</Text>}
                      description={
                        <Space direction="vertical" size={4}>
                          <Text>{risk.message}</Text>
                          <Space wrap>
                            {(risk.categories || []).map((c) => (
                              <Tag key={`${risk.userId}-${c}`} color={c === 'high_absentee' ? 'red' : c === 'task_delay' ? 'orange' : 'purple'}>
                                {c === 'high_absentee' ? 'High Absentee' : c === 'task_delay' ? 'Task Delay' : 'Low Performer'}
                              </Tag>
                            ))}
                            <Tag color="blue">Attendance: {risk.attendanceRate || 0}%</Tag>
                            <Tag color="default">Absent: {risk.absentDays || 0}</Tag>
                            <Tag color="default">Tasks: {risk.taskStats?.totalTasks || 0}</Tag>
                            <Tag color="default">Delayed: {risk.taskStats?.delayedTasks || 0}</Tag>
                          </Space>
                        </Space>
                      }
                    />
                  ))}
                </Space>
              )}
            </Card>
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
}
