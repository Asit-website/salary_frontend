import { Layout, Typography, Card, Space, Form, Input, InputNumber, Switch, Button, message, DatePicker, Divider, Row, Col, Breadcrumb, Tabs, Table, Modal, Select, Popconfirm, Tag } from 'antd';
import { HomeOutlined, ThunderboltOutlined, SaveOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import React, { useState, useEffect } from 'react';
import api from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

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
            // Ensure config is an array and has at least one item
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
        { title: 'Rule Name', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t}</Text> },
        { title: 'Payout Month', dataIndex: 'paymentMonth', key: 'month', render: (m) => dayjs(m, 'YYYY-MM').format('MMMM YYYY') },
        { title: 'Status', dataIndex: 'active', key: 'active', render: (a) => <Tag color={a ? 'green' : 'orange'}>{a ? 'ACTIVE' : 'INACTIVE'}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => openRuleModal(record)}>Edit</Button>
                    <Popconfirm title="Delete this rule?" onConfirm={() => handleDeleteRule(record.id)}>
                        <Button danger icon={<DeleteOutlined />} />
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
            render: (u) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{u?.profile?.name || u?.name || 'Unknown'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{u?.phone}</Text>
                </Space>
            )
        },
        { title: 'Assigned Rule', dataIndex: ['rule', 'name'], key: 'ruleName', render: (t) => <Tag color="purple">{t}</Tag> },
        { title: 'Effective From', dataIndex: 'effectiveFrom', key: 'from', render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'Effective To', dataIndex: 'effectiveTo', key: 'to', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : 'Till Date' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Popconfirm title="Remove this assignment?" onConfirm={() => handleDeleteAssignment(record.id)}>
                    <Button danger icon={<DeleteOutlined />}>Remove</Button>
                </Popconfirm>
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, background: '#f5f7fb' }}>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                        <ArrowLeftOutlined onClick={() => navigate('/settings')} style={{ cursor: 'pointer', fontSize: 18 }} />
                        <Title level={4} style={{ margin: 0 }}>Tenure-based Bonus Automation</Title>
                    </Space>
                </Header>

                <Content style={{ padding: '24px' }}>
                    <Breadcrumb style={{ marginBottom: 16 }}>
                        <Breadcrumb.Item onClick={() => navigate('/dashboard')}><HomeOutlined /></Breadcrumb.Item>
                        <Breadcrumb.Item onClick={() => navigate('/settings')}>Settings</Breadcrumb.Item>
                        <Breadcrumb.Item>Tenure Bonus Rules</Breadcrumb.Item>
                    </Breadcrumb>

                    <Card bodyStyle={{ padding: 0 }}>
                        <Tabs defaultActiveKey="1" className="custom-tabs" style={{ padding: '0 24px' }}>
                            <TabPane 
                                tab={<span><ThunderboltOutlined /> Bonus Templates</span>} 
                                key="1"
                            >
                                <div style={{ padding: '24px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <Text type="secondary">Manage dynamic bonus rules based on employee seniority.</Text>
                                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openRuleModal()}>
                                            Create Rule Template
                                        </Button>
                                    </div>
                                    <Table 
                                        columns={ruleColumns} 
                                        dataSource={rules} 
                                        rowKey="id" 
                                        loading={rulesLoading}
                                        pagination={{ pageSize: 10 }}
                                    />
                                </div>
                            </TabPane>
                            <TabPane 
                                tab={<span><UserAddOutlined /> Staff Assignments</span>} 
                                key="2"
                            >
                                <div style={{ padding: '24px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <Text type="secondary">Assign specific bonus rules to individual staff members.</Text>
                                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignModalVisible(true)}>
                                            Assign Bonus Rule
                                        </Button>
                                    </div>
                                    <Table 
                                        columns={assignmentColumns} 
                                        dataSource={assignments} 
                                        rowKey="id" 
                                        loading={assignmentsLoading}
                                        pagination={{ pageSize: 10 }}
                                    />
                                </div>
                            </TabPane>
                        </Tabs>
                    </Card>

                    {/* Rule Modal */}
                    <Modal
                        title={`${editingRule ? 'Edit' : 'Create'} Bonus Template`}
                        visible={ruleModalVisible}
                        onCancel={() => setRuleModalVisible(false)}
                        onOk={() => ruleForm.submit()}
                        width={700}
                        confirmLoading={savingRule}
                        okText={editingRule ? 'Update Template' : 'Create Template'}
                    >
                        <Form form={ruleForm} layout="vertical" onFinish={handleSaveRule}>
                            <Row gutter={16}>
                                <Col span={16}>
                                    <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
                                        <Input placeholder="e.g. Diwali Bonus 2026, Seniority Reward" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item name="active" label="Status" valuePropName="checked">
                                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item name="paymentMonth" label="Payout Month" rules={[{ required: true }]}>
                                        <DatePicker picker="month" format="MMMM YYYY" style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left" plain>Tenure Brackets</Divider>
                            <Form.List name="config">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }, index) => (
                                            <Row key={key} gutter={16} align="bottom" style={{ marginBottom: 12, background: '#f9f9f9', padding: '12px', borderRadius: 8 }}>
                                                <Col span={7}>
                                                    <Form.Item {...restField} name={[name, 'min']} label={index === 0 ? "Min (Months)" : ""} rules={[{ required: true }]}>
                                                        <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={7}>
                                                    <Form.Item {...restField} name={[name, 'max']} label={index === 0 ? "Max (Months)" : ""} rules={[{ required: true }]}>
                                                        <InputNumber style={{ width: '100%' }} min={0} placeholder="24" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={7}>
                                                    <Form.Item {...restField} name={[name, 'percent']} label={index === 0 ? "Bonus %" : ""} rules={[{ required: true }]}>
                                                        <InputNumber 
                                                            style={{ width: '100%' }} 
                                                            min={0} max={100} step={0.5} 
                                                            formatter={value => `${value}%`} 
                                                            parser={value => value.replace('%', '')} 
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={3}>
                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                                </Col>
                                            </Row>
                                        ))}
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                                            Add Bracket
                                        </Button>
                                    </>
                                )}
                            </Form.List>
                        </Form>
                    </Modal>

                    {/* Assignment Modal */}
                    <Modal
                        title="Assign Bonus Rule to Staff"
                        visible={assignModalVisible}
                        onCancel={() => setAssignModalVisible(false)}
                        onOk={() => assignForm.submit()}
                        confirmLoading={savingAssignment}
                        okText="Assign Rule"
                    >
                        <Form form={assignForm} layout="vertical" onFinish={handleAssignBonus}>
                            <Form.Item name="userId" label="Select Staff Member" rules={[{ required: true }]}>
                                <Select 
                                    showSearch 
                                    placeholder="Search staff by name or phone"
                                    optionFilterProp="children"
                                    filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                                >
                                    {staffList.map(s => (
                                        <Option key={s.userId} value={s.userId}>
                                            {s.name} ({s.staffId || 'No ID'})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item name="tenureBonusRuleId" label="Select Bonus Rule" rules={[{ required: true }]}>
                                <Select placeholder="Choose a rule template">
                                    {rules.map(r => (
                                        <Option key={r.id} value={r.id} disabled={!r.active}>
                                            {r.name} ({dayjs(r.paymentMonth, 'YYYY-MM').format('MMM YYYY')})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="effectiveFrom" label="Effective From" rules={[{ required: true }]}>
                                        <DatePicker format="DD MMM YYYY" style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="effectiveTo" label="Effective To (Optional)">
                                        <DatePicker format="DD MMM YYYY" style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>
                    </Modal>

                </Content>
            </Layout>
        </Layout>
    );
}
