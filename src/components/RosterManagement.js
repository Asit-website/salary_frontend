import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Table, Button, DatePicker, Select, Input, Popover, message, Tag, Space, Breadcrumb, Card, Typography, Spin, Divider, Menu, Modal, Form, Checkbox } from 'antd';
import { LeftOutlined, RightOutlined, UserOutlined, SearchOutlined, CalendarOutlined, SaveOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
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

  const updateRoster = async (userId, date, status, shiftTemplateId) => {
    try {
      setSaving(userId);
      await api.post('/admin/roster', {
        assessments: [{ userId, date, status, shiftTemplateId }]
      });
      fetchRoster();
      message.success('Roster updated');
    } catch (error) {
      message.error('Failed to update roster');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async (values) => {
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

      const res = await api.post('/admin/roster', { assessments });
      if (res.data.success) {
        message.success(`Successfully updated roster for ${staffIds.length} staff over ${dates.length} days`);
        setIsBulkModalOpen(false);
        bulkForm.resetFields();
        fetchRoster();
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      message.error(error?.response?.data?.message || 'Failed to perform bulk roster update');
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
          <Button 
            type={entry?.status === 'HOLIDAY' ? 'primary' : 'default'} 
            block 
            icon={<CalendarOutlined />}
            onClick={() => updateRoster(userId, date, 'HOLIDAY', null)}
          >
            Holiday
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

    let tagColor = 'default';
    let label = '-';
    if (entry) {
      if (entry.status === 'SHIFT') {
        tagColor = 'blue';
        const startText = entry.shiftTemplate?.startTime ? dayjs(`2000-01-01 ${entry.shiftTemplate.startTime}`).format('h A') : '';
        const endText = entry.shiftTemplate?.endTime ? dayjs(`2000-01-01 ${entry.shiftTemplate.endTime}`).format('h A') : '';
        label = startText && endText ? `${startText} - ${endText}` : (entry.shiftTemplate?.name || 'Shift');
      } else if (entry.status === 'WEEKLY_OFF') {
        tagColor = 'orange';
        label = 'Off';
      } else if (entry.status === 'HOLIDAY') {
        tagColor = 'purple';
        label = 'Holiday';
      }
    }

    return (
      <Popover content={content} trigger="click" placement="bottom">
        <div style={{ 
          cursor: 'pointer', 
          padding: '8px', 
          textAlign: 'center', 
          background: entry ? '#f0f5ff' : 'transparent',
          borderRadius: '4px',
          border: '1px dashed #d9d9d9',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Tag color={tagColor} style={{ margin: 0 }}>{label}</Tag>
        </div>
      </Popover>
    );
  };

  const columns = [
    {
      title: 'Staff Member',
      dataIndex: 'name',
      key: 'staff',
      fixed: 'left',
      width: 200,
      render: (text, record) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: '600' }}>{record.profile?.name || 'Unknown'}</div>
            {record.shiftTemplate && (
              <div style={{ fontSize: '11px', color: '#52c41a' }}>
                {dayjs(`2000-01-01 ${record.shiftTemplate.startTime}`).format('h A')} - {dayjs(`2000-01-01 ${record.shiftTemplate.endTime}`).format('h A')}
              </div>
            )}
            {!record.shiftTemplate && (
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>No regular shift</div>
            )}
          </div>
        </Space>
      )
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
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Space size="large">
              <Title level={4} style={{ margin: 0 }}>Roster Management</Title>
              <Divider type="vertical" />
              <Breadcrumb>
                <Breadcrumb.Item>Staff Management</Breadcrumb.Item>
                <Breadcrumb.Item>Roster</Breadcrumb.Item>
              </Breadcrumb>
            </Space>
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

        <Content style={{ margin: '24px', background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card bodyStyle={{ padding: '16px' }} style={{ border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <Space size="middle">
                  <Input 
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
                    placeholder="Search staff..." 
                    style={{ width: 250 }} 
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                  />
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '4px', borderRadius: '6px' }}>
                    <Button type="text" icon={<LeftOutlined />} onClick={() => handleWeekChange('prev')} />
                    <div style={{ padding: '0 16px', fontWeight: 'bold', minWidth: '200px', textAlign: 'center' }}>
                      {currentWeekStart.format('DD MMM')} - {currentWeekStart.add(6, 'day').format('DD MMM YYYY')}
                    </div>
                    <Button type="text" icon={<RightOutlined />} onClick={() => handleWeekChange('next')} />
                  </div>
                  <DatePicker 
                    picker="week" 
                    value={currentWeekStart} 
                    onChange={val => val && setCurrentWeekStart(val.startOf('week'))}
                    allowClear={false}
                  />
                </Space>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<AppstoreAddOutlined />} 
                    onClick={() => setIsBulkModalOpen(true)}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Bulk Roster
                  </Button>
                  <Button icon={<SaveOutlined />} onClick={fetchRoster}>Refresh</Button>
                </Space>
              </div>
            </Card>

            <Table 
              columns={columns} 
              dataSource={filteredStaff} 
              rowKey="id" 
              loading={loading}
              bordered
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              style={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}
            />
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
                <Option value="HOLIDAY">Holiday</Option>
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
