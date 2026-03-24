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
  Dropdown
} from 'antd';
import { PlusOutlined, MoreOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ManageSalaryTemplate() {
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

  // EXACT Step-2 defaults + requested additions
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
      // Fetch latest by id to ensure full JSON and avoid string parsing issues
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
          // Legacy ESI support: treat as employee percentage when new keys aren't present
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

      // Always add all default deductions including PF with proper values
      const finalDeductions = [];

      // Add PF if found
      if (pfFound) {
        finalDeductions.push({
          name: 'PROVIDENT FUND',
          amount: pfEmployeeAmount,
          employerAmount: pfEmployerAmount
        });
      }

      // Add ESI if found
      if (esiFound) {
        finalDeductions.push({
          name: 'ESI',
          amount: esiEmployeeAmount,
          employerAmount: esiEmployerAmount
        });
      }

      // Add PT if found
      if (ptFound) {
        finalDeductions.push({
          name: 'PROFESSIONAL TAX',
          amount: ptFixedAmount,
          slabs: Array.isArray(ptSlabs) && ptSlabs.length ? ptSlabs : [{ min: 0, max: null, amount: 0 }],
        });
      }

      // Add other deductions from template
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

      // Remove blanks + duplicates (prevents the extra "Enter deduction name" row)
      const seenDed = new Set();
      dEntries = finalDeductions.filter((d) => {
        const n = String(d?.name ?? '').trim();
        if (!n) return false;
        const k = n.toUpperCase();
        if (seenDed.has(k)) return false;
        seenDed.add(k);
        return true;
      });

      // Backfill defaults if empty
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
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Active', dataIndex: 'active', key: 'active', render: (v) => (v ? 'Yes' : 'No') },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      width: 220,
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
              <Button icon={<MoreOutlined />}>More</Button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>
            Manage Salary Template
          </Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card title="Templates" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Create Template</Button>}>
            <Table
              size="small"
              loading={listLoading}
              dataSource={(templates || []).map((t) => ({ key: t.id, ...t }))}
              columns={columns}
              scroll={{ x: 900 }}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          <Modal
            title={editing ? 'Edit Template' : 'Create Template'}
            open={modalOpen}
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onOk={save}
            confirmLoading={loading}
            okText={editing ? 'Save' : 'Create'}
            width={720}
          >
            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item name="name" label="Template Name" rules={[{ required: true, message: 'Name is required' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="active" label="Active" valuePropName="checked">
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
              </Row>

              <Card size="small" title="Earnings" style={{ marginBottom: 12 }}>
                <Form.List name="earnings">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                          <Col span={14}>
                            <Form.Item
                              {...rest}
                              name={[name, 'name']}
                              rules={[{ required: true, message: 'Name' }]}
                            >
                              <Input placeholder="e.g. BASIC SALARY" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item {...rest} name={[name, 'amount']}>
                              <InputNumber disabled min={0} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={2}>
                            <Button danger onClick={() => remove(name)}>
                              X
                            </Button>
                          </Col>
                        </Row>
                      ))}
                      <Button type="dashed" onClick={() => add({ name: '', amount: 0 })} icon={<PlusOutlined />}>
                        Add More
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>
              <Card size="small" title="Deductions">
                <Form.List name="deductions">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => {
                        // Get the initial value to determine if this is PF
                        const initialValues = form.getFieldValue(['deductions', name]);
                        const isPF = String(initialValues?.name || '').trim().toUpperCase() === 'PROVIDENT FUND';
                        const isESI = String(initialValues?.name || '').trim().toUpperCase() === 'ESI';
                        const isPT = String(initialValues?.name || '').trim().toUpperCase() === 'PROFESSIONAL TAX';

                        if (isPF) {
                          return (
                            <div key={key} style={{ marginBottom: 16, padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                              <Row gutter={8} style={{ marginBottom: 8 }}>
                                <Col span={22}>
                                  <Form.Item
                                    {...rest}
                                    name={[name, 'name']}
                                    rules={[{ required: true, message: 'Name' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="PROVIDENT FUND" />
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Button danger onClick={() => remove(name)} size="small">
                                    X
                                  </Button>
                                </Col>
                              </Row>
                              <Row gutter={8}>
                                <Col span={12}>
                                  <Form.Item
                                    label="Employee Contribution (%)"
                                    {...rest}
                                    name={[name, 'amount']}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      max={100}
                                      style={{ width: '100%' }}
                                      placeholder="12%"
                                      addonAfter="%"
                                    />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item
                                    label="Employer Contribution (%)"
                                    {...rest}
                                    name={[name, 'employerAmount']}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      max={100}
                                      style={{ width: '100%' }}
                                      placeholder="12%"
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
                            <div key={key} style={{ marginBottom: 16, padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                              <Row gutter={8} style={{ marginBottom: 8 }}>
                                <Col span={22}>
                                  <Form.Item
                                    {...rest}
                                    name={[name, 'name']}
                                    rules={[{ required: true, message: 'Name' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="PROFESSIONAL TAX" />
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Button danger onClick={() => remove(name)} size="small">
                                    X
                                  </Button>
                                </Col>
                              </Row>

                              <Form.List name={[name, 'slabs']}>
                                {(slabFields, { add: addSlab, remove: removeSlab }) => (
                                  <>
                                    {slabFields.map(({ key: sKey, name: sName, ...sRest }) => (
                                      <Row key={sKey} gutter={8} style={{ marginBottom: 8 }}>
                                        <Col span={7}>
                                          <Form.Item
                                            label={sName === 0 ? 'From (₹)' : ''}
                                            {...sRest}
                                            name={[sName, 'min']}
                                            style={{ marginBottom: 0 }}
                                          >
                                            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                                          </Form.Item>
                                        </Col>
                                        <Col span={7}>
                                          <Form.Item
                                            label={sName === 0 ? 'To (₹)' : ''}
                                            {...sRest}
                                            name={[sName, 'max']}
                                            style={{ marginBottom: 0 }}
                                          >
                                            <InputNumber min={0} style={{ width: '100%' }} placeholder="max" />
                                          </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                          <Form.Item
                                            label={sName === 0 ? 'PT Amount (₹)' : ''}
                                            {...sRest}
                                            name={[sName, 'amount']}
                                            style={{ marginBottom: 0 }}
                                          >
                                            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                                          </Form.Item>
                                        </Col>
                                        <Col span={2} style={{ display: 'flex', alignItems: 'end' }}>
                                          <Button danger onClick={() => removeSlab(sName)} size="small">
                                            X
                                          </Button>
                                        </Col>
                                      </Row>
                                    ))}
                                    <Button
                                      type="dashed"
                                      onClick={() => addSlab({ min: 0, max: null, amount: 0 })}
                                      icon={<PlusOutlined />}
                                    >
                                      Add Slab
                                    </Button>
                                  </>
                                )}
                              </Form.List>
                            </div>
                          );
                        }

                        if (isESI) {
                          return (
                            <div key={key} style={{ marginBottom: 16, padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                              <Row gutter={8} style={{ marginBottom: 8 }}>
                                <Col span={22}>
                                  <Form.Item
                                    {...rest}
                                    name={[name, 'name']}
                                    rules={[{ required: true, message: 'Name' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Input placeholder="ESI" />
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Button danger onClick={() => remove(name)} size="small">
                                    X
                                  </Button>
                                </Col>
                              </Row>
                              <Row gutter={8}>
                                <Col span={12}>
                                  <Form.Item
                                    label="Employee Contribution (%)"
                                    {...rest}
                                    name={[name, 'amount']}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      max={100}
                                      style={{ width: '100%' }}
                                      placeholder="0%"
                                      addonAfter="%"
                                    />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item
                                    label="Employer Contribution (%)"
                                    {...rest}
                                    name={[name, 'employerAmount']}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber
                                      min={0}
                                      max={100}
                                      style={{ width: '100%' }}
                                      placeholder="0%"
                                      addonAfter="%"
                                    />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </div>
                          );
                        }

                        return (
                          <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                            <Col span={14}>
                              <Form.Item
                                {...rest}
                                name={[name, 'name']}
                                rules={[{ required: true, message: 'Name' }]}
                              >
                                <Input placeholder="Enter deduction name" />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item {...rest} name={[name, 'amount']}>
                                <InputNumber
                                  min={0}
                                  style={{ width: '100%' }}
                                  placeholder="0"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={2}>
                              <Button danger onClick={() => remove(name)}>
                                X
                              </Button>
                            </Col>
                          </Row>
                        );
                      })}
                      <Button type="dashed" onClick={() => add({ name: '', amount: 0 })} icon={<PlusOutlined />}>
                        Add More
                      </Button>
                    </>
                  )}
                </Form.List>
              </Card>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
