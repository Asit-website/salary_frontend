import { Layout, Typography, Card, Space, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Breadcrumb, Divider, Tag, Checkbox, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, ThunderboltOutlined, ArrowLeftOutlined, DeleteFilled, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import React, { useState, useEffect } from 'react';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function LatePunchInAutomation() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [multiplierModalVisible, setMultiplierModalVisible] = useState(false);
    const [currentTierIndex, setCurrentTierIndex] = useState(null);
    const [form] = Form.useForm();

    // Assignment state
    const [assignOpen, setAssignOpen] = useState(false);
    const [assigningRule, setAssigningRule] = useState(null);
    const [staffOptions, setStaffOptions] = useState([]);
    const [selectedStaffIds, setSelectedStaffIds] = useState([]);
    const [assignedListOpen, setAssignedListOpen] = useState(false);
    const [assignedListRule, setAssignedListRule] = useState(null);
    const [assignedListRows, setAssignedListRows] = useState([]);
    const [assignedListLoading, setAssignedListLoading] = useState(false);
    const [assignedSearch, setAssignedSearch] = useState('');

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const resp = await api.get('/admin/settings/late-punchin-rules');
            if (resp.data?.success) {
                setRules(resp.data.rules);
            }
        } catch (err) {
            message.error('Failed to load late punch-in rules');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (formValues) => {
        const values = { ...formValues };

        try {
            if (editingRule) {
                await api.put(`/admin/settings/late-punchin-rules/${editingRule.id}`, values);
                message.success('Rule updated');
            } else {
                await api.post('/admin/settings/late-punchin-rules', values);
                message.success('Rule created');
            }
            setModalVisible(false);
            fetchRules();
        } catch (err) {
            message.error('Failed to save rule');
        }
    };

    const handleDelete = async (id) => {
        Modal.confirm({
            title: 'Delete Penalty Rule',
            content: 'Are you sure you want to delete this rule? This will affect all assigned staff.',
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    await api.delete(`/admin/settings/late-punchin-rules/${id}`);
                    message.success('Rule deleted');
                    fetchRules();
                } catch (err) {
                    message.error('Failed to delete rule');
                }
            }
        });
    };

    const openAssign = async (rule) => {
        try {
            setAssigningRule(rule);
            setAssignOpen(true);
            setSelectedStaffIds([]);
            const staffRes = await api.get('/admin/staff');
            const staffData = staffRes.data?.staff || staffRes.data?.data || [];
            setStaffOptions(staffData.map(s => ({ label: s.name || `Staff ${s.id}`, value: s.id })));
        } catch (err) {
            message.error('Failed to load staff');
        }
    };

    const saveAssign = async () => {
        try {
            if (!assigningRule) return;
            if (selectedStaffIds.length === 0) return message.warning('Select at least one staff');
            await api.post(`/admin/settings/late-punchin-rules/${assigningRule.id}/assign`, { userIds: selectedStaffIds });
            message.success('Staff assigned successfully');
            setAssignOpen(false);
            fetchRules();
        } catch (err) {
            message.error('Failed to assign staff');
        }
    };

    const openAssignedList = async (rule, keepOpen = false) => {
        try {
            setAssignedListRule(rule);
            if (!keepOpen) {
                setAssignedListOpen(true);
                setAssignedSearch('');
            }
            setAssignedListLoading(true);
            const res = await api.get(`/admin/settings/late-punchin-rules/${rule.id}/assignments`);
            setAssignedListRows(res.data?.assignments || []);
        } catch (err) {
            message.error('Failed to load assigned staff');
        } finally {
            setAssignedListLoading(false);
        }
    };

    const unassignStaff = async (assignmentId) => {
        try {
            await api.delete(`/admin/settings/late-punchin-rules/assignments/${assignmentId}`);
            message.success('Staff unassigned');
            if (assignedListRule) await openAssignedList(assignedListRule, true);
            fetchRules();
        } catch (err) {
            message.error('Failed to unassign staff');
        }
    };

    const columns = [
        { title: 'Rule Name', dataIndex: 'name', key: 'name' },
        {
            title: 'Penalty Type',
            dataIndex: 'penaltyType',
            key: 'penaltyType',
            render: (type) => <Tag color="orange">{type.replace(/_/g, ' ')}</Tag>
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (active) => active ? <Tag color="success">Active</Tag> : <Tag color="error">Inactive</Tag>
        },
        {
            title: 'Assigned Staff',
            key: 'assignedCount',
            render: (_, record) => (
                <Tag color="cyan" style={{ cursor: 'pointer' }} onClick={() => openAssignedList(record)}>
                    {record.assignedCount || 0} Staff
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<ThunderboltOutlined />} onClick={() => openAssign(record)}>Assign</Button>
                    <Button icon={<EditOutlined />} onClick={() => {
                        setEditingRule(record);
                        let thresholds = record.thresholds || [];
                        if (typeof thresholds === 'string') {
                            try { thresholds = JSON.parse(thresholds); } catch (e) { thresholds = []; }
                        }

                        form.setFieldsValue({
                            ...record,
                            thresholds: Array.isArray(thresholds) ? thresholds : []
                        });
                        setModalVisible(true);
                    }} />
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, background: '#f5f7fb' }}>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                        <ArrowLeftOutlined onClick={() => navigate('/automation-rules')} style={{ cursor: 'pointer', fontSize: 18 }} />
                        <Title level={4} style={{ margin: 0 }}>Late Punch-In Penalty Rules</Title>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        setEditingRule(null);
                        form.resetFields();
                        setModalVisible(true);
                    }}>
                        Add New Penalty Rule
                    </Button>
                </Header>

                <Content style={{ padding: '24px' }}>
                    <Breadcrumb style={{ marginBottom: 16 }}>
                        <Breadcrumb.Item onClick={() => navigate('/dashboard')}><HomeOutlined /></Breadcrumb.Item>
                        <Breadcrumb.Item onClick={() => navigate('/automation-rules')}>Automation Rules</Breadcrumb.Item>
                        <Breadcrumb.Item>Late Penalty Rules</Breadcrumb.Item>
                    </Breadcrumb>

                    <Card>
                        <Table dataSource={rules} columns={columns} loading={loading} rowKey="id" />
                    </Card>

                    <Modal
                        title={editingRule ? 'Edit Late Penalty Rule' : 'Create Late Penalty Rule'}
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => form.submit()}
                        width={900}
                        okText="Save Rule"
                    >
                        <Form form={form} layout="vertical" onFinish={handleSave}>
                            <Row gutter={24}>
                                <Col span={10}>
                                    <Form.Item name="name" label={<Text strong>Rule Name <span style={{ color: 'red' }}>*</span></Text>} rules={[{ required: true }]}>
                                        <Input placeholder="e.g. Standard 15m Late Penalty" />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item name="penaltyType" label={<Text strong>Penalty Calculation Type</Text>} initialValue="SLABS">
                                        <Select style={{ width: '100%' }}>
                                            <Option value="SLABS">Tiers / Slabs (Day Deductions)</Option>
                                            <Option value="FIXED_AMOUNT">Fixed Amount Penalty</Option>
                                            <Option value="FIXED_AMOUNT_PER_HOUR">Hourly Penalty</Option>
                                            <Option value="HALF_DAY">Half Day Deduction</Option>
                                            <Option value="FULL_DAY">Full Day Deduction</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={3}>
                                    <Form.Item name="bufferMinutes" label={<Text strong>Buffer (min)</Text>} initialValue={0}>
                                        <InputNumber style={{ width: '100%' }} min={0} />
                                    </Form.Item>
                                </Col>
                                <Col span={3}>
                                    <Form.Item name="active" valuePropName="checked" initialValue={true} style={{ marginTop: 30 }}>
                                        <Checkbox><Text strong>Active</Text></Checkbox>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left">Penalty Logic</Divider>

                            <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => prev.penaltyType !== curr.penaltyType}
                                >
                                    {({ getFieldValue }) => {
                                        const pType = getFieldValue('penaltyType');

                                        if (pType === 'SLABS') {
                                            return (
                                                <Form.List name="thresholds" initialValue={[{ minMinutes: 15, maxMinutes: 60, deduction: 0.5, frequency: 1 }]}>
                                                    {(fields, { add, remove }) => (
                                                        <>
                                                            {fields.map(({ key, name, ...restField }, index) => (
                                                                <Row key={key} gutter={12} align="bottom" style={{ marginBottom: 16 }}>
                                                                    <Col span={5}>
                                                                        <Form.Item {...restField} name={[name, 'minMinutes']} label={index === 0 ? "Min Late (min)" : ""} rules={[{ required: true }]}>
                                                                            <InputNumber style={{ width: '100%' }} min={1} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={5}>
                                                                        <Form.Item {...restField} name={[name, 'maxMinutes']} label={index === 0 ? "Max Late (min)" : ""} rules={[{ required: true }]}>
                                                                            <InputNumber style={{ width: '100%' }} min={1} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={5}>
                                                                        <Form.Item {...restField} name={[name, 'deduction']} label={index === 0 ? "Deduct Days" : ""} rules={[{ required: true }]}>
                                                                            <InputNumber style={{ width: '100%' }} step={0.5} min={0} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={6}>
                                                                        <Form.Item {...restField} name={[name, 'frequency']} label={index === 0 ? "Every X Occurrences" : ""} initialValue={1}>
                                                                            <InputNumber style={{ width: '100%' }} min={1} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={3}>
                                                                        <Button type="text" danger icon={<DeleteFilled />} onClick={() => remove(name)} style={{ marginBottom: 5 }} />
                                                                    </Col>
                                                                </Row>
                                                            ))}
                                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Tier / Slab</Button>
                                                        </>
                                                    )}
                                                </Form.List>
                                            );
                                        }

                                        // For other types
                                        return (
                                            <Form.List name="thresholds" initialValue={[{ minMinutes: 15, value: 0 }]}>
                                                {(fields, { add, remove }) => (
                                                    <>
                                                        {fields.map(({ key, name, ...restField }) => (
                                                            <Row key={key} gutter={16} align="bottom">
                                                                <Col span={10}>
                                                                    <Form.Item {...restField} name={[name, 'minMinutes']} label="If Late more than (minutes)" rules={[{ required: true }]}>
                                                                        <InputNumber style={{ width: '100%' }} min={1} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={10}>
                                                                    <Form.Item {...restField} name={[name, 'value']} label={pType.includes('AMOUNT') ? "Penalty Amount (₹)" : "Status Only"} rules={[{ required: pType.includes('AMOUNT') }]}>
                                                                        <InputNumber style={{ width: '100%' }} prefix={pType.includes('AMOUNT') ? '₹' : ''} min={0} disabled={!pType.includes('AMOUNT')} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={4}>
                                                                    {fields.length > 1 && <Button type="text" danger icon={<DeleteFilled />} onClick={() => remove(name)} style={{ marginBottom: 5 }} />}
                                                                </Col>
                                                            </Row>
                                                        ))}
                                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Condition</Button>
                                                    </>
                                                )}
                                            </Form.List>
                                        );
                                    }}
                                </Form.Item>
                            </div>
                        </Form>
                    </Modal>

                    {/* Assign Modal */}
                    <Modal title={assigningRule ? `Assign Staff • ${assigningRule.name}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Assign">
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary">Select staff members to apply this penalty rule to:</Text>
                                <Button
                                    size="small"
                                    type="link"
                                    onClick={() => {
                                        if (selectedStaffIds.length === staffOptions.length) {
                                            setSelectedStaffIds([]);
                                        } else {
                                            setSelectedStaffIds(staffOptions.map(o => o.value));
                                        }
                                    }}
                                >
                                    {selectedStaffIds.length === staffOptions.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>
                            <Select
                                mode="multiple"
                                options={staffOptions}
                                value={selectedStaffIds}
                                onChange={setSelectedStaffIds}
                                style={{ width: '100%' }}
                                placeholder="Select staff..."
                                showSearch
                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                            />
                        </Space>
                    </Modal>

                    {/* Assigned Staff List Modal */}
                    <Modal
                        title={`Assigned Staff${assignedListRule ? ` - ${assignedListRule.name}` : ''}`}
                        open={assignedListOpen}
                        onCancel={() => setAssignedListOpen(false)}
                        footer={null}
                        width={900}
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Input.Search
                                placeholder="Search staff by name, ID or phone..."
                                allowClear
                                value={assignedSearch}
                                onChange={e => setAssignedSearch(e.target.value)}
                                onSearch={setAssignedSearch}
                                style={{ width: 350 }}
                            />
                        </div>
                        <Table
                            rowKey="id"
                            loading={assignedListLoading}
                            dataSource={(assignedListRows || []).filter(r => {
                                if (!assignedSearch) return true;
                                const s = assignedSearch.toLowerCase();
                                const name = (r.user?.profile?.name || '').toLowerCase();
                                const sid = (r.user?.profile?.staffId || '').toLowerCase();
                                const phone = (r.user?.phone || '').toLowerCase();
                                return name.includes(s) || sid.includes(s) || phone.includes(s);
                            })}
                            size="small"
                            pagination={{ pageSize: 8 }}
                            columns={[
                                { title: 'Name', render: (_, r) => r.user?.profile?.name || '-' },
                                { title: 'Staff ID', render: (_, r) => r.user?.profile?.staffId || '-' },
                                { title: 'Assigned Date', render: (_, r) => r.createdAt ? dayjs(r.createdAt).format('DD-MM-YYYY') : '-' },
                                { title: 'Department', render: (_, r) => r.user?.profile?.department || '-' },
                                { title: 'Designation', render: (_, r) => r.user?.profile?.designation || '-' },
                                {
                                    title: 'Action',
                                    key: 'action',
                                    render: (_, r) => (
                                        <Button danger size="small" onClick={() => unassignStaff(r.id)}>Unassign</Button>
                                    )
                                },
                            ]}
                        />
                    </Modal>

                </Content>
            </Layout>
        </Layout>
    );
}
