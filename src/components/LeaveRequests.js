import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Table, Button, Modal, Form, Input, Space, message, Tabs, Select, DatePicker, Tag, Typography as AntTypography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SettingOutlined, CheckCircleOutlined, CloseCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import moment from 'moment';

const { Title } = Typography;
const { Header, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

const categoryNames = {
    'cl': 'Casual Leave',
    'sl': 'Sick Leave',
    'el': 'Earned Leave',
    'ml': 'Maternity Leave',
    'pt': 'Paternity Leave'
};

const LeaveRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewAction, setReviewAction] = useState(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [leaveCategories, setLeaveCategories] = useState([]);
    const [createLoading, setCreateLoading] = useState(false);
    const [createForm] = Form.useForm();

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const params = { status: statusFilter };
            if (selectedUserId) params.userId = selectedUserId;
            const response = await api.get('/leave', { params });
            if (response.data.success) {
                setRequests(response.data.leaves || []);
            }
        } catch (error) {
            message.error('Failed to fetch leave requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [statusFilter, selectedUserId]);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await api.get('/admin/staff');
                if (res.data?.success) setStaffList(res.data.staff || []);
            } catch (e) { /* ignore */ }
        };
        fetchStaff();
    }, []);

    const handleReview = (request, action) => {
        setSelectedRequest(request);
        setReviewAction(action);
        setReviewNote('');
        setIsNoteModalVisible(true);
    };

    const fetchCategories = async (userId) => {
        try {
            const res = await api.get('/leave/categories', { params: { userId } });
            if (res.data.success) {
                setLeaveCategories(res.data.categories || []);
            }
        } catch (error) {
            message.error('Failed to load leave categories for staff');
        }
    };

    const handleCreateLeave = async (values) => {
        setCreateLoading(true);
        try {
            const userId = values.userId;
            const startDate = values.range[0].format('YYYY-MM-DD');
            const endDate = values.range[1].format('YYYY-MM-DD');

            // Check for conflicts (holiday/weekly off)
            const checkRes = await api.get('/leave/check-range', { 
                params: { userId, start: startDate, end: endDate } 
            });
            if (checkRes.data.success && checkRes.data.conflict) {
                message.error(checkRes.data.message || 'Conflict in date range');
                setCreateLoading(false);
                return;
            }

            const payload = {
                userId,
                startDate,
                endDate,
                categoryKey: values.categoryKey,
                leaveType: leaveCategories.find(c => c.key === values.categoryKey)?.name || 'Leave',
                reason: values.reason,
                status: 'APPROVED' // Admin creates pre-approved leave
            };
            const res = await api.post('/leave', payload);
            if (res.data.success) {
                message.success('Leave created and approved');
                setIsCreateModalOpen(false);
                createForm.resetFields();
                fetchRequests();
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to create leave');
        } finally {
            setCreateLoading(false);
        }
    };

    const submitReview = async () => {
        setReviewLoading(true);
        try {
            const response = await api.patch(`/leave/${selectedRequest.id}/status`, {
                status: reviewAction,
                note: reviewNote
            });
            if (response.data.success) {
                message.success(`Leave request ${reviewAction.toLowerCase()} successfully`);
                setIsNoteModalVisible(false);
                fetchRequests();
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to process request');
        } finally {
            setReviewLoading(false);
        }
    };

    const columns = [
        {
            title: 'Employee',
            dataIndex: ['user', 'profile', 'name'],
            key: 'employee',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{text || 'Unknown'}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>{record.user?.phone}</Typography.Text>
                </Space>
            )
        },
        {
            title: 'Duration',
            key: 'duration',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text>{moment(record.startDate).format('DD MMM YYYY')} - {moment(record.endDate).format('DD MMM YYYY')}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>{record.days} Days ({record.leaveType})</Typography.Text>
                </Space>
            )
        },
        {
            title: 'Leave Type',
            dataIndex: 'categoryKey',
            key: 'categoryKey',
            render: (text) => {
                const name = categoryNames[text?.toLowerCase()] || text?.toUpperCase() || 'UNPAID';
                return <Tag color="blue">{name}</Tag>;
            }
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'gold';
                if (status === 'APPROVED') color = 'green';
                if (status === 'REJECTED') color = 'red';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 250,
            render: (_, record) => record.status === 'PENDING' && (
                <Space size="small">
                    <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleReview(record, 'APPROVED')}
                    >
                        Approve
                    </Button>
                    <Button
                        danger
                        ghost
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleReview(record, 'REJECTED')}
                    >
                        Reject
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
                <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                            style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' },
                            onClick: () => setCollapsed(!collapsed)
                        })}
                        <Title level={4} style={{ margin: 0 }}>Leave Requests</Title>
                    </div>
                    <div style={{ paddingRight: '24px' }}>
                        <LogoutOutlined style={{ fontSize: '18px', cursor: 'pointer' }} onClick={handleLogout} />
                    </div>
                </Header>
                <Content style={{ margin: '24px', background: '#fff', padding: '24px' }}>
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <Space wrap>
                            <Typography.Text>Filter by Status:</Typography.Text>
                            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
                                <Option value="PENDING">Pending</Option>
                                <Option value="APPROVED">Approved</Option>
                                <Option value="REJECTED">Rejected</Option>
                                <Option value="ALL">All</Option>
                            </Select>

                            <Typography.Text style={{ marginLeft: '16px' }}>Filter by Employee:</Typography.Text>
                            <Select
                                showSearch
                                placeholder="Search by Name"
                                optionFilterProp="children"
                                style={{ width: 220 }}
                                value={selectedUserId}
                                onChange={setSelectedUserId}
                                allowClear
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {staffList
                                    .filter(s => s.name && !s.name.startsWith('Staff '))
                                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                    .map(s => (
                                    <Option key={s.id} value={s.id}>
                                        {s.name}
                                    </Option>
                                ))}
                            </Select>
                        </Space>
                        <Space>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>Create Leave</Button>
                            <Button onClick={fetchRequests}>Refresh</Button>
                        </Space>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={requests}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                    />
                </Content>
            </Layout>

            <Modal
                title={`${reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`}
                open={isNoteModalVisible}
                onOk={submitReview}
                onCancel={() => setIsNoteModalVisible(false)}
            >
                <Typography.Text strong>Reason for {reviewAction?.toLowerCase()}:</Typography.Text>
                <TextArea
                    rows={4}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter note..."
                    style={{ marginTop: '10px' }}
                />
            </Modal>

            <Modal
                title="Create Leave for Staff"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                onOk={() => createForm.submit()}
                confirmLoading={createLoading}
                width={600}
            >
                <Form 
                    form={createForm} 
                    layout="vertical" 
                    onFinish={handleCreateLeave}
                    initialValues={{ reason: 'Created by Admin' }}
                >
                    <Form.Item name="userId" label="Select Staff" rules={[{ required: true }]}>
                        <Select 
                            showSearch 
                            placeholder="Select staff member"
                            onChange={(uid) => {
                                fetchCategories(uid);
                                createForm.setFieldsValue({ categoryKey: undefined });
                            }}
                        >
                            {staffList.map(s => (
                                <Option key={s.id} value={s.id}>{s.name} ({s.phone})</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="range" label="Leave Dates" rules={[{ required: true }]}>
                        <DatePicker.RangePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="categoryKey" label="Leave Type" rules={[{ required: true }]}>
                        <Select placeholder="Select leave type" disabled={!leaveCategories.length}>
                            {leaveCategories.map(c => (
                                <Option key={c.key} value={c.key}>
                                    {c.name} (Rem: {c.remaining})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="reason" label="Reason">
                        <Input.TextArea rows={3} placeholder="Reason for leave" />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default LeaveRequests;
