import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layout, Card, Button, Modal, Form, Input, Space, Table, Switch, InputNumber, message, Popconfirm, Typography, Select, DatePicker, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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

const MapPreview = ({ site, onChange }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const containerRef = useRef(null);

  const init = async () => {
    await ensureGoogleMaps();
    if (!containerRef.current || mapRef.current) return;
    const center = { lat: Number(site.latitude) || 28.6139, lng: Number(site.longitude) || 77.2090 };
    const map = new window.google.maps.Map(containerRef.current, { center, zoom: 15 });
    const marker = new window.google.maps.Marker({ position: center, map, draggable: true });
    const circle = new window.google.maps.Circle({ map, center, radius: Number(site.radiusMeters) || 100, strokeColor: '#125EC9', fillColor: '#125EC9', fillOpacity: 0.15 });
    marker.addListener('drag', () => {
      const pos = marker.getPosition();
      circle.setCenter(pos);
    });
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      onChange && onChange({ ...site, latitude: pos.lat(), longitude: pos.lng() });
    });
    mapRef.current = map; markerRef.current = marker; circleRef.current = circle;
  };

  useEffect(() => { init(); return () => {}; }, []);
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const c = { lat: Number(site.latitude) || 28.6139, lng: Number(site.longitude) || 77.2090 };
    markerRef.current && markerRef.current.setPosition(c);
    circleRef.current && circleRef.current.setCenter(c);
    if (Number(site.radiusMeters)) circleRef.current && circleRef.current.setRadius(Number(site.radiusMeters));
    mapRef.current.setCenter(c);
  }, [site.latitude, site.longitude, site.radiusMeters]);

  return <div ref={containerRef} style={{ width: '100%', height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }} />;
};

const SitesEditor = ({ value = [], onChange }) => {
  const [rows, setRows] = useState(() => (Array.isArray(value) ? value.map((r, i) => ({ key: r.id || i + 1, ...r })) : []));
  useEffect(() => { setRows(Array.isArray(value) ? value.map((r, i) => ({ key: r.id || i + 1, ...r })) : []); }, [value]);

  const update = (list) => { setRows(list); onChange && onChange(list.map(({ key, ...rest }) => rest)); };

  // Attach Google Places Autocomplete to each address input
  const attached = useRef(new Set());
  useEffect(() => {
    (async () => {
      await ensureGoogleMaps();
      rows.forEach((r) => {
        const id = `addr-${r.key}`;
        if (attached.current.has(id)) return;
        const el = document.getElementById(id);
        if (el && window.google?.maps?.places) {
          try {
            const ac = new window.google.maps.places.Autocomplete(el, { fields: ['formatted_address', 'geometry'] });
            ac.addListener('place_changed', () => {
              const place = ac.getPlace();
              const loc = place?.geometry?.location;
              if (loc) {
                update(rows.map(x => x.key === r.key ? { ...x, address: place.formatted_address || el.value, latitude: loc.lat(), longitude: loc.lng() } : x));
              }
            });
            attached.current.add(id);
          } catch (_) { /* ignore */ }
        }
      });
    })();
  }, [rows]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {rows.map((r, idx) => (
        <Card key={r.key} size="small" title={`Site ${idx + 1}`} extra={
          <Button danger type="link" onClick={() => update(rows.filter(x => x.key !== r.key))}>Remove</Button>
        }>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input placeholder="Site name" value={r.name} onChange={(e) => update(rows.map(x => x.key === r.key ? { ...x, name: e.target.value } : x))} />
            <Space align="start" style={{ width: '100%' }}>
              <Input id={`addr-${r.key}`} placeholder="Address (required)" style={{ flex: 1 }} value={r.address} onChange={(e) => update(rows.map(x => x.key === r.key ? { ...x, address: e.target.value } : x))} />
              <Button onClick={async () => {
                try {
                  await ensureGoogleMaps();
                  const q = (r.address || '').trim();
                  if (!q) { message.warning('Enter address first'); return; }
                  const geocoder = new window.google.maps.Geocoder();
                  geocoder.geocode({ address: q }, (results, status) => {
                    if (status === 'OK' && results && results.length) {
                      const loc = results[0].geometry.location;
                      update(rows.map(x => x.key === r.key ? { ...x, latitude: loc.lat(), longitude: loc.lng(), address: results[0].formatted_address } : x));
                      message.success('Location found');
                    } else { message.error('Address not found'); }
                  });
                } catch (_) { message.error('Geocoding failed'); }
              }}>Locate</Button>
            </Space>
            <Space wrap>
              <InputNumber placeholder="Latitude" style={{ width: 160 }} value={r.latitude} onChange={(v) => update(rows.map(x => x.key === r.key ? { ...x, latitude: v } : x))} />
              <InputNumber placeholder="Longitude" style={{ width: 160 }} value={r.longitude} onChange={(v) => update(rows.map(x => x.key === r.key ? { ...x, longitude: v } : x))} />
              <InputNumber placeholder="Radius (m)" style={{ width: 160 }} value={r.radiusMeters} onChange={(v) => update(rows.map(x => x.key === r.key ? { ...x, radiusMeters: v } : x))} />
              <span>
                Active <Switch checked={r.active !== false} onChange={(v) => update(rows.map(x => x.key === r.key ? { ...x, active: v } : x))} />
              </span>
            </Space>
            <MapPreview site={r} onChange={(nv) => update(rows.map(x => x.key === r.key ? { ...x, ...nv } : x))} />
          </Space>
        </Card>
      ))}
      <Button icon={<PlusOutlined />} onClick={() => update([...
        rows,
        { key: Date.now(), name: '', address: '', latitude: null, longitude: null, radiusMeters: 100, active: true },
      ])}>Add Site</Button>
    </Space>
  );
};

export default function GeofenceSettings() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTpl, setAssignTpl] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [assignForm] = Form.useForm();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/geofence/templates');
      setItems(res?.data?.data || []);
    } catch (e) {
      message.error('Failed to load geofence templates');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const loadStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      const list = res?.data?.staff || res?.data?.data || [];
      const opts = list.map((s) => ({ label: s.profile?.name || s.name || s.phone || `#${s.id}`, value: s.id }));
      setStaffOptions(opts);
    } catch (_) {
      setStaffOptions([]);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ name: '', approvalRequired: false, active: true, sites: [] });
    setEditorOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      approvalRequired: !!row.approvalRequired,
      active: row.active !== false,
      sites: (row.sites || []).map(s => ({ id: s.id, name: s.name, address: s.address, latitude: Number(s.latitude), longitude: Number(s.longitude), radiusMeters: Number(s.radiusMeters), active: s.active !== false })),
    });
    setEditorOpen(true);
  };

  const save = async () => {
    try {
      const vals = await form.validateFields();
      const sites = (vals.sites || []).map(s => ({
        ...s,
        address: (s.address || '').trim(),
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        radiusMeters: Number(s.radiusMeters),
      }));
      // validations: address, lat, lng, radius
      for (const [i, s] of sites.entries()) {
        if (!s.address) throw { errorFields: [{ name: ['sites', i, 'address'], errors: ['Address is required'] }] };
        if (!Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)) throw { errorFields: [{ name: ['sites', i, 'latitude'], errors: ['Lat/Lng required (use Locate)'] }] };
        if (!Number.isFinite(s.radiusMeters) || s.radiusMeters <= 0) throw { errorFields: [{ name: ['sites', i, 'radiusMeters'], errors: ['Radius must be > 0'] }] };
      }
      const payload = { ...vals, sites };
      if (!editing) {
        await api.post('/admin/geofence/templates', payload);
        message.success('Template created');
      } else {
        await api.put(`/admin/geofence/templates/${editing.id}`, payload);
        message.success('Template updated');
      }
      setEditorOpen(false);
      load();
    } catch (e) {
      if (e?.errorFields) return; // validation
      message.error(e?.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (row) => {
    try {
      await api.delete(`/admin/geofence/templates/${row.id}`);
      message.success('Template deleted');
      load();
    } catch (e) { message.error('Delete failed'); }
  };

  const openAssign = async (row) => {
    setAssignTpl(row);
    setAssignOpen(true);
    assignForm.resetFields();
    await loadStaff();
  };

  const doAssign = async () => {
    try {
      const v = await assignForm.validateFields();
      const ids = v.userIds || [];
      if (!ids.length) { message.warning('Select at least one staff'); return; }
      const eff = v.effectiveFrom ? v.effectiveFrom.format('YYYY-MM-DD') : null;
      await Promise.all(ids.map((id) => api.post('/admin/geofence/assign', { userId: id, geofenceTemplateId: assignTpl.id, effectiveFrom: eff })));
      message.success('Assigned successfully');
      setAssignOpen(false);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Assignment failed');
    }
  };

  const columns = useMemo(() => ([
    { title: 'Name', dataIndex: 'name' },
    { title: 'Active', dataIndex: 'active', render: (v) => v !== false ? 'Yes' : 'No' },
    { title: 'Sites', dataIndex: 'sites', render: (sites) => Array.isArray(sites) ? sites.length : 0 },
    { title: 'Actions', key: 'a', render: (_, row) => {
      const menuItems = [
        { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => openEdit(row) },
        { key: 'assign', label: 'Assign Staff', onClick: () => openAssign(row) },
        { key: 'delete', label: (
          <Popconfirm title="Delete template?" onConfirm={() => remove(row)}>
            <span style={{ color: '#ff4d4f' }}>Delete</span>
          </Popconfirm>
        ) },
      ];
      return (
        <Dropdown
          menu={{
            items: menuItems.map(it => ({ key: it.key, label: it.label, icon: it.icon, onClick: it.onClick }))
          }}
          trigger={["click"]}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      );
    } },
  ]), []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settings')}>Back to Settings</Button>
            <Title level={4} style={{ margin: 0 }}>Attendance Geofence Settings</Title>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card title="Geofence Templates" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Template</Button>}>
            <Table rowKey={(r) => r.id} loading={loading} dataSource={items} columns={columns} pagination={false} />
          </Card>
        </Content>
      </Layout>

      <Modal open={editorOpen} onCancel={() => setEditorOpen(false)} onOk={save} title={editing ? 'Edit Geofence Template' : 'New Geofence Template'} width={800} okText="Save">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Template Name" rules={[{ required: true, message: 'Enter template name' }]}>
            <Input placeholder="e.g. HQ Geofence" />
          </Form.Item>
          <Space>
            <Form.Item name="approvalRequired" label="Approval Required" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
            <Form.Item name="active" label="Active" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="sites" label="Sites (lat/lng/radius)">
            <SitesEditor />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={assignOpen} title={`Assign Staff${assignTpl ? ` - ${assignTpl.name}` : ''}`} onCancel={() => setAssignOpen(false)} onOk={doAssign} okText="Assign">
        <Form form={assignForm} layout="vertical">
          <Form.Item name="userIds" label="Select Staff" rules={[{ required: true, message: 'Select staff' }]}>
            <Select mode="multiple" placeholder="Search and select staff" options={staffOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Effective From">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
