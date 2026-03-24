import React, { useState, useEffect, useRef } from 'react';
import { Card, Select, DatePicker, Button, Table, message, Space, Spin, Row, Col, Typography, Layout, Tag } from 'antd';
import { DownloadOutlined, FileExcelOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const activeRequestRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

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
          const arr = Array.isArray(response.data.staff)
            ? response.data.staff
            : (Array.isArray(response.data.data) ? response.data.data : []);
          setEmployees(arr);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Handle report type from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type && reportTypes.some(rt => rt.value === type)) {
      setReportType(type);
    }
  }, [location.search]);

  const reportTypes = [
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'monthly-attendance', label: 'Monthly Attendance (Detailed Excel)' },
    { value: 'leave', label: 'Leave Report' },
    { value: 'applied-leave', label: 'Applied Leave Report' },
    { value: 'leave-balance', label: 'Leave Balance Report' },
    { value: 'punch-report', label: 'Punch Report (Matrix)' },
    { value: 'sales', label: 'Sales Report' },
    { value: 'activities', label: 'Activities Report' },
    { value: 'tickets', label: 'Tickets Report' },
    { value: 'meetings', label: 'Meetings Report' }
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
    const requestId = ++activeRequestRef.current;

    if (reportType === 'monthly-attendance') {
      // This report is Excel-only; clear any stale data immediately
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let endpoint;
      if (reportType === 'attendance') {
        endpoint = '/admin/reports/org-attendance-matrix';
      } else if (reportType === 'monthly-attendance') {
        endpoint = '/admin/reports/monthly-attendance';
      } else if (reportType === 'leave') {
        endpoint = '/admin/reports/org-leave';
      } else if (reportType === 'applied-leave') {
        endpoint = '/admin/reports/org-applied-leave';
      } else if (reportType === 'leave-balance') {
        endpoint = '/admin/reports/org-leave-balance';
      } else if (reportType === 'punch-report') {
        endpoint = '/admin/reports/org-punch-matrix';
      } else if (reportType === 'detailed-attendance') {
        endpoint = '/admin/reports/org-detailed-attendance';
      } else if (reportType === 'sales') {
        endpoint = '/admin/reports/org-sales';
      } else if (reportType === 'activities') {
        endpoint = '/admin/reports/org-activities';
      } else if (reportType === 'tickets') {
        endpoint = '/admin/reports/org-tickets';
      } else if (reportType === 'meetings') {
        endpoint = '/admin/reports/org-meetings';
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

      if (requestId !== activeRequestRef.current) return;

      if (response.data.success) {
        if (reportType === 'punch-report') {
          const { staffList, matrix, daysInMonth, startDate } = response.data.data;
          const formatted = staffList.map((staff, idx) => {
            const row = { id: staff.id, sn: idx + 1, staffName: staff.profile?.name || 'N/A' };
            for (let i = 1; i <= daysInMonth; i++) {
              // Ensure we use the correct date comparison (local YYYY-MM-DD)
              const d = new Date(startDate);
              d.setDate(i);
              const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              row[`day_${i}`] = (matrix[staff.id] && matrix[staff.id][dateKey]) ? matrix[staff.id][dateKey].join(', ') : '-';
            }
            return row;
          });
          setData(formatted);
        } else if (reportType === 'attendance') {
          const { staffList, matrix, daysInMonth, startDate, summary } = response.data.data;
          const formatted = staffList.map((staff, idx) => {
            const row = {
              id: staff.id,
              sn: idx + 1,
              staffName: staff.profile?.name || 'N/A',
              halfDays: summary?.[staff.id]?.halfDays || 0,
              overtimeMinutes: summary?.[staff.id]?.overtimeMinutes || 0
            };
            for (let i = 1; i <= daysInMonth; i++) {
              const d = new Date(startDate);
              d.setDate(i);
              const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              row[`day_${i}`] = (matrix[staff.id] && matrix[staff.id][dateKey]) ? matrix[staff.id][dateKey] : '-';
            }
            return row;
          });
          setData(formatted);
        } else {
          setData(response.data.data);
        }
      } else {
        // Handle cases where backend might just serve the file for some reports
        if (reportType !== 'monthly-attendance') {
          message.error('Failed to fetch report data');
        }
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      if (reportType !== 'monthly-attendance') {
        message.error('Error loading report data');
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      let endpoint;
      if (reportType === 'attendance') {
        endpoint = '/admin/reports/org-attendance-matrix';
      } else if (reportType === 'monthly-attendance') {
        endpoint = '/admin/reports/monthly-attendance';
      } else if (reportType === 'leave') {
        endpoint = '/admin/reports/org-leave';
      } else if (reportType === 'applied-leave') {
        endpoint = '/admin/reports/org-applied-leave';
      } else if (reportType === 'leave-balance') {
        endpoint = '/admin/reports/org-leave-balance';
      } else if (reportType === 'punch-report') {
        endpoint = '/admin/reports/org-punch-matrix';
      } else if (reportType === 'detailed-attendance') {
        endpoint = '/admin/reports/org-detailed-attendance';
      } else if (reportType === 'sales') {
        endpoint = '/admin/reports/org-sales';
      } else if (reportType === 'activities') {
        endpoint = '/admin/reports/org-activities';
      } else if (reportType === 'tickets') {
        endpoint = '/admin/reports/org-tickets';
      } else if (reportType === 'meetings') {
        endpoint = '/admin/reports/org-meetings';
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
      title: 'Phone Number',
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

  const getAttendanceColumns = () => {
    const days = moment(month, 'YYYY-MM').daysInMonth();
    const cols = [
      { title: 'S.N.', dataIndex: 'sn', key: 'sn', fixed: 'left', width: 60 },
      { title: 'Staff Name', dataIndex: 'staffName', key: 'staffName', fixed: 'left', width: 150 }
    ];
    for (let i = 1; i <= days; i++) {
      cols.push({
        title: i.toString().padStart(2, '0'),
        dataIndex: `day_${i}`,
        key: `day_${i}`,
        width: 110,
        align: 'center'
      });
    }
    cols.push({ title: 'Half Days', dataIndex: 'halfDays', key: 'halfDays', width: 100, align: 'center' });
    cols.push({ title: 'OT (Min)', dataIndex: 'overtimeMinutes', key: 'overtimeMinutes', width: 100, align: 'center' });
    return cols;
  };

  const getLeaveColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => record.user?.profile?.name || 'N/A'
    },
    {
      title: 'Phone Number',
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

  const getAppliedLeaveColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => record.user?.profile?.name || 'N/A'
    },
    {
      title: 'Phone Number',
      key: 'phone',
      render: (text, record) => record.user?.phone || 'N/A'
    },
    {
      title: 'Department',
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
      key: 'status',
      render: (text) => <Tag color={text === 'approved' ? 'green' : text === 'pending' ? 'orange' : 'red'}>{text?.toUpperCase()}</Tag>
    },
    {
      title: 'Applied On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => moment(text).format('DD MMM YYYY')
    }
  ];

  const getLeaveBalanceColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => text || record.user?.profile?.name || 'N/A'
    },
    {
      title: 'Phone Number',
      dataIndex: 'employeeId',
      key: 'employeeId',
      render: (text, record) => text || record.user?.phone || 'N/A'
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (text, record) => text || record.user?.profile?.department || 'N/A'
    },
    {
      title: 'Category',
      dataIndex: 'categoryKey',
      key: 'categoryKey'
    },
    {
      title: 'Allocated',
      dataIndex: 'allocated',
      key: 'allocated'
    },
    {
      title: 'Used',
      dataIndex: 'used',
      key: 'used'
    },
    {
      title: 'Remaining',
      dataIndex: 'remaining',
      key: 'remaining'
    }
  ];

  const getDetailedAttendanceColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => record.user?.profile?.name || 'N/A'
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone',
      key: 'phone',
      render: (text, record) => record.user?.phone || 'N/A'
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (text) => new Date(text).toLocaleDateString()
    },
    {
      title: 'Punch In',
      dataIndex: 'punchedInAt',
      key: 'punchedInAt',
      width: 100,
      render: (text) => text ? new Date(text).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
    },
    {
      title: 'Punch In Address',
      dataIndex: 'address',
      key: 'address',
      width: 250,
      render: (text, record) => text || (record.latitude ? `${record.latitude}, ${record.longitude}` : 'N/A')
    },
    {
      title: 'Punch Out',
      dataIndex: 'punchedOutAt',
      key: 'punchedOutAt',
      width: 100,
      render: (text) => text ? new Date(text).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
    },
    {
      title: 'Punch Out Address',
      dataIndex: 'punchOutAddress',
      key: 'punchOutAddress',
      width: 250,
      render: (text, record) => text || (record.punchOutLatitude ? `${record.punchOutLatitude}, ${record.punchOutLongitude}` : 'N/A')
    },
    {
      title: 'Assigned Geofence',
      dataIndex: 'assignedGeofence',
      key: 'assignedGeofence',
      width: 200,
      render: (text) => text || 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (text) => {
        let color = 'default';
        if (text === 'PRESENT') color = 'success';
        else if (text === 'ABSENT') color = 'error';
        else if (text === 'HALF_DAY') color = 'warning';
        else if (text === 'LEAVE') color = 'processing';
        return <Tag color={color}>{text || 'N/A'}</Tag>;
      }
    }
  ];

  const getPunchColumns = () => {
    const days = moment(month, 'YYYY-MM').daysInMonth();
    const cols = [
      { title: 'S.N.', dataIndex: 'sn', key: 'sn', fixed: 'left', width: 60 },
      { title: 'Staff Name', dataIndex: 'staffName', key: 'staffName', fixed: 'left', width: 150 }
    ];
    for (let i = 1; i <= days; i++) {
      cols.push({
        title: i.toString().padStart(2, '0'),
        dataIndex: `day_${i}`,
        key: `day_${i}`,
        width: 100,
        align: 'center'
      });
    }
    return cols;
  };

  const getActivitiesColumns = () => [
    { title: 'Date', dataIndex: 'date', key: 'date', render: (text) => moment(text).format('DD MMM YYYY') },
    { title: 'Staff Name', key: 'staffName', render: (_, r) => r.user?.profile?.name || r.user?.phone || 'N/A' },
    { title: 'Department', key: 'department', render: (_, r) => r.user?.profile?.department || 'N/A' },
    { title: 'Activity Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <Tag color={s === 'DONE' ? 'green' : s === 'IN_PROGRESS' ? 'blue' : 'orange'}>{s}</Tag>
    },
    { title: 'Last Remarks', dataIndex: 'remarks', key: 'remarks', ellipsis: true }
  ];

  const getTicketsColumns = () => [
    { title: 'Created At', dataIndex: 'createdAt', key: 'createdAt', render: (text) => moment(text).format('DD MMM YYYY HH:mm') },
    { title: 'Allocated To', key: 'allocatedTo', render: (_, r) => r.assignee?.profile?.name || r.assignee?.phone || 'N/A' },
    { title: 'Department', key: 'department', render: (_, r) => r.assignee?.profile?.department || 'N/A' },
    { title: 'Ticket Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Priority', dataIndex: 'priority', key: 'priority',
      render: (p) => <Tag color={p === 'HIGH' ? 'red' : p === 'MEDIUM' ? 'orange' : 'blue'}>{p}</Tag>
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <Tag color={s === 'DONE' ? 'green' : s === 'IN_PROGRESS' ? 'blue' : 'orange'}>{s}</Tag>
    },
    { title: 'Allocated By', key: 'allocatedBy', render: (_, r) => r.creator?.profile?.name || r.creator?.phone || 'Admin' }
  ];

  const getMeetingsColumns = () => [
    { title: 'Scheduled At', dataIndex: 'scheduledAt', key: 'scheduledAt', render: (text) => moment(text).format('DD MMM YYYY HH:mm') },
    { title: 'Meeting Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => <Tag color={s === 'DONE' ? 'green' : s === 'IN_PROGRESS' ? 'blue' : 'orange'}>{s}</Tag>
    },
    { title: 'Created By', key: 'staffName', render: (_, r) => r.creator?.profile?.name || r.creator?.phone || 'N/A' },
    { title: 'Department', key: 'department', render: (_, r) => r.creator?.profile?.department || 'N/A' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true }
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
                      optionFilterProp="label"
                      options={employees.map((emp) => ({
                        value: emp.id,
                        label: emp.name || emp.profile?.name || emp.staffProfile?.name || `Employee ${emp.id}`,
                      }))}
                    >
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
                {reportType === 'attendance' ? 'Monthly Attendance Report' :
                  reportType === 'monthly-attendance' ? 'Monthly Detailed Attendance Report (Excel Only)' :
                    reportType === 'leave' ? 'Leave Report' :
                      reportType === 'applied-leave' ? 'Applied Leave Report' :
                        reportType === 'leave-balance' ? 'Leave Balance Report' :
                          reportType === 'punch-report' ? 'Monthly Punch Report' :
                            reportType === 'detailed-attendance' ? 'Detailed Attendance Report' :
                              reportType === 'activities' ? 'Activities Report' :
                                reportType === 'tickets' ? 'Tickets Report' :
                                  reportType === 'meetings' ? 'Meetings Report' :
                                    'Sales Report'} - {moment(month).format('MMMM YYYY')}
              </Title>

              <Spin spinning={loading}>
                <Table
                  columns={
                    reportType === 'attendance' ? getAttendanceColumns() :
                      reportType === 'monthly-attendance' ? [] :
                        reportType === 'leave' ? getLeaveColumns() :
                          reportType === 'applied-leave' ? getAppliedLeaveColumns() :
                            reportType === 'leave-balance' ? getLeaveBalanceColumns() :
                              reportType === 'punch-report' ? getPunchColumns() :
                                reportType === 'detailed-attendance' ? getDetailedAttendanceColumns() :
                                  reportType === 'activities' ? getActivitiesColumns() :
                                    reportType === 'tickets' ? getTicketsColumns() :
                                      reportType === 'meetings' ? getMeetingsColumns() :
                                        getSalesColumns()
                  }
                  dataSource={data}
                  rowKey={(record, index) => record.id || index}
                  pagination={{
                    pageSize: 50,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} records`
                  }}
                  locale={{
                    emptyText: reportType === 'monthly-attendance'
                      ? 'Preview not available for this detailed report. Please use "Download Excel" button above.'
                      : 'No data available'
                  }}
                  scroll={{ x: reportType === 'attendance' || reportType === 'punch-report' ? 'max-content' : 1200 }}
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
