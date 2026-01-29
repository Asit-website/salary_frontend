import React, { useEffect, useMemo, useState } from 'react';
// import { Layout, Typography, Tabs, Button, Card, Table, Space, message, Modal, Form, Input, Select, DatePicker, Dropdown, Tag } from 'antd';
import { Layout, Typography, Tabs, Button, Card, Table, Space, message, Modal, Form, Input, Select, DatePicker, Dropdown, Tag, Switch } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';
import { PrinterOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function Sales() {
  const navigate = useNavigate();

  // Clients
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientForm] = Form.useForm();
  const [editingClient, setEditingClient] = useState(null);

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignForm] = Form.useForm();
  const [staffOptions, setStaffOptions] = useState([]);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Targets
  const [targets, setTargets] = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetForm] = Form.useForm();
  const [editingTarget, setEditingTarget] = useState(null);

  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [viewOrder, setViewOrder] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  const printRef = React.useRef(null);

  // Load clients
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setClientsLoading(true);
        const resp = await api.get('/admin/sales/clients');
        if (!mounted) return;
        const list = resp?.data?.clients || [];
        setClients(Array.isArray(list) ? list : []);
      } catch (e) {
        message.error(e?.response?.data?.message || 'Failed to load clients');
      } finally {
        setClientsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load assignments
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAssignmentsLoading(true);
        const resp = await api.get('/admin/sales/assignments');
        if (!mounted) return;
        setAssignments(Array.isArray(resp?.data?.assignments) ? resp.data.assignments : []);
      } catch (e) {
        message.error(e?.response?.data?.message || 'Failed to load assignments');
      } finally {
        setAssignmentsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load targets
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setTargetsLoading(true);
        const resp = await api.get('/admin/sales/targets');
        if (!mounted) return;
        setTargets(Array.isArray(resp?.data?.targets) ? resp.data.targets : []);
      } catch (e) {
        message.error(e?.response?.data?.message || 'Failed to load sales targets');
      } finally {
        setTargetsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setVisitsLoading(true);
        const resp = await api.get('/admin/sales/visits');
        if (!mounted) return;
        setVisits(Array.isArray(resp?.data?.visits) ? resp.data.visits : []);
      } catch (e) {
        message.error(e?.response?.data?.message || 'Failed to load visits');
      } finally {
        setVisitsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setOrdersLoading(true);
        const resp = await api.get('/admin/sales/orders');
        if (!mounted) return;
        setOrders(Array.isArray(resp?.data?.orders) ? resp.data.orders : []);
      } catch (e) {
        message.error(e?.response?.data?.message || 'Failed to load orders');
      } finally {
        setOrdersLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);



  // Clients handlers
  const openNewClient = () => {
    setEditingClient(null);
    clientForm.resetFields();
    setClientOpen(true);
  };

  const openEditClient = (row) => {
    setEditingClient(row);
    clientForm.setFieldsValue({
      name: row.name || '',
      phone: row.phone || '',
      clientType: row.clientType || '',
      location: row.location || '',
    });
    setClientOpen(true);
  };

  const openEditTarget = (row) => {
    setEditingTarget(row);
    targetForm.setFieldsValue({
      staffUserId: row.staffUserId,
      period: row.period,
      periodDate: row.periodDate ? dayjs(row.periodDate) : undefined,
      targetAmount: row.targetAmount,
      targetOrders: row.targetOrders,
    });
    setTargetOpen(true);
  };

  const saveClient = async () => {
    try {
      const v = await clientForm.validateFields();
      setClientSaving(true);
      const payload = {
        name: v.name,
        phone: v.phone,
        clientType: v.clientType,
        location: v.location,
      };
      let resp;
      if (editingClient && editingClient.id) {
        resp = await api.put(`/admin/sales/clients/${encodeURIComponent(String(editingClient.id))}`, payload);
      } else {
        resp = await api.post('/admin/sales/clients', payload);
      }
      if (resp?.data?.success) {
        message.success(editingClient ? 'Client updated' : 'Client created');
        setClientOpen(false);
        setClientsLoading(true);
        const r2 = await api.get('/admin/sales/clients', { params: { t: Date.now() } });
        setClients(Array.isArray(r2?.data?.clients) ? r2.data.clients : []);
      } else {
        message.error(resp?.data?.message || 'Failed to save client');
      }
    } catch (e) {
      if (!e?.errorFields) message.error(e?.response?.data?.message || 'Failed to save client');
    } finally {
      setClientSaving(false);
      setClientsLoading(false);
    }
  };

  const toggleClientActive = async (row) => {
    try {
      const nextActive = !(row.active === true);
      const resp = await api.put(`/admin/sales/clients/${encodeURIComponent(String(row.id))}`, { active: nextActive });
      if (resp?.data?.success) {
        const r2 = await api.get('/admin/sales/clients', { params: { t: Date.now() } });
        setClients(Array.isArray(r2?.data?.clients) ? r2.data.clients : []);
        message.success(nextActive ? 'Client activated' : 'Client deactivated');
      } else {
        message.error(resp?.data?.message || 'Failed to update');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to update');
    }
  };

  // Assignments handlers
  const openAssign = async (row) => {
    try {
      assignForm.resetFields();
      setAssignOpen(true);
      setEditingAssignment(row || null);
      if (row) {
        assignForm.setFieldsValue({
          clientId: row.clientId,
          staffUserId: row.staffUserId,
          title: row.title,
          description: row.description,
          status: row.status,
          assignedOn: row.assignedOn ? dayjs(row.assignedOn) : undefined,
          dueDate: row.dueDate ? dayjs(row.dueDate) : undefined,
        });
      }
      const r = await api.get('/admin/staff');
      const list = Array.isArray(r?.data?.staff) ? r.data.staff : [];
      setStaffOptions(list.map(u => ({ value: u.id, label: u.name || u.phone || `User #${u.id}` })));
    } catch (_) {
      setStaffOptions([]);
    }
  };

  const saveAssignment = async () => {
    try {
      const v = await assignForm.validateFields();
      setAssignSaving(true);
      const payload = {
        clientId: v.clientId,
        staffUserId: v.staffUserId,
        title: v.title,
        description: v.description,
        status: v.status,
        assignedOn: v.assignedOn ? v.assignedOn.format('YYYY-MM-DD HH:mm:ss') : undefined,
        dueDate: v.dueDate ? v.dueDate.format('YYYY-MM-DD HH:mm:ss') : undefined,
      };
      let resp;
      if (editingAssignment && editingAssignment.id) {
        resp = await api.put(`/admin/sales/assignments/${encodeURIComponent(String(editingAssignment.id))}`, payload);
      } else {
        resp = await api.post('/admin/sales/assignments', payload);
      }
      if (resp?.data?.success) {
        message.success(editingAssignment ? 'Assignment updated' : 'Assignment created');
        setAssignOpen(false);
        setAssignmentsLoading(true);
        const r2 = await api.get('/admin/sales/assignments');
        setAssignments(Array.isArray(r2?.data?.assignments) ? r2.data.assignments : []);
      } else {
        message.error(resp?.data?.message || 'Failed to assign');
      }
    } catch (e) {
      if (!e?.errorFields) message.error(e?.response?.data?.message || 'Failed to assign');
    } finally {
      setAssignSaving(false);
      setAssignmentsLoading(false);
    }
  };

  // Targets handlers
  const openNewTarget = async () => {
    try {
      targetForm.resetFields();
      setTargetOpen(true);
      if (!staffOptions.length) {
        const r = await api.get('/admin/staff');
        const list = Array.isArray(r?.data?.staff) ? r.data.staff : [];
        setStaffOptions(list.map(u => ({ value: u.id, label: u.name || u.phone || `User #${u.id}` })));
      }
    } catch (_) { }
  };

  const saveTarget = async () => {
    try {
      const v = await targetForm.validateFields();
      setTargetSaving(true);
      const payload = {
        staffUserId: v.staffUserId,
        period: v.period,
        periodDate: v.periodDate ? v.periodDate.format('YYYY-MM-DD') : undefined,
        targetAmount: Number(v.targetAmount || 0),
        targetOrders: Number(v.targetOrders || 0),
      };
      let resp;
      if (editingTarget && editingTarget.id) {
        resp = await api.put(`/admin/sales/targets/${encodeURIComponent(String(editingTarget.id))}`, payload);
      } else {
        resp = await api.post('/admin/sales/targets', payload);
      }
      if (resp?.data?.success) {
        message.success(editingTarget ? 'Target updated' : 'Target created');
        setTargetOpen(false);
        setEditingTarget(null);
        setTargetsLoading(true);
        const r2 = await api.get('/admin/sales/targets');
        setTargets(Array.isArray(r2?.data?.targets) ? r2.data.targets : []);
      } else {
        message.error(resp?.data?.message || 'Failed to save target');
      }
    } catch (e) {
      if (!e?.errorFields) message.error(e?.response?.data?.message || 'Failed to save target');
    } finally {
      setTargetSaving(false);
      setTargetsLoading(false);
    }
  };

  const deleteTarget = (row) => {
    Modal.confirm({
      title: 'Delete target?',
      content: 'This action cannot be undone.',
      okType: 'danger',
      onOk: async () => {
        try {
          const resp = await api.delete(`/admin/sales/targets/${encodeURIComponent(String(row.id))}`);
          if (resp?.data?.success) {
            message.success('Target deleted');
            setTargetsLoading(true);
            const r2 = await api.get('/admin/sales/targets');
            setTargets(Array.isArray(r2?.data?.targets) ? r2.data.targets : []);
          } else {
            message.error(resp?.data?.message || 'Failed to delete target');
          }
        } catch (e) {
          message.error(e?.response?.data?.message || 'Failed to delete target');
        } finally {
          setTargetsLoading(false);
        }
      }
    });
  };

  const openViewOrder = async (row) => {
    try {
      // Fetch full order detail from backend admin endpoint
      const resp = await api.get(`/admin/sales/orders/${encodeURIComponent(String(row.id))}`);
      if (resp?.data?.success && resp.data.order) {
        setViewOrder(resp.data.order);
        setViewOpen(true);
      } else {
        message.error(resp?.data?.message || 'Failed to load order');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load order');
    }
  };

  // Clients table columns
  const clientColumns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Type', dataIndex: 'clientType' },
    { title: 'Location', dataIndex: 'location' },
    { title: 'Active', dataIndex: 'active', render: (v) => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => {
        const active = row.active === true;
        return (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'edit', label: 'Edit', onClick: () => openEditClient(row) },
                { key: 'toggle', label: active ? 'Deactivate' : 'Activate', onClick: () => toggleClientActive(row) },
              ]
            }}
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  // Assignments table columns
  const assignmentColumns = [
    { title: 'Client', dataIndex: 'clientName' },
    { title: 'Staff', dataIndex: 'staffName' },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Status', dataIndex: 'status' },
    { title: 'Assigned On', dataIndex: 'assignedOn', render: (v) => v ? dayjs(v).format('DD MMMM YYYY hh:mm A') : '' },
    { title: 'Due Date', dataIndex: 'dueDate', render: (v) => v ? dayjs(v).format('DD MMMM YYYY hh:mm A') : '' },
    {
      title: 'Actions',
      key: 'a',
      render: (_, row) => (
        <Dropdown
          menu={{ items: [{ key: 'edit', label: 'Edit', onClick: () => openAssign(row) }] }}
          trigger={['click']}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      )
    },
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get('/admin/staff');
        if (!mounted) return;
        const list = Array.isArray(r?.data?.staff) ? r.data.staff : [];
        setStaffOptions(list.map(u => ({ value: u.id, label: u.name || u.phone || `User #${u.id}` })));
      } catch (_) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Targets table columns
  const targetsColumns = [
    { title: 'Staff', dataIndex: 'staffName', render: (v, r) => v || staffById[r.staffUserId] || (r.staffUserId ? `User #${r.staffUserId}` : '') },
    { title: 'Period', dataIndex: 'period', render: (v) => String(v || '').toUpperCase() },
    { title: 'Period Date', dataIndex: 'periodDate', render: (v) => v ? dayjs(v).format('DD MMMM YYYY') : '' },
    { title: 'Target', render: (_, r) => `${r.targetAmount ? `₹${r.targetAmount}` : 0}${r.targetOrders ? ` • ${r.targetOrders} orders` : ''}` },
    { title: 'Achieved', render: (_, r) => `${r.achievedAmount ? `₹${r.achievedAmount}` : 0}${r.achievedOrders ? ` • ${r.achievedOrders} orders` : ''}` },
    {
      title: 'Actions', key: 't_actions', render: (_, row) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'edit', label: 'Edit', onClick: () => openEditTarget(row) },
              { key: 'delete', label: 'Delete', onClick: () => deleteTarget(row) }
            ]
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      )
    },
  ];

  const visitColumns = [
    { title: 'Date', dataIndex: 'visitDate', render: (v) => v ? dayjs(v).format('DD MMMM YYYY') : '' },
    { title: 'Staff', dataIndex: 'staffName', render: (v, r) => v || staffById[(r.userId || r.user_id || r.staffUserId)] || '' },
    { title: 'Client', dataIndex: 'clientName' },
    { title: 'Type', dataIndex: 'visitType' },
    { title: 'Location', dataIndex: 'location' },
    // { title: 'Verified', dataIndex: 'verified', render: (v) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
    {
      title: 'Verified', dataIndex: 'verified', render: (v, r) => (
        <Switch
          checked={!!v}
          checkedChildren="Yes"
          unCheckedChildren="No"
          onChange={async (checked) => {
            try {
              // Optimistic UI update
              setVisits(prev => prev.map(it => it.id === r.id ? { ...it, verified: checked } : it));
              const resp = await api.put(`/admin/sales/visits/${encodeURIComponent(String(r.id))}`, { verified: checked });
              if (!resp?.data?.success) throw new Error(resp?.data?.message || 'Failed');
              message.success(checked ? 'Marked as verified' : 'Marked as not verified');
            } catch (e) {
              // Revert on error
              setVisits(prev => prev.map(it => it.id === r.id ? { ...it, verified: !checked } : it));
              message.error(e?.response?.data?.message || 'Failed to update visit');
            }
          }}
        />
      )
    },
    { title: 'Amount', dataIndex: 'amount', render: (v) => v ? `₹${v}` : 0 },
  ];

  const orderColumns = [
    { title: 'Order Date', dataIndex: 'orderDate', render: (v) => v ? dayjs(v).format('DD MMMM YYYY') : '' },
    { title: 'Staff', dataIndex: 'staffName', render: (v, r) => v || staffById[(r.userId || r.user_id || r.staffUserId)] || '' },
    { title: 'Client', dataIndex: 'clientName', render: (v) => v || '' },
    { title: 'Items', dataIndex: 'items' },
    { title: 'Total Amount', dataIndex: 'totalAmount', render: (v) => v ? `₹${v}` : 0 },
    {
      title: 'Actions',
      key: 'o_actions',
      render: (_, row) => (
        <Dropdown
          trigger={['click']}
          menu={{ items: [{ key: 'view', label: 'View', onClick: () => openViewOrder(row) }] }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    }
  ];

  const staffById = React.useMemo(() => {
    const m = {};
    (staffOptions || []).forEach(o => { if (o && o.value != null) m[o.value] = o.label; });
    return m;
  }, [staffOptions]);

  const tabs = useMemo(() => ([
    {
      key: 'clients',
      label: 'Clients',
      children: (
        <Card title="Clients" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNewClient}>New Client</Button>}>
          <Table rowKey={(r) => r.id} loading={clientsLoading} columns={clientColumns} dataSource={clients} pagination={false} />
        </Card>
      )
    },
    {
      key: 'assignments',
      label: 'Assign Staff',
      children: (
        <Card title="Client Assignments" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openAssign(null)}>Assign Staff</Button>}>
          <Table rowKey={(r) => r.id} loading={assignmentsLoading} columns={assignmentColumns} dataSource={assignments} pagination={false} />
        </Card>
      )
    },
    {
      key: 'targets',
      label: 'Targets',
      children: (
        <Card title="Sales Targets" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNewTarget}>New Target</Button>}>
          <Table rowKey={(r) => r.id} loading={targetsLoading} columns={targetsColumns} dataSource={targets} pagination={false} />
        </Card>
      )
    },
    {
      key: 'visits',
      label: 'Visits',
      children: (
        <Card title="Visits">
          <Table
            rowKey={(r) => r.id}
            loading={visitsLoading}
            columns={visitColumns}
            dataSource={visits}
            pagination={false}
          />
        </Card>
      )
    },
    {
      key: 'orders',
      label: 'Orders',
      children: (
        <Card title="Orders">
          <Table
            rowKey={(r) => r.id}
            loading={ordersLoading}
            columns={orderColumns}
            dataSource={orders}
            pagination={false}
          />
        </Card>
      )
    },
  // ]), [clients, clientsLoading, assignments, assignmentsLoading, targets, targetsLoading]);
  ]), [clients, clientsLoading, assignments, assignmentsLoading, targets, targetsLoading, visits, visitsLoading, orders, ordersLoading]);



  return (
    <Layout style={{ minHeight: '100vh', marginLeft: 200 }}>
      <Sidebar />
      <Layout>
        <Header style={{ background: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back to Dashboard
          </Button>
          <Title level={4} style={{ margin: 0 }}>Sales</Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Tabs defaultActiveKey="clients" items={tabs} />
        </Content>
      </Layout>

      {/* Client Modal */}
      <Modal
        open={clientOpen}
        title={editingClient ? 'Edit Client' : 'New Client'}
        onCancel={() => setClientOpen(false)}
        onOk={saveClient}
        okText={editingClient ? 'Save' : 'Create'}
        confirmLoading={clientSaving}
        destroyOnClose
      >
        <Form form={clientForm} layout="vertical">
          <Form.Item name="name" label="Client Name" rules={[{ required: true, message: 'Enter client name' }]}>
            <Input placeholder="e.g., Sample Client" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="e.g., 9876543210" />
          </Form.Item>
          <Form.Item name="clientType" label="Client Type">
            <Input placeholder="e.g., Retail, Distributor, etc." />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="e.g., Jaipur, Rajasthan" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        open={assignOpen}
        title={editingAssignment ? 'Edit Assignment' : 'Assign Staff'}
        onCancel={() => setAssignOpen(false)}
        onOk={saveAssignment}
        confirmLoading={assignSaving}
        okText={editingAssignment ? 'Save' : 'Assign'}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="clientId" label="Client" rules={[{ required: true, message: 'Select client' }]}>
            <Select
              placeholder="Select client"
              showSearch
              optionFilterProp="label"
              options={clients.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="staffUserId" label="Staff" rules={[{ required: true, message: 'Select staff' }]}>
            <Select placeholder="Select staff" options={staffOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter title' }]}>
            <Input placeholder="e.g., First Visit" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="pending">
            <Select
              options={[
                { value: 'pending', label: 'pending' },
                { value: 'inprogress', label: 'inprogress' },
                { value: 'complete', label: 'complete' },
              ]}
            />
          </Form.Item>
          <Form.Item name="assignedOn" label="Assigned On">
            <DatePicker style={{ width: '100%' }} showTime />
          </Form.Item>
          <Form.Item name="dueDate" label="Due Date">
            <DatePicker style={{ width: '100%' }} showTime />
          </Form.Item>
        </Form>
      </Modal>

      {/* New Target Modal */}
      <Modal
        open={targetOpen}
        title={editingTarget ? 'Edit Sales Target' : 'New Sales Target'}
        onCancel={() => { setTargetOpen(false); setEditingTarget(null); }}
        onOk={saveTarget}
        confirmLoading={targetSaving}
        okText={editingTarget ? 'Save' : 'Save'}
        destroyOnClose
      >
        <Form layout="vertical" form={targetForm}>
          <Form.Item name="staffUserId" label="Staff" rules={[{ required: true, message: 'Select staff' }]}>
            <Select placeholder="Select staff" options={staffOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="period" label="Period" rules={[{ required: true, message: 'Select period' }]} initialValue="monthly">
            <Select
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </Form.Item>
          <Form.Item name="periodDate" label="Period Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="targetAmount" label="Target Amount (₹)">
            <Input type="number" placeholder="e.g., 25000" />
          </Form.Item>
          <Form.Item name="targetOrders" label="Target Orders">
            <Input type="number" placeholder="e.g., 40" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={viewOpen}
        title={`Order #${viewOrder?.id || ''}`}
        onCancel={() => { setViewOpen(false); setViewOrder(null); }}
        footer={null}
        width={720}
        destroyOnClose
      >
        {viewOrder ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Button onClick={() => {
                if (!printRef.current) return;
                const html = `
          <html>
            <head>
              <title>Order #${viewOrder?.id || ''}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 16px; }
                b { font-weight: 600; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f5f5f5; }
                .totals { display: flex; justify-content: flex-end; gap: 24px; margin-top: 12px; }
              </style>
            </head>
            <body>${printRef.current.innerHTML}</body>
          </html>`;
                const w = window.open('', 'printWindow');
                if (w) {
                  w.document.open();
                  w.document.write(html);
                  w.document.close();
                  w.focus();
                  setTimeout(() => { w.print(); w.close(); }, 300);
                }
              }}>
                Print
              </Button>
            </div>

            <div ref={printRef}>
              <div style={{ marginBottom: 12 }}>
                <b>Order Date:</b> {viewOrder.orderDate ? dayjs(viewOrder.orderDate).format('DD MMMM YYYY hh:mm A') : ''}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Staff:</b> {viewOrder.staffName || ''}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Client:</b> {viewOrder.clientName || viewOrder.client?.name || ''}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Payment:</b> {viewOrder.paymentMethod || '-'} | <b>Remarks:</b> {viewOrder.remarks || '-'}
              </div>
              <Table
                rowKey={(it) => it.id}
                size="small"
                pagination={false}
                columns={[
                  { title: 'Product', dataIndex: 'name' },
                  { title: 'Size', dataIndex: 'size' },
                  { title: 'Qty', dataIndex: 'qty' },
                  { title: 'Price', dataIndex: 'price', render: (v) => v ? `₹${v}` : 0 },
                  { title: 'Amount', dataIndex: 'amount', render: (v) => v ? `₹${v}` : 0 },
                ]}
                dataSource={Array.isArray(viewOrder.items) ? viewOrder.items : []}
              />
              <div className="totals" style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 12 }}>
                <div><b>Net:</b> {viewOrder.netAmount ? `₹${viewOrder.netAmount}` : 0}</div>
                <div><b>GST:</b> {viewOrder.gstAmount ? `₹${viewOrder.gstAmount}` : 0}</div>
                <div><b>Total:</b> {viewOrder.totalAmount ? `₹${viewOrder.totalAmount}` : 0}</div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </Layout>
  );
}