import { Layout, Typography, Card, Space, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Breadcrumb, Divider, Tag, Checkbox, Row, Col, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, ThunderboltOutlined, ArrowLeftOutlined, DeleteFilled, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import React, { useState, useEffect } from 'react';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function BreakAutomation() {
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
            const resp = await api.get('/admin/settings/break-rules');
            if (resp.data?.success) {
                setRules(resp.data.rules);
            }
        } catch (err) {
            message.error('Failed to load break automation rules');
        } finally {
            setLoading(false);
        }
    };

    const minsToHHMM = (totalMins) => {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return { h, m };
    };

    const hhmmToMins = (h, m) => {
        return (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
    };

    const handleSave = async (formValues) => {
        const values = { ...formValues };

        // Convert hh:mm to minutes for thresholds
        if (values.thresholds) {
            values.thresholds = values.thresholds.map(t => ({
                ...t,
                minMinutes: hhmmToMins(t.h, t.m),
                rewardType: t.rewardType,
                rewardValue: t.rewardValue
            }));
        }

        // Convert half/full day hh:mm
        if (values.halfDayH !== undefined) values.halfDayThresholdMinutes = hhmmToMins(values.halfDayH, values.halfDayM);
        if (values.fullDayH !== undefined) values.fullDayThresholdMinutes = hhmmToMins(values.fullDayH, values.fullDayM);

        try {
            if (editingRule) {
                await api.put(`/admin/settings/break-rules/${editingRule.id}`, values);
                message.success('Rule updated');
            } else {
                await api.post('/admin/settings/break-rules', values);
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
            title: 'Delete Rule',
            content: 'Are you sure you want to delete this break rule?',
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    await api.delete(`/admin/settings/break-rules/${id}`);
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
            setStaffOptions(staffData.map(s => ({ label: `${s.name || 'Staff ' + s.id} (${s.profile?.staffId || '-'})`, value: s.id })));
        } catch (err) {
            message.error('Failed to load staff');
        }
    };

    const saveAssign = async () => {
        try {
            if (!assigningRule) return;
            if (selectedStaffIds.length === 0) return message.warning('Select at least one staff');
            await api.post(`/admin/settings/break-rules/${assigningRule.id}/assign`, { userIds: selectedStaffIds });
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
            const res = await api.get(`/admin/settings/break-rules/${rule.id}/assignments`);
            setAssignedListRows(res.data?.assignments || []);
        } catch (err) {
            message.error('Failed to load assigned staff');
        } finally {
            setAssignedListLoading(false);
        }
    };

    const unassignStaff = async (assignmentId) => {
        try {
            await api.delete(`/admin/settings/break-rules/assignments/${assignmentId}`);
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
                    <Button icon={< ThunderboltOutlined />} onClick={() => openAssign(record)}>Assign</Button>
                    <Button icon={<EditOutlined />} onClick={() => {
                        let rawThresholds = record.thresholds || [];
                        if (typeof rawThresholds === 'string') {
                            try { rawThresholds = JSON.parse(rawThresholds); } catch (e) { rawThresholds = []; }
                        }

                        const thresholds = rawThresholds.map(t => {
                            const { h, m } = minsToHHMM(t.minMinutes);
                            return {
                                ...t,
                                h, m,
                                rewardType: t.rewardType,
                                rewardValue: t.rewardValue
                            };
                        });
                        const half = minsToHHMM(record.halfDayThresholdMinutes || 0);
                        const full = minsToHHMM(record.fullDayThresholdMinutes || 0);

                        setEditingRule(record);
                        form.setFieldsValue({
                            ...record,
                            thresholds,
                            halfDayH: half.h, halfDayM: half.m,
                            fullDayH: full.h, fullDayM: full.m
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
                        <ArrowLeftOutlined onClick={() => navigate('/settings')} style={{ cursor: 'pointer', fontSize: 18 }} />
                        <Title level={4} style={{ margin: 0 }}>Break Automation Rules</Title>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        setEditingRule(null);
                        form.resetFields();
                        setModalVisible(true);
                    }}>
                        Add New Rule
                    </Button>
                </Header>

                <Content style={{ padding: '24px' }}>
                    <Breadcrumb style={{ marginBottom: 16 }}>
                        <Breadcrumb.Item onClick={() => navigate('/dashboard')}><HomeOutlined /></Breadcrumb.Item>
                        <Breadcrumb.Item onClick={() => navigate('/settings')}>Settings</Breadcrumb.Item>
                        <Breadcrumb.Item>Break Automation</Breadcrumb.Item>
                    </Breadcrumb>

                    <Card>
                        <Table dataSource={rules} columns={columns} loading={loading} rowKey="id" />
                    </Card>

                    <Modal
                        title={editingRule ? 'Edit Break Automation Rule' : 'Create Break Automation Rule'}
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => form.submit()}
                        width={900}
                        okText="Save Rule"
                    >
                        <Form form={form} layout="vertical" onFinish={handleSave}>
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item name="name" label={<Text strong>Rule Name <span style={{ color: 'red' }}>*</span></Text>} rules={[{ required: true }]}>
                                        <Input placeholder="e.g. Standard Peak Break Rule" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="active" valuePropName="checked" initialValue={true} style={{ marginTop: 32 }}>
                                        <Checkbox><Text strong>Rule is active</Text></Checkbox>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left">Time Range Fines (Duration Based)</Divider>
                            <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
                                <Form.List name="thresholds" initialValue={[{ h: 0, m: 30, rewardType: 'FIXED_AMOUNT', rewardValue: 0 }]}>
                                    {(fields, { add, remove }) => (
                                        <>
                                            {fields.map(({ key, name, ...restField }, index) => (
                                                <div key={key} style={{ marginBottom: 24, borderBottom: index < fields.length - 1 ? '1px solid #eee' : 'none', paddingBottom: 16 }}>
                                                    <Row gutter={16} align="bottom">
                                                        <Col span={6}>
                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>If total break more than or equal to</Text>
                                                            <Space>
                                                                <Form.Item {...restField} name={[name, 'h']} noStyle initialValue={0}>
                                                                    <Select style={{ width: 65 }}>
                                                                        {[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}
                                                                    </Select>
                                                                </Form.Item>
                                                                <span>:</span>
                                                                <Form.Item {...restField} name={[name, 'm']} noStyle initialValue={30}>
                                                                    <Select style={{ width: 65 }}>
                                                                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}
                                                                    </Select>
                                                                </Form.Item>
                                                            </Space>
                                                        </Col>
                                                        <Col span={8}>
                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Deduction Type</Text>
                                                            <Form.Item {...restField} name={[name, 'rewardType']} noStyle initialValue="FIXED_AMOUNT">
                                                                <Select
                                                                    style={{ width: '100%' }}
                                                                    onChange={(val) => {
                                                                        if (val === 'SALARY_MULTIPLIER') {
                                                                            setCurrentTierIndex(name);
                                                                            setMultiplierModalVisible(true);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Option value="FIXED_AMOUNT">Fixed Amount</Option>
                                                                    <Option value="SALARY_MULTIPLIER">Salary Multiplier</Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={8}>
                                                            <Form.Item
                                                                noStyle
                                                                shouldUpdate={(prevValues, curValues) =>
                                                                    prevValues.thresholds?.[name]?.rewardType !== curValues.thresholds?.[name]?.rewardType
                                                                }
                                                            >
                                                                {({ getFieldValue }) => {
                                                                    const type = getFieldValue(['thresholds', name, 'rewardType']);
                                                                    const isMult = type === 'SALARY_MULTIPLIER';
                                                                    return (
                                                                        <>
                                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                                                                {isMult ? 'Multiplier' : 'Amount'}
                                                                            </Text>
                                                                            <Form.Item {...restField} name={[name, 'rewardValue']} noStyle initialValue={0}>
                                                                                <InputNumber
                                                                                    style={{ width: '100%' }}
                                                                                    prefix={isMult ? '' : '₹'}
                                                                                    min={0}
                                                                                />
                                                                            </Form.Item>
                                                                        </>
                                                                    );
                                                                }}
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={2}>
                                                            {fields.length > 1 && (
                                                                <Button
                                                                    type="text"
                                                                    danger
                                                                    icon={<DeleteFilled />}
                                                                    onClick={() => remove(name)}
                                                                />
                                                            )}
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ))}
                                            <Button type="link" onClick={() => add()} icon={<PlusOutlined />} style={{ padding: 0 }}>
                                                Add Time Range
                                            </Button>
                                        </>
                                    )}
                                </Form.List>
                            </div>

                            <Divider orientation="left">Major Attendance Overrides</Divider>

                            <div style={{ marginBottom: 24, padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                                <Form.Item name="deductHalfDay" valuePropName="checked" noStyle initialValue={false}>
                                    <Checkbox><Text strong>Deduct half day salary if break more than or equal to</Text></Checkbox>
                                </Form.Item>
                                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                                    <Space>
                                        <Form.Item name="halfDayH" noStyle initialValue={2}><Select style={{ width: 65 }}>{[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <span>:</span>
                                        <Form.Item name="halfDayM" noStyle initialValue={0}><Select style={{ width: 65 }}>{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <Text type="secondary">hh:mm</Text>
                                    </Space>
                                    <div style={{ marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}><InfoCircleOutlined /> This will override time range fines for current day.</Text>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 24, padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                                <Form.Item name="deductFullDay" valuePropName="checked" noStyle initialValue={false}>
                                    <Checkbox><Text strong>Deduct full day salary if break more than or equal to</Text></Checkbox>
                                </Form.Item>
                                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                                    <Space>
                                        <Form.Item name="fullDayH" noStyle initialValue={4}><Select style={{ width: 65 }}>{[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <span>:</span>
                                        <Form.Item name="fullDayM" noStyle initialValue={0}><Select style={{ width: 65 }}>{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                    </Space>
                                    <Text type="secondary">hh:mm</Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}><InfoCircleOutlined /> This will override all other break penalties for current day.</Text>
                                    </div>
                                </div>
                            </div>
                        </Form>
                    </Modal>

                    {/* Salary Multiplier Modal */}
                    <Modal
                        title="Salary Multiplier Deduction"
                        open={multiplierModalVisible}
                        onCancel={() => setMultiplierModalVisible(false)}
                        onOk={() => setMultiplierModalVisible(false)}
                        width={400}
                        okText="Ok"
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Multiplier</Text>
                            <InputNumber
                                placeholder="e.g. 1.0, 1.5"
                                style={{ marginTop: 8, width: '100%' }}
                                min={0.1}
                                step={0.1}
                                onChange={(val) => {
                                    const thresholds = form.getFieldValue('thresholds');
                                    if (thresholds[currentTierIndex]) {
                                        thresholds[currentTierIndex].rewardValue = val;
                                        form.setFieldsValue({ thresholds });
                                    }
                                }}
                            />
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            The fine will become X times the daily salary of the staff.
                        </Text>
                        <Alert
                            message="Calculation: Gross Salary / (Days in Month). Fine amount scales with staff salary."
                            type="info"
                            showIcon
                            style={{ background: '#f0f7ff', border: 'none' }}
                        />
                    </Modal>

                    {/* Assign Modal */}
                    <Modal title={assigningRule ? `Assign Staff • ${assigningRule.name}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Assign">
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary">Select staff members to apply this break rule to:</Text>
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
                                { title: 'Phone', render: (_, r) => r.user?.phone || '-' },
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
