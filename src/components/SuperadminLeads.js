import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  message, Space, Card, Tag, Tooltip, Row, Col, Layout, Typography, Menu, Descriptions
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  SearchOutlined,
  FilterOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import Sidebar from './Sidebar';

dayjs.extend(isBetween);

const { TextArea } = Input;
const { Option } = Select;
const { Header, Content } = Layout;
const { Title } = Typography;

const SuperadminLeads = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperadmin = user.role === 'superadmin';
  const userPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || {});
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();
  const [config, setConfig] = useState({
    customerTypes: [],
    categories: [],
    statuses: [],
    handledBy: [],
    services: []
  });
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    customerType: null,
    category: null,
    status: null,
    handledBy: null,
    service: null,
    nextFollowUpRange: null,
    lastFollowUpRange: null
  });

  useEffect(() => {
    if (!isSuperadmin && !userPermissions.leads) {
      message.error('You do not have permission to access Leads Management');
      navigate(userPermissions.mailing ? '/superadmin/mailing' : '/superadmin/dashboard');
      return;
    }
    fetchLeads();
    fetchConfig();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/leads');
      if (res.data.success) {
        setLeads(res.data.leads);
      }
    } catch (e) {
      message.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get('/superadmin/leads/config');
      if (res.data.success) {
        setConfig(prev => ({
          ...prev,
          ...res.data.config
        }));
      }
    } catch (e) {
      console.error('Config load failed');
    }
  };

  const handleAdd = () => {
    setEditingLead(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingLead(record);
    form.setFieldsValue({
      ...record,
      nextFollowUpDate: record.nextFollowUpDate ? dayjs(record.nextFollowUpDate) : null,
      lastFollowUpDate: record.lastFollowUpDate ? dayjs(record.lastFollowUpDate) : null,
      serviceRequired: Array.isArray(record.serviceRequired) ? record.serviceRequired : (record.serviceRequired ? record.serviceRequired.split(',') : [])
    });
    setIsModalVisible(true);
  };

  const handleView = (record) => {
    setViewingLead(record);
    setIsViewModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this lead?',
      onOk: async () => {
        try {
          await api.delete(`/superadmin/leads/${id}`);
          message.success('Lead deleted');
          fetchLeads();
        } catch (e) {
          message.error('Delete failed');
        }
      }
    });
  };

  const handleFormSubmit = async (values) => {
    try {
      const data = {
        ...values,
        nextFollowUpDate: values.nextFollowUpDate ? values.nextFollowUpDate.format('YYYY-MM-DD') : null,
        lastFollowUpDate: values.lastFollowUpDate ? values.lastFollowUpDate.format('YYYY-MM-DD') : null,
        serviceRequired: values.serviceRequired ? values.serviceRequired.join(',') : ''
      };

      if (editingLead) {
        await api.put(`/superadmin/leads/${editingLead.id}`, data);
        message.success('Lead updated');
      } else {
        await api.post('/superadmin/leads', data);
        message.success('Lead created');
      }
      setIsModalVisible(false);
      fetchLeads();
    } catch (e) {
      message.error('Operation failed');
    }
  };

  const handleConfigSubmit = async (values) => {
    try {
      for (const key in values) {
        const optionsArr = Array.isArray(values[key]) ? values[key] : [];
        await api.put('/superadmin/leads/config', { key, options: optionsArr });
      }
      message.success('Configuration updated');
      setIsConfigModalVisible(false);
      fetchConfig();
    } catch (e) {
      message.error('Config update failed');
    }
  };

  const showConfigModal = () => {
    configForm.setFieldsValue({
      customerTypes: config.customerTypes,
      categories: config.categories,
      statuses: config.statuses,
      handledBy: config.handledBy,
      services: config.services
    });
    setIsConfigModalVisible(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/superadmin/leads/export-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leads_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      message.error('Failed to download template');
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      message.warning('Please select a file to import');
      return;
    }
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/superadmin/leads/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        message.success(res.data.message);
        setIsImportModalVisible(false);
        setImportFile(null);
        fetchLeads();
      } else {
        message.error(res.data.message || 'Import failed');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchText) params.append('company', searchText);
      if (filters.customerType) params.append('customerType', filters.customerType);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.handledBy) params.append('handledBy', filters.handledBy);
      if (filters.service) params.append('serviceRequired', filters.service);

      const response = await api.get(`/superadmin/leads/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${dayjs().format('YYYYMMDD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      message.error('Export failed');
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !searchText ||
      l.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
      l.personName?.toLowerCase().includes(searchText.toLowerCase()) ||
      l.phone?.includes(searchText);

    const matchesType = !filters.customerType || l.customerType === filters.customerType;
    const matchesCategory = !filters.category || l.category === filters.category;
    const matchesStatus = !filters.status || l.status === filters.status;
    const matchesHandledBy = !filters.handledBy || l.handledBy === filters.handledBy;
    const matchesService = !filters.service || (l.serviceRequired && l.serviceRequired.split(',').includes(filters.service));

    const matchesNextFollowUp = !filters.nextFollowUpRange || (
      l.nextFollowUpDate &&
      dayjs(l.nextFollowUpDate).isBetween(filters.nextFollowUpRange[0], filters.nextFollowUpRange[1], 'day', '[]')
    );

    const matchesLastFollowUp = !filters.lastFollowUpRange || (
      l.lastFollowUpDate &&
      dayjs(l.lastFollowUpDate).isBetween(filters.lastFollowUpRange[0], filters.lastFollowUpRange[1], 'day', '[]')
    );

    return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesHandledBy && matchesService && matchesNextFollowUp && matchesLastFollowUp;
  });

  const columns = [
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      fixed: 'left',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.personName}</div>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record) => (
        <div>
          <div>{record.phone}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
        </div>
      )
    },
    {
      title: 'Type/Category',
      key: 'type_cat',
      render: (record) => (
        <div>
          <Tag color="blue">{record.customerType}</Tag>
          <Tag color="cyan">{record.category}</Tag>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'Partner' ? 'green' : 'orange'}>{status}</Tag>
    },
    {
      title: 'Follow Ups',
      key: 'follow_ups',
      render: (record) => (
        <div style={{ fontSize: '12px' }}>
          <div>Next: {record.nextFollowUpDate ? dayjs(record.nextFollowUpDate).format('DD MMM YYYY') : 'NA'}</div>
          <div>Last: {record.lastFollowUpDate ? dayjs(record.lastFollowUpDate).format('DD MMM YYYY') : 'NA'}</div>
        </div>
      )
    },
    {
      title: 'Handled By',
      dataIndex: 'handledBy',
      key: 'handledBy'
    },
    ...(isSuperadmin ? [{
      title: 'Created By',
      key: 'createdBy',
      render: (record) => record.creator?.phone || 'System'
    }] : []),
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 130,
      render: (record) => (
        <Space>
          <Tooltip title="View Details">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', padding: '0 24px' }
            })}
            <Title level={4} style={{ margin: 0 }}>Leads Management</Title>
          </div>
          <Menu theme="light" mode="horizontal" items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={6}>
                <Input
                  placeholder="Search company, person or phone..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={12} md={4}>
                <Select
                  placeholder="Customer Type"
                  style={{ width: '100%' }}
                  allowClear
                  onChange={v => setFilters({ ...filters, customerType: v })}
                  value={filters.customerType}
                >
                  {config.customerTypes.map(t => <Option key={t} value={t}>{t}</Option>)}
                </Select>
              </Col>
              <Col xs={12} md={4}>
                <Select
                  placeholder="Category"
                  style={{ width: '100%' }}
                  allowClear
                  onChange={v => setFilters({ ...filters, category: v })}
                  value={filters.category}
                >
                  {config.categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Col>
              <Col xs={12} md={4}>
                <Select
                  placeholder="Status"
                  style={{ width: '100%' }}
                  allowClear
                  onChange={v => setFilters({ ...filters, status: v })}
                  value={filters.status}
                >
                  {config.statuses.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Col>
              <Col xs={12} md={4}>
                <Select
                  placeholder="Handled By"
                  style={{ width: '100%' }}
                  allowClear
                  onChange={v => setFilters({ ...filters, handledBy: v })}
                  value={filters.handledBy}
                >
                  {config.handledBy.map(h => <Option key={h} value={h}>{h}</Option>)}
                </Select>
              </Col>
              <Col xs={24} md={2}>
                <Button
                  block
                  onClick={() => {
                    setSearchText('');
                    setFilters({
                      customerType: null,
                      category: null,
                      status: null,
                      handledBy: null,
                      service: null,
                      nextFollowUpRange: null,
                      lastFollowUpRange: null
                    });
                  }}
                >
                  Clear
                </Button>
              </Col>
            </Row>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <Space wrap>
                {isSuperadmin && <Button icon={<SettingOutlined />} onClick={showConfigModal}>Manage Dropdowns</Button>}
                <Select
                  placeholder="Service Required"
                  style={{ width: 180 }}
                  allowClear
                  onChange={v => setFilters({ ...filters, service: v })}
                  value={filters.service}
                >
                  {config.services.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
                <DatePicker.RangePicker
                  placeholder={['Next F/Up Start', 'End']}
                  style={{ width: 250 }}
                  onChange={dates => setFilters({ ...filters, nextFollowUpRange: dates })}
                  value={filters.nextFollowUpRange}
                />
                <DatePicker.RangePicker
                  placeholder={['Last F/Up Start', 'End']}
                  style={{ width: 250 }}
                  onChange={dates => setFilters({ ...filters, lastFollowUpRange: dates })}
                  value={filters.lastFollowUpRange}
                />
              </Space>
              <Space>
                <Button icon={<DownloadOutlined />} onClick={handleExport}>Export Leads</Button>
                <Button icon={<UploadOutlined />} onClick={() => setIsImportModalVisible(true)}>Import Leads</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Lead</Button>
              </Space>
            </div>
          </Card>

          <Table
            columns={columns}
            dataSource={filteredLeads}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10 }}
          />
        </Content>
      </Layout>

      {/* Lead View Modal */}
      <Modal
        title="Lead Details"
        visible={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[<Button key="close" onClick={() => setIsViewModalVisible(false)}>Close</Button>]}
        width={800}
      >
        {viewingLead && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Company Name" span={2}>{viewingLead.companyName}</Descriptions.Item>
            <Descriptions.Item label="Person Name">{viewingLead.personName}</Descriptions.Item>
            <Descriptions.Item label="Phone">{viewingLead.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewingLead.email}</Descriptions.Item>
            <Descriptions.Item label="Customer Type">{viewingLead.customerType}</Descriptions.Item>
            <Descriptions.Item label="Category">{viewingLead.category}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={viewingLead.status === 'Partner' ? 'green' : 'orange'}>{viewingLead.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Handled By">{viewingLead.handledBy}</Descriptions.Item>
            <Descriptions.Item label="Next Follow Up">
              {viewingLead.nextFollowUpDate ? dayjs(viewingLead.nextFollowUpDate).format('DD MMM YYYY') : 'NA'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Follow Up">
              {viewingLead.lastFollowUpDate ? dayjs(viewingLead.lastFollowUpDate).format('DD MMM YYYY') : 'NA'}
            </Descriptions.Item>
            <Descriptions.Item label="Service Required" span={2}>
              {viewingLead.serviceRequired?.split(',').map(s => <Tag key={s} color="blue">{s}</Tag>)}
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>{viewingLead.address}</Descriptions.Item>
            <Descriptions.Item label="Remarks" span={2}>{viewingLead.remarks}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Lead Add/Edit Modal */}
      <Modal
        title={editingLead ? 'Edit Lead' : 'Add New Lead'}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="personName" label="Person Name">
                <Input placeholder="Enter contact person name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="address" label="Address">
                <TextArea rows={2} placeholder="Enter full address" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="customerType" label="Customer Type">
                <Select placeholder="Select type">
                  {config.customerTypes.map(t => <Option key={t} value={t}>{t}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="Category">
                <Select placeholder="Select category">
                  {config.categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status">
                <Select placeholder="Select status">
                  {config.statuses.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="nextFollowUpDate" label="Next Follow Up">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="lastFollowUpDate" label="Last Follow Up">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="handledBy" label="Handled By">
                <Select placeholder="Select handler">
                  {config.handledBy.map(h => <Option key={h} value={h}>{h}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serviceRequired" label="Service Required">
                <Select mode="multiple" placeholder="Select services">
                  {config.services.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remarks" label="Remarks">
                <TextArea rows={2} placeholder="Add any notes here" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Config Modal */}
      <Modal
        title="Manage Dropdown Options"
        visible={isConfigModalVisible}
        onCancel={() => setIsConfigModalVisible(false)}
        onOk={() => configForm.submit()}
        width={600}
      >
        <div style={{ marginBottom: '20px', padding: '10px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
          <strong>Pro Tip:</strong> Type an option and press <strong>Enter</strong> to add it. You can click the <strong>X</strong> on a tag to remove it.
        </div>
        <Form form={configForm} layout="vertical" onFinish={handleConfigSubmit}>
          <Form.Item name="customerTypes" label="Customer Types (e.g., Tally partner, CA, Direct)">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Add customer types..." tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="categories" label="Categories (e.g., Security, Construction)">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Add categories..." tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="statuses" label="Statuses (e.g., Demo, Partner)">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Add statuses..." tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="handledBy" label="Handled By (Staff Names)">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Add staff names..." tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="services" label="Services Required (e.g., Payroll, Sales)">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Add services..." tokenSeparators={[',']} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Leads from Excel"
        visible={isImportModalVisible}
        onCancel={() => {
          setIsImportModalVisible(false);
          setImportFile(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setIsImportModalVisible(false)}>Cancel</Button>,
          <Button key="import" type="primary" loading={importLoading} onClick={handleImport}>Start Import</Button>
        ]}
      >
        <div style={{ marginBottom: 20 }}>
          <p>Please use our template to ensure your data is formatted correctly.</p>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
            style={{ color: '#52c41a', borderColor: '#52c41a' }}
          >
            Download Excel Template
          </Button>
        </div>

        <div style={{ padding: '20px', border: '2px dashed #d9d9d9', borderRadius: '8px', textAlign: 'center' }}>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setImportFile(e.target.files[0])}
            id="lead-import-input"
            style={{ display: 'none' }}
          />
          <label htmlFor="lead-import-input" style={{ cursor: 'pointer' }}>
            <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            {importFile ? (
              <div>
                <p style={{ fontWeight: 'bold', color: '#1890ff' }}>{importFile.name}</p>
                <p style={{ fontSize: 12, color: '#8c8c8c' }}>Click to change file</p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 'bold' }}>Click to select Excel file</p>
                <p style={{ fontSize: 12, color: '#8c8c8c' }}>Support for .xlsx and .xls files</p>
              </div>
            )}
          </label>
        </div>

        <div style={{ marginTop: 20, padding: '12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
          <Title level={5} style={{ fontSize: 14, color: '#d46b08', marginBottom: 8 }}>Important Notes:</Title>
          <ul style={{ fontSize: 12, color: '#595959', paddingLeft: 20 }}>
            <li>Company Name is a mandatory field.</li>
            <li>Date format should be YYYY-MM-DD (e.g., 2026-04-24).</li>
            <li>Handled By and Status should match existing options for best results.</li>
          </ul>
        </div>
      </Modal>
    </Layout>
  );
};

export default SuperadminLeads;
