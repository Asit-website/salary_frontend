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

const LeaveEncashment = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [reviewAction, setReviewAction] = useState(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const response = await api.get('/leave/encash/claims');
            if (response.data.success) {
                setClaims(response.data.claims || []);
            }
        } catch (error) {
            message.error('Failed to fetch encashment claims');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    const handleReview = (claim, action) => {
        setSelectedClaim(claim);
        setReviewAction(action);
        setReviewNote('');
        setIsNoteModalVisible(true);
    };

    const submitReview = async () => {
        setReviewLoading(true);
        try {
            const response = await api.post('/leave/encash/review', {
                id: selectedClaim.id,
                status: reviewAction,
                reviewNote: reviewNote
            });
            if (response.data.success) {
                message.success(`Encashment claim ${reviewAction.toLowerCase()} successfully`);
                setIsNoteModalVisible(false);
                fetchClaims();
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to process claim');
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
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>{record.user?.phone} ({record.user?.profile?.staffId})</Typography.Text>
                </Space>
            )
        },
        {
            title: 'Leave Type',
            dataIndex: 'categoryKey',
            key: 'categoryKey',
            render: (text) => {
                const name = categoryNames[text?.toLowerCase()] || text?.toUpperCase();
                return <Tag color="blue">{name}</Tag>;
            }
        },
        {
            title: 'Days',
            dataIndex: 'days',
            key: 'days',
            render: (days) => <Typography.Text strong>{days} Days</Typography.Text>
        },
        {
            title: 'Month',
            dataIndex: 'monthKey',
            key: 'monthKey',
            render: (val) => moment(val, 'YYYY-MM').format('MMMM YYYY')
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
            title: 'Applied On',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (val) => moment(val).format('DD MMM YYYY')
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => record.status === 'PENDING' && (
                <Space>
                    <Button
                        type="primary"
                        ghost
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleReview(record, 'APPROVED')}
                    >
                        Approve
                    </Button>
                    <Button
                        danger
                        ghost
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
                        <Title level={4} style={{ margin: 0 }}>Leave Encashment Claims</Title>
                    </div>
                    <div style={{ paddingRight: '24px' }}>
                        <LogoutOutlined style={{ fontSize: '18px', cursor: 'pointer' }} onClick={handleLogout} />
                    </div>
                </Header>
                <Content style={{ margin: '24px', background: '#fff', padding: '24px' }}>
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" onClick={fetchClaims}>Refresh</Button>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={claims}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                    />
                </Content>
            </Layout>

            <Modal
                title={`${reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Encashment Claim`}
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
                <div style={{ marginTop: '15px' }}>
                    <Typography.Text type="secondary">
                        Note: Approving will automatically deduct the specified days from the employee's leave balance and add it to their next payroll.
                    </Typography.Text>
                </div>
            </Modal>
        </Layout>
    );
};

export default LeaveEncashment;
