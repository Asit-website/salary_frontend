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
  CalendarOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const getFullImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

const MINIMAL_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "on" }, { saturation: -20 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dcfce7" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#166534" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fed7aa" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#ea580c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bae6fd" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#0369a1" }] }
];

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

const hasValidCoord = (lat, lng) => {
  if (lat === null || lat === undefined || lat === '' || lat === 0 || lat === '0') return false;
  if (lng === null || lng === undefined || lng === '' || lng === 0 || lng === '0') return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return Number.isFinite(nLat) && Number.isFinite(nLng) && nLat !== 0 && nLng !== 0;
};

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

// Map component
const SimpleMap = ({ locations, selectedStaffData, selectedDayRecord, insights, focusedLocation, setFocusedLocation, panelVisible, setPanelVisible, mapStyle, selectedDate }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const markerIndexRef = useRef(new Map());
  const pathRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = () => {
    const element = document.getElementById('map-fullscreen-wrapper');
    if (!element) return;
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

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
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: window.google.maps.ControlPosition.TOP_LEFT
        },
        streetViewControl: true,
        streetViewControlOptions: {
          position: window.google.maps.ControlPosition.LEFT_BOTTOM
        },
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.LEFT_BOTTOM
        },
        fullscreenControl: false,
        styles: []
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      setMapInstance(map);
    }
  }, [mapLoaded, mapInstance]);

  useEffect(() => {
    if (!mapInstance || !window.google?.maps) return;
    if (mapStyle === 'standard') {
      mapInstance.setMapTypeId(window.google.maps.MapTypeId.ROADMAP);
      mapInstance.setOptions({ styles: [] });
    } else if (mapStyle === 'satellite') {
      mapInstance.setMapTypeId(window.google.maps.MapTypeId.HYBRID);
      mapInstance.setOptions({ styles: [] });
    } else if (mapStyle === 'minimal') {
      mapInstance.setMapTypeId(window.google.maps.MapTypeId.ROADMAP);
      mapInstance.setOptions({ styles: MINIMAL_MAP_STYLES });
    }
  }, [mapInstance, mapStyle]);

  useEffect(() => {
    if (!mapLoaded || !mapInstance || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    markerIndexRef.current = new Map();
    if (pathRef.current) {
      if (pathRef.current.bgPath) {
        pathRef.current.bgPath.setMap(null);
      }
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

    const rawValidLocations = (locations || [])
      .filter((loc) => hasValidCoord(loc?.lat, loc?.lng))
      .map((loc) => ({ ...loc, lat: Number(loc.lat), lng: Number(loc.lng) }));

    // Consolidate stationary pings and filter out GPS drift (20 meters threshold)
    const filterDrift = (points, thresholdMeters = 20) => {
      if (points.length <= 1) return points;
      const filtered = [points[0]];
      let lastAdded = points[0];
      for (let i = 1; i < points.length; i++) {
        const pt = points[i];
        const dist = haversineMeters(lastAdded, pt);
        if (dist >= thresholdMeters) {
          filtered.push(pt);
          lastAdded = pt;
        }
      }
      const lastPt = points[points.length - 1];
      if (filtered[filtered.length - 1] !== lastPt) {
        if (haversineMeters(lastAdded, lastPt) >= 10) {
          filtered.push(lastPt);
        } else {
          filtered[filtered.length - 1] = lastPt;
        }
      }
      return filtered;
    };

    const validLocations = filterDrift(rawValidLocations, 20);

    if (validLocations.length === 0) {
      mapInstance.setCenter({ lat: 28.6139, lng: 77.2090 });
      mapInstance.setZoom(13);
      return;
    }

    validLocations.forEach((location, index) => {
      const isFirst = index === 0;
      const isLast = index === validLocations.length - 1;
      const markerColor = isFirst ? '#52c41a' : (isLast ? '#722ed1' : '#1677ff');
      
      let markerLabel = undefined;
      let markerIcon = {};

      if (isFirst || isLast) {
        markerLabel = {
          text: isFirst ? 'S' : 'L',
          color: '#ffffff',
          fontWeight: '900',
          fontSize: '11px'
        };
        markerIcon = {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 12
        };
      } else {
        markerIcon = {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#1677ff',
          fillOpacity: 0.75,
          strokeColor: '#ffffff',
          strokeWeight: 1,
          scale: 5
        };
      }

      const marker = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: mapInstance,
        label: markerLabel,
        icon: markerIcon,
      });

      marker.addListener('click', () => {
        if (setPanelVisible) {
          setPanelVisible(true);
        }
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(
          `<div style="display: flex; align-items: center; gap: 10px; padding: 4px; font-family: Inter, sans-serif; min-width: 180px;">
            <div style="flex-shrink: 0;">
              ${selectedStaffData?.photoUrl 
                ? `<img src="${getFullImageUrl(selectedStaffData.photoUrl)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #1677ff;" />`
                : `<div style="width: 44px; height: 44px; border-radius: 50%; background-color: #e6f7ff; color: #1677ff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid #91d5ff;">${(selectedStaffData?.name || 'U').charAt(0).toUpperCase()}</div>`
              }
            </div>
            <div style="display: flex; flex-direction: column; line-height: 1.3;">
              <span style="font-weight: 700; font-size: 13px; color: #1f2937;">${selectedStaffData?.name || 'Unknown'}</span>
              ${selectedStaffData?.staffId ? `<span style="font-size: 11px; color: #6b7280; font-weight: 500;">ID: ${selectedStaffData.staffId}</span>` : ''}
              <span style="font-weight: 600; font-size: 11px; color: ${markerColor}; margin-top: 2px;">${isFirst ? '🟢 Start Location' : (isLast ? '🟣 Last Known Location' : '🔵 Movement Ping')}</span>
              <span style="font-size: 11px; color: #4b5563; margin-top: 2px;">Time: ${dayjs(location.timestamp).format('hh:mm:ss A')}</span>
              <span style="font-size: 10px; color: #9ca3af;">Accuracy: ${location.accuracy || 'N/A'}m</span>
              <span style="font-size: 10px; color: #4b5563; margin-top: 2px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${formatLocationLabel(location.address, location.lat, location.lng)}">Location: ${formatLocationLabel(location.address, location.lat, location.lng)}</span>
            </div>
          </div>`
        );
        infoWindowRef.current.open({ anchor: marker, map: mapInstance });
      });
      markerIndexRef.current.set(`${location.timestamp}|${location.lat}|${location.lng}`, marker);
      markersRef.current.push(marker);
    });

    // Render Unplanned Stops (Halts) on the map
    if (insights?.halts && insights.halts.length > 0) {
      insights.halts.forEach((halt, idx) => {
        if (hasValidCoord(halt.lat, halt.lng)) {
          const haltMarker = new window.google.maps.Marker({
            position: { lat: Number(halt.lat), lng: Number(halt.lng) },
            map: mapInstance,
            label: { text: '!', color: '#fff', fontWeight: '700' },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#faad14', // Warning orange
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
              scale: 10,
            },
          });

          haltMarker.addListener('click', () => {
            if (setPanelVisible) {
              setPanelVisible(true);
            }
            if (!infoWindowRef.current) return;
            infoWindowRef.current.setContent(
              `<div style="display: flex; align-items: center; gap: 10px; padding: 4px; font-family: Inter, sans-serif; min-width: 200px;">
                <div style="flex-shrink: 0;">
                  ${selectedStaffData?.photoUrl 
                    ? `<img src="${getFullImageUrl(selectedStaffData.photoUrl)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #faad14;" />`
                    : `<div style="width: 44px; height: 44px; border-radius: 50%; background-color: #fffbe6; color: #faad14; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid #ffe58f;">${(selectedStaffData?.name || 'U').charAt(0).toUpperCase()}</div>`
                  }
                </div>
                <div style="display: flex; flex-direction: column; line-height: 1.3;">
                  <span style="font-weight: 700; font-size: 13px; color: #1f2937;">${selectedStaffData?.name || 'Unknown'}</span>
                  <span style="font-weight: 700; font-size: 11px; color: #d46b08; margin-top: 1px;">⚠️ Unplanned Stop #${idx + 1}</span>
                  <span style="font-size: 11px; color: #1f2937; font-weight: 600;">Duration: ${formatDuration(halt.durationMs)}</span>
                  <span style="font-size: 11px; color: #4b5563;">Time: ${dayjs(halt.startTs).format('hh:mm A')} - ${dayjs(halt.endTs).format('hh:mm A')}</span>
                  <span style="font-size: 10px; color: #6b7280; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${formatLocationLabel(halt.address, halt.lat, halt.lng)}">Location: ${formatLocationLabel(halt.address, halt.lat, halt.lng)}</span>
                </div>
              </div>`
            );
            infoWindowRef.current.open({ anchor: haltMarker, map: mapInstance });
          });

          markersRef.current.push(haltMarker);
        }
      });
    }

    // Punch-in/out logic using attendance table coordinates directly if available, falling back to pings
    const hasPunchInCoords = hasValidCoord(selectedDayRecord?.punchInLatitude, selectedDayRecord?.punchInLongitude);
    const punchInLoc = hasPunchInCoords
      ? { lat: Number(selectedDayRecord.punchInLatitude), lng: Number(selectedDayRecord.punchInLongitude) }
      : findNearestLocation(selectedDayRecord?.punchInTime, validLocations);

    const hasPunchOutCoords = hasValidCoord(selectedDayRecord?.punchOutLatitude, selectedDayRecord?.punchOutLongitude);
    const punchOutLoc = hasPunchOutCoords
      ? { lat: Number(selectedDayRecord.punchOutLatitude), lng: Number(selectedDayRecord.punchOutLongitude) }
      : findNearestLocation(selectedDayRecord?.punchOutTime, validLocations);

    if (punchInLoc && hasValidCoord(punchInLoc.lat, punchInLoc.lng)) {
      const inMarker = new window.google.maps.Marker({
        position: { lat: Number(punchInLoc.lat), lng: Number(punchInLoc.lng) },
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
      inMarker.addListener('click', () => {
        if (setPanelVisible) {
          setPanelVisible(true);
        }
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(
          `<div style="display: flex; align-items: center; gap: 10px; padding: 4px; font-family: Inter, sans-serif; min-width: 180px;">
            <div style="flex-shrink: 0;">
              ${selectedStaffData?.photoUrl 
                ? `<img src="${getFullImageUrl(selectedStaffData.photoUrl)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #52c41a;" />`
                : `<div style="width: 44px; height: 44px; border-radius: 50%; background-color: #f6ffed; color: #52c41a; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid #b7eb8f;">${(selectedStaffData?.name || 'U').charAt(0).toUpperCase()}</div>`
              }
            </div>
            <div style="display: flex; flex-direction: column; line-height: 1.3;">
              <span style="font-weight: 700; font-size: 13px; color: #1f2937;">${selectedStaffData?.name || 'Unknown'}</span>
              <span style="font-weight: 700; font-size: 11px; color: #52c41a; margin-top: 1px;">🟢 PUNCH-IN</span>
              <span style="font-size: 11px; color: #4b5563;">Time: ${selectedDayRecord?.punchInTime ? dayjs(selectedDayRecord.punchInTime).format('hh:mm:ss A') : 'N/A'}</span>
              <span style="font-size: 10px; color: #6b7280; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${formatLocationLabel(selectedDayRecord?.punchInAddress, punchInLoc.lat, punchInLoc.lng)}">Location: ${formatLocationLabel(selectedDayRecord?.punchInAddress, punchInLoc.lat, punchInLoc.lng)}</span>
            </div>
          </div>`
        );
        infoWindowRef.current.open({ anchor: inMarker, map: mapInstance });
      });
      markersRef.current.push(inMarker);
    }

    if (punchOutLoc && hasValidCoord(punchOutLoc.lat, punchOutLoc.lng)) {
      const outMarker = new window.google.maps.Marker({
        position: { lat: Number(punchOutLoc.lat), lng: Number(punchOutLoc.lng) },
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
      outMarker.addListener('click', () => {
        if (setPanelVisible) {
          setPanelVisible(true);
        }
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(
          `<div style="display: flex; align-items: center; gap: 10px; padding: 4px; font-family: Inter, sans-serif; min-width: 180px;">
            <div style="flex-shrink: 0;">
              ${selectedStaffData?.photoUrl 
                ? `<img src="${getFullImageUrl(selectedStaffData.photoUrl)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #ff4d4f;" />`
                : `<div style="width: 44px; height: 44px; border-radius: 50%; background-color: #fff2f0; color: #ff4d4f; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid #ffccc7;">${(selectedStaffData?.name || 'U').charAt(0).toUpperCase()}</div>`
              }
            </div>
            <div style="display: flex; flex-direction: column; line-height: 1.3;">
              <span style="font-weight: 700; font-size: 13px; color: #1f2937;">${selectedStaffData?.name || 'Unknown'}</span>
              <span style="font-weight: 700; font-size: 11px; color: #ff4d4f; margin-top: 1px;">🔴 PUNCH-OUT</span>
              <span style="font-size: 11px; color: #4b5563;">Time: ${selectedDayRecord?.punchOutTime ? dayjs(selectedDayRecord.punchOutTime).format('hh:mm:ss A') : 'N/A'}</span>
              <span style="font-size: 10px; color: #6b7280; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${formatLocationLabel(selectedDayRecord?.punchOutAddress, punchOutLoc.lat, punchOutLoc.lng)}">Location: ${formatLocationLabel(selectedDayRecord?.punchOutAddress, punchOutLoc.lat, punchOutLoc.lng)}</span>
            </div>
          </div>`
        );
        infoWindowRef.current.open({ anchor: outMarker, map: mapInstance });
      });
      markersRef.current.push(outMarker);
    }

    // Route Polyline (Uber style blue line with professional glow and directional arrows)
    if (validLocations.length > 1) {
      const bgPath = new window.google.maps.Polyline({
        path: validLocations.map((loc) => ({ lat: loc.lat, lng: loc.lng })),
        geodesic: true,
        strokeColor: '#93c5fd',
        strokeOpacity: 0.45,
        strokeWeight: 9,
        map: mapInstance,
      });

      pathRef.current = new window.google.maps.Polyline({
        path: validLocations.map((loc) => ({ lat: loc.lat, lng: loc.lng })),
        geodesic: true,
        strokeColor: '#1677ff',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        icons: [{
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2,
            strokeColor: '#ffffff',
            fillColor: '#1677ff',
            fillOpacity: 1,
            strokeWeight: 1,
          },
          offset: '10px',
          repeat: '80px'
        }],
        map: mapInstance,
      });
      
      pathRef.current.bgPath = bgPath;
    }

    // Calculate Map Bounds
    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;
    
    validLocations.forEach((loc) => {
      bounds.extend({ lat: loc.lat, lng: loc.lng });
      hasBounds = true;
    });

    if (punchInLoc && hasValidCoord(punchInLoc.lat, punchInLoc.lng)) {
      bounds.extend({ lat: Number(punchInLoc.lat), lng: Number(punchInLoc.lng) });
      hasBounds = true;
    }
    if (punchOutLoc && hasValidCoord(punchOutLoc.lat, punchOutLoc.lng)) {
      bounds.extend({ lat: Number(punchOutLoc.lat), lng: Number(punchOutLoc.lng) });
      hasBounds = true;
    }
    if (insights?.halts && insights.halts.length > 0) {
      insights.halts.forEach((halt) => {
        if (hasValidCoord(halt.lat, halt.lng)) {
          bounds.extend({ lat: Number(halt.lat), lng: Number(halt.lng) });
          hasBounds = true;
        }
      });
    }

    if (hasBounds) {
      mapInstance.fitBounds(bounds, 50);
      // Prevent excessive zoom when points are extremely close
      window.google.maps.event.addListenerOnce(mapInstance, 'idle', () => {
        if (mapInstance.getZoom() > 18) {
          mapInstance.setZoom(18);
        }
      });
    }
  }, [mapLoaded, mapInstance, locations, selectedStaffData, selectedDayRecord, insights]);

  useEffect(() => {
    if (!mapLoaded || !mapInstance || !focusedLocation) return;
    if (!hasValidCoord(focusedLocation.lat, focusedLocation.lng)) return;
    const lat = Number(focusedLocation.lat);
    const lng = Number(focusedLocation.lng);
    mapInstance.panTo({ lat, lng });
    mapInstance.setZoom(18);
    
    if (infoWindowRef.current) {
      infoWindowRef.current.setContent(
        `<div style="display: flex; align-items: center; gap: 10px; padding: 4px; font-family: Inter, sans-serif; min-width: 180px;">
          <div style="flex-shrink: 0;">
            ${selectedStaffData?.photoUrl 
              ? `<img src="${getFullImageUrl(selectedStaffData.photoUrl)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #1677ff;" />`
              : `<div style="width: 44px; height: 44px; border-radius: 50%; background-color: #e6f7ff; color: #1677ff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid #91d5ff;">${(selectedStaffData?.name || 'U').charAt(0).toUpperCase()}</div>`
            }
          </div>
          <div style="display: flex; flex-direction: column; line-height: 1.3;">
            <span style="font-weight: 700; font-size: 13px; color: #1f2937;">${selectedStaffData?.name || 'Unknown'}</span>
            ${selectedStaffData?.staffId ? `<span style="font-size: 11px; color: #6b7280; font-weight: 500;">ID: ${selectedStaffData.staffId}</span>` : ''}
            <span style="font-size: 11px; color: #4b5563; margin-top: 2px;">Time: ${dayjs(focusedLocation.timestamp).format('hh:mm:ss A')}</span>
            <span style="font-size: 10px; color: #9ca3af;">Accuracy: ${focusedLocation.accuracy || 'N/A'}m</span>
            <span style="font-size: 10px; color: #4b5563; margin-top: 2px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${formatLocationLabel(focusedLocation.address, focusedLocation.lat, focusedLocation.lng)}">Location: ${formatLocationLabel(focusedLocation.address, focusedLocation.lat, focusedLocation.lng)}</span>
          </div>
        </div>`
      );
      const markerKey = `${focusedLocation.timestamp}|${lat}|${lng}`;
      const marker = markerIndexRef.current.get(markerKey);
      if (marker) {
        infoWindowRef.current.open({ anchor: marker, map: mapInstance });
      } else {
        infoWindowRef.current.setPosition({ lat, lng });
        infoWindowRef.current.open(mapInstance);
      }
    }
  }, [mapLoaded, mapInstance, focusedLocation]);

  // Check if we have valid locations
  const validLocationCount = (locations || []).filter((loc) => hasValidCoord(loc?.lat, loc?.lng)).length;
  const hasValidLocations = validLocationCount > 0;

  const timelineItems = useMemo(() => {
    const items = [];

    // 1. Punch-in
    if (selectedDayRecord?.punchInTime) {
      items.push({
        type: 'punch-in',
        time: dayjs(selectedDayRecord.punchInTime).format('hh:mm A'),
        title: `PUNCH-IN @ ${dayjs(selectedDayRecord.punchInTime).format('hh:mm A')}`,
        rawTime: new Date(selectedDayRecord.punchInTime).getTime(),
        color: '#52c41a',
      });
    }

    // 2. Halts (stops)
    if (insights?.halts && insights.halts.length > 0) {
      insights.halts.forEach((halt) => {
        items.push({
          type: 'halt',
          time: dayjs(halt.startTs).format('hh:mm A'),
          title: 'UNPLANNED STOP',
          duration: formatDuration(halt.durationMs),
          subTitle: `${dayjs(halt.startTs).format('hh:mm A')} - ${dayjs(halt.endTs).format('hh:mm A')} (${formatDuration(halt.durationMs)})`,
          address: halt.address,
          lat: halt.lat,
          lng: halt.lng,
          rawTime: halt.startTs,
          color: '#faad14',
        });
      });
    }

    // 3. Last Known Location
    if (locations && locations.length > 0) {
      const valid = locations.filter((loc) => hasValidCoord(loc?.lat, loc?.lng));
      if (valid.length > 0) {
        const lastLoc = valid[valid.length - 1];
        items.push({
          type: 'last-seen',
          time: dayjs(lastLoc.timestamp).format('hh:mm A'),
          title: 'LAST KNOWN LOCATION',
          subTitle: dayjs(lastLoc.timestamp).format('hh:mm A'),
          address: lastLoc.address,
          lat: lastLoc.lat,
          lng: lastLoc.lng,
          rawTime: new Date(lastLoc.timestamp).getTime(),
          color: '#1890ff',
        });
      }
    }

    // 4. Punch-out
    if (selectedDayRecord?.punchOutTime) {
      items.push({
        type: 'punch-out',
        time: dayjs(selectedDayRecord.punchOutTime).format('hh:mm A'),
        title: `PUNCH-OUT @ ${dayjs(selectedDayRecord.punchOutTime).format('hh:mm A')}`,
        rawTime: new Date(selectedDayRecord.punchOutTime).getTime(),
        color: '#ff4d4f',
      });
    }

    // Sort chronologically by time
    items.sort((a, b) => a.rawTime - b.rawTime);
    return items;
  }, [selectedDayRecord, insights, locations]);

  // Show loading state while map is loading
  if (!mapLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
        <Spin size="large" tip="Loading map..." />
      </div>
    );
  }

  return (
    <div 
      id="map-fullscreen-wrapper" 
      style={{ 
        height: '100%', 
        width: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ height: '100%', minHeight: 350, borderRadius: isFullscreen ? 0 : 8 }} />

      {/* Custom Fullscreen Control Floating Button (Uber style) */}
      <Button
        type="default"
        shape="circle"
        icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
        onClick={handleFullscreenToggle}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backgroundColor: '#ffffff',
          border: '1px solid #d9d9d9',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />

      {/* Floating Box (Overlay matching Screenshot 2) */}
      {selectedStaffData && panelVisible && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '320px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          maxHeight: 'calc(100% - 100px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          {/* Profile Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            color: '#ffffff',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Avatar 
              size={44} 
              src={selectedStaffData?.photoUrl ? getFullImageUrl(selectedStaffData.photoUrl) : undefined}
              icon={!selectedStaffData?.photoUrl ? <UserOutlined /> : undefined}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', marginRight: '12px', border: '2px solid rgba(255,255,255,0.4)', objectFit: 'cover' }}
            >
              {!selectedStaffData?.photoUrl && selectedStaffData?.name ? selectedStaffData.name.charAt(0).toUpperCase() : ''}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.3px', textTransform: 'capitalize' }}>
                {selectedStaffData.name || 'Unknown Staff'} {selectedStaffData.staffId ? `(ID: ${selectedStaffData.staffId})` : ''}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '2px', fontWeight: 500 }}>
                {selectedDayRecord?.punchInTime 
                  ? `Punched-in @ ${dayjs(selectedDayRecord.punchInTime).format('hh:mm A')}`
                  : 'Not Punched-in'
                }
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PhoneOutlined style={{ fontSize: '12px', color: '#fff' }} />
              </div>
              <div 
                onClick={() => setPanelVisible(false)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.25s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.35)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              >
                <CloseOutlined style={{ fontSize: '12px', color: '#fff' }} />
              </div>
            </div>
          </div>

          {/* Quick Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            padding: '10px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #f1f5f9'
          }}>
            {/* Metric 1 */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Accuracy</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {insights?.avgAccuracy ? `${insights.avgAccuracy.toFixed(0)}m` : 'N/A'}
              </span>
            </div>

            {/* Metric 2 */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Visits</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {selectedDayRecord?.visitCount || 0}
              </span>
            </div>

            {/* Metric 3 */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Distance</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap' }}>
                {insights?.distanceKm ? `${insights.distanceKm.toFixed(1)} km` : '0 km'}
              </span>
            </div>

            {/* Metric 4 */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Span</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {insights?.span || '0m'}
              </span>
            </div>
          </div>

          {/* Timeline Title Header */}
          <div style={{
            padding: '12px 16px 6px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timeline</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
              {dayjs(selectedDayRecord?.date || selectedDate).format('DD MMM YYYY')}
            </span>
          </div>

          {/* Scrollable Timeline List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 16px 4px 16px',
            backgroundColor: '#ffffff'
          }}>
            {timelineItems.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No timeline events recorded" style={{ margin: '20px 0' }} />
            ) : (
              <Timeline mode="left" style={{ marginLeft: '4px' }}>
                {timelineItems.map((item, idx) => (
                  <Timeline.Item
                    key={idx}
                    color={item.color}
                    dot={
                      item.type === 'punch-in' ? <ClockCircleOutlined style={{ fontSize: '13px', color: '#52c41a' }} /> :
                      item.type === 'punch-out' ? <ClockCircleOutlined style={{ fontSize: '13px', color: '#ff4d4f' }} /> :
                      item.type === 'halt' ? <EnvironmentOutlined style={{ fontSize: '13px', color: '#faad14' }} /> :
                      <EnvironmentOutlined style={{ fontSize: '13px', color: '#1890ff' }} />
                    }
                    style={{ paddingBottom: '16px' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b' }}>
                        {item.title}
                      </span>
                      {item.subTitle && (
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                          {item.subTitle}
                        </span>
                      )}

                      {/* Interactive Geofocus Link */}
                      {(item.type === 'halt' || item.type === 'last-seen') && (
                        <div style={{ marginTop: '4px' }}>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              if (setFocusedLocation) {
                                setFocusedLocation({
                                  lat: item.lat,
                                  lng: item.lng,
                                  timestamp: item.rawTime,
                                  accuracy: insights?.avgAccuracy
                                });
                              }
                            }}
                            style={{ padding: 0, height: 'auto', fontSize: '11px', color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
                          >
                            <EnvironmentOutlined style={{ marginRight: '4px' }} /> Click here to Show Address
                          </Button>
                          {item.address && (
                            <div style={{
                              fontSize: '10px',
                              color: '#475569',
                              marginTop: '3px',
                              backgroundColor: '#f8fafc',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px dashed #e2e8f0',
                              lineHeight: '1.4'
                            }}>
                              {item.address}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        </div>
      )}

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

const Geolocation = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [selectedStaffTimeline, setSelectedStaffTimeline] = useState([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [focusedLocation, setFocusedLocation] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isMapFullWidth, setIsMapFullWidth] = useState(false);
  const [mapStyle, setMapStyle] = useState('standard');
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
      setPanelVisible(true);
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
    const haltTimeThresholdMs = 5 * 60 * 1000;
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
      title: 'Visits',
      dataIndex: 'visitCount',
      key: 'visitCount',
      render: (count) => (
        <Tag color="cyan">{count || 0} visits</Tag>
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



  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Geolocation Tracking" 
        />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          {subscriptionInfo && !(!!subscriptionInfo.geolocationEnabled || !!subscriptionInfo.plan?.geolocationEnabled) ? (
            <Card className="sales-content-card" style={{ textAlign: 'center', padding: '50px' }}>
              <Empty
                image={<EnvironmentOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />}
                description={
                  <Space direction="vertical">
                    <Text strong style={{ fontSize: '18px' }}>Geolocation Not Enabled</Text>
                    <Text type="secondary">This module is not included in your current subscription plan.</Text>
                    <Button type="primary" shape="round" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                  </Space>
                }
              />
            </Card>
          ) : (
            <>
              <Card
                className="sales-content-card"
                bodyStyle={{ padding: '24px' }}
              >
                <div className="sales-filter-row" style={{ marginBottom: 24, display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Select & Search Staff</label>
                    <Select
                      showSearch
                      placeholder="Search and select staff..."
                      optionFilterProp="label"
                      value={selectedStaff}
                      onChange={(value) => setSelectedStaff(value)}
                      style={{ width: '100%' }}
                      size="large"
                      allowClear
                      options={staffList.map(staff => ({
                        value: staff.id,
                        label: `${staff.name} (${staff.phone || ''})`
                      }))}
                    />
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Select Date</label>
                    <DatePicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                      style={{ width: '100%', height: 40 }}
                      size="large"
                    />
                  </div>
                  <div style={{ flex: '0 0 140px' }}>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={fetchLocationData}
                      loading={loading}
                      shape="round"
                      style={{ width: '100%', height: 40, fontWeight: 600 }}
                      size="large"
                    >
                      Refresh
                    </Button>
                  </div>
                  <div style={{ flex: '1 1 220px' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#475569' }}>Live Tracking</label>
                    <Space style={{ padding: '0 12px', border: '1px solid #d9d9d9', borderRadius: '20px', height: 40, width: '100%', backgroundColor: '#fff', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Switch
                          checked={autoRefresh}
                          onChange={setAutoRefresh}
                          checkedChildren="ON"
                          unCheckedChildren="OFF"
                        />
                        {autoRefresh && (
                          <Tag color="red" style={{ animation: 'pulse 1.5s infinite', margin: 0, fontWeight: 600 }}>
                            ● LIVE
                          </Tag>
                        )}
                      </div>
                      {lastUpdated && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {dayjs(lastUpdated).format('HH:mm:ss')}
                        </Text>
                      )}
                    </Space>
                  </div>
                </div>

                {selectedStaff ? (
                  <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={4} style={{ flex: 1 }}>
                      <Card className="sales-content-card" bodyStyle={{ padding: '16px' }} style={{ border: '1px solid #e6f7ff', background: 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)', boxShadow: 'none' }}>
                        <Statistic 
                          title={<span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total Pings</span>} 
                          value={trackingInsights.totalPings} 
                          valueStyle={{ color: '#1677ff', fontWeight: '700', fontSize: '22px', marginTop: '4px' }}
                          prefix={<EnvironmentOutlined style={{ color: '#1677ff', marginRight: '4px' }} />} 
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={4} style={{ flex: 1 }}>
                      <Card className="sales-content-card" bodyStyle={{ padding: '16px' }} style={{ border: '1px solid #e6ffd8', background: 'linear-gradient(180deg, #fafdf7 0%, #f0fbeb 100%)', boxShadow: 'none' }}>
                        <Statistic 
                          title={<span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Valid GPS</span>} 
                          value={trackingInsights.validPings} 
                          valueStyle={{ color: '#52c41a', fontWeight: '700', fontSize: '22px', marginTop: '4px' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={4} style={{ flex: 1 }}>
                      <Card className="sales-content-card" bodyStyle={{ padding: '16px' }} style={{ border: '1px solid #fff7e6', background: 'linear-gradient(180deg, #fffcf6 0%, #fffbe6 100%)', boxShadow: 'none' }}>
                        <Statistic 
                          title={<span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Distance</span>} 
                          value={trackingInsights.distanceKm} 
                          precision={2}
                          suffix=" km"
                          valueStyle={{ color: '#fa8c16', fontWeight: '700', fontSize: '22px', marginTop: '4px' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={4} style={{ flex: 1 }}>
                      <Card className="sales-content-card" bodyStyle={{ padding: '16px' }} style={{ border: '1px solid #f9f0ff', background: 'linear-gradient(180deg, #fdfaff 0%, #f6edfc 100%)', boxShadow: 'none' }}>
                        <Statistic 
                          title={<span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Tracking Span</span>} 
                          value={trackingInsights.span} 
                          valueStyle={{ color: '#722ed1', fontWeight: '700', fontSize: '20px', marginTop: '4px' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={4} style={{ flex: 1 }}>
                      <Card className="sales-content-card" bodyStyle={{ padding: '16px' }} style={{ border: '1px solid #fff0f6', background: 'linear-gradient(180deg, #fffafc 0%, #fff0f5 100%)', boxShadow: 'none' }}>
                        <Statistic 
                          title={<span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Halts</span>} 
                          value={trackingInsights.haltCount} 
                          suffix={trackingInsights.haltTotalMs ? ` (${formatDuration(trackingInsights.haltTotalMs)})` : ''}
                          valueStyle={{ color: '#eb2f96', fontWeight: '700', fontSize: '18px', marginTop: '4px' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                ) : null}

                <Row gutter={24} style={{ marginTop: 24 }}>
                  {/* Left Column - Staff List Table */}
                  {!isMapFullWidth ? (
                    <Col span={12}>
                      <Card
                        className="sales-content-card"
                        title={
                          <Title level={5} style={{ marginBottom: 0, fontWeight: 600 }}>
                            <UserOutlined style={{ marginRight: 8, color: '#1677ff' }} /> Organization Staff
                          </Title>
                        }
                        style={{
                          height: '600px',
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
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Avatar 
                                    size={36} 
                                    src={record.photoUrl ? getFullImageUrl(record.photoUrl) : undefined}
                                    icon={!record.photoUrl ? <UserOutlined /> : undefined}
                                    style={{ 
                                      backgroundColor: '#e6f7ff', 
                                      color: '#1677ff',
                                      marginRight: '12px',
                                      fontWeight: '700',
                                      boxShadow: '0 2px 6px rgba(22, 119, 255, 0.06)',
                                      objectFit: 'cover'
                                    }}
                                  >
                                    {!record.photoUrl && text ? text.charAt(0).toUpperCase() : ''}
                                  </Avatar>
                                  <span style={{ fontWeight: '600', color: '#262626' }}>{text}</span>
                                </div>
                              ),
                            },
                            {
                              title: 'Phone',
                              dataIndex: 'phone',
                              key: 'phone',
                              render: (phone) => <span style={{ color: '#595959', fontWeight: '500' }}>{phone || '-'}</span>
                            },
                            {
                              title: 'Action',
                              key: 'action',
                              render: (_, record) => (
                                <Space size={6}>
                                  <Button
                                    type={selectedStaff === record.id ? 'primary' : 'default'}
                                    size="small"
                                    shape="round"
                                    icon={<EnvironmentOutlined />}
                                    onClick={() => setSelectedStaff(record.id)}
                                    style={selectedStaff === record.id ? { 
                                      backgroundColor: '#52c41a', 
                                      borderColor: '#52c41a' 
                                    } : {}}
                                  >
                                    {selectedStaff === record.id ? 'Active' : 'Map'}
                                  </Button>
                                  <Button
                                    size="small"
                                    shape="round"
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
                      className="sales-content-card"
                      title={
                        <Title level={5} style={{ marginBottom: 0, fontWeight: 600 }}>
                          <EnvironmentOutlined style={{ marginRight: 8, color: '#1677ff' }} /> Location Tracking Map
                        </Title>
                      }
                      extra={(
                        <Space size="middle">
                          {selectedStaff && (
                            <span style={{ fontSize: '13px', color: '#595959', fontWeight: '500' }}>
                              {selectedStaffData?.name || 'Unknown'} | {selectedDate.format('DD MMM YYYY')}
                            </span>
                          )}
                          <Select
                            value={mapStyle}
                            onChange={setMapStyle}
                            size="small"
                            style={{ borderRadius: '20px', width: 130 }}
                          >
                            <Option value="standard">Standard Map</Option>
                            <Option value="satellite">Satellite Map</Option>
                            <Option value="minimal">Minimal Map</Option>
                          </Select>
                          <Button
                            size="small"
                            shape="round"
                            icon={isMapFullWidth ? <CompressOutlined /> : <ExpandOutlined />}
                            onClick={() => setIsMapFullWidth((prev) => !prev)}
                          >
                            {isMapFullWidth ? 'Normal View' : 'Full Width'}
                          </Button>
                        </Space>
                      )}
                      style={{
                        height: isMapFullWidth ? '700px' : '600px',
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
                          setFocusedLocation={setFocusedLocation}
                          panelVisible={panelVisible}
                          setPanelVisible={setPanelVisible}
                          mapStyle={mapStyle}
                          selectedDate={selectedDate}
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
                          <EnvironmentOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#bfbfbf' }} />
                          <Text type="secondary" style={{ fontWeight: '500' }}>Select a staff member to view their location tracking</Text>
                        </div>
                      )}
                    </Card>

                    {selectedStaff ? (
                      <Card
                        className="sales-content-card"
                        title={
                          <span style={{ fontWeight: 600, color: '#262626' }}>
                            <HistoryOutlined style={{ marginRight: 6, color: '#1677ff' }} /> Recent Location Timeline
                          </span>
                        }
                        size="small"
                        style={{
                          marginTop: 16,
                        }}
                        extra={(
                          <Button 
                            size="small" 
                            shape="round" 
                            icon={<HistoryOutlined />} 
                            onClick={() => handleViewTimeline(selectedStaffData || { id: selectedStaff, name: selectedStaffData?.name || 'Staff' })}
                          >
                            View Full
                          </Button>
                        )}
                      >
                        {trackingInsights.haltCount > 0 ? (
                          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
                            <Text strong style={{ color: '#ad6800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <EnvironmentOutlined /> Halt detected: {trackingInsights.haltCount} ({formatDuration(trackingInsights.haltTotalMs)})
                            </Text>
                            <div style={{ marginTop: 6 }}>
                              {trackingInsights.halts.slice(-2).map((h, idx) => (
                                <Text key={`${h.startTs}-${idx}`} type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 2 }}>
                                  ● {dayjs(h.startTs).format('hh:mm A')} - {dayjs(h.endTs).format('hh:mm A')} ({formatDuration(h.durationMs)}) | {formatLocationLabel(h.address, h.lat, h.lng)}
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
                              <List.Item style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                                <Button
                                  type="text"
                                  onClick={() => setFocusedLocation({ ...item, _focusNonce: Date.now() })}
                                  style={{ width: '100%', height: 'auto', textAlign: 'left', padding: '6px 8px', borderRadius: '6px', transition: 'background 0.2s' }}
                                >
                                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                      <EnvironmentOutlined style={{ color: '#1677ff', marginTop: '3px' }} />
                                      <span style={{ fontWeight: '600', color: '#262626' }}>
                                        {dayjs(item.timestamp).format('hh:mm A')} - {formatLocationLabel(item.address, item.lat, item.lng)}
                                      </span>
                                    </div>
                                    <Space split={<span style={{ color: '#bfbfbf' }}>|</span>} style={{ marginLeft: '18px' }}>
                                      <Text type="secondary" style={{ fontSize: '11px' }}>Accuracy: {item.accuracy ? `${item.accuracy}m` : 'N/A'}</Text>
                                      <Text type="secondary" style={{ fontSize: '11px' }}>
                                        Coords: {formatCoord(item.lat)}, {formatCoord(item.lng)}
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

