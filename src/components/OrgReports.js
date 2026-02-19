import React, { useState, useEffect } from 'react';
import { Card, Select, DatePicker, Button, Table, message, Space, Spin, Row, Col, Typography, Layout } from 'antd';
import { DownloadOutlined, FileExcelOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Header, Content } = Layout;

const OrgReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('attendance');
  const [month, setMonth] = useState(moment().format('YYYY-MM'));
  const [data, setData] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [reportScope, setReportScope] = useState('all'); // 'all' or 'selected'
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Fetch employees for selection
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/admin/staff');
        if (response.data.success) {
          setEmployees(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  const reportTypes = [
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'leave', label: 'Leave Report' },
    { value: 'sales', label: 'Sales Report' }
  ];

  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = moment().subtract(i, 'months');
    months.push({
      value: date.format('YYYY-MM'),
      label: date.format('MMMM YYYY')
    });
  }

  useEffect(() => {
    if (reportType && month) {
      fetchReportData();
    }
  }, [reportType, month, reportScope, selectedEmployees]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let endpoint;
      if (reportType === 'attendance') {
        endpoint = '/admin/reports/org-attendance';
      } else if (reportType === 'leave') {
        endpoint = '/admin/reports/org-leave';
      } else if (reportType === 'sales') {
        endpoint = '/admin/reports/org-sales';
      }
      
      const params = {
        month: moment(month).month() + 1,
        year: moment(month).year()
      };
      
      // Add employee IDs to params if specific employees are selected
      if (reportScope === 'selected' && selectedEmployees.length > 0) {
        params.employeeIds = selectedEmployees.join(',');
      }
      
      const response = await api.get(endpoint, { params });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        message.error('Failed to fetch report data');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      message.error('Error loading report data');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      let endpoint;
      if (reportType === 'attendance') {
        endpoint = '/admin/reports/org-attendance';
      } else if (reportType === 'leave') {
        endpoint = '/admin/reports/org-leave';
      } else if (reportType === 'sales') {
        endpoint = '/admin/reports/org-sales';
      }
      
      const params = {
        month: moment(month).month() + 1,
        year: moment(month).year(),
        format: 'excel'
      };
      
      // Add employee IDs to params if specific employees are selected
      if (reportScope === 'selected' && selectedEmployees.length > 0) {
        params.employeeIds = selectedEmployees.join(',');
      }
      
      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const scopeText = reportScope === 'selected' ? 'selected-employees' : 'all-employees';
      const fileName = `org-${reportType}-report-${scopeText}-${month}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      message.error('Error downloading report');
    } finally {
      setDownloading(false);
    }
  };

  const getSalesColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => record.user?.profile?.name || 'N/A'
    },
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      render: (text, record) => record.user?.phone || 'N/A'
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (text, record) => record.user?.profile?.department || 'N/A'
    },
    {
      title: 'Client Name',
      dataIndex: 'clientName',
      key: 'clientName'
    },
    {
      title: 'Visit Date',
      dataIndex: 'visitDate',
      key: 'visitDate',
      render: (text) => moment(text).format('DD MMM YYYY')
    },
    {
      title: 'Visit Type',
      dataIndex: 'visitType',
      key: 'visitType'
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone'
    }
  ];

  const getAttendanceColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => record.user?.profile?.name || 'N/A'
    },
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      render: (text, record) => record.user?.phone || 'N/A'
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (text, record) => record.user?.profile?.department || 'N/A'
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('DD MMM YYYY')
    },
    {
      title: 'Punch In',
      dataIndex: 'punchIn',
      key: 'punchIn',
      render: (text, record) => record.punchedInAt ? moment(record.punchedInAt).format('HH:mm') : 'N/A'
    },
    {
      title: 'Punch Out',
      dataIndex: 'punchOut',
      key: 'punchOut',
      render: (text, record) => record.punchedOutAt ? moment(record.punchedOutAt).format('HH:mm') : 'N/A'
    },
    {
      title: 'Work Hours',
      dataIndex: 'workHours',
      key: 'workHours',
      render: (text, record) => {
        if (record.punchedInAt && record.punchedOutAt) {
          const hours = (new Date(record.punchedOutAt) - new Date(record.punchedInAt)) / (1000 * 60 * 60);
          return `${hours.toFixed(2)} hrs`;
        }
        return 'N/A';
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status'
    },
    {
      title: 'Late Arrival',
      dataIndex: 'lateArrival',
      key: 'lateArrival',
      render: (text) => text ? 'Yes' : 'No'
    }
  ];

  const getLeaveColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => record.user?.profile?.name || 'N/A'
    },
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      render: (text, record) => record.user?.phone || 'N/A'
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (text, record) => record.user?.profile?.department || 'N/A'
    },
    {
      title: 'Leave Type',
      dataIndex: 'leaveType',
      key: 'leaveType'
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (text) => moment(text).format('DD MMM YYYY')
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (text) => moment(text).format('DD MMM YYYY')
    },
    {
      title: 'Days',
      dataIndex: 'days',
      key: 'days',
      render: (text, record) => {
        const days = Math.ceil((new Date(record.endDate) - new Date(record.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        return days;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status'
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' },
              onClick: () => setCollapsed(!collapsed)
            })}
            <Title level={4} style={{ margin: 0, color: '#262626' }}>Organization Reports</Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: '24px' }}>
            <LogoutOutlined 
              style={{ fontSize: '18px', cursor: 'pointer', color: '#666' }} 
              onClick={handleLogout}
              title="Logout"
            />
          </div>
        </Header>
        
        <Content style={{ margin: 0, overflow: 'auto', background: '#f0f2f5' }}>
          <div style={{ padding: '24px' }}>
            <Card style={{ marginBottom: '24px' }}>
              <Row gutter={16} align="middle">
                <Col span={4}>
                  <Text strong>Report Scope:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '8px' }}
                    value={reportScope}
                    onChange={setReportScope}
                  >
                    <Option value="all">All Employees</Option>
                    <Option value="selected">Selected Employees</Option>
                  </Select>
                </Col>
                
                {reportScope === 'selected' && (
                  <Col span={6}>
                    <Text strong>Select Employees:</Text>
                    <Select
                      mode="multiple"
                      style={{ width: '100%', marginTop: '8px' }}
                      value={selectedEmployees}
                      onChange={setSelectedEmployees}
                      placeholder="Select employees..."
                      showSearch
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {employees.map(emp => (
                        <Option key={emp.id} value={emp.id}>
                          {emp.profile?.name || emp.phone || `Employee ${emp.id}`}
                        </Option>
                      ))}
                    </Select>
                  </Col>
                )}
                
                <Col span={4}>
                  <Text strong>Report Type:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '8px' }}
                    value={reportType}
                    onChange={setReportType}
                  >
                    {reportTypes.map(type => (
                      <Option key={type.value} value={type.value}>
                        {type.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                
                <Col span={4}>
                  <Text strong>Month:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '8px' }}
                    value={month}
                    onChange={setMonth}
                  >
                    {months.map(month => (
                      <Option key={month.value} value={month.value}>
                        {month.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                
                <Col span={4}>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    loading={downloading}
                    onClick={downloadExcel}
                    style={{ marginTop: '24px' }}
                  >
                    Download Excel
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card>
              <Title level={4}>
                {reportType === 'attendance' ? 'Attendance Report' : 
                 reportType === 'leave' ? 'Leave Report' : 
                 'Sales Report'} - {moment(month).format('MMMM YYYY')}
              </Title>
              
              <Spin spinning={loading}>
                <Table
                  columns={
                    reportType === 'attendance' ? getAttendanceColumns() : 
                    reportType === 'leave' ? getLeaveColumns() : 
                    getSalesColumns()
                  }
                  dataSource={data}
                  rowKey={(record, index) => record.id || index}
                  pagination={{
                    pageSize: 50,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} records`
                  }}
                  scroll={{ x: 1200 }}
                />
              </Spin>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default OrgReports;
