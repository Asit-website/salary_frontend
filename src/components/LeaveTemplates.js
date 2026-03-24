import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, Select, InputNumber, DatePicker, message, Switch, Radio } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MoreOutlined, DeleteOutlined } from '@ant-design/icons';
import { Table, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const CYCLE_OPTIONS = [
  { label: 'Yearly', value: 'yearly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
];

const UNUSED_RULE_OPTIONS = [
  { label: 'Lapse', value: 'lapse' },
  { label: 'Carry Forward', value: 'carry' },
  { label: 'Encash', value: 'encash' },
];

const TemplateCard = ({ tpl, onEdit, onAssign }) => (
  <Card bordered hoverable>
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Text strong>{tpl.name}</Text>
        <Space>
          <Tag color={tpl.active ? 'green' : 'red'}>{tpl.active ? 'Active' : 'Inactive'}</Tag>
          <Button size="small" onClick={() => onAssign?.openAssign?.(tpl)}>Assign</Button>
          <Button size="small" icon={<MoreOutlined />} onClick={() => onEdit?.(tpl)} />
        </Space>
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>Total Leaves: {(tpl.categories || []).reduce((s,c)=> s + Number(c.leaveCount || 0), 0)}</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Assigned Staff:</Text>
        <Tag color="blue" style={{ cursor: 'pointer', margin: 0 }} onClick={() => onAssign?.openAssignedList?.(tpl)}>
          {tpl.assignedCount || 0}
        </Tag>
      </div>
    </Space>
  </Card>
);

export default function LeaveTemplates(){
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

  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedListTpl, setAssignedListTpl] = useState(null);
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/leave/templates');
      setList(res.data?.templates || []);
    } catch (e) {
      message.error('Failed to load leave templates');
      setList([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      cycle: 'yearly',
      countSandwich: false,
      approvalLevel: 1,
      active: true,
      categories: [],
    });
    setOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    form.resetFields();
    form.setFieldsValue({
      name: tpl.name,
      cycle: tpl.cycle || 'yearly',
      countSandwich: !!tpl.countSandwich,
      approvalLevel: tpl.approvalLevel || 1,
      active: tpl.active !== false,
      categories: (tpl.categories || []).map(c => ({
        key: c.key,
        name: c.name,
        leaveCount: Number(c.leaveCount || 0),
        unusedRule: c.unusedRule || 'lapse',
        carryLimitDays: c.carryLimitDays == null ? null : Number(c.carryLimitDays),
        encashLimitDays: c.encashLimitDays == null ? null : Number(c.encashLimitDays),
        carryForward: c.carryForward === true || c.carryForward === 1 || c.carry_forward === true || c.carry_forward === 1,
      })),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        name: v.name,
        cycle: v.cycle,
        countSandwich: !!v.countSandwich,
        approvalLevel: Number(v.approvalLevel || 1),
        active: v.active !== false,
        categories: (v.categories || []).filter(Boolean).map(c => ({
          key: c.key,
          name: c.name,
          leaveCount: Number(c.leaveCount || 0),
          unusedRule: c.unusedRule || 'lapse',
          carryLimitDays: c.carryLimitDays == null ? null : Number(c.carryLimitDays),
          encashLimitDays: c.encashLimitDays == null ? null : Number(c.encashLimitDays),
          carryForward: !!c.carryForward,
        })),
      };
      if (editing) {
        await api.put(`/admin/leave/templates/${editing.id}`, payload);
        await api.post(`/admin/leave/templates/${editing.id}/categories-bulk`, { categories: payload.categories });
        message.success('Template updated');
      } else {
        await api.post('/admin/leave/templates', payload);
        message.success('Template created');
      }
      setOpen(false); setEditing(null);
      await load();
    } catch (e) {
      if (e?.errorFields) return; // validation error
      message.error(e?.response?.data?.message || 'Failed to save template');
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
      await api.post('/admin/leave/assign', { userIds: selectedStaffIds, leaveTemplateId: assigningTpl.id, effectiveFrom: fromStr, effectiveTo: toStr });
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
      const res = await api.get(`/admin/leave/templates/${tpl.id}/assignments`);
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
      await api.delete(`/admin/leave/assign/${assignmentId}`);
      message.success('Staff unassigned');
      if (assignedListTpl?.id) await openAssignedList(assignedListTpl, true);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to unassign staff');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background:'#fff', borderBottom: '1px solid #eee', padding: '12px 24px', display:'flex', alignItems:'center', gap:8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
          <Title level={4} style={{ margin: 0, flex: 1 }}>Leave Templates</Title>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Template</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 16 }}>
            <Space>
              <Input.Search placeholder="Search templates..." allowClear style={{ width: 280 }} />
            </Space>
          </Card>
          <Row gutter={[16, 16]}>
            {(list || []).map((t) => (
              <Col key={t.id} xs={24} sm={12} lg={8}>
                <TemplateCard tpl={t} onEdit={openEdit} onAssign={{ openAssign, openAssignedList }} />
              </Col>
            ))}
          </Row>
        </Content>

        {/* Create/Edit Modal */}
        <Modal title={editing ? 'Edit Leave Template' : 'Create Leave Template'} open={open} onCancel={() => { setOpen(false); setEditing(null); }} onOk={save} okText="Save" width={720}>
          <Form layout="vertical" form={form}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="name" label="Template Name" rules={[{ required: true }]}> 
                  <Input placeholder="Leave Policy" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cycle" label="Leave Policy Cycle" rules={[{ required: true }]}> 
                  <Select options={CYCLE_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="countSandwich" label="Count Sandwich Leaves">
                  <Select options={[{ value:true, label:'Yes' }, { value:false, label:'No' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="active" label="Status" initialValue={true}>
              <Select options={[{ value:true, label:'Active' }, { value:false, label:'Inactive' }]} />
            </Form.Item>

            <Form.Item label="Leave Categories" shouldUpdate>
              <Form.List name="categories">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Card key={key} size="small" style={{ marginBottom: 8 }}>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item {...rest} name={[name, 'name']} label="Name" rules={[{ required: true }]}>
                              <Input placeholder="Casual Leave" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item {...rest} name={[name, 'key']} label="Key" rules={[{ required: true }]}> 
                              <Input placeholder="CL" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item {...rest} name={[name, 'leaveCount']} label="Leave Count" rules={[{ required: true }]}> 
                              <InputNumber min={0} step={0.5} style={{ width:'100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={4} style={{ display:'flex', alignItems:'end' }}>
                            <Button icon={<DeleteOutlined />} danger onClick={() => remove(name)}>Remove</Button>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item {...rest} name={[name, 'carryForward']} label="Carry Forward" valuePropName="checked">
                              <Switch />
                            </Form.Item>
                          </Col>
                        </Row>
                        {/* 
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item {...rest} name={[name, 'unusedRule']} label="Unused Leave Rule" initialValue={'lapse'}>
                              <Select options={UNUSED_RULE_OPTIONS} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item {...rest} name={[name, 'carryLimitDays']} label="Carry Forward Limit (days)">
                              <InputNumber min={0} step={0.5} style={{ width:'100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item {...rest} name={[name, 'encashLimitDays']} label="Encashment/Car. Days">
                              <InputNumber min={0} step={0.5} style={{ width:'100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        */}
                      </Card>
                    ))}
                    <Button type="dashed" block onClick={() => add({ name:'', key:'', leaveCount:0, unusedRule:'lapse' })}>+ Add Leave Category</Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Form>
        </Modal>

        {/* Assign Modal */}
        <Modal title={assigningTpl ? `Assign Staff • ${assigningTpl.name}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Assign">
          <Space direction="vertical" style={{ width:'100%' }} size={12}>
            <Select
              mode="multiple"
              options={staffOptions}
              value={selectedStaffIds}
              onChange={setSelectedStaffIds}
              style={{ width: '100%' }}
              placeholder="Select staff to assign"
            />
            <Row gutter={8}>
              <Col span={12}><DatePicker value={effectiveFrom} onChange={setEffectiveFrom} style={{ width:'100%' }} placeholder="Effective from" /></Col>
              <Col span={12}><DatePicker value={effectiveTo} onChange={setEffectiveTo} style={{ width:'100%' }} placeholder="Effective to (optional)" /></Col>
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
