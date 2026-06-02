import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Table, Button, Modal, Form, Input, Space, message, Select, DatePicker } from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import moment from 'moment';

const { Title } = Typography;
const { Content } = Layout;
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
            key: 'employee',
            render: (_, record) => {
                const name = record.user?.profile?.name || 'Unknown';
                const phone = record.user?.phone || 'No phone';
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
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>{phone}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Duration',
            key: 'duration',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Typography.Text style={{ fontSize: '14px', fontWeight: '500' }}>
                        {moment(record.startDate).format('DD MMM YYYY')} - {moment(record.endDate).format('DD MMM YYYY')}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.days} Days ({record.leaveType})
                    </Typography.Text>
                </Space>
            )
        },
        {
            title: 'Leave Type',
            dataIndex: 'categoryKey',
            key: 'categoryKey',
            render: (text) => {
                const name = categoryNames[text?.toLowerCase()] || text?.toUpperCase() || 'UNPAID';
                return (
                    <span className="sales-status-tag sales-status-active">
                        {name}
                    </span>
                );
            }
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            render: (text) => <span style={{ color: '#595959', fontWeight: '500' }}>{text || '-'}</span>
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
                    title="Leave Requests" 
                />
                
                <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
                    <Card
                        className="sales-content-card"
                        bodyStyle={{ padding: '24px' }}
                    >
                        {/* Sleek Filter & Action Row */}
                        <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
                                    <Option value="ALL">Status: All</Option>
                                    <Option value="PENDING">Status: Pending</Option>
                                    <Option value="APPROVED">Status: Approved</Option>
                                    <Option value="REJECTED">Status: Rejected</Option>
                                </Select>

                                <Select
                                    showSearch
                                    placeholder="Filter by Employee"
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
                            </div>
                            <Space wrap size={8}>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)} shape="round">
                                    Create Leave
                                </Button>
                                <Button onClick={fetchRequests} shape="round">
                                    Refresh
                                </Button>
                            </Space>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={requests}
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
                title={`${reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`}
                open={isNoteModalVisible}
                onOk={submitReview}
                onCancel={() => setIsNoteModalVisible(false)}
                confirmLoading={reviewLoading}
                className="sales-modal"
                destroyOnClose
            >
                <span className="modal-field-label" style={{ marginTop: '10px', display: 'block' }}>Reason for {reviewAction?.toLowerCase()}</span>
                <TextArea
                    rows={4}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter review note here..."
                    style={{ marginTop: '8px' }}
                />
            </Modal>

            {/* Create Leave Modal */}
            <Modal
                title="Create Leave for Staff"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                onOk={() => createForm.submit()}
                confirmLoading={createLoading}
                width={600}
                className="sales-modal"
                destroyOnClose
            >
                <Form 
                    form={createForm} 
                    layout="vertical" 
                    onFinish={handleCreateLeave}
                    initialValues={{ reason: 'Created by Admin' }}
                >
                    <Form.Item name="userId" label={<span className="modal-field-label">Select Staff Member</span>} rules={[{ required: true, message: 'Please select staff member' }]}>
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

                    <Form.Item name="range" label={<span className="modal-field-label">Leave Dates Range</span>} rules={[{ required: true, message: 'Please select date range' }]}>
                        <DatePicker.RangePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="categoryKey" label={<span className="modal-field-label">Leave Type / Category</span>} rules={[{ required: true, message: 'Please select leave category' }]}>
                        <Select placeholder="Select leave type" disabled={!leaveCategories.length}>
                            {leaveCategories.map(c => (
                                <Option key={c.key} value={c.key}>
                                    {c.name} (Remaining: {c.remaining})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="reason" label={<span className="modal-field-label">Reason / Remark</span>}>
                        <Input.TextArea rows={3} placeholder="Reason for leave" />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default LeaveRequests;
