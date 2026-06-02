import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Typography, Space, Input, message, Modal, Select } from 'antd';
import {
    SearchOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { Title, Text } = Typography;

const EmployeeSalaryList = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [staff, setStaff] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedDept, setSelectedDept] = useState('all');
    const [breakdownVisible, setBreakdownVisible] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStaffSalary();
        fetchDepartments();
    }, []);

    const fetchStaffSalary = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/staff-salary-list');
            if (response.data.success) {
                const staffData = response.data.data || [];
                setStaff(staffData);
                fetchDepartments(staffData);
            }
        } catch (error) {
            console.error('Failed to fetch staff salary list:', error);
            message.error('Failed to fetch salary data');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async (currentStaff = []) => {
        try {
            const response = await api.get('/admin/business-functions');
            let businessDepts = [];
            if (response.data.success) {
                const list = response.data.data || [];
                const deptFn = list.find((f) => String(f.name || '').toLowerCase() === 'department');
                if (deptFn && Array.isArray(deptFn.values)) {
                    businessDepts = deptFn.values.filter(v => v && v.value).map(v => v.value);
                }
            }
            
            const activeDepts = (currentStaff.length > 0 ? currentStaff : staff)
                .map(s => s.department)
                .filter(Boolean);
            
            const combined = [...new Set([...businessDepts, ...activeDepts])].sort();
            setDepartments(combined.map(d => ({ name: d })));
        } catch (error) {
            console.error('Failed to fetch departments:', error);
            const activeDepts = (currentStaff.length > 0 ? currentStaff : staff)
                .map(s => s.department)
                .filter(Boolean);
            const combined = [...new Set(activeDepts)].sort();
            setDepartments(combined.map(d => ({ name: d })));
        }
    };

    const filteredData = staff.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) ||
            item.staffId?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.phone?.toLowerCase().includes(searchText.toLowerCase());
        
        const matchesDept = selectedDept === 'all' || item.department === selectedDept;
        
        return matchesSearch && matchesDept;
    });

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
                <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#e6f7ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '10px',
                        color: '#1677ff',
                        fontWeight: '700',
                        fontSize: '14px',
                        boxShadow: '0 2px 6px rgba(22, 119, 255, 0.06)'
                    }}>
                        {text.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '600', color: '#1677ff', whiteSpace: 'nowrap' }}>{text}</div>
                        {record.staffId && <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '1px', whiteSpace: 'nowrap' }}>{record.staffId}</div>}
                    </div>
                </div>
            )
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            render: (text) => (
                <span className="sales-status-tag sales-status-active" style={{ fontSize: '12px' }}>
                    {text || 'General'}
                </span>
            )
        },
        {
            title: 'Package Gross',
            dataIndex: 'grossSalary',
            key: 'grossSalary',
            render: (val) => <span style={{ fontWeight: '500', color: '#262626' }}>₹{(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        },
        {
            title: 'Package Net',
            dataIndex: 'netSalary',
            key: 'netSalary',
            render: (val) => <span style={{ fontWeight: '700', color: '#52c41a' }}>₹{(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button
                    type="primary"
                    shape="round"
                    size="small"
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
                        <tr key={key} style={{ borderBottom: '1px solid #f0f2f5' }}>
                            <td style={{ padding: '8px 0', textTransform: 'capitalize', color: '#595959', fontSize: '13px' }}>{key.replace(/_/g, ' ')}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '500', color: '#262626', fontSize: '13px' }}>₹ {Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
                <MainHeader
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    title="Employee Salary Packages"
                />
                <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
                    <Card
                        className="sales-content-card"
                        bodyStyle={{ padding: '24px' }}
                    >
                        <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '16px' }}>
                            <Space size={16} wrap>
                                <Input
                                    placeholder="Search by name, ID or phone"
                                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                    style={{ width: 300, borderRadius: '8px' }}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                />
                                <Select 
                                    showSearch
                                    optionFilterProp="children"
                                    value={selectedDept} 
                                    onChange={setSelectedDept} 
                                    style={{ width: 200 }}
                                    placeholder="Select Department"
                                    dropdownStyle={{ borderRadius: '8px' }}
                                >
                                    <Select.Option value="all">All Departments</Select.Option>
                                    {departments.map(dept => (
                                        <Select.Option key={dept.id || dept.name} value={dept.name}>{dept.name}</Select.Option>
                                    ))}
                                </Select>
                            </Space>
                            <Text type="secondary" style={{ fontStyle: 'italic', fontWeight: '500', color: '#8c8c8c' }}>
                                Showing fixed salary packages as per profiles
                            </Text>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            loading={loading}
                            rowKey="id"
                            className="sales-table"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                pageSizeOptions: ['10', '20', '50', '100'],
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                            }}
                        />
                    </Card>

                    <Modal
                        title={`Salary Breakdown - ${selectedStaff?.name}`}
                        open={breakdownVisible}
                        onCancel={() => setBreakdownVisible(false)}
                        footer={[
                            <Button key="close" type="primary" shape="round" onClick={() => setBreakdownVisible(false)}>
                                Close
                            </Button>
                        ]}
                        width={700}
                        className="sales-modal"
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
                                                    <Title level={5} style={{ borderBottom: '2px solid #1677ff', paddingBottom: 6, fontWeight: '600', color: '#1677ff' }}>Earnings</Title>
                                                    {renderBreakdownTable(selectedStaff.components?.earnings)}
                                                </div>
                                                {hasIncentives && (
                                                    <div style={{ width: colWidth }}>
                                                        <Title level={5} style={{ borderBottom: '2px solid #722ed1', paddingBottom: 6, fontWeight: '600', color: '#722ed1' }}>Incentives</Title>
                                                        {renderBreakdownTable(selectedStaff.components?.incentives)}
                                                    </div>
                                                )}
                                                <div style={{ width: colWidth }}>
                                                    <Title level={5} style={{ borderBottom: '2px solid #ff4d4f', paddingBottom: 6, fontWeight: '600', color: '#ff4d4f' }}>Deductions</Title>
                                                    {renderBreakdownTable(selectedStaff.components?.deductions)}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, padding: '15px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f0f2f5' }}>
                                    <Space direction="vertical" size={0}>
                                        <Text type="secondary" style={{ fontSize: '13px' }}>Gross Total: <Text strong style={{ color: '#262626' }}>₹ {(Number(selectedStaff.grossSalary) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></Text>
                                        <Text type="secondary" style={{ fontSize: '13px' }}>Total Deductions: <Text strong style={{ color: '#ff4d4f' }}>₹ {(Number(selectedStaff.grossSalary - selectedStaff.netSalary) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></Text>
                                    </Space>
                                    <div style={{ textAlign: 'right' }}>
                                        <Text strong style={{ fontSize: '13px', display: 'block', color: '#8c8c8c' }}>Final Package Net</Text>
                                        <Title level={3} style={{ margin: 0, color: '#52c41a', fontWeight: '700' }}>₹ {(Number(selectedStaff.netSalary) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Title>
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
