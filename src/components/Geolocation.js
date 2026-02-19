import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, DatePicker, Button, Select, Table, message, Space, Typography, Row, Col, Statistic, Menu, Tag, Timeline, Modal, Descriptions, List, Avatar, Spin, Empty, Switch } from 'antd';
import {
  EnvironmentOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  HistoryOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Geolocation = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [selectedStaffTimeline, setSelectedStaffTimeline] = useState([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const autoRefreshRef = useRef(null);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalLocations: 0,
    averageLocations: 0
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptionInfo();
    fetchStaff();
    fetchStats();
  }, []); // Only fetch basic data on mount

  const fetchSubscriptionInfo = async () => {
    try {
      const res = await api.get('/subscription/subscription-info');
      setSubscriptionInfo(res.data?.subscriptionInfo);

      const sub = res.data?.subscriptionInfo;
      const isGeoActive = !!sub?.geolocationEnabled || !!sub?.plan?.geolocationEnabled;
      if (!isGeoActive) {
        message.warning('You do not have permission to access Geolocation module');
      }
    } catch (e) {
      console.error('Failed to fetch subscription info', e);
    }
  };

  // Fetch location data when staff is selected or date changes
  useEffect(() => {
    if (selectedStaff && selectedDate) {
      fetchLocationData();
    }
  }, [selectedStaff, selectedDate]);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (autoRefresh && selectedStaff) {
      autoRefreshRef.current = setInterval(() => {
        fetchLocationData();
      }, 30000); // refresh every 30 seconds
    }
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, selectedStaff, selectedDate]);

  const fetchStaff = async () => {
    try {
      // First, get all staff
      const response = await api.get('/admin/staff');
      if (response.data.success) {
        const allStaff = response.data.data;

        // Then filter staff who have geolocation_access permission
        const staffWithPermissions = await Promise.all(
          allStaff.map(async (staff) => {
            try {
              // Get staff permissions
              const permResponse = await api.get(`/admin/roles/my-permissions-open`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'X-User-ID': staff.id // Pass staff ID to get their permissions
                }
              });

              const hasGeolocationAccess = permResponse.data?.permissions?.some(
                p => p.name === 'geolocation_access'
              );

              return {
                ...staff,
                hasGeolocationAccess
              };
            } catch (error) {
              console.error(`Error fetching permissions for staff ${staff.id}:`, error);
              return {
                ...staff,
                hasGeolocationAccess: false
              };
            }
          })
        );

        // Filter to only show staff with geolocation access
        const filteredStaff = staffWithPermissions.filter(staff => staff.hasGeolocationAccess);
        setStaffList(filteredStaff);
      }
    } catch (error) {
      message.error('Failed to fetch staff list');
    }
  };

  const fetchLocationData = async () => {
    setLoading(true);
    try {
      // Only fetch data for selected staff, not for all
      if (!selectedStaff) {
        setLocationData([]);
        return;
      }

      const params = {
        date: selectedDate.format('YYYY-MM-DD'),
        staffId: selectedStaff
      };

      const response = await api.get('/admin/geolocation', { params });
      if (response.data.success) {
        const data = response.data.data;
        setLocationData(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      message.error('Failed to fetch location data');
      console.error('Error fetching location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/geolocation/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchStaffTimeline = async (staffId, date) => {
    try {
      const response = await api.get(`/admin/geolocation/${staffId}/timeline`, {
        params: { date: date.format('YYYY-MM-DD') }
      });
      if (response.data.success) {
        setSelectedStaffTimeline(response.data.data);
      }
    } catch (error) {
      message.error('Failed to fetch staff timeline');
    }
  };

  const handleViewTimeline = (staff) => {
    setSelectedStaffName(staff.name);
    setTimelineVisible(true);
    fetchStaffTimeline(staff.id, selectedDate);
  };

  const columns = [
    {
      title: 'Staff Name',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Punch In',
      dataIndex: 'punchInTime',
      key: 'punchInTime',
      render: (time) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
    {
      title: 'Punch Out',
      dataIndex: 'punchOutTime',
      key: 'punchOutTime',
      render: (time) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
    {
      title: 'Total Locations',
      dataIndex: 'locationCount',
      key: 'locationCount',
      render: (count) => (
        <Tag color="blue">{count} locations</Tag>
      ),
    },
    {
      title: 'First Location',
      dataIndex: 'firstLocation',
      key: 'firstLocation',
      render: (location) => location ? (
        <Space direction="vertical" size="small">
          <span>{location.address || 'Unknown'}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}
          </span>
        </Space>
      ) : '-',
    },
    {
      title: 'Last Location',
      dataIndex: 'lastLocation',
      key: 'lastLocation',
      render: (location) => location ? (
        <Space direction="vertical" size="small">
          <span>{location.address || 'Unknown'}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}
          </span>
        </Space>
      ) : '-',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<HistoryOutlined />}
          onClick={() => handleViewTimeline(record)}
        >
          View Timeline
        </Button>
      ),
    },
  ];

  const timelineColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time) => dayjs(time).format('HH:mm:ss'),
    },
    {
      title: 'Location',
      dataIndex: 'address',
      key: 'address',
      render: (address, record) => (
        <Space direction="vertical" size="small">
          <span>{address || 'Unknown location'}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {record.lat?.toFixed(6)}, {record.lng?.toFixed(6)}
          </span>
        </Space>
      ),
    },
    {
      title: 'Accuracy',
      dataIndex: 'accuracy',
      key: 'accuracy',
      render: (accuracy) => accuracy ? `${accuracy}m` : '-',
    },
  ];

  // Map component
  const SimpleMap = ({ locations, selectedStaffData }) => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);

    useEffect(() => {
      // Always load Leaflet since we want to show the map even without locations
      if (!mapLoaded && window.L) {
        setMapLoaded(true);
      } else if (!mapLoaded) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setMapLoaded(true);
        document.head.appendChild(script);
      }
    }, [mapLoaded]);

    // Initialize and update map when locations or map is loaded
    useEffect(() => {
      if (mapLoaded && !mapInstance) {
        // Initialize map with default location if no locations available
        const defaultLatLng = locations && locations.length > 0 && locations[0].lat && locations[0].lng
          ? [locations[0].lat, locations[0].lng]
          : [28.6139, 77.2090]; // Default to New Delhi coordinates

        const map = window.L.map('map').setView(defaultLatLng, 13);

        // Add tile layer
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        setMapInstance(map);
      }
    }, [mapLoaded, mapInstance]);

    // Update map markers and path when locations change
    useEffect(() => {
      if (mapLoaded && mapInstance) {
        // Clear existing markers and layers
        mapInstance.eachLayer((layer) => {
          if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
            mapInstance.removeLayer(layer);
          }
        });

        // Add markers only if we have valid locations
        if (locations && locations.length > 0) {
          const validLocations = locations.filter(loc => loc.lat && loc.lng);

          if (validLocations.length > 0) {
            // Add markers for each valid location
            validLocations.forEach((location, index) => {
              const marker = window.L.marker([location.lat, location.lng]).addTo(mapInstance);

              // Create popup content
              const popupContent = `
                <div style="padding: 8px;">
                  <strong>${selectedStaffData?.name || 'Unknown'}</strong><br/>
                  <small>Time: ${dayjs(location.timestamp).format('HH:mm:ss')}</small><br/>
                  <small>Accuracy: ${location.accuracy || 'N/A'}m</small>
                </div>
              `;
              marker.bindPopup(popupContent);

              // Add number to marker
              if (validLocations.length > 1) {
                const icon = window.L.divIcon({
                  html: `<div style="background: #1890ff; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${index + 1}</div>`,
                  iconSize: [24, 24],
                  className: 'custom-div-icon'
                });
                marker.setIcon(icon);
              }
            });

            // Draw path between points if multiple valid locations
            if (validLocations.length > 1) {
              const latlngs = validLocations.map(loc => [loc.lat, loc.lng]);
              const polyline = window.L.polyline(latlngs, {
                color: '#1890ff',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
              }).addTo(mapInstance);

              // Fit map to show all points
              mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            } else {
              // Center on single location
              mapInstance.setView([validLocations[0].lat, validLocations[0].lng], 15);
            }
          }
        }
      }
    }, [mapLoaded, mapInstance, locations, selectedStaffData]);

    // Check if we have valid locations
    const hasValidLocations = locations && locations.some(loc => loc.lat && loc.lng);

    // Show loading state while map is loading
    if (!mapLoaded) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
          <Spin size="large" tip="Loading map..." />
        </div>
      );
    }

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Map Container */}
        <div id="map" style={{ height: '100%', minHeight: 350, borderRadius: 8 }} />

        {/* Status Message */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: hasValidLocations ? '#f6ffed' : '#fff2f0',
          borderTop: '1px solid #f0f0f0',
          borderRadius: '0 0 8px 8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: hasValidLocations ? '#52c41a' : '#ff4d4f',
            fontSize: '14px',
            fontWeight: 500
          }}>
            <EnvironmentOutlined style={{ marginRight: 8 }} />
            {hasValidLocations ?
              `Tracking active - ${locations.filter(loc => loc.lat && loc.lng).length} location${locations.filter(loc => loc.lat && loc.lng).length > 1 ? 's' : ''} recorded` :
              'Location Not Available'
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ marginRight: 16 }}
            />
            <Title level={4} style={{ margin: 0 }}>
              <EnvironmentOutlined /> Geolocation Tracking
            </Title>
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/');
            }}
          >
            Logout
          </Button>
        </Header>

        <Content style={{ margin: '16px' }}>
          {subscriptionInfo && !(!!subscriptionInfo.geolocationEnabled || !!subscriptionInfo.plan?.geolocationEnabled) ? (
            <Card style={{ textAlign: 'center', padding: '50px' }}>
              <Empty
                image={<EnvironmentOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />}
                description={
                  <Space direction="vertical">
                    <Text strong style={{ fontSize: '18px' }}>Geolocation Not Enabled</Text>
                    <Text type="secondary">This module is not included in your current subscription plan.</Text>
                    <Button type="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                  </Space>
                }
              />
            </Card>
          ) : (
            <>
              <Card style={{ marginTop: 16 }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <label style={{ display: 'block', marginBottom: 8 }}>Select Date:</label>
                    <DatePicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={8}>
                    <label style={{ display: 'block', marginBottom: 8 }}>&nbsp;</label>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={fetchLocationData}
                      loading={loading}
                      style={{ width: '100%' }}
                    >
                      Refresh
                    </Button>
                  </Col>
                  <Col span={8}>
                    <label style={{ display: 'block', marginBottom: 8 }}>Live Tracking:</label>
                    <Space>
                      <Switch
                        checked={autoRefresh}
                        onChange={setAutoRefresh}
                        checkedChildren="ON"
                        unCheckedChildren="OFF"
                      />
                      {autoRefresh && (
                        <Tag color="red" style={{ animation: 'pulse 1.5s infinite' }}>
                          ● LIVE
                        </Tag>
                      )}
                      {lastUpdated && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Updated: {dayjs(lastUpdated).format('HH:mm:ss')}
                        </Text>
                      )}
                    </Space>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: 16 }}>
                  {/* Left Column - Staff List Table */}
                  <Col span={12}>
                    <Card
                      title={
                        <Title level={5} style={{ marginBottom: 0 }}>
                          <UserOutlined /> Organization Staff
                        </Title>
                      }
                      style={{ height: '600px' }}
                      bodyStyle={{ padding: '16px', height: 'calc(100% - 57px)', overflow: 'auto' }}
                    >
                      <Table
                        dataSource={staffList}
                        columns={[
                          {
                            title: 'Name',
                            dataIndex: 'name',
                            key: 'name',
                            render: (text, record) => (
                              <Space>
                                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                <span style={{ fontWeight: 'bold' }}>{text}</span>
                              </Space>
                            ),
                          },
                          {
                            title: 'Phone',
                            dataIndex: 'phone',
                            key: 'phone',
                          },
                          {
                            title: 'Action',
                            key: 'action',
                            render: (_, record) => (
                              <Button
                                type="primary"
                                size="small"
                                icon={<EnvironmentOutlined />}
                                onClick={() => setSelectedStaff(record.id)}
                                disabled={selectedStaff === record.id}
                              >
                                {selectedStaff === record.id ? 'Selected' : 'View Map'}
                              </Button>
                            ),
                          },
                        ]}
                        rowKey="id"
                        pagination={{
                          pageSize: 8,
                          size: 'small',
                        }}
                        size="small"
                      />
                    </Card>
                  </Col>

                  {/* Right Column - Map */}
                  <Col span={12}>
                    <Card
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            <EnvironmentOutlined style={{ marginRight: 8 }} />
                            Location Tracking Map
                          </span>
                          {selectedStaff && (
                            <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                              {staffList.find(s => s.id === selectedStaff)?.name || 'Unknown'} - {selectedDate.format('YYYY-MM-DD')}
                            </span>
                          )}
                        </div>
                      }
                      style={{ height: '600px' }}
                      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'hidden' }}
                    >
                      {selectedStaff ? (
                        <SimpleMap
                          locations={locationData.length > 0 ? locationData[0]?.locations || [] : []}
                          selectedStaffData={staffList.find(s => s.id === selectedStaff) || {}}
                        />
                      ) : (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                          flexDirection: 'column',
                          color: '#999'
                        }}>
                          <EnvironmentOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                          <Text>Select a staff member to view their location tracking</Text>
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
              </Card>
            </>
          )}
        </Content>
      </Layout>

      <Modal
        title={`Location Timeline - ${selectedStaffName}`}
        open={timelineVisible}
        onCancel={() => setTimelineVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={timelineColumns}
          dataSource={selectedStaffTimeline}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>
    </Layout >
  );
};

export default Geolocation;
