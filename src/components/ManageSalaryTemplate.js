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
    'basic_salary',
    'hra',
    'da',
    'special_allowance',
    'conveyance_allowance',
    'medical_allowance',
    'other_allowances',
    'travel_allowance',
  ];
  const defaultDeductionsList = [
    'provident_fund',
    'esi',
    'professional_tax',
    'income_tax',
    'loan_deduction',
    'other_deductions',
  ];

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    const defaultEarnings = defaultEarningsList.map((k) => ({ name: k, amount: 0 }));
    // const defaultDeductions = defaultDeductionsList.map((k) => ({ name: k, amount: 0 }));
    const defaultDeductions = defaultDeductionsList.map((k) => ({
      name: k,
      amount: k === 'provident_fund' ? undefined : 0
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
        if (Array.isArray(val)) return val;
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
      let dEntries = toArray(rawDed).map((it) => ({
        name: it.key || it.name || '',
        amount: Number(it.valueNumber ?? it.value ?? 0),
      }));
      dEntries = dEntries.map(it => it.name === 'provident_fund' ? { ...it, amount: undefined } : it);

      // Backfill defaults if empty
      if (!eEntries.length) eEntries = defaultEarningsList.map((k) => ({ name: k, amount: 0 }));
      if (!dEntries.length) dEntries = defaultDeductionsList.map((k) => ({ name: k, amount: 0 }));

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
          .map((it) => ({ name: String(it?.name || '').trim(), amount: Number(it?.amount || 0) }))
          .filter((it) => it.name)
          .map((it) => {
            if (isDeduction && it.name === 'provident_fund') {
              // PF = 12% of basic_salary
              return {
                key: 'provident_fund',
                label: 'Provident Fund (PF)',
                type: 'percent',
                valueNumber: 12,
                meta: { basedOn: 'basic_salary' },
              };
            }
            return {
              key: it.name,
              label: it.name.replace(/_/g, ' '),
              type: 'fixed',
              valueNumber: it.amount,
            };
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
          <Dropdown menu={{ items, onClick }} trigger={['click']}>
            <Button icon={<MoreOutlined />}>More</Button>
          </Dropdown>
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
                              <Input placeholder="e.g. basic_salary" />
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
                      {fields.map(({ key, name, ...rest }) => (
                        <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                          <Col span={14}>
                            <Form.Item
                              {...rest}
                              name={[name, 'name']}
                              rules={[{ required: true, message: 'Name' }]}
                            >
                              <Input placeholder="e.g. provident_fund" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            {/* <Form.Item {...rest} name={[name, 'amount']}>
                              <InputNumber disabled min={0} style={{ width: '100%' }} />
                            </Form.Item> */}
                            <Form.Item {...rest} name={[name, 'amount']}>
                              <InputNumber
                                disabled
                                min={0}
                                style={{ width: '100%' }}
                                placeholder={form.getFieldValue(['deductions', name, 'name']) === 'provident_fund' ? '12%' : undefined}
                              />
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
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}