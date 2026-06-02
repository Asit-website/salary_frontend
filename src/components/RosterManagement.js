import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Table, Button, DatePicker, Select, Input, Popover, message, Space, Card, Typography, Modal, Form, Checkbox, Divider } from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined, CalendarOutlined, SaveOutlined, AppstoreAddOutlined } from '@ant-design/icons';
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

  const updateRoster = async (userId, date, status, shiftTemplateId, forceHoliday = false) => {
    try {
      setSaving(userId);
      await api.post('/admin/roster', {
        assessments: [{ userId, date, status, shiftTemplateId }],
        forceHoliday
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
          onOk: () => updateRoster(userId, date, status, shiftTemplateId, true)
        });
      } else {
        message.error(error?.response?.data?.message || 'Failed to update roster');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async (values, forceHoliday = false) => {
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

      const res = await api.post('/admin/roster', { assessments, isBulk: true, forceHoliday });
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
          onOk: () => handleBulkSave(values, true)
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
      </Layout>
    </Layout>
  );
};

export default RosterManagement;
