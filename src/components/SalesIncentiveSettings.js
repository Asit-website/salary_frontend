import React, { useEffect, useState } from 'react';
import {
    Layout,
    Card,
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    Switch,
    Space,
    Tag,
    message,
    Typography,
    Tabs,
    Popconfirm,
    Menu,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    LogoutOutlined,
    SettingOutlined,
    UserOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function SalesIncentiveSettings() {
    const navigate = useNavigate();
    const [rules, setRules] = useState([]);
    const [staff, setStaff] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [loadingRules, setLoadingRules] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [loadingApprovals, setLoadingApprovals] = useState(false);
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();
    const [bulkAssignForm] = Form.useForm();
    const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
    const [ruleType, setRuleType] = useState('fixed');

    const loadRules = async () => {
        try {
            setLoadingRules(true);
            const resp = await api.get('/admin/sales-incentives');
            if (resp.data.success) setRules(resp.data.rules);
        } catch (e) {
            message.error('Failed to load rules');
        } finally {
            setLoadingRules(false);
        }
    };

    const loadStaff = async () => {
        try {
            setLoadingStaff(true);
            const resp = await api.get('/admin/sales-incentives/assignments');
            if (resp.data.success) setStaff(resp.data.staff);
        } catch (e) {
            message.error('Failed to load staff assignments');
        } finally {
            setLoadingStaff(false);
        }
    };

    const loadApprovals = async () => {
        try {
            setLoadingApprovals(true);
            const resp = await api.get('/admin/sales-incentives/approvals');
            if (resp.data.success) setApprovals(resp.data.approvals);
        } catch (e) {
            message.error('Failed to load approvals');
        } finally {
            setLoadingApprovals(false);
        }
    };

    useEffect(() => {
        loadRules();
        loadStaff();
        loadApprovals();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const openCreateRule = () => {
        setEditingRule(null);
        setRuleType('fixed');
        form.resetFields();
        form.setFieldsValue({ ruleType: 'fixed', active: true, config: { targetAmount: 0, incentiveType: 'fixed', incentiveAmount: 0 } });
        setRuleModalOpen(true);
    };

    const openEditRule = (rule) => {
        setEditingRule(rule);
        setRuleType(rule.ruleType);
        form.setFieldsValue({
            name: rule.name,
            ruleType: rule.ruleType,
            active: rule.active,
            config: {
                incentiveType: 'fixed',
                ...(rule.config || {})
            },
        });
        setRuleModalOpen(true);
    };

    const submitRule = async () => {
        try {
            setSaving(true);
            const values = await form.validateFields();
            const payload = { ...values, active: values.active !== false };
            if (editingRule) {
                await api.put(`/admin/sales-incentives/${editingRule.id}`, payload);
                message.success('Rule updated');
            } else {
                await api.post('/admin/sales-incentives', payload);
                message.success('Rule created');
            }
            setRuleModalOpen(false);
            loadRules();
        } catch (e) {
            message.error(e?.response?.data?.message || 'Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    const deleteRule = async (id) => {
        try {
            await api.delete(`/admin/sales-incentives/${id}`);
            message.success('Rule deleted');
            loadRules();
        } catch (e) {
            message.error('Failed to delete rule');
        }
    };

    const handleUpdateApprovalStatus = async (id, status, remarks) => {
        try {
            await api.put(`/admin/sales-incentives/approvals/${id}`, { status, remarks });
            message.success(`Incentive ${status}`);
            loadApprovals();
        } catch (e) {
            message.error('Failed to update status');
        }
    };

    const handleUpdateIncentiveAmount = async (id, amount) => {
        try {
            await api.put(`/admin/sales-incentives/approvals/${id}`, { incentiveAmount: amount });
            message.success('Amount updated');
            loadApprovals();
        } catch (e) {
            message.error('Failed to update amount');
        }
    };

    const openAssign = (staffRow) => {
        setSelectedStaff(staffRow);
        assignForm.setFieldsValue({
            ruleIds: (staffRow.assignedRules || []).map((r) => r.id),
        });
        setAssignModalOpen(true);
    };

    const submitAssign = async () => {
        try {
            setSaving(true);
            const values = await assignForm.validateFields();
            await api.post('/admin/sales-incentives/assignments', {
                userId: selectedStaff.id,
                ruleIds: values.ruleIds,
            });
            message.success('Assignments updated');
            setAssignModalOpen(false);
            loadStaff();
        } catch (e) {
            message.error('Failed to update assignments');
        } finally {
            setSaving(false);
        }
    };

    const openBulkAssign = () => {
        bulkAssignForm.resetFields();
        setBulkAssignModalOpen(true);
    };

    const submitBulkAssign = async () => {
        try {
            setSaving(true);
            const values = await bulkAssignForm.validateFields();
            await api.post('/admin/sales-incentives/assignments/bulk', {
                ruleIds: values.ruleIds,
            });
            message.success('Bulk assignments updated');
            setBulkAssignModalOpen(false);
            loadStaff();
        } catch (e) {
            message.error('Failed to update bulk assignments');
        } finally {
            setSaving(false);
        }
    };

    const ruleColumns = [
        { title: 'Rule Name', dataIndex: 'name', key: 'name' },
        {
            title: 'Type',
            dataIndex: 'ruleType',
            key: 'ruleType',
            render: (t) => {
                const labels = { fixed: 'Fixed Amount', value_slab: 'Value Slabs', unit_slab: 'Unit Slabs' };
                return labels[t] || t;
            },
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => openEditRule(row)}>Edit</Button>
                    <Popconfirm
                        title="Delete Rule"
                        description="Are you sure you want to delete this rule?"
                        onConfirm={() => deleteRule(row.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button danger icon={<DeleteOutlined />}>Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const approvalColumns = [
        {
            title: 'Staff Member',
            key: 'staff',
            render: (_, record) => record.staff?.profile?.name || record.staff?.phone || 'Unknown'
        },
        {
            title: 'Rule',
            dataIndex: ['rule', 'name'],
            key: 'rule'
        },
        {
            title: 'Achieved',
            dataIndex: 'achievedAmount',
            key: 'achieved',
            render: (v) => `Rs ${v}`
        },
        {
            title: 'Incentive',
            key: 'incentive',
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Rs</span>
                    <InputNumber
                        size="small"
                        value={record.incentiveAmount}
                        style={{ width: 100 }}
                        onChange={(v) => handleUpdateIncentiveAmount(record.id, v)}
                        disabled={record.status !== 'pending'}
                    />
                </div>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (v) => {
                const colors = { pending: 'orange', approved: 'green', rejected: 'red' };
                return <Tag color={colors[v]}>{v.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'date',
            render: (v) => new Date(v).toLocaleDateString()
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                record.status === 'pending' && (
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => handleUpdateApprovalStatus(record.id, 'approved')}
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        >
                            Approve
                        </Button>
                        <Button
                            danger
                            size="small"
                            onClick={() => handleUpdateApprovalStatus(record.id, 'rejected')}
                        >
                            Reject
                        </Button>
                    </Space>
                )
            )
        }
    ];

    const staffColumns = [
        { title: 'Staff Name', dataIndex: 'name', key: 'name' },
        { title: 'Phone', dataIndex: 'phone', key: 'phone' },
        {
            title: 'Assigned Rules',
            dataIndex: 'assignedRules',
            key: 'assignedRules',
            render: (rules) => (
                <Space wrap>
                    {(rules || []).map((r) => (
                        <Tag key={r.id} color="blue">{r.name}</Tag>
                    ))}
                    {(rules || []).length === 0 && <Text type="secondary">None</Text>}
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Button icon={<UserOutlined />} onClick={() => openAssign(row)}>Assign Rules</Button>
            ),
        },
    ];

    const renderConfigFields = () => {
        if (ruleType === 'fixed') {
            return (
                <>
                    <Form.Item label="Sales Amount Threshold (Rs)" name={['config', 'targetAmount']} rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>

                    <Form.Item label="Incentive Calculation Type" name={['config', 'incentiveType']} rules={[{ required: true }]}>
                        <Select placeholder="Select type">
                            <Option value="fixed">Fixed Amount (Rs)</Option>
                            <Option value="percentage">Percentage (%)</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.config?.incentiveType !== currentValues.config?.incentiveType}
                    >
                        {({ getFieldValue }) => {
                            const type = getFieldValue(['config', 'incentiveType']) || 'fixed';
                            return (
                                <Form.Item
                                    label={type === 'fixed' ? "Incentive Amount (Rs)" : "Incentive Percentage (%)"}
                                    name={['config', 'incentiveAmount']}
                                    rules={[{ required: true }]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        min={0}
                                        max={type === 'percentage' ? 100 : undefined}
                                        addonAfter={type === 'fixed' ? 'Rs' : '%'}
                                    />
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
                </>
            );
        }

        if (ruleType === 'value_slab') {
            return (
                <>
                    <Form.Item name={['config', 'retroactive']} valuePropName="checked" label="Retroactive Incentive?">
                        <Switch />
                    </Form.Item>
                    <Form.List name={['config', 'slabs']}>
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item {...restField} name={[name, 'min']} rules={[{ required: true, message: 'Min' }]}>
                                            <InputNumber placeholder="Min Amount" min={0} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'max']} rules={[{ required: true, message: 'Max' }]}>
                                            <InputNumber placeholder="Max Amount" min={0} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'percentage']} rules={[{ required: true, message: '%' }]}>
                                            <InputNumber placeholder="Incentive %" min={0} max={100} />
                                        </Form.Item>
                                        <DeleteOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Slab</Button>
                            </>
                        )}
                    </Form.List>
                </>
            );
        }

        if (ruleType === 'unit_slab') {
            return (
                <Form.List name={['config', 'slabs']}>
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item {...restField} name={[name, 'min']} rules={[{ required: true, message: 'Min' }]}>
                                        <InputNumber placeholder="Min Units" min={0} />
                                    </Form.Item>
                                    <Form.Item {...restField} name={[name, 'max']} rules={[{ required: true, message: 'Max' }]}>
                                        <InputNumber placeholder="Max Units" min={0} />
                                    </Form.Item>
                                    <Form.Item {...restField} name={[name, 'amountPerUnit']} rules={[{ required: true, message: 'Rs' }]}>
                                        <InputNumber placeholder="Rs per unit" min={0} />
                                    </Form.Item>
                                    <DeleteOutlined onClick={() => remove(name)} />
                                </Space>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Slab</Button>
                        </>
                    )}
                </Form.List>
            );
        }
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar />
            <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
                <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Title level={4} style={{ margin: 0 }}>Sales Incentive Settings</Title>
                    <Menu
                        theme="light"
                        mode="horizontal"
                        items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
                        style={{ borderRight: 'none', backgroundColor: 'transparent' }}
                    />
                </Header>
                <Content style={{ padding: 24 }}>
                    <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Tabs defaultActiveKey="rules">
                            <Tabs.TabPane tab={<span><SettingOutlined />Incentive Rules</span>} key="rules">
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRule}>
                                        Add Rule
                                    </Button>
                                </div>
                                <Table
                                    dataSource={rules}
                                    columns={ruleColumns}
                                    rowKey="id"
                                    loading={loadingRules}
                                    pagination={{ pageSize: 10 }}
                                />
                            </Tabs.TabPane>

                            <Tabs.TabPane tab={<span><UserOutlined />Staff Assignments</span>} key="assignments">
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                    <Button type="primary" ghost icon={<UserOutlined />} onClick={openBulkAssign}>
                                        Assign to All Staff
                                    </Button>
                                </div>
                                <Table
                                    dataSource={staff}
                                    columns={staffColumns}
                                    rowKey="id"
                                    loading={loadingStaff}
                                    pagination={{ pageSize: 15 }}
                                />
                            </Tabs.TabPane>
                        </Tabs>
                    </Card>
                </Content>
            </Layout>

            <Modal
                title={editingRule ? 'Edit Incentive Rule' : 'Create Incentive Rule'}
                open={ruleModalOpen}
                onOk={submitRule}
                onCancel={() => setRuleModalOpen(false)}
                confirmLoading={saving}
                width={600}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="Rule Name" name="name" rules={[{ required: true, message: 'Please enter rule name' }]}>
                        <Input placeholder="e.g. Monthly Sales Bonus" />
                    </Form.Item>
                    <Form.Item label="Rule Type" name="ruleType" rules={[{ required: true }]}>
                        <Select onChange={(v) => setRuleType(v)}>
                            <Option value="fixed">Fixed Amount</Option>
                            <Option value="value_slab">Slabs based on Amount (Revenue %)</Option>
                            <Option value="unit_slab">Slabs based on Volume (Units)</Option>
                        </Select>
                    </Form.Item>

                    <Card size="small" title="Rule Configuration" style={{ marginBottom: 16 }}>
                        {renderConfigFields()}
                    </Card>

                    <Form.Item name="active" valuePropName="checked">
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Assign Rules - ${selectedStaff?.name}`}
                open={assignModalOpen}
                onOk={submitAssign}
                onCancel={() => setAssignModalOpen(false)}
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={assignForm} layout="vertical">
                    <Form.Item label="Select Incentive Rules" name="ruleIds">
                        <Select mode="multiple" placeholder="Select rules" style={{ width: '100%' }}>
                            {rules.map(r => (
                                <Option key={r.id} value={r.id}>{r.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title="Assign Rules to ALL Staff"
                open={bulkAssignModalOpen}
                onOk={submitBulkAssign}
                onCancel={() => setBulkAssignModalOpen(false)}
                confirmLoading={saving}
                destroyOnClose
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="warning">Warning: This will overwrite existing assignments for all active staff members.</Text>
                </div>
                <Form form={bulkAssignForm} layout="vertical">
                    <Form.Item label="Select Incentive Rules" name="ruleIds">
                        <Select mode="multiple" placeholder="Select rules" style={{ width: '100%' }}>
                            {rules.map(r => (
                                <Option key={r.id} value={r.id}>{r.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
}
