// Updated Late Penalty UI Imports
import { Layout, Typography, Card, Space, Switch, InputNumber, Button, message, Breadcrumb, Input, Divider } from 'antd';
import { ThunderboltOutlined, HomeOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import React, { useState, useEffect, Fragment } from 'react';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function AutomationRules() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const DEFAULT_TIERS = [
        { id: 1, minMinutes: 1, maxMinutes: 20, deduction: 0.5, frequency: 5 },
        { id: 2, minMinutes: 21, maxMinutes: 60, deduction: 0.5, frequency: 2 },
        { id: 3, minMinutes: 61, maxMinutes: 150, deduction: 0.5, frequency: 1 },
        { id: 4, minMinutes: 151, maxMinutes: 9999, deduction: 1.0, frequency: 1 }
    ];

    const [latePenalty, setLatePenalty] = useState({
        active: false,
        tiers: DEFAULT_TIERS
    });

    const [zktecoConfig, setZktecoConfig] = useState({
        active: false,
        url: 'http://15.206.144.225:8081/',
        username: 'admin',
        password: ''
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

                // Penalty Rule
                const penaltyRule = rules.find(r => r.key === 'late_punchin_penalty');
                if (penaltyRule) {
                    let config = penaltyRule.config;
                    if (typeof config === 'string') {
                        try { config = JSON.parse(config); } catch (e) { config = {}; }
                    }
                    setLatePenalty({
                        active: penaltyRule.active,
                        tiers: Array.isArray(config.tiers) && config.tiers.length > 0 ? config.tiers : DEFAULT_TIERS
                    });
                }

                // ZKTeco Rule
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
                        password: config.password || ''
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

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, background: '#f5f7fb' }}>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>Automation Rules</Title>
                </Header>

                <Content style={{ padding: '24px' }}>
                    <Breadcrumb style={{ marginBottom: 16 }}>
                        <Breadcrumb.Item onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
                            <HomeOutlined />
                        </Breadcrumb.Item>
                        <Breadcrumb.Item onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>Settings</Breadcrumb.Item>
                        <Breadcrumb.Item>Automation Rules</Breadcrumb.Item>
                    </Breadcrumb>

                    <Space direction="vertical" size={24} style={{ width: '100%' }}>
                        <Card
                            title={
                                <Space>
                                    <ThunderboltOutlined style={{ color: '#1677ff' }} />
                                    <span>Late Punch-In Penalty</span>
                                </Space>
                            }
                        // extra={
                        //     <Switch
                        //         checked={latePenalty.active}
                        //         onChange={(checked) => setLatePenalty({ ...latePenalty, active: checked })}
                        //     />
                        // }
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Text type="secondary">
                                    Automatically deduct absent days from payroll based on repeated late punch-ins.
                                </Text>

                                <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                                    <Space direction="vertical" size={4}>
                                        <Text strong><InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />Assignment-Based Rules Available</Text>
                                        <Text size="small" type="secondary">You can now create flexible late penalty rules (Fixed, Hourly, Multiplier) and assign them to specific staff members.</Text>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<ThunderboltOutlined />}
                                            style={{ marginTop: 8 }}
                                            onClick={() => navigate('/settings/late-punchin-rules')}
                                        >
                                            Manage Per-User Penalty Rules
                                        </Button>
                                    </Space>
                                </Card>

                                {/* <Divider plain style={{ margin: '8px 0' }}><Text type="secondary" size="small">OR USE LEGACY GLOBAL SLABS (Applies if no per-user rule assigned)</Text></Divider> */}

                                {/* <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr) 40px', gap: '10px', marginTop: 10 }}>
                                    <Text strong>Min Late (mins)</Text>
                                    <Text strong>Max Late (mins)</Text>
                                    <Text strong>Deduct Days</Text>
                                    <Text strong>Every X Occurrences</Text>
                                    <Text strong></Text>
                                    
                                    {latePenalty.tiers.map((t, idx) => (
                                        <React.Fragment key={t.id || idx}>
                                            <InputNumber
                                                min={0}
                                                style={{ width: '100%' }}
                                                value={t.minMinutes}
                                                onChange={(v) => {
                                                    const newTiers = [...latePenalty.tiers];
                                                    newTiers[idx].minMinutes = v;
                                                    setLatePenalty({ ...latePenalty, tiers: newTiers });
                                                }}
                                                disabled={!latePenalty.active}
                                            />
                                            <InputNumber
                                                min={1}
                                                style={{ width: '100%' }}
                                                value={t.maxMinutes}
                                                onChange={(v) => {
                                                    const newTiers = [...latePenalty.tiers];
                                                    newTiers[idx].maxMinutes = v;
                                                    setLatePenalty({ ...latePenalty, tiers: newTiers });
                                                }}
                                                disabled={!latePenalty.active}
                                            />
                                            <InputNumber
                                                min={0} step={0.5}
                                                style={{ width: '100%' }}
                                                value={t.deduction}
                                                onChange={(v) => {
                                                    const newTiers = [...latePenalty.tiers];
                                                    newTiers[idx].deduction = v;
                                                    setLatePenalty({ ...latePenalty, tiers: newTiers });
                                                }}
                                                disabled={!latePenalty.active}
                                            />
                                            <InputNumber
                                                min={1}
                                                style={{ width: '100%' }}
                                                value={t.frequency}
                                                onChange={(v) => {
                                                    const newTiers = [...latePenalty.tiers];
                                                    newTiers[idx].frequency = v;
                                                    setLatePenalty({ ...latePenalty, tiers: newTiers });
                                                }}
                                                disabled={!latePenalty.active}
                                            />
                                            <Button 
                                                type="text" 
                                                danger 
                                                icon={<DeleteOutlined style={{ fontSize: 16 }} />} 
                                                disabled={!latePenalty.active}
                                                onClick={() => {
                                                    const newTiers = latePenalty.tiers.filter((_, i) => i !== idx);
                                                    setLatePenalty({ ...latePenalty, tiers: newTiers });
                                                }}
                                            />
                                        </React.Fragment>
                                    ))}
                                </div> */}

                                {/* <div style={{ marginTop: 8 }}>
                                    <Button
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            const lastTier = latePenalty.tiers[latePenalty.tiers.length - 1];
                                            const newMin = lastTier ? (Number(lastTier.maxMinutes) + 1) : 1;
                                            setLatePenalty({
                                                ...latePenalty,
                                                tiers: [...latePenalty.tiers, { id: Date.now(), minMinutes: newMin, maxMinutes: newMin + 30, deduction: 0.5, frequency: 1 }]
                                            });
                                        }}
                                        disabled={!latePenalty.active}
                                        style={{ width: '100%' }}
                                    >
                                        Add New Slab
                                    </Button>
                                </div> */}

                                {/* <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={() => saveRule('late_punchin_penalty', latePenalty.active, {
                                            tiers: latePenalty.tiers
                                        })}
                                        loading={saving}
                                        icon={<ThunderboltOutlined />}
                                    >
                                        Save Late Penalty Configuration
                                    </Button>
                                </div> */}
                            </Space>
                        </Card>

                        <Card
                            title={
                                <Space>
                                    <ThunderboltOutlined style={{ color: '#1677ff' }} />
                                    <span>Overtime Automation</span>
                                </Space>
                            }
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Text type="secondary">
                                    Automatically calculate and reward staff for working beyond their scheduled shift hours.
                                </Text>
                                <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                                    <Space direction="vertical" size={4}>
                                        <Text strong><ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />Flexible Overtime Rules</Text>
                                        <Text size="small" type="secondary">Create and assign specific overtime rules (Fixed, Hourly, or Multipliers) to your team members.</Text>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<ThunderboltOutlined />}
                                            style={{ marginTop: 8 }}
                                            onClick={() => navigate('/settings/overtime-rules')}
                                        >
                                            Manage Overtime Rules
                                        </Button>
                                    </Space>
                                </Card>
                            </Space>
                        </Card>

                        <Card
                            title={
                                <Space>
                                    <ThunderboltOutlined style={{ color: '#1677ff' }} />
                                    <span>Early Overtime Automation</span>
                                </Space>
                            }
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Text type="secondary">
                                    Set up rewards for staff members who start their work before the official shift start time.
                                </Text>
                                <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                                    <Space direction="vertical" size={4}>
                                        <Text strong><ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />Early Start Incentives</Text>
                                        <Text size="small" type="secondary">Configure how early arrivals are compensated based on your organization's policies.</Text>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<ThunderboltOutlined />}
                                            style={{ marginTop: 8 }}
                                            onClick={() => navigate('/settings/early-overtime-rules')}
                                        >
                                            Manage Early Overtime
                                        </Button>
                                    </Space>
                                </Card>
                            </Space>
                        </Card>

                        <Card
                            title={
                                <Space>
                                    <ThunderboltOutlined style={{ color: '#1677ff' }} />
                                    <span>Early Exit Automation</span>
                                </Space>
                            }
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Text type="secondary">
                                    Define deduction rules for employees who leave the workplace before their shift ends.
                                </Text>
                                <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                                    <Space direction="vertical" size={4}>
                                        <Text strong><ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />Early Departure Penalties</Text>
                                        <Text size="small" type="secondary">Set up automated deductions for staff who punch out before completing their shifts.</Text>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<ThunderboltOutlined />}
                                            style={{ marginTop: 8 }}
                                            onClick={() => navigate('/settings/early-exit-rules')}
                                        >
                                            Manage Early Exit Rules
                                        </Button>
                                    </Space>
                                </Card>
                            </Space>
                        </Card>

                        <Card
                            title={
                                <Space>
                                    <ThunderboltOutlined style={{ color: '#1677ff' }} />
                                    <span>Break Automation</span>
                                </Space>
                            }
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Text type="secondary">
                                    Monitor break durations and automatically apply penalties for exceeding allowed time limits.
                                </Text>
                                <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                                    <Space direction="vertical" size={4}>
                                        <Text strong><ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />Excessive Break Tracking</Text>
                                        <Text size="small" type="secondary">Automate deductions for breaks that exceed the defined limits for each staff member.</Text>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<ThunderboltOutlined />}
                                            style={{ marginTop: 8 }}
                                            onClick={() => navigate('/settings/break-rules')}
                                        >
                                            Manage Break Rules
                                        </Button>
                                    </Space>
                                </Card>
                            </Space>
                        </Card>

                        <Card
                            title={
                                <Space>
                                    <ThunderboltOutlined style={{ color: '#faad14' }} />
                                    <span>ZKTeco Biometric Integration</span>
                                </Space>
                            }
                            extra={
                                <Switch
                                    checked={zktecoConfig.active}
                                    onChange={(checked) => setZktecoConfig({ ...zktecoConfig, active: checked })}
                                />
                            }
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Text type="secondary">
                                    Sync attendance transactions from your ZKTeco BioTime or EasyTime server.
                                </Text>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
                                    <Text>API URL:</Text>
                                    <Input
                                        placeholder="http://15.206.144.225:8081/"
                                        value={zktecoConfig.url}
                                        onChange={(e) => setZktecoConfig({ ...zktecoConfig, url: e.target.value })}
                                        disabled={true}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
                                    <Text>Username:</Text>
                                    <Input
                                        placeholder="admin"
                                        value={zktecoConfig.username}
                                        onChange={(e) => setZktecoConfig({ ...zktecoConfig, username: e.target.value })}
                                        disabled={true}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
                                    <Text>Password:</Text>
                                    <Input.Password
                                        placeholder="******"
                                        value={zktecoConfig.password}
                                        onChange={(e) => setZktecoConfig({ ...zktecoConfig, password: e.target.value })}
                                        disabled={true}
                                    />
                                </div>

                                <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                                    <Button
                                        type="primary"
                                        onClick={() => saveRule('zkteco_integration', zktecoConfig.active, {
                                            url: zktecoConfig.url || 'http://15.206.144.225:8081/',
                                            username: zktecoConfig.username || 'admin',
                                            password: zktecoConfig.password || 'Admin@123'
                                        })}
                                        loading={saving}
                                    >
                                        Save ZKTeco Settings
                                    </Button>
                                </div>
                            </Space>
                        </Card>
                    </Space>
                </Content>
            </Layout>
        </Layout>
    );
}
