import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, message, Space, Table, Input, Select, Typography, Popconfirm, Modal } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

const FIELD_OPTIONS = [
  { value: 'employeeName', label: 'Beneficiary Name (Staff Name)' },
  { value: 'staffId', label: 'Employee ID (Staff ID)' },
  { value: 'bankAccountNumber', label: 'Bank Account Number' },
  { value: 'bankIfsc', label: 'Bank IFSC' },
  { value: 'netSalary', label: 'Net Salary (Payout Amount)' },
  { value: 'reference', label: 'Reference Code (Auto-generated)' },
  { value: 'customConstant', label: 'Custom Constant (Fixed Value)' }
];

export default function PayoutSettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);

  // Modals for add/rename layouts
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('ADD'); // 'ADD' or 'RENAME'
  const [layoutName, setLayoutName] = useState('');
  const [editingConfigId, setEditingConfigId] = useState(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/settings/payout-bank-config');
      if (resp?.data?.success) {
        const list = resp.data.configs || [];
        setConfigs(list);
        if (list.length > 0) {
          setSelectedConfigId(list[0].id);
        }
      }
    } catch (e) {
      message.error('Failed to load payout configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const activeConfig = configs.find(c => c.id === selectedConfigId) || null;

  const handleSaveAll = async (updatedConfigs) => {
    try {
      setSaving(true);
      const resp = await api.put('/admin/settings/payout-bank-config', { configs: updatedConfigs || configs });
      if (resp?.data?.success) {
        message.success('Payout bank configurations saved successfully');
        setConfigs(resp.data.configs || []);
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save configurations');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setModalMode('ADD');
    setLayoutName('');
    setIsModalOpen(true);
  };

  const openRenameModal = (config) => {
    setModalMode('RENAME');
    setLayoutName(config.name);
    setEditingConfigId(config.id);
    setIsModalOpen(true);
  };

  const handleModalSubmit = () => {
    const name = layoutName.trim();
    if (!name) {
      message.warning('Please enter a layout name');
      return;
    }

    let updated = [...configs];
    if (modalMode === 'ADD') {
      const newId = `layout_${Date.now()}`;
      const newLayout = {
        id: newId,
        name: name,
        mappings: [
          { fieldName: 'employeeName', headerName: 'Beneficiary Name' },
          { fieldName: 'bankAccountNumber', headerName: 'Account Number' },
          { fieldName: 'bankIfsc', headerName: 'IFSC Code' },
          { fieldName: 'netSalary', headerName: 'Net Pay' }
        ]
      };
      updated.push(newLayout);
      setSelectedConfigId(newId);
      message.success('New layout created');
    } else {
      updated = updated.map(c => {
        if (c.id === editingConfigId) {
          return { ...c, name };
        }
        return c;
      });
      message.success('Layout renamed');
    }

    setConfigs(updated);
    setIsModalOpen(false);
    handleSaveAll(updated);
  };

  const handleDeleteLayout = (id) => {
    const updated = configs.filter(c => c.id !== id);
    setConfigs(updated);
    if (selectedConfigId === id) {
      setSelectedConfigId(updated.length > 0 ? updated[0].id : null);
    }
    message.success('Layout deleted');
    handleSaveAll(updated);
  };

  // Mappings grid manipulations
  const updateMappingField = (index, key, val) => {
    if (!activeConfig) return;
    const updatedMappings = [...(activeConfig.mappings || [])];
    updatedMappings[index] = {
      ...updatedMappings[index],
      [key]: val
    };

    const updatedConfigs = configs.map(c => {
      if (c.id === activeConfig.id) {
        return { ...c, mappings: updatedMappings };
      }
      return c;
    });

    setConfigs(updatedConfigs);
  };

  const addColumn = () => {
    if (!activeConfig) return;
    const updatedMappings = [...(activeConfig.mappings || [])];
    updatedMappings.push({
      fieldName: 'employeeName',
      headerName: `New Column ${updatedMappings.length + 1}`
    });

    const updatedConfigs = configs.map(c => {
      if (c.id === activeConfig.id) {
        return { ...c, mappings: updatedMappings };
      }
      return c;
    });

    setConfigs(updatedConfigs);
  };

  const deleteColumn = (index) => {
    if (!activeConfig) return;
    const updatedMappings = (activeConfig.mappings || []).filter((_, i) => i !== index);

    const updatedConfigs = configs.map(c => {
      if (c.id === activeConfig.id) {
        return { ...c, mappings: updatedMappings };
      }
      return c;
    });

    setConfigs(updatedConfigs);
  };

  const moveColumn = (index, direction) => {
    if (!activeConfig) return;
    const mappings = [...(activeConfig.mappings || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= mappings.length) return;

    // Swap
    const temp = mappings[index];
    mappings[index] = mappings[targetIndex];
    mappings[targetIndex] = temp;

    const updatedConfigs = configs.map(c => {
      if (c.id === activeConfig.id) {
        return { ...c, mappings };
      }
      return c;
    });

    setConfigs(updatedConfigs);
  };

  const getColLetter = (index) => {
    return String.fromCharCode(65 + index); // A, B, C...
  };

  const columns = [
    {
      title: 'Col',
      key: 'colIndex',
      width: 60,
      render: (_, __, idx) => <Text strong style={{ color: '#0f172a' }}>{getColLetter(idx)}</Text>
    },
    {
      title: 'Header Column Label',
      dataIndex: 'headerName',
      key: 'headerName',
      width: 250,
      render: (text, _, idx) => (
        <Input 
          value={text} 
          placeholder="e.g. Beneficiary Name"
          onChange={(e) => updateMappingField(idx, 'headerName', e.target.value)} 
          style={{ borderRadius: '6px' }}
        />
      )
    },
    {
      title: 'Maps to Payroll Field',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 280,
      render: (text, _, idx) => (
        <Select 
          value={text} 
          style={{ width: '100%' }}
          onChange={(val) => updateMappingField(idx, 'fieldName', val)}
          options={FIELD_OPTIONS}
        />
      )
    },
    {
      title: 'Custom Constant Value',
      dataIndex: 'customValue',
      key: 'customValue',
      render: (text, record, idx) => (
        <Input 
          value={text || ''} 
          placeholder="e.g. SALARY or PAYROLL"
          disabled={record.fieldName !== 'customConstant'}
          onChange={(e) => updateMappingField(idx, 'customValue', e.target.value)} 
          style={{ borderRadius: '6px' }}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, __, idx) => (
        <Space size={8}>
          <Button 
            icon={<ArrowUpOutlined />} 
            size="small" 
            disabled={idx === 0} 
            onClick={() => moveColumn(idx, -1)} 
          />
          <Button 
            icon={<ArrowDownOutlined />} 
            size="small" 
            disabled={idx === (activeConfig?.mappings || []).length - 1} 
            onClick={() => moveColumn(idx, 1)} 
          />
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            size="small" 
            onClick={() => deleteColumn(idx)} 
          />
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Payout Settings" />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              shape="circle" 
              onClick={() => navigate('/settings')} 
              style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            />
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>Payout Bank Config</Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>Configure custom file layouts for salary payouts</Text>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>
            
            {/* Left panel - Bank layout lists */}
            <Card 
              style={{ width: '280px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
              bodyStyle={{ padding: '16px' }}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Bank Layouts</span>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="small" 
                    onClick={openAddModal}
                    style={{ borderRadius: '6px' }}
                  />
                </div>
              }
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading...</div>
              ) : configs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No layouts configured. Add one to start.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {configs.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConfigId(c.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: selectedConfigId === c.id ? '#e6f7ff' : '#f8fafc',
                        border: selectedConfigId === c.id ? '1px solid #91d5ff' : '1px solid #f1f5f9',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Text strong style={{ fontSize: '13px', color: selectedConfigId === c.id ? '#059669' : '#334155' }}>
                        {c.name}
                      </Text>
                      <Space size={6}>
                        <Button 
                          icon={<EditOutlined style={{ fontSize: '12px' }} />} 
                          size="small" 
                          type="text" 
                          onClick={(e) => { e.stopPropagation(); openRenameModal(c); }}
                        />
                        <Popconfirm
                          title="Delete layout?"
                          description="Are you sure you want to delete this payout format?"
                          onConfirm={(e) => { e.stopPropagation(); handleDeleteLayout(c.id); }}
                          onCancel={(e) => e.stopPropagation()}
                          okText="Delete"
                          cancelText="Cancel"
                        >
                          <Button 
                            icon={<DeleteOutlined style={{ fontSize: '12px' }} />} 
                            size="small" 
                            type="text" 
                            danger 
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Right panel - Column definitions */}
            <Card
              style={{ flex: 1, borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
              bodyStyle={{ padding: '24px' }}
              title={
                activeConfig ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Title level={5} style={{ margin: 0, fontWeight: '700' }}>{activeConfig.name}</Title>
                      <Text type="secondary" style={{ fontSize: '11px' }}>Customize file headers and columns mapping</Text>
                    </div>
                    <Space>
                      <Button 
                        icon={<PlusOutlined />} 
                        onClick={addColumn}
                        style={{ borderRadius: '6px' }}
                      >
                        Add Column
                      </Button>
                      <Button 
                        type="primary" 
                        loading={saving} 
                        onClick={() => handleSaveAll()}
                        style={{ borderRadius: '6px' }}
                      >
                        Save Configurations
                      </Button>
                    </Space>
                  </div>
                ) : null
              }
            >
              {!activeConfig ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  <Title level={5} style={{ color: '#94a3b8' }}>No Layout Selected</Title>
                  <Text type="secondary">Create or select a bank layout from the left panel to configure its columns.</Text>
                </div>
              ) : (
                <Table 
                  dataSource={activeConfig.mappings || []}
                  columns={columns}
                  pagination={false}
                  rowKey={(_, idx) => idx}
                  size="small"
                  bordered
                />
              )}
            </Card>

          </div>
        </Content>
      </Layout>

      {/* Add / Rename Modal */}
      <Modal
        title={modalMode === 'ADD' ? 'Create Payout Layout' : 'Rename Payout Layout'}
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Submit"
        cancelText="Cancel"
      >
        <div style={{ marginTop: '16px' }}>
          <Text strong>Layout Name</Text>
          <Input 
            placeholder="e.g. SBI Corporate Payout" 
            value={layoutName} 
            onChange={(e) => setLayoutName(e.target.value)} 
            style={{ marginTop: '6px', borderRadius: '6px' }}
            onPressEnter={handleModalSubmit}
          />
        </div>
      </Modal>
    </Layout>
  );
}
