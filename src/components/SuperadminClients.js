import React, { useEffect, useState } from 'react';
import { Layout, Typography, Menu, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, DatePicker, Tag, Checkbox } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SuperadminClients() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mode, setMode] = useState('list'); // 'create' | 'edit' | 'list'
  const [plans, setPlans] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm] = Form.useForm();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form] = Form.useForm();
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
  const [selectedClientPlan, setSelectedClientPlan] = useState({});
  const [staffCounts, setStaffCounts] = useState({});
  const [staffLimitOpen, setStaffLimitOpen] = useState(false);
  const [staffLimitForm] = Form.useForm();
  const [selectedClientForLimit, setSelectedClientForLimit] = useState(null);
  const [geoStaffLimitOpen, setGeoStaffLimitOpen] = useState(false);
  const [geoStaffLimitForm] = Form.useForm();
  const [selectedClientForGeoLimit, setSelectedClientForGeoLimit] = useState(null);
  const [geoStaffCounts, setGeoStaffCounts] = useState({});
  const [searchText, setSearchText] = useState('');
  const formInitials = editing ? {
    name: editing.name || '',
    phone: editing.phone || '',
    status: editing.status,
    businessEmail: editing.businessEmail || '',
    state: editing.state || '',
    city: editing.city || '',
    channelPartnerId: editing.channelPartnerId || '',
    roleDescription: editing.roleDescription || '',
    employeeCount: editing.employeeCount,
    contactPersonName: editing.contactPersonName || '',
    address: editing.address || '',
    birthDate: editing.birthDate ? dayjs(editing.birthDate) : null,
    anniversaryDate: editing.anniversaryDate ? dayjs(editing.anniversaryDate) : null,
    gstNumber: editing.gstNumber || '',
  } : {};

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/clients');
      setRows(res.data?.clients || []);
      // Load staff counts for all clients
      await loadStaffCounts(res.data?.clients || []);
    } catch (e) {
      message.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffCounts = async (clients) => {
    try {
      const staffCounts = {};
      const geoStaffCounts = {};

      for (const client of clients) {
        try {
          // Get regular staff count
          const staffRes = await api.get(`/superadmin/client/${client.id}/staff-count`);
          staffCounts[client.id] = staffRes.data?.count || 0;

          // Get geolocation staff count (users with geolocation access)
          const geoRes = await api.get(`/superadmin/client/${client.id}/geo-staff-count`);
          geoStaffCounts[client.id] = geoRes.data?.count || 0;
        } catch (e) {
          staffCounts[client.id] = 0;
          geoStaffCounts[client.id] = 0;
        }
      }

      setStaffCounts(staffCounts);
      setGeoStaffCounts(geoStaffCounts);
    } catch (e) {
      console.error('Failed to load staff counts:', e);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await api.get('/superadmin/plans');
      setPlans(res.data?.plans || []);
    } catch (e) { }
  };

  const openPlanDetails = async (client) => {
    try {
      const res = await api.get(`/superadmin/clients/${client.id}/plan-details`);
      setSelectedClientPlan({
        clientName: client.name,
        ...res.data.planDetails
      });
      setPlanDetailsOpen(true);
    } catch (e) {
      message.error('Failed to load plan details');
    }
  };

  const openStaffLimitModal = (client) => {
    setSelectedClientForLimit(client);
    const sub = client.currentSubscription || {};
    const plan = client.plan || {};

    const staffLimit = sub.staffLimit || plan.staffLimit || 0;
    const maxGeolocationStaff = sub.maxGeolocationStaff !== null ? sub.maxGeolocationStaff : (plan.maxGeolocationStaff || 0);
    const salesEnabled = sub.salesEnabled !== null ? sub.salesEnabled : (plan.salesEnabled || false);
    const geolocationEnabled = sub.geolocationEnabled !== null ? sub.geolocationEnabled : (plan.geolocationEnabled || false);
    const expenseEnabled = sub.expenseEnabled !== null ? sub.expenseEnabled : (plan.expenseEnabled || false);

    console.log('Opening limit modal for client:', client.name);

    staffLimitForm.resetFields();
    staffLimitForm.setFieldsValue({
      staffLimit: staffLimit > 0 ? staffLimit : '',
      maxGeolocationStaff,
      salesEnabled,
      geolocationEnabled,
      expenseEnabled
    });
    setStaffLimitOpen(true);
  };

  const openGeoStaffLimitModal = (client) => {
    setSelectedClientForGeoLimit(client);
    const currentLimit = client.currentSubscription?.maxGeolocationStaff || client.plan?.maxGeolocationStaff || 0;
    console.log('Opening geo staff limit modal for client:', client.name, 'Current limit:', currentLimit);

    geoStaffLimitForm.resetFields();
    geoStaffLimitForm.setFieldsValue({
      maxGeolocationStaff: currentLimit > 0 ? currentLimit : 0
    });
    setGeoStaffLimitOpen(true);
  };

  const submitStaffLimit = async () => {
    try {
      const values = await staffLimitForm.validateFields();

      const payload = {
        staffLimit: values.staffLimit ? Number(values.staffLimit) : undefined,
        maxGeolocationStaff: values.maxGeolocationStaff !== undefined ? Number(values.maxGeolocationStaff) : undefined,
        salesEnabled: !!values.salesEnabled,
        geolocationEnabled: !!values.geolocationEnabled,
        expenseEnabled: !!values.expenseEnabled
      };

      const res = await api.post(`/superadmin/clients/${selectedClientForLimit.id}/subscription`, payload);

      if (res.data.success) {
        message.success(res.data.message || 'Limits updated successfully');
        setStaffLimitOpen(false);
        load();
      }
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to update limits');
    }
  };

  const submitGeoStaffLimit = async () => {
    try {
      const values = await geoStaffLimitForm.validateFields();
      console.log('Geo staff form values:', values);

      if (values.maxGeolocationStaff === undefined || values.maxGeolocationStaff === null || values.maxGeolocationStaff < 0) {
        message.error('Max geolocation staff must be 0 or more');
        return;
      }

      const payload = {
        maxGeolocationStaff: Number(values.maxGeolocationStaff)
      };

      console.log('Sending geo staff payload:', payload);
      const res = await api.post(`/superadmin/clients/${selectedClientForGeoLimit.id}/subscription`, payload);

      if (res.data.success) {
        message.success(res.data.message || 'Max geolocation staff updated successfully');
        setGeoStaffLimitOpen(false);
        load(); // Refresh client data
      }
    } catch (err) {
      console.error('Submit geo staff error:', err);
      if (err?.errorFields) {
        message.error('Please check the form fields');
        return; // validation error
      }
      message.error(err?.response?.data?.message || 'Failed to update max geolocation staff');
    }
  };

  useEffect(() => { load(); }, []);

  // Ensure form resets when opening create
  useEffect(() => {
    if (open && !editing) {
      form.resetFields();
    }
  }, [open, editing, form]);

  // Rely on initialValues + key for remount-based autofill
  useEffect(() => { }, [editing]);

  const onCreate = () => {
    setEditing(null);
    setMode('create');
    form.resetFields();
    setOpen(true);
  };

  const onEdit = (rec) => {
    setEditing(rec);
    setMode('edit');
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
        anniversaryDate: values.anniversaryDate ? values.anniversaryDate.format('YYYY-MM-DD') : null
      };

      if (editing) {
        await api.put(`/superadmin/clients/${editing.id}`, payload);
        message.success('Client updated');
      } else {
        await api.post('/superadmin/clients', payload);
        message.success('Client created');
      }
      setOpen(false);
      load();
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const openAssign = async (rec) => {
    setEditing(rec);
    await loadPlans();
    assignForm.resetFields();

    const sub = rec.currentSubscription || {};
    const plan = rec.plan || {};

    const currentPlanId = sub.planId || plan.id;
    let resolvedPlan = plan;
    if (currentPlanId) {
      const p = plans.find(pl => pl.id === currentPlanId);
      setSelectedPlan(p);
      if (p) resolvedPlan = p;
    } else {
      setSelectedPlan(null);
    }

    const startVal = sub.startAt ? dayjs(sub.startAt) : dayjs();

    assignForm.setFieldsValue({
      planId: currentPlanId,
      startAt: startVal.isValid() ? startVal : dayjs(),
      staffLimit: sub.staffLimit || resolvedPlan.staffLimit || '',
      maxGeolocationStaff: sub.maxGeolocationStaff !== null ? sub.maxGeolocationStaff : (resolvedPlan.maxGeolocationStaff || 0),
      salesEnabled: sub.salesEnabled !== null ? !!sub.salesEnabled : (!!resolvedPlan.salesEnabled || false),
      geolocationEnabled: sub.geolocationEnabled !== null ? !!sub.geolocationEnabled : (!!resolvedPlan.geolocationEnabled || false),
      expenseEnabled: sub.expenseEnabled !== null ? !!sub.expenseEnabled : (!!resolvedPlan.expenseEnabled || false)
    });
    setAssignOpen(true);
  };

  const handlePlanChange = (planId) => {
    const plan = plans.find(p => p.id === planId);
    setSelectedPlan(plan);
    // If no active subscription, set defaults from plan
    if (plan && (!editing?.currentSubscription || editing?.currentSubscription.status !== 'ACTIVE')) {
      assignForm.setFieldsValue({
        staffLimit: plan.staffLimit || '',
        maxGeolocationStaff: plan.maxGeolocationStaff || 0,
        salesEnabled: !!plan.salesEnabled,
        geolocationEnabled: !!plan.geolocationEnabled,
        expenseEnabled: !!plan.expenseEnabled
      });
    }
  };

  const submitAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      console.log('--- SUBMIT ASSIGN DEBUG ---');
      console.log('Form Values:', values);
      if (values.startAt) {
        console.log('startAt type:', typeof values.startAt);
        console.log('startAt string:', values.startAt.toString());
        console.log('startAt toDate:', values.startAt.toDate());
      } else {
        console.log('startAt is MISSING/FALSY');
      }

      const payload = {
        planId: values.planId,
        startAt: values.startAt ? values.startAt.toDate() : new Date(),
        ...(values.staffLimit !== undefined && values.staffLimit !== null && values.staffLimit !== '' ? { staffLimit: Number(values.staffLimit) } : {}),
        ...(values.maxGeolocationStaff !== undefined && values.maxGeolocationStaff !== null && values.maxGeolocationStaff !== '' ? { maxGeolocationStaff: Number(values.maxGeolocationStaff) } : {}),
        salesEnabled: !!values.salesEnabled,
        geolocationEnabled: !!values.geolocationEnabled,
        expenseEnabled: !!values.expenseEnabled,
      };
      await api.post(`/superadmin/clients/${editing.id}/subscription`, payload);
      message.success('Subscription assigned');
      setAssignOpen(false);
      load();
    } catch (err) {
      if (err?.errorFields) return; // validation error
      message.error(err?.response?.data?.message || 'Failed to assign subscription');
    }
  };

  const handleImpersonate = async (rec) => {
    try {
      const res = await api.post(`/superadmin/clients/${rec.id}/impersonate`);
      if (res.data.success) {
        const newToken = res.data.token;
        const newUser = encodeURIComponent(JSON.stringify(res.data.user));

        // Open in a new tab via the /impersonate route
        // The ImpersonateRedirect component will store in sessionStorage (tab-specific)
        window.open(`/impersonate?token=${newToken}&user=${newUser}`, '_blank');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to impersonate client');
    }
  };

  const handleToggleStatus = async (rec) => {
    try {
      setLoading(true);
      const res = await api.post(`/superadmin/clients/${rec.id}/toggle-status`);
      if (res.data.success) {
        message.success(`Client ${res.data.status === 'SUSPENDED' ? 'Deactivated' : 'Activated'} successfully`);
        load();
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to toggle status');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      render: (id) => <span style={{ color: '#8c8c8c' }}>#{id}</span>
    },
    {
      title: 'Name', dataIndex: 'name', render: (name, rec) => (
        <a onClick={() => handleImpersonate(rec)} style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 500 }}>{name}</a>
      )
    },
    { title: 'Phone', dataIndex: 'phone', width: 140 },
    {
      title: 'Status', dataIndex: 'status', width: 120, render: (v) => (
        <Tag color={v === 'ACTIVE' ? 'green' : v === 'DISABLED' ? 'red' : 'orange'}>{v}</Tag>
      )
    },
    { title: 'State', dataIndex: 'state', width: 140 },
    { title: 'City', dataIndex: 'city', width: 160 },
    {
      title: 'Actions', width: 500,
      render: (_, rec) => {
        const staffCount = staffCounts[rec.id] || 0;
        const staffLimit = rec.currentSubscription?.staffLimit || rec.plan?.staffLimit || 'Unlimited';
        const isOverLimit = staffLimit !== 'Unlimited' && staffCount > staffLimit;

        const geoStaffCount = geoStaffCounts[rec.id] || 0;
        const geoStaffLimit = rec.currentSubscription?.maxGeolocationStaff || rec.plan?.maxGeolocationStaff || 0;
        const isOverGeoLimit = geoStaffLimit > 0 && geoStaffCount > geoStaffLimit;

        return (
          <Space direction="vertical" size="small">
            <Space>
              <Button size="small" onClick={() => onEdit(rec)}>Edit</Button>
              <Button size="small" onClick={() => openPlanDetails(rec)}>View Plan</Button>
              <Button size="small" type="primary" onClick={() => openAssign(rec)}>Assign/Renew</Button>
              <Button 
                size="small" 
                danger={rec.status !== 'SUSPENDED'}
                style={rec.status === 'SUSPENDED' ? { backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' } : {}}
                onClick={() => handleToggleStatus(rec)}
              >
                {rec.status === 'SUSPENDED' ? 'Activate' : 'Deactivate'}
              </Button>
            </Space>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
              <div>
                <span>Staff: </span>
                <Tag
                  color={isOverLimit ? 'red' : staffLimit !== 'Unlimited' && staffCount >= staffLimit * 0.8 ? 'orange' : 'green'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openStaffLimitModal(rec)}
                >
                  {staffCount}/{staffLimit}
                </Tag>
                {isOverLimit && <span style={{ color: 'red', marginLeft: 4 }}>⚠️ Over limit</span>}
              </div>

              {(rec.currentSubscription?.geolocationEnabled || rec.plan?.geolocationEnabled) && (
                <div>
                  <span>Geo Staff: </span>
                  <Tag
                    color={isOverGeoLimit ? 'red' : geoStaffLimit > 0 && geoStaffCount >= geoStaffLimit * 0.8 ? 'orange' : 'green'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openGeoStaffLimitModal(rec)}
                  >
                    {geoStaffCount}/{geoStaffLimit || '∞'}
                  </Tag>
                  {isOverGeoLimit && <span style={{ color: 'red', marginLeft: 4 }}>⚠️ Over limit</span>}
                </div>
              )}
            </div>
          </Space>
        );
      }
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Title level={4} style={{ margin: 0 }}>Clients</Title>
          </div>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Clients</h2>
            <Space>
              <Input.Search
                placeholder="Search by name or phone"
                allowClear
                onSearch={v => setSearchText(v)}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
              <Button type="primary" onClick={onCreate}>New Client</Button>
            </Space>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows.filter(r =>
              (r.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
              (r.phone || '').includes(searchText)
            )}
            pagination={{ pageSize: 10 }}
          />
        </Content>
      </Layout>

      <Modal
        title={editing ? 'Edit Client' : 'Create Client'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? 'Update' : 'Create'}
        destroyOnClose
        key={editing ? `modal-${editing.id}` : 'modal-new'}
      >
        {mode === 'edit' ? (
          editing ? (
            <Form
              layout="vertical"
              form={form}
              key={`form-${editing.id}`}
              preserve={false}
              initialValues={formInitials}
            >
              <Form.Item label="Business Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="Phone" name="phone"><Input maxLength={10} /></Form.Item>
              <Form.Item label="Business Email" name="businessEmail"><Input type="email" /></Form.Item>
              <Form.Item label="Status" name="status"><Select options={[{ value: 'ACTIVE' }, { value: 'DISABLED' }, { value: 'SUSPENDED' }]} /></Form.Item>
              <Form.Item label="State" name="state"><Input /></Form.Item>
              <Form.Item label="City" name="city"><Input /></Form.Item>
              <Form.Item label="Channel Partner Id" name="channelPartnerId"><Input /></Form.Item>
              <Form.Item label="Describe role in organization" name="roleDescription"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item label="Employees in business" name="employeeCount"><Select placeholder="Select" options={[
                { value: 'Less than 20', label: 'Less than 20' },
                { value: '20-100', label: '20-100' },
                { value: '100-500', label: '100-500' },
                { value: 'More than 500', label: 'More than 500' },
              ]} /></Form.Item>
              <Form.Item label="Contact Person Name" name="contactPersonName"><Input /></Form.Item>
              <Form.Item label="Address" name="address"><Input.TextArea rows={2} /></Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item label="Birth Date" name="birthDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
                <Form.Item label="Anniversary Date" name="anniversaryDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
              </div>
              <Form.Item label="GST Number" name="gstNumber"><Input /></Form.Item>
            </Form>
          ) : null
        ) : (
          <Form
            layout="vertical"
            form={form}
            key={'form-new'}
            preserve={false}
          >
            <Form.Item label="Business Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="Phone" name="phone"><Input maxLength={10} /></Form.Item>
            <Form.Item label="Business Email" name="businessEmail"><Input type="email" /></Form.Item>
            <Form.Item label="Status" name="status"><Select options={[{ value: 'ACTIVE' }, { value: 'DISABLED' }, { value: 'SUSPENDED' }]} /></Form.Item>
            <Form.Item label="State" name="state"><Input /></Form.Item>
            <Form.Item label="City" name="city"><Input /></Form.Item>
            <Form.Item label="Channel Partner Id" name="channelPartnerId"><Input /></Form.Item>
            <Form.Item label="Describe role in organization" name="roleDescription"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item label="Employees in business" name="employeeCount"><Select placeholder="Select" options={[
              { value: 'Less than 20', label: 'Less than 20' },
              { value: '20-100', label: '20-100' },
              { value: '100-500', label: '100-500' },
              { value: 'More than 500', label: 'More than 500' },
            ]} /></Form.Item>
            <Form.Item label="Contact Person Name" name="contactPersonName"><Input /></Form.Item>
            <Form.Item label="Address" name="address"><Input.TextArea rows={2} /></Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item label="Birth Date" name="birthDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Anniversary Date" name="anniversaryDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </div>
            <Form.Item label="GST Number" name="gstNumber"><Input /></Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="Assign/Renew Subscription"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={submitAssign}
        okText="Assign"
        width={500}
        destroyOnClose={true}
      >
        <Form layout="vertical" form={assignForm}>
          <Form.Item label="Plan" name="planId" rules={[{ required: true }]}>
            <Select
              placeholder="Select plan"
              options={plans.map(p => ({ value: p.id, label: `${p.name} (${p.periodDays}d)` }))}
              onChange={handlePlanChange}
              disabled={editing?.currentSubscription && editing?.currentSubscription.status === 'ACTIVE'}
            />
          </Form.Item>
          <Form.Item label="Start Date" name="startAt" rules={[{ required: true }]}>
            <DatePicker
              style={{ width: '100%' }}
              onChange={(date, dateString) => {
                console.log('DatePicker Change:', dateString, date);
              }}
            />
          </Form.Item>

          <Form.Item label="Staff Limit (Leave empty for plan default)" name="staffLimit">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Override staff limit" />
          </Form.Item>

          {editing?.currentSubscription && editing?.currentSubscription.status === 'ACTIVE' && (
            <>
              <Form.Item name="salesEnabled" valuePropName="checked">
                <Checkbox>Enable Sales Module</Checkbox>
              </Form.Item>

              <Form.Item name="geolocationEnabled" valuePropName="checked">
                <Checkbox>Enable Geolocation</Checkbox>
              </Form.Item>

              <Form.Item name="expenseEnabled" valuePropName="checked">
                <Checkbox>Enable Expense Module</Checkbox>
              </Form.Item>
            </>
          )}

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.planId !== currentValues.planId ||
              prevValues.geolocationEnabled !== currentValues.geolocationEnabled
            }
          >
            {({ getFieldValue }) => {
              const planId = getFieldValue('planId');
              const geoOverride = getFieldValue('geolocationEnabled');
              const selectedPlanObj = plans.find(p => p.id === planId);
              const isGeoVisible = geoOverride || (selectedPlanObj && selectedPlanObj.geolocationEnabled);

              return isGeoVisible ? (
                <Form.Item
                  label="Max Geolocation Staff"
                  name="maxGeolocationStaff"
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="Limit for geolocation users"
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Plan Details"
        open={planDetailsOpen}
        onCancel={() => setPlanDetailsOpen(false)}
        footer={[
          <Button key="close" onClick={() => setPlanDetailsOpen(false)}>Close</Button>
        ]}
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Client Name</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedClientPlan.clientName || 'N/A'}</div>
          </div>

          <div>
            <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Plan Name</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedClientPlan.planName || 'No Plan'}</div>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Start Date</div>
              <div style={{ fontSize: 14 }}>
                {selectedClientPlan.startDate ? new Date(selectedClientPlan.startDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Expiry Date</div>
              <div style={{ fontSize: 14 }}>
                {selectedClientPlan.endDate ? new Date(selectedClientPlan.endDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Status</div>
            <Tag color={selectedClientPlan.status === 'active' ? '#52c41a' :
              selectedClientPlan.status === 'expired' ? '#ff4d4f' : '#faad14'}>
              {selectedClientPlan.status ? selectedClientPlan.status.charAt(0).toUpperCase() + selectedClientPlan.status.slice(1) : 'Unknown'}
            </Tag>
          </div>

          {selectedClientPlan.features && Array.isArray(selectedClientPlan.features) && (
            <div>
              <div style={{ marginBottom: 8, color: '#6b7280', fontSize: 12 }}>Features</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedClientPlan.features.map((feature, index) => (
                  <div key={index} style={{ fontSize: 13, color: '#262626' }}>
                    • {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        title="Update Subscription Limits & Features"
        open={staffLimitOpen}
        onCancel={() => setStaffLimitOpen(false)}
        onOk={submitStaffLimit}
        okText="Update"
        width={500}
      >
        <Form form={staffLimitForm} layout="vertical">
          <Form.Item
            label="Staff Limit"
            name="staffLimit"
            rules={[{ required: true, message: 'Please enter a staff limit' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Enter staff limit" />
          </Form.Item>

          <Form.Item name="salesEnabled" valuePropName="checked">
            <Checkbox>Enable Sales Module</Checkbox>
          </Form.Item>

          <Form.Item name="geolocationEnabled" valuePropName="checked">
            <Checkbox>Enable Geolocation</Checkbox>
          </Form.Item>

          <Form.Item name="expenseEnabled" valuePropName="checked">
            <Checkbox>Enable Expense Module</Checkbox>
          </Form.Item>

          <Form.Item
            label="Max Geolocation Staff"
            name="maxGeolocationStaff"
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="Limit for geolocation users"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Update Max Geolocation Staff"
        open={geoStaffLimitOpen}
        onCancel={() => setGeoStaffLimitOpen(false)}
        onOk={submitGeoStaffLimit}
        okText="Update Limit"
      >
        <Form form={geoStaffLimitForm} layout="vertical">
          <Form.Item
            label="Max Geolocation Staff"
            name="maxGeolocationStaff"
            rules={[{ required: true, message: 'Please enter max geolocation staff' }]}
            extra="Set to 0 to disable geolocation access for all staff"
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="Enter max geolocation staff"
            />
          </Form.Item>
          {selectedClientForGeoLimit && (
            <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ marginBottom: '4px', fontWeight: 500 }}>Current Usage:</div>
              <div>• Staff with geolocation access: <strong>{geoStaffCounts[selectedClientForGeoLimit.id] || 0}</strong></div>
              <div>• Current limit: <strong>{(selectedClientForGeoLimit.currentSubscription?.maxGeolocationStaff || selectedClientForGeoLimit.plan?.maxGeolocationStaff) || 'Not set'}</strong></div>
            </div>
          )}
        </Form>
      </Modal>
      {/* <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
        Note: You can only increase staff limit during active subscription. Full subscription changes require expiration.
      </div> */}
    </Layout>
  );
}
