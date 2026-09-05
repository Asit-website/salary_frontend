import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Input, message, Layout, Space, Typography, Select, Form, DatePicker, Tag, InputNumber, Switch } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

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

    // Admin Create Encashment States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [staffList, setStaffList] = useState([]);
    const [createLoading, setCreateLoading] = useState(false);
    const [checkingBalance, setCheckingBalance] = useState(false);
    const [availableBalance, setAvailableBalance] = useState(null);

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

    const fetchStaffList = async () => {
        try {
            const res = await api.get('/admin/staff');
            if (res.data && res.data.success) {
                setStaffList(res.data.staff || res.data.users || []);
            } else if (Array.isArray(res.data)) {
                setStaffList(res.data);
            }
        } catch (e) {
            try {
                const res2 = await api.get('/me/staff-list');
                if (res2.data?.success) {
                    setStaffList(res2.data.staff || []);
                }
            } catch (_) {}
        }
    };

    useEffect(() => {
        fetchClaims();
        fetchStaffList();
    }, []);

    // Live balance check when staff, category, or month is selected
    const handleCheckBalance = async (userId, categoryKey, monthVal) => {
        const targetUserId = userId || createForm.getFieldValue('userId');
        const targetCat = categoryKey || createForm.getFieldValue('categoryKey');
        const targetMonth = monthVal || createForm.getFieldValue('monthKey');

        if (!targetUserId || !targetCat) {
            setAvailableBalance(null);
            return;
        }

        let monthStr = dayjs().format('YYYY-MM');
        if (targetMonth) {
            if (typeof targetMonth === 'string') monthStr = targetMonth;
            else if (targetMonth.format) monthStr = targetMonth.format('YYYY-MM');
        }

        setCheckingBalance(true);
        try {
            const res = await api.get('/leave/encash/balance-check', {
                params: { userId: targetUserId, categoryKey: targetCat, monthKey: monthStr }
            });
            if (res.data?.success) {
                setAvailableBalance(res.data.remaining !== undefined ? res.data.remaining : 0);
            }
        } catch (e) {
            setAvailableBalance(0);
        } finally {
            setCheckingBalance(false);
        }
    };

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

    const handleCreateSubmit = async () => {
        try {
            const values = await createForm.validateFields();
            setCreateLoading(true);

            let monthStr = dayjs().format('YYYY-MM');
            if (values.monthKey) {
                if (typeof values.monthKey === 'string') {
                    monthStr = values.monthKey;
                } else if (values.monthKey.format) {
                    monthStr = values.monthKey.format('YYYY-MM');
                }
            }

            const payload = {
                userId: values.userId,
                categoryKey: values.categoryKey,
                days: values.days,
                monthKey: monthStr,
                status: values.autoApprove !== false ? 'APPROVED' : 'PENDING',
                reviewNote: values.reviewNote || 'Created by Admin'
            };

            const res = await api.post('/leave/encash/admin-create', payload);

            if (res.data?.success) {
                message.success('Leave Encashment created successfully!');
                setIsCreateModalOpen(false);
                createForm.resetFields();
                setAvailableBalance(null);
                fetchClaims();
            } else {
                message.error(res.data?.message || 'Failed to create encashment');
            }
        } catch (e) {
            if (e.response?.data?.message) {
                message.error(e.response.data.message);
            } else if (!e.errorFields) {
                message.error('Failed to create encashment claim');
            }
        } finally {
            setCreateLoading(false);
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
            render: (val) => <span style={{ fontWeight: '500' }}>{dayjs(val, 'YYYY-MM').format('MMMM YYYY')}</span>
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
            render: (val) => dayjs(val).format('DD MMM YYYY')
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
                        <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Title level={4} style={{ margin: 0 }}>All Claims</Title>
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    shape="round"
                                    onClick={() => {
                                        createForm.resetFields();
                                        createForm.setFieldsValue({
                                            monthKey: dayjs(),
                                            autoApprove: true
                                        });
                                        setAvailableBalance(null);
                                        setIsCreateModalOpen(true);
                                    }}
                                    style={{ background: '#1677ff', borderColor: '#1677ff' }}
                                >
                                    Add Leave Encashment
                                </Button>
                                <Button type="default" onClick={fetchClaims} shape="round">Refresh</Button>
                            </Space>
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
                    <Text type="secondary">
                        Note: Approving will automatically deduct the specified days from the employee's leave balance and add it to their next payroll.
                    </Text>
                </div>
            </Modal>

            {/* Admin Add Leave Encashment Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PlusOutlined style={{ color: '#1677ff' }} />
                        <span>Add Staff Leave Encashment</span>
                    </div>
                }
                open={isCreateModalOpen}
                onOk={handleCreateSubmit}
                confirmLoading={createLoading}
                onCancel={() => setIsCreateModalOpen(false)}
                okText="Submit Encashment"
                cancelText="Cancel"
                destroyOnClose
                width={520}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    style={{ marginTop: '16px' }}
                    initialValues={{
                        autoApprove: true,
                        monthKey: dayjs()
                    }}
                >
                    <Form.Item
                        name="userId"
                        label="Select Staff Member"
                        rules={[{ required: true, message: 'Please select an employee' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Search & select employee..."
                            optionFilterProp="children"
                            onChange={() => {
                                const uid = createForm.getFieldValue('userId');
                                const cat = createForm.getFieldValue('categoryKey');
                                handleCheckBalance(uid, cat);
                            }}
                            filterOption={(input, option) =>
                                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {staffList.map(s => {
                                const name = s.profile?.name || s.name || s.phone || `Staff #${s.id}`;
                                const staffId = s.profile?.staffId ? ` (${s.profile.staffId})` : '';
                                return (
                                    <Option key={s.id} value={s.id}>
                                        {name}{staffId}
                                    </Option>
                                );
                            })}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="categoryKey"
                        label="Leave Category"
                        rules={[{ required: true, message: 'Please select leave category' }]}
                    >
                        <Select
                            placeholder="Select leave type..."
                            onChange={() => {
                                const uid = createForm.getFieldValue('userId');
                                const cat = createForm.getFieldValue('categoryKey');
                                handleCheckBalance(uid, cat);
                            }}
                        >
                            <Option value="el">Earned Leave (EL / Paid Leave)</Option>
                            <Option value="cl">Casual Leave (CL)</Option>
                            <Option value="sl">Sick Leave (SL)</Option>
                            <Option value="ml">Maternity Leave (ML)</Option>
                            <Option value="pt">Paternity Leave (PT)</Option>
                        </Select>
                    </Form.Item>

                    {/* Live Balance Indicator */}
                    {checkingBalance ? (
                        <div style={{ marginBottom: 16 }}>
                            <Tag color="processing">Checking available balance...</Tag>
                        </div>
                    ) : availableBalance !== null && (
                        <div style={{ marginBottom: 16 }}>
                            <Tag color={availableBalance > 0 ? "success" : "warning"} icon={<InfoCircleOutlined />} style={{ fontSize: '13px', padding: '4px 10px' }}>
                                Available Remaining Balance: <strong>{availableBalance} Days</strong>
                            </Tag>
                        </div>
                    )}

                    <Form.Item
                        name="days"
                        label="Number of Days to Encash"
                        rules={[
                            { required: true, message: 'Please enter days' },
                            () => ({
                                validator(_, value) {
                                    if (value && availableBalance !== null && Number(value) > availableBalance) {
                                        return Promise.reject(new Error(`Cannot encash more than available balance (${availableBalance} days)`));
                                    }
                                    return Promise.resolve();
                                }
                            })
                        ]}
                    >
                        <InputNumber
                            min={0.5}
                            max={availableBalance !== null ? availableBalance : 365}
                            step={0.5}
                            precision={1}
                            style={{ width: '100%' }}
                            placeholder="e.g. 2 or 2.5"
                        />
                    </Form.Item>

                    <Form.Item
                        name="monthKey"
                        label="Payout Month (Payroll Month)"
                        rules={[{ required: true, message: 'Please select month' }]}
                    >
                        <DatePicker
                            picker="month"
                            format="YYYY-MM"
                            style={{ width: '100%' }}
                            placeholder="Select month"
                            onChange={(val) => {
                                handleCheckBalance(null, null, val);
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="autoApprove"
                        label="Auto Approve & Deduct Leave Balance"
                        valuePropName="checked"
                    >
                        <Switch defaultChecked />
                    </Form.Item>

                    <Form.Item
                        name="reviewNote"
                        label="Remarks / Note (Optional)"
                    >
                        <Input placeholder="e.g. Annual leave encashment approved by HR" />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default LeaveEncashment;
