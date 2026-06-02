import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Table, Button, Space, Modal, Form, Input, Select, Tabs, message, Tag, Tooltip, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, DownloadOutlined, UserOutlined, UploadOutlined, CloseCircleOutlined, ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api, { API_BASE_URL } from '../api';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';

// Register ImageResize module
Quill.register('modules/imageResize', ImageResize);

const { Content } = Layout;
const { Text } = Typography;

const LetterManagement = () => {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [issuedLetters, setIssuedLetters] = useState([]);
    const [staffOptions, setStaffOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [issueOpen, setIssueOpen] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [form] = Form.useForm();
    const [issueForm] = Form.useForm();
    const selectedStaff = Form.useWatch('staffUserIds', issueForm);
    const quillRef = useRef(null);
    const [view, setView] = useState('list'); // 'list' | 'editor'
    const [attachments, setAttachments] = useState([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tplRes, issuedRes] = await Promise.all([
                api.get('/admin/letters/templates'),
                api.get('/admin/letters/issued'),
            ]);
            if (tplRes.data.success) setTemplates(tplRes.data.templates);
            if (issuedRes.data.success) setIssuedLetters(issuedRes.data.letters);
            const staffRes = await api.get('/admin/staff');
            const list = Array.isArray(staffRes?.data?.staff) ? staffRes.data.staff : [];
            setStaffOptions(list.map((u) => ({ value: u.id, label: u.name || u.phone || `User #${u.id}` })));
        } catch (e) {
            message.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateOrUpdate = async (values) => {
        try {
            if (editingTemplate) {
                await api.put(`/admin/letters/templates/${editingTemplate.id}`, values);
                message.success('Template updated');
            } else {
                await api.post('/admin/letters/templates', values);
                message.success('Template created');
            }
            loadData();
        } catch (e) {
            message.error('Failed to save template');
            throw e; // Re-throw to be caught by handleSave for validation feedback
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/admin/letters/templates/${id}`);
            message.success('Template deleted');
            loadData();
        } catch (e) {
            message.error('Failed to delete template');
        }
    };

    const insertPlaceholder = (ph) => {
        const editor = quillRef.current.getEditor();
        const cursorPosition = editor.getSelection()?.index || 0;
        editor.insertText(cursorPosition, ph);
        // Sync with Ant Design form
        form.setFieldsValue({ content: editor.root.innerHTML });
    };

    const placeholders = [
        { label: 'Name', value: '{{name}}' },
        { label: 'Staff ID', value: '{{staffId}}' },
        { label: 'Email', value: '{{email}}' },
        { label: 'Phone', value: '{{phone}}' },
        { label: 'Designation', value: '{{designation}}' },
        { label: 'Department', value: '{{department}}' },
        { label: 'Joining Date', value: '{{dateOfJoining}}' },
        { label: 'City', value: '{{city}}' },
        { label: 'State', value: '{{state}}' },
        { label: 'Current Date', value: '{{currentDate}}' },
    ];

    const handleEdit = (record) => {
        setEditingTemplate(record);
        form.setFieldsValue({
            title: record.title,
            content: record.content
        });
        setView('editor');
    };

    const handleCreate = () => {
        setEditingTemplate(null);
        form.resetFields();
        setView('editor');
    };

    const handleBack = () => {
        setView('list');
        setEditingTemplate(null);
        form.resetFields();
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            await handleCreateOrUpdate(values);
            setView('list');
        } catch (e) {
            // Validation failed, message will be shown by Ant Design Form
            message.error('Please fill in all required fields.');
        }
    };

    const templateColumns = [
        { title: 'Title', dataIndex: 'title', key: 'title', render: (t) => <span style={{ fontWeight: '600', color: '#1e293b' }}>{t}</span> },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Space size={8}>
                    <Button 
                        shape="circle" 
                        type="text"
                        icon={<EditOutlined style={{ color: '#2563eb', fontSize: '14px' }} />} 
                        onClick={() => handleEdit(record)} 
                    />
                    <Button 
                        shape="circle" 
                        type="text"
                        danger 
                        icon={<DeleteOutlined style={{ fontSize: '14px' }} />} 
                        onClick={() => Modal.confirm({
                            title: 'Delete Template?',
                            content: 'Are you sure you want to delete this template?',
                            okText: 'Delete',
                            okType: 'danger',
                            cancelButtonProps: { shape: 'round' },
                            okButtonProps: { shape: 'round' },
                            onOk: () => handleDelete(record.id)
                        })} 
                    />
                </Space>
            )
        },
    ];

    const issuedColumns = [
        {
            title: 'Staff',
            key: 'staff',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: '700', color: '#1e293b' }}>{record.staffMember?.profile?.name || record.staffMember?.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>ID: {record.staffMember?.profile?.staffId}</span>
                </Space>
            )
        },
        { title: 'Letter Title', dataIndex: 'title', key: 'title', render: (t) => <span style={{ fontWeight: '600', color: '#475569' }}>{t}</span> },
        {
            title: 'Issued By',
            key: 'issuedBy',
            render: (_, record) => <span style={{ color: '#475569', fontWeight: '500' }}>{record.issuer?.profile?.name || record.issuer?.name}</span>
        },
        {
            title: 'Issued At',
            dataIndex: 'issuedAt',
            key: 'issuedAt',
            render: (d) => <span style={{ color: '#475569', fontWeight: '500', fontSize: '13px' }}>{new Date(d).toLocaleDateString()}</span>
        },
        {
            title: 'Attachments',
            key: 'attachments',
            render: (_, record) => {
                let list = [];
                try {
                    if (record.attachments) {
                        list = JSON.parse(record.attachments);
                    }
                } catch (e) {
                    // Fallback for old single string format if any
                    list = [record.attachments];
                }
                
                if (!list || list.length === 0) return '-';
                
                return (
                    <Space direction="vertical" size={0}>
                        {list.map((path, idx) => (
                            <a key={idx} href={`${API_BASE_URL}${path}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: '600' }}>
                                <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontWeight: '600' }}>View Attachment {list.length > 1 ? idx + 1 : ''}</Button>
                            </a>
                        ))}
                    </Space>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button 
                    shape="round"
                    icon={<DownloadOutlined style={{ color: '#2563eb', fontSize: '13px' }} />} 
                    style={{ fontWeight: '600', color: '#2563eb', borderColor: '#bfdbfe' }}
                    onClick={() => {
                        const win = window.open('', '_blank');
                        win.document.write(`
                <html>
                  <head>
                    <title>${record.title}</title>
                    <style>
                      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 60px; line-height: 1.6; color: #333; }
                      .header { text-align: center; margin-bottom: 50px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                      .content { white-space: normal; }
                      @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h1>${record.title}</h1>
                    </div>
                    <div class="content">${record.content}</div>
                    <script>
                      window.onload = () => {
                        window.print();
                        // window.close(); // Optional
                      };
                    </script>
                  </body>
                </html>
              `);
                        win.document.close();
                    }}
                >
                    Print / Download
                </Button>
            )
        },
    ];

    const handleIssueLetters = async () => {
        try {
            const values = await issueForm.validateFields();
            setIssuing(true);
            const formData = new FormData();
            formData.append('templateId', values.templateId);
            values.staffUserIds.forEach(id => formData.append('staffUserIds[]', id));
            if (attachments && attachments.length > 0) {
                attachments.forEach(file => formData.append('attachments', file));
            }

            const resp = await api.post('/admin/letters/issue', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (resp?.data?.success) {
                const created = Number(resp?.data?.createdCount || 0);
                const skipped = Array.isArray(resp?.data?.skipped) ? resp.data.skipped.length : 0;
                message.success(`Letter issued to ${created} staff${skipped ? `, skipped ${skipped}` : ''}`);
                setIssueOpen(false);
                setAttachments([]);
                setAttachmentPreviews([]);
                issueForm.resetFields();
                await loadData();
            } else {
                message.error(resp?.data?.message || 'Failed to issue letters');
            }
        } catch (e) {
            if (!e?.errorFields) {
                message.error(e?.response?.data?.message || 'Failed to issue letters');
            }
        } finally {
            setIssuing(false);
        }
    };

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
        imageResize: {
            parchment: Quill.import('parchment'),
            modules: ['Resize', 'DisplaySize', 'Toolbar']
        },
    };

    if (view === 'editor') {
        return (
            <Layout style={{ minHeight: '100vh' }}>
                <Sidebar collapsed={collapsed} />
                <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
                    <MainHeader 
                        collapsed={collapsed} 
                        setCollapsed={setCollapsed} 
                        title="Letter Management Template Builder" 
                    />
                    <Content style={{ padding: '24px', background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
                        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                            <Form form={form} layout="vertical">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <Button 
                                        type="text" 
                                        icon={<ArrowLeftOutlined />} 
                                        onClick={handleBack}
                                        style={{ fontWeight: 600, color: '#475569' }}
                                        shape="round"
                                    >
                                        Back to Templates
                                    </Button>
                                    <Space>
                                        <Button shape="round" onClick={handleBack} style={{ fontWeight: '600' }}>Cancel</Button>
                                        <Button 
                                            type="primary" 
                                            shape="round" 
                                            onClick={handleSave}
                                            style={{ 
                                                fontWeight: '600', 
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                                                border: 'none', 
                                                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' 
                                            }}
                                        >
                                            Save Template
                                        </Button>
                                    </Space>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24 }}>
                                    {/* Main Editor Area */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <Card bordered={false} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                            <Form.Item name="title" label={<span style={{ fontWeight: '600', color: '#475569' }}>Template Title</span>} rules={[{ required: true, message: 'Please enter a title' }]} style={{ marginBottom: 0 }}>
                                                <Input size="large" placeholder="e.g. Offer Letter for Engineers" prefix={<FileTextOutlined style={{ color: '#bfbfbf' }} />} style={{ borderRadius: '10px' }} />
                                            </Form.Item>
                                        </Card>

                                        <Card bordered={false} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', flex: 1, display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
                                            <Form.Item
                                                name="content"
                                                label={<span style={{ fontWeight: '600', color: '#475569' }}>Letter Content</span>}
                                                rules={[{ required: true, message: 'Content is required' }]}
                                                style={{ marginBottom: 0, flex: 1 }}
                                            >
                                                <ReactQuill
                                                    ref={quillRef}
                                                    theme="snow"
                                                    modules={quillModules}
                                                    placeholder="Start composing your letter..."
                                                    style={{ height: '500px', display: 'flex', flexDirection: 'column' }}
                                                />
                                            </Form.Item>
                                        </Card>
                                    </div>

                                    {/* Sidebar: Placeholders */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <Card
                                            title={<span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}><TeamOutlined /> Available Placeholders</span>}
                                            bordered={false}
                                            style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'sticky', top: 20 }}
                                            size="small"
                                            bodyStyle={{ padding: '20px' }}
                                        >
                                            <span style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', display: 'block', fontWeight: '500' }}>
                                                Drag and drop these placeholders into the editor correctly.
                                            </span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {placeholders.map(ph => (
                                                    <Tooltip title={`Drag ${ph.value} to editor`} key={ph.value}>
                                                        <Tag
                                                            color="blue"
                                                            style={{
                                                                cursor: 'move',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                userSelect: 'none',
                                                                marginBottom: 8,
                                                                fontWeight: '600',
                                                                border: '1px solid #bfdbfe'
                                                            }}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.setData('text/plain', ph.value);
                                                            }}
                                                            onClick={() => insertPlaceholder(ph.value)}
                                                        >
                                                            {ph.label}
                                                        </Tag>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            </Form>
                        </div>
                    </Content>
                </Layout>
            </Layout>
        );
    }

    // List View
    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
                <MainHeader 
                    collapsed={collapsed} 
                    setCollapsed={setCollapsed} 
                    title="Letter Management" 
                />
                <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        
                        {/* Toolbar Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button 
                                type="text" 
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => navigate('/settings')}
                                style={{ fontWeight: 600, color: '#475569' }}
                                shape="round"
                            >
                                Back to Settings
                            </Button>
                        </div>

                        <Tabs 
                            defaultActiveKey="1" 
                            className="sales-tabs" 
                            items={[
                                {
                                    key: '1',
                                    label: 'Letter Templates',
                                    children: (
                                        <Card 
                                            className="sales-content-card"
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileTextOutlined style={{ color: '#2563eb' }} />
                                                    <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>Management Templates</span>
                                                </div>
                                            } 
                                            extra={
                                                <Button 
                                                    type="primary" 
                                                    shape="round" 
                                                    icon={<PlusOutlined />} 
                                                    onClick={handleCreate}
                                                    style={{ 
                                                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                        border: 'none',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    New Template
                                                </Button>
                                            }
                                            style={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
                                            bodyStyle={{ padding: '24px' }}
                                        >
                                            <Table
                                                columns={templateColumns}
                                                dataSource={templates}
                                                rowKey="id"
                                                loading={loading}
                                                pagination={{ pageSize: 10 }}
                                                bordered={false}
                                                className="sales-table"
                                                style={{ borderRadius: '12px', overflow: 'hidden' }}
                                            />
                                        </Card>
                                    )
                                },
                                {
                                    key: '2',
                                    label: 'Issued Letters',
                                    children: (
                                        <Card
                                            className="sales-content-card"
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <TeamOutlined style={{ color: '#2563eb' }} />
                                                    <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>Previous Issued Letters</span>
                                                </div>
                                            }
                                            extra={
                                                <Button 
                                                    type="primary" 
                                                    shape="round" 
                                                    icon={<PlusOutlined />} 
                                                    onClick={() => setIssueOpen(true)}
                                                    style={{ 
                                                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                        border: 'none',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    Issue Letter
                                                </Button>
                                            }
                                            style={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
                                            bodyStyle={{ padding: '24px' }}
                                        >
                                            <Table
                                                columns={issuedColumns}
                                                dataSource={issuedLetters}
                                                rowKey="id"
                                                loading={loading}
                                                pagination={{ pageSize: 10 }}
                                                bordered={false}
                                                className="sales-table"
                                                style={{ borderRadius: '12px', overflow: 'hidden' }}
                                            />
                                        </Card>
                                    )
                                }
                            ]} 
                        />
                    </Space>
                </Content>
            </Layout>
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TeamOutlined style={{ color: '#2563eb', fontSize: '18px' }} />
                        <span style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>Issue Letter to Multiple Staff</span>
                    </div>
                }
                open={issueOpen}
                onCancel={() => setIssueOpen(false)}
                onOk={handleIssueLetters}
                confirmLoading={issuing}
                okText="Issue Letter"
                destroyOnClose
                style={{ borderRadius: '20px' }}
                cancelButtonProps={{ shape: 'round', style: { fontWeight: '600' } }}
                okButtonProps={{ 
                  shape: 'round', 
                  style: { 
                    fontWeight: '600', 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                    border: 'none', 
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)' 
                  } 
                }}
            >
                <div style={{ paddingTop: '16px' }}>
                    <Form form={issueForm} layout="vertical">
                        <Form.Item
                            name="templateId"
                            label={<span style={{ fontWeight: '600', color: '#475569' }}>Select Letter Template</span>}
                            rules={[{ required: true, message: 'Please select a template' }]}
                        >
                            <Select
                                placeholder="Choose a template"
                                options={(templates || []).map((t) => ({ value: t.id, label: t.title }))}
                                showSearch
                                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                style={{ borderRadius: '8px' }}
                                dropdownStyle={{ borderRadius: '12px' }}
                            />
                        </Form.Item>
                        <Form.Item
                            label={
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600', color: '#475569' }}>Select Staff</span>
                                    <Space style={{ marginRight: 4 }}>
                                        {(selectedStaff?.length === staffOptions.length && staffOptions.length > 0) ? (
                                            <Button 
                                                type="link" 
                                                size="small" 
                                                danger
                                                onClick={() => {
                                                    issueForm.setFieldsValue({ staffUserIds: [] });
                                                }}
                                                style={{ padding: 0, fontWeight: '600' }}
                                            >
                                                Clear All
                                            </Button>
                                        ) : (
                                            <Button 
                                                type="link" 
                                                size="small" 
                                                onClick={() => {
                                                    const allIds = staffOptions.map(opt => opt.value);
                                                    issueForm.setFieldsValue({ staffUserIds: allIds });
                                                }}
                                                style={{ padding: 0, fontWeight: '600' }}
                                            >
                                                Select All
                                            </Button>
                                        )}
                                    </Space>
                                </div>
                            }
                            name="staffUserIds"
                            rules={[{ required: true, message: 'Please select at least one staff member' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Choose one or more staff"
                                options={staffOptions}
                                showSearch
                                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                style={{ borderRadius: '8px' }}
                                dropdownStyle={{ borderRadius: '12px' }}
                            />
                        </Form.Item>
                        <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '20px' }}>
                            <Text type="secondary" style={{ color: '#2563eb', fontWeight: '500', fontSize: '13px' }}>
                                Letter content will be generated from the selected template for each selected staff.
                            </Text>
                        </div>

                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8, color: '#475569', fontWeight: '600' }}>Additional Attachments (Optional)</Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '12px' }}>
                                <Button
                                    icon={<UploadOutlined />}
                                    shape="round"
                                    onClick={() => document.getElementById('letter-attachment-input').click()}
                                    style={{ fontWeight: '600' }}
                                >
                                    Select Files
                                </Button>
                                <input
                                    id="letter-attachment-input"
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
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {attachments.map((file, idx) => {
                                    const previewObj = attachmentPreviews.find(p => p.name === file.name);
                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            {previewObj?.preview === 'file' ? (
                                                <FileTextOutlined style={{ fontSize: 20, color: '#2563eb' }} />
                                            ) : (
                                                <img src={previewObj?.preview} alt="preview" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4, border: '1px solid #bfdbfe' }} />
                                            )}
                                            <Text ellipsis style={{ flex: 1, fontWeight: '500', color: '#334155' }}>{file.name}</Text>
                                            <CloseCircleOutlined
                                                style={{ color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
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
                </div>
            </Modal>
        </Layout>
    );
};

export default LetterManagement;
