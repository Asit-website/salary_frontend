import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, message, Space, Typography, Switch, InputNumber, Divider, DatePicker } from 'antd';
import { ArrowLeftOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function WeeklyOffDeduction() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [limit, setLimit] = useState(4);
  const [effectiveDate, setEffectiveDate] = useState(null);

  const [subLoading, setSubLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const resp = await api.get('/admin/settings/salary');
      const s = resp?.data?.settings || {};
      const limitVal = Number(s.excludeWoOnAbsentsLimit || 0);
      const effDateVal = s.excludeWoOnAbsentsEffectiveDate || null;

      if (limitVal > 0) {
        setEnabled(true);
        setLimit(limitVal);
        setEffectiveDate(effDateVal);
      } else {
        setEnabled(false);
        setLimit(4); // Default to 4 if disabled
        setEffectiveDate(null);
      }
    } catch (e) {
      message.error('Failed to load settings');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const checkSub = async () => {
      try {
        const resp = await api.get('/subscription/subscription-info');
        const info = resp.data?.subscriptionInfo;
        if (!info?.weeklyOffDeductionEnabled) {
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
      if (enabled && !effectiveDate) {
        message.error('Please select an effective date');
        return;
      }

      setLoading(true);
      
      // If toggled OFF, set limit to 0
      const limitToSend = enabled ? limit : 0;
      const dateToSend = enabled ? effectiveDate : null;

      // We should preserve existing salary settings but update excludeWoOnAbsentsLimit and excludeWoOnAbsentsEffectiveDate
      // Fetch fresh settings first to make sure we don't overwrite other fields
      const respGet = await api.get('/admin/settings/salary');
      const currentSettings = respGet?.data?.settings || {};

      const payload = {
        ...currentSettings,
        excludeWoOnAbsentsLimit: limitToSend,
        excludeWoOnAbsentsEffectiveDate: dateToSend,
      };

      const resp = await api.put('/admin/settings/salary', payload);
      if (resp.data?.success) {
        message.success('Weekly Off deduction settings saved successfully');
      } else {
        message.error(resp.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (subLoading) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Weekly Off Deduction Rules" 
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
              style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
              bodyStyle={{ padding: '24px' }}
              loading={fetching}
            >
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <StopOutlined style={{ fontSize: '20px', color: '#ef4444' }} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Exclude Weekly Off on Weekly Absents</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Configure deductions for weekly off days based on staff absenteeism.
                  </div>
                </div>
              </div>

              <Divider style={{ margin: '20px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Switch Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Enable Weekly Off Exclusion</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                      If a staff member's total absences in a week reach the limit, the weekly off day in that week will be excluded from paid days.
                    </div>
                  </div>
                  <Switch 
                    checked={enabled} 
                    onChange={(checked) => setEnabled(checked)} 
                  />
                </div>

                {/* Input Number Row (Conditional) */}
                {enabled && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Absence Limit (Days)</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                        Maximum allowed absences in a calendar week before weekly off is excluded (e.g. 3 or 4 days).
                      </div>
                    </div>
                    <Space>
                      <InputNumber 
                        min={1} 
                        max={6} 
                        value={limit} 
                        onChange={(value) => setLimit(value || 4)} 
                        style={{ width: '90px', borderRadius: '8px' }} 
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>Days Absent</Text>
                    </Space>
                  </div>
                )}

                {/* Effective Date Row (Conditional) */}
                {enabled && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                        Effective Date <span style={{ color: '#ef4444' }}>*</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                        Select the date from which this rule starts applying to weekly off exclusions (mandatory).
                      </div>
                    </div>
                    <DatePicker 
                      value={effectiveDate ? dayjs(effectiveDate) : null}
                      onChange={(date, dateString) => setEffectiveDate(dateString)}
                      style={{ width: '180px', borderRadius: '8px' }}
                      placeholder="Select effective date"
                    />
                  </div>
                )}
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
