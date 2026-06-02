import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layout, Card, Button, Modal, Form, Input, Space, Table, Switch, InputNumber, message, Popconfirm, Typography, Select, DatePicker, Dropdown, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
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

  useEffect(() => { init(); return () => { }; }, []);
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
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
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
            </div>
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
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [assignedCounts, setAssignedCounts] = useState({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTpl, setAssignTpl] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedListTpl, setAssignedListTpl] = useState(null);
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);
  const [assignedRows, setAssignedRows] = useState([]);
  const [assignForm] = Form.useForm();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/geofence/templates');
      const list = res?.data?.data || [];
      setItems(list);
      await loadAssignedCounts(list);
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
    await Promise.all([loadStaff(), loadTemplateAssignments(row.id)]);
  };

  const loadTemplateAssignments = async (templateId) => {
    try {
      const res = await api.get(`/admin/geofence/templates/${templateId}/assignments`);
      setAssignedRows(res?.data?.assignments || []);
    } catch (_) {
      setAssignedRows([]);
      message.error('Failed to load assigned staff');
    }
  };

  const loadAssignedCounts = async (templates) => {
    try {
      const rows = Array.isArray(templates) ? templates : [];
      const pairs = await Promise.all(rows.map(async (tpl) => {
        try {
          const res = await api.get(`/admin/geofence/templates/${tpl.id}/assignments`);
          const count = Array.isArray(res?.data?.assignments) ? res.data.assignments.length : 0;
          return [tpl.id, count];
        } catch (_) {
          return [tpl.id, 0];
        }
      }));
      setAssignedCounts(Object.fromEntries(pairs));
    } catch (_) {
      setAssignedCounts({});
    }
  };

  const doAssign = async () => {
    try {
      const v = await assignForm.validateFields();
      const ids = v.userIds || [];
      if (!ids.length) { message.warning('Select at least one staff'); return; }
      const alreadyAssignedUserIds = new Set(
        (assignedRows || [])
          .filter((r) => r?.active !== false)
          .map((r) => r?.user?.id)
          .filter(Boolean)
      );
      const duplicateIds = ids.filter((id) => alreadyAssignedUserIds.has(id));
      if (duplicateIds.length) {
        message.warning('Some selected staff are already assigned to this template');
        return;
      }
      const eff = v.effectiveFrom ? v.effectiveFrom.format('YYYY-MM-DD') : null;
      await Promise.all(ids.map((id) => api.post('/admin/geofence/assign', { userId: id, geofenceTemplateId: assignTpl.id, effectiveFrom: eff })));
      message.success('Assigned successfully');
      assignForm.resetFields(['userIds']);
      await loadTemplateAssignments(assignTpl.id);
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Assignment failed');
    }
  };

  const unassignStaff = async (assignmentId) => {
    try {
      await api.delete(`/admin/geofence/assign/${assignmentId}`);
      message.success('Staff unassigned');
      if (assignTpl?.id) await loadTemplateAssignments(assignTpl.id);
      if (assignedListTpl?.id) await openAssignedList(assignedListTpl, true);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to unassign staff');
    }
  };

  const openAssignedList = async (row, keepOpen = false) => {
    try {
      setAssignedListTpl(row);
      if (!keepOpen) setAssignedListOpen(true);
      setAssignedListLoading(true);
      const res = await api.get(`/admin/geofence/templates/${row.id}/assignments`);
      setAssignedListRows(res?.data?.assignments || []);
    } catch (_) {
      setAssignedListRows([]);
      message.error('Failed to load assigned staff');
    } finally {
      setAssignedListLoading(false);
    }
  };

  const columns = useMemo(() => ([
    { title: 'Template Name', dataIndex: 'name', key: 'name', render: (t) => <strong style={{ color: '#1e293b' }}>{t}</strong> },
    { 
      title: 'Active Status', 
      dataIndex: 'active', 
      key: 'active',
      render: (v) => {
        const active = v !== false;
        const color = active ? '#52c41a' : '#ff4d4f';
        return (
          <span style={{ 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '11px', 
              fontWeight: '600', 
              color: color, 
              backgroundColor: `${color}10`, 
              border: `1px solid ${color}30` 
          }}>
            {active ? 'Yes' : 'No'}
          </span>
        );
      }
    },
    { 
      title: 'Configured Sites', 
      dataIndex: 'sites', 
      key: 'sites',
      render: (sites) => (
        <span style={{ fontWeight: '600', color: '#475569' }}>
          {Array.isArray(sites) ? sites.length : 0} Sites
        </span>
      )
    },
    {
      title: 'Assigned Staff',
      key: 'assignedStaff',
      render: (_, row) => (
        <span
          onClick={() => openAssignedList(row)}
          style={{ 
            cursor: 'pointer', 
            userSelect: 'none', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            fontWeight: '700', 
            color: '#1677ff', 
            backgroundColor: '#e6f7ff', 
            border: '1px solid #91d5ff'
          }}
        >
          {assignedCounts[row.id] || 0} Staff
        </span>
      ),
    },
    {
      title: 'Actions', 
      key: 'a', 
      align: 'right',
      render: (_, row) => {
        const menuItems = [
          { key: 'edit', label: 'Edit Template', icon: <EditOutlined />, onClick: () => openEdit(row) },
          { key: 'assign', label: 'Assign Staff', icon: <PlusOutlined />, onClick: () => openAssign(row) },
          {
            key: 'delete', 
            icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
            label: (
              <Popconfirm title="Delete template?" onConfirm={() => remove(row)}>
                <span style={{ color: '#ff4d4f' }}>Delete Template</span>
              </Popconfirm>
            )
          },
        ];
        return (
          <Dropdown
            menu={{
              items: menuItems.map(it => ({ key: it.key, label: it.label, icon: it.icon, onClick: it.onClick }))
            }}
            trigger={["click"]}
            dropdownStyle={{ borderRadius: '8px' }}
          >
            <Button shape="circle" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    },
  ]), [assignedCounts]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Geofence Settings" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Navigation & Toolbar Header */}
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

            {/* Main Content Table Card */}
            <Card 
              className="sales-content-card"
              title={<span style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>Geofence Templates Registry</span>}
              extra={
                <Button 
                  type="primary" 
                  shape="round" 
                  icon={<PlusOutlined />} 
                  onClick={openCreate}
                  style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                >
                  New Template
                </Button>
              }
              bodyStyle={{ padding: '24px' }}
            >
              <Table 
                rowKey={(r) => r.id} 
                loading={loading} 
                dataSource={items} 
                columns={columns} 
                pagination={false} 
                className="sales-table"
                size="middle"
              />
            </Card>
          </Space>
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

      <Modal
        open={assignOpen}
        title={`Assign Staff${assignTpl ? ` - ${assignTpl.name}` : ''}`}
        onCancel={() => setAssignOpen(false)}
        onOk={doAssign}
        okText="Assign"
        width={1080}
      >
        <Form form={assignForm} layout="vertical">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Button 
              type="link" 
              size="small" 
              onClick={() => {
                const currentSelection = assignForm.getFieldValue('userIds') || [];
                if (currentSelection.length === staffOptions.length) {
                  assignForm.setFieldsValue({ userIds: [] });
                } else {
                  assignForm.setFieldsValue({ userIds: staffOptions.map(o => o.value) });
                }
              }}
            >
              Select All
            </Button>
          </div>
          <Form.Item name="userIds" label="Select Staff" rules={[{ required: true, message: 'Select staff' }]}>
            <Select mode="multiple" placeholder="Search and select staff" options={staffOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Effective From">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={assignedListOpen}
        title={`Assigned Staff${assignedListTpl ? ` - ${assignedListTpl.name}` : ''}`}
        onCancel={() => setAssignedListOpen(false)}
        footer={null}
        width={1080}
      >
        <Table
          rowKey={(r) => r.id}
          loading={assignedListLoading}
          dataSource={assignedListRows}
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Name', render: (_, r) => r.user?.profile?.name || '-' },
            { title: 'Staff ID', render: (_, r) => r.user?.profile?.staffId || '-' },
            { title: 'Phone', render: (_, r) => r.user?.phone || '-' },
            { title: 'Dept', render: (_, r) => r.user?.profile?.department || '-' },
            { title: 'Designation', render: (_, r) => r.user?.profile?.designation || '-' },
            { title: 'Effective From', dataIndex: 'effectiveFrom', render: (v) => v || '-' },
            {
              title: 'Action',
              key: 'action',
              render: (_, r) => (
                <Popconfirm title="Unassign this staff?" onConfirm={() => unassignStaff(r.id)}>
                  <Button danger size="small">Unassign</Button>
                </Popconfirm>
              )
            },
          ]}
        />
      </Modal>
    </Layout>
  );
}
