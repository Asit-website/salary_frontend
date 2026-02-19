import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Select, message, Space, Typography, Modal, Form, Input, InputNumber, Menu } from 'antd';
import { 
  DollarOutlined, 
  UserOutlined, 
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title } = Typography;

const SalaryManagement = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salaryTemplates, setSalaryTemplates] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form] = Form.useForm();
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchSalaryTemplates();
  }, []);

  const fetchSalaryTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/salary-templates');
      if (response.data.success) {
        setSalaryTemplates(response.data.data);
      }
    } catch (error) {
      message.error('Failed to fetch salary templates');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    form.setFieldsValue(template);
    setModalVisible(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this salary template?',
      content: 'This action cannot be undone and may affect staff salaries.',
      onOk: async () => {
        try {
          await api.delete(`/admin/salary-templates/${templateId}`);
          message.success('Salary template deleted successfully');
          fetchSalaryTemplates();
        } catch (error) {
          message.error('Failed to delete salary template');
        }
      },
    });
  };

  const handleSubmit = async (values) => {
    try {
      const formData = {
        ...values,
        earnings: values.earnings || [],
        incentives: values.incentives || [],
        deductions: values.deductions || []
      };

      if (editingTemplate) {
        await api.put(`/admin/salary-templates/${editingTemplate.id}`, formData);
        message.success('Salary template updated successfully');
      } else {
        await api.post('/admin/salary-templates', formData);
        message.success('Salary template created successfully');
      }
      setModalVisible(false);
      fetchSalaryTemplates();
    } catch (error) {
      message.error('Failed to save salary template');
    }
  };

  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Basic Salary',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      render: (value) => `₹${value?.toLocaleString() || 0}`,
    },
    {
      title: 'Total Earnings',
      key: 'totalEarnings',
      render: (_, record) => {
        const total = record.earnings?.reduce((sum, item) => sum + (item.valueNumber || 0), 0) || 0;
        return `₹${total.toLocaleString()}`;
      },
    },
    {
      title: 'Total Deductions',
      key: 'totalDeductions',
      render: (_, record) => {
        const total = record.deductions?.reduce((sum, item) => sum + (item.valueNumber || 0), 0) || 0;
        return `₹${total.toLocaleString()}`;
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <span style={{ color: isActive ? '#52c41a' : '#f5222d' }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEditTemplate(record)}
          />
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger 
            onClick={() => handleDeleteTemplate(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      
      <Layout>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Title level={4} style={{ margin: 0 }}>Salary Management</Title>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={[
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Logout',
                onClick: handleLogout
              }
            ]}
          />
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Card
            title="Salary Templates"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddTemplate}
              >
                Add Template
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={salaryTemplates}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
            />
          </Card>

          <Modal
            title={editingTemplate ? 'Edit Salary Template' : 'Add Salary Template'}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={800}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                name="name"
                label="Template Name"
                rules={[{ required: true, message: 'Please enter template name' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item
                name="basicSalary"
                label="Basic Salary"
                rules={[{ required: true, message: 'Please enter basic salary' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/₹\s?|(,*)/g, '')}
                />
              </Form.Item>

              <Form.Item
                name="earnings"
                label="Earnings Components"
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Enter earnings components (JSON format)"
                />
              </Form.Item>

              <Form.Item
                name="incentives"
                label="Incentives Components"
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Enter incentives components (JSON format)"
                />
              </Form.Item>

              <Form.Item
                name="deductions"
                label="Deductions Components"
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Enter deductions components (JSON format)"
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {editingTemplate ? 'Update' : 'Create'}
                  </Button>
                  <Button onClick={() => setModalVisible(false)}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SalaryManagement;
