import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Input, message, Layout, Space, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import moment from 'moment';

const { Title } = Typography;
const { Content } = Layout;
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
            key: 'employee',
            render: (_, record) => {
                const name = record.user?.profile?.name || 'Unknown';
                const phone = record.user?.phone || 'No phone';
                const staffId = record.user?.profile?.staffId || 'N/A';
                return (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            backgroundColor: '#e6f7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            color: '#1677ff',
                            fontSize: '16px',
                            fontWeight: '700',
                            boxShadow: '0 2px 6px rgba(22, 119, 255, 0.08)'
                        }}>
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1677ff' }}>{name}</div>
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>{phone} (ID: {staffId})</div>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Leave Type',
            dataIndex: 'categoryKey',
            key: 'categoryKey',
            render: (text) => {
                const name = categoryNames[text?.toLowerCase()] || text?.toUpperCase();
                return (
                    <span className="sales-status-tag sales-status-active">
                        {name}
                    </span>
                );
            }
        },
        {
            title: 'Days',
            dataIndex: 'days',
            key: 'days',
            render: (days) => <Typography.Text style={{ fontWeight: '600', color: '#1f1f1f' }}>{days} Days</Typography.Text>
        },
        {
            title: 'Month',
            dataIndex: 'monthKey',
            key: 'monthKey',
            render: (val) => <span style={{ fontWeight: '500' }}>{moment(val, 'YYYY-MM').format('MMMM YYYY')}</span>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let statusClass = 'sales-status-pending';
                if (status === 'APPROVED') statusClass = 'sales-status-complete';
                if (status === 'REJECTED') statusClass = 'sales-status-inactive';
                return (
                    <span className={`sales-status-tag ${statusClass}`}>
                        {status}
                    </span>
                );
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
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleReview(record, 'APPROVED')}
                        shape="round"
                        style={{ borderColor: '#52c41a', color: '#52c41a' }}
                    >
                        Approve
                    </Button>
                    <Button
                        danger
                        ghost
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleReview(record, 'REJECTED')}
                        shape="round"
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
            <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
                <MainHeader 
                    collapsed={collapsed} 
                    setCollapsed={setCollapsed} 
                    title="Leave Encashment Claims" 
                />
                
                <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
                    <Card
                        className="sales-content-card"
                        bodyStyle={{ padding: '24px' }}
                    >
                        {/* Sleek Filter & Action Row */}
                        <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                            <Button type="primary" onClick={fetchClaims} shape="round">Refresh</Button>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={claims}
                            rowKey="id"
                            loading={loading}
                            className="sales-table"
                            pagination={{ 
                                pageSize: 15,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                            }}
                        />
                    </Card>
                </Content>
            </Layout>

            {/* Note Review Modal */}
            <Modal
                title={`${reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Encashment Claim`}
                open={isNoteModalVisible}
                onOk={submitReview}
                confirmLoading={reviewLoading}
                onCancel={() => setIsNoteModalVisible(false)}
                className="sales-modal"
                destroyOnClose
            >
                <span className="modal-field-label" style={{ marginTop: '10px', display: 'block' }}>Reason for {reviewAction?.toLowerCase()}:</span>
                <TextArea
                    rows={4}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter review note here..."
                    style={{ marginTop: '8px' }}
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
