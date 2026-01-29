import React, { useState, useEffect } from 'react';
import { Layout, Card, DatePicker, Button, Select, Table, message, Space, Typography, Row, Col, Statistic, Menu } from 'antd';
import { 
  FileTextOutlined, 
  UserOutlined, 
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownloadOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Reports = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [reportType, setReportType] = useState('attendance');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    averageAttendance: 0
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchStaff();
    fetchReportData();
  }, [dateRange, reportType, selectedStaff]);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/admin/staff');
      if (response.data.success) {
        setStaffList(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        type: reportType,
      };
      
      if (selectedStaff !== 'all') {
        params.staffId = selectedStaff;
      }

      const response = await api.get('/admin/reports', { params });
      if (response.data.success) {
        setReportData(response.data.data.records);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      message.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleExport = async () => {
    try {
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        type: reportType,
      };
      
      if (selectedStaff !== 'all') {
        params.staffId = selectedStaff;
      }

      const response = await api.get('/admin/reports/export', { 
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${dateRange[0].format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Report exported successfully');
    } catch (error) {
      message.error('Failed to export report');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getColumns = () => {
    if (reportType === 'attendance') {
      return [
        {
          title: 'Staff Name',
          dataIndex: ['user', 'name'],
          key: 'name',
        },
        {
          title: 'Staff ID',
          dataIndex: ['staffProfile', 'staffId'],
          key: 'staffId',
        },
        {
          title: 'Total Days',
          dataIndex: 'totalDays',
          key: 'totalDays',
        },
        {
          title: 'Present Days',
          dataIndex: 'presentDays',
          key: 'presentDays',
        },
        {
          title: 'Absent Days',
          dataIndex: 'absentDays',
          key: 'absentDays',
        },
        {
          title: 'Leave Days',
          dataIndex: 'leaveDays',
          key: 'leaveDays',
        },
        {
          title: 'Attendance %',
          dataIndex: 'attendancePercentage',
          key: 'attendancePercentage',
          render: (percentage) => `${percentage?.toFixed(1)}%`,
        },
      ];
    } else if (reportType === 'salary') {
      return [
        {
          title: 'Staff Name',
          dataIndex: ['user', 'name'],
          key: 'name',
        },
        {
          title: 'Staff ID',
          dataIndex: ['staffProfile', 'staffId'],
          key: 'staffId',
        },
        {
          title: 'Basic Salary',
          dataIndex: 'basicSalary',
          key: 'basicSalary',
          render: (value) => `₹${value?.toLocaleString() || 0}`,
        },
        {
          title: 'Gross Salary',
          dataIndex: 'grossSalary',
          key: 'grossSalary',
          render: (value) => `₹${value?.toLocaleString() || 0}`,
        },
        {
          title: 'Deductions',
          dataIndex: 'totalDeductions',
          key: 'totalDeductions',
          render: (value) => `₹${value?.toLocaleString() || 0}`,
        },
        {
          title: 'Net Salary',
          dataIndex: 'netSalary',
          key: 'netSalary',
          render: (value) => `₹${value?.toLocaleString() || 0}`,
        },
      ];
    }
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      
      <Layout>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Title level={4} style={{ margin: 0 }}>Reports</Title>
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
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Card title="Generate Reports">
            <Space style={{ marginBottom: 16 }} wrap>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="DD MMM YYYY"
              />
              
              <Select
                value={reportType}
                onChange={setReportType}
                style={{ width: 150 }}
              >
                <Option value="attendance">Attendance</Option>
                <Option value="salary">Salary</Option>
              </Select>
              
              <Select
                value={selectedStaff}
                onChange={setSelectedStaff}
                style={{ width: 200 }}
              >
                <Option value="all">All Staff</Option>
                {staffList.map(staff => (
                  <Option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.staffProfile?.staffId})
                  </Option>
                ))}
              </Select>

              <Button 
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                Export
              </Button>

              <Button 
                icon={<PrinterOutlined />}
                onClick={handlePrint}
              >
                Print
              </Button>
            </Space>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Days"
                    value={stats.totalDays}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Present Days"
                    value={stats.presentDays}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Absent Days"
                    value={stats.absentDays}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Avg Attendance"
                    value={stats.averageAttendance}
                    suffix="%"
                    precision={1}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            <Table
              columns={getColumns()}
              dataSource={reportData}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Reports;
