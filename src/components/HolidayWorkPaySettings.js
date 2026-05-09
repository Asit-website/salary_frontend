import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Table, Button, Modal, Form, Input, InputNumber, Space, message, Tabs, Select, DatePicker, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function HolidayWorkPaySettings() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingAssign, setEditingAssign] = useState(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rules') {
        const res = await api.get('/admin/holiday-work-pay/rules');
        setRules(res.data.data);
      } else {
        const [resAsg, resStaff, resRules] = await Promise.all([
          api.get('/admin/holiday-work-pay/assignments'),
          api.get('/admin/staff'),
          api.get('/admin/holiday-work-pay/rules')
        ]);
        setAssignments(resAsg.data.data);
        setStaff(resStaff.data.data || []);
        setRules(resRules.data.data);
      }
    } catch (error) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    form.resetFields();
    setRuleModalOpen(true);
  };

  const handleEditRule = (record) => {
    setEditingRule(record);
    form.setFieldsValue(record);
    setRuleModalOpen(true);
  };

  const handleDeleteRule = async (id) => {
    try {
      await api.delete(`/admin/holiday-work-pay/rules/${id}`);
      message.success('Rule deleted');
      fetchData();
    } catch (error) {
      message.error('Failed to delete rule');
    }
  };

  const handleSaveRule = async (values) => {
    try {
      if (editingRule) {
        await api.put(`/admin/holiday-work-pay/rules/${editingRule.id}`, values);
        message.success('Rule updated');
      } else {
        await api.post('/admin/holiday-work-pay/rules', values);
        message.success('Rule created');
      }
      setRuleModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('Failed to save rule');
    }
  };

  const handleAddAssign = () => {
    setEditingAssign(null);
    assignForm.resetFields();
    setAssignModalOpen(true);
  };

  const handleEditAssign = (record) => {
      setEditingAssign(record);
      assignForm.setFieldsValue({
          ...record,
          userId: record.userId, // For editing it's a single value
          effectiveFrom: record.effectiveFrom ? dayjs(record.effectiveFrom) : null,
          effectiveTo: record.effectiveTo ? dayjs(record.effectiveTo) : null,
      });
      setAssignModalOpen(true);
  };

  const handleDeleteAssign = async (id) => {
      try {
          await api.delete(`/admin/holiday-work-pay/assignments/${id}`);
          message.success('Assignment deleted');
          fetchData();
      } catch (error) {
          message.error('Failed to delete assignment');
      }
  };

  const handleSaveAssign = async (values) => {
    try {
      if (editingAssign) {
        const payload = {
          ...values,
          effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
          effectiveTo: values.effectiveTo ? values.effectiveTo.format('YYYY-MM-DD') : null,
        };
        await api.put(`/admin/holiday-work-pay/assignments/${editingAssign.id}`, payload);
        message.success('Assignment updated');
      } else {
        const payload = {
          userIds: values.userIds,
          ruleId: values.ruleId,
          effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
          effectiveTo: values.effectiveTo ? values.effectiveTo.format('YYYY-MM-DD') : null,
        };
        await api.post('/admin/holiday-work-pay/assignments', payload);
        message.success('Assignments created');
      }
      setAssignModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('Failed to save assignment');
    }
  };

  const ruleColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Holiday Multiplier', dataIndex: 'holidayMultiplier', key: 'holidayMultiplier', render: (v) => `${v}x` },
    { title: 'Weekly Off Multiplier', dataIndex: 'weeklyOffMultiplier', key: 'weeklyOffMultiplier', render: (v) => `${v}x` },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditRule(record)} />
          <Popconfirm
            title="Delete Rule"
            description="Are you sure you want to delete this rule?"
            onConfirm={() => handleDeleteRule(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const assignColumns = [
    { 
      title: 'Staff', 
      key: 'staff',
      render: (_, record) => {
        const s = staff.find(st => Number(st.id) === Number(record.userId));
        return s ? `${s.name || 'Unknown'} (${s.staffId || ''})` : 'Unknown';
      }
    },
    { 
      title: 'Rule', 
      key: 'rule',
      render: (_, record) => record.rule?.name || 'Unknown'
    },
    { title: 'Effective From', dataIndex: 'effectiveFrom', key: 'effectiveFrom' },
    { title: 'Effective To', dataIndex: 'effectiveTo', key: 'effectiveTo', render: (v) => v || 'Current' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditAssign(record)} />
          <Popconfirm
            title="Unassign Rule"
            description="Are you sure you want to unassign this rule from this staff?"
            onConfirm={() => handleDeleteAssign(record.id)}
            okText="Unassign"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger>Unassign</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, background: '#f5f7fb', minHeight: '100vh' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Holiday/Weekly off Work Pay Rules" 
        />
        <Content style={{ padding: 24 }}>
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <Tabs.TabPane tab={<span><SettingOutlined /> Rules</span>} key="rules">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRule}>Add Rule</Button>
                </div>
                <Table 
                  columns={ruleColumns} 
                  dataSource={rules} 
                  rowKey="id" 
                  loading={loading} 
                  pagination={{ pageSize: 10 }}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab={<span><UserOutlined /> Assignments</span>} key="assignments">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAssign}>Assign Staff</Button>
                </div>
                <Table 
                  columns={assignColumns} 
                  dataSource={assignments} 
                  rowKey="id" 
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </Content>
      </Layout>

      <Modal
        title={editingRule ? 'Edit Rule' : 'Add Rule'}
        open={ruleModalOpen}
        onCancel={() => setRuleModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveRule} initialValues={{ holidayMultiplier: 1, weeklyOffMultiplier: 1 }}>
          <Form.Item name="name" label="Rule Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Double Pay Holiday" />
          </Form.Item>
          <Form.Item name="holidayMultiplier" label="Holiday Multiplier" rules={[{ required: true }]}>
            <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="weeklyOffMultiplier" label="Weekly Off Multiplier" rules={[{ required: true }]}>
            <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingAssign ? 'Edit Assignment' : 'Assign Staff'}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={() => assignForm.submit()}
      >
        <Form form={assignForm} layout="vertical" onFinish={handleSaveAssign}>
          <Form.Item 
            name={editingAssign ? "userId" : "userIds"} 
            label={editingAssign ? "Select Staff" : "Select Staff (Multiple)"} 
            rules={[{ required: true, message: 'Please select staff' }]}
          >
            <Select 
              showSearch 
              placeholder="Search staff" 
              optionFilterProp="children"
              mode={editingAssign ? undefined : "multiple"}
              dropdownRender={(menu) => (
                <>
                  {!editingAssign && (
                    <div style={{ padding: '8px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between' }}>
                      <Button 
                        type="link" 
                        size="small" 
                        onClick={() => {
                          const allIds = staff.map(s => s.id);
                          assignForm.setFieldsValue({ userIds: allIds });
                        }}
                      >
                        Select All
                      </Button>
                      <Button 
                        type="link" 
                        size="small" 
                        onClick={() => {
                          assignForm.setFieldsValue({ userIds: [] });
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                  {menu}
                </>
              )}
            >
              {staff.map(s => (
                <Option key={s.id} value={s.id}>
                  {s.name || 'Unknown'} ({s.staffId || ''})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="ruleId" label="Select Rule" rules={[{ required: true }]}>
            <Select placeholder="Select a rule">
              {rules.map(r => (
                <Option key={r.id} value={r.id}>{r.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Effective From" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="effectiveTo" label="Effective To (Optional)">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
