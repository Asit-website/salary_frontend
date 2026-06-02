import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Typography, Card, Table, Button, Modal, Form, Input, InputNumber, Space, message, Tabs, Select, DatePicker, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SettingOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Text } = Typography;
const { Option } = Select;

const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function HolidayWorkPaySettings() {
  const navigate = useNavigate();
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

  const maxMultiplier = useMemo(() => {
    if (!rules.length) return '1.0x';
    const vals = rules.map(r => Math.max(r.holidayMultiplier || 1, r.weeklyOffMultiplier || 1));
    return `${Math.max(...vals)}x`;
  }, [rules]);

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
          userId: record.userId,
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
    { 
      title: 'Rule Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (text) => (
        <span style={{ fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>
          {text}
        </span>
      )
    },
    { 
      title: 'Holiday Multiplier', 
      dataIndex: 'holidayMultiplier', 
      key: 'holidayMultiplier', 
      render: (v) => (
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: '20px', 
          fontSize: '11px', 
          fontWeight: '700', 
          color: '#722ed1', 
          backgroundColor: '#722ed112', 
          border: '1px solid #722ed130',
          letterSpacing: '0.5px'
        }}>
          {v}x
        </span>
      ) 
    },
    { 
      title: 'Weekly Off Multiplier', 
      dataIndex: 'weeklyOffMultiplier', 
      key: 'weeklyOffMultiplier', 
      render: (v) => (
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: '20px', 
          fontSize: '11px', 
          fontWeight: '700', 
          color: '#52c41a', 
          backgroundColor: '#52c41a12', 
          border: '1px solid #52c41a30',
          letterSpacing: '0.5px'
        }}>
          {v}x
        </span>
      ) 
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={8}>
          <Button 
            shape="circle" 
            icon={<EditOutlined style={{ color: '#0958d9', fontSize: '13px' }} />} 
            onClick={() => handleEditRule(record)} 
            style={{ border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
          />
          <Popconfirm
            title="Delete Rule"
            description="Are you sure you want to delete this rule?"
            onConfirm={() => handleDeleteRule(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button 
              shape="circle" 
              danger 
              icon={<DeleteOutlined style={{ fontSize: '13px' }} />} 
              style={{ border: '1px solid #ffccc7', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            />
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
        const name = s ? (s.name || 'Unknown') : 'Unknown';
        const staffId = s ? (s.staffId || '') : '—';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(3, 105, 161, 0.08)'
            }}>
              {getInitials(name)}
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>{name}</div>
              {s?.staffId && <div style={{ fontSize: '10px', color: '#64748b' }}>Staff ID: {staffId}</div>}
            </div>
          </div>
        );
      }
    },
    { 
      title: 'Rule', 
      key: 'rule',
      render: (_, record) => {
        const ruleName = record.rule?.name || 'Unknown';
        return (
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: '6px', 
            fontSize: '11px', 
            fontWeight: '600', 
            color: '#475569', 
            backgroundColor: '#f1f5f9', 
            border: '1px solid #e2e8f0' 
          }}>
            {ruleName}
          </span>
        );
      }
    },
    { 
      title: 'Effective From', 
      dataIndex: 'effectiveFrom', 
      key: 'effectiveFrom',
      render: (v) => <span style={{ color: '#475569', fontWeight: '500', fontSize: '12px' }}>{v}</span>
    },
    { 
      title: 'Effective To', 
      dataIndex: 'effectiveTo', 
      key: 'effectiveTo', 
      render: (v) => v ? (
        <span style={{ color: '#475569', fontWeight: '500', fontSize: '12px' }}>{v}</span>
      ) : (
        <span style={{ 
          padding: '2px 8px', 
          borderRadius: '4px', 
          fontSize: '10px', 
          fontWeight: '700', 
          color: '#16a34a', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          letterSpacing: '0.5px'
        }}>
          ACTIVE
        </span>
      ) 
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={8}>
          <Button 
            shape="circle" 
            icon={<EditOutlined style={{ color: '#0958d9', fontSize: '13px' }} />} 
            onClick={() => handleEditAssign(record)} 
            style={{ border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
          />
          <Popconfirm
            title="Unassign Rule"
            description="Are you sure you want to unassign this rule from this staff?"
            onConfirm={() => handleDeleteAssign(record.id)}
            okText="Unassign"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button 
              shape="circle" 
              danger 
              icon={<DeleteOutlined style={{ fontSize: '13px' }} />} 
              style={{ border: '1px solid #ffccc7', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Holiday & Weekly Off Pay" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            {/* Toolbar Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/settings')}
                style={{ fontWeight: 600, color: '#475569' }}
                shape="round"
              >
                Back to Settings
              </Button>
            </div>

            {/* Content Tabs Card */}
            <Card className="sales-content-card" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} bodyStyle={{ padding: '24px' }}>
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                type="line"
                size="large"
                tabBarStyle={{ borderBottom: '1px solid #f1f5f9', marginBottom: '24px' }}
              >
                <Tabs.TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><SettingOutlined /> Pay Rules</span>} key="rules">
                  <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Define Pay Multipliers</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Set multiplier rates for staff working on holidays and weekly offs</div>
                    </div>
                    <Button 
                      type="primary" 
                      shape="round" 
                      icon={<PlusOutlined />} 
                      onClick={handleAddRule}
                      style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                    >
                      Add Rule
                    </Button>
                  </div>
                  <Table 
                    columns={ruleColumns} 
                    dataSource={rules} 
                    rowKey="id" 
                    loading={loading} 
                    pagination={{ pageSize: 10 }}
                    bordered={false}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><UserOutlined /> Staff Assignments</span>} key="assignments">
                  <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Active Staff Assignments</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Assign defined pay rules to staff members with specific start dates</div>
                    </div>
                    <Button 
                      type="primary" 
                      shape="round" 
                      icon={<PlusOutlined />} 
                      onClick={handleAddAssign}
                      style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                    >
                      Assign Staff
                    </Button>
                  </div>
                  <Table 
                    columns={assignColumns} 
                    dataSource={assignments} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    bordered={false}
                  />
                </Tabs.TabPane>
              </Tabs>
            </Card>
          </Space>
        </Content>
      </Layout>

      <Modal
        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{editingRule ? 'Edit Rule' : 'Add Rule'}</span>}
        open={ruleModalOpen}
        onCancel={() => setRuleModalOpen(false)}
        onOk={() => form.submit()}
        okText="Save"
        cancelButtonProps={{ shape: 'round' }}
        okButtonProps={{ shape: 'round' }}
        width={480}
      >
        <div style={{ paddingTop: '12px' }}>
          <Form form={form} layout="vertical" onFinish={handleSaveRule} initialValues={{ holidayMultiplier: 1, weeklyOffMultiplier: 1 }}>
            <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Rule Name</span>} rules={[{ required: true, message: 'Please input rule name' }]}>
              <Input placeholder="e.g. Double Pay Holiday" style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="holidayMultiplier" label={<span style={{ fontWeight: '600', color: '#475569' }}>Holiday Multiplier</span>} rules={[{ required: true }]}>
              <InputNumber min={1} max={5} step={0.5} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="weeklyOffMultiplier" label={<span style={{ fontWeight: '600', color: '#475569' }}>Weekly Off Multiplier</span>} rules={[{ required: true }]}>
              <InputNumber min={1} max={5} step={0.5} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      <Modal
        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{editingAssign ? 'Edit Assignment' : 'Assign Staff'}</span>}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={() => assignForm.submit()}
        okText={editingAssign ? 'Save' : 'Assign'}
        cancelButtonProps={{ shape: 'round' }}
        okButtonProps={{ shape: 'round' }}
        width={520}
      >
        <div style={{ paddingTop: '12px' }}>
          <Form form={assignForm} layout="vertical" onFinish={handleSaveAssign}>
            <Form.Item 
              name={editingAssign ? "userId" : "userIds"} 
              label={<span style={{ fontWeight: '600', color: '#475569' }}>{editingAssign ? "Select Staff" : "Select Staff (Multiple)"}</span>} 
              rules={[{ required: true, message: 'Please select staff' }]}
            >
              <Select 
                showSearch 
                placeholder="Search staff by name or ID" 
                optionFilterProp="children"
                mode={editingAssign ? undefined : "multiple"}
                style={{ borderRadius: '8px' }}
                dropdownRender={(menu) => (
                  <>
                    {!editingAssign && (
                      <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => {
                            const allIds = staff.map(s => s.id);
                            assignForm.setFieldsValue({ userIds: allIds });
                          }}
                          style={{ fontWeight: '600' }}
                        >
                          Select All
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => {
                            assignForm.setFieldsValue({ userIds: [] });
                          }}
                          style={{ fontWeight: '600', color: '#ef4444' }}
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
            <Form.Item name="ruleId" label={<span style={{ fontWeight: '600', color: '#475569' }}>Select Pay Rule</span>} rules={[{ required: true, message: 'Please select a pay rule' }]}>
              <Select placeholder="Select a rule" style={{ borderRadius: '8px' }}>
                {rules.map(r => (
                  <Option key={r.id} value={r.id}>{r.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="effectiveFrom" label={<span style={{ fontWeight: '600', color: '#475569' }}>Effective From</span>} rules={[{ required: true, message: 'Please select start date' }]}>
              <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="effectiveTo" label={<span style={{ fontWeight: '600', color: '#475569' }}>Effective To (Optional)</span>}>
              <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </Layout>
  );
}
