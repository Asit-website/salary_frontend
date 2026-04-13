import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Tag, Space, Button, Typography, Row, Col, Statistic, Input, Breadcrumb } from 'antd';
import { ArrowLeftOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
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
                if (status === 'FAILED') return <Tag color="red" icon={<CloseCircleOutlined />}>FAILED</Tag>;
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
                                <Input 
                                    placeholder="Search by name or email" 
                                    prefix={<SearchOutlined />} 
                                    style={{ width: 300 }}
                                    onChange={e => setSearchText(e.target.value)}
                                    allowClear
                                />
                            }>
                                <Table 
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
