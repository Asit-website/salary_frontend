import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, Typography, Space, Menu, Dropdown, Tag, Row, Col, Modal, Form, Input, DatePicker, Select, Switch, message, Table, Radio, TimePicker, Collapse, InputNumber, Divider, Tabs, Upload, Popconfirm } from 'antd';
import { ArrowLeftOutlined, MoreOutlined, UserOutlined, FileTextOutlined, CalendarOutlined, DollarOutlined, FileProtectOutlined, InboxOutlined, DownloadOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const sections = [
  { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
  { key: 'attendance', label: 'Attendance', icon: <CalendarOutlined /> },
  { key: 'salaryOverview', label: 'Salary Overview', icon: <DollarOutlined /> },
  { key: 'salaryStructure', label: 'Salary Structure', icon: <FileTextOutlined /> },
  { key: 'loans', label: 'Loans', icon: <FileProtectOutlined /> },
  { key: 'leaves', label: "Leave(s)", icon: <CalendarOutlined /> },
  { key: 'expenseClaims', label: 'Expense Claims', icon: <InboxOutlined /> },
  { key: 'documents', label: 'Document Centre', icon: <FileTextOutlined /> },
];

export default function StaffProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();
  const [attMonth, setAttMonth] = useState(dayjs());
  const [attLoading, setAttLoading] = useState(false);
  const [attRows, setAttRows] = useState([]);
  const [markOpen, setMarkOpen] = useState(false);
  const [markForm] = Form.useForm();
  const [salaryEditOpen, setSalaryEditOpen] = useState(false);
  const [salaryForm] = Form.useForm();
  const [salaryMonths, setSalaryMonths] = useState([]);
  const [monthsCount, setMonthsCount] = useState(5);
  const [activeMonthKey, setActiveMonthKey] = useState(dayjs().format('YYYY-MM'));
  const [salaryCalcMode, setSalaryCalcMode] = useState('calendar');
  const [loans, setLoans] = useState([]);
  const [loanSummary, setLoanSummary] = useState({ totalLoan: 0, totalPayment: 0, balance: 0 });
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanEntryType, setLoanEntryType] = useState('loan');
  const [loanForm] = Form.useForm();
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimForm] = Form.useForm();
  const [claimFile, setClaimFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docForm] = Form.useForm();
  const [docFile, setDocFile] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [effectiveTemplate, setEffectiveTemplate] = useState(null);

  // Helpers for salary values at component scope
  const netFromValues = (vals) => {
    try {
      if (!vals || typeof vals !== 'object') return 0;
      const e = vals.earnings || {};
      const d = vals.deductions || {};
      const se = Object.values(e).reduce((s, v) => s + (Number(v) || 0), 0);
      const sd = Object.values(d).reduce((s, v) => s + (Number(v) || 0), 0);
      return se - sd;
    } catch { return 0; }
  };

  // Shared helpers for salary structure edit
  const prefEarn = ['basic_salary','hra','da','special_allowance','travel_allowance','conveyance_allowance','medical_allowance','telephone_allowance','bonus','overtime'];
  const prefDed = ['provident_fund','esi','professional_tax','income_tax','loan_deduction','other_deductions'];
  const toEntries = (obj) => Object.entries(obj || {});
  const orderByPref = (entries, pref) => {
    const map = new Map(entries);
    const used = new Set();
    const ordered = [];
    pref.forEach(k => { if (map.has(k)) { ordered.push([k, map.get(k)]); used.add(k); } });
    entries.forEach(([k,v]) => { if (!used.has(k)) ordered.push([k,v]); });
    return ordered;
  };

  const openEditSalary = () => {
    // If editing from Salary Overview and a month override exists, prefill from that month
    const parseSV = (u) => {
      let svRaw = u?.salaryValues;
      if (typeof svRaw === 'string') { try { svRaw = JSON.parse(svRaw); } catch { /* keep */ } }
      if (typeof svRaw === 'string') { try { svRaw = JSON.parse(svRaw); } catch { svRaw = null; } }
      return svRaw && typeof svRaw === 'object' ? svRaw : null;
    };
    let sv = null;
    if (activeKey === 'salaryOverview' && activeMonthKey) {
      const svRaw = parseSV(staff || {});
      const mstore = svRaw && svRaw.months ? svRaw.months[activeMonthKey] : null;
      if (mstore && typeof mstore === 'object') {
        const e = (mstore.earnings && typeof mstore.earnings === 'object') ? mstore.earnings : {};
        const d = (mstore.deductions && typeof mstore.deductions === 'object') ? mstore.deductions : {};
        sv = { earnings: e, deductions: d };
      }
    }
    if (!sv) sv = extractSV(staff || {});
    const earningsEntries = orderByPref(toEntries(sv.earnings), prefEarn);
    const deductionEntries = orderByPref(toEntries(sv.deductions), prefDed);
    salaryForm.setFieldsValue({
      earnings: earningsEntries.map(([k,v]) => ({ name: k, amount: Number(v)||0 })),
      deductions: deductionEntries.map(([k,v]) => ({ name: k, amount: Number(v)||0 })),
    });
    setSalaryEditOpen(true);
  };

  const saveSalary = async () => {
    try {
      const v = await salaryForm.validateFields();
      const toObj = (arr=[]) => arr.reduce((o, it) => { if (it?.name) o[it.name] = Number(it.amount)||0; return o; }, {});
      const salaryValues = { earnings: toObj(v.earnings), deductions: toObj(v.deductions) };
      const payload = { salaryValues };
      // If saving from Salary Overview, send the visible month key (e.g., 'YYYY-MM')
      if (activeKey === 'salaryOverview' && activeMonthKey) {
        payload.monthKey = activeMonthKey;
      }
      await api.put(`/admin/staff/${id}/salary`, payload);
      message.success('Salary structure updated');
      setSalaryEditOpen(false);
      const res = await api.get(`/admin/staff/${id}`);
      if (res.data?.success) setStaff(res.data.staff);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to update salary');
    }
  };
  const extractSV = (u) => {
    let sv = u?.salaryValues;
    if (typeof sv === 'string') {
      try { sv = JSON.parse(sv); } catch { sv = null; }
    }
    // Helper to build base from numeric columns
    const baseFromNumerics = () => {
      const e = {}; const d = {};
      const camelMap = {
        basic_salary: 'basicSalary',
        hra: 'hra',
        da: 'da',
        special_allowance: 'specialAllowance',
        travel_allowance: 'travelAllowance',
        conveyance_allowance: 'conveyanceAllowance',
        medical_allowance: 'medicalAllowance',
        telephone_allowance: 'telephoneAllowance',
        bonus: 'bonus',
        overtime: 'overtime',
        provident_fund: 'providentFund',
        esi: 'esi',
        professional_tax: 'professionalTax',
        income_tax: 'incomeTax',
        loan_deduction: 'loanDeduction',
        other_deductions: 'otherDeductions',
      };
      const pick = (snakeKey) => {
        const camelKey = camelMap[snakeKey];
        const v1 = Number(u?.[snakeKey]);
        const v2 = camelKey ? Number(u?.[camelKey]) : 0;
        return Number.isFinite(v1) && v1 !== 0 ? v1 : (Number.isFinite(v2) ? v2 : 0);
      };
      const earnKeys = ['basic_salary','hra','da','special_allowance','travel_allowance','conveyance_allowance','medical_allowance','telephone_allowance','bonus','overtime'];
      earnKeys.forEach(k => { const v = pick(k); if (v) e[k] = v; });
      const dedKeys = ['provident_fund','esi','professional_tax','income_tax','loan_deduction','other_deductions'];
      dedKeys.forEach(k => { const v = pick(k); if (v) d[k] = v; });
      return { earnings: e, deductions: d };
    };
    if (sv && typeof sv === 'object') {
      // Ensure keys exist
      if (!sv.earnings) sv.earnings = {};
      if (!sv.deductions) sv.deductions = {};
      // If base earnings/deductions are empty, derive from numeric columns as fallback
      let noBaseEarn = !sv.earnings || Object.keys(sv.earnings).length === 0;
      let noBaseDed = !sv.deductions || Object.keys(sv.deductions).length === 0;
      if (noBaseEarn || noBaseDed) {
        const base = baseFromNumerics();
        if (noBaseEarn) sv.earnings = base.earnings;
        if (noBaseDed) sv.deductions = base.deductions;
        noBaseEarn = !sv.earnings || Object.keys(sv.earnings).length === 0;
        noBaseDed = !sv.deductions || Object.keys(sv.deductions).length === 0;
      }
      // If still empty and months exist, copy from most recent month entry
      if ((noBaseEarn || noBaseDed) && sv.months && typeof sv.months === 'object') {
        const keys = Object.keys(sv.months).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
        const pickKey = (sv.lastUpdatedMonth || sv.lastUpdatedMonthKey || keys[keys.length - 1]);
        const m = pickKey ? sv.months[pickKey] : null;
        if (m && typeof m === 'object') {
          const me = (m.earnings && typeof m.earnings === 'object') ? m.earnings : {};
          const md = (m.deductions && typeof m.deductions === 'object') ? m.deductions : {};
          if (noBaseEarn) sv.earnings = me;
          if (noBaseDed) sv.deductions = md;
        }
      }
      return sv;
    }
    return baseFromNumerics();
  };

  // Parse raw salaryValues (handles double-encoded)
const parseSVRaw = (u) => {
  let sv = u?.salaryValues;
  if (typeof sv === 'string') { try { sv = JSON.parse(sv); } catch { /* keep */ } }
  if (typeof sv === 'string') { try { sv = JSON.parse(sv); } catch { sv = null; } }
  return sv && typeof sv === 'object' ? sv : null;
};

// Return values for specific month if override exists; else base values
const getMonthSV = (u, ymKey) => {
  const base = extractSV(u || {});
  const raw = parseSVRaw(u || {});
  if (raw && raw.months && ymKey && raw.months[ymKey]) {
    const m = raw.months[ymKey] || {};
    const e = (m.earnings && typeof m.earnings === 'object') ? m.earnings : {};
    const d = (m.deductions && typeof m.deductions === 'object') ? m.deductions : {};
    return { earnings: e, deductions: d };
  }
  return base;
};
  // Compute salary months when viewing Salary Overview or staff/length changes
  useEffect(() => {
    // Load organization salary calculation settings once
    (async () => {
      try {
        const r = await api.get('/admin/settings/salary');
        const m = r?.data?.settings?.mode || 'calendar';
        setSalaryCalcMode(m);
      } catch (_) {
        setSalaryCalcMode('calendar');
      }
    })();
    const run = async () => {
      if (activeKey !== 'salaryOverview' || !staff) return;
      const baseMonth = dayjs();
      const svBase = extractSV(staff || {});
      // Parse raw salaryValues for month overrides
      const parseSV = (u) => {
        let svRaw = u?.salaryValues;
        if (typeof svRaw === 'string') { try { svRaw = JSON.parse(svRaw); } catch { /* keep */ } }
        if (typeof svRaw === 'string') { try { svRaw = JSON.parse(svRaw); } catch { svRaw = null; } }
        return svRaw && typeof svRaw === 'object' ? svRaw : null;
      };
      const svRaw = parseSV(staff || {});
      const baseNet = netFromValues(svBase) || 0;
      const list = [];
      for (let i = 0; i < monthsCount; i += 1) {
        const m = baseMonth.subtract(i, 'month');
        const ym = m.format('YYYY-MM');
        const start = m.startOf('month');
        const end = m.endOf('month');
        const isCurrent = m.isSame(dayjs(), 'month');
        // Prefer stored month totals if present, else call unified compute endpoint
        const monthStore = svRaw && svRaw.months ? svRaw.months[ym] : null;
        let amount = baseNet;
        if (monthStore && typeof monthStore === 'object' && monthStore.totals) {
          const t = monthStore.totals || {};
          amount = Number(t.netSalary || (Number(t.totalEarnings||0) + Number(t.totalIncentives||0) - Number(t.totalDeductions||0))) || 0;
        } else {
          try {
            const comp = await api.get(`/admin/staff/${id}/salary-compute`, { params: { monthKey: ym } });
            if (comp.data?.success) {
              amount = Number(comp.data?.totals?.netSalary || 0);
            } else {
              amount = baseNet;
            }
          } catch (_) {
            amount = baseNet;
          }
        }
        list.push({
          key: ym,
          title: m.format('MMMM YYYY'),
          range: `${start.format('DD MMM YYYY')} – ${end.format('DD MMM YYYY')}`,
          amount,
          dueAmount: isCurrent ? baseNet : 0,
        });
      }
      setSalaryMonths(list);
    };
    run();
  }, [activeKey, staff, id, monthsCount]);

  // Loans data loader
  useEffect(() => {
    const loadLoans = async () => {
      if (activeKey !== 'loans' || !staff) return;
      try {
        const [listRes, sumRes] = await Promise.all([
          api.get(`/admin/staff/${id}/loans`),
          api.get(`/admin/staff/${id}/loans/summary`),
        ]);
        if (listRes.data?.success) setLoans(listRes.data.data || []);
        if (sumRes.data?.success) setLoanSummary(sumRes.data);
      } catch (_) {
        setLoans([]);
        setLoanSummary({ totalLoan: 0, totalPayment: 0, balance: 0 });
      }
    };
    loadLoans();
  }, [activeKey, staff, id]);

  // Staff documents loader
  useEffect(() => {
    const loadDocs = async () => {
      if (activeKey !== 'documents' || !staff) return;
      try {
        setDocsLoading(true);
        const res = await api.get(`/admin/staff/${id}/documents`);
        if (res.data?.success) setDocuments(res.data.data || []); else setDocuments([]);
      } catch (_) {
        setDocuments([]);
      } finally {
        setDocsLoading(false);
      }
    };
    loadDocs();
  }, [activeKey, staff, id]);

  // Expense claims data loader
  useEffect(() => {
    const loadClaims = async () => {
      if (activeKey !== 'expenseClaims' || !staff) return;
      try {
        setClaimsLoading(true);
        const res = await api.get(`/admin/staff/${id}/expenses`);
        if (res.data?.success) setClaims(res.data.data || []); else setClaims([]);
      } catch (_) {
        setClaims([]);
      } finally {
        setClaimsLoading(false);
      }
    };
    loadClaims();
  }, [activeKey, staff, id]);

  // Leaves data loader
  useEffect(() => {
    const loadLeaves = async () => {
      if (activeKey !== 'leaves' || !staff) return;
      try {
        setLeavesLoading(true);
        const res = await api.get(`/admin/staff/${id}/leaves`);
        if (res.data?.success) setLeaves(res.data.data || []); else setLeaves([]);
      } catch (_) {
        setLeaves([]);
      } finally {
        setLeavesLoading(false);
      }
    };
    loadLeaves();
  }, [activeKey, staff, id]);

  // Auto-open Salary Structure editor when that tab is selected
  useEffect(() => {
    if (activeKey === 'salaryStructure' && staff) {
      openEditSalary();
    }
  }, [activeKey, staff]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/admin/staff/${id}`);
        if (res.data?.success) {
          setStaff(res.data.staff);
        } else {
          setStaff(null);
        }
      } catch (e) {
        setStaff(null);
      } finally {
        setLoading(false);
      }
    };

 
    load();
  }, [id]);

  // Load effective attendance template for this staff
  useEffect(() => {
    const loadTpl = async () => {
      try {
        const res = await api.get(`/admin/settings/attendance-templates/effective/${id}`);
        if (res.data?.success) setEffectiveTemplate(res.data.template || null);
        else setEffectiveTemplate(null);
      } catch (_) {
        setEffectiveTemplate(null);
      }
    };
    loadTpl();
  }, [id]);

   const exportMonth = () => {
    // Build CSV from attRows using the same duration/threshold logic displayed
    const header = ['Date','Staff Name','Check In','Check Out','Total Hours','Status'];
    const rows = attRows.map(r => {
      const dateStr = dayjs(r.date).format('DD MMM YYYY');
      const name = r.user?.name || staff?.profile?.name || '';
      const ci = r.checkIn || '';
      const co = r.checkOut || '';
      let status = r.status || 'absent';
      if (status !== 'leave') {
        if (ci && co) {
          const h = dayjs(co, 'HH:mm:ss').diff(dayjs(ci, 'HH:mm:ss'), 'minute')/60;
          status = h >= 4 ? 'present' : 'half_day';
        } else if (ci || co) status = 'half_day';
      }
      let hours = '';
      if (ci && co) {
        const h = dayjs(co, 'HH:mm:ss').diff(dayjs(ci, 'HH:mm:ss'), 'minute')/60;
        hours = `${h.toFixed(2)}h`;
      }
      return [dateStr, name, ci, co, hours, status.toUpperCase()];
    });
    const csv = [header, ...rows].map(line => line.map(v => String(v).replace(/"/g,'""')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-staff-${id}-${attMonth.format('YYYY-MM')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeKey === 'attendance') {
      fetchMonthAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, attMonth, id]);

  const fetchMonthAttendance = async () => {
    try {
      setAttLoading(true);
      const start = attMonth.startOf('month');
      const end = attMonth.endOf('month');
      const days = end.date();
      const requests = [];
      for (let d = 1; d <= days; d++) {
        const date = start.date(d).format('YYYY-MM-DD');
        requests.push(api.get('/admin/attendance', { params: { date, staffId: id } }));
      }
      const results = await Promise.allSettled(requests);
      const merged = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value?.data?.success) {
          const arr = Array.isArray(r.value.data.data) ? r.value.data.data : [];
          if (arr.length) merged.push(...arr);
        }
      });
      // Ensure we still show a row for days with no record? Keeping only existing entries for now
      setAttRows(merged);
    } catch (e) {
      message.error('Failed to load attendance');
      setAttRows([]);
    } finally {
      setAttLoading(false);
    }
  };

  const openMark = () => {
    markForm.resetFields();
    markForm.setFieldsValue({
      date: attMonth.date(1),
      status: 'present',
    });
    setMarkOpen(true);
  };

  const saveMark = async () => {
    try {
      const v = await markForm.validateFields();
      const payload = {
        staffId: Number(id),
        date: v.date?.format('YYYY-MM-DD'),
        status: v.status,
        checkIn: v.checkIn ? v.checkIn.format('HH:mm:ss') : null,
        checkOut: v.checkOut ? v.checkOut.format('HH:mm:ss') : null,
      };
      await api.post('/admin/attendance', payload);
      message.success('Attendance saved');
      setMarkOpen(false);
      fetchMonthAttendance();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save attendance');
    }
  };

  const initials = (staff?.name || 'U').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();

  const toggleActive = async () => {
    try {
      const next = !(staff?.active === true);
      // Try existing user update endpoint first
      try {
        await api.put(`/admin/staff/${id}`, { active: next });
      } catch (e) {
        try {
          // Fallback to query-based toggle
          await api.put(`/admin/staff/active`, { active: next }, { params: { id } });
        } catch (e2) {
          // Final fallback to path-based toggle
          await api.put(`/admin/staff/${id}/active`, { active: next });
        }
      }
      message.success(next ? 'Activated' : 'Deactivated');
      const res = await api.get(`/admin/staff/${id}`);
      if (res.data?.success) setStaff(res.data.staff);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to update status');
    }
  };

  const actionsMenu = {
    items: [
      { key: 'edit', label: 'Edit' },
      { key: 'toggle', label: staff?.active ? 'Deactivate' : 'Activate' },
    ],
    onClick: ({ key }) => {
      if (key === 'toggle') toggleActive();
      if (key === 'edit') openEdit();
    }
  };

  const headerRight = (
    <Space>
      <Dropdown menu={actionsMenu} placement="bottomRight">
        <Button icon={<MoreOutlined />}>
          Actions
        </Button>
      </Dropdown>
    </Space>
  );

  const profileSummary = (
    <Card style={{ marginBottom: 16 }} loading={loading}>
      <Row align="middle" justify="space-between">
        <Col>
          <Space align="center">
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0f5ff', color: '#125EC9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {initials}
            </div>
            <div>
              <Title level={5} style={{ margin: 0 }}>{staff?.profile?.name || 'Unknown'}</Title>
              <Text type="secondary">ID {staff?.profile?.staffId || 'N/A'} | {staff?.profile?.department || 'General'} | {staff?.active ? 'Active' : 'Inactive'}</Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Tag color={staff?.active ? 'green' : 'red'}>{staff?.active ? 'ACTIVE' : 'INACTIVE'}</Tag>
        </Col>
      </Row>
    </Card>
  );

  const openEdit = () => {
    const p = staff?.profile || {};
    form.setFieldsValue({
      name: p.name,
      email: p.email,
      phone: p.phone,
      designation: p.designation,
      department: p.department,
      staffType: p.staffType,
      dateOfJoining: p.dateOfJoining ? dayjs(p.dateOfJoining) : null,
      salaryCycleDate: p.salaryCycleDate ? dayjs(p.salaryCycleDate) : null,
      shiftSelection: p.shiftSelection,
      salaryDetailAccess: !!p.salaryDetailAccess,
      allowCurrentCycleSalaryAccess: !!p.allowCurrentCycleSalaryAccess,
      dob: p.dob ? dayjs(p.dob) : null,
      gender: p.gender,
      maritalStatus: p.maritalStatus,
      bloodGroup: p.bloodGroup,
      emergencyContact: p.emergencyContact,
      addressLine1: p.addressLine1,
      addressLine2: p.addressLine2,
      city: p.city,
      state: p.state,
      postalCode: p.postalCode,
      bankAccountHolderName: p.bankAccountHolderName,
      bankAccountNumber: p.bankAccountNumber,
      bankIfsc: p.bankIfsc,
      bankName: p.bankName,
      bankBranch: p.bankBranch,
      upiId: p.upiId,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      if (values.dateOfJoining) payload.dateOfJoining = values.dateOfJoining.format('YYYY-MM-DD');
      if (values.salaryCycleDate) payload.salaryCycleDate = values.salaryCycleDate.format('YYYY-MM-DD');
      if (values.dob) payload.dob = values.dob.format('YYYY-MM-DD');
      await api.put(`/admin/staff/${id}/profile`, payload);
      message.success('Profile updated');
      setEditOpen(false);
      // reload profile
      const res = await api.get(`/admin/staff/${id}`);
      if (res.data?.success) setStaff(res.data.staff);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to update profile');
    }
  };

  const renderSection = () => {
    if (activeKey === 'profile') {
      return (
        <>
          <Card title="Profile" extra={<Button onClick={openEdit}>Edit</Button>} loading={loading}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title="Profile Information">
                  <Row gutter={[8,8]}>
                    <Col span={12}><Text type="secondary">Name</Text><div>{staff?.profile?.name || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">ID</Text><div>{staff?.profile?.staffId || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Designation</Text><div>{staff?.profile?.designation || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Staff Type</Text><div>{staff?.profile?.staffType || 'Regular'}</div></Col>
                    <Col span={12}><Text type="secondary">Contact Number</Text><div>{staff?.profile?.phone || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Date of Joining</Text><div>{staff?.profile?.dateOfJoining || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Department</Text><div>{staff?.profile?.department || '-'}</div></Col>
                  </Row>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="General Information">
                  <Row gutter={[8,8]}>
                    <Col span={12}><Text type="secondary">Salary Cycle Date</Text><div>{staff?.profile?.salaryCycleDate || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Shift</Text><div>{staff?.profile?.shiftSelection || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Salary Access</Text><div>{staff?.profile?.allowCurrentCycleSalaryAccess ? 'Allow current cycle' : 'Restricted'}</div></Col>
                    <Col span={12}><Text type="secondary">Attendance Setting Template</Text><div>{staff?.profile?.attendanceSettingTemplate || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Effective Template</Text><div>{effectiveTemplate?.name || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Attendance Mode</Text><div>{(effectiveTemplate?.attendanceMode || '').replace(/_/g, ' ') || '-'}</div></Col>
                  </Row>
                </Card>
              </Col>
            </Row>
            <Row gutter={[16,16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <Card size="small" title="Personal Information">
                  <Row gutter={[8,8]}>
                    <Col span={12}><Text type="secondary">Email</Text><div>{staff?.profile?.email || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Gender</Text><div>{staff?.profile?.gender || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Date of Birth</Text><div>{staff?.profile?.dob || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Marital Status</Text><div>{staff?.profile?.maritalStatus || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Blood Group</Text><div>{staff?.profile?.bloodGroup || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Emergency Contact</Text><div>{staff?.profile?.emergencyContact || '-'}</div></Col>
                    <Col span={24}><Text type="secondary">Current Address</Text><div>{staff?.profile?.addressLine1 || ''} {staff?.profile?.addressLine2 || ''} {staff?.profile?.city || ''} {staff?.profile?.state || ''} {staff?.profile?.postalCode || ''}</div></Col>
                  </Row>
                </Card>
              </Col>
            </Row>
            <Row gutter={[16,16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <Card size="small" title="Bank Details">
                  <Row gutter={[8,8]}>
                    <Col span={12}><Text type="secondary">Bank Name</Text><div>{staff?.profile?.bankName || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Branch</Text><div>{staff?.profile?.bankBranch || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">IFSC</Text><div>{staff?.profile?.bankIfsc || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Account Number</Text><div>{staff?.profile?.bankAccountNumber || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Account Holder</Text><div>{staff?.profile?.bankAccountHolderName || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">UPI ID</Text><div>{staff?.profile?.upiId || '-'}</div></Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </Card>

          <Modal title="Edit Profile" open={editOpen} onCancel={() => setEditOpen(false)} onOk={saveEdit} okText="Save">
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="name" label="Name"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="designation" label="Designation"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="staffType" label="Staff Type"><Select allowClear options={[{value:'regular',label:'Regular'},{value:'contractual',label:'Contractual'},{value:'intern',label:'Intern'}]} /></Form.Item></Col>
                <Col span={12}><Form.Item name="phone" label="Contact Number"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
                <Col span={12}><Form.Item name="dateOfJoining" label="Date of Joining"><DatePicker style={{ width:'100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="salaryCycleDate" label="Salary Cycle Date"><DatePicker style={{ width:'100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="shiftSelection" label="Shift"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="attendanceSettingTemplate" label="Attendance Setting Template"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="salaryDetailAccess" label="Salary Detail Access" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col span={12}><Form.Item name="allowCurrentCycleSalaryAccess" label="Allow Current Cycle Salary Access" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col span={8}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width:'100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="gender" label="Gender"><Select allowClear options={[{value:'MALE',label:'Male'},{value:'FEMALE',label:'Female'},{value:'OTHER',label:'Other'}]} /></Form.Item></Col>
                <Col span={8}><Form.Item name="maritalStatus" label="Marital Status"><Select allowClear options={[{value:'SINGLE',label:'Single'},{value:'MARRIED',label:'Married'},{value:'OTHER',label:'Other'}]} /></Form.Item></Col>
                <Col span={8}><Form.Item name="bloodGroup" label="Blood Group"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="emergencyContact" label="Emergency Contact"><Input /></Form.Item></Col>
                <Col span={24}><Form.Item name="addressLine1" label="Address Line 1"><Input /></Form.Item></Col>
                <Col span={24}><Form.Item name="addressLine2" label="Address Line 2"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="city" label="City"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="state" label="State"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="postalCode" label="Postal Code"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="bankName" label="Bank Name"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="bankBranch" label="Bank Branch"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="bankIfsc" label="IFSC"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="bankAccountNumber" label="Account Number"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="bankAccountHolderName" label="Account Holder Name"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="upiId" label="UPI ID"><Input /></Form.Item></Col>
              </Row>
            </Form>
          </Modal>
        </>
      );
    }
    if (activeKey === 'expenseClaims') {
      const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
      const columns = [
        { title: 'Expense Type', dataIndex: 'expenseType', key: 'expenseType', render: (t) => t || '-' },
        { title: 'Claim ID', dataIndex: 'claimId', key: 'claimId', render: (t) => t || '-' },
        { title: 'Expense Date', dataIndex: 'expenseDate', key: 'expenseDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'Requested Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (a) => currency(a) },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => {
            const map = { pending: 'gold', approved: 'green', rejected: 'red', settled: 'blue' };
            return <Tag color={map[String(s)] || 'default'}>{String(s || 'pending').toUpperCase()}</Tag>;
          }
        },
        { title: 'Applied at', dataIndex: 'createdAt', key: 'createdAt', render: (d)=> d? dayjs(d).format('DD MMM YYYY'):'-' },
        { title: 'Approved at', dataIndex: 'approvedAt', key: 'approvedAt', render: (d)=> d? dayjs(d).format('DD MMM YYYY'):'-' },
        { title: 'Approved Amount', dataIndex: 'approvedAmount', key: 'approvedAmount', align:'right', render: (v)=> v? currency(v): '-' },
        { title: 'Actions', key: 'actions', render: (_, r) => (
            <Space>
              {r.status !== 'approved' && <Button size="small" type="primary" onClick={async ()=>{
                try { await api.put(`/admin/expenses/${r.id}/status`, { status:'approved', approvedAmount: r.amount });
                  const res = await api.get(`/admin/staff/${id}/expenses`); if (res.data?.success) setClaims(res.data.data || []);
                } catch(e){ message.error(e?.response?.data?.message || 'Failed'); }
              }}>Approve</Button>}
              {r.status !== 'rejected' && <Button size="small" danger onClick={async ()=>{
                try { await api.put(`/admin/expenses/${r.id}/status`, { status:'rejected' });
                  const res = await api.get(`/admin/staff/${id}/expenses`); if (res.data?.success) setClaims(res.data.data || []);
                } catch(e){ message.error(e?.response?.data?.message || 'Failed'); }
              }}>Reject</Button>}
            </Space>
          )},
      ];

      const openAdd = () => {
        claimForm.resetFields();
        claimForm.setFieldsValue({ expenseType: 'Travel', expenseDate: dayjs(), amount: null, billNumber: '', description: '', attachmentUrl: '' });
        setClaimOpen(true);
      };
      const saveClaim = async () => {
        try {
          const v = await claimForm.validateFields();
          const fd = new FormData();
          fd.append('expenseType', v.expenseType);
          fd.append('expenseDate', v.expenseDate?.format('YYYY-MM-DD'));
          if (v.billNumber) fd.append('billNumber', v.billNumber);
          fd.append('amount', String(Number(v.amount)));
          if (v.description) fd.append('description', v.description);
          if (claimFile) fd.append('attachment', claimFile);
          await api.post(`/admin/staff/${id}/expenses`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          message.success('Claim submitted');
          setClaimOpen(false);
          setClaimFile(null);
          const res = await api.get(`/admin/staff/${id}/expenses`);
          if (res.data?.success) setClaims(res.data.data || []);
        } catch (e) {
          if (e?.errorFields) return;
          message.error(e?.response?.data?.message || 'Failed to submit claim');
        }
      };

      return (
        <Card title="Expense Claims" extra={<Button type="primary" onClick={openAdd}>Add Claim</Button>}>
          <div style={{ marginBottom: 12 }}>
            <Space>
              <Input.Search placeholder="Search by Claim ID" allowClear onSearch={(val)=>{
                const v = String(val||'').trim().toLowerCase();
                if (!v) { api.get(`/admin/staff/${id}/expenses`).then(res=>{ if (res.data?.success) setClaims(res.data.data||[]); }); return; }
                setClaims((claims||[]).filter(c => String(c.claimId||'').toLowerCase().includes(v)));
              }} style={{ width: 260 }} />
              <Select defaultValue="FY" style={{ width: 140 }} options={[{value:'FY',label:'FY 2025 - 2026'}]} disabled />
            </Space>
          </div>
          <Table rowKey={(r)=> r.id} columns={columns} dataSource={claims} loading={claimsLoading} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />

          <Modal title="Add Claim" open={claimOpen} onCancel={()=> { setClaimOpen(false); setClaimFile(null); }} onOk={saveClaim} okText="Submit">
            <Form form={claimForm} layout="vertical">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="expenseType" label="Expense Type" rules={[{ required: true }]}>
                  <Select options={[{value:'Travel',label:'Travel Expense'},{value:'Food',label:'Food'},{value:'Office',label:'Office Supplies'},{value:'Other',label:'Other'}]} />
                </Form.Item></Col>
                <Col span={12}><Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]}>
                  <DatePicker style={{ width:'100%' }} />
                </Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="billNumber" label="Bill Number">
                  <Input placeholder="Enter bill number" />
                </Form.Item></Col>
                <Col span={12}><Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <InputNumber min={1} step={50} style={{ width:'100%' }} prefix="₹" />
                </Form.Item></Col>
              </Row>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} placeholder="Enter description" />
              </Form.Item>
              <Form.Item label="Attachment">
                <Upload.Dragger multiple={false} maxCount={1}
                  beforeUpload={(file)=> { setClaimFile(file); return false; }}
                  onRemove={()=> { setClaimFile(null); }}
                  accept="image/*,.pdf"
                >
                  <p className="ant-upload-drag-icon">📎</p>
                  <p className="ant-upload-text">Click or drag file to upload</p>
                  <p className="ant-upload-hint">Images or PDFs. Max 1 file.</p>
                </Upload.Dragger>
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'salaryOverview') {

      const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));

      const sv = extractSV(staff || {});
      const labelize = (k) => {
        if (!k) return '';
        const upper = { hra:'HRA', da:'DA', pf:'PF', esi:'ESI' };
        if (upper[k]) return upper[k];
        return k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
      };
      const earningsEntries = orderByPref(toEntries(sv.earnings), prefEarn);
      const deductionEntries = orderByPref(toEntries(sv.deductions), prefDed);
      const gross = earningsEntries.reduce((s, [,v]) => s + (Number(v)||0), 0);
      const totalDed = deductionEntries.reduce((s, [,v]) => s + (Number(v)||0), 0);
      const net = gross - totalDed;

      // use openEditSalary/saveSalary lifted to component scope

      const handleLoadMore = () => setMonthsCount((c) => c + 5);
      const handleAddPrev = () => setMonthsCount((c) => c + 1);
      const handleGenerateSlip = () => {
        const m = (salaryMonths || []).find((x) => x.key === activeMonthKey) || salaryMonths[0];
        if (!m) return message.warning('No month selected');
        const staffName = staff?.profile?.name || 'Employee';
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payslip ${m.title}</title>
          <style>
            body{font-family: Arial, sans-serif; padding:24px;}
            .row{display:flex; justify-content:space-between; margin:4px 0;}
            .card{border:1px solid #e5e5e5; border-radius:8px; padding:16px; margin-top:12px;}
            .title{font-weight:700; font-size:18px;}
            .muted{color:#666; font-size:12px}
            .total{font-weight:700}
          </style></head><body>
          <div class="title">Payslip - ${m.title}</div>
          <div class="muted">${staffName} | Duration: ${m.range}</div>
          <div class="card">
            <div class="row"><div>Net Payable</div><div class="total">${new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(m.amount||0)}</div></div>
            <div class="row"><div>Due Amount</div><div>${new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(m.dueAmount||0)}</div></div>
          </div>
          <script>window.print(); setTimeout(()=>window.close(), 400);</script>
        </body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
      };

      return (
        <Card title="Salary Overview" extra={
          <Space>
            <Button onClick={handleAddPrev}>+ Add Previous Month</Button>
            <Button type="primary" onClick={handleGenerateSlip}>Generate Salary Slip</Button>
          </Space>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Collapse accordion bordered={false}
              onChange={(key)=> setActiveMonthKey(Array.isArray(key)? key[0] : key)}
              items={(salaryMonths || []).map(m => ({
                key: m.key,
                label: (
                  <div style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{m.title}</div>
                      <div style={{ color:'#8c8c8c', fontSize:12 }}>Duration: {m.range}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:600 }}>{currency(m.amount)}</div>
                      <div style={{ color:'#8c8c8c', fontSize:12 }}>due amount - {currency(m.dueAmount)}</div>
                    </div>
                  </div>
                ),
                children: (
                  <div>
                   {(() => {
  // Start with month-specific values; if empty, fall back to base values
  let svM = getMonthSV(staff, m.key);
  let eEntries = orderByPref(toEntries(svM.earnings), prefEarn);
  let dEntries = orderByPref(toEntries(svM.deductions), prefDed);
  if ((eEntries.length === 0) && (dEntries.length === 0)) {
    const baseSV = extractSV(staff || {});
    eEntries = orderByPref(toEntries(baseSV.earnings), prefEarn);
    dEntries = orderByPref(toEntries(baseSV.deductions), prefDed);
    svM = baseSV;
  }
  const sum = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const gross = sum(svM.earnings);
  const totalDed = sum(svM.deductions);
  return (
    <>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card size="small" title="Earnings">
            {eEntries.map(([k, v]) => (
              <Row key={k} style={{ marginBottom: 8 }}>
                <Col span={16}>{labelize(k)}</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{currency(v)}</Col>
              </Row>
            ))}
            <Divider style={{ margin: '8px 0' }} />
            <Row>
              <Col span={16}><strong>Gross Earnings</strong></Col>
              <Col span={8} style={{ textAlign: 'right' }}><strong>{currency(gross)}</strong></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="Deductions">
            {dEntries.map(([k, v]) => (
              <Row key={k} style={{ marginBottom: 8 }}>
                <Col span={16}>{labelize(k)}</Col>
                <Col span={8} style={{ textAlign: 'right' }}>{currency(v)}</Col>
              </Row>
            ))}
            <Divider style={{ margin: '8px 0' }} />
            <Row>
              <Col span={16}><strong>Total Deductions</strong></Col>
              <Col span={8} style={{ textAlign: 'right' }}><strong>{currency(totalDed)}</strong></Col>
            </Row>
          </Card>
        </Col>
      </Row>
      <Card size="small" style={{ marginTop: 12 }}>
        <Row>
          <Col span={16}><strong>Net Payable Amount (Gross Earnings - Total Deductions)</strong></Col>
          <Col span={8} style={{ textAlign: 'right' }}><strong>{currency(m.amount)}</strong></Col>
        </Row>          
      </Card>
    </>
  );
})()}
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
                      <Button onClick={openEditSalary}>Edit Salary Structure</Button>
                      <Button type="link">View Variables</Button>
                    </div>
                  </div>
                )
              }))}
            />
            <div style={{ textAlign:'center' }}>
              <Button type="link" onClick={handleLoadMore}>Load more</Button>
            </div>
          </div>
          <Modal title="Edit Salary Structure" open={salaryEditOpen} onCancel={()=> setSalaryEditOpen(false)} onOk={saveSalary} okText="Save">
            <Form form={salaryForm} layout="vertical">
              <Row gutter={12}>
                <Col span={12}>
                  <Card size="small" title="Earnings">
                    <Form.List name="earnings">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Row key={key} gutter={8} style={{ marginBottom:8 }} align="middle">
                              <Col span={13}><Form.Item {...rest} name={[name,'name']}><Input placeholder="Name" /></Form.Item></Col>
                              <Col span={9}><Form.Item {...rest} name={[name,'amount']}><InputNumber min={0} step={100} style={{ width:'100%' }} /></Form.Item></Col>
                              <Col span={2} style={{ textAlign:'right' }}>
                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          ))}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name:'', amount:0 })} block>
                            Add More
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Deductions">
                    <Form.List name="deductions">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Row key={key} gutter={8} style={{ marginBottom:8 }} align="middle">
                              <Col span={13}><Form.Item {...rest} name={[name,'name']}><Input placeholder="Name" /></Form.Item></Col>
                              <Col span={9}><Form.Item {...rest} name={[name,'amount']}><InputNumber min={0} step={100} style={{ width:'100%' }} /></Form.Item></Col>
                              <Col span={2} style={{ textAlign:'right' }}>
                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          ))}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name:'', amount:0 })} block>
                            Add More
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                </Col>
              </Row>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'loans') {
      const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
      const openAddLoan = (kind = 'loan') => {
        loanForm.resetFields();
        setLoanEntryType(kind === 'payment' ? 'payment' : 'loan');
        loanForm.setFieldsValue({ date: dayjs(), amount: null, description: '', notifySms: true });
        setLoanOpen(true);
      };
      const saveLoan = async () => {
        try {
          const v = await loanForm.validateFields();
          const payload = {
            date: v.date?.format('YYYY-MM-DD'),
            amount: Number(v.amount),
            description: v.description || null,
            notifySms: !!v.notifySms,
            type: loanEntryType,
          };
          await api.post(`/admin/staff/${id}/loans`, payload);
          message.success('Loan entry added');
          setLoanOpen(false);
          const [listRes, sumRes] = await Promise.all([
            api.get(`/admin/staff/${id}/loans`),
            api.get(`/admin/staff/${id}/loans/summary`),
          ]);
          if (listRes.data?.success) setLoans(listRes.data.data || []);
          if (sumRes.data?.success) setLoanSummary(sumRes.data);
        } catch (e) {
          if (e?.errorFields) return;
          message.error(e?.response?.data?.message || 'Failed to add loan');
        }
      };

      const columns = [
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t==='loan'?'blue':'green'}>{String(t||'loan').toUpperCase()}</Tag> },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (a) => currency(a) },
        { title: 'Description', dataIndex: 'description', key: 'description' },
      ];

      return (
        <Card title="Loans" extra={<Space><Button onClick={()=>openAddLoan('loan')}>Add Loan</Button><Button onClick={()=>openAddLoan('payment')}>Add Payment</Button></Space>}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} md={8}><Card size="small"><div>Total Loan Amount</div><div style={{ fontWeight:700 }}>{currency(loanSummary.totalLoan)}</div></Card></Col>
            <Col xs={24} md={8}><Card size="small"><div>Total Payments</div><div style={{ fontWeight:700 }}>{currency(loanSummary.totalPayment)}</div></Card></Col>
            <Col xs={24} md={8}><Card size="small"><div>Loan Balance</div><div style={{ fontWeight:700 }}>{currency(loanSummary.balance)}</div></Card></Col>
          </Row>
          <Table rowKey={(r)=> r.id} columns={columns} dataSource={loans} pagination={{ pageSize: 10 }} />

          <Modal title={loanEntryType==='payment' ? 'Add Payment Entry' : 'Add Loan Entry'} open={loanOpen} onCancel={()=> setLoanOpen(false)} onOk={saveLoan} okText={loanEntryType==='payment' ? 'Add Payment' : 'Add Loan'}>
            <Form form={loanForm} layout="vertical">
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width:'100%' }} />
              </Form.Item>
              <Form.Item name="amount" label="Amount" rules={[{ required: true, message:'Enter amount' }]}>
                <InputNumber min={1} step={100} style={{ width:'100%' }} prefix="₹" />
              </Form.Item>
              <Form.Item name="description" label="Description (Optional)">
                <Input.TextArea rows={3} placeholder="Add Description" />
              </Form.Item>
              <Form.Item name="notifySms" valuePropName="checked" label=" "><Switch defaultChecked /> <span style={{ marginLeft:8 }}>Send SMS to Staff</span></Form.Item>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'leaves') {
      const approve = async (leaveId, status) => {
        try {
          await api.put(`/admin/leaves/${leaveId}/status`, { status });
          const res = await api.get(`/admin/staff/${id}/leaves`);
          if (res.data?.success) setLeaves(res.data.data || []);
          message.success(`Leave ${status}`);
        } catch (e) {
          message.error(e?.response?.data?.message || 'Failed to update leave');
        }
      };
      const columns = [  
        { title: 'From', dataIndex: 'startDate', key: 'start', render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'To', dataIndex: 'endDate', key: 'end', render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t, r) => (t || r.leaveType || r.category || '-') },
        { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (t) => t || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => {
            const map = { pending: 'gold', approved: 'green', rejected: 'red' };
            return <Tag color={map[String(s)] || 'default'}>{String(s || 'pending').toUpperCase()}</Tag>;
          }
        },
        { title: 'Actions', key: 'actions', render: (_, r) => (
            <Space>
              {r.status !== 'approved' && <Button size="small" type="primary" onClick={() => approve(r.id, 'approved')}>Approve</Button>}
              {r.status !== 'rejected' && <Button size="small" danger onClick={() => approve(r.id, 'rejected')}>Reject</Button>}
            </Space>
          ) },
      ];

      const today = dayjs().startOf('day');
      const upcoming = (leaves || []).filter(l => dayjs(l.endDate).isAfter(today));
      const previous = (leaves || []).filter(l => !dayjs(l.endDate).isAfter(today));

      return (
        <Card title="Leave Requests">
          <Tabs
            items={[
              { key: 'upcoming', label: 'Upcoming', children: (<Table rowKey={(r)=> r.id} columns={columns} dataSource={upcoming} loading={leavesLoading} pagination={{ pageSize: 10 }} />) },
              { key: 'previous', label: 'Previous', children: (<Table rowKey={(r)=> r.id} columns={columns} dataSource={previous} loading={leavesLoading} pagination={{ pageSize: 10 }} />) },
            ]}
          />
        </Card>
      );
    }
    if (activeKey === 'attendance') {
      const columns = [
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'Staff Name', dataIndex: ['user','name'], key: 'name', render: (t) => t || staff?.profile?.name || '-' },
        { title: 'Check In', dataIndex: 'checkIn', key: 'checkIn', render: (t) => t || '-' },
        { title: 'Check Out', dataIndex: 'checkOut', key: 'checkOut', render: (t) => t || '-' },
        { title: 'Total Hours', key: 'hrs', render: (_, r) => {
            if (r.checkIn && r.checkOut) {
              const start = dayjs(r.checkIn, 'HH:mm:ss');
              const end = dayjs(r.checkOut, 'HH:mm:ss');
              const h = end.diff(start, 'minute')/60;
              return `${h.toFixed(2)}h`;
            }
            return '-';
        }},
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s==='present'?'green':s==='leave'?'blue':s==='half_day'?'orange':'red'}>{(s||'').replace('_',' ').toUpperCase()}</Tag> },
      ];

      return (
        <Card title="Attendance" extra={
          <Space>
            <DatePicker picker="month" value={attMonth} onChange={(m)=> setAttMonth(m)} />
            <Button icon={<DownloadOutlined />} onClick={exportMonth}>Export</Button>
            <Button type="primary" onClick={openMark}>Mark Attendance</Button>
          </Space>
        }>
          <Table rowKey={(r)=> `${r.date}-${r.id || Math.random()}`} columns={columns} dataSource={attRows} loading={attLoading} pagination={{ pageSize: 10 }} />

          <Modal title="Mark Attendance" open={markOpen} onCancel={()=> setMarkOpen(false)} onOk={saveMark} okText="Save">
            <Form form={markForm} layout="vertical">
              <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select date' }]}>
                <DatePicker style={{ width:'100%' }} />
              </Form.Item>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="present">Present</Radio>
                  <Radio value="absent">Absent</Radio>
                  <Radio value="half_day">Half Day</Radio>
                  <Radio value="leave">Leave</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="checkIn" label="Check-in Time">
                <TimePicker style={{ width:'100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
              <Form.Item name="checkOut" label="Check-out Time">
                <TimePicker style={{ width:'100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'documents') {
      const columns = [
        { title: 'Title', dataIndex: 'fileName', key: 'fileName', render: (t) => t || '-' },
        { title: 'Type', dataIndex: 'docType', key: 'docType', render: (_t, r) => {
            const src = (r.fileName || r.fileUrl || '').toString();
            const dot = src.lastIndexOf('.');
            const ext = dot >= 0 ? src.substring(dot + 1).toLowerCase() : '';
            const map = { jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG', pdf: 'PDF', webp: 'WEBP' };
            return map[ext] || (ext ? ext.toUpperCase() : '-');
          }
        },
        { title: 'File', dataIndex: 'fileUrl', key: 'fileUrl', render: (u) => {
            if (!u) return '-';
            const href = `${api.defaults.baseURL}${String(u)}`;
            return <a href={href} target="_blank" rel="noreferrer">View</a>;
          }
        },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag>{String(s || 'SUBMITTED')}</Tag> },
        { title: 'Expires On', dataIndex: 'expiresAt', key: 'expiresAt', render: (d)=> d? dayjs(d).format('DD MMM YYYY'):'-' },
        { title: 'Actions', key: 'actions', render: (_, r) => {
            const fileHref = r.fileUrl ? `${api.defaults.baseURL}${String(r.fileUrl)}` : null;
            const items = [
              fileHref ? { key: 'view', label: <a href={fileHref} target="_blank" rel="noreferrer">View</a> } : null,
              { key: 'edit', label: <span onClick={() => { setEditingDoc(r); docForm.resetFields(); docForm.setFieldsValue({ title: r.fileName || '', docType: r.docType || r.documentTypeId || undefined, expiresAt: r.expiresAt ? dayjs(r.expiresAt) : null, notes: r.notes || '' }); setDocFile(null); setDocOpen(true); }}>Edit</span> },
              { key: 'delete', label: (
                <Popconfirm title="Delete document?" onConfirm={async ()=>{
                  try { await api.delete(`/admin/documents/${r.id}`); const res = await api.get(`/admin/staff/${id}/documents`); if (res.data?.success) setDocuments(res.data.data||[]); } catch(e){ message.error(e?.response?.data?.message || 'Failed'); }
                }}>
                  <span style={{ color: '#ff4d4f' }}>Delete</span>
                </Popconfirm>
              ) }
            ].filter(Boolean);
            return (
              <Dropdown menu={{ items }} trigger={[ 'click' ]} placement="bottomRight">
                <Button size="small" icon={<MoreOutlined />} />
              </Dropdown>
            );
          }
        }
      ];

      const openAddDoc = () => {
        setEditingDoc(null);
        docForm.resetFields();
        setDocFile(null);
        docForm.setFieldsValue({ title: '', docType: undefined, expiresAt: null, notes: '' });
        setDocOpen(true);
      };

      const saveDoc = async () => {
        try {
          const v = await docForm.validateFields();
          const fd = new FormData();
          if (v.docType !== undefined) fd.append('docType', v.docType);
          if (v.title) fd.append('title', v.title);
          if (v.expiresAt) fd.append('expiresAt', v.expiresAt.format('YYYY-MM-DD'));
          if (v.notes) fd.append('notes', v.notes);
          if (docFile) fd.append('file', docFile);
          if (editingDoc) {
            await api.put(`/admin/documents/${editingDoc.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Document updated');
          } else {
            if (!docFile) { message.warning('Please select a file'); return; }
            await api.post(`/admin/staff/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Document uploaded');
          }
          setDocOpen(false);
          setDocFile(null);
          const res = await api.get(`/admin/staff/${id}/documents`);
          if (res.data?.success) setDocuments(res.data.data || []);
        } catch (e) {
          if (e?.errorFields) return;
          message.error(e?.response?.data?.message || 'Failed to save document');
        }
      };

      return (
        <Card title="Document Centre" extra={<Button type="primary" onClick={openAddDoc}>Add Document</Button>}>
          <Table rowKey={(r)=> r.id} columns={columns} dataSource={documents} loading={docsLoading} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
          <Modal title={editingDoc? 'Edit Document' : 'Add Document'} open={docOpen} onCancel={()=> { setDocOpen(false); setDocFile(null); }} onOk={saveDoc} okText={editingDoc? 'Save' : 'Upload'}>
            <Form form={docForm} layout="vertical">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="docType" label="Document Type"><Input placeholder="E.g. Aadhar, PAN" /></Form.Item></Col>
                <Col span={12}><Form.Item name="expiresAt" label="Expiry Date"><DatePicker style={{ width:'100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="title" label="Title"><Input placeholder="Document name" /></Form.Item>
              <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item label="File">
                <Upload.Dragger multiple={false} maxCount={1}
                  beforeUpload={(file)=> { setDocFile(file); return false; }}
                  onRemove={()=> { setDocFile(null); }}
                  accept="image/*,.pdf"
                >
                  <p className="ant-upload-drag-icon">📄</p>
                  <p className="ant-upload-text">Click or drag file to upload</p>
                  <p className="ant-upload-hint">Images or PDFs. Max 1 file.</p>
                </Upload.Dragger>
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'salaryStructure') {
      return (
        <Card title="Salary Structure" loading={loading}>
          <Button type="primary" onClick={openEditSalary}>Edit Salary Structure</Button>
          <Modal title="Edit Salary Structure" open={salaryEditOpen} onCancel={()=> setSalaryEditOpen(false)} onOk={saveSalary} okText="Save">
            <Form form={salaryForm} layout="vertical">
              <Row gutter={12}>
                <Col span={12}>
                  <Card size="small" title="Earnings">
                    <Form.List name="earnings">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Row key={key} gutter={8} style={{ marginBottom:8 }} align="middle">
                              <Col span={13}><Form.Item {...rest} name={[name,'name']}><Input placeholder="Name" /></Form.Item></Col>
                              <Col span={9}><Form.Item {...rest} name={[name,'amount']}><InputNumber min={0} step={100} style={{ width:'100%' }} /></Form.Item></Col>
                              <Col span={2} style={{ textAlign:'right' }}>
                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          ))}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name:'', amount:0 })} block>
                            Add More
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Deductions">
                    <Form.List name="deductions">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Row key={key} gutter={8} style={{ marginBottom:8 }} align="middle">
                              <Col span={13}><Form.Item {...rest} name={[name,'name']}><Input placeholder="Name" /></Form.Item></Col>
                              <Col span={9}><Form.Item {...rest} name={[name,'amount']}><InputNumber min={0} step={100} style={{ width:'100%' }} /></Form.Item></Col>
                              <Col span={2} style={{ textAlign:'right' }}>
                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          ))}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name:'', amount:0 })} block>
                            Add More
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                </Col>
              </Row>
            </Form>
          </Modal>
        </Card>
      );
    }
    return (
      <Card title="Section" loading={loading}>
        <div>Coming soon</div>
      </Card>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <Space align="center" style={{ padding: '0 24px' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/staff-management')}>Back</Button>
            <Title level={4} style={{ margin: 0 }}>Staff Profile</Title>
          </Space>
          <div style={{ paddingRight: 24 }}>{headerRight}</div>
        </Header>
        <Content style={{ margin: '24px 24px', padding: 0, background: 'transparent', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <div style={{ padding: 24 }}>
            {profileSummary}
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Card bodyStyle={{ padding: 0 }}>
                  <Menu
                    mode="inline"
                    selectedKeys={[activeKey]}
                    onClick={(e) => setActiveKey(e.key)}
                    className="staff-profile-menu"
                    items={sections.map(s => ({ key: s.key, icon: s.icon, label: s.label }))}
                  />
                </Card>
              </Col>
              <Col xs={24} md={18}>
                {renderSection()}
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
