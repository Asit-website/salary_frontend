import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, message, Space, Typography } from 'antd';
import { ArrowLeftOutlined, PercentageOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;

export default function ProvidentFundSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pfCalculationMode, setPfCalculationMode] = useState('basic');

  const fetchSettings = async () => {
    try {
      const resp = await api.get('/admin/settings/salary');
      const s = resp?.data?.settings || {};
      setPfCalculationMode(s.pfCalculationMode || 'basic');
    } catch (e) {
      message.error('Failed to load provident fund settings');
    }
  };

  useEffect(() => {
    const checkSub = async () => {
      try {
        const resp = await api.get('/subscription/subscription-info');
        const info = resp.data?.subscriptionInfo;
        if (!info?.pfSettingsEnabled) {
          message.error('This addon is not enabled for your subscription');
          navigate('/settings');
        } else {
          setSubLoading(false);
          fetchSettings();
        }
      } catch (e) {
        navigate('/settings');
      }
    };
    checkSub();
  }, []);

  const save = async () => {
    try {
      setLoading(true);
      
      // Get the existing settings first to preserve other fields like payableDaysMode
      const respGet = await api.get('/admin/settings/salary');
      const currentSettings = respGet?.data?.settings || {};

      const payload = {
        ...currentSettings,
        pfCalculationMode
      };

      const resp = await api.put('/admin/settings/salary', payload);
      if (resp.data?.success) {
        message.success('Provident Fund settings saved successfully');
      } else {
        message.error(resp.data?.message || 'Failed to save settings');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const options = [
    {
      value: 'basic',
      label: 'Standard Basic Salary',
      desc: 'Calculate Employee Provident Fund (PF) using the full basic salary, without any deductions or penalties.',
      icon: <SafetyCertificateOutlined style={{ fontSize: '20px', color: '#1677ff' }} />,
      badge: 'Standard'
    },
    {
      value: 'basic_minus_penalties',
      label: 'Basic Salary minus Penalties',
      desc: 'Subtract late punch-in and early exit penalties from the basic salary before calculating the Employee Provident Fund (PF).',
      icon: <PercentageOutlined style={{ fontSize: '20px', color: '#52c41a' }} />,
      badge: 'Penalties Deducted'
    }
  ];

  if (subLoading) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Provident Fund (PF) Settings" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            {/* Toolbar Row */}
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

            {/* Content Card */}
            <Card 
              className="sales-content-card" 
              style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Select PF Calculation Base Mode</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Choose whether provident fund contribution should be calculated on standard basic salary or after subtracting penalties (late punch-in / early exit).
                </div>
              </div>

              {/* Dynamic Option Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {options.map((opt) => {
                  const isSelected = pfCalculationMode === opt.value;
                  return (
                    <div 
                      key={opt.value}
                      onClick={() => setPfCalculationMode(opt.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #1677ff' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#f0f7ff' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(22, 119, 255, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#e6f4ff' : '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'background-color 0.2s'
                        }}>
                          {opt.icon}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{opt.label}</span>
                            {opt.badge && (
                              <span style={{
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                textTransform: 'uppercase',
                                color: isSelected ? '#0050b3' : '#64748b',
                                backgroundColor: isSelected ? '#bae0ff' : '#f1f5f9',
                                letterSpacing: '0.5px'
                              }}>
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>{opt.desc}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '16px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #1677ff' : '2px solid #cbd5e1',
                          backgroundColor: '#fff',
                          transition: 'all 0.2s ease',
                          flexShrink: 0
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <Space size={12}>
                  <Button 
                    shape="round" 
                    onClick={() => navigate('/settings')}
                    style={{ fontWeight: '500', minWidth: '90px' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="primary" 
                    shape="round" 
                    loading={loading} 
                    onClick={save}
                    style={{ fontWeight: '600', minWidth: '100px', boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                  >
                    Save Changes
                  </Button>
                </Space>
              </div>

            </Card>
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
