import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, Select, DatePicker, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const MONTHS = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];

function monthToNum(name){
  const i = MONTHS.findIndex(m => m === name);
  return i >= 0 ? i+1 : null;
}

const TemplateCard = ({ tpl, onEdit, onAssign }) => (
  <Card bordered hoverable>
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Text strong>{tpl.name}</Text>
        <Space>
          <Tag color={tpl.active ? 'green' : 'red'}>{tpl.active ? 'Active' : 'Inactive'}</Tag>
          <Button size="small" onClick={() => onAssign?.(tpl)}>Assign</Button>
          <Button size="small" icon={<MoreOutlined />} onClick={() => onEdit?.(tpl)} />
        </Space>
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>Holidays: {(tpl.holidays || []).length}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>Assigned Staff: {tpl.assignedCount || 0}</Text>
    </Space>
  </Card>
);

export default function HolidayTemplates(){
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

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/holidays/templates');
      setList(res.data?.templates || []);
    } catch (e) {
      message.error('Failed to load holiday templates');
      setList([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      startMonth: null,
      endMonth: null,
      active: true,
      holidays: [],
    });
    setOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    form.resetFields();
    form.setFieldsValue({
      name: tpl.name,
      startMonth: tpl.startMonth || null,
      endMonth: tpl.endMonth || null,
      active: tpl.active !== false,
      holidays: (tpl.holidays || []).map(h => ({ name: h.name, date: dayjs(h.date), active: h.active !== false })),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        name: v.name,
        startMonth: v.startMonth || null,
        endMonth: v.endMonth || null,
        active: v.active !== false,
        holidays: (v.holidays || []).filter(Boolean).map(h => ({ name: h.name, date: h.date?.format?.('YYYY-MM-DD'), active: h.active !== false })),
      };
      if (editing) {
        await api.put(`/admin/holidays/templates/${editing.id}` , payload);
        message.success('Template updated');
      } else {
        await api.post('/admin/holidays/templates', payload);
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
      await api.post('/admin/holidays/assign', { userIds: selectedStaffIds, holidayTemplateId: assigningTpl.id, effectiveFrom: fromStr, effectiveTo: toStr });
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background:'#fff', borderBottom: '1px solid #eee', padding: '12px 24px', display:'flex', alignItems:'center', gap:8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
          <Title level={4} style={{ margin: 0, flex: 1 }}>Holiday Templates</Title>
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
                <TemplateCard tpl={t} onEdit={openEdit} onAssign={openAssign} />
              </Col>
            ))}
          </Row>
        </Content>

        {/* Create/Edit Modal */}
        <Modal title={editing ? 'Edit Holiday Template' : 'Create Holiday Template'} open={open} onCancel={() => { setOpen(false); setEditing(null); }} onOk={save} okText="Save">
          <Form layout="vertical" form={form}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}> 
              <Input placeholder="Template Name" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="startMonth" label="Start Month">
                  <Select placeholder="Select month" allowClear options={MONTHS.map((m,i)=>({ label:m, value:i+1 }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="endMonth" label="End Month">
                  <Select placeholder="Select month" allowClear options={MONTHS.map((m,i)=>({ label:m, value:i+1 }))} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="active" label="Status" initialValue={true}>
              <Select options={[{ value:true, label:'Active' }, { value:false, label:'Inactive' }]} />
            </Form.Item>

            <Form.Item label="List of Holidays" shouldUpdate>
              <Form.List name="holidays">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                        <Col span={10}>
                          <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Holiday name required' }]}>
                            <Input placeholder="Holiday Name" />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item {...rest} name={[name, 'date']} rules={[{ required: true, message: 'Date required' }]}>
                            <DatePicker style={{ width:'100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Button danger onClick={() => remove(name)}>Delete</Button>
                        </Col>
                      </Row>
                    ))}
                    <Button type="dashed" block onClick={() => add({ name:'', date:null })}>+ Add Holiday</Button>
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
      </Layout>
    </Layout>
  );
}
