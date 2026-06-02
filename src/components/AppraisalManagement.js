import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Layout, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Input, 
  Button, 
  Space, 
  Table, 
  Modal, 
  Form, 
  Select, 
  InputNumber, 
  DatePicker, 
  message 
} from 'antd';
import { PlusOutlined, ReloadOutlined, CheckCircleOutlined, SendOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function AppraisalManagement() {
  const [collapsed, setCollapsed] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [periodMonth, setPeriodMonth] = useState(dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff');
      const list = Array.isArray(res?.data?.staff) ? res.data.staff : [];
      setStaffOptions(list.map((s) => ({
        value: s.id,
        label: s.name || s.phone || `Staff #${s.id}`,
      })));
    } catch (_) {}
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/performance/appraisals', { params: { periodMonth } });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load appraisals');
    } finally {
      setLoading(false);
    }
  }, [periodMonth]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const summary = useMemo(() => ({
    total: rows.length,
    completed: rows.filter((x) => x.status === 'COMPLETED').length,
    submitted: rows.filter((x) => x.status === 'SUBMITTED').length,
    draft: rows.filter((x) => x.status === 'DRAFT').length,
  }), [rows]);

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      periodMonth: dayjs(`${periodMonth}-01`),
      effectiveFrom: dayjs(),
      status: 'DRAFT',
      score: 0,
    });
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      userId: row.userId,
      title: row.title,
      periodMonth: dayjs(`${row.periodMonth}-01`),
      effectiveFrom: row.effectiveFrom ? dayjs(row.effectiveFrom) : dayjs(),
      score: row.score,
      status: row.status,
      remarks: row.remarks,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        userId: values.userId,
        title: values.title,
        periodMonth: values.periodMonth ? dayjs(values.periodMonth).format('YYYY-MM') : periodMonth,
        effectiveFrom: values.effectiveFrom ? dayjs(values.effectiveFrom).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        score: values.score,
        status: values.status,
        remarks: values.remarks || null,
      };
      if (editing?.id) {
        await api.put(`/admin/performance/appraisals/${editing.id}`, payload);
        message.success('Appraisal updated');
      } else {
        await api.post('/admin/performance/appraisals', payload);
        message.success('Appraisal created');
      }
      setOpen(false);
      loadRows();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save appraisal');
    }
  };

  const columns = [
    { 
      title: 'Staff', 
      key: 'staff', 
      render: (_, row) => {
        const name = row.staff || 'Unknown';
        const phone = row.phone || 'No phone';
        return (
          <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#e6f7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '10px',
              color: '#1677ff',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(22, 119, 255, 0.06)'
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: '600', color: '#1677ff', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '1px', whiteSpace: 'nowrap' }}>{phone}</div>
            </div>
          </div>
        );
      }
    },
    { title: 'Title', dataIndex: 'title', key: 'title', render: (v) => <span style={{ fontWeight: '500', color: '#262626' }}>{v}</span> },
    { title: 'Period', dataIndex: 'periodMonth', key: 'periodMonth' },
    { title: 'Effective From', dataIndex: 'effectiveFrom', key: 'effectiveFrom', render: (v) => (v || '-') },
    { title: 'Appraisal %', dataIndex: 'score', key: 'score', render: (v) => (v == null ? '-' : <span style={{ fontWeight: '600', color: '#1677ff' }}>{Number(v).toFixed(2)}%</span>) },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (v) => {
        const map = {
          DRAFT: 'sales-status-pending',
          SUBMITTED: 'sales-status-active',
          COMPLETED: 'sales-status-complete'
        };
        const cls = map[v] || 'sales-status-pending';
        return (
          <span className={`sales-status-tag ${cls}`} style={{ fontSize: '12px' }}>
            {v}
          </span>
        );
      } 
    },
    { 
      title: 'Action', 
      key: 'action', 
      render: (_, row) => (
        <Button 
          size="small" 
          shape="round"
          onClick={() => handleOpenEdit(row)}
        >
          Edit
        </Button>
      ) 
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Performance Management - Appraisal" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          
          {/* Custom Dynamically Highlighted KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Total Appraisals</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#262626', lineHeight: '1.2' }}>{summary.total}</div>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: '20px', boxShadow: '0 4px 10px rgba(22, 119, 255, 0.1)' }}>
                    <FileTextOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Completed</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#52c41a', lineHeight: '1.2' }}>{summary.completed}</div>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: '20px', boxShadow: '0 4px 10px rgba(82, 196, 26, 0.1)' }}>
                    <CheckCircleOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Submitted</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#722ed1', lineHeight: '1.2' }}>{summary.submitted}</div>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f9f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#722ed1', fontSize: '20px', boxShadow: '0 4px 10px rgba(114, 46, 209, 0.1)' }}>
                    <SendOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Draft</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#fa8c16', lineHeight: '1.2' }}>{summary.draft}</div>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fa8c16', fontSize: '20px', boxShadow: '0 4px 10px rgba(250, 140, 22, 0.1)' }}>
                    <EditOutlined />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Card
            className="sales-content-card"
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '16px' }}>
              <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Appraisal Registry</Title>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <DatePicker 
                  picker="month" 
                  value={dayjs(`${periodMonth}-01`)} 
                  onChange={(d) => setPeriodMonth(d ? d.format('YYYY-MM') : dayjs().format('YYYY-MM'))} 
                  style={{ borderRadius: '8px', height: '32px' }}
                />
                <Button shape="round" onClick={loadRows}>Refresh</Button>
                <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={handleOpenCreate}>New Appraisal</Button>
              </div>
            </div>

            <Table 
              rowKey="id" 
              columns={columns} 
              dataSource={rows} 
              loading={loading} 
              className="sales-table"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} entries`,
              }} 
            />
          </Card>
        </Content>
      </Layout>

      <Modal
        open={open}
        title={editing ? 'Edit Performance Appraisal Record' : 'Record New Staff Appraisal'}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Update' : 'Create'}
        className="sales-modal"
        okButtonProps={{ shape: 'round' }}
        cancelButtonProps={{ shape: 'round' }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '12px' }}>
          <Form.Item name="userId" label={<span className="modal-field-label">Staff Member</span>} rules={[{ required: true, message: 'Select staff' }]}>
            <Select options={staffOptions} showSearch optionFilterProp="label" dropdownStyle={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="title" label={<span className="modal-field-label">Title</span>} rules={[{ required: true, message: 'Enter title' }]}>
            <Input placeholder="Quarterly Appraisal" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="periodMonth" label={<span className="modal-field-label">Period Month</span>} rules={[{ required: true, message: 'Select month' }]}>
                <DatePicker picker="month" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effectiveFrom" label={<span className="modal-field-label">Effective From</span>} rules={[{ required: true, message: 'Select effective date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="score" label={<span className="modal-field-label">Appraisal Percentage (%)</span>} tooltip="0 to 100">
                <InputNumber
                  min={0}
                  max={100}
                  step={0.1}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value ?? ''}%`}
                  parser={(value) => String(value || '').replace('%', '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label={<span className="modal-field-label">Status</span>}>
                <Select dropdownStyle={{ borderRadius: '8px' }} options={[{ value: 'DRAFT', label: 'DRAFT' }, { value: 'SUBMITTED', label: 'SUBMITTED' }, { value: 'COMPLETED', label: 'COMPLETED' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label={<span className="modal-field-label">Remarks</span>}>
            <Input.TextArea rows={3} placeholder="Provide descriptive remarks for this appraisal record..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
