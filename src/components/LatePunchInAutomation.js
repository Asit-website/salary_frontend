import { Layout, Typography, Card, Space, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Breadcrumb, Divider, Tag, Checkbox, Row, Col, DatePicker, Tooltip } from 'antd';
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
            
            const resp = await api.post(`/admin/settings/late-punchin-rules/${assigningRule.id}/assign`, { 
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
        { 
            title: 'Rule Name', 
            dataIndex: 'name', 
            key: 'name',
            render: (text) => <Text strong style={{ color: '#262626' }}>{text}</Text>
        },
        {
            title: 'Penalty Type',
            dataIndex: 'penaltyType',
            key: 'penaltyType',
            render: (type) => {
                let tagClass = 'sales-status-pending';
                if (type === 'SLABS') tagClass = 'sales-status-pending';
                else if (type.includes('AMOUNT')) tagClass = 'sales-status-active';
                else tagClass = 'sales-status-inprogress';
                return <Tag className={`sales-status-tag ${tagClass}`}>{type.replace(/_/g, ' ')}</Tag>;
            }
        },
        {
            title: 'Status',
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
                <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Late Punch-In Penalty Rules" showHome={true} />

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
                                onClick={() => navigate('/automation-rules')} 
                                className="sales-action-btn"
                            />
                            <Breadcrumb style={{ margin: 0 }}>
                                <Breadcrumb.Item onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}><HomeOutlined /></Breadcrumb.Item>
                                <Breadcrumb.Item onClick={() => navigate('/automation-rules')} style={{ cursor: 'pointer' }}>Automation Rules</Breadcrumb.Item>
                                <Breadcrumb.Item>Late Penalty Rules</Breadcrumb.Item>
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
                            Add New Penalty Rule
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

                    {/* Create/Edit Penalty Rule Modal */}
                    <Modal
                        title={editingRule ? 'Edit Late Penalty Rule' : 'Create Late Penalty Rule'}
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => form.submit()}
                        width={900}
                        okText="Save Rule"
                        className="sales-modal"
                    >
                        <Form form={form} layout="vertical" onFinish={handleSave}>
                            <Row gutter={24}>
                                <Col span={8}>
                                    <Form.Item name="name" label={<span className="modal-field-label">Rule Name <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Rule name is required' }]}>
                                        <Input placeholder="e.g. Standard 15m Late Penalty" />
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Form.Item name="penaltyType" label={<span className="modal-field-label">Penalty Calculation Type</span>} initialValue="SLABS">
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
                                    <Form.Item name="bufferMinutes" label={<span className="modal-field-label">Buffer (min)</span>} initialValue={0}>
                                        <InputNumber style={{ width: '100%' }} min={0} />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item 
                                        name="pardonLimit" 
                                        label={
                                            <Space>
                                                <span className="modal-field-label">Pardon Limit</span>
                                                <Tooltip title="Specify the number of free lates allowed in a month. E.g., 3 means 3 lates are free. If they exceed this limit (e.g. 4 lates), the pardon is cancelled and penalties are retrospectively applied to all 4 occurrences. Set to 0 to disable pardons.">
                                                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                                                </Tooltip>
                                            </Space>
                                        } 
                                        initialValue={0}
                                    >
                                        <InputNumber style={{ width: '100%' }} min={0} />
                                    </Form.Item>
                                </Col>
                                <Col span={3}>
                                    <Form.Item name="active" valuePropName="checked" initialValue={true} style={{ marginTop: 30 }}>
                                        <Checkbox><Text strong>Active</Text></Checkbox>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left"><span className="modal-field-label" style={{ fontSize: '15px' }}>Penalty Logic</span></Divider>

                            <div style={{ background: '#fafafa', padding: '20px', borderRadius: '12px', border: '1px solid #f0f2f5' }}>
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
                                                                        <Form.Item {...restField} name={[name, 'minMinutes']} label={index === 0 ? <span className="modal-field-label">Min Late (min)</span> : ""} rules={[{ required: true }]}>
                                                                            <InputNumber style={{ width: '100%' }} min={1} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={5}>
                                                                        <Form.Item {...restField} name={[name, 'maxMinutes']} label={index === 0 ? <span className="modal-field-label">Max Late (min)</span> : ""} rules={[{ required: true }]}>
                                                                            <InputNumber style={{ width: '100%' }} min={1} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={5}>
                                                                        <Form.Item {...restField} name={[name, 'deduction']} label={index === 0 ? <span className="modal-field-label">Deduct Days</span> : ""} rules={[{ required: true }]}>
                                                                            <InputNumber style={{ width: '100%' }} step={0.25} min={0} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={6}>
                                                                        <Form.Item {...restField} name={[name, 'frequency']} label={index === 0 ? <span className="modal-field-label">Every X Occurrences</span> : ""} initialValue={1}>
                                                                            <InputNumber style={{ width: '100%' }} min={1} />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={3}>
                                                                        <Button type="text" danger icon={<DeleteFilled />} onClick={() => remove(name)} style={{ marginBottom: 5 }} />
                                                                    </Col>
                                                                </Row>
                                                            ))}
                                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} shape="round">Add Tier / Slab</Button>
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
                                                                    <Form.Item {...restField} name={[name, 'minMinutes']} label={<span className="modal-field-label">If Late more than (minutes)</span>} rules={[{ required: true }]}>
                                                                        <InputNumber style={{ width: '100%' }} min={1} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={10}>
                                                                    <Form.Item {...restField} name={[name, 'value']} label={<span className="modal-field-label">{pType.includes('AMOUNT') ? "Penalty Amount (₹)" : "Status Only"}</span>} rules={[{ required: pType.includes('AMOUNT') }]}>
                                                                        <InputNumber style={{ width: '100%' }} prefix={pType.includes('AMOUNT') ? '₹' : ''} min={0} disabled={!pType.includes('AMOUNT')} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={4}>
                                                                    {fields.length > 1 && <Button type="text" danger icon={<DeleteFilled />} onClick={() => remove(name)} style={{ marginBottom: 5 }} />}
                                                                </Col>
                                                            </Row>
                                                        ))}
                                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} shape="round">Add Condition</Button>
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
                    <Modal 
                        title={assigningRule ? `Assign Staff • ${assigningRule.name}` : 'Assign Staff'} 
                        open={assignOpen} 
                        onCancel={() => setAssignOpen(false)} 
                        onOk={saveAssign} 
                        okText="Assign"
                        className="sales-modal"
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '13px' }}>Select staff members to apply this penalty rule to:</Text>
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
