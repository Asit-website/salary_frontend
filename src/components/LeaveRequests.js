import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Modal, Input, message, Layout, Space, Typography, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
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
    'pt': 'Paternity Leave',
    'unpaid': 'Unpaid Leave'
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

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/leave', { params: { status: statusFilter } });
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
    }, [statusFilter]);

    const handleReview = (request, action) => {
        setSelectedRequest(request);
        setReviewAction(action);
        setReviewNote('');
        setIsNoteModalVisible(true);
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
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
                        <Space>
                            <Typography.Text>Filter by Status:</Typography.Text>
                            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
                                <Option value="PENDING">Pending</Option>
                                <Option value="APPROVED">Approved</Option>
                                <Option value="REJECTED">Rejected</Option>
                            </Select>
                        </Space>
                        <Button type="primary" onClick={fetchRequests}>Refresh</Button>
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
                confirmLoading={reviewLoading}
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
        </Layout>
    );
};

export default LeaveRequests;
