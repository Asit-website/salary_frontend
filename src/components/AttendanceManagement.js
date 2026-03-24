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
  PhoneOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
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

const formatWorkingHours = (checkInRaw, checkOutRaw) => {
  const checkIn = parseTimeValue(checkInRaw);
  const checkOut = parseTimeValue(checkOutRaw);
  if (!checkIn || !checkOut) return '-';
  const minutes = checkOut.diff(checkIn, 'minute');
  if (!Number.isFinite(minutes) || minutes < 0) return '-';
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
  const [bulkMarkForm] = Form.useForm();
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

  const navigate = useNavigate();

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
    fetchAttendance();
  }, []);


  useEffect(() => {
    fetchStaff();
    fetchAttendance();
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
        // Backend returns { success, staff: [...], data: [...] }
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
      console.log('Fetched departments:', items);
      console.log('Setting departments state:', items.length, 'items'); // Debug log
      setDepartments(items);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const openMarkModal = (staffRow = null) => {
    markForm.resetFields();

    // If called from a table row context, use that staff; otherwise use the sidebar filter
    const staffId = staffRow?.userId ?? staffRow?.id ?? (selectedStaff !== 'all' ? selectedStaff : undefined);

    // Auto-fill from existing attendance record if available
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
    setMarkOpen(true);
  };

  const submitMark = async () => {
    try {
      const values = await markForm.validateFields();
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

  // When a staff is selected in the bulk dropdown, add a row with prefilled data
  const handleBulkStaffSelect = async (uid) => {
    const staffInfo = staffList.find(s => s.id === uid || s.id === Number(uid));
    const rec = attendance.find(
      a => (a.userId === uid || a.userId === Number(uid)) && a.date === bulkDate.format('YYYY-MM-DD')
    );

    let hasAutoOT = false;
    try {
      const sRes = await api.get(`/admin/shifts/effective/${uid}`);
      if (sRes.data?.shift && Number(sRes.data.shift.overtimeStartMinutes) > 0) {
        hasAutoOT = true;
      }
    } catch (_) { }

    setBulkRows(prev => [
      ...prev,
      {
        userId: uid,
        name: staffInfo ? `${staffInfo.name} (${staffInfo.staffId || 'N/A'})` : `Staff ${uid}`,
        status: rec?.status || 'present',
        checkIn: parseTimeValue(rec?.checkIn) || parseTimeValue('09:30'),
        checkOut: parseTimeValue(rec?.checkOut) || parseTimeValue('18:00'),
        hasAutoOT,
      }
    ]);
  };

  // When a staff is deselected from bulk dropdown, remove their row
  const handleBulkStaffDeselect = (uid) => {
    setBulkRows(prev => prev.filter(r => r.userId !== uid && r.userId !== Number(uid)));
  };

  // Update a specific field in a specific staff's row
  const updateBulkRow = (userId, field, value) => {
    setBulkRows(prev => prev.map(r =>
      (r.userId === userId || r.userId === Number(userId)) ? { ...r, [field]: value } : r
    ));
  };

  const submitBulkMark = async () => {
    if (bulkRows.length === 0) { message.warning('Please select at least one staff'); return; }
    try {
      const dateStr = bulkDate.format('YYYY-MM-DD');
      // Send individual attendance for each staff row
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
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
    console.log('Record keys:', Object.keys(record));
    console.log('Record values:', {
      user_id: record.user_id,
      userId: record.userId,
      user: record.user,
      id: record.id
    });

    setSelectedRecord(record);
    noteForm.resetFields();

    // Ensure we have the correct staff ID
    const staffId = record.userId || record.user?.id || record.id;
    console.log('Extracted staffId:', staffId);

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
      console.log('Submitting note with values:', values);

      if (!values.staffId) {
        message.error('Staff ID is missing');
        return;
      }

      const payload = {
        staffId: values.staffId,
        date: values.date.format('YYYY-MM-DD'), // Format dayjs date to string
        note: values.note,
      };

      console.log('Sending payload:', payload);

      await api.post('/admin/attendance/note', payload);
      message.success('Note saved successfully');
      closeNoteModal();
      fetchAttendance(); // Refresh data
    } catch (err) {
      console.error('Submit note error:', err);
      if (err?.errorFields) return; // validation error
      message.error(err?.response?.data?.message || 'Failed to save note');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'green';
      case 'overtime': return 'green';
      case 'absent': return 'red';
      case 'half_day': return 'orange';
      case 'leave': return 'blue';
      default: return 'default';
    }
  };

  // Summary counts reflect current search and department filters (not the status filter)
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
  const presentCount = baseForCounts.filter(a => ['present', 'overtime', 'half_day'].includes(a.status?.toLowerCase())).length;
  const absentCount = baseForCounts.filter(a => a.status?.toLowerCase() === 'absent').length;
  const leaveCount = baseForCounts.filter(a => a.status?.toLowerCase() === 'leave').length;

  const filtered = attendance.filter(row => {
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
          <div>
            <div>{name} ({staffId})</div>
            <Space size={8}>
              <Button
                type="link"
                size="small"
                onClick={() => openNoteModal(record)}
                style={{ padding: 0, height: 'auto', fontSize: '12px' }}
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
                style={{ padding: 0, height: 'auto', fontSize: '12px' }}
              >
                View Logs
              </Button>
            </Space>
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
      render: (status, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={getStatusColor(status)}>
            {status?.replace('_', ' ').toUpperCase() || 'ABSENT'}
          </Tag>
          {status === 'overtime' && record.overtimeMinutes > 0 && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              ({record.overtimeMinutes} min OT)
            </Text>
          )}
          {record.isLate && record.latePenaltyText && (
            <Tag color="error" style={{ fontSize: '10px', marginTop: 2, whiteSpace: 'normal', height: 'auto', padding: '2px 4px' }}>
              Late: {record.latePenaltyText}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Working Hours',
      key: 'workingHours',
      render: (_, record) => {
        return formatWorkingHours(record.checkIn, record.checkOut);
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
            icon={<EnvironmentOutlined style={{ color: '#125EC9', fontSize: '18px' }} />}
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

  console.log('Departments state:', departments); // Debug log
  console.log('Departments length:', departments.length); // Debug log
  console.log('Department filter:', departmentFilter); // Debug log

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
            <Title level={4} style={{ margin: 0 }}>Attendance Management</Title>
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

        <Content style={{ margin: '24px 24px', padding: 24, background: '#fff', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Card
            className="att-card"
            title={
              <div className="att-header">
                <span className="att-title">Attendance</span>
              </div>
            }
            extra={
              <Space>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  picker="date"
                  format="DD MMM YYYY"
                  placeholder="Select date"
                />
                {/* <DatePicker
                  value={dateFilter}
                  onChange={(date) => setDateFilter(date)}
                  format="DD MMM YYYY"
                  placeholder="Filter by date"
                  allowClear
                /> */}
                <Button type="primary" onClick={openMarkModal}>Mark Attendance</Button>
                <Button type="primary" onClick={openBulkMarkModal}>Bulk Mark Attendance</Button>
                <Button icon={<ExportOutlined />} onClick={handleExport}>Export</Button>
              </Space>
            }
          >
            {selectedStaff !== 'all' && (
              <div style={{ marginBottom: 12, background: '#fafafa', padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
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
            {/* Stats row below header (under date/mark/export) */}
            <div className="att-stats" style={{ marginBottom: 12 }}>
              <div className="att-stat">
                <span className="att-stat-icon present"><img src="https://res.cloudinary.com/dgif730br/image/upload/v1768896898/Container_tcew9a.png" alt="Present" /></span>
                <div>
                  <div className="att-stat-label">Total Present</div>
                  <div className="att-stat-value">{presentCount}</div>
                </div>
              </div>
              <div className="att-stat">
                <span className="att-stat-icon absent"><img src="https://res.cloudinary.com/dgif730br/image/upload/v1768896898/Container_1_rlb3bu.png" alt="Absent" /></span>
                <div>
                  <div className="att-stat-label">Absent</div>
                  <div className="att-stat-value">{absentCount}</div>
                </div>
              </div>
              <div className="att-stat">
                <span className="att-stat-icon leave"><img src="https://res.cloudinary.com/dgif730br/image/upload/v1768896898/Container_2_k4chlk.png" alt="On Leave" /></span>
                <div>
                  <div className="att-stat-label">On Leave</div>
                  <div className="att-stat-value">{leaveCount}</div>
                </div>
              </div>
            </div>
            <div className="att-toolbar">
              <div className="att-toolbar-left">
                <Input
                  className="att-search"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="att-toolbar-right">
                <Select
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  className="att-filter"
                >
                  <Option value="all">Department</Option>
                  {departments.length > 0 ? (
                    departments.map(dep => (
                      <Option key={dep.id || dep.name} value={dep.name}>{dep.name}</Option>
                    ))
                  ) : (
                    <Option value="" disabled>No departments available</Option>
                  )}
                </Select>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="att-filter"
                >
                  <Option value="all">Status</Option>
                  <Option value="present">Present</Option>
                  <Option value="overtime">Overtime</Option>
                  <Option value="absent">Absent</Option>
                  <Option value="half_day">Half Day</Option>
                  <Option value="leave">Leave</Option>
                </Select>
                <Select
                  value={staffNameFilter}
                  onChange={setStaffNameFilter}
                  className="att-filter"
                >
                  <Option value="all">Staff Name</Option>
                  {staffList.map(staff => (
                    <Option key={staff.id} value={staff.name}>
                      {staff.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            <Table
              columns={columns}
              dataSource={filtered}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
            />
          </Card>
          <Modal
            title="Mark Attendance"
            open={markOpen}
            onCancel={() => setMarkOpen(false)}
            onOk={submitMark}
            okText="Save Record"
          >
            <Form form={markForm} layout="vertical">
              <Form.Item name="staffId" label="Select Staff Member" rules={[{ required: true, message: 'Please select staff' }]} >
                <Select
                  placeholder="Select staff"
                  onSelect={(uid) => {
                    const rec = attendance.find(
                      a => (a.userId === uid || a.userId === Number(uid)) && a.date === selectedDate.format('YYYY-MM-DD')
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
                    // Fetch shift for this specific user to check OT rules
                    api.get(`/admin/shifts/effective/${uid}`).then(res => {
                      setEffectiveShift(res.data?.shift || null);
                    }).catch(() => setEffectiveShift(null));
                  }}
                >
                  {Array.isArray(staffList) && staffList.map(s => (
                    <Option key={s.id} value={s.id}>{s.name} ({s.staffId || 'N/A'})</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="date" label="Month" rules={[{ required: true, message: 'Please choose month' }]} >
                <DatePicker style={{ width: '100%' }} picker="month" format="MMM YYYY" />
              </Form.Item>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
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
                        label="Overtime Minutes"
                        rules={[{ required: false }]}
                      >
                        <AntInput type="number" min={0} placeholder="Enter OT minutes if needed" />
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>
              <Form.Item name="checkIn" label="Check-in Time">
                <TimePicker style={{ width: '100%' }} format="HH:mm" needConfirm={false} />
              </Form.Item>
              <Form.Item name="checkOut" label="Check-out Time">
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
          >
            {/* Date picker */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 500 }}>Date: </label>
              <DatePicker
                value={bulkDate}
                onChange={(d) => setBulkDate(d)}
                format="DD MMM YYYY"
                style={{ marginLeft: 8 }}
              />
            </div>

            {/* Staff selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500 }}>Select Staff Members:</label>
              <Select
                mode="multiple"
                placeholder="Select staff to add rows below"
                style={{ width: '100%', marginTop: 6 }}
                value={bulkRows.map(r => r.userId)}
                onSelect={handleBulkStaffSelect}
                onDeselect={handleBulkStaffDeselect}
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
                    <th style={{ padding: '8px 6px', textAlign: 'left' }}>Staff</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left' }}>Check-in</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left' }}>Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map(row => (
                    <tr key={row.userId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 500 }}>{row.name}</td>
                      <td style={{ padding: '8px 6px' }}>
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
                            style={{ width: 120, marginTop: 6 }}
                          />
                        ) : null}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <TimePicker
                          size="small"
                          value={row.checkIn}
                          format="HH:mm"
                          needConfirm={false}
                          onChange={v => updateBulkRow(row.userId, 'checkIn', v)}
                          style={{ width: 120 }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
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
          >
            <Form form={noteForm} layout="vertical">
              <Form.Item name="staffId" label="Staff Member" style={{ display: "none" }}>
                <AntInput disabled />
              </Form.Item>
              <Form.Item name="date" label="Date">
                <DatePicker style={{ width: '100%' }} disabled />
              </Form.Item>
              <Form.Item
                name="note"
                label="Note"
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
              <Button key="close" onClick={() => setLocationModalOpen(false)}>Close</Button>
            ]}
            width={700}
          >
            {locationData && (
              <div style={{ padding: '10px 0' }}>
                <div style={{ marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #f0f0f0' }}>
                  <Title level={5}><UserOutlined style={{ color: '#125EC9' }} /> {locationData.user?.name || 'Staff'}</Title>
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
                        <div style={{ marginTop: 4, color: '#125EC9', fontSize: '13px' }}>
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
                        <div style={{ marginTop: 4, color: '#125EC9', fontSize: '13px' }}>
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
              <Button key="close" onClick={() => setLogsModalOpen(false)}>Close</Button>
            ]}
            width={700}
          >
            {logsData && (
              <div style={{ padding: '10px 0' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title="Punch In Photo" borderless>
                      <div style={{ textAlign: 'center' }}>
                        {logsData.punchInPhotoUrl ? (
                          <Image
                            src={logsData.punchInPhotoUrl.startsWith('http') ? logsData.punchInPhotoUrl : `${api.defaults.baseURL}${logsData.punchInPhotoUrl}`}
                            alt="Punch In"
                            style={{ maxWidth: '100%', borderRadius: '4px' }}
                          />
                        ) : (
                          <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '4px', color: '#8c8c8c' }}>
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
                    <Card size="small" title="Punch Out Photo" borderless>
                      <div style={{ textAlign: 'center' }}>
                        {logsData.punchOutPhotoUrl ? (
                          <Image
                            src={logsData.punchOutPhotoUrl.startsWith('http') ? logsData.punchOutPhotoUrl : `${api.defaults.baseURL}${logsData.punchOutPhotoUrl}`}
                            alt="Punch Out"
                            style={{ maxWidth: '100%', borderRadius: '4px' }}
                          />
                        ) : (
                          <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '4px', color: '#8c8c8c' }}>
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
