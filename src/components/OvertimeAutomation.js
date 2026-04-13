import { Layout, Typography, Card, Space, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Breadcrumb, Divider, Tag, Checkbox, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, ThunderboltOutlined, ArrowLeftOutlined, DeleteFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import React, { useState, useEffect } from 'react';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function OvertimeAutomation() {
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

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const resp = await api.get('/admin/settings/overtime-rules');
            if (resp.data?.success) {
                setRules(resp.data.rules);
            }
        } catch (err) {
            message.error('Failed to load overtime rules');
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
                minMinutes: hhmmToMins(t.h, t.m)
            }));
        }

        // Convert half/full day hh:mm
        if (values.halfDayH !== undefined) values.halfDayThresholdMinutes = hhmmToMins(values.halfDayH, values.halfDayM);
        if (values.fullDayH !== undefined) values.fullDayThresholdMinutes = hhmmToMins(values.fullDayH, values.fullDayM);

        try {
            if (editingRule) {
                await api.put(`/admin/settings/overtime-rules/${editingRule.id}`, values);
                message.success('Rule updated');
            } else {
                await api.post('/admin/settings/overtime-rules', values);
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
            content: 'Are you sure you want to delete this rule?',
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    await api.delete(`/admin/settings/overtime-rules/${id}`);
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
            await api.post(`/admin/settings/overtime-rules/${assigningRule.id}/assign`, { userIds: selectedStaffIds });
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
            if (!keepOpen) setAssignedListOpen(true);
            setAssignedListLoading(true);
            const res = await api.get(`/admin/settings/overtime-rules/${rule.id}/assignments`);
            setAssignedListRows(res.data?.assignments || []);
        } catch (err) {
            message.error('Failed to load assigned staff');
        } finally {
            setAssignedListLoading(false);
        }
    };

    const unassignStaff = async (assignmentId) => {
        try {
            await api.delete(`/admin/settings/overtime-rules/assignments/${assignmentId}`);
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
            title: 'Calculation', 
            dataIndex: 'calculationType', 
            key: 'calculationType',
            render: (type) => <Tag color="blue">{type.replace(/_/g, ' ')}</Tag>
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
                    <Button icon={< ThunderboltOutlined />} onClick={() => openAssign(record)}>Assign</Button>
                    <Button icon={<EditOutlined />} onClick={() => {
                        let rawThresholds = record.thresholds || [];
                        if (typeof rawThresholds === 'string') {
                            try { rawThresholds = JSON.parse(rawThresholds); } catch (e) { rawThresholds = []; }
                        }
                        
                        const thresholds = rawThresholds.map(t => {
                            const { h, m } = minsToHHMM(t.minMinutes);
                            return { ...t, h, m };
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

    const TimePickerDropdown = ({ name, fieldName, label }) => (
        <Space>
            <Form.Item name={[name, fieldName + 'H']} noStyle initialValue={0}>
                <Select style={{ width: 60 }}>
                    {[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}
                </Select>
            </Form.Item>
            <span>:</span>
            <Form.Item name={[name, fieldName + 'M']} noStyle initialValue={0}>
                <Select style={{ width: 60 }}>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}
                </Select>
            </Form.Item>
            <Text type="secondary">hh:mm</Text>
        </Space>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, background: '#f5f7fb' }}>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                        <ArrowLeftOutlined onClick={() => navigate('/settings')} style={{ cursor: 'pointer', fontSize: 18 }} />
                        <Title level={4} style={{ margin: 0 }}>Create Overtime Rule</Title>
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
                        <Breadcrumb.Item>Overtime Rules</Breadcrumb.Item>
                    </Breadcrumb>

                    <Card>
                        <Table dataSource={rules} columns={columns} loading={loading} rowKey="id" />
                    </Card>

                    <Modal
                        title={editingRule ? 'Edit Overtime Rule' : 'Create Overtime Rule'}
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => form.submit()}
                        width={800}
                        okText="Save Rule"
                    >
                        <Form form={form} layout="vertical" onFinish={handleSave}>
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item name="name" label={<Text strong>Rule Name <span style={{ color: 'red' }}>*</span></Text>} rules={[{ required: true }]}>
                                        <Input placeholder="Enter Rule Name" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="calculationType" label={<Text strong>Calculation Type <span style={{ color: 'red' }}>*</span></Text>} initialValue="POST_PAYABLE_HOURS_AND_SHIFT_END">
                                        <Select>
                                            {/* <Option value="POST_PAYABLE_HOURS">Post Payable Hours</Option> */}
                                            <Option value="POST_PAYABLE_HOURS_AND_SHIFT_END">Post Payable Hours and Shift End</Option>
                                            {/* <Option value="POST_PAYABLE_HOURS_OR_SHIFT_END">Post Payable Hours or Shift End</Option> */}
                                            {/* <Option value="SHIFT_END">Shift End</Option> */}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="active" valuePropName="checked" initialValue={true}>
                                <Checkbox><Text strong>Give overtime</Text></Checkbox>
                            </Form.Item>

                            <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
                                <Form.List name="thresholds" initialValue={[{ h: 0, m: 0, rewardType: 'FIXED_AMOUNT', value: 0 }]}>
                                    {(fields, { add, remove }) => (
                                        <>
                                            {fields.map(({ key, name, ...restField }, index) => (
                                                <div key={key} style={{ marginBottom: 24, borderBottom: index < fields.length - 1 ? '1px solid #eee' : 'none', paddingBottom: 16 }}>
                                                    <Row gutter={16} align="bottom">
                                                        <Col span={8}>
                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>If Staff works for more than or equal to</Text>
                                                            <Space>
                                                                <Form.Item {...restField} name={[name, 'h']} noStyle initialValue={0}>
                                                                    <Select style={{ width: 65 }}>
                                                                        {[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}
                                                                    </Select>
                                                                </Form.Item>
                                                                <span>:</span>
                                                                <Form.Item {...restField} name={[name, 'm']} noStyle initialValue={0}>
                                                                    <Select style={{ width: 65 }}>
                                                                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}
                                                                    </Select>
                                                                </Form.Item>
                                                                <Text type="secondary">hh:mm</Text>
                                                            </Space>
                                                            <div style={{ marginTop: 4 }}><Text type="secondary" size="small">No overtime upto {index} mins</Text></div>
                                                        </Col>
                                                        <Col span={7}>
                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Overtime type</Text>
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
                                                                    <Option value="FIXED_AMOUNT_PER_HOUR">Fixed Amount Per Hour</Option>
                                                                    <Option value="SALARY_MULTIPLIER">Salary Multiplier</Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={7}>
                                                            <Form.Item 
                                                                noStyle 
                                                                shouldUpdate={(prevValues, curValues) => 
                                                                    prevValues.thresholds?.[name]?.rewardType !== curValues.thresholds?.[name]?.rewardType
                                                                }
                                                            >
                                                                {({ getFieldValue }) => {
                                                                    const rewardType = getFieldValue(['thresholds', name, 'rewardType']);
                                                                    const isMultiplier = rewardType === 'SALARY_MULTIPLIER';
                                                                    return (
                                                                        <>
                                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                                                                {isMultiplier ? 'Multiplier' : 'Fixed Amount'}
                                                                            </Text>
                                                                            <Form.Item {...restField} name={[name, 'value']} noStyle initialValue={0}>
                                                                                <InputNumber 
                                                                                    style={{ width: '100%' }} 
                                                                                    prefix={isMultiplier ? '' : '₹'} 
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
                                                                    style={{ marginBottom: 4 }}
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

                            <Divider />

                            <div style={{ marginBottom: 16 }}>
                                <Form.Item name="giveHalfDayOvertime" valuePropName="checked" noStyle>
                                    <Checkbox><Text strong>Give half day overtime if staff works for more than or equal to</Text></Checkbox>
                                </Form.Item>
                                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                                    <Space>
                                        <Form.Item name="halfDayH" noStyle initialValue={0}><Select style={{ width: 65 }}>{[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <span>:</span>
                                        <Form.Item name="halfDayM" noStyle initialValue={0}><Select style={{ width: 65 }}>{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <Text type="secondary">hh:mm</Text>
                                    </Space>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <Form.Item name="giveFullDayOvertime" valuePropName="checked" noStyle>
                                    <Checkbox><Text strong>Give full day overtime if staff works for more than or equal to</Text></Checkbox>
                                </Form.Item>
                                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                                    <Space>
                                        <Form.Item name="fullDayH" noStyle initialValue={0}><Select style={{ width: 65 }}>{[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <span>:</span>
                                        <Form.Item name="fullDayM" noStyle initialValue={0}><Select style={{ width: 65 }}>{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <Text type="secondary">hh:mm</Text>
                                    </Space>
                                </div>
                            </div>
                        </Form>
                    </Modal>

                    {/* Salary Multiplier Modal (SS4 Style) */}
                    <Modal
                        title="Add Custom Salary Multiplier"
                        open={multiplierModalVisible}
                        onCancel={() => setMultiplierModalVisible(false)}
                        onOk={() => setMultiplierModalVisible(false)}
                        width={400}
                        okText="Add Multiplier"
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Multiplier</Text>
                            <Input 
                                placeholder="Enter Multiplier" 
                                style={{ marginTop: 8 }}
                                type="number"
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const thresholds = form.getFieldValue('thresholds');
                                    thresholds[currentTierIndex].value = val;
                                    form.setFieldsValue({ thresholds });
                                }}
                            />
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            The OT Rate will become X times the salary of each staff
                        </Text>
                        <Alert 
                            message="The calculation is based on the salary. Please note that the OT Rate will change if the salary changes." 
                            type="info" 
                            showIcon 
                            style={{ background: '#f0f7ff', border: 'none' }}
                        />
                    </Modal>

                    {/* Assign Modal */}
                    <Modal title={assigningRule ? `Assign Staff • ${assigningRule.name}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Assign">
                        <Space direction="vertical" style={{ width:'100%' }} size={12}>
                            <Text type="secondary">Select staff members to apply this rule to:</Text>
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
                        <Table
                            rowKey="id"
                            loading={assignedListLoading}
                            dataSource={assignedListRows}
                            size="small"
                            pagination={{ pageSize: 8 }}
                            columns={[
                                { title: 'Name', render: (_, r) => r.user?.profile?.name || '-' },
                                { title: 'Staff ID', render: (_, r) => r.user?.profile?.staffId || '-' },
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

// Simple Alert stub
const Alert = ({ message, type, showIcon, style }) => (
    <div style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff', ...style }}>
        <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        <Text type="secondary">{message}</Text>
    </div>
);
