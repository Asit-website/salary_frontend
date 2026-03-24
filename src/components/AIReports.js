import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Typography, Card, Table, Button, Space, Tag, Modal, Spin, message, Row, Col, Statistic, Tooltip, Descriptions, Progress, Slider, InputNumber, Alert, Divider, Badge } from 'antd';
import { BarChartOutlined, RobotOutlined, ReloadOutlined, InfoCircleOutlined, WalletOutlined, ArrowUpOutlined, ArrowDownOutlined, TeamOutlined, ClockCircleOutlined, WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ThunderboltOutlined, ExperimentOutlined, DollarOutlined, CalendarOutlined, FundOutlined } from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const AIReports = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  // Simulation
  const [simAbsent, setSimAbsent] = useState(0);
  const [simHalfDay, setSimHalfDay] = useState(0);
  const [simOvertimeHrs, setSimOvertimeHrs] = useState(0);

  const fetchForecast = async (force = false) => {
    try {
      setLoading(true);
      const url = force ? '/admin/ai/salary-forecast?refresh=true' : '/admin/ai/salary-forecast';
      const resp = await api.get(url);
      if (resp.data?.success) {
        setForecasts(resp.data.forecasts || []);
        setSummary(resp.data.summary || null);
        setMonth(resp.data.month);
        setYear(resp.data.year);
        if (force) message.success('AI Salary Forecast recomputed successfully');
      }
    } catch (error) {
      console.error('Error fetching AI forecast:', error);
      message.error(error.response?.data?.message || 'Failed to generate AI forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForecast(); }, []);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Simulation calculation
  const simResult = useMemo(() => {
    if (!summary || forecasts.length === 0) return null;
    const baseSalaryTotal = summary.totalBaseSalary || 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    const perDayTotal = baseSalaryTotal / daysInMonth;
    const absentDeduction = simAbsent * perDayTotal;
    const halfDayDeduction = simHalfDay * perDayTotal * 0.5;
    const overtimeBonus = simOvertimeHrs * (baseSalaryTotal / (daysInMonth * 8 * forecasts.length));
    const simTotal = Math.max(0, Math.round(summary.totalForecastedPay - absentDeduction - halfDayDeduction + overtimeBonus));
    return {
      simTotal,
      absentDeduction: Math.round(absentDeduction),
      halfDayDeduction: Math.round(halfDayDeduction),
      overtimeBonus: Math.round(overtimeBonus),
      diff: simTotal - summary.totalForecastedPay
    };
  }, [simAbsent, simHalfDay, simOvertimeHrs, summary, forecasts, month, year]);

  // Chart data computed from forecasts
  const chartData = useMemo(() => {
    if (!forecasts.length) return [];
    return forecasts.map(f => ({
      name: f.userName?.split(' ')[0] || '?',
      base: f.baseSalary || 0,
      forecast: f.forecastNetPay || 0,
      diff: (f.baseSalary || 0) - (f.forecastNetPay || 0)
    }));
  }, [forecasts]);

  // Prediction cards
  const predictionCards = useMemo(() => {
    if (!forecasts.length || !summary) return [];
    const topEarner = [...forecasts].sort((a, b) => (b.forecastNetPay || 0) - (a.forecastNetPay || 0))[0];
    const mostAbsent = [...forecasts].sort((a, b) => (b.attendance?.absent || 0) - (a.attendance?.absent || 0))[0];
    const bestAttendance = [...forecasts].sort((a, b) => (b.attendance?.present || 0) - (a.attendance?.present || 0))[0];
    const payRatio = summary.totalBaseSalary > 0 ? Math.round(summary.totalForecastedPay / summary.totalBaseSalary * 100) : 100;
    return [
      { title: 'Payroll Efficiency', value: `${payRatio}%`, desc: 'Forecasted vs Configured base', icon: <FundOutlined />, color: payRatio >= 90 ? '#52c41a' : payRatio >= 70 ? '#faad14' : '#ff4d4f' },
      { title: 'Top Earner', value: topEarner?.userName || '-', desc: `₹${(topEarner?.forecastNetPay || 0).toLocaleString()} forecasted`, icon: <DollarOutlined />, color: '#1890ff' },
      { title: 'Most Absent', value: mostAbsent?.userName || '-', desc: `${mostAbsent?.attendance?.absent || 0} absent days`, icon: <CalendarOutlined />, color: '#ff4d4f' },
      { title: 'Best Attendance', value: bestAttendance?.userName || '-', desc: `${bestAttendance?.attendance?.present || 0} present days`, icon: <CheckCircleOutlined />, color: '#52c41a' },
    ];
  }, [forecasts, summary]);

  const insightIconMap = { warning: <WarningOutlined />, success: <CheckCircleOutlined />, error: <ExclamationCircleOutlined />, info: <InfoCircleOutlined /> };
  const insightColorMap = { warning: '#faad14', success: '#52c41a', error: '#ff4d4f', info: '#1890ff' };

  const columns = [
    {
      title: 'Staff Name',
      dataIndex: 'userName',
      key: 'userName',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.designation || 'Staff'}</Text>
        </Space>
      )
    },
    {
      title: 'Base Salary',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      sorter: (a, b) => (a.baseSalary || 0) - (b.baseSalary || 0),
      render: (val, record) => {
        const num = Number(val);
        if (record.salaryNotConfigured) {
          return (
            <Space direction="vertical" size={0}>
              <Text delete type="secondary" style={{ fontSize: '11px' }}>₹{num.toLocaleString()}</Text>
              <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>Using Default</Tag>
            </Space>
          );
        }
        return isNaN(num) || num === 0 ? <Tag color="warning">Not Set</Tag> : `₹${num.toLocaleString()}`;
      }
    },
    {
      title: 'Present',
      key: 'present',
      width: 70,
      render: (_, r) => <Tag color="green">{r.attendance?.present || 0}</Tag>
    },
    {
      title: 'Absent',
      key: 'absent',
      width: 70,
      render: (_, r) => <Tag color={r.attendance?.absent > 0 ? 'red' : 'default'}>{r.attendance?.absent || 0}</Tag>
    },
    {
      title: 'WO/Hol/Leave',
      key: 'extras',
      width: 120,
      render: (_, r) => (
        <Space size={2} wrap>
          {(r.attendance?.weeklyOffs > 0) && <Tag color="blue">{r.attendance.weeklyOffs} WO</Tag>}
          {(r.attendance?.holidays > 0) && <Tag color="purple">{r.attendance.holidays} H</Tag>}
          {(r.attendance?.paidLeave > 0) && <Tag color="cyan">{r.attendance.paidLeave} L</Tag>}
          {!r.attendance?.weeklyOffs && !r.attendance?.holidays && !r.attendance?.paidLeave && <Text type="secondary">-</Text>}
        </Space>
      )
    },
    {
      title: 'AI Net Pay',
      dataIndex: 'forecastNetPay',
      key: 'forecastNetPay',
      sorter: (a, b) => (a.forecastNetPay || 0) - (b.forecastNetPay || 0),
      render: (val, record) => {
        const num = Number(val);
        const diff = (record.baseSalary || 0) - num;
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: '#52c41a', fontSize: '15px' }}>₹{isNaN(num) ? 0 : num.toLocaleString()}</Text>
            {diff > 0 && <Text type="danger" style={{ fontSize: '11px' }}><ArrowDownOutlined /> ₹{diff.toLocaleString()} deducted</Text>}
          </Space>
        );
      }
    },
    {
      title: 'Analysis',
      key: 'assumptions',
      width: 130,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<InfoCircleOutlined />} 
          onClick={() => {
            Modal.info({
              title: `AI Financial Analysis: ${record.userName}`,
              content: (
                <div style={{ marginTop: '16px' }}>
                  <Card size="small" style={{ marginBottom: '16px', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                    <Text strong style={{ color: '#389e0d' }}>SUMMARY:</Text>
                    <p style={{ margin: '8px 0', fontSize: '15px' }}>{record.assumptions?.summary || 'Projected to receive standard pay based on current patterns.'}</p>
                  </Card>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Attendance Pattern">
                      {record.assumptions?.attendanceTrend || 'Consistent with previous records.'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Roster Impact">
                      {record.assumptions?.rosterImpact || 'No specific holidays or weekly-off impacts.'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Month Stats">
                      <Space split="|" wrap>
                        <span>Present: {record.attendance?.present || 0}</span>
                        <span>Absent: {record.attendance?.absent || 0}</span>
                        <span>Half Day: {record.attendance?.halfDay || 0}</span>
                        <span>Weekly Off: {record.attendance?.weeklyOffs || 0}</span>
                        <span>Holiday: {record.attendance?.holidays || 0}</span>
                        <span>Paid Leave: {record.attendance?.paidLeave || 0}</span>
                      </Space>
                    </Descriptions.Item>
                    {(record.attendance?.lateCount > 0 || record.attendance?.latePenaltyDays > 0) && (
                      <Descriptions.Item label="Late Penalty">
                        <Text type="danger">{record.attendance?.lateCount || 0} late arrival(s) → {record.attendance?.latePenaltyDays || 0} penalty day(s) deducted</Text>
                      </Descriptions.Item>
                    )}
                    {record.attendance?.overtimeMinutes > 0 && (
                      <Descriptions.Item label="Overtime">
                        {Math.floor(record.attendance.overtimeMinutes / 60)}h {record.attendance.overtimeMinutes % 60}m
                        {record.overtimePay > 0 && <span> → <Text type="success">+₹{record.overtimePay.toLocaleString()}</Text></span>}
                      </Descriptions.Item>
                    )}
                    {record.leaveEncashmentAmount > 0 && (
                      <Descriptions.Item label="Leave Encashment">
                        <Space direction="vertical" size={2}>
                          {(record.encashmentDetails || []).map((enc, i) => (
                            <span key={i}>{enc.category}: {enc.days} day(s) → <Text type="success">₹{enc.amount?.toLocaleString()}</Text></span>
                          ))}
                          <Text strong type="success">Total: +₹{record.leaveEncashmentAmount.toLocaleString()}</Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </div>
              ),
              width: 580,
              okText: 'Close'
            });
          }}
        >
          View Details
        </Button>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s', background: 'transparent' }}>
        <Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <Space>
            <RobotOutlined style={{ fontSize: '24px', color: '#fff' }} />
            <Title level={4} style={{ margin: 0, color: '#fff' }}>AI Salary Forecast</Title>
            {month && <Tag color="white" style={{ color: '#764ba2', fontWeight: 'bold' }}>{monthNames[month - 1]} {year}</Tag>}
          </Space>
          <Button 
             type="primary" 
             ghost
             icon={<ReloadOutlined />} 
             onClick={() => fetchForecast(true)} 
             loading={loading}
             style={{ borderRadius: '8px', borderColor: '#fff', color: '#fff' }}
           >
             Refresh Forecast
           </Button>
        </Header>

        <Content style={{ padding: '24px' }}>
          <Spin spinning={loading} tip="AI is analyzing payroll data...">

            {/* ═══════ SECTION 1: AI INSIGHT CARD ═══════ */}
            {summary && (
              <Card 
                bordered={false}
                style={{ marginBottom: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', overflow: 'hidden' }}
                bodyStyle={{ padding: '24px 32px' }}
              >
                <Row gutter={24} align="middle">
                  <Col xs={24} md={6}>
                    <div style={{ textAlign: 'center' }}>
                      <RobotOutlined style={{ fontSize: '48px', color: 'rgba(255,255,255,0.8)' }} />
                      <Title level={5} style={{ color: '#fff', marginTop: '8px', marginBottom: 0 }}>AI Analysis</Title>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{summary.totalStaff || forecasts.length} Staff Analyzed</Text>
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Current Month Payout</span>}
                      value={summary.totalForecastedPay}
                      prefix="₹"
                      valueStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '24px' }}
                    />
                  </Col>
                  <Col xs={24} md={6}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Upcoming Month {summary.nextMonth?.monthLabel ? `(${summary.nextMonth.monthLabel})` : ''}</span>}
                      value={summary.nextMonth?.amount}
                      prefix="₹"
                      valueStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '24px' }}
                    />
                    {(() => {
                      const diff = (summary.nextMonth?.amount || 0) - (summary.totalForecastedPay || 0);
                      if (diff > 0) return <Text style={{ color: '#ffc069', fontSize: '11px' }}><ArrowUpOutlined /> ₹{diff.toLocaleString()} more than current</Text>;
                      if (diff < 0) return <Text style={{ color: '#b7eb8f', fontSize: '11px' }}><ArrowDownOutlined /> ₹{Math.abs(diff).toLocaleString()} less than current</Text>;
                      return <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Same as current month</Text>;
                    })()}
                    <br />
                    <Text 
                      style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', cursor: 'pointer' }}
                      onClick={() => {
                        const bd = summary.nextMonth?.breakdown || {};
                        Modal.info({
                          title: `Next Month Forecast Breakdown (${summary.nextMonth?.monthLabel || ''})`,
                          width: 620,
                          okText: 'Close',
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>Base Salary (Configured)</td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#1890ff' }}>₹{(bd.basePay || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#52c41a' }}>+ Expected Overtime</td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#52c41a' }}>+₹{(bd.expectedOvertime || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 8px' }}>
                                      <span style={{ fontWeight: 'bold', color: '#722ed1' }}>+ Increment Impact</span>
                                      {(bd.incrementDetails || []).length > 0 && (
                                        <div style={{ marginTop: 4 }}>
                                          {bd.incrementDetails.map((inc, i) => (
                                            <Tag key={i} color="purple" style={{ marginBottom: 2 }}>
                                              {inc.name}: {inc.hikePercent}% → +₹{(inc.monthlyIncrease || 0).toLocaleString()}/mo
                                            </Tag>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#722ed1' }}>+₹{(bd.incrementImpact || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#13c2c2' }}>+ New Hiring Salary</td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#13c2c2' }}>+₹{(bd.newHiringSalary || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '2px solid #ff4d4f' }}>
                                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#ff4d4f' }}>- Expected Deductions</td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#ff4d4f' }}>-₹{(bd.expectedDeductions || 0).toLocaleString()}</td>
                                  </tr>
                                  <tr style={{ background: '#f6ffed' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: 'bold', fontSize: '15px' }}>= Next Month Forecast</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: '#52c41a' }}>₹{(summary.nextMonth?.amount || 0).toLocaleString()}</td>
                                  </tr>
                                </tbody>
                              </table>
                              {bd.staffLimit && (
                                <Card size="small" style={{ marginTop: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
                                  <Space>
                                    <TeamOutlined style={{ color: '#fa8c16' }} />
                                    <div>
                                      <Text strong>Staff Capacity: </Text>
                                      <Text>{bd.currentStaffCount}/{bd.staffLimit} used</Text>
                                      {bd.canHireMore > 0 && <Text type="secondary"> — Can hire {bd.canHireMore} more (avg ₹{(bd.avgSalaryPerStaff || 0).toLocaleString()}/staff)</Text>}
                                      {bd.canHireMore === 0 && <Text type="danger"> — At capacity</Text>}
                                    </div>
                                  </Space>
                                </Card>
                              )}
                              <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}><InfoCircleOutlined /> {summary.nextMonth?.rationale}</Text>
                              </div>
                            </div>
                          )
                        });
                      }}
                    >
                      <InfoCircleOutlined /> See breakdown
                    </Text>
                  </Col>
                  <Col xs={24} md={6}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Base Config Cost</span>}
                      value={summary.totalBaseSalary}
                      prefix="₹"
                      valueStyle={{ color: 'rgba(255,255,255,0.9)', fontSize: '20px' }}
                    />
                    {summary.totalBaseSalary > summary.totalForecastedPay && (
                      <Text style={{ color: '#b7eb8f', fontSize: '12px' }}>
                        <ArrowDownOutlined /> ₹{(summary.totalBaseSalary - summary.totalForecastedPay).toLocaleString()} projected savings
                      </Text>
                    )}
                  </Col>
                </Row>
              </Card>
            )}

            {/* ═══════ SECTION 2: PAYROLL FORECAST CHART (CSS BAR CHART) ═══════ */}
            <Card 
              bordered={false}
              title={<Space><BarChartOutlined style={{ color: '#1890ff' }} /><span>Payroll Forecast Chart</span></Space>}
              style={{ marginBottom: '24px', borderRadius: '12px' }}
            >
              {chartData.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', minHeight: '220px', padding: '16px 0' }}>
                    {chartData.map((item, i) => {
                      const maxVal = Math.max(...chartData.map(c => Math.max(c.base, c.forecast)), 1);
                      const baseH = Math.max(20, (item.base / maxVal) * 180);
                      const foreH = Math.max(20, (item.forecast / maxVal) * 180);
                      return (
                        <Tooltip key={i} title={<div><div>Base: ₹{item.base.toLocaleString()}</div><div>Forecast: ₹{item.forecast.toLocaleString()}</div>{item.diff > 0 && <div style={{ color: '#ff7875' }}>Deduction: ₹{item.diff.toLocaleString()}</div>}</div>}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
                              <div style={{ width: '22px', height: `${baseH}px`, background: 'linear-gradient(180deg, #91d5ff, #1890ff)', borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
                              <div style={{ width: '22px', height: `${foreH}px`, background: `linear-gradient(180deg, ${item.diff > 0 ? '#ffa39e' : '#95de64'}, ${item.diff > 0 ? '#ff4d4f' : '#52c41a'})`, borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
                            </div>
                            <Text style={{ fontSize: '11px', marginTop: '6px', textAlign: 'center' }}>{item.name}</Text>
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
                    <Space><div style={{ width: 12, height: 12, background: '#1890ff', borderRadius: 2 }} /><Text type="secondary" style={{ fontSize: '12px' }}>Base Salary</Text></Space>
                    <Space><div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2 }} /><Text type="secondary" style={{ fontSize: '12px' }}>AI Forecast</Text></Space>
                    <Space><div style={{ width: 12, height: 12, background: '#ff4d4f', borderRadius: 2 }} /><Text type="secondary" style={{ fontSize: '12px' }}>With Deductions</Text></Space>
                  </div>
                </div>
              ) : <Text type="secondary">No data to display chart</Text>}
            </Card>

            {/* ═══════ SECTION 3: PREDICTION CARDS ═══════ */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              {predictionCards.map((card, i) => (
                <Col xs={12} md={6} key={i}>
                  <Card bordered={false} style={{ borderRadius: '12px', borderLeft: `4px solid ${card.color}` }} bodyStyle={{ padding: '16px' }}>
                    <Space>
                      <div style={{ fontSize: '24px', color: card.color }}>{card.icon}</div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{card.title}</Text>
                        <div><Text strong style={{ fontSize: '16px' }}>{card.value}</Text></div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>{card.desc}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* ═══════ SECTION 4: AI INSIGHTS ═══════ */}
            {summary?.insights && summary.insights.length > 0 && (
              <Card 
                bordered={false}
                title={<Space><ThunderboltOutlined style={{ color: '#faad14' }} /><span>AI Insights & Alerts</span></Space>}
                style={{ marginBottom: '24px', borderRadius: '12px' }}
              >
                <Row gutter={[16, 16]}>
                  {summary.insights.map((ins, i) => (
                    <Col xs={24} md={12} key={i}>
                      <Alert
                        message={<Text strong>{ins.title}</Text>}
                        description={ins.desc}
                        type={ins.type === 'warning' ? 'warning' : ins.type === 'error' ? 'error' : ins.type === 'success' ? 'success' : 'info'}
                        showIcon
                        style={{ borderRadius: '8px' }}
                      />
                    </Col>
                  ))}
                </Row>
              </Card>
            )}

            {/* ═══════ SECTION 5: SALARY FORECAST TABLE ═══════ */}
            <Card 
              bordered={false}
              title={<Space><WalletOutlined style={{ color: '#52c41a' }} /><span>Staff Salary Forecast — {monthNames[(month || 1) - 1]} {year}</span></Space>}
              extra={<Tag color="processing">Real-time Analysis</Tag>}
              style={{ marginBottom: '24px', borderRadius: '12px' }}
            >
              <Table 
                columns={columns} 
                dataSource={forecasts} 
                rowKey="userId" 
                loading={loading}
                pagination={forecasts.length > 15 ? { pageSize: 15 } : false}
                scroll={{ x: 900 }}
                size="middle"
                style={{ borderRadius: '8px' }}
              />
            </Card>

            {/* ═══════ SECTION 6: SIMULATION TOOL ═══════ */}
            <Card 
              bordered={false}
              title={<Space><ExperimentOutlined style={{ color: '#722ed1' }} /><span>What-If Simulation Tool</span></Space>}
              style={{ borderRadius: '12px', border: '1px dashed #d9d9d9' }}
            >
              <Text type="secondary" style={{ marginBottom: '16px', display: 'block' }}>
                Simulate what would happen to total payroll if additional absences, half-days, or overtime are added across all staff.
              </Text>
              <Row gutter={24}>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong>Extra Absent Days (per staff)</Text>
                    <Slider min={0} max={15} value={simAbsent} onChange={setSimAbsent} marks={{ 0: '0', 5: '5', 10: '10', 15: '15' }} />
                    <InputNumber min={0} max={15} value={simAbsent} onChange={v => setSimAbsent(v || 0)} style={{ width: '100%' }} />
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong>Extra Half-Days (per staff)</Text>
                    <Slider min={0} max={10} value={simHalfDay} onChange={setSimHalfDay} marks={{ 0: '0', 5: '5', 10: '10' }} />
                    <InputNumber min={0} max={10} value={simHalfDay} onChange={v => setSimHalfDay(v || 0)} style={{ width: '100%' }} />
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong>Extra Overtime Hours (total)</Text>
                    <Slider min={0} max={100} value={simOvertimeHrs} onChange={setSimOvertimeHrs} marks={{ 0: '0', 25: '25', 50: '50', 100: '100' }} />
                    <InputNumber min={0} max={100} value={simOvertimeHrs} onChange={v => setSimOvertimeHrs(v || 0)} style={{ width: '100%' }} />
                  </div>
                </Col>
              </Row>
              {simResult && (simAbsent > 0 || simHalfDay > 0 || simOvertimeHrs > 0) && (
                <Card size="small" style={{ background: '#fafafa', borderRadius: '8px', marginTop: '8px' }}>
                  <Row gutter={16} align="middle">
                    <Col xs={12} md={6}>
                      <Statistic title="Simulated Total Payout" value={simResult.simTotal} prefix="₹" valueStyle={{ color: '#722ed1', fontWeight: 'bold' }} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Statistic 
                        title="Change from Forecast" 
                        value={Math.abs(simResult.diff)} 
                        prefix={simResult.diff >= 0 ? '+₹' : '-₹'}
                        valueStyle={{ color: simResult.diff >= 0 ? '#52c41a' : '#ff4d4f' }}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Space direction="vertical" size={2}>
                        {simResult.absentDeduction > 0 && <Text type="danger">Absent deduction: -₹{simResult.absentDeduction.toLocaleString()}</Text>}
                        {simResult.halfDayDeduction > 0 && <Text type="warning">Half-day deduction: -₹{simResult.halfDayDeduction.toLocaleString()}</Text>}
                        {simResult.overtimeBonus > 0 && <Text type="success">Overtime bonus: +₹{simResult.overtimeBonus.toLocaleString()}</Text>}
                      </Space>
                    </Col>
                  </Row>
                </Card>
              )}
              {!(simAbsent > 0 || simHalfDay > 0 || simOvertimeHrs > 0) && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#aaa' }}>
                  <ExperimentOutlined style={{ fontSize: '24px' }} /><br />
                  Adjust sliders above to simulate payroll changes
                </div>
              )}
            </Card>

          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AIReports;
