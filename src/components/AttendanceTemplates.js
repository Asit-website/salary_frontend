import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Button, Input, Select, Typography, Space, Tag, Modal, Form, Radio, Switch, message, Dropdown } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const TemplateCard = ({ name, status, createdBy, assigned, onMenu }) => {
  const items = [
    { key: 'edit', label: 'Edit' },
    { key: 'assign', label: 'Assign Staff' },
  ];
  return (
    <Card bordered hoverable>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Text strong>{name}</Text>
          <Space>
            {/* <Tag color={status === 'Draft' ? 'default' : 'blue'}>{status}</Tag> */}
            <Dropdown menu={{ items, onClick: ({ key }) => onMenu?.(key) }} trigger={[ 'click' ]}>
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>Created by: {createdBy}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>Assigned Staff: {assigned}</Text>
      </Space>
    </Card>
  );
};

export default function AttendanceTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [form] = Form.useForm();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningTpl, setAssigningTpl] = useState(null);
  const [editingTpl, setEditingTpl] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [assignedStaffIds, setAssignedStaffIds] = useState([]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings/attendance-templates');
      setTemplates(res.data?.data || []);
    } catch (e) {
      setTemplates([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTemplates(); }, []);

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      name: '',
      attendance_mode: 'mark_present_by_default',
      track_in_out_enabled: true,
      require_punch_out: false,
      allow_multiple_punches: false,
      mark_absent_prev_days_enabled: false,
      holidays_rule: 'disallow',
      effective_hours_rule: 'none'
    });
    setOpenCreate(true);
  };

  const saveTemplate = async () => {
    try {
      const v = await form.validateFields();
      // Backend expects snake_case fields
      const payload = {
        name: v.name,
        attendance_mode: v.attendance_mode,
        holidays_rule: v.holidays_rule,
        track_in_out_enabled: !!v.track_in_out_enabled,
        require_punch_out: !!v.require_punch_out,
        allow_multiple_punches: !!v.allow_multiple_punches,
        mark_absent_prev_days_enabled: !!v.mark_absent_prev_days_enabled,
        mark_absent_rule: v.mark_absent_rule || null,
        effective_hours_rule: v.effective_hours_rule || null,
      };
      if (editingTpl) {
        await api.put(`/admin/settings/attendance-templates/${editingTpl.id}`, payload);
        message.success('Template updated');
      } else {
        await api.post('/admin/settings/attendance-templates', payload);
        message.success('Template created');
      }
      setOpenCreate(false);
      setEditingTpl(null);
      loadTemplates();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to create template');
    }
  };

  const openAssign = async (tpl) => {
    try {
      setAssigningTpl(tpl);
      setAssignOpen(true);
      // Load staff list
      const [staffRes, asgRes] = await Promise.all([
        api.get('/admin/staff'),
        api.get(`/admin/settings/attendance-templates/${tpl.id}/assignments`)
      ]);
      setStaffOptions((staffRes.data?.data || []).map(s => ({ label: s.name, value: s.id })));
      setAssignedStaffIds(asgRes.data?.staffIds || []);
    } catch (e) {
      message.error('Failed to load staff/assignments');
    }
  };

  const openEdit = (tpl) => {
    setEditingTpl(tpl);
    form.resetFields();
    // Support both camelCase and snake_case coming from backend
    const get = (snake, camel, def) => (tpl[snake] !== undefined ? tpl[snake] : (tpl[camel] !== undefined ? tpl[camel] : def));
    form.setFieldsValue({
      name: get('name','name',''),
      attendance_mode: get('attendance_mode','attendanceMode','mark_present_by_default'),
      holidays_rule: get('holidays_rule','holidaysRule','disallow'),
      track_in_out_enabled: get('track_in_out_enabled','trackInOutEnabled', true),
      require_punch_out: get('require_punch_out','requirePunchOut', false),
      allow_multiple_punches: get('allow_multiple_punches','allowMultiplePunches', false),
      mark_absent_prev_days_enabled: get('mark_absent_prev_days_enabled','markAbsentPrevDaysEnabled', false),
      mark_absent_rule: get('mark_absent_rule','markAbsentRule', undefined),
      effective_hours_rule: get('effective_hours_rule','effectiveHoursRule', 'none'),
    });
    setOpenCreate(true);
  };

  const saveAssign = async () => {
    try {
      await api.post(`/admin/settings/attendance-templates/${assigningTpl.id}/assign`, { staffIds: assignedStaffIds });
      message.success('Staff assigned');
      setAssignOpen(false);
      setAssigningTpl(null);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to assign');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0, lineHeight: 1 }}>Attendance Templates</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>New Template</Button>
        </Header>
        <Content style={{ padding: 24 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card bodyStyle={{ padding: 12 }}>
              <Space wrap>
                <Input.Search placeholder="Search templates..." allowClear style={{ width: 280 }} />
                <Select defaultValue="All Statuses" style={{ width: 160 }}
                  options={[{ value: 'All Statuses', label: 'All Statuses' }]} />
                <Select defaultValue="Name | A-Z" style={{ width: 140 }}
                  options={[{ value: 'Name | A-Z', label: 'Name | A-Z' }, { value: 'Name | Z-A', label: 'Name | Z-A' }]} />
              </Space>
            </Card>
            <Row gutter={[16, 16]}>
              {(templates || []).map((t) => (
                <Col key={t.id} xs={24} sm={12} lg={8}>
                  <TemplateCard
                    name={t.name || 'Template'}
                    status={t.status || 'Active'}
                    createdBy={t.createdBy || 'Admin'}
                    assigned={(t.assignedCount ? `${t.assignedCount} Staffs` : '')}
                    onMenu={(key) => key === 'edit' ? openEdit(t) : openAssign(t)}
                  />
                </Col>
              ))}
            </Row>
          </Space>
        </Content>

        {/* Create Template Modal */}
        <Modal title={editingTpl ? 'Edit Template' : 'Create Template'} open={openCreate} onCancel={() => { setOpenCreate(false); setEditingTpl(null); }} onOk={saveTemplate} okText="Save">
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter template name' }]}>
              <Input placeholder="Enter Template Name" />
            </Form.Item>
            <Card title="Settings" size="small" style={{ marginBottom: 12 }}>
              <Form.Item name="attendance_mode" label="Attendance Mode">
                <Radio.Group style={{ display:'grid', gap:8 }}>
                  <Radio value="mark_present_by_default">Mark Present by Default</Radio>
                  <Radio value="manual">Manual Attendance</Radio>
                  <Radio value="location_based">Location Based</Radio>
                  <Radio value="selfie_location">Selfie & Location Based</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="holidays_rule" label="Attendance on Holidays">
                <Radio.Group style={{ display:'grid', gap:8 }}>
                  <Radio value="disallow">Do NOT Allow attendance on paid holidays</Radio>
                  <Radio value="comp_off">Comp Off</Radio>
                  <Radio value="allow">Allow attendance on paid holidays</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Track In & Out Time" valuePropName="checked" name="track_in_out_enabled">
                <Switch />
              </Form.Item>
              <Form.Item label="No attendance without punch-out" valuePropName="checked" name="require_punch_out">
                <Switch />
              </Form.Item>
              <Form.Item label="Allow Multiple Punches" valuePropName="checked" name="allow_multiple_punches">
                <Switch />
              </Form.Item>
              <Form.Item label="Mark Absent on Previous Days" valuePropName="checked" name="mark_absent_prev_days_enabled">
                <Switch />
              </Form.Item>
              {/* Mark Absent Rule disabled as requested */}
              <Form.Item name="effective_hours_rule" label="Effective Working Hours">
                <Select options={[
                  { value: 'none', label: 'Do not show' },
                  { value: 'rule1', label: 'Rule 1 • Overtime and paid breaks will be deducted from the total time' },
                  { value: 'rule2', label: 'Rule 2 • Total time only, no deductions' },
                  { value: 'rule3', label: 'Rule 3 • Overtime will be deducted from total time' },
                  { value: 'rule4', label: 'Rule 4 • All breaks will be deducted from total time' },
                ]} />
              </Form.Item>
            </Card>
          </Form>
        </Modal>

        {/* Assign Staff Modal */}
        <Modal title={assigningTpl ? `Assign Staff • ${assigningTpl.name || ''}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Save">
          <Select
            mode="multiple"
            options={staffOptions}
            value={assignedStaffIds}
            onChange={setAssignedStaffIds}
            style={{ width: '100%' }}
            placeholder="Select staff to assign"
          />
        </Modal>
      </Layout>
    </Layout>
  );
}
