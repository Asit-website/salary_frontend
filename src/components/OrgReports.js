import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Select, DatePicker, Button, Table, message, Space, Spin, Row, Col, 
  Typography, Layout, Tag, Cascader, Modal 
} from 'antd';
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
  const [reportType, setReportType] = useState(['attendance']);
  const [month, setMonth] = useState(moment().format('YYYY-MM'));
  const [data, setData] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');
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
    if (type && reportOptions.some(rt => rt.value === type)) {
      setReportType([type]);
    }
  }, [location.search]);

  const reportOptions = [
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'monthly-attendance', label: 'Monthly Attendance (Detailed Excel)' },
    { value: 'leave', label: 'Leave Report' },
    { value: 'applied-leave', label: 'Applied Leave Report' },
    { value: 'leave-balance', label: 'Leave Balance Report' },
    { value: 'punch-report', label: 'Punch Report (Matrix)' },
    { value: 'sales', label: 'Visit Report' },
    { value: 'activities', label: 'Activities Report' },
    { value: 'tickets', label: 'Tickets Report' },
    { value: 'meetings', label: 'Meetings Report' },
    {
      value: 'salary-register',
      label: 'Salary Register (Excel)',
      children: [
        { value: 'designation', label: 'Designation Wise' },
        { value: 'department', label: 'Department Wise' },
        { value: 'template', label: 'Salary Template Wise' }
      ]
    },
    {
      value: 'monthly-summary',
      label: 'Monthly Summary (Excel)',
      children: [
        { value: 'designation', label: 'Designation Wise' },
        { value: 'department', label: 'Department Wise' }
      ]
    },
    { value: 'per-day-salary', label: 'Per Day Salary Average (with OT)' },
    { value: 'comparison', label: 'Month-over-Month Comparison' },
    { value: 'ot-impact', label: 'Overtime Impact Analysis' },
    { value: 'late-penalty', label: 'Late Penalty Analysis' }
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

    const mainType = reportType[0];
    if (mainType === 'monthly-attendance' || mainType === 'salary-register' || mainType === 'monthly-summary') {
      // These reports are Excel-only; clear any stale data immediately
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let endpoint;
      const mainType = reportType[0];
      if (mainType === 'attendance') {
        endpoint = '/admin/reports/org-attendance-matrix';
      } else if (mainType === 'monthly-attendance') {
        endpoint = '/admin/reports/monthly-attendance';
      } else if (mainType === 'leave') {
        endpoint = '/admin/reports/org-leave';
      } else if (mainType === 'applied-leave') {
        endpoint = '/admin/reports/org-applied-leave';
      } else if (mainType === 'leave-balance') {
        endpoint = '/admin/reports/org-leave-balance';
      } else if (mainType === 'punch-report') {
        endpoint = '/admin/reports/org-punch-matrix';
      } else if (mainType === 'detailed-attendance') {
        endpoint = '/admin/reports/org-detailed-attendance';
      } else if (mainType === 'sales') {
        endpoint = '/admin/reports/org-sales';
      } else if (mainType === 'activities') {
        endpoint = '/admin/reports/org-activities';
      } else if (mainType === 'tickets') {
        endpoint = '/admin/reports/org-tickets';
      } else if (mainType === 'meetings') {
        endpoint = '/admin/reports/org-meetings';
      } else if (mainType === 'per-day-salary') {
        endpoint = '/admin/reports/per-day-salary-average';
      } else if (mainType === 'comparison') {
        endpoint = '/admin/reports/comparison';
      } else if (mainType === 'ot-impact') {
        endpoint = '/admin/reports/ot-impact';
      } else if (mainType === 'late-penalty') {
        endpoint = '/admin/reports/late-penalty-analysis';
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
        setReportData(response.data.data);
        if (reportType[0] === 'punch-report') {
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
        } else if (reportType[0] === 'attendance') {
          const { staffList, matrix, daysInMonth, startDate, summary } = response.data.data;
          const formatted = staffList.map((staff, idx) => {
            const row = {
              id: staff.id,
              sn: idx + 1,
              staffName: staff.profile?.name || 'N/A',
              halfDays: summary?.[staff.id]?.halfDays || 0,
              overtimeMinutes: summary?.[staff.id]?.overtimeMinutes || 0,
              lateMinutes: summary?.[staff.id]?.lateMinutes || 0
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
        } else if (reportType[0] === 'per-day-salary') {
          const formatted = response.data.data.map((item, idx) => ({
            ...item,
            sn: idx + 1
          }));
          setData(formatted);
        } else if (reportType[0] === 'comparison' || reportType[0] === 'ot-impact' || reportType[0] === 'late-penalty') {
          const formatted = response.data.data.map((item, idx) => ({
            ...item,
            sn: idx + 1
          }));
          setData(formatted);
        } else {
          setData(response.data.data);
        }
      } else {
        // Handle cases where backend might just serve the file for some reports
        if (reportType[0] !== 'monthly-attendance') {
          message.error('Failed to fetch report data');
        }
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      if (reportType[0] !== 'monthly-attendance') {
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
      const mainType = reportType[0];
      const subType = reportType[1];

      if (mainType === 'attendance') {
        endpoint = '/admin/reports/org-attendance-matrix';
      } else if (mainType === 'monthly-attendance') {
        endpoint = '/admin/reports/monthly-attendance';
      } else if (mainType === 'leave') {
        endpoint = '/admin/reports/org-leave';
      } else if (mainType === 'applied-leave') {
        endpoint = '/admin/reports/org-applied-leave';
      } else if (mainType === 'leave-balance') {
        endpoint = '/admin/reports/org-leave-balance';
      } else if (mainType === 'punch-report') {
        endpoint = '/admin/reports/org-punch-matrix';
      } else if (mainType === 'detailed-attendance') {
        endpoint = '/admin/reports/org-detailed-attendance';
      } else if (mainType === 'sales') {
        endpoint = '/admin/reports/org-sales';
      } else if (mainType === 'activities') {
        endpoint = '/admin/reports/org-activities';
      } else if (mainType === 'tickets') {
        endpoint = '/admin/reports/org-tickets';
      } else if (mainType === 'meetings') {
        endpoint = '/admin/reports/org-meetings';
      } else if (mainType === 'per-day-salary') {
        endpoint = '/admin/reports/per-day-salary-average';
      } else if (mainType === 'comparison') {
        endpoint = '/admin/reports/comparison';
      } else if (mainType === 'ot-impact') {
        endpoint = '/admin/reports/ot-impact';
      } else if (mainType === 'late-penalty') {
        endpoint = '/admin/reports/late-penalty-analysis';
      } else if (mainType === 'salary-register') {
        if (subType === 'template') {
          endpoint = '/admin/payroll/salary-register-template-wise-excel';
        } else {
          endpoint = '/admin/payroll/salary-register-excel-by-month';
        }
      } else if (mainType === 'salary-register-template') {
        endpoint = '/admin/payroll/salary-register-template-wise-excel';
      } else if (mainType === 'monthly-summary') {
        endpoint = '/admin/payroll/monthly-summary-excel';
      }

      const params = {
        month: moment(month).month() + 1,
        year: moment(month).year(),
        format: 'excel',
        monthKey: month,
        groupBy: subType || 'designation'
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
      const fileName = `org-${mainType}-report-${scopeText}-${month}.xlsx`;
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

  const showHistory = (staffId, staffName, type) => {
    if (!reportData?.details?.[staffId]) return;
    const staffDetails = reportData.details[staffId];
    const items = Object.entries(staffDetails)
      .filter(([_, dayData]) => (type === 'late' ? dayData.late > 0 : dayData.ot > 0))
      .map(([date, dayData]) => ({
        key: date,
        date: date,
        status: dayData.status,
        minutes: type === 'late' ? dayData.late : dayData.ot
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    setHistoryItems(items);
    setHistoryTitle(`${type === 'late' ? 'Late Arrival' : 'Overtime'} History - ${staffName}`);
    setHistoryModalVisible(true);
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
    cols.push({ 
      title: 'OT (Min)', 
      dataIndex: 'overtimeMinutes', 
      key: 'overtimeMinutes', 
      width: 100, 
      align: 'center',
      render: (val, record) => val > 0 ? (
        <a style={{ fontWeight: 'bold' }} onClick={() => showHistory(record.id, record.staffName, 'ot')}>
          {val}
        </a>
      ) : 0
    });
    cols.push({ 
      title: 'Late By (Min)', 
      dataIndex: 'lateMinutes', 
      key: 'lateMinutes', 
      width: 100, 
      align: 'center',
      render: (val, record) => val > 0 ? (
        <a style={{ color: '#ff4d4f', fontWeight: 'bold' }} onClick={() => showHistory(record.id, record.staffName, 'late')}>
          {val}
        </a>
      ) : 0
    });
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
  
  const getPerDaySalaryColumns = () => [
    { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60, fixed: 'left' },
    { title: 'Staff Name', dataIndex: 'staffName', key: 'staffName', width: 150, fixed: 'left' },
    { title: 'Staff ID', dataIndex: 'staffId', key: 'staffId', width: 100 },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 120 },
    { title: 'Designation', dataIndex: 'designation', key: 'designation', width: 120 },
    { title: 'Actual Earnings', dataIndex: 'actualEarnings', key: 'actualEarnings', width: 120, render: (v) => `₹${Number(v).toLocaleString()}` },
    { title: 'OT Pay', dataIndex: 'overtimePay', key: 'overtimePay', width: 100, render: (v) => `₹${Number(v).toLocaleString()}` },
    { title: 'Incentives', dataIndex: 'incentives', key: 'incentives', width: 100, render: (v) => `₹${Number(v).toLocaleString()}` },
    { title: 'Payable Days', dataIndex: 'payableDays', key: 'payableDays', width: 100 },
    { 
      title: 'Per Day Avg', 
      dataIndex: 'perDayAverage', 
      key: 'perDayAverage', 
      width: 120, 
      render: (v) => <Text strong style={{ color: '#1890ff' }}>₹{Number(v).toLocaleString()}</Text>
    }
  ];

  const getComparisonColumns = () => [
    { 
      title: 'Staff Details', 
      fixed: 'left', 
      children: [
        { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60 },
        { title: 'Name', dataIndex: 'staffName', key: 'staffName', width: 150 },
      ]
    },
    { 
      title: 'Salary Comparison (Net)', 
      align: 'center', 
      children: [
        { title: 'Last Month', dataIndex: ['salary', 'lastMonth'], key: 'salLast', width: 120, render: (v) => `₹${v?.toLocaleString() || '0'}` },
        { title: 'Current Month', dataIndex: ['salary', 'currentMonth'], key: 'salCurr', width: 120, render: (v) => `₹${v?.toLocaleString() || '0'}` },
        { 
          title: 'Difference', dataIndex: ['salary', 'diff'], key: 'salDiff', width: 100, 
          render: (v) => <Text style={{ color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#8c8c8c' }}>{v > 0 ? '+' : ''}{v?.toLocaleString() || '0'}</Text>
        },
      ]
    },
    { 
      title: 'Attendance (Days)', 
      align: 'center', 
      children: [
        { title: 'Last Month', dataIndex: ['attendance', 'lastMonth'], key: 'attLast', width: 110 },
        { title: 'Current Month', dataIndex: ['attendance', 'currentMonth'], key: 'attCurr', width: 110 },
        { 
          title: 'Diff', dataIndex: ['attendance', 'diff'], key: 'attDiff', width: 80,
          render: (v) => <Text style={{ color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#8c8c8c' }}>{v > 0 ? '+' : ''}{v}</Text>
        },
      ]
    },
    { 
      title: 'Overtime Pay', 
      align: 'center', 
      children: [
        { title: 'Last Month', dataIndex: ['ot', 'lastMonth'], key: 'otLast', width: 110, render: (v) => `₹${v?.toLocaleString() || '0'}` },
        { title: 'Current Month', dataIndex: ['ot', 'currentMonth'], key: 'otCurr', width: 110, render: (v) => `₹${v?.toLocaleString() || '0'}` },
        { 
          title: 'Diff', dataIndex: ['ot', 'diff'], key: 'otDiff', width: 100,
          render: (v) => <Text style={{ color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#8c8c8c' }}>{v > 0 ? '+' : ''}{v?.toLocaleString() || '0'}</Text>
        },
      ]
    },
  ];

  const getLatePenaltyColumns = () => [
    { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60, fixed: 'left' },
    { title: 'Staff Name', dataIndex: 'staffName', key: 'staffName', width: 150, fixed: 'left' },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 120 },
    { title: 'Applied Rule', dataIndex: 'ruleName', key: 'ruleName', width: 150 },
    { title: 'Type', dataIndex: 'penaltyType', key: 'penaltyType', width: 120 },
    { title: 'Late Days', dataIndex: 'lateInstances', key: 'lateInstances', width: 100, align: 'center' },
    { title: 'Total Late Min', dataIndex: 'totalLateMinutes', key: 'totalLateMinutes', width: 120, align: 'center' },
    { title: 'Total Penalty', dataIndex: 'totalPenaltyAmount', key: 'totalPenaltyAmount', width: 130, render: (v) => <Text style={{ color: '#ff4d4f' }}>₹{v?.toLocaleString() || '0'}</Text> },
  ];

  const getOTImpactColumns = () => [
    { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60, fixed: 'left' },
    { title: 'Staff Name', dataIndex: 'staffName', key: 'staffName', width: 150, fixed: 'left' },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 120 },
    { title: 'Net (Without OT)', dataIndex: 'netWithoutOT', key: 'netWithoutOT', width: 140, render: (v) => `₹${v?.toLocaleString() || '0'}` },
    { title: 'OT Pay', dataIndex: 'otPay', key: 'otPay', width: 120, render: (v) => <Text style={{ color: '#1890ff' }}>₹{v?.toLocaleString() || '0'}</Text> },
    { title: 'Total Net (With OT)', dataIndex: 'totalNet', key: 'totalNet', width: 150, render: (v) => <Text strong style={{ color: '#52c41a' }}>₹{v?.toLocaleString() || '0'}</Text> },
    { title: 'OT % of Base', dataIndex: 'otPercentage', key: 'otPercentage', width: 120, render: (v) => `${v}%` },
  ];

  const renderTable = () => (
    <Table
      columns={
        reportType[0] === 'attendance' ? getAttendanceColumns() :
          reportType[0] === 'monthly-attendance' ? [] :
            reportType[0] === 'leave' ? getLeaveColumns() :
              reportType[0] === 'applied-leave' ? getAppliedLeaveColumns() :
                reportType[0] === 'leave-balance' ? getLeaveBalanceColumns() :
                  reportType[0] === 'punch-report' ? getPunchColumns() :
                    reportType[0] === 'detailed-attendance' ? getDetailedAttendanceColumns() :
                      reportType[0] === 'activities' ? getActivitiesColumns() :
                        reportType[0] === 'tickets' ? getTicketsColumns() :
                          reportType[0] === 'meetings' ? getMeetingsColumns() :
                            reportType[0] === 'per-day-salary' ? getPerDaySalaryColumns() :
                              reportType[0] === 'comparison' ? getComparisonColumns() :
                              reportType[0] === 'ot-impact' ? getOTImpactColumns() :
                                reportType[0] === 'late-penalty' ? getLatePenaltyColumns() :
                                  reportType[0] === 'salary-register' ? [] :
                              reportType[0] === 'monthly-summary' ? [] :
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
        emptyText: (reportType[0] === 'monthly-attendance' || reportType[0] === 'salary-register' || reportType[0] === 'monthly-summary')
          ? 'Preview not available for this detailed report. Please use "Download Excel" button above.'
          : 'No data available'
      }}
      scroll={{ x: reportType === 'attendance' || reportType === 'punch-report' ? 'max-content' : 1200 }}
    />
  );

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
                <Col span={5}>
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

                <Col span={7}>
                  <Text strong>Report Type:</Text>
                  <Cascader
                    style={{ width: '100%', marginTop: '8px' }}
                    options={reportOptions}
                    value={reportType}
                    onChange={setReportType}
                    placeholder="Select Report"
                    expandTrigger="hover"
                  />
                </Col>

                <Col span={5}>
                  <Text strong>Month:</Text>
                  <Select
                    style={{ width: '100%', marginTop: '8px' }}
                    value={month}
                    onChange={setMonth}
                    showSearch
                    optionFilterProp="children"
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
                {reportType[0] === 'attendance' ? 'Monthly Attendance Report' :
                  reportType[0] === 'monthly-attendance' ? 'Monthly Detailed Attendance Report (Excel Only)' :
                    reportType[0] === 'leave' ? 'Leave Report' :
                      reportType[0] === 'applied-leave' ? 'Applied Leave Report' :
                        reportType[0] === 'leave-balance' ? 'Leave Balance Report' :
                          reportType[0] === 'punch-report' ? 'Monthly Punch Report' :
                            reportType[0] === 'detailed-attendance' ? 'Detailed Attendance Report' :
                              reportType[0] === 'activities' ? 'Activities Report' :
                                reportType[0] === 'tickets' ? 'Tickets Report' :
                                  reportType[0] === 'meetings' ? 'Meetings Report' :
                                    reportType[0] === 'salary-register' ? 'Salary Register (Excel Only)' :
                                      reportType[0] === 'monthly-summary' ? `Monthly Summary (${(reportType[1] || 'designation').toUpperCase()} WISE)` :
                                        reportType[0] === 'per-day-salary' ? 'Per Day Salary Average Report' :
                                          reportType[0] === 'comparison' ? 'Month-over-Month Comparison Report' :
                                            reportType[0] === 'ot-impact' ? 'Overtime Impact Analysis' :
                                              reportType[0] === 'late-penalty' ? 'Late Penalty Analysis Report' :
                                                'Visit Report'} - {moment(month).format('MMMM YYYY')}
              </Title>

              <Spin spinning={loading}>
                {renderTable()}
              </Spin>
            </Card>
          </div>
        </Content>
      </Layout>

      <Modal
        title={historyTitle}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={[<Button key="close" onClick={() => setHistoryModalVisible(false)}>Close</Button>]}
        width={600}
      >
        <Table 
          size="small"
          dataSource={historyItems}
          pagination={false}
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'date' },
            { title: 'Status', dataIndex: 'status', key: 'status', align: 'center' },
            { title: 'Minutes', dataIndex: 'minutes', key: 'minutes', align: 'right', render: (m) => <strong>{m} m</strong> }
          ]}
        />
      </Modal>
    </Layout>
  );
};

export default OrgReports;
