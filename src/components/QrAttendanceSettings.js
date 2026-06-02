import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, Form, Input, InputNumber, Space, message, Typography, Divider, Menu, Modal, Select, Tag, Popconfirm, Switch, Tooltip, Row, Col } from 'antd';
import { 
  ArrowLeftOutlined, QrcodeOutlined, EnvironmentOutlined, PrinterOutlined, 
  SyncOutlined, CompassOutlined, SlidersOutlined, MobileOutlined, 
  LogoutOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  TeamOutlined, CopyOutlined, CheckCircleOutlined, InfoCircleOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const GOOGLE_MAPS_API_KEY = 'AIzaSyBukqAGI9NioKWUOgzVs0vXrBOg9DnbwLo';
let gmapsLoading = false;
let gmapsReady = false;
const ensureGoogleMaps = () => new Promise((resolve) => {
  if (gmapsReady || window.google?.maps) { gmapsReady = true; return resolve(); }
  if (gmapsLoading) { const id = setInterval(() => { if (window.google?.maps) { clearInterval(id); gmapsReady = true; resolve(); } }, 50); return; }
  gmapsLoading = true;
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
  s.async = true; s.defer = true;
  s.onload = () => { gmapsReady = true; resolve(); };
  document.body.appendChild(s);
});

export default function QrAttendanceSettings() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('multi_account');
    sessionStorage.removeItem('selection_data');
    navigate('/');
  };

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState([]);
  const [staff, setStaff] = useState([]);
  const [orgBrand, setOrgBrand] = useState('Your Organization');
  const [selectedZone, setSelectedZone] = useState(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch Brand Info
      try {
        const brandResp = await api.get('/admin/settings/brand');
        if (brandResp.data?.brand?.displayName) {
          setOrgBrand(brandResp.data.brand.displayName);
        }
      } catch (_) {}

      // Fetch Staff Members for assignment select
      try {
        const staffResp = await api.get('/admin/staff');
        if (staffResp.data?.success) {
          setStaff(staffResp.data.staff || []);
        }
      } catch (_) {}

      // Fetch QR Zones
      const res = await api.get('/admin/qr-attendance/zones');
      if (res.data?.success) {
        const zonesList = res.data.zones || [];
        setZones(zonesList);
        if (res.data.orgName) {
          setOrgBrand(res.data.orgName);
        }
        // Set first zone as default selection for the poster preview
        if (zonesList.length > 0) {
          setSelectedZone(zonesList[0]);
        } else {
          setSelectedZone(null);
        }
      }
    } catch (e) {
      message.error('Failed to load QR Attendance settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Initialize Autocomplete inside the Modal when visible
  useEffect(() => {
    let active = true;
    if (!modalVisible) return;
    const initAutocomplete = async () => {
      await ensureGoogleMaps();
      if (!active) return;
      const el = document.getElementById('office-address-search');
      if (el && window.google?.maps?.places) {
        try {
          const ac = new window.google.maps.places.Autocomplete(el, { fields: ['formatted_address', 'geometry'] });
          ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            const loc = place?.geometry?.location;
            if (loc) {
              form.setFieldsValue({
                latitude: Number(loc.lat().toFixed(6)),
                longitude: Number(loc.lng().toFixed(6))
              });
              if (place.formatted_address) {
                el.value = place.formatted_address;
              } else if (place.name) {
                el.value = place.name;
              }
              message.success('Office coordinates set from search!');
            }
          });
        } catch (_) {}
      }
    };
    // Give it a small delay so input renders in modal
    const tid = setTimeout(initAutocomplete, 300);
    return () => { 
      active = false; 
      clearTimeout(tid);
    };
  }, [modalVisible]);

  const handleOpenAddModal = () => {
    setEditingZone(null);
    form.resetFields();
    form.setFieldsValue({ radiusMeters: 100, active: true, assignedUserIds: [] });
    setModalVisible(true);
    
    // Clear address input field
    setTimeout(() => {
      const el = document.getElementById('office-address-search');
      if (el) el.value = '';
    }, 400);
  };

  const handleOpenEditModal = (zone) => {
    setEditingZone(zone);
    form.resetFields();
    form.setFieldsValue({
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusMeters: zone.radiusMeters,
      active: zone.active !== false,
      assignedUserIds: zone.assignedUserIds || []
    });
    setModalVisible(true);
    
    // Prefill address input field
    setTimeout(() => {
      const el = document.getElementById('office-address-search');
      if (el) el.value = zone.address || '';
    }, 400);
  };

  const handleSaveZone = async () => {
    try {
      const vals = await form.validateFields();
      const el = document.getElementById('office-address-search');
      const address = el ? el.value.trim() : '';
      
      const payload = {
        ...vals,
        address
      };
      
      setSaving(true);
      
      let res;
      if (editingZone) {
        // Edit mode
        res = await api.put(`/admin/qr-attendance/zones/${editingZone.id}`, payload);
      } else {
        // Create mode
        res = await api.post('/admin/qr-attendance/zones', payload);
      }

      if (res.data?.success) {
        message.success(editingZone ? 'QR zone updated successfully!' : 'New QR zone created successfully!');
        setModalVisible(false);
        const zonesList = res.data.zones || [];
        setZones(zonesList);
        
        // Update selected zone
        if (editingZone) {
          const updated = zonesList.find(z => z.id === editingZone.id);
          if (updated) setSelectedZone(updated);
        } else if (zonesList.length > 0) {
          setSelectedZone(zonesList[zonesList.length - 1]);
        }
      } else {
        message.error(res.data?.message || 'Failed to save QR zone');
      }
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save QR zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (id) => {
    try {
      setLoading(true);
      const res = await api.delete(`/admin/qr-attendance/zones/${id}`);
      if (res.data?.success) {
        message.success('QR zone deleted successfully!');
        const zonesList = res.data.zones || [];
        setZones(zonesList);
        
        // Reset selected zone
        if (selectedZone?.id === id) {
          setSelectedZone(zonesList.length > 0 ? zonesList[0] : null);
        }
      } else {
        message.error(res.data?.message || 'Failed to delete zone');
      }
    } catch (e) {
      message.error('Failed to delete QR zone');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async (id) => {
    try {
      setLoading(true);
      const res = await api.post(`/admin/qr-attendance/zones/${id}/regenerate`);
      if (res.data?.success) {
        message.success('QR Code token regenerated successfully!');
        const zonesList = res.data.zones || [];
        setZones(zonesList);
        
        const updated = zonesList.find(z => z.id === id);
        if (updated) setSelectedZone(updated);
      } else {
        message.error(res.data?.message || 'Failed to regenerate QR');
      }
    } catch (e) {
      message.error('Failed to regenerate QR');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressLocate = async () => {
    try {
      await ensureGoogleMaps();
      const el = document.getElementById('office-address-search');
      const q = (el?.value || '').trim();
      if (!q) { 
        message.warning('Please enter an address first'); 
        return; 
      }
      const geocoder = new window.google.maps.Geocoder();
      message.loading({ content: 'Searching location...', key: 'geocode' });
      geocoder.geocode({ address: q }, (results, status) => {
        if (status === 'OK' && results && results.length) {
          const loc = results[0].geometry.location;
          form.setFieldsValue({
            latitude: Number(loc.lat().toFixed(6)),
            longitude: Number(loc.lng().toFixed(6))
          });
          el.value = results[0].formatted_address;
          message.success({ content: 'Location found & coordinates updated!', key: 'geocode' });
        } else {
          message.error({ content: 'Address not found. Please try a different search or pin manually.', key: 'geocode' });
        }
      });
    } catch (_) {
      message.error('Geocoding service unavailable.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Construct QR Data Payload for selected zone
  const qrPayloadString = selectedZone
    ? JSON.stringify({ token: selectedZone.token, orgName: orgBrand })
    : '';

  const qrImageUrl = qrPayloadString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayloadString)}`
    : '';

  // Stats
  const activeCount = zones.filter(z => z.active !== false).length;
  const totalAssignedStaff = new Set(zones.flatMap(z => z.assignedUserIds || [])).size;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Hide Sidebar & Header during Printing */}
      <div className="no-print">
        <Sidebar />
      </div>
      <Layout style={{ marginLeft: 200, background: '#f8fafc' }} className="print-layout-override">
        <Header style={{ background: '#fff', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', justifyContent: 'space-between' }} className="no-print">
          <Space align="center" size={16}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/settings')}
              style={{ borderRadius: 8, display: 'inline-flex', alignItems: 'center', fontWeight: 500 }}
            >
              Back to Settings
            </Button>
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
              QR Attendance Zones
            </Title>
          </Space>
          <Menu
            theme="light"
            mode="horizontal"
            style={{ borderBottom: 'none' }}
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

        <Content style={{ padding: '32px 24px' }}>
          {/* Print specific CSS styled locally inside component */}
          <style>{`
            @media print {
              .no-print {
                display: none !important;
              }
              body {
                background: #fff !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-layout-override {
                margin-left: 0 !important;
                background: transparent !important;
                padding: 0 !important;
              }
              .printable-poster {
                border: none !important;
                box-shadow: none !important;
                width: 100vw !important;
                height: 100vh !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
                margin: 0 !important;
                padding: 40px !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          <div className="no-print" style={{ maxWidth: 1200, margin: '0 auto 24px auto' }}>
            {/* Premium Stat Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Total QR Zones</Text>
                    <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{zones.length}</Title>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Active Geofences</Text>
                    <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#10b981' }}>{activeCount}</Title>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Assigned Staff</Text>
                    <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#4f46e5' }}>{totalAssignedStaff}</Title>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>Unassigned Staff</Text>
                    <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#f59e0b' }}>
                      {Math.max(0, staff.length - totalAssignedStaff)}
                    </Title>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* Dashboard Subheader with Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Office Locations & Branches</Title>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                  Create secure location-aware QR codes for different workspaces. Staff assigned to a zone can only mark attendance there.
                </Paragraph>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenAddModal}
                size="large"
                style={{ 
                  borderRadius: 10, 
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                Add QR Zone
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', maxWidth: 1200, margin: '0 auto' }}>
            {/* Left Column: Zones Grid List */}
            <div style={{ flex: '1 1 550px' }} className="no-print">
              {loading && zones.length === 0 ? (
                <Card loading bordered={false} style={{ borderRadius: 16 }} />
              ) : zones.length === 0 ? (
                <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', padding: '60px 24px', border: '1px solid #e2e8f0' }}>
                  <QrcodeOutlined style={{ fontSize: 56, color: '#cbd5e1', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#64748b', fontWeight: 700, margin: '0 0 8px 0' }}>No QR Zones Created</Title>
                  <Paragraph type="secondary" style={{ maxWidth: 320, margin: '0 auto 20px auto', fontSize: 13 }}>
                    You have not configured any geofenced QR codes yet. Create one to enable location-aware employee clock-ins.
                  </Paragraph>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ borderRadius: 8 }}>
                    Create First Zone
                  </Button>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {zones.map((zone) => {
                    const isSelected = selectedZone?.id === zone.id;
                    const assignedCount = zone.assignedUserIds?.length || 0;
                    return (
                      <Card
                        key={zone.id}
                        bordered={false}
                        onClick={() => setSelectedZone(zone)}
                        style={{
                          borderRadius: 16,
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          boxShadow: isSelected ? '0 10px 25px rgba(99, 102, 241, 0.05)' : '0 4px 12px rgba(0,0,0,0.01)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'translateY(-2px)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <Space size={12} align="start">
                            <div style={{ 
                              background: zone.active ? '#eef2ff' : '#f1f5f9', 
                              padding: 10, 
                              borderRadius: 12, 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                              <EnvironmentOutlined style={{ color: zone.active ? '#4f46e5' : '#94a3b8', fontSize: 20 }} />
                            </div>
                            <div>
                              <Space size={8} align="center">
                                <Text strong style={{ fontSize: 16, color: '#1e293b' }}>{zone.name}</Text>
                                {zone.active !== false ? (
                                  <Tag color="success" style={{ borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 11 }}>Active</Tag>
                                ) : (
                                  <Tag color="default" style={{ borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 11 }}>Inactive</Tag>
                                )}
                              </Space>
                              
                              <div style={{ marginTop: 6 }}>
                                <Space size={16} style={{ flexWrap: 'wrap' }}>
                                  <Text type="secondary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <SlidersOutlined /> {zone.radiusMeters}m Geofence
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <TeamOutlined /> {assignedCount} Staff Assigned
                                  </Text>
                                </Space>
                              </div>
                              {zone.address && (
                                <div style={{ marginTop: 4 }}>
                                  <Text type="secondary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'start', gap: 4 }}>
                                    <EnvironmentOutlined style={{ marginTop: 3, color: '#64748b' }} /> 
                                    <span style={{ color: '#64748b' }}>{zone.address}</span>
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Space>

                          <Space size={8} onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Edit Zone">
                              <Button 
                                type="text" 
                                icon={<EditOutlined style={{ color: '#4f46e5' }} />} 
                                onClick={() => handleOpenEditModal(zone)}
                                style={{ borderRadius: 8 }}
                              />
                            </Tooltip>
                            
                            <Popconfirm
                              title="Delete QR Zone?"
                              description="Are you sure you want to delete this QR zone? This action cannot be undone."
                              onConfirm={() => handleDeleteZone(zone.id)}
                              okText="Yes, Delete"
                              cancelText="Cancel"
                            >
                              <Tooltip title="Delete Zone">
                                <Button 
                                  type="text" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  style={{ borderRadius: 8 }}
                                />
                              </Tooltip>
                            </Popconfirm>
                          </Space>
                        </div>

                        {/* Expandable/Subtle coordinates view */}
                        {zone.latitude && zone.longitude && (
                          <div style={{ 
                            marginTop: 14, 
                            padding: '8px 12px', 
                            background: '#f8fafc', 
                            borderRadius: 8, 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center' 
                          }}>
                            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                              GPS: {Number(zone.latitude).toFixed(5)}, {Number(zone.longitude).toFixed(5)}
                            </Text>
                            <Popconfirm
                              title="Reset QR Code?"
                              description="If you reset the QR, the old QR you printed will not work anymore. Are you sure you want to proceed?"
                              onConfirm={(e) => { e?.stopPropagation(); handleRegenerateToken(zone.id); }}
                              onCancel={(e) => { e?.stopPropagation(); }}
                              okText="Yes, Reset"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                            >
                              <Button 
                                type="link" 
                                size="small" 
                                icon={<SyncOutlined />} 
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: 11, padding: 0, height: 'auto', fontWeight: 600 }}
                              >
                                Reset QR
                              </Button>
                            </Popconfirm>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Premium Poster Card */}
            <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {selectedZone ? (
                <div style={{ width: '100%', maxWidth: 440 }}>
                  {/* Gorgeous Poster */}
                  <Card
                    className="printable-poster"
                    bordered
                    style={{
                      borderRadius: 24,
                      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)',
                      borderColor: '#e2e8f0',
                      textAlign: 'center',
                      background: '#ffffff',
                      overflow: 'hidden',
                      padding: '40px 32px',
                      position: 'relative'
                    }}
                  >
                    {/* Ambient Blobs for Premium Aesthetic */}
                    <div className="no-print" style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
                    <div className="no-print" style={{ position: 'absolute', bottom: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />

                    {/* Decorative Dot Grid (Top Right) */}
                    <svg width="45" height="45" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="no-print" style={{ position: 'absolute', top: 20, right: 20, opacity: 0.15 }}>
                      <circle cx="5" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="20" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="35" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="50" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="5" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="20" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="35" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="50" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="5" cy="35" r="2" fill="#4f46e5" />
                      <circle cx="20" cy="35" r="2" fill="#4f46e5" />
                      <circle cx="35" cy="35" r="2" fill="#4f46e5" />
                      <circle cx="50" cy="35" r="2" fill="#4f46e5" />
                    </svg>

                    {/* Decorative Dot Grid (Bottom Left) */}
                    <svg width="45" height="45" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="no-print" style={{ position: 'absolute', bottom: 20, left: 20, opacity: 0.15 }}>
                      <circle cx="5" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="20" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="35" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="50" cy="5" r="2" fill="#4f46e5" />
                      <circle cx="5" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="20" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="35" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="50" cy="20" r="2" fill="#4f46e5" />
                      <circle cx="5" cy="35" r="2" fill="#4f46e5" />
                      <circle cx="20" cy="35" r="2" fill="#4f46e5" />
                      <circle cx="35" cy="35" r="2" fill="#4f46e5" />
                      <circle cx="50" cy="35" r="2" fill="#4f46e5" />
                    </svg>

                    {/* Center Print Button (no-print) */}
                    <div className="no-print" style={{ marginBottom: 20 }}>
                      <Button 
                        type="primary" 
                        icon={<PrinterOutlined />} 
                        onClick={handlePrint}
                        style={{ 
                          borderRadius: 20, 
                          background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', 
                          border: 'none', 
                          fontWeight: 700,
                          fontSize: 12,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 12px rgba(22, 119, 255, 0.2)',
                          height: 38,
                          padding: '0 24px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        Print QR Poster
                      </Button>
                    </div>

                    {/* Header */}
                    <div style={{ marginBottom: 28 }}>
                      <Title level={2} style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 24 }}>
                        {orgBrand}
                      </Title>
                      <Text style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px', color: '#4f46e5', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                        {selectedZone.name}
                      </Text>
                      <div style={{ 
                        height: 2, 
                        width: 40, 
                        background: '#cbd5e1', 
                        margin: '0 auto 12px auto', 
                        borderRadius: 1 
                      }} />
                      <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b', fontWeight: 700 }}>
                        Attendance System
                      </Text>
                    </div>

                    {/* QR Code Container */}
                    <div style={{
                      display: 'inline-block',
                      padding: 20,
                      background: '#ffffff',
                      borderRadius: 20,
                      border: '3px solid #1677ff',
                      boxShadow: '0 8px 24px rgba(22, 119, 255, 0.06)',
                      marginBottom: 28
                    }}>
                      <img 
                        src={qrImageUrl} 
                        alt="Attendance QR Code" 
                        style={{ width: 240, height: 240, display: 'block' }} 
                      />
                    </div>

                    {/* Footer instructions */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                        <MobileOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                        <Title level={3} style={{ margin: 0, color: '#1677ff', fontWeight: 800, letterSpacing: '0.5px', fontSize: 16 }}>
                          SCAN TO PUNCH
                        </Title>
                      </div>
                      <Paragraph style={{ color: '#475569', fontSize: 13, maxWidth: 340, margin: '0 auto', lineHeight: '1.6', fontWeight: 500 }}>
                        Please open the <strong>Vetansutra</strong> mobile app and scan this QR code to mark your attendance instantly.
                      </Paragraph>
                    </div>

                    {selectedZone.latitude && (
                      <div style={{ marginTop: 28, background: '#f0fdf4', padding: '8px 18px', borderRadius: 20, display: 'inline-block' }} className="no-print">
                        <Space style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>
                          <EnvironmentOutlined />
                          <span>Geofence Secured ({selectedZone.radiusMeters}m radius)</span>
                        </Space>
                      </div>
                    )}
                  </Card>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '100px 40px' }} className="no-print">
                  <QrcodeOutlined style={{ fontSize: 64, color: '#cbd5e1', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#64748b', fontWeight: 700 }}>No QR Code Active</Title>
                  <Paragraph type="secondary" style={{ maxWidth: 300, margin: '0 auto' }}>
                    Select a QR zone from the left list or create a new zone to view and print the poster.
                  </Paragraph>
                </div>
              )}
            </div>
          </div>
        </Content>
      </Layout>

      {/* Add / Edit QR Zone Modal */}
      <Modal
        title={
          <Space size={8}>
            <QrcodeOutlined style={{ color: '#4f46e5' }} />
            <span style={{ fontWeight: 700 }}>{editingZone ? 'Edit QR Geofence Zone' : 'Create New QR Geofence Zone'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSaveZone}
        confirmLoading={saving}
        width={550}
        okText="Save Zone"
        cancelText="Cancel"
        style={{ top: 40 }}
        bodyStyle={{ paddingTop: 12 }}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          {/* Zone Name */}
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Zone Name</span>}
            rules={[{ required: true, message: 'Please enter a name for the zone (e.g. Warehouse Branch)' }]}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="e.g. Main HQ, Okhla Branch, Noida Site..." style={{ borderRadius: 8, height: 40 }} />
          </Form.Item>

          {/* Address Autocomplete (Google Places) */}
          <Form.Item 
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Search Office Address (Autofill Coordinates)</span>}
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <Input 
                id="office-address-search" 
                placeholder="Start typing address or office location..." 
                style={{ flex: 1, borderRadius: 8, height: 40 }} 
              />
              <Button 
                onClick={handleAddressLocate}
                style={{ 
                  height: 40, 
                  borderRadius: 8, 
                  fontWeight: 700, 
                  background: '#eff6ff', 
                  color: '#1d4ed8', 
                  border: '1px solid #bfdbfe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <EnvironmentOutlined />
                Locate
              </Button>
            </div>
          </Form.Item>

          {/* Latitude & Longitude */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="latitude" 
                label={<span style={{ fontWeight: 600, color: '#475569', fontSize: 12 }}>Latitude</span>}
                rules={[
                  { required: true, message: 'Required' },
                  {
                    validator: (_, val) => {
                      if (val !== undefined && val !== null && isNaN(Number(val))) {
                        return Promise.reject(new Error('Must be a number'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  style={{ width: '100%', borderRadius: 8, height: 40 }} 
                  placeholder="e.g. 28.6875" 
                  suffix={<CompassOutlined style={{ color: '#818cf8', fontSize: 16 }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="longitude" 
                label={<span style={{ fontWeight: 600, color: '#475569', fontSize: 12 }}>Longitude</span>}
                rules={[
                  { required: true, message: 'Required' },
                  {
                    validator: (_, val) => {
                      if (val !== undefined && val !== null && isNaN(Number(val))) {
                        return Promise.reject(new Error('Must be a number'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  style={{ width: '100%', borderRadius: 8, height: 40 }} 
                  placeholder="e.g. 77.4814" 
                  suffix={<CompassOutlined style={{ color: '#818cf8', fontSize: 16 }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Radius Limit & Status */}
          <Row gutter={16} align="middle">
            <Col span={16}>
              <Form.Item 
                name="radiusMeters" 
                label={<span style={{ fontWeight: 600, color: '#475569', fontSize: 12 }}>Allowed Radius Limit (meters)</span>}
                rules={[
                  { required: true, message: 'Please set a radius' },
                  {
                    validator: (_, val) => {
                      if (val !== undefined && val !== null && isNaN(Number(val))) {
                        return Promise.reject(new Error('Must be a number'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  style={{ width: '100%', borderRadius: 8, height: 40 }} 
                  placeholder="e.g. 100" 
                  suffix={<SlidersOutlined style={{ color: '#818cf8', fontSize: 16 }} />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="active" 
                label={<span style={{ fontWeight: 600, color: '#475569', fontSize: 12 }}>Active Status</span>}
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0 20px 0' }} />

          {/* Staff Assignment Section (Multi-select dropdown) */}
          <Form.Item
            name="assignedUserIds"
            label={
              <Space>
                <span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Assign Staff Members</span>
                <Tooltip title="Whichever staff members are assigned here, only they will be allowed to clock in using this QR zone.">
                  <InfoCircleOutlined style={{ color: '#64748b', fontSize: 13 }} />
                </Tooltip>
              </Space>
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Search & Select staff to assign..."
              style={{ width: '100%', borderRadius: 8 }}
              optionFilterProp="children"
              filterOption={(input, option) => {
                const name = option.children?.[0]?.props?.children || '';
                const staffId = option.children?.[1]?.props?.children || '';
                return name.toLowerCase().includes(input.toLowerCase()) || staffId.toLowerCase().includes(input.toLowerCase());
              }}
              dropdownStyle={{ borderRadius: 10 }}
            >
              {staff.map((u) => (
                <Option key={u.id} value={u.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.name}</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{u.staffId || `ID: ${u.id}`}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
