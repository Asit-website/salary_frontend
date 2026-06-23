import React, { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { Layout, Card, Button, Space, Table, Input, Typography, Row, Col, Statistic, Tag, Radio, DatePicker, message } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, WalletOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function PayoutsHistory() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('SUCCESS');
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [searchText, setSearchText] = useState('');

  const fetchPayoutDetails = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/settings/payout-wallet');
      if (resp?.data?.success) {
        const txs = resp.data.wallet?.transactions || [];
        setTransactions(txs.filter(tx => tx.type === 'DISBURSEMENT'));
      }
    } catch (e) {
      console.error('Failed to load payouts history', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      message.loading('Generating Excel report...', 1.5);
      const startStr = selectedMonth ? selectedMonth.startOf('month').toISOString() : '';
      const endStr = selectedMonth ? selectedMonth.endOf('month').toISOString() : '';
      const response = await api.get('/admin/settings/payout-wallet/export-excel', {
        params: {
          type: 'DISBURSEMENT',
          startDate: startStr,
          endDate: endStr,
          status: statusFilter
        },
        responseType: 'blob'
      });

      // Create file link
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthStr = selectedMonth ? selectedMonth.format('MMMM_YYYY') : new Date().toISOString().slice(0, 10);
      const filename = `payouts_report_${monthStr}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Excel report downloaded successfully!');
    } catch (e) {
      console.error(e);
      message.error('Failed to export Excel report: ' + (e.response?.data?.message || e.message || ''));
    }
  };

  useEffect(() => {
    fetchPayoutDetails();
  }, []);

  const getActualStatus = (tx) => {
    let status = (tx.status || '').toUpperCase();
    if (status === 'SUCCESS' && tx.remarks) {
      const remarksLower = tx.remarks.toLowerCase();
      if (remarksLower.includes('(queued)')) return 'QUEUED';
      if (remarksLower.includes('(pending)')) return 'PENDING';
      if (remarksLower.includes('(processing)')) return 'PROCESSING';
      if (remarksLower.includes('(initiated)')) return 'INITIATED';
    }
    return status;
  };

  // 1. Filter by month and text search
  const monthFilteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Month Filter
      if (selectedMonth) {
        const txDate = new Date(tx.date);
        const selectedYear = selectedMonth.year();
        const selectedMonthIdx = selectedMonth.month(); // 0-indexed
        if (txDate.getFullYear() !== selectedYear || txDate.getMonth() !== selectedMonthIdx) {
          return false;
        }
      }

      // Text Search
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        const staffName = tx.staffName || (tx.remarks?.match(/Salary to\s+(.+?)\s+via/) || [])[1] || '';
        const remarks = tx.remarks || '';
        const id = tx.id || '';
        const matches = 
          id.toLowerCase().includes(searchLower) ||
          staffName.toLowerCase().includes(searchLower) ||
          remarks.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, searchText]);

  // 2. Compute Statistics over month/search-filtered transactions
  const stats = useMemo(() => {
    let successSum = 0;
    let successCount = 0;
    let failedSum = 0;
    let failedCount = 0;
    let pendingSum = 0;
    let pendingCount = 0;

    monthFilteredTransactions.forEach(tx => {
      const amt = Number(tx.amount || 0);
      const actualStatus = getActualStatus(tx);

      if (actualStatus === 'SUCCESS' || actualStatus === 'PROCESSED') {
        successSum += amt;
        successCount++;
      } else if (
        actualStatus === 'QUEUED' || 
        actualStatus === 'PENDING' || 
        actualStatus === 'PROCESSING' || 
        actualStatus === 'INITIATED'
      ) {
        pendingSum += amt;
        pendingCount++;
      } else {
        failedSum += amt;
        failedCount++;
      }
    });

    return {
      successSum,
      successCount,
      failedSum,
      failedCount,
      pendingSum,
      pendingCount
    };
  }, [monthFilteredTransactions]);

  // 3. Filter by Status (for the Table display)
  const filteredTransactions = useMemo(() => {
    return monthFilteredTransactions.filter(tx => {
      const actualStatus = getActualStatus(tx);

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'SUCCESS') {
          if (actualStatus !== 'SUCCESS' && actualStatus !== 'PROCESSED') return false;
        } else if (statusFilter === 'PENDING') {
          if (
            actualStatus !== 'QUEUED' && 
            actualStatus !== 'PENDING' && 
            actualStatus !== 'PROCESSING' && 
            actualStatus !== 'INITIATED'
          ) return false;
        } else if (statusFilter === 'FAILED') {
          if (
            actualStatus === 'SUCCESS' || 
            actualStatus === 'PROCESSED' || 
            actualStatus === 'QUEUED' || 
            actualStatus === 'PENDING' || 
            actualStatus === 'PROCESSING' || 
            actualStatus === 'INITIATED'
          ) return false;
        }
      }

      return true;
    });
  }, [monthFilteredTransactions, statusFilter]);

  const columns = [
    {
      title: 'Transaction ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id}</Text>
    },
    {
      title: 'Staff Name',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name, record) => {
        const staffName = name || (record.remarks?.match(/Salary to\s+(.+?)\s+via/) || [])[1] || '—';
        return <Text strong style={{ color: '#1e293b' }}>{staffName}</Text>;
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: '#0f172a' }}>
          ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <Text>{new Date(date).toLocaleString('en-IN')}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const actualStatus = getActualStatus(record);
        let color = 'default';
        if (actualStatus === 'SUCCESS' || actualStatus === 'PROCESSED') {
          color = 'success';
        } else if (actualStatus === 'QUEUED') {
          color = 'warning';
        } else if (actualStatus === 'PROCESSING') {
          color = 'processing';
        } else if (actualStatus === 'PENDING' || actualStatus === 'INITIATED') {
          color = 'orange';
        } else {
          color = 'error';
        }
        return (
          <Tag color={color} style={{ borderRadius: '6px', fontWeight: 'bold' }}>
            {actualStatus}
          </Tag>
        );
      }
    },
    {
      title: 'Remarks/Details',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (remarks) => <Text type="secondary" style={{ fontSize: '13px' }}>{remarks}</Text>
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} title="Payouts History" />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          
          {/* Title Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                shape="circle" 
                onClick={() => navigate('/payroll')} 
                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
              />
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>Payouts History</Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Audit salary disbursements and instant transfers processed via Razorpay</Text>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
                <Statistic 
                  title={<span style={{ fontWeight: '600', color: '#64748b' }}>Successful Payouts</span>}
                  value={stats.successSum}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#10b981', fontWeight: '800', fontSize: '20px' }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {stats.successCount} transactions completed
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
                <Statistic 
                  title={<span style={{ fontWeight: '600', color: '#64748b' }}>Pending Payouts</span>}
                  value={stats.pendingSum}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#f59e0b', fontWeight: '800', fontSize: '20px' }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {stats.pendingCount} transactions in queue
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #ef4444' }}>
                <Statistic 
                  title={<span style={{ fontWeight: '600', color: '#64748b' }}>Failed Payouts</span>}
                  value={stats.failedSum}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#ef4444', fontWeight: '800', fontSize: '20px' }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {stats.failedCount} transactions failed
                </div>
              </Card>
            </Col>
          </Row>

          {/* Filter Card */}
          <Card style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Search by Staff Name or Transaction ID"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ borderRadius: '8px' }}
                  allowClear
                />
              </Col>
              <Col xs={24} md={8}>
                <DatePicker 
                  picker="month" 
                  value={selectedMonth} 
                  onChange={(val) => setSelectedMonth(val || dayjs())} 
                  style={{ width: '100%', borderRadius: '8px' }}
                  format="MMMM YYYY"
                  allowClear={false}
                />
              </Col>
              <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                <Radio.Group 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)} 
                  buttonStyle="solid"
                >
                  <Radio.Button value="SUCCESS">Success</Radio.Button>
                  <Radio.Button value="FAILED">Failed</Radio.Button>
                  <Radio.Button value="PENDING">Pending</Radio.Button>
                  <Radio.Button value="ALL">All</Radio.Button>
                </Radio.Group>
              </Col>
            </Row>
          </Card>

          {/* Table Card */}
          <Card 
            title={<span style={{ fontWeight: '700', color: '#3b82f6' }}>Salary Disbursement History</span>}
            extra={
              <Button
                type="primary"
                onClick={handleExportExcel}
                icon={<FileExcelOutlined />}
                style={{ 
                  borderRadius: '8px', 
                  background: '#16a34a', 
                  borderColor: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: '600'
                }}
              >
                Export to Excel
              </Button>
            }
            style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
          >
            <Table 
              dataSource={filteredTransactions}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
              size="small"
              loading={loading}
              bordered
            />
          </Card>

        </Content>
      </Layout>
    </Layout>
  );
}
