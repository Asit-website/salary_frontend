import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, DatePicker, Select, message, Space, Typography, Tag, Menu, Input, Modal, Form, Radio, TimePicker, Input as AntInput } from 'antd';
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
  FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

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
  const [effectiveTemplate, setEffectiveTemplate] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm] = Form.useForm();
  const [selectedRecord, setSelectedRecord] = useState(null);

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
    const loadTpl = async () => {
      if (selectedStaff === 'all') { setEffectiveTemplate(null); return; }
      try {
        const res = await api.get(`/admin/settings/attendance-templates/effective/${selectedStaff}`);
        setEffectiveTemplate(res.data?.template || null);
      } catch (_) {
        setEffectiveTemplate(null);
      }
    };
    loadTpl();
  }, [selectedStaff]);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/admin/staff');
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

  const openMarkModal = () => {
    markForm.resetFields();
    markForm.setFieldsValue({
      staffId: selectedStaff !== 'all' ? selectedStaff : undefined,
      date: selectedDate,
      status: 'present',
      checkIn: dayjs('09:30', 'HH:mm'),
      checkOut: dayjs('18:00', 'HH:mm'),
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
      };
      await api.post('/admin/attendance', payload);
      message.success('Attendance saved');
      setMarkOpen(false);
      fetchAttendance();
    } catch (err) {
      if (err?.errorFields) return; // validation error
      message.error(err?.response?.data?.message || 'Failed to save attendance');
    }
  };

  const openBulkMarkModal = () => {
    bulkMarkForm.resetFields();
    bulkMarkForm.setFieldsValue({
      date: selectedDate,
      status: 'present',
      checkIn: dayjs('09:30', 'HH:mm'),
      checkOut: dayjs('18:00', 'HH:mm'),
    });
    setBulkMarkOpen(true);
  };

  const submitBulkMark = async () => {
    try {
      const values = await bulkMarkForm.validateFields();
      const payload = {
        date: values.date?.format('YYYY-MM-DD'),
        status: values.status,
        checkIn: values.checkIn ? values.checkIn.format('HH:mm:ss') : null,
        checkOut: values.checkOut ? values.checkOut.format('HH:mm:ss') : null,
        staffIds: values.staffIds || [],
      };
      await api.post('/admin/attendance/bulk', payload);
      message.success(`Bulk attendance saved for ${payload.staffIds.length} staff members`);
      setBulkMarkOpen(false);
      fetchAttendance();
    } catch (err) {
      if (err?.errorFields) return; // validation error
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
  const presentCount = baseForCounts.filter(a => a.status === 'present').length;
  const absentCount = baseForCounts.filter(a => a.status === 'absent').length;
  const leaveCount = baseForCounts.filter(a => a.status === 'leave').length;

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
            <Button
              type="link"
              size="small"
              onClick={() => openNoteModal(record)}
              style={{ padding: 0, height: 'auto', fontSize: '12px' }}
            >
              + Add Note
            </Button>
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
      dataIndex: 'breakMinutes',
      key: 'breakMinutes',
      render: (minutes) => {
        if (minutes && minutes > 0) {
          return `${minutes} min`;
        }
        return '-';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.replace('_', ' ').toUpperCase() || 'ABSENT'}
        </Tag>
      ),
    },
    {
      title: 'Working Hours',
      key: 'workingHours',
      render: (_, record) => {
        if (record.checkIn && record.checkOut) {
          const checkIn = dayjs(record.checkIn, 'HH:mm:ss');
          const checkOut = dayjs(record.checkOut, 'HH:mm:ss');
          const hours = checkOut.diff(checkIn, 'hour', true);
          return `${hours.toFixed(2)}h`;
        }
        return '-';
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
                <Select placeholder="Select staff">
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
                  <Radio value="absent">Absent</Radio>
                  <Radio value="half_day">Half Day</Radio>
                  <Radio value="leave">Leave</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="checkIn" label="Check-in Time">
                <TimePicker style={{ width: '100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
              <Form.Item name="checkOut" label="Check-out Time">
                <TimePicker style={{ width: '100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
            </Form>
          </Modal>
          <Modal
            title="Bulk Mark Attendance"
            open={bulkMarkOpen}
            onCancel={() => setBulkMarkOpen(false)}
            onOk={submitBulkMark}
            okText="Save Bulk Attendance"
            width={600}
          >
            <Form form={bulkMarkForm} layout="vertical">
              <Form.Item name="staffIds" label="Select Staff Members" rules={[{ required: true, message: 'Please select staff members' }]}>
                <Select
                  mode="multiple"
                  placeholder="Select multiple staff members"
                  style={{ width: '100%' }}
                >
                  {Array.isArray(staffList) && staffList.map(s => (
                    <Option key={s.id} value={s.id}>{s.name} ({s.staffId || 'N/A'})</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Please select date' }]}>
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="present">Present</Radio>
                  <Radio value="absent">Absent</Radio>
                  <Radio value="half_day">Half Day</Radio>
                  <Radio value="leave">Leave</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="checkIn" label="Check-in Time">
                <TimePicker style={{ width: '100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
              <Form.Item name="checkOut" label="Check-out Time">
                <TimePicker style={{ width: '100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
            </Form>
          </Modal>
          <Modal
            title="Add Note"
            open={noteOpen}
            onCancel={closeNoteModal}
            onOk={submitNote}
            okText="Save Note"
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
        </Content>
      </Layout>
    </Layout>
  );
};

export default AttendanceManagement;
