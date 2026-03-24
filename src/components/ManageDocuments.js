import React from 'react';
import { Layout, Card, Typography, Form, Input, Button, Table, Space, message, Tag, Switch, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api, { API_BASE_URL } from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function ManageDocuments() {
  const [loading, setLoading] = React.useState(false);
  const [listLoading, setListLoading] = React.useState(false);
  const [types, setTypes] = React.useState([]);
  const [recentDocs, setRecentDocs] = React.useState([]);
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

  const loadRecentDocs = async () => {
    try {
      const res = await api.get('/admin/documents/recent');
      if (res.data?.success) setRecentDocs(res.data.data || []); else setRecentDocs([]);
    } catch (_) {
      setRecentDocs([]);
    }
  };

  React.useEffect(() => { loadTypes(); loadRecentDocs(); }, []);

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

  const handleDocStatus = async (docId, status) => {
    try {
      const res = await api.put(`/admin/documents/${docId}/status`, { status });
      if (res.data?.success) {
        message.success(`Document ${status.toLowerCase()} successfully`);
        loadRecentDocs();
      } else {
        message.error(res.data?.message || 'Failed to update status');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to update status');
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

  const docStatusColor = (s) => {
    const v = String(s || '').toUpperCase();
    if (v === 'APPROVED') return 'green';
    if (v === 'REJECTED') return 'red';
    return 'gold';
  };

  const recentColumns = [
    { title: 'Staff', dataIndex: 'staffName', key: 'staffName', render: (v, r) => v || r.phone || `Staff ${r.userId}` },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v) => v || '-' },
    { title: 'Document', key: 'doc', render: (_, r) => r.documentTypeName || r.fileName || `Doc ${r.id}` },
    {
      title: 'File',
      key: 'file',
      render: (_, r) => r.fileUrl ? (
        <a href={String(r.fileUrl).startsWith('http') ? r.fileUrl : `${API_BASE_URL}${r.fileUrl}`} target="_blank" rel="noreferrer">View</a>
      ) : '-',
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={docStatusColor(s)}>{String(s || 'SUBMITTED').toUpperCase()}</Tag> },
    { title: 'Updated', dataIndex: 'updatedAt', key: 'updatedAt', render: (d) => d ? dayjs(d).format('DD MMM YYYY hh:mm A') : '-' },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => {
        const s = String(r.status || 'SUBMITTED').toUpperCase();
        return (
          <Space>
            <Button size="small" type="primary" disabled={s === 'APPROVED'} onClick={() => handleDocStatus(r.id, 'APPROVED')}>
              Approve
            </Button>
            <Button size="small" danger disabled={s === 'REJECTED'} onClick={() => handleDocStatus(r.id, 'REJECTED')}>
              Reject
            </Button>
          </Space>
        );
      }
    },
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

          <Card title="Recent Staff Documents" style={{ marginTop: 16 }}>
            <Table
              size="small"
              rowKey={(r) => r.id}
              dataSource={recentDocs}
              columns={recentColumns}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'No staff documents uploaded yet' }}
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
