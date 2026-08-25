import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, message, Space, Typography, Checkbox, DatePicker } from 'antd';
import { ArrowLeftOutlined, SafetyCertificateOutlined, PercentageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;

export default function EsiCalculationSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [esiCalculationBase, setEsiCalculationBase] = useState('gross');
  const [esiExcludeOt, setEsiExcludeOt] = useState(false);
  const [esiExcludeNoAbsentPay, setEsiExcludeNoAbsentPay] = useState(false);
  const [esiExcludeAdvance, setEsiExcludeAdvance] = useState(false);
  const [esiExcludeLoan, setEsiExcludeLoan] = useState(false);
  const [esiExcludePf, setEsiExcludePf] = useState(false);
  const [esiExcludePt, setEsiExcludePt] = useState(false);
  const [esiExcludeTds, setEsiExcludeTds] = useState(false);
  const [esiEffectiveDate, setEsiEffectiveDate] = useState(null);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const resp = await api.get('/admin/settings/salary');
      const s = resp?.data?.settings || {};
      setEsiCalculationBase(s.esiCalculationBase || 'gross');
      setEsiExcludeOt(!!s.esiExcludeOt);
      setEsiExcludeNoAbsentPay(!!s.esiExcludeNoAbsentPay);
      setEsiExcludeAdvance(!!s.esiExcludeAdvance);
      setEsiExcludeLoan(!!s.esiExcludeLoan);
      setEsiExcludePf(!!s.esiExcludePf);
      setEsiExcludePt(!!s.esiExcludePt);
      setEsiExcludeTds(!!s.esiExcludeTds);
      setEsiEffectiveDate(s.esiEffectiveDate ? dayjs(s.esiEffectiveDate) : null);
    } catch (e) {
      message.error('Failed to load ESI calculation settings');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const save = async () => {
    try {
      setLoading(true);
      const respGet = await api.get('/admin/settings/salary');
      const currentSettings = respGet?.data?.settings || {};

      const payload = {
        ...currentSettings,
        esiCalculationBase,
        esiExcludeOt,
        esiExcludeNoAbsentPay,
        esiExcludeAdvance: esiCalculationBase === 'net_pay' ? esiExcludeAdvance : false,
        esiExcludeLoan: esiCalculationBase === 'net_pay' ? esiExcludeLoan : false,
        esiExcludePf: esiCalculationBase === 'net_pay' ? esiExcludePf : false,
        esiExcludePt: esiCalculationBase === 'net_pay' ? esiExcludePt : false,
        esiExcludeTds: esiCalculationBase === 'net_pay' ? esiExcludeTds : false,
        esiEffectiveDate: esiEffectiveDate ? esiEffectiveDate.format('YYYY-MM-DD') : null,
      };

      const resp = await api.put('/admin/settings/salary', payload);
      if (resp.data?.success) {
        message.success('ESI Calculation settings saved successfully');
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
      value: 'gross',
      label: 'Gross Salary Base',
      desc: 'Calculate Employee ESI using gross earnings (subject to exclusions chosen below).',
      icon: <SafetyCertificateOutlined style={{ fontSize: '20px', color: '#1677ff' }} />,
      badge: 'Standard'
    },
    {
      value: 'net_pay',
      label: 'Net Pay Base',
      desc: 'Calculate Employee ESI using net salary (Gross earnings minus deductions, subject to exclusions chosen below).',
      icon: <PercentageOutlined style={{ fontSize: '20px', color: '#52c41a' }} />,
      badge: 'Deductions Subtracted'
    }
  ];

  if (fetching) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="ESI Calculation Settings" 
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
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Select ESI Calculation Base Mode</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Choose whether employee ESI contribution should be calculated based on Gross Salary or Net Pay.
                </div>
              </div>

              {/* Dynamic Option Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {options.map((opt) => {
                  const isSelected = esiCalculationBase === opt.value;
                  return (
                    <div 
                      key={opt.value}
                      onClick={() => setEsiCalculationBase(opt.value)}
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

              {/* Checkbox Exclusions Panel */}
              <Card 
                title="Exclusions from ESI Base Calculation" 
                style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}
                bodyStyle={{ padding: '20px' }}
              >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Checkbox 
                    checked={esiExcludeOt} 
                    onChange={(e) => setEsiExcludeOt(e.target.checked)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Exclude Overtime (OT)</span>
                    <div style={{ fontSize: '12px', color: '#64748b', marginLeft: '24px' }}>
                      Do not include standard overtime and early overtime pay in the ESI base salary.
                    </div>
                  </Checkbox>

                  <Checkbox 
                    checked={esiExcludeNoAbsentPay} 
                    onChange={(e) => setEsiExcludeNoAbsentPay(e.target.checked)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Exclude No Absent Pay</span>
                    <div style={{ fontSize: '12px', color: '#64748b', marginLeft: '24px' }}>
                      Do not include perfect attendance/no-absent incentives in the ESI base salary.
                    </div>
                  </Checkbox>

                  <Checkbox 
                    checked={esiExcludePf} 
                    disabled={esiCalculationBase !== 'net_pay'}
                    onChange={(e) => setEsiExcludePf(e.target.checked)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#1e293b' }}>
                      Exclude Provident Fund (PF) Deductions
                    </span>
                    <div style={{ fontSize: '12px', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#64748b', marginLeft: '24px' }}>
                      Do not subtract Provident Fund (PF) employee deductions from Gross when calculating ESI. (Only applicable for Net Pay Base)
                    </div>
                  </Checkbox>

                  <Checkbox 
                    checked={esiExcludePt} 
                    disabled={esiCalculationBase !== 'net_pay'}
                    onChange={(e) => setEsiExcludePt(e.target.checked)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#1e293b' }}>
                      Exclude Professional Tax (PTax) Deductions
                    </span>
                    <div style={{ fontSize: '12px', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#64748b', marginLeft: '24px' }}>
                      Do not subtract Professional Tax (PTax) deductions from Gross when calculating ESI. (Only applicable for Net Pay Base)
                    </div>
                  </Checkbox>

                  <Checkbox 
                    checked={esiExcludeTds} 
                    disabled={esiCalculationBase !== 'net_pay'}
                    onChange={(e) => setEsiExcludeTds(e.target.checked)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#1e293b' }}>
                      Exclude Income Tax (TDS) Deductions
                    </span>
                    <div style={{ fontSize: '12px', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#64748b', marginLeft: '24px' }}>
                      Do not subtract TDS/Income Tax deductions from Gross when calculating ESI. (Only applicable for Net Pay Base)
                    </div>
                  </Checkbox>

                  <Checkbox 
                    checked={esiExcludeAdvance} 
                    disabled={esiCalculationBase !== 'net_pay'}
                    onChange={(e) => setEsiExcludeAdvance(e.target.checked)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#1e293b' }}>
                      Exclude Salary Advance Deductions
                    </span>
                    <div style={{ fontSize: '12px', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#64748b', marginLeft: '24px' }}>
                      Do not subtract salary advance deductions from Gross when calculating ESI. (Only applicable for Net Pay Base)
                    </div>
                  </Checkbox>

                  <Checkbox 
                    checked={esiExcludeLoan} 
                    disabled={esiCalculationBase !== 'net_pay'}
                    onChange={(e) => setEsiExcludeLoan(e.target.checked)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#1e293b' }}>
                      Exclude Loan EMI Deductions
                    </span>
                    <div style={{ fontSize: '12px', color: esiCalculationBase !== 'net_pay' ? '#cbd5e1' : '#64748b', marginLeft: '24px' }}>
                      Do not subtract loan EMI deductions from Gross when calculating ESI. (Only applicable for Net Pay Base)
                    </div>
                  </Checkbox>
                </Space>
              </Card>

              {/* Effective Date Card */}
              <Card 
                title="Effective Date" 
                style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ marginBottom: '12px', fontSize: '13px', color: '#64748b' }}>
                  Select the start date from which these ESI settings will apply to your payroll. Cycles before this date will use the default Gross calculation.
                </div>
                <DatePicker 
                  placeholder="Select Effective Date" 
                  value={esiEffectiveDate} 
                  onChange={(date) => setEsiEffectiveDate(date)} 
                  style={{ width: '250px' }}
                />
              </Card>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
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
