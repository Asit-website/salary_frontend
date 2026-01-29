import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Button,
  Card,
  Typography,
  Table,
  Tag,
  Space,
  Menu,
  message,
  Modal,
  Descriptions,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select
} from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function PayrollCycle() {
  const { cycleId } = useParams(); // monthKey YYYY-MM
  const navigate = useNavigate();

  // UI state
  const [collapsed, setCollapsed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Data state
  const [cycle, setCycle] = React.useState(null);
  const [lines, setLines] = React.useState([]);
  const [staffMap, setStaffMap] = React.useState({});

  // Row selection + view/edit state
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const [viewRow, setViewRow] = React.useState(null);
  const [editRow, setEditRow] = React.useState(null);

  // Forms
  const [paidOpen, setPaidOpen] = React.useState(false);
  const [paidForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Load cycle + lines
  const loadCycle = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/payroll', { params: { monthKey: cycleId } });
      if (res?.data?.success) {
        setCycle(res.data.cycle);
        const raw = Array.isArray(res.data.lines) ? res.data.lines : [];
        const parseMaybe = (v) => {
          if (v == null) return v;
          if (typeof v === 'object') return v;
          if (typeof v === 'string') {
            try { return JSON.parse(v); } catch { return v; }
          }
          return v;
        };
        const normalized = raw.map((r) => ({
          ...r,
          totals: parseMaybe(r.totals),
          earnings: parseMaybe(r.earnings),
          incentives: parseMaybe(r.incentives),
          deductions: parseMaybe(r.deductions),
          attendanceSummary: parseMaybe(r.attendanceSummary),
        }));
        setLines(normalized);
      } else {
        message.error('Failed to load cycle');
      }
    } catch (e) {
      message.error('Failed to load cycle');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  // Load staff names
  const loadStaffMap = React.useCallback(async () => {
    try {
      const resp = await api.get('/admin/staff');
      const arr = Array.isArray(resp?.data?.staff) ? resp.data.staff
        : (Array.isArray(resp?.data?.data) ? resp.data.data : []);
      const map = {};
      for (const s of arr) map[s.id] = s.name || s.phone || `User #${s.id}`;
      setStaffMap(map);
    } catch (_) {
      setStaffMap({});
    }
  }, []);

  React.useEffect(() => {
    loadCycle();
    loadStaffMap();
  }, [loadCycle, loadStaffMap]);

  // Cycle actions
  const onCompute = async () => {
    try {
      if (!cycle) { message.warning('Cycle not loaded'); return; }
      if (cycle?.status === 'LOCKED' || cycle?.status === 'PAID') {
        message.warning('Cycle is locked/paid'); return;
      }
      setLoading(true);
      const res = await api.post(`/admin/payroll/${cycle.id}/compute`);
      if (res?.data?.success) {
        const raw = Array.isArray(res.data.lines) ? res.data.lines : [];
        const parseMaybe = (v) => {
          if (v == null) return v;
          if (typeof v === 'object') return v;
          if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
          return v;
        };
        const normalized = raw.map((r) => ({
          ...r,
          totals: parseMaybe(r.totals),
          earnings: parseMaybe(r.earnings),
          incentives: parseMaybe(r.incentives),
          deductions: parseMaybe(r.deductions),
          attendanceSummary: parseMaybe(r.attendanceSummary),
        }));
        setLines(normalized);
        message.success('Payroll computed');
      } else {
        message.error('Compute failed');
      }
    } catch (e) {
      message.error('Compute failed');
    } finally {
      setLoading(false);
    }
  };

  const onLock = async () => {
    if (!cycle) return;
    try {
      setLoading(true);
      const res = await api.post(`/admin/payroll/${cycle.id}/lock`);
      if (res?.data?.success) { setCycle(res.data.cycle); message.success('Cycle locked'); }
      else message.error('Lock failed');
    } catch (_) { message.error('Lock failed'); } finally { setLoading(false); }
  };

  const onUnlock = async () => {
    if (!cycle) return;
    try {
      setLoading(true);
      const res = await api.post(`/admin/payroll/${cycle.id}/unlock`);
      if (res?.data?.success) { setCycle(res.data.cycle); message.success('Cycle unlocked'); }
      else message.error('Unlock failed');
    } catch (_) { message.error('Unlock failed'); } finally { setLoading(false); }
  };

  const onMarkPaid = async () => {
    if (!cycle) return;
    try {
      setLoading(true);
      const res = await api.post(`/admin/payroll/${cycle.id}/mark-paid`);
      if (res?.data?.success) { setCycle(res.data.cycle); message.success('Marked as paid'); }
      else message.error('Mark paid failed');
    } catch (_) { message.error('Mark paid failed'); } finally { setLoading(false); }
  };

  // Top-level helpers (fixes the "is not defined" errors)
  const onExportCSV = async () => {
    if (!cycle) return;
    try {
      setLoading(true);
      const resp = await api.get(`/admin/payroll/${cycle.id}/export`, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${cycle.monthKey}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (_) {
      message.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const openBulkPaid = () => {
    if (!cycle) return;
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.warning('Select at least one line');
      return;
    }
    paidForm.resetFields();
    setPaidOpen(true);
  };

  const submitBulkPaid = async () => {
    try {
      const vals = await paidForm.validateFields();
      const payload = {
        lineIds: selectedRowKeys,
        paidAt: vals.paidAt ? vals.paidAt.toISOString() : undefined,
        paidMode: vals.paidMode || undefined,
        paidRef: vals.paidRef || undefined,
        paidAmount: vals.paidAmount != null ? Number(vals.paidAmount) : undefined,
      };
      setLoading(true);
      const res = await api.post(`/admin/payroll/${cycle.id}/lines/mark-paid`, payload);
      if (res?.data?.success) {
        message.success(`Marked paid for ${res.data.updated} lines`);
        setPaidOpen(false);
        setSelectedRowKeys([]);
        await loadCycle();
      } else {
        message.error('Bulk paid failed');
      }
    } catch (e) {
      if (e?.errorFields) return; // form validation error
      message.error('Bulk paid failed');
    } finally {
      setLoading(false);
    }
  };

  const onOpenEdit = (row) => {
    setEditRow(row);
    editForm.setFieldsValue({
      status: row?.status || 'INCLUDED',
      remarks: row?.remarks || '',
      earnings: JSON.stringify(row?.earnings || {}, null, 2),
      incentives: JSON.stringify(row?.incentives || {}, null, 2),
      deductions: JSON.stringify(row?.deductions || {}, null, 2),
    });
  };

  const submitEdit = async () => {
    if (!cycle || !editRow) return;
    try {
      const vals = await editForm.validateFields();
      let earnings, incentives, deductions;
      try { earnings = vals.earnings ? JSON.parse(vals.earnings) : undefined; } catch { message.error('Invalid earnings JSON'); return; }
      try { incentives = vals.incentives ? JSON.parse(vals.incentives) : undefined; } catch { message.error('Invalid incentives JSON'); return; }
      try { deductions = vals.deductions ? JSON.parse(vals.deductions) : undefined; } catch { message.error('Invalid deductions JSON'); return; }
      const payload = { status: vals.status, remarks: vals.remarks };
      if (earnings && typeof earnings === 'object') payload.earnings = earnings;
      if (incentives && typeof incentives === 'object') payload.incentives = incentives;
      if (deductions && typeof deductions === 'object') payload.deductions = deductions;

      setLoading(true);
      const res = await api.put(`/admin/payroll/${cycle.id}/line/${editRow.id}`, payload);
      if (res?.data?.success) {
        message.success('Line updated');
        setEditRow(null);
        await loadCycle();
      } else {
        message.error('Update failed');
      }
    } catch (e) {
      if (e?.errorFields) return;
      message.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  // Table columns
  const columns = [
    { title: 'Employee', key: 'emp', render: (_, r) => staffMap[r.userId || r.user_id] || (r.userId || r.user_id) },
    { title: 'Gross', dataIndex: ['totals', 'grossSalary'], key: 'gross', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'Deductions', dataIndex: ['totals', 'totalDeductions'], key: 'deductions', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'Net', dataIndex: ['totals', 'netSalary'], key: 'net', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'INCLUDED' ? 'blue' : 'default'}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => onOpenEdit(r)} disabled={cycle?.status === 'PAID'}>Edit</Button>
          <Button size="small" onClick={() => setViewRow(r)}>View</Button>
        </Space>
      )
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
            <Title level={4} style={{ margin: 0 }}>Payroll Cycle - {cycleId}</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
          />
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
            <div />
            <Space>
              <Button onClick={() => navigate('/payroll')}>Back</Button>
              <Button onClick={onExportCSV} disabled={!cycle} loading={loading}>Export CSV</Button>
              <Button type="primary" onClick={onCompute} loading={loading} disabled={!cycle || cycle?.status === 'LOCKED' || cycle?.status === 'PAID'}>Compute</Button>
              {cycle?.status === 'DRAFT' && (
                <Button onClick={onLock} disabled={!cycle} loading={loading}>Lock</Button>
              )}
              {cycle?.status === 'LOCKED' && (
                <>
                  <Button onClick={onUnlock} disabled={!cycle} loading={loading}>Unlock</Button>
                  <Button onClick={onMarkPaid} type="default" disabled={!cycle} loading={loading}>Mark Paid</Button>
                  <Button onClick={openBulkPaid} type="primary" disabled={!cycle || selectedRowKeys.length === 0} loading={loading}>Mark Paid Selected</Button>
                </>
              )}
              {cycle?.status === 'PAID' && (
                <Button disabled>Paid</Button>
              )}
            </Space>
          </Space>

          <Card>
            <Text type="secondary">This page lists employees and computed payroll for the selected month.</Text>
            <div style={{ marginTop: 12 }}>
              <Table
                columns={columns}
                dataSource={lines}
                rowKey={(r) => r.id || `${r.cycleId}-${r.userId}`}
                rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
                loading={loading}
                pagination={{ pageSize: 20 }}
              />
            </div>
          </Card>
        </Content>
      </Layout>

      {/* Bulk Mark Paid */}
      <Modal
        open={paidOpen}
        title={`Mark Paid for ${selectedRowKeys.length} selected`}
        onCancel={() => setPaidOpen(false)}
        onOk={submitBulkPaid}
        okButtonProps={{ disabled: !cycle }}
      >
        <Form form={paidForm} layout="vertical">
          <Form.Item name="paidAt" label="Paid At">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paidMode" label="Payment Mode">
            <Select allowClear placeholder="Select mode">
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="bank">Bank</Select.Option>
              <Select.Option value="upi">UPI</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="paidAmount" label="Amount">
            <InputNumber style={{ width: '100%' }} min={0} step={1} />
          </Form.Item>
          <Form.Item name="paidRef" label="Reference / UTR">
            <Input placeholder="Transaction reference (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Line */}
      <Modal
        open={!!editRow}
        title={editRow ? `Edit - ${staffMap[editRow.userId || editRow.user_id] || 'User'}` : 'Edit'}
        onCancel={() => setEditRow(null)}
        onOk={submitEdit}
        width={800}
        okButtonProps={{ disabled: cycle?.status === 'PAID' }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="INCLUDED">INCLUDED</Select.Option>
              <Select.Option value="EXCLUDED">EXCLUDED</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="earnings" label="Earnings (JSON)">
            <Input.TextArea rows={4} spellCheck={false} />
          </Form.Item>
          <Form.Item name="incentives" label="Incentives (JSON)">
            <Input.TextArea rows={3} spellCheck={false} />
          </Form.Item>
          <Form.Item name="deductions" label="Deductions (JSON)">
            <Input.TextArea rows={4} spellCheck={false} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Line */}
      <Modal
        open={!!viewRow}
        title={viewRow ? (staffMap[viewRow.userId || viewRow.user_id] || `User #${viewRow.userId || viewRow.user_id}`) : 'View'}
        onCancel={() => setViewRow(null)}
        footer={<Button onClick={() => setViewRow(null)}>Close</Button>}
        width={700}
      >
        {viewRow && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Gross">₹{Number(viewRow?.totals?.grossSalary || 0).toLocaleString('en-IN')}</Descriptions.Item>
            <Descriptions.Item label="Net">₹{Number(viewRow?.totals?.netSalary || 0).toLocaleString('en-IN')}</Descriptions.Item>
            <Descriptions.Item label="Earnings">₹{Number(viewRow?.totals?.totalEarnings || 0).toLocaleString('en-IN')}</Descriptions.Item>
            <Descriptions.Item label="Deductions">₹{Number(viewRow?.totals?.totalDeductions || 0).toLocaleString('en-IN')}</Descriptions.Item>
            <Descriptions.Item label="Ratio" span={2}>{Number(viewRow?.totals?.ratio ?? 1).toFixed(4)}</Descriptions.Item>
            <Descriptions.Item label="Present">{viewRow?.attendanceSummary?.present || 0}</Descriptions.Item>
            <Descriptions.Item label="Half">{viewRow?.attendanceSummary?.half || 0}</Descriptions.Item>
            <Descriptions.Item label="Leave">{viewRow?.attendanceSummary?.leave || 0}</Descriptions.Item>
            <Descriptions.Item label="Absent">{viewRow?.attendanceSummary?.absent || 0}</Descriptions.Item>
            <Descriptions.Item label="Weekly Off">{viewRow?.attendanceSummary?.weeklyOff || 0}</Descriptions.Item>
            <Descriptions.Item label="Holiday">{viewRow?.attendanceSummary?.holidays || 0}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Layout>
  );
}