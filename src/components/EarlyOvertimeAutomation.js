import { Layout, Typography, Card, Space, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Breadcrumb, Divider, Tag, Checkbox, Row, Col, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, ThunderboltOutlined, ArrowLeftOutlined, DeleteFilled, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import React, { useState, useEffect } from 'react';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function EarlyOvertimeAutomation() {
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
    const [effectiveFrom, setEffectiveFrom] = useState(dayjs());
    const [effectiveTo, setEffectiveTo] = useState(null);
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
            const resp = await api.get('/admin/settings/early-overtime-rules');
            if (resp.data?.success) {
                setRules(resp.data.rules);
            }
        } catch (err) {
            message.error('Failed to load early overtime rules');
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
                await api.put(`/admin/settings/early-overtime-rules/${editingRule.id}`, values);
                message.success('Rule updated');
            } else {
                await api.post('/admin/settings/early-overtime-rules', values);
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
                    await api.delete(`/admin/settings/early-overtime-rules/${id}`);
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
            setEffectiveFrom(dayjs());
            setEffectiveTo(null);
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
            
            const resp = await api.post(`/admin/settings/early-overtime-rules/${assigningRule.id}/assign`, { 
                userIds: selectedStaffIds,
                effectiveFrom: effectiveFrom.format('YYYY-MM-DD'),
                effectiveTo: effectiveTo ? effectiveTo.format('YYYY-MM-DD') : null
            });

            if (resp.data?.payrollWarning) {
                Modal.warning({
                    title: 'Payroll Locked',
                    content: resp.data.payrollWarning,
                    icon: <WarningOutlined style={{ color: '#faad14' }} />
                });
            } else {
                message.success('Staff assigned successfully' + (resp.data?.recalculated ? ' and attendance recalculated.' : ''));
            }

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
            const res = await api.get(`/admin/settings/early-overtime-rules/${rule.id}/assignments`);
            setAssignedListRows(res.data?.assignments || []);
        } catch (err) {
            message.error('Failed to load assigned staff');
        } finally {
            setAssignedListLoading(false);
        }
    };

    const unassignStaff = async (assignmentId) => {
        try {
            await api.delete(`/admin/settings/early-overtime-rules/assignments/${assignmentId}`);
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

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, background: '#f5f7fb' }}>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                        <ArrowLeftOutlined onClick={() => navigate('/settings')} style={{ cursor: 'pointer', fontSize: 18 }} />
                        <Title level={4} style={{ margin: 0 }}>Early Overtime Rule</Title>
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
                        <Breadcrumb.Item>Early Overtime Rules</Breadcrumb.Item>
                    </Breadcrumb>

                    <Card>
                        <Table dataSource={rules} columns={columns} loading={loading} rowKey="id" />
                    </Card>

                    <Modal
                        title={editingRule ? 'Edit Early Overtime Rule' : 'Create Early Overtime Rule'}
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => form.submit()}
                        width={800}
                        okText="Save Rule"
                    >
                        <Form form={form} layout="vertical" onFinish={handleSave}>
                            <Row gutter={24}>
                                <Col span={24}>
                                    <Form.Item name="name" label={<Text strong>Rule Name <span style={{ color: 'red' }}>*</span></Text>} rules={[{ required: true }]}>
                                        <Input placeholder="Enter Rule Name (e.g. Standard Early OT)" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="active" valuePropName="checked" initialValue={true}>
                                <Checkbox><Text strong>Give early overtime</Text></Checkbox>
                            </Form.Item>

                            <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
                                <Form.List name="thresholds" initialValue={[{ h: 0, m: 30, rewardType: 'FIXED_AMOUNT', value: 0 }]}>
                                    {(fields, { add, remove }) => (
                                        <>
                                            {fields.map(({ key, name, ...restField }, index) => (
                                                <div key={key} style={{ marginBottom: 24, borderBottom: index < fields.length - 1 ? '1px solid #eee' : 'none', paddingBottom: 16 }}>
                                                    <Row gutter={16} align="bottom">
                                                        <Col span={8}>
                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>If Staff works before shift start for more than or equal to</Text>
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
                                                        </Col>
                                                        <Col span={7}>
                                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Reward type</Text>
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
                                                                                {isMultiplier ? 'Multiplier' : 'Amount'}
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
                                                Add Slab
                                            </Button>
                                        </>
                                    )}
                                </Form.List>
                            </div>

                            <Divider />

                            <div style={{ marginBottom: 16 }}>
                                <Form.Item name="giveHalfDayEarlyOvertime" valuePropName="checked" noStyle>
                                    <Checkbox><Text strong>Give half day early overtime if staff works before start for more than or equal to</Text></Checkbox>
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
                                <Form.Item name="giveFullDayEarlyOvertime" valuePropName="checked" noStyle>
                                    <Checkbox><Text strong>Give full day early overtime if staff works before start for more than or equal to</Text></Checkbox>
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

                    {/* Salary Multiplier Modal */}
                    <Modal
                        title="Add Salary Multiplier"
                        open={multiplierModalVisible}
                        onCancel={() => setMultiplierModalVisible(false)}
                        onOk={() => setMultiplierModalVisible(false)}
                        width={400}
                        okText="Apply"
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Multiplier</Text>
                            <Input
                                placeholder="e.g. 1.5 or 2.0"
                                style={{ marginTop: 8 }}
                                type="number"
                                step="0.1"
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const thresholds = form.getFieldValue('thresholds');
                                    thresholds[currentTierIndex].value = val;
                                    form.setFieldsValue({ thresholds });
                                }}
                            />
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            The Early OT Rate will become X times the (Basic + DA) salary.
                        </Text>
                    </Modal>

                    {/* Assign Modal */}
                    <Modal title={assigningRule ? `Assign Staff • ${assigningRule.name}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Assign">
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <div>
                                <Text type="secondary">Select staff members to apply this early overtime rule to:</Text>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
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
                            </div>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text strong>Effective From</Text>
                                    <DatePicker 
                                        style={{ width: '100%', marginTop: 8 }} 
                                        value={effectiveFrom} 
                                        onChange={setEffectiveFrom} 
                                        format="DD-MM-YYYY"
                                        allowClear={false}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Text strong>Effective To (Optional)</Text>
                                    <DatePicker 
                                        style={{ width: '100%', marginTop: 8 }} 
                                        value={effectiveTo} 
                                        onChange={setEffectiveTo} 
                                        format="DD-MM-YYYY"
                                        placeholder="No end date"
                                    />
                                </Col>
                            </Row>

                            {effectiveFrom && effectiveFrom.isBefore(dayjs(), 'day') && (
                                <div style={{ background: '#fff7e6', border: '1px solid #ffd591', padding: '8px 12px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <InfoCircleOutlined style={{ color: '#fa8c16' }} />
                                    <Text type="warning" size="small">Backdated assignment will trigger attendance recalculation.</Text>
                                </div>
                            )}
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
                                { title: 'Effective From', render: (_, r) => r.effectiveFrom ? dayjs(r.effectiveFrom).format('DD-MM-YYYY') : '-' },
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
