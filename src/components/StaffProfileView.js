import React, { useEffect, useState } from 'react';
import {
  Layout, Card, Button, Typography, Space, Menu, Dropdown, Tag, Row, Col, Modal, Form,
  Input, DatePicker, Select, Switch, message, Table, Radio, TimePicker, Collapse,
  InputNumber, Divider, Tabs, Upload, Popconfirm, Tooltip, Empty, Statistic
} from 'antd';
import {
  ArrowLeftOutlined, MoreOutlined, UserOutlined, FileTextOutlined, CalendarOutlined,
  FileProtectOutlined, InboxOutlined, DownloadOutlined, PlusOutlined, MinusCircleOutlined, EditOutlined,
  SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  CoffeeOutlined, ScheduleOutlined, ShopOutlined
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import api, { API_BASE_URL } from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const categoryNames = {
  'cl': 'Casual Leave',
  'sl': 'Sick Leave',
  'el': 'Earned Leave',
  'ml': 'Maternity Leave',
  'pt': 'Paternity Leave',
  'unpaid': 'Unpaid Leave'
};

const sections = [
  { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
  { key: 'attendance', label: 'Attendance', icon: <CalendarOutlined /> },
  { key: 'salaryOverview', label: 'Salary Overview', icon: <span style={{ fontWeight: 'bold' }}>₹</span> },
  { key: 'salaryStructure', label: 'Salary Structure', icon: <FileTextOutlined /> },
  { key: 'background', label: 'Education & Experience', icon: <FileProtectOutlined /> },
  { key: 'leaves', label: "Leave(s)", icon: <CalendarOutlined /> },
  { key: 'expenseClaims', label: 'Expense Claims', icon: <InboxOutlined /> },
  { key: 'documents', label: 'Document Centre', icon: <FileTextOutlined /> },
  { key: 'orgAccess', label: 'Organization Access', icon: <ShopOutlined /> },
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
  const [attStats, setAttStats] = useState({});
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
  const [editPayrollOpen, setEditPayrollOpen] = useState(false);
  const [editPayrollRow, setEditPayrollRow] = useState(null);
  const [editPayrollForm] = Form.useForm();
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimForm] = Form.useForm();
  const [claimFile, setClaimFile] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docForm] = Form.useForm();
  const [docFile, setDocFile] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [effectiveTemplate, setEffectiveTemplate] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [backgroundEditOpen, setBackgroundEditOpen] = useState(false);
  const [backgroundForm] = Form.useForm();
  const [salaryTemplates, setSalaryTemplates] = useState([]);
  const [manualSalaryOpen, setManualSalaryOpen] = useState(false);
  const [manualSalaryForm] = Form.useForm();
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('APPROVED');

  const staffStartMonth = React.useMemo(() => {
    const candidates = [
      staff?.dateOfJoining,
      staff?.profile?.dateOfJoining,
      staff?.createdAt,
      staff?.profile?.createdAt,
      staff?.created_at,
    ].filter(Boolean);
    for (const c of candidates) {
      const d = dayjs(c);
      if (d.isValid()) return d.startOf('month');
    }
    return null;
  }, [staff]);

  const maxSalaryMonths = React.useMemo(() => {
    if (!staffStartMonth) return Number.POSITIVE_INFINITY;
    const nowMonth = dayjs().startOf('month');
    const diff = nowMonth.diff(staffStartMonth, 'month');
    return Math.max(1, diff + 1);
  }, [staffStartMonth]);

  const formatDateShort = (value) => {
    if (!value) return '-';
    const d = dayjs(value);
    return d.isValid() ? d.format('DD-MM-YY') : '-';
  };

  const currency = (amt) => {
    const n = Number(amt) || 0;
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const normalizeDeductions = (deductions) => {
    if (!deductions || typeof deductions !== 'object') return {};
    const d = { ...deductions };
    const pf = Number(d.provident_fund);
    const pfEmp = Number(d.provident_fund_employee);
    if ((!Number.isFinite(pf) || pf === 0) && Number.isFinite(pfEmp) && pfEmp !== 0) {
      d.provident_fund = pfEmp;
    }
    delete d.provident_fund_employee;
    delete d.provident_fund_employer;
    return d;
  };

  const parseArray = (val) => {
    if (val == null) return [];
    let v = val;
    // Handle double-encoded JSON strings
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch { /* ignore */ }
      if (typeof v === 'string') {
        try { v = JSON.parse(v); } catch { /* ignore */ }
      }
    }
    // If it's an object keyed numerically, convert to array
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      try {
        const keys = Object.keys(v);
        // simple heuristic: numeric keys or small object with index-like keys
        if (keys.length && keys.every(k => !isNaN(Number(k)))) {
          return keys.sort((a, b) => Number(a) - Number(b)).map(k => v[k]);
        }
        return [];
      } catch { return [] }
    }
    if (Array.isArray(v)) return v;
    return [];
  };

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
  const prefEarn = ['basic_salary', 'hra', 'da', 'special_allowance', 'travel_allowance', 'conveyance_allowance', 'medical_allowance', 'telephone_allowance', 'bonus', 'overtime'];
  const prefDed = ['provident_fund', 'esi', 'professional_tax', 'income_tax', 'loan_deduction', 'other_deductions'];
  const toEntries = (obj) => Object.entries(obj || {});
  const orderByPref = (entries, pref, templateKeys = null) => {
    const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');
    const map = new Map(); // Key: normalized, Value: { originalKey, value }

    entries.forEach(([k, v]) => {
      const nk = norm(k);
      if (nk) {
        // If we have duplicates in 'entries' themselves, use the LAST/latest value (do NOT sum)
        // Summing caused double-counting when both snake_case and camelCase keys existed
        map.set(nk, { key: k, value: Number(v) || 0 });
      }
    });

    const used = new Set();
    const ordered = [];
    const effectivePref = templateKeys && templateKeys.length > 0 ? templateKeys : pref;

    effectivePref.forEach(k => {
      if (!k) return;
      const nk = norm(k);
      const existing = map.get(nk);
      // We ALWAYS use the name from 'effectivePref' (the template key/pref key) for the final entry
      ordered.push([k, existing ? existing.value : 0]);
      used.add(nk);
    });

    // Add anything else that wasn't in the preference/template list
    entries.forEach(([k, v]) => {
      const nk = norm(k);
      if (nk && !used.has(nk)) {
        ordered.push([k, v]);
        used.add(nk);
      }
    });

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

    const staffTplId = staff?.profile?.salaryTemplateId || staff?.salaryTemplateId;
    const tpl = salaryTemplates.find(t => t.id === staffTplId);

    let tplEarnKeys = null;
    let tplDedKeys = null;

    if (tpl) {
      try {
        const parse = (v) => typeof v === 'string' ? JSON.parse(v) : (v || []);
        const e = parse(tpl.earnings);
        const d = parse(tpl.deductions);
        const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');
        tplEarnKeys = e.map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer'));
        tplDedKeys = d.map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer'));
        // Normalize specific deduction keys to match prefDed
        tplDedKeys = tplDedKeys.map(k => {
          const nk = norm(k);
          if (nk === 'providentfundemployee' || nk === 'providentfund') return 'provident_fund';
          if (nk === 'esiemployee' || nk === 'esi') return 'esi';
          if (nk === 'professionaltax') return 'professional_tax';
          return k;
        });
      } catch (e) { console.error('Tpl parse error', e); }
    }

    const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');
    const earningsEntries = orderByPref(toEntries(sv.earnings), prefEarn, tplEarnKeys)
      .filter(([k, v]) => {
        const nk = norm(k);
        const inTpl = tplEarnKeys ? tplEarnKeys.some(tk => norm(tk) === nk) : false;
        const inPref = !tplEarnKeys && prefEarn.includes(k);
        return Number(v) !== 0 || inTpl || inPref;
      });
    const deductionEntries = orderByPref(toEntries(sv.deductions), prefDed, tplDedKeys)
      .filter(([k, v]) => {
        const nk = norm(k);
        const inTpl = tplDedKeys ? tplDedKeys.some(tk => norm(tk) === nk) : false;
        const inPref = !tplDedKeys && prefDed.includes(k);
        return Number(v) !== 0 || inTpl || inPref;
      });

    salaryForm.setFieldsValue({
      earnings: earningsEntries.map(([k, v]) => ({ name: k, amount: Number(v) || 0 })),
      deductions: deductionEntries.map(([k, v]) => ({ name: k, amount: Number(v) || 0 })),
    });
    setSalaryEditOpen(true);
  };

  const saveSalary = async () => {
    try {
      const v = await salaryForm.validateFields();
      // Normalize keys to snake_case: 'BASIC SALARY' → 'basic_salary' to avoid duplicate keys in DB
      const toSnakeKey = (s) => (s || '').toString().trim().toLowerCase().replace(/[\s]+/g, '_').replace(/[^a-z0-9_]/g, '');
      const toObj = (arr = []) => arr.reduce((o, it) => {
        const k = toSnakeKey(it?.name);
        if (k) o[k] = Number(it.amount) || 0;
        return o;
      }, {});
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

  const saveManualSalary = async () => {
    try {
      const v = await manualSalaryForm.validateFields();
      const payload = {
        staffId: id,
        monthKey: v.month.format('YYYY-MM'),
        netAmount: v.netAmount
      };
      setLoading(true);
      const res = await api.post('/admin/payroll/manual-historical', payload);
      if (res.data?.success) {
        message.success('Historical salary saved');
        setManualSalaryOpen(false);
        manualSalaryForm.resetFields();
        loadSalaryMonths();
      }
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save historical salary');
    } finally {
      setLoading(false);
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
      const earnKeys = ['basic_salary', 'hra', 'da', 'special_allowance', 'travel_allowance', 'conveyance_allowance', 'medical_allowance', 'telephone_allowance', 'bonus', 'overtime'];
      earnKeys.forEach(k => { const v = pick(k); if (v) e[k.toLowerCase()] = v; });
      const dedKeys = ['provident_fund', 'esi', 'professional_tax', 'income_tax', 'loan_deduction', 'other_deductions'];
      dedKeys.forEach(k => { const v = pick(k); if (v) d[k.toLowerCase()] = v; });
      return { earnings: e, deductions: d };
    };
    const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');
    if (sv && typeof sv === 'object') {
      const e = {};
      const d = {};

      if (sv.earnings && typeof sv.earnings === 'object') {
        Object.entries(sv.earnings).forEach(([k, v]) => { if (k) e[norm(k)] = v; });
      }
      if (sv.deductions && typeof sv.deductions === 'object') {
        Object.entries(normalizeDeductions(sv.deductions)).forEach(([k, v]) => { if (k) d[norm(k)] = v; });
      }

      // If base earnings/deductions are completely empty, derive from numeric columns as fallback.
      // We only fall back when ZERO keys exist to avoid merging stale numeric columns
      // on top of already-correct salary_values JSON (which caused double-counting).
      const noBaseEarn = Object.keys(e).length === 0;
      const noBaseDed = Object.keys(d).length === 0;

      if (noBaseEarn || noBaseDed) {
        const base = baseFromNumerics();
        if (noBaseEarn) Object.assign(e, base.earnings);
        if (noBaseDed) Object.assign(d, base.deductions);
      }

      return {
        earnings: e,
        deductions: d,
        lastUpdatedMonth: sv.lastUpdatedMonth,
        lastUpdatedMonthKey: sv.lastUpdatedMonthKey,
        months: sv.months
      };
    }
    const base = baseFromNumerics();
    const res = { earnings: {}, deductions: {} };
    Object.entries(base.earnings).forEach(([k, v]) => res.earnings[norm(k)] = v);
    Object.entries(base.deductions).forEach(([k, v]) => res.deductions[norm(k)] = v);
    return res;
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
      const d = (m.deductions && typeof m.deductions === 'object') ? normalizeDeductions(m.deductions) : {};
      return { earnings: e, deductions: d };
    }
    return base;
  };
  // Compute salary months when viewing Salary Overview or staff/length changes
  const loadSalaryMonths = React.useCallback(async () => {
    if (activeKey !== 'salaryOverview' || !staff) return;

    const now = dayjs();
    const list = [];
    const minAllowedMonth = staffStartMonth;

    // We generate list of months: [Current, Last, Last-1, ...]
    // We iterate up to monthsCount, but we don't 'break' strictly if there's data
    for (let i = 0; i < monthsCount; i++) {
      const m = now.subtract(i, 'month');
      const ym = m.format('YYYY-MM');

      // Check payment status from payroll
      let paymentStatus = 'DUE';
      let paidAmount = 0;
      let payrollData = null;
      let cycleData = null;

      try {
        const payrollRes = await api.get(`/admin/payroll?monthKey=${ym}&staffId=${id}`);
        if (payrollRes.data?.success) {
          cycleData = payrollRes.data.cycle;
          if (payrollRes.data.lines) {
            const userLine = payrollRes.data.lines.find(line => line.userId === Number(id));
            if (userLine) {
              payrollData = userLine;
            }
          }
        }
      } catch (_) { /* ignore */ }

      const currentMonthKey = m.format('YYYY-MM');
      const startMonthKey = minAllowedMonth ? minAllowedMonth.format('YYYY-MM') : null;

      const isBeforeStart = startMonthKey && currentMonthKey < startMonthKey;
      const isSkeletonLine = payrollData && !payrollData.paidAt && (Number(payrollData.netAmount) === 0 || !payrollData.id);

      // If we are before the employee joined AND (no data OR it's just a skeleton record), we stop looking back
      if (isBeforeStart && (!payrollData || isSkeletonLine)) {
        break;
      }

      const isCurrent = (i === 0);

      // 1. Base Expected Salary (from Structure)
      let sv = getMonthSV(staff, ym);
      let amountCounted = 0;

      // Calculate Net from structure
      const sum = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      const gross = sum(sv.earnings);
      const ded = sum(sv.deductions);
      amountCounted = gross - ded;

      let ratio = 1;
      if (payrollData) {
        const ftotals = typeof payrollData.totals === 'string' ? JSON.parse(payrollData.totals) : (payrollData.totals || {});
        const e = Number(ftotals.totalEarnings || 0) + Number(ftotals.totalIncentives || 0);
        const d = Number(ftotals.totalDeductions || 0);
        amountCounted = e - d;
        if (ftotals.ratio !== undefined) ratio = Number(ftotals.ratio);
        if (payrollData.paidAt) {
          paymentStatus = 'PAID';
          paidAmount = payrollData.paidAmount || amountCounted;
        }
      }

      list.push({
        key: ym,
        month: m.format('MMM YYYY'),
        title: m.format('MMM YYYY'),
        range: `${m.startOf('month').format('DD MMM')} - ${m.endOf('month').format('DD MMM YYYY')}`,
        amount: amountCounted,
        ratio,
        payrollData,
        cycleData,
        dueAmount: isCurrent && paymentStatus === 'DUE' ? amountCounted : 0,
        paidAmount: paymentStatus === 'PAID' ? paidAmount : 0,
        paymentStatus,
        isCurrent
      });
    }
    setSalaryMonths(list);
  }, [activeKey, staff, id, monthsCount, staffStartMonth]);

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
    loadSalaryMonths();
  }, [loadSalaryMonths]);

  // Staff data and templates loader
  useEffect(() => {
    const loadTpls = async () => {
      try {
        const res = await api.get('/admin/salary-templates');
        if (res.data?.success) setSalaryTemplates(res.data.data || []);
      } catch (_) { /* ignore */ }
    };
    loadTpls();
  }, []);

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
  const loadLeaves = async () => {
    if (activeKey !== 'leaves' || !staff) return;
    try {
      setLeavesLoading(true);
      const res = await api.get(`/admin/staff/${id}/leaves`, {
        params: { status: leaveStatusFilter }
      });
      if (res.data?.success) setLeaves(res.data.data || []); else setLeaves([]);
    } catch (_) {
      setLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [activeKey, staff, id, leaveStatusFilter]);

  const handleReviewLeave = (leave, action) => {
    setSelectedLeave(leave);
    setReviewAction(action);
    setReviewNote('');
    setIsNoteModalVisible(true);
  };

  const submitReviewLeave = async () => {
    setReviewLoading(true);
    try {
      const response = await api.patch(`/leave/${selectedLeave.id}/status`, {
        status: reviewAction,
        note: reviewNote
      });
      if (response.data?.success) {
        message.success(`Leave request ${reviewAction.toLowerCase()} successfully`);
        setIsNoteModalVisible(false);
        loadLeaves();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to process request');
    } finally {
      setReviewLoading(false);
    }
  };

  // Auto-open Salary Structure editor when that tab is selected
  useEffect(() => {
    if (activeKey === 'salaryStructure' && staff) {
      openEditSalary();
    }
  }, [activeKey, staff]);

  const [adminOrgs, setAdminOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [assigningOrg, setAssigningOrg] = useState(null);

  useEffect(() => {
    const loadAdminOrgs = async () => {
      if (activeKey !== 'orgAccess') return;
      try {
        setOrgsLoading(true);
        const res = await api.get('/admin/my-organizations');
        if (res.data?.success) setAdminOrgs(res.data.organizations || []);
      } catch (_) {
        setAdminOrgs([]);
      } finally {
        setOrgsLoading(false);
      }
    };
    loadAdminOrgs();
  }, [activeKey]);

  const loadStaffProfile = async () => {
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

  const handleAssignToOrg = async (targetOrgId) => {
    try {
      setAssigningOrg(targetOrgId);
      const res = await api.post(`/admin/staff/${id}/assign-to-org`, { targetOrgId });
      if (res.data?.success) {
        message.success('Staff assigned to organization successfully');
        loadStaffProfile(); // Refresh profile to update assigned status
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to assign staff');
    } finally {
      setAssigningOrg(null);
    }
  };

  const handleUnassignToOrg = async (targetOrgId) => {
    try {
      setAssigningOrg(targetOrgId);
      const res = await api.delete(`/admin/staff/${id}/unassign-from-org/${targetOrgId}`);
      if (res.data?.success) {
        message.success('Staff unassigned from organization successfully');
        loadStaffProfile();
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to unassign staff');
    } finally {
      setAssigningOrg(null);
    }
  };

  useEffect(() => {
    loadStaffProfile();
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
    const header = ['Date', 'Staff Name', 'Check In', 'Check Out', 'Total Hours', 'Status'];
    const rows = attRows.map(r => {
      let hrs = '-';
      if (r.checkIn && r.checkOut) {
        const start = dayjs(r.checkIn, r.checkIn.length > 5 ? 'HH:mm:ss' : 'HH:mm');
        const end = dayjs(r.checkOut, r.checkOut.length > 5 ? 'HH:mm:ss' : 'HH:mm');
        hrs = (end.diff(start, 'minute') / 60).toFixed(2);
      }
      return [
        dayjs(r.date).format('YYYY-MM-DD'),
        r.user?.name || staff?.profile?.name || '-',
        r.checkIn || '-',
        r.checkOut || '-',
        hrs,
        (r.status || '').replace('_', ' ').toUpperCase()
      ];
    });


    let csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${staff?.profile?.name || 'staff'}_${attMonth.format('MMM_YYYY')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const res = await api.get(`/admin/staff/${id}/attendance-overview`, {
        params: { month: attMonth.format('YYYY-MM') }
      });
      if (res.data?.success) {
        setAttRows(res.data.dailyData || []);
        setAttStats(res.data.stats || {});
      } else {
        setAttRows([]);
        setAttStats({});
      }
    } catch (e) {
      message.error('Failed to load attendance');
      setAttRows([]);
      setAttStats({});
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

  const initials = (staff?.name || 'U').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

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
      { key: 'toggle', label: staff?.active ? 'Deactivate' : 'Activate' },
    ],
    onClick: ({ key }) => {
      if (key === 'toggle') toggleActive();
    }
  };

  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const handlePhotoUpload = async (info) => {
    const { file } = info;
    if (file.status === 'uploading') {
      setPhotoLoading(true);
      return;
    }
    try {
      setPhotoLoading(true);
      const formData = new FormData();
      formData.append('photo', file.originFileObj || file);
      const response = await api.post('/admin/upload-profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-type' },
      });
      if (response.data.success) {
        setPhotoUrl(response.data.photoUrl);
        message.success('Photo uploaded successfully');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      message.error('Failed to upload photo');
    } finally {
      setPhotoLoading(false);
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
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0f5ff', color: '#125EC9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden' }}>
              {staff?.profile?.photoUrl ? (
                <img src={getFullImageUrl(staff.profile.photoUrl)} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
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
    setPhotoUrl(p.photoUrl || '');
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
      const payload = { ...values, photoUrl };
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

  const openEditBackground = () => {
    const rawEdu = staff?.profile?.education;
    const rawExp = staff?.profile?.experience;
    let edu = parseArray(rawEdu);
    let exp = parseArray(rawExp);

    // Ensure each entry is an object with expected keys
    edu = edu.map(it => (it && typeof it === 'object') ? it : { degree: String(it || ''), institution: '', year: '' });
    exp = exp.map(it => (it && typeof it === 'object') ? it : { company: String(it || ''), designation: '', duration: '' });

    backgroundForm.setFieldsValue({ education: edu, experience: exp });
    setBackgroundEditOpen(true);
  };

  const saveBackground = async () => {
    try {
      const v = await backgroundForm.validateFields();
      const payload = {
        education: v.education || [],
        experience: v.experience || [],
      };
      await api.put(`/admin/staff/${id}/profile`, payload);
      message.success('Background updated');
      setBackgroundEditOpen(false);
      const res = await api.get(`/admin/staff/${id}`);
      if (res.data?.success) setStaff(res.data.staff);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to update background');
    }
  };

  const renderSection = () => {
    if (activeKey === 'orgAccess') {
      const columns = [
        { title: 'Organization Name', dataIndex: 'name', key: 'name' },
        { title: 'Org ID', dataIndex: 'id', key: 'id' },
        {
          title: 'Action',
          key: 'action',
          render: (_, record) => {
            const existingOrgs = staff?.existingOrgs || [];
            // existingOrgs is now array of objects {id, name}
            const isAssigned = (existingOrgs || []).some(o => Number(o.id) === Number(record.id));
            const isCurrentOrg = Number(record.id) === Number(staff?.orgAccountId);

            if (isCurrentOrg) return <Tag color="blue">Current Organization</Tag>;

            if (isAssigned) {
              return (
                <Space>
                  <Tag color="green">Assigned</Tag>
                  <Popconfirm
                    title="Unassign this staff from this organization?"
                    onConfirm={() => handleUnassignToOrg(record.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="link" danger loading={assigningOrg === record.id}>Unassign</Button>
                  </Popconfirm>
                </Space>
              );
            }

            return (
              <Button
                type="primary"
                loading={assigningOrg === record.id}
                onClick={() => handleAssignToOrg(record.id)}
              >
                Assign Staff to this Org
              </Button>
            );
          }
        }
      ];

      return (
        <Card title="Organization Access Management" loading={orgsLoading}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              Assign this staff member to your other organizations. They will be able to switch between them using the same login credentials.
            </Text>
          </div>
          <Table
            rowKey="id"
            dataSource={adminOrgs.filter(o => Number(o.id) !== Number(staff?.orgAccountId))}
            columns={columns}
            pagination={false}
          />
        </Card>
      );
    }
    if (activeKey === 'profile') {
      return (
        <>
          <Card title="Profile" extra={<Button onClick={openEdit}>Edit</Button>} loading={loading}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title="Profile Information">
                  <Row gutter={[8, 8]}>
                    <Col span={12}><Text type="secondary">Name</Text><div>{staff?.profile?.name || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">ID</Text><div>{staff?.profile?.staffId || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Designation</Text><div>{staff?.profile?.designation || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Staff Type</Text><div>{staff?.profile?.staffType || 'Regular'}</div></Col>
                    <Col span={12}><Text type="secondary">Contact Number</Text><div>{staff?.profile?.phone || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Date of Joining</Text><div>{formatDateShort(staff?.profile?.dateOfJoining)}</div></Col>
                    <Col span={12}><Text type="secondary">Department</Text><div>{staff?.profile?.department || '-'}</div></Col>
                  </Row>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="General Information">
                  <Row gutter={[8, 8]}>
                    <Col span={12}><Text type="secondary">Salary Cycle Date</Text><div>{staff?.profile?.salaryCycleDate || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Shift</Text><div>
                      {staff?.shiftTemplate?.name && staff?.shiftTemplate?.startTime && staff?.shiftTemplate?.endTime
                        ? `${staff.shiftTemplate.name} (${staff.shiftTemplate.startTime} - ${staff.shiftTemplate.endTime})`
                        : staff?.shiftTemplate?.name || staff?.profile?.shiftSelection || '-'
                      }</div></Col>
                    <Col span={12}><Text type="secondary">Salary Access</Text><div>{staff?.profile?.allowCurrentCycleSalaryAccess ? 'Allow current cycle' : 'Restricted'}</div></Col>
                    <Col span={12}><Text type="secondary">Attendance Setting Template</Text><div>{staff?.attendanceTemplate?.name || staff?.profile?.attendanceSettingTemplate || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Effective Template</Text><div>{effectiveTemplate?.name || '-'}</div></Col>
                    <Col span={12}><Text type="secondary">Attendance Mode</Text><div>{(effectiveTemplate?.attendanceMode || '').replace(/_/g, ' ') || '-'}</div></Col>
                  </Row>
                </Card>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <Card size="small" title="Personal Information">
                  <Row gutter={[8, 8]}>
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
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <Card size="small" title="Bank Details">
                  <Row gutter={[8, 8]}>
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

          <Modal title="Edit Profile" open={editOpen} onCancel={() => setEditOpen(false)} onOk={saveEdit} okText="Save" width={900} centered>
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col span={24} style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <Upload
                    name="avatar"
                    listType="picture-card"
                    className="avatar-uploader"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                      if (!isJpgOrPng) message.error('You can only upload JPG/PNG file!');
                      const isLt2M = file.size / 1024 / 1024 < 2;
                      if (!isLt2M) message.error('Image must smaller than 2MB!');
                      return isJpgOrPng && isLt2M;
                    }}
                    customRequest={handlePhotoUpload}
                  >
                    {photoUrl ? (
                      <img src={getFullImageUrl(photoUrl)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div>
                        {photoLoading ? <SyncOutlined spin /> : <PlusOutlined />}
                        <div style={{ marginTop: 8, fontSize: '11px', color: '#8c8c8c' }}>Upload Photo<br/>(JPG/PNG, Max 2MB)</div>
                      </div>
                    )}
                  </Upload>
                </Col>
                <Col span={12}><Form.Item name="name" label="Name"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="designation" label="Designation"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="staffType" label="Staff Type"><Select allowClear options={[{ value: 'regular', label: 'Regular' }, { value: 'contractual', label: 'Contractual' }, { value: 'intern', label: 'Intern' }]} /></Form.Item></Col>
                <Col span={12}><Form.Item name="phone" label="Contact Number"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
                <Col span={12}><Form.Item name="dateOfJoining" label="Date of Joining"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="salaryCycleDate" label="Salary Cycle Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="shiftSelection" label="Shift"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="attendanceSettingTemplate" label="Attendance Setting Template"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="salaryDetailAccess" label="Salary Detail Access" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col span={12}><Form.Item name="allowCurrentCycleSalaryAccess" label="Allow Current Cycle Salary Access" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col span={8}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="gender" label="Gender"><Select allowClear options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} /></Form.Item></Col>
                <Col span={8}><Form.Item name="maritalStatus" label="Marital Status"><Select allowClear options={[{ value: 'SINGLE', label: 'Single' }, { value: 'MARRIED', label: 'Married' }, { value: 'OTHER', label: 'Other' }]} /></Form.Item></Col>
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
      const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
      const columns = [
        { title: 'Expense Type', dataIndex: 'expenseType', key: 'expenseType', render: (t) => t || '-' },
        { title: 'Claim ID', dataIndex: 'claimId', key: 'claimId', render: (t) => t || '-' },
        { title: 'Expense Date', dataIndex: 'expenseDate', key: 'expenseDate', render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'Requested Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (a) => currency(a) },
        {
          title: 'Status', dataIndex: 'status', key: 'status', render: (s) => {
            const map = { pending: 'gold', approved: 'green', rejected: 'red', settled: 'blue' };
            return <Tag color={map[String(s)] || 'default'}>{String(s || 'pending').toUpperCase()}</Tag>;
          }
        },
        { title: 'Applied at', dataIndex: 'createdAt', key: 'createdAt', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '-' },
        { title: 'Approved at', dataIndex: 'approvedAt', key: 'approvedAt', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '-' },
        { title: 'Approved Amount', dataIndex: 'approvedAmount', key: 'approvedAmount', align: 'right', render: (v) => v ? currency(v) : '-' },
        {
          title: 'Actions', key: 'actions', render: (_, r) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
              {r.status === 'pending' && <Button size="small" type="primary" onClick={async () => {
                try {
                  await api.put(`/admin/expenses/${r.id}/status`, { status: 'approved', approvedAmount: r.amount });
                  const res = await api.get(`/admin/staff/${id}/expenses`); if (res.data?.success) setClaims(res.data.data || []);
                } catch (e) { message.error(e?.response?.data?.message || 'Failed'); }
              }}>Approve</Button>}
              {r.status === 'pending' && <Button size="small" danger onClick={async () => {
                try {
                  await api.put(`/admin/expenses/${r.id}/status`, { status: 'rejected' });
                  const res = await api.get(`/admin/staff/${id}/expenses`); if (res.data?.success) setClaims(res.data.data || []);
                } catch (e) { message.error(e?.response?.data?.message || 'Failed'); }
              }}>Reject</Button>}
            </Space>
          )
        },
      ];

      const openAdd = () => {
        setEditingClaim(null);
        claimForm.resetFields();
        claimForm.setFieldsValue({ expenseType: 'Travel', expenseDate: dayjs(), amount: null, billNumber: '', description: '', attachmentUrl: '', status: 'pending' });
        setClaimFile(null);
        setClaimOpen(true);
      };
      const openEdit = (claim) => {
        setEditingClaim(claim);
        claimForm.resetFields();
        claimForm.setFieldsValue({
          expenseType: claim.expenseType || 'Travel',
          expenseDate: claim.expenseDate ? dayjs(claim.expenseDate) : dayjs(),
          amount: Number(claim.amount || 0),
          approvedAmount: claim.approvedAmount !== null && claim.approvedAmount !== undefined ? Number(claim.approvedAmount) : undefined,
          status: claim.status || 'pending',
          billNumber: claim.billNumber || '',
          description: claim.description || '',
        });
        setClaimFile(null);
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
          if (v.status) fd.append('status', v.status);
          if (v.approvedAmount !== undefined && v.approvedAmount !== null) fd.append('approvedAmount', v.approvedAmount);
          if (v.description) fd.append('description', v.description);
          if (claimFile) fd.append('attachment', claimFile);
          if (editingClaim?.id) {
            await api.put(`/admin/expenses/${editingClaim.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Claim updated');
          } else {
            await api.post(`/admin/staff/${id}/expenses`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Claim submitted');
          }
          setClaimOpen(false);
          setEditingClaim(null);
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
              <Input.Search placeholder="Search by Claim ID" allowClear onSearch={(val) => {
                const v = String(val || '').trim().toLowerCase();
                if (!v) { api.get(`/admin/staff/${id}/expenses`).then(res => { if (res.data?.success) setClaims(res.data.data || []); }); return; }
                setClaims((claims || []).filter(c => String(c.claimId || '').toLowerCase().includes(v)));
              }} style={{ width: 260 }} />
              <Select defaultValue="FY" style={{ width: 140 }} options={[{ value: 'FY', label: 'FY 2025 - 2026' }]} disabled />
            </Space>
          </div>
          <Table rowKey={(r) => r.id} columns={columns} dataSource={claims} loading={claimsLoading} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />

          <Modal
            title={editingClaim ? `Edit Claim - ${editingClaim.claimId || ''}` : 'Add Claim'}
            open={claimOpen}
            onCancel={() => { setClaimOpen(false); setEditingClaim(null); setClaimFile(null); }}
            onOk={saveClaim}
            okText={editingClaim ? 'Update' : 'Submit'}
          >
            <Form form={claimForm} layout="vertical">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="expenseType" label="Expense Type" rules={[{ required: true }]}>
                  <Select options={[{ value: 'Travel', label: 'Travel Expense' }, { value: 'Food', label: 'Food' }, { value: 'Office', label: 'Office Supplies' }, { value: 'Other', label: 'Other' }]} />
                </Form.Item></Col>
                <Col span={12}><Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="billNumber" label="Bill Number">
                  <Input placeholder="Enter bill number" />
                </Form.Item></Col>
                <Col span={12}><Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <InputNumber min={1} step={50} style={{ width: '100%' }} prefix="₹" />
                </Form.Item></Col>
              </Row>
              {editingClaim && (
                <Row gutter={12}>
                  <Col span={12}><Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select options={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                      { value: 'settled', label: 'Settled' },
                    ]} />
                  </Form.Item></Col>
                  <Col span={12}><Form.Item name="approvedAmount" label="Approved Amount">
                    <InputNumber min={0} step={50} style={{ width: '100%' }} prefix="₹" />
                  </Form.Item></Col>
                </Row>
              )}
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} placeholder="Enter description" />
              </Form.Item>
              <Form.Item label="Attachment">
                <Upload.Dragger multiple={false} maxCount={1}
                  beforeUpload={(file) => { setClaimFile(file); return false; }}
                  onRemove={() => { setClaimFile(null); }}
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
    if (activeKey === 'background') {
      const parseJSON = (val) => {
        if (!val) return [];
        if (typeof val === 'string') {
          try {
            const p = JSON.parse(val);
            return Array.isArray(p) ? p : [];
          } catch (e) {
            return [];
          }
        }
        return Array.isArray(val) ? val : [];
      };

      const education = parseJSON(staff?.profile?.education);
      const experience = parseJSON(staff?.profile?.experience);

      return (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title="Education Details" extra={<Button onClick={openEditBackground}>Edit</Button>}>
                {education.length > 0 ? (
                  <Table
                    rowKey={(r, i) => i}
                    pagination={false}
                    dataSource={education}
                    columns={[
                      { title: 'Degree', dataIndex: 'degree', key: 'degree' },
                      { title: 'Institution', dataIndex: 'institution', key: 'institution' },
                      { title: 'Year', dataIndex: 'year', key: 'year' },
                    ]}
                  />
                ) : (
                  <Empty description="No education details found" />
                )}
              </Card>
            </Col>
            <Col xs={24}>
              <Card title="Experience Details" style={{ marginTop: 16 }}>
                {experience.length > 0 ? (
                  <Table
                    rowKey={(r, i) => i}
                    pagination={false}
                    dataSource={experience}
                    columns={[
                      { title: 'Company', dataIndex: 'company', key: 'company' },
                      { title: 'Designation', dataIndex: 'designation', key: 'designation' },
                      { title: 'Duration', dataIndex: 'duration', key: 'duration' },
                    ]}
                  />
                ) : (
                  <Empty description="No experience details found" />
                )}
              </Card>
            </Col>
          </Row>

          <Modal title="Edit Education & Experience" open={backgroundEditOpen} onCancel={() => setBackgroundEditOpen(false)} onOk={saveBackground} okText="Save" width={900} centered>
            <Form form={backgroundForm} layout="vertical">
              <Row gutter={12}>
                <Col span={24}>
                  <Card size="small" title="Education">
                    <Form.List name="education">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                              <Col span={10}><Form.Item {...rest} name={[name, 'degree']}><Input placeholder="Degree" /></Form.Item></Col>
                              <Col span={10}><Form.Item {...rest} name={[name, 'institution']}><Input placeholder="Institution" /></Form.Item></Col>
                              <Col span={3}><Form.Item {...rest} name={[name, 'year']}><Input placeholder="Year" /></Form.Item></Col>
                              <Col span={1} style={{ textAlign: 'right' }}><Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} /></Col>
                            </Row>
                          ))}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ degree: '', institution: '', year: '' })} block>Add Education</Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                </Col>

                <Col span={24} style={{ marginTop: 12 }}>
                  <Card size="small" title="Experience">
                    <Form.List name="experience">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                              <Col span={9}><Form.Item {...rest} name={[name, 'company']}><Input placeholder="Company" /></Form.Item></Col>
                              <Col span={9}><Form.Item {...rest} name={[name, 'designation']}><Input placeholder="Designation" /></Form.Item></Col>
                              <Col span={5}><Form.Item {...rest} name={[name, 'duration']}><Input placeholder="Duration" /></Form.Item></Col>
                              <Col span={1} style={{ textAlign: 'right' }}><Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} /></Col>
                            </Row>
                          ))}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ company: '', designation: '', duration: '' })} block>Add Experience</Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                </Col>
              </Row>
            </Form>
          </Modal>
        </>
      );
    }
    if (activeKey === 'salaryStructure') {
      const sv = extractSV(staff || {});
      const staffTplId = staff?.profile?.salaryTemplateId || staff?.salaryTemplateId;
      const tpl = salaryTemplates.find(t => t.id === staffTplId);

      let tplEarnKeys = null;
      let tplDedKeys = null;
      const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');

      if (tpl) {
        try {
          const parse = (v) => typeof v === 'string' ? JSON.parse(v) : (v || []);
          tplEarnKeys = parse(tpl.earnings).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer'));
          tplDedKeys = parse(tpl.deductions).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer')).map(k => {
            const nk = norm(k);
            if (nk === 'providentfundemployee' || nk === 'providentfund') return 'provident_fund';
            if (nk === 'esiemployee' || nk === 'esi') return 'esi';
            if (nk === 'professionaltax') return 'professional_tax';
            return k;
          });
        } catch (e) { }
      }

      const allTplKeys = [...(tplEarnKeys || []), ...(tplDedKeys || [])];

      const labelize = (k, tplKeys = []) => {
        if (!k) return '';
        const nk = norm(k);
        const match = tplKeys.find(tk => norm(tk) === nk);
        if (match) return match;
        const upper = { hra: 'HRA', da: 'DA', pf: 'PF', esi: 'ESI' };
        if (upper[k.toLowerCase()]) return upper[k.toLowerCase()];
        if (nk === 'providentfund' || nk === 'providentfundemployee') return 'Employee PF';
        return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      };

      const earningsEntries = orderByPref(toEntries(sv.earnings), prefEarn, tplEarnKeys).filter(([k, v]) => {
        const nk = norm(k);
        const inTpl = tplEarnKeys ? tplEarnKeys.some(tk => norm(tk) === nk) : false;
        const inPref = !tplEarnKeys && prefEarn.includes(k);
        return Number(v) !== 0 || inTpl || inPref;
      });
      const deductionEntries = orderByPref(toEntries(sv.deductions), prefDed, tplDedKeys).filter(([k, v]) => {
        const nk = norm(k);
        const inTpl = tplDedKeys ? tplDedKeys.some(tk => norm(tk) === nk) : false;
        const inPref = !tplDedKeys && prefDed.includes(k);
        return Number(v) !== 0 || inTpl || inPref;
      });

      const gross = earningsEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
      const totalDed = deductionEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
      const net = gross - totalDed;

      return (
        <Card title="Salary Structure" extra={<Button onClick={openEditSalary}>Edit</Button>}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card size="small" title="Earnings">
                {earningsEntries.map(([k, v]) => (
                  <Row key={k} style={{ marginBottom: 8 }}>
                    <Col span={16}>{labelize(k, allTplKeys)}</Col>
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
                {deductionEntries.map(([k, v]) => (
                  <Row key={k} style={{ marginBottom: 8 }}>
                    <Col span={16}>{labelize(k, allTplKeys)}</Col>
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
              <Col span={8} style={{ textAlign: 'right' }}><strong>{currency(net)}</strong></Col>
            </Row>
          </Card>

          <Modal title="Edit Salary Structure" open={salaryEditOpen} onCancel={() => setSalaryEditOpen(false)} onOk={saveSalary} okText="Save" width={700}>
            <Form form={salaryForm} layout="vertical">
              <Row gutter={12}>
                <Col span={12}>
                  <Card size="small" title="Earnings">
                    <Form.List name="earnings">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                              <Col span={13}><Form.Item {...rest} name={[name, 'name']}><Input placeholder="Name" /></Form.Item></Col>
                              <Col span={9}><Form.Item {...rest} name={[name, 'amount']}><InputNumber min={0} step={100} style={{ width: '100%' }} /></Form.Item></Col>
                              <Col span={2} style={{ textAlign: 'right' }}>
                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          ))}
                          {/* <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name: '', amount: 0 })} block>Add More</Button> */}
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
                            <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                              <Col span={13}><Form.Item {...rest} name={[name, 'name']}><Input placeholder="Name" /></Form.Item></Col>
                              <Col span={9}><Form.Item {...rest} name={[name, 'amount']}><InputNumber min={0} step={100} style={{ width: '100%' }} /></Form.Item></Col>
                              <Col span={2} style={{ textAlign: 'right' }}>
                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          ))}
                          {/* <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name: '', amount: 0 })} block>Add More</Button> */}
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
    if (activeKey === 'salaryOverview') {

      const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

      const staffTplId = staff?.profile?.salaryTemplateId || staff?.salaryTemplateId;
      const tpl = salaryTemplates.find(t => t.id === staffTplId);
      const sv = extractSV(staff || {});

      let tplEarnKeys = null;
      let tplDedKeys = null;
      const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');

      if (tpl) {
        try {
          const parse = (v) => typeof v === 'string' ? JSON.parse(v) : (v || []);
          tplEarnKeys = parse(tpl.earnings).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer'));
          tplDedKeys = parse(tpl.deductions).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer')).map(k => {
            const nk = norm(k);
            if (nk === 'providentfundemployee' || nk === 'providentfund') return 'provident_fund';
            if (nk === 'esiemployee' || nk === 'esi') return 'esi';
            if (nk === 'professionaltax') return 'professional_tax';
            return k;
          });
        } catch (e) { }
      }
      const allTplKeys = [...(tplEarnKeys || []), ...(tplDedKeys || [])];

      const labelize = (k, tplKeys = []) => {
        if (!k) return '';
        const nk = norm(k);
        const match = tplKeys.find(tk => norm(tk) === nk);
        if (match) return match;
        const upper = { hra: 'HRA', da: 'DA', pf: 'PF', esi: 'ESI' };
        if (upper[k.toLowerCase()]) return upper[k.toLowerCase()];
        if (nk === 'providentfund' || nk === 'providentfundemployee') return 'Employee PF';
        return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      };

      const earningsEntries = orderByPref(toEntries(sv.earnings), prefEarn, tplEarnKeys).filter(([k, v]) => {
        const nk = norm(k);
        const inTpl = tplEarnKeys ? tplEarnKeys.some(tk => norm(tk) === nk) : false;
        const inPref = !tplEarnKeys && prefEarn.includes(k);
        return Number(v) !== 0 || inTpl || inPref;
      });
      const deductionEntries = orderByPref(toEntries(sv.deductions), prefDed, tplDedKeys).filter(([k, v]) => {
        const nk = norm(k);
        const inTpl = tplDedKeys ? tplDedKeys.some(tk => norm(tk) === nk) : false;
        const inPref = !tplDedKeys && prefDed.includes(k);
        return Number(v) !== 0 || inTpl || inPref;
      });

      const gross = earningsEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
      const totalDed = deductionEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
      const net = gross - totalDed;

      // use openEditSalary/saveSalary lifted to component scope

      const hasMoreMonths = Number.isFinite(maxSalaryMonths) ? monthsCount < maxSalaryMonths : true;
      const handleLoadMore = () => setMonthsCount((c) => Math.min(c + 5, maxSalaryMonths));
      const handleAddPrev = () => setMonthsCount((c) => Math.min(c + 1, maxSalaryMonths));

      const openEditPayroll = (m) => {
        if (!m.payrollData) return message.warning('Payroll not generated for this month');
        setEditPayrollRow({ ...m.payrollData, cycleId: m.cycleData?.id, monthKey: m.key }); // Need cycleId
        editPayrollForm.setFieldsValue({
          earnings: JSON.stringify(m.payrollData.earnings || {}, null, 2),
          incentives: JSON.stringify(m.payrollData.incentives || {}, null, 2),
          deductions: JSON.stringify(m.payrollData.deductions || {}, null, 2),
          remarks: m.payrollData.remarks || ''
        });
        setEditPayrollOpen(true);
      };

      const submitEditPayroll = async () => {
        if (!editPayrollRow) return;
        try {
          const vals = await editPayrollForm.validateFields();
          let earnings, incentives, deductions;
          try { earnings = vals.earnings ? JSON.parse(vals.earnings) : undefined; } catch { message.error('Invalid earnings JSON'); return; }
          try { incentives = vals.incentives ? JSON.parse(vals.incentives) : undefined; } catch { message.error('Invalid incentives JSON'); return; }
          try { deductions = vals.deductions ? JSON.parse(vals.deductions) : undefined; } catch { message.error('Invalid deductions JSON'); return; }

          const payload = { remarks: vals.remarks };
          if (earnings && typeof earnings === 'object') payload.earnings = earnings;
          if (incentives && typeof incentives === 'object') payload.incentives = incentives;
          if (deductions && typeof deductions === 'object') payload.deductions = deductions;

          setLoading(true);
          const res = await api.put(`/admin/payroll/${editPayrollRow.cycleId}/line/${editPayrollRow.id}`, payload);
          if (res.data?.success) {
            message.success('Payroll updated');
            setEditPayrollOpen(false);
            setEditPayrollRow(null);
            loadSalaryMonths(); // Refresh
          } else {
            message.error('Update failed');
          }
        } catch (e) { message.error('Update failed'); }
        finally { setLoading(false); }
      };

      const generatePayslipPDF = async (payrollLine, cycleData) => {
        if (!payrollLine || !cycleData) return message.error('Missing data');
        // Re-use logic from PayrollList or similar
        try {
          const brandInfo = { displayName: 'Thinktech Software' }; // Or fetch

          let attendanceData = { workingDays: 26, presentDays: 26, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffDays: 0, holidays: 0, halfDays: 0 };
          const sum = payrollLine.attendanceSummary || {};
          if (sum && (sum.present != null || sum.absent != null)) {
            attendanceData.presentDays = Number(sum.present || 0);
            attendanceData.absentDays = Number(sum.absent || 0);
            attendanceData.paidLeaveDays = Number(sum.paidLeave || 0);
            attendanceData.unpaidLeaveDays = Number(sum.unpaidLeave || 0);
            attendanceData.weeklyOffDays = Number(sum.weeklyOff || 0);
            attendanceData.holidays = Number(sum.holidays || 0);
            attendanceData.halfDays = Number(sum.half || 0);
            attendanceData.workingDays = attendanceData.presentDays + attendanceData.absentDays + attendanceData.paidLeaveDays + attendanceData.unpaidLeaveDays + attendanceData.weeklyOffDays + attendanceData.holidays + attendanceData.halfDays;
          }

          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const margin = 20;
          let yPosition = margin;

          const addText = (text, fontSize = 11, isBold = false, x = margin) => {
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
            pdf.text(text, x, yPosition);
            yPosition += 6;
          };

          // Header
          pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
          pdf.text(brandInfo.displayName, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 8;

          pdf.setFontSize(12); pdf.setFont('helvetica', 'normal');
          pdf.text('Payslip for the month of ' + dayjs(cycleData.monthKey).format('MMMM YYYY'), pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 15;

          // Employee Info
          const leftX = margin;
          const rightX = pageWidth / 2 + 20;
          const startY = yPosition;

          pdf.setFontSize(10);
          pdf.text(`Employee Name: ${staff?.profile?.name || ''}`, leftX, yPosition); yPosition += 6;
          pdf.text(`Employee ID: ${staff?.id || ''}`, leftX, yPosition); yPosition += 6;
          pdf.text(`Department: ${staff?.department || 'General'}`, leftX, yPosition); yPosition += 6;
          pdf.text(`Designation: ${staff?.designation || 'Employee'}`, leftX, yPosition);

          yPosition = startY;
          pdf.text(`Pay Period: ${cycleData.monthKey}`, rightX, yPosition); yPosition += 6;
          pdf.text(`Status: ${payrollLine.paidAt ? 'PAID' : 'DUE'}`, rightX, yPosition); yPosition += 6;
          pdf.text(`Generated: ${dayjs().format('DD-MM-YYYY')}`, rightX, yPosition); yPosition += 6;
          pdf.text(`Working Days: ${attendanceData.workingDays}`, rightX, yPosition);

          yPosition += 15;
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;

          // Table
          const totals = payrollLine.totals || {};
          const ratio = Number(totals.ratio ?? 1);
          const safeParse = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : (v || {}); } catch { return {}; } };
          const pe = safeParse(payrollLine.earnings);
          const pi = safeParse(payrollLine.incentives);
          const pd = safeParse(payrollLine.deductions);

          const dbTotalEarnings = Math.round(Number(totals.totalEarnings || 0));
          const dbTotalDeductions = Math.round(Number(totals.totalDeductions || 0));

          // Distribute function to match UI logic
          const distribute = (entries, targetTotal) => {
            const totalWeight = entries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
            if (totalWeight === 0) return entries.map(([k]) => ({ k, v: 0 }));
            let dist = entries.map(([k, v]) => ({ k, v: Math.round(((Number(v) || 0) / totalWeight) * targetTotal) }));
            const curr = dist.reduce((s, i) => s + i.v, 0);
            const diff = targetTotal - curr;
            if (diff !== 0 && dist.length > 0) dist.reduce((p, c) => p.v > c.v ? p : c).v += diff;
            return dist;
          };

          const finalEarnings = [
            ...distribute(Object.entries(pe), dbTotalEarnings),
            ...Object.entries(pi).map(([k, v]) => ({ k: k + ' (Incentive)', v })) // Incentives usually flat, or use distribute logic if needed
          ];
          const finalDeductions = distribute(Object.entries(pd), dbTotalDeductions);

          // Draw Table
          const col1 = margin; const col2 = margin + 80; const col3 = margin + 110; const col4 = pageWidth - margin;

          pdf.setFont('helvetica', 'bold');
          pdf.text('Earnings', col1, yPosition); pdf.text('Amount', col2, yPosition, { align: 'right' });
          pdf.text('Deductions', col3, yPosition); pdf.text('Amount', col4, yPosition, { align: 'right' });
          yPosition += 8;
          pdf.setFont('helvetica', 'normal');

          const maxRows = Math.max(finalEarnings.length, finalDeductions.length);
          for (let i = 0; i < maxRows; i++) {
            const e = finalEarnings[i];
            const d = finalDeductions[i];

            if (e) { pdf.text(String(e.k), col1, yPosition); pdf.text(String(e.v), col2, yPosition, { align: 'right' }); }
            if (d) { pdf.text(String(d.k), col3, yPosition); pdf.text(String(d.v), col4, yPosition, { align: 'right' }); }
            yPosition += 6;
          }

          yPosition += 4;
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 8;

          pdf.setFont('helvetica', 'bold');
          pdf.text('Total Earnings', col1, yPosition); pdf.text(String(dbTotalEarnings + (Number(totals.totalIncentives || 0))), col2, yPosition, { align: 'right' });
          pdf.text('Total Deductions', col3, yPosition); pdf.text(String(dbTotalDeductions), col4, yPosition, { align: 'right' });

          yPosition += 10;
          pdf.setFontSize(12);
          pdf.text(`Net Pay: ${Number(totals.netSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, yPosition, { align: 'right' });

          pdf.save(`payslip_${staff.id}_${cycleData.monthKey}.pdf`);

        } catch (e) { console.error(e); message.error('PDF Generaton failed'); }
      };

      const handleGenerateSlip = async () => {
        const m = (salaryMonths || []).find((x) => x.key === activeMonthKey) || salaryMonths[0];
        if (!m) return message.warning('No month selected');

        if (m.payrollData) {
          generatePayslipPDF(m.payrollData, m.cycleData);
        } else {
          // Generate Payroll First
          if (!m.cycleData?.id) return message.error('Cycle not found');
          try {
            setLoading(true);
            const res = await api.post(`/admin/payroll/${m.cycleData.id}/compute`, { staffId: id });
            message.success('Payroll generated');
            loadSalaryMonths(); // Refresh to get the new payroll data
            // Ideally wait for refresh then print, but for now user can click again or we can fetch line
          } catch (e) { message.error('Failed to generate payroll'); }
          finally { setLoading(false); }
        }
      };

      return (
        <Card title="Salary Overview" extra={
          <Space>
            <Button onClick={() => setManualSalaryOpen(true)}>Add Previous Month Salary</Button>
            {/* <Button onClick={handleAddPrev} disabled={!hasMoreMonths}>+ Add Previous Month</Button> */}
            {(() => {
              const m = (salaryMonths || []).find((x) => x.key === activeMonthKey);
              return (
                <>
                  {/* {m?.payrollData && <Button icon={<EditOutlined />} onClick={() => openEditPayroll(m)}>Edit Payroll</Button>} */}
                  {/* <Button type="primary" onClick={handleGenerateSlip} loading={loading}>
                    {m?.payrollData ? 'Generate Salary Slip' : 'Generate Payroll & Slip'}
                  </Button> */}
                </>
              );
            })()}
          </Space>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Collapse accordion bordered={false}
              onChange={(key) => setActiveMonthKey(Array.isArray(key) ? key[0] : key)}
              items={(salaryMonths || []).map(m => ({
                key: m.key,
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.title}</div>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>Duration: {m.range}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{currency(m.amount)}</div>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                        {m.paymentStatus === 'PAID' ? 'paid' : 'due'} - {currency(m.paymentStatus === 'PAID' ? m.paidAmount : m.dueAmount)}
                      </div>
                    </div>
                  </div>
                ),
                children: (
                  <div>
                    {(() => {
                      let finalEarnings = [];
                      let finalDeductions = [];
                      let targetGross = 0;
                      let targetDed = 0;

                      // Helper to distribute total into components
                      const distribute = (entries, targetTotal, tplKeys) => {
                        const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');

                        // CRITICAL: Filter entries FIRST to decide what to show
                        const filteredEntries = entries.filter(([k, v]) => {
                          const nk = norm(k);
                          const inTpl = tplKeys ? tplKeys.some(tk => norm(tk) === nk) : false;
                          const inPref = !tplKeys && (prefEarn.includes(k) || prefDed.includes(k)); // fallback if no tpl
                          return Number(v) !== 0 || inTpl;
                        });

                        const totalWeight = filteredEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
                        if (totalWeight === 0) return filteredEntries.map(([k]) => ({ key: k, label: labelize(k, allTplKeys), amount: 0 }));

                        let distribution = filteredEntries.map(([k, v]) => ({
                          key: k,
                          label: labelize(k, allTplKeys),
                          amount: Math.round(((Number(v) || 0) / totalWeight) * targetTotal)
                        }));

                        // Fix rounding error
                        const currentSum = distribution.reduce((s, i) => s + i.amount, 0);
                        const diff = targetTotal - currentSum;
                        if (diff !== 0 && distribution.length > 0) {
                          const largest = distribution.reduce((p, c) => (p.amount > c.amount ? p : c));
                          largest.amount += diff;
                        }
                        return distribution;
                      };

                      // Helper to parse potential JSON string
                      const safeParse = (v) => {
                        if (!v) return {};
                        if (typeof v === 'object') return v;
                        try { return JSON.parse(v); } catch { return {}; }
                      };

                      if (m.payrollData) {
                        // Use Authoritative Data from Payroll Line

                        const totals = safeParse(m.payrollData.totals);
                        const pe = safeParse(m.payrollData.earnings);
                        const pi = safeParse(m.payrollData.incentives);
                        const pd = safeParse(m.payrollData.deductions);

                        // We must apply the ratio from 'totals.ratio' just like PayrollList.js
                        const ratio = Number(totals.ratio ?? 1);

                        // Target Totals from DB
                        const dbTotalEarnings = Math.round(Number(totals.totalEarnings || 0));
                        const dbTotalIncentives = Math.round(Number(totals.totalIncentives || 0));
                        const dbTotalDeductions = Math.round(Number(totals.totalDeductions || 0));

                        // Distribute Earnings
                        const earningsList = Object.entries(pe);
                        const earningsDist = distribute(earningsList, dbTotalEarnings, tplEarnKeys);

                        // Incentives
                        const incentivesList = Object.entries(pi);
                        const incentivesDist = distribute(incentivesList, dbTotalIncentives).map(i => ({ ...i, label: i.label + ' (Incentive)' }));

                        finalEarnings = [...earningsDist, ...incentivesDist];

                        // Deductions
                        const deductionsList = Object.entries(pd);
                        finalDeductions = distribute(deductionsList, dbTotalDeductions, tplDedKeys);

                        targetGross = dbTotalEarnings + dbTotalIncentives;
                        targetDed = dbTotalDeductions;

                      } else {
                        // FALLBACK: Estimate using Ratio (if no payroll line exists yet)
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
                        const baseGross = sum(svM.earnings);
                        const baseDed = sum(svM.deductions);

                        // Ratio based Targets
                        const ratio = m.ratio ?? 1;
                        const estDed = Math.round(baseDed * ratio);
                        const estGross = (m.amount || 0) + estDed;

                        targetDed = estDed;
                        targetGross = estGross;

                        finalEarnings = distribute(eEntries, targetGross, tplEarnKeys);
                        finalDeductions = distribute(dEntries, targetDed, tplDedKeys);
                      }

                      return (
                        <>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Card size="small" title="Earnings">
                                {finalEarnings.map((item) => (
                                  <Row key={item.key} style={{ marginBottom: 8 }}>
                                    <Col span={16}>{item.label}</Col>
                                    <Col span={8} style={{ textAlign: 'right' }}>{currency(item.amount)}</Col>
                                  </Row>
                                ))}
                                <Divider style={{ margin: '8px 0' }} />
                                <Row>
                                  <Col span={16}><strong>Gross Earnings</strong></Col>
                                  <Col span={8} style={{ textAlign: 'right' }}><strong>{currency(targetGross)}</strong></Col>
                                </Row>
                              </Card>
                            </Col>
                            <Col xs={24} md={12}>
                              <Card size="small" title="Deductions">
                                {finalDeductions.map((item) => (
                                  <Row key={item.key} style={{ marginBottom: 8 }}>
                                    <Col span={16}>{item.label}</Col>
                                    <Col span={8} style={{ textAlign: 'right' }}>{currency(item.amount)}</Col>
                                  </Row>
                                ))}
                                <Divider style={{ margin: '8px 0' }} />
                                <Row>
                                  <Col span={16}><strong>Total Deductions</strong></Col>
                                  <Col span={8} style={{ textAlign: 'right' }}><strong>{currency(targetDed)}</strong></Col>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <Button onClick={openEditSalary}>Edit Salary Structure</Button>
                      <Button type="link">View Variables</Button>
                    </div>
                  </div>
                )
              }))}
            />
            {hasMoreMonths ? (
              <div style={{ textAlign: 'center' }}>
                <Button type="link" onClick={handleLoadMore}>Load more</Button>
              </div>
            ) : null}
          </div>

          <Modal title="Add Historical Salary" open={manualSalaryOpen} onCancel={() => setManualSalaryOpen(false)} onOk={saveManualSalary} okText="Save" centered>
            <Form form={manualSalaryForm} layout="vertical">
              <Form.Item name="month" label="Select Month" rules={[{ required: true, message: 'Please select month' }]}>
                <DatePicker
                  picker="month"
                  style={{ width: '100%' }}
                  disabledDate={(current) => {
                    const cutoff = staffStartMonth || dayjs().startOf('month');
                    return current && current.isSameOrAfter ? current.isSameOrAfter(cutoff, 'month') : !current.isBefore(cutoff, 'month');
                  }}
                />
              </Form.Item>
              <Form.Item name="netAmount" label="Net Salary Amount" rules={[{ required: true, message: 'Please enter amount' }]}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="₹" placeholder="Enter net amount" />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'attendance') {
      const getStatusColor = (status) => {
        switch (status) {
          case 'present': return 'success';
          case 'absent': return 'error';
          case 'half_day': return 'warning';
          case 'leave': return 'processing';
          case 'overtime': return 'purple';
          case 'late': return 'orange';
          case 'weekly_off':
          case 'holiday': return 'default';
          default: return 'default';
        }
      };

      const getStatusIcon = (status) => {
        switch (status) {
          case 'present': return <CheckCircleOutlined />;
          case 'absent': return <CloseCircleOutlined />;
          case 'half_day': return <ClockCircleOutlined />;
          case 'leave': return <CoffeeOutlined />;
          case 'overtime': return <SyncOutlined />;
          case 'late': return <ExclamationCircleOutlined />;
          case 'weekly_off': return <ScheduleOutlined />;
          case 'holiday': return <CalendarOutlined />;
          default: return null;
        }
      };

      const columns = [
        {
          title: 'Date',
          dataIndex: 'date',
          key: 'date',
          render: (d, r) => (
            <Space direction="vertical" size={0}>
              <Text strong>{dayjs(d).format('DD MMM')}</Text>
              <Text type="secondary" size="small">{r.day}</Text>
            </Space>
          )
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (s, r) => {
            const hasAttended = !!r.checkIn;
            const isOffDay = s === 'weekly_off' || s === 'holiday';
            return (
              <Space>
                <Tag icon={getStatusIcon(s)} color={getStatusColor(s)}>
                  {(s || '').replace('_', ' ').toUpperCase()}
                </Tag>
                {isOffDay && hasAttended && (
                  <Tag color="success" icon={<CheckCircleOutlined />}>PRESENT</Tag>
                )}
                {r.isLate && <Tag color="orange" icon={<ClockCircleOutlined />}>LATE</Tag>}
              </Space>
            );
          }
        },
        {
          title: 'Check In',
          key: 'checkIn',
          render: (_, r) => (
            <Space size="small">
              <Text>{r.checkIn || '--:--'}</Text>
              {r.source === 'biometric' && <Tooltip title="Biometric Punch"><SyncOutlined style={{ fontSize: 10, color: '#1890ff' }} /></Tooltip>}
            </Space>
          )
        },
        {
          title: 'Check Out',
          key: 'checkOut',
          render: (_, r) => (
            <Space size="small">
              <Text>{r.checkOut || '--:--'}</Text>
            </Space>
          )
        },
        {
          title: 'Break',
          key: 'break',
          render: (_, r) => (
            <Text>{r.breakMinutes > 0 ? `${Math.floor(r.breakMinutes / 60)}h ${r.breakMinutes % 60}m` : '-'}</Text>
          )
        },
        {
          title: 'Work / OT',
          key: 'duration',
          render: (_, r) => (
            <Space direction="vertical" size={0}>
              {r.totalDurationMinutes > 0 ? (
                <Text>{Math.floor(r.totalDurationMinutes / 60)}h {r.totalDurationMinutes % 60}m</Text>
              ) : (
                r.workDuration > 0 ? (
                  <Text>{Math.floor(r.workDuration / 60)}h {r.workDuration % 60}m</Text>
                ) : (
                  <Text type="secondary">-</Text>
                )
              )}
              {r.overtimeMinutes > 0 && <Text type="success" size="small">+{r.overtimeMinutes}m OT</Text>}
            </Space>
          )
        },
      ];

      return (
        <Card
          title={<Space><CalendarOutlined /> Attendance Overview</Space>}
          extra={
            <Space>
              <DatePicker picker="month" value={attMonth} onChange={(m) => setAttMonth(m)} allowClear={false} />
              <Button icon={<DownloadOutlined />} onClick={exportMonth}>Export</Button>
            </Space>
          }
        >
          {/* <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} md={4}>
              <Card size="small" className="stat-card">
                <Statistic title="Present" value={attStats.present || 0} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small" className="stat-card">
                <Statistic title="Absent" value={attStats.absent || 0} valueStyle={{ color: '#cf1322' }} prefix={<CloseCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small" className="stat-card">
                <Statistic title="Late" value={attStats.late || 0} valueStyle={{ color: '#d46b08' }} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small" className="stat-card">
                <Statistic title="OT Days" value={attStats.overtime || 0} valueStyle={{ color: '#722ed1' }} prefix={<SyncOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small" className="stat-card">
                <Statistic title="Leave" value={attStats.leave || 0} valueStyle={{ color: '#1890ff' }} prefix={<CoffeeOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small" className="stat-card">
                <Statistic
                  title={<Tooltip title="Deduction based on company rules">Penalty</Tooltip>}
                  value={attStats.latePenaltyDays || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<MinusCircleOutlined />}
                  suffix="Days"
                />
              </Card>
            </Col>
          </Row> */}

          <Table
            rowKey="date"
            columns={columns}
            dataSource={attRows}
            loading={attLoading}
            pagination={{ pageSize: 31, hideOnSinglePage: true }}
            size="middle"
            className="attendance-table"
          />

          <Modal title="Mark Attendance" open={markOpen} onCancel={() => setMarkOpen(false)} onOk={saveMark} okText="Save">
            <Form form={markForm} layout="vertical">
              <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select date' }]}>
                <DatePicker style={{ width: '100%' }} />
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
                <TimePicker style={{ width: '100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
              <Form.Item name="checkOut" label="Check-out Time">
                <TimePicker style={{ width: '100%' }} format="hh:mm A" use12Hours />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'documents') {
      const columns = [
        { title: 'Title', dataIndex: 'fileName', key: 'fileName', render: (t) => t || '-' },
        {
          title: 'Type', dataIndex: 'docType', key: 'docType', render: (_t, r) => {
            const src = (r.fileName || r.fileUrl || '').toString();
            const dot = src.lastIndexOf('.');
            const ext = dot >= 0 ? src.substring(dot + 1).toLowerCase() : '';
            const map = { jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG', pdf: 'PDF', webp: 'WEBP' };
            return map[ext] || (ext ? ext.toUpperCase() : '-');
          }
        },
        {
          title: 'File', dataIndex: 'fileUrl', key: 'fileUrl', render: (u) => {
            if (!u) return '-';
            const token = sessionStorage.getItem('impersonate_token') || localStorage.getItem('token');
            const href = `${api.defaults.baseURL}${String(u)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
            return <a href={href} target="_blank" rel="noreferrer">View</a>;
          }
        },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag>{String(s || 'SUBMITTED')}</Tag> },
        { title: 'Expires On', dataIndex: 'expiresAt', key: 'expiresAt', render: (d) => d ? dayjs(d).format('DD MMM YYYY') : '-' },
        {
          title: 'Actions', key: 'actions', render: (_, r) => {
            const token = sessionStorage.getItem('impersonate_token') || localStorage.getItem('token');
            const fileHref = r.fileUrl ? `${api.defaults.baseURL}${String(r.fileUrl)}${token ? `?token=${encodeURIComponent(token)}` : ''}` : null;
            const items = [
              fileHref ? { key: 'view', label: <a href={fileHref} target="_blank" rel="noreferrer">View</a> } : null,
              { key: 'edit', label: <span onClick={() => { setEditingDoc(r); docForm.resetFields(); docForm.setFieldsValue({ title: r.fileName || '', docType: r.docType || r.documentTypeId || undefined, expiresAt: r.expiresAt ? dayjs(r.expiresAt) : null, notes: r.notes || '' }); setDocFile(null); setDocOpen(true); }}>Edit</span> },
              {
                key: 'delete', label: (
                  <Popconfirm title="Delete document?" onConfirm={async () => {
                    try { await api.delete(`/admin/documents/${r.id}`); const res = await api.get(`/admin/staff/${id}/documents`); if (res.data?.success) setDocuments(res.data.data || []); } catch (e) { message.error(e?.response?.data?.message || 'Failed'); }
                  }}>
                    <span style={{ color: '#ff4d4f' }}>Delete</span>
                  </Popconfirm>
                )
              }
            ].filter(Boolean);
            return (
              <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
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
          <Table rowKey={(r) => r.id} columns={columns} dataSource={documents} loading={docsLoading} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
          <Modal title={editingDoc ? 'Edit Document' : 'Add Document'} open={docOpen} onCancel={() => { setDocOpen(false); setDocFile(null); }} onOk={saveDoc} okText={editingDoc ? 'Save' : 'Upload'}>
            <Form form={docForm} layout="vertical">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="docType" label="Document Type"><Input placeholder="E.g. Aadhar, PAN" /></Form.Item></Col>
                <Col span={12}><Form.Item name="expiresAt" label="Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="title" label="Title"><Input placeholder="Document name" /></Form.Item>
              <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item label="File">
                <Upload.Dragger multiple={false} maxCount={1}
                  beforeUpload={(file) => {
                    const isLt10M = file.size / 1024 / 1024 < 10;
                    if (!isLt10M) {
                      message.error('File must be smaller than 10MB!');
                      return Upload.LIST_IGNORE;
                    }
                    const isAllowedType = file.type === 'application/pdf' || file.type.startsWith('image/');
                    if (!isAllowedType) {
                      message.error('You can only upload Images (JPG, PNG, etc.) or PDF files!');
                      return Upload.LIST_IGNORE;
                    }
                    setDocFile(file);
                    return false;
                  }}
                  onRemove={() => { setDocFile(null); }}
                  accept="image/*,.pdf"
                >
                  <p className="ant-upload-drag-icon">📄</p>
                  <p className="ant-upload-text">Click or drag file to upload</p>
                  <p className="ant-upload-hint">Images (JPG, PNG) or PDFs. Max size 10MB.</p>
                </Upload.Dragger>
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'leaves') {
      const columns = [
        {
          title: 'Duration',
          key: 'duration',
          render: (_, record) => (
            <Space direction="vertical" size={0}>
              <Text>{dayjs(record.startDate).format('DD MMM YYYY')} - {dayjs(record.endDate).format('DD MMM YYYY')}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>{record.days} Days ({record.leaveType})</Text>
            </Space>
          )
        },
        {
          title: 'Leave Type',
          dataIndex: 'categoryKey',
          key: 'categoryKey',
          render: (text) => {
            const name = categoryNames[text?.toLowerCase()] || text?.toUpperCase() || 'UNPAID';
            return <Tag color="blue">{name}</Tag>;
          }
        },
        {
          title: 'Reason',
          dataIndex: 'reason',
          key: 'reason',
          ellipsis: true
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (status) => {
            let color = 'gold';
            if (status === 'APPROVED') color = 'green';
            if (status === 'REJECTED') color = 'red';
            return <Tag color={color}>{status}</Tag>;
          }
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 250,
          render: (_, record) => record.status === 'PENDING' && (
            <Space size="small">
              <Button
                type="primary"
                ghost
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleReviewLeave(record, 'APPROVED')}
              >
                Approve
              </Button>
              <Button
                danger
                ghost
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleReviewLeave(record, 'REJECTED')}
              >
                Reject
              </Button>
            </Space>
          )
        }
      ];

      return (
        <Card title="Leave Requests" extra={
          <Space>
            <Text>Filter by Status:</Text>
            <Select value={leaveStatusFilter} onChange={setLeaveStatusFilter} style={{ width: 150 }}>
              <Select.Option value="">All</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="APPROVED">Approved</Select.Option>
              <Select.Option value="REJECTED">Rejected</Select.Option>
            </Select>
            <Button type="primary" onClick={loadLeaves}>Refresh</Button>
          </Space>
        }>
          <Table
            columns={columns}
            dataSource={leaves}
            rowKey="id"
            loading={leavesLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
          <Modal
            title={`${reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`}
            open={isNoteModalVisible}
            onOk={submitReviewLeave}
            confirmLoading={reviewLoading}
            onCancel={() => setIsNoteModalVisible(false)}
          >
            <Text strong>Reason for {reviewAction?.toLowerCase()}:</Text>
            <Input.TextArea
              rows={4}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Enter note..."
              style={{ marginTop: '10px' }}
            />
          </Modal>
        </Card>
      );
    }
    if (activeKey === 'orgAccess') {
      const currentOrgId = staff?.orgAccountId;
      const filteredOrgs = (staff?.allOrgs || []).filter(o => o.id !== currentOrgId);

      return (
        <Card title={<Space><ShopOutlined /> Organization Access</Space>}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Manage this staff member's administrative access across your organizations.</Text>
          </div>
          <div style={{ marginBottom: 20, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <Text strong>Current Organization: </Text>
            <Tag color="green">{(staff?.allOrgs || []).find(o => o.id === currentOrgId)?.name || 'Frinktech'}</Tag>
            <Text type="secondary" style={{ marginLeft: 8 }}>(Primary access - cannot be unassigned here)</Text>
          </div>
          <Table
            rowKey="id"
            pagination={false}
            dataSource={filteredOrgs}
            columns={[
              { title: 'Organization Name', dataIndex: 'name', key: 'name', render: (text) => <Text strong>{text}</Text> },
              { title: 'Org ID', dataIndex: 'id', key: 'id' },
              {
                title: 'Status',
                key: 'status',
                render: (_, r) => {
                  const isAssigned = (staff?.existingOrgs || []).some(o => o.id === r.id);
                  return (
                    <Tag color={isAssigned ? 'blue' : 'default'}>
                      {isAssigned ? 'Assigned' : 'Not Assigned'}
                    </Tag>
                  );
                }
              },
              {
                title: 'Action',
                key: 'action',
                render: (_, r) => {
                  const isAssigned = (staff?.existingOrgs || []).some(o => o.id === r.id);
                  return isAssigned ? (
                    <Button
                      danger
                      type="primary"
                      ghost
                      size="small"
                      loading={assigningOrg === r.id}
                      onClick={() => {
                        Modal.confirm({
                          title: 'Unassign Organization',
                          content: `Are you sure you want to remove this staff member's access to ${r.name}?`,
                          onOk: () => handleUnassignToOrg(r.id)
                        });
                      }}
                    >
                      Unassign
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      loading={assigningOrg === r.id}
                      onClick={() => handleAssignToOrg(r.id)}
                    >
                      Assign
                    </Button>
                  );
                }
              }
            ]}
          />
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
                    items={sections
                      .filter(s => s.key !== 'orgAccess' || staff?.canCreateOrg)
                      .map(s => ({ key: s.key, icon: s.icon, label: s.label }))
                    }
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