import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Layout, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Button, 
  Space, 
  Table, 
  Modal, 
  Form, 
  Select, 
  InputNumber, 
  Input, 
  DatePicker, 
  message 
} from 'antd';
import { PlusOutlined, ReloadOutlined, StarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function RatingSystem() {
  const [collapsed, setCollapsed] = useState(false);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [staffOptions, setStaffOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff');
      const list = Array.isArray(res?.data?.staff) ? res.data.staff : [];
      setStaffOptions(list.map((s) => ({ value: s.id, label: s.name || s.phone || `Staff #${s.id}` })));
    } catch (_) {}
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/performance/ratings', { params: { month } });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const summary = useMemo(() => {
    const total = rows.length;
    const avg = total ? (rows.reduce((acc, x) => acc + Number(x.rating || 0), 0) / total) : 0;
    return { total, avg };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ maxRating: 5, ratedAt: dayjs(), rating: 0 });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      userId: row.userId,
      metric: row.metric,
      rating: row.rating,
      maxRating: row.maxRating,
      ratedAt: dayjs(row.ratedAt),
      note: row.note,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        userId: v.userId,
        metric: v.metric,
        rating: v.rating,
        maxRating: v.maxRating,
        ratedAt: v.ratedAt ? dayjs(v.ratedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        note: v.note || null,
      };
      if (editing?.id) {
        await api.put(`/admin/performance/ratings/${editing.id}`, payload);
        message.success('Rating updated');
      } else {
        await api.post('/admin/performance/ratings', payload);
        message.success('Rating created');
      }
      setOpen(false);
      loadRows();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'Failed to save rating');
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
    { title: 'Metric', dataIndex: 'metric', key: 'metric', render: (v) => <span style={{ fontWeight: '500', color: '#262626' }}>{v}</span> },
    { title: 'Rating', dataIndex: 'rating', key: 'rating', render: (v, r) => <span style={{ fontWeight: '600', color: '#1677ff' }}>{Number(v || 0).toFixed(2)} / {Number(r.maxRating || 5).toFixed(2)}</span> },
    { title: 'Date', dataIndex: 'ratedAt', key: 'ratedAt', render: (date) => date ? dayjs(date).format('DD MMM YYYY') : '-' },
    { 
      title: 'Action', 
      key: 'action', 
      render: (_, row) => (
        <Button 
          size="small" 
          shape="round"
          onClick={() => openEdit(row)}
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
          title="Performance Management - Rating System" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          
          {/* Custom Dynamically Highlighted KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12}>
              <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Total Ratings Recorded</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#262626', lineHeight: '1.2' }}>{summary.total}</div>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: '20px', boxShadow: '0 4px 10px rgba(22, 119, 255, 0.1)' }}>
                    <StarOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className="sales-content-card" bodyStyle={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#8c8c8c', fontWeight: '500', marginBottom: '8px' }}>Average Rating</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#52c41a', lineHeight: '1.2' }}>
                      {summary.avg.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a', fontSize: '20px', boxShadow: '0 4px 10px rgba(82, 196, 26, 0.1)' }}>
                    <CheckCircleOutlined />
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
              <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Rating Registry</Title>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <DatePicker 
                  picker="month" 
                  value={dayjs(`${month}-01`)} 
                  onChange={(d) => setMonth(d ? d.format('YYYY-MM') : dayjs().format('YYYY-MM'))} 
                  style={{ borderRadius: '8px', height: '32px' }}
                />
                <Button shape="round" onClick={loadRows}>Refresh</Button>
                <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={openCreate}>New Rating</Button>
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
        title={editing ? 'Edit Rating Scorecard' : 'Record Staff Performance Rating'}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText={editing ? 'Update' : 'Create'}
        className="sales-modal"
        okButtonProps={{ shape: 'round' }}
        cancelButtonProps={{ shape: 'round' }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '12px' }}>
          <Form.Item name="userId" label={<span className="modal-field-label">Staff Member</span>} rules={[{ required: true, message: 'Select staff' }]}>
            <Select options={staffOptions} showSearch optionFilterProp="label" dropdownStyle={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="metric" label={<span className="modal-field-label">Performance Metric</span>} rules={[{ required: true, message: 'Enter metric' }]}>
            <Input placeholder="Punctuality / Quality / Teamwork" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="rating" label={<span className="modal-field-label">Rating score</span>} rules={[{ required: true, message: 'Enter rating' }]}>
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxRating" label={<span className="modal-field-label">Max rating limit</span>}>
                <InputNumber min={1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ratedAt" label={<span className="modal-field-label">Rated Date</span>} rules={[{ required: true, message: 'Select date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label={<span className="modal-field-label">Notes</span>}>
            <Input.TextArea rows={3} placeholder="Add detailed feedback note..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
