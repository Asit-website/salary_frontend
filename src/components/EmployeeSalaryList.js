import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Typography, Tag, Space, Input, message, Menu, Modal } from 'antd';
import {
    UserOutlined,
    SearchOutlined,
    DollarOutlined,
    EyeOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const EmployeeSalaryList = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [staff, setStaff] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [breakdownVisible, setBreakdownVisible] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStaffSalary();
    }, []);

    const fetchStaffSalary = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/staff-salary-list');
            if (response.data.success) {
                setStaff(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch staff salary list:', error);
            message.error('Failed to fetch salary data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const filteredData = staff.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.staffId?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.phone?.toLowerCase().includes(searchText.toLowerCase())
    );

    const handleViewBreakdown = (record) => {
        setSelectedStaff(record);
        setBreakdownVisible(true);
    };

    const columns = [
        {
            title: 'Employee Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#f0f5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1890ff',
                        fontWeight: 'bold'
                    }}>
                        {text.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: '500' }}>{text}</div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.staffId}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            render: (text) => <Tag color="blue">{text || 'General'}</Tag>
        },
        {
            title: 'Package Gross',
            dataIndex: 'grossSalary',
            key: 'grossSalary',
            render: (val) => <Text strong>₹ {(Number(val) || 0).toLocaleString('en-IN')}</Text>
        },
        {
            title: 'Package Net',
            dataIndex: 'netSalary',
            key: 'netSalary',
            render: (val) => <Text strong style={{ color: '#52c41a' }}>₹ {(Number(val) || 0).toLocaleString('en-IN')}</Text>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button
                    icon={<EyeOutlined />}
                    onClick={() => handleViewBreakdown(record)}
                >
                    View Breakdown
                </Button>
            )
        }
    ];

    const renderBreakdownTable = (data) => {
        if (!data) return null;
        const rows = Object.entries(data).filter(([_, val]) => Number(val) > 0);
        if (rows.length === 0) return <Text type="secondary">N/A</Text>;

        return (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    {rows.map(([key, value]) => (
                        <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '8px 0', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right' }}>₹ {Number(value).toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
                <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                            className: 'trigger',
                            onClick: () => setCollapsed(!collapsed),
                            style: { fontSize: '18px', padding: '0 24px' }
                        })}
                        <Title level={4} style={{ margin: 0 }}>Employee Salary Packages</Title>
                    </div>
                    <Menu
                        theme="light"
                        mode="horizontal"
                        items={[
                            {
                                key: 'logout',
                                icon: <LogoutOutlined />,
                                label: 'Logout',
                                onClick: handleLogout
                            }
                        ]}
                    />
                </Header>
                <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
                    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Input
                            placeholder="Search by name, ID or phone"
                            prefix={<SearchOutlined />}
                            style={{ width: 300 }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        <Text type="secondary">Showing fixed salary packages as per profiles</Text>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        loading={loading}
                        rowKey="id"
                        pagination={{ pageSize: 15 }}
                    />

                    <Modal
                        title={`Salary Breakdown - ${selectedStaff?.name}`}
                        open={breakdownVisible}
                        onCancel={() => setBreakdownVisible(false)}
                        footer={[
                            <Button key="close" type="primary" onClick={() => setBreakdownVisible(false)}>
                                Close
                            </Button>
                        ]}
                        width={700}
                    >
                        {selectedStaff && (
                            <div style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                    {(() => {
                                        const hasIncentives = selectedStaff.components?.incentives &&
                                            Object.values(selectedStaff.components.incentives).some(v => Number(v) > 0);
                                        const colWidth = hasIncentives ? '31%' : '48%';

                                        return (
                                            <>
                                                <div style={{ width: colWidth }}>
                                                    <Title level={5} style={{ borderBottom: '2px solid #1890ff', paddingBottom: 5 }}>Earnings</Title>
                                                    {renderBreakdownTable(selectedStaff.components?.earnings)}
                                                </div>
                                                {hasIncentives && (
                                                    <div style={{ width: colWidth }}>
                                                        <Title level={5} style={{ borderBottom: '2px solid #722ed1', paddingBottom: 5 }}>Incentives</Title>
                                                        {renderBreakdownTable(selectedStaff.components?.incentives)}
                                                    </div>
                                                )}
                                                <div style={{ width: colWidth }}>
                                                    <Title level={5} style={{ borderBottom: '2px solid #ff4d4f', paddingBottom: 5 }}>Deductions</Title>
                                                    {renderBreakdownTable(selectedStaff.components?.deductions)}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                                    <Space direction="vertical" size={0}>
                                        <Text type="secondary">Gross Total: <Text strong>₹ {(Number(selectedStaff.grossSalary) || 0).toLocaleString('en-IN')}</Text></Text>
                                        <Text type="secondary">Total Deductions: <Text strong style={{ color: '#ff4d4f' }}>₹ {(Number(selectedStaff.grossSalary - selectedStaff.netSalary) || 0).toLocaleString('en-IN')}</Text></Text>
                                    </Space>
                                    <div style={{ textAlign: 'right' }}>
                                        <Text strong style={{ fontSize: '14px', display: 'block', color: '#8c8c8c' }}>Final Package Net</Text>
                                        <Title level={2} style={{ margin: 0, color: '#52c41a' }}>₹ {(Number(selectedStaff.netSalary) || 0).toLocaleString('en-IN')}</Title>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
};

export default EmployeeSalaryList;
