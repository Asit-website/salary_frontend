import React, { useState, useEffect } from 'react';
import { Layout, Card, Form, Input, Select, Button, message, Space, Typography, Row, Col, Switch, Steps, DatePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import {
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { Step } = Steps;

const AddRegularStaff = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [salaryTemplates, setSalaryTemplates] = useState([]);
  const [attendanceTemplates, setAttendanceTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [pfEmployeePercent, setPfEmployeePercent] = useState(0);
  const [esiEmployeePercent, setEsiEmployeePercent] = useState(0);
  const [ptSlabs, setPtSlabs] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();
  const [extraEarnings, setExtraEarnings] = useState([]); // { id, label, amount }
  const [extraDeductions, setExtraDeductions] = useState([]); // { id, label, amount }
  const [lastAddedEarningId, setLastAddedEarningId] = useState(null);
  const [lastAddedDeductionId, setLastAddedDeductionId] = useState(null);
  const location = useLocation();
  const editingStaff = location.state?.staff || null;
  const isEditing = !!editingStaff;

  useEffect(() => {
    if (lastAddedEarningId) {
      const el = document.getElementById(`earn-${lastAddedEarningId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [lastAddedEarningId]);

  useEffect(() => {
    if (lastAddedDeductionId) {
      const el = document.getElementById(`ded-${lastAddedDeductionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [lastAddedDeductionId]);

  const phoneWatch = Form.useWatch('phone', form);
  const emailWatch = Form.useWatch('email', form);
  const salaryTemplateWatch = Form.useWatch('salaryTemplate', form);
  const designationWatch = Form.useWatch('designation', form);
  const basicSalaryWatch = Form.useWatch('basic_salary', form);
  const daWatch = Form.useWatch('da', form);
  const hraWatch = Form.useWatch('hra', form);
  const specialAllowanceWatch = Form.useWatch('special_allowance', form);
  const conveyanceAllowanceWatch = Form.useWatch('conveyance_allowance', form);
  const medicalAllowanceWatch = Form.useWatch('medical_allowance', form);
  const otherAllowancesWatch = Form.useWatch('other_allowances', form);

  const calcTotalEarnings = () =>
    Number(basicSalaryWatch || 0) +
    Number(hraWatch || 0) +
    Number(daWatch || 0) +
    Number(specialAllowanceWatch || 0) +
    Number(conveyanceAllowanceWatch || 0) +
    Number(medicalAllowanceWatch || 0) +
    Number(otherAllowancesWatch || 0) +
    (extraEarnings || []).reduce((sum, r) => sum + (parseFloat(r?.amount) || 0), 0);

  const pickProfessionalTax = (total, slabs) => {
    const t = Number(total || 0);
    const arr = Array.isArray(slabs) ? slabs : [];
    for (const s of arr) {
      const min = Number(s?.min ?? 0);
      const maxRaw = s?.max;
      const max = maxRaw === null || maxRaw === undefined || maxRaw === '' ? null : Number(maxRaw);
      if (!Number.isFinite(min)) continue;
      if (max === null) {
        if (t >= min) return Number(s?.amount || 0);
      } else if (Number.isFinite(max)) {
        if (t >= min && t < max) return Number(s?.amount || 0);
      }
    }
    return 0;
  };

  const step0HasErrors = () => {
    const errs = form.getFieldsError(['phone', 'email', 'salaryTemplate', 'designation']);
    return errs.some(e => (e.errors || []).length > 0);
  };

  const fetchDepartments = async () => {
    try {
      const resp = await api.get('/admin/business-functions');
      const list = resp?.data?.data || [];
      const deptFn = list.find((f) => String(f.name || '').toLowerCase() === 'department');
      const values = Array.isArray(deptFn?.values) ? deptFn.values : [];
      const items = values
        .filter((v) => v && v.value)
        .map((v) => ({ id: v.id, name: v.value }));
      setDepartments(items);
    } catch (_) {
      setDepartments([]);
    }
  };

  const fetchShiftTemplates = async () => {
    try {
      const response = await api.get('/admin/shifts/templates');
      const list = response.data?.templates || [];
      setShiftTemplates(list);
    } catch (error) {
      // silent fail, keep static empty list
    }
  };

  const isStep0Complete = () => {
    const filled = !!(phoneWatch && emailWatch && salaryTemplateWatch && designationWatch);
    if (!filled) return false;
    return !step0HasErrors();
  };

  // Fetch salary templates, attendance templates, and shift templates on component mount
  useEffect(() => {
    fetchSalaryTemplates();
    fetchAttendanceTemplates();
    fetchShiftTemplates();
    fetchDepartments();

    if (isEditing) {
      console.log('Editing staff:', editingStaff);

      // Parse salaryValues if it's a string
      let sv = editingStaff.salaryValues || {};
      if (typeof sv === 'string') {
        try { sv = JSON.parse(sv); } catch (e) { sv = {}; }
      }

      const eb = sv.earnings || {};
      const db = sv.deductions || {};

      // Handle dynamic extras
      const knownE = ['basic_salary', 'hra', 'da', 'special_allowance', 'conveyance_allowance', 'medical_allowance', 'other_allowances'];
      const extE = [];
      Object.entries(eb).forEach(([k, v]) => {
        if (!knownE.includes(k) && k !== 'totalEarnings' && k !== 'totalIncentives') {
          extE.push({ id: Date.now() + Math.random(), label: k.replace(/_/g, ' ').toUpperCase(), amount: v });
        }
      });
      setExtraEarnings(extE);

      const knownD = ['provident_fund', 'esi', 'professional_tax', 'income_tax', 'loan_deduction', 'other_deductions'];
      const extD = [];
      Object.entries(db).forEach(([k, v]) => {
        if (!knownD.includes(k) && k !== 'totalDeductions') {
          extD.push({ id: Date.now() + Math.random(), label: k.replace(/_/g, ' ').toUpperCase(), amount: v });
        }
      });
      setExtraDeductions(extD);

      const ob = editingStaff.openingBalance || 0;

      form.setFieldsValue({
        staffName: editingStaff.name,
        phone: editingStaff.phone,
        staffId: editingStaff.staffId,
        email: editingStaff.email,
        department: editingStaff.department,
        designation: editingStaff.designation,
        attendanceSettingTemplate: editingStaff.attendanceSettingTemplate,
        dateOfJoining: editingStaff.dateOfJoining ? dayjs(editingStaff.dateOfJoining) : null,
        staffType: editingStaff.staffType,
        salaryTemplate: editingStaff.salaryTemplateId,
        shiftSelection: editingStaff.shiftSelection,
        openingBalanceAmount: Math.abs(ob),
        openingBalanceType: ob < 0 ? 'pending' : 'advance',
        salaryDetailAccess: !!editingStaff.salaryDetailAccess,
        allowCurrentCycleSalaryAccess: !!editingStaff.allowCurrentCycleSalaryAccess,
        basic_salary: eb.basic_salary ?? editingStaff.basicSalary,
        hra: eb.hra ?? editingStaff.hra,
        da: eb.da ?? editingStaff.da,
        special_allowance: eb.special_allowance ?? editingStaff.specialAllowance,
        conveyance_allowance: eb.conveyance_allowance ?? editingStaff.conveyanceAllowance,
        medical_allowance: eb.medical_allowance ?? editingStaff.medicalAllowance,
        other_allowances: eb.other_allowances ?? editingStaff.otherAllowances,
        provident_fund_employee: db.provident_fund ?? editingStaff.pfDeduction,
        esi: db.esi ?? editingStaff.esiDeduction,
        professional_tax: db.professional_tax ?? editingStaff.professionalTax,
        income_tax: db.income_tax ?? editingStaff.tdsDeduction,
        loan_deduction: db.loan_deduction ?? editingStaff.otherDeductions,
        other_deductions: db.other_deductions ?? editingStaff.otherDeductions,
      });

      if (editingStaff.salaryTemplateId) {
        handleSalaryTemplateChange(editingStaff.salaryTemplateId, true);
      }
    }
  }, [isEditing, editingStaff]);

  const fetchSalaryTemplates = async () => {
    try {
      const response = await api.get('/admin/salary-templates');
      if (response.data.success) {
        setSalaryTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch salary templates:', error);
      message.error('Failed to load salary templates');
    }
  };

  const fetchAttendanceTemplates = async () => {
    try {
      const response = await api.get('/admin/attendance-templates');
      if (response.data.success) {
        setAttendanceTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance templates:', error);
      message.error('Failed to load attendance templates');
    }
  };

  const handleSalaryTemplateChange = async (templateId, skipSetFields = false) => {
    try {
      const response = await api.get(`/admin/salary-templates/${templateId}`);
      const payload = response?.data?.data || response?.data || {};
      if (payload) {
        setSelectedTemplate(payload);
        const toKV = (objOrArr) => {
          if (!objOrArr) return {};
          let src = objOrArr;
          if (typeof src === 'string') {
            try { src = JSON.parse(src); } catch (_) { return {}; }
          }
          if (Array.isArray(src)) {
            const out = {};
            src.forEach((it) => {
              const key = (it.key || it.name || '').toString();
              const val = Number(it.valueNumber ?? it.value ?? 0);
              if (key) out[key] = val;
            });
            return out;
          }
          return src && typeof src === 'object' ? src : {};
        };

        const earnings = toKV(payload.earnings);
        const deductions = toKV(payload.deductions);

        const basic = Number(earnings['BASIC SALARY'] || 0);
        const da = Number(earnings['DA'] || 0);

        // PF % extraction must work for array / nested array / stringified JSON / object
        let dedSrc = payload.deductions;
        if (typeof dedSrc === 'string') {
          try { dedSrc = JSON.parse(dedSrc); } catch (_) { dedSrc = null; }
        }
        let pfPercent = 0;
        if (Array.isArray(dedSrc)) {
          const deductionsArray = dedSrc.flatMap((x) => (Array.isArray(x) ? x : [x]));
          const pfEmployeeItem = deductionsArray.find(d => (d?.key || d?.name) === 'PROVIDENT_FUND_EMPLOYEE');
          pfPercent = Number(pfEmployeeItem?.valueNumber ?? pfEmployeeItem?.value_number ?? pfEmployeeItem?.value ?? 0) || 0;
        } else if (dedSrc && typeof dedSrc === 'object') {
          // If backend returns object, it could be either a plain number or an object with value/valueNumber
          const v = dedSrc.PROVIDENT_FUND_EMPLOYEE;
          pfPercent = Number(v?.valueNumber ?? v?.value_number ?? v?.value ?? v ?? 0) || 0;
        }
        setPfEmployeePercent(pfPercent);

        let esiPercent = 0;
        if (Array.isArray(dedSrc)) {
          const deductionsArray = dedSrc.flatMap((x) => (Array.isArray(x) ? x : [x]));
          const esiEmployeeItem = deductionsArray.find(d => (d?.key || d?.name) === 'ESI_EMPLOYEE');
          if (esiEmployeeItem) {
            esiPercent = Number(esiEmployeeItem?.valueNumber ?? esiEmployeeItem?.value_number ?? esiEmployeeItem?.value ?? 0) || 0;
          } else {
            const legacyEsiItem = deductionsArray.find(d => (d?.key || d?.name) === 'ESI');
            esiPercent = Number(legacyEsiItem?.valueNumber ?? legacyEsiItem?.value_number ?? legacyEsiItem?.value ?? 0) || 0;
          }
        } else if (dedSrc && typeof dedSrc === 'object') {
          const v = dedSrc.ESI_EMPLOYEE ?? dedSrc.ESI;
          esiPercent = Number(v?.valueNumber ?? v?.value_number ?? v?.value ?? v ?? 0) || 0;
        }
        setEsiEmployeePercent(esiPercent);

        let slabs = [];
        if (Array.isArray(dedSrc)) {
          const deductionsArray = dedSrc.flatMap((x) => (Array.isArray(x) ? x : [x]));
          const ptItem = deductionsArray.find(d => (d?.key || d?.name) === 'PROFESSIONAL TAX' || (d?.key || d?.name) === 'PROFESSIONAL_TAX');
          slabs = Array.isArray(ptItem?.meta?.slabs) ? ptItem.meta.slabs : [];
        } else if (dedSrc && typeof dedSrc === 'object') {
          const v = dedSrc['PROFESSIONAL TAX'] ?? dedSrc.PROFESSIONAL_TAX;
          slabs = Array.isArray(v?.meta?.slabs) ? v.meta.slabs : [];
        }
        setPtSlabs(slabs);

        const pfBase = basic + da;
        const pfEmployeeAmount = Math.round(pfBase * (pfPercent / 100));

        const totalEarnings =
          Number(basic || 0) +
          Number(earnings['HRA'] || 0) +
          Number(da || 0) +
          Number(earnings['SPECIAL ALLOWANCE'] || 0) +
          Number(earnings['CONVEYANCE ALLOWANCE'] || 0) +
          Number(earnings['MEDICAL ALLOWANCE'] || 0) +
          Number(earnings['OTHER ALLOWANCES'] || 0);
        const esiEmployeeAmount = Math.round(totalEarnings * (esiPercent / 100));
        const professionalTaxAmount = pickProfessionalTax(totalEarnings, slabs);

        if (!skipSetFields) {
          form.setFieldsValue({
            basic_salary: basic,
            hra: Number(earnings['HRA'] || 0),
            da: da,
            special_allowance: Number(earnings['SPECIAL ALLOWANCE'] || 0),
            conveyance_allowance: Number(earnings['CONVEYANCE ALLOWANCE'] || 0),
            medical_allowance: Number(earnings['MEDICAL ALLOWANCE'] || 0),
            other_allowances: Number(earnings['OTHER ALLOWANCES'] || 0),
            provident_fund_employee: pfEmployeeAmount,
            provident_fund_employer: 0,
            esi: esiEmployeeAmount,
            professional_tax: professionalTaxAmount,
            income_tax: Number(deductions['INCOME TAX']?.valueNumber || 0),
            loan_deduction: Number(deductions['LOAN DEDUCTION']?.valueNumber || 0),
            other_deductions: Number(deductions['OTHER DEDUCTIONS']?.valueNumber || 0),
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch template:', error);
    }
  };

  useEffect(() => {
    if (!selectedTemplate) return;
    const basic = Number(basicSalaryWatch || 0);
    const da = Number(daWatch || 0);
    const base = basic + da;
    const percent = Number(pfEmployeePercent || 0);
    const amount = Math.round(base * (percent / 100));
    form.setFieldsValue({
      provident_fund_employee: amount,
      provident_fund_employer: 0,
    });
  }, [selectedTemplate, basicSalaryWatch, daWatch, pfEmployeePercent]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const total = calcTotalEarnings();
    const percent = Number(esiEmployeePercent || 0);
    const amount = Math.round(total * (percent / 100));
    form.setFieldsValue({ esi: amount });
  }, [
    selectedTemplate,
    basicSalaryWatch,
    hraWatch,
    daWatch,
    specialAllowanceWatch,
    conveyanceAllowanceWatch,
    medicalAllowanceWatch,
    otherAllowancesWatch,
    extraEarnings,
    esiEmployeePercent,
    form,
  ]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const total = calcTotalEarnings();
    const amount = pickProfessionalTax(total, ptSlabs);
    form.setFieldsValue({ professional_tax: amount });
  }, [
    selectedTemplate,
    basicSalaryWatch,
    hraWatch,
    daWatch,
    specialAllowanceWatch,
    conveyanceAllowanceWatch,
    medicalAllowanceWatch,
    otherAllowancesWatch,
    extraEarnings,
    ptSlabs,
    form,
  ]);

  const steps = [
    {
      title: 'Basic Details',
      content: 'basic',
    },
    {
      title: 'Salary Details',
      content: 'salary',
    },
  ];

  const next = () => {
    setCurrentStep(currentStep + 1);
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      // Merge all current form values to avoid losing unmounted fields
      const allValues = { ...form.getFieldsValue(true), ...values };
      // Ensure critical fields exist even if Step 1 is unmounted
      const phoneVal = (allValues.phone || '').toString().trim();
      const emailVal = (allValues.email || '').toString().trim();
      const salaryTemplateVal = allValues.salaryTemplate;

      if (!phoneVal) {
        setLoading(false);
        message.error('Phone is required');
        setCurrentStep(0);
        return;
      }
      if (!emailVal) {
        setLoading(false);
        message.error('Email is required');
        setCurrentStep(0);
        return;
      }
      if (!salaryTemplateVal) {
        setLoading(false);
        message.error('Salary template is required');
        setCurrentStep(0);
        return;
      }

      // Calculate total salary components
      const basic_salary = parseFloat(allValues.basic_salary) || 0;
      const hra = parseFloat(allValues.hra) || 0;
      const da = parseFloat(allValues.da) || 0;
      const special_allowance = parseFloat(allValues.special_allowance) || 0;
      const conveyance_allowance = parseFloat(allValues.conveyance_allowance) || 0;
      const medical_allowance = parseFloat(allValues.medical_allowance) || 0;
      const other_allowances = parseFloat(allValues.other_allowances) || 0;

      // Calculate deductions
      const provident_fund_employee = parseFloat(allValues.provident_fund_employee) || 0;
      const esi = parseFloat(allValues.esi) || 0;
      const professional_tax = parseFloat(allValues.professional_tax) || 0;
      const income_tax = parseFloat(allValues.income_tax) || 0;
      const loan_deduction = parseFloat(allValues.loan_deduction) || 0;
      const other_deductions = parseFloat(allValues.other_deductions) || 0;

      // Prepare salary values based on selected template fields
      const toKV = (objOrArr) => {
        if (!objOrArr) return {};
        let src = objOrArr;
        if (typeof src === 'string') {
          try { src = JSON.parse(src); } catch (_) { return {}; }
        }
        if (Array.isArray(src)) {
          const out = {};
          src.forEach((it) => {
            const key = (it.key || it.name || '').toString();
            const val = Number(it.valueNumber ?? it.value ?? 0);
            if (key) out[key] = val;
          });
          return out;
        }
        return src && typeof src === 'object' ? src : {};
      };
      const earningsTpl = selectedTemplate ? toKV(selectedTemplate.earnings) : null;
      const deductionsTpl = selectedTemplate ? toKV(selectedTemplate.deductions) : null;
      const tplEmpty = (!earningsTpl || Object.keys(earningsTpl).length === 0) && (!deductionsTpl || Object.keys(deductionsTpl).length === 0);
      const knownE = ['BASIC SALARY', 'HRA', 'DA', 'SPECIAL ALLOWANCE', 'CONVEYANCE ALLOWANCE', 'MEDICAL ALLOWANCE', 'OTHER ALLOWANCES'];
      const knownD = ['PROVIDENT FUND', 'ESI', 'PROFESSIONAL TAX', 'INCOME TAX', 'LOAN DEDUCTION', 'OTHER DEDUCTIONS'];
      const hasKnownE = earningsTpl && knownE.some(k => Object.prototype.hasOwnProperty.call(earningsTpl, k));
      const hasKnownD = deductionsTpl && knownD.some(k => Object.prototype.hasOwnProperty.call(deductionsTpl, k));
      const showAll = !selectedTemplate || tplEmpty || (!hasKnownE && !hasKnownD);
      const showE = (k) => showAll || (earningsTpl && Object.prototype.hasOwnProperty.call(earningsTpl, k));
      const showD = (k) => {
        if (showAll) return true;
        if (!selectedTemplate) return false;

        // Special check for PROVIDENT FUND - check in original template array
        if (k === 'PROVIDENT FUND') {
          let src = selectedTemplate.deductions;
          if (typeof src === 'string') {
            try { src = JSON.parse(src); } catch (_) { src = null; }
          }
          const pfKeys = ['PROVIDENT_FUND_EMPLOYEE', 'PROVIDENT_FUND', 'PROVIDENT FUND', 'PROVIDENT_FUND_EMPLOYER'];
          const norm = (v) => (v || '').toString().trim().toUpperCase();
          const pfKeysNorm = pfKeys.map(norm);
          if (Array.isArray(src)) {
            const arr = src.flatMap((x) => (Array.isArray(x) ? x : [x]));
            return arr.some((d) => pfKeysNorm.includes(norm(d?.key || d?.name)));
          }
          if (src && typeof src === 'object') {
            return Object.keys(src).some((key) => pfKeysNorm.includes(norm(key)));
          }
          return false;
        }

        if (k === 'ESI') {
          let src = selectedTemplate.deductions;
          if (typeof src === 'string') {
            try { src = JSON.parse(src); } catch (_) { src = null; }
          }
          const esiKeys = ['ESI_EMPLOYEE', 'ESI'];
          if (Array.isArray(src)) {
            const arr = src.flatMap((x) => (Array.isArray(x) ? x : [x]));
            return esiKeys.some((key) => arr.some((d) => (d?.key || d?.name) === key));
          }
          if (src && typeof src === 'object') {
            return esiKeys.some((key) => Object.prototype.hasOwnProperty.call(src, key));
          }
          return false;
        }

        if (k === 'PROFESSIONAL TAX') {
          let src = selectedTemplate.deductions;
          if (typeof src === 'string') {
            try { src = JSON.parse(src); } catch (_) { src = null; }
          }
          const ptKeys = ['PROFESSIONAL TAX', 'PROFESSIONAL_TAX'];
          if (Array.isArray(src)) {
            const arr = src.flatMap((x) => (Array.isArray(x) ? x : [x]));
            return ptKeys.some((key) => arr.some((d) => (d?.key || d?.name) === key));
          }
          if (src && typeof src === 'object') {
            return ptKeys.some((key) => Object.prototype.hasOwnProperty.call(src, key));
          }
          return false;
        }

        // For other deductions, check in converted object
        if (!deductionsTpl) return false;
        return Object.prototype.hasOwnProperty.call(deductionsTpl, k);
      };

      const salaryValues = { earnings: {}, deductions: {} };
      if (showE('BASIC SALARY')) salaryValues.earnings.basic_salary = basic_salary;
      if (showE('HRA')) salaryValues.earnings.hra = hra;
      if (showE('DA')) salaryValues.earnings.da = da;
      if (showE('SPECIAL ALLOWANCE')) salaryValues.earnings.special_allowance = special_allowance;
      if (showE('CONVEYANCE ALLOWANCE')) salaryValues.earnings.conveyance_allowance = conveyance_allowance;
      if (showE('MEDICAL ALLOWANCE')) salaryValues.earnings.medical_allowance = medical_allowance;
      if (showE('OTHER ALLOWANCES')) salaryValues.earnings.other_allowances = other_allowances;

      if (showD('PROVIDENT FUND') || allValues.provident_fund_employee !== undefined) {
        // Backend + Staff Profile/Payroll expects `provident_fund` (this is Employee PF).
        salaryValues.deductions.provident_fund = provident_fund_employee;
      }
      if (showD('ESI')) salaryValues.deductions.esi = esi;
      if (showD('PROFESSIONAL TAX')) salaryValues.deductions.professional_tax = professional_tax;
      if (showD('INCOME TAX')) salaryValues.deductions.income_tax = income_tax;
      if (showD('LOAN DEDUCTION')) salaryValues.deductions.loan_deduction = loan_deduction;
      if (showD('OTHER DEDUCTIONS')) salaryValues.deductions.other_deductions = other_deductions;

      // Add dynamic extras
      const toKey = (s) => (s || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      extraEarnings.forEach(row => {
        const k = toKey(row.label || 'earning');
        if (k) salaryValues.earnings[k] = parseFloat(row.amount) || 0;
      });
      extraDeductions.forEach(row => {
        const k = toKey(row.label || 'deduction');
        if (k) salaryValues.deductions[k] = parseFloat(row.amount) || 0;
      });

      // Normalize date fields
      const salaryCycleDateStr = Array.isArray(allValues.salaryCycleDate) && allValues.salaryCycleDate.length
        ? allValues.salaryCycleDate[0]?.format?.('YYYY-MM-DD') || null
        : null;

      // Opening balance compute
      const obType = allValues.openingBalanceType || 'advance';
      const obAmount = parseFloat(allValues.openingBalanceAmount) || 0;
      const openingBalanceComputed = obType === 'pending' ? -Math.abs(obAmount) : Math.abs(obAmount);

      // Create staff member with all details
      const staffData = {
        // Basic Details
        staffId: allValues.staffId,
        phone: phoneVal,
        name: allValues.staffName,
        email: emailVal,
        password: allValues.password || '123456', // Default password if not provided

        // Additional Form Fields
        department: allValues.department,
        designation: allValues.designation,
        attendanceSettingTemplate: allValues.attendanceSettingTemplate,
        salaryCycleDate: salaryCycleDateStr,
        dateOfJoining: allValues.dateOfJoining ? allValues.dateOfJoining.format('YYYY-MM-DD') : null,
        staffType: allValues.staffType,
        shiftSelection: allValues.shiftSelection,
        openingBalance: openingBalanceComputed,
        openingBalanceType: obType,
        salaryDetailAccess: !!allValues.salaryDetailAccess,
        allowCurrentCycleSalaryAccess: !!allValues.allowCurrentCycleSalaryAccess,
        active: allValues.active !== false, // Default to true if not specified

        // Salary Template
        salaryTemplateId: salaryTemplateVal,

        // Salary Values (structured for backend)
        salaryValues
      };

      const response = isEditing
        ? await api.put(`/admin/staff/${editingStaff.id}`, staffData)
        : await api.post('/admin/staff', staffData);

      if (response.data.success) {
        // Assign shift if selected
        const createdStaffId = isEditing ? editingStaff.id : (response.data?.staff?.id || response.data?.data?.id);
        const selectedShiftId = allValues.shiftSelection;
        if (createdStaffId && selectedShiftId) {
          try {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const effectiveFrom = `${yyyy}-${mm}-${dd}`;
            await api.post('/admin/shifts/assign', { userId: createdStaffId, shiftTemplateId: Number(selectedShiftId), effectiveFrom });
          } catch (_) {
            // ignore assign error, continue
          }
        }
        message.success(isEditing ? 'Staff member updated successfully' : 'Regular staff member added successfully with all salary details');
        navigate('/staff-management');
      } else {
        message.error(response.data.message || 'Failed to save staff member');
      }
    } catch (error) {
      console.error('Failed to save staff member:', error);
      message.error(error.response?.data?.message || 'Failed to save staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/staff-management');
  };

  const renderStepContent = () => {
    // Determine which fields to show based on selected template
    const toKV = (objOrArr) => {
      if (!objOrArr) return {};
      let src = objOrArr;
      if (typeof src === 'string') {
        try { src = JSON.parse(src); } catch (_) { return {}; }
      }
      if (Array.isArray(src)) {
        const out = {};
        src.flatMap((x) => (Array.isArray(x) ? x : [x])).forEach((it) => {
          const key = (it.key || it.name || '').toString();
          const val = Number(it.valueNumber ?? it.value_number ?? it.value ?? 0);
          if (key) out[key] = val;
        });
        return out;
      }
      return src && typeof src === 'object' ? src : {};
    };
    const earningsTpl = selectedTemplate ? toKV(selectedTemplate.earnings) : null;
    const deductionsTpl = selectedTemplate ? toKV(selectedTemplate.deductions) : null;
    const tplEmpty = (!earningsTpl || Object.keys(earningsTpl).length === 0) && (!deductionsTpl || Object.keys(deductionsTpl).length === 0);
    const showAll = !selectedTemplate || tplEmpty;
    const showE = (k) => showAll || (earningsTpl && Object.prototype.hasOwnProperty.call(earningsTpl, k));
    const showD = (k) => {
      if (showAll) return true;
      if (!selectedTemplate) return false;

      if (k === 'PROVIDENT FUND') {
        const pfKeys = ['PROVIDENT_FUND_EMPLOYEE', 'PROVIDENT_FUND', 'PROVIDENT FUND', 'PROVIDENT_FUND_EMPLOYER'];
        const norm = (v) => (v || '').toString().trim().toUpperCase();
        const pfKeysNorm = pfKeys.map(norm);

        let src = selectedTemplate.deductions;
        if (typeof src === 'string') {
          try { src = JSON.parse(src); } catch (_) { src = null; }
        }

        if (Array.isArray(src)) {
          const arr = src.flatMap((x) => (Array.isArray(x) ? x : [x]));
          return arr.some((d) => pfKeysNorm.includes(norm(d?.key || d?.name)));
        }

        if (src && typeof src === 'object') {
          return Object.keys(src).some((key) => pfKeysNorm.includes(norm(key)));
        }

        return false;
      }

      if (k === 'ESI') {
        const esiKeys = ['ESI_EMPLOYEE', 'ESI'];

        let src = selectedTemplate.deductions;
        if (typeof src === 'string') {
          try { src = JSON.parse(src); } catch (_) { src = null; }
        }

        if (Array.isArray(src)) {
          const arr = src.flatMap((x) => (Array.isArray(x) ? x : [x]));
          return esiKeys.some((key) => arr.some((d) => (d?.key || d?.name) === key));
        }

        if (src && typeof src === 'object') {
          return esiKeys.some((key) => Object.prototype.hasOwnProperty.call(src, key));
        }

        return false;
      }

      return !!(deductionsTpl && Object.prototype.hasOwnProperty.call(deductionsTpl, k));
    };
    switch (currentStep) {
      case 0:
        return (
          <div style={{ padding: '20px' }}>
            <Row gutter={[16, 16]}>
              {/* Basic Details Card */}
              <Col span={24}>
                <Card
                  title="Basic Details"
                  style={{
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Form.Item
                        name="staffName"
                        label="Staff Name"
                      >
                        <Input placeholder="Enter staff name" style={{ height: '40px' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="phone"
                        label="Phone Number"
                        rules={[{ required: true, message: 'Please enter phone number' }]}
                      >
                        <Input placeholder="Enter phone number" style={{ height: '40px' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="staffId"
                        label="Staff ID"
                      >
                        <Input placeholder="Enter staff ID" style={{ height: '40px' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="attendanceSettingTemplate"
                        label="Attendance Setting Template"
                      >
                        <Select placeholder="Select attendance template" style={{ height: '40px' }}>
                          {attendanceTemplates.map(template => (
                            <Option key={template.id} value={template.id}>
                              {template.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="department"
                        label="Department"
                      >
                        <Select placeholder="Select department" style={{ height: '40px' }}>
                          {departments.length > 0 ? (
                            departments.map((d) => (
                              <Option key={d.id || d.name} value={d.name}>{d.name}</Option>
                            ))
                          ) : (
                            [
                              'IT', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations', 'General'
                            ].map((n) => (
                              <Option key={n} value={n}>{n}</Option>
                            ))
                          )}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="dateOfJoining"
                        label="Joining Date"
                      >
                        <DatePicker style={{ width: '100%', height: '40px' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* Salary Details Card */}
              <Col span={24}>
                <Card
                  title="Salary Details"
                  style={{
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <Row gutter={[16, 16]}>
                    {/* <Col span={12}>
                      <Form.Item
                        name="salaryCycleDate"
                        label="Salary Cycle Date"
                      >
                        <DatePicker.RangePicker
                          placeholder={['Start date', 'End date']}
                          style={{ width: '100%', height: '40px' }}
                        />
                      </Form.Item>
                    </Col> */}
                    <Col span={12}>
                      <Form.Item
                        name="staffType"
                        label="Staff Type"
                      >
                        <Select placeholder="Select staff type" style={{ height: '40px' }}>
                          <Option value="regular">Regular</Option>
                          <Option value="contractual">Contractual</Option>
                          <Option value="intern">Intern</Option>
                          <Option value="part-time">Part Time</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="salaryTemplate"
                        label="Salary Template"
                        rules={[{ required: true, message: 'Please select salary template' }]}
                      >
                        <Select
                          placeholder="Select salary template"
                          style={{ height: '40px' }}
                          onChange={handleSalaryTemplateChange}
                        >
                          {salaryTemplates.map(template => (
                            <Option key={template.id} value={template.id}>
                              {template.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="shiftSelection"
                        label="Shift Selection"
                      >
                        <Select placeholder="Select shift" style={{ height: '40px' }} allowClear>
                          {shiftTemplates.map(st => (
                            <Option key={st.id} value={st.id}>
                              {st.name} {st.shiftType === 'open' ? `(Open • ${st.workMinutes || 0}m)` : st.startTime && st.endTime ? `(${st.startTime}-${st.endTime})` : ''}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Opening Balance"
                      >
                        <Input.Group compact>
                          <Form.Item name="openingBalanceType" noStyle initialValue="advance">
                            <Select
                              style={{ width: '40%', height: '40px' }}
                              placeholder="Select type"
                            >
                              <Option value="advance">Advance</Option>
                              <Option value="pending">Pending</Option>
                            </Select>
                          </Form.Item>
                          <Form.Item name="openingBalanceAmount" noStyle>
                            <Input
                              style={{ width: '60%', height: '40px' }}
                              placeholder="Enter amount"
                              type="number"
                            />
                          </Form.Item>
                        </Input.Group>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="salaryDetailAccess"
                        label="Salary Detail Access"
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="Yes" unCheckedChildren="No" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="allowCurrentCycleSalaryAccess"
                        label="Allow Current Cycle Salary Access"
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="Yes" unCheckedChildren="No" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* Third Card (you mentioned 3 cards, so leaving space for the third one) */}
              <Col span={24}>
                <Card
                  title="Additional Information"
                  style={{
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Form.Item
                        name="email"
                        label="Email Address"
                        rules={[
                          { required: true, message: 'Please enter email' },
                          { type: 'email', message: 'Please enter valid email' }
                        ]}
                      >
                        <Input placeholder="Enter email address" style={{ height: '40px' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="designation"
                        label="Designation"
                        rules={[{ required: true, message: 'Please enter designation' }]}
                      >
                        <Input placeholder="Enter designation" style={{ height: '40px' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </div>
        );
      case 1:
        return (
          <div style={{ padding: '20px' }}>
            <Row gutter={[16, 16]}>
              {/* Earnings Section */}
              <Col span={12}>
                <Card
                  title="Earnings"
                  bordered
                  headStyle={{ fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}
                  bodyStyle={{ padding: 16 }}
                  style={{
                    borderRadius: '8px',
                    background: '#fff'
                  }}
                  extra={<Button type="link" size="small" style={{ padding: 0, color: '#125EC9' }} onClick={() => {
                    const id = Date.now() + Math.random();
                    setExtraEarnings(v => ([...v, { id, label: '', amount: '' }]));
                    setTimeout(() => setLastAddedEarningId(id), 0);
                  }}>+ Add More</Button>}
                >
                  <Row gutter={[16, 16]}>
                    {showE('BASIC SALARY') && (
                      <Col span={24}>
                        <Form.Item
                          name="basic_salary"
                          label="Basic Salary"
                          rules={[{ required: true, message: 'Please enter basic salary' }]}
                        >
                          <Input type="number" placeholder="Enter basic salary" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showE('HRA') && (
                      <Col span={24}>
                        <Form.Item
                          name="hra"
                          label="HRA"
                          rules={[{ required: true, message: 'Please enter HRA' }]}
                        >
                          <Input type="number" placeholder="Enter HRA amount" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showE('DA') && (
                      <Col span={24}>
                        <Form.Item
                          name="da"
                          label="DA"
                          rules={[{ required: true, message: 'Please enter DA' }]}
                        >
                          <Input type="number" placeholder="Enter DA amount" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showE('SPECIAL ALLOWANCE') && (
                      <Col span={24}>
                        <Form.Item
                          name="special_allowance"
                          label="Special Allowance"
                        >
                          <Input type="number" placeholder="Enter special allowance" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showE('CONVEYANCE ALLOWANCE') && (
                      <Col span={24}>
                        <Form.Item
                          name="conveyance_allowance"
                          label="Conveyance Allowance"
                        >
                          <Input type="number" placeholder="Enter conveyance allowance" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showE('MEDICAL ALLOWANCE') && (
                      <Col span={24}>
                        <Form.Item
                          name="medical_allowance"
                          label="Medical Allowance"
                        >
                          <Input type="number" placeholder="Enter medical allowance" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showE('OTHER ALLOWANCES') && (
                      <Col span={24}>
                        <Form.Item
                          name="other_allowances"
                          label="Other Allowances"
                        >
                          <Input type="number" placeholder="Enter other allowances" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {extraEarnings.map((row, idx) => (
                      <React.Fragment key={row.id}>
                        <Col span={12} id={`earn-${row.id}`} style={{ transition: 'background-color 0.8s', backgroundColor: row.id === lastAddedEarningId ? '#fffbe6' : 'transparent', borderRadius: 4 }}>
                          <Input
                            placeholder="Custom earning label"
                            value={row.label}
                            onChange={(e) => {
                              const val = e.target.value; setExtraEarnings(list => list.map(r => r.id === row.id ? { ...r, label: val } : r));
                            }}
                            style={{ height: '40px' }}
                            autoFocus={row.id === lastAddedEarningId}
                          />
                        </Col>
                        <Col span={10}>
                          <Input
                            placeholder="Amount"
                            type="number"
                            value={row.amount}
                            onChange={(e) => {
                              const val = e.target.value; setExtraEarnings(list => list.map(r => r.id === row.id ? { ...r, amount: val } : r));
                            }}
                            style={{ height: '40px' }}
                          />
                        </Col>
                        <Col span={2} style={{ display: 'flex', alignItems: 'center' }}>
                          <Button danger type="link" onClick={() => setExtraEarnings(list => list.filter(r => r.id !== row.id))}>
                            Remove
                          </Button>
                        </Col>
                      </React.Fragment>
                    ))}
                  </Row>
                </Card>
              </Col>

              {/* Deductions Section */}
              <Col span={12}>
                <Card
                  title="Deductions"
                  bordered
                  headStyle={{ fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}
                  bodyStyle={{ padding: 16 }}
                  style={{
                    borderRadius: '8px',
                    background: '#fff'
                  }}
                  extra={<Button type="link" size="small" style={{ padding: 0, color: '#125EC9' }} onClick={() => {
                    const id = Date.now() + Math.random();
                    setExtraDeductions(v => ([...v, { id, label: '', amount: '' }]));
                    setTimeout(() => setLastAddedDeductionId(id), 0);
                  }}>+ Add More</Button>}
                >
                  <Row gutter={[16, 16]}>
                    {showD('PROVIDENT FUND') && (
                      <>
                        <Col span={24}>
                          <Form.Item
                            name="provident_fund_employee"
                            label="Employee PF"
                          >
                            <InputNumber
                              min={0}
                              style={{ width: '100%', height: '40px' }}
                              placeholder="Employee PF"
                              disabled
                            />
                          </Form.Item>
                        </Col>
                      </>
                    )}
                    {showD('ESI') && (
                      <Col span={24}>
                        <Form.Item
                          name="esi"
                          label="Employee ESI"
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%', height: '40px' }}
                            placeholder="Employee ESI"
                            disabled
                          />
                        </Form.Item>
                      </Col>
                    )}
                    {showD('PROFESSIONAL TAX') && (
                      <Col span={24}>
                        <Form.Item
                          name="professional_tax"
                          label="Professional Tax"
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%', height: '40px' }}
                            placeholder="Professional Tax"
                            disabled
                          />
                        </Form.Item>
                      </Col>
                    )}
                    {showD('INCOME TAX') && (
                      <Col span={24}>
                        <Form.Item
                          name="income_tax"
                          label="Income Tax"
                        >
                          <Input type="number" placeholder="Enter income tax" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showD('LOAN DEDUCTION') && (
                      <Col span={24}>
                        <Form.Item
                          name="loan_deduction"
                          label="Loan Deduction"
                        >
                          <Input type="number" placeholder="Enter loan deduction" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {showD('OTHER DEDUCTIONS') && (
                      <Col span={24}>
                        <Form.Item
                          name="other_deductions"
                          label="Other Deductions"
                        >
                          <Input type="number" placeholder="Enter other deductions" style={{ height: '40px' }} />
                        </Form.Item>
                      </Col>
                    )}
                    {extraDeductions.map((row) => (
                      <React.Fragment key={row.id}>
                        <Col span={12} id={`ded-${row.id}`} style={{ transition: 'background-color 0.8s', backgroundColor: row.id === lastAddedDeductionId ? '#fffbe6' : 'transparent', borderRadius: 4 }}>
                          <Input
                            placeholder="Custom deduction label"
                            value={row.label}
                            onChange={(e) => {
                              const val = e.target.value; setExtraDeductions(list => list.map(r => r.id === row.id ? { ...r, label: val } : r));
                            }}
                            style={{ height: '40px' }}
                            autoFocus={row.id === lastAddedDeductionId}
                          />
                        </Col>
                        <Col span={10}>
                          <Input
                            placeholder="Amount"
                            type="number"
                            value={row.amount}
                            onChange={(e) => {
                              const val = e.target.value; setExtraDeductions(list => list.map(r => r.id === row.id ? { ...r, amount: val } : r));
                            }}
                            style={{ height: '40px' }}
                          />
                        </Col>
                        <Col span={2} style={{ display: 'flex', alignItems: 'center' }}>
                          <Button danger type="link" onClick={() => setExtraDeductions(list => list.filter(r => r.id !== row.id))}>
                            Remove
                          </Button>
                        </Col>
                      </React.Fragment>
                    ))}
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* Salary Summary */}
            <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
              <Col span={24}>
                <Card
                  title="Salary Summary"
                  bordered
                  headStyle={{ fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}
                  bodyStyle={{ padding: 16 }}
                  style={{
                    borderRadius: '8px',
                    background: '#fff'
                  }}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f0f8ff' }}>
                        <div style={{ fontSize: '14px', color: '#666' }}>Total Earnings</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                          ₹<span id="total-earnings">0</span>
                        </div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', background: '#fff2f0' }}>
                        <div style={{ fontSize: '14px', color: '#666' }}>Total Deductions</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f' }}>
                          ₹<span id="total-deductions">0</span>
                        </div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                        <div style={{ fontSize: '14px', color: '#666' }}>Net Salary</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                          ₹<span id="net-salary">0</span>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </div>
        );
      case 2:
        return (
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="basic_salary"
                label="Basic Salary"
                rules={[{ required: true, message: 'Please enter basic salary' }]}
              >
                <Input type="number" placeholder="Enter basic salary" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="hra"
                label="HRA"
                rules={[{ required: true, message: 'Please enter HRA' }]}
              >
                <Input type="number" placeholder="Enter HRA amount" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="da"
                label="DA"
                rules={[{ required: true, message: 'Please enter DA' }]}
              >
                <Input type="number" placeholder="Enter DA amount" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="special_allowance"
                label="Special Allowance"
              >
                <Input type="number" placeholder="Enter special allowance" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="conveyance_allowance"
                label="Conveyance Allowance"
              >
                <Input type="number" placeholder="Enter conveyance allowance" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="medical_allowance"
                label="Medical Allowance"
              >
                <Input type="number" placeholder="Enter medical allowance" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="telephone_allowance"
                label="Telephone Allowance"
              >
                <Input type="number" placeholder="Enter telephone allowance" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="other_allowances"
                label="Other Allowances"
              >
                <Input type="number" placeholder="Enter other allowances" />
              </Form.Item>
            </Col>
          </Row>
        );
      case 3:
        return (
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: !isEditing, message: 'Please enter password' }]}
              >
                <Input.Password placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="active"
                label="Status"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
        );
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />

      <Layout style={{ marginLeft: 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 90 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleCancel}
            style={{ marginRight: '16px' }}
          >
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>{isEditing ? 'Edit Regular Staff' : 'Add Regular Staff'}</Title>
        </Header>

        <Content style={{ margin: '24px 24px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Card
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              borderRadius: '4px',
              border: '1px solid #e8e8e8'
            }}
          >
            <Steps current={currentStep} style={{ marginBottom: '32px' }}>
              {steps.map(item => (
                <Step key={item.title} title={item.title} />
              ))}
            </Steps>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ active: true }}
            >
              <div style={{ minHeight: '300px' }}>
                {renderStepContent()}
              </div>

              <div style={{ marginTop: '32px' }}>
                {currentStep > 0 && (
                  <Button style={{ marginRight: 8 }} onClick={prev}>
                    Previous
                  </Button>
                )}
                {currentStep < steps.length - 1 && (
                  <Button type="primary" onClick={next} disabled={!isStep0Complete()}>
                    Next
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Space style={{ float: 'right' }}>
                    <Button onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      {isEditing ? 'Update Staff' : 'Create Staff'}
                    </Button>
                  </Space>
                )}
              </div>
            </Form>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AddRegularStaff;
