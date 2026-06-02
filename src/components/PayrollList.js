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
  Col,
  Popover,
  Tooltip
} from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, PlusOutlined, MinusCircleOutlined, InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api, { API_BASE_URL } from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

const categoryNames = {
  'cl': 'Casual Leave',
  'sl': 'Sick Leave',
  'el': 'Earned Leave',
  'ml': 'Maternity Leave',
  'pt': 'Paternity Leave'
};

const getDaysInMonthFromMonthKey = (monthKey) => {
  const [y, m] = String(monthKey || '').split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 0;
  return new Date(y, m, 0).getDate();
};

const normalizeAttendanceSummary = (summary, monthKey) => {
  const s = (summary && typeof summary === 'object') ? summary : {};
  const present = Number(s.present || 0);
  const half = Number(s.half || 0);
  const paidLeave = Number(s.paidLeave || 0);
  const leave = Number(s.leave != null ? s.leave : (paidLeave));
  const weeklyOff = Number(s.weeklyOff || 0);
  const holidays = Number(s.holidays || 0);
  const daysInMonth = getDaysInMonthFromMonthKey(monthKey);
  const existingAbsent = Number(s.absent || 0);
  const classifiedDays = present + half + leave + weeklyOff + holidays + existingAbsent;

  const [yy, mm] = String(monthKey || '').split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = Number.isFinite(yy) && Number.isFinite(mm)
    && yy === now.getFullYear()
    && mm === (now.getMonth() + 1);

  const referenceDays = (isCurrentMonth && classifiedDays > 0 && classifiedDays < daysInMonth)
    ? classifiedDays
    : daysInMonth;

  let absent = existingAbsent;
  if (referenceDays > 0) {
    absent = Math.max(0, referenceDays - (present + half + leave + weeklyOff + holidays));
  }

  const latePenaltyDays = Number(s.latePenaltyDays || s.latePenalty || 0);
  const pUnits = present + (half * 0.5) + paidLeave + weeklyOff + holidays;
  const payableDays = Math.max(0, pUnits - (s.latePenaltyDays || 0));

  return {
    ...s,
    present,
    half,
    leave,
    paidLeave,
    absent,
    weeklyOff,
    holidays,
    payableDays,
    latePenaltyDays,
    lateCount: Number(s.lateCount || 0),
    latePenalty: Number(s.latePunchInPenalty || s.latePenalty || 0),
    breakPenalty: Number(s.breakPenalty || 0),
    excessBreakMinutes: Number(s.excessBreakMinutes || 0)
  };
};

const PayrollList = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Month Selection State
  const [value, setValue] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Payroll Logic State
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState(null);
  const [lines, setLines] = useState([]);
  const [staffMap, setStaffMap] = useState({}); // id -> name
  const [staffDataMap, setStaffDataMap] = useState({}); // id -> full staff object
  const [salaryTemplates, setSalaryTemplates] = useState([]);

  // Row selection + view/edit state
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [baseData, setBaseData] = useState({ earnings: {}, incentives: {}, deductions: {} });
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  // Attendance Drill-down State
  const [drilldownModalVisible, setDrilldownModalVisible] = useState(false);
  const [drilldownRecords, setDrilldownRecords] = useState([]);
  const [drilldownType, setDrilldownType] = useState('');
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Tenure Bonus Breakdown State
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [bonusData, setBonusData] = useState(null);

  const showAttendanceDrilldown = async (userId, type) => {
    setDrilldownModalVisible(true);
    setDrilldownType(type);
    setDrilldownLoading(true);
    setDrilldownRecords([]);

    try {
      const res = await api.get(`/admin/staff/${userId}/attendance?month=${value}`);
      if (res.data?.success) {
        let filtered = [];
        if (type === 'Late') {
          filtered = res.data.data.filter(r => (r.latePunchInMinutes || 0) > 0);
        } else if (type === 'Early Exit') {
          filtered = res.data.data.filter(r => (r.earlyExitMinutes || 0) > 0);
        } else if (type === 'Break') {
          filtered = res.data.data.filter(r => (r.excessBreakMinutes || 0) > 0);
        } else if (type === 'Overtime') {
          filtered = res.data.data.filter(r => (r.overtimeMinutes || 0) > 0);
        } else if (type === 'Early Overtime') {
          filtered = res.data.data.filter(r => (r.earlyOvertimeMinutes || 0) > 0);
        }
        setDrilldownRecords(filtered);
      }
    } catch (e) {
      message.error(`Failed to fetch ${type} details`);
    } finally {
      setDrilldownLoading(false);
    }
  };

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
      const dataMap = {};
      for (const s of arr) {
        map[s.id] = s.name || s.phone || `User #${s.id}`;
        dataMap[s.id] = s;
      }
      setStaffMap(map);
      setStaffDataMap(dataMap);
    } catch (_) {
      setStaffMap({});
      setStaffDataMap({});
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await api.get('/admin/salary-templates');
      if (res?.data?.success) setSalaryTemplates(res.data.data || []);
    } catch (e) { }
  }, []);

  // Load Cycle Data
  const loadCycle = useCallback(async () => {
    try {
      setLoading(true);
      setCycle(null);
      setLines([]);
      const res = await api.get('/admin/payroll', { params: { monthKey: value } });
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
        setCycle(null);
        setLines([]);
      }
    } catch (e) {
      setCycle(null);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [value]);

  useEffect(() => {
    loadStaffMap();
    loadTemplates();
  }, [loadStaffMap, loadTemplates]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  const onCompute = async () => {
    try {
      if (!cycle) {
        message.warning('Cycle not found. Please ensure cycle is initialized.');
        return;
      }

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
      const monthKey = value;
      const cycleRes = await api.get('/admin/payroll', { params: { monthKey } });

      if (!cycleRes?.data?.success) {
        message.error('Failed to create/get payroll cycle');
        return;
      }

      const fetchedCycle = cycleRes.data.cycle;
      setCycle(fetchedCycle);

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
        loadCycle();
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
      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${cycle.monthKey}.xlsx`;
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
      const payload = {
        lineIds: selectedRowKeys,
        paidAt: new Date().toISOString(),
        paidMode: 'CASH',
        paidRef: null,
        paidAmount: null,
      };
      const res = await api.post(`/admin/payroll/${cycle.id}/lines/mark-paid`, payload);
      if (res?.data?.success) {
        message.success(`Marked paid for ${res.data.updated} employees`);
        setSelectedRowKeys([]);
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
      if (e?.errorFields) return;
      message.error('Bulk paid failed');
    } finally {
      setLoading(false);
    }
  };

  const onOpenEdit = (row) => {
    setEditRow(row);
    const userId = row?.userId || row?.user_id;
    const staffObj = staffDataMap[userId];
    const staffTplId = staffObj?.salaryTemplateId || staffObj?.profile?.salaryTemplateId;
    const tpl = salaryTemplates.find(t => t.id === staffTplId);

    const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');

    let tplEarnKeys = null;
    let tplDedKeys = null;
    if (tpl) {
      try {
        const parse = (v) => typeof v === 'string' ? JSON.parse(v) : (v || []);
        tplEarnKeys = parse(tpl.earnings).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer'));
        tplDedKeys = parse(tpl.deductions).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer')).map(k => {
          const nk = norm(k);
          if (nk === 'providentfund' || nk === 'providentfundemployee') return 'provident_fund';
          if (nk === 'esi' || nk === 'esiemployee') return 'esi';
          if (nk === 'professionaltax') return 'professional_tax';
          return k;
        });
      } catch (e) { }
    }

    const prefEarn = ['basic_salary', 'hra', 'da', 'special_allowance', 'conveyance_allowance', 'medical_allowance', 'telephone_allowance', 'other_allowances'];
    const prefDed = ['provident_fund', 'esi', 'professional_tax', 'income_tax', 'loan_deduction', 'other_deductions'];

    const acc = row?.attendanceSummary || {};
    const [year, month] = (cycle?.monthKey || '').split('-').map(Number);
    const dMonth = new Date(year, month, 0).getDate();
    const pUnits = (Number(acc.present || 0)) + (Number(acc.half || 0) * 0.5) + (Number(acc.paidLeave || 0)) + (Number(acc.weeklyOff || 0)) + (Number(acc.holidays || 0));
    const calculatedRatio = dMonth > 0 ? pUnits / dMonth : 1;
    const currentRatio = calculatedRatio > 0.001 ? calculatedRatio : Number(row?.totals?.ratio ?? 1);

    const reverse = (obj) => {
      const res = {};
      Object.entries(obj || {}).forEach(([k, v]) => {
        res[k] = currentRatio > 0.001 ? Number(v || 0) / currentRatio : Number(v || 0);
      });
      return res;
    };

    let bE = reverse(row?.earnings);
    let bI = reverse(row?.incentives);
    let bD = reverse(row?.deductions);

    const sumVal = (o) => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    if (sumVal(bE) === 0 && staffObj) {
      const u = staffObj;
      const parseMaybe = (v) => {
        if (!v) return v;
        if (typeof v !== 'string') return v;
        try { v = JSON.parse(v); } catch { return v; }
        return v;
      };
      const sv = parseMaybe(u.salaryValues || u.salary_values || u.profile?.salaryValues);
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

    const filterEntries = (obj, pref, tplKeys) => {
      return Object.entries(obj || {}).filter(([k, v]) => {
        const nk = norm(k);
        const inTpl = tplKeys ? tplKeys.some(tk => norm(tk) === nk) : false;
        const inPref = !tplKeys && pref.includes(k);
        return Number(v) !== 0 || inTpl || inPref;
      });
    };

    const toArrRaw = (entries, tplKeys) => entries.map(([k, v]) => {
      let label = k;
      const nk = norm(k);
      const match = tplKeys ? tplKeys.find(tk => norm(tk) === nk) : null;
      if (match) label = match;
      else {
        if (k.startsWith('LEAVE_ENCASHMENT:')) {
          const key = k.split(': ')[1]?.toLowerCase();
          if (key && categoryNames[key]) label = `LEAVE_ENCASHMENT: ${categoryNames[key]}`;
        }
      }
      return {
        name: label,
        amount: Number(v || 0)
      };
    });

    const earningsEntries = filterEntries(row?.earnings, prefEarn, tplEarnKeys);
    const deductionEntries = filterEntries(row?.deductions, prefDed, tplDedKeys);
    const incentiveEntries = Object.entries(row?.incentives || {});

    const att = normalizeAttendanceSummary(row?.attendanceSummary || {}, cycle?.monthKey);

    editForm.setFieldsValue({
      status: row?.status || 'INCLUDED',
      remarks: row?.remarks || '',
      earnings: toArrRaw(earningsEntries, tplEarnKeys),
      incentives: incentiveEntries.map(([k, v]) => ({ name: k, amount: Number(v || 0) })),
      deductions: toArrRaw(deductionEntries, tplDedKeys),
      present: att.present || 0,
      half: att.half || 0,
      leave: att.leave || 0,
      paidLeave: att.paidLeave || 0,
      absent: att.absent || 0,
      weeklyOff: att.weeklyOff || 0,
      holidays: att.holidays || 0,
    });
  };

  const submitEdit = async () => {
    if (!cycle || !editRow) return;
    try {
      const vals = await editForm.validateFields();

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

      const attendanceSummary = normalizeAttendanceSummary({
        ...(editRow.attendanceSummary || {}),
        present: Number(vals.present || 0),
        half: Number(vals.half || 0),
        leave: Number(vals.leave || 0),
        paidLeave: Number(vals.paidLeave || 0),
        absent: Number(vals.absent || 0),
        weeklyOff: Number(vals.weeklyOff || 0),
        holidays: Number(vals.holidays || 0),
      }, cycle?.monthKey);

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
        ratio: 1, // FORCE RATIO TO 1 as these are fixed manual values
      };

      const payload = {
        status: vals.status || editRow.status || 'INCLUDED',
        remarks: vals.remarks,
        earnings,
        incentives,
        deductions,
        attendanceSummary,
        totals,
        isManual: true,
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

  const onBulkGeneratePayslips = async () => {
    if (!cycle || selectedRowKeys.length === 0) {
      message.warning('Please select at least one employee using the checkboxes.');
      return;
    }

    const selectedLines = combinedData.filter(row => {
      if (row._status === 'NOT_GENERATED') return false;
      const key = row.id || `${row.cycleId}-${row.userId}`;
      return selectedRowKeys.includes(key);
    });

    if (selectedLines.length === 0) {
      message.warning('None of the selected employees have their payroll generated yet.');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    const hideLoadingMsg = message.loading(`Generating payslips for ${selectedLines.length} employee(s)... Please wait.`, 0);

    try {
      for (const line of selectedLines) {
        try {
          const res = await api.post('/admin/payroll/generate-payslip', {
            userId: line.userId || line.user_id,
            monthKey: cycle.monthKey
          });
          if (res.data?.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
          console.error('Error generating bulk payslip for userId:', line.userId, err);
        }
      }

      hideLoadingMsg();

      if (successCount > 0) {
        message.success(`Successfully generated ${successCount} payslip(s)!`);
      }
      if (failCount > 0) {
        message.error(`Failed to generate ${failCount} payslip(s).`);
      }

      setSelectedRowKeys([]);
      await loadCycle();
    } catch (e) {
      hideLoadingMsg();
      message.error('An error occurred during bulk generation.');
    } finally {
      setLoading(false);
    }
  };

  const combinedData = useMemo(() => {
    if (!cycle) return [];

    const lineMap = {};
    lines.forEach(line => {
      lineMap[line.userId || line.user_id] = line;
    });

    const rows = [];
    Object.entries(staffMap).forEach(([id, name]) => {
      if (selectedStaffId && Number(id) !== selectedStaffId) {
        return;
      }

      const line = lineMap[id];
      if (line) {
        rows.push({ ...line, _status: 'GENERATED' });
      } else {
        rows.push({
          userId: Number(id),
          totals: { grossSalary: 0, totalEarnings: 0, totalDeductions: 0, netSalary: 0 },
          _status: 'NOT_GENERATED'
        });
      }
    });
    return rows;
  }, [cycle, lines, staffMap, selectedStaffId]);

  const columns = [
    {
      title: 'Employee',
      key: 'emp',
      render: (_, r) => {
        const userId = Number(r.userId || r.user_id);
        const name = staffMap[userId] || userId;
        const staff = staffDataMap[userId];
        const isInactive = staff && (staff.active === false || staff.active === 0 || staff.active === 'false' || staff.active === '0');
        const phone = staff?.phone || 'No contact';
        return (
          <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#e6f7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              color: '#1677ff',
              fontSize: '16px',
              fontWeight: '700',
              boxShadow: '0 2px 6px rgba(22, 119, 255, 0.08)'
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: isInactive ? '#8c8c8c' : '#1677ff', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px', whiteSpace: 'nowrap' }}>{phone}</div>
              {isInactive && (
                <span className="sales-status-tag sales-status-inactive" style={{ fontSize: '9px', padding: '1px 6px', marginTop: '4px', whiteSpace: 'nowrap' }}>
                  Inactive
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    { 
      title: 'Gross', 
      dataIndex: ['totals', 'grossSalary'], 
      key: 'gross', 
      render: (v) => <span style={{ fontWeight: '500' }}>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> 
    },
    {
      title: 'Earnings',
      dataIndex: ['totals', 'totalEarnings'],
      key: 'earnings',
      render: (v) => <span style={{ fontWeight: '500' }}>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    },
    { 
      title: 'Deductions', 
      dataIndex: ['totals', 'totalDeductions'], 
      key: 'deductions', 
      render: (v) => <span style={{ fontWeight: '500', color: v > 0 ? '#ff4d4f' : 'inherit' }}>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> 
    },
    { 
      title: 'Net', 
      dataIndex: ['totals', 'netSalary'], 
      key: 'net', 
      render: (v) => <span style={{ fontWeight: '700', color: '#52c41a' }}>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> 
    },
    {
      title: 'Actions', 
      key: 'actions',
      width: 380,
      render: (_, r) => {
        if (r._status === 'NOT_GENERATED') {
          return <span className="sales-status-tag sales-status-inactive">Not Generated</span>;
        }

        let viewLink = null;
        if (r.payslipPath) {
          const p = r.payslipPath.startsWith('/') ? r.payslipPath : '/' + r.payslipPath;
          viewLink = `${API_BASE_URL}${p}`;
        }

        return (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <Button size="small" shape="round" onClick={() => onOpenEdit(r)}>Edit</Button>
            <Button size="small" shape="round" onClick={() => setViewRow(r)}>View</Button>
            {viewLink && (
              <Button size="small" shape="round" href={viewLink} target="_blank">View Payslip</Button>
            )}
            {viewLink && (
              <Button size="small" shape="round" type="default" onClick={() => generatePayslipPDF(r)}>Regenerate</Button>
            )}
            {!viewLink && (
              <Button size="small" shape="round" type="primary" onClick={() => generatePayslipPDF(r)}>Generate Payslip</Button>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Payroll" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>

          <Card
            className="sales-content-card"
            bodyStyle={{ padding: '24px' }}
          >
            {/* Sleek Filter & Action Row */}
            <div className="sales-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="modal-field-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Month:</span>
                  <input
                    type="month"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    style={{ padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: 8, height: 32, fontSize: 13, background: '#fff', outline: 'none' }}
                  />
                </div>
                <Select
                  showSearch
                  placeholder="Search or Select Staff"
                  optionFilterProp="children"
                  value={selectedStaffId}
                  onChange={setSelectedStaffId}
                  style={{ width: 240 }}
                  allowClear
                >
                  {Object.entries(staffMap).map(([id, name]) => (
                    <Select.Option key={id} value={Number(id)}>{name}</Select.Option>
                  ))}
                </Select>
              </div>

              {/* Actions for Cycle */}
              <Space wrap size={8}>
                <Button onClick={onExportCSV} disabled={!cycle || lines.length === 0} loading={loading} shape="round">Export Excel</Button>
                <Button
                  type="primary"
                  onClick={onGeneratePayroll}
                  loading={loading}
                  disabled={loading || (cycle?.status === 'LOCKED' || cycle?.status === 'PAID')}
                  shape="round"
                >
                  {lines.length > 0 ? 'Re-Generate Payroll' : 'Generate Payroll'}
                </Button>

                {cycle && lines.length > 0 && (
                  <Button
                    type="default"
                    onClick={onBulkGeneratePayslips}
                    loading={loading}
                    disabled={selectedRowKeys.length === 0 || loading}
                    shape="round"
                  >
                    Bulk Generate Payslips {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
                  </Button>
                )}

                {cycle?.status === 'DRAFT' && (
                  <Button onClick={onLock} disabled={!cycle || lines.length === 0} loading={loading} shape="round">Lock Cycle</Button>
                )}
                {cycle?.status === 'LOCKED' && (
                  <>
                    <Button onClick={onUnlock} disabled={!cycle} loading={loading} shape="round">Unlock</Button>
                    <Button onClick={onMarkPaid} type="default" disabled={!cycle} loading={loading} shape="round">Mark All Paid</Button>
                    <Button onClick={openBulkPaid} type="primary" disabled={!cycle || selectedRowKeys.length === 0} loading={loading} shape="round">Mark Paid Selected</Button>
                  </>
                )}
                {cycle?.status === 'PAID' && (
                  <span className="sales-status-tag sales-status-complete" style={{ padding: '4px 12px' }}>Paid</span>
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
                  <Button type="primary" onClick={onCompute} shape="round">Create Payroll Cycle</Button>
                </div>
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={combinedData}
                rowKey={(r) => r.id || `${r.cycleId}-${r.userId}`}
                rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
                loading={loading}
                className="sales-table"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                }}
                scroll={{ y: 'calc(100vh - 280px)', x: 1000 }}
              />
            ))}
          </Card>

        </Content>
      </Layout>

      {/* Bulk Mark Paid Modal */}
      <Modal
        open={paidOpen}
        title={`Mark Paid for ${selectedRowKeys.length} selected`}
        onCancel={() => setPaidOpen(false)}
        onOk={submitBulkPaid}
        okButtonProps={{ disabled: !cycle }}
        className="sales-modal"
        destroyOnClose
      >
        <Form form={paidForm} layout="vertical">
          <Form.Item name="paidAt" label={<span className="modal-field-label">Paid At</span>}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paidMode" label={<span className="modal-field-label">Payment Mode</span>}>
            <Select allowClear placeholder="Select mode">
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="bank">Bank</Select.Option>
              <Select.Option value="upi">UPI</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="paidAmount" label={<span className="modal-field-label">Amount</span>}>
            <InputNumber style={{ width: '100%' }} min={0} step={1} />
          </Form.Item>
          <Form.Item name="paidRef" label={<span className="modal-field-label">Reference / UTR</span>}>
            <Input placeholder="Transaction reference (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Line Modal */}
      <Modal
        open={!!editRow}
        title={editRow ? `Edit - ${staffMap[editRow.userId || editRow.user_id] || 'User'}` : 'Edit'}
        onCancel={() => setEditRow(null)}
        onOk={submitEdit}
        width={800}
        okButtonProps={{ disabled: cycle?.status === 'PAID' }}
        className="sales-modal"
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onValuesChange={(changed, all) => {
            const attKeys = ['present', 'half', 'leave', 'paidLeave', 'holidays', 'weeklyOff'];
            const isAttChange = Object.keys(changed).some(k => attKeys.includes(k));

            if (isAttChange && cycle && cycle.monthKey) {
              const [y, m] = cycle.monthKey.split('-').map(Number);
              const daysInMonth = new Date(y, m, 0).getDate();

              let p = Number(all.present || 0);
              let h = Number(all.half || 0);
              let pl = Number(all.paidLeave || 0);
              let wo = Number(all.weeklyOff || 0);
              let ho = Number(all.holidays || 0);
              let totalLeave = Number(all.leave || 0);

              if (changed.paidLeave !== undefined) {
                totalLeave = pl;
                editForm.setFieldsValue({ leave: totalLeave });
              }
              if (changed.leave !== undefined) {
                totalLeave = Number(all.leave || 0);
                pl = totalLeave;
                editForm.setFieldsValue({ paidLeave: pl });
              }

              const classifiedDays = p + h + totalLeave + wo + ho + Number(all.absent || 0);
              const [yy, mm] = cycle.monthKey.split('-').map(Number);
              const now = new Date();
              const isCurrentMonth = yy === now.getFullYear() && mm === (now.getMonth() + 1);
              const referenceDays = (isCurrentMonth && classifiedDays > 0 && classifiedDays < daysInMonth)
                ? classifiedDays
                : daysInMonth;

              const absent = Math.max(0, referenceDays - (p + h + totalLeave + wo + ho));
              editForm.setFieldsValue({ absent });

              const payableDays = p + (h * 0.5) + pl + wo + ho;
              const newRatio = daysInMonth > 0 ? Math.min(1, Math.max(0, payableDays / daysInMonth)) : 1;

              const userId = editRow?.userId || editRow?.user_id;
              const staffObj = staffDataMap[userId];
              const staffTplId = staffObj?.salaryTemplateId || staffObj?.profile?.salaryTemplateId;
              const tpl = salaryTemplates.find(t => t.id === staffTplId);
              const norm = (s = '') => s.toLowerCase().replace(/[_\s]/g, '');

              let tplEarnKeys = null;
              let tplDedKeys = null;
              if (tpl) {
                try {
                  const parse = (v) => typeof v === 'string' ? JSON.parse(v) : (v || []);
                  tplEarnKeys = parse(tpl.earnings).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer'));
                  tplDedKeys = parse(tpl.deductions).map(it => it.name || it.key).filter(Boolean).filter(k => !norm(k).includes('employer')).map(k => {
                    const nk = norm(k);
                    if (nk === 'providentfund' || nk === 'providentfundemployee') return 'provident_fund';
                    if (nk === 'esi' || nk === 'esiemployee') return 'esi';
                    if (nk === 'professionaltax') return 'professional_tax';
                    return k;
                  });
                } catch (e) { }
              }

              const prefEarn = ['basic_salary', 'hra', 'da', 'special_allowance', 'conveyance_allowance', 'medical_allowance', 'telephone_allowance', 'other_allowances'];
              const prefDed = ['provident_fund', 'esi', 'professional_tax', 'income_tax', 'loan_deduction', 'other_deductions'];

              const labelize = (k, tplKeys) => {
                const nk = norm(k);
                const match = tplKeys ? tplKeys.find(tk => norm(tk) === nk) : null;
                return match || k;
              };

              const filterEntries = (obj, pref, tplKeys) => {
                return Object.entries(obj || {}).filter(([k, v]) => {
                  const nk = norm(k);
                  const inTpl = tplKeys ? tplKeys.some(tk => norm(tk) === nk) : false;
                  const inPref = !tplKeys && pref.includes(k);
                  const val = Number(v || 0) * newRatio;
                  return val !== 0 || inTpl || inPref;
                });
              };

              const eArr = filterEntries(baseData.earnings, prefEarn, tplEarnKeys).map(([k, v]) => ({
                name: labelize(k, tplEarnKeys),
                amount: Number(v || 0) * newRatio
              }));

              const iArr = Object.entries(baseData.incentives).map(([k, v]) => ({
                name: k,
                amount: Number(v || 0) * newRatio
              }));

              const dArr = filterEntries(baseData.deductions, prefDed, tplDedKeys).map(([k, v]) => ({
                name: labelize(k, tplDedKeys),
                amount: Number(v || 0) * newRatio
              }));

              editForm.setFieldsValue({
                earnings: eArr,
                incentives: iArr,
                deductions: dArr
              });
            }
          }}
        >
          <Form.Item name="remarks" label={<span className="modal-field-label">Remarks</span>}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Card size="small" title={<span style={{ fontWeight: 600 }}>Attendance Summary</span>} style={{ marginBottom: 16, background: '#fafafa', borderRadius: '12px' }} bordered={false}>
            <Row gutter={12}>
              <Col span={6}><Form.Item name="present" label={<span className="modal-field-label">Present</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="half" label={<span className="modal-field-label">Half Day</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="leave" label={<span className="modal-field-label">Total Leave</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="absent" label={<span className="modal-field-label">Absent</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="paidLeave" label={<span className="modal-field-label">Paid Leave</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="weeklyOff" label={<span className="modal-field-label">Weekly Off</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="holidays" label={<span className="modal-field-label">Holidays</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item label={<span className="modal-field-label">Late Count</span>}><InputNumber value={editRow?.attendanceSummary?.lateCount || 0} disabled style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item label={<span className="modal-field-label">Late Penalty</span>}><InputNumber value={editRow?.attendanceSummary?.latePunchInPenalty || editRow?.attendanceSummary?.latePenalty || 0} disabled style={{ width: '100%' }} precision={2} prefix="₹" /></Form.Item></Col>
              <Col span={6}><Form.Item label={<span className="modal-field-label">Early Exit (Min)</span>}><InputNumber value={editRow?.attendanceSummary?.earlyExitMinutes || 0} disabled style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item label={<span className="modal-field-label">EE Penalty</span>}><InputNumber value={editRow?.attendanceSummary?.earlyExitPenalty || 0} disabled style={{ width: '100%' }} precision={2} prefix="₹" /></Form.Item></Col>
              <Col span={6}><Form.Item label={<span className="modal-field-label">Excess Break (Min)</span>}><InputNumber value={editRow?.attendanceSummary?.excessBreakMinutes || 0} disabled style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item label={<span className="modal-field-label">Break Penalty</span>}><InputNumber value={editRow?.attendanceSummary?.breakPenalty || 0} disabled style={{ width: '100%' }} precision={2} prefix="₹" /></Form.Item></Col>
            </Row>
          </Card>
          
          <div style={{ marginBottom: 16 }}>
            <Card size="small" title={<span style={{ fontWeight: 600 }}>Earnings</span>} style={{ background: '#fafafa', borderRadius: '12px' }} bordered={false}>
              <Form.List name="earnings">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={12}><Form.Item {...rest} name={[name, 'name']} noStyle><Input placeholder="Name" /></Form.Item></Col>
                        <Col span={9}><Form.Item {...rest} name={[name, 'amount']} noStyle><InputNumber style={{ width: '100%' }} placeholder="Amount" precision={2} prefix="₹" /></Form.Item></Col>
                        <Col span={3} style={{ textAlign: 'center' }}><MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /></Col>
                      </Row>
                    ))}
                  </>
                )}
              </Form.List>
            </Card>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Card size="small" title={<span style={{ fontWeight: 600 }}>Incentives</span>} style={{ background: '#fafafa', borderRadius: '12px' }} bordered={false}>
              <Form.List name="incentives">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={12}><Form.Item {...rest} name={[name, 'name']} noStyle><Input placeholder="Name" /></Form.Item></Col>
                        <Col span={9}><Form.Item {...rest} name={[name, 'amount']} noStyle><InputNumber style={{ width: '100%' }} placeholder="Amount" precision={2} prefix="₹" /></Form.Item></Col>
                        <Col span={3} style={{ textAlign: 'center' }}><MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /></Col>
                      </Row>
                    ))}
                  </>
                )}
              </Form.List>
            </Card>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Card size="small" title={<span style={{ fontWeight: 600 }}>Deductions</span>} style={{ background: '#fafafa', borderRadius: '12px' }} bordered={false}>
              <Form.List name="deductions">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                        <Col span={12}><Form.Item {...rest} name={[name, 'name']} noStyle><Input placeholder="Name" /></Form.Item></Col>
                        <Col span={9}><Form.Item {...rest} name={[name, 'amount']} noStyle><InputNumber style={{ width: '100%' }} placeholder="Amount" precision={2} prefix="₹" /></Form.Item></Col>
                        <Col span={3} style={{ textAlign: 'center' }}><MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} /></Col>
                      </Row>
                    ))}
                  </>
                )}
              </Form.List>
            </Card>
          </div>
        </Form>
      </Modal>

      {/* View Line Modal */}
      <Modal
        open={!!viewRow}
        title={viewRow ? (staffMap[viewRow.userId || viewRow.user_id] || `User #${viewRow.userId || viewRow.user_id}`) : 'View'}
        onCancel={() => setViewRow(null)}
        footer={<Button onClick={() => setViewRow(null)} shape="round">Close</Button>}
        width={700}
        className="sales-modal"
        destroyOnClose
      >
        {viewRow && (
          (() => {
            const normalizedAtt = normalizeAttendanceSummary(viewRow?.attendanceSummary || {}, cycle?.monthKey);
            return (
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Gross">₹{Number(viewRow?.totals?.grossSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Descriptions.Item>
                <Descriptions.Item label="Net"><span style={{ fontWeight: 'bold', color: '#52c41a' }}>₹{Number(viewRow?.totals?.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></Descriptions.Item>
                <Descriptions.Item label="Earnings">₹{Number(viewRow?.totals?.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Descriptions.Item>
                <Descriptions.Item label="Deductions">₹{Number(viewRow?.totals?.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Descriptions.Item>
                <Descriptions.Item label="Ratio" span={2}>{Number(viewRow?.totals?.ratio ?? 1).toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Present">{normalizedAtt.present || 0}</Descriptions.Item>
                <Descriptions.Item label="Half">{normalizedAtt.half || 0}</Descriptions.Item>
                <Descriptions.Item label="Paid Leave">
                  {normalizedAtt.paidLeave > 0 && viewRow?.attendanceSummary?.paidLeaveDates?.length > 0 ? (
                    <Popover
                      title="Paid Leave Dates"
                      content={
                        <div style={{ maxWidth: 200 }}>
                          {(viewRow.attendanceSummary.paidLeaveDates || []).map(date => (
                            <Tag key={date} color="blue" style={{ marginBottom: 4 }}>
                              {moment(date).format('DD MMM YYYY')}
                            </Tag>
                          ))}
                        </div>
                      }
                    >
                      <Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 'inherit' }}>
                        {normalizedAtt.paidLeave || 0}
                      </Button>
                    </Popover>
                  ) : (
                    <Text>{normalizedAtt.paidLeave || 0}</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Total Leave">{normalizedAtt.leave || 0}</Descriptions.Item>
                <Descriptions.Item label="Absent">{normalizedAtt.absent || 0}</Descriptions.Item>
                <Descriptions.Item label="Weekly Off">
                  {(() => {
                    const val = Number(normalizedAtt.weeklyOff || 0);
                    const extra = (normalizedAtt.multiplierBreakdown || [])
                      .filter(b => b.type === 'Weekly Off')
                      .reduce((sum, b) => sum + Number(b.addedUnits || 0), 0);
                    if (extra > 0) {
                      return (
                        <Space size={4}>
                          <Text>{val}</Text>
                          <Tooltip title={`${(val - extra).toFixed(2)} Base + ${extra.toFixed(2)} Extra Credit`}>
                            <InfoCircleOutlined style={{ color: '#1677ff', cursor: 'help' }} />
                          </Tooltip>
                        </Space>
                      );
                    }
                    return val;
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Holiday">
                  {(() => {
                    const val = Number(normalizedAtt.holidays || 0);
                    const extra = (normalizedAtt.multiplierBreakdown || [])
                      .filter(b => b.type === 'Holiday')
                      .reduce((sum, b) => sum + Number(b.addedUnits || 0), 0);
                    if (extra > 0) {
                      return (
                        <Space size={4}>
                          <Text>{val}</Text>
                          <Tooltip title={`${(val - extra).toFixed(2)} Base + ${extra.toFixed(2)} Extra Credit`}>
                            <InfoCircleOutlined style={{ color: '#1677ff', cursor: 'help' }} />
                          </Tooltip>
                        </Space>
                      );
                    }
                    return val;
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Late Count">
                  {normalizedAtt.lateDetails && normalizedAtt.lateDetails.length > 0 ? (
                    <Popover
                      title="Late Details"
                      content={
                        <Table
                          size="small"
                          dataSource={normalizedAtt.lateDetails}
                          pagination={false}
                          rowKey="date"
                          columns={[
                            { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => moment(d).format('DD MMM') },
                            { title: 'Late (m)', dataIndex: 'latePunchInMinutes', key: 'min' },
                            {
                              title: 'Status',
                              key: 'status',
                              render: (_, r) => {
                                if (r.latePunchInAmount > 0) return <Tag color="error">Penalty: ₹{r.latePunchInAmount}</Tag>;
                                if (r.lateOccurrence) return <Tag color="warning">{r.lateOccurrence}</Tag>;
                                return <Tag color="blue">No Penalty</Tag>;
                              }
                            }
                          ]}
                        />
                      }
                    >
                      <Button type="link" style={{ padding: 0, height: 'auto' }}>
                        {normalizedAtt.lateCount || 0}
                      </Button>
                    </Popover>
                  ) : (
                    normalizedAtt.lateCount || 0
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Late Penalty">
                  {normalizedAtt.latePenalty > 0 ? (
                    <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => showAttendanceDrilldown(viewRow.userId || viewRow.user_id, 'Late')}>
                      ₹{normalizedAtt.latePenalty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Button>
                  ) : (
                    <Text>{normalizedAtt.latePenaltyDays || 0} days</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Tenure Bonus">
                  {viewRow?.attendanceSummary?.tenureBonus ? (
                    <Space>
                      <Text strong style={{ color: '#722ed1' }}>
                        ₹{Number(viewRow.attendanceSummary.tenureBonus.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Button
                        type="link"
                        icon={<InfoCircleOutlined />}
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => {
                          setBonusData(viewRow.attendanceSummary.tenureBonus);
                          setBonusModalVisible(true);
                        }}
                      />
                    </Space>
                  ) : (
                    <Text type="secondary">N/A</Text>
                  )}
                </Descriptions.Item>
                {Object.entries(viewRow?.earnings || {}).some(([k]) => k.startsWith('LEAVE_ENCASHMENT:')) && (
                  <Descriptions.Item label="Leave Encashment" span={2}>
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      {Object.entries(viewRow.earnings)
                        .filter(([k]) => k.startsWith('LEAVE_ENCASHMENT:'))
                        .map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f0f0f0' }}>
                            <Text type="secondary">{k.replace('LEAVE_ENCASHMENT:', '').trim()}</Text>
                            <Text>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                          </div>
                        ))}
                    </Space>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Payable Days" span={2}>
                  {normalizedAtt.multiplierBreakdown && normalizedAtt.multiplierBreakdown.length > 0 ? (
                    <Popover
                      title="Multiplier Breakdown"
                      content={
                        <Table
                          size="small"
                          dataSource={normalizedAtt.multiplierBreakdown}
                          pagination={false}
                          rowKey="date"
                          columns={[
                            { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => moment(d).format('DD MMM') },
                            { title: 'Type', dataIndex: 'type', key: 'type' },
                            { title: 'Rule', dataIndex: 'multiplier', key: 'multiplier' },
                            {
                              title: 'Payable',
                              key: 'pay',
                              align: 'right',
                              render: (_, r) => (Number(r.baseUnits || 0) + Number(r.addedUnits || 0)).toFixed(2)
                            }
                          ]}
                        />
                      }
                    >
                      <Button type="link" style={{ padding: 0, height: 'auto', color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                        {normalizedAtt.payableDays || 0} days
                      </Button>
                    </Popover>
                  ) : (
                    <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                      {normalizedAtt.payableDays || 0} days
                    </Text>
                  )}
                </Descriptions.Item>
                {(Number(viewRow?.attendanceSummary?.overtimeMinutes || 0) > 0 ||
                  Number(viewRow?.attendanceSummary?.overtimePay || viewRow?.earnings?.overtime_pay || 0) > 0) ? (
                  <>
                    <Descriptions.Item label="OT Time">
                      {Number(viewRow?.attendanceSummary?.overtimeHours || 0).toFixed(2)}h
                      {` (${Number(viewRow?.attendanceSummary?.overtimeMinutes || 0)}m)`}
                    </Descriptions.Item>
                    <Descriptions.Item label="OT Pay">
                      <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => showAttendanceDrilldown(viewRow.userId || viewRow.user_id, 'Overtime')}>
                        ₹{Number(
                          viewRow?.attendanceSummary?.overtimePay
                          || viewRow?.earnings?.overtime_pay
                          || 0
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Button>
                    </Descriptions.Item>
                  </>
                ) : null}
                {(Number(viewRow?.attendanceSummary?.earlyOvertimeMinutes || 0) > 0 ||
                  Number(viewRow?.attendanceSummary?.earlyOvertimePay || viewRow?.earnings?.early_overtime_pay || 0) > 0) ? (
                  <>
                    <Descriptions.Item label="Early OT (Min)">
                      {Number(viewRow?.attendanceSummary?.earlyOvertimeMinutes || 0)}m
                    </Descriptions.Item>
                    <Descriptions.Item label="Early OT Pay">
                      <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => showAttendanceDrilldown(viewRow.userId || viewRow.user_id, 'Early Overtime')}>
                        ₹{Number(
                          viewRow?.attendanceSummary?.earlyOvertimePay
                          || viewRow?.earnings?.early_overtime_pay
                          || 0
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Button>
                    </Descriptions.Item>
                  </>
                ) : null}
                {(Number(viewRow?.attendanceSummary?.earlyExitMinutes || 0) > 0 ||
                  Number(viewRow?.attendanceSummary?.earlyExitPenalty || viewRow?.deductions?.early_exit_penalty || 0) > 0) ? (
                  <>
                    <Descriptions.Item label="Early Exit">
                      {Number(viewRow?.attendanceSummary?.earlyExitMinutes || 0)}m
                    </Descriptions.Item>
                    <Descriptions.Item label="EE Penalty">
                      <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => showAttendanceDrilldown(viewRow.userId || viewRow.user_id, 'Early Exit')}>
                        ₹{Number(
                          viewRow?.attendanceSummary?.earlyExitPenalty
                          || viewRow?.deductions?.early_exit_penalty
                          || 0
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Button>
                    </Descriptions.Item>
                  </>
                ) : null}
                {(Number(viewRow?.attendanceSummary?.breakPenalty || viewRow?.deductions?.break_penalty || 0) > 0 ||
                  Number(viewRow?.attendanceSummary?.excessBreakMinutes || 0) > 0) ? (
                  <>
                    <Descriptions.Item label="Excess Break">{Number(viewRow?.attendanceSummary?.excessBreakMinutes || 0)}m</Descriptions.Item>
                    <Descriptions.Item label="Break Penalty">
                      <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => showAttendanceDrilldown(viewRow.userId || viewRow.user_id, 'Break')}>
                        ₹{Number(
                          viewRow?.attendanceSummary?.breakPenalty
                          || viewRow?.deductions?.break_penalty
                          || 0
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Button>
                    </Descriptions.Item>
                  </>
                ) : null}
              </Descriptions>
            );
          })()
        )}
      </Modal>

      {/* Attendance Drill-down Modal */}
      <Modal
        open={drilldownModalVisible}
        title={`${drilldownType} Details - ${monthText}`}
        onCancel={() => setDrilldownModalVisible(false)}
        footer={<Button onClick={() => setDrilldownModalVisible(false)} shape="round">Close</Button>}
        width={600}
        className="sales-modal"
        destroyOnClose
      >
        <Table
          dataSource={drilldownRecords}
          loading={drilldownLoading}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => moment(d).format('DD MMM (ddd)') },
            {
              title: 'Duration',
              key: 'duration',
              render: (_, r) => {
                if (drilldownType === 'Late') return `${r.latePunchInMinutes || 0} min`;
                if (drilldownType === 'Early Exit') return `${r.earlyExitMinutes || 0} min`;
                if (drilldownType === 'Break') return `${r.excessBreakMinutes || 0} min`;
                if (drilldownType === 'Overtime') return `${(Number(r.overtimeMinutes || 0) / 60).toFixed(2)} hrs (${r.overtimeMinutes || 0} min)`;
                if (drilldownType === 'Early Overtime') return `${r.earlyOvertimeMinutes || 0} min`;
                return '-';
              }
            },
            ...(drilldownType === 'Late' ? [{
              title: 'Occurrence',
              dataIndex: 'lateOccurrence',
              key: 'lateOccurrence',
              render: (v, r) => {
                if (v) return <span className="sales-status-tag sales-status-pending" style={{ fontSize: '10px' }}>{v}</span>;
                if (Number(r.lateFullDayPenaltyApplied ? 1 : 0) > 0) return <span className="sales-status-tag sales-status-inactive" style={{ fontSize: '10px' }}>Full Day</span>;
                return '-';
              }
            }] : []),
            {
              title: drilldownType.includes('Overtime') ? 'Earnings' : 'Penalty',
              key: 'amt',
              align: 'right',
              render: (_, r) => {
                let amt = 0;
                if (drilldownType === 'Late') amt = r.latePunchInAmount || 0;
                else if (drilldownType === 'Early Exit') amt = r.earlyExitAmount || 0;
                else if (drilldownType === 'Break') amt = r.breakDeductionAmount || 0;
                else if (drilldownType === 'Overtime') amt = r.overtimeAmount || 0;
                else if (drilldownType === 'Early Overtime') amt = r.earlyOvertimeAmount || 0;

                const isEarning = drilldownType.includes('Overtime');
                const bonusAmount = Number(r.extraFullDayBonusAmount || 0);
                const showExtraBonus = drilldownType === 'Overtime' && r.extraFullDayBonusApplied && bonusAmount > 0;
                if (showExtraBonus) {
                  return (
                    <Space direction="vertical" size={0} align="end">
                      <Text strong type="success">
                        {'\u20b9'}{Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        ({'\u20b9'}{bonusAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} extra applicable)
                      </Text>
                    </Space>
                  );
                }
                return <span style={{ fontWeight: '700', color: isEarning ? '#52c41a' : '#ff4d4f' }}>₹{Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
              }
            }
          ]}
        />
      </Modal>

      {/* Tenure Bonus Breakdown Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#722ed1' }} />
            <span>Tenure Bonus Breakdown</span>
          </Space>
        }
        open={bonusModalVisible}
        onCancel={() => setBonusModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setBonusModalVisible(false)} shape="round">
            Close
          </Button>
        ]}
        width={450}
        className="sales-modal"
        destroyOnClose
      >
        {bonusData && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Applied Rule">
              <Text strong>{bonusData.ruleName || 'Tenure Bonus Rule'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Tenure">
              <Text strong>{bonusData.tenureMonths} Months</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Matched Bracket">
              <span className="sales-status-tag sales-status-inprogress">
                {bonusData.bracketMin} - {bonusData.bracketMax} Months
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Bonus Percentage">
              <Text strong style={{ color: '#722ed1' }}>{bonusData.bracketPercent}%</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>of Gross</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Calculated Amount">
              <Text strong style={{ fontSize: '18px', color: '#722ed1' }}>
                ₹{Number(bonusData.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Layout>
  );
};

export default PayrollList;
