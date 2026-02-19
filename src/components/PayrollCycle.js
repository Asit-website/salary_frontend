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
import { jsPDF } from 'jspdf';
import moment from 'moment';
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
      if (res?.data?.success) { 
        setCycle(res.data.cycle); 
        message.success('Marked as paid');
        // Refresh payroll lines to show paid status
        const payrollRes = await api.get(`/admin/payroll?monthKey=${cycle.monthKey}`);
        if (payrollRes?.data?.success) {
          setLines(payrollRes.data.lines || []);
        }
      }
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
        const payrollRes = await api.get(`/admin/payroll?monthKey=${cycle.monthKey}`);
        if (payrollRes?.data?.success) {
          setCycle(payrollRes.data.cycle);
          setLines(payrollRes.data.lines || []);
        }
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
    { 
      title: 'Earnings', 
      dataIndex: ['totals', 'totalEarnings'], 
      key: 'earnings', 
      render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` 
    },
    { title: 'Deductions', dataIndex: ['totals', 'totalDeductions'], key: 'deductions', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { title: 'Net', dataIndex: ['totals', 'netSalary'], key: 'net', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    // { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'INCLUDED' ? 'blue' : 'default'}>{s}</Tag> },
    {
      title: 'Actions', key: 'actions', render: (_, r) => (
        <Space>
          {/* <Button size="small" onClick={() => onOpenEdit(r)} disabled={cycle?.status === 'PAID'}>Edit</Button> */}
          <Button size="small" onClick={() => setViewRow(r)}>View</Button>
          <Button size="small" type="primary" onClick={() => generatePayslipPDF(r)}>Generate Payslip</Button>
        </Space>
      )
    },
  ];

  const generatePayslipPDF = async (payrollLine) => {
    try {
      console.log('Starting payslip generation...');
      
      if (!cycle || !payrollLine) {
        console.error('Missing cycle or payroll data');
        message.error('Payroll data not available');
        return;
      }

      // Get staff details
      const staff = staffMap[payrollLine.userId || payrollLine.user_id];
      if (!staff) {
        console.error('Staff not found for ID:', payrollLine.userId);
        message.error('Staff details not found');
        return;
      }

      // Get organization brand info from same endpoint as sidebar
      let brandInfo = { displayName: 'ThinkTech Solutions' };
      try {
        const brandResponse = await api.get('/admin/settings/brand');
        if (brandResponse.data?.brand?.displayName) {
          brandInfo.displayName = brandResponse.data.brand.displayName;
        }
      } catch (error) {
        console.log('Using default brand info');
      }

      console.log('Generating payslip for:', staff);

      // Attendance data: try payroll line summary -> API -> safe defaults
      let attendanceData = {
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        weeklyOffDays: 0,
        holidays: 0,
        halfDays: 0
      };

      // 1) Prefer summary embedded in payroll line (fast, consistent with payroll compute)
      const sum = payrollLine.attendanceSummary || {};
      if (sum && (sum.present != null || sum.absent != null || sum.paidLeave != null)) {
        attendanceData.presentDays = Number(sum.present || 0);
        attendanceData.absentDays = Number(sum.absent || 0);
        attendanceData.paidLeaveDays = Number(sum.paidLeave || 0);
        attendanceData.unpaidLeaveDays = Number(sum.unpaidLeave || 0);
        attendanceData.weeklyOffDays = Number(sum.weeklyOff || 0);
        attendanceData.holidays = Number(sum.holidays || 0);
        attendanceData.halfDays = Number(sum.half || 0);
        attendanceData.workingDays = attendanceData.presentDays + attendanceData.absentDays + attendanceData.paidLeaveDays + attendanceData.unpaidLeaveDays + attendanceData.weeklyOffDays + attendanceData.holidays + attendanceData.halfDays;
      }

      // 2) If still zero, try API for the month
      if (attendanceData.workingDays === 0) {
        try {
          const attendanceRes = await api.get(`/admin/staff/${payrollLine.userId}/attendance`, { params: { month: cycle.monthKey } });
          const att = attendanceRes?.data?.data || attendanceRes?.data?.attendance || [];
          if (Array.isArray(att)) {
            for (const record of att) {
              const status = String(record.status || record.dayStatus || '').toLowerCase();
              switch (status) {
                case 'p':
                case 'present':
                  attendanceData.presentDays++; break;
                case 'a':
                case 'absent':
                  attendanceData.absentDays++; break;
                case 'hd':
                case 'half':
                case 'half_day':
                  attendanceData.halfDays++; break;
                case 'l':
                case 'leave':
                case 'paid_leave':
                  attendanceData.paidLeaveDays++; break;
                case 'ul':
                case 'unpaid_leave':
                  attendanceData.unpaidLeaveDays++; break;
                case 'wo':
                case 'weekly_off':
                  attendanceData.weeklyOffDays++; break;
                case 'h':
                case 'holiday':
                  attendanceData.holidays++; break;
              }
            }
            attendanceData.workingDays = attendanceData.presentDays + attendanceData.absentDays + attendanceData.paidLeaveDays + attendanceData.unpaidLeaveDays + attendanceData.weeklyOffDays + attendanceData.holidays + attendanceData.halfDays;
          }
        } catch (e) {
          // ignore; will fallback to defaults below
        }
      }

      // 3) Final fallback defaults if still zero (ensures PDF never shows blank values)
      if (attendanceData.workingDays === 0) {
        attendanceData = {
          workingDays: 26,
          presentDays: 26,
          absentDays: 0,
          paidLeaveDays: 0,
          unpaidLeaveDays: 0,
          weeklyOffDays: 0,
          holidays: 0,
          halfDays: 0
        };
      }

      // Create PDF with professional format
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;
      const lineHeight = 8;
      const tableStartX = margin;
      const tableWidth = pageWidth - 2 * margin;
      const centerX = pageWidth / 2;

      // Helper function to add text
      const addText = (text, fontSize = 11, isBold = false, x = margin) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.text(text, x, yPosition);
        yPosition += lineHeight;
      };

      // Helper: ensure space, add page if needed
      const ensureSpace = (needed = 20) => {
        if (yPosition + needed > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Currency formatter - Match screenshot format exactly
      const formatAmount = (n) => {
        const amount = Number(n || 0).toLocaleString('en-IN');
        return amount; // Just return the number, no prefix
      };

      // Helper function to draw table row (two fixed columns: label | value)
      const drawTableRow = (leftText, rightText, isHeader = false) => {
        if (isHeader) {
          ensureSpace(lineHeight + 8);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(tableStartX, yPosition - 2, tableWidth, lineHeight + 4, 'F');
        } else {
          ensureSpace(lineHeight + 6);
        }
        
        const curY = yPosition; // keep same baseline for both columns
        // font style
        pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
        pdf.setFontSize(isHeader ? 11 : 10);
        // paddings and fixed columns for consistent alignment
        const padX = 8;
        const leftColX = tableStartX + padX;              // label column start
        const labelWidth = 80;                            // increased label column width (mm)
        const valueRightX = tableStartX + tableWidth - padX; // value column right edge
        const valueStartX = leftColX + labelWidth + 4;    // small gap after label

        // left label with text wrapping if needed
        const label = String(leftText ?? '');
        const maxLabelWidth = labelWidth - 8; // leave more padding
        const lines = pdf.splitTextToSize(label, maxLabelWidth);
        
        // Calculate total height needed
        const totalHeight = lineHeight * lines.length;
        
        // Draw each line of the label
        lines.forEach((line, index) => {
          pdf.text(line, leftColX, curY + (index * lineHeight));
        });
        
        // value column right-aligned - center it vertically with the label
        const value = String(rightText ?? '');
        const valueY = curY + ((totalHeight - lineHeight) / 2);
        pdf.text(value, valueRightX, valueY, { align: 'right' });
        
        // advance based on number of lines in label
        yPosition += totalHeight + (isHeader ? 4 : 2);
      };

      // Header Section - Dynamic Brand Name like Sidebar
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(brandInfo.displayName || 'ThinkTech Solutions', centerX, yPosition, { align: 'center' });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Payslip for the month of ' + moment(cycle.monthKey).format('MMMM YYYY'), centerX, yPosition, { align: 'center' });
      yPosition += 15;

      // Employee Details - Simple Table Format with Department
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Left column - Employee info
      pdf.text('Employee Name: ' + staff, tableStartX, yPosition);
      yPosition += 6;
      pdf.text('Employee ID: ' + (payrollLine.userId || payrollLine.user_id), tableStartX, yPosition);
      yPosition += 6;
      pdf.text('Department: ' + (staff.department || 'General'), tableStartX, yPosition);
      yPosition += 6;
      pdf.text('Designation: ' + (staff.designation || 'Employee'), tableStartX, yPosition);
      yPosition += 6;
      
      // Right column - Payment info (top-aligned with Employee Name)
      const rightColX = centerX + 20;
      const rightColStartY = yPosition - 24; // Start at same level as Employee Name
      pdf.text('Pay Period: ' + cycle.monthKey, rightColX, rightColStartY);
      pdf.text('Status: ' + (payrollLine.paidAt ? 'PAID' : 'DUE'), rightColX, rightColStartY + 6);
      pdf.text('Generated: ' + moment().format('DD-MM-YYYY'), rightColX, rightColStartY + 12);
      pdf.text('Working Days: ' + attendanceData.workingDays, rightColX, rightColStartY + 18);
      
      yPosition += 15;

      // Draw line separator
      pdf.setDrawColor(150, 150, 150);
      pdf.line(tableStartX, yPosition, tableStartX + tableWidth, yPosition);
      yPosition += 10;

      // Side-by-side table: Earnings (incl. incentives) vs Deductions
      // Build rows
      const earningsObj = payrollLine.earnings || {};
      const incentivesObj = payrollLine.incentives || {};
      const earningsRows = [
        ...Object.entries(earningsObj).map(([k, v]) => ({ label: k, amount: Number(v || 0) })),
        ...Object.entries(incentivesObj).map(([k, v]) => ({ label: k + ' (Incentive)', amount: Number(v || 0) })),
      ];
      const deductionsObj = payrollLine.deductions || {};
      const deductionRows = Object.entries(deductionsObj).map(([k, v]) => ({ label: k, amount: Number(v || 0) }));

      const leftX = tableStartX;
      const rightX = tableStartX + tableWidth / 2 + 2; // small gap
      const colWidth = tableWidth / 2 - 2;

      // Simple Table Headers - Like Screenshot with Amount columns
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('EARNINGS', leftX + 5, yPosition);
      pdf.text('DEDUCTIONS', rightX + 5, yPosition);
      yPosition += 10;

      // Add Amount column headers
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Description', leftX + 5, yPosition);
      pdf.text('Amount', leftX + colWidth - 25, yPosition);
      pdf.text('Description', rightX + 5, yPosition);
      pdf.text('Amount', rightX + colWidth - 25, yPosition);
      yPosition += 10;

      // Render earnings and deductions rows - Match screenshot format (no borders)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const maxRows = Math.max(earningsRows.length, deductionRows.length, 1);

      for (let i = 0; i < maxRows; i++) {
        const er = earningsRows[i];
        const dr = deductionRows[i];
        
        // Earnings row - Left aligned label, right aligned amount
        if (er) {
          const label = er.label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          pdf.text(label, leftX + 5, yPosition);
          pdf.text(formatAmount(er.amount), leftX + colWidth - 15, yPosition, { align: 'right' });
        }
        
        // Deductions row - Same format as earnings
        if (dr) {
          let label = dr.label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          // Special formatting for loan EMI
          if (dr.label === 'loan_emi') {
            label = 'Loan Emi';
          }
          pdf.text(label, rightX + 5, yPosition);
          pdf.text(formatAmount(dr.amount), rightX + colWidth - 15, yPosition, { align: 'right' });
        }
        
        yPosition += 8;
      }

      // Column totals
      const sumAmounts = (arr) => arr.reduce((acc, r) => acc + (Number(r?.amount || 0) || 0), 0);
      const earningsTotalCalc = sumAmounts(earningsRows);
      const deductionsTotalCalc = sumAmounts(deductionRows);

      // Simple Totals Row - Match screenshot format
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Total', leftX + 5, yPosition);
      pdf.text(formatAmount(earningsTotalCalc), leftX + colWidth - 15, yPosition, { align: 'right' });
      pdf.text('Total', rightX + 5, yPosition);
      pdf.text(formatAmount(deductionsTotalCalc), rightX + colWidth - 15, yPosition, { align: 'right' });
      yPosition += 15;

      // Net Salary - Simple and Clean
      const totals = payrollLine.totals || {};
      const grossFromTotals = Number(totals.grossSalary || 0);
      const totalDeductionsFromTotals = Number(totals.totalDeductions || deductionsTotalCalc || 0);
      const netSalary = grossFromTotals - totalDeductionsFromTotals;
      const finalNetSalary = Math.max(0, netSalary);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Net Salary: ' + formatAmount(finalNetSalary), centerX, yPosition, { align: 'center' });
      yPosition += 15;

      // Draw final line
      pdf.setDrawColor(150, 150, 150);
      pdf.line(tableStartX, yPosition, tableStartX + tableWidth, yPosition);
      yPosition += 10;

      // Add space for signatures
      yPosition += 20;

      // Signature sections like ss1
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Employee Signature
      pdf.text('Employee Signature', tableStartX, yPosition);
      pdf.line(tableStartX, yPosition + 5, tableStartX + 80, yPosition + 5); // Signature line
      yPosition += 15;
      
      // Employer Signature
      pdf.text('Employer Signature', tableStartX + 100, yPosition - 15);
      pdf.line(tableStartX + 100, yPosition - 10, tableStartX + 180, yPosition - 10); // Signature line
      
      yPosition += 10;

      // Simple footer
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Generated on ' + moment().format('DD-MM-YYYY HH:mm:ss'), centerX, yPosition, { align: 'center' });
      yPosition += 8;
      pdf.text('This is a computer generated document', centerX, yPosition, { align: 'center' });

      // Save the PDF
      pdf.save(`Payslip_${staff}_${cycle.monthKey}.pdf`);
      message.success('Payslip generated successfully!');
      
    } catch (error) {
      console.error('Error generating payslip:', error);
      message.error('Failed to generate payslip');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
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