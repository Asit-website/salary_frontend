import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout, Card, DatePicker, Button, Select, Table, message, Space, Typography, Row, Col, Statistic, Menu, Tag, Timeline, Modal, Descriptions, List, Avatar, Spin, Empty, Switch } from 'antd';
import {
  EnvironmentOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  HistoryOutlined,
  ExpandOutlined,
  CompressOutlined,
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

const toRad = (deg) => (Number(deg) * Math.PI) / 180;
const haversineMeters = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371000;
  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLng = toRad(Number(b.lng) - Number(a.lng));
  const lat1 = toRad(Number(a.lat));
  const lat2 = toRad(Number(b.lat));
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
};

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const totalSec = Math.floor(ms / 1000);
  const hr = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  if (hr <= 0) return `${min}m`;
  return `${hr}h ${min}m`;
};

const formatCoord = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(6) : '-';
};

const hasValidCoord = (lat, lng) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const formatLocationLabel = (address, lat, lng) => {
  const cleanAddress = String(address || '').trim();
  if (cleanAddress) return cleanAddress;
  if (hasValidCoord(lat, lng)) return `Lat ${formatCoord(lat)}, Lng ${formatCoord(lng)}`;
  return 'Unknown location';
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyBukqAGI9NioKWUOgzVs0vXrBOg9DnbwLo';
let gmapsLoading = false;
let gmapsReady = false;
const ensureGoogleMaps = () => new Promise((resolve) => {
  if (gmapsReady || window.google?.maps) {
    gmapsReady = true;
    resolve();
    return;
  }
  if (gmapsLoading) {
    const id = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(id);
        gmapsReady = true;
        resolve();
      }
    }, 50);
    return;
  }
  gmapsLoading = true;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    gmapsReady = true;
    resolve();
  };
  document.body.appendChild(script);
});

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
  const [focusedLocation, setFocusedLocation] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isMapFullWidth, setIsMapFullWidth] = useState(false);
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
      setFocusedLocation(null);
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

  const selectedStaffData = useMemo(
    () => staffList.find((s) => Number(s.id) === Number(selectedStaff)) || null,
    [staffList, selectedStaff]
  );

  const selectedDayRecord = useMemo(() => {
    if (!selectedStaff || locationData.length === 0) return null;
    return locationData.find((r) => Number(r.staffId) === Number(selectedStaff)) || locationData[0] || null;
  }, [locationData, selectedStaff]);

  const selectedLocations = useMemo(() => selectedDayRecord?.locations || [], [selectedDayRecord]);

  const trackingInsights = useMemo(() => {
    const valid = selectedLocations.filter((loc) => Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng)));
    let distanceMeters = 0;
    for (let i = 1; i < valid.length; i += 1) {
      distanceMeters += haversineMeters(valid[i - 1], valid[i]);
    }
    const accuracyValues = valid
      .map((loc) => Number(loc.accuracy))
      .filter((n) => Number.isFinite(n) && n > 0);
    const avgAccuracy = accuracyValues.length > 0
      ? accuracyValues.reduce((s, x) => s + x, 0) / accuracyValues.length
      : null;
    const firstTs = valid.length > 0 ? new Date(valid[0].timestamp).getTime() : null;
    const lastTs = valid.length > 0 ? new Date(valid[valid.length - 1].timestamp).getTime() : null;
    const haltDistanceThresholdM = 50;
    const haltTimeThresholdMs = 3 * 60 * 1000;
    const halts = [];
    let haltStart = null;
    let haltEnd = null;
    let haltRef = null;

    for (let i = 1; i < valid.length; i += 1) {
      const prev = valid[i - 1];
      const curr = valid[i];
      const prevTs = new Date(prev.timestamp).getTime();
      const currTs = new Date(curr.timestamp).getTime();
      if (!Number.isFinite(prevTs) || !Number.isFinite(currTs) || currTs <= prevTs) continue;

      const moved = haversineMeters(prev, curr);
      if (moved <= haltDistanceThresholdM) {
        if (!haltStart) {
          haltStart = prevTs;
          haltRef = prev;
        }
        haltEnd = currTs;
      } else if (haltStart && haltEnd && haltEnd - haltStart >= haltTimeThresholdMs) {
        halts.push({
          startTs: haltStart,
          endTs: haltEnd,
          durationMs: haltEnd - haltStart,
          lat: haltRef?.lat,
          lng: haltRef?.lng,
          address: haltRef?.address || curr?.address || null,
        });
        haltStart = null;
        haltEnd = null;
        haltRef = null;
      } else {
        haltStart = null;
        haltEnd = null;
        haltRef = null;
      }
    }

    if (haltStart && haltEnd && haltEnd - haltStart >= haltTimeThresholdMs) {
      halts.push({
        startTs: haltStart,
        endTs: haltEnd,
        durationMs: haltEnd - haltStart,
        lat: haltRef?.lat,
        lng: haltRef?.lng,
        address: haltRef?.address || null,
      });
    }

    const totalHaltMs = halts.reduce((sum, h) => sum + Number(h.durationMs || 0), 0);

    return {
      totalPings: selectedLocations.length,
      validPings: valid.length,
      distanceKm: distanceMeters / 1000,
      avgAccuracy,
      lastSeen: lastTs ? dayjs(lastTs) : null,
      span: firstTs && lastTs ? formatDuration(lastTs - firstTs) : '0m',
      recent: [...selectedLocations].slice(-8).reverse(),
      halts,
      haltCount: halts.length,
      haltTotalMs: totalHaltMs,
    };
  }, [selectedLocations]);

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
          <span>{formatLocationLabel(location.address, location.lat, location.lng)}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {formatCoord(location.lat)}, {formatCoord(location.lng)}
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
          <span>{formatLocationLabel(location.address, location.lat, location.lng)}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {formatCoord(location.lat)}, {formatCoord(location.lng)}
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
          <span>{formatLocationLabel(address, record.lat, record.lng)}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {formatCoord(record.lat)}, {formatCoord(record.lng)}
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
  const SimpleMap = ({ locations, selectedStaffData, selectedDayRecord, insights, focusedLocation }) => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);
    const mapContainerRef = useRef(null);
    const markersRef = useRef([]);
    const markerIndexRef = useRef(new Map());
    const pathRef = useRef(null);
    const infoWindowRef = useRef(null);

    useEffect(() => {
      let mounted = true;
      const loadGoogle = async () => {
        await ensureGoogleMaps();
        if (mounted) setMapLoaded(true);
      };
      if (!mapLoaded) loadGoogle();
      return () => { mounted = false; };
    }, [mapLoaded]);

    useEffect(() => {
      if (mapLoaded && !mapInstance && mapContainerRef.current && window.google?.maps) {
        const firstValid = (locations || []).find((loc) => hasValidCoord(loc?.lat, loc?.lng));
        const defaultCenter = firstValid
          ? { lat: Number(firstValid.lat), lng: Number(firstValid.lng) }
          : { lat: 28.6139, lng: 77.2090 };
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        infoWindowRef.current = new window.google.maps.InfoWindow();
        setMapInstance(map);
      }
    }, [mapLoaded, mapInstance]);

    useEffect(() => {
      if (!mapLoaded || !mapInstance || !window.google?.maps) return;

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      markerIndexRef.current = new Map();
      if (pathRef.current) {
        pathRef.current.setMap(null);
        pathRef.current = null;
      }

      const findNearestLocation = (targetTime, points) => {
        if (!targetTime) return null;
        const target = new Date(targetTime).getTime();
        if (!Number.isFinite(target)) return null;
        let nearest = null;
        let diff = Number.MAX_SAFE_INTEGER;
        (points || []).forEach((loc) => {
          const t = new Date(loc.timestamp).getTime();
          const d = Math.abs(t - target);
          if (d < diff) {
            diff = d;
            nearest = loc;
          }
        });
        return nearest;
      };

      const validLocations = (locations || [])
        .filter((loc) => hasValidCoord(loc?.lat, loc?.lng))
        .map((loc) => ({ ...loc, lat: Number(loc.lat), lng: Number(loc.lng) }));

      if (validLocations.length === 0) {
        mapInstance.setCenter({ lat: 28.6139, lng: 77.2090 });
        mapInstance.setZoom(13);
        return;
      }

      validLocations.forEach((location, index) => {
        const isFirst = index === 0;
        const isLast = index === validLocations.length - 1;
        const markerColor = isFirst ? '#13c2c2' : (isLast ? '#f5222d' : '#1890ff');
        const marker = new window.google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: mapInstance,
          label: validLocations.length > 1 ? { text: String(index + 1), color: '#fff', fontWeight: '700' } : undefined,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 10,
          },
        });
        marker.addListener('click', () => {
          if (!infoWindowRef.current) return;
          infoWindowRef.current.setContent(
            `<div style="padding: 8px;">
              <strong>${selectedStaffData?.name || 'Unknown'}</strong><br/>
              <small>Time: ${dayjs(location.timestamp).format('HH:mm:ss')}</small><br/>
              <small>Accuracy: ${location.accuracy || 'N/A'}m</small>
            </div>`
          );
          infoWindowRef.current.open({ anchor: marker, map: mapInstance });
        });
        markerIndexRef.current.set(`${location.timestamp}|${location.lat}|${location.lng}`, marker);
        markersRef.current.push(marker);
      });

      const punchInLoc = findNearestLocation(selectedDayRecord?.punchInTime, validLocations);
      const punchOutLoc = findNearestLocation(selectedDayRecord?.punchOutTime, validLocations);
      if (punchInLoc) {
        const inMarker = new window.google.maps.Marker({
          position: { lat: punchInLoc.lat, lng: punchInLoc.lng },
          map: mapInstance,
          label: { text: 'IN', color: '#fff', fontWeight: '700' },
          icon: {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: '#52c41a',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 6,
          },
        });
        markersRef.current.push(inMarker);
      }
      if (punchOutLoc) {
        const outMarker = new window.google.maps.Marker({
          position: { lat: punchOutLoc.lat, lng: punchOutLoc.lng },
          map: mapInstance,
          label: { text: 'OUT', color: '#fff', fontWeight: '700' },
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            fillColor: '#ff4d4f',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 6,
          },
        });
        markersRef.current.push(outMarker);
      }

      if (validLocations.length > 1) {
        pathRef.current = new window.google.maps.Polyline({
          path: validLocations.map((loc) => ({ lat: loc.lat, lng: loc.lng })),
          geodesic: true,
          strokeColor: '#1677ff',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map: mapInstance,
        });
      }

      const bounds = new window.google.maps.LatLngBounds();
      validLocations.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }));
      mapInstance.fitBounds(bounds, 50);
    }, [mapLoaded, mapInstance, locations, selectedStaffData, selectedDayRecord]);

    useEffect(() => {
      if (!mapLoaded || !mapInstance || !focusedLocation) return;
      if (!hasValidCoord(focusedLocation.lat, focusedLocation.lng)) return;
      const lat = Number(focusedLocation.lat);
      const lng = Number(focusedLocation.lng);
      mapInstance.panTo({ lat, lng });
      mapInstance.setZoom(17);
      const markerKey = `${focusedLocation.timestamp}|${lat}|${lng}`;
      const marker = markerIndexRef.current.get(markerKey);
      if (marker && infoWindowRef.current) {
        infoWindowRef.current.setContent(
          `<div style="padding: 8px;">
            <strong>${selectedStaffData?.name || 'Unknown'}</strong><br/>
            <small>Time: ${dayjs(focusedLocation.timestamp).format('HH:mm:ss')}</small><br/>
            <small>Accuracy: ${focusedLocation.accuracy || 'N/A'}m</small>
          </div>`
        );
        infoWindowRef.current.open({ anchor: marker, map: mapInstance });
      }
    }, [mapLoaded, mapInstance, focusedLocation]);

    // Check if we have valid locations
    const validLocationCount = (locations || []).filter((loc) => hasValidCoord(loc?.lat, loc?.lng)).length;
    const hasValidLocations = validLocationCount > 0;

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
        <div ref={mapContainerRef} style={{ height: '100%', minHeight: 350, borderRadius: 8 }} />

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
              `Tracking active - ${validLocationCount} location${validLocationCount > 1 ? 's' : ''} recorded` :
              'Location Not Available'
            }
          </div>
          {hasValidLocations && insights ? (
            <div style={{ marginTop: 6, fontSize: 12, color: '#3f8600' }}>
              Last seen: {insights.lastSeen ? insights.lastSeen.format('HH:mm:ss') : '-'} | Avg accuracy: {insights.avgAccuracy ? `${insights.avgAccuracy.toFixed(1)}m` : '-'} | Distance: {insights.distanceKm.toFixed(2)} km
            </div>
          ) : null}
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

        <Content style={{ margin: '16px', background: 'linear-gradient(180deg, #f6f9ff 0%, #f3f5f9 100%)' }}>
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
              <Card
                style={{
                  marginTop: 8,
                  borderRadius: 16,
                  border: '1px solid #e6ecff',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
                  background: '#ffffff',
                }}
                bodyStyle={{ padding: 20 }}
              >
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Select Date</label>
                    <DatePicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                      style={{ width: '100%', borderRadius: 10 }}
                    />
                  </Col>
                  <Col span={8}>
                    <label style={{ display: 'block', marginBottom: 8 }}>&nbsp;</label>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={fetchLocationData}
                      loading={loading}
                      style={{ width: '100%', borderRadius: 10, height: 42, fontWeight: 600 }}
                    >
                      Refresh
                    </Button>
                  </Col>
                  <Col span={8}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Live Tracking</label>
                    <Space style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 10, minHeight: 42 }}>
                      <Switch
                        checked={autoRefresh}
                        onChange={setAutoRefresh}
                        checkedChildren="ON"
                        unCheckedChildren="OFF"
                      />
                      {autoRefresh && (
                        <Tag color="red" style={{ animation: 'pulse 1.5s infinite' }}>
                          â— LIVE
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

                {selectedStaff ? (
                  <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col flex="1">
                      <Card size="small" style={{ borderRadius: 14, border: '1px solid #dbeafe', background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)' }}>
                        <Statistic title="Total Pings" value={trackingInsights.totalPings} prefix={<EnvironmentOutlined />} />
                      </Card>
                    </Col>
                    <Col flex="1">
                      <Card size="small" style={{ borderRadius: 14, border: '1px solid #dbeafe', background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)' }}>
                        <Statistic title="Valid GPS" value={trackingInsights.validPings} />
                      </Card>
                    </Col>
                    <Col flex="1">
                      <Card size="small" style={{ borderRadius: 14, border: '1px solid #dbeafe', background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)' }}>
                        <Statistic title="Distance" value={trackingInsights.distanceKm.toFixed(2)} suffix="km" />
                      </Card>
                    </Col>
                    <Col flex="1">
                      <Card size="small" style={{ borderRadius: 14, border: '1px solid #dbeafe', background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)' }}>
                        <Statistic title="Tracking Span" value={trackingInsights.span} />
                      </Card>
                    </Col>
                    <Col flex="1">
                      <Card size="small" style={{ borderRadius: 14, border: '1px solid #dbeafe', background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)' }}>
                        <Statistic title="Halts" value={trackingInsights.haltCount} suffix={trackingInsights.haltTotalMs ? `(${formatDuration(trackingInsights.haltTotalMs)})` : ''} />
                      </Card>
                    </Col>
                  </Row>
                ) : null}

                <Row gutter={16} style={{ marginTop: 16 }}>
                  {/* Left Column - Staff List Table */}
                  {!isMapFullWidth ? (
                    <Col span={12}>
                      <Card
                        title={
                          <Title level={5} style={{ marginBottom: 0 }}>
                            <UserOutlined /> Organization Staff
                          </Title>
                        }
                        style={{
                          height: '600px',
                          borderRadius: 16,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
                        }}
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
                                <Space>
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<EnvironmentOutlined />}
                                    onClick={() => setSelectedStaff(record.id)}
                                    disabled={selectedStaff === record.id}
                                  >
                                    {selectedStaff === record.id ? 'Selected' : 'View Map'}
                                  </Button>
                                  <Button
                                    size="small"
                                    icon={<HistoryOutlined />}
                                    onClick={() => handleViewTimeline(record)}
                                  >
                                    Timeline
                                  </Button>
                                </Space>
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
                  ) : null}

                  {/* Right Column - Map */}
                  <Col span={isMapFullWidth ? 24 : 12}>
                    <Card
                      title={
                        <Title level={5} style={{ marginBottom: 0 }}>
                          <EnvironmentOutlined /> Location Tracking Map
                        </Title>
                      }
                      extra={(
                        <Space>
                          {selectedStaff && (
                            <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                              {selectedStaffData?.name || 'Unknown'} - {selectedDate.format('YYYY-MM-DD')}
                            </span>
                          )}
                          <Button
                            size="small"
                            icon={isMapFullWidth ? <CompressOutlined /> : <ExpandOutlined />}
                            onClick={() => setIsMapFullWidth((prev) => !prev)}
                          >
                            {isMapFullWidth ? 'Normal View' : 'Full Width'}
                          </Button>
                        </Space>
                      )}
                      style={{
                        height: isMapFullWidth ? '700px' : '600px',
                        borderRadius: 16,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
                      }}
                      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'hidden' }}
                    >
                      {selectedStaff ? (
                        <SimpleMap
                          locations={selectedLocations}
                          selectedStaffData={selectedStaffData || {}}
                          selectedDayRecord={selectedDayRecord}
                          insights={trackingInsights}
                          focusedLocation={focusedLocation}
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

                    {selectedStaff ? (
                      <Card
                        title="Recent Location Timeline"
                        size="small"
                        style={{
                          marginTop: 12,
                          borderRadius: 16,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
                        }}
                        extra={(
                          <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewTimeline(selectedStaffData || { id: selectedStaff, name: selectedStaffData?.name || 'Staff' })}>
                            View Full
                          </Button>
                        )}
                      >
                        {trackingInsights.haltCount > 0 ? (
                          <div style={{ marginBottom: 10, padding: '8px 10px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6 }}>
                            <Text strong style={{ color: '#ad6800' }}>
                              Halt detected: {trackingInsights.haltCount} ({formatDuration(trackingInsights.haltTotalMs)})
                            </Text>
                            <div style={{ marginTop: 4 }}>
                              {trackingInsights.halts.slice(-2).map((h, idx) => (
                                <Text key={`${h.startTs}-${idx}`} type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                  {dayjs(h.startTs).format('hh:mm A')} - {dayjs(h.endTs).format('hh:mm A')} ({formatDuration(h.durationMs)}) | {formatLocationLabel(h.address, h.lat, h.lng)}
                                </Text>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {trackingInsights.recent.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No locations for selected date" />
                        ) : (
                          <List
                            size="small"
                            dataSource={trackingInsights.recent}
                            renderItem={(item) => (
                              <List.Item>
                                <Button
                                  type="text"
                                  onClick={() => setFocusedLocation({ ...item, _focusNonce: Date.now() })}
                                  style={{ width: '100%', height: 'auto', textAlign: 'left', padding: 0 }}
                                >
                                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                    <Text strong>
                                      {dayjs(item.timestamp).format('hh:mm A')} - {formatLocationLabel(item.address, item.lat, item.lng)}
                                    </Text>
                                    <Space split={<span style={{ color: '#bfbfbf' }}>|</span>}>
                                      <Text type="secondary">{item.accuracy ? `${item.accuracy}m` : 'N/A'}</Text>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatCoord(item.lat)}, {formatCoord(item.lng)}
                                      </Text>
                                    </Space>
                                  </Space>
                                </Button>
                              </List.Item>
                            )}
                          />
                        )}
                      </Card>
                    ) : null}
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

