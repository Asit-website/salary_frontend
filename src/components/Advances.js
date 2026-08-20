import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Row,
  Col,
  Descriptions,
  Typography,
  Tabs,
  Tag,
  Divider,
  Tooltip,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  CalendarOutlined,
  ReloadOutlined,
  EditOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  InfoCircleOutlined,
  BankOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';

const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const fmtCurrency = (val) =>
  `₹${(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Helper: parse deductions from advance record
const parseDeductions = (adv) => {
  if (!adv) return [];
  let d = adv.deductions;
  while (typeof d === 'string') {
    try { d = JSON.parse(d); } catch (e) { break; }
  }
  return Array.isArray(d) ? d : [];
};

// Compute outstanding balance for an advance
const computeOutstanding = (adv) => {
  const total = Number(adv.amount || 0);
  const deductions = parseDeductions(adv);
  if (deductions.length === 0) {
    return adv.status === 'deducted' ? 0 : total;
  }
  const deducted = deductions
    .filter(d => d.status === 'deducted')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  return Math.max(0, total - deducted);
};

// Compute deduction for a specific month
const getMonthDeduction = (adv, monthKey) => {
  const deductions = parseDeductions(adv);
  if (deductions.length === 0) {
    return adv.deductionMonth === monthKey ? Number(adv.amount || 0) : 0;
  }
  const d = deductions.find(x => x.month === monthKey);
  return d ? Number(d.amount || 0) : 0;
};

const Advances = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [activeTab, setActiveTab] = useState('registry');
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const loadAdvances = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/advances', {
        params: { page: pagination.current, limit: pagination.pageSize }
      });
      setAdvances(response.data.data || []);
      setPagination(prev => ({ ...prev, total: response.data.pagination?.total || 0 }));
    } catch {
      message.error('Failed to load advances');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  const loadStaff = useCallback(async () => {
    try {
      const response = await api.get('/admin/staff');
      setStaff(response.data.data || []);
    } catch {
      message.error('Failed to load staff');
    }
  }, []);

  useEffect(() => {
    loadAdvances();
    loadStaff();
  }, []);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const deductions = (values.deductions || []).map(d => ({
        month: d.month.format('YYYY-MM'),
        amount: Number(d.amount),
        status: 'pending',
      }));

      // Validate: sum of installments should not exceed total amount
      const totalInstallments = deductions.reduce((s, d) => s + d.amount, 0);
      if (deductions.length > 0 && totalInstallments > Number(values.amount)) {
        message.error(`Total installments (${fmtCurrency(totalInstallments)}) exceed advance amount (${fmtCurrency(values.amount)})`);
        setLoading(false);
        return;
      }

      // Determine deductionMonth: first installment or selected single month
      let deductionMonth = values.deductionMonth
        ? values.deductionMonth.format('YYYY-MM')
        : (deductions.length > 0 ? deductions[0].month : dayjs().format('YYYY-MM'));

      const payload = {
        staffId: values.staffId,
        amount: values.amount,
        advanceDate: values.advanceDate.format('YYYY-MM-DD'),
        notes: values.notes,
        deductionMonth,
        deductions: deductions.length > 0 ? deductions : null,
      };

      if (selectedAdvance && modalVisible) {
        // When editing, preserve existing installment statuses
        const existingDeductions = parseDeductions(selectedAdvance);
        if (deductions.length > 0 && existingDeductions.length > 0) {
          const mergedDeductions = deductions.map(newD => {
            const existing = existingDeductions.find(e => e.month === newD.month);
            return { ...newD, status: existing?.status || 'pending' };
          });
          payload.deductions = mergedDeductions;
        }
        await api.put(`/admin/advances/${selectedAdvance.id}`, payload);
        message.success('Advance updated successfully');
      } else {
        await api.post('/admin/advances', payload);
        message.success('Advance recorded successfully');
      }

      setModalVisible(false);
      setSelectedAdvance(null);
      form.resetFields();
      loadAdvances();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to process advance');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setSelectedAdvance(record);
    const deductionsList = parseDeductions(record);
    form.setFieldsValue({
      staffId: record.staffId,
      amount: Number(record.amount),
      advanceDate: dayjs(record.advanceDate),
      deductionMonth: deductionsList.length === 0 ? dayjs(record.deductionMonth, 'YYYY-MM') : null,
      notes: record.notes,
      deductions: deductionsList.length > 0
        ? deductionsList.map(d => ({ month: dayjs(d.month, 'YYYY-MM'), amount: d.amount }))
        : [],
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/advances/${id}`);
      message.success('Advance deleted successfully');
      loadAdvances();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete advance');
    }
  };

  const handleViewDetails = (record) => {
    setSelectedAdvance(record);
    setDetailsModalVisible(true);
  };

  // Stats
  const totalAdvancesCount = advances.length;
  const totalOutstanding = advances.reduce((sum, a) => sum + computeOutstanding(a), 0);
  const totalDeducted = advances.reduce((sum, a) => {
    const deductions = parseDeductions(a);
    if (deductions.length > 0) {
      return sum + deductions.filter(d => d.status === 'deducted').reduce((s, d) => s + Number(d.amount || 0), 0);
    }
    return sum + (a.status === 'deducted' ? Number(a.amount || 0) : 0);
  }, 0);

  // Registry Tab Columns
  const registryColumns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (_, record) => {
        const name = record.staffMember?.profile?.name || 'Unknown';
        const phone = record.staffMember?.phone || '';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#e6f7ff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#1677ff', fontWeight: 700, fontSize: 14,
              flexShrink: 0, boxShadow: '0 2px 6px rgba(22,119,255,0.08)'
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#1677ff' }}>{name}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{phone}</div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Total Advance',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => <span style={{ fontWeight: 600 }}>{fmtCurrency(amt)}</span>,
    },
    {
      title: 'Advance Date',
      dataIndex: 'advanceDate',
      key: 'advanceDate',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      render: (_, record) => {
        const deductions = parseDeductions(record);
        if (deductions.length === 0) {
          return (
            <div>
              <div style={{ fontSize: 12, color: '#595959' }}>
                {dayjs(record.deductionMonth, 'YYYY-MM').format('MMMM YYYY')}
              </div>
              <Tag color={record.status === 'deducted' ? 'green' : 'orange'} style={{ fontSize: 11, marginTop: 2 }}>
                {record.status === 'deducted' ? 'Deducted' : 'Pending'}
              </Tag>
            </div>
          );
        }
        const pendingCount = deductions.filter(d => d.status === 'pending').length;
        const deductedCount = deductions.filter(d => d.status === 'deducted').length;
        return (
          <div>
            <div style={{ fontSize: 12 }}>
              <Tag color="blue">{deductions.length} installments</Tag>
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
              {deductedCount} done · {pendingCount} pending
            </div>
          </div>
        );
      }
    },
    {
      title: 'Outstanding',
      key: 'outstanding',
      render: (_, record) => {
        const outstanding = computeOutstanding(record);
        const total = Number(record.amount || 0);
        const percent = total > 0 ? Math.round(((total - outstanding) / total) * 100) : 0;
        return (
          <div style={{ minWidth: 100 }}>
            <div style={{ fontWeight: 700, color: outstanding > 0 ? '#ff4d4f' : '#52c41a', marginBottom: 2 }}>
              {fmtCurrency(outstanding)}
            </div>
            <Progress percent={percent} size="small" showInfo={false}
              strokeColor={outstanding > 0 ? '#ff4d4f' : '#52c41a'} trailColor="#f5f5f5" />
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={6} style={{ flexWrap: 'nowrap' }}>
          <Button size="small" shape="round" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>Details</Button>
          <Button size="small" shape="round" icon={<EditOutlined style={{ color: '#1677ff' }} />} onClick={() => handleEdit(record)}>Edit</Button>
          <Button size="small" shape="round" danger icon={<DeleteOutlined />}
            onClick={() => Modal.confirm({
              title: 'Delete this advance?',
              content: 'This action cannot be undone.',
              okButtonProps: { shape: 'round', danger: true },
              cancelButtonProps: { shape: 'round' },
              onOk: () => handleDelete(record.id),
            })}>Delete</Button>
        </Space>
      ),
    },
  ];

  // Outstanding Advances Tab — only advances with outstanding > 0
  const outstandingAdvances = advances
    .map(a => ({ ...a, _outstanding: computeOutstanding(a) }))
    .filter(a => a._outstanding > 0);

  const outstandingColumns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (_, record) => {
        const name = record.staffMember?.profile?.name || 'Unknown';
        const phone = record.staffMember?.phone || '';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#fff2e8', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fa8c16', fontWeight: 700, fontSize: 14,
              flexShrink: 0
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#262626' }}>{name}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{phone}</div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Advance Date',
      dataIndex: 'advanceDate',
      key: 'advanceDate',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Total Given',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => <span style={{ fontWeight: 600 }}>{fmtCurrency(amt)}</span>,
    },
    {
      title: 'Total Deducted',
      key: 'deducted',
      render: (_, record) => {
        const deductions = parseDeductions(record);
        const deducted = deductions.length > 0
          ? deductions.filter(d => d.status === 'deducted').reduce((s, d) => s + Number(d.amount || 0), 0)
          : (record.status === 'deducted' ? Number(record.amount) : 0);
        return <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmtCurrency(deducted)}</span>;
      }
    },
    {
      title: 'Outstanding',
      key: 'outstanding',
      render: (_, record) => (
        <span style={{ color: '#ff4d4f', fontWeight: 700 }}>{fmtCurrency(record._outstanding)}</span>
      ),
    },
    {
      title: 'Installment Schedule',
      key: 'installments',
      render: (_, record) => {
        const deductions = parseDeductions(record);
        if (deductions.length === 0) {
          return (
            <div style={{ fontSize: 12 }}>
              <Tag color="orange">Single deduction</Tag>
              <div style={{ color: '#595959', marginTop: 2 }}>
                {dayjs(record.deductionMonth, 'YYYY-MM').format('MMMM YYYY')} — {fmtCurrency(record.amount)}
              </div>
            </div>
          );
        }
        const pending = deductions.filter(d => d.status === 'pending');
        return (
          <div style={{ fontSize: 12 }}>
            {pending.slice(0, 3).map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>
                  {dayjs(d.month, 'YYYY-MM').format('MMM YYYY')}
                </Tag>
                <span style={{ color: '#262626' }}>{fmtCurrency(d.amount)}</span>
              </div>
            ))}
            {pending.length > 3 && (
              <Text type="secondary" style={{ fontSize: 11 }}>+{pending.length - 3} more</Text>
            )}
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" shape="round" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>Details</Button>
          <Button size="small" shape="round" icon={<EditOutlined style={{ color: '#1677ff' }} />} onClick={() => handleEdit(record)}>Edit</Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Staff Advances" />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>

          {/* KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} md={8}>
              <Card bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500, marginBottom: 8 }}>Total Advances</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#262626' }}>{totalAdvancesCount}</div>
                  </div>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: 20 }}>
                    <WalletOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500, marginBottom: 8 }}>Total Outstanding</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4d4f' }}>{fmtCurrency(totalOutstanding)}</div>
                  </div>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: '#fff1f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', fontSize: 20 }}>
                    <CalendarOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500, marginBottom: 8 }}>Total Deducted</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>{fmtCurrency(totalDeducted)}</div>
                  </div>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: 20 }}>
                    <CheckCircleOutlined />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Main Card with Tabs */}
          <Card bodyStyle={{ padding: '0 24px 24px' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              tabBarExtraContent={
                activeTab === 'registry' ? (
                  <Space size={10} style={{ padding: '16px 0 8px' }}>
                    <Button icon={<ReloadOutlined />} shape="round" onClick={loadAdvances}>Refresh</Button>
                    <Button
                      type="primary" shape="round" icon={<PlusOutlined />}
                      onClick={() => { setSelectedAdvance(null); form.resetFields(); setModalVisible(true); }}
                    >
                      Give Advance
                    </Button>
                  </Space>
                ) : (
                  <Space size={10} style={{ padding: '16px 0 8px' }}>
                    <Button icon={<ReloadOutlined />} shape="round" onClick={loadAdvances}>Refresh</Button>
                  </Space>
                )
              }
              items={[
                {
                  key: 'registry',
                  label: <span><BankOutlined style={{ marginRight: 6 }} />Active Advances Registry</span>,
                  children: (
                    <Table
                      columns={registryColumns}
                      dataSource={advances}
                      rowKey="id"
                      loading={loading}
                      pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} advances`,
                      }}
                      onChange={(p) => { setPagination(p); loadAdvances(); }}
                    />
                  )
                },
                {
                  key: 'outstanding',
                  label: (
                    <span>
                      <ScheduleOutlined style={{ marginRight: 6 }} />
                      Outstanding Advances
                      {outstandingAdvances.length > 0 && (
                        <Tag color="red" style={{ marginLeft: 8, fontSize: 11 }}>{outstandingAdvances.length}</Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <Table
                      columns={outstandingColumns}
                      dataSource={outstandingAdvances}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 10, showTotal: (total) => `${total} advances with outstanding balance` }}
                    />
                  )
                }
              ]}
            />
          </Card>

          {/* Give / Edit Advance Modal */}
          <Modal
            title={selectedAdvance && modalVisible ? 'Edit Staff Advance' : 'Give New Advance'}
            open={modalVisible}
            onCancel={() => { setModalVisible(false); setSelectedAdvance(null); form.resetFields(); }}
            footer={null}
            width={760}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ advanceDate: dayjs() }}
              style={{ marginTop: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="staffId" label="Staff Member"
                    rules={[{ required: true, message: 'Please select staff' }]}>
                    <Select showSearch placeholder="Search staff" optionFilterProp="children">
                      {staff.map(s => <Option key={s.id} value={s.id}>{s.name} ({s.phone})</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="amount" label="Total Advance Amount"
                    rules={[{ required: true, message: 'Please enter amount' }]}>
                    <InputNumber style={{ width: '100%' }} min={1} placeholder="0.00" prefix="₹" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="advanceDate" label="Date Given"
                    rules={[{ required: true, message: 'Please select date' }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="notes" label="Notes">
                    <Input placeholder="Optional notes" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ fontSize: 13, color: '#595959', margin: '4px 0 12px' }}>
                Repayment / Deduction Schedule
                <Tooltip title="Add multiple installments for monthly recovery. If no installments added, a single deduction month is required.">
                  <InfoCircleOutlined style={{ marginLeft: 8, color: '#1677ff', fontSize: 13 }} />
                </Tooltip>
              </Divider>

              {/* Single deduction month - shown only when no installments added */}
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const deductions = getFieldValue('deductions') || [];
                  return deductions.length === 0 ? (
                    <Form.Item
                      name="deductionMonth"
                      label="Deduction Month (single)"
                      rules={[{ required: true, message: 'Please select deduction month or add installments below' }]}
                    >
                      <DatePicker picker="month" style={{ width: '100%' }} format="MMMM YYYY" />
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>

              <Form.List name="deductions">
                {(fields, { add, remove }) => (
                  <div>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={12} align="middle" style={{ marginBottom: 8 }}>
                        <Col span={10}>
                          <Form.Item
                            {...restField}
                            name={[name, 'month']}
                            rules={[{ required: true, message: 'Select month' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <DatePicker picker="month" style={{ width: '100%' }} format="MMMM YYYY" placeholder="Deduction Month" />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item
                            {...restField}
                            name={[name, 'amount']}
                            rules={[{ required: true, message: 'Enter amount' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber style={{ width: '100%' }} min={1} prefix="₹" placeholder="Deduct Amount" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Button
                            danger type="text" shape="circle"
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(name)}
                          />
                        </Col>
                      </Row>
                    ))}

                    <Button
                      type="dashed" onClick={() => add()} icon={<PlusOutlined />}
                      style={{ width: '100%', marginTop: 4 }} shape="round"
                    >
                      Add Installment
                    </Button>
                  </div>
                )}
              </Form.List>

              <Form.Item style={{ marginTop: 20, marginBottom: 0, textAlign: 'right' }}>
                <Space size={10}>
                  <Button onClick={() => { setModalVisible(false); setSelectedAdvance(null); form.resetFields(); }} shape="round">Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={loading} shape="round">
                    {selectedAdvance ? 'Save Changes' : 'Record Advance'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Details Modal */}
          <Modal
            title="Advance Details"
            open={detailsModalVisible}
            onCancel={() => setDetailsModalVisible(false)}
            footer={[
              <Button key="close" type="primary" shape="round" onClick={() => setDetailsModalVisible(false)}>Close</Button>
            ]}
            width={640}
          >
            {selectedAdvance && (() => {
              const deductions = parseDeductions(selectedAdvance);
              const outstanding = computeOutstanding(selectedAdvance);
              const total = Number(selectedAdvance.amount || 0);
              const deductedAmt = total - outstanding;
              return (
                <div style={{ marginTop: 16 }}>
                  <Descriptions bordered column={2} size="small"
                    contentStyle={{ fontSize: 13 }} labelStyle={{ fontWeight: 600, fontSize: 13, width: 150 }}>
                    <Descriptions.Item label="Staff Member" span={2}>
                      <span style={{ fontWeight: 700, color: '#1677ff' }}>
                        {selectedAdvance.staffMember?.profile?.name}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Advance">
                      <span style={{ fontWeight: 700 }}>{fmtCurrency(total)}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date Given">
                      {dayjs(selectedAdvance.advanceDate).format('DD MMM YYYY')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Deducted">
                      <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmtCurrency(deductedAmt)}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Outstanding">
                      <span style={{ color: outstanding > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 700 }}>
                        {fmtCurrency(outstanding)}
                      </span>
                    </Descriptions.Item>
                    {selectedAdvance.notes && (
                      <Descriptions.Item label="Notes" span={2}>{selectedAdvance.notes}</Descriptions.Item>
                    )}
                  </Descriptions>

                  {deductions.length > 0 && (
                    <>
                      <Divider orientation="left" style={{ fontSize: 13, margin: '16px 0 10px' }}>Installment Schedule</Divider>
                      <Table
                        size="small"
                        dataSource={deductions.map((d, i) => ({ ...d, key: i }))}
                        pagination={false}
                        columns={[
                          {
                            title: 'Month',
                            dataIndex: 'month',
                            render: (m) => dayjs(m, 'YYYY-MM').format('MMMM YYYY'),
                          },
                          {
                            title: 'Deduct Amount',
                            dataIndex: 'amount',
                            render: (amt) => <span style={{ fontWeight: 600 }}>{fmtCurrency(amt)}</span>,
                          },
                          {
                            title: 'Status',
                            dataIndex: 'status',
                            render: (s) => (
                              <Tag color={s === 'deducted' ? 'green' : 'orange'}>
                                {s === 'deducted' ? 'Deducted' : 'Pending'}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    </>
                  )}

                  {deductions.length === 0 && (
                    <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Single deduction in <strong>{dayjs(selectedAdvance.deductionMonth, 'YYYY-MM').format('MMMM YYYY')}</strong>
                        {' '}— <Tag color={selectedAdvance.status === 'deducted' ? 'green' : 'orange'}>
                          {selectedAdvance.status === 'deducted' ? 'Deducted' : 'Pending'}
                        </Tag>
                      </Text>
                    </div>
                  )}
                </div>
              );
            })()}
          </Modal>

        </Content>
      </Layout>
    </Layout>
  );
};

export default Advances;
