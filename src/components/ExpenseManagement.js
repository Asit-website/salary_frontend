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
    UserOutlined,
    DollarOutlined
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

    // Pay modal
    const [payVisible, setPayVisible] = useState(false);
    const [payRecord, setPayRecord] = useState(null);
    const [payLoading, setPayLoading] = useState(false);
    const [payForm] = Form.useForm();

    const [expenseTypes, setExpenseTypes] = useState([
        { value: 'Travel', label: 'Travel' },
        { value: 'Food', label: 'Food' },
        { value: 'Office', label: 'Office Supplies' },
        { value: 'Fuel', label: 'Fuel' },
        { value: 'Accommodation', label: 'Accommodation' },
        { value: 'Communication', label: 'Communication' },
        { value: 'Other', label: 'Other' },
    ]);
    const [newTypeName, setNewTypeName] = useState('');

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
        addForm.setFieldsValue({
            expenseType: 'Travel',
            expenseDate: dayjs(),
            expenses: [{}]
        });
        setAddVisible(true);
    };

    const openEditClaim = (record) => {
        setEditingRecord(record);
        let itemsList = [];
        if (record.items) {
            if (typeof record.items === 'string') {
                try {
                    itemsList = JSON.parse(record.items);
                } catch (e) {
                    itemsList = [];
                }
            } else if (Array.isArray(record.items)) {
                itemsList = record.items;
            }
        }
        if (itemsList.length === 0) {
            itemsList = [{
                expenseType: record.expenseType || 'Other',
                amount: Number(record.amount || 0),
                billNumber: record.billNumber || '',
                travelFrom: record.travelFrom || '',
                travelTo: record.travelTo || '',
                mode: record.mode || undefined,
                attachmentUrl: record.attachmentUrl,
            }];
        }
        addForm.setFieldsValue({
            staffId: record.userId,
            expenseDate: record.expenseDate ? dayjs(record.expenseDate) : dayjs(),
            description: record.description || '',
            status: record.status || 'pending',
            approvedAmount: record.approvedAmount !== null && record.approvedAmount !== undefined ? Number(record.approvedAmount) : undefined,
            expenses: itemsList,
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
            const expensesList = values.expenses || [{}];
            const fd = new FormData();
            fd.append('expenseDate', values.expenseDate?.format('YYYY-MM-DD'));
            if (values.description) fd.append('description', values.description);

            if (editingRecord?.id) {
                if (values.status) fd.append('status', values.status);
                if (values.approvedAmount !== undefined && values.approvedAmount !== null) {
                    fd.append('approvedAmount', values.approvedAmount);
                }
            }

            const serializedItems = expensesList.map((exp, index) => {
                const item = {
                    expenseType: exp.expenseType || 'Other',
                    amount: exp.amount || 0,
                    billNumber: exp.billNumber || null,
                    description: exp.description || null,
                };
                if (exp.expenseType === 'Travel') {
                    item.travelFrom = exp.travelFrom || null;
                    item.travelTo = exp.travelTo || null;
                    item.mode = exp.mode || null;
                }
                if (exp.attachment?.fileList?.[0]?.originFileObj) {
                    fd.append(`attachment_${index}`, exp.attachment.fileList[0].originFileObj);
                } else if (exp.attachmentUrl) {
                    item.attachmentUrl = exp.attachmentUrl;
                }
                return item;
            });

            fd.append('expenseType', serializedItems[0]?.expenseType || 'Other');
            fd.append('items', JSON.stringify(serializedItems));

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

    const openPayModal = (record) => {
        setPayRecord(record);
        setPayVisible(true);
        const total = Number(record.approvedAmount !== null && record.approvedAmount !== undefined ? record.approvedAmount : record.amount);
        const paid = Number(record.paidAmount || 0);
        const remaining = Math.max(0, total - paid);
        payForm.setFieldsValue({ amount: remaining });
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
            title: 'Remaining',
            key: 'remainingAmount',
            width: 130,
            render: (_, record) => {
                const total = Number(record.approvedAmount !== null && record.approvedAmount !== undefined ? record.approvedAmount : record.amount);
                const paid = Number(record.paidAmount || 0);
                const remaining = record.status === 'settled' ? 0 : Math.max(0, total - paid);
                const payrollAmt = record.status === 'settled' ? Math.max(0, total - paid) : 0;

                if (paid > 0 || payrollAmt > 0) {
                    return (
                        <div style={{ fontSize: '12px' }}>
                            <span style={{ fontWeight: '600', color: remaining > 0 ? '#fa8c16' : '#8c8c8c' }}>
                                ₹ {remaining.toLocaleString('en-IN')}
                            </span>
                            {paid > 0 && (
                                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>
                                    (Paid: ₹{paid.toLocaleString('en-IN')})
                                </div>
                            )}
                            {payrollAmt > 0 && (
                                <div style={{ fontSize: '10px', color: '#52c41a' }}>
                                    (Payroll: ₹{payrollAmt.toLocaleString('en-IN')})
                                </div>
                            )}
                        </div>
                    );
                }
                return <span style={{ color: '#bfbfbf' }}>-</span>;
            }
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
                    {record.status === 'approved' && (
                        <Button
                            size="small"
                            shape="round"
                            icon={<DollarOutlined />}
                            style={{ background: '#fa8c16', borderColor: '#fa8c16', color: '#fff' }}
                            onClick={() => openPayModal(record)}
                        >
                            Pay
                        </Button>
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
                width={750}
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
                            <Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]} initialValue={dayjs()}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    {editingRecord && (
                        <Row gutter={16}>
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
                            <Col span={12}>
                                <Form.Item name="approvedAmount" label="Approved Amount (₹)">
                                    <InputNumber min={0} style={{ width: '100%' }} placeholder="Approved amount" />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="description" label="Description">
                                <TextArea rows={2} placeholder="Describe the expense..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.List name="expenses">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Card
                                        key={key}
                                        size="small"
                                        style={{ marginBottom: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}
                                        title={<span style={{ fontWeight: 600, color: '#475569' }}>Expense Item #{name + 1}</span>}
                                        extra={fields.length > 1 ? (
                                            <Button type="link" danger onClick={() => remove(name)} style={{ padding: 0 }}>Remove</Button>
                                        ) : null}
                                    >
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'expenseType']}
                                                    label="Expense Type"
                                                    rules={[{ required: true, message: 'Select type' }]}
                                                    initialValue="Travel"
                                                >
                                                    <Select
                                                        placeholder="Select type"
                                                        dropdownRender={(menu) => (
                                                            <>
                                                                {menu}
                                                                <div style={{ display: 'flex', flexWrap: 'nowrap', padding: 8, borderTop: '1px solid #e8e8e8' }}>
                                                                    <Input
                                                                        style={{ flex: 'auto' }}
                                                                        value={newTypeName}
                                                                        onChange={(e) => setNewTypeName(e.target.value)}
                                                                        placeholder="Add custom type..."
                                                                        onKeyDown={(e) => e.stopPropagation()}
                                                                    />
                                                                    <Button
                                                                        type="text"
                                                                        icon={<PlusOutlined />}
                                                                        onClick={() => {
                                                                            if (newTypeName && !expenseTypes.some(t => t.value === newTypeName)) {
                                                                                setExpenseTypes([...expenseTypes, { value: newTypeName, label: newTypeName }]);
                                                                                setNewTypeName('');
                                                                            }
                                                                        }}
                                                                        style={{ flex: 'none', padding: '4px 8px', marginLeft: 4 }}
                                                                    >
                                                                        Add
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}
                                                    >
                                                        {expenseTypes.map((t) => (
                                                            <Option key={t.value} value={t.value}>{t.label}</Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'amount']}
                                                    label="Amount (₹)"
                                                    rules={[{ required: true, message: 'Enter amount' }]}
                                                >
                                                    <InputNumber min={1} style={{ width: '100%' }} placeholder="Amount" />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.expenses?.[name]?.expenseType !== currentValues.expenses?.[name]?.expenseType}>
                                            {({ getFieldValue }) => {
                                                const isTravel = getFieldValue(['expenses', name, 'expenseType']) === 'Travel';
                                                return isTravel ? (
                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'travelFrom']}
                                                                label="From Location"
                                                                rules={[{ required: true, message: 'Enter starting location' }]}
                                                            >
                                                                <Input placeholder="From..." />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'travelTo']}
                                                                label="To Location"
                                                                rules={[{ required: true, message: 'Enter destination' }]}
                                                            >
                                                                <Input placeholder="To..." />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'mode']}
                                                                label="Mode of Transport"
                                                                rules={[{ required: true, message: 'Select mode' }]}
                                                            >
                                                                <Select placeholder="Select mode">
                                                                    <Option value="Car">Car</Option>
                                                                    <Option value="Bike">Bike</Option>
                                                                    <Option value="Train">Train</Option>
                                                                    <Option value="Flight">Flight</Option>
                                                                    <Option value="Bus">Bus</Option>
                                                                    <Option value="Taxi">Taxi</Option>
                                                                    <Option value="Auto">Auto</Option>
                                                                    <Option value="Other">Other</Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'billNumber']}
                                                                label="Bill / Invoice Number"
                                                            >
                                                                <Input placeholder="Bill number" />
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                ) : (
                                                    <Row gutter={16}>
                                                        <Col span={24}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'billNumber']}
                                                                label="Bill / Invoice Number"
                                                            >
                                                                <Input placeholder="Bill number" />
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                );
                                            }}
                                        </Form.Item>
                                        <Row gutter={16}>
                                            <Col span={24}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'attachment']}
                                                    label="Attachment"
                                                >
                                                    <Upload maxCount={1} beforeUpload={() => false} accept="image/*,.pdf">
                                                        <Button icon={<UploadOutlined />}>Upload Bill</Button>
                                                    </Upload>
                                                </Form.Item>
                                                <Form.Item
                                                    noStyle
                                                    shouldUpdate={(prevValues, currentValues) => prevValues.expenses?.[name]?.attachmentUrl !== currentValues.expenses?.[name]?.attachmentUrl}
                                                >
                                                    {({ getFieldValue }) => {
                                                        const url = getFieldValue(['expenses', name, 'attachmentUrl']);
                                                        return url ? (
                                                            <div style={{ marginBottom: 12 }}>
                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                    Existing bill:{' '}
                                                                    <a
                                                                        href={url.startsWith('http') ? url : `${API_BASE_URL}${url}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        View Attachment
                                                                    </a>
                                                                </Text>
                                                            </div>
                                                        ) : null;
                                                    }}
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Add More Expense Line
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
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
                        <Button key="pay" style={{ background: '#fa8c16', borderColor: '#fa8c16', color: '#fff' }} onClick={() => { openPayModal(detailRecord); setDetailVisible(false); }}>Pay Direct</Button>
                    ] : []),
                ]}
                width={800}
            >
                {detailRecord && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div><Text type="secondary">Staff:</Text><br /><Text strong>{detailRecord.staffName}</Text></div>
                        <div><Text type="secondary">Department:</Text><br /><Text strong>{detailRecord.department}</Text></div>
                        <div><Text type="secondary">Type:</Text><br /><Tag>{detailRecord.expenseType || 'Other'}</Tag></div>
                        <div><Text type="secondary">Date:</Text><br /><Text strong>{dayjs(detailRecord.expenseDate).format('DD MMM YYYY')}</Text></div>
                        <div><Text type="secondary">Amount:</Text><br /><Text strong style={{ fontSize: 18 }}>₹ {Number(detailRecord.amount || 0).toLocaleString('en-IN')}</Text></div>
                        <div><Text type="secondary">Status:</Text><br /><Tag color={statusColors[detailRecord.status]}>{(detailRecord.status || '').toUpperCase()}</Tag></div>
                        <div><Text type="secondary">Approved Amount:</Text><br /><Text strong style={{ fontSize: 16 }}>{detailRecord.approvedAmount ? `₹ ${Number(detailRecord.approvedAmount).toLocaleString('en-IN')}` : '-'}</Text></div>
                        <div><Text type="secondary">Already Paid Directly:</Text><br /><Text strong style={{ fontSize: 16, color: '#52c41a' }}>₹ {Number(detailRecord.paidAmount || 0).toLocaleString('en-IN')}</Text></div>
                        <div><Text type="secondary">Remaining Balance:</Text><br /><Text strong style={{ fontSize: 16, color: detailRecord.status === 'settled' ? '#8c8c8c' : '#fa8c16' }}>₹ {Number(detailRecord.status === 'settled' ? 0 : Math.max(0, (detailRecord.approvedAmount !== null && detailRecord.approvedAmount !== undefined ? detailRecord.approvedAmount : detailRecord.amount) - (detailRecord.paidAmount || 0))).toLocaleString('en-IN')}</Text></div>
                        {detailRecord.status === 'settled' && (detailRecord.approvedAmount !== null && detailRecord.approvedAmount !== undefined ? detailRecord.approvedAmount : detailRecord.amount) - (detailRecord.paidAmount || 0) > 0 ? (
                            <div><Text type="secondary">Settled in Payroll:</Text><br /><Text strong style={{ fontSize: 16, color: '#52c41a' }}>₹ {Number((detailRecord.approvedAmount !== null && detailRecord.approvedAmount !== undefined ? detailRecord.approvedAmount : detailRecord.amount) - (detailRecord.paidAmount || 0)).toLocaleString('en-IN')}</Text></div>
                        ) : <div />}
                        {(() => {
                            let paymentsList = [];
                            if (detailRecord.payments) {
                                if (typeof detailRecord.payments === 'string') {
                                    try {
                                        paymentsList = JSON.parse(detailRecord.payments);
                                    } catch (e) {
                                        paymentsList = [];
                                    }
                                } else if (Array.isArray(detailRecord.payments)) {
                                    paymentsList = detailRecord.payments;
                                }
                            }
                            if (paymentsList.length === 0 && Number(detailRecord.paidAmount || 0) > 0) {
                                paymentsList = [{ amount: detailRecord.paidAmount, date: detailRecord.paidAt || detailRecord.settledAt || detailRecord.updatedAt }];
                            }
                            if (paymentsList.length > 0) {
                                return (
                                    <div style={{ gridColumn: '1 / -1', marginTop: 8, backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                                        <Text type="secondary" strong style={{ fontSize: '13px' }}>Direct Payment Installments History:</Text>
                                        <div style={{ marginTop: 8 }}>
                                            {paymentsList.map((p, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: idx < paymentsList.length - 1 ? '1px dashed #f0f0f0' : 'none' }}>
                                                    <Text strong style={{ color: '#52c41a' }}>₹ {Number(p.amount || 0).toLocaleString('en-IN')}</Text>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>{dayjs(p.date).format('DD MMM YYYY, hh:mm A')}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        {(() => {
                            let itemsList = [];
                            if (detailRecord.items) {
                                if (typeof detailRecord.items === 'string') {
                                    try {
                                        itemsList = JSON.parse(detailRecord.items);
                                    } catch (e) {
                                        itemsList = [];
                                    }
                                } else if (Array.isArray(detailRecord.items)) {
                                    itemsList = detailRecord.items;
                                }
                            }
                            return itemsList.length > 0 ? (
                                <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
                                    <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8, color: '#475569' }}>Claimed Line Items</Text>
                                    <Table
                                        size="small"
                                        dataSource={itemsList}
                                        columns={[
                                            {
                                                title: 'No.',
                                                render: (_, __, idx) => idx + 1,
                                                width: 50,
                                            },
                                            {
                                                title: 'Type',
                                                dataIndex: 'expenseType',
                                                key: 'expenseType',
                                                render: (type) => <Tag>{type || 'Other'}</Tag>,
                                                width: 100,
                                            },
                                            {
                                                title: 'Amount',
                                                dataIndex: 'amount',
                                                key: 'amount',
                                                render: (amt) => `₹${Number(amt || 0).toLocaleString('en-IN')}`,
                                            },
                                            {
                                                title: 'Details',
                                                key: 'details',
                                                render: (_, item) => {
                                                    if (item.expenseType === 'Travel') {
                                                        return (
                                                            <div>
                                                                <div><strong>Route:</strong> {item.travelFrom || '-'} ➔ {item.travelTo || '-'}</div>
                                                                <div><strong>Mode:</strong> {item.mode || '-'}</div>
                                                            </div>
                                                        );
                                                    }
                                                    return <span>-</span>;
                                                }
                                            },
                                            {
                                                title: 'Bill / Desc',
                                                key: 'billDesc',
                                                render: (_, item) => (
                                                    <div>
                                                        {item.billNumber && <div><strong>Bill:</strong> {item.billNumber}</div>}
                                                        {item.description && <div><strong>Desc:</strong> {item.description}</div>}
                                                    </div>
                                                )
                                            },
                                            {
                                                title: 'Attachment',
                                                dataIndex: 'attachmentUrl',
                                                key: 'attachmentUrl',
                                                render: (url) => url ? (
                                                    <a
                                                        href={url.startsWith('http') ? url : `${API_BASE_URL}${url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button size="small" type="link" icon={<EyeOutlined />}>View</Button>
                                                    </a>
                                                ) : '-'
                                            }
                                        ]}
                                        pagination={false}
                                        rowKey={(item, idx) => idx}
                                        bordered
                                    />
                                </div>
                            ) : (
                                <>
                                    <div><Text type="secondary">Bill Number:</Text><br /><Text>{detailRecord.billNumber || '-'}</Text></div>
                                    <div />
                                    {detailRecord.travelFrom && <div><Text type="secondary">From Location:</Text><br /><Text strong>{detailRecord.travelFrom}</Text></div>}
                                    {detailRecord.travelTo && <div><Text type="secondary">To Location:</Text><br /><Text strong>{detailRecord.travelTo}</Text></div>}
                                    {detailRecord.mode && <div><Text type="secondary">Mode of Transport:</Text><br /><Text strong>{detailRecord.mode}</Text></div>}

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
                                </>
                            );
                        })()}
                        <div><Text type="secondary">Created:</Text><br /><Text>{dayjs(detailRecord.createdAt).format('DD MMM YYYY HH:mm')}</Text></div>
                        {detailRecord.approvedAt && <div><Text type="secondary">Approved:</Text><br /><Text>{dayjs(detailRecord.approvedAt).format('DD MMM YYYY HH:mm')}</Text></div>}
                        {detailRecord.settledAt && <div><Text type="secondary">Settled:</Text><br /><Text>{dayjs(detailRecord.settledAt).format('DD MMM YYYY HH:mm')}</Text></div>}
                    </div>
                )}
            </Modal>

            {/* Direct Payment Modal */}
            <Modal
                title={payRecord ? `Direct Payment - ${payRecord.claimId || ''}` : 'Direct Payment'}
                open={payVisible}
                onCancel={() => { setPayVisible(false); setPayRecord(null); payForm.resetFields(); }}
                onOk={() => payForm.submit()}
                confirmLoading={payLoading}
                okText="Submit Payment"
            >
                {payRecord && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">Staff Member:</Text> <Text strong>{payRecord.staffName}</Text>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">Total Approved Amount:</Text>{' '}
                            <Text strong>₹{payRecord.approvedAmount !== null && payRecord.approvedAmount !== undefined ? payRecord.approvedAmount : payRecord.amount}</Text>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">Already Paid Directly:</Text> <Text strong style={{ color: '#52c41a' }}>₹{payRecord.paidAmount || 0}</Text>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">Remaining Balance:</Text>{' '}
                            <Text strong style={{ color: '#fa8c16' }}>
                                ₹{Math.max(0, (payRecord.approvedAmount !== null && payRecord.approvedAmount !== undefined ? payRecord.approvedAmount : payRecord.amount) - (payRecord.paidAmount || 0))}
                            </Text>
                        </div>
                    </div>
                )}
                <Form
                    form={payForm}
                    layout="vertical"
                    onFinish={async (values) => {
                        setPayLoading(true);
                        try {
                            await api.post(`/admin/expenses/${payRecord.id}/pay`, { amount: values.amount });
                            message.success('Payment successfully processed');
                            setPayVisible(false);
                            setPayRecord(null);
                            payForm.resetFields();
                            fetchExpenses();
                        } catch (e) {
                            message.error(e.response?.data?.message || 'Failed to process payment');
                        } finally {
                            setPayLoading(false);
                        }
                    }}
                >
                    <Form.Item
                        name="amount"
                        label="Payment Amount (₹)"
                        rules={[
                            { required: true, message: 'Enter payment amount' },
                            {
                                validator: (_, value) => {
                                    if (value === undefined || value === null) return Promise.resolve();
                                    const total = Number(payRecord.approvedAmount !== null && payRecord.approvedAmount !== undefined ? payRecord.approvedAmount : payRecord.amount);
                                    const paid = Number(payRecord.paidAmount || 0);
                                    const remaining = Math.max(0, total - paid);
                                    if (value <= 0) return Promise.reject(new Error('Amount must be greater than 0'));
                                    if (value > remaining) return Promise.reject(new Error(`Amount cannot exceed remaining balance of ₹${remaining}`));
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <InputNumber style={{ width: '100%' }} placeholder="Enter amount to pay directly..." precision={2} min={0.01} />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default ExpenseManagement;
