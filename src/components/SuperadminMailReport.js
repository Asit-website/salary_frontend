import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Tag, Space, Button, Typography, Row, Col, Statistic, Input, Breadcrumb, message } from 'antd';
import { ArrowLeftOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, SearchOutlined, FileExcelOutlined, PauseOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SuperadminMailReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const resp = await api.get(`/superadmin/mail/campaign/${id}/details`);
            if (resp.data.success) {
                setData(resp.data);
            }
        } catch (err) {
            console.error('Failed to load report data:', err);
        } finally {
            setLoading(false);
        }
    };

    const onSelectChange = (newSelectedRowKeys) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record) => ({
            disabled: record.status === 'SENT' || (record.status === 'FAILED' && record.error !== 'PAUSED'),
            name: record.recipientEmail,
        }),
    };

    const handlePauseSingle = async (queueId) => {
        try {
            const resp = await api.post(`/superadmin/mail/queue/${queueId}/pause`);
            if (resp.data.success) {
                message.success('Recipient paused successfully');
                loadData();
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to pause recipient');
        }
    };

    const handleResumeSingle = async (queueId) => {
        try {
            const resp = await api.post(`/superadmin/mail/queue/${queueId}/resume`);
            if (resp.data.success) {
                message.success('Recipient resumed successfully');
                loadData();
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to resume recipient');
        }
    };

    const handleBatchPause = async () => {
        if (selectedRowKeys.length === 0) return;
        try {
            const resp = await api.post('/superadmin/mail/queue/batch-pause', { ids: selectedRowKeys });
            if (resp.data.success) {
                message.success(resp.data.message || 'Selected recipients paused successfully');
                setSelectedRowKeys([]);
                loadData();
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to pause selected recipients');
        }
    };

    const handleBatchResume = async () => {
        if (selectedRowKeys.length === 0) return;
        try {
            const resp = await api.post('/superadmin/mail/queue/batch-resume', { ids: selectedRowKeys });
            if (resp.data.success) {
                message.success(resp.data.message || 'Selected recipients resumed successfully');
                setSelectedRowKeys([]);
                loadData();
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to resume selected recipients');
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const columns = [
        {
            title: 'Recipient Name',
            dataIndex: 'recipientName',
            key: 'name',
            render: text => text || <Text type="secondary">N/A</Text>
        },
        {
            title: 'Email Address',
            dataIndex: 'recipientEmail',
            key: 'email',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                if (record.isOpened) return <Tag color="cyan" icon={<EyeOutlined />}>OPENED</Tag>;
                if (status === 'SENT') return <Tag color="green" icon={<CheckCircleOutlined />}>SENT</Tag>;
                if (status === 'FAILED') {
                    if (record.error === 'PAUSED') {
                        return <Tag color="orange" icon={<PauseOutlined />}>PAUSED</Tag>;
                    }
                    return <Tag color="red" icon={<CloseCircleOutlined />}>FAILED</Tag>;
                }
                return <Tag color="orange">{status}</Tag>;
            }
        },
        {
            title: 'Sent At',
            dataIndex: 'sentAt',
            key: 'sentAt',
            render: d => d ? new Date(d).toLocaleString() : '-'
        },
        {
            title: 'Opened At',
            dataIndex: 'openedAt',
            key: 'openedAt',
            render: d => d ? new Date(d).toLocaleString() : '-'
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => {
                if (record.status === 'PENDING') {
                    return (
                        <Button 
                            type="link" 
                            size="small" 
                            style={{ color: '#faad14', padding: 0 }}
                            onClick={() => handlePauseSingle(record.id)}
                        >
                            Pause
                        </Button>
                    );
                }
                if (record.status === 'FAILED' && record.error === 'PAUSED') {
                    return (
                        <Button 
                            type="link" 
                            size="small" 
                            style={{ color: '#52c41a', padding: 0 }}
                            onClick={() => handleResumeSingle(record.id)}
                        >
                            Resume
                        </Button>
                    );
                }
                return '-';
            }
        }
    ];

    const filteredRecipients = data?.recipients?.filter(r => {
        const matchesSearch = r.recipientEmail.toLowerCase().includes(searchText.toLowerCase()) || 
                             (r.recipientName && r.recipientName.toLowerCase().includes(searchText.toLowerCase()));
        return matchesSearch;
    }) || [];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, minHeight: '100vh' }}>
                <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center' }}>
                    <Button 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/superadmin/mailing')}
                        style={{ marginRight: '16px' }}
                    />
                    <Breadcrumb items={[
                        { title: 'SuperAdmin', href: '/superadmin' },
                        { title: 'Mailing', href: '/superadmin/mailing' },
                        { title: 'Campaign Report' }
                    ]} />
                </Header>

                <Content style={{ margin: '24px', padding: 24, background: '#fff', borderRadius: '8px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}><Text>Loading Report...</Text></div>
                    ) : (
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Title level={3}>{data.campaign.subject}</Title>
                                    <Text type="secondary">Campaign ID: #{id} | Created on: {new Date(data.campaign.createdAt).toLocaleString()}</Text>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                    <Space>
                                        <Button 
                                            icon={<FileExcelOutlined />} 
                                            onClick={() => {
                                                const url = `${api.defaults.baseURL}/superadmin/mail/campaign/${id}/export`;
                                                window.open(url, '_blank');
                                            }}
                                        >
                                            Export to Excel
                                        </Button>
                                        <Button type="primary" icon={<MailOutlined />} onClick={loadData}>Refresh Report</Button>
                                    </Space>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={6}>
                                    <Card bordered={false} className="stat-card">
                                        <Statistic title="Total Recipients" value={data.stats.total} />
                                    </Card>
                                </Col>
                                <Col span={6}>
                                    <Card bordered={false} className="stat-card">
                                        <Statistic 
                                            title="Successfully Sent" 
                                            value={data.stats.sent} 
                                            valueStyle={{ color: '#3f8600' }}
                                            prefix={<CheckCircleOutlined />} 
                                        />
                                    </Card>
                                </Col>
                                <Col span={6}>
                                    <Card bordered={false} className="stat-card">
                                        <Statistic 
                                            title="Opened" 
                                            value={data.stats.opened} 
                                            valueStyle={{ color: '#108ee9' }}
                                            suffix={`(${data.stats.total > 0 ? Math.round((data.stats.opened / data.stats.total)*100) : 0}%)`}
                                            prefix={<EyeOutlined />} 
                                        />
                                    </Card>
                                </Col>
                                <Col span={6}>
                                    <Card bordered={false} className="stat-card">
                                        <Statistic 
                                            title="Bounced / Failed" 
                                            value={data.stats.failed} 
                                            valueStyle={{ color: '#cf1322' }}
                                            prefix={<CloseCircleOutlined />} 
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            <Card title="Recipients Checklist" extra={
                                <Space size="middle">
                                    {selectedRowKeys.length > 0 && (
                                        <Space>
                                            <Button 
                                                size="small" 
                                                danger 
                                                onClick={handleBatchPause}
                                            >
                                                Pause Selected ({selectedRowKeys.length})
                                            </Button>
                                            <Button 
                                                size="small" 
                                                type="primary"
                                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                                onClick={handleBatchResume}
                                            >
                                                Resume Selected ({selectedRowKeys.length})
                                            </Button>
                                        </Space>
                                    )}
                                    <Input 
                                        placeholder="Search by name or email" 
                                        prefix={<SearchOutlined />} 
                                        style={{ width: 300 }}
                                        onChange={e => setSearchText(e.target.value)}
                                        allowClear
                                    />
                                </Space>
                            }>
                                <Table 
                                    rowSelection={rowSelection}
                                    columns={columns} 
                                    dataSource={filteredRecipients} 
                                    rowKey="id"
                                    pagination={{ pageSize: 10 }}
                                />
                            </Card>
                        </Space>
                    )}
                </Content>
            </Layout>
            <style>{`
                .stat-card {
                    background: #f8f9fa;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
            `}</style>
        </Layout>
    );
};

export default SuperadminMailReport;
