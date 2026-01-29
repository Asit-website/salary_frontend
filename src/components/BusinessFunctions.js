import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Button, Input, Typography, Space, Tag, Modal, Form, message, Select } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function FnCard({ fn, onEdit, onDelete }) {
  return (
    <Card bordered hoverable>
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Text strong>{fn.name}</Text>
          <Space>
            <Tag color={fn.active ? 'green' : 'red'}>{fn.active ? 'Active' : 'Inactive'}</Tag>
            <Button size="small" onClick={() => onEdit?.(fn)}>Edit</Button>
            <Button size="small" danger onClick={() => onDelete?.(fn)}>Delete</Button>
          </Space>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(fn.values || []).map(v => (
            <Tag key={v.id} color={v.active ? 'blue' : 'default'}>{v.value}</Tag>
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

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/business-functions');
      const rows = res.data?.data || [];
      setList(rows);
    } catch (e) {
      message.error('Failed to load business functions');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      setOpen(false); setEditing(null);
      await load();
    } catch (e) {
      if (e?.errorFields) return; // form validation error
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

  const filtered = (list || []).filter(fn => !q || String(fn.name).toLowerCase().includes(String(q).toLowerCase()));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background:'#fff', borderBottom: '1px solid #eee', padding: '12px 24px', display:'flex', alignItems:'center', gap:8 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
          <Title level={4} style={{ margin: 0, flex: 1 }}>Manage Business Functions</Title>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 16 }}>
            <Space>
              <Input.Search placeholder="Search business functions..." allowClear style={{ width: 280 }} value={q} onChange={e => setQ(e.target.value)} />
            </Space>
          </Card>
          <Row gutter={[16, 16]}>
            {filtered.map(fn => (
              <Col key={fn.id} xs={24} sm={12} lg={8}>
                <FnCard fn={fn} onEdit={openEdit} onDelete={handleDelete} />
              </Col>
            ))}
          </Row>
        </Content>

        <Modal title={editing ? 'Edit Business Function' : 'Create Business Function'} open={open} onCancel={() => { setOpen(false); setEditing(null); }} onOk={save} okText="Save" width={640}>
          <Form layout="vertical" form={form}>
            <Form.Item name="name" label="Function Name" rules={[{ required: true, message: 'Enter name' }]}>
              <Input placeholder="e.g. Department" />
            </Form.Item>
            <Form.Item name="active" label="Status" initialValue={true}>
              <Select options={[{ value:true, label:'Active' }, { value:false, label:'Inactive' }]} />
            </Form.Item>
            <Form.Item label="Values">
              <Form.List name="values">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Card key={key} size="small" style={{ marginBottom: 8 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          <Form.Item {...rest} name={[name, 'value']} label="Value" rules={[{ required: true, message: 'Enter value' }]}>
                            <Input placeholder="e.g. Sales" />
                          </Form.Item>
                          <div style={{ display:'flex', gap:8 }}>
                            <Form.Item {...rest} name={[name, 'active']} label="Status" initialValue={true} style={{ flex: 1 }}>
                              <Select options={[{ value:true, label:'Active' }, { value:false, label:'Inactive' }]} />
                            </Form.Item>
                            <Form.Item {...rest} name={[name, 'sortOrder']} label="Sort" style={{ width: 120 }}>
                              <Input type="number" placeholder="0" />
                            </Form.Item>
                            <Button icon={<DeleteOutlined />} danger onClick={() => remove(name)} style={{ alignSelf: 'end' }}>Remove</Button>
                          </div>
                        </Space>
                      </Card>
                    ))}
                    <Button type="dashed" block onClick={() => add({ value:'', active:true })}>+ Add Value</Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </Layout>
  );
}
