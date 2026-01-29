import React from 'react';
import { Layout, Card, Typography, Form, Input, Button, Table, Space, message, Tag, Switch, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function ManageDocuments() {
  const [loading, setLoading] = React.useState(false);
  const [listLoading, setListLoading] = React.useState(false);
  const [types, setTypes] = React.useState([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [form] = Form.useForm();

  const loadTypes = async () => {
    try {
      setListLoading(true);
      const res = await api.get('/admin/document-types');
      if (res.data?.success) setTypes(res.data.data || []); else setTypes([]);
    } catch (_) {
      setTypes([]);
    } finally {
      setListLoading(false);
    }
  };

  React.useEffect(() => { loadTypes(); }, []);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ active: true, required: false });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({
      key: row.key,
      name: row.name,
      required: !!row.required,
      allowed_mime: row.allowed_mime || '',
      active: row.active !== false,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      const v = await form.validateFields();
      setLoading(true);
      if (editing) {
        const res = await api.put(`/admin/document-types/${editing.id}`, v);
        if (res.data?.success) message.success('Updated'); else message.error(res.data?.message || 'Failed');
      } else {
        const res = await api.post('/admin/document-types', v);
        if (res.data?.success) message.success('Created'); else message.error(res.data?.message || 'Failed');
      }
      setModalOpen(false);
      setEditing(null);
      loadTypes();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Key', dataIndex: 'key', key: 'key' },
    { title: 'Required', dataIndex: 'required', key: 'required', render: (v) => v ? <Tag color="red">Required</Tag> : <Tag>Optional</Tag> },
    { title: 'Allowed MIME', dataIndex: 'allowed_mime', key: 'allowed_mime', render: (t) => t || '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', render: (v) => v ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
        </Space>
      ) },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>Manage Documents</Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card title="Document Types" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Type</Button>}>
            <Table
              size="small"
              loading={listLoading}
              dataSource={(types || []).map((d) => ({ key: d.id, ...d }))}
              columns={columns}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          <Modal title={editing ? 'Edit Document Type' : 'Add Document Type'} open={modalOpen} onCancel={()=>{ setModalOpen(false); setEditing(null); }} onOk={submit} confirmLoading={loading} okText={editing? 'Save' : 'Create'}>
            <Form form={form} layout="vertical">
              <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="key" label="Key" rules={[{ required: true, message: 'Key is required' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="required" label="Required" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="allowed_mime" label="Allowed MIME (comma separated)">
                <Input placeholder="e.g. image/*,application/pdf" />
              </Form.Item>
              <Form.Item name="active" label="Active" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
