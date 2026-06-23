import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Select, DatePicker, Button, Table, message, Space, Spin, Row, Col, 
  Typography, Layout, Tag, Cascader, Modal 
} from 'antd';
import { DownloadOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;
const { Content } = Layout;

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
  const [salaryRegisterEnabled, setSalaryRegisterEnabled] = useState(true);
  const [monthlySummaryEnabled, setMonthlySummaryEnabled] = useState(true);
  const [perDaySalaryEnabled, setPerDaySalaryEnabled] = useState(true);
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [otImpactEnabled, setOtImpactEnabled] = useState(true);
  const [latePenaltyEnabled, setLatePenaltyEnabled] = useState(true);
  const activeRequestRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Fetch subscription info to check feature toggles
  useEffect(() => {
    const fetchSubInfo = async () => {
      try {
        const response = await api.get('/subscription/subscription-info');
        if (response.data.success && response.data.subscriptionInfo) {
          const subInfo = response.data.subscriptionInfo;
          setSalaryRegisterEnabled(subInfo.salaryRegisterEnabled !== undefined ? !!subInfo.salaryRegisterEnabled : true);
          setMonthlySummaryEnabled(subInfo.monthlySummaryEnabled !== undefined ? !!subInfo.monthlySummaryEnabled : true);
          setPerDaySalaryEnabled(subInfo.perDaySalaryEnabled !== undefined ? !!subInfo.perDaySalaryEnabled : true);
          setComparisonEnabled(subInfo.comparisonEnabled !== undefined ? !!subInfo.comparisonEnabled : true);
          setOtImpactEnabled(subInfo.otImpactEnabled !== undefined ? !!subInfo.otImpactEnabled : true);
          setLatePenaltyEnabled(subInfo.latePenaltyEnabled !== undefined ? !!subInfo.latePenaltyEnabled : true);
        }
      } catch (error) {
        console.error('Error fetching subscription info:', error);
      }
    };
    fetchSubInfo();
  }, []);

  const reportOptions = React.useMemo(() => {
    const options = [
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
      { value: 'staff-login-logout', label: 'Staff Login/Logout Report' },
    ];

    if (salaryRegisterEnabled) {
      options.push({
        value: 'salary-register',
        label: 'Salary Register (Excel)',
        children: [
          { value: 'designation', label: 'Designation Wise' },
          { value: 'department', label: 'Department Wise' },
          { value: 'template', label: 'Salary Template Wise' }
        ]
      });
    }

    if (monthlySummaryEnabled) {
      options.push({
        value: 'monthly-summary',
        label: 'Monthly Summary (Excel)',
        children: [
          { value: 'designation', label: 'Designation Wise' },
          { value: 'department', label: 'Department Wise' }
        ]
      });
    }

    if (perDaySalaryEnabled) {
      options.push({ value: 'per-day-salary', label: 'Per Day Salary Average (with OT)' });
    }

    if (comparisonEnabled) {
      options.push({ value: 'comparison', label: 'Month-over-Month Comparison' });
    }

    if (otImpactEnabled) {
      options.push({ value: 'ot-impact', label: 'Overtime Impact Analysis' });
    }

    if (latePenaltyEnabled) {
      options.push({ value: 'late-penalty', label: 'Late Penalty Analysis' });
    }

    return options;
  }, [salaryRegisterEnabled, monthlySummaryEnabled, perDaySalaryEnabled, comparisonEnabled, otImpactEnabled, latePenaltyEnabled]);

  // Handle report type from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type && reportOptions.some(rt => rt.value === type)) {
      setReportType([type]);
    }
  }, [location.search, reportOptions]);

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
      // These reports are Excel-only; clear preview data
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let endpoint;
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
      } else if (mainType === 'staff-login-logout') {
        endpoint = '/admin/reports/staff-login-logout';
      }

      const params = {};
      if (mainType === 'staff-login-logout') {
        params.fromDate = moment(month).startOf('month').format('YYYY-MM-DD');
        params.toDate = moment(month).endOf('month').format('YYYY-MM-DD');
        if (reportScope === 'selected' && selectedEmployees.length > 0) {
          params.staffId = selectedEmployees[0];
        }
      } else {
        params.month = moment(month).month() + 1;
        params.year = moment(month).year();
        if (reportScope === 'selected' && selectedEmployees.length > 0) {
          params.employeeIds = selectedEmployees.join(',');
        }
      }

      const response = await api.get(endpoint, { params });

      if (requestId !== activeRequestRef.current) return;

      if (response.data.success) {
        setReportData(response.data.data);
        if (mainType === 'punch-report') {
          const { staffList, matrix, daysInMonth, startDate } = response.data.data;
          const formatted = staffList.map((staff, idx) => {
            const row = { id: staff.id, sn: idx + 1, staffName: staff.profile?.name || 'N/A' };
            for (let i = 1; i <= daysInMonth; i++) {
              const d = new Date(startDate);
              d.setDate(i);
              const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              row[`day_${i}`] = (matrix[staff.id] && matrix[staff.id][dateKey]) ? matrix[staff.id][dateKey].join(', ') : '-';
            }
            return row;
          });
          setData(formatted);
        } else if (mainType === 'attendance') {
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
        } else if (mainType === 'per-day-salary') {
          const formatted = response.data.data.map((item, idx) => ({
            ...item,
            sn: idx + 1
          }));
          setData(formatted);
        } else if (mainType === 'comparison' || mainType === 'ot-impact' || mainType === 'late-penalty') {
          const formatted = response.data.data.map((item, idx) => ({
            ...item,
            sn: idx + 1
          }));
          setData(formatted);
        } else if (mainType === 'staff-login-logout') {
          const formatted = response.data.data.map((item, idx) => ({
            ...item,
            sn: idx + 1,
            key: item.userId
          }));
          setData(formatted);
        } else {
          setData(response.data.data);
        }
      } else {
        if (mainType !== 'monthly-attendance') {
          message.error('Failed to fetch report data');
        }
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      if (mainType !== 'monthly-attendance') {
        message.error('Error loading report data');
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const downloadExcel = async () => {
    const mainType = reportType[0];
    if (mainType === 'staff-login-logout') {
      setDownloading(true);
      try {
        let csvContent = "\uFEFF"; // UTF-8 BOM
        csvContent += "Staff Name,Phone,Event Type,Timestamp,Platform,IP Address,Latitude,Longitude,Address\r\n";
        
        data.forEach(staff => {
          (staff.events || []).forEach(evt => {
            const timeStr = moment(evt.timestamp).format('YYYY-MM-DD HH:mm:ss');
            const platformStr = evt.platform || 'N/A';
            const addressEscaped = evt.address ? `"${evt.address.replace(/"/g, '""')}"` : 'N/A';
            csvContent += `"${staff.staffName}","${staff.phone}","${evt.type}","${timeStr}","${platformStr}","${evt.ipAddress || 'N/A'}",${evt.latitude || 'N/A'},${evt.longitude || 'N/A'},${addressEscaped}\r\n`;
          });
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `staff_login_logout_report_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success('Report downloaded successfully');
      } catch (error) {
        console.error('Error downloading CSV:', error);
        message.error('Error downloading CSV');
      } finally {
        setDownloading(false);
      }
      return;
    }

    setDownloading(true);
    try {
      let endpoint;
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

      if (reportScope === 'selected' && selectedEmployees.length > 0) {
        params.employeeIds = selectedEmployees.join(',');
      }

      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });

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
      render: (text, record) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{record.user?.profile?.name || 'N/A'}</span>
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
      key: 'clientName',
      render: (v) => <span style={{ fontWeight: '500', color: '#262626' }}>{v}</span>
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
      { 
        title: 'Staff Name', 
        dataIndex: 'staffName', 
        key: 'staffName', 
        fixed: 'left', 
        width: 150,
        render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{v}</span>
      }
    ];
    for (let i = 1; i <= days; i++) {
      cols.push({
        title: i.toString().padStart(2, '0'),
        dataIndex: `day_${i}`,
        key: `day_${i}`,
        width: 110,
        align: 'center',
        render: (text) => {
          if (text === 'A') return <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>A</span>;
          if (text === 'P') return <span style={{ color: '#52c41a', fontWeight: 'bold' }}>P</span>;
          if (text === 'WO') return <span style={{ color: '#722ed1', fontWeight: 'bold' }}>WO</span>;
          if (text === 'H') return <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>H</span>;
          if (text === 'HD') return <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>HD</span>;
          return text || '-';
        }
      });
    }
    cols.push({ 
      title: 'OT (Min)', 
      dataIndex: 'overtimeMinutes', 
      key: 'overtimeMinutes', 
      width: 100, 
      align: 'center',
      render: (val, record) => val > 0 ? (
        <a style={{ fontWeight: 'bold', color: '#52c41a' }} onClick={() => showHistory(record.id, record.staffName, 'ot')}>
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
      render: (text, record) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{record.user?.profile?.name || 'N/A'}</span>
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
        return <span style={{ fontWeight: '600' }}>{days}</span>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <span className="sales-status-tag sales-status-complete" style={{ textTransform: 'capitalize' }}>{v}</span>
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
      render: (text, record) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{record.user?.profile?.name || 'N/A'}</span>
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
        return <span style={{ fontWeight: '600' }}>{days}</span>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text) => {
        const lower = String(text).toLowerCase();
        const cls = lower === 'approved' ? 'sales-status-complete' : lower === 'pending' ? 'sales-status-pending' : 'sales-status-inactive';
        return <span className={`sales-status-tag ${cls}`}>{text?.toUpperCase()}</span>;
      }
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
      render: (text, record) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{text || record.user?.profile?.name || 'N/A'}</span>
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
      key: 'used',
      render: (v) => <span style={{ color: v > 0 ? '#ff4d4f' : 'inherit', fontWeight: v > 0 ? '600' : 'normal' }}>{v}</span>
    },
    {
      title: 'Remaining',
      dataIndex: 'remaining',
      key: 'remaining',
      render: (v) => <span style={{ color: '#52c41a', fontWeight: '600' }}>{v}</span>
    }
  ];

  const getDetailedAttendanceColumns = () => [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{record.user?.profile?.name || 'N/A'}</span>
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
        let cls = 'sales-status-pending';
        if (text === 'PRESENT') cls = 'sales-status-complete';
        else if (text === 'ABSENT') cls = 'sales-status-inactive';
        else if (text === 'HALF_DAY') cls = 'sales-status-pending';
        else if (text === 'LEAVE') cls = 'sales-status-active';
        return <span className={`sales-status-tag ${cls}`}>{text || 'N/A'}</span>;
      }
    }
  ];

  const getPunchColumns = () => {
    const days = moment(month, 'YYYY-MM').daysInMonth();
    const cols = [
      { title: 'S.N.', dataIndex: 'sn', key: 'sn', fixed: 'left', width: 60 },
      { 
        title: 'Staff Name', 
        dataIndex: 'staffName', 
        key: 'staffName', 
        fixed: 'left', 
        width: 150,
        render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{v}</span>
      }
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
    { title: 'Staff Name', key: 'staffName', render: (_, r) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{r.user?.profile?.name || r.user?.phone || 'N/A'}</span> },
    { title: 'Department', key: 'department', render: (_, r) => r.user?.profile?.department || 'N/A' },
    { title: 'Activity Title', dataIndex: 'title', key: 'title', render: (v) => <span style={{ fontWeight: '500', color: '#262626' }}>{v}</span> },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => {
        const cls = s === 'DONE' ? 'sales-status-complete' : s === 'IN_PROGRESS' ? 'sales-status-active' : 'sales-status-pending';
        return <span className={`sales-status-tag ${cls}`}>{s}</span>;
      }
    },
    { title: 'Last Remarks', dataIndex: 'remarks', key: 'remarks', ellipsis: true }
  ];

  const getTicketsColumns = () => [
    { title: 'Created At', dataIndex: 'createdAt', key: 'createdAt', render: (text) => moment(text).format('DD MMM YYYY HH:mm') },
    { title: 'Allocated To', key: 'allocatedTo', render: (_, r) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{r.assignee?.profile?.name || r.assignee?.phone || 'N/A'}</span> },
    { title: 'Department', key: 'department', render: (_, r) => r.assignee?.profile?.department || 'N/A' },
    { title: 'Ticket Title', dataIndex: 'title', key: 'title', render: (v) => <span style={{ fontWeight: '500', color: '#262626' }}>{v}</span> },
    {
      title: 'Priority', dataIndex: 'priority', key: 'priority',
      render: (p) => {
        const cls = p === 'HIGH' ? 'sales-status-inactive' : p === 'MEDIUM' ? 'sales-status-pending' : 'sales-status-active';
        return <span className={`sales-status-tag ${cls}`}>{p}</span>;
      }
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => {
        const cls = s === 'DONE' ? 'sales-status-complete' : s === 'IN_PROGRESS' ? 'sales-status-active' : 'sales-status-pending';
        return <span className={`sales-status-tag ${cls}`}>{s}</span>;
      }
    },
    { title: 'Allocated By', key: 'allocatedBy', render: (_, r) => r.creator?.profile?.name || r.creator?.phone || 'Admin' }
  ];

  const getMeetingsColumns = () => [
    { title: 'Scheduled At', dataIndex: 'scheduledAt', key: 'scheduledAt', render: (text) => moment(text).format('DD MMM YYYY HH:mm') },
    { title: 'Meeting Title', dataIndex: 'title', key: 'title', render: (v) => <span style={{ fontWeight: '500', color: '#262626' }}>{v}</span> },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => {
        const cls = s === 'DONE' ? 'sales-status-complete' : s === 'IN_PROGRESS' ? 'sales-status-active' : 'sales-status-pending';
        return <span className={`sales-status-tag ${cls}`}>{s}</span>;
      }
    },
    { title: 'Created By', key: 'staffName', render: (_, r) => r.creator?.profile?.name || r.creator?.phone || 'N/A' },
    { title: 'Department', key: 'department', render: (_, r) => r.creator?.profile?.department || 'N/A' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true }
  ];
  
  const getPerDaySalaryColumns = () => [
    { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60, fixed: 'left' },
    { 
      title: 'Staff Name', 
      dataIndex: 'staffName', 
      key: 'staffName', 
      width: 150, 
      fixed: 'left',
      render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{v}</span>
    },
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
      render: (v) => <span style={{ fontWeight: '700', color: '#1677ff' }}>₹{Number(v).toLocaleString()}</span>
    }
  ];

  const getComparisonColumns = () => [
    { 
      title: 'Staff Details', 
      fixed: 'left', 
      children: [
        { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60 },
        { 
          title: 'Name', 
          dataIndex: 'staffName', 
          key: 'staffName', 
          width: 150,
          render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{v}</span>
        },
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
          render: (v) => <span style={{ fontWeight: '600', color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#8c8c8c' }}>{v > 0 ? '+' : ''}{v?.toLocaleString() || '0'}</span>
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
          render: (v) => <span style={{ fontWeight: '600', color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#8c8c8c' }}>{v > 0 ? '+' : ''}{v}</span>
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
          render: (v) => <span style={{ fontWeight: '600', color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#8c8c8c' }}>{v > 0 ? '+' : ''}{v?.toLocaleString() || '0'}</span>
        },
      ]
    },
  ];

  const getLatePenaltyColumns = () => [
    { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60, fixed: 'left' },
    { 
      title: 'Staff Name', 
      dataIndex: 'staffName', 
      key: 'staffName', 
      width: 150, 
      fixed: 'left',
      render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{v}</span>
    },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 120 },
    { title: 'Applied Rule', dataIndex: 'ruleName', key: 'ruleName', width: 150 },
    { title: 'Type', dataIndex: 'penaltyType', key: 'penaltyType', width: 120 },
    { title: 'Late Days', dataIndex: 'lateInstances', key: 'lateInstances', width: 100, align: 'center', render: (v) => <span style={{ fontWeight: '500' }}>{v}</span> },
    { title: 'Total Late Min', dataIndex: 'totalLateMinutes', key: 'totalLateMinutes', width: 120, align: 'center', render: (v) => <span style={{ fontWeight: '500' }}>{v} m</span> },
    { title: 'Total Penalty', dataIndex: 'totalPenaltyAmount', key: 'totalPenaltyAmount', width: 130, render: (v) => <span style={{ fontWeight: '700', color: '#ff4d4f' }}>₹{v?.toLocaleString() || '0'}</span> },
  ];

  const getOTImpactColumns = () => [
    { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60, fixed: 'left' },
    { 
      title: 'Staff Name', 
      dataIndex: 'staffName', 
      key: 'staffName', 
      width: 150, 
      fixed: 'left',
      render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{v}</span>
    },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 120 },
    { title: 'Net (Without OT)', dataIndex: 'netWithoutOT', key: 'netWithoutOT', width: 140, render: (v) => `₹${v?.toLocaleString() || '0'}` },
    { title: 'OT Pay', dataIndex: 'otPay', key: 'otPay', width: 120, render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>₹{v?.toLocaleString() || '0'}</span> },
    { title: 'Total Net (With OT)', dataIndex: 'totalNet', key: 'totalNet', width: 150, render: (v) => <span style={{ fontWeight: '700', color: '#52c41a' }}>₹{v?.toLocaleString() || '0'}</span> },
    { title: 'OT % of Base', dataIndex: 'otPercentage', key: 'otPercentage', width: 120, render: (v) => <span style={{ fontWeight: '600', color: '#fa8c16' }}>{v}%</span> },
  ];

  const getStaffLoginLogoutColumns = () => [
    { title: 'S.N.', dataIndex: 'sn', key: 'sn', width: 60 },
    { title: 'Staff Name', dataIndex: 'staffName', key: 'staffName', render: (v) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{v}</span> },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Total Logins', dataIndex: 'totalLogins', key: 'totalLogins', render: (v) => <Tag color="green" style={{ fontWeight: '600' }}>{v}</Tag> },
    { title: 'Total Logouts', dataIndex: 'totalLogouts', key: 'totalLogouts', render: (v) => <Tag color="orange" style={{ fontWeight: '600' }}>{v}</Tag> },
  ];

  const renderLoginLogoutDetail = (record) => {
    const columns = [
      {
        title: 'Event Type',
        dataIndex: 'type',
        key: 'type',
        render: (type) => (
          <Tag color={type === 'Login' ? 'green' : 'orange'} style={{ fontWeight: '500' }}>
            {type}
          </Tag>
        ),
      },
      {
        title: 'Time',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (t) => moment(t).format('DD MMM YYYY, hh:mm A'),
      },
      {
        title: 'Platform',
        dataIndex: 'platform',
        key: 'platform',
        render: (p) => (
          <Tag color={p?.includes('apk') ? 'blue' : 'purple'}>
            {p === 'mobile-apk' ? 'Mobile App' : p === 'admin-apk' ? 'Admin App' : (p || 'Web')}
          </Tag>
        ),
      },
      {
        title: 'IP Address',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        render: (ip) => ip || 'N/A',
      },
      {
        title: 'Location (Lat, Lng)',
        key: 'coords',
        render: (_, item) => {
          if (item.latitude && item.longitude) {
            return (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: '500' }}
              >
                {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
              </a>
            );
          }
          return 'N/A';
        },
      },
      {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        render: (address) => address || 'N/A',
      },

    ];

    return (
      <Table
        columns={columns}
        dataSource={record.events}
        pagination={false}
        rowKey="id"
        size="small"
        style={{ margin: '10px 0' }}
      />
    );
  };

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
                                    reportType[0] === 'staff-login-logout' ? getStaffLoginLogoutColumns() :
                                      reportType[0] === 'salary-register' ? [] :
                                        reportType[0] === 'monthly-summary' ? [] :
                                          getSalesColumns()
      }
      dataSource={data}
      rowKey={(record, index) => record.userId || record.id || index}
      className="sales-table"
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
      scroll={{ x: reportType[0] === 'attendance' || reportType[0] === 'punch-report' ? 'max-content' : 1200 }}
      expandable={
        reportType[0] === 'staff-login-logout'
          ? {
              expandedRowRender: renderLoginLogoutDetail,
              rowExpandable: (record) => record.events && record.events.length > 0,
            }
          : undefined
      }
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />

      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Organization Reports" 
        />

        <Content style={{ margin: '24px 16px', padding: 0, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div style={{ paddingBottom: '24px' }}>
            <Card className="sales-content-card" bodyStyle={{ padding: '20px' }} style={{ marginBottom: '24px' }}>
              <Row gutter={[16, 16]} align="bottom">
                <Col xs={24} sm={12} md={5}>
                  <div className="modal-field-label">Report Scope:</div>
                  <Select
                    style={{ width: '100%' }}
                    value={reportScope}
                    onChange={setReportScope}
                    dropdownStyle={{ borderRadius: '8px' }}
                  >
                    <Option value="all">All Employees</Option>
                    <Option value="selected">Selected Employees</Option>
                  </Select>
                </Col>

                {reportScope === 'selected' && (
                  <Col xs={24} sm={12} md={6}>
                    <div className="modal-field-label">Select Employees:</div>
                    <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      value={selectedEmployees}
                      onChange={setSelectedEmployees}
                      placeholder="Select employees..."
                      showSearch
                      optionFilterProp="label"
                      dropdownStyle={{ borderRadius: '8px' }}
                      options={employees.map((emp) => ({
                        value: emp.id,
                        label: emp.name || emp.profile?.name || emp.staffProfile?.name || `Employee ${emp.id}`,
                      }))}
                    />
                  </Col>
                )}

                <Col xs={24} sm={12} md={7}>
                  <div className="modal-field-label">Report Type:</div>
                  <Cascader
                    style={{ width: '100%' }}
                    options={reportOptions}
                    value={reportType}
                    onChange={setReportType}
                    placeholder="Select Report"
                    expandTrigger="hover"
                    dropdownStyle={{ borderRadius: '8px' }}
                  />
                </Col>

                <Col xs={24} sm={12} md={5}>
                  <div className="modal-field-label">Month:</div>
                  <Select
                    style={{ width: '100%' }}
                    value={month}
                    onChange={setMonth}
                    showSearch
                    optionFilterProp="children"
                    dropdownStyle={{ borderRadius: '8px' }}
                  >
                    {months.map(m => (
                      <Option key={m.value} value={m.value}>
                        {m.label}
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={reportScope === 'selected' ? 6 : 7} style={{ textAlign: 'right' }}>
                  <Button
                    type="primary"
                    shape="round"
                    icon={<DownloadOutlined />}
                    loading={downloading}
                    onClick={downloadExcel}
                    style={{ width: '100%', height: '32px' }}
                  >
                    Download Excel
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card className="sales-content-card" bodyStyle={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
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
                                            reportType[0] === 'staff-login-logout' ? 'Staff Login/Logout Report' :
                                              reportType[0] === 'comparison' ? 'Month-over-Month Comparison Report' :
                                                reportType[0] === 'ot-impact' ? 'Overtime Impact Analysis' :
                                                  reportType[0] === 'late-penalty' ? 'Late Penalty Analysis Report' :
                                                  'Visit Report'} - {moment(month).format('MMMM YYYY')}
                </Title>
              </div>

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
        footer={[<Button key="close" type="primary" shape="round" onClick={() => setHistoryModalVisible(false)}>Close</Button>]}
        className="sales-modal"
        width={600}
      >
        <Table 
          size="small"
          dataSource={historyItems}
          pagination={false}
          className="sales-table"
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => moment(d).format('DD MMM YYYY') },
            { 
              title: 'Status', 
              dataIndex: 'status', 
              key: 'status', 
              align: 'center',
              render: (v) => {
                const lower = String(v).toLowerCase();
                const cls = lower === 'present' ? 'sales-status-complete' : lower === 'absent' ? 'sales-status-inactive' : 'sales-status-pending';
                return <span className={`sales-status-tag ${cls}`} style={{ fontSize: '11px' }}>{v}</span>;
              }
            },
            { title: 'Minutes', dataIndex: 'minutes', key: 'minutes', align: 'right', render: (m) => <span style={{ fontWeight: '700', color: '#1677ff' }}>{m} m</span> }
          ]}
        />
      </Modal>
    </Layout>
  );
};

export default OrgReports;
