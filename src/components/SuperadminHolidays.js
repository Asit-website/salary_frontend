import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  message, Space, Card, Tag, Layout, Typography, Popconfirm, Row, Col, DatePicker, Divider, Menu
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const SuperadminHolidays = () => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/holidays');
      if (res.data.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (e) {
      message.error('Failed to load master holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      financialYear: null,
      holidays: []
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingTemplate(record);
    form.resetFields();
    let fyDayjs = null;
    if (record.financialYear) {
      const parts = record.financialYear.split('-');
      const startYear = parseInt(parts[0], 10);
      if (!isNaN(startYear)) {
        fyDayjs = dayjs().year(startYear);
      }
    }

    form.setFieldsValue({
      name: record.name,
      financialYear: fyDayjs,
      holidays: (record.holidays || []).map(h => ({
        name: h.name,
        date: dayjs(h.date),
        active: h.active !== false
      }))
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/superadmin/holidays/${id}`);
      message.success('Master holiday template deleted');
      fetchTemplates();
    } catch (e) {
      message.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const handleSubmit = async (values) => {
    try {
      let fyStr = null;
      if (values.financialYear) {
        const year = values.financialYear.year();
        const nextYearShort = (year + 1) % 100;
        const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
        fyStr = `${year}-${nextYearStr}`;
      }

      const payload = {
        name: values.name,
        financialYear: fyStr,
        holidays: (values.holidays || []).filter(Boolean).map(h => ({
          name: h.name,
          date: h.date?.format?.('YYYY-MM-DD'),
          active: h.active !== false
        }))
      };

      if (editingTemplate) {
        await api.put(`/superadmin/holidays/${editingTemplate.id}`, payload);
        message.success('Master holiday template updated');
      } else {
        await api.post('/superadmin/holidays', payload);
        message.success('Master holiday template created');
      }
      setIsModalVisible(false);
      fetchTemplates();
    } catch (e) {
      message.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const filteredTemplates = templates.filter(t => 
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.financialYear || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: '600', color: '#1e293b' }}>{text}</span>
    },
    {
      title: 'Financial Year',
      dataIndex: 'financialYear',
      key: 'financialYear',
      render: (fy) => <Tag color="blue" style={{ fontWeight: '600' }}>{fy}</Tag>
    },
    {
      title: 'Holidays Count',
      dataIndex: 'holidays',
      key: 'holidays',
      render: (hols) => <Tag color="purple">{(hols || []).length} Holidays</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <Tag color={active !== false ? 'green' : 'red'}>
          {active !== false ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            ghost 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)} 
            size="small"
            shape="round"
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this master holiday template?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
              shape="round"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', height: 64 }}>
          <Space size={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 40, height: 40 }}
            />
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>Superadmin Panel</Title>
          </Space>
          <Menu 
            theme="light" 
            mode="horizontal" 
            style={{ border: 'none' }}
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} 
          />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f8fafc', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>Master Holidays Setup</Title>
                <Text type="secondary">Define financial year-wise holiday lists that clients can choose and import.</Text>
              </div>
              <Button
                type="primary"
                shape="round"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
              >
                Create Master Template
              </Button>
            </div>

            <Card style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ marginBottom: 16 }}>
                <Input.Search
                  placeholder="Search templates by name or financial year..."
                  allowClear
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ maxWidth: 360, borderRadius: '20px' }}
                />
              </div>

              <Table
                loading={loading}
                columns={columns}
                dataSource={filteredTemplates}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </Space>
        </Content>

        <Modal
          title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{editingTemplate ? 'Edit Master Holiday Template' : 'Create Master Holiday Template'}</span>}
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          onOk={() => form.submit()}
          okText="Save"
          cancelButtonProps={{ shape: 'round' }}
          okButtonProps={{ shape: 'round' }}
          width={650}
        >
          <div style={{ paddingTop: '12px' }}>
            <Form layout="vertical" form={form} onFinish={handleSubmit}>
              <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Template Name</span>} rules={[{ required: true, message: 'Template name is required' }]}>
                <Input placeholder="e.g. Master Holidays 2026-27" style={{ borderRadius: '8px' }} />
              </Form.Item>

              <Form.Item name="financialYear" label={<span style={{ fontWeight: '600', color: '#475569' }}>Financial Year</span>} rules={[{ required: true, message: 'Financial year is required' }]}>
                <DatePicker 
                  picker="year" 
                  placeholder="Select Financial Year" 
                  style={{ width: '100%', borderRadius: '8px' }} 
                  format={(value) => {
                    if (!value) return '';
                    const year = value.year();
                    const nextYearShort = (year + 1) % 100;
                    const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
                    return `${year}-${nextYearStr}`;
                  }}
                />
              </Form.Item>

              <Divider orientation="left" plain><span style={{ fontWeight: '600', color: '#475569' }}>Holidays List</span></Divider>
              
              <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
                <Form.List name="holidays">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <Row key={key} gutter={12} align="middle" style={{ marginBottom: 12, background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <Col span={11}>
                            <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Holiday name required' }]} style={{ marginBottom: 0 }}>
                              <Input placeholder="Holiday Name" style={{ borderRadius: '8px' }} />
                            </Form.Item>
                          </Col>
                          <Col span={11}>
                            <Form.Item shouldUpdate={(prev, curr) => prev.financialYear !== curr.financialYear} style={{ marginBottom: 0 }}>
                              {() => {
                                const fyValue = form.getFieldValue('financialYear');
                                const defaultVal = fyValue ? dayjs().year(fyValue.year()).month(3).date(1) : undefined;
                                return (
                                  <Form.Item {...rest} name={[name, 'date']} rules={[{ required: true, message: 'Date required' }]} style={{ marginBottom: 0 }}>
                                    <DatePicker 
                                      style={{ width: '100%', borderRadius: '8px' }} 
                                      defaultPickerValue={defaultVal}
                                      disabledDate={(current) => {
                                        if (!current || !fyValue) return false;
                                        const year = fyValue.year();
                                        const startDate = dayjs().year(year).month(3).date(1).startOf('day');
                                        const endDate = dayjs().year(year + 1).month(2).date(31).endOf('day');
                                        return current.isBefore(startDate) || current.isAfter(endDate);
                                      }}
                                    />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                          </Col>
                          <Col span={2} style={{ display: 'flex', justifyContent: 'flex-end', height: '32px', alignItems: 'center' }}>
                            <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                          </Col>
                        </Row>
                      ))}
                      <Button
                        type="dashed"
                        block
                        onClick={() => add({ name: '', date: null })}
                        icon={<PlusOutlined />}
                        style={{ borderRadius: '8px', marginTop: '8px' }}
                      >
                        Add Holiday Date
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </Layout>
    </Layout>
  );
};

export default SuperadminHolidays;
