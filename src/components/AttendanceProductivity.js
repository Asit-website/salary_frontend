import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Typography, Card, Table, Button, Space, Tag, Modal, Spin, message, Row, Col, Statistic, Tooltip, Progress, Avatar, List, Divider, Descriptions, Badge } from 'antd';
import { 
  BarChartOutlined, 
  RobotOutlined, 
  ReloadOutlined, 
  InfoCircleOutlined, 
  TeamOutlined, 
  CheckCircleOutlined, 
  TrophyOutlined, 
  ThunderboltOutlined,
  DashboardOutlined,
  RiseOutlined
} from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const AttendanceProductivity = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ scores: [], top10: [], aiSummary: '', bullets: [], month: '', year: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/ai/attendance-productivity');
      if (resp.data?.success) {
        setData(resp.data);
        message.success('Productivity report updated');
      }
    } catch (error) {
      console.error('Error fetching productivity report:', error);
      message.error(error.response?.data?.message || 'Failed to generate productivity report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const columns = [
    {
      title: 'Staff Member',
      dataIndex: 'userName',
      key: 'userName',
      render: (text, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>{text ? text[0] : '?'}</Avatar>
          <Space direction="vertical" size={0}>
            <Text strong>{text || 'Unknown'}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.designation || 'Staff'}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Reliability Score',
      dataIndex: 'score',
      key: 'score',
      sorter: (a, b) => a.score - b.score,
      render: (score) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong style={{ color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f' }}>{score}%</Text>
          <Progress percent={score} size="small" showInfo={false} strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f'} />
        </Space>
      )
    },
    {
      title: 'Breakdown',
      key: 'breakdown',
      render: (_, r) => (
        <Tooltip title={
          <div>
            <div>Attendance: {r.breakdown.attendanceConsistency}%</div>
            <div>Punctuality: {r.breakdown.punctuality}%</div>
            <div>Tasks: {r.breakdown.taskCompletion}%</div>
            <div>Ops: {r.breakdown.operationalForms}%</div>
          </div>
        }>
          <Space size={4}>
            <Tag color="blue">Att: {r.breakdown.attendanceConsistency}%</Tag>
            {r.metrics.totalTasks > 0 ? (
              <Tag color="cyan">Tsk: {r.breakdown.taskCompletion}%</Tag>
            ) : (
              <Tag>No Tasks</Tag>
            )}
          </Space>
        </Tooltip>
      )
    },
    {
      title: 'Metrics',
      key: 'metrics',
      render: (_, r) => (
        <Space split={<Divider type="vertical" />}>
          <Statistic value={r.metrics.presentDays} title="Present" valueStyle={{ fontSize: '14px' }} sx={{ display: 'inline-block' }} />
          <Statistic value={r.metrics.completedTasks} suffix={`/${r.metrics.totalTasks}`} title="Tasks" valueStyle={{ fontSize: '14px' }} />
        </Space>
      )
    },
    {
      title: 'Details',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<InfoCircleOutlined />} 
          onClick={() => {
            Modal.info({
              title: `Performance Details: ${record.userName}`,
              width: 600,
              content: (
                <div style={{ marginTop: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card size="small" title="Attendance & Punctuality">
                        <Progress type="dashboard" percent={record.breakdown.attendanceConsistency} size={80} />
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">Attendance: {record.breakdown.attendanceConsistency}%</Text><br/>
                          <Text type="secondary">Punctuality: {record.breakdown.punctuality}%</Text>
                        </div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" title="Tasks & Operations">
                        {record.metrics.totalTasks > 0 || record.metrics.totalOps > 0 ? (
                          <>
                            <Progress type="dashboard" percent={record.metrics.totalTasks > 0 ? record.breakdown.taskCompletion : record.breakdown.operationalForms} size={80} strokeColor="#722ed1" />
                            <div style={{ marginTop: 8 }}>
                              {record.metrics.totalTasks > 0 && <Text type="secondary">Task Completion: {record.breakdown.taskCompletion}%</Text>}
                              {record.metrics.totalTasks > 0 && record.metrics.totalOps > 0 && <br/>}
                              {record.metrics.totalOps > 0 && <Text type="secondary">Ops Completion: {record.breakdown.operationalForms}%</Text>}
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <InfoCircleOutlined style={{ fontSize: 24, color: '#ccc' }} />
                            <div style={{ marginTop: 8, color: '#999' }}>No Tasks Assigned</div>
                          </div>
                        )}
                      </Card>
                    </Col>
                  </Row>
                  <Divider />
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Present Days">{record.metrics.presentDays}</Descriptions.Item>
                    <Descriptions.Item label="Tasks">{record.metrics.completedTasks}/{record.metrics.totalTasks}</Descriptions.Item>
                    <Descriptions.Item label="Ops Forms">{record.metrics.completedOps}/{record.metrics.totalOps}</Descriptions.Item>
                  </Descriptions>
                </div>
              )
            });
          }}
        >
          Analysis
        </Button>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s', background: 'transparent' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <RiseOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>Attendance Productivity</Title>
            {data.month && <Tag color="blue">{monthNames[data.month - 1]} {data.year}</Tag>}
          </Space>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={fetchData} 
            loading={loading}
          >
            Update Report
          </Button>
        </Header>

        <Content style={{ padding: '24px' }}>
          <Spin spinning={loading} tip="Analyzing team productivity...">
            
            {/* AI Summary Section */}
            <Card 
              style={{ marginBottom: 24, borderRadius: 12, background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' }}
              bodyStyle={{ padding: 24 }}
            >
              <Row gutter={24} align="middle">
                <Col md={4} style={{ textAlign: 'center' }}>
                  <RobotOutlined style={{ fontSize: 48, color: '#fff' }} />
                </Col>
                <Col md={20}>
                  <Title level={5} style={{ color: '#fff', margin: 0, opacity: 0.8 }}>AI PERFORMANCE INSIGHT</Title>
                  <Paragraph style={{ color: '#fff', fontSize: 16, marginTop: 8, fontStyle: 'italic', marginBottom: 0 }}>
                    "{data.aiSummary}"
                  </Paragraph>
                  {data.bullets && data.bullets.length > 0 && (
                    <ul style={{ color: '#fff', marginTop: 12, paddingLeft: 20 }}>
                      {data.bullets.map((b, i) => (
                        <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>{b}</li>
                      ))}
                    </ul>
                  )}
                </Col>
              </Row>
            </Card>

            <Row gutter={24}>
              {/* Top 10 Leaderboard */}
              <Col lg={8} md={24}>
                <Card 
                  title={<Space><TrophyOutlined style={{ color: '#faad14' }} /><span>Reliability Leaderboard</span></Space>}
                  style={{ borderRadius: 12, height: '100%' }}
                  bodyStyle={{ padding: '12px 0' }}
                >
                  <List
                    itemLayout="horizontal"
                    dataSource={data.top10}
                    renderItem={(item, index) => (
                      <List.Item style={{ padding: '12px 24px', borderBottom: index === 9 ? 'none' : '1px solid #f0f0f0' }}>
                        <List.Item.Meta
                          avatar={
                            <Badge count={index + 1} overflowCount={10} style={{ backgroundColor: index < 3 ? '#faad14' : '#d9d9d9', color: '#fff' }}>
                              <Avatar strokeColor="#fff">{item.userName[0]}</Avatar>
                            </Badge>
                          }
                          title={<Text strong>{item.userName}</Text>}
                          description={item.designation}
                        />
                        <div style={{ textAlign: 'right' }}>
                          <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{item.score}%</Text>
                          <div style={{ fontSize: 10, color: '#aaa' }}>Reliability</div>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              {/* Stats & Charts */}
              <Col lg={16} md={24}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card style={{ borderRadius: 12 }}>
                      <Statistic 
                        title="Average Team Score" 
                        value={data.scores.length ? Math.round(data.scores.reduce((a,b)=>a+b.score, 0)/data.scores.length) : 0} 
                        suffix="%" 
                        prefix={<DashboardOutlined />}
                        valueStyle={{ color: '#3f51b5' }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card style={{ borderRadius: 12 }}>
                      <Statistic 
                        title="Top Score" 
                        value={data.top10[0]?.score || 0} 
                        suffix="%" 
                        prefix={<TrophyOutlined />}
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  
                  <Col span={24}>
                    <Card title="Score Distribution" style={{ borderRadius: 12 }}>
                      <div style={{ padding: '20px 0' }}>
                        <Row gutter={12} align="bottom" style={{ height: 180 }}>
                          {[1,2,3,4,5,6,7,8,9,10].map(i => {
                            const count = data.scores.filter(s => s.score >= (i-1)*10 && s.score < i*10).length;
                            const height = data.scores.length ? (count / data.scores.length) * 150 : 0;
                            return (
                              <Col key={i} flex={1} style={{ textAlign: 'center' }}>
                                <Tooltip title={`${(i-1)*10}-${i*10}%: ${count} staff`}>
                                  <div style={{ 
                                    height: Math.max(height, 4), 
                                    background: i > 8 ? '#52c41a' : i > 6 ? '#1890ff' : i > 4 ? '#faad14' : '#ff4d4f',
                                    borderRadius: '4px 4px 0 0',
                                    width: '100%'
                                  }} />
                                </Tooltip>
                                <div style={{ fontSize: 10, marginTop: 4 }}>{i*10}%</div>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>

            {/* Detailed Table */}
            <Card 
              style={{ marginTop: 24, borderRadius: 12 }}
              title={<Space><TeamOutlined /><span>Detailed Staff Productivity Scores</span></Space>}
            >
              <Table 
                columns={columns} 
                dataSource={data.scores} 
                rowKey="userId" 
                size="middle"
                pagination={{ pageSize: 10 }}
              />
            </Card>

          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AttendanceProductivity;
