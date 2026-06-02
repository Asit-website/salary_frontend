import { Layout, Typography, Card, Space, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Breadcrumb, Divider, Tag, Checkbox, Row, Col, Alert, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, ThunderboltOutlined, ArrowLeftOutlined, DeleteFilled, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import React, { useState, useEffect } from 'react';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function EarlyExitAutomation() {
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
            const resp = await api.get('/admin/settings/early-exit-rules');
            if (resp.data?.success) {
                setRules(resp.data.rules);
            }
        } catch (err) {
            message.error('Failed to load early exit rules');
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
                rewardType: t.rewardType, // This is fine
                rewardValue: t.rewardValue // This is fine
            }));
        }

        // Convert half/full day hh:mm
        if (values.halfDayH !== undefined) values.halfDayThresholdMinutes = hhmmToMins(values.halfDayH, values.halfDayM);
        if (values.fullDayH !== undefined) values.fullDayThresholdMinutes = hhmmToMins(values.fullDayH, values.fullDayM);

        try {
            if (editingRule) {
                await api.put(`/admin/settings/early-exit-rules/${editingRule.id}`, values);
                message.success('Rule updated');
            } else {
                await api.post('/admin/settings/early-exit-rules', values);
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
                    await api.delete(`/admin/settings/early-exit-rules/${id}`);
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
            setStaffOptions(staffData.map(s => ({ label: `${s.name || 'Staff ' + s.id} (${s.profile?.staffId || '-'})`, value: s.id })));
        } catch (err) {
            message.error('Failed to load staff');
        }
    };

    const saveAssign = async () => {
        try {
            if (!assigningRule) return;
            if (selectedStaffIds.length === 0) return message.warning('Select at least one staff');
            
            const resp = await api.post(`/admin/settings/early-exit-rules/${assigningRule.id}/assign`, { 
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
            const res = await api.get(`/admin/settings/early-exit-rules/${rule.id}/assignments`);
            setAssignedListRows(res.data?.assignments || []);
        } catch (err) {
            message.error('Failed to load assigned staff');
        } finally {
            setAssignedListLoading(false);
        }
    };

    const unassignStaff = async (assignmentId) => {
        try {
            await api.delete(`/admin/settings/early-exit-rules/assignments/${assignmentId}`);
            message.success('Staff unassigned');
            if (assignedListRule) await openAssignedList(assignedListRule, true);
            fetchRules();
        } catch (err) {
            message.error('Failed to unassign staff');
        }
    };

    const columns = [
        { 
            title: 'Rule Name', 
            dataIndex: 'name', 
            key: 'name',
            render: (text) => <Text strong style={{ color: '#262626' }}>{text}</Text>
        },
        {
            title: 'Deduction Status',
            dataIndex: 'active',
            key: 'active',
            render: (active) => active ? 
                <Tag className="sales-status-tag sales-status-complete">Active</Tag> : 
                <Tag className="sales-status-tag sales-status-inactive">Inactive</Tag>
        },
        {
            title: 'Assigned Staff',
            key: 'assignedCount',
            render: (_, record) => (
                <Tag className="sales-status-tag sales-status-active" style={{ cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => openAssignedList(record)}>
                    {record.assignedCount || 0} Staff
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 260,
            render: (_, record) => (
                <Space size="middle" style={{ paddingRight: 8 }}>
                    <Button 
                        type="primary"
                        ghost
                        shape="round"
                        icon={<ThunderboltOutlined />} 
                        onClick={() => openAssign(record)}
                        style={{ fontSize: '13px' }}
                    >
                        Assign
                    </Button>
                    <Button 
                        shape="circle"
                        icon={<EditOutlined />} 
                        className="sales-action-btn"
                        onClick={() => {
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
                        }} 
                    />
                    <Button 
                        shape="circle"
                        danger
                        icon={<DeleteOutlined />} 
                        className="sales-action-btn"
                        onClick={() => handleDelete(record.id)} 
                    />
                </Space>
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, background: '#f5f7fb', transition: 'all 0.2s' }}>
                <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Early Exit Rules" showHome={true} />

                <Content style={{ padding: '24px' }}>
                    {/* Action Header Card */}
                    <div style={{ 
                        background: '#fff', 
                        padding: '16px 24px', 
                        borderRadius: '16px', 
                        marginBottom: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                        border: '1px solid #f0f2f5'
                    }}>
                        <Space size="middle">
                            <Button 
                                shape="circle" 
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => navigate('/settings')} 
                                className="sales-action-btn"
                            />
                            <Breadcrumb style={{ margin: 0 }}>
                                <Breadcrumb.Item onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}><HomeOutlined /></Breadcrumb.Item>
                                <Breadcrumb.Item onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>Settings</Breadcrumb.Item>
                                <Breadcrumb.Item>Early Exit Rules</Breadcrumb.Item>
                            </Breadcrumb>
                        </Space>
                        <Button 
                           type="primary" 
                           icon={<PlusOutlined />} 
                           shape="round"
                           onClick={() => {
                               setEditingRule(null);
                               form.resetFields();
                               setModalVisible(true);
                           }}
                        >
                            Add New Rule
                        </Button>
                    </div>

                    <Card className="sales-content-card" style={{ padding: '4px' }}>
                        <Table 
                            dataSource={rules} 
                            columns={columns} 
                            loading={loading} 
                            rowKey="id" 
                            className="sales-table"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} rules`
                            }}
                        />
                    </Card>

                    <Modal
                        title={editingRule ? 'Edit Early Exit Rule' : 'Create Early Exit Rule'}
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => form.submit()}
                        width={800}
                        okText="Save Rule"
                        className="sales-modal"
                        okButtonProps={{ shape: 'round' }}
                        cancelButtonProps={{ shape: 'round' }}
                    >
                        <Form form={form} layout="vertical" onFinish={handleSave}>
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item name="name" label={<span className="modal-field-label">Rule Name <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Rule name is required' }]}>
                                        <Input placeholder="e.g. Standard Early Exit Fine" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="active" valuePropName="checked" initialValue={true} style={{ marginTop: 32 }}>
                                        <Checkbox><Text strong>Rule is active</Text></Checkbox>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left"><span className="modal-field-label" style={{ fontSize: '15px' }}>Tiered Fines (Threshold Based)</span></Divider>
                            <div style={{ background: '#fafafa', padding: '20px', borderRadius: '12px', border: '1px solid #f0f2f5', marginBottom: '20px' }}>
                                <Form.List name="thresholds" initialValue={[{ h: 0, m: 15, rewardType: 'FIXED_AMOUNT', rewardValue: 0 }]}>
                                    {(fields, { add, remove }) => (
                                        <>
                                            {fields.map(({ key, name, ...restField }, index) => (
                                                <div key={key} style={{ marginBottom: 24, borderBottom: index < fields.length - 1 ? '1px solid #eee' : 'none', paddingBottom: 16 }}>
                                                    <Row gutter={16} align="bottom">
                                                        <Col span={9}>
                                                            <span className="modal-field-label" style={{ display: 'block', marginBottom: 8 }}>If Staff leaves early by more than or equal to</span>
                                                            <Space>
                                                                <Form.Item {...restField} name={[name, 'h']} noStyle initialValue={0}>
                                                                    <Select style={{ width: 65 }}>
                                                                        {[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}
                                                                    </Select>
                                                                </Form.Item>
                                                                <span>:</span>
                                                                <Form.Item {...restField} name={[name, 'm']} noStyle initialValue={15}>
                                                                    <Select style={{ width: 65 }}>
                                                                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}
                                                                    </Select>
                                                                </Form.Item>
                                                                <Text type="secondary">hh:mm</Text>
                                                            </Space>
                                                        </Col>
                                                        <Col span={7}>
                                                            <span className="modal-field-label" style={{ display: 'block', marginBottom: 8 }}>Deduction Type</span>
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
                                                                    <Option value="SALARY_MULTIPLIER">Salary Multiplier (Fine)</Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={6}>
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
                                                                            <span className="modal-field-label" style={{ display: 'block', marginBottom: 8 }}>
                                                                                {isMult ? 'Multiplier' : 'Fine Amount'}
                                                                            </span>
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
                                                                    style={{ marginBottom: 4 }}
                                                                />
                                                            )}
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ))}
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} shape="round">Add Threshold Level</Button>
                                        </>
                                    )}
                                </Form.List>
                            </div>

                            <Divider orientation="left"><span className="modal-field-label" style={{ fontSize: '15px' }}>Major Attendance Penalties</span></Divider>

                            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', border: '1px solid #f0f2f5', marginBottom: '16px' }}>
                                <Form.Item name="deductHalfDay" valuePropName="checked" noStyle initialValue={false}>
                                    <Checkbox><span className="modal-field-label">Deduct half day salary if leaving early more than or equal to</span></Checkbox>
                                </Form.Item>
                                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                                    <Space>
                                        <Form.Item name="halfDayH" noStyle initialValue={0}><Select style={{ width: 65 }}>{[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <span>:</span>
                                        <Form.Item name="halfDayM" noStyle initialValue={30}><Select style={{ width: 65 }}>{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <Text type="secondary">hh:mm</Text>
                                    </Space>
                                    <div style={{ marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}><InfoCircleOutlined /> This will override tiered fines if triggered.</Text>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', border: '1px solid #f0f2f5', marginBottom: '16px' }}>
                                <Form.Item name="deductFullDay" valuePropName="checked" noStyle initialValue={false}>
                                    <Checkbox><span className="modal-field-label">Deduct full day salary if leaving early more than or equal to</span></Checkbox>
                                </Form.Item>
                                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                                    <Space>
                                        <Form.Item name="fullDayH" noStyle initialValue={1}><Select style={{ width: 65 }}>{[...Array(24).keys()].map(h => <Option key={h} value={h}>{String(h).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <span>:</span>
                                        <Form.Item name="fullDayM" noStyle initialValue={0}><Select style={{ width: 65 }}>{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <Option key={m} value={m}>{String(m).padStart(2, '0')}</Option>)}</Select></Form.Item>
                                        <Text type="secondary">hh:mm</Text>
                                    </Space>
                                    <div style={{ marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}><InfoCircleOutlined /> This will override all other early exit penalties.</Text>
                                    </div>
                                </div>
                            </div>
                        </Form>
                    </Modal>

                    {/* Salary Multiplier Modal */}
                    <Modal
                        title="Add Salary Multiplier Deduction"
                        open={multiplierModalVisible}
                        onCancel={() => setMultiplierModalVisible(false)}
                        onOk={() => setMultiplierModalVisible(false)}
                        width={400}
                        okText="Add Multiplier"
                        className="sales-modal"
                        okButtonProps={{ shape: 'round' }}
                        cancelButtonProps={{ shape: 'round' }}
                    >
                        <div style={{ marginBottom: 16 }}>
                            <span className="modal-field-label">Multiplier</span>
                            <InputNumber
                                placeholder="e.g. 1.0, 1.5"
                                style={{ marginTop: 8, width: '100%' }}
                                min={0.1}
                                step={0.1}
                                onChange={(val) => {
                                    const thresholds = form.getFieldValue('thresholds');
                                    thresholds[currentTierIndex].rewardValue = val;
                                    form.setFieldsValue({ thresholds });
                                }}
                            />
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            The fine will become X times the hourly salary (Gross Salary) of the staff.
                        </Text>
                        <Alert
                            message="The calculation is based on (Gross Salary) / (30 * 8). The fine amount will vary per staff based on their individual pay."
                            type="info"
                            showIcon
                            style={{ background: '#f0f7ff', border: 'none' }}
                        />
                    </Modal>

                    {/* Assign Modal */}
                    <Modal 
                        title={assigningRule ? `Assign Staff • ${assigningRule.name}` : 'Assign Staff'} 
                        open={assignOpen} 
                        onCancel={() => setAssignOpen(false)} 
                        onOk={saveAssign} 
                        okText="Assign"
                        className="sales-modal"
                        okButtonProps={{ shape: 'round' }}
                        cancelButtonProps={{ shape: 'round' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <div>
                                <span className="modal-field-label" style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Select staff members to apply this early exit rule to:</span>
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
                                    <span className="modal-field-label">Effective From</span>
                                    <DatePicker 
                                        style={{ width: '100%', marginTop: 8 }} 
                                        value={effectiveFrom} 
                                        onChange={setEffectiveFrom} 
                                        format="DD-MM-YYYY"
                                        allowClear={false}
                                    />
                                </Col>
                                <Col span={12}>
                                    <span className="modal-field-label">Effective To (Optional)</span>
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
                                <div style={{ background: '#fff7e6', border: '1px solid #ffd591', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <InfoCircleOutlined style={{ color: '#fa8c16' }} />
                                    <Text type="warning" size="small" style={{ fontSize: '12px' }}>Backdated assignment will trigger attendance recalculation.</Text>
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
                        className="sales-modal"
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Input.Search
                                placeholder="Search staff by name, ID or phone..."
                                allowClear
                                value={assignedSearch}
                                onChange={e => setAssignedSearch(e.target.value)}
                                onSearch={setAssignedSearch}
                                style={{ width: 350, borderRadius: '8px' }}
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
                            size="middle"
                            pagination={{ pageSize: 8 }}
                            className="sales-table"
                            columns={[
                                { 
                                    title: 'Name', 
                                    render: (_, r) => <Text strong style={{ color: '#262626' }}>{r.user?.profile?.name || '-'}</Text> 
                                },
                                { title: 'Staff ID', render: (_, r) => r.user?.profile?.staffId || '-' },
                                { title: 'Effective From', render: (_, r) => r.effectiveFrom ? dayjs(r.effectiveFrom).format('DD-MM-YYYY') : '-' },
                                { title: 'Phone', render: (_, r) => r.user?.phone || '-' },
                                { title: 'Department', render: (_, r) => r.user?.profile?.department || '-' },
                                { title: 'Designation', render: (_, r) => r.user?.profile?.designation || '-' },
                                {
                                    title: 'Action',
                                    key: 'action',
                                    width: 120,
                                    render: (_, r) => (
                                        <Button danger size="small" shape="round" onClick={() => unassignStaff(r.id)}>Unassign</Button>
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
