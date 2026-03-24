import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, Select, DatePicker, message, Table, Popconfirm } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];
const WEEK_COLS = [
  { label: 'All', value: 'all' },
  { label: '1st', value: 1 },
  { label: '2nd', value: 2 },
  { label: '3rd', value: 3 },
  { label: '4th', value: 4 },
  { label: '5th', value: 5 },
];

function normalizeWeeksInput(input) {
  const arr = Array.isArray(input) ? input : (input == null ? [] : [input]);
  const normalized = arr
    .map((w) => (typeof w === 'string' ? w.trim().toLowerCase() : w))
    .filter((w) => w !== '' && w !== null && w !== undefined);
  const nums = [...new Set(normalized.map((w) => Number(w)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5))];
  const hasAll = normalized.includes('all') || normalized.includes(0) || normalized.includes('0');
  if (hasAll && nums.length === 0) return 'all';
  if (hasAll && nums.length > 0) return nums;
  return nums;
}

function parseConfigArray(raw) {
  let cfg = raw;
  let guard = 0;
  while (typeof cfg === 'string' && guard < 3) {
    try {
      const p = JSON.parse(cfg);
      if (p === cfg) break;
      cfg = p;
      guard += 1;
    } catch { break; }
  }
  return Array.isArray(cfg) ? cfg : [];
}

function TemplateCard({ tpl, onEdit, onAssign }) {
  const summary = () => {
    const cfg = parseConfigArray(tpl.config);

    const parts = cfg.map((c) => {
      const d =
        DAYS.find((x) => x.value === Number(c.day))?.label || c.day;

      const w =
        c.weeks === "all"
          ? "All weeks"
          : Array.isArray(c.weeks)
            ? c.weeks.join(",")
            : "";

      return `${d}: ${w}`;
    });

    return parts.join(" • ");
  };

  return (
    <Card bordered hoverable>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text strong>{tpl.name}</Text>

          <Space>
            <Tag color={tpl.active ? "green" : "red"}>
              {tpl.active ? "Active" : "Inactive"}
            </Tag>

            <Button size="small" onClick={() => onAssign?.openAssign?.(tpl)}>
              Assign
            </Button>

            <Button size="small" onClick={() => onEdit?.(tpl)}>
              Edit
            </Button>
          </Space>
        </div>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {summary()}
        </Text>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Assigned Staff:</Text>
          <Tag color="blue" style={{ cursor: 'pointer', margin: 0 }} onClick={() => onAssign?.openAssignedList?.(tpl)}>
            {tpl.assignedCount || 0}
          </Tag>
        </div>
      </Space>
    </Card>
  );
}
export default function WeeklyOffTemplates() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningTpl, setAssigningTpl] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(null);
  const [effectiveTo, setEffectiveTo] = useState(null);
  const [q, setQ] = useState('');

  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedListTpl, setAssignedListTpl] = useState(null);
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/weekly-off/templates');
      const rows = Array.isArray(res.data?.templates) ? res.data.templates : [];
      setList(rows.map(t => ({
        ...t,
        config: parseConfigArray(t?.config),
      })));
    } catch (e) {
      message.error('Failed to load weekly off templates');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
    try {
      form.resetFields();
      form.setFieldsValue({
        name: '',
        active: true,
        config: [],
      });
    } catch (_) {}
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setOpen(true);
    try {
      const mappedCfg = parseConfigArray(tpl?.config).map(c => ({
        day: Number(c.day),
        weeks: normalizeWeeksInput(c.weeks) === 'all' ? ['all'] : normalizeWeeksInput(c.weeks),
      }));
      const values = {
        name: tpl?.name || '',
        active: tpl?.active !== false,
        config: mappedCfg.length > 0 ? mappedCfg : [{ day: 0, weeks: ['all'] }],
      };
      form.resetFields();
      form.setFieldsValue(values);
    } catch (_) {}
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        name: v.name,
        active: v.active !== false,
        config: (v.config || []).map(c => {
          const weeks = normalizeWeeksInput(c.weeks);
          return { day: Number(c.day), weeks };
        }),
      };
      if (editing) {
        await api.put(`/admin/weekly-off/templates/${editing.id}`, payload);
        message.success('Template updated');
      } else {
        await api.post('/admin/weekly-off/templates', payload);
        message.success('Template created');
      }
      setOpen(false); setEditing(null);
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save');
    }
  };

  const openAssign = async (tpl) => {
    try {
      setAssigningTpl(tpl);
      setAssignOpen(true);
      setSelectedStaffIds([]);
      setEffectiveFrom(null);
      setEffectiveTo(null);
      const staffRes = await api.get('/admin/staff');
      setStaffOptions((staffRes.data?.staff || staffRes.data?.data || []).map(s => ({ label: s.name || `Staff ${s.id}`, value: s.id })));
    } catch (e) {
      message.error('Failed to load staff');
    }
  };

  const saveAssign = async () => {
    try {
      if (!assigningTpl) return;
      if (selectedStaffIds.length === 0) return message.warning('Select at least one staff');
      if (!effectiveFrom) return message.warning('Select effective from date');
      const fromStr = effectiveFrom.format('YYYY-MM-DD');
      const toStr = effectiveTo ? effectiveTo.format('YYYY-MM-DD') : null;
      await api.post('/admin/weekly-off/assign', { userIds: selectedStaffIds, weeklyOffTemplateId: assigningTpl.id, effectiveFrom: fromStr, effectiveTo: toStr });
      message.success('Assigned');
      setAssignOpen(false);
      setAssigningTpl(null);
      setSelectedStaffIds([]);
      setEffectiveFrom(null);
      setEffectiveTo(null);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to assign');
    }
  };

  const openAssignedList = async (tpl, keepOpen = false) => {
    try {
      setAssignedListTpl(tpl);
      if (!keepOpen) setAssignedListOpen(true);
      setAssignedListLoading(true);
      const res = await api.get(`/admin/weekly-off/templates/${tpl.id}/assignments`);
      setAssignedListRows(res?.data?.assignments || []);
    } catch (_) {
      setAssignedListRows([]);
      message.error('Failed to load assigned staff');
    } finally {
      setAssignedListLoading(false);
    }
  };

  const unassignStaff = async (assignmentId) => {
    try {
      await api.delete(`/admin/weekly-off/assign/${assignmentId}`);
      message.success('Staff unassigned');
      if (assignedListTpl?.id) await openAssignedList(assignedListTpl, true);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to unassign staff');
    }
  };

  const filtered = (list || []).filter(t => !q || String(t.name).toLowerCase().includes(String(q).toLowerCase()));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
          <Title level={4} style={{ margin: 0, flex: 1 }}>Weekly Off Templates</Title>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Template</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 16 }}>
            <Space>
              <Input.Search placeholder="Search templates..." allowClear style={{ width: 280 }} value={q} onChange={e => setQ(e.target.value)} />
            </Space>
          </Card>
          <Row gutter={[16, 16]}>
            {(filtered || []).map((t) => (
              <Col key={t.id} xs={24} sm={12} lg={8}>
                <TemplateCard tpl={t} onEdit={openEdit} onAssign={{ openAssign, openAssignedList }} />
              </Col>
            ))}
          </Row>
        </Content>

        {/* Create/Edit Modal */}
        <Modal key={editing?.id || 'create'} title={editing ? 'Edit Weekly Off Template' : 'Create Weekly Off Template'} open={open} onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }} onOk={save} okText="Save" width={720}>
          <Form 
            key={editing?.id ? `edit-${editing.id}` : 'create'}
            layout="vertical" 
            form={form}
            initialValues={{
              name: editing?.name || '',
              active: editing?.active !== false ? true : false,
              config: editing ? (() => {
                const mapped = parseConfigArray(editing?.config).map(c => ({
                  day: Number(c.day),
                  weeks: normalizeWeeksInput(c.weeks) === 'all' ? ['all'] : normalizeWeeksInput(c.weeks),
                }));
                return mapped.length > 0 ? mapped : [{ day: 0, weeks: ['all'] }];
              })() : [],
            }}
          >
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
                  <Input placeholder="Weekly Off" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="active" label="Status" initialValue={true}>
                  <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
                </Form.Item>
              </Col>
            </Row>

            <Form.List name="config">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Card key={key} size="small" style={{ marginBottom: 8 }}>
                      <Row gutter={8}>
                        <Col span={10}>
                          <Form.Item {...rest} name={[name, 'day']} label="Day" rules={[{ required: true }]}>
                            <Select options={DAYS} />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item {...rest} name={[name, 'weeks']} label="Weeks" rules={[{ required: true }]}>
                            <Select mode="multiple" options={WEEK_COLS} placeholder="All or select weeks" />
                          </Form.Item>
                        </Col>
                        <Col span={4} style={{ display: 'flex', alignItems: 'end' }}>
                          <Button icon={<DeleteOutlined />} danger onClick={() => remove(name)}>Remove</Button>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button type="dashed" block onClick={() => add({ day: 0, weeks: ['all'] })}>+ Add Weekly Off Rule</Button>
                </>
              )}
            </Form.List>
          </Form>
        </Modal>

        {/* Assign Modal */}
        <Modal title={assigningTpl ? `Assign Staff â€¢ ${assigningTpl.name}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Assign">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Select
              mode="multiple"
              options={staffOptions}
              value={selectedStaffIds}
              onChange={setSelectedStaffIds}
              style={{ width: '100%' }}
              placeholder="Select staff to assign"
            />
            <Row gutter={8}>
              <Col span={12}><DatePicker value={effectiveFrom} onChange={setEffectiveFrom} style={{ width: '100%' }} placeholder="Effective from" /></Col>
              <Col span={12}><DatePicker value={effectiveTo} onChange={setEffectiveTo} style={{ width: '100%' }} placeholder="Effective to (optional)" /></Col>
            </Row>
          </Space>
        </Modal>

        {/* Assigned Staff List Modal */}
        <Modal
          title={`Assigned Staff${assignedListTpl ? ` - ${assignedListTpl.name}` : ''}`}
          open={assignedListOpen}
          onCancel={() => setAssignedListOpen(false)}
          footer={null}
          width={1000}
        >
          <Table
            rowKey="id"
            loading={assignedListLoading}
            dataSource={assignedListRows}
            size="small"
            pagination={{ pageSize: 8 }}
            columns={[
              { title: 'Name', render: (_, r) => r.user?.profile?.name || '-' },
              { title: 'Staff ID', render: (_, r) => r.user?.profile?.staffId || '-' },
              { title: 'Phone', render: (_, r) => r.user?.phone || '-' },
              { title: 'Department', render: (_, r) => r.user?.profile?.department || '-' },
              { title: 'Designation', render: (_, r) => r.user?.profile?.designation || '-' },
              { title: 'Effective From', dataIndex: 'effectiveFrom', render: (v) => v || '-' },
              {
                title: 'Action',
                key: 'action',
                render: (_, r) => (
                  <Popconfirm title="Unassign this staff?" onConfirm={() => unassignStaff(r.id)}>
                    <Button danger size="small">Unassign</Button>
                  </Popconfirm>
                )
              },
            ]}
          />
        </Modal>
      </Layout>
    </Layout>
  );
}
