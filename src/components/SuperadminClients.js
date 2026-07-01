import React, { useEffect, useState } from 'react';
import { Layout, Typography, Menu, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, DatePicker, Tag, Checkbox, Row, Col } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  LogoutOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  ArrowUpOutlined,
  PoweroffOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SuperadminClients() {
  const navigate = useNavigate();
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
  const [assignModalTitle, setAssignModalTitle] = useState('Assign/Renew Subscription');
  const [isUpgrade, setIsUpgrade] = useState(false);
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperadmin = user.role === 'superadmin';
  const userPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || {});
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
        plans: res.data.plans || []
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
    const payrollEnabled = sub.payrollEnabled !== null ? sub.payrollEnabled : (plan.payrollEnabled || false);
    const performanceEnabled = sub.performanceEnabled !== null ? sub.performanceEnabled : (plan.performanceEnabled || false);
    const aiReportsEnabled = sub.aiReportsEnabled !== null ? sub.aiReportsEnabled : (plan.aiReportsEnabled || false);
    const aiAssistantEnabled = sub.aiAssistantEnabled !== null ? sub.aiAssistantEnabled : (plan.aiAssistantEnabled || false);
    const taskManagementEnabled = sub.taskManagementEnabled !== null ? sub.taskManagementEnabled : (plan.taskManagementEnabled || false);
    const salaryRegisterEnabled = sub.salaryRegisterEnabled !== null && sub.salaryRegisterEnabled !== undefined ? sub.salaryRegisterEnabled : (plan.salaryRegisterEnabled !== undefined ? plan.salaryRegisterEnabled : true);
    const monthlySummaryEnabled = sub.monthlySummaryEnabled !== null && sub.monthlySummaryEnabled !== undefined ? sub.monthlySummaryEnabled : (plan.monthlySummaryEnabled !== undefined ? plan.monthlySummaryEnabled : true);
    const perDaySalaryEnabled = sub.perDaySalaryEnabled !== null && sub.perDaySalaryEnabled !== undefined ? sub.perDaySalaryEnabled : (plan.perDaySalaryEnabled !== undefined ? plan.perDaySalaryEnabled : true);
    const comparisonEnabled = sub.comparisonEnabled !== null && sub.comparisonEnabled !== undefined ? sub.comparisonEnabled : (plan.comparisonEnabled !== undefined ? plan.comparisonEnabled : true);
    const otImpactEnabled = sub.otImpactEnabled !== null && sub.otImpactEnabled !== undefined ? sub.otImpactEnabled : (plan.otImpactEnabled !== undefined ? plan.otImpactEnabled : true);
    const latePenaltyEnabled = sub.latePenaltyEnabled !== null && sub.latePenaltyEnabled !== undefined ? sub.latePenaltyEnabled : (plan.latePenaltyEnabled !== undefined ? plan.latePenaltyEnabled : true);
    const esiAsTaEnabled = (() => {
      let meta = {};
      if (sub.meta) {
        try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
        if (meta?.esiAsTaEnabled !== undefined) return !!meta.esiAsTaEnabled;
      }
      let planFeatures = {};
      if (plan?.features) {
        try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
      }
      return !!planFeatures?.esiAsTaEnabled;
    })();
    const weeklyOffDeductionEnabled = (() => {
      let meta = {};
      if (sub.meta) {
        try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
        if (meta?.weeklyOffDeductionEnabled !== undefined) return !!meta.weeklyOffDeductionEnabled;
      }
      let planFeatures = {};
      if (plan?.features) {
        try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
      }
      return !!planFeatures?.weeklyOffDeductionEnabled;
    })();
    const rmoEnabled = (() => {
      let meta = {};
      if (sub.meta) {
        try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
        if (meta?.rmoEnabled !== undefined) return !!meta.rmoEnabled;
      }
      let planFeatures = {};
      if (plan?.features) {
        try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
      }
      return !!planFeatures?.rmoEnabled;
    })();
    const pfSettingsEnabled = (() => {
      let meta = {};
      if (sub.meta) {
        try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
        if (meta?.pfSettingsEnabled !== undefined) return !!meta.pfSettingsEnabled;
      }
      let planFeatures = {};
      if (plan?.features) {
        try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
      }
      return !!planFeatures?.pfSettingsEnabled;
    })();

    console.log('Opening limit modal for client:', client.name);

    staffLimitForm.resetFields();
    staffLimitForm.setFieldsValue({
      staffLimit: staffLimit > 0 ? staffLimit : '',
      maxGeolocationStaff,
      salesEnabled,
      geolocationEnabled,
      expenseEnabled,
      payrollEnabled,
      performanceEnabled,
      aiReportsEnabled,
      aiAssistantEnabled,
      taskManagementEnabled,
      salaryRegisterEnabled,
      monthlySummaryEnabled,
      perDaySalaryEnabled,
      comparisonEnabled,
      otImpactEnabled,
      latePenaltyEnabled,
      esiAsTaEnabled,
      weeklyOffDeductionEnabled,
      rmoEnabled,
      pfSettingsEnabled,
      attendanceLocationEnabled: sub.attendanceLocationEnabled !== null ? sub.attendanceLocationEnabled : (plan.attendanceLocationEnabled || false),
      rosterEnabled: sub.rosterEnabled !== null ? sub.rosterEnabled : (plan.rosterEnabled || false),
      recruitmentEnabled: sub.recruitmentEnabled !== null ? sub.recruitmentEnabled : (plan.recruitmentEnabled || false),
      communityEnabled: sub.communityEnabled !== null ? sub.communityEnabled : (plan.communityEnabled || false)
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
        expenseEnabled: !!values.expenseEnabled,
        payrollEnabled: !!values.payrollEnabled,
        performanceEnabled: !!values.performanceEnabled,
        aiReportsEnabled: !!values.aiReportsEnabled,
        aiAssistantEnabled: !!values.aiAssistantEnabled,
        taskManagementEnabled: !!values.taskManagementEnabled,
        rosterEnabled: !!values.rosterEnabled,
        recruitmentEnabled: !!values.recruitmentEnabled,
        communityEnabled: !!values.communityEnabled,
        salaryRegisterEnabled: !!values.salaryRegisterEnabled,
        monthlySummaryEnabled: !!values.monthlySummaryEnabled,
        perDaySalaryEnabled: !!values.perDaySalaryEnabled,
        comparisonEnabled: !!values.comparisonEnabled,
        otImpactEnabled: !!values.otImpactEnabled,
        latePenaltyEnabled: !!values.latePenaltyEnabled,
        esiAsTaEnabled: !!values.esiAsTaEnabled,
        weeklyOffDeductionEnabled: !!values.weeklyOffDeductionEnabled,
        rmoEnabled: !!values.rmoEnabled,
        pfSettingsEnabled: !!values.pfSettingsEnabled,
        attendanceLocationEnabled: !!values.attendanceLocationEnabled,
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

  useEffect(() => {
    if (!isSuperadmin && !userPermissions.clients) {
      message.error('You do not have permission to access Clients Management');
      navigate('/superadmin/dashboard');
      return;
    }
    load();
  }, []);

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
      expenseEnabled: sub.expenseEnabled !== null ? !!sub.expenseEnabled : (!!resolvedPlan.expenseEnabled || false),
      payrollEnabled: sub.payrollEnabled !== null ? !!sub.payrollEnabled : (!!resolvedPlan.payrollEnabled || false),
      performanceEnabled: sub.performanceEnabled !== null ? !!sub.performanceEnabled : (!!resolvedPlan.performanceEnabled || false),
      aiReportsEnabled: sub.aiReportsEnabled !== null ? !!sub.aiReportsEnabled : (!!resolvedPlan.aiReportsEnabled || false),
      aiAssistantEnabled: sub.aiAssistantEnabled !== null ? !!sub.aiAssistantEnabled : (!!resolvedPlan.aiAssistantEnabled || false),
      taskManagementEnabled: sub.taskManagementEnabled !== null ? !!sub.taskManagementEnabled : (!!resolvedPlan.taskManagementEnabled || false),
      rosterEnabled: sub.rosterEnabled !== null ? !!sub.rosterEnabled : (!!resolvedPlan.rosterEnabled || false),
      recruitmentEnabled: sub.recruitmentEnabled !== null ? !!sub.recruitmentEnabled : (!!resolvedPlan.recruitmentEnabled || false),
      communityEnabled: sub.communityEnabled !== null ? !!sub.communityEnabled : (!!resolvedPlan.communityEnabled || false),
      salaryRegisterEnabled: sub.salaryRegisterEnabled !== null && sub.salaryRegisterEnabled !== undefined ? !!sub.salaryRegisterEnabled : (resolvedPlan.salaryRegisterEnabled !== undefined ? !!resolvedPlan.salaryRegisterEnabled : true),
      monthlySummaryEnabled: sub.monthlySummaryEnabled !== null && sub.monthlySummaryEnabled !== undefined ? !!sub.monthlySummaryEnabled : (resolvedPlan.monthlySummaryEnabled !== undefined ? !!resolvedPlan.monthlySummaryEnabled : true),
      perDaySalaryEnabled: sub.perDaySalaryEnabled !== null && sub.perDaySalaryEnabled !== undefined ? !!sub.perDaySalaryEnabled : (resolvedPlan.perDaySalaryEnabled !== undefined ? !!resolvedPlan.perDaySalaryEnabled : true),
      comparisonEnabled: sub.comparisonEnabled !== null && sub.comparisonEnabled !== undefined ? !!sub.comparisonEnabled : (resolvedPlan.comparisonEnabled !== undefined ? !!resolvedPlan.comparisonEnabled : true),
      otImpactEnabled: sub.otImpactEnabled !== null && sub.otImpactEnabled !== undefined ? !!sub.otImpactEnabled : (resolvedPlan.otImpactEnabled !== undefined ? !!resolvedPlan.otImpactEnabled : true),
      latePenaltyEnabled: sub.latePenaltyEnabled !== null && sub.latePenaltyEnabled !== undefined ? !!sub.latePenaltyEnabled : (resolvedPlan.latePenaltyEnabled !== undefined ? !!resolvedPlan.latePenaltyEnabled : true),
      attendanceLocationEnabled: sub.attendanceLocationEnabled !== null && sub.attendanceLocationEnabled !== undefined ? !!sub.attendanceLocationEnabled : (resolvedPlan.attendanceLocationEnabled !== undefined ? !!resolvedPlan.attendanceLocationEnabled : false),
      esiAsTaEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.esiAsTaEnabled !== undefined) return !!meta.esiAsTaEnabled;
        }
        let planFeatures = {};
        if (resolvedPlan?.features) {
          try { planFeatures = typeof resolvedPlan.features === 'string' ? JSON.parse(resolvedPlan.features) : resolvedPlan.features; } catch(e) {}
        }
        return !!planFeatures?.esiAsTaEnabled;
      })(),
      weeklyOffDeductionEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.weeklyOffDeductionEnabled !== undefined) return !!meta.weeklyOffDeductionEnabled;
        }
        let planFeatures = {};
        if (resolvedPlan?.features) {
          try { planFeatures = typeof resolvedPlan.features === 'string' ? JSON.parse(resolvedPlan.features) : resolvedPlan.features; } catch(e) {}
        }
        return !!planFeatures?.weeklyOffDeductionEnabled;
      })(),
      rmoEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.rmoEnabled !== undefined) return !!meta.rmoEnabled;
        }
        let planFeatures = {};
        if (resolvedPlan?.features) {
          try { planFeatures = typeof resolvedPlan.features === 'string' ? JSON.parse(resolvedPlan.features) : resolvedPlan.features; } catch(e) {}
        }
        return !!planFeatures?.rmoEnabled;
      })(),
      pfSettingsEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.pfSettingsEnabled !== undefined) return !!meta.pfSettingsEnabled;
        }
        let planFeatures = {};
        if (resolvedPlan?.features) {
          try { planFeatures = typeof resolvedPlan.features === 'string' ? JSON.parse(resolvedPlan.features) : resolvedPlan.features; } catch(e) {}
        }
        return !!planFeatures?.pfSettingsEnabled;
      })(),
    });
    setAssignModalTitle('Assign/Renew Subscription');
    setIsUpgrade(false);
    setAssignOpen(true);
  };

  const openUpgrade = async (rec) => {
    setEditing(rec);
    await loadPlans();
    assignForm.resetFields();

    const sub = rec.currentSubscription || {};
    const plan = rec.plan || {};

    // Calculate next start date (1 second after current plan ends)
    const currentEndAt = sub.endAt ? dayjs(sub.endAt) : dayjs();
    const nextStartAt = currentEndAt.add(1, 'second');

    const currentPlanId = sub.planId || plan.id;

    assignForm.setFieldsValue({
      planId: currentPlanId,
      startAt: nextStartAt,
      staffLimit: plan.staffLimit || '',
      maxGeolocationStaff: plan.maxGeolocationStaff || 0,
      salesEnabled: !!plan.salesEnabled,
      geolocationEnabled: !!plan.geolocationEnabled,
      expenseEnabled: !!plan.expenseEnabled,
      payrollEnabled: !!plan.payrollEnabled,
      performanceEnabled: !!plan.performanceEnabled,
      aiReportsEnabled: !!plan.aiReportsEnabled,
      aiAssistantEnabled: !!plan.aiAssistantEnabled,
      taskManagementEnabled: !!plan.taskManagementEnabled,
      rosterEnabled: !!plan.rosterEnabled,
      recruitmentEnabled: !!plan.recruitmentEnabled,
      communityEnabled: !!plan.communityEnabled,
      salaryRegisterEnabled: plan.salaryRegisterEnabled !== undefined ? !!plan.salaryRegisterEnabled : true,
      monthlySummaryEnabled: plan.monthlySummaryEnabled !== undefined ? !!plan.monthlySummaryEnabled : true,
      perDaySalaryEnabled: plan.perDaySalaryEnabled !== undefined ? !!plan.perDaySalaryEnabled : true,
      comparisonEnabled: plan.comparisonEnabled !== undefined ? !!plan.comparisonEnabled : true,
      otImpactEnabled: plan.otImpactEnabled !== undefined ? !!plan.otImpactEnabled : true,
      latePenaltyEnabled: plan.latePenaltyEnabled !== undefined ? !!plan.latePenaltyEnabled : true,
      attendanceLocationEnabled: sub.attendanceLocationEnabled !== null && sub.attendanceLocationEnabled !== undefined ? !!sub.attendanceLocationEnabled : (plan.attendanceLocationEnabled !== undefined ? !!plan.attendanceLocationEnabled : false),
      esiAsTaEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.esiAsTaEnabled !== undefined) return !!meta.esiAsTaEnabled;
        }
        let planFeatures = {};
        if (plan?.features) {
          try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
        }
        return !!planFeatures?.esiAsTaEnabled;
      })(),
      weeklyOffDeductionEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.weeklyOffDeductionEnabled !== undefined) return !!meta.weeklyOffDeductionEnabled;
        }
        let planFeatures = {};
        if (plan?.features) {
          try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
        }
        return !!planFeatures?.weeklyOffDeductionEnabled;
      })(),
      rmoEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.rmoEnabled !== undefined) return !!meta.rmoEnabled;
        }
        let planFeatures = {};
        if (plan?.features) {
          try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
        }
        return !!planFeatures?.rmoEnabled;
      })(),
      pfSettingsEnabled: (() => {
        let meta = {};
        if (sub.meta) {
          try { meta = typeof sub.meta === 'string' ? JSON.parse(sub.meta) : sub.meta; } catch(e) {}
          if (meta?.pfSettingsEnabled !== undefined) return !!meta.pfSettingsEnabled;
        }
        let planFeatures = {};
        if (plan?.features) {
          try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
        }
        return !!planFeatures?.pfSettingsEnabled;
      })(),
    });
    setAssignModalTitle('Upgrade Plan (Queued)');
    setIsUpgrade(true);
    setAssignOpen(true);
  };

  const handlePlanChange = (planId) => {
    const plan = plans.find(p => p.id === planId);
    setSelectedPlan(plan);
    // If no active subscription, set defaults from plan
    if (plan && (!editing?.currentSubscription || editing?.currentSubscription.status !== 'ACTIVE')) {
      let planFeatures = {};
      if (plan.features) {
        try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch(e) {}
      }
      assignForm.setFieldsValue({
        staffLimit: plan.staffLimit || '',
        maxGeolocationStaff: plan.maxGeolocationStaff || 0,
        salesEnabled: !!plan.salesEnabled,
        geolocationEnabled: !!plan.geolocationEnabled,
        expenseEnabled: !!plan.expenseEnabled,
        payrollEnabled: !!plan.payrollEnabled,
        performanceEnabled: !!plan.performanceEnabled,
        aiReportsEnabled: !!plan.aiReportsEnabled,
        aiAssistantEnabled: !!plan.aiAssistantEnabled,
        taskManagementEnabled: !!plan.taskManagementEnabled,
        rosterEnabled: !!plan.rosterEnabled,
        recruitmentEnabled: !!plan.recruitmentEnabled,
        communityEnabled: !!plan.communityEnabled,
        salaryRegisterEnabled: plan.salaryRegisterEnabled !== undefined ? !!plan.salaryRegisterEnabled : true,
        monthlySummaryEnabled: plan.monthlySummaryEnabled !== undefined ? !!plan.monthlySummaryEnabled : true,
        perDaySalaryEnabled: plan.perDaySalaryEnabled !== undefined ? !!plan.perDaySalaryEnabled : true,
        comparisonEnabled: plan.comparisonEnabled !== undefined ? !!plan.comparisonEnabled : true,
        otImpactEnabled: plan.otImpactEnabled !== undefined ? !!plan.otImpactEnabled : true,
        latePenaltyEnabled: plan.latePenaltyEnabled !== undefined ? !!plan.latePenaltyEnabled : true,
        attendanceLocationEnabled: plan.attendanceLocationEnabled !== undefined ? !!plan.attendanceLocationEnabled : false,
        esiAsTaEnabled: !!planFeatures.esiAsTaEnabled,
        weeklyOffDeductionEnabled: !!planFeatures.weeklyOffDeductionEnabled,
        rmoEnabled: !!planFeatures.rmoEnabled,
        pfSettingsEnabled: !!planFeatures.pfSettingsEnabled,
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
        payrollEnabled: !!values.payrollEnabled,
        performanceEnabled: !!values.performanceEnabled,
        aiReportsEnabled: !!values.aiReportsEnabled,
        aiAssistantEnabled: !!values.aiAssistantEnabled,
        taskManagementEnabled: !!values.taskManagementEnabled,
        rosterEnabled: !!values.rosterEnabled,
        recruitmentEnabled: !!values.recruitmentEnabled,
        communityEnabled: !!values.communityEnabled,
        salaryRegisterEnabled: !!values.salaryRegisterEnabled,
        monthlySummaryEnabled: !!values.monthlySummaryEnabled,
        perDaySalaryEnabled: !!values.perDaySalaryEnabled,
        comparisonEnabled: !!values.comparisonEnabled,
        otImpactEnabled: !!values.otImpactEnabled,
        latePenaltyEnabled: !!values.latePenaltyEnabled,
        esiAsTaEnabled: !!values.esiAsTaEnabled,
        weeklyOffDeductionEnabled: !!values.weeklyOffDeductionEnabled,
        rmoEnabled: !!values.rmoEnabled,
        pfSettingsEnabled: !!values.pfSettingsEnabled,
        attendanceLocationEnabled: !!values.attendanceLocationEnabled,
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
        const orgs = encodeURIComponent(JSON.stringify(res.data.organizations || []));
        const canCreateOrg = res.data.canCreateOrg ? 'true' : 'false';

        // Open in a new tab via the /impersonate route
        // The ImpersonateRedirect component will store in sessionStorage (tab-specific)
        window.open(`/impersonate?token=${newToken}&user=${newUser}&orgs=${orgs}&canCreateOrg=${canCreateOrg}`, '_blank');
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
        const staffCount = rec.staffCount || 0;
        const staffLimit = rec.staffLimit || 'Unlimited';
        const isOverLimit = staffLimit !== 'Unlimited' && staffCount > staffLimit;

        const geoStaffCount = rec.geoStaffCount || 0;
        const geoStaffLimit = rec.maxGeolocationStaff || 0;
        const isOverGeoLimit = geoStaffLimit > 0 && geoStaffCount > geoStaffLimit;

        return (
          <Space direction="vertical" size="small">
            <Space size="small">
              <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(rec)}>Edit</Button>
              <Button size="small" icon={<EyeOutlined />} onClick={() => openPlanDetails(rec)}>View Plan</Button>
              <Button size="small" type="primary" icon={<SafetyCertificateOutlined />} onClick={() => openAssign(rec)}>Assign/Renew</Button>
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                style={{ backgroundColor: '#722ed1', color: 'white', borderColor: '#722ed1' }}
                onClick={() => openUpgrade(rec)}
              >
                Upgrade
              </Button>
              <Button
                size="small"
                danger={rec.status !== 'SUSPENDED'}
                icon={rec.status === 'SUSPENDED' ? <CheckCircleOutlined /> : <PoweroffOutlined />}
                style={rec.status === 'SUSPENDED' ? { backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' } : {}}
                onClick={() => handleToggleStatus(rec)}
              >
                {rec.status === 'SUSPENDED' ? 'Activate' : 'Deactivate'}
              </Button>
            </Space>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: '#666' }}>
              <div>
                <Space direction="vertical" size={0}>
                  <Space>
                    <span>Staff: </span>
                    <Tag
                      color={isOverLimit ? 'red' : staffLimit !== 'Unlimited' && staffCount >= staffLimit * 0.8 ? 'orange' : 'green'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openStaffLimitModal(rec)}
                    >
                      {staffCount}/{staffLimit}
                    </Tag>
                    {isOverLimit && <span style={{ color: 'red' }}>⚠️ Over limit</span>}
                  </Space>
                  {rec.staffBreakdown && rec.staffBreakdown.filter(b => !b.isParent && b.staffCount > 0).map(b => (
                    <div key={b.orgId} style={{ fontSize: '11px', fontStyle: 'italic', color: '#8c8c8c' }}>
                      {b.staffCount} created by child company {b.name}
                    </div>
                  ))}
                </Space>
              </div>

              {(rec.currentSubscription?.geolocationEnabled || rec.plan?.geolocationEnabled) && (
                <div>
                  <Space direction="vertical" size={0}>
                    <Space>
                      <span>Geo Staff: </span>
                      <Tag
                        color={isOverGeoLimit ? 'red' : geoStaffLimit > 0 && geoStaffCount >= geoStaffLimit * 0.8 ? 'orange' : 'green'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openGeoStaffLimitModal(rec)}
                      >
                        {geoStaffCount}/{geoStaffLimit || '∞'}
                      </Tag>
                      {isOverGeoLimit && <span style={{ color: 'red' }}>⚠️ Over limit</span>}
                    </Space>
                    {rec.staffBreakdown && rec.staffBreakdown.filter(b => !b.isParent && b.geoStaffCount > 0).map(b => (
                      <div key={`geo-${b.orgId}`} style={{ fontSize: '11px', fontStyle: 'italic', color: '#8c8c8c' }}>
                        {b.geoStaffCount} geo staff from child company {b.name}
                      </div>
                    ))}
                  </Space>
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

        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
            <Space>
              <Select
                value={statusFilter}
                onChange={value => setStatusFilter(value)}
                style={{ width: 150 }}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'DISABLED', label: 'Disabled' },
                  { value: 'SUSPENDED', label: 'Suspended' }
                ]}
              />
              <Input.Search
                placeholder="Search by name or phone"
                allowClear
                onSearch={v => setSearchText(v)}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>New Client</Button>
            </Space>
          </div>
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows.filter(r => {
              const matchesSearch = (r.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
                                    (r.phone || '').includes(searchText);
              const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
              return matchesSearch && matchesStatus;
            })}
            pagination={{
              pageSize: 100,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} clients`
            }}
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
        title={assignModalTitle}
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={submitAssign}
        okText="Assign"
        width={800}
        destroyOnClose={true}
      >
        <Form layout="vertical" form={assignForm}>
          <Form.Item label="Plan" name="planId" rules={[{ required: true }]}>
            <Select
              placeholder="Select plan"
              options={plans.map(p => ({ value: p.id, label: `${p.name} (${p.periodDays}d)` }))}
              onChange={handlePlanChange}
              disabled={!isUpgrade && editing?.currentSubscription && editing?.currentSubscription.status === 'ACTIVE'}
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
              <Row gutter={[16, 0]}>
                <Col span={8}>
                  <Form.Item name="salesEnabled" valuePropName="checked">
                    <Checkbox>Enable Sales Module</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="geolocationEnabled" valuePropName="checked">
                    <Checkbox>Enable Geolocation</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="expenseEnabled" valuePropName="checked">
                    <Checkbox>Enable Expense Module</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="payrollEnabled" valuePropName="checked">
                    <Checkbox>Enable Payroll Module</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="performanceEnabled" valuePropName="checked">
                    <Checkbox>Enable Performance Module</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="aiReportsEnabled" valuePropName="checked">
                    <Checkbox>Enable AI Reports</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="aiAssistantEnabled" valuePropName="checked">
                    <Checkbox>Enable AI Assistant</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="taskManagementEnabled" valuePropName="checked">
                    <Checkbox>Enable Task Management</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="rosterEnabled" valuePropName="checked">
                    <Checkbox>Enable Roster Module</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="recruitmentEnabled" valuePropName="checked">
                    <Checkbox>Enable Recruitment Module</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="communityEnabled" valuePropName="checked">
                    <Checkbox>Enable Community Module</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="esiAsTaEnabled" valuePropName="checked">
                    <Checkbox>Enable ESI as TA Mapping</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="weeklyOffDeductionEnabled" valuePropName="checked">
                    <Checkbox>Enable Weekly Off Deduction Rule</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="rmoEnabled" valuePropName="checked">
                    <Checkbox>Enable RMO Configuration</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="pfSettingsEnabled" valuePropName="checked">
                    <Checkbox>Enable Provident Fund Settings</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="attendanceLocationEnabled" valuePropName="checked">
                    <Checkbox>Enable Attendance Location Details</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={24} style={{ marginTop: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: '#1890ff', borderBottom: '1px solid #f0f0f0', paddingBottom: 4, marginBottom: 12 }}>
                    Report Visibilities
                  </div>
                </Col>
                <Col span={8}>
                  <Form.Item name="salaryRegisterEnabled" valuePropName="checked">
                    <Checkbox>Salary Register (Excel)</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="monthlySummaryEnabled" valuePropName="checked">
                    <Checkbox>Monthly Summary (Excel)</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="perDaySalaryEnabled" valuePropName="checked">
                    <Checkbox>Per Day Average (with OT)</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="comparisonEnabled" valuePropName="checked">
                    <Checkbox>MoM Comparison</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="otImpactEnabled" valuePropName="checked">
                    <Checkbox>OT Impact Analysis</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="latePenaltyEnabled" valuePropName="checked">
                    <Checkbox>Late Penalty Analysis</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
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
        width={700}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ marginBottom: 4, color: '#6b7280', fontSize: 12 }}>Client Name</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{selectedClientPlan.clientName || 'N/A'}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedClientPlan.plans && selectedClientPlan.plans.length > 0 ? (
              selectedClientPlan.plans.map((p, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: p.status === 'active' ? '#f0f9ff' : '#ffffff',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Plan Name</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>{p.planName}</div>
                    </div>
                    <Tag
                      style={{ borderRadius: '6px', px: '8px' }}
                      color={p.status === 'active' ? 'success' : p.status === 'future' ? 'processing' : 'error'}
                    >
                      {p.status.toUpperCase()}
                    </Tag>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Start Date</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.startDate ? dayjs(p.startDate).format('DD MMM YYYY') : 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Expiry Date</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.endDate ? dayjs(p.endDate).format('DD MMM YYYY') : 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Staff Limit</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.staffLimit || 'Unlimited'}</div>
                    </div>
                  </div>

                  {p.features && p.features.length > 0 && (
                    <div style={{ marginTop: 8, pt: 8, borderTop: '1px dashed #e5e7eb' }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Included Features</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {p.features.map((f, fi) => (
                          <Tag key={fi} style={{ margin: 0, fontSize: '10px', backgroundColor: '#f3f4f6', border: 'none' }}>{f}</Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                No active or queued plans found.
              </div>
            )}
          </div>
        </div>
      </Modal>
      <Modal
        title="Update Subscription Limits & Features"
        open={staffLimitOpen}
        onCancel={() => setStaffLimitOpen(false)}
        onOk={submitStaffLimit}
        okText="Update"
        width={800}
      >
        <Form form={staffLimitForm} layout="vertical">
          <Form.Item
            label="Staff Limit"
            name="staffLimit"
            rules={[{ required: true, message: 'Please enter a staff limit' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Enter staff limit" />
          </Form.Item>

          <Row gutter={[16, 0]}>
            <Col span={8}>
              <Form.Item name="salesEnabled" valuePropName="checked">
                <Checkbox>Enable Sales Module</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="geolocationEnabled" valuePropName="checked">
                <Checkbox>Enable Geolocation</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expenseEnabled" valuePropName="checked">
                <Checkbox>Enable Expense Module</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="payrollEnabled" valuePropName="checked">
                <Checkbox>Enable Payroll Module</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="performanceEnabled" valuePropName="checked">
                <Checkbox>Enable Performance Module</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="aiReportsEnabled" valuePropName="checked">
                <Checkbox>Enable AI Reports</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="aiAssistantEnabled" valuePropName="checked">
                <Checkbox>Enable AI Assistant</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taskManagementEnabled" valuePropName="checked">
                <Checkbox>Enable Task Management</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="rosterEnabled" valuePropName="checked">
                <Checkbox>Enable Roster Module</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="recruitmentEnabled" valuePropName="checked">
                <Checkbox>Enable Recruitment Module</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="communityEnabled" valuePropName="checked">
                <Checkbox>Enable Community Module</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="esiAsTaEnabled" valuePropName="checked">
                <Checkbox>Enable ESI as TA Mapping</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weeklyOffDeductionEnabled" valuePropName="checked">
                <Checkbox>Enable Weekly Off Deduction Rule</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="rmoEnabled" valuePropName="checked">
                <Checkbox>Enable RMO Configuration</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pfSettingsEnabled" valuePropName="checked">
                <Checkbox>Enable Provident Fund Settings</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="attendanceLocationEnabled" valuePropName="checked">
                <Checkbox>Enable Attendance Location Details</Checkbox>
              </Form.Item>
            </Col>
            <Col span={24} style={{ marginTop: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 600, color: '#1890ff', borderBottom: '1px solid #f0f0f0', paddingBottom: 4, marginBottom: 12 }}>
                Report Visibilities
              </div>
            </Col>
            <Col span={8}>
              <Form.Item name="salaryRegisterEnabled" valuePropName="checked">
                <Checkbox>Salary Register (Excel)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="monthlySummaryEnabled" valuePropName="checked">
                <Checkbox>Monthly Summary (Excel)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="perDaySalaryEnabled" valuePropName="checked">
                <Checkbox>Per Day Average (with OT)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="comparisonEnabled" valuePropName="checked">
                <Checkbox>MoM Comparison</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="otImpactEnabled" valuePropName="checked">
                <Checkbox>OT Impact Analysis</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="latePenaltyEnabled" valuePropName="checked">
                <Checkbox>Late Penalty Analysis</Checkbox>
              </Form.Item>
            </Col>
          </Row>

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
