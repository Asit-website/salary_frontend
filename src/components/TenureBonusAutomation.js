import { Layout, Typography, Card, Space, Form, Input, InputNumber, Switch, Button, message, DatePicker, Divider, Row, Col, Tabs, Table, Modal, Select, Popconfirm } from 'antd';
import { ThunderboltOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined, UserAddOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import React, { useState, useEffect } from 'react';
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

export default function TenureBonusAutomation() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    
    // State for Rule Templates
    const [rules, setRules] = useState([]);
    const [rulesLoading, setRulesLoading] = useState(false);
    const [ruleModalVisible, setRuleModalVisible] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [ruleForm] = Form.useForm();
    const [savingRule, setSavingRule] = useState(false);

    // State for Staff Assignments
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [assignForm] = Form.useForm();
    const [savingAssignment, setSavingAssignment] = useState(false);
    const [assignmentSearch, setAssignmentSearch] = useState('');

    useEffect(() => {
        fetchRules();
        fetchAssignments();
        fetchStaff();
    }, []);

    const fetchRules = async () => {
        setRulesLoading(true);
        try {
            const resp = await api.get('/admin/settings/bonus-rules');
            if (resp.data?.success) {
                setRules(resp.data.rules);
            }
        } catch (err) {
            message.error('Failed to load bonus rules');
        } finally {
            setRulesLoading(false);
        }
    };

    const fetchAssignments = async () => {
        setAssignmentsLoading(true);
        try {
            const resp = await api.get('/admin/settings/bonus-assignments');
            if (resp.data?.success) {
                setAssignments(resp.data.assignments);
            }
        } catch (err) {
            message.error('Failed to load bonus assignments');
        } finally {
            setAssignmentsLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const resp = await api.get('/admin/org/staff');
            if (resp.data?.success) {
                setStaffList(resp.data.staff || []);
            }
        } catch (err) {
            console.error('Failed to load staff list');
        }
    };

    const handleSaveRule = async (values) => {
        setSavingRule(true);
        try {
            const payload = {
                name: values.name,
                active: values.active,
                paymentMonth: values.paymentMonth.format('YYYY-MM'),
                config: values.config
            };

            let resp;
            if (editingRule) {
                resp = await api.put(`/admin/settings/bonus-rules/${editingRule.id}`, payload);
            } else {
                resp = await api.post('/admin/settings/bonus-rules', payload);
            }

            if (resp.data?.success) {
                message.success(`Bonus rule ${editingRule ? 'updated' : 'created'} successfully`);
                setRuleModalVisible(false);
                fetchRules();
            } else {
                message.error(resp.data?.message || 'Failed to save rule');
            }
        } catch (err) {
            message.error('Failed to save bonus rule');
        } finally {
            setSavingRule(false);
        }
    };

    const handleDeleteRule = async (id) => {
        try {
            const resp = await api.delete(`/admin/settings/bonus-rules/${id}`);
            if (resp.data?.success) {
                message.success('Bonus rule deleted');
                fetchRules();
            }
        } catch (err) {
            message.error('Failed to delete rule');
        }
    };

    const handleAssignBonus = async (values) => {
        setSavingAssignment(true);
        try {
            const payload = {
                userId: values.userId,
                tenureBonusRuleId: values.tenureBonusRuleId,
                effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
                effectiveTo: values.effectiveTo ? values.effectiveTo.format('YYYY-MM-DD') : null
            };

            const resp = await api.post('/admin/settings/bonus-assign', payload);
            if (resp.data?.success) {
                message.success('Bonus assigned successfully');
                setAssignModalVisible(false);
                fetchAssignments();
            } else {
                message.error(resp.data?.message || 'Failed to assign bonus');
            }
        } catch (err) {
            message.error('Failed to assign bonus');
        } finally {
            setSavingAssignment(false);
        }
    };

    const handleDeleteAssignment = async (id) => {
        try {
            const resp = await api.delete(`/admin/settings/bonus-assignments/${id}`);
            if (resp.data?.success) {
                message.success('Assignment removed');
                fetchAssignments();
            }
        } catch (err) {
            message.error('Failed to remove assignment');
        }
    };

    const openRuleModal = (rule = null) => {
        setEditingRule(rule);
        if (rule) {
            let config = rule.config;
            if (typeof config === 'string') {
                try { config = JSON.parse(config); } catch (e) { config = []; }
            }
            if (!Array.isArray(config) || config.length === 0) {
                config = [{ min: 0, max: 0, percent: 0 }];
            }

            ruleForm.setFieldsValue({
                name: rule.name,
                active: rule.active,
                paymentMonth: rule.paymentMonth ? dayjs(rule.paymentMonth, 'YYYY-MM') : dayjs(),
                config: config
            });
        } else {
            ruleForm.resetFields();
            ruleForm.setFieldsValue({ active: true, paymentMonth: dayjs(), config: [{ min: 1, max: 12, percent: 10 }] });
        }
        setRuleModalVisible(true);
    };

    const ruleColumns = [
        { 
            title: 'Rule Name', 
            dataIndex: 'name', 
            key: 'name', 
            render: (t) => <span style={{ fontWeight: '600', color: '#1e293b' }}>{t}</span> 
        },
        { 
            title: 'Payout Month', 
            dataIndex: 'paymentMonth', 
            key: 'month', 
            render: (m) => <span style={{ color: '#475569', fontWeight: '500' }}>{dayjs(m, 'YYYY-MM').format('MMMM YYYY')}</span> 
        },
        { 
            title: 'Status', 
            dataIndex: 'active', 
            key: 'active', 
            width: 140,
            render: (a) => a ? (
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: '#16a34a', 
                  backgroundColor: '#f0fdf4', 
                  border: '1px solid #bbf7d0',
                  letterSpacing: '0.5px'
                }}>
                  ACTIVE
                </span>
            ) : (
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: '#dc2626', 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca',
                  letterSpacing: '0.5px'
                }}>
                  INACTIVE
                </span>
            ) 
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space size={8}>
                    <Button 
                      shape="circle" 
                      icon={<EditOutlined style={{ color: '#0958d9', fontSize: '13px' }} />} 
                      onClick={() => openRuleModal(record)} 
                      style={{ border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                    />
                    <Popconfirm title="Delete this rule?" onConfirm={() => handleDeleteRule(record.id)}>
                        <Button 
                          shape="circle" 
                          danger 
                          icon={<DeleteOutlined style={{ fontSize: '13px' }} />} 
                          style={{ border: '1px solid #ffccc7', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const assignmentColumns = [
        { 
            title: 'Staff Member', 
            dataIndex: 'user', 
            key: 'staff', 
            render: (_, record) => {
                const u = record.user;
                const name = u?.profile?.name || u?.name || 'Unknown';
                const phone = u?.phone || '—';
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
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{phone}</div>
                    </div>
                  </div>
                );
            }
        },
        { 
            title: 'Assigned Rule', 
            dataIndex: ['rule', 'name'], 
            key: 'ruleName', 
            render: (t) => (
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: '#722ed1', 
                  backgroundColor: '#722ed112', 
                  border: '1px solid #722ed130' 
                }}>
                  {t}
                </span>
            )
        },
        { 
            title: 'Effective From', 
            dataIndex: 'effectiveFrom', 
            key: 'from', 
            render: (d) => <span style={{ color: '#475569', fontWeight: '500', fontSize: '12px' }}>{dayjs(d).format('DD MMM YYYY')}</span> 
        },
        { 
            title: 'Effective To', 
            dataIndex: 'effectiveTo', 
            key: 'to', 
            render: (d) => d ? (
                <span style={{ color: '#475569', fontWeight: '500', fontSize: '12px' }}>{dayjs(d).format('DD MMM YYYY')}</span>
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
                  ONGOING
                </span>
            ) 
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Popconfirm title="Remove this assignment?" onConfirm={() => handleDeleteAssignment(record.id)}>
                    <Button 
                      shape="circle" 
                      danger 
                      icon={<DeleteOutlined style={{ fontSize: '13px' }} />} 
                      style={{ border: '1px solid #ffccc7', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                    />
                </Popconfirm>
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
                <MainHeader 
                  collapsed={collapsed} 
                  setCollapsed={setCollapsed} 
                  title="Tenure Bonus Automation" 
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

                        {/* Content Card */}
                        <Card 
                          className="sales-content-card" 
                          style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
                          bodyStyle={{ padding: '24px' }}
                        >
                            <Tabs defaultActiveKey="1" className="custom-tabs">
                                <Tabs.TabPane 
                                    tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><ThunderboltOutlined /> Bonus Templates</span>} 
                                    key="1"
                                >
                                    <div style={{ paddingTop: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Bonus Templates</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Manage dynamic bonus rules based on employee seniority.</div>
                                            </div>
                                            <Button 
                                              type="primary" 
                                              shape="round"
                                              icon={<PlusOutlined />} 
                                              onClick={() => openRuleModal()}
                                              style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                                            >
                                                Create Rule Template
                                            </Button>
                                        </div>
                                        <Table 
                                            columns={ruleColumns} 
                                            dataSource={rules} 
                                            rowKey="id" 
                                            loading={rulesLoading}
                                            pagination={{ pageSize: 10 }}
                                            bordered={false}
                                        />
                                    </div>
                                </Tabs.TabPane>
                                <Tabs.TabPane 
                                    tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><UserAddOutlined /> Staff Assignments</span>} 
                                    key="2"
                                >
                                    <div style={{ paddingTop: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '12px' }}>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Active Staff Assignments</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Assign specific bonus rules to individual staff members.</div>
                                                </div>
                                                <Input
                                                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                                  placeholder="Search assigned staff..." 
                                                  allowClear 
                                                  style={{ width: 240, borderRadius: '20px' }} 
                                                  value={assignmentSearch}
                                                  onChange={e => setAssignmentSearch(e.target.value)}
                                                />
                                            </div>
                                            <Button 
                                              type="primary" 
                                              shape="round"
                                              icon={<PlusOutlined />} 
                                              onClick={() => setAssignModalVisible(true)}
                                              style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                                            >
                                                Assign Bonus Rule
                                            </Button>
                                        </div>
                                        <Table 
                                            columns={assignmentColumns} 
                                            dataSource={(assignments || []).filter(a => {
                                                if (!assignmentSearch) return true;
                                                const s = assignmentSearch.toLowerCase();
                                                const name = (a.user?.profile?.name || a.user?.name || '').toLowerCase();
                                                const phone = (a.user?.phone || '').toLowerCase();
                                                const ruleName = (a.rule?.name || '').toLowerCase();
                                                return name.includes(s) || phone.includes(s) || ruleName.includes(s);
                                            })}
                                            rowKey="id" 
                                            loading={assignmentsLoading}
                                            pagination={{ pageSize: 10 }}
                                            bordered={false}
                                        />
                                    </div>
                                </Tabs.TabPane>
                            </Tabs>
                        </Card>
                    </Space>

                    {/* Rule Modal */}
                    <Modal
                        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{editingRule ? 'Edit' : 'Create'} Bonus Template</span>}
                        open={ruleModalVisible}
                        onCancel={() => setRuleModalVisible(false)}
                        onOk={() => ruleForm.submit()}
                        width={700}
                        confirmLoading={savingRule}
                        okText={editingRule ? 'Update Template' : 'Create Template'}
                        cancelButtonProps={{ shape: 'round' }}
                        okButtonProps={{ shape: 'round' }}
                    >
                        <div style={{ paddingTop: '12px' }}>
                          <Form form={ruleForm} layout="vertical" onFinish={handleSaveRule}>
                              <Row gutter={16} style={{ display: 'flex', alignItems: 'center' }}>
                                  <Col span={16}>
                                      <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Template Name</span>} rules={[{ required: true, message: 'Template name is required' }]}>
                                          <Input placeholder="e.g. Diwali Bonus 2026, Seniority Reward" style={{ borderRadius: '8px' }} />
                                      </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                      <Form.Item name="active" label={<span style={{ fontWeight: '600', color: '#475569' }}>Status</span>} valuePropName="checked">
                                          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                                      </Form.Item>
                                  </Col>
                              </Row>
                              <Row gutter={16}>
                                  <Col span={24}>
                                      <Form.Item name="paymentMonth" label={<span style={{ fontWeight: '600', color: '#475569' }}>Payout Month</span>} rules={[{ required: true, message: 'Payout month is required' }]}>
                                          <DatePicker picker="month" format="MMMM YYYY" style={{ width: '100%', borderRadius: '8px' }} />
                                      </Form.Item>
                                  </Col>
                              </Row>

                              <Divider orientation="left" plain><span style={{ fontWeight: '600', color: '#475569' }}>Tenure Brackets</span></Divider>
                              <Form.List name="config">
                                  {(fields, { add, remove }) => (
                                      <>
                                          {fields.map(({ key, name, ...restField }, index) => (
                                              <Row key={key} gutter={16} align="bottom" style={{ marginBottom: 12, background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                  <Col span={7}>
                                                      <Form.Item {...restField} name={[name, 'min']} label={index === 0 ? <span style={{ fontSize: '11px', color: '#64748b' }}>Min (Months)</span> : ""} rules={[{ required: true }]}>
                                                          <InputNumber style={{ width: '100%', borderRadius: '8px' }} min={0} placeholder="0" />
                                                      </Form.Item>
                                                  </Col>
                                                  <Col span={7}>
                                                      <Form.Item {...restField} name={[name, 'max']} label={index === 0 ? <span style={{ fontSize: '11px', color: '#64748b' }}>Max (Months)</span> : ""} rules={[{ required: true }]}>
                                                          <InputNumber style={{ width: '100%', borderRadius: '8px' }} min={0} placeholder="24" />
                                                      </Form.Item>
                                                  </Col>
                                                  <Col span={7}>
                                                      <Form.Item {...restField} name={[name, 'percent']} label={index === 0 ? <span style={{ fontSize: '11px', color: '#64748b' }}>Bonus %</span> : ""} rules={[{ required: true }]}>
                                                          <InputNumber 
                                                              style={{ width: '100%', borderRadius: '8px' }} 
                                                              min={0} max={100} step={0.5} 
                                                              formatter={value => `${value}%`} 
                                                              parser={value => value.replace('%', '')} 
                                                          />
                                                      </Form.Item>
                                                  </Col>
                                                  <Col span={3} style={{ display: 'flex', justifyContent: 'flex-end', height: '32px', alignItems: 'center' }}>
                                                      <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                                  </Col>
                                              </Row>
                                          ))}
                                          <Button 
                                            type="dashed" 
                                            onClick={() => add()} 
                                            block 
                                            icon={<PlusOutlined />} 
                                            style={{ marginTop: 8, borderRadius: '8px' }}
                                          >
                                              Add Tenure Bracket
                                          </Button>
                                      </>
                                  )}
                              </Form.List>
                          </Form>
                        </div>
                    </Modal>

                    {/* Assignment Modal */}
                    <Modal
                        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>Assign Bonus Rule to Staff</span>}
                        open={assignModalVisible}
                        onCancel={() => setAssignModalVisible(false)}
                        onOk={() => assignForm.submit()}
                        confirmLoading={savingAssignment}
                        okText="Assign Rule"
                        cancelButtonProps={{ shape: 'round' }}
                        okButtonProps={{ shape: 'round' }}
                    >
                        <div style={{ paddingTop: '12px' }}>
                          <Form form={assignForm} layout="vertical" onFinish={handleAssignBonus}>
                              <Form.Item name="userId" label={<span style={{ fontWeight: '600', color: '#475569' }}>Select Staff Member</span>} rules={[{ required: true, message: 'Staff selection is required' }]}>
                                  <Select 
                                      showSearch 
                                      placeholder="Search staff by name or phone"
                                      optionFilterProp="children"
                                      style={{ borderRadius: '8px' }}
                                      filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                                  >
                                      {staffList.map(s => (
                                          <Option key={s.userId} value={s.userId}>
                                              {s.name} ({s.staffId || 'No ID'})
                                          </Option>
                                      ))}
                                  </Select>
                              </Form.Item>
                              <Form.Item name="tenureBonusRuleId" label={<span style={{ fontWeight: '600', color: '#475569' }}>Select Bonus Rule</span>} rules={[{ required: true, message: 'Bonus rule selection is required' }]}>
                                  <Select placeholder="Choose a rule template" style={{ borderRadius: '8px' }}>
                                      {rules.map(r => (
                                          <Option key={r.id} value={r.id} disabled={!r.active}>
                                              {r.name} ({dayjs(r.paymentMonth, 'YYYY-MM').format('MMM YYYY')})
                                          </Option>
                                      ))}
                                  </Select>
                              </Form.Item>
                              <Row gutter={16}>
                                  <Col span={12}>
                                      <Form.Item name="effectiveFrom" label={<span style={{ fontWeight: '600', color: '#475569' }}>Effective From</span>} rules={[{ required: true, message: 'Effective date is required' }]}>
                                          <DatePicker format="DD MMM YYYY" style={{ width: '100%', borderRadius: '8px' }} />
                                      </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                      <Form.Item name="effectiveTo" label={<span style={{ fontWeight: '600', color: '#475569' }}>Effective To (Optional)</span>}>
                                          <DatePicker format="DD MMM YYYY" style={{ width: '100%', borderRadius: '8px' }} />
                                      </Form.Item>
                                  </Col>
                              </Row>
                          </Form>
                        </div>
                    </Modal>

                </Content>
            </Layout>
        </Layout>
    );
}
