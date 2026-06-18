import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Form, 
  Select, 
  DatePicker, 
  InputNumber, 
  Input, 
  Button, 
  Row, 
  Col, 
  Space, 
  Divider, 
  Typography, 
  Tag, 
  Steps, 
  message, 
  Alert,
  Tooltip,
  Descriptions,
  List
} from 'antd';
import { 
  ArrowLeftOutlined, 
  CalendarOutlined, 
  CalculatorOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  SaveOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

const FnFSettlementProcess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eligibleStaff, setEligibleStaff] = useState([]);
  
  // Step 1 Form values
  const [form1] = Form.useForm();
  
  // Dynamic calculation values
  const [calculationData, setCalculationData] = useState(null);
  
  // Override state values
  const [resignationDateVal, setResignationDateVal] = useState(null);
  const [finalWorkingDateVal, setFinalWorkingDateVal] = useState(null);
  const [settlementDateVal, setSettlementDateVal] = useState(dayjs());
  const [noticeDaysRequiredVal, setNoticeDaysRequiredVal] = useState(0);
  const [noticeDaysServedVal, setNoticeDaysServedVal] = useState(0);

  const [pendingSalaryAmount, setPendingSalaryAmount] = useState(0);
  const [noticeRecoveryAmount, setNoticeRecoveryAmount] = useState(0);
  const [leaveEncashmentDays, setLeaveEncashmentDays] = useState(0);
  const [leaveEncashmentAmount, setLeaveEncashmentAmount] = useState(0);
  const [gratuityAmount, setGratuityAmount] = useState(0);
  
  const [loansDeductionAmount, setLoansDeductionAmount] = useState(0);
  const [advancesDeductionAmount, setAdvancesDeductionAmount] = useState(0);
  const [expenseReimbursementAmount, setExpenseReimbursementAmount] = useState(0);
  
  // Step 3 Custom Adjustments state
  const [otherEarnings, setOtherEarnings] = useState([]);
  const [otherDeductions, setOtherDeductions] = useState([]);
  const [customEarningLabel, setCustomEarningLabel] = useState('');
  const [customEarningAmt, setCustomEarningAmt] = useState(0);
  const [customDeductionLabel, setCustomDeductionLabel] = useState('');
  const [customDeductionAmt, setCustomDeductionAmt] = useState(0);
  const [remarks, setRemarks] = useState('');

  // Final summary stats
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        // 1. Load eligible staff
        const response = await api.get('/admin/payroll/fnf/eligible-staff');
        let staffList = [];
        if (response.data?.success) {
          staffList = response.data.data || [];
          setEligibleStaff(staffList);
        }

        // 2. Check if editing
        if (location.state?.editRecord) {
          const record = location.state.editRecord;
          
          // Ensure the edit staff user is in the dropdown list
          if (record.user && !staffList.some(u => u.id === record.userId)) {
            setEligibleStaff([...staffList, record.user]);
          }

          // Pre-populate Form 1
          form1.setFieldsValue({
            userId: record.userId,
            resignationDate: record.resignationDate ? dayjs(record.resignationDate) : null,
            finalWorkingDate: record.finalWorkingDate ? dayjs(record.finalWorkingDate) : null,
            noticeDaysRequired: record.noticeDaysRequired,
            noticeDaysServed: record.noticeDaysServed
          });

          // Fetch calculation data automatically
          const calcResponse = await api.get(`/admin/payroll/fnf/staff-details/${record.userId}`, {
            params: {
              resignationDate: record.resignationDate,
              finalWorkingDate: record.finalWorkingDate,
              noticeRequired: record.noticeDaysRequired,
              noticeServed: record.noticeDaysServed
            }
          });

          if (calcResponse.data?.success && calcResponse.data.data) {
            setCalculationData(calcResponse.data.data);

            // Populate all override states with saved values
            setPendingSalaryAmount(record.pendingSalaryAmount || 0);
            setNoticeRecoveryAmount(record.noticeRecoveryAmount || 0);
            setLeaveEncashmentDays(record.leaveEncashmentDays || 0);
            setLeaveEncashmentAmount(record.leaveEncashmentAmount || 0);
            setGratuityAmount(record.gratuityAmount || 0);
            setLoansDeductionAmount(record.loansDeductionAmount || 0);
            setAdvancesDeductionAmount(record.advancesDeductionAmount || 0);
            setExpenseReimbursementAmount(record.expenseReimbursementAmount || 0);
            setRemarks(record.remarks || '');

            setResignationDateVal(record.resignationDate);
            setFinalWorkingDateVal(record.finalWorkingDate);
            setNoticeDaysRequiredVal(record.noticeDaysRequired);
            setNoticeDaysServedVal(record.noticeDaysServed);

            if (record.otherEarnings) {
              try {
                const parsed = typeof record.otherEarnings === 'string' ? JSON.parse(record.otherEarnings) : record.otherEarnings;
                setOtherEarnings(Array.isArray(parsed) ? parsed : []);
              } catch (_) {
                setOtherEarnings([]);
              }
            }
            if (record.otherDeductions) {
              try {
                const parsed = typeof record.otherDeductions === 'string' ? JSON.parse(record.otherDeductions) : record.otherDeductions;
                setOtherDeductions(Array.isArray(parsed) ? parsed : []);
              } catch (_) {
                setOtherDeductions([]);
              }
            }

            // Move to Step 2
            setCurrentStep(1);
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
        message.error('Failed to initialize FnF process');
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [location.state, form1]);

  // Recalculate totals whenever any constituent amount or custom adjustment changes
  useEffect(() => {
    const customEarningsTotal = otherEarnings.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const customDeductionsTotal = otherDeductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    
    // Earnings: Pending prorated salary + Leave encashment + Gratuity + Expense Reimbursement + Unpaid previous month salaries + Custom earnings
    const unpaidSalary = calculationData?.reconciliation?.unpaidPayrollSalary || 0;
    const computedEarnings = Number(pendingSalaryAmount || 0) + 
                             Number(leaveEncashmentAmount || 0) + 
                             Number(gratuityAmount || 0) + 
                             Number(expenseReimbursementAmount || 0) + 
                             Number(unpaidSalary) + 
                             customEarningsTotal;

    // Deductions: Notice recovery + Outstanding Loans + Pending Advances + Custom deductions
    const computedDeductions = Number(noticeRecoveryAmount || 0) + 
                               Number(loansDeductionAmount || 0) + 
                               Number(advancesDeductionAmount || 0) + 
                               customDeductionsTotal;

    const computedNet = computedEarnings - computedDeductions;

    setTotalEarnings(Math.round(computedEarnings * 100) / 100);
    setTotalDeductions(Math.round(computedDeductions * 100) / 100);
    setNetAmount(Math.round(computedNet * 100) / 100);
  }, [
    calculationData,
    pendingSalaryAmount,
    leaveEncashmentAmount,
    gratuityAmount,
    expenseReimbursementAmount,
    noticeRecoveryAmount,
    loansDeductionAmount,
    advancesDeductionAmount,
    otherEarnings,
    otherDeductions
  ]);

  const loadEligibleStaff = async () => {
    try {
      const response = await api.get('/admin/payroll/fnf/eligible-staff');
      if (response.data?.success) {
        setEligibleStaff(response.data.data || []);
      }
    } catch (error) {
      message.error('Failed to load eligible staff list');
    }
  };

  const handleFetchCalculations = async () => {
    try {
      const values = await form1.validateFields();
      setLoading(true);

      const userId = values.userId;
      const resignationDate = values.resignationDate ? values.resignationDate.format('YYYY-MM-DD') : '';
      const finalWorkingDate = values.finalWorkingDate ? values.finalWorkingDate.format('YYYY-MM-DD') : '';
      const noticeRequired = values.noticeDaysRequired || 0;
      const noticeServed = values.noticeDaysServed || 0;

      // Save exit parameters in state for later finalize payload
      setResignationDateVal(resignationDate);
      setFinalWorkingDateVal(finalWorkingDate);
      setNoticeDaysRequiredVal(noticeRequired);
      setNoticeDaysServedVal(noticeServed);

      const response = await api.get(`/admin/payroll/fnf/staff-details/${userId}`, {
        params: {
          resignationDate,
          finalWorkingDate,
          noticeRequired,
          noticeServed
        }
      });

      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        setCalculationData(data);
        
        // Initialize editable states from computed values
        setPendingSalaryAmount(data.salary?.pendingSalaryAmount || 0);
        setNoticeRecoveryAmount(data.notice?.recoveryAmount || 0);
        setLeaveEncashmentDays(data.leaves?.remainingDays || 0);
        setLeaveEncashmentAmount(data.leaves?.encashmentAmount || 0);
        setGratuityAmount(data.gratuity?.gratuityAmount || 0);
        setLoansDeductionAmount(data.reconciliation?.outstandingLoan || 0);
        setAdvancesDeductionAmount(data.reconciliation?.outstandingAdvance || 0);
        setExpenseReimbursementAmount(data.reconciliation?.outstandingExpense || 0);

        setCurrentStep(1); // Advance to calculations review step
      }
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || 'Failed to calculate employee details');
    } finally {
      setLoading(false);
    }
  };

  const addCustomEarning = () => {
    if (!customEarningLabel.trim()) {
      message.warning('Please enter a label for custom earning');
      return;
    }
    if (Number(customEarningAmt) <= 0) {
      message.warning('Please enter a valid amount');
      return;
    }
    setOtherEarnings([
      ...otherEarnings,
      { label: customEarningLabel.trim(), amount: Number(customEarningAmt) }
    ]);
    setCustomEarningLabel('');
    setCustomEarningAmt(0);
  };

  const removeCustomEarning = (index) => {
    const updated = [...otherEarnings];
    updated.splice(index, 1);
    setOtherEarnings(updated);
  };

  const addCustomDeduction = () => {
    if (!customDeductionLabel.trim()) {
      message.warning('Please enter a label for custom deduction');
      return;
    }
    if (Number(customDeductionAmt) <= 0) {
      message.warning('Please enter a valid amount');
      return;
    }
    setOtherDeductions([
      ...otherDeductions,
      { label: customDeductionLabel.trim(), amount: Number(customDeductionAmt) }
    ]);
    setCustomDeductionLabel('');
    setCustomDeductionAmt(0);
  };

  const removeCustomDeduction = (index) => {
    const updated = [...otherDeductions];
    updated.splice(index, 1);
    setOtherDeductions(updated);
  };

  const handleFinalizeSettlement = async () => {
    try {
      setLoading(true);
      const payload = {
        id: location.state?.editRecord?.id,
        userId: calculationData.staffInfo.id,
        resignationDate: resignationDateVal,
        finalWorkingDate: finalWorkingDateVal,
        settlementDate: settlementDateVal ? settlementDateVal.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        noticeDaysRequired: Number(noticeDaysRequiredVal),
        noticeDaysServed: Number(noticeDaysServedVal),
        noticeRecoveryAmount: Number(noticeRecoveryAmount),
        leaveEncashmentDays: Number(leaveEncashmentDays),
        leaveEncashmentAmount: Number(leaveEncashmentAmount),
        gratuityAmount: Number(gratuityAmount),
        pendingSalaryAmount: Number(pendingSalaryAmount),
        loansDeductionAmount: Number(loansDeductionAmount),
        advancesDeductionAmount: Number(advancesDeductionAmount),
        expenseReimbursementAmount: Number(expenseReimbursementAmount),
        otherEarnings,
        otherDeductions,
        totalEarnings,
        totalDeductions,
        netAmount,
        remarks
      };

      const response = await api.post('/admin/payroll/fnf/finalize', payload);
      if (response.data?.success) {
        message.success('Full & Final Settlement finalized successfully!');
        navigate('/payroll/fnf');
      }
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || 'Failed to finalize settlement');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form
            form={form1}
            layout="vertical"
            initialValues={{ noticeDaysRequired: 30, noticeDaysServed: 0 }}
            style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}
          >
            <Form.Item
              name="userId"
              label={<span className="modal-field-label">Select Exiting Employee</span>}
              rules={[{ required: true, message: 'Please select an employee' }]}
            >
              <Select
                showSearch
                placeholder="Search by name or staff ID"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ height: '40px' }}
              >
                {eligibleStaff.map(s => (
                  <Option key={s.id} value={s.id}>
                    {s.profile?.name || s.phone} {s.profile?.staffId ? `(ID: ${s.profile.staffId})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="resignationDate"
                  label={<span className="modal-field-label">Resignation Submission Date</span>}
                  rules={[{ required: true, message: 'Select resignation date' }]}
                >
                  <DatePicker style={{ width: '100%', height: '40px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="finalWorkingDate"
                  label={<span className="modal-field-label">Last/Final Working Date (LWD)</span>}
                  rules={[{ required: true, message: 'Select last working date' }]}
                >
                  <DatePicker style={{ width: '100%', height: '40px' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="noticeDaysRequired"
                  label={<span className="modal-field-label">Notice Period Required (Days)</span>}
                  rules={[{ required: true, message: 'Enter required notice days' }]}
                >
                  <InputNumber min={0} max={180} style={{ width: '100%', height: '40px', paddingTop: '4px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="noticeDaysServed"
                  label={<span className="modal-field-label">Notice Period Served (Days)</span>}
                  rules={[{ required: true, message: 'Enter served notice days' }]}
                >
                  <InputNumber min={0} max={180} style={{ width: '100%', height: '40px', paddingTop: '4px' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: '30px' }}>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                onClick={handleFetchCalculations}
                loading={loading}
                block
                shape="round"
                size="large"
              >
                Calculate FnF Details
              </Button>
            </Form.Item>
          </Form>
        );

      case 1:
        return (
          <div>
            {calculationData && (
              <Row gutter={24}>
                <Col span={24}>
                  <Card style={{ marginBottom: '20px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Descriptions title="Employee Profile Information" bordered size="small" column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                      <Descriptions.Item label="Name"><Text strong>{calculationData.staffInfo.name}</Text></Descriptions.Item>
                      <Descriptions.Item label="Staff ID">{calculationData.staffInfo.staffId}</Descriptions.Item>
                      <Descriptions.Item label="Designation">{calculationData.staffInfo.designation}</Descriptions.Item>
                      <Descriptions.Item label="Department">{calculationData.staffInfo.department}</Descriptions.Item>
                      <Descriptions.Item label="Joining Date">
                        {calculationData.staffInfo.dateOfJoining ? new Date(calculationData.staffInfo.dateOfJoining).toLocaleDateString('en-IN') : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Basic Salary">₹{calculationData.staffInfo.basicSalary?.toLocaleString('en-IN')}</Descriptions.Item>
                      <Descriptions.Item label="DA Salary">₹{calculationData.staffInfo.daSalary?.toLocaleString('en-IN')}</Descriptions.Item>
                      <Descriptions.Item label="Gross Salary">₹{calculationData.staffInfo.grossSalary?.toLocaleString('en-IN')}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>

                {/* Earnings Column */}
                <Col xl={12} lg={12} md={24} sm={24} xs={24}>
                  <Title level={4} style={{ marginBottom: '15px', color: '#1e293b', display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '8px', height: '18px', background: '#10b981', borderRadius: '2px', marginRight: '8px', display: 'inline-block' }}></span>
                    Dues & Earnings
                  </Title>

                  {/* 1. Final Month Salary */}
                  <Card 
                    title={<Space><CalendarOutlined style={{ color: '#10b981' }} /><span>Final Month Prorated Salary</span></Space>}
                    bordered={false} 
                    style={{ marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <Text type="secondary">Attendance summary from start of month to LWD:</Text>
                      <div style={{ marginTop: '5px' }}>
                        <Tag color="green">Present: {calculationData.salary?.attendanceSummary?.present} days</Tag>
                        <Tag color="cyan">Half days: {calculationData.salary?.attendanceSummary?.half} days</Tag>
                        <Tag color="blue">Weekly off: {calculationData.salary?.attendanceSummary?.weeklyOff} days</Tag>
                        <Tag color="purple">Holidays: {calculationData.salary?.attendanceSummary?.holidays} days</Tag>
                        <Tag color="red">Absent: {calculationData.salary?.attendanceSummary?.absent} days</Tag>
                      </div>
                      <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
                        Calculated Payable Days: {calculationData.salary?.attendanceSummary?.payableDays} Days
                      </div>
                    </div>
                    <Form.Item label="Salary Amount Due (Override if needed)" style={{ marginBottom: 0 }}>
                      <InputNumber 
                        value={pendingSalaryAmount} 
                        onChange={(val) => setPendingSalaryAmount(val || 0)} 
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                        min={0}
                      />
                    </Form.Item>
                  </Card>

                  {/* 2. Leave Encashment */}
                  <Card 
                    title={<Space><DollarOutlined style={{ color: '#10b981' }} /><span>Leave Encashment Payout</span></Space>}
                    bordered={false} 
                    style={{ marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <Text type="secondary">Eligible accumulated Earned Leaves (EL) remaining: </Text>
                      <Text strong>{calculationData.leaves?.remainingDays} Days</Text>
                    </div>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          label="Encashment Days" 
                          style={{ marginBottom: 0 }}
                          validateStatus={leaveEncashmentDays > Number(calculationData?.leaves?.remainingDays || 0) ? 'error' : ''}
                          help={leaveEncashmentDays > Number(calculationData?.leaves?.remainingDays || 0) ? `max ${Number(calculationData?.leaves?.remainingDays || 0)} allowed to this staff` : null}
                        >
                          <InputNumber 
                            value={leaveEncashmentDays} 
                            onChange={(val) => {
                              const days = Number(val || 0);
                              setLeaveEncashmentDays(days);
                              const initialDays = Number(calculationData?.leaves?.remainingDays || 0);
                              const initialAmt = Number(calculationData?.leaves?.encashmentAmount || 0);
                              const ratePerDay = initialDays > 0 ? (initialAmt / initialDays) : 0;
                              const computedAmt = Math.round(days * ratePerDay * 100) / 100;
                              setLeaveEncashmentAmount(computedAmt);
                            }} 
                            style={{ width: '100%' }}
                            min={0}
                            step={0.5}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Leave Payout Amount (Override)" style={{ marginBottom: 0 }}>
                          <InputNumber 
                            value={leaveEncashmentAmount} 
                            onChange={(val) => setLeaveEncashmentAmount(val || 0)} 
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                            style={{ width: '100%' }}
                            min={0}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  {/* 3. Gratuity */}
                  <Card 
                    title={<Space><DollarOutlined style={{ color: '#10b981' }} /><span>Gratuity Payout</span></Space>}
                    bordered={false} 
                    style={{ marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <Text type="secondary">Continuous service tenure: </Text>
                      <Text strong>{calculationData.gratuity?.tenureYears} Years</Text>
                    </div>
                    <Form.Item label="Gratuity Payout Amount (Override)" style={{ marginBottom: 0 }}>
                      <InputNumber 
                        value={gratuityAmount} 
                        onChange={(val) => setGratuityAmount(val || 0)} 
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                        min={0}
                      />
                    </Form.Item>
                  </Card>

                  {/* 4. Previous Unpaid Salaries & Approved Expenses */}
                  <Card 
                    title={<Space><CheckCircleOutlined style={{ color: '#10b981' }} /><span>Previous Salaries & Reimbursements</span></Space>}
                    bordered={false} 
                    style={{ marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    {calculationData.reconciliation?.pendingPayrollsList?.length > 0 ? (
                      <div style={{ marginBottom: '15px' }}>
                        <Text type="secondary" style={{ fontSize: '13px' }}>Unpaid standard monthly salaries pending: </Text>
                        <List
                          size="small"
                          bordered
                          dataSource={calculationData.reconciliation.pendingPayrollsList}
                          renderItem={item => (
                            <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Cycle: <strong>{item.monthKey}</strong></span>
                              <Text strong style={{ color: '#10b981' }}>₹{item.netSalary.toLocaleString('en-IN')}</Text>
                            </List.Item>
                          )}
                          style={{ marginTop: '5px', background: '#ffffff', borderRadius: '6px' }}
                        />
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '15px', fontStyle: 'italic' }}>
                        No unpaid previous month salary lines.
                      </div>
                    )}

                    <Form.Item label="Approved Expense Reimbursements (Override)" style={{ marginBottom: 0 }}>
                      <InputNumber 
                        value={expenseReimbursementAmount} 
                        onChange={(val) => setExpenseReimbursementAmount(val || 0)} 
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                        min={0}
                      />
                    </Form.Item>
                  </Card>
                </Col>

                {/* Deductions Column */}
                <Col xl={12} lg={12} md={24} sm={24} xs={24}>
                  <Title level={4} style={{ marginBottom: '15px', color: '#1e293b', display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '8px', height: '18px', background: '#ef4444', borderRadius: '2px', marginRight: '8px', display: 'inline-block' }}></span>
                    Recoveries & Deductions
                  </Title>

                  {/* 1. Notice Recovery */}
                  <Card 
                    title={<Space><CloseOutlined style={{ color: '#ef4444' }} /><span>Notice Period Recovery</span></Space>}
                    bordered={false} 
                    style={{ marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <Text type="secondary">Notice gap: </Text>
                      <Text strong>{calculationData.notice?.gapDays} Days </Text>
                      <Text type="secondary">({noticeDaysRequiredVal} required, {noticeDaysServedVal} served)</Text>
                    </div>
                    <Form.Item label="Notice Recovery Amount (Override)" style={{ marginBottom: 0 }}>
                      <InputNumber 
                        value={noticeRecoveryAmount} 
                        onChange={(val) => setNoticeRecoveryAmount(val || 0)} 
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                        min={0}
                      />
                    </Form.Item>
                  </Card>

                  {/* 2. Outstanding Loan Recovery */}
                  <Card 
                    title={<Space><CloseOutlined style={{ color: '#ef4444' }} /><span>Outstanding Loan Settlement</span></Space>}
                    bordered={false} 
                    style={{ marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <Text type="secondary">Total Outstanding Loan Liability: </Text>
                      <Text strong style={{ color: '#ef4444' }}>₹{calculationData.reconciliation?.outstandingLoan?.toLocaleString('en-IN') || '0'}</Text>
                    </div>
                    <Form.Item label="Loan Deduction Amount (Override)" style={{ marginBottom: 0 }}>
                      <InputNumber 
                        value={loansDeductionAmount} 
                        onChange={(val) => setLoansDeductionAmount(val || 0)} 
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                        min={0}
                        max={calculationData.reconciliation?.outstandingLoan || 0}
                      />
                    </Form.Item>
                  </Card>

                  {/* 3. Pending Cash Advance Recovery */}
                  <Card 
                    title={<Space><CloseOutlined style={{ color: '#ef4444' }} /><span>Pending Advances Recovery</span></Space>}
                    bordered={false} 
                    style={{ marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <Text type="secondary">Total Unsettled Pending Advances: </Text>
                      <Text strong style={{ color: '#ef4444' }}>₹{calculationData.reconciliation?.outstandingAdvance?.toLocaleString('en-IN') || '0'}</Text>
                    </div>
                    <Form.Item label="Advance Deduction Amount (Override)" style={{ marginBottom: 0 }}>
                      <InputNumber 
                        value={advancesDeductionAmount} 
                        onChange={(val) => setAdvancesDeductionAmount(val || 0)} 
                        formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                        min={0}
                        max={calculationData.reconciliation?.outstandingAdvance || 0}
                      />
                    </Form.Item>
                  </Card>
                </Col>
              </Row>
            )}
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(0)} shape="round">Back</Button>
              <Button type="primary" onClick={() => setCurrentStep(2)} shape="round">Next: Adjustments</Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Title level={4} style={{ color: '#1e293b', marginBottom: '20px' }}>Custom Adjustments & Remarks</Title>

            <Row gutter={24}>
              <Col span={12}>
                <Card 
                  title={<span style={{ color: '#10b981', fontWeight: 'bold' }}>+ Add Custom Earnings</span>} 
                  bordered={false}
                  style={{ borderRadius: '10px', background: '#f0fdf4', marginBottom: '20px' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input 
                      placeholder="e.g. Performance Bonus, LTA" 
                      value={customEarningLabel}
                      onChange={(e) => setCustomEarningLabel(e.target.value)}
                    />
                    <InputNumber 
                      placeholder="Amount" 
                      value={customEarningAmt}
                      onChange={(val) => setCustomEarningAmt(val || 0)}
                      style={{ width: '100%' }}
                      min={0}
                    />
                     <Button 
                      type="primary" 
                      ghost 
                      icon={<PlusOutlined />} 
                      onClick={addCustomEarning}
                      style={{ width: '100%' }}
                      shape="round"
                    >
                      Add Earning Row
                    </Button>
                  </Space>

                  <Divider style={{ margin: '15px 0' }} />

                  <List
                    size="small"
                    dataSource={otherEarnings}
                    renderItem={(item, index) => (
                      <List.Item 
                        actions={[
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => removeCustomEarning(index)} 
                          />
                        ]}
                      >
                        <Text>{item.label}: </Text>
                        <Text strong style={{ color: '#10b981' }}>₹{item.amount.toLocaleString('en-IN')}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              <Col span={12}>
                <Card 
                  title={<span style={{ color: '#ef4444', fontWeight: 'bold' }}>- Add Custom Deductions</span>} 
                  bordered={false}
                  style={{ borderRadius: '10px', background: '#fef2f2', marginBottom: '20px' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input 
                      placeholder="e.g. Asset Damage, Identity Card Lost" 
                      value={customDeductionLabel}
                      onChange={(e) => setCustomDeductionLabel(e.target.value)}
                    />
                    <InputNumber 
                      placeholder="Amount" 
                      value={customDeductionAmt}
                      onChange={(val) => setCustomDeductionAmt(val || 0)}
                      style={{ width: '100%' }}
                      min={0}
                    />
                     <Button 
                      danger 
                      ghost 
                      icon={<PlusOutlined />} 
                      onClick={addCustomDeduction}
                      style={{ width: '100%' }}
                      shape="round"
                    >
                      Add Deduction Row
                    </Button>
                  </Space>

                  <Divider style={{ margin: '15px 0' }} />

                  <List
                    size="small"
                    dataSource={otherDeductions}
                    renderItem={(item, index) => (
                      <List.Item 
                        actions={[
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => removeCustomDeduction(index)} 
                          />
                        ]}
                      >
                        <Text>{item.label}: </Text>
                        <Text strong style={{ color: '#ef4444' }}>₹{item.amount.toLocaleString('en-IN')}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="Final Remarks & Exit Notes" bordered={false} style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', marginTop: '10px' }}>
              <TextArea 
                rows={4} 
                placeholder="Enter overall settlement notes, reason for exit or final handover details..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Card>

             <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(1)} shape="round">Back</Button>
              <Button type="primary" onClick={() => setCurrentStep(3)} shape="round">Next: Finalize</Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            <Title level={4} style={{ color: '#1e293b', marginBottom: '20px' }}>Ledger Balance Sheet & Payout Confirmation</Title>

            <Row gutter={24}>
              <Col span={12}>
                <Card 
                  title={<Text strong style={{ color: '#10b981', fontSize: '15px' }}>Earnings & Dues (A)</Text>} 
                  bordered={false}
                  style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(16,185,129,0.04)', border: '1px solid #d1fae5' }}
                >
                  <Descriptions column={1} size="small" style={{ marginBottom: '15px' }}>
                    <Descriptions.Item label="Final Month Salary">₹{Number(pendingSalaryAmount).toLocaleString('en-IN')}</Descriptions.Item>
                    <Descriptions.Item label={`Leave Encashment (${leaveEncashmentDays} days)`}>₹{Number(leaveEncashmentAmount).toLocaleString('en-IN')}</Descriptions.Item>
                    <Descriptions.Item label="Gratuity Payout">₹{Number(gratuityAmount).toLocaleString('en-IN')}</Descriptions.Item>
                    <Descriptions.Item label="Expense Reimbursement">₹{Number(expenseReimbursementAmount).toLocaleString('en-IN')}</Descriptions.Item>
                    <Descriptions.Item label="Unpaid Previous Salaries">₹{Number(calculationData?.reconciliation?.unpaidPayrollSalary || 0).toLocaleString('en-IN')}</Descriptions.Item>
                    {otherEarnings.map((item, idx) => (
                      <Descriptions.Item key={`fin-oth-e-${idx}`} label={item.label}>₹{item.amount.toLocaleString('en-IN')}</Descriptions.Item>
                    ))}
                  </Descriptions>
                  <Divider style={{ margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', color: '#10b981' }}>
                    <span>Total Earnings (A):</span>
                    <span>₹{totalEarnings.toLocaleString('en-IN')}</span>
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <Card 
                  title={<Text strong style={{ color: '#ef4444', fontSize: '15px' }}>Recoveries & Deductions (B)</Text>} 
                  bordered={false}
                  style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(239,68,68,0.04)', border: '1px solid #fee2e2' }}
                >
                  <Descriptions column={1} size="small" style={{ marginBottom: '15px' }}>
                    <Descriptions.Item label="Notice Period Recovery">₹{Number(noticeRecoveryAmount).toLocaleString('en-IN')}</Descriptions.Item>
                    <Descriptions.Item label="Outstanding Loans">₹{Number(loansDeductionAmount).toLocaleString('en-IN')}</Descriptions.Item>
                    <Descriptions.Item label="Pending Cash Advances">₹{Number(advancesDeductionAmount).toLocaleString('en-IN')}</Descriptions.Item>
                    {otherDeductions.map((item, idx) => (
                      <Descriptions.Item key={`fin-oth-d-${idx}`} label={item.label}>₹{item.amount.toLocaleString('en-IN')}</Descriptions.Item>
                    ))}
                  </Descriptions>
                  <Divider style={{ margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', color: '#ef4444' }}>
                    <span>Total Deductions (B):</span>
                    <span>₹{totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </Card>
              </Col>
            </Row>

            <Card 
              style={{ 
                marginTop: '24px', 
                borderRadius: '12px', 
                background: netAmount >= 0 ? '#eff6ff' : '#fff7ed', 
                border: netAmount >= 0 ? '1px solid #bfdbfe' : '1px solid #ffedd5',
                textAlign: 'center',
                padding: '10px 0'
              }}
              bordered={false}
            >
              <Text strong style={{ fontSize: '15px', color: netAmount >= 0 ? '#1e40af' : '#9a3412' }}>
                {netAmount >= 0 ? 'NET PAYABLE SETTLEMENT AMOUNT (A - B):' : 'NET RECOVERABLE FROM EMPLOYEE (B - A):'}
              </Text>
              <div style={{ fontSize: '32px', fontWeight: '800', color: netAmount >= 0 ? '#2563eb' : '#ea580c', marginTop: '8px' }}>
                ₹{Math.abs(netAmount).toLocaleString('en-IN')}
              </div>
            </Card>

            <Card style={{ marginTop: '20px', borderRadius: '10px' }} bordered={false}>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="FnF Settlement Date" style={{ marginBottom: 0 }}>
                    <DatePicker 
                      value={settlementDateVal} 
                      onChange={(date) => setSettlementDateVal(date)}
                      style={{ width: '100%', height: '40px' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12} style={{ display: 'flex', alignItems: 'center' }}>
                  <Alert 
                    message="Finalizing this settlement will mark the employee profile as inactive and settle all pending loans, advances, expenses, and unpaid monthly payroll lines." 
                    type="warning" 
                    showIcon
                    style={{ fontSize: '11px', padding: '8px' }}
                  />
                </Col>
              </Row>
            </Card>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(2)} shape="round">Back</Button>
              <Button 
                type="primary" 
                size="large"
                icon={<SaveOutlined />} 
                onClick={handleFinalizeSettlement} 
                loading={loading}
                style={{ 
                  background: '#10b981', 
                  borderColor: '#10b981' 
                }}
                shape="round"
              >
                Finalize & Generate Statement
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Card className="sales-content-card" bodyStyle={{ padding: '24px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/payroll/fnf')} 
                style={{ marginRight: '12px' }}
              />
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>
                  Process Full & Final (FnF) Settlement
                </Title>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  Step-by-step calculator wizard to process exit dues and finalize employee settlements
                </Text>
              </div>
            </div>

            {/* Beautified Custom Card-based Stepper */}
            <div className="fnf-stepper-container" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '35px',
              padding: '8px 0'
            }}>
              {[
                { title: "Select Employee & Dates", desc: "Enter notice and exit info", icon: <UserOutlined /> },
                { title: "Review Calculations", desc: "Salary, leave & gratuity", icon: <CalculatorOutlined /> },
                { title: "Custom Adjustments", desc: "Add manual adjustments", icon: <DollarOutlined /> },
                { title: "Finalize Settlement", desc: "Confirm ledger balances", icon: <CheckCircleOutlined /> }
              ].map((step, idx) => {
                const isActive = currentStep === idx;
                const isCompleted = currentStep > idx;
                
                let cardStyle = {
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                };
                
                let iconContainerStyle = {
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  transition: 'all 0.3s'
                };

                let titleColor = '#334155';
                let descColor = '#64748b';

                if (isActive) {
                  cardStyle.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                  cardStyle.borderColor = '#2563eb';
                  cardStyle.boxShadow = '0 10px 15px -3px rgba(37, 99, 235, 0.25), 0 4px 6px -2px rgba(37, 99, 235, 0.15)';
                  iconContainerStyle.background = 'rgba(255, 255, 255, 0.2)';
                  iconContainerStyle.color = '#ffffff';
                  titleColor = '#ffffff';
                  descColor = 'rgba(255, 255, 255, 0.8)';
                } else if (isCompleted) {
                  cardStyle.background = '#f0fdf4';
                  cardStyle.borderColor = '#bbf7d0';
                  iconContainerStyle.background = '#dcfce7';
                  iconContainerStyle.color = '#16a34a';
                  titleColor = '#1e293b';
                  descColor = '#16a34a';
                } else {
                  iconContainerStyle.background = '#f1f5f9';
                  iconContainerStyle.color = '#94a3b8';
                }

                return (
                  <div key={idx} style={cardStyle}>
                    <div style={iconContainerStyle}>
                      {step.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <Text style={{ 
                        margin: 0, 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        color: titleColor,
                        transition: 'color 0.3s'
                      }}>
                        {step.title}
                      </Text>
                      <Text style={{ 
                        margin: 0, 
                        fontSize: '11px', 
                        color: descColor,
                        transition: 'color 0.3s',
                        marginTop: '2px'
                      }}>
                        {step.desc}
                      </Text>
                    </div>
                    
                    {/* Active Corner Light Glow Accent */}
                    {isActive && (
                      <span style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '32px',
                        height: '32px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '0 0 0 100px',
                        pointerEvents: 'none'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            <Divider style={{ margin: '20px 0 30px 0' }} />

            {renderStepContent()}

          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default FnFSettlementProcess;
