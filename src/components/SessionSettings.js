import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Popconfirm, notification, Alert, Layout, Typography, Row, Col } from 'antd';
import {
  DesktopOutlined,
  MobileOutlined,
  ChromeOutlined,
  AppleOutlined,
  AndroidOutlined,
  WindowsOutlined,
  GlobalOutlined,
  LogoutOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

dayjs.extend(relativeTime);

const { Content } = Layout;
const { Text } = Typography;

export default function SessionSettings() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/admin/settings/sessions');
      if (resp.data?.success) {
        setSessions(resp.data.sessions || []);
      } else {
        notification.error({ message: 'Failed to load sessions' });
      }
    } catch (e) {
      notification.error({ message: 'Error loading sessions', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id, isCurrent) => {
    try {
      const resp = await api.delete(`/admin/settings/sessions/${id}`);
      if (resp.data?.success) {
        notification.success({ message: 'Session Revoked successfully' });
        if (isCurrent) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.clear();
          window.location.href = '/';
        } else {
          fetchSessions();
        }
      } else {
        notification.error({ message: 'Failed to revoke session' });
      }
    } catch (e) {
      notification.error({ message: 'Error revoking session', description: e.message });
    }
  };

  const handleLogoutAllOther = async () => {
    try {
      const resp = await api.post('/admin/settings/sessions/logout-all');
      if (resp.data?.success) {
        notification.success({
          message: 'Sessions Terminated',
          description: resp.data.message || 'Logged out of all other devices successfully.'
        });
        fetchSessions();
      } else {
        notification.error({ message: 'Failed to terminate other sessions' });
      }
    } catch (e) {
      notification.error({ message: 'Error terminating sessions', description: e.message });
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const getDeviceDetails = (ua) => {
    const uaString = (ua || '').toLowerCase();
    let os = 'Unknown OS';
    let osIcon = <DesktopOutlined style={{ fontSize: '18px', color: '#8c8c8c' }} />;
    let browser = 'Unknown Browser';
    let browserIcon = <GlobalOutlined style={{ fontSize: '18px', color: '#8c8c8c' }} />;

    if (uaString.includes('windows')) {
      os = 'Windows OS';
      osIcon = <WindowsOutlined style={{ fontSize: '18px', color: '#1890ff' }} />;
    } else if (uaString.includes('macintosh') || uaString.includes('mac os')) {
      os = 'macOS';
      osIcon = <AppleOutlined style={{ fontSize: '18px', color: '#000000' }} />;
    } else if (uaString.includes('android')) {
      os = 'Android';
      osIcon = <AndroidOutlined style={{ fontSize: '18px', color: '#52c41a' }} />;
    } else if (uaString.includes('iphone') || uaString.includes('ipad')) {
      os = 'iOS (iPhone/iPad)';
      osIcon = <AppleOutlined style={{ fontSize: '18px', color: '#000000' }} />;
    } else if (uaString.includes('linux')) {
      os = 'Linux OS';
    }

    if (uaString.includes('chrome') || uaString.includes('crios')) {
      browser = 'Google Chrome';
      browserIcon = <ChromeOutlined style={{ fontSize: '18px', color: '#faad14' }} />;
    } else if (uaString.includes('safari') && !uaString.includes('chrome')) {
      browser = 'Apple Safari';
      browserIcon = <GlobalOutlined style={{ fontSize: '18px', color: '#096dd9' }} />;
    } else if (uaString.includes('firefox')) {
      browser = 'Mozilla Firefox';
      browserIcon = <GlobalOutlined style={{ fontSize: '18px', color: '#d4380d' }} />;
    } else if (uaString.includes('edge')) {
      browser = 'Microsoft Edge';
    } else if (uaString.includes('mobile-apk') || uaString.includes('okhttp')) {
      browser = 'Mobile App (APK)';
      browserIcon = <MobileOutlined style={{ fontSize: '18px', color: '#13c2c2' }} />;
    }

    return { os, osIcon, browser, browserIcon };
  };

  // Stat card exactly matching StaffManagement
  const StatCard = ({ label, value, icon, bg, iconColor, shadow }) => (
    <Card
      style={{ background: '#ffffff', border: '1px solid #f0f2f5', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', borderRadius: '16px' }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          <div style={{ color: '#1f1f1f', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: '46px', height: '46px', background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
          {React.cloneElement(icon, { style: { color: iconColor, fontSize: '20px' } })}
        </div>
      </div>
    </Card>
  );

  const currentCount = sessions.filter(s => s.isCurrent).length;
  const otherCount = sessions.filter(s => !s.isCurrent).length;

  const columns = [
    {
      title: 'Device / Client',
      key: 'device',
      render: (_, record) => {
        const details = getDeviceDetails(record.userAgent);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Browser icon as avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '12px',
              backgroundColor: '#fff7e6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(250,173,20,0.15)',
              flexShrink: 0,
            }}>
              {details.browserIcon}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {details.osIcon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{details.browser}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 1 }}>{details.os}</div>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip) => {
        const isLocal = ip === '::1' || ip === '127.0.0.1';
        return (
          <span style={{
            background: isLocal ? '#eff6ff' : '#f5f0ff',
            color: isLocal ? '#2563eb' : '#7c3aed',
            border: `1px solid ${isLocal ? '#bfdbfe' : '#ddd6fe'}`,
            borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
          }}>
            {isLocal ? 'Localhost' : ip}
          </span>
        );
      }
    },
    {
      title: 'Last Activity',
      key: 'lastActivityAt',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{dayjs(record.lastActivityAt).fromNow()}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Logged in: {dayjs(record.createdAt).format('DD MMM YYYY, hh:mm A')}
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => record.isCurrent ? (
        <span style={{ background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircleOutlined /> Current Device
        </span>
      ) : (
        <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
          Active Session
        </span>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Are you sure you want to log out of this device?"
          onConfirm={() => handleRevoke(record.id, record.isCurrent)}
          okText="Yes, Logout"
          cancelText="No"
          disabled={record.isCurrent}
        >
          <Button
            size="small"
            icon={<LogoutOutlined />}
            disabled={record.isCurrent}
            style={{
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              height: 28, paddingInline: 12,
              color: record.isCurrent ? '#cbd5e1' : '#dc2626',
              border: `1px solid ${record.isCurrent ? '#e2e8f0' : '#fca5a5'}`,
              background: record.isCurrent ? '#f8fafc' : '#fff1f0',
            }}
          >
            Logout
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Active Sessions & Devices" />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>

          {/* Stat Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Total Sessions" value={sessions.length}
                icon={<SafetyOutlined />}
                bg="#e6f7ff" iconColor="#1677ff"
                shadow="0 4px 10px rgba(22,119,255,0.1)"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Current Session" value={currentCount}
                icon={<CheckCircleOutlined />}
                bg="#f6ffed" iconColor="#52c41a"
                shadow="0 4px 10px rgba(82,196,26,0.1)"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <StatCard
                label="Other Devices" value={otherCount}
                icon={<TeamOutlined />}
                bg="#fff7e6" iconColor="#fa8c16"
                shadow="0 4px 10px rgba(250,140,22,0.1)"
              />
            </Col>
          </Row>

          {/* Sessions Table Card */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: 0 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#e6f7ff', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1677ff', fontSize: 15,
                }}>
                  <KeyOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Active Sessions & Device Management</span>
              </div>
            }
            extra={
              sessions.length > 1 && (
                <Popconfirm
                  title="Log out of all other active sessions? You will stay logged in here."
                  onConfirm={handleLogoutAllOther}
                  okText="Yes, Logout Others"
                  cancelText="No"
                >
                  <Button
                    danger
                    icon={<LogoutOutlined />}
                    style={{ borderRadius: 20, fontWeight: 600 }}
                  >
                    Logout All Other Devices
                  </Button>
                </Popconfirm>
              )
            }
          >
            {/* Security info alert */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                  <SafetyOutlined />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e40af', marginBottom: 2 }}>Security Info</div>
                  <div style={{ fontSize: 13, color: '#3b82f6' }}>
                    Here is the list of browsers and devices that have accessed your Thinktech account. You can instantly log out of any active session on any browser or mobile phone.
                  </div>
                </div>
              </div>
            </div>

            <Table
              className="sales-table"
              columns={columns}
              dataSource={sessions.map(s => ({ ...s, key: s.id }))}
              loading={loading}
              pagination={false}
              bordered={false}
              locale={{ emptyText: 'No active sessions found' }}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
