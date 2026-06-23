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
  Tooltip,
  Checkbox,
  Tabs,
  Alert,
  Radio,
  Spin,
  Statistic
} from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, PlusOutlined, MinusCircleOutlined, InfoCircleOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
  const payableDays = s.payableDays !== undefined ? Number(s.payableDays) : Math.max(0, pUnits - (s.latePenaltyDays || 0));

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

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutConfigs, setPayoutConfigs] = useState([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [bypassPayoutValidation, setBypassPayoutValidation] = useState(false);
  const [payoutErrors, setPayoutErrors] = useState([]);
  const [payoutExportLoading, setPayoutExportLoading] = useState(false);

  const [disburseActiveTab, setDisburseActiveTab] = useState('bank-file');
  const [walletInfo, setWalletInfo] = useState({ balance: 0, used: 0 });
  const [cashfreeProcessing, setCashfreeProcessing] = useState(false);
  const [disburseSummary, setDisburseSummary] = useState(null);
  const [disburseMode, setDisburseMode] = useState('ALL');

  // Tally Integration State
  const [tallyModalVisible, setTallyModalVisible] = useState(false);
  const [tallyConfig, setTallyConfig] = useState(null);
  const [tallyPreview, setTallyPreview] = useState(null);
  const [tallyLoading, setTallyLoading] = useState(false);
  const [tallyPushing, setTallyPushing] = useState(false);
  const [tallyBridgeStatus, setTallyBridgeStatus] = useState('checking');
  const [tallyPrimeStatus, setTallyPrimeStatus] = useState('checking');

  const openTallyPushModal = async () => {
    if (!cycle) return;
    setTallyModalVisible(true);
    setTallyLoading(true);
    setTallyBridgeStatus('checking');
    setTallyPrimeStatus('checking');
    
    try {
      const [configResp, previewResp] = await Promise.all([
        api.get('/admin/tally/config'),
        api.get(`/admin/tally/preview/${cycle.id}`)
      ]);

      if (configResp.data?.success) {
        setTallyConfig(configResp.data.config);
        const config = configResp.data.config;
        
        const bridge = config.bridgeUrl || 'http://localhost:7000';
        const tally = config.tallyUrl || 'http://localhost:9000';
        
        try {
          const bResp = await fetch(`${bridge}/ping`, { mode: 'cors' });
          const bData = await bResp.json();
          if (bData.success) {
            setTallyBridgeStatus('connected');
            try {
              const tResp = await fetch(`${bridge}/tally/status?url=${encodeURIComponent(tally)}`, { mode: 'cors' });
              const tData = await tResp.json();
              if (tData.success) {
                setTallyPrimeStatus('connected');
              } else {
                setTallyPrimeStatus('offline');
              }
            } catch (_) {
              setTallyPrimeStatus('offline');
            }
          } else {
            throw new Error('Bridge offline');
          }
        } catch (_) {
          // Bridge is offline, check if Tally Prime is running directly (no-cors)
          try {
            await fetch(tally, { method: 'POST', mode: 'no-cors', body: '' });
            setTallyBridgeStatus('direct');
            setTallyPrimeStatus('connected');
          } catch (err) {
            setTallyBridgeStatus('offline');
            setTallyPrimeStatus('offline');
          }
        }
      }

      if (previewResp.data?.success) {
        setTallyPreview(previewResp.data.preview);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to initialize Tally integration');
      setTallyModalVisible(false);
    } finally {
      setTallyLoading(false);
    }
  };

  const handlePushToTally = async () => {
    if (!tallyConfig || !cycle) return;
    setTallyPushing(true);
    try {
      const xmlResp = await api.get(`/admin/tally/xml/${cycle.id}`);
      const xml = xmlResp.data;

      const bridge = tallyConfig.bridgeUrl || 'http://localhost:7000';
      const tally = tallyConfig.tallyUrl || 'http://localhost:9000';

      if (tallyBridgeStatus === 'connected') {
        const pushResp = await fetch(`${bridge}/tally/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          body: JSON.stringify({ xml, tallyUrl: tally })
        });

        const pushResult = await pushResp.json();
        if (pushResult.success) {
          message.success('Salary voucher successfully pushed to Tally Prime!');
          setTallyModalVisible(false);
        } else {
          Modal.error({
            title: 'Tally Prime Push Failed',
            content: (
              <div>
                <p>Tally rejected the import with the following error:</p>
                <Alert message={pushResult.error || 'Unknown Tally Error'} type="error" showIcon />
                <p style={{ marginTop: 12, fontSize: '11px', color: '#666' }}>
                  Please verify that your company name matches exactly and that all mapped ledgers exist in Tally.
                </p>
              </div>
            )
          });
        }
      } else {
        // Direct push bypassing CORS using simple request (text/plain)
        await fetch(tally, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: xml
        });
        message.success('Salary voucher pushed directly to Tally Prime! Please check Tally Prime to verify.');
        setTallyModalVisible(false);
      }
    } catch (e) {
      message.error('Failed to communicate with Tally Prime: ' + e.message);
    } finally {
      setTallyPushing(false);
    }
  };

  const handleDownloadTallyXML = async () => {
    if (!cycle) return;
    try {
      const xmlResp = await api.get(`/admin/tally/xml/${cycle.id}`);
      const blob = new Blob([xmlResp.data], { type: 'text/xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payroll_tally_${cycle.monthKey}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Tally XML downloaded successfully!');
    } catch (e) {
      message.error('Failed to download Tally XML: ' + e.message);
    }
  };

  const openPayoutModal = async () => {
    if (!cycle) return;
    if (cycle.status === 'DRAFT') {
      Modal.warning({
        title: 'Lock Cycle Required',
        content: 'You need to lock the payroll cycle before you can download the salary bank file or initiate payouts.',
        okText: 'OK',
      });
      return;
    }
    try {
      setLoading(true);
      setDisburseActiveTab('bank-file');
      setDisburseSummary(null);
      if (selectedRowKeys.length > 0) {
        setDisburseMode('SELECTED');
      } else {
        setDisburseMode('ALL');
      }

      const resp = await api.get('/admin/settings/payout-bank-config');
      if (resp?.data?.success) {
        const list = resp.data.configs || [];
        setPayoutConfigs(list);
        setPayoutErrors([]);
        setBypassPayoutValidation(false);
        if (list.length > 0) {
          setSelectedLayoutId(list[0].id);
        } else {
          setSelectedLayoutId(null);
        }
      }

      // Fetch wallet details
      const walletResp = await api.get('/admin/settings/payout-wallet');
      if (walletResp?.data?.success) {
        setWalletInfo(walletResp.data.wallet || { balance: 0, used: 0 });
      }

      setIsPayoutModalOpen(true);
    } catch (_) {
      message.error('Failed to load payout bank configurations');
    } finally {
      setLoading(false);
    }
  };

  const onExportPayoutFile = async () => {
    if (!cycle || !selectedLayoutId) return;
    try {
      setPayoutExportLoading(true);
      setPayoutErrors([]);
      
      const resp = await api.get(`/admin/payroll/${cycle.id}/export-bank-file`, {
        params: {
          layoutId: selectedLayoutId,
          bypassValidation: bypassPayoutValidation ? 'true' : 'false'
        },
        responseType: 'blob'
      });

      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const layout = payoutConfigs.find(c => c.id === selectedLayoutId);
      const safeName = String(layout?.name || 'payout').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      a.download = `payout-${safeName}-${cycle.monthKey}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setIsPayoutModalOpen(false);
      message.success('Payout bank file exported successfully');
    } catch (err) {
      if (err.response && err.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const resData = JSON.parse(reader.result);
            if (resData.errors && Array.isArray(resData.errors)) {
              setPayoutErrors(resData.errors);
              message.error('Validation failed: Some staff profiles have missing or incorrect bank details.');
            } else {
              message.error(resData.message || 'Export failed');
            }
          } catch (_) {
            message.error('Export failed');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        message.error('Export failed');
      }
    } finally {
      setPayoutExportLoading(false);
    }
  };

  const onInstantCashfreeDisburse = async () => {
    if (!cycle) return;

    const alreadyPaidStaff = payoutSummaryStats.alreadyPaidCount > 0;
    const alreadyPaidNames = payoutSummaryStats.alreadyPaidNames.slice(0, 6);

    const isSelMode = disburseMode === 'SELECTED' && selectedRowKeys.length > 0;

    const confirmDisburse = () => {
      Modal.confirm({
        title: 'Confirm Instant Salary Payouts',
        content: `Are you sure you want to disburse instant salary payouts via Razorpay to ${isSelMode ? 'selected' : 'all'} ${payoutSummaryStats.eligibleCount} included staff? This will deduct ₹${payoutSummaryStats.totalNeeded.toLocaleString('en-IN')} from your payroll wallet.`,
        okText: 'Yes, Disburse',
        cancelText: 'Cancel',
        okButtonProps: { style: { background: '#10b981', borderColor: '#10b981' } },
        onConfirm: async () => {
          try {
            setCashfreeProcessing(true);
            setDisburseSummary(null);
            const payload = {};
            if (isSelMode) {
              payload.selectedLineIds = selectedRowKeys;
            }
            const resp = await api.post(`/admin/payroll/${cycle.id}/disburse-cashfree`, payload);
            if (resp?.data?.success) {
              setDisburseSummary(resp.data);
              message.success('Instant payouts processing completed');
              
              // Reload wallet balance
              const walletResp = await api.get('/admin/settings/payout-wallet');
              if (walletResp?.data?.success) {
                setWalletInfo(walletResp.data.wallet || { balance: 0, used: 0 });
              }
              
              // Reload payroll cycle to update statuses
              loadCycle();
            }
          } catch (e) {
            message.error(e?.response?.data?.message || 'Payout disbursement failed');
          } finally {
            setCashfreeProcessing(false);
          }
        }
      });
    };

    if (alreadyPaidStaff) {
      Modal.warning({
        title: 'Some staff have already been disbursed',
        content: (
          <div>
            <p>Salary has already been disbursed to {payoutSummaryStats.alreadyPaidCount} staff in this cycle. These staff will be skipped if you continue.</p>
            <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
              {alreadyPaidNames.map((name, idx) => (
                <div key={idx} style={{ marginBottom: 4 }}>• {name}</div>
              ))}
              {payoutSummaryStats.alreadyPaidCount > alreadyPaidNames.length && (
                <div>and {payoutSummaryStats.alreadyPaidCount - alreadyPaidNames.length} more...</div>
              )}
            </div>
          </div>
        ),
        okText: 'Continue with remaining',
        cancelText: 'Cancel',
        onOk: confirmDisburse,
        width: 520
      });
      return;
    }

    confirmDisburse();
  };

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

  const payoutSummaryStats = useMemo(() => {
    let totalNeededAll = 0;
    let eligibleCountAll = 0;
    let alreadyPaidCountAll = 0;
    const alreadyPaidNamesAll = [];

    let totalNeededSel = 0;
    let eligibleCountSel = 0;
    let alreadyPaidCountSel = 0;
    const alreadyPaidNamesSel = [];

    combinedData.forEach(row => {
      const net = Number(row.totals?.netSalary || 0);
      const isAlreadyPaid = row.status === 'INCLUDED' && (row.paidAt || row.paidMode);
      
      if (isAlreadyPaid) {
        alreadyPaidCountAll++;
        alreadyPaidNamesAll.push(row.name || row.profile?.name || row.userName || row.user_id || row.userId || 'Staff');
      }
      if (net > 0 && row.status === 'INCLUDED' && !isAlreadyPaid) {
        totalNeededAll += net;
        eligibleCountAll++;
      }

      const isSelected = selectedRowKeys.includes(row.id || `${row.cycleId}-${row.userId}`);
      if (isSelected) {
        if (isAlreadyPaid) {
          alreadyPaidCountSel++;
          alreadyPaidNamesSel.push(row.name || row.profile?.name || row.userName || row.user_id || row.userId || 'Staff');
        }
        if (net > 0 && row.status === 'INCLUDED' && !isAlreadyPaid) {
          totalNeededSel += net;
          eligibleCountSel++;
        }
      }
    });

    const isSelMode = disburseMode === 'SELECTED' && selectedRowKeys.length > 0;

    return {
      totalNeeded: isSelMode ? Number(totalNeededSel.toFixed(2)) : Number(totalNeededAll.toFixed(2)),
      eligibleCount: isSelMode ? eligibleCountSel : eligibleCountAll,
      alreadyPaidCount: isSelMode ? alreadyPaidCountSel : alreadyPaidCountAll,
      alreadyPaidNames: isSelMode ? alreadyPaidNamesSel : alreadyPaidNamesAll,
      totalNeededAll: Number(totalNeededAll.toFixed(2)),
      eligibleCountAll,
      totalNeededSel: Number(totalNeededSel.toFixed(2)),
      eligibleCountSel,
    };
  }, [combinedData, selectedRowKeys, disburseMode]);

  const columns = [
    {
      title: 'Employee',
      key: 'emp',
      width: 240,
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
      width: 130,
      render: (v) => <span style={{ fontWeight: '500' }}>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> 
    },
    {
      title: 'Earnings',
      dataIndex: ['totals', 'totalEarnings'],
      key: 'earnings',
      width: 130,
      render: (v) => <span style={{ fontWeight: '500' }}>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    },
    { 
      title: 'Deductions', 
      dataIndex: ['totals', 'totalDeductions'], 
      key: 'deductions', 
      width: 130,
      render: (v) => <span style={{ fontWeight: '500', color: v > 0 ? '#ff4d4f' : 'inherit' }}>₹{Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> 
    },
    { 
      title: 'Net', 
      dataIndex: ['totals', 'netSalary'], 
      key: 'net', 
      width: 130,
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
            <Button size="small" shape="round" disabled={!!(r.paidAt || r.paidMode)} onClick={() => onOpenEdit(r)}>Edit</Button>
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
            {(r.paidAt || r.paidMode) && (
              <Tag color="success" style={{ borderRadius: '20px', fontWeight: '700', fontSize: '11px', padding: '2px 10px', margin: 0 }}>Paid</Tag>
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
                  onClick={openTallyPushModal}
                  disabled={!cycle || lines.length === 0}
                  loading={loading || tallyLoading}
                  shape="round"
                  style={{ background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}
                >
                  Send to Tally
                </Button>
                <Button 
                  onClick={openPayoutModal} 
                  disabled={!cycle || lines.length === 0} 
                  loading={loading} 
                  shape="round"
                  style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                >
                  Payroll Disbursement
                </Button>
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
                scroll={{ x: 1140 }}
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
              const newRatio = daysInMonth > 0 ? Math.max(0, payableDays / daysInMonth) : 1;

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

      <Modal
        title={
          <div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Payroll Disbursement</span>
            <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', marginTop: '2px' }}>
              Disburse salaries via bank file export or instant Razorpay Payout transfer.
            </div>
          </div>
        }
        open={isPayoutModalOpen}
        onCancel={() => setIsPayoutModalOpen(false)}
        footer={
          disburseActiveTab === 'bank-file' ? [
            <Button key="cancel" onClick={() => setIsPayoutModalOpen(false)}>Cancel</Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={payoutExportLoading} 
              disabled={!selectedLayoutId} 
              onClick={onExportPayoutFile}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              Download Bank File
            </Button>
          ] : null
        }
        width={650}
      >
        <Tabs activeKey={disburseActiveTab} onChange={setDisburseActiveTab} style={{ marginTop: '10px' }}>
          <Tabs.TabPane tab="Bank File Export" key="bank-file">
            <div style={{ padding: '12px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', color: '#475569' }}>Select Bank Layout Format</span>
                <Select
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="Select Layout"
                  value={selectedLayoutId}
                  onChange={setSelectedLayoutId}
                >
                  {payoutConfigs.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
                <div style={{ marginTop: '6px', textAlign: 'right' }}>
                  <a onClick={() => { setIsPayoutModalOpen(false); navigate('/settings/payout-settings'); }} style={{ fontSize: '12px', color: '#2563eb' }}>
                    ⚙️ Configure Bank Layout Mappings
                  </a>
                </div>
              </div>

              {payoutErrors.length > 0 && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '600', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <InfoCircleOutlined /> Validation Errors ({payoutErrors.length})
                  </div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', paddingLeft: '16px', fontSize: '13px', color: '#4c0519' }}>
                    <ul style={{ margin: 0, paddingLeft: '12px' }}>
                      {payoutErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginTop: '12px', borderTop: '1px solid #ffe4e6', paddingTop: '8px' }}>
                    <Checkbox 
                      checked={bypassPayoutValidation} 
                      onChange={(e) => setBypassPayoutValidation(e.target.checked)}
                    >
                      <span style={{ color: '#be123c', fontWeight: '500' }}>Bypass validation errors and download file anyway</span>
                    </Checkbox>
                  </div>
                </div>
              )}
            </div>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="Razorpay Instant Payout" key="cashfree">
            <div style={{ padding: '12px 0' }}>
              {cashfreeProcessing ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '16px', fontWeight: '600', color: '#1e293b' }}>
                    Processing instant bank transfers via Razorpay Payouts...
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Please do not close this modal or refresh the page.</Text>
                </div>
              ) : disburseSummary ? (
                <div style={{ padding: '10px 0' }}>
                  <Alert
                    message={<span style={{ fontWeight: '700' }}>Disbursement Processing Completed</span>}
                    description={
                      <div style={{ marginTop: '6px' }}>
                        <div>Successfully Paid: <Text strong style={{ color: '#16a34a' }}>{disburseSummary.processed} staff</Text></div>
                        {disburseSummary.failed > 0 && (
                          <div style={{ marginTop: '4px' }}>
                            Failed Payouts: <Text strong style={{ color: '#dc2626' }}>{disburseSummary.failed} staff</Text>
                          </div>
                        )}
                      </div>
                    }
                    type={disburseSummary.failed > 0 ? 'warning' : 'success'}
                    showIcon
                    style={{ borderRadius: '8px', marginBottom: '16px' }}
                  />
                  {disburseSummary.errors && disburseSummary.errors.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '16px', maxHeight: '150px', overflowY: 'auto' }}>
                      <div style={{ fontWeight: '600', color: '#b91c1c', marginBottom: '4px' }}>Disbursement Details/Errors:</div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#7f1d1d' }}>
                        {disburseSummary.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                  <div style={{ textAlign: 'right', marginTop: '20px' }}>
                    <Button type="primary" onClick={() => setIsPayoutModalOpen(false)} style={{ borderRadius: '6px' }}>
                      Close Window
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {selectedRowKeys.length > 0 && (
                    <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Disburse To:</span>
                      <Radio.Group 
                        value={disburseMode} 
                        onChange={(e) => setDisburseMode(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        size="small"
                      >
                        <Radio.Button value="ALL">All ({payoutSummaryStats.eligibleCountAll} staff)</Radio.Button>
                        <Radio.Button value="SELECTED">Selected Only ({payoutSummaryStats.eligibleCountSel} staff)</Radio.Button>
                      </Radio.Group>
                    </div>
                  )}

                  <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#f8fafc', borderRadius: '8px' }}>
                        <Statistic 
                          title={<span style={{ fontSize: '12px', color: '#64748b' }}>Required Payout Funds</span>}
                          value={payoutSummaryStats.totalNeeded}
                          precision={2}
                          prefix="₹"
                          valueStyle={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}
                        />
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          For {payoutSummaryStats.eligibleCount} {disburseMode === 'SELECTED' && selectedRowKeys.length > 0 ? 'selected' : 'included'} employees
                        </div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <Statistic 
                          title={<span style={{ fontSize: '12px', color: '#166534' }}>Available Wallet Balance</span>}
                          value={walletInfo.balance}
                          precision={2}
                          prefix="₹"
                          valueStyle={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}
                        />
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                          <a onClick={() => { setIsPayoutModalOpen(false); navigate('/settings/payout-wallet'); }}>
                            ⚙️ Manage Wallet
                          </a>
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {Number(walletInfo.balance) < payoutSummaryStats.totalNeeded ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <Alert
                        message="Insufficient Wallet Balance"
                        description="You need to add more funds to your virtual wallet to disburse this cycle. Please navigate to Settings -> Payroll Wallet to top up."
                        type="warning"
                        showIcon
                        style={{ borderRadius: '8px' }}
                      />
                      <div style={{ textAlign: 'right', marginTop: '10px' }}>
                        <Button key="close" style={{ marginRight: '8px' }} onClick={() => setIsPayoutModalOpen(false)}>Cancel</Button>
                        <Button 
                          type="primary" 
                          onClick={() => { setIsPayoutModalOpen(false); navigate('/settings/payout-wallet'); }}
                          style={{ background: '#2563eb', borderColor: '#2563eb' }}
                        >
                          Go to Wallet Settings
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <Alert
                        message="Sufficient Wallet Funds Available"
                        description={`Funds will be instantly transferred from your wallet to ${disburseMode === 'SELECTED' && selectedRowKeys.length > 0 ? 'selected' : 'all'} eligible staff bank accounts. Make sure Razorpay API setup is active.`}
                        type="info"
                        showIcon
                        style={{ borderRadius: '8px' }}
                      />
                      <div style={{ textAlign: 'right', marginTop: '16px' }}>
                        <Button key="close" style={{ marginRight: '8px' }} onClick={() => setIsPayoutModalOpen(false)}>Cancel</Button>
                        <Button 
                          type="primary" 
                          onClick={onInstantCashfreeDisburse}
                          disabled={payoutSummaryStats.eligibleCount === 0}
                          style={{ background: '#10b981', borderColor: '#10b981', borderRadius: '6px' }}
                        >
                          Initiate Razorpay Payouts
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Modal>

      {/* Tally Push Modal */}
      <Modal
        open={tallyModalVisible}
        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>Tally Prime Push Integration</span>}
        onCancel={() => setTallyModalVisible(false)}
        width={720}
        footer={[
          <Button key="cancel" onClick={() => setTallyModalVisible(false)}>
            Close
          </Button>,
          <Button key="download" type="default" onClick={handleDownloadTallyXML} disabled={tallyLoading}>
            Download XML
          </Button>,
          <Button
            key="push"
            type="primary"
            loading={tallyPushing}
            disabled={tallyLoading || (tallyBridgeStatus !== 'connected' && tallyBridgeStatus !== 'direct') || tallyPrimeStatus !== 'connected'}
            onClick={handlePushToTally}
          >
            Push to Tally
          </Button>
        ]}
        destroyOnClose
      >
        {tallyLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Preparing Tally integration data..." />
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {/* Status indicators */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Bridge Agent:</div>
                <div style={{ marginTop: '4px' }}>
                  {tallyBridgeStatus === 'connected' ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>Running</Tag>
                  ) : tallyBridgeStatus === 'direct' ? (
                    <Tag color="blue" icon={<CheckCircleOutlined />}>Direct Connect</Tag>
                  ) : (
                    <Tag color="red" icon={<CloseCircleOutlined />}>Offline (Port 7000)</Tag>
                  )}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Tally ODBC Server:</div>
                <div style={{ marginTop: '4px' }}>
                  {tallyPrimeStatus === 'connected' ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>Running</Tag>
                  ) : (
                    <Tag color="red" icon={<CloseCircleOutlined />}>Closed / Offline</Tag>
                  )}
                </div>
              </div>
              <div style={{ flex: 1.5 }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Tally Company Target:</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>
                  {tallyConfig?.companyName || 'ABC Pvt Ltd'}
                </div>
              </div>
            </div>

            {tallyBridgeStatus === 'direct' && tallyPrimeStatus === 'connected' && (
              <Alert
                message="Tally Prime Detected (Bridge Offline)"
                description={
                  <span style={{ fontSize: '12px', display: 'block', lineHeight: '1.6' }}>
                    Tally Prime is running locally, but the Tally Bridge Agent is offline.
                    We can try to push directly, but running the <b>Tally Bridge Agent</b> is highly recommended to receive and view import error details.
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: '20px' }}
              />
            )}

            {tallyBridgeStatus !== 'connected' && tallyBridgeStatus !== 'direct' && tallyPrimeStatus !== 'connected' && (
              <Alert
                message="Tally Prime & Bridge Agent Offline"
                description={
                  <span style={{ fontSize: '12px', display: 'block', lineHeight: '1.6' }}>
                    Pushing vouchers to Tally Prime requires both the local Tally Bridge Agent and Tally Prime to be running.
                    <br />
                    💡 <b>How to start the Bridge Agent:</b> Open the <code>tally_bridge_agent</code> folder inside your backend directory, and run <b><code>start_tally_bridge.bat</code></b> or execute the compiled binary.
                    <br />
                    <i>Alternatively, you can click <b>Download XML</b> below and import it manually into Tally Prime via <b>Import Data &gt; Vouchers</b>.</i>
                  </span>
                }
                type="info"
                showIcon
                style={{ marginBottom: '20px' }}
              />
            )}

            {tallyBridgeStatus !== 'connected' && tallyBridgeStatus !== 'direct' && tallyPrimeStatus === 'connected' && (
              <Alert
                message="Bridge Agent Offline"
                description={
                  <span style={{ fontSize: '12px', display: 'block', lineHeight: '1.6' }}>
                    Tally Prime is running, but the Tally Bridge Agent is offline. 
                    Please start the <b>Tally Bridge Agent</b> to ensure a reliable connection and view import logs.
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: '20px' }}
              />
            )}

            {/* Voucher preview */}
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ fontSize: '14px', color: '#1e293b' }}>
                Voucher Accounting Entries Preview ({tallyPreview?.entryMode === 'PER_EMPLOYEE' ? 'Per-Employee Mode' : 'Consolidated Mode'}):
              </Text>
            </div>

            {tallyPreview?.entryMode === 'PER_EMPLOYEE' ? (
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                {(tallyPreview.vouchers || []).map(v => (
                  <Card key={v.id} size="small" style={{ marginBottom: '12px', borderLeft: '3px solid #1677ff' }} bodyStyle={{ padding: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{v.narration}</span>
                      <span style={{ color: '#0284c7' }}>₹{v.total.toLocaleString('en-IN')}</span>
                    </div>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {(v.entries || []).map((entry, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ width: '10%', fontWeight: 'bold', color: entry.type === 'DR' ? '#1677ff' : '#52c41a', padding: '3px 0' }}>{entry.type}</td>
                            <td style={{ width: '65%', color: '#334155', padding: '3px 0' }}>{entry.ledger}</td>
                            <td style={{ width: '25%', textAlign: 'right', color: '#0f172a', padding: '3px 0' }}>₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                ))}
              </div>
            ) : (
              // Consolidated Preview
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '500' }}>
                  Narration: {tallyPreview?.narration}
                </div>
                <Table
                  dataSource={tallyPreview?.entries || []}
                  rowKey="ledger"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Type',
                      dataIndex: 'type',
                      key: 'type',
                      width: '15%',
                      render: (t) => <Text strong style={{ color: t === 'DR' ? '#1677ff' : '#52c41a' }}>{t}</Text>
                    },
                    {
                      title: 'Ledger Account',
                      dataIndex: 'ledger',
                      key: 'ledger',
                      width: '60%'
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      align: 'right',
                      width: '25%',
                      render: (amt) => <Text>₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    }
                  ]}
                  summary={() => (
                    <Table.Summary.Row style={{ background: '#f8fafc' }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>Total Balanced Amount</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong style={{ color: '#0f172a' }}>₹{tallyPreview?.totalDr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default PayrollList;
