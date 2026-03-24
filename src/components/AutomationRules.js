import { Layout, Typography, Card, Space, Switch, InputNumber, Button, message, Breadcrumb, Input } from 'antd';
import { ThunderboltOutlined, HomeOutlined } from '@ant-design/icons';
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
                            extra={
                                <Switch
                                    checked={latePenalty.active}
                                    onChange={(checked) => setLatePenalty({ ...latePenalty, active: checked })}
                                />
                            }
                        >
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <Text type="secondary">
                                    Automatically deduct absent days from payroll based on repeated late punch-ins.
                                </Text>

                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr)', gap: '10px', marginTop: 10 }}>
                                    <Text strong>Min Late (mins)</Text>
                                    <Text strong>Max Late (mins)</Text>
                                    <Text strong>Deduct Days</Text>
                                    <Text strong>Every X Occurrences</Text>
                                    
                                    {latePenalty.tiers.map((t, idx) => (
                                        <React.Fragment key={t.id || idx}>
                                            <InputNumber
                                                min={1}
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
                                                value={t.maxMinutes}
                                                disabled={t.maxMinutes > 1000 || !latePenalty.active} 
                                                onChange={(v) => {
                                                    const newTiers = [...latePenalty.tiers];
                                                    newTiers[idx].maxMinutes = v;
                                                    setLatePenalty({ ...latePenalty, tiers: newTiers });
                                                }}
                                            />
                                            <InputNumber
                                                min={0.5} step={0.5}
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
                                                value={t.frequency}
                                                onChange={(v) => {
                                                    const newTiers = [...latePenalty.tiers];
                                                    newTiers[idx].frequency = v;
                                                    setLatePenalty({ ...latePenalty, tiers: newTiers });
                                                }}
                                                disabled={!latePenalty.active}
                                            />
                                        </React.Fragment>
                                    ))}
                                </div>

                                <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                                    <Button
                                        type="primary"
                                        onClick={() => saveRule('late_punchin_penalty', latePenalty.active, {
                                            tiers: latePenalty.tiers
                                        })}
                                        loading={saving}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
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
