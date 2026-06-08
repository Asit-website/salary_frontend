import React, { useEffect, useState, useMemo, Fragment } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, Select, TimePicker, InputNumber, DatePicker, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';
import { useNavigate } from 'react-router-dom';


const { Content } = Layout;
const { Title, Text } = Typography;

function timeFromStr(v) { return v ? dayjs(v, 'HH:mm:ss') : null; }
function toHHmmss(v) { return v ? dayjs(v).format('HH:mm:ss') : null; }

const TemplateCard = ({ tpl, onEdit, onAssign }) => {
  const typeColor = tpl.shiftType === 'open' ? '#722ed1' : '#52c41a';
  return (
    <Card 
      className="sales-content-card" 
      style={{ height: '100%', borderRadius: '12px' }}
      bodyStyle={{ padding: '20px' }}
      hoverable
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b', textTransform: 'capitalize' }}>{tpl.name}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>Code: {tpl.code || '—'}</div>
          </div>
          <Space size={8}>
            <span style={{ 
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontSize: '10px', 
                fontWeight: '700', 
                color: typeColor, 
                backgroundColor: `${typeColor}12`, 
                border: `1px solid ${typeColor}30`,
                letterSpacing: '0.5px'
            }}>
              {(tpl.shiftType || 'fixed').toUpperCase()}
            </span>
            <Button 
              size="small" 
              shape="circle" 
              icon={<MoreOutlined style={{ fontSize: '13px' }} />} 
              onClick={() => onEdit?.(tpl)} 
            />
          </Space>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Shift Timing</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>
              {tpl.shiftType === 'open' ? (
                <>Duration: {tpl.workMinutes || 0} mins</>
              ) : (
                <>{tpl.startTime || '--:--'} - {tpl.endTime || '--:--'}</>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Buffer Allowed</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>{tpl.bufferMinutes || 0} mins</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Breaks Included</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>{(tpl.breaks || []).length} breaks</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default function ShiftSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const filteredList = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(t => (t.name || '').toLowerCase().includes(q) || (t.code || '').toLowerCase().includes(q));
  }, [list, search]);
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningTpl, setAssigningTpl] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/shifts/templates');
      setList(res.data?.templates || []);
    } catch (e) {
      message.error('Failed to load shifts');
      setList([]);
    } finally { setLoading(false); }
  };

  const openAssign = async (tpl) => {
    try {
      setAssigningTpl(tpl);
      setAssignOpen(true);
      setSelectedStaffIds([]);
      setEffectiveFrom(null);
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
      const dateStr = effectiveFrom.format('YYYY-MM-DD');
      await Promise.all(selectedStaffIds.map(uid => api.post('/admin/shifts/assign', { userId: uid, shiftTemplateId: assigningTpl.id, effectiveFrom: dateStr })));
      message.success('Assigned');
      setAssignOpen(false);
      setAssigningTpl(null);
      setSelectedStaffIds([]);
      setEffectiveFrom(null);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to assign');
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      shiftType: 'fixed',
      name: '',
      code: '',
      startTime: null,
      endTime: null,
      workMinutes: 480,
      workHours: 8,
      workMins: 0,
      bufferMinutes: 0,
      earliestPunchInTime: null,
      latestPunchOutTime: null,
      autoPunchoutAfterShiftEnd: null,
      minPunchOutAfterMinutes: null,
      maxPunchOutAfterMinutes: null,
      halfDayThresholdMinutes: null,
      overtimeStartMinutes: null,
      breaks: [],
    });
    setOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    form.resetFields();
    form.setFieldsValue({
      shiftType: tpl.shiftType || 'fixed',
      name: tpl.name || '',
      code: tpl.code || '',
      startTime: timeFromStr(tpl.startTime),
      endTime: timeFromStr(tpl.endTime),
      workMinutes: tpl.workMinutes || null,
      workHours: tpl.workMinutes ? Math.floor((tpl.workMinutes || 0) / 60) : 8,
      workMins: tpl.workMinutes ? ((tpl.workMinutes || 0) % 60) : 0,
      bufferMinutes: tpl.bufferMinutes || 0,
      earliestPunchInTime: timeFromStr(tpl.earliestPunchInTime),
      latestPunchOutTime: timeFromStr(tpl.latestPunchOutTime),
      autoPunchoutAfterShiftEnd: tpl.autoPunchoutAfterShiftEnd || null,
      minPunchOutAfterMinutes: tpl.minPunchOutAfterMinutes || null,
      maxPunchOutAfterMinutes: tpl.maxPunchOutAfterMinutes || null,
      halfDayThresholdMinutes: tpl.halfDayThresholdMinutes || null,
      overtimeStartMinutes: tpl.overtimeStartMinutes || null,
      breaks: (tpl.breaks || []).map(b => ({
        category: b.category || 'Casual Break',
        name: b.name || '',
        payType: b.payType || 'unpaid',
        breakType: b.breakType || 'duration',
        durationMinutes: b.durationMinutes || null,
        startTime: timeFromStr(b.startTime),
        endTime: timeFromStr(b.endTime),
        active: b.active !== false,
      })),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        shiftType: v.shiftType,
        name: v.name,
        code: v.code || undefined,
        startTime: v.shiftType !== 'open' ? toHHmmss(v.startTime) : null,
        endTime: v.shiftType !== 'open' ? toHHmmss(v.endTime) : null,
        workMinutes: v.shiftType === 'open' ? (Number(v.workHours || 0) * 60 + Number(v.workMins || 0)) : null,
        bufferMinutes: Number(v.bufferMinutes || 0),
        earliestPunchInTime: v.earliestPunchInTime ? toHHmmss(v.earliestPunchInTime) : null,
        latestPunchOutTime: v.latestPunchOutTime ? toHHmmss(v.latestPunchOutTime) : null,
        autoPunchoutAfterShiftEnd: v.autoPunchoutAfterShiftEnd != null ? Number(v.autoPunchoutAfterShiftEnd) : null,
        minPunchOutAfterMinutes: v.minPunchOutAfterMinutes != null ? Number(v.minPunchOutAfterMinutes) : null,
        maxPunchOutAfterMinutes: v.maxPunchOutAfterMinutes != null ? Number(v.maxPunchOutAfterMinutes) : null,
        halfDayThresholdMinutes: v.halfDayThresholdMinutes != null ? Number(v.halfDayThresholdMinutes) : null,
        overtimeStartMinutes: v.overtimeStartMinutes != null ? Number(v.overtimeStartMinutes) : null,
        breaks: (v.breaks || []).map(b => ({
          category: b.category || null,
          name: b.name || null,
          payType: b.payType || 'unpaid',
          breakType: b.breakType || 'duration',
          durationMinutes: b.breakType === 'duration' ? Number(b.durationMinutes || 0) : null,
          startTime: b.breakType === 'fixed_window' ? toHHmmss(b.startTime) : null,
          endTime: b.breakType === 'fixed_window' ? toHHmmss(b.endTime) : null,
          active: b.active !== false,
        })),
      };
      if (editing) {
        await api.put(`/admin/shifts/templates/${editing.id}`, payload);
        message.success('Shift updated');
      } else {
        await api.post('/admin/shifts/templates', payload);
        message.success('Shift created');
      }
      setOpen(false); setEditing(null); load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save shift');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Shift Settings" 
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

            {/* Elegant Search and Create Row */}
            <Card className="sales-content-card" bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <Input 
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Search templates..." 
                  allowClear 
                  style={{ width: 280, borderRadius: '20px' }} 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button 
                  type="primary" 
                  shape="round" 
                  icon={<PlusOutlined />} 
                  onClick={openCreate}
                  style={{ boxShadow: '0 2px 6px rgba(22, 119, 255, 0.15)' }}
                >
                  New Template
                </Button>
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              {(filteredList || []).map((t) => (
                <Col key={t.id} xs={24} sm={12} lg={8}>
                  <TemplateCard tpl={t} onEdit={openEdit} onAssign={openAssign} />
                </Col>
              ))}
            </Row>
          </Space>
        </Content>

        <Modal
          title={editing ? 'Edit Shift Template' : 'Create Shift Template'}
          open={open}
          onCancel={() => { setOpen(false); setEditing(null); }}
          onOk={save}
          okText="Save"
          width={800}
        >
          <Form layout="vertical" form={form}>

            <Form.Item name="shiftType" label="Shift Type" rules={[{ required: true }]}>
              <Select options={[
                { value: 'fixed', label: 'Fixed Shift' },
                { value: 'open', label: 'Open Shift' },
              ]} />
            </Form.Item>

            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="Shift Name" />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() =>
                form.getFieldValue('shiftType') !== 'open' && (
                  <Form.Item name="code" label="Shift Code">
                    <Input placeholder="Code" />
                  </Form.Item>
                )
              }
            </Form.Item>

            {/* SHIFT TIME */}
            <Card title="Shift Time" size="small" style={{ marginBottom: 12 }}>
              <Form.Item shouldUpdate noStyle>
                {() =>
                  form.getFieldValue('shiftType') !== 'open' ? (
                    <Space size={12} style={{ display: 'flex' }}>
                      <Form.Item name="startTime" label="Start Time" style={{ flex: 1 }}>
                        <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={5} />
                      </Form.Item>
                      <Form.Item
                        name="endTime"
                        label="End Time"
                        style={{ flex: 1 }}
                        dependencies={['startTime']}
                        rules={[
                          { required: true, message: 'Please select end time' },
                        ]}
                      >
                        <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={5} />
                      </Form.Item>
                    </Space>
                  ) : (
                    <>
                      <div style={{ marginBottom: 8, fontSize: 12, color: '#8c8c8c' }}>
                        Work hours
                      </div>
                      <Space size={12}>
                        <Form.Item name="workHours" noStyle>
                          <InputNumber min={0} max={720} addonAfter="hh" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item name="workMins" noStyle>
                          <InputNumber min={0} max={59} addonAfter="mm" style={{ width: 120 }} />
                        </Form.Item>
                      </Space>
                    </>
                  )
                }
              </Form.Item>
            </Card>

            {/* BUFFER AND PUNCH TIME RESTRICTIONS */}
            <Form.Item shouldUpdate noStyle>
              {() =>
                form.getFieldValue('shiftType') !== 'open' && (
                  <Card title="Punch Time Restrictions" size="small" style={{ marginBottom: 12 }}>
                    <Form.Item name="bufferMinutes" label="Buffer Minutes" rules={[{ type: 'number', transform: (v) => Number(v) }]}>
                      <InputNumber min={0} max={1440} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="autoPunchoutAfterShiftEnd" label="Auto Punchout After Shift End (hours)" tooltip="Hours after shift end when auto-punchout should occur">
                      <InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} placeholder="e.g. 2.5 for 2.5 hours after shift end" />
                    </Form.Item>

                    <Space size={12} style={{ display: 'flex' }}>
                      <Form.Item name="earliestPunchInTime" label="Earliest Punch-in Time" style={{ flex: 1 }}>
                        <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={5} />
                      </Form.Item>
                      <Form.Item name="latestPunchOutTime" label="Latest Punch-out Time" style={{ flex: 1 }}>
                        <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={5} />
                      </Form.Item>
                    </Space>
                  </Card>
                )
              }
            </Form.Item>

            {/* ATTENDANCE RULES */}
            <Card title="Attendance Rules" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="halfDayThresholdMinutes" label="Half-day Threshold (minutes)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                {/* <Col span={12}>
          <Form.Item name="overtimeStartMinutes" label="Overtime Starts After (minutes)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col> */}
              </Row>
            </Card>

            {/* BREAKS */}
            <Form.Item shouldUpdate noStyle>
              {() =>
                form.getFieldValue('shiftType') !== 'open' && (
                  <Card title="Breaks" size="small" style={{ marginTop: 16 }}>
                    <Form.List name="breaks">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Card key={key} size="small" style={{ marginBottom: 12 }}>
                              <Row gutter={12}>
                                <Col span={12}>
                                  <Form.Item {...rest} name={[name, 'category']} label="Category">
                                    <Select options={[
                                      { value: 'Casual Break', label: 'Casual Break' },
                                      { value: 'Lunch', label: 'Lunch' },
                                      { value: 'Tea', label: 'Tea' },
                                    ]} />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item {...rest} name={[name, 'durationMinutes']} label="Duration (mins)">
                                    <InputNumber min={1} style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <div style={{ textAlign: 'right' }}>
                                <Button danger onClick={() => remove(name)}>Remove</Button>
                              </div>
                            </Card>
                          ))}

                          <Button type="dashed" onClick={() => add()} block>
                            + Add Break
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                )
              }
            </Form.Item>

          </Form>
        </Modal>


        <Modal title={assigningTpl ? `Assign Staff • ${assigningTpl.name}` : 'Assign Staff'} open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={saveAssign} okText="Assign">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Select
              mode="multiple"
              options={staffOptions}
              value={selectedStaffIds}
              onChange={setSelectedStaffIds}
              style={{ width: '100%' }}
              placeholder="Select staff to assign"
            />
            <DatePicker value={effectiveFrom} onChange={setEffectiveFrom} style={{ width: '100%' }} placeholder="Effective from" />
          </Space>
        </Modal>
      </Layout>
    </Layout>

  );
}