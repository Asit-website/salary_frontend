import React, { useState, useEffect } from 'react';
import { Layout, Card, Input, Button, Radio, Table, Tag, Space, message, Typography, Divider, Modal, Upload, Select, Tooltip } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, MailOutlined, SendOutlined, HistoryOutlined, FileExcelOutlined, EyeOutlined, UploadOutlined, ReloadOutlined, CodeOutlined, EditOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const SuperadminMailing = () => {
    const quillRef = React.useRef(null);
    const [collapsed, setCollapsed] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipientType, setRecipientType] = useState('all_clients');
    const [customEmails, setCustomEmails] = useState('');
    const [fileList, setFileList] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [queueStats, setQueueStats] = useState(0);
    const [attachment, setAttachment] = useState(null);
    const [leads, setLeads] = useState([]);
    const [selectedLeads, setSelectedLeads] = useState(['ALL_LEADS']);
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState(['ALL_CLIENTS']);
    const [htmlMode, setHtmlMode] = useState(false);

    const insertPlaceholder = (placeholder) => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();
        if (range) {
            quill.insertText(range.index, placeholder);
        } else {
            quill.insertText(quill.getLength(), placeholder);
        }
    };

    const handleDragStart = (e, placeholder) => {
        e.dataTransfer.setData('text/plain', placeholder);
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const loadData = async () => {
        try {
            const [campResp, statResp, leadResp, clientResp] = await Promise.all([
                api.get('/superadmin/mail/campaigns'),
                api.get('/superadmin/mail/queue/stats'),
                api.get('/superadmin/leads'),
                api.get('/superadmin/clients')
            ]);
            if (campResp.data.success) setCampaigns(campResp.data.campaigns);
            if (statResp.data.success) setQueueStats(statResp.data.pendingCount);
            if (leadResp.data.success) setLeads(leadResp.data.leads || []);
            if (clientResp.data.success) setClients(clientResp.data.clients || []);
        } catch (err) {
            console.error('Failed to load mailing data:', err);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    const handleSend = async () => {
        if (!subject || !body) {
            return message.error('Please provide both subject and message body');
        }

        if (recipientType === 'excel' && fileList.length === 0) {
            return message.error('Please upload an Excel file');
        }

        Modal.confirm({
            title: 'Confirm Mailing Campaign',
            content: `This will start a mailing campaign. Emails will be sent at a rate of 1 per minute. Are you sure?`,
            onOk: async () => {
                setLoading(true);
                try {
                    const formData = new FormData();
                    formData.append('subject', subject);
                    formData.append('body', body);
                    formData.append('recipientType', recipientType);
                    if (attachment) formData.append('attachment', attachment);

                    let resp;
                    if (recipientType === 'excel') {
                        formData.append('file', fileList[0].originFileObj);
                        resp = await api.post('/superadmin/mail/campaign/excel', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } else {
                        if (recipientType === 'custom') {
                            formData.append('customEmails', JSON.stringify(customEmails.split(',').map(e => e.trim())));
                        }
                        if (recipientType === 'leads') {
                            formData.append('selectedLeads', JSON.stringify(selectedLeads));
                        }
                        if (recipientType === 'all_clients') {
                            formData.append('selectedClients', JSON.stringify(selectedClients));
                        }
                        resp = await api.post('/superadmin/mail/campaign', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    }

                    if (resp.data.success) {
                        message.success(`Campaign created! ${resp.data.totalRecipients} emails queued.`);
                        setSubject('');
                        setBody('');
                        setCustomEmails('');
                        setFileList([]);
                        setAttachment(null);
                        loadData();
                    }
                } catch (err) {
                    message.error(err.response?.data?.message || 'Failed to start campaign');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleLeadsChange = (value) => {
        if (value.includes('ALL_LEADS') && !selectedLeads.includes('ALL_LEADS')) {
            setSelectedLeads(['ALL_LEADS']);
        } else if (value.includes('ALL_LEADS') && value.length > 1) {
            setSelectedLeads(value.filter(v => v !== 'ALL_LEADS'));
        } else if (value.length === 0) {
            setSelectedLeads(['ALL_LEADS']);
        } else {
            setSelectedLeads(value);
        }
    };

    const handleClientsChange = (value) => {
        if (value.includes('ALL_CLIENTS') && !selectedClients.includes('ALL_CLIENTS')) {
            setSelectedClients(['ALL_CLIENTS']);
        } else if (value.includes('ALL_CLIENTS') && value.length > 1) {
            setSelectedClients(value.filter(v => v !== 'ALL_CLIENTS'));
        } else if (value.length === 0) {
            setSelectedClients(['ALL_CLIENTS']);
        } else {
            setSelectedClients(value);
        }
    };

    const handleResend = async (id) => {
        Modal.confirm({
            title: 'Resend Campaign',
            content: 'This will duplicate the campaign and send it to the same recipients. Are you sure?',
            onOk: async () => {
                setLoading(true);
                try {
                    const resp = await api.post(`/superadmin/mail/campaign/${id}/resend`);
                    if (resp.data.success) {
                        message.success(`Campaign resent! ${resp.data.totalRecipients} emails queued.`);
                        loadData();
                    }
                } catch (err) {
                    message.error(err.response?.data?.message || 'Failed to resend campaign');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const columns = [
        { title: 'Date', dataIndex: 'createdAt', key: 'date', render: d => new Date(d).toLocaleString(), width: 160 },
        { title: 'Subject', dataIndex: 'subject', key: 'subject' },
        {
            title: 'Report',
            key: 'report',
            render: (_, record) => {
                const s = record.stats || { total: 0, sent: 0, failed: 0, opened: 0 };
                return (
                    <Space direction="vertical" size={1} style={{ width: '100%', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Sent:</span> <Tag color={s.sent === s.total ? "green" : "blue"}>{s.sent} / {s.total}</Tag>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Opened:</span> <Tag color="cyan">{s.opened} ({s.total > 0 ? Math.round((s.opened / s.total) * 100) : 0}%)</Tag>
                        </div>
                        {s.failed > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Failed:</span> <Tag color="volcano">{s.failed}</Tag>
                            </div>
                        )}
                        <Tag color={record.status === 'COMPLETED' ? "green" : "processing"} style={{ marginTop: '4px', width: '100%', textAlign: 'center' }}>
                            {record.status}
                        </Tag>
                        <Space style={{ marginTop: '4px' }}>
                            <Button
                                type="link"
                                size="small"
                                icon={<EyeOutlined />}
                                style={{ padding: 0, fontSize: '11px' }}
                                onClick={() => window.location.href = `/superadmin/mailing/report/${record.id}`}
                            >
                                View
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                icon={<ReloadOutlined />}
                                style={{ padding: 0, fontSize: '11px' }}
                                onClick={() => handleResend(record.id)}
                            >
                                Resend
                            </Button>
                        </Space>
                    </Space>
                );
            }
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
                        <Title level={4} style={{ margin: 0 }}>Bulk Email Campaign</Title>
                    </div>
                    <div style={{ paddingRight: 12 }}>
                        <LogoutOutlined onClick={handleLogout} style={{ fontSize: 16, cursor: 'pointer' }} />
                    </div>
                </Header>

                <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280, overflow: 'auto' }}>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        {/* Composer Section */}
                            <Card title="Compose Email" style={{ flex: '1 1 600px' }} extra={
                                queueStats > 0 && <Tag color="red">Queue: {queueStats} Pending</Tag>
                            }>
                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                    <div>
                                        <Text strong>To:</Text>
                                        <Radio.Group
                                            value={recipientType}
                                            onChange={e => setRecipientType(e.target.value)}
                                            style={{ marginLeft: '16px' }}
                                        >
                                            <Radio value="all_clients">Clients</Radio>
                                            <Radio value="leads">Leads</Radio>
                                            <Radio value="custom">Custom List</Radio>
                                            <Radio value="excel">Bulk Excel</Radio>
                                        </Radio.Group>
                                    </div>

                                    {recipientType === 'all_clients' && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                                                Select recipient clients. You can select "All Clients" to send to everyone, or choose individual clients.
                                            </Text>
                                            <Select
                                                mode="multiple"
                                                placeholder="Select Clients (Defaults to All Clients)"
                                                style={{ width: '100%' }}
                                                value={selectedClients}
                                                onChange={handleClientsChange}
                                                options={[
                                                    { value: 'ALL_CLIENTS', label: '★ All Clients (Send to all)' },
                                                    ...clients
                                                        .filter(c => !!c.businessEmail)
                                                        .map(c => ({
                                                            value: c.businessEmail,
                                                            label: `${c.name || c.businessName} (${c.businessEmail})`
                                                        }))
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {recipientType === 'leads' && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                                                Select recipient leads. You can select "All Leads" to send to everyone, or choose individual leads.
                                            </Text>
                                            <Select
                                                mode="multiple"
                                                placeholder="Select Leads (Defaults to All Leads)"
                                                style={{ width: '100%' }}
                                                value={selectedLeads}
                                                onChange={handleLeadsChange}
                                                options={[
                                                    { value: 'ALL_LEADS', label: '★ All Leads (Send to all)' },
                                                    ...leads
                                                        .filter(l => !!l.email)
                                                        .map(l => ({
                                                            value: l.email,
                                                            label: `${l.personName || l.companyName} (${l.email})`
                                                        }))
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {recipientType === 'custom' && (
                                        <TextArea
                                            rows={2}
                                            placeholder="Enter comma separated emails (e.g. client1@mail.com, client2@mail.com)"
                                            value={customEmails}
                                            onChange={e => setCustomEmails(e.target.value)}
                                        />
                                    )}

                                    {recipientType === 'excel' && (
                                        <div style={{ border: '1px dashed #d9d9d9', padding: '16px', borderRadius: '8px' }}>
                                            <div style={{ textAlign: 'right', marginBottom: '8px' }}>
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<FileExcelOutlined />}
                                                    onClick={() => {
                                                        const csvContent = "Name,Email\nJohn Doe,john@example.com\nJane Smith,jane@example.com";
                                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                        const link = document.createElement("a");
                                                        const url = URL.createObjectURL(blob);
                                                        link.setAttribute("href", url);
                                                        link.setAttribute("download", "mailing_template.csv");
                                                        link.style.visibility = 'hidden';
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                >
                                                    Download Sample Format
                                                </Button>
                                            </div>
                                            <Dragger
                                                fileList={fileList}
                                                beforeUpload={() => false}
                                                onChange={({ fileList }) => setFileList(fileList.slice(-1))}
                                                accept=".xlsx,.xls,.csv"
                                            >
                                                <p className="ant-upload-drag-icon">
                                                    <FileExcelOutlined style={{ color: '#52c41a' }} />
                                                </p>
                                                <p className="ant-upload-text">Click or drag Excel to this area to upload</p>
                                                <p className="ant-upload-hint">Support for .xlsx, .xls, .csv. Must have an "Email" column.</p>
                                            </Dragger>
                                        </div>
                                    )}

                                    <Input
                                        placeholder="Email Subject"
                                        size="large"
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                    />
                                    <div style={{ padding: '8px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <Text type="secondary">Available Placeholders (Click or Drag to use): </Text>
                                        <Tag
                                            color="blue"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, '{{name}}')}
                                            onClick={() => insertPlaceholder('{{name}}')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {"{{name}}"}
                                        </Tag>
                                        <Tag
                                            color="blue"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, '{{email}}')}
                                            onClick={() => insertPlaceholder('{{email}}')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {"{{email}}"}
                                        </Tag>
                                        <Text type="secondary" style={{ marginLeft: '8px' }}>These will be replaced with recipient details.</Text>
                                    </div>

                                    {/* Editor mode toggle */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Tooltip title={htmlMode ? 'Switch to Rich Text Editor' : 'Switch to HTML Code Editor'}>
                                            <Button
                                                size="small"
                                                icon={htmlMode ? <EditOutlined /> : <CodeOutlined />}
                                                onClick={() => setHtmlMode(m => !m)}
                                                style={{
                                                    borderRadius: '6px',
                                                    fontWeight: 500,
                                                    background: htmlMode ? '#1890ff' : '#f0f0f0',
                                                    color: htmlMode ? '#fff' : '#333',
                                                    border: 'none'
                                                }}
                                            >
                                                {htmlMode ? 'Rich Text Mode' : 'HTML Mode'}
                                            </Button>
                                        </Tooltip>
                                    </div>

                                    {htmlMode ? (
                                        <div style={{ marginBottom: '8px' }}>
                                            <textarea
                                                value={body}
                                                onChange={e => setBody(e.target.value)}
                                                placeholder="Paste or type your HTML code here..."
                                                style={{
                                                    width: '100%',
                                                    height: '350px',
                                                    fontFamily: 'monospace',
                                                    fontSize: '13px',
                                                    padding: '12px',
                                                    border: '1px solid #d9d9d9',
                                                    borderRadius: '6px',
                                                    resize: 'vertical',
                                                    outline: 'none',
                                                    background: '#1e1e2e',
                                                    color: '#cdd6f4',
                                                    lineHeight: '1.6',
                                                    boxSizing: 'border-box'
                                                }}
                                                spellCheck={false}
                                            />
                                            <Text type="secondary" style={{ fontSize: '11px' }}>
                                                💡 Tip: Write raw HTML here. It will be sent as-is in the email body.
                                            </Text>
                                        </div>
                                    ) : (
                                        <div style={{ height: '350px', marginBottom: '40px' }}>
                                            <ReactQuill
                                                ref={quillRef}
                                                theme="snow"
                                                value={body}
                                                onChange={setBody}
                                                modules={modules}
                                                style={{ height: '300px' }}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <Text strong>Attachment:</Text>
                                        <Upload
                                            beforeUpload={(file) => {
                                                setAttachment(file);
                                                return false;
                                            }}
                                            onRemove={() => setAttachment(null)}
                                            fileList={attachment ? [attachment] : []}
                                            maxCount={1}
                                        >
                                            <Button icon={<UploadOutlined />} style={{ marginLeft: '16px' }}>Click to Upload Attachment</Button>
                                        </Upload>
                                    </div>

                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<SendOutlined />}
                                        block
                                        onClick={handleSend}
                                        loading={loading}
                                    >
                                        Start Mailing Campaign
                                    </Button>
                                </Space>
                            </Card>

                            {/* History Section */}
                            <Card title={<><HistoryOutlined /> Past Campaigns</>} style={{ flex: '1 1 400px' }}>
                                <Table
                                    dataSource={campaigns}
                                    columns={columns}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                    size="small"
                                />
                            </Card>
                        </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default SuperadminMailing;
