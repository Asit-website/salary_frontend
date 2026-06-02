import React, { useState } from 'react';
import { Layout, Card, Typography, Form, Input, Button, Table, Space, message, Tag, Switch, Modal } from 'antd';
import { PlusOutlined, FileTextOutlined, EditOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api, { API_BASE_URL } from '../api';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Text } = Typography;

const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
};

export default function ManageDocuments() {
  const [collapsed, setCollapsed] = useState(false);
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
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            color: '#0284c7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {getInitials(text)}
          </div>
          <Text strong style={{ fontSize: 13, color: '#1e293b' }}>{text}</Text>
        </div>
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (v) => (
        <span style={{
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          borderRadius: 6, padding: '2px 8px', fontSize: 12,
          fontFamily: 'monospace', color: '#475569',
        }}>{v}</span>
      ),
    },
    {
      title: 'Required',
      dataIndex: 'required',
      key: 'required',
      align: 'center',
      render: (v) => v ? (
        <span style={{ background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>Required</span>
      ) : (
        <span style={{ background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>Optional</span>
      ),
    },
    {
      title: 'Allowed MIME',
      dataIndex: 'allowed_mime',
      key: 'allowed_mime',
      render: (t) => t ? (
        <span style={{ fontSize: 12, color: '#64748b' }}>{t}</span>
      ) : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      align: 'center',
      render: (v) => v ? (
        <span style={{ background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>Active</span>
      ) : (
        <span style={{ background: '#f9f9f9', color: '#8c8c8c', border: '1px solid #d9d9d9', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>Inactive</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, r) => (
        <Button
          icon={<EditOutlined />}
          size="small"
          onClick={() => openEdit(r)}
          style={{
            borderRadius: '50%', width: 32, height: 32,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e2e8f0', color: '#64748b', padding: 0,
          }}
        />
      ),
    },
  ];

  const docStatusStyle = (s) => {
    const v = String(s || '').toUpperCase();
    if (v === 'APPROVED') return { background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f' };
    if (v === 'REJECTED') return { background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e' };
    return { background: '#fffbe6', color: '#d46b08', border: '1px solid #ffe58f' };
  };

  const recentColumns = [
    {
      title: 'Staff',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (v, r) => {
        const name = v || r.phone || `Staff ${r.userId}`;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              color: '#0284c7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {getInitials(name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{name}</div>
              {r.phone && v && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.phone}</div>}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (v) => <span style={{ fontSize: 13, color: '#64748b' }}>{v || '—'}</span>,
    },
    {
      title: 'Document',
      key: 'doc',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2563eb', fontSize: 13, flexShrink: 0,
          }}>
            <FileTextOutlined />
          </div>
          <Text style={{ fontSize: 13, color: '#334155' }}>{r.documentTypeName || r.fileName || `Doc ${r.id}`}</Text>
        </div>
      ),
    },
    {
      title: 'File',
      key: 'file',
      render: (_, r) => r.fileUrl ? (
        <a
          href={String(r.fileUrl).startsWith('http') ? r.fileUrl : `${API_BASE_URL}${r.fileUrl}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#2563eb', fontWeight: 600, fontSize: 13 }}
        >
          View
        </a>
      ) : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (s) => {
        const style = docStatusStyle(s);
        return (
          <span style={{
            ...style, borderRadius: 20, padding: '2px 10px',
            fontSize: 12, fontWeight: 600,
          }}>
            {String(s || 'SUBMITTED').toUpperCase()}
          </span>
        );
      },
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (d) => <span style={{ fontSize: 12, color: '#64748b' }}>{d ? dayjs(d).format('DD MMM YYYY hh:mm A') : '—'}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => {
        const s = String(r.status || 'SUBMITTED').toUpperCase();
        return (
          <Space size={6}>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={s === 'APPROVED'}
              onClick={() => handleDocStatus(r.id, 'APPROVED')}
              style={{
                borderRadius: 20, fontSize: 12, fontWeight: 600, height: 28, paddingInline: 12,
                background: s === 'APPROVED' ? '#f0fdf4' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: s === 'APPROVED' ? '#86efac' : '#fff',
                border: 'none',
                boxShadow: s === 'APPROVED' ? 'none' : '0 2px 6px rgba(34,197,94,0.3)',
              }}
            >
              Approve
            </Button>
            <Button
              size="small"
              icon={<CloseCircleOutlined />}
              disabled={s === 'REJECTED'}
              onClick={() => handleDocStatus(r.id, 'REJECTED')}
              style={{
                borderRadius: 20, fontSize: 12, fontWeight: 600, height: 28, paddingInline: 12,
                background: s === 'REJECTED' ? '#fff1f0' : 'linear-gradient(135deg, #f87171, #dc2626)',
                color: s === 'REJECTED' ? '#fca5a5' : '#fff',
                border: 'none',
                boxShadow: s === 'REJECTED' ? 'none' : '0 2px 6px rgba(220,38,38,0.3)',
              }}
            >
              Reject
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          title="Manage Documents"
        />
        <Content style={{ background: '#f5f5f5', height: 'calc(100vh - 64px)', overflow: 'auto', padding: '24px' }}>

          {/* Document Types Card */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: '0' }}
            style={{ marginBottom: 20 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#2563eb', fontSize: 15,
                }}>
                  <FileTextOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Document Types</span>
              </div>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAdd}
                style={{
                  borderRadius: 20, fontWeight: 600,
                }}
              >
                Add Type
              </Button>
            }
          >
            <Table
              className="sales-table"
              size="small"
              loading={listLoading}
              dataSource={(types || []).map((d) => ({ key: d.id, ...d }))}
              columns={columns}
              pagination={{ pageSize: 10 }}
              bordered={false}
            />
          </Card>

          {/* Recent Staff Documents Card */}
          <Card
            className="sales-content-card"
            bodyStyle={{ padding: '0' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #bbf7d0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#16a34a', fontSize: 15,
                }}>
                  <SearchOutlined />
                </div>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Recent Staff Documents</span>
              </div>
            }
          >
            <Table
              className="sales-table"
              size="small"
              rowKey={(r) => r.id}
              dataSource={recentDocs}
              columns={recentColumns}
              pagination={{ pageSize: 10 }}
              bordered={false}
              locale={{ emptyText: 'No staff documents uploaded yet' }}
            />
          </Card>

          {/* Add / Edit Modal */}
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#2563eb', fontSize: 14,
                }}>
                  <FileTextOutlined />
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                  {editing ? 'Edit Document Type' : 'Add Document Type'}
                </span>
              </div>
            }
            open={modalOpen}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            onOk={submit}
            confirmLoading={loading}
            okText={editing ? 'Save Changes' : 'Create'}
            okButtonProps={{
              style: {
                borderRadius: 20,
                fontWeight: 600,
                paddingInline: 20,
              }
            }}
            cancelButtonProps={{ style: { borderRadius: 20, paddingInline: 20 } }}
          >
            <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
              <Form.Item name="name" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Name</span>} rules={[{ required: true, message: 'Name is required' }]}>
                <Input style={{ borderRadius: 8 }} placeholder="e.g. Aadhaar Card" />
              </Form.Item>
              <Form.Item name="key" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Key</span>} rules={[{ required: true, message: 'Key is required' }]}>
                <Input style={{ borderRadius: 8 }} placeholder="e.g. aadhaar_card" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name="required" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Required</span>} valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="active" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Active</span>} valuePropName="checked">
                  <Switch defaultChecked />
                </Form.Item>
              </div>
              <Form.Item name="allowed_mime" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Allowed MIME (comma separated)</span>}>
                <Input style={{ borderRadius: 8 }} placeholder="e.g. image/*,application/pdf" />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
