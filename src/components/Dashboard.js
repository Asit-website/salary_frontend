import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Statistic, Typography, Spin, Menu } from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  DollarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import dayjs from 'dayjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const { Header, Content } = Layout;
const { Title } = Typography;

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
    lateArrivalPercentage: 0
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [departmentDistribution, setDepartmentDistribution] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await api.get('/admin/dashboard/stats');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Fetch late arrivals data
      const lateArrivalsResponse = await api.get('/admin/dashboard/late-arrivals');
      if (lateArrivalsResponse.data.success) {
        setStats(prev => ({
          ...prev,
          lateArrivals: lateArrivalsResponse.data.data.lateArrivals,
          lateArrivalPercentage: lateArrivalsResponse.data.data.percentage
        }));
      }

      // Fetch department distribution data
      const deptResponse = await api.get('/admin/dashboard/department-distribution');
      if (deptResponse.data.success) {
        setDepartmentDistribution(deptResponse.data.data.departments);
      }

      // Fetch attendance data for chart
      const attendanceResponse = await api.get('/admin/dashboard/attendance-chart');
      if (attendanceResponse.data.success) {
        setAttendanceData(attendanceResponse.data.data);
      }

      // Fetch salary data for chart
      const salaryResponse = await api.get('/admin/dashboard/salary-chart');
      if (salaryResponse.data.success) {
        setSalaryData(salaryResponse.data.data);
      }

      // Fetch recent sales visits and orders for dynamic recent activity
      try {
        const [visitsResp, ordersResp] = await Promise.all([
          api.get('/admin/sales/visits'),
          api.get('/admin/sales/orders'),
        ]);
        const visits = Array.isArray(visitsResp?.data?.visits) ? visitsResp.data.visits : [];
        const orders = Array.isArray(ordersResp?.data?.orders) ? ordersResp.data.orders : [];

        const visitItems = visits.slice(0, 20).map(v => ({
          ts: v.visitDate || v.createdAt,
          time: v.visitDate ? dayjs(v.visitDate).format('hh:mm A') : '',
          action: `${v.staffName || 'Staff'} visited ${v.clientName || 'Client'}${v.visitType ? ` • ${v.visitType}` : ''}`,
          icon: '✓',
          color: v.verified ? '#52c41a' : '#d9d9d9',
        }));

        const orderItems = orders.slice(0, 20).map(o => ({
          ts: o.orderDate || o.createdAt,
          time: o.orderDate ? dayjs(o.orderDate).format('hh:mm A') : '',
          action: `${o.staffName || 'Staff'} created order for ${o.clientName || 'Client'}${o.totalAmount ? ` • ₹${o.totalAmount}` : ''}`,
          icon: '🛒',
          color: '#1890ff',
        }));

        const combined = [...visitItems, ...orderItems]
          .filter(it => it.ts)
          .sort((a, b) => new Date(b.ts) - new Date(a.ts))
          .slice(0, 20);
        setRecentActivities(combined);
      } catch (_) {
        setRecentActivities([]);
      }

      // Fetch upcoming holidays for Upcoming Events
      try {
        const hResp = await api.get('/admin/dashboard/upcoming-holidays');
        const holidays = Array.isArray(hResp?.data?.holidays) ? hResp.data.holidays : [];
        setUpcomingHolidays(holidays);
      } catch (_) {
        // Fallback: derive from holiday templates if direct endpoint not available
        try {
          const tResp = await api.get('/admin/holidays/templates');
          const templates = Array.isArray(tResp?.data?.templates) ? tResp.data.templates : [];
          const today = new Date();
          const in90 = new Date();
          in90.setDate(in90.getDate() + 90);
          const tKey = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
          };
          const startKey = tKey(today);
          const endKey = tKey(in90);
          const list = [];
          for (const tpl of templates) {
            const hs = Array.isArray(tpl.holidays) ? tpl.holidays : [];
            for (const h of hs) {
              if (!h || h.active === false || !h.date) continue;
              const d = String(h.date);
              if (d >= startKey && d <= endKey) list.push({ id: h.id, name: h.name, date: d });
            }
          }
          list.sort((a, b) => new Date(a.date) - new Date(b.date));
          setUpcomingHolidays(list);
        } catch (e2) {
          setUpcomingHolidays([]);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Logout',
                onClick: handleLogout
              }
            ]}
          />
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Total Staff</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{stats.totalStaff}</div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#e6f7ff', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#52c41a', fontSize: '11px', fontWeight: '500' }}>+12% from last month</div>
                  <div style={{ 
                    width: '50px', 
                    height: '3px', 
                    background: '#f0f0f0', 
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: '70%', 
                      height: '100%', 
                      background: '#52c41a', 
                      borderRadius: '2px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Present Today</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{stats.presentToday}</div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#f6ffed', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#52c41a', fontSize: '11px', fontWeight: '500' }}>
                    {departmentDistribution.length > 0 ? `${departmentDistribution[0].department}: ${departmentDistribution[0].percentage}%` : 'No data'}
                  </div>
                  <div style={{ 
                    width: '50px', 
                    height: '3px', 
                    background: '#f0f0f0', 
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${departmentDistribution.length > 0 ? departmentDistribution[0].percentage : 0}%`, 
                      height: '100%', 
                      background: '#52c41a', 
                      borderRadius: '2px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Absent Today</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{stats.absentToday}</div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#fff2e8', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarOutlined style={{ color: '#fa8c16', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#fa8c16', fontSize: '11px', fontWeight: '500' }}>9% absenteeism</div>
                  <div style={{ 
                    width: '50px', 
                    height: '3px', 
                    background: '#f0f0f0', 
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: '9%', 
                      height: '100%', 
                      background: '#fa8c16', 
                      borderRadius: '2px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                style={{ 
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Late Arrivals</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{stats.lateArrivals}</div>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#fff1f0', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#ff4d4f', fontSize: '11px', fontWeight: '500' }}>{stats.lateArrivalPercentage}% of workforce</div>
                  <div style={{ 
                    width: '50px', 
                    height: '3px', 
                    background: '#f0f0f0', 
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${Math.min(stats.lateArrivalPercentage, 100)}%`, 
                      height: '100%', 
                      background: '#ff4d4f', 
                      borderRadius: '2px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={16}>
              <Card 
                title={<span style={{ fontSize: '15px', fontWeight: '500', color: '#262626' }}>Weekly Attendance Review</span>}
                style={{ 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={attendanceData.length ? attendanceData : [
                    { day: 'Mon', present: 142, absent: 14, total: 156 },
                    { day: 'Tue', present: 138, absent: 18, total: 156 },
                    { day: 'Wed', present: 145, absent: 11, total: 156 },
                    { day: 'Thu', present: 140, absent: 16, total: 156 },
                    { day: 'Fri', present: 135, absent: 21, total: 156 },
                    { day: 'Sat', present: 120, absent: 36, total: 156 },
                    { day: 'Sun', present: 45, absent: 111, total: 156 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#8c8c8c" 
                      fontSize="12" 
                      tickLine={{ stroke: '#e8e8e8' }}
                      axisLine={{ stroke: '#e8e8e8' }}
                    />
                    <YAxis 
                      stroke="#8c8c8c" 
                      fontSize="12" 
                      tickLine={{ stroke: '#e8e8e8' }}
                      axisLine={{ stroke: '#e8e8e8' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #d9d9d9', 
                        borderRadius: '6px',
                        fontSize: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                      labelStyle={{ color: '#262626', fontWeight: '500' }}
                    />
                    <Bar 
                      dataKey="present" 
                      fill="#1890ff" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="absent" 
                      fill="#faad14" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#f5222d" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card 
                title={<span style={{ fontSize: '15px', fontWeight: '500', color: '#262626' }}>Department Distribution</span>}
                style={{ 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentDistribution.length > 0 ? departmentDistribution.map((dept, index) => ({
                        name: dept.department,
                        value: dept.count,
                        color: ['#52c41a', '#f5222d', '#faad14', '#1890ff', '#722ed1', '#fa8c16'][index % 6]
                      })) : [
                        { name: 'No Data', value: 1, color: '#d9d9d9' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(departmentDistribution.length > 0 ? departmentDistribution.map((dept, index) => ({
                        name: dept.department,
                        value: dept.count,
                        color: ['#52c41a', '#f5222d', '#faad14', '#1890ff', '#722ed1', '#fa8c16'][index % 6]
                      })) : [
                        { name: 'No Data', value: 1, color: '#d9d9d9' }
                      ]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    {departmentDistribution.length > 0 ? departmentDistribution.slice(0, 4).map((dept, index) => (
                      <div key={dept.department} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: ['#52c41a', '#f5222d', '#faad14', '#1890ff', '#722ed1', '#fa8c16'][index % 6], 
                          borderRadius: '2px', 
                          marginRight: '8px' 
                        }}></div>
                        <span style={{ fontSize: '12px', color: '#666' }}>{dept.department}</span>
                      </div>
                    )) : (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: '#d9d9d9', 
                          borderRadius: '2px', 
                          marginRight: '8px' 
                        }}></div>
                        <span style={{ fontSize: '12px', color: '#666' }}>No Data</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card 
                title={<span style={{ fontSize: '15px', fontWeight: '500', color: '#262626' }}>Recent Activity</span>}
                style={{ 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {(recentActivities.length ? recentActivities : [])
                    .map((activity, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '12px 0', 
                        borderBottom: index < (recentActivities.length - 1) ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: activity.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {activity.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', color: '#262626', marginBottom: '2px' }}>{activity.action}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{activity.time}</div>
                      </div>
                    ))}
                  {recentActivities.length === 0 && (
                    <div style={{ color: '#8c8c8c', fontSize: 13 }}>No recent activity</div>
                  )}
                </div>
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card 
                title={<span style={{ fontSize: '15px', fontWeight: '500', color: '#262626' }}>Upcoming Events</span>}
                style={{ 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {(upcomingHolidays.length ? upcomingHolidays : []).map((h, index) => (
                    <div key={h.id || index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 0', 
                      borderBottom: index < (upcomingHolidays.length - 1) ? '1px solid #f0f0f0' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          backgroundColor: '#52c41a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          fontSize: '16px',
                          color: '#fff'
                        }}>
                          🎉
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', color: '#262626', marginBottom: '2px', fontWeight: '500' }}>{h.name}</div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{dayjs(h.date).format('DD MMM')}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>All Day</div>
                    </div>
                  ))}
                  {upcomingHolidays.length === 0 && (
                    <div style={{ color: '#8c8c8c', fontSize: 13 }}>No upcoming holidays</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;
