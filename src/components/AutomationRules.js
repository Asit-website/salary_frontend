import { Layout, Typography, Card, Space, Switch, Button, message, Input, Row, Col } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, ThunderboltOutlined, ApiOutlined, WarningOutlined, CoffeeOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import React, { useState, useEffect } from 'react';
import api from '../api';

const { Content } = Layout;
const { Text } = Typography;

export default function AutomationRules() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [zktecoConfig, setZktecoConfig] = useState({
        active: false,
        url: 'http://15.206.144.225:8081/',
        username: 'admin',
        password: '',
        // companyId: ''
    });

    const [esslConfig, setEsslConfig] = useState({
        active: false,
        serialNumber: ''
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const resp = await api.get('/admin/settings/automation-rules');
            if (resp.data?.success) {
                const rules = resp.data.rules || [];

                const zktecoRule = rules.find(r => r.key === 'zkteco_integration');
                if (zktecoRule) {
                    let config = zktecoRule.config;
                    if (typeof config === 'string') {
                        try { config = JSON.parse(config); } catch (e) { config = {}; }
                    }
                    setZktecoConfig({
                        active: zktecoRule.active,
                        url: config.url || 'http://15.206.144.225:8081/',
                        username: config.username || 'admin',
                        password: config.password || '',
                        // companyId: config.companyId || ''
                    });
                }

                const esslRule = rules.find(r => r.key === 'essl_integration');
                if (esslRule) {
                    let config = esslRule.config;
                    if (typeof config === 'string') {
                        try { config = JSON.parse(config); } catch (e) { config = {}; }
                    }
                    setEsslConfig({
                        active: esslRule.active,
                        serialNumber: config.serialNumber || ''
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch automation rules:', err);
            message.error('Failed to load automation rules');
        } finally {
            setLoading(false);
        }
    };

    const saveRule = async (key, active, config) => {
        setSaving(true);
        try {
            const resp = await api.put('/admin/settings/automation-rules', {
                key,
                active,
                config
            });
            if (resp.data?.success) {
                message.success('Settings saved successfully');
            } else {
                message.error(resp.data?.message || 'Failed to save settings');
            }
        } catch (err) {
            console.error('Save rule error:', err);
            message.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const automationSections = [
        {
            title: 'Late Punch-In Penalty',
            description: 'Automatically deduct absent days from payroll based on repeated late punch-ins.',
            calloutTitle: 'Assignment-Based Rules Available',
            calloutText: 'Create flexible late penalty rules and assign them to specific staff members.',
            buttonText: 'Manage Per-User Penalty Rules',
            path: '/settings/late-punchin-rules',
            icon: <ClockCircleOutlined />,
            accent: '#1677ff'
        },
        {
            title: 'Overtime Automation',
            description: 'Automatically calculate and reward staff for working beyond their scheduled shift hours.',
            calloutTitle: 'Flexible Overtime Rules',
            calloutText: 'Create and assign specific overtime rules to your team members.',
            buttonText: 'Manage Overtime Rules',
            path: '/settings/overtime-rules',
            icon: <ThunderboltOutlined />,
            accent: '#722ed1'
        },
        {
            title: 'Early Overtime Automation',
            description: 'Set up rewards for staff members who start their work before the official shift start time.',
            calloutTitle: 'Early Start Incentives',
            calloutText: "Configure how early arrivals are compensated based on your organization's policies.",
            buttonText: 'Manage Early Overtime',
            path: '/settings/early-overtime-rules',
            icon: <InfoCircleOutlined />,
            accent: '#13c2c2'
        },
        {
            title: 'Early Exit Automation',
            description: 'Define deduction rules for employees who leave the workplace before their shift ends.',
            calloutTitle: 'Early Departure Penalties',
            calloutText: 'Set up automated deductions for staff who punch out before completing their shifts.',
            buttonText: 'Manage Early Exit Rules',
            path: '/settings/early-exit-rules',
            icon: <WarningOutlined />,
            accent: '#fa8c16'
        },
        {
            title: 'Break Automation',
            description: 'Monitor break durations and automatically apply penalties for exceeding allowed time limits.',
            calloutTitle: 'Excessive Break Tracking',
            calloutText: 'Automate deductions for breaks that exceed the defined limits for each staff member.',
            buttonText: 'Manage Break Rules',
            path: '/settings/break-rules',
            icon: <CoffeeOutlined />,
            accent: '#52c41a'
        }
    ];

    const renderAutomationCard = (section) => (
        <Card
            key={section.title}
            style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                height: '100%'
            }}
            bodyStyle={{ padding: 20 }}
        >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: `${section.accent}14`,
                        color: section.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0
                    }}>
                        {section.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{section.title}</div>
                        <Text style={{ color: '#64748b', fontSize: 12 }}>{section.description}</Text>
                    </div>
                </div>

                <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 14
                }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        {section.calloutTitle}
                    </div>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>{section.calloutText}</Text>
                </div>

                <Button
                    type="primary"
                    shape="round"
                    icon={section.icon}
                    onClick={() => navigate(section.path)}
                    style={{ alignSelf: 'flex-start', boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                >
                    {section.buttonText}
                </Button>
            </Space>
        </Card>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
                <MainHeader
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    title="Automation Rules"
                />

                <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate('/settings')}
                                style={{ fontWeight: 600, color: '#475569' }}
                                shape="round"
                            >
                                Back to Settings
                            </Button>
                        </div>

                        <Card
                            className="sales-content-card"
                            loading={loading}
                            style={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                            bodyStyle={{ padding: 24 }}
                        >
                            <Space direction="vertical" size={24} style={{ width: '100%' }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Attendance Automation</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                        Manage punch-in, overtime, early exit, and break rules from one place.
                                    </div>
                                </div>

                                <Row gutter={[16, 16]}>
                                    {automationSections.map((section) => (
                                        <Col xs={24} lg={12} xl={8} key={section.title}>
                                            {renderAutomationCard(section)}
                                        </Col>
                                    ))}
                                </Row>

                                <Card
                                    style={{
                                        borderRadius: 14,
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                                    }}
                                    bodyStyle={{ padding: 20 }}
                                >
                                    <Space direction="vertical" size={18} style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                                <div style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: 12,
                                                    background: '#faad1414',
                                                    color: '#d48806',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 18
                                                }}>
                                                    <ApiOutlined />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>ZKTeco Biometric Integration</div>
                                                    <Text style={{ color: '#64748b', fontSize: 12 }}>
                                                        Sync attendance transactions from your ZKTeco BioTime or EasyTime server.
                                                    </Text>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={zktecoConfig.active}
                                                onChange={(checked) => setZktecoConfig({ ...zktecoConfig, active: checked })}
                                                checkedChildren="Active"
                                                unCheckedChildren="Off"
                                            />
                                        </div>

                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} md={12}>
                                                <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>API URL</Text>
                                                <Input
                                                    placeholder="http://15.206.144.225:8081/"
                                                    value={zktecoConfig.url}
                                                    onChange={(e) => setZktecoConfig({ ...zktecoConfig, url: e.target.value })}
                                                    style={{ marginTop: 6, borderRadius: 8 }}
                                                />
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Username</Text>
                                                <Input
                                                    placeholder="admin"
                                                    value={zktecoConfig.username}
                                                    onChange={(e) => setZktecoConfig({ ...zktecoConfig, username: e.target.value })}
                                                    style={{ marginTop: 6, borderRadius: 8 }}
                                                />
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Password</Text>
                                                <Input.Password
                                                    placeholder="******"
                                                    value={zktecoConfig.password}
                                                    onChange={(e) => setZktecoConfig({ ...zktecoConfig, password: e.target.value })}
                                                    style={{ marginTop: 6, borderRadius: 8 }}
                                                />
                                            </Col>
                                        </Row>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                                            <Button
                                                type="primary"
                                                shape="round"
                                                icon={<ApiOutlined />}
                                                onClick={() => saveRule('zkteco_integration', zktecoConfig.active, {
                                                    url: zktecoConfig.url || 'http://15.206.144.225:8081/',
                                                    username: zktecoConfig.username || 'admin',
                                                    password: zktecoConfig.password || 'Admin@1234',
                                                    companyId: zktecoConfig.companyId || ''
                                                })}
                                                loading={saving}
                                                style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                                            >
                                                Save ZKTeco Settings
                                            </Button>
                                        </div>
                                    </Space>
                                </Card>

                                <Card
                                    style={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                                <div style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: 12,
                                                    background: '#1677ff14',
                                                    color: '#1677ff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 18
                                                }}>
                                                    <ApiOutlined />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>eSSL Biometric Webhook Integration</div>
                                                    <Text style={{ color: '#64748b', fontSize: 12 }}>
                                                        Receive real-time attendance transactions pushed from your eSSL Bio Server.
                                                    </Text>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={esslConfig.active}
                                                onChange={(checked) => setEsslConfig({ ...esslConfig, active: checked })}
                                                checkedChildren="Active"
                                                unCheckedChildren="Off"
                                            />
                                        </div>

                                        <Row gutter={[16, 16]}>
                                            <Col xs={24}>
                                                <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Webhook Post URL (Configure in eSSL Bio Server)</Text>
                                                <Input
                                                    readOnly
                                                    value={`${window.location.protocol}//${window.location.host}/api/webhook/essl`}
                                                    style={{ marginTop: 6, borderRadius: 8, background: '#f8fafc', color: '#64748b' }}
                                                    addonAfter={
                                                        <Button 
                                                            type="text" 
                                                            size="small" 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/api/webhook/essl`);
                                                                message.success('URL copied to clipboard!');
                                                            }}
                                                            style={{ height: 'auto', padding: 0 }}
                                                        >
                                                            Copy
                                                        </Button>
                                                    }
                                                />
                                            </Col>
                                            <Col xs={24}>
                                                <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Device Serial Number (Optional)</Text>
                                                <Input
                                                    placeholder="e.g. AEXY182960104"
                                                    value={esslConfig.serialNumber}
                                                    onChange={(e) => setEsslConfig({ ...esslConfig, serialNumber: e.target.value })}
                                                    style={{ marginTop: 6, borderRadius: 8 }}
                                                />
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                                    Only required if multiple organizations share duplicate employee/staff IDs on the same central server.
                                                </Text>
                                            </Col>
                                        </Row>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                                            <Button
                                                type="primary"
                                                shape="round"
                                                icon={<ApiOutlined />}
                                                onClick={() => saveRule('essl_integration', esslConfig.active, {
                                                    serialNumber: esslConfig.serialNumber || ''
                                                })}
                                                loading={saving}
                                                style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                                            >
                                                Save eSSL Settings
                                            </Button>
                                        </div>
                                    </Space>
                                </Card>
                            </Space>
                        </Card>
                    </Space>
                </Content>
            </Layout>
        </Layout>
    );
}
