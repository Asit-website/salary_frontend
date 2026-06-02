import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Select, DatePicker, Tag, Space, Typography, Row, Col, Statistic, message, Modal, Form, Input, InputNumber, Upload, Popconfirm, Avatar } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined,
    ReloadOutlined,
    PlusOutlined,
    UploadOutlined,
    WalletOutlined,
    FilterOutlined,
    EyeOutlined,
    DownloadOutlined,
    EditOutlined,
    UserOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const EXPENSE_TYPE_OPTIONS = [
    { value: 'Travel', label: 'Travel' },
    { value: 'Food', label: 'Food' },
    { value: 'Office', label: 'Office Supplies' },
    { value: 'Fuel', label: 'Fuel' },
    { value: 'Accommodation', label: 'Accommodation' },
    { value: 'Communication', label: 'Communication' },
    { value: 'Other', label: 'Other' },
];

const ExpenseManagement = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [stats, setStats] = useState({});
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [staffList, setStaffList] = useState([]);

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterStaff, setFilterStaff] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [filterDates, setFilterDates] = useState(null);

    // Add modal
    const [addVisible, setAddVisible] = useState(false);
    const [addForm] = Form.useForm();
    const [addLoading, setAddLoading] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // View detail modal
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchStaff();
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [page, filterStatus, filterStaff, filterType, filterDates]);

    const fetchStaff = async () => {
        try {
            const res = await api.get('/admin/staff');
            if (res.data.success) setStaffList(res.data.data || []);
        } catch (e) { /* ignore */ }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
            if (filterStaff) params.staffId = filterStaff;
            if (filterType && filterType !== 'all') params.expenseType = filterType;
            if (filterDates && filterDates.length === 2) {
                params.startDate = filterDates[0].format('YYYY-MM-DD');
                params.endDate = filterDates[1].format('YYYY-MM-DD');
            }

            const res = await api.get('/admin/expenses', { params });
            if (res.data.success) {
                setExpenses(res.data.data || []);
                setTotal(res.data.total || 0);
                setStats(res.data.stats || {});
            }
        } catch (e) {
            message.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (claimId, newStatus, approvedAmount) => {
        try {
            const body = { status: newStatus };
            if (newStatus === 'approved' && approvedAmount !== undefined) body.approvedAmount = approvedAmount;
            await api.put(`/admin/expenses/${claimId}/status`, body);
            message.success(`Claim ${newStatus} successfully`);
            fetchExpenses();
        } catch (e) {
            message.error('Failed to update claim');
        }
    };

    const openAddClaim = () => {
        setEditingRecord(null);
        addForm.resetFields();
        addForm.setFieldsValue({ expenseDate: dayjs() });
        setAddVisible(true);
    };

    const openEditClaim = (record) => {
        setEditingRecord(record);
        addForm.setFieldsValue({
            staffId: record.userId,
            expenseType: record.expenseType || 'Other',
            expenseDate: record.expenseDate ? dayjs(record.expenseDate) : dayjs(),
            amount: Number(record.amount || 0),
            approvedAmount: record.approvedAmount !== null && record.approvedAmount !== undefined ? Number(record.approvedAmount) : undefined,
            status: record.status || 'pending',
            billNumber: record.billNumber || '',
            description: record.description || '',
            attachment: undefined,
        });
        setAddVisible(true);
    };

    const closeClaimModal = () => {
        setAddVisible(false);
        setEditingRecord(null);
        addForm.resetFields();
    };

    const handleSaveClaim = async (values) => {
        setAddLoading(true);
        try {
            const fd = new FormData();
            fd.append('expenseType', values.expenseType);
            fd.append('expenseDate', values.expenseDate?.format('YYYY-MM-DD'));
            fd.append('amount', values.amount);
            if (values.status) fd.append('status', values.status);
            if (values.approvedAmount !== undefined && values.approvedAmount !== null) fd.append('approvedAmount', values.approvedAmount);
            if (values.billNumber) fd.append('billNumber', values.billNumber);
            if (values.description) fd.append('description', values.description);
            if (values.attachment?.fileList?.[0]?.originFileObj) {
                fd.append('attachment', values.attachment.fileList[0].originFileObj);
            }
            if (editingRecord?.id) {
                await api.put(`/admin/expenses/${editingRecord.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                message.success('Expense claim updated');
            } else {
                await api.post(`/admin/staff/${values.staffId}/expenses`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                message.success('Expense claim created');
            }
            closeClaimModal();
            fetchExpenses();
        } catch (e) {
            message.error(e.response?.data?.message || (editingRecord?.id ? 'Failed to update expense claim' : 'Failed to create expense claim'));
        } finally {
            setAddLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const params = {};
            if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
            if (filterStaff) params.staffId = filterStaff;
            if (filterType && filterType !== 'all') params.expenseType = filterType;
            if (filterDates && filterDates.length === 2) {
                params.startDate = filterDates[0].format('YYYY-MM-DD');
                params.endDate = filterDates[1].format('YYYY-MM-DD');
            }

            const response = await api.get('/admin/expenses/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `expenses_export_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            message.success('Expenses exported successfully');
        } catch (e) {
            message.error('Failed to export expenses');
        }
    };

    const statusColors = {
        pending: 'orange',
        approved: 'green',
        rejected: 'red',
        settled: 'blue',
    };

    const columns = [
        {
            title: 'Claim ID',
            dataIndex: 'claimId',
            key: 'claimId',
            render: (t) => (
                <span className="sales-status-tag sales-status-pending" style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                    {t || '-'}
                </span>
            ),
            width: 140,
        },
        {
            title: 'Staff',
            dataIndex: 'staffName',
            key: 'staffName',
            width: 220,
            render: (name, record) => (
                <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        backgroundColor: '#e6f7ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        color: '#1677ff',
                        fontWeight: '700',
                        fontSize: '14px',
                        boxShadow: '0 2px 6px rgba(22, 119, 255, 0.06)'
                    }}>
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '600', color: '#1677ff', whiteSpace: 'nowrap' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '1px', whiteSpace: 'nowrap' }}>{record.department || '-'}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'expenseType',
            key: 'expenseType',
            width: 140,
            render: (t) => {
                const typeColors = {
                    Travel: '#1890ff',
                    Food: '#52c41a',
                    Office: '#722ed1',
                    Fuel: '#fa8c16',
                    Accommodation: '#13c2c2',
                    Communication: '#eb2f96',
                    Other: '#8c8c8c'
                };
                const color = typeColors[t] || '#1890ff';
                return (
                    <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: color, 
                        backgroundColor: `${color}10`, 
                        border: `1px solid ${color}30`,
                        whiteSpace: 'nowrap'
                    }}>
                        {t || 'Other'}
                    </span>
                );
            }
        },
        {
            title: 'Date',
            dataIndex: 'expenseDate',
            key: 'expenseDate',
            width: 130,
            render: (d) => dayjs(d).format('DD MMM YYYY'),
            sorter: (a, b) => new Date(a.expenseDate) - new Date(b.expenseDate),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 110,
            render: (a) => <span style={{ fontWeight: '600', color: '#262626' }}>₹ {Number(a || 0).toLocaleString('en-IN')}</span>,
            sorter: (a, b) => Number(a.amount) - Number(b.amount),
        },
        {
            title: 'Approved Amt',
            dataIndex: 'approvedAmount',
            key: 'approvedAmount',
            width: 130,
            render: (a) => a ? <span style={{ fontWeight: '600', color: '#52c41a' }}>₹ {Number(a).toLocaleString('en-IN')}</span> : <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (s) => {
                let tagClass = 'sales-status-pending';
                if (s === 'approved') tagClass = 'sales-status-active';
                if (s === 'settled') tagClass = 'sales-status-complete';
                if (s === 'rejected') tagClass = 'sales-status-inactive';
                return (
                    <span className={`sales-status-tag ${tagClass}`}>
                        {(s || '').toUpperCase()}
                    </span>
                );
            },
            filters: [
                { text: 'Pending', value: 'pending' },
                { text: 'Approved', value: 'approved' },
                { text: 'Rejected', value: 'rejected' },
                { text: 'Settled', value: 'settled' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Bill No.',
            dataIndex: 'billNumber',
            key: 'billNumber',
            width: 100,
            render: (b) => b || '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            width: 280,
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" shape="round" icon={<EyeOutlined />} onClick={() => { setDetailRecord(record); setDetailVisible(true); }}>View</Button>
                    <Button size="small" shape="round" icon={<EditOutlined style={{ color: '#1677ff' }} />} onClick={() => openEditClaim(record)}>Edit</Button>
                    {record.status === 'pending' && (
                        <>
                            <Popconfirm
                                title="Approve this claim?"
                                description={`Amount: ₹${record.amount}`}
                                onConfirm={() => handleStatusChange(record.id, 'approved', record.amount)}
                                okText="Approve"
                                okButtonProps={{ shape: 'round' }}
                                cancelButtonProps={{ shape: 'round' }}
                            >
                                <Button size="small" shape="round" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}>Approve</Button>
                            </Popconfirm>
                            <Popconfirm
                                title="Reject this claim?"
                                onConfirm={() => handleStatusChange(record.id, 'rejected')}
                                okText="Reject"
                                okButtonProps={{ danger: true, shape: 'round' }}
                                cancelButtonProps={{ shape: 'round' }}
                            >
                                <Button size="small" shape="round" danger>Reject</Button>
                            </Popconfirm>
                        </>
                    )}
                    {record.status === 'approved' && (
                        <Popconfirm
                            title="Mark as settled?"
                            onConfirm={() => handleStatusChange(record.id, 'settled')}
                            okText="Settle"
                            okButtonProps={{ shape: 'round' }}
                            cancelButtonProps={{ shape: 'round' }}
                        >
                            <Button size="small" shape="round" type="primary">Settle</Button>
                        </Popconfirm>
                    )}
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
                    title="Expense Management" 
                />
                <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
                    {/* Stats Cards */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={12} sm={8} md={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 16, boxShadow: '0 4px 15px rgba(102, 126, 234, 0.25)' }} bodyStyle={{ padding: '16px' }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Total Claims</span>} value={stats.total || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: '20px' }} prefix={<FileTextOutlined style={{ marginRight: '4px' }} />} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 16, boxShadow: '0 4px 15px rgba(245, 87, 108, 0.25)' }} bodyStyle={{ padding: '16px' }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Pending</span>} value={stats.pending || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: '20px' }} prefix={<ClockCircleOutlined style={{ marginRight: '4px' }} />} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: 16, boxShadow: '0 4px 15px rgba(79, 172, 254, 0.25)' }} bodyStyle={{ padding: '16px' }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Approved</span>} value={stats.approved || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: '20px' }} prefix={<CheckCircleOutlined style={{ marginRight: '4px' }} />} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: 16, boxShadow: '0 4px 15px rgba(250, 112, 154, 0.25)' }} bodyStyle={{ padding: '16px' }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Rejected</span>} value={stats.rejected || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: '20px' }} prefix={<CloseCircleOutlined style={{ marginRight: '4px' }} />} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: 16, boxShadow: '0 4px 15px rgba(67, 233, 123, 0.25)' }} bodyStyle={{ padding: '16px' }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Total Amount</span>} value={stats.totalAmount || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: '18px' }} prefix="₹" />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', borderRadius: 16, boxShadow: '0 4px 15px rgba(161, 140, 209, 0.25)' }} bodyStyle={{ padding: '16px' }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Pending Amount</span>} value={stats.pendingAmount || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: '18px' }} prefix="₹" />
                            </Card>
                        </Col>
                    </Row>

                    {/* Filters & Actions */}
                    <Card className="sales-content-card" style={{ marginBottom: 24 }} bodyStyle={{ padding: '24px' }}>
                        <div className="sales-filter-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 120px' }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Status</label>
                                <Select value={filterStatus} onChange={setFilterStatus} style={{ width: '100%' }}>
                                    <Option value="all">All Status</Option>
                                    <Option value="pending">Pending</Option>
                                    <Option value="approved">Approved</Option>
                                    <Option value="rejected">Rejected</Option>
                                    <Option value="settled">Settled</Option>
                                </Select>
                            </div>
                            <div style={{ flex: '1 1 180px' }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Staff</label>
                                <Select
                                    value={filterStaff}
                                    onChange={setFilterStaff}
                                    style={{ width: '100%' }}
                                    placeholder="All Staff"
                                    allowClear
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {staffList.map(s => (
                                        <Option key={s.id} value={s.id}>{s.name || s.phone}</Option>
                                    ))}
                                </Select>
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Type</label>
                                <Select value={filterType} onChange={setFilterType} style={{ width: '100%' }}>
                                    <Option value="all">All Types</Option>
                                    {EXPENSE_TYPE_OPTIONS.map((t) => (
                                        <Option key={t.value} value={t.value}>{t.label}</Option>
                                    ))}
                                </Select>
                            </div>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Date Range</label>
                                <RangePicker
                                    value={filterDates}
                                    onChange={setFilterDates}
                                    style={{ width: '100%', height: 32 }}
                                />
                            </div>
                            <div style={{ flex: '0 0 100px' }}>
                                <Button icon={<ReloadOutlined />} shape="round" onClick={() => { setFilterStatus('all'); setFilterStaff(null); setFilterType('all'); setFilterDates(null); setPage(1); }} style={{ width: '100%' }}>
                                    Reset
                                </Button>
                            </div>
                            <div style={{ flex: '0 0 100px' }}>
                                <Button icon={<DownloadOutlined />} shape="round" onClick={handleExport} style={{ width: '100%' }}>
                                    Export
                                </Button>
                            </div>
                            <div style={{ flex: '0 0 140px' }}>
                                <Button type="primary" icon={<PlusOutlined />} shape="round" onClick={openAddClaim} style={{ width: '100%' }}>
                                    Add Claim
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Table */}
                    <Card className="sales-content-card" bodyStyle={{ padding: '24px' }}>
                        <Table
                            dataSource={expenses}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                current: page,
                                pageSize: 15,
                                total,
                                onChange: (p) => setPage(p),
                                showTotal: (t) => `Total ${t} claims`,
                                showSizeChanger: false,
                            }}
                            scroll={{ x: 1200 }}
                            size="middle"
                        />
                    </Card>
                </Content>
            </Layout>

            {/* Add/Edit Claim Modal */}
            <Modal
                title={editingRecord ? `Edit Expense Claim - ${editingRecord.claimId || ''}` : 'Add Expense Claim'}
                open={addVisible}
                onCancel={closeClaimModal}
                footer={null}
                width={600}
            >
                <Form form={addForm} layout="vertical" onFinish={handleSaveClaim}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="staffId" label="Staff Member" rules={[{ required: true, message: 'Select staff' }]}>
                                <Select placeholder="Select staff..." showSearch optionFilterProp="children" disabled={!!editingRecord}>
                                    {staffList.map(s => <Option key={s.id} value={s.id}>{s.name || s.phone}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expenseType" label="Expense Type" rules={[{ required: true }]}>
                                <Select placeholder="Select type">
                                    {EXPENSE_TYPE_OPTIONS.map((t) => (
                                        <Option key={t.value} value={t.value}>{t.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]} initialValue={dayjs()}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Enter amount' }]}>
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="Enter amount" />
                            </Form.Item>
                        </Col>
                    </Row>
                    {editingRecord && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="approvedAmount" label="Approved Amount (₹)">
                                    <InputNumber min={0} style={{ width: '100%' }} placeholder="Approved amount" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Select status' }]}>
                                    <Select placeholder="Select status">
                                        <Option value="pending">Pending</Option>
                                        <Option value="approved">Approved</Option>
                                        <Option value="rejected">Rejected</Option>
                                        <Option value="settled">Settled</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="billNumber" label="Bill / Invoice Number">
                                <Input placeholder="Bill number" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="attachment" label="Attachment">
                                <Upload maxCount={1} beforeUpload={() => false} accept="image/*,.pdf">
                                    <Button icon={<UploadOutlined />}>{editingRecord?.attachmentUrl ? 'Replace Bill' : 'Upload Bill'}</Button>
                                </Upload>
                            </Form.Item>
                            {editingRecord?.attachmentUrl && (
                                <Text type="secondary" style={{ fontSize: 12 }}>Existing attachment will stay if no new file is selected.</Text>
                            )}
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} placeholder="Describe the expense..." />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={closeClaimModal}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={addLoading}>{editingRecord ? 'Update Claim' : 'Submit Claim'}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                title={`Expense Detail - ${detailRecord?.claimId || ''}`}
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailVisible(false)}>Close</Button>,
                    ...(detailRecord?.status === 'pending' ? [
                        <Button key="reject" danger onClick={() => { handleStatusChange(detailRecord.id, 'rejected'); setDetailVisible(false); }}>Reject</Button>,
                        <Button key="approve" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => { handleStatusChange(detailRecord.id, 'approved', detailRecord.amount); setDetailVisible(false); }}>Approve</Button>,
                    ] : []),
                    ...(detailRecord?.status === 'approved' ? [
                        <Button key="settle" type="primary" onClick={() => { handleStatusChange(detailRecord.id, 'settled'); setDetailVisible(false); }}>Mark Settled</Button>,
                    ] : []),
                ]}
                width={600}
            >
                {detailRecord && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div><Text type="secondary">Staff:</Text><br /><Text strong>{detailRecord.staffName}</Text></div>
                        <div><Text type="secondary">Department:</Text><br /><Text strong>{detailRecord.department}</Text></div>
                        <div><Text type="secondary">Type:</Text><br /><Tag>{detailRecord.expenseType || 'Other'}</Tag></div>
                        <div><Text type="secondary">Date:</Text><br /><Text strong>{dayjs(detailRecord.expenseDate).format('DD MMM YYYY')}</Text></div>
                        <div><Text type="secondary">Amount:</Text><br /><Text strong style={{ fontSize: 18 }}>₹ {Number(detailRecord.amount || 0).toLocaleString('en-IN')}</Text></div>
                        <div><Text type="secondary">Status:</Text><br /><Tag color={statusColors[detailRecord.status]}>{(detailRecord.status || '').toUpperCase()}</Tag></div>
                        <div><Text type="secondary">Bill Number:</Text><br /><Text>{detailRecord.billNumber || '-'}</Text></div>
                        <div><Text type="secondary">Approved Amount:</Text><br /><Text>{detailRecord.approvedAmount ? `₹ ${Number(detailRecord.approvedAmount).toLocaleString('en-IN')}` : '-'}</Text></div>

                        <div style={{ gridColumn: '1 / -1' }}><Text type="secondary">Description:</Text><br /><Text>{detailRecord.description || 'No description'}</Text></div>
                        {detailRecord.attachmentUrl && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <Text type="secondary">Attachment:</Text><br />
                                <a
                                    href={detailRecord.attachmentUrl.startsWith('http') ? detailRecord.attachmentUrl : `${API_BASE_URL}${detailRecord.attachmentUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button icon={<EyeOutlined />}>View Attachment</Button>
                                </a>
                            </div>
                        )}
                        <div><Text type="secondary">Created:</Text><br /><Text>{dayjs(detailRecord.createdAt).format('DD MMM YYYY HH:mm')}</Text></div>
                        {detailRecord.approvedAt && <div><Text type="secondary">Approved:</Text><br /><Text>{dayjs(detailRecord.approvedAt).format('DD MMM YYYY HH:mm')}</Text></div>}
                        {detailRecord.settledAt && <div><Text type="secondary">Settled:</Text><br /><Text>{dayjs(detailRecord.settledAt).format('DD MMM YYYY HH:mm')}</Text></div>}
                    </div>
                )}
            </Modal>
        </Layout>
    );
};

export default ExpenseManagement;
