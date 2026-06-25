import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, Input, Switch, Select, Table, Typography, Space, Tag, Alert, message, Form, Row, Col, Spin, Divider, Collapse, Modal, Tabs } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, LinkOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function TallySettings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState('checking'); // checking, connected, offline
  const [tallyStatus, setTallyStatus] = useState('checking'); // checking, connected, offline

  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [form] = Form.useForm();
  const [includeEmployer, setIncludeEmployer] = useState(false);
  const [detectedHeads, setDetectedHeads] = useState([]);

  const handleDownloadExe = () => {
    setDownloadLoading(true);
    api.get('/admin/tally/download-bridge', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'vetansutra-tally-bridge.exe');
        document.body.appendChild(link);
        link.click();
        link.remove();
        message.success('Tally Bridge Agent download started successfully!');
      })
      .catch((error) => {
        console.error(error);
        message.error('Failed to download bridge agent. Please make sure the backend server is running and files exist.');
      })
      .finally(() => {
        setDownloadLoading(false);
      });
  };

  // Fetch Tally configuration and detected template heads
  const loadConfigAndHeads = async () => {
    try {
      setLoading(true);
      const [configResp, templatesResp] = await Promise.all([
        api.get('/admin/tally/config'),
        api.get('/admin/salary-templates')
      ]);

      let config = {};
      if (configResp.data?.success) {
        config = configResp.data.config || {};
      }
      setIncludeEmployer(!!config.includeEmployerContributions);

      // Extract unique salary heads from templates
      const templates = templatesResp.data?.data || [];
      const headsSet = new Set();
      
      templates.forEach(tpl => {
        if (Array.isArray(tpl.earnings)) {
          tpl.earnings.forEach(e => {
            if (e.key) headsSet.add(JSON.stringify({ key: e.key, label: e.label || e.key, type: 'EARNING' }));
          });
        }
        if (Array.isArray(tpl.deductions)) {
          tpl.deductions.forEach(d => {
            if (d.key) headsSet.add(JSON.stringify({ key: d.key, label: d.label || d.key, type: 'DEDUCTION' }));
          });
        }
      });

      // Default standard fallbacks
      const standardHeads = [
        { key: 'basic', label: 'Basic Salary', type: 'EARNING' },
        { key: 'hra', label: 'HRA', type: 'EARNING' },
        { key: 'da', label: 'DA', type: 'EARNING' },
        { key: 'special_allowance', label: 'Special Allowance', type: 'EARNING' },
        { key: 'conveyance_allowance', label: 'Conveyance Allowance', type: 'EARNING' },
        { key: 'overtime_pay', label: 'Overtime Pay', type: 'EARNING' },
        { key: 'provident_fund', label: 'PF (Employee)', type: 'DEDUCTION' },
        { key: 'esi', label: 'ESI (Employee)', type: 'DEDUCTION' },
        { key: 'professional_tax', label: 'Professional Tax', type: 'DEDUCTION' },
        { key: 'tds', label: 'TDS', type: 'DEDUCTION' }
      ];

      standardHeads.forEach(head => headsSet.add(JSON.stringify(head)));

      const uniqueHeads = Array.from(headsSet).map(s => JSON.parse(s));
      setDetectedHeads(uniqueHeads);

      // Prepare ledgerMap initial values
      const initialMap = config.ledgerMap || {};
      const formLedgerMap = {};

      uniqueHeads.forEach(h => {
        formLedgerMap[h.key] = initialMap[h.key] || '';
      });

      // Add net salary payable key
      formLedgerMap['net_salary'] = initialMap['net_salary'] || '';

      // Add employer entries if enabled
      formLedgerMap['employer_pf'] = initialMap['employer_pf'] || '';
      formLedgerMap['employer_esi'] = initialMap['employer_esi'] || '';
      formLedgerMap['employer_pf_payable'] = initialMap['employer_pf_payable'] || '';
      formLedgerMap['employer_esi_payable'] = initialMap['employer_esi_payable'] || '';

      form.setFieldsValue({
        bridgeUrl: config.bridgeUrl || 'http://localhost:7000',
        tallyUrl: config.tallyUrl || 'http://localhost:9000',
        companyName: config.companyName || 'ABC Pvt Ltd',
        voucherType: config.voucherType || 'Journal',
        narrationFormat: config.narrationFormat || 'Salary for {month} {year}',
        entryMode: config.entryMode || 'CONSOLIDATED',
        includeEmployerContributions: !!config.includeEmployerContributions,
        exportOnlyLocked: config.exportOnlyLocked !== false,
        ledgerMap: formLedgerMap
      });

      // Trigger connection check
      checkConnections(config.bridgeUrl || 'http://localhost:7000', config.tallyUrl || 'http://localhost:9000');

    } catch (e) {
      console.error(e);
      message.error('Failed to load configuration settings');
    } finally {
      setLoading(false);
    }
  };

  const checkTallyDirectly = async (tallyUrl) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      await fetch(tallyUrl, {
        method: 'POST',
        mode: 'no-cors',
        signal: controller.signal,
        body: '<ENVELOPE></ENVELOPE>'
      });
      clearTimeout(timeoutId);
      setTallyStatus('connected');
    } catch (_) {
      setTallyStatus('offline');
    }
  };

  const checkConnections = async (bUrl, tUrl) => {
    const bridge = bUrl || form.getFieldValue('bridgeUrl') || 'http://localhost:7000';
    const tally = tUrl || form.getFieldValue('tallyUrl') || 'http://localhost:9000';

    setBridgeStatus('checking');
    setTallyStatus('checking');

    // 1. Check Bridge Agent
    try {
      const bResp = await fetch(`${bridge}/ping`, { mode: 'cors' });
      const bData = await bResp.json();
      if (bData.success) {
        setBridgeStatus('connected');
        
        // 2. Check Tally through the Bridge Agent
        try {
          const tResp = await fetch(`${bridge}/tally/status?url=${encodeURIComponent(tally)}`, { mode: 'cors' });
          const tData = await tResp.json();
          if (tData.success) {
            setTallyStatus('connected');
          } else {
            setTallyStatus('offline');
          }
        } catch (_) {
          setTallyStatus('offline');
        }
      } else {
        setBridgeStatus('offline');
        await checkTallyDirectly(tally);
      }
    } catch (_) {
      setBridgeStatus('offline');
      await checkTallyDirectly(tally);
    }
  };

  useEffect(() => {
    loadConfigAndHeads();
  }, []);

  const handleSave = async (values) => {
    try {
      setSaving(true);
      const res = await api.put('/admin/tally/config', values);
      if (res.data?.success) {
        message.success('Tally Prime configuration saved successfully!');
      } else {
        message.error('Failed to save configuration');
      }
    } catch (e) {
      message.error('Error saving config: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleValuesChange = (changedValues) => {
    if (changedValues.includeEmployerContributions !== undefined) {
      setIncludeEmployer(changedValues.includeEmployerContributions);
    }
  };

  // Compile table data for mapping
  const getTableData = () => {
    const list = [
      ...detectedHeads,
      { key: 'net_salary', label: 'Net Salary Payable', type: 'NET_PAYABLE' }
    ];

    if (includeEmployer) {
      list.push(
        { key: 'employer_pf', label: 'Employer PF Contribution Expense (DR)', type: 'EMPLOYER_EXPENSE' },
        { key: 'employer_esi', label: 'Employer ESI Contribution Expense (DR)', type: 'EMPLOYER_EXPENSE' },
        { key: 'employer_pf_payable', label: 'PF Payable (Employer) (CR)', type: 'EMPLOYER_LIABILITY' },
        { key: 'employer_esi_payable', label: 'ESI Payable (Employer) (CR)', type: 'EMPLOYER_LIABILITY' }
      );
    }

    return list;
  };

  const columns = [
    {
      title: 'Salary Template Head / Component',
      dataIndex: 'label',
      key: 'label',
      width: '40%',
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color={
            record.type === 'EARNING' ? 'blue' :
            record.type === 'DEDUCTION' ? 'red' :
            record.type === 'NET_PAYABLE' ? 'green' : 'orange'
          }>
            {record.type}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Tally Ledger Name',
      key: 'action',
      width: '60%',
      render: (_, record) => (
        <Form.Item
          name={['ledgerMap', record.key]}
          noStyle
          rules={[{ required: true, message: 'Please specify the Tally Ledger Name' }]}
        >
          <Input placeholder={`Enter matching ledger name in Tally (e.g. ${record.label} Ledger)`} />
        </Form.Item>
      )
    }
  ];

  const downloadTabItems = [
    {
      key: '1',
      label: <span style={{ fontSize: '14px', fontWeight: 600 }}>1. Download Bridge</span>,
      children: (
        <div style={{ padding: '16px 24px', minHeight: '300px' }}>
          <Title level={4} style={{ color: '#1e293b', marginBottom: 10, fontSize: '18px' }}>Install Tally Bridge Agent</Title>
          <Paragraph type="secondary" style={{ fontSize: '14px', marginBottom: 20 }}>
            Download and run the Vetansutra Tally Bridge Agent to enable secure direct push functionality from this web browser to your local Tally Prime software.
          </Paragraph>
          
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button 
              type="primary" 
              size="large" 
              icon={<DownloadOutlined />} 
              loading={downloadLoading}
              onClick={handleDownloadExe}
              style={{ 
                height: '44px', 
                padding: '0 28px', 
                fontSize: '15px', 
                borderRadius: '6px',
                background: '#1677ff',
                boxShadow: '0 4px 10px rgba(22,119,255,0.2)'
              }}
            >
              Download Now (.exe)
            </Button>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Compatible with Windows 10/11 (64-bit / 32-bit)
              </Text>
            </div>
          </div>

          <Divider style={{ margin: '16px 0' }} />
          
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <Text strong style={{ fontSize: '13px', color: '#334155', display: 'block', marginBottom: 8 }}>
              Quick Installation Steps:
            </Text>
            <ol style={{ fontSize: '13px', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: '1.7' }}>
              <li>Click the <b>Download Now</b> button above to save the <code>vetansutra-tally-bridge.exe</code> file.</li>
              <li>Once downloaded, run the file to start the Tally Bridge Server.</li>
              <li>Keep the command window open while transferring your payroll data.</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      key: '2',
      label: <span style={{ fontSize: '14px', fontWeight: 600 }}>2. Tally Configuration</span>,
      children: (
        <div style={{ padding: '16px 24px', minHeight: '300px' }}>
          <Title level={4} style={{ color: '#1e293b', marginBottom: 10, fontSize: '18px' }}>Configure Tally Prime Connectivity</Title>
          <Paragraph type="secondary" style={{ fontSize: '14px', marginBottom: 20 }}>
            Ensure Tally Prime is configured to accept external API/ODBC data connections.
          </Paragraph>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <Text strong style={{ fontSize: '13px', color: '#334155', display: 'block', marginBottom: 10 }}>
              Follow these connectivity settings in Tally Prime:
            </Text>
            <ul style={{ fontSize: '13px', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: '1.9' }}>
              <li>Press <b>F1</b> (Help) &gt; <b>Settings</b> &gt; <b>Connectivity</b>.</li>
              <li>Set <b>TallyPrime acts as</b> to <b>Both</b> or <b>Server</b>.</li>
              <li>Set <b>Enable ODBC</b> to <b>Yes</b>.</li>
              <li>Configure the port to <b>9000</b> (should match <b>Local Tally URL</b> in Settings).</li>
              <li>Press <b>Ctrl+A</b> to save and restart Tally Prime.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      key: '3',
      label: <span style={{ fontSize: '14px', fontWeight: 600 }}>3. Sync Payroll Data</span>,
      children: (
        <div style={{ padding: '16px 24px', minHeight: '300px' }}>
          <Title level={4} style={{ color: '#1e293b', marginBottom: 10, fontSize: '18px' }}>Sync Vouchers to Tally</Title>
          <Paragraph type="secondary" style={{ fontSize: '14px', marginBottom: 20 }}>
            Once the bridge is active, you are ready to export your vouchers with a single click.
          </Paragraph>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <Text strong style={{ fontSize: '13px', color: '#334155', display: 'block', marginBottom: 10 }}>
              Final steps to sync data:
            </Text>
            <ol style={{ fontSize: '13px', color: '#475569', paddingLeft: '16px', margin: 0, lineHeight: '1.9' }}>
              <li>Open the target company in Tally Prime.</li>
              <li>Ensure the company name matches exactly in the <b>Tally Company Name</b> settings field.</li>
              <li>Ensure all ledger names are mapped properly on the right panel.</li>
              <li>Go to the **Payroll** cycle page and click **Push to Tally** to instantly sync all salary journals.</li>
            </ol>
          </div>
        </div>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s', minHeight: '100vh' }}>
        <MainHeader collapsed={collapsed} onCollapse={setCollapsed} />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280, overflow: 'auto' }}>
          
          <Space align="center" style={{ marginBottom: 20 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settings')} />
            <Title level={3} style={{ margin: 0 }}>Tally Prime Integration Settings</Title>
          </Space>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Spin size="large" tip="Loading settings..." />
            </div>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              onValuesChange={handleValuesChange}
            >
              <Row gutter={24}>
                {/* Connection Settings */}
                <Col xs={24} lg={10}>
                  <Card title="Tally Prime Connection" style={{ marginBottom: 24 }} extra={
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => checkConnections()}>Refresh Status</Button>
                  }>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>Tally Prime Status:</Text>
                        {tallyStatus === 'connected' ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Connected (Port 9000)</Tag>
                        ) : tallyStatus === 'checking' ? (
                          <Tag color="blue">Checking...</Tag>
                        ) : (
                          <Tag color="red" icon={<CloseCircleOutlined />}>Closed / Offline</Tag>
                        )}
                      </div>
                    </div>

                    <Form.Item
                      label="Local Tally URL"
                      name="tallyUrl"
                      rules={[{ required: true, message: 'Please enter local Tally URL' }]}
                    >
                      <Input placeholder="http://localhost:9000" />
                    </Form.Item>

                    <Form.Item
                      label="Tally Company Name"
                      name="companyName"
                      help="Must match the exact company name opened inside your Tally Prime software."
                      rules={[{ required: true, message: 'Please enter Tally Company Name' }]}
                    >
                      <Input placeholder="e.g. ABC Pvt Ltd" />
                    </Form.Item>

                    <Form.Item
                      label="Voucher Type"
                      name="voucherType"
                      rules={[{ required: true, message: 'Please specify Tally Voucher Type' }]}
                    >
                      <Input placeholder="Journal" />
                    </Form.Item>

                    <Form.Item
                      label="Narration Format"
                      name="narrationFormat"
                      help="Use placeholders {month} and {year} which will auto-resolve during push."
                      rules={[{ required: true, message: 'Please enter Narration Format' }]}
                    >
                      <Input placeholder="Salary for {month} {year}" />
                    </Form.Item>

                    <Collapse ghost style={{ marginTop: 16 }} defaultActiveKey="bridge">
                      <Collapse.Panel header="Advanced / Local Bridge Agent Settings" key="bridge">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                          <Text>Bridge Agent Status:</Text>
                          <Space>
                            {bridgeStatus === 'connected' ? (
                              <Tag color="green" icon={<CheckCircleOutlined />}>Connected (Port 7000)</Tag>
                            ) : bridgeStatus === 'checking' ? (
                              <Tag color="blue">Checking...</Tag>
                            ) : (
                              <Tag color="red" icon={<CloseCircleOutlined />}>Offline</Tag>
                            )}
                            <Button size="small" type="link" onClick={() => setDownloadModalVisible(true)}>Setup & Download</Button>
                          </Space>
                        </div>

                        <Form.Item
                          label="Bridge Agent URL"
                          name="bridgeUrl"
                        >
                          <Input placeholder="http://localhost:7000" />
                        </Form.Item>

                        <Alert
                          message="Tally Bridge Agent Integration"
                          description={
                            <div style={{ fontSize: '11px' }}>
                              Running the <b>Tally Bridge Agent</b> locally on your computer ensures a reliable connection to Tally Prime and lets you see full error messages if a voucher import fails.
                              <br />
                              <div style={{ marginTop: 8 }}>
                                <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={() => setDownloadModalVisible(true)}>
                                  Setup & Download Bridge Agent
                                </Button>
                              </div>
                            </div>
                          }
                          type="info"
                          showIcon
                        />
                      </Collapse.Panel>
                    </Collapse>
                  </Card>
                </Col>

                {/* Option Toggles & Ledger Mapping */}
                <Col xs={24} lg={14}>
                  <Card title="Integration Options" style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="Voucher Entry Mode"
                          name="entryMode"
                          rules={[{ required: true }]}
                        >
                          <Select defaultValue="CONSOLIDATED">
                            <Select.Option value="CONSOLIDATED">Consolidated (Single Voucher)</Select.Option>
                            <Select.Option value="PER_EMPLOYEE">Per-Employee (Individual Vouchers)</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col span={6} style={{ textAlign: 'center' }}>
                        <Form.Item
                          label="Employer PF/ESI"
                          name="includeEmployerContributions"
                          valuePropName="checked"
                        >
                          <Switch checked={includeEmployer} />
                        </Form.Item>
                      </Col>

                      <Col span={6} style={{ textAlign: 'center' }}>
                        <Form.Item
                          label="Locked Only"
                          name="exportOnlyLocked"
                          valuePropName="checked"
                        >
                          <Switch defaultChecked />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  <Card title="Ledger Mapping Configuration" extra={
                    <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>Save Config</Button>
                  }>
                    <Paragraph type="secondary" style={{ fontSize: '13px' }}>
                      Map salary earnings/deductions to the respective ledger names inside Tally Prime. These ledgers will be auto-created in Tally if they do not exist.
                    </Paragraph>

                    <Table
                      dataSource={getTableData()}
                      columns={columns}
                      pagination={false}
                      size="small"
                      rowKey="key"
                      bordered
                    />
                  </Card>
                </Col>
              </Row>
            </Form>
          )}
          {/* Download and Setup Tally Bridge Modal */}
          <Modal
            title={
              <div style={{ padding: '12px 0', borderBottom: '1px solid #f0f2f5', textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                  Follow these three steps to setup Tally integration with Vetansutra
                </Title>
              </div>
            }
            open={downloadModalVisible}
            onCancel={() => setDownloadModalVisible(false)}
            footer={null}
            width={900}
            bodyStyle={{ padding: 0 }}
            style={{ top: 80 }}
            destroyOnClose
          >
            <div style={{ display: 'flex', minHeight: '380px' }}>
              <Tabs
                tabPosition="left"
                defaultActiveKey="1"
                items={downloadTabItems}
                style={{ width: '100%' }}
                className="tally-download-tabs"
              />
            </div>
          </Modal>

        </Content>
      </Layout>
    </Layout>
  );
}
