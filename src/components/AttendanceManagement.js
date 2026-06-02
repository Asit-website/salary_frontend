import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, DatePicker, Select, message, Space, Typography, Tag, Menu, Input, Modal, Form, Radio, TimePicker, Input as AntInput, Image, Row, Col } from 'antd';
import './AttendanceManagement.css';
import {
  CalendarOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CoffeeOutlined,
  FilterOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const parseTimeValue = (value) => {
  if (!value) return null;
  const v = String(value).trim();
  if (!v || v === '-' || v.toLowerCase() === 'invalid date') return null;

  let d = dayjs(v, 'HH:mm:ss', true);
  if (d.isValid()) return d;
  d = dayjs(v, 'HH:mm', true);
  if (d.isValid()) return d;
  d = dayjs(v);
  if (d.isValid()) return d;
  return null;
};

const formatWorkingHours = (checkInRaw, checkOutRaw, totalWorkHours) => {
  const hours = Number(totalWorkHours);
  if (Number.isFinite(hours) && hours > 0) {
    return `${hours.toFixed(2)}h`;
  }
  const checkIn = parseTimeValue(checkInRaw);
  const checkOut = parseTimeValue(checkOutRaw);
  if (!checkIn || !checkOut) return '-';
  let minutes = checkOut.diff(checkIn, 'minute');
  if (minutes < 0) minutes += 1440; // Add 24 hours for night shifts
  if (!Number.isFinite(minutes)) return '-';
  return `${(minutes / 60).toFixed(2)}h`;
};

const AttendanceManagement = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [staffNameFilter, setStaffNameFilter] = useState('all');
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [dateFilter, setDateFilter] = useState(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [bulkMarkOpen, setBulkMarkOpen] = useState(false);
  const [markForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [bulkRows, setBulkRows] = useState([]);   // per-staff rows: [{userId, name, status, checkIn, checkOut}]
  const [bulkDate, setBulkDate] = useState(dayjs());
  const [effectiveTemplate, setEffectiveTemplate] = useState(null);
  const [effectiveShift, setEffectiveShift] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm] = Form.useForm();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsData, setLogsData] = useState(null);
  const [staffOnLeave, setStaffOnLeave] = useState(false);
  const [staffOffMsg, setStaffOffMsg] = useState(null);
  const [selectedStaffDeactivated, setSelectedStaffDeactivated] = useState(false);
  const [approvedLeaves, setApprovedLeaves] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
    fetchAttendance();
    fetchApprovedLeaves();
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchAttendance();
    fetchApprovedLeaves();
  }, [selectedDate, selectedStaff]);

  // Load effective template when a specific staff is selected
  useEffect(() => {
    const loadTplAndShift = async () => {
      if (!selectedStaff || selectedStaff === 'all') {
        setEffectiveTemplate(null);
        setEffectiveShift(null);
        return;
      }
      try {
        const [tplRes, shiftRes] = await Promise.all([
          api.get(`/admin/settings/attendance-templates/effective/${selectedStaff}`),
          api.get(`/admin/shifts/effective/${selectedStaff}`)
        ]);
        setEffectiveTemplate(tplRes.data?.template || null);
        setEffectiveShift(shiftRes.data?.shift || null);
      } catch (_) {
        setEffectiveTemplate(null);
        setEffectiveShift(null);
      }
    };
    loadTplAndShift();
  }, [selectedStaff]);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/admin/staff?module=attendance');
      if (response.data.success) {
        const arr = Array.isArray(response.data.staff) ? response.data.staff : (Array.isArray(response.data.data) ? response.data.data : []);
        setStaffList(arr);
      } else {
        setStaffList([]);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      setStaffList([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const resp = await api.get('/admin/business-functions');
      const list = resp?.data?.data || [];
      const deptFn = list.find((f) => String(f.name || '').toLowerCase() === 'department');
      const values = Array.isArray(deptFn?.values) ? deptFn.values : [];
      const items = values
        .filter((v) => v && v.value)
        .map((v) => ({ id: v.id, name: v.value }));
      setDepartments(items);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchSpecialDayStatus = (uid, dateStr) => {
    if (!uid || !dateStr) return;
    api.get(`/admin/attendance/check-special-day?userId=${uid}&date=${dateStr}`)
      .then(res => {
        if (res.data?.success && res.data.isSpecial) {
          setStaffOffMsg(res.data.message);
        } else {
          setStaffOffMsg(null);
        }
      })
      .catch(() => setStaffOffMsg(null));
  };

  const openMarkModal = (staffRow = null) => {
    markForm.resetFields();

    const staffId = staffRow?.userId ?? staffRow?.id ?? (selectedStaff !== 'all' ? selectedStaff : undefined);

    const existingRecord = staffId
      ? attendance.find(a => (a.userId === staffId || a.userId === Number(staffId)) && a.date === selectedDate.format('YYYY-MM-DD'))
      : null;

    markForm.setFieldsValue({
      staffId,
      date: selectedDate,
      status: existingRecord?.status || 'present',
      checkIn: parseTimeValue(existingRecord?.checkIn) || parseTimeValue('09:30'),
      checkOut: parseTimeValue(existingRecord?.checkOut) || parseTimeValue('18:00'),
      overtimeMinutes: null,
    });

    if (staffId && !existingRecord) {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      api.get(`/admin/shifts/effective/${staffId}?date=${dateStr}`).then(res => {
        const shift = res.data?.shift;
        if (shift) {
          markForm.setFieldsValue({
            checkIn: parseTimeValue(shift.startTime) || parseTimeValue('09:30'),
            checkOut: parseTimeValue(shift.endTime) || parseTimeValue('18:00'),
          });
        }
      }).catch(() => { });
    }
    const staffInfo = staffList.find(s => s.id === staffId || s.id === Number(staffId));
    if (staffInfo && staffInfo.active === false) {
      message.warning(`Warning: ${staffInfo.name} is currently deactivated. Attendance marked for deactivated staff may be restricted.`);
    }

    setMarkOpen(true);
    setStaffOnLeave(false);
    setStaffOffMsg(null);
    setSelectedStaffDeactivated(false);
  };

  const submitMark = async () => {
    try {
      const values = await markForm.validateFields();
      if (values.date && values.date.isSame(dayjs(), 'day') && values.checkIn && values.checkOut) {
        const isNightShift = values.checkOut.isBefore(values.checkIn);
        
        if (!isNightShift) {
          const now = dayjs();
          const checkOutTime = now.hour(values.checkOut.hour()).minute(values.checkOut.minute()).second(values.checkOut.second());
          
          if (checkOutTime.isAfter(now)) {
            const nowStr = now.format('hh:mm A');
            const checkOutStr = values.checkOut.format('hh:mm A');
            message.error(`Current time is ${nowStr}. You can set check-out time as ${checkOutStr} only after it is ${checkOutStr}.`);
            return;
          }
        }
      }

      const payload = {
        staffId: values.staffId,
        date: values.date?.format('YYYY-MM-DD'),
        status: values.status,
        checkIn: values.checkIn ? values.checkIn.format('HH:mm:ss') : null,
        checkOut: values.checkOut ? values.checkOut.format('HH:mm:ss') : null,
        overtimeMinutes: values.status === 'overtime' && Number.isFinite(Number(values.overtimeMinutes)) ? Number(values.overtimeMinutes) : undefined,
      };
      await api.post('/admin/attendance', payload);
      message.success('Attendance saved');
      setMarkOpen(false);
      fetchAttendance();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to save attendance');
    }
  };

  const openBulkMarkModal = () => {
    setBulkRows([]);
    setBulkDate(selectedDate);
    setBulkMarkOpen(true);
  };

  const handleBulkStaffSelect = async (uid) => {
    const staffInfo = staffList.find(s => s.id === uid || s.id === Number(uid));
    const rec = attendance.find(
      a => (a.userId === uid || a.userId === Number(uid)) && a.date === bulkDate.format('YYYY-MM-DD')
    );

    let hasAutoOT = false;
    let shiftData = null;
    try {
      const dateStr = bulkDate.format('YYYY-MM-DD');
      const sRes = await api.get(`/admin/shifts/effective/${uid}?date=${dateStr}`);
      shiftData = sRes.data?.shift;
      if (shiftData && Number(shiftData.overtimeStartMinutes) > 0) {
        hasAutoOT = true;
      }
    } catch (_) { }

    setBulkRows(prev => [
      ...prev,
      {
        userId: uid,
        name: staffInfo ? `${staffInfo.name} (${staffInfo.staffId || 'N/A'})` : `Staff ${uid}`,
        status: rec?.status || 'present',
        checkIn: parseTimeValue(rec?.checkIn) || parseTimeValue(shiftData?.startTime) || parseTimeValue('09:30'),
        checkOut: parseTimeValue(rec?.checkOut) || parseTimeValue(shiftData?.endTime) || parseTimeValue('18:00'),
        hasAutoOT,
      }
    ]);

    if (staffInfo && staffInfo.active === false) {
      message.warning(`Warning: ${staffInfo.name} is currently deactivated.`);
    }
  };

  const handleBulkStaffDeselect = (uid) => {
    setBulkRows(prev => prev.filter(r => r.userId !== uid && r.userId !== Number(uid)));
  };

  const updateBulkRow = (userId, field, value) => {
    setBulkRows(prev => prev.map(r =>
      (r.userId === userId || r.userId === Number(userId)) ? { ...r, [field]: value } : r
    ));
  };

  const submitBulkMark = async () => {
    if (bulkRows.length === 0) {
      message.warning('Please select at least one staff');
      return;
    }
    try {
      if (bulkDate && bulkDate.isSame(dayjs(), 'day')) {
        const now = dayjs();
        const futureRow = bulkRows.find(r => {
          if (!r.checkIn || !r.checkOut) return false;
          
          const isNightShift = r.checkOut.isBefore(r.checkIn);
          if (isNightShift) return false;
          
          const checkOutTime = now.hour(r.checkOut.hour()).minute(r.checkOut.minute()).second(r.checkOut.second());
          return checkOutTime.isAfter(now);
        });

        if (futureRow) {
          const nowStr = now.format('hh:mm A');
          const checkOutStr = futureRow.checkOut.format('hh:mm A');
          message.error(`For ${futureRow.name}: Current time is ${nowStr}. You can set check-out time as ${checkOutStr} only after it is ${checkOutStr}.`);
          return;
        }
      }

      const dateStr = bulkDate.format('YYYY-MM-DD');
      await Promise.all(bulkRows.map(row =>
        api.post('/admin/attendance', {
          staffId: row.userId,
          date: dateStr,
          status: row.status,
          checkIn: row.checkIn ? row.checkIn.format('HH:mm:ss') : null,
          checkOut: row.checkOut ? row.checkOut.format('HH:mm:ss') : null,
          overtimeMinutes: row.status === 'overtime' && Number.isFinite(Number(row.overtimeMinutes)) ? Number(row.overtimeMinutes) : undefined,
        })
      ));
      message.success(`Bulk attendance saved for ${bulkRows.length} staff members`);
      setBulkMarkOpen(false);
      setBulkRows([]);
      fetchAttendance();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to save bulk attendance');
    }
  };

  const fetchAttendance = async () => {
    if (!selectedDate) {
      setAttendance([]);
      return;
    }
    setLoading(true);
    try {
      const params = {
        date: selectedDate.format('YYYY-MM-DD'),
      };

      if (selectedStaff !== 'all') {
        params.staffId = selectedStaff;
      }

      const response = await api.get('/admin/attendance', { params });
      if (response.data.success) {
        setAttendance(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setAttendance([]);
      }
    } catch (error) {
      message.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedLeaves = async () => {
    if (!selectedDate) { setApprovedLeaves([]); return; }
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const res = await api.get('/leave', { params: { status: 'APPROVED' } });
      const all = Array.isArray(res.data?.leaves) ? res.data.leaves : [];
      const forDate = all.filter(l => l.startDate <= dateStr && l.endDate >= dateStr);
      setApprovedLeaves(forDate);
    } catch (_) {
      setApprovedLeaves([]);
    }
  };

  const handleExport = async () => {
    try {
      const params = {
        date: selectedDate.format('YYYY-MM-DD'),
      };

      if (selectedStaff !== 'all') {
        params.staffId = selectedStaff;
      }

      const response = await api.get('/admin/attendance/export', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${selectedDate.format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Failed to export attendance');
    }
  };

  const openNoteModal = (record) => {
    setSelectedRecord(record);
    noteForm.resetFields();

    const staffId = record.userId || record.user?.id || record.id;

    noteForm.setFieldsValue({
      staffId: staffId,
      date: dayjs(record.date),
      note: record.note || '',
    });
    setNoteOpen(true);
  };

  const closeNoteModal = () => {
    setNoteOpen(false);
    setSelectedRecord(null);
    noteForm.resetFields();
  };

  const submitNote = async () => {
    try {
      const values = await noteForm.validateFields();

      if (!values.staffId) {
        message.error('Staff ID is missing');
        return;
      }

      const payload = {
        staffId: values.staffId,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note,
      };

      await api.post('/admin/attendance/note', payload);
      message.success('Note saved successfully');
      closeNoteModal();
      fetchAttendance();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to save note');
    }
  };

  const getStatusClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (['present', 'overtime'].includes(s)) return 'sales-status-complete';
    if (['absent'].includes(s)) return 'sales-status-inactive';
    if (['half_day'].includes(s)) return 'sales-status-pending';
    if (['leave', 'on_leave'].includes(s)) return 'sales-status-active';
    if (['weekly_off'].includes(s)) return 'sales-status-inprogress';
    return 'sales-status-active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'green';
      case 'overtime': return 'green';
      case 'absent': return 'red';
      case 'half_day': return 'orange';
      case 'leave': return 'blue';
      case 'on_leave': return 'blue';
      default: return 'default';
    }
  };

  const baseForCounts = attendance.filter(row => {
    const q = search.trim().toLowerCase();
    const matchesSearch = q
      ? (row.user?.name || '').toLowerCase().includes(q) ||
      (row.staffProfile?.staffId || '').toString().toLowerCase().includes(q)
      : true;
    const matchesDept = departmentFilter === 'all' ? true : (row.staffProfile?.department || '') === departmentFilter;
    const matchesDate = dateFilter ? row.date === dateFilter.format('YYYY-MM-DD') : true;
    return matchesSearch && matchesDept && matchesDate;
  });

  const filteredActiveStaff = staffList.filter(s => {
    if (!s.active) return false;
    const q = search.trim().toLowerCase();
    const matchesSearch = q
      ? (s.name || '').toLowerCase().includes(q) ||
      (s.staffId || '').toString().toLowerCase().includes(q)
      : true;
    const matchesDept = departmentFilter === 'all' ? true : (s.department || '') === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const activeStaffCount = filteredActiveStaff.length;
  const presentCount = baseForCounts.filter(a => ['present', 'overtime', 'half_day'].includes(a.status?.toLowerCase())).length;

  const attendanceLeaveUserIds = new Set(
    baseForCounts.filter(a => a.status?.toLowerCase() === 'leave').map(a => a.userId)
  );
  const approvedLeaveUserIds = new Set(
    approvedLeaves
      .filter(l => selectedStaff === 'all' || String(l.userId) === String(selectedStaff))
      .map(l => l.userId)
  );
  const allLeaveUserIds = new Set([...attendanceLeaveUserIds, ...approvedLeaveUserIds]);
  const leaveCount = allLeaveUserIds.size;
  const absentCount = Math.max(0, activeStaffCount - presentCount - leaveCount);

  const attendanceDateStr = selectedDate?.format('YYYY-MM-DD');
  const attendanceUserIdSet = new Set(attendance.map(a => a.userId));
  const leaveRows = approvedLeaves
    .filter(l => !attendanceUserIdSet.has(l.userId) && !attendanceUserIdSet.has(Number(l.userId)))
    .map(l => {
      const staffInfo = staffList.find(s => s.id === l.userId || s.id === Number(l.userId));
      return {
        id: `leave-req-${l.id}`,
        userId: l.userId,
        date: attendanceDateStr,
        status: 'leave',
        checkIn: null,
        checkOut: null,
        breakTotalSeconds: null,
        totalWorkHours: null,
        user: { name: l.user?.profile?.name || staffInfo?.name || 'Unknown', id: l.userId },
        staffProfile: {
          staffId: l.user?.profile?.staffId || staffInfo?.staffId || 'N/A',
          department: staffInfo?.department || l.user?.profile?.department || '',
        },
        _isLeaveRequest: true,
        leaveType: l.leaveType,
        categoryKey: l.categoryKey,
        categoryName: l.categoryName,
      };
    });

  const allRows = [...attendance, ...leaveRows];

  const filtered = allRows.filter(row => {
    const q = search.trim().toLowerCase();
    const matchesSearch = q
      ? (row.user?.name || '').toLowerCase().includes(q) ||
      (row.staffProfile?.staffId || '').toString().toLowerCase().includes(q)
      : true;
    const matchesStatus = statusFilter === 'all' ? true : row.status === statusFilter;
    const matchesDept = departmentFilter === 'all' ? true : (row.staffProfile?.department || '') === departmentFilter;
    const matchesStaffName = staffNameFilter === 'all' ? true : (row.user?.name || '') === staffNameFilter;
    const matchesDate = dateFilter ? row.date === dateFilter.format('YYYY-MM-DD') : true;
    return matchesSearch && matchesStatus && matchesDept && matchesStaffName && matchesDate;
  });

  const columns = [
    {
      title: 'Staff Name',
      key: 'staffName',
      render: (_, record) => {
        const name = record.user?.name || 'Unknown';
        const staffId = record.staffProfile?.staffId || 'N/A';
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#e6f7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              color: '#1677ff',
              fontSize: '16px',
              fontWeight: '700',
              boxShadow: '0 2px 6px rgba(22, 119, 255, 0.08)'
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1677ff' }}>{name}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>ID: {staffId}</div>
              <Space size={8} style={{ marginTop: '4px' }}>
                <Button
                  type="link"
                  size="small"
                  onClick={() => openNoteModal(record)}
                  style={{ padding: 0, height: 'auto', fontSize: '11px' }}
                >
                  {record.note ? 'Edit Note' : '+ Add Note'}
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setLogsData(record);
                    setLogsModalOpen(true);
                  }}
                  style={{ padding: 0, height: 'auto', fontSize: '11px' }}
                >
                  View Logs
                </Button>
              </Space>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Department',
      dataIndex: ['staffProfile', 'department'],
      key: 'department',
      render: (dept) => dept || '-',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Check In',
      dataIndex: 'checkIn',
      key: 'checkIn',
      render: (time) => time || '-',
    },
    {
      title: 'Check Out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      render: (time) => time || '-',
    },
    {
      title: 'Break',
      dataIndex: 'breakTotalSeconds',
      key: 'breakTotalSeconds',
      render: (seconds) => {
        if (seconds && seconds > 0) {
          return `${(seconds / 3600).toFixed(2)}h`;
        }
        return '-';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const isLeave = ['leave', 'on_leave'].includes(String(status || '').toLowerCase());
        const leaveCategoryLabel = record.categoryName || record.categoryKey || record.leaveType;
        let statusLabel = isLeave && leaveCategoryLabel
          ? `Leave (${String(leaveCategoryLabel).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())})`
          : (status?.replace('_', ' ').toUpperCase() || 'ABSENT');

        if (String(status || '').toLowerCase() === 'weekly_off' && record.source === 'roster') {
          statusLabel = 'WEEKLY OFF (Assign from roster)';
        }

        return (
          <Space direction="vertical" size={2}>
            <span className={`sales-status-tag ${getStatusClass(status)}`}>
              {statusLabel}
            </span>
            {status === 'overtime' && record.overtimeMinutes > 0 && (
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 2 }}>
                ({record.overtimeMinutes} min OT)
              </Text>
            )}
            {record.isLate && record.latePenaltyText && (
              <Tag color="error" style={{ fontSize: '10px', marginTop: 2, whiteSpace: 'normal', height: 'auto', padding: '2px 4px' }}>
                Late: {record.latePenaltyText}
                {record.bufferMinutes > 0 && ` (Buffer: ${record.bufferMinutes}m applied)`}
              </Tag>
            )}
            {!record.latePenaltyText && record.latePunchInMinutes > 0 && (
              <Tag color="error" style={{ fontSize: '10px', marginTop: 2, whiteSpace: 'normal', height: 'auto', padding: '2px 4px' }}>
                Late by {record.latePunchInMinutes} min
                {record.bufferMinutes > 0 && ` (Buffer: ${record.bufferMinutes}m applicable)`}
              </Tag>
            )}
            {record.earlyExitMinutes > 0 && (
              <Tag color="warning" style={{ fontSize: '10px', marginTop: 2, whiteSpace: 'normal', height: 'auto', padding: '2px 4px' }}>
                Early Exit: {record.earlyExitMinutes} min
              </Tag>
            )}
            {record.earlyOvertimeMinutes > 0 && (
              <Tag color="cyan" style={{ fontSize: '10px', marginTop: 2, whiteSpace: 'normal', height: 'auto', padding: '2px 4px' }}>
                Early OT: {record.earlyOvertimeMinutes} min
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Working Hours',
      key: 'workingHours',
      render: (_, record) => {
        return formatWorkingHours(record.checkIn, record.checkOut, record.totalWorkHours);
      },
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => {
        const hasLocation = record.latitude || record.punchOutLatitude;
        if (!hasLocation) return '-';

        return (
          <Button
            type="text"
            className="sales-action-btn"
            icon={<EnvironmentOutlined style={{ color: '#1677ff', fontSize: '16px' }} />}
            onClick={() => {
              const perms = record.user?.permissions || [];
              if (perms.includes('geolocation_access')) {
                setLocationData(record);
                setLocationModalOpen(true);
              } else {
                message.warning('Staff does not have geolocation access');
              }
            }}
          />
        );
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />

      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Attendance Management" 
        />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          
          {/* Top Stats Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Present</div>
                    <div style={{ color: '#1f1f1f', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{presentCount}</div>
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
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Absent</div>
                    <div style={{ color: '#1f1f1f', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{absentCount}</div>
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
                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                style={{
                  background: '#ffffff',
                  border: '1px solid #f0f2f5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  borderRadius: '16px'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Leave</div>
                    <div style={{ color: '#1f1f1f', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{leaveCount}</div>
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
                    <CoffeeOutlined style={{ color: '#1677ff', fontSize: '20px' }} />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Card
            className="sales-content-card"
            bodyStyle={{ padding: '24px' }}
          >
            {/* Sleek Filter & Action Row */}
            <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date || dayjs())}
                  picker="date"
                  format="DD MMM YYYY"
                  placeholder="Select date"
                  style={{ width: 140 }}
                />
                <Input
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 180 }}
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  allowClear
                />
                <Select
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  style={{ width: 150 }}
                >
                  <Option value="all">Department</Option>
                  {departments.map(dep => (
                    <Option key={dep.id || dep.name} value={dep.name}>{dep.name}</Option>
                  ))}
                </Select>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 120 }}
                >
                  <Option value="all">Status</Option>
                  <Option value="present">Present</Option>
                  <Option value="overtime">Overtime</Option>
                  <Option value="absent">Absent</Option>
                  <Option value="half_day">Half Day</Option>
                  <Option value="leave">Leave</Option>
                </Select>
                <Select
                  showSearch
                  value={staffNameFilter}
                  onChange={setStaffNameFilter}
                  style={{ width: 160 }}
                  placeholder="Staff Name"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  <Option value="all">Staff Name</Option>
                  {staffList.map(staff => (
                    <Option key={staff.id} value={staff.name}>
                      {staff.name}
                    </Option>
                  ))}
                </Select>
              </div>
              <Space wrap size={8}>
                <Button type="primary" onClick={() => openMarkModal()} shape="round">
                  Mark Attendance
                </Button>
                <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={openBulkMarkModal} shape="round">
                  Bulk Mark Attendance
                </Button>
                <Button icon={<ExportOutlined />} onClick={handleExport} shape="round">
                  Export
                </Button>
              </Space>
            </div>

            {selectedStaff !== 'all' && (
              <div style={{ marginBottom: 20, background: '#fafafa', padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <Space size={24} wrap>
                  <span><strong>Effective Template:</strong> {effectiveTemplate?.name || '—'}</span>
                  <span><strong>Mode:</strong> {(effectiveTemplate?.attendanceMode || '').replace(/_/g, ' ') || '—'}</span>
                  <span><strong>Holidays:</strong> {effectiveTemplate?.holidaysRule || '—'}</span>
                  <span><strong>Track In/Out:</strong> {effectiveTemplate?.trackInOutEnabled ? 'Yes' : 'No'}</span>
                  <span><strong>Require Punch Out:</strong> {effectiveTemplate?.requirePunchOut ? 'Yes' : 'No'}</span>
                  <span><strong>Multiple Punches:</strong> {effectiveTemplate?.allowMultiplePunches ? 'Allowed' : 'Not Allowed'}</span>
                </Space>
              </div>
            )}

            <Table
              columns={columns}
              dataSource={filtered}
              loading={loading}
              rowKey="id"
              className="sales-table"
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              }}
            />
          </Card>

          {/* Modals styled with .sales-modal */}
          <Modal
            title="Mark Attendance"
            open={markOpen}
            onCancel={() => setMarkOpen(false)}
            onOk={submitMark}
            okText="Save Record"
            className="sales-modal"
            destroyOnClose
          >
            <Form form={markForm} layout="vertical">
              <Form.Item name="staffId" label={<span className="modal-field-label">Select Staff Member</span>} rules={[{ required: true, message: 'Please select staff' }]} >
                <Select
                  showSearch
                  placeholder="Select staff"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  onSelect={async (uid) => {
                    const dateStr = selectedDate.format('YYYY-MM-DD');

                    const staffInfo = staffList.find(s => s.id === uid || s.id === Number(uid));
                    if (staffInfo && staffInfo.active === false) {
                      setSelectedStaffDeactivated(true);
                      message.warning(`⚠️ ${staffInfo.name} is deactivated. Attendance can still be marked but this account is inactive.`);
                    } else {
                      setSelectedStaffDeactivated(false);
                    }

                    try {
                      const res = await api.get(`/admin/attendance/check-leave?userId=${uid}&date=${dateStr}`);
                      if (res.data.onLeave) {
                        setStaffOnLeave(true);
                        message.warning('today this staff is on paid leave');
                      } else {
                        setStaffOnLeave(false);
                      }
                    } catch (_) {
                      setStaffOnLeave(false);
                    }

                    fetchSpecialDayStatus(uid, dateStr);

                    const rec = attendance.find(
                      a => (a.userId === uid || a.userId === Number(uid)) && a.date === dateStr
                    );
                    if (rec) {
                      markForm.setFieldsValue({
                        status: rec.status || 'present',
                        checkIn: parseTimeValue(rec.checkIn) || parseTimeValue('09:30'),
                        checkOut: parseTimeValue(rec.checkOut) || parseTimeValue('18:00'),
                      });
                    } else {
                      markForm.setFieldsValue({
                        status: 'present',
                        checkIn: parseTimeValue('09:30'),
                        checkOut: parseTimeValue('18:00'),
                      });
                    }
                    api.get(`/admin/shifts/effective/${uid}?date=${dateStr}`).then(res => {
                      const shift = res.data?.shift;
                      setEffectiveShift(shift || null);
                      if (!rec && shift) {
                        markForm.setFieldsValue({
                          checkIn: parseTimeValue(shift.startTime) || parseTimeValue('09:30'),
                          checkOut: parseTimeValue(shift.endTime) || parseTimeValue('18:00'),
                        });
                      }
                    }).catch(() => setEffectiveShift(null));
                  }}
                >
                  {Array.isArray(staffList) && staffList.map(s => (
                    <Option key={s.id} value={s.id}>{s.name} ({s.staffId || 'N/A'})</Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedStaffDeactivated && (
                <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fff1f0', border: '1px solid #ff4d4f', borderRadius: 4, color: '#cf1322', fontWeight: 600 }}>
                  ⚠️ Warning: This staff member is currently <strong>deactivated</strong>. Their account is inactive in this organization.
                </div>
              )}

              {staffOnLeave && (
                <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4, color: '#cf1322', fontWeight: 500 }}>
                  today this staff is on paid leave
                </div>
              )}

              {staffOffMsg && (
                <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 4, color: '#d46b08', fontWeight: 500 }}>
                  {staffOffMsg}
                </div>
              )}

              <Form.Item name="date" label={<span className="modal-field-label">Date</span>} rules={[{ required: true, message: 'Please choose date' }]} >
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
              <Form.Item name="status" label={<span className="modal-field-label">Status</span>} rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="present">Present</Radio>
                  <Radio value="overtime">Overtime</Radio>
                  <Radio value="absent">Absent</Radio>
                  <Radio value="half_day">Half Day</Radio>
                  <Radio value="leave">Leave</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
                {({ getFieldValue }) => {
                  const status = getFieldValue('status');
                  const hasAutoOT = effectiveShift && Number(effectiveShift.overtimeStartMinutes) > 0;
                  if (status === 'overtime' && !hasAutoOT) {
                    return (
                      <Form.Item
                        name="overtimeMinutes"
                        label={<span className="modal-field-label">Overtime Minutes</span>}
                        rules={[{ required: false }]}
                      >
                        <AntInput type="number" min={0} placeholder="Enter OT minutes if needed" />
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>
              <Form.Item name="checkIn" label={<span className="modal-field-label">Check-in Time</span>}>
                <TimePicker style={{ width: '100%' }} format="HH:mm" needConfirm={false} />
              </Form.Item>
              <Form.Item name="checkOut" label={<span className="modal-field-label">Check-out Time</span>}>
                <TimePicker style={{ width: '100%' }} format="HH:mm" needConfirm={false} />
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="Bulk Mark Attendance"
            open={bulkMarkOpen}
            onCancel={() => { setBulkMarkOpen(false); setBulkRows([]); }}
            onOk={submitBulkMark}
            okText="Save Bulk Attendance"
            width={900}
            className="sales-modal"
            destroyOnClose
          >
            {/* Date picker */}
            <div style={{ marginBottom: 16 }}>
              <span className="modal-field-label">Select Date</span>
              <DatePicker
                value={bulkDate}
                onChange={(d) => setBulkDate(d)}
                format="DD MMM YYYY"
                style={{ width: 200 }}
              />
            </div>

            {/* Staff selector */}
            <div style={{ marginBottom: 20 }}>
              <span className="modal-field-label">Select Staff Members</span>
              <Select
                mode="multiple"
                showSearch
                placeholder="Select staff to add rows below"
                style={{ width: '100%', marginTop: 6 }}
                value={bulkRows.map(r => r.userId)}
                onSelect={handleBulkStaffSelect}
                onDeselect={handleBulkStaffDeselect}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {Array.isArray(staffList) && staffList.map(s => (
                  <Option key={s.id} value={s.id}>{s.name} ({s.staffId || 'N/A'})</Option>
                ))}
              </Select>
            </div>

            {/* Per-staff editable table */}
            {bulkRows.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#595959' }}>Staff</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#595959' }}>Status</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#595959' }}>Check-in</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#595959' }}>Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map(row => (
                    <tr key={row.userId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>{row.name}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <Select
                          size="small"
                          value={row.status}
                          onChange={v => updateBulkRow(row.userId, 'status', v)}
                          style={{ width: 110 }}
                        >
                          <Option value="present">Present</Option>
                          <Option value="overtime">Overtime</Option>
                          <Option value="absent">Absent</Option>
                          <Option value="half_day">Half Day</Option>
                          <Option value="leave">Leave</Option>
                        </Select>
                        {row.status === 'overtime' && !row.hasAutoOT ? (
                          <AntInput
                            type="number"
                            min={0}
                            placeholder="OT minutes"
                            value={row.overtimeMinutes ?? ''}
                            onChange={(e) => updateBulkRow(row.userId, 'overtimeMinutes', e.target.value)}
                            style={{ width: 120, marginTop: 6, display: 'block' }}
                          />
                        ) : null}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <TimePicker
                          size="small"
                          value={row.checkIn}
                          format="HH:mm"
                          needConfirm={false}
                          onChange={v => updateBulkRow(row.userId, 'checkIn', v)}
                          style={{ width: 120 }}
                        />
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <TimePicker
                          size="small"
                          value={row.checkOut}
                          format="HH:mm"
                          needConfirm={false}
                          onChange={v => updateBulkRow(row.userId, 'checkOut', v)}
                          style={{ width: 120 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {bulkRows.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>Select staff members above to add their rows</div>
            )}
          </Modal>

          <Modal
            title={selectedRecord?.note ? 'Edit Note' : 'Add Note'}
            open={noteOpen}
            onCancel={closeNoteModal}
            onOk={submitNote}
            okText={selectedRecord?.note ? 'Update Note' : 'Save Note'}
            width={500}
            className="sales-modal"
            destroyOnClose
          >
            <Form form={noteForm} layout="vertical">
              <Form.Item name="staffId" label="Staff Member" style={{ display: "none" }}>
                <AntInput disabled />
              </Form.Item>
              <Form.Item name="date" label={<span className="modal-field-label">Date</span>}>
                <DatePicker style={{ width: '100%' }} disabled />
              </Form.Item>
              <Form.Item
                name="note"
                label={<span className="modal-field-label">Note</span>}
                rules={[{ required: true, message: 'Please enter a note' }]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Enter your note here..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="Location Details"
            open={locationModalOpen}
            onCancel={() => setLocationModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setLocationModalOpen(false)} shape="round">Close</Button>
            ]}
            width={700}
            className="sales-modal"
            destroyOnClose
          >
            {locationData && (
              <div style={{ padding: '10px 0' }}>
                <div style={{ marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #f0f0f0' }}>
                  <Title level={5}><UserOutlined style={{ color: '#1677ff' }} /> {locationData.user?.name || 'Staff'}</Title>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">ID: {locationData.staffProfile?.staffId || 'N/A'}</Text>
                    {locationData.staffProfile?.phone && (
                      <Text><PhoneOutlined /> {locationData.staffProfile.phone}</Text>
                    )}
                  </Space>
                </div>

                <div style={{ display: 'flex', gap: 20 }}>
                  {/* Punch In */}
                  <div style={{ flex: 1, padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                    <Title level={5} style={{ color: '#52c41a' }}><CheckCircleOutlined /> Punch In</Title>
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>Address:</Text>
                      <div style={{ marginTop: 4, fontSize: '13px' }}>{locationData.address || 'No address recorded'}</div>
                    </div>
                    {Number.isFinite(Number(locationData.latitude)) && Number.isFinite(Number(locationData.longitude)) && (
                      <div>
                        <Text strong>Coordinates:</Text>
                        <div style={{ marginTop: 4, color: '#1677ff', fontSize: '13px' }}>
                          <a
                            href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {Number(locationData.latitude).toFixed(6)}, {Number(locationData.longitude).toFixed(6)}
                            <ExportOutlined style={{ marginLeft: 4 }} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Punch Out */}
                  <div style={{ flex: 1, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8 }}>
                    <Title level={5} style={{ color: '#fa8c16' }}><LogoutOutlined /> Punch Out</Title>
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>Address:</Text>
                      <div style={{ marginTop: 4, fontSize: '13px' }}>{locationData.punchOutAddress || 'No address recorded'}</div>
                    </div>
                    {Number.isFinite(Number(locationData.punchOutLatitude)) && Number.isFinite(Number(locationData.punchOutLongitude)) && (
                      <div>
                        <Text strong>Coordinates:</Text>
                        <div style={{ marginTop: 4, color: '#1677ff', fontSize: '13px' }}>
                          <a
                            href={`https://www.google.com/maps?q=${locationData.punchOutLatitude},${locationData.punchOutLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {Number(locationData.punchOutLatitude).toFixed(6)}, {Number(locationData.punchOutLongitude).toFixed(6)}
                            <ExportOutlined style={{ marginLeft: 4 }} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Modal>

          <Modal
            title={`Attendance Logs - ${logsData?.user?.name || 'Staff'}`}
            open={logsModalOpen}
            onCancel={() => setLogsModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setLogsModalOpen(false)} shape="round">Close</Button>
            ]}
            width={700}
            className="sales-modal"
            destroyOnClose
          >
            {logsData && (
              <div style={{ padding: '10px 0' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title={<span style={{ fontWeight: 600 }}>Punch In Photo</span>} bordered={false} style={{ background: '#fafafa', borderRadius: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        {logsData.punchInPhotoUrl ? (
                          <Image
                            src={logsData.punchInPhotoUrl.startsWith('http') ? logsData.punchInPhotoUrl : `${api.defaults.baseURL}${logsData.punchInPhotoUrl}`}
                            alt="Punch In"
                            style={{ maxWidth: '100%', borderRadius: '4px' }}
                          />
                        ) : (
                          <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '4px', color: '#8c8c8c' }}>
                            No punch-in photo
                          </div>
                        )}
                        <div style={{ marginTop: '10px' }}>
                          <Text strong>Time: </Text>
                          <Text>{logsData.checkIn || '-'}</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title={<span style={{ fontWeight: 600 }}>Punch Out Photo</span>} bordered={false} style={{ background: '#fafafa', borderRadius: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        {logsData.punchOutPhotoUrl ? (
                          <Image
                            src={logsData.punchOutPhotoUrl.startsWith('http') ? logsData.punchOutPhotoUrl : `${api.defaults.baseURL}${logsData.punchOutPhotoUrl}`}
                            alt="Punch Out"
                            style={{ maxWidth: '100%', borderRadius: '4px' }}
                          />
                        ) : (
                          <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '4px', color: '#8c8c8c' }}>
                            No punch-out photo
                          </div>
                        )}
                        <div style={{ marginTop: '10px' }}>
                          <Text strong>Time: </Text>
                          <Text>{logsData.checkOut || '-'}</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AttendanceManagement;
