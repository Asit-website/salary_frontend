import React from 'react';
import {
  Layout,
  Card,
  Typography,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Switch,
  InputNumber,
  Row,
  Col,
  message,
  Dropdown,
  Space
} from 'antd';
import { PlusOutlined, MoreOutlined, ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;

export default function ManageSalaryTemplate() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [listLoading, setListLoading] = React.useState(false);
  const [templates, setTemplates] = React.useState([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      setListLoading(true);
      const res = await api.get('/admin/salary-templates');
      if (res.data?.success) setTemplates(res.data.data || []);
      else setTemplates([]);
    } catch (_) {
      setTemplates([]);
    } finally {
      setListLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const defaultEarningsList = [
    'BASIC SALARY',
    'HRA',
    'DA',
    'SPECIAL ALLOWANCE',
    'CONVEYANCE ALLOWANCE',
    'MEDICAL ALLOWANCE',
    'OTHER ALLOWANCES',
    'TRAVEL ALLOWANCE',
  ];
  const defaultDeductionsList = [
    'PROVIDENT FUND',
    'ESI',
    'PROFESSIONAL TAX',
    'INCOME TAX',
  ];

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    const defaultEarnings = defaultEarningsList.map((k) => ({ name: k, amount: 0 }));
    const defaultDeductions = defaultDeductionsList.map((k) => ({
      name: k,
      amount: k === 'PROVIDENT FUND' ? 12 : k === 'ESI' ? 0.75 : 0,
      employerAmount: k === 'PROVIDENT FUND' ? 12 : k === 'ESI' ? 3.25 : 0,
      slabs:
        k === 'PROFESSIONAL TAX'
          ? [{ min: 0, max: null, amount: 0 }]
          : undefined,
    }));
    form.setFieldsValue({
      name: '',
      active: true,
      earnings: defaultEarnings,
      deductions: defaultDeductions,
    });
    setModalOpen(true);
  };

  const openEdit = async (row) => {
    try {
      setEditing(row);
      form.resetFields();
      const res = await api.get(`/admin/salary-templates/${row.id}`);
      const tpl = res.data?.data || row;

      const parseMaybeJson = (v) => {
        if (typeof v === 'string') {
          try {
            return JSON.parse(v);
          } catch {
            return v;
          }
        }
        return v;
      };
      const rawEarn = parseMaybeJson(tpl.earnings);
      const rawDed = parseMaybeJson(tpl.deductions);

      const toArray = (val) => {
        if (Array.isArray(val)) return val.flatMap((x) => (Array.isArray(x) ? x : [x]));
        if (val && typeof val === 'object') {
          return Object.entries(val).map(([k, v]) => ({
            key: k,
            valueNumber: Number(v || 0),
          }));
        }
        return [];
      };

      let eEntries = toArray(rawEarn).map((it) => ({
        name: it.key || it.name || '',
        amount: Number(it.valueNumber ?? it.value ?? 0),
      }));
      let dEntries = [];
      let pfEmployeeAmount = 0;
      let pfEmployerAmount = 0;
      let esiEmployeeAmount = 0;
      let esiEmployerAmount = 0;
      let hasEsiKeys = false;
      let ptFixedAmount = 0;
      let ptSlabs = [];
      let pfFound = false;
      let esiFound = false;
      let ptFound = false;

      toArray(rawDed).forEach((it) => {
        const rawKey = String(it?.key ?? it?.name ?? '').trim();
        const key = rawKey.toUpperCase();
        const value = Number(it?.key && it?.value_number !== undefined ? it.value_number : (it?.valueNumber ?? it?.value_number ?? it?.value ?? it?.amount ?? 0));

        if (key === 'PROVIDENT_FUND_EMPLOYEE' || key === 'PROVIDENT FUND - EMPLOYEE') {
          pfEmployeeAmount = Number.isFinite(value) ? value : 0;
          pfFound = true;
          return;
        }
        if (key === 'PROVIDENT_FUND_EMPLOYER' || key === 'PROVIDENT FUND - EMPLOYER') {
          pfEmployerAmount = Number.isFinite(value) ? value : 0;
          pfFound = true;
          return;
        }

        if (key === 'ESI_EMPLOYEE' || key === 'ESI - EMPLOYEE') {
          esiEmployeeAmount = Number.isFinite(value) ? value : 0;
          hasEsiKeys = true;
          esiFound = true;
          return;
        }
        if (key === 'ESI_EMPLOYER' || key === 'ESI - EMPLOYER') {
          esiEmployerAmount = Number.isFinite(value) ? value : 0;
          hasEsiKeys = true;
          esiFound = true;
          return;
        }

        if (key === 'PROFESSIONAL TAX' || key === 'PROFESSIONAL_TAX') {
          ptFixedAmount = Number.isFinite(value) ? value : 0;
          const slabs = it?.meta?.slabs;
          ptSlabs = Array.isArray(slabs) ? slabs : [];
          ptFound = true;
          return;
        }

        if (!rawKey) return;
        if (key === 'PROVIDENT FUND') { pfFound = true; return; }
        if (key === 'ESI') {
          esiFound = true;
          if (!hasEsiKeys) {
            esiEmployeeAmount = Number.isFinite(value) ? value : 0;
            esiEmployerAmount = 0;
          }
          return;
        }

        dEntries.push({
          name: rawKey,
          amount: Number.isFinite(value) ? value : 0,
        });
      });

      const finalDeductions = [];

      if (pfFound) {
        finalDeductions.push({
          name: 'PROVIDENT FUND',
          amount: pfEmployeeAmount,
          employerAmount: pfEmployerAmount
        });
      }

      if (esiFound) {
        finalDeductions.push({
          name: 'ESI',
          amount: esiEmployeeAmount,
          employerAmount: esiEmployerAmount
        });
      }

      if (ptFound) {
        finalDeductions.push({
          name: 'PROFESSIONAL TAX',
          amount: ptFixedAmount,
          slabs: Array.isArray(ptSlabs) && ptSlabs.length ? ptSlabs : [{ min: 0, max: null, amount: 0 }],
        });
      }

      dEntries.forEach((entry) => {
        const n = String(entry?.name ?? '').trim();
        if (!n) return;
        if (n.toUpperCase() === 'PROVIDENT FUND') return;
        if (n.toUpperCase() === 'ESI') return;
        if (n.toUpperCase() === 'PROFESSIONAL TAX') return;
        finalDeductions.push({
          ...entry,
          name: n,
          amount: Number(entry?.amount ?? 0),
        });
      });

      const seenDed = new Set();
      dEntries = finalDeductions.filter((d) => {
        const n = String(d?.name ?? '').trim();
        if (!n) return false;
        const k = n.toUpperCase();
        if (seenDed.has(k)) return false;
        seenDed.add(k);
        return true;
      });

      if (!eEntries.length) eEntries = defaultEarningsList.map((k) => ({ name: k, amount: 0 }));

      form.setFieldsValue({
        name: tpl.name,
        active: tpl.active !== false,
        earnings: eEntries,
        deductions: dEntries,
      });
      setModalOpen(true);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load template');
    }
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      setLoading(true);

      const toItems = (arr = [], isDeduction = false) =>
        (arr || [])
          .map((it) => ({
            name: String(it?.name || '').trim(),
            amount: Number(it?.amount || 0),
            employerAmount: Number(it?.employerAmount || 0),
            slabs: Array.isArray(it?.slabs) ? it.slabs : [],
          }))
          .filter((it) => it.name)
          .flatMap((it) => {
            if (isDeduction && it.name === 'PROVIDENT FUND') {
              return [
                {
                  key: 'PROVIDENT_FUND_EMPLOYEE',
                  label: 'Provident Fund - Employee',
                  type: 'percent',
                  valueNumber: Number.isFinite(it.amount) ? it.amount : 12,
                  meta: { basedOn: 'BASIC SALARY' },
                },
                {
                  key: 'PROVIDENT_FUND_EMPLOYER',
                  label: 'Provident Fund - Employer',
                  type: 'percent',
                  valueNumber: Number.isFinite(it.employerAmount) ? it.employerAmount : 12,
                  meta: { basedOn: 'BASIC SALARY' },
                }
              ];
            }
            if (isDeduction && it.name === 'ESI') {
              return [
                {
                  key: 'ESI_EMPLOYEE',
                  label: 'ESI - Employee',
                  type: 'percent',
                  valueNumber: Number.isFinite(it.amount) ? it.amount : 0.75,
                  meta: { basedOn: 'TOTAL EARNINGS' },
                },
                {
                  key: 'ESI_EMPLOYER',
                  label: 'ESI - Employer',
                  type: 'percent',
                  valueNumber: Number.isFinite(it.employerAmount) ? it.employerAmount : 3.25,
                  meta: { basedOn: 'TOTAL EARNINGS' },
                }
              ];
            }
            if (isDeduction && it.name === 'PROFESSIONAL TAX') {
              const normalizedSlabs = (it.slabs || [])
                .map((s) => ({
                  min: Number(s?.min ?? 0),
                  max: s?.max === null || s?.max === undefined || s?.max === '' ? null : Number(s?.max),
                  amount: Number(s?.amount ?? 0),
                }))
                .filter((s) => Number.isFinite(s.min) && (s.max === null || Number.isFinite(s.max)));

              return [
                {
                  key: 'PROFESSIONAL TAX',
                  label: 'Professional Tax',
                  type: 'fixed',
                  valueNumber: Number.isFinite(it.amount) ? it.amount : 0,
                  meta: { basedOn: 'TOTAL EARNINGS', slabs: normalizedSlabs },
                },
              ];
            }
            return [
              {
                key: it.name,
                label: it.name.replace(/_/g, ' '),
                type: 'fixed',
                valueNumber: it.amount,
              },
            ];
          });

      const payload = {
        name: v.name,
        active: !!v.active,
        earnings: toItems(v.earnings, false),
        deductions: toItems(v.deductions, true),
      };

      if (editing) {
        const res = await api.put(`/admin/salary-templates/${editing.id}`, payload);
        if (res.data?.success) message.success('Template updated');
        else message.error(res.data?.message || 'Failed');
      } else {
        const res = await api.post('/admin/salary-templates', payload);
        if (res.data?.success) message.success('Template created');
        else message.error(res.data?.message || 'Failed');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (row) => {
    Modal.confirm({
      title: `Delete template "${row.name}"?`,
      content: 'This will deactivate the template.',
      onOk: async () => {
        try {
          await api.delete(`/admin/salary-templates/${row.id}`);
          message.success('Template deleted');
          load();
        } catch (e) {
          message.error(e?.response?.data?.message || 'Failed to delete');
        }
      },
    });
  };

  const columns = [
    { 
      title: 'Template Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (text) => <span style={{ fontWeight: '600', color: '#1e293b' }}>{text}</span>
    },
    { 
      title: 'Status', 
      dataIndex: 'active', 
      key: 'active', 
      width: 140,
      render: (v) => v ? (
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '11px', 
          fontWeight: '700', 
          color: '#16a34a', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          letterSpacing: '0.5px'
        }}>
          ACTIVE
        </span>
      ) : (
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '11px', 
          fontWeight: '700', 
          color: '#dc2626', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca',
          letterSpacing: '0.5px'
        }}>
          INACTIVE
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      width: 160,
      fixed: 'right',
      render: (_, r) => {
        const items = [
          { key: 'edit', label: 'Edit' },
          { key: 'delete', label: 'Delete' },
        ];
        const onClick = ({ key }) => {
          if (key === 'edit') openEdit(r);
          if (key === 'delete') remove(r);
        };
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Dropdown menu={{ items, onClick }} trigger={['click']}>
              <Button shape="round" icon={<MoreOutlined style={{ fontSize: '13px' }} />} style={{ border: '1px solid #cbd5e1', fontWeight: '500' }}>
                Actions
              </Button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Salary Templates" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            {/* Toolbar Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/settings')}
                style={{ fontWeight: 600, color: '#475569' }}
                shape="round"
              >
                Back to Settings
              </Button>
            </div>

            {/* Main Card */}
            <Card 
              className="sales-content-card" 
              style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Salary Structure Templates</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Configure earnings and statutory deductions (PF, ESI, PT) for staff payroll.</div>
                </div>
                <Button 
                  type="primary" 
                  shape="round" 
                  icon={<PlusOutlined />} 
                  onClick={openAdd}
                  style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                >
                  Create Template
                </Button>
              </div>

              <Table
                loading={listLoading}
                dataSource={(templates || []).map((t) => ({ key: t.id, ...t }))}
                columns={columns}
                pagination={{ pageSize: 10 }}
                bordered={false}
              />
            </Card>
          </Space>
        </Content>
      </Layout>

      <Modal
        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{editing ? 'Edit Salary Template' : 'Create Salary Template'}</span>}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={save}
        confirmLoading={loading}
        okText={editing ? 'Save' : 'Create'}
        cancelButtonProps={{ shape: 'round' }}
        okButtonProps={{ shape: 'round' }}
        width={720}
      >
        <div style={{ paddingTop: '12px' }}>
          <Form form={form} layout="vertical">
            <Row gutter={16} style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Col span={16}>
                <Form.Item name="name" label={<span style={{ fontWeight: '600', color: '#475569' }}>Template Name</span>} rules={[{ required: true, message: 'Name is required' }]} style={{ marginBottom: 0 }}>
                  <Input placeholder="e.g. Executive Staff Salary" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={8} style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Active Status</span>
                <Form.Item name="active" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Switch defaultChecked />
                </Form.Item>
              </Col>
            </Row>

            <Card size="small" title={<span style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>Earnings</span>} style={{ marginBottom: 16, borderRadius: '10px' }} bodyStyle={{ padding: '16px' }}>
              <Form.List name="earnings">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={12} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                        <Col span={14}>
                          <Form.Item
                            {...rest}
                            name={[name, 'name']}
                            rules={[{ required: true, message: 'Name' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="e.g. BASIC SALARY" style={{ borderRadius: '8px' }} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...rest} name={[name, 'amount']} style={{ marginBottom: 0 }}>
                            <InputNumber disabled min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
                          </Form.Item>
                        </Col>
                        <Col span={2} style={{ textAlign: 'right' }}>
                          <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                        </Col>
                      </Row>
                    ))}
                    <Button 
                      type="dashed" 
                      onClick={() => add({ name: '', amount: 0 })} 
                      icon={<PlusOutlined />} 
                      style={{ borderRadius: '8px', marginTop: '4px' }}
                      block
                    >
                      Add Earning Component
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card size="small" title={<span style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>Deductions</span>} style={{ borderRadius: '10px' }} bodyStyle={{ padding: '16px' }}>
              <Form.List name="deductions">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => {
                      const initialValues = form.getFieldValue(['deductions', name]);
                      const isPF = String(initialValues?.name || '').trim().toUpperCase() === 'PROVIDENT FUND';
                      const isESI = String(initialValues?.name || '').trim().toUpperCase() === 'ESI';
                      const isPT = String(initialValues?.name || '').trim().toUpperCase() === 'PROFESSIONAL TAX';

                      if (isPF) {
                        return (
                          <div key={key} style={{ marginBottom: 16, padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                            <Row gutter={8} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                              <Col span={22}>
                                <Form.Item
                                  {...rest}
                                  name={[name, 'name']}
                                  rules={[{ required: true, message: 'Name' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="PROVIDENT FUND" style={{ fontWeight: '700', color: '#1e293b', borderRadius: '8px' }} />
                                </Form.Item>
                              </Col>
                              <Col span={2} style={{ textAlign: 'right' }}>
                                <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                            <Row gutter={12}>
                              <Col span={12}>
                                <Form.Item
                                  label={<span style={{ fontWeight: '600', color: '#475569', fontSize: '12px' }}>Employee Contribution (%)</span>}
                                  {...rest}
                                  name={[name, 'amount']}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    max={100}
                                    style={{ width: '100%', borderRadius: '8px' }}
                                    placeholder="12"
                                    addonAfter="%"
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  label={<span style={{ fontWeight: '600', color: '#475569', fontSize: '12px' }}>Employer Contribution (%)</span>}
                                  {...rest}
                                  name={[name, 'employerAmount']}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    max={100}
                                    style={{ width: '100%', borderRadius: '8px' }}
                                    placeholder="12"
                                    addonAfter="%"
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        );
                      }

                      if (isPT) {
                        return (
                          <div key={key} style={{ marginBottom: 16, padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                            <Row gutter={8} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                              <Col span={22}>
                                <Form.Item
                                  {...rest}
                                  name={[name, 'name']}
                                  rules={[{ required: true, message: 'Name' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="PROFESSIONAL TAX" style={{ fontWeight: '700', color: '#1e293b', borderRadius: '8px' }} />
                                </Form.Item>
                              </Col>
                              <Col span={2} style={{ textAlign: 'right' }}>
                                <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>

                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Slab Rules</div>
                            <Form.List name={[name, 'slabs']}>
                              {(slabFields, { add: addSlab, remove: removeSlab }) => (
                                <>
                                  {slabFields.map(({ key: sKey, name: sName, ...sRest }) => (
                                    <Row key={sKey} gutter={8} style={{ marginBottom: 8, display: 'flex', alignItems: 'end' }}>
                                      <Col span={7}>
                                        <Form.Item
                                          label={sName === 0 ? <span style={{ fontSize: '11px', color: '#64748b' }}>From (₹)</span> : ''}
                                          {...sRest}
                                          name={[sName, 'min']}
                                          style={{ marginBottom: 0 }}
                                        >
                                          <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
                                        </Form.Item>
                                      </Col>
                                      <Col span={7}>
                                        <Form.Item
                                          label={sName === 0 ? <span style={{ fontSize: '11px', color: '#64748b' }}>To (₹)</span> : ''}
                                          {...sRest}
                                          name={[sName, 'max']}
                                          style={{ marginBottom: 0 }}
                                        >
                                          <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="max" />
                                        </Form.Item>
                                      </Col>
                                      <Col span={8}>
                                        <Form.Item
                                          label={sName === 0 ? <span style={{ fontSize: '11px', color: '#64748b' }}>PT Amount (₹)</span> : ''}
                                          {...sRest}
                                          name={[sName, 'amount']}
                                          style={{ marginBottom: 0 }}
                                        >
                                          <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
                                        </Form.Item>
                                      </Col>
                                      <Col span={2} style={{ display: 'flex', justifyContent: 'flex-end', height: '32px', alignItems: 'center' }}>
                                        <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => removeSlab(sName)} />
                                      </Col>
                                    </Row>
                                  ))}
                                  <Button
                                    type="dashed"
                                    onClick={() => addSlab({ min: 0, max: null, amount: 0 })}
                                    icon={<PlusOutlined />}
                                    style={{ marginTop: '8px', borderRadius: '8px' }}
                                    block
                                  >
                                    Add Slab Rule
                                  </Button>
                                </>
                              )}
                            </Form.List>
                          </div>
                        );
                      }

                      if (isESI) {
                        return (
                          <div key={key} style={{ marginBottom: 16, padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                            <Row gutter={8} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                              <Col span={22}>
                                <Form.Item
                                  {...rest}
                                  name={[name, 'name']}
                                  rules={[{ required: true, message: 'Name' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="ESI" style={{ fontWeight: '700', color: '#1e293b', borderRadius: '8px' }} />
                                </Form.Item>
                              </Col>
                              <Col span={2} style={{ textAlign: 'right' }}>
                                <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                            <Row gutter={12}>
                              <Col span={12}>
                                <Form.Item
                                  label={<span style={{ fontWeight: '600', color: '#475569', fontSize: '12px' }}>Employee Contribution (%)</span>}
                                  {...rest}
                                  name={[name, 'amount']}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    max={100}
                                    style={{ width: '100%', borderRadius: '8px' }}
                                    placeholder="0.75"
                                    addonAfter="%"
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  label={<span style={{ fontWeight: '600', color: '#475569', fontSize: '12px' }}>Employer Contribution (%)</span>}
                                  {...rest}
                                  name={[name, 'employerAmount']}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    max={100}
                                    style={{ width: '100%', borderRadius: '8px' }}
                                    placeholder="3.25"
                                    addonAfter="%"
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        );
                      }

                      return (
                        <Row key={key} gutter={12} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                          <Col span={14}>
                            <Form.Item
                              {...rest}
                              name={[name, 'name']}
                              rules={[{ required: true, message: 'Name' }]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="Enter deduction name" style={{ borderRadius: '8px' }} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item {...rest} name={[name, 'amount']} style={{ marginBottom: 0 }}>
                              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
                            </Form.Item>
                          </Col>
                          <Col span={2} style={{ textAlign: 'right' }}>
                            <Button danger shape="circle" size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                          </Col>
                        </Row>
                      );
                    })}
                    <Button 
                      type="dashed" 
                      onClick={() => add({ name: '', amount: 0 })} 
                      icon={<PlusOutlined />} 
                      style={{ borderRadius: '8px', marginTop: '4px' }}
                      block
                    >
                      Add Deduction Component
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>
          </Form>
        </div>
      </Modal>
    </Layout>
  );
}
