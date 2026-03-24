import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, InputNumber, Switch, Space, Tag, message, Select, Typography, Menu } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function OrderProductsSettings() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();


  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const resp = await api.get('/admin/settings/order-products');
      setProducts(Array.isArray(resp?.data?.products) ? resp.data.products : []);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const productOptions = useMemo(() => {
    return products
      .filter((p) => p?.isActive !== false)
      .map((p) => ({
        value: p.id,
        label: p.size ? `${p.name} (${p.size})` : p.name,
      }));
  }, [products]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ defaultQty: 1, defaultPrice: 0, sortOrder: 0, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name || '',
      size: row.size || '',
      defaultQty: Number(row.defaultQty || 1),
      defaultPrice: Number(row.defaultPrice || 0),
      sortOrder: Number(row.sortOrder || 0),
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const submitProduct = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing?.id) {
        await api.put(`/admin/settings/order-products/${editing.id}`, values);
        message.success('Product updated');
      } else {
        await api.post('/admin/settings/order-products', values);
        message.success('Product created');
      }
      setModalOpen(false);
      await loadProducts();
    } catch (e) {
      if (!e?.errorFields) message.error(e?.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (row) => {
    try {
      await api.delete(`/admin/settings/order-products/${row.id}`);
      message.success('Product deleted');
      await loadProducts();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to delete product');
    }
  };


  const productColumns = [
    {
      title: 'Product',
      key: 'name',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{row.size || '-'}</div>
        </div>
      ),
    },
    { title: 'Qty', dataIndex: 'defaultQty' },
    { title: 'Rate', dataIndex: 'defaultPrice', render: (v) => `Rs ${Number(v || 0).toFixed(2)}` },
    { title: 'Sort', dataIndex: 'sortOrder' },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>Edit</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteProduct(row)}>Delete</Button>
        </Space>
      ),
    },
  ];



  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Order Product Settings</Title>
          <Menu
            theme="light"
            mode="horizontal"
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]}
            style={{ borderRight: 'none', backgroundColor: 'transparent' }}
          />
        </Header>
        <Content style={{ padding: 24 }}>
          <Card title="Product Master" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Product</Button>} style={{ marginBottom: 16 }}>
            <Table rowKey="id" columns={productColumns} dataSource={products} loading={loadingProducts} pagination={{ pageSize: 10 }} />
          </Card>
        </Content>

      </Layout>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Product' : 'Add Product'}
        onCancel={() => setModalOpen(false)}
        onOk={submitProduct}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Product Name" name="name" rules={[{ required: true, message: 'Enter product name' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Size" name="size">
            <Input placeholder="e.g. M, 500ml, 1kg" />
          </Form.Item>
          <Form.Item label="Qty" name="defaultQty" rules={[{ required: true, message: 'Enter quantity' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Rate" name="defaultPrice" rules={[{ required: true, message: 'Enter rate' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Sort Order" name="sortOrder">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>

  );
}
