import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Select, DatePicker, Tag, Space, Typography, Row, Col, Statistic, message, Modal, Form, Input, InputNumber, Upload, Popconfirm } from 'antd';
import {
    DollarOutlined,
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
    EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import Sidebar from './Sidebar';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
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

    const handleAddClaim = async (values) => {
        setAddLoading(true);
        try {
            const fd = new FormData();
            fd.append('expenseType', values.expenseType);
            fd.append('expenseDate', values.expenseDate?.format('YYYY-MM-DD'));
            fd.append('amount', values.amount);
            if (values.billNumber) fd.append('billNumber', values.billNumber);
            if (values.description) fd.append('description', values.description);
            if (values.attachment?.fileList?.[0]?.originFileObj) {
                fd.append('attachment', values.attachment.fileList[0].originFileObj);
            }
            await api.post(`/admin/staff/${values.staffId}/expenses`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Expense claim created');
            setAddVisible(false);
            addForm.resetFields();
            fetchExpenses();
        } catch (e) {
            message.error('Failed to create expense claim');
        } finally {
            setAddLoading(false);
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
            render: (t) => <Text code style={{ fontSize: 12 }}>{t || '-'}</Text>,
            width: 140,
        },
        {
            title: 'Staff',
            dataIndex: 'staffName',
            key: 'staffName',
            render: (name, record) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.department}</Text>
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'expenseType',
            key: 'expenseType',
            render: (t) => <Tag>{t || 'Other'}</Tag>,
        },
        {
            title: 'Date',
            dataIndex: 'expenseDate',
            key: 'expenseDate',
            render: (d) => dayjs(d).format('DD MMM YYYY'),
            sorter: (a, b) => new Date(a.expenseDate) - new Date(b.expenseDate),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (a) => <Text strong>₹ {Number(a || 0).toLocaleString('en-IN')}</Text>,
            sorter: (a, b) => Number(a.amount) - Number(b.amount),
        },
        {
            title: 'Approved Amt',
            dataIndex: 'approvedAmount',
            key: 'approvedAmount',
            render: (a) => a ? <Text style={{ color: '#52c41a' }}>₹ {Number(a).toLocaleString('en-IN')}</Text> : '-',
        },

        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <Tag color={statusColors[s] || 'default'}>{(s || '').toUpperCase()}</Tag>,
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
            render: (b) => b || '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            width: 220,
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => { setDetailRecord(record); setDetailVisible(true); }}>View</Button>
                    {record.status === 'pending' && (
                        <>
                            <Popconfirm
                                title="Approve this claim?"
                                description={`Amount: ₹${record.amount}`}
                                onConfirm={() => handleStatusChange(record.id, 'approved', record.amount)}
                                okText="Approve"
                            >
                                <Button size="small" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}>Approve</Button>
                            </Popconfirm>
                            <Popconfirm
                                title="Reject this claim?"
                                onConfirm={() => handleStatusChange(record.id, 'rejected')}
                                okText="Reject"
                                okButtonProps={{ danger: true }}
                            >
                                <Button size="small" danger>Reject</Button>
                            </Popconfirm>
                        </>
                    )}
                    {record.status === 'approved' && (
                        <Popconfirm
                            title="Mark as settled?"
                            onConfirm={() => handleStatusChange(record.id, 'settled')}
                            okText="Settle"
                        >
                            <Button size="small" type="primary">Settle</Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
                <Header style={{
                    padding: '0 16px',
                    background: '#fff',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ marginRight: 16 }}
                        />
                        <Title level={4} style={{ margin: 0 }}>
                            <WalletOutlined /> Expense Management
                        </Title>
                    </div>
                    <Button
                        type="text"
                        icon={<LogoutOutlined />}
                        onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); }}
                    >
                        Logout
                    </Button>
                </Header>

                <Content style={{ margin: '16px' }}>
                    {/* Stats Cards */}
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12 }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Total Claims</span>} value={stats.total || 0} valueStyle={{ color: '#fff', fontWeight: 700 }} prefix={<FileTextOutlined />} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 12 }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Pending</span>} value={stats.pending || 0} valueStyle={{ color: '#fff', fontWeight: 700 }} prefix={<ClockCircleOutlined />} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: 12 }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Approved</span>} value={stats.approved || 0} valueStyle={{ color: '#fff', fontWeight: 700 }} prefix={<CheckCircleOutlined />} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: 12 }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Rejected</span>} value={stats.rejected || 0} valueStyle={{ color: '#fff', fontWeight: 700 }} prefix={<CloseCircleOutlined />} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: 12 }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Total Amount</span>} value={stats.totalAmount || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 18 }} prefix="₹" />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false} style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', borderRadius: 12 }}>
                                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Pending Amount</span>} value={stats.pendingAmount || 0} valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 18 }} prefix="₹" />
                            </Card>
                        </Col>
                    </Row>

                    {/* Filters & Actions */}
                    <Card style={{ marginBottom: 16, borderRadius: 12 }}>
                        <Row gutter={[16, 12]} align="middle">
                            <Col span={4}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>Status</label>
                                <Select value={filterStatus} onChange={setFilterStatus} style={{ width: '100%' }} placeholder="Status">
                                    <Option value="all">All Status</Option>
                                    <Option value="pending">Pending</Option>
                                    <Option value="approved">Approved</Option>
                                    <Option value="rejected">Rejected</Option>
                                    <Option value="settled">Settled</Option>
                                </Select>
                            </Col>
                            <Col span={5}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>Staff</label>
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
                            </Col>
                            <Col span={4}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>Type</label>
                                <Select value={filterType} onChange={setFilterType} style={{ width: '100%' }} placeholder="Type">
                                    <Option value="all">All Types</Option>
                                    {EXPENSE_TYPE_OPTIONS.map((t) => (
                                        <Option key={t.value} value={t.value}>{t.label}</Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col span={6}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>Date Range</label>
                                <RangePicker
                                    value={filterDates}
                                    onChange={setFilterDates}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col span={2}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'transparent' }}>.</label>
                                <Button icon={<ReloadOutlined />} onClick={() => { setFilterStatus('all'); setFilterStaff(null); setFilterType('all'); setFilterDates(null); setPage(1); }}>
                                    Reset
                                </Button>
                            </Col>
                            <Col span={3}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'transparent' }}>.</label>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddVisible(true)} style={{ width: '100%' }}>
                                    Add Claim
                                </Button>
                            </Col>
                        </Row>
                    </Card>

                    {/* Table */}
                    <Card style={{ borderRadius: 12 }}>
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

            {/* Add Claim Modal */}
            <Modal
                title="Add Expense Claim"
                open={addVisible}
                onCancel={() => { setAddVisible(false); addForm.resetFields(); }}
                footer={null}
                width={600}
            >
                <Form form={addForm} layout="vertical" onFinish={handleAddClaim}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="staffId" label="Staff Member" rules={[{ required: true, message: 'Select staff' }]}>
                                <Select placeholder="Select staff..." showSearch optionFilterProp="children">
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
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="billNumber" label="Bill / Invoice Number">
                                <Input placeholder="Bill number" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="attachment" label="Attachment">
                                <Upload maxCount={1} beforeUpload={() => false} accept="image/*,.pdf">
                                    <Button icon={<UploadOutlined />}>Upload Bill</Button>
                                </Upload>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} placeholder="Describe the expense..." />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { setAddVisible(false); addForm.resetFields(); }}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={addLoading}>Submit Claim</Button>
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
