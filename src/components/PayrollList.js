import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Card,
  Button,
  Typography,
  Menu,
  message,
  Table,
  Select,
  Space,
  Modal,
  Descriptions,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Tag,
  Row,
  Col
} from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
// import { jsPDF } from 'jspdf'; // Removed client-side generation
import moment from 'moment';
import Sidebar from './Sidebar';
import api, { API_BASE_URL } from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function PayrollList() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Month Selection State
  const [value, setValue] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Payroll Logic State (from PayrollCycle.js)
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState(null);
  const [lines, setLines] = useState([]);
  const [staffMap, setStaffMap] = useState({});

  // Row selection + view/edit state
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [baseData, setBaseData] = useState({ earnings: {}, incentives: {}, deductions: {} });

  // Forms
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const monthText = useMemo(() => {
    const [y, m] = value.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [value]);

  // Load Staff Map
  const loadStaffMap = useCallback(async () => {
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

  // Load Cycle Data
  const loadCycle = useCallback(async () => {
    try {
      setLoading(true);
      // Use 'value' (YYYY-MM) as monthKey
      const res = await api.get('/admin/payroll', { params: { monthKey: value } });
      if (res?.data?.success) {
        setCycle(res.data.cycle); // might be null if not created yet? usually returns draft if exists or null
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
        // If success is false, maybe just no cycle found, reset state
        setCycle(null);
        setLines([]);
        // Don't show error, just empty state is fine if not generated
      }
    } catch (e) {
      // message.error('Failed to load cycle');
      setCycle(null);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [value]);

  useEffect(() => {
    loadStaffMap();
    loadCycle();
  }, [loadCycle, loadStaffMap]);

  // Actions
  const onOpenCycle = async () => {
    // This button logic might now simply mean "Compute/Create" if cycle doesn't exist
    // But backend logic typically requires "Compute" to create lines if draft exists
    // If cycle doesn't exist, we might need to trigger creation.
    // The previous "Open Cycle" button just navigated.
    // Let's assume onCompute handles creation/computation.
    await loadCycle();
  };

  const onCompute = async () => {
    try {
      // If cycle doesn't exist, we might need a way to create it first?
      // Usually compute endpoint handles specific cycle ID.
      // If cycle is null, we can't compute properly unless we have an endpoint to "start" a cycle.
      // Checking backend... usually GET /admin/payroll with monthKey works.
      // If cycle is null, we might need to create it.
      // Let's check if we have a cycle object. modification: if cycle is null but we want to compute,
      // we might need to create it first. But let's see if GET returns a partial cycle or if we need to POST.
      // Previously validation was `if (!cycle) ...`.
      // If the UI shows "Compute" only when cycle exists, how do we start?
      // The GET endpoint usually returns the cycle if it exists.
      // If it doesn't exist, we might need to "Initialize" it.
      // Let's try calling compute on the cycle ID. If cycle is null, we can't.

      // Additional Logic: If cycle is null, maybe there's an endpoint to create?
      // Or maybe GET /admin/payroll creates it if missing?
      // If not, we might need a button "Start Cycle" which calls an endpoint.
      // For now, let's assume if cycle is null, we can't compute.
      // But typically "Open Cycle" implying "checking/viewing".

      if (!cycle) {
        // Try to find if there's a "create" endpoint.
        // If not, maybe compute creates it? But compute needs cycleId.
        // Let's look at previous checks.
        message.warning('Cycle not found. Please ensure cycle is initialized.');
        return;
      }

      if (cycle?.status === 'LOCKED' || cycle?.status === 'PAID') {
        message.warning('Cycle is locked/paid'); return;
      }
      setLoading(true);
      const res = await api.post(`/admin/payroll/${cycle.id}/compute`);
      if (res?.data?.success) {
        // ... same normalization ...
        const raw = Array.isArray(res.data.lines) ? res.data.lines : [];
        const parseMaybe = (v) => { /* ... */
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
        // Refresh cycle status too just in case
        loadCycle();
      } else {
        message.error('Compute failed');
      }
    } catch (e) {
      message.error('Compute failed');
    } finally {
      setLoading(false);
    }
  };

  const onGeneratePayroll = async () => {
    try {
      setLoading(true);

      // Step 1: Ensure cycle exists (GET /admin/payroll creates if missing)
      const monthKey = value; // value is already in YYYY-MM format
      const cycleRes = await api.get('/admin/payroll', { params: { monthKey } });

      if (!cycleRes?.data?.success) {
        message.error('Failed to create/get payroll cycle');
        return;
      }

      const fetchedCycle = cycleRes.data.cycle;
      setCycle(fetchedCycle);

      // Step 2: Compute payroll lines
      const computeRes = await api.post(`/admin/payroll/${fetchedCycle.id}/compute`);

      if (computeRes?.data?.success) {
        const raw = Array.isArray(computeRes.data.lines) ? computeRes.data.lines : [];
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
        message.success(`Payroll generated for ${monthKey} (${normalized.length} employees)`);
        loadCycle(); // Refresh cycle status
      } else {
        message.error('Failed to compute payroll');
      }
    } catch (e) {
      console.error('Generate payroll error:', e);
      message.error('Failed to generate payroll');
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
      if (res?.data?.success) {
        setCycle(res.data.cycle);
        message.success('Marked as paid');
        loadCycle();
      }
      else message.error('Mark paid failed');
    } catch (_) { message.error('Mark paid failed'); } finally { setLoading(false); }
  };

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

  const openBulkPaid = async () => {
    if (!cycle) return;
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.warning('Select at least one line');
      return;
    }
    try {
      setLoading(true);
      // Direct payment without popup
      const payload = {
        lineIds: selectedRowKeys,
        paidAt: new Date().toISOString(),
        paidMode: 'CASH',
        paidRef: null,
        paidAmount: null, // Use net salary from payroll line
      };
      const res = await api.post(`/admin/payroll/${cycle.id}/lines/mark-paid`, payload);
      if (res?.data?.success) {
        message.success(`Marked paid for ${res.data.updated} employees`);
        setSelectedRowKeys([]);
        // Refresh data
        loadCycle();
      } else {
        message.error('Failed to mark paid');
      }
    } catch (e) {
      message.error('Failed to mark paid');
    } finally {
      setLoading(false);
    }
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

    // Calculate accurate ratio from attendance to reverse-engineer BASE values
    const acc = row?.attendanceSummary || {};
    const [year, month] = (cycle?.monthKey || '').split('-').map(Number);
    const dMonth = new Date(year, month, 0).getDate();
    const pUnits = (Number(acc.present || 0)) + (Number(acc.half || 0) * 0.5) + (Number(acc.paidLeave || 0)) + (Number(acc.weeklyOff || 0)) + (Number(acc.holidays || 0));
    const calculatedRatio = dMonth > 0 ? pUnits / dMonth : 1;

    // Use calculated ratio if > 0.001, otherwise fallback to stored ratio or 1
    const currentRatio = calculatedRatio > 0.001 ? calculatedRatio : Number(row?.totals?.ratio ?? 1);

    const reverse = (obj) => {
      const res = {};
      Object.entries(obj || {}).forEach(([k, v]) => {
        // If currentRatio is too low, we can't reverse; just keep current
        res[k] = currentRatio > 0.001 ? Number(v || 0) / currentRatio : Number(v || 0);
      });
      return res;
    };

    let bE = reverse(row?.earnings);
    let bI = reverse(row?.incentives);
    let bD = reverse(row?.deductions);

    // If baseEarnings is zero (because of 0 attendance), fallback to User Package
    const sum = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    if (sum(bE) === 0 && row.user) {
      const u = row.user;
      const parseMaybe = (v) => {
        if (!v) return v;
        if (typeof v !== 'string') return v;
        try { v = JSON.parse(v); } catch { return v; }
        return v;
      };
      const sv = parseMaybe(u.salaryValues || u.salary_values);
      const svRootE = (sv?.earnings && typeof sv.earnings === 'object') ? sv.earnings : null;
      const svRootI = (sv?.incentives && typeof sv.incentives === 'object') ? sv.incentives : null;
      const svRootD = (sv?.deductions && typeof sv.deductions === 'object') ? sv.deductions : null;

      bE = svRootE || {
        basic_salary: Number(u.basicSalary || 0),
        hra: Number(u.hra || 0),
        da: Number(u.da || 0),
        special_allowance: Number(u.specialAllowance || 0),
        conveyance_allowance: Number(u.conveyanceAllowance || 0),
        medical_allowance: Number(u.medicalAllowance || 0),
        telephone_allowance: Number(u.telephoneAllowance || 0),
        other_allowances: Number(u.otherAllowances || 0),
      };
      bI = svRootI || {};
      bD = svRootD || {
        provident_fund: Number(u.pfDeduction || 0),
        esi: Number(u.esiDeduction || 0),
        professional_tax: Number(u.professionalTax || 0),
        tds: Number(u.tdsDeduction || 0),
        other_deductions: Number(u.otherDeductions || 0),
      };
    }

    setBaseData({ earnings: bE, incentives: bI, deductions: bD });

    const toArr = (obj) => Object.entries(obj || {}).map(([k, v]) => ({
      name: k,
      amount: Math.ceil(Number(v || 0))
    }));

    const att = row?.attendanceSummary || {};

    editForm.setFieldsValue({
      status: row?.status || 'INCLUDED',
      remarks: row?.remarks || '',
      earnings: toArr(row?.earnings),
      incentives: toArr(row?.incentives),
      deductions: toArr(row?.deductions),
      present: att.present || 0,
      half: att.half || 0,
      leave: att.leave || 0,
      paidLeave: att.paidLeave || 0,
      unpaidLeave: att.unpaidLeave || 0,
      absent: att.absent || 0,
      weeklyOff: att.weeklyOff || 0,
      holidays: att.holidays || 0,
    });
  };

  const submitEdit = async () => {
    if (!cycle || !editRow) return;
    try {
      const vals = await editForm.validateFields();

      // Helper to convert array back to object
      const toObj = (arr) => {
        if (!arr || !Array.isArray(arr)) return {};
        const res = {};
        arr.forEach(i => {
          if (i && i.name) res[i.name] = Number(i.amount || 0);
        });
        return res;
      };

      const earnings = toObj(vals.earnings);
      const incentives = toObj(vals.incentives);
      const deductions = toObj(vals.deductions);

      const attendanceSummary = {
        ...(editRow.attendanceSummary || {}),
        present: Number(vals.present || 0),
        half: Number(vals.half || 0),
        leave: Number(vals.leave || 0),
        paidLeave: Number(vals.paidLeave || 0),
        unpaidLeave: Number(vals.unpaidLeave || 0),
        absent: Number(vals.absent || 0),
        weeklyOff: Number(vals.weeklyOff || 0),
        holidays: Number(vals.holidays || 0),
        // We do NOT recalculate ratio here for money, but maybe for record keeping?
        // Let's keep the user's manual attendance as record.
      };

      // Totals Recalculation (Ratio = 1)
      const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0);
      const totalEarnings = sum(earnings);
      const totalIncentives = sum(incentives);
      const totalDeductions = sum(deductions);
      const grossSalary = totalEarnings + totalIncentives;
      const netSalary = grossSalary - totalDeductions;

      const totals = {
        ...editRow.totals,
        grossSalary,
        totalEarnings,
        totalIncentives,
        totalDeductions,
        netSalary,
        ratio: 1, // FORCE RATIO TO 1 as these are now fixed manual values
      };

      const payload = {
        status: vals.status || editRow.status || 'INCLUDED',
        remarks: vals.remarks,
        earnings,
        incentives,
        deductions,
        attendanceSummary,
        totals,
        isManual: true, // Flag as manually edited to prevent auto-recompute overwrites
      };

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

  const generatePayslipPDF = async (payrollLine) => {
    try {
      if (!cycle || !payrollLine) {
        message.error('Payroll data not available');
        return;
      }

      setLoading(true);
      const res = await api.post('/admin/payroll/generate-payslip', {
        userId: payrollLine.userId || payrollLine.user_id,
        monthKey: cycle.monthKey
      });

      if (res.data?.success) {
        message.success('Payslip generated and saved successfully');
        await loadCycle();
      } else {
        message.error(res.data?.message || 'Failed to generate');
      }
    } catch (e) {
      console.error('Payslip API error:', e);
      message.error('Failed to generate payslip');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Check if user has payroll line, if not show 'Generate'
  // We need to merge staffMap with lines to show all eligible staff
  const combinedData = useMemo(() => {
    if (!cycle) return [];

    // Convert lines to map for easy lookup
    const lineMap = {};
    lines.forEach(line => {
      lineMap[line.userId || line.user_id] = line;
    });

    // Create rows for all active staff
    const rows = [];
    Object.entries(staffMap).forEach(([id, name]) => {
      const line = lineMap[id];
      if (line) {
        rows.push({ ...line, _status: 'GENERATED' }); // Existing line
      } else {
        // Placeholder for staff without payroll
        rows.push({
          userId: Number(id),
          totals: { grossSalary: 0, totalEarnings: 0, totalDeductions: 0, netSalary: 0 },
          _status: 'NOT_GENERATED'
        });
      }
    });
    return rows;
  }, [cycle, lines, staffMap]);



  const columns = [
    { title: 'Employee', key: 'emp', render: (_, r) => staffMap[r.userId || r.user_id] || (r.userId || r.user_id) },
    { title: 'Gross', dataIndex: ['totals', 'grossSalary'], key: 'gross', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    {
      title: 'Earnings',
      dataIndex: ['totals', 'totalEarnings'],
      key: 'earnings',
      render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`
    },
    { title: 'Deductions', dataIndex: ['totals', 'totalDeductions'], key: 'deductions', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'Net', dataIndex: ['totals', 'netSalary'], key: 'net', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    {
      title: 'Actions', key: 'actions', render: (_, r) => {
        if (r._status === 'NOT_GENERATED') {
          return <Text type="secondary">Not Generated</Text>;
        }

        // Construct View Link if path exists
        let viewLink = null;
        if (r.payslipPath) {
          // Ensure it starts with /
          const p = r.payslipPath.startsWith('/') ? r.payslipPath : '/' + r.payslipPath;
          viewLink = `${API_BASE_URL}${p}`;
        }

        return (
          <Space>
            <Button size="small" icon={<MenuUnfoldOutlined />} onClick={() => onOpenEdit(r)}>Edit</Button>
            <Button size="small" onClick={() => setViewRow(r)}>View</Button>
            {viewLink ? (
              <>
                <Button size="small" href={viewLink} target="_blank">View Payslip</Button>
                <Button size="small" type="default" onClick={() => generatePayslipPDF(r)}>Regenerate</Button>
              </>
            ) : (
              <Button size="small" type="primary" onClick={() => generatePayslipPDF(r)}>Generate Payslip</Button>
            )}
          </Space>
        );
      }
    },
  ];

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
            <Title level={4} style={{ margin: 0 }}>Payroll</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
          />
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>

          {/* New Selection Header */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Text strong>Select Month:</Text>
              <input
                type="month"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{ padding: 6, border: '1px solid #E5E7EB', borderRadius: 6 }}
              />
            </div>

            {/* Actions for Cycle */}
            <Space>
              <Button onClick={onExportCSV} disabled={!cycle || lines.length === 0} loading={loading}>Export CSV</Button>
              <Button
                type="primary"
                onClick={onGeneratePayroll}
                loading={loading}
                disabled={loading || (cycle?.status === 'LOCKED' || cycle?.status === 'PAID')}
              >
                {lines.length > 0 ? 'Re-Generate Payroll' : 'Generate Payroll'}
              </Button>

              {cycle?.status === 'DRAFT' && (
                <Button onClick={onLock} disabled={!cycle || lines.length === 0} loading={loading}>Lock Cycle</Button>
              )}
              {cycle?.status === 'LOCKED' && (
                <>
                  <Button onClick={onUnlock} disabled={!cycle} loading={loading}>Unlock</Button>
                  <Button onClick={onMarkPaid} type="default" disabled={!cycle} loading={loading}>Mark All Paid</Button>
                  <Button onClick={openBulkPaid} type="primary" disabled={!cycle || selectedRowKeys.length === 0} loading={loading}>Mark Paid Selected</Button>
                </>
              )}
              {cycle?.status === 'PAID' && (
                <Tag color="green">Paid</Tag>
              )}
            </Space>
          </div>

          {/* Content Area */}
          {loading && !lines.length ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading payroll data...</Text></div>
          ) : (!cycle && !loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Text type="secondary">No payroll cycle found for {monthText}.</Text>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={onCompute}>Create Payroll Cycle</Button>
              </div>
            </div>
          ) : (
            <Card bodyStyle={{ padding: 0 }}>
              <Table
                columns={columns}
                dataSource={combinedData}
                rowKey={(r) => r.id || `${r.cycleId}-${r.userId}`}
                rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
                loading={loading}
                pagination={{ pageSize: 20 }}
                scroll={{ y: 'calc(100vh - 250px)' }}
              />
            </Card>
          ))}

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

      {/* Edit Line (Hidden for now as not requested in UI but good to keep logic if needed or can remove) */}
      <Modal
        open={!!editRow}
        title={editRow ? `Edit - ${staffMap[editRow.userId || editRow.user_id] || 'User'}` : 'Edit'}
        onCancel={() => setEditRow(null)}
        onOk={submitEdit}
        width={800}
        okButtonProps={{ disabled: cycle?.status === 'PAID' }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onValuesChange={(changed, all) => {
            const attKeys = ['present', 'half', 'leave', 'paidLeave', 'unpaidLeave', 'holidays', 'weeklyOff'];
            const isAttChange = Object.keys(changed).some(k => attKeys.includes(k));

            if (isAttChange && cycle && cycle.monthKey) {
              const [y, m] = cycle.monthKey.split('-').map(Number);
              const daysInMonth = new Date(y, m, 0).getDate();

              let p = Number(all.present || 0);
              let h = Number(all.half || 0);
              let pl = Number(all.paidLeave || 0);
              let ul = Number(all.unpaidLeave || 0);
              let wo = Number(all.weeklyOff || 0);
              let ho = Number(all.holidays || 0);

              // Auto-sync Total Leave if Paid/Unpaid changed
              if (changed.paidLeave !== undefined || changed.unpaidLeave !== undefined) {
                editForm.setFieldsValue({ leave: pl + ul });
              }
              // Auto-sync Paid/Unpaid if Total Leave changed (assume all paid by default)
              if (changed.leave !== undefined) {
                pl = Number(all.leave || 0);
                ul = 0;
                editForm.setFieldsValue({ paidLeave: pl, unpaidLeave: ul });
              }

              const totalLeave = Number(editForm.getFieldValue('leave') || 0);

              // Auto-calculate Absent
              const absent = Math.max(0, daysInMonth - (p + h + totalLeave + wo + ho));
              editForm.setFieldsValue({ absent });

              // Calculate new ratio
              const payableDays = p + (h * 0.5) + pl + wo + ho;
              const newRatio = daysInMonth > 0 ? Math.min(1, Math.max(0, payableDays / daysInMonth)) : 1;

              // Update Earnings, Incentives, and Deductions based on BASE values
              const eArr = Object.entries(baseData.earnings).map(([k, v]) => ({
                name: k,
                amount: Math.round(Number(v || 0) * newRatio)
              }));

              const iArr = Object.entries(baseData.incentives).map(([k, v]) => ({
                name: k,
                amount: Math.round(Number(v || 0) * newRatio)
              }));

              const dArr = Object.entries(baseData.deductions).map(([k, v]) => ({
                name: k,
                amount: Math.round(Number(v || 0) * newRatio)
              }));

              editForm.setFieldsValue({
                earnings: eArr,
                incentives: iArr,
                deductions: dArr
              });
            }
          }}
        >
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Card size="small" title="Attendance Summary" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              <Col span={6}><Form.Item name="present" label="Present"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="half" label="Half Day"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="leave" label="Total Leave"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="absent" label="Absent"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="paidLeave" label="Paid Leave"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="unpaidLeave" label="Unpaid Leave"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="weeklyOff" label="Weekly Off"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="holidays" label="Holidays"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          </Card>
          <div style={{ marginBottom: 16 }}>
            <Card size="small" title="Earnings">
              <Form.List name="earnings">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={12}><Form.Item {...rest} name={[name, 'name']} noStyle><Input placeholder="Name" /></Form.Item></Col>
                        <Col span={9}><Form.Item {...rest} name={[name, 'amount']} noStyle><InputNumber style={{ width: '100%' }} placeholder="Amount" /></Form.Item></Col>
                        <Col span={3}><MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /></Col>
                      </Row>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Earning</Button>
                  </>
                )}
              </Form.List>
            </Card>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Card size="small" title="Incentives">
              <Form.List name="incentives">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={12}><Form.Item {...rest} name={[name, 'name']} noStyle><Input placeholder="Name" /></Form.Item></Col>
                        <Col span={9}><Form.Item {...rest} name={[name, 'amount']} noStyle><InputNumber style={{ width: '100%' }} placeholder="Amount" /></Form.Item></Col>
                        <Col span={3}><MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /></Col>
                      </Row>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Incentive</Button>
                  </>
                )}
              </Form.List>
            </Card>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Card size="small" title="Deductions">
              <Form.List name="deductions">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={12}><Form.Item {...rest} name={[name, 'name']} noStyle><Input placeholder="Name" /></Form.Item></Col>
                        <Col span={9}><Form.Item {...rest} name={[name, 'amount']} noStyle><InputNumber style={{ width: '100%' }} placeholder="Amount" /></Form.Item></Col>
                        <Col span={3}><MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /></Col>
                      </Row>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Deduction</Button>
                  </>
                )}
              </Form.List>
            </Card>
          </div>
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
