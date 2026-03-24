import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Modal, Form, Input, Select, message, Space, Typography, Tag, Menu, Row, Col, DatePicker, Dropdown, Switch, Upload } from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  DownloadOutlined,
  MoreOutlined,
  CalendarOutlined,
  FilterOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  UploadOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { RangePicker } = DatePicker;

const StaffManagement = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [salaryTemplates, setSalaryTemplates] = useState([]);
  const [letterTemplates, setLetterTemplates] = useState([]);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [issuingLetter, setIssuingLetter] = useState(false);
  const [issuingForStaff, setIssuingForStaff] = useState(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [issueForm] = Form.useForm();
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStaff();
    fetchSalaryTemplates();
    fetchLetterTemplates();
    fetchDepartments();
  }, []);

  const fetchLetterTemplates = async () => {
    try {
      const resp = await api.get('/admin/letters/templates');
      if (resp.data.success) setLetterTemplates(resp.data.templates);
    } catch (_) { }
  };

  useEffect(() => {
    applyFilters();
  }, [staff, searchText, filterRole, filterStatus, filterDepartment]);

  const applyFilters = () => {
    let filtered = [...staff];

    if (searchText) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchText.toLowerCase()) ||
        member.email.toLowerCase().includes(searchText.toLowerCase()) ||
        member.staffId.toLowerCase().includes(searchText.toLowerCase()) ||
        member.phone.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filterRole) {
      filtered = filtered.filter(member => member.role === filterRole);
    }

    if (filterStatus) {
      filtered = filtered.filter(member => member.status === filterStatus);
    }

    if (filterDepartment) {
      filtered = filtered.filter(member => member.department === filterDepartment);
    }

    setFilteredStaff(filtered);
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleFilterReset = () => {
    setSearchText('');
    setFilterRole('');
    setFilterStatus('');
    setFilterDepartment('');
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/staff');
      console.log('Staff API response:', response.data); // Debug log
      if (response.data.success) {
        const staffData = response.data.staff || response.data.data || [];
        // Map API response to frontend structure
        const mappedData = staffData.map(staff => ({
          ...staff,
          name: staff.name || 'Unknown',
          email: staff.email || '',
          staffId: staff.staffId || 'N/A',
          phone: staff.phone || '',
          role: 'staff', // Default role since API doesn't specify
          status: (staff.active === undefined ? 'active' : (staff.active ? 'active' : 'inactive')), // Default to active if not provided
          department: staff.department || 'General', // Use actual department from API
          createdAt: staff.createdAt || staff.created_at || null // Use null if no creation date
        }));
        setStaff(mappedData);
        setFilteredStaff(mappedData);
        console.log('Staff data loaded:', mappedData.length); // Debug log
      } else {
        console.error('API returned unsuccessful response');
        // Fallback to empty array
        setStaff([]);
        setFilteredStaff([]);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      message.error('Failed to fetch staff');
      // Set empty array on error to prevent undefined
      setStaff([]);
      setFilteredStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryTemplates = async () => {
    try {
      const response = await api.get('/admin/salary-templates');
      if (response.data.success) {
        setSalaryTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch salary templates:', error);
    }
  };
  
  const fetchDepartments = async () => {
    try {
      const resp = await api.get('/admin/business-functions');
      const list = resp?.data?.data || [];
      const deptFn = list.find((f) => String(f.name || '').toLowerCase() === 'department');
      const values = Array.isArray(deptFn?.values) ? deptFn.values : [];
      const items = values
        .filter((v) => v && v.value)
        .map((v) => ({ id: v.id, name: v.value }));
      setDepartments(items);
    } catch (_) {
      setDepartments([]);
    }
  };

  // Calculate stats
  const totalEmployees = filteredStaff.length;
  const activeEmployees = filteredStaff.filter(s => s.status === 'active').length;
  const onLeaveEmployees = filteredStaff.filter(s => s.status === 'inactive').length;

  // Get unique departments for filter
  const uniqueDepartments = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();

  // Calculate new hires from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newHires = filteredStaff.filter(s => {
    if (!s.createdAt) return false; // Skip if no creation date
    const createdDate = new Date(s.createdAt);
    return createdDate >= sevenDaysAgo && !isNaN(createdDate.getTime());
  }).length;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleAddRegularStaff = () => {
    navigate('/add-regular-staff');
  };

  const handleAddContractualStaff = () => {
    // For now, just show a message
    message.info('Contractual staff feature coming soon');
  };

  const staffMenuItems = [
    {
      key: 'regular',
      label: 'Regular Staff',
      icon: <UserOutlined />,
    },
    {
      key: 'contractual',
      label: 'Contractual Staff',
      icon: <UserOutlined />,
    },
    {
      key: 'import',
      label: 'Import Staff',
      icon: <UploadOutlined />,
    },
    {
      key: 'export',
      label: 'Export Staff',
      icon: <DownloadOutlined />,
    }
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'regular') {
      handleAddRegularStaff();
    } else if (key === 'contractual') {
      handleAddContractualStaff();
    } else if (key === 'import') {
      setImportModalVisible(true);
      setImportResults(null);
    } else if (key === 'export') {
      handleExport();
    }
  };

  const handleViewStaff = (staffMember) => {
    navigate(`/staff/${staffMember.id}/profile`);
  };

  const handleEditStaff = (staffMember) => {
    // Navigate to AddRegularStaff page with prefilled data
    navigate('/add-regular-staff', { state: { staff: staffMember } });
  };

  const handleToggleStaffStatus = async (record, checked) => {
    setUpdatingStaffId(record.id);
    try {
      const resp = await api.put(`/admin/staff/${record.id}`, { active: checked });
      if (resp.data.success) {
        message.success(`Staff ${checked ? 'activated' : 'deactivated'} successfully`);
        fetchStaff();
      }
    } catch (error) {
      console.error('Failed to toggle staff status:', error);
      message.error('Failed to update status');
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleDepartmentChange = async (record, value) => {
    setUpdatingStaffId(record.id);
    try {
      const resp = await api.put(`/admin/staff/${record.id}`, { department: value });
      if (resp.data.success) {
        message.success('Department updated successfully');
        fetchStaff();
      }
    } catch (error) {
      console.error('Failed to update department:', error);
      message.error('Failed to update department');
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleUpdateAllStaff = async () => {
    Modal.confirm({
      title: 'Update All Staff Data',
      content: 'This will synchronize salary data and profiles for all staff members. Proceed?',
      onOk: async () => {
        try {
          setBulkUpdating(true);
          const resp = await api.put('/admin/staff/bulk-refresh');
          if (resp.data.success) {
            message.success(resp.data.message || 'All staff data updated successfully');
            fetchStaff();
          }
        } catch (error) {
          console.error('Failed to update all staff:', error);
          message.error('Failed to update all staff data');
        } finally {
          setBulkUpdating(false);
        }
      }
    });
  };

  const handleDeleteStaff = async (staffId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this staff member?',
      onOk: async () => {
        try {
          await api.delete(`/admin/staff/${staffId}`);
          message.success('Staff member deleted successfully');
          fetchStaff();
        } catch (error) {
          console.error('Failed to delete staff member:', error);
          message.error(error.response?.data?.message || 'Failed to delete staff member');
        }
      },
    });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.get('/admin/staff/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Staff list exported successfully');
    } catch (error) {
      console.error('Failed to export staff:', error);
      message.error('Failed to export staff list');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      // Calculate total salary components
      const basic_salary = parseFloat(values.basic_salary) || 0;
      const hra = parseFloat(values.hra) || 0;
      const da = parseFloat(values.da) || 0;
      const special_allowance = parseFloat(values.special_allowance) || 0;
      const conveyance_allowance = parseFloat(values.conveyance_allowance) || 0;
      const medical_allowance = parseFloat(values.medical_allowance) || 0;
      const telephone_allowance = parseFloat(values.telephone_allowance) || 0;
      const other_allowances = parseFloat(values.other_allowances) || 0;

      const total_earnings = basic_salary + hra + da + special_allowance + conveyance_allowance + medical_allowance + telephone_allowance + other_allowances;

      // Create staff member with all details
      const staffData = {
        staffId: values.staffId,
        phone: values.phone,
        name: values.name,
        email: values.email,
        department: values.department,
        designation: values.designation,
        password: values.password,
        active: values.active,
        // Salary components
        basic_salary,
        hra,
        da,
        special_allowance,
        conveyance_allowance,
        medical_allowance,
        telephone_allowance,
        other_allowances,
        total_earnings,
        // Calculate gross and net salary (simplified calculation)
        gross_salary: total_earnings,
        net_salary: total_earnings * 0.85 // Assuming 15% deductions
      };

      await api.post('/admin/staff', staffData);
      message.success('Regular staff member added successfully');
      setModalVisible(false);
      fetchStaff();
    } catch (error) {
      console.error('Failed to save staff member:', error);
      message.error(error.response?.data?.message || 'Failed to save staff member');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleViewStaff(record)}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#f0f5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            color: '#1890ff',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {text.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#262626', textDecoration: 'underline' }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Staff ID',
      dataIndex: 'staffId',
      key: 'staffId',
      render: (text) => (
        <Tag color="blue" style={{ fontSize: '12px' }}>{text}</Tag>
      ),
    },
    {
      title: 'Contact',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => (
        <div style={{ fontSize: '14px', color: '#262626' }}>{text}</div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department, record) => (
        <Select
          value={department || 'General'}
          style={{ width: 120 }}
          bordered={true}
          onChange={(val) => handleDepartmentChange(record, val)}
          disabled={updatingStaffId === record.id}
          size="small"
        >
          {departments.map(d => (
            <Option key={d.id} value={d.name}>{d.name}</Option>
          ))}
          {departments.length === 0 && <Option value="General">General</Option>}
        </Select>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'} style={{ fontSize: '12px' }}>
          {role}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch
            size="small"
            checked={status === 'active'}
            onChange={(checked) => handleToggleStaffStatus(record, checked)}
            loading={updatingStaffId === record.id}
          />
          <Text style={{ fontSize: '12px', color: status === 'active' ? '#52c41a' : '#bfbfbf', fontWeight: '500' }}>
            {status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined style={{ color: '#1890ff' }} />,
                label: 'View',
                onClick: () => handleViewStaff(record)
              },
              {
                key: 'edit',
                icon: <EditOutlined style={{ color: '#faad14' }} />,
                label: 'Edit',
                onClick: () => handleEditStaff(record)
              },
              {
                key: 'issue_letter',
                icon: <FileTextOutlined style={{ color: '#52c41a' }} />,
                label: 'Issue Letter',
                onClick: () => {
                  setIssuingForStaff(record);
                  setIssueModalVisible(true);
                  setAttachments([]);
                  setAttachmentPreviews([]);
                  issueForm.resetFields();
                }
              }
            ]
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            style={{
              border: 'none',
              boxShadow: 'none',
              padding: '4px 8px',
              height: 'auto'
            }}
          />
        </Dropdown>
      ),
    },
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
            <Title level={4} style={{ margin: 0 }}>Staff Management</Title>
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

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Modal
            title={`Issue Letter to ${issuingForStaff?.name}`}
            open={issueModalVisible}
            onCancel={() => setIssueModalVisible(false)}
            onOk={() => issueForm.submit()}
            confirmLoading={issuingLetter}
            destroyOnClose
          >
            <Form form={issueForm} layout="vertical" onFinish={async (values) => {
              setIssuingLetter(true);
              try {
                const formData = new FormData();
                formData.append('staffUserId', issuingForStaff.id);
                formData.append('templateId', values.templateId);
                
                if (attachments && attachments.length > 0) {
                    attachments.forEach(file => formData.append('attachments', file));
                }

                const resp = await api.post('/admin/letters/issue', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (resp.data.success) {
                  message.success('Letter issued successfully');
                  setIssueModalVisible(false);
                  setAttachments([]);
                  setAttachmentPreviews([]);
                  navigate('/settings/letters');
                } else {
                  message.error(resp.data.message || 'Failed to issue letter');
                }
              } catch (e) {
                message.error('Failed to issue letter');
              } finally {
                setIssuingLetter(false);
              }
            }}>
              <Form.Item name="templateId" label="Select Letter Template" rules={[{ required: true }]}>
                <Select placeholder="Choose a template">
                  {letterTemplates.map(t => (
                    <Option key={t.id} value={t.id}>{t.title}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>The letter will be generated based on the selected template with staff details automatically filled in.</Text>
              
              <div style={{ marginTop: 20 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Additional Attachments (Optional)</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <Button
                    icon={<UploadOutlined />}
                    onClick={() => document.getElementById('staff-letter-attachment-input-modal').click()}
                  >
                    Select Files
                  </Button>
                  <input
                    id="staff-letter-attachment-input-modal"
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) {
                        const total = attachments.length + files.length;
                        if (total > 5) {
                          message.warning('You can only upload up to 5 attachments');
                          return;
                        }

                        setAttachments([...attachments, ...files]);
                        
                        files.forEach(file => {
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (re) => {
                              setAttachmentPreviews(prev => [...prev, { name: file.name, preview: re.target.result }]);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setAttachmentPreviews(prev => [...prev, { name: file.name, preview: 'file' }]);
                          }
                        });
                      }
                    }}
                  />
                </div>
                
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attachments.map((file, idx) => {
                    const previewObj = attachmentPreviews.find(p => p.name === file.name);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#f5f5f5', borderRadius: 4 }}>
                        {previewObj?.preview === 'file' ? (
                          <FileTextOutlined style={{ fontSize: 20, color: '#125EC9' }} />
                        ) : (
                          <img src={previewObj?.preview} alt="preview" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 2 }} />
                        )}
                        <Text ellipsis style={{ flex: 1 }}>{file.name}</Text>
                        <CloseCircleOutlined
                          style={{ color: '#ff4d4f', cursor: 'pointer' }}
                          onClick={() => {
                            const newAttachments = attachments.filter((_, i) => i !== idx);
                            const newPreviews = attachmentPreviews.filter(p => p.name !== file.name);
                            setAttachments(newAttachments);
                            setAttachmentPreviews(newPreviews);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Form>
          </Modal>


          {/* Top Stats Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Total Employees</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{totalEmployees}</div>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#e6f7ff',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Active Employees</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>
                      {activeEmployees}
                    </div>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#f6ffed',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>


                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>On Leave</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>
                      {onLeaveEmployees}
                    </div>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#fff2e8',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarOutlined style={{ color: '#fa8c16', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>


                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                style={{
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  borderRadius: '4px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>New Hires</div>
                    <div style={{ color: '#262626', fontSize: '20px', fontWeight: '600', lineHeight: 1 }}>{newHires}</div>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#f9f0ff',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PlusOutlined style={{ color: '#722ed1', fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>


                </div>
              </Card>
            </Col>
          </Row>

          {/* Upcoming Anniversaries - Commented Out */}
          {/* <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <Card 
                title={<span style={{ fontSize: '15px', fontWeight: '500', color: '#262626' }}>Upcoming Anniversaries</span>}
                style={{ 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', 
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Row gutter={[16, 16]}>
                  {[
                    { name: 'John Doe', department: 'IT', years: 5, date: 'Dec 20', color: '#52c41a' },
                    { name: 'Jane Smith', department: 'HR', years: 3, date: 'Dec 22', color: '#1890ff' },
                    { name: 'Mike Johnson', department: 'Sales', years: 2, date: 'Dec 25', color: '#faad14' },
                    { name: 'Sarah Williams', department: 'Marketing', years: 1, date: 'Dec 28', color: '#722ed1' }
                  ].map((anniversary, index) => (
                    <Col xs={24} sm={12} md={6} key={index}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px',
                        background: '#fafafa',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: anniversary.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}>
                          {anniversary.years}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#262626', marginBottom: '2px' }}>
                            {anniversary.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {anniversary.department} • {anniversary.years} years
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'right' }}>
                          {anniversary.date}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row> */}

          <Card
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              borderRadius: '4px',
              border: '1px solid #e8e8e8'
            }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Title level={4} style={{ margin: 0, color: '#262626' }}>Staff Management</Title>
                  <Search
                    placeholder="Search staff..."
                    allowClear
                    onSearch={handleSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{ width: 250 }}
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    icon={<PlusOutlined />}
                    onClick={handleUpdateAllStaff}
                    loading={bulkUpdating}
                  >
                    Update All Staff
                  </Button>
                  <Dropdown
                    menu={{
                      items: staffMenuItems,
                      onClick: handleMenuClick
                    }}
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <Button type="primary" icon={<PlusOutlined />}>
                      Add Staff
                    </Button>
                  </Dropdown>
                </Space>
              </div>
            }
          >

            {/* Table */}
            <Table
              columns={columns}
              dataSource={filteredStaff}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                size: 'default'
              }}
              scroll={{ x: 1000 }}
              size="middle"
              style={{
                background: '#fff',
                borderRadius: '4px'
              }}
            />
          </Card>

          <Modal
            title="Add Regular Staff"
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
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="staffId"
                    label="Staff ID"
                    rules={[{ required: true, message: 'Please enter staff ID' }]}
                  >
                    <Input placeholder="Enter unique staff ID" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[{ required: true, message: 'Please enter phone number' }]}
                  >
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please enter full name' }]}
                  >
                    <Input placeholder="Enter full name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      { type: 'email', message: 'Please enter valid email' }
                    ]}
                  >
                    <Input placeholder="Enter email address" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="department"
                    label="Department"
                    rules={[{ required: true, message: 'Please select department' }]}
                  >
                    <Select placeholder="Select department">
                      {departments.map(d => (
                        <Option key={d.id} value={d.name}>{d.name}</Option>
                      ))}
                      {departments.length === 0 && <Option value="General">General</Option>}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="designation"
                    label="Designation"
                    rules={[{ required: true, message: 'Please enter designation' }]}
                  >
                    <Input placeholder="Enter job designation" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="basic_salary"
                    label="Basic Salary"
                    rules={[{ required: true, message: 'Please enter basic salary' }]}
                  >
                    <Input type="number" placeholder="Enter basic salary" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="hra"
                    label="HRA"
                    rules={[{ required: true, message: 'Please enter HRA' }]}
                  >
                    <Input type="number" placeholder="Enter HRA amount" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="da"
                    label="DA"
                    rules={[{ required: true, message: 'Please enter DA' }]}
                  >
                    <Input type="number" placeholder="Enter DA amount" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="special_allowance"
                    label="Special Allowance"
                  >
                    <Input type="number" placeholder="Enter special allowance" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="conveyance_allowance"
                    label="Conveyance Allowance"
                  >
                    <Input type="number" placeholder="Enter conveyance allowance" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="medical_allowance"
                    label="Medical Allowance"
                  >
                    <Input type="number" placeholder="Enter medical allowance" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="telephone_allowance"
                    label="Telephone Allowance"
                  >
                    <Input type="number" placeholder="Enter telephone allowance" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="other_allowances"
                    label="Other Allowances"
                  >
                    <Input type="number" placeholder="Enter other allowances" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please enter password' }]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>

              <Form.Item
                name="active"
                label="Status"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setModalVisible(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Create Staff
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="Import Staff from Excel"
            open={importModalVisible}
            onCancel={() => setImportModalVisible(false)}
            footer={null}
            width={600}
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p>Download the template, fill it with staff details, and upload it back.</p>

              <div style={{ textAlign: 'left', marginBottom: '24px', padding: '12px', background: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                <Text strong>Expected Excel Fields:</Text>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li><Text code>Name</Text> (Full name of the staff)</li>
                  <li><Text code>Staff ID</Text> (Unique employee ID)</li>
                  <li><Text code>Phone Number</Text> (Required - used for login)</li>
                  <li><Text code>Designation</Text> (Job title)</li>
                  <li><Text code>Joining Date</Text> (Format: YYYY-MM-DD)</li>
                  <li><Text code>Email Address</Text></li>
                </ul>
              </div>

              <Button
                icon={<DownloadOutlined />}
                onClick={async () => {
                  try {
                    const response = await api.get('/admin/staff/import-template', {
                      responseType: 'blob',
                    });
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'staff_import_template.xlsx');
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (error) {
                    message.error('Failed to download template');
                  }
                }}
                style={{ marginBottom: '24px' }}
                type="primary"
                ghost
              >
                Download Excel Template
              </Button>

              <Upload.Dragger
                name="file"
                multiple={false}
                action={`${api.defaults.baseURL}/admin/staff/import`}
                headers={{
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                }}
                onChange={(info) => {
                  const { status } = info.file;
                  if (status === 'uploading') {
                    setImporting(true);
                  }
                  if (status === 'done') {
                    setImporting(false);
                    message.success(`${info.file.name} file uploaded successfully.`);
                    setImportResults(info.file.response?.results);
                    fetchStaff();
                  } else if (status === 'error') {
                    setImporting(false);
                    message.error(`${info.file.name} file upload failed.`);
                  }
                }}
                showUploadList={false}
                disabled={importing}
              >
                <p className="ant-upload-drag-icon">
                  <UploadOutlined />
                </p>
                <p className="ant-upload-text">Click or drag Excel file to this area to upload</p>
                <p className="ant-upload-hint">Support for a single .xlsx file.</p>
              </Upload.Dragger>

              {importResults && (
                <div style={{ marginTop: '24px', textAlign: 'left', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <Typography.Title level={5}>Import Results</Typography.Title>
                  <div style={{ marginBottom: '8px' }}>
                    <Tag color="success">Success: {importResults.success}</Tag>
                    <Tag color="warning">Skipped: {importResults.skipped}</Tag>
                    <Tag color="error">Failed: {importResults.failed}</Tag>
                  </div>
                  {importResults.errors && importResults.errors.length > 0 && (
                    <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '12px', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                      <ul style={{ paddingLeft: '20px', margin: 0 }}>
                        {importResults.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default StaffManagement;
