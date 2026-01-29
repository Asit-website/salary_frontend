import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Card, Radio, Button, message, Space, Typography, Switch, Table, Input, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function SalaryDetailsAccess() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('none');
  const [enabled, setEnabled] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [q, setQ] = useState('');

  const fetchList = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/salary/access');
      const rows = resp?.data?.items || [];
      setItems(rows);
      const allTrue = rows.length > 0 && rows.every(r => !!r.allowCurrentCycle);
      const allFalse = rows.length > 0 && rows.every(r => !r.allowCurrentCycle);
      if (allTrue) setMode('all');
      else if (allFalse) setMode('none');
      else setMode('selected');
      setSelectedIds(rows.filter(r => r.allowCurrentCycle).map(r => r.userId));
      setEnabled(rows.some(r => r.allowCurrentCycle));
    } catch (e) {
      message.error('Failed to load salary access list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    if (mode === 'all') setSelectedIds(items.map(r => r.userId));
    if (mode === 'none') setSelectedIds([]);
  }, [mode, items]);

  const allIds = useMemo(() => items.map(r => r.userId), [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r =>
      String(r.name || '').toLowerCase().includes(term) ||
      String(r.phone || '').toLowerCase().includes(term) ||
      String(r.staffId || '').toLowerCase().includes(term)
    );
  }, [items, q]);

  const onConfirm = async () => {
    try {
      setSaving(true);
      if (!enabled) {
        if (allIds.length) await api.put('/admin/salary/access-bulk', { userIds: allIds, allowCurrentCycle: false });
        message.success('Saved');
        fetchList();
        return;
      }
      if (mode === 'all') {
        if (allIds.length) await api.put('/admin/salary/access-bulk', { userIds: allIds, allowCurrentCycle: true });
      } else if (mode === 'none') {
        if (allIds.length) await api.put('/admin/salary/access-bulk', { userIds: allIds, allowCurrentCycle: false });
      } else {
        const sel = Array.from(new Set(selectedIds));
        const unSel = allIds.filter(id => !sel.includes(id));
        if (sel.length) await api.put('/admin/salary/access-bulk', { userIds: sel, allowCurrentCycle: true });
        if (unSel.length) await api.put('/admin/salary/access-bulk', { userIds: unSel, allowCurrentCycle: false });
      }
      message.success('Saved');
      fetchList();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Staff ID', dataIndex: 'staffId', key: 'staffId', width: 120 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140 },
    {
      title: 'Access', key: 'access', width: 120,
      render: (_, r) => r.allowCurrentCycle ? <Tag color="green">Allowed</Tag> : <Tag>Blocked</Tag>
    },
  ];

  const rowSelection = mode === 'selected' ? {
    selectedRowKeys: selectedIds,
    onChange: (keys) => setSelectedIds(keys),
    getCheckboxProps: () => ({ disabled: !enabled }),
  } : undefined;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(-1)}>Back</Button>
            <Title level={4} style={{ margin: 0 }}>Salary Details Access</Title>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Text>Staff with salary details access can see their salary slips and payment details in their Staff App.</Text>
            </div>
            <Space wrap>
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} disabled={!enabled}>
                <Radio.Button value="all">All</Radio.Button>
                <Radio.Button value="none">None</Radio.Button>
                <Radio.Button value="selected">Selected staff</Radio.Button>
              </Radio.Group>
              <div style={{ marginLeft: 16 }}>
                <Space>
                  <Switch checked={enabled} onChange={setEnabled} />
                  <Text>Allow Current Cycle Salary Access</Text>
                </Space>
              </div>
            </Space>

            {mode === 'selected' ? (
              <div style={{ marginTop: 16 }}>
                <Input.Search placeholder="Search by name, phone or staff id" allowClear style={{ maxWidth: 320, marginBottom: 12 }} value={q} onChange={(e) => setQ(e.target.value)} />
                <Table
                  size="middle"
                  loading={loading}
                  dataSource={filtered}
                  columns={columns}
                  rowKey="userId"
                  pagination={{ pageSize: 10 }}
                  rowSelection={rowSelection}
                />
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Space>
                <Button onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="primary" loading={saving} onClick={onConfirm}>Confirm</Button>
              </Space>
            </div>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
