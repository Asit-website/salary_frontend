import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Table, Button, DatePicker, Select, Input, Popover, message, Space, Card, Typography, Modal, Form, Checkbox, Divider, Tabs, InputNumber } from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined, CalendarOutlined, SaveOutlined, AppstoreAddOutlined, SyncOutlined, UsergroupAddOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const RosterManagement = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [rosterData, setRosterData] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('week'));
  const [searchText, setSearchText] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkForm] = Form.useForm();
  const [bulkLoading, setBulkLoading] = useState(false);

  // Shift Rotation Modal States
  const [isRotationModalOpen, setIsRotationModalOpen] = useState(false);
  const [rotationActiveTab, setRotationActiveTab] = useState("1");
  const [rotationGroups, setRotationGroups] = useState([]);
  const [unassignedStaff, setUnassignedStaff] = useState([]);
  const [groupAStaff, setGroupAStaff] = useState([]);
  const [groupBStaff, setGroupBStaff] = useState([]);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const [runningRotation, setRunningRotation] = useState(false);
  
  // Rotation Rules Settings States
  const [groupAStartShift, setGroupAStartShift] = useState(undefined);
  const [groupAAltShift, setGroupAAltShift] = useState(undefined);
  const [groupBStartShift, setGroupBStartShift] = useState(undefined);
  const [groupBAltShift, setGroupBAltShift] = useState(undefined);
  const [cycleDays, setCycleDays] = useState(15);
  const [cycleStartType, setCycleStartType] = useState('FIRST_MONDAY_OF_MONTH');
  const [excludeWeeklyOff, setExcludeWeeklyOff] = useState(true);
  const [anchorDate, setAnchorDate] = useState(null);
  const [rotationRange, setRotationRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [staffResp, shiftsResp] = await Promise.all([
        api.get('/admin/roster/staff'),
        api.get('/admin/shifts/templates')
      ]);
      setStaff(staffResp.data?.staff || []);
      setShifts(shiftsResp.data?.templates || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      message.error('Failed to load staff or shifts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoster = useCallback(async () => {
    try {
      const startDate = currentWeekStart.format('YYYY-MM-DD');
      const endDate = currentWeekStart.add(6, 'day').format('YYYY-MM-DD');
      const resp = await api.get('/admin/roster', { params: { startDate, endDate } });
      setRosterData(resp.data?.roster || []);
    } catch (error) {
      console.error('Error fetching roster:', error);
      message.error('Failed to load roster data');
    }
  }, [currentWeekStart]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const fetchRotationData = async () => {
    try {
      setRotationLoading(true);
      const [groupsResp, rulesResp] = await Promise.all([
        api.get('/admin/shift-rotation/groups'),
        api.get('/admin/shift-rotation/rules')
      ]);

      const groups = groupsResp.data?.groups || [];
      const unassigned = groupsResp.data?.unassignedStaff || [];
      setRotationGroups(groups);
      setUnassignedStaff(unassigned);

      // Find Group A and Group B
      const gA = groups.find(g => g.name === 'Group A');
      const gB = groups.find(g => g.name === 'Group B');

      setGroupAStaff(gA?.staff?.map(s => s.id) || []);
      setGroupBStaff(gB?.staff?.map(s => s.id) || []);

      // Rules mapping
      const rules = rulesResp.data?.rules || [];

      const rA = rules.find(r => r.shiftRotationGroupId === gA?.id);
      const rB = rules.find(r => r.shiftRotationGroupId === gB?.id);

      if (rA) {
        setGroupAStartShift(rA.startShiftTemplateId);
        setGroupAAltShift(rA.alternateShiftTemplateId);
        setCycleDays(rA.cycleDays || 14);
        setCycleStartType(rA.cycleStartType || 'FIRST_MONDAY_OF_MONTH');
        setExcludeWeeklyOff(rA.excludeWeeklyOff !== undefined ? !!rA.excludeWeeklyOff : true);
        setAnchorDate(rA.anchorDate ? dayjs(rA.anchorDate) : null);
      }
      if (rB) {
        setGroupBStartShift(rB.startShiftTemplateId);
        setGroupBAltShift(rB.alternateShiftTemplateId);
      }
    } catch (error) {
      console.error('Error fetching rotation data:', error);
      message.error('Failed to load shift rotation configurations');
    } finally {
      setRotationLoading(false);
    }
  };

  const handleSaveGroups = async () => {
    try {
      setSavingGroups(true);
      const gA = rotationGroups.find(g => g.name === 'Group A');
      const gB = rotationGroups.find(g => g.name === 'Group B');

      if (!gA || !gB) {
        message.error('Group A or Group B not initialized on server');
        return;
      }

      // Assign to Group A
      await api.post('/admin/shift-rotation/groups/assign', {
        userIds: groupAStaff,
        shiftRotationGroupId: gA.id
      });

      // Assign to Group B
      await api.post('/admin/shift-rotation/groups/assign', {
        userIds: groupBStaff,
        shiftRotationGroupId: gB.id
      });

      // Clear any other staff assignments (unassigned)
      const allAssigned = [...groupAStaff, ...groupBStaff];
      const toClear = staff
        .filter(s => !allAssigned.includes(s.id) && s.shiftRotationGroupId)
        .map(s => s.id);

      if (toClear.length > 0) {
        await api.post('/admin/shift-rotation/groups/assign', {
          userIds: toClear,
          shiftRotationGroupId: null
        });
      }

      message.success('Group assignments saved successfully!');
      fetchRotationData();
    } catch (error) {
      console.error('Error saving groups:', error);
      message.error('Failed to save group assignments');
    } finally {
      setSavingGroups(false);
    }
  };

  const handleRunRotation = async () => {
    if (!groupAStartShift || !groupAAltShift || !groupBStartShift || !groupBAltShift) {
      message.warning('Please configure start and alternate shifts for both Group A and Group B');
      return;
    }
    if (!rotationRange || rotationRange.length !== 2) {
      message.warning('Please select a date range for shift rotation');
      return;
    }

    try {
      setRunningRotation(true);

      const gA = rotationGroups.find(g => g.name === 'Group A');
      const gB = rotationGroups.find(g => g.name === 'Group B');

      if (!gA || !gB) {
        message.error('Group A or Group B not found on server');
        return;
      }

      // 1. Save Group A rules
      await api.post('/admin/shift-rotation/rules', {
        shiftRotationGroupId: gA.id,
        startShiftTemplateId: groupAStartShift,
        alternateShiftTemplateId: groupAAltShift,
        cycleDays,
        cycleStartType,
        excludeWeeklyOff,
        anchorDate: anchorDate ? anchorDate.format('YYYY-MM-DD') : null,
        active: true
      });

      // 2. Save Group B rules
      await api.post('/admin/shift-rotation/rules', {
        shiftRotationGroupId: gB.id,
        startShiftTemplateId: groupBStartShift,
        alternateShiftTemplateId: groupBAltShift,
        cycleDays,
        cycleStartType,
        excludeWeeklyOff,
        anchorDate: anchorDate ? anchorDate.format('YYYY-MM-DD') : null,
        active: true
      });

      // 3. Generate roster shifts
      const startDate = rotationRange[0].format('YYYY-MM-DD');
      const endDate = rotationRange[1].format('YYYY-MM-DD');

      const genResp = await api.post('/admin/shift-rotation/generate', {
        startDate,
        endDate
      });

      message.success(genResp.data?.message || 'Shift rotation applied successfully!');
      setIsRotationModalOpen(false);
      fetchRoster();
    } catch (error) {
      console.error('Error running shift rotation:', error);
      message.error(error?.response?.data?.message || 'Failed to execute shift rotation pattern');
    } finally {
      setRunningRotation(false);
    }
  };

  const handleSaveRules = async () => {
    if (!groupAStartShift || !groupAAltShift || !groupBStartShift || !groupBAltShift) {
      message.warning('Please configure start and alternate shifts for both Group A and Group B');
      return;
    }

    try {
      setRunningRotation(true);

      const gA = rotationGroups.find(g => g.name === 'Group A');
      const gB = rotationGroups.find(g => g.name === 'Group B');

      if (!gA || !gB) {
        message.error('Group A or Group B not found on server');
        return;
      }

      // 1. Save Group A rules
      await api.post('/admin/shift-rotation/rules', {
        shiftRotationGroupId: gA.id,
        startShiftTemplateId: groupAStartShift,
        alternateShiftTemplateId: groupAAltShift,
        cycleDays,
        cycleStartType,
        excludeWeeklyOff,
        anchorDate: anchorDate ? anchorDate.format('YYYY-MM-DD') : null,
        active: true
      });

      // 2. Save Group B rules
      await api.post('/admin/shift-rotation/rules', {
        shiftRotationGroupId: gB.id,
        startShiftTemplateId: groupBStartShift,
        alternateShiftTemplateId: groupBAltShift,
        cycleDays,
        cycleStartType,
        excludeWeeklyOff,
        anchorDate: anchorDate ? anchorDate.format('YYYY-MM-DD') : null,
        active: true
      });

      message.success('Shift rotation rules saved successfully! The background job will execute them automatically.');
      setIsRotationModalOpen(false);
    } catch (error) {
      console.error('Error saving shift rotation rules:', error);
      message.error(error?.response?.data?.message || 'Failed to save shift rotation rules');
    } finally {
      setRunningRotation(false);
    }
  };

  useEffect(() => {
    if (isRotationModalOpen) {
      fetchRotationData();
      // Set default rotation range to current month
      setRotationRange([currentWeekStart.startOf('month'), currentWeekStart.endOf('month')]);
    }
  }, [isRotationModalOpen, currentWeekStart]);

  const handleWeekChange = (direction) => {
    setCurrentWeekStart(prev => direction === 'next' ? prev.add(7, 'day') : prev.subtract(7, 'day'));
  };

  const getDayLabel = (offset) => {
    const d = currentWeekStart.add(offset, 'day');
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{d.format('ddd')}</div>
        <div style={{ fontWeight: 'bold' }}>{d.format('DD MMM')}</div>
      </div>
    );
  };

  const getRosterEntry = (userId, date) => {
    return rosterData.find(r => r.userId === userId && r.date === date);
  };

  const updateRoster = async (userId, date, status, shiftTemplateId, forceHoliday = false, forceWeeklyOff = false) => {
    try {
      setSaving(userId);
      await api.post('/admin/roster', {
        assessments: [{ userId, date, status, shiftTemplateId }],
        forceHoliday,
        forceWeeklyOff
      });
      fetchRoster();
      message.success('Roster updated');
    } catch (error) {
      if (error?.response?.data?.isHolidayWarning) {
        Modal.confirm({
          title: 'Public Holiday Warning',
          content: error.response.data.message,
          okText: 'Continue',
          cancelText: 'Cancel',
          onOk: () => updateRoster(userId, date, status, shiftTemplateId, true, forceWeeklyOff)
        });
      } else if (error?.response?.data?.isWeeklyOffWarning) {
        Modal.confirm({
          title: 'Weekly Off Warning',
          content: error.response.data.message,
          okText: 'Continue',
          cancelText: 'Cancel',
          onOk: () => updateRoster(userId, date, status, shiftTemplateId, forceHoliday, true)
        });
      } else {
        message.error(error?.response?.data?.message || 'Failed to update roster');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async (values, forceHoliday = false, forceWeeklyOff = false) => {
    try {
      setBulkLoading(true);
      const { staffIds, dateRange, status, shiftTemplateId, selectedDays } = values;
      
      let dates = [];
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].startOf('day');
      let current = start;
      while (current.isBefore(end) || current.isSame(end)) {
        // Filter by day of week if selectedDays is provided
        if (selectedDays && selectedDays.length > 0) {
          if (selectedDays.includes(current.day())) {
            dates.push(current.format('YYYY-MM-DD'));
          }
        } else {
          dates.push(current.format('YYYY-MM-DD'));
        }
        current = current.add(1, 'day');
      }

      const assessments = [];
      for (const userId of staffIds) {
        for (const date of dates) {
          assessments.push({
            userId,
            date,
            status,
            shiftTemplateId: status === 'SHIFT' ? shiftTemplateId : null
          });
        }
      }

      if (assessments.length === 0) {
        message.warning('No dates matched the selection criteria');
        setBulkLoading(false);
        return;
      }

      const res = await api.post('/admin/roster', { assessments, isBulk: true, forceHoliday, forceWeeklyOff });
      if (res.data.success) {
        message.success(`Successfully updated roster for ${staffIds.length} staff over ${dates.length} days`);
        setIsBulkModalOpen(false);
        bulkForm.resetFields();
        fetchRoster();
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      if (error?.response?.data?.isHolidayWarning) {
        Modal.confirm({
          title: 'Public Holiday Warning',
          content: error.response.data.message,
          okText: 'Continue',
          cancelText: 'Cancel',
          onOk: () => handleBulkSave(values, true, forceWeeklyOff)
        });
      } else if (error?.response?.data?.isWeeklyOffWarning) {
        Modal.confirm({
          title: 'Weekly Off Warning',
          content: error.response.data.message,
          okText: 'Continue',
          cancelText: 'Cancel',
          onOk: () => handleBulkSave(values, forceHoliday, true)
        });
      } else {
        message.error(error?.response?.data?.message || 'Failed to perform bulk roster update');
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const renderCell = (userId, date) => {
    const entry = getRosterEntry(userId, date);
    const content = (
      <div style={{ width: '220px', padding: '4px' }}>
        <div style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
          <Text strong style={{ fontSize: '14px' }}>Assign Shift</Text>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{dayjs(date).format('dddd, DD MMMM')}</div>
        </div>
        
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>Shift Template</div>
            <Select 
              placeholder="Select Shift" 
              style={{ width: '100%' }}
              value={entry?.status === 'SHIFT' ? entry?.shiftTemplateId : undefined}
              onChange={(val) => updateRoster(userId, date, 'SHIFT', val)}
            >
              {shifts.map(s => (
                <Option key={s.id} value={s.id}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong style={{ fontSize: '13px' }}>{s.name}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>{s.startTime} - {s.endTime}</Text>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
          
          <Divider style={{ margin: '4px 0' }} />
          
          <Button 
            type={entry?.status === 'WEEKLY_OFF' ? 'primary' : 'default'} 
            block 
            icon={<CalendarOutlined />}
            onClick={() => updateRoster(userId, date, 'WEEKLY_OFF', null)}
          >
            Weekly Off
          </Button>
          
          {entry && (
            <Button 
              danger 
              type="text"
              block 
              style={{ marginTop: '8px' }}
              onClick={() => updateRoster(userId, date, 'DELETE', null)}
            >
              Clear Assignment
            </Button>
          )}
        </Space>
      </div>
    );

    let label = '-';
    let bg = '#f8fafc';
    let border = '1px dashed #cbd5e1';
    let color = '#94a3b8';
    let fontWeight = '500';

    if (entry) {
      if (entry.status === 'SHIFT') {
        const formatT = (t) => {
          if (!t) return '';
          const d = dayjs(`2000-01-01 ${t}`);
          return d.minute() === 0 ? d.format('h A') : d.format('h:mm A');
        };
        const startText = formatT(entry.shiftTemplate?.startTime);
        const endText = formatT(entry.shiftTemplate?.endTime);
        label = startText && endText ? `${startText} - ${endText}` : (entry.shiftTemplate?.name || 'Shift');
        
        bg = '#e6f7ff';
        border = '1px solid #91d5ff';
        color = '#1890ff';
        fontWeight = '600';
      } else if (entry.status === 'WEEKLY_OFF') {
        label = 'WEEKLY OFF';
        bg = '#fff7e6';
        border = '1px solid #ffd591';
        color = '#fa8c16';
        fontWeight = '600';
      } else if (entry.status === 'HOLIDAY') {
        label = 'HOLIDAY';
        bg = '#f9f0ff';
        border = '1px solid #d3adf7';
        color = '#722ed1';
        fontWeight = '600';
      }
    }

    return (
      <Popover content={content} trigger="click" placement="bottom">
        <div style={{ 
          cursor: 'pointer', 
          padding: '8px 10px', 
          textAlign: 'center', 
          background: bg,
          borderRadius: '10px',
          border: border,
          minHeight: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s',
          boxShadow: entry ? '0 2px 6px rgba(22, 119, 255, 0.05)' : 'none'
        }}>
          <span style={{ 
            margin: 0, 
            fontSize: '11px', 
            fontWeight: fontWeight, 
            color: color,
            textTransform: entry?.status && entry.status !== 'SHIFT' ? 'uppercase' : 'none',
            letterSpacing: entry?.status && entry.status !== 'SHIFT' ? '0.5px' : 'normal',
            whiteSpace: 'nowrap'
          }}>
            {label}
          </span>
        </div>
      </Popover>
    );
  };

  const columns = [
    {
      title: 'Staff Member',
      key: 'staff',
      fixed: 'left',
      width: 220,
      render: (text, record) => {
        const name = record.profile?.name || 'Unknown';
        return (
          <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <div style={{
              width: '36px',
              height: '36px',
              flexShrink: 0,
              borderRadius: '10px',
              backgroundColor: '#e6f7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              color: '#1677ff',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(22, 119, 255, 0.06)'
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: '600', color: '#1677ff', whiteSpace: 'nowrap' }}>{name}</div>
              {record.shiftTemplate && (
                <div style={{ fontSize: '11px', color: '#52c41a', marginTop: '1px', whiteSpace: 'nowrap' }}>
                  {(() => {
                    const formatT = (t) => {
                      if (!t) return '';
                      const d = dayjs(`2000-01-01 ${t}`);
                      return d.minute() === 0 ? d.format('h A') : d.format('h:mm A');
                    };
                    return `${formatT(record.shiftTemplate.startTime)} - ${formatT(record.shiftTemplate.endTime)}`;
                  })()}
                </div>
              )}
              {!record.shiftTemplate && (
                <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '1px', whiteSpace: 'nowrap' }}>No regular shift</div>
              )}
            </div>
          </div>
        );
      }
    },
    ...[0, 1, 2, 3, 4, 5, 6].map(offset => ({
      title: getDayLabel(offset),
      key: `day-${offset}`,
      width: 120,
      align: 'center',
      render: (_, record) => renderCell(record.id, currentWeekStart.add(offset, 'day').format('YYYY-MM-DD'))
    }))
  ];

  const filteredStaff = staff.filter(s => {
    const name = (s.profile?.name || s.phone || '').toLowerCase();
    return name.includes(searchText.toLowerCase());
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Roster Management" 
        />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Elegant Toolbar Card */}
            <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <Space size="middle">
                  <Input 
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
                    placeholder="Search staff..." 
                    style={{ width: 220, borderRadius: '20px' }} 
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                  />
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '2px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <Button type="text" shape="circle" icon={<LeftOutlined style={{ fontSize: '12px' }} />} onClick={() => handleWeekChange('prev')} />
                    <div style={{ padding: '0 12px', fontWeight: '700', minWidth: '180px', textAlign: 'center', fontSize: '13px', color: '#334155' }}>
                      {currentWeekStart.format('DD MMM')} - {currentWeekStart.add(6, 'day').format('DD MMM YYYY')}
                    </div>
                    <Button type="text" shape="circle" icon={<RightOutlined style={{ fontSize: '12px' }} />} onClick={() => handleWeekChange('next')} />
                  </div>
                  <DatePicker 
                    picker="week" 
                    value={currentWeekStart} 
                    onChange={val => val && setCurrentWeekStart(val.startOf('week'))}
                    allowClear={false}
                    style={{ borderRadius: '20px' }}
                  />
                </Space>
                <Space>
                  <Button 
                    type="primary" 
                    shape="round"
                    icon={<AppstoreAddOutlined />} 
                    onClick={() => setIsBulkModalOpen(true)}
                    style={{ background: '#52c41a', borderColor: '#52c41a', boxShadow: '0 2px 6px rgba(82, 196, 26, 0.15)' }}
                  >
                    Bulk Roster
                  </Button>
                  <Button 
                    type="primary" 
                    shape="round"
                    icon={<SyncOutlined />} 
                    onClick={() => setIsRotationModalOpen(true)}
                    style={{ background: '#722ed1', borderColor: '#722ed1', boxShadow: '0 2px 6px rgba(114, 46, 209, 0.15)' }}
                  >
                    Auto Rotate Shift
                  </Button>
                  <Button shape="round" icon={<SaveOutlined />} onClick={fetchRoster}>Refresh</Button>
                </Space>
              </div>
            </Card>

            {/* Elegant Table Card */}
            <Card className="sales-content-card" bodyStyle={{ padding: '24px' }}>
              <Table 
                columns={columns} 
                dataSource={filteredStaff} 
                rowKey="id" 
                loading={loading}
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 15, showSizeChanger: true }}
                style={{ borderRadius: '8px' }}
                className="sales-table"
                size="middle"
              />
            </Card>
          </Space>
        </Content>

        <Modal
          title={<Space><AppstoreAddOutlined /><span>Bulk Roster Assignment</span></Space>}
          open={isBulkModalOpen}
          onCancel={() => setIsBulkModalOpen(false)}
          onOk={() => bulkForm.submit()}
          confirmLoading={bulkLoading}
          width={600}
          okText="Apply Roster"
        >
          <Form 
            form={bulkForm} 
            layout="vertical" 
            onFinish={handleBulkSave}
            initialValues={{ 
              status: 'SHIFT',
              selectedDays: []
            }}
          >
            <Form.Item 
              name="staffIds" 
              label="Select Staff Members" 
              rules={[{ required: true, message: 'Please select at least one staff member' }]}
            >
              <Select 
                mode="multiple" 
                placeholder="Select employees" 
                optionFilterProp="children"
                maxTagCount="responsive"
              >
                {staff.map(s => (
                  <Option key={s.id} value={s.id}>{s.profile?.name || s.phone}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item 
              name="dateRange" 
              label="Select Date Range" 
              rules={[{ required: true, message: 'Please select a date range' }]}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item 
              name="selectedDays" 
              label="Apply to Specific Days" 
              rules={[{ required: true, message: 'Please select at least one day' }]}
            >
              <Checkbox.Group 
                options={[
                  { label: 'Mon', value: 1 },
                  { label: 'Tue', value: 2 },
                  { label: 'Wed', value: 3 },
                  { label: 'Thu', value: 4 },
                  { label: 'Fri', value: 5 },
                  { label: 'Sat', value: 6 },
                  { label: 'Sun', value: 0 },
                ]} 
              />
            </Form.Item>

            <Form.Item 
              name="status" 
              label="Roster Status" 
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="SHIFT">Assign Shift</Option>
                <Option value="WEEKLY_OFF">Weekly Off</Option>
                {/* <Option value="HOLIDAY">Holiday</Option> */}
                <Option value="DELETE">Clear Assignment</Option>
              </Select>
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
              {({ getFieldValue }) => getFieldValue('status') === 'SHIFT' ? (
                <Form.Item 
                  name="shiftTemplateId" 
                  label="Select Shift Template" 
                  rules={[{ required: true, message: 'Please select a shift' }]}
                >
                  <Select placeholder="Select a shift for all selected staff">
                    {shifts.map(s => (
                      <Option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null}
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={<Space style={{ color: '#722ed1' }}><SyncOutlined spin={rotationLoading} /><span>Auto Roster Rotation Settings</span></Space>}
          open={isRotationModalOpen}
          onCancel={() => setIsRotationModalOpen(false)}
          footer={null}
          width={700}
          bodyStyle={{ padding: '8px 24px 24px' }}
        >
          <Tabs activeKey={rotationActiveTab} onChange={setRotationActiveTab}>
            <Tabs.TabPane tab={<span><UsergroupAddOutlined />1. Staff Group Assignment</span>} key="1">
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                  <Text type="secondary">
                    Create your staff cohorts below. Assign employees to either <strong>Group A</strong> or <strong>Group B</strong>. Employees in opposite groups will automatically swap shift schedules at each cycle interval.
                  </Text>
                </div>
                
                <div>
                  <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>Group A Members</Text>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Search and assign staff to Group A"
                    value={groupAStaff}
                    onChange={(vals) => setGroupAStaff(vals)}
                    optionFilterProp="label"
                    loading={rotationLoading}
                  >
                    {staff
                      .filter(s => !groupBStaff.includes(s.id))
                      .map(s => (
                        <Option key={s.id} value={s.id} label={s.profile?.name || s.phone}>
                          {s.profile?.name || s.phone}
                        </Option>
                      ))
                    }
                  </Select>
                </div>

                <div>
                  <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>Group B Members</Text>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="Search and assign staff to Group B"
                    value={groupBStaff}
                    onChange={(vals) => setGroupBStaff(vals)}
                    optionFilterProp="label"
                    loading={rotationLoading}
                  >
                    {staff
                      .filter(s => !groupAStaff.includes(s.id))
                      .map(s => (
                        <Option key={s.id} value={s.id} label={s.profile?.name || s.phone}>
                          {s.profile?.name || s.phone}
                        </Option>
                      ))
                    }
                  </Select>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    type="primary" 
                    loading={savingGroups} 
                    onClick={handleSaveGroups} 
                    icon={<SaveOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Save Cohorts & Assignments
                  </Button>
                </div>
              </Space>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab={<span><SettingOutlined />2. Swapping Rules & Generation</span>} key="2">
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div style={{ background: '#f5f3ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                  <Text style={{ color: '#5b21b6' }}>
                    Configure the rotating swap shift patterns. The cycle interval swap logic propagates automatically based on your chosen starting shift templates.
                  </Text>
                </div>

                <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '16px', backgroundColor: '#fafafa' }}>
                  <Title level={5} style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#722ed1' }}>Shift Patterns Settings</Title>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Group A Starting Pattern</Text>
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Start Cycle Shift</Text>
                          <Select 
                            placeholder="Select Shift" 
                            style={{ width: '100%' }}
                            value={groupAStartShift}
                            onChange={setGroupAStartShift}
                          >
                            {shifts.map(s => (
                              <Option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</Option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Alternate Cycle Shift (Swap)</Text>
                          <Select 
                            placeholder="Select Shift" 
                            style={{ width: '100%' }}
                            value={groupAAltShift}
                            onChange={setGroupAAltShift}
                          >
                            {shifts.map(s => (
                              <Option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</Option>
                            ))}
                          </Select>
                        </div>
                      </Space>
                    </div>

                    <div>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Group B Starting Pattern</Text>
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Start Cycle Shift</Text>
                          <Select 
                            placeholder="Select Shift" 
                            style={{ width: '100%' }}
                            value={groupBStartShift}
                            onChange={setGroupBStartShift}
                          >
                            {shifts.map(s => (
                              <Option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</Option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>Alternate Cycle Shift (Swap)</Text>
                          <Select 
                            placeholder="Select Shift" 
                            style={{ width: '100%' }}
                            value={groupBAltShift}
                            onChange={setGroupBAltShift}
                          >
                            {shifts.map(s => (
                              <Option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</Option>
                            ))}
                          </Select>
                        </div>
                      </Space>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: '13px', display: 'block' }}>Swap Cycle</Text>
                    <InputNumber
                      min={1}
                      max={365}
                      value={cycleDays}
                      onChange={setCycleDays}
                      style={{ width: '100%', marginTop: '6px' }}
                      formatter={value => `${value} Days`}
                      parser={value => value.replace(' Days', '')}
                    />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: '13px', display: 'block' }}>Cycle Start Rule</Text>
                    <Select
                      value={cycleStartType}
                      onChange={setCycleStartType}
                      style={{ width: '100%', marginTop: '6px' }}
                    >
                      <Option value="FIRST_MONDAY_OF_MONTH">First Monday of Month</Option>
                      <Option value="SPECIFIC_DATE">Specific Start Date</Option>
                    </Select>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: '13px', display: 'block' }}>Weekly Off Action</Text>
                    <Select
                      value={excludeWeeklyOff}
                      onChange={setExcludeWeeklyOff}
                      style={{ width: '100%', marginTop: '6px' }}
                    >
                      <Option value={true}>Exclude Weekly Off</Option>
                      <Option value={false}>Include Weekly Off</Option>
                    </Select>
                  </div>
                  {cycleStartType === 'SPECIFIC_DATE' && (
                    <div>
                      <Text strong style={{ fontSize: '13px', display: 'block' }}>Anchor Date</Text>
                      <DatePicker
                        value={anchorDate}
                        onChange={setAnchorDate}
                        style={{ width: '100%', marginTop: '6px' }}
                        allowClear={false}
                      />
                    </div>
                  )}
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Roster Target Range & Execution</Text>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <RangePicker 
                      value={rotationRange} 
                      onChange={setRotationRange} 
                      style={{ flex: 1 }} 
                      allowClear={false}
                    />
                    <Button 
                      type="primary" 
                      loading={runningRotation} 
                      onClick={handleRunRotation} 
                      icon={<SyncOutlined />}
                      style={{ background: '#722ed1', borderColor: '#722ed1' }}
                    >
                      Run Swapping Pattern
                    </Button>
                  </div>
                </div>
              </Space>
            </Tabs.TabPane>
          </Tabs>
        </Modal>
      </Layout>
    </Layout>
  );
};

export default RosterManagement;
