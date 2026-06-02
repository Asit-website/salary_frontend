import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, InputNumber, Switch, Space, Tag, message, Select, Typography, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShoppingOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Text } = Typography;
const { Search } = Input;

export default function OrderProductsSettings() {
  const [collapsed, setCollapsed] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const filteredProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || `${p.name || ''} ${p.size || ''}`.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.isActive !== false) ||
        (statusFilter === 'inactive' && p.isActive === false);
      return matchesSearch && matchesStatus;
    });
  }, [products, searchText, statusFilter]);

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.isActive !== false).length;
  const inactiveProducts = totalProducts - activeProducts;
  const averageRate = totalProducts
    ? products.reduce((sum, p) => sum + Number(p.defaultPrice || 0), 0) / totalProducts
    : 0;

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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#eef5ff',
            color: '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <ShoppingOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1f2937' }}>{row.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{row.size || 'No size specified'}</Text>
          </div>
        </div>
      ),
    },
    { title: 'Qty', dataIndex: 'defaultQty', width: 120, render: (v) => <Text strong>{v || 0}</Text> },
    { title: 'Rate', dataIndex: 'defaultPrice', width: 160, render: (v) => <Text strong>₹ {Number(v || 0).toFixed(2)}</Text> },
    { title: 'Sort', dataIndex: 'sortOrder', width: 120 },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 140,
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>Edit</Button>
          <Popconfirm
            title="Delete this product?"
            description="This product will no longer be available for orders."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteProduct(row)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];



  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          title="Order Product Settings"
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Products', value: totalProducts, icon: <ShoppingOutlined />, color: '#1677ff', bg: '#e6f4ff' },
              { label: 'Active Products', value: activeProducts, icon: <CheckCircleOutlined />, color: '#52c41a', bg: '#f6ffed' },
              { label: 'Inactive Products', value: inactiveProducts, icon: <CloseCircleOutlined />, color: '#ff4d4f', bg: '#fff1f0' },
              { label: 'Average Rate', value: `₹ ${averageRate.toFixed(2)}`, icon: <ShoppingOutlined />, color: '#722ed1', bg: '#f9f0ff' },
            ].map((stat) => (
              <Col xs={24} sm={12} md={6} key={stat.label}>
                <Card style={{ borderRadius: 8, border: '1px solid #f0f0f0' }} bodyStyle={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</div>
                      <div style={{ color: '#1f1f1f', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{stat.value}</div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {React.cloneElement(stat.icon, { style: { color: stat.color, fontSize: 22 } })}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Card className="sales-content-card" bodyStyle={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
              <Space wrap>
                <Search
                  placeholder="Search products..."
                  allowClear
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={setSearchText}
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  style={{ width: 260 }}
                />
                <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}>
                  <Select.Option value="all">All Status</Select.Option>
                  <Select.Option value="active">Active</Select.Option>
                  <Select.Option value="inactive">Inactive</Select.Option>
                </Select>
                <Button icon={<ReloadOutlined />} onClick={() => { setSearchText(''); setStatusFilter('all'); loadProducts(); }}>
                  Reset
                </Button>
              </Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Add Product
              </Button>
            </div>

            <Table
              rowKey="id"
              columns={productColumns}
              dataSource={filteredProducts}
              loading={loadingProducts}
              pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} products` }}
              scroll={{ x: 900 }}
            />
          </Card>
        </Content>

      </Layout>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Product' : 'Add Product'}
        onCancel={() => setModalOpen(false)}
        onOk={submitProduct}
        okText={editing ? 'Update Product' : 'Create Product'}
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
