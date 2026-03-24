import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, message, Select, Table, Popconfirm } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';
import { useState, useEffect, useMemo } from 'react';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function FnCard({ fn, onEdit, onDelete }) {
  return (
    <Card bordered hoverable>
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>{fn.name}</Text>
          <Space>
            <Tag color={fn.active ? 'green' : 'red'}>{fn.active ? 'Active' : 'Inactive'}</Tag>
            <Button size="small" onClick={() => onEdit?.openEdit?.(fn)}>Edit</Button>
            <Button size="small" danger onClick={() => onDelete?.(fn)}>Delete</Button>
          </Space>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(fn.values || []).map(v => (
            <div key={v.id} style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 4, background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>{v.value}</Text>
                <Tag color={v.active ? 'blue' : 'default'} style={{ margin: 0 }}>{v.active ? 'Active' : 'Inactive'}</Tag>
              </div>
              {String(fn.name).toLowerCase() === 'department' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Assigned Staff:</Text>
                  <Tag color="cyan" style={{ cursor: 'pointer', margin: 0 }} onClick={() => onEdit?.openAssignedList?.(v.value)}>
                    View Staff
                  </Tag>
                </div>
              )}
            </div>
          ))}
        </div>
      </Space>
    </Card>
  );
}

export default function BusinessFunctions() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignForm] = Form.useForm();
  const [staffOptions, setStaffOptions] = useState([]);

  const [assignedListOpen, setAssignedListOpen] = useState(false);
  const [assignedDeptName, setAssignedDeptName] = useState('');
  const [assignedListRows, setAssignedListRows] = useState([]);
  const [assignedListLoading, setAssignedListLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/business-functions');
      setList(res.data?.data || []);
    } catch {
      message.error('Failed to load business functions');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      const rows = res.data?.data || res.data?.staff || [];
      setStaffOptions(rows.map(s => ({
        label: `${s.name || s.phone || `Staff ${s.id}`} (${s.phone || 'No phone'})`,
        value: s.id,
      })));
    } catch {
      setStaffOptions([]);
    }
  };

  useEffect(() => {
    load();
    loadStaff();
  }, []);

  const departmentFn = useMemo(() => {
    return (list || []).find(fn => String(fn.name || '').trim().toLowerCase() === 'department');
  }, [list]);

  const departmentValues = useMemo(() => {
    return (departmentFn?.values || [])
      .filter(v => v?.active !== false && String(v?.value || '').trim())
      .map(v => ({ label: String(v.value), value: String(v.value) }));
  }, [departmentFn]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ name: '', active: true, values: [{ value: '', active: true, sortOrder: 0 }] });
    setOpen(true);
  };

  const openEdit = (fn) => {
    setEditing(fn);
    form.resetFields();
    form.setFieldsValue({
      name: fn.name,
      active: fn.active !== false,
      values: (fn.values || []).map((v, idx) => ({ value: v.value, active: v.active !== false, sortOrder: v.sortOrder ?? idx })),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        name: v.name,
        active: v.active !== false,
        values: (v.values || [])
          .filter(x => x && typeof x.value === 'string' && x.value.trim())
          .map((x, idx) => ({ value: x.value.trim(), active: x.active !== false, sortOrder: x.sortOrder ?? idx })),
      };
      if (editing) {
        await api.put(`/admin/business-functions/${editing.id}`, payload);
        message.success('Updated');
      } else {
        await api.post('/admin/business-functions', payload);
        message.success('Created');
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (fn) => {
    Modal.confirm({
      title: `Delete ${fn.name}?`,
      content: 'This will remove the function and all its values.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/business-functions/${fn.id}`);
          message.success('Deleted');
          await load();
        } catch (e) {
          message.error(e?.response?.data?.message || 'Failed to delete');
        }
      }
    });
  };

  const handleAssignDepartment = async () => {
    try {
      const values = await assignForm.validateFields();
      setAssigning(true);
      const res = await api.post('/admin/business-functions/assign-department', {
        department: values.department,
        staffUserIds: values.staffUserIds,
      });
      message.success(res.data?.message || 'Department assigned');
      assignForm.resetFields();
      await loadStaff();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to assign department');
    } finally {
      setAssigning(false);
    }
  };

  const openAssignedList = async (deptName, keepOpen = false) => {
    try {
      setAssignedDeptName(deptName);
      if (!keepOpen) setAssignedListOpen(true);
      setAssignedListLoading(true);
      const res = await api.get(`/admin/business-functions/department/${encodeURIComponent(deptName)}/staff`);
      setAssignedListRows(res?.data?.staff || []);
    } catch (_) {
      setAssignedListRows([]);
      message.error('Failed to load assigned staff');
    } finally {
      setAssignedListLoading(false);
    }
  };

  const unassignStaff = async (userId) => {
    try {
      if (!assignedDeptName) return;
      await api.delete(`/admin/business-functions/department/${encodeURIComponent(assignedDeptName)}/staff/${userId}`);
      message.success('Staff removed from department');
      await openAssignedList(assignedDeptName, true);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to remove staff');
    }
  };

  const filtered = (list || []).filter(fn => !q || String(fn.name).toLowerCase().includes(String(q).toLowerCase()));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
          <Title level={4} style={{ margin: 0, flex: 1 }}>Manage Departments</Title>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 16 }}>
            <Space>
              <Input.Search
                placeholder="Search business functions..."
                allowClear
                style={{ width: 280 }}
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </Space>
          </Card>

          <Card
            title={<Space><TeamOutlined /> Assign Department To Staff</Space>}
            loading={loading}
            style={{ marginBottom: 16 }}
          >
            <Form form={assignForm} layout="vertical">
              <Row gutter={12}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="department"
                    label="Department"
                    rules={[{ required: true, message: 'Select department' }]}
                  >
                    <Select
                      placeholder="Select department"
                      options={departmentValues}
                      disabled={!departmentValues.length}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="staffUserIds"
                    label="Select Staff (Multiple)"
                    rules={[{ required: true, message: 'Select at least one staff' }]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Select staff"
                      options={staffOptions}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item label=" ">
                    <Button type="primary" block loading={assigning} onClick={handleAssignDepartment}>
                      Assign
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            {!departmentValues.length && (
              <Text type="secondary">Create `Department` function values first (Sales, HR, etc.).</Text>
            )}
          </Card>

          <Row gutter={[16, 16]}>
            {filtered.map(fn => (
              <Col key={fn.id} xs={24} sm={12} lg={8}>
                <FnCard fn={fn} onEdit={{ openEdit, openAssignedList }} onDelete={handleDelete} />
              </Col>
            ))}
          </Row>
        </Content>

        <Modal
          title={editing ? 'Edit Business Function' : 'Create Business Function'}
          open={open}
          onCancel={() => { setOpen(false); setEditing(null); }}
          onOk={save}
          okText="Save"
          width={680}
        >
          <Form layout="vertical" form={form}>
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="name" label="Function Name" rules={[{ required: true, message: 'Enter name' }]}>
                  <Input placeholder="e.g. Department" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="active" label="Status" initialValue={true}>
                  <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Values" style={{ marginBottom: 0 }}>
              {/* Column headers */}
              <Row gutter={8} style={{ marginBottom: 4, padding: '0 4px' }}>
                <Col flex="1"><span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Value</span></Col>
                <Col style={{ width: 110 }}><span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>Status</span></Col>
                <Col style={{ width: 40 }}></Col>
              </Row>

              <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                <Form.List name="values">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }, idx) => (
                        <Row key={key} gutter={8} align="middle" style={{ marginBottom: 6 }}>
                          <Col flex="1">
                            <Form.Item {...rest} name={[name, 'value']} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                              <Input placeholder="e.g. Sales" />
                            </Form.Item>
                            <Form.Item {...rest} name={[name, 'sortOrder']} initialValue={idx} hidden><Input /></Form.Item>
                          </Col>
                          <Col style={{ width: 110 }}>
                            <Form.Item {...rest} name={[name, 'active']} initialValue={true} style={{ marginBottom: 0 }}>
                              <Select size="small" options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
                            </Form.Item>
                          </Col>
                          <Col style={{ width: 40, textAlign: 'center' }}>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              style={{ padding: '0 6px' }}
                            />
                          </Col>
                        </Row>
                      ))}
                      <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ value: '', active: true })} style={{ marginTop: 4 }}>
                        Add Value
                      </Button>
                    </>
                  )}
                </Form.List>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Assigned Staff List Modal */}
        <Modal
          title={`Staff in Department: ${assignedDeptName}`}
          open={assignedListOpen}
          onCancel={() => setAssignedListOpen(false)}
          footer={null}
          width={900}
        >
          <Table
            rowKey="id"
            loading={assignedListLoading}
            dataSource={assignedListRows}
            size="small"
            pagination={{ pageSize: 8 }}
            columns={[
              { title: 'Name', render: (_, r) => r.name || '-' },
              { title: 'Staff ID', render: (_, r) => r.staffId || '-' },
              { title: 'Phone', render: (_, r) => r.user?.phone || '-' },
              { title: 'Designation', render: (_, r) => r.designation || '-' },
              {
                title: 'Action',
                key: 'action',
                render: (_, r) => (
                  <Popconfirm title="Remove from this department?" onConfirm={() => unassignStaff(r.userId)}>
                    <Button danger size="small">Remove</Button>
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
