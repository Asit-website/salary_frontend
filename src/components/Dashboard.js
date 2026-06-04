import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Statistic, Typography, Spin, Menu, Table } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  TeamOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
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
  Legend
} from 'recharts';

const { Content } = Layout;
const { Title, Text } = Typography;

// Function to calculate leave balance for each staff member
const calculateLeaveBalance = async (staffWithAssignments, balances) => {
  const today = new Date().toISOString().slice(0, 10);
  const leaveBalanceData = [];

  for (const staffMember of staffWithAssignments) {
    let activeTemplate = null;

    // Find the active leave template for this staff member
    if (staffMember.leaveAssignments && staffMember.leaveAssignments.length > 0) {
      // Find assignment that is currently active
      const activeAssignment = staffMember.leaveAssignments.find(assignment => {
        const effectiveFrom = assignment.effectiveFrom;
        const effectiveTo = assignment.effectiveTo;
        return effectiveFrom <= today && (!effectiveTo || effectiveTo >= today);
      });

      if (activeAssignment && activeAssignment.template) {
        activeTemplate = activeAssignment.template;
      }
    }

    if (activeTemplate) {
      // Calculate total leaves from template categories
      const totalLeaves = (activeTemplate.categories || []).reduce((sum, category) =>
        sum + (parseFloat(category.leaveCount) || 0), 0
      );

      // Find balances for this staff member
      const staffBalances = (balances || []).filter(balance =>
        String(balance.userId) === String(staffMember.id)
      );

      // Calculate used leaves from balances (including encashed)
      const usedLeaves = staffBalances.reduce((sum, balance) =>
        sum + (parseFloat(balance.used) || 0) + (parseFloat(balance.encashed) || 0), 0
      );

      // Calculate remaining leaves
      const remainingLeaves = Math.max(0, totalLeaves - usedLeaves);

      leaveBalanceData.push({
        employeeName: staffMember.profile?.name || staffMember.phone || `Staff ${staffMember.id}`,
        totalLeaves,
        usedLeaves,
        remainingLeaves,
        templateName: activeTemplate.name,
        staffId: staffMember.id
      });
    } else {
      // Staff member without assigned template - show as 0 leaves
      leaveBalanceData.push({
        employeeName: staffMember.profile?.name || staffMember.phone || `Staff ${staffMember.id}`,
        totalLeaves: 0,
        usedLeaves: 0,
        remainingLeaves: 0,
        templateName: 'No Policy Assigned',
        staffId: staffMember.id
      });
    }
  }

  // Sort by remaining leaves (descending) and take top 10
  return leaveBalanceData
    .sort((a, b) => b.remainingLeaves - a.remainingLeaves)
    .slice(0, 10);
};

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
    lateArrivalPercentage: 0,
    leaveToday: 0,
    inactiveEmployees: 0,
    totalLoans: 0,
    totalExpenses: 0,
    totalOrdersToday: 0
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [departmentDistribution, setDepartmentDistribution] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [loans, setLoans] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let fetchedLoans = [];
      let fetchedExpenses = [];
      let fetchedTodayApprovedExpenseAmount = 0;

      // Fetch dashboard stats (now includes leaveToday)
      const statsResponse = await api.get('/admin/dashboard');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
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
        const todayKey = dayjs().format('YYYY-MM-DD');
        const totalOrdersToday = orders.filter((o) => {
          const orderTs = o.orderDate || o.createdAt;
          return orderTs && dayjs(orderTs).format('YYYY-MM-DD') === todayKey;
        }).length;
        setStats(prev => ({ ...prev, totalOrdersToday }));

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
          color: '#1677ff',
        }));

        const combined = [...visitItems, ...orderItems]
          .filter(it => it.ts)
          .sort((a, b) => new Date(b.ts) - new Date(a.ts))
          .slice(0, 20);
        setRecentActivities(combined);
      } catch (_) {
        setRecentActivities([]);
        setStats(prev => ({ ...prev, totalOrdersToday: 0 }));
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
          const in365 = new Date();
          in365.setDate(in365.getDate() + 365);
          const tKey = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
          };
          const startKey = tKey(today);
          const endKey = tKey(in365);
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

      // Fetch loans data for Loan Overview section
      try {
        const loansResponse = await api.get('/admin/loans');
        if (loansResponse.data.success || loansResponse.data.data) {
          fetchedLoans = loansResponse.data.data || [];
          setLoans(fetchedLoans);
        }
      } catch (_) {
        fetchedLoans = [];
        setLoans([]);
      }

      // Fetch leaves data for Leave Overview section
      try {
        const leavesResponse = await api.get('/admin/leaves');
        if (leavesResponse.data.success || leavesResponse.data.data) {
          setLeaves(leavesResponse.data.data || []);
        }
      } catch (_) {
        setLeaves([]);
      }

      // Fetch expenses data
      try {
        const todayKey = dayjs().format('YYYY-MM-DD');
        const expensesResponse = await api.get('/admin/expenses', {
          params: { page: 1, limit: 1000 }
        });
        if (expensesResponse.data.success || expensesResponse.data.data) {
          fetchedExpenses = expensesResponse.data.data || [];
          fetchedTodayApprovedExpenseAmount = fetchedExpenses.reduce((sum, expense) => {
            const status = String(expense?.status || '').toLowerCase();
            const isApproved = status === 'approved' || status === 'settled';
            if (!isApproved) return sum;

            const approvedOn = expense?.approvedAt || expense?.settledAt || expense?.updatedAt || expense?.createdAt;
            if (!approvedOn || dayjs(approvedOn).format('YYYY-MM-DD') !== todayKey) return sum;

            const amount = Number(expense?.approvedAmount ?? expense?.amount ?? 0);
            return sum + (Number.isFinite(amount) ? amount : 0);
          }, 0);
          setExpenses(fetchedExpenses);
        }
      } catch (_) {
        fetchedExpenses = [];
        fetchedTodayApprovedExpenseAmount = 0;
        setExpenses([]);
      }

      // Fetch leave balance data for Leave Balance Overview
      try {
        const staffAssignmentsResponse = await api.get('/admin/staff/leave-assignments');
        const staffWithAssignments = staffAssignmentsResponse.data.staff || [];

        const balanceResponse = await api.get('/admin/leave/balances');
        const balances = balanceResponse.data.balances || [];

        const leaveBalanceData = await calculateLeaveBalance(staffWithAssignments, balances);
        setLeaveBalance(leaveBalanceData);
      } catch (error) {
        console.error('Error fetching leave balance data:', error);
        const sampleBalance = [
          { employeeName: 'Rahul Kumar', totalLeaves: 24, usedLeaves: 8, remainingLeaves: 16 },
          { employeeName: 'Priya Sharma', totalLeaves: 24, usedLeaves: 12, remainingLeaves: 12 },
          { employeeName: 'Amit Patel', totalLeaves: 24, usedLeaves: 5, remainingLeaves: 19 },
          { employeeName: 'Sneha Reddy', totalLeaves: 24, usedLeaves: 15, remainingLeaves: 9 },
          { employeeName: 'Vikram Singh', totalLeaves: 24, usedLeaves: 3, remainingLeaves: 21 },
          { employeeName: 'Anjali Gupta', totalLeaves: 24, usedLeaves: 10, remainingLeaves: 14 },
          { employeeName: 'Rajesh Verma', totalLeaves: 24, usedLeaves: 18, remainingLeaves: 6 },
          { employeeName: 'Kavita Nair', totalLeaves: 24, usedLeaves: 7, remainingLeaves: 17 }
        ];
        setLeaveBalance(sampleBalance);
      }

      // Fetch staff list to calculate inactive employees
      try {
        const staffResp = await api.get('/admin/staff');
        const staffList = staffResp.data?.data || staffResp.data?.staff || [];
        const inactiveCount = Array.isArray(staffList)
          ? staffList.filter(s => (s.active === false || s.active === 0 || s.active === '0')).length
          : 0;

        const totalLoansCount = Array.isArray(fetchedLoans) ? fetchedLoans.length : 0;
        const totalExpensesAmount = Number(fetchedTodayApprovedExpenseAmount || 0);

        setStats(prev => ({
          ...prev,
          inactiveEmployees: inactiveCount,
          totalLoans: totalLoansCount,
          totalExpenses: totalExpensesAmount
        }));
      } catch (e) {
        const totalLoansCount = Array.isArray(fetchedLoans) ? fetchedLoans.length : 0;
        const totalExpensesAmount = Number(fetchedTodayApprovedExpenseAmount || 0);
        setStats(prev => ({
          ...prev,
          inactiveEmployees: 0,
          totalLoans: totalLoansCount,
          totalExpenses: totalExpensesAmount
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
        <MainHeader
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          title="Dashboard"
          showHome={true}
        />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          
          {/* Top Stats Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Staff</div>
                    <div style={{ color: '#1f1f1f', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{stats.totalStaff}</div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#e6f7ff',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(24, 144, 255, 0.1)'
                  }}>
                    <UserOutlined style={{ color: '#1677ff', fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#52c41a', fontSize: '11px', fontWeight: '600' }}>+12% from last month</div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '70%',
                      height: '100%',
                      background: '#52c41a',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Present Today</div>
                    <div style={{ color: '#1f1f1f', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{stats.presentToday}</div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#f6ffed',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(82, 196, 26, 0.1)'
                  }}>
                    <CalendarOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#52c41a', fontSize: '11px', fontWeight: '600' }}>
                    {departmentDistribution.length > 0 ? `${departmentDistribution[0].department}: ${departmentDistribution[0].percentage}%` : 'No data'}
                  </div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${departmentDistribution.length > 0 ? departmentDistribution[0].percentage : 0}%`,
                      height: '100%',
                      background: '#52c41a',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Absent Today</div>
                    <div style={{ color: '#1f1f1f', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{stats.absentToday}</div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#fff7e6',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(250, 140, 22, 0.1)'
                  }}>
                    <CalendarOutlined style={{ color: '#fa8c16', fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#fa8c16', fontSize: '11px', fontWeight: '600' }}>
                    {stats.totalStaff > 0 ? Math.round((stats.absentToday / stats.totalStaff) * 100) : 0}% absenteeism
                  </div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${stats.totalStaff > 0 ? Math.round((stats.absentToday / stats.totalStaff) * 100) : 0}%`,
                      height: '100%',
                      background: '#fa8c16',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today Leave</div>
                    <div style={{ color: '#1f1f1f', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{stats.leaveToday}</div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#f9f0ff',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(114, 46, 209, 0.1)'
                  }}>
                    <CalendarOutlined style={{ color: '#722ed1', fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#722ed1', fontSize: '11px', fontWeight: '600' }}>Leave requests</div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '30%',
                      height: '100%',
                      background: '#722ed1',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            {/* <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactive Staff</div>
                    <div style={{ color: '#1f1f1f', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{stats.inactiveEmployees}</div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#fff1f0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(255, 77, 79, 0.1)'
                  }}>
                    <UserOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#ff4d4f', fontSize: '11px', fontWeight: '600' }}>Inactive</div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '0%',
                      height: '100%',
                      background: '#ff4d4f',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col> */}
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected Payout</div>
                    <div style={{ color: '#1f1f1f', fontSize: '20px', fontWeight: '700', lineHeight: 1 }}>
                      ₹{Number(stats.expectedMonthlyPayout || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#f6ffed',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(82, 196, 26, 0.1)'
                  }}>
                    <span style={{ color: '#52c41a', fontSize: '20px', fontWeight: '700', lineHeight: 1 }}>₹</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#52c41a', fontSize: '11px', fontWeight: '600' }}>Total Monthly Forecast</div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ width: '100%', height: '100%', background: '#52c41a', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Wages Payout</div>
                    <div style={{ color: '#1f1f1f', fontSize: '20px', fontWeight: '700', lineHeight: 1 }}>
                      ₹{Number(stats.dailyWagesPayout || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#e6f7ff',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(24, 144, 255, 0.1)'
                  }}>
                    <span style={{ color: '#1677ff', fontSize: '20px', fontWeight: '700', lineHeight: 1 }}>₹</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#1677ff', fontSize: '11px', fontWeight: '600' }}>Today's Wage Cost</div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ width: '100%', height: '100%', background: '#1677ff', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders Today</div>
                    <div style={{ color: '#1f1f1f', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{stats.totalOrdersToday || 0}</div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#e6f7ff',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(24, 144, 255, 0.1)'
                  }}>
                    <ShoppingCartOutlined style={{ color: '#1677ff', fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#1677ff', fontSize: '11px', fontWeight: '600' }}>Today's orders count</div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#1677ff',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  height: '100%'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved Expense</div>
                    <div style={{ color: '#1f1f1f', fontSize: '20px', fontWeight: '700', lineHeight: 1 }}>
                      ₹{Number(stats.totalExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    background: '#fff7e6',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(250, 140, 22, 0.1)'
                  }}>
                    <span style={{ color: '#fa8c16', fontSize: '20px', fontWeight: '700', lineHeight: 1 }}>₹</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#fa8c16', fontSize: '11px', fontWeight: '600' }}>Today's approved amount</div>
                  <div style={{
                    width: '50px',
                    height: '4px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#fa8c16',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={16}>
              <Card
                className="sales-content-card"
                title={<span style={{ fontSize: '16px', fontWeight: '600', color: '#1f1f1f' }}>Weekly Attendance Review</span>}
                bodyStyle={{ padding: '24px' }}
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
                      fill="#52c41a"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="absent"
                      fill="#ff4d4f"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="total"
                      fill="#1677ff"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                className="sales-content-card"
                title={<span style={{ fontSize: '16px', fontWeight: '600', color: '#1f1f1f' }}>Department Distribution</span>}
                bodyStyle={{ padding: '24px' }}
              >
                <Table
                  dataSource={departmentDistribution}
                  rowKey="department"
                  pagination={false}
                  size="small"
                  scroll={{ y: 300 }}
                  className="sales-table"
                  columns={[
                    {
                      title: 'Department',
                      dataIndex: 'department',
                      key: 'department',
                      width: '40%',
                      render: (text) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{text}</span>
                    },
                    {
                      title: 'Staff',
                      dataIndex: 'count',
                      key: 'count',
                      width: '20%',
                      align: 'center',
                      render: (val) => <span style={{ fontWeight: '500' }}>{val}</span>
                    },
                    {
                      title: 'Exp. Wages',
                      dataIndex: 'totalExpectedMonthlyWages',
                      key: 'totalExpectedMonthlyWages',
                      width: '40%',
                      align: 'right',
                      render: (val) => (
                        <span style={{ color: '#52c41a', fontWeight: '700' }}>
                          ₹{Number(val || 0).toLocaleString('en-IN')}
                        </span>
                      )
                    }
                  ]}
                  locale={{ emptyText: 'No Department Data' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                className="sales-content-card"
                title={<span style={{ fontSize: '16px', fontWeight: '600', color: '#1f1f1f' }}>Recent Activity</span>}
                bodyStyle={{ padding: '24px' }}
              >
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {(recentActivities.length ? recentActivities : [])
                    .map((activity, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: index < (recentActivities.length - 1) ? '1px solid #f5f5f5' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: activity.color === '#52c41a' ? '#e6f7ff' : '#f6ffed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            color: activity.color === '#52c41a' ? '#1677ff' : '#52c41a',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                          }}>
                            {activity.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', color: '#434343', fontWeight: '500' }}>{activity.action}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{activity.time}</div>
                      </div>
                    ))}
                  {recentActivities.length === 0 && (
                    <div style={{ color: '#8c8c8c', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
                  )}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                className="sales-content-card"
                title={<span style={{ fontSize: '16px', fontWeight: '600', color: '#1f1f1f' }}>Upcoming Holidays</span>}
                bodyStyle={{ padding: '24px' }}
              >
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {(upcomingHolidays.length ? upcomingHolidays : []).map((h, index) => (
                    <div key={h.id || index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: index < (upcomingHolidays.length - 1) ? '1px solid #f5f5f5' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#f9f0ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          fontSize: '18px',
                          boxShadow: '0 2px 6px rgba(114, 46, 209, 0.08)'
                        }}>
                          🎉
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', color: '#1f1f1f', marginBottom: '2px', fontWeight: '600' }}>{h.name}</div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{dayjs(h.date).format('DD MMM YYYY')}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: '500' }}>All Day</div>
                    </div>
                  ))}
                  {upcomingHolidays.length === 0 && (
                    <div style={{ color: '#8c8c8c', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No upcoming holidays</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Loan and Leave Overview Sections */}
          <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
            {/* Loan Overview - Left Side */}
            <Col xs={24} lg={12}>
              <Card
                className="sales-content-card"
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f1f1f' }}>
                      <span style={{ marginRight: '8px', color: '#1677ff', fontWeight: 'bold' }}>₹</span>
                      Loan Overview
                    </span>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#1677ff' }}>
                          {loans.length}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '500', textTransform: 'uppercase' }}>Total</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#52c41a' }}>
                          {loans.filter(l => l.status === 'active').length}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '500', textTransform: 'uppercase' }}>Active</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#fa8c16' }}>
                          ₹{loans.reduce((sum, loan) => sum + (parseFloat(loan.amount || 0)), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '500', textTransform: 'uppercase' }}>Amount</div>
                      </div>
                    </div>
                  </div>
                }
                bodyStyle={{ padding: '24px' }}
              >
                {loans.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {loans.slice(0, 3).map((loan, index) => (
                      <Col xs={24} sm={8} key={loan.id}>
                        <div style={{
                          background: '#fff',
                          border: '1px solid #f0f2f5',
                          borderRadius: '12px',
                          padding: '16px',
                          height: '100%',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(22, 119, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.borderColor = '#1677ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#f0f2f5';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: loan.status === 'active' ? '#f6ffed' : loan.status === 'completed' ? '#e6f7ff' : '#fff2f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '10px',
                              color: loan.status === 'active' ? '#52c41a' : loan.status === 'completed' ? '#1677ff' : '#ff4d4f',
                              fontSize: '14px',
                              fontWeight: '700'
                            }}>
                              {loan.staffMember?.profile?.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#1f1f1f',
                                marginBottom: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {loan.staffMember?.profile?.name || 'Unknown Staff'}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: '#8c8c8c',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {loan.staffMember?.phone || 'No phone'}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginBottom: '8px' }}>
                            <div style={{
                              fontSize: '11px',
                              color: '#8c8c8c',
                              marginBottom: '2px'
                            }}>
                              Loan Amount
                            </div>
                            <div style={{
                              fontSize: '15px',
                              fontWeight: '700',
                              color: '#1677ff'
                            }}>
                              ₹{parseFloat(loan.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                          </div>

                          <div style={{ marginBottom: '12px' }}>
                            <div style={{
                              fontSize: '11px',
                              color: '#8c8c8c',
                              marginBottom: '2px'
                            }}>
                              EMI: ₹{parseFloat(loan.emiAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: '#8c8c8c'
                            }}>
                              {loan.tenure} mo • {parseFloat(loan.interestRate || 0).toFixed(1)}%
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className={`sales-status-tag ${loan.status === 'active' ? 'sales-status-complete' : loan.status === 'completed' ? 'sales-status-active' : 'sales-status-inactive'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                              {loan.status || 'UNKNOWN'}
                            </span>
                            <span style={{ fontSize: '10px', color: '#8c8c8c' }}>
                              {dayjs(loan.issueDate).format('DD MMM')}
                            </span>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#8c8c8c'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>₹</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>No loans found</div>
                    <div style={{ fontSize: '12px' }}>Start by creating your first loan</div>
                  </div>
                )}
              </Card>
            </Col>

            {/* Leave Overview - Right Side */}
            <Col xs={24} lg={12}>
              <Card
                className="sales-content-card"
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f1f1f' }}>
                      <TeamOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                      Leave Overview
                    </span>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#52c41a' }}>
                          {leaves.filter(l => l.status?.toLowerCase() === 'approved').length}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '500', textTransform: 'uppercase' }}>Approved</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#ff4d4f' }}>
                          {leaves.filter(l => l.status?.toLowerCase() === 'rejected').length}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '500', textTransform: 'uppercase' }}>Rejected</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#fa8c16' }}>
                          {leaves.filter(l => l.status?.toLowerCase() === 'pending').length}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '500', textTransform: 'uppercase' }}>Pending</div>
                      </div>
                    </div>
                  </div>
                }
                bodyStyle={{ padding: '24px' }}
              >
                {leaves.length > 0 ? (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {leaves.slice(0, 8).map((leave, index) => (
                      <div key={leave.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: index < (Math.min(leaves.length, 8) - 1) ? '1px solid #f5f5f5' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: leave.status?.toLowerCase() === 'approved' ? '#f6ffed' : leave.status?.toLowerCase() === 'rejected' ? '#fff1f0' : '#fff7e6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            color: leave.status?.toLowerCase() === 'approved' ? '#52c41a' : leave.status?.toLowerCase() === 'rejected' ? '#ff4d4f' : '#fa8c16',
                            fontSize: '14px',
                            fontWeight: '700'
                          }}>
                            {leave.user?.profile?.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#1f1f1f',
                              marginBottom: '2px'
                            }}>
                              {leave.user?.profile?.name || 'Unknown Staff'}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#8c8c8c',
                              marginBottom: '2px'
                            }}>
                              {leave.leaveType} • {dayjs(leave.startDate).format('DD MMM')} - {dayjs(leave.endDate).format('DD MMM')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#8c8c8c', fontStyle: 'italic' }}>
                              "{leave.reason || 'No reason provided'}"
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`sales-status-tag ${leave.status?.toLowerCase() === 'approved' ? 'sales-status-complete' : leave.status?.toLowerCase() === 'rejected' ? 'sales-status-inactive' : 'sales-status-pending'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                            {leave.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                          <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                            {dayjs(leave.createdAt).format('DD MMM')}
                          </div>
                        </div>
                      </div>
                    ))}
                    {leaves.length > 8 && (
                      <div style={{ textAlign: 'center', padding: '12px 0' }}>
                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          And {leaves.length - 8} more leave requests...
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#8c8c8c'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>No leave requests found</div>
                    <div style={{ fontSize: '12px' }}>No leave requests have been submitted yet</div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Leave Balance Overview Section */}
          <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
            <Col span={24}>
              <Card
                className="sales-content-card"
                title={
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f1f1f' }}>
                    <CalendarOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                    Employee Leave Balance Overview
                  </span>
                }
                bodyStyle={{ padding: '24px' }}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={leaveBalance.length > 0 ? leaveBalance : [
                      { employeeName: 'No Data', totalLeaves: 0, usedLeaves: 0, remainingLeaves: 0 }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="employeeName"
                      stroke="#8c8c8c"
                      fontSize="12"
                      tickLine={{ stroke: '#e8e8e8' }}
                      axisLine={{ stroke: '#e8e8e8' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      stroke="#8c8c8c"
                      fontSize="12"
                      tickLine={{ stroke: '#e8e8e8' }}
                      axisLine={{ stroke: '#e8e8e8' }}
                      label={{ value: 'Leave Days', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#8c8c8c' } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#000',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                      labelStyle={{
                        color: '#262626',
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}
                      itemStyle={{ color: '#000' }}
                      formatter={(value, name) => {
                        const labels = {
                          totalLeaves: 'Total Leaves',
                          usedLeaves: 'Used Leaves',
                          remainingLeaves: 'Remaining Leaves'
                        };
                        return [
                          `${value} days`,
                          labels[name] || name
                        ];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="square"
                      formatter={(value) => {
                        const labels = {
                          totalLeaves: 'Total Leaves',
                          usedLeaves: 'Used Leaves',
                          remainingLeaves: 'Remaining Leaves'
                        };
                        return <span style={{ color: '#000' }}>{labels[value]}</span>;
                      }}
                      payload={[
                        { value: 'totalLeaves', type: 'square', color: '#1677ff' },
                        { value: 'usedLeaves', type: 'square', color: '#fa8c16' },
                        { value: 'remainingLeaves', type: 'square', color: '#52c41a' }
                      ]}
                    />
                    <Bar
                      dataKey="totalLeaves"
                      fill="#e6f7ff"
                      stroke="#1677ff"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="usedLeaves"
                      fill="#fff2e8"
                      stroke="#fa8c16"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="remainingLeaves"
                      fill="#f6ffed"
                      stroke="#52c41a"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* Summary Statistics */}
                {leaveBalance.length > 0 && (
                  <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                    <Col xs={24} sm={8}>
                      <div style={{
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(82, 196, 26, 0.04)'
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#135200', marginBottom: '4px' }}>
                          {leaveBalance.reduce((sum, emp) => sum + (emp.remainingLeaves || 0), 0)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#135200', fontWeight: '600' }}>
                          Total Remaining Leaves
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div style={{
                        background: '#fff2e8',
                        border: '1px solid #ffd591',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(250, 140, 22, 0.04)'
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#d46b08', marginBottom: '4px' }}>
                          {leaveBalance.reduce((sum, emp) => sum + (emp.usedLeaves || 0), 0)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#d46b08', fontWeight: '600' }}>
                          Total Used Leaves
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div style={{
                        background: '#e6f7ff',
                        border: '1px solid #91d5ff',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(24, 144, 255, 0.04)'
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#0050b3', marginBottom: '4px' }}>
                          {Math.round(leaveBalance.reduce((sum, emp) => sum + (emp.remainingLeaves || 0), 0) / leaveBalance.length)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#0050b3', fontWeight: '600' }}>
                          Avg. Remaining per Employee
                        </div>
                      </div>
                    </Col>
                  </Row>
                )}
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;
