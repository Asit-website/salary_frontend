import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Table, Button, Space, Modal, Form, Input, Select, Tabs, message, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, DownloadOutlined, UserOutlined, UploadOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api, { API_BASE_URL } from '../api';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';

// Register ImageResize module
Quill.register('modules/imageResize', ImageResize);

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const LetterManagement = () => {
    const [templates, setTemplates] = useState([]);
    const [issuedLetters, setIssuedLetters] = useState([]);
    const [staffOptions, setStaffOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [issueOpen, setIssueOpen] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [form] = Form.useForm();
    const [issueForm] = Form.useForm();
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
        { title: 'Title', dataIndex: 'title', key: 'title' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button icon={<DeleteOutlined />} danger onClick={() => Modal.confirm({
                        title: 'Delete Template?',
                        content: 'Are you sure you want to delete this template?',
                        onOk: () => handleDelete(record.id)
                    })} />
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
                    <Text strong>{record.staffMember?.profile?.name || record.staffMember?.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>ID: {record.staffMember?.profile?.staffId}</Text>
                </Space>
            )
        },
        { title: 'Letter Title', dataIndex: 'title', key: 'title' },
        {
            title: 'Issued By',
            key: 'issuedBy',
            render: (_, record) => record.issuer?.profile?.name || record.issuer?.name
        },
        {
            title: 'Issued At',
            dataIndex: 'issuedAt',
            key: 'issuedAt',
            render: (d) => new Date(d).toLocaleDateString()
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
                            <a key={idx} href={`${API_BASE_URL}${path}`} target="_blank" rel="noreferrer">
                                <Button type="link" size="small" style={{ padding: 0 }}>View Attachment {list.length > 1 ? idx + 1 : ''}</Button>
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
                <Button icon={<DownloadOutlined />} onClick={() => {
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
                }}>Print / Download</Button>
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
                <Sidebar />
                <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
                    <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Button icon={<DownloadOutlined rotate={90} />} onClick={handleBack} type="text">Back</Button>
                            <Title level={4} style={{ margin: 0 }}>
                                {editingTemplate ? 'Edit Template' : 'Create New Template'}
                            </Title>
                        </div>
                        <Space>
                            <Button onClick={handleBack}>Cancel</Button>
                            <Button type="primary" onClick={handleSave}>Save Template</Button>
                        </Space>
                    </Header>
                    <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                        <Form form={form} layout="vertical">
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24 }}>
                                {/* Main Editor Area */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                        <Form.Item name="title" label="Template Title" rules={[{ required: true, message: 'Please enter a title' }]} style={{ marginBottom: 0 }}>
                                            <Input size="large" placeholder="e.g. Offer Letter for Engineers" prefix={<FileTextOutlined style={{ color: '#bfbfbf' }} />} />
                                        </Form.Item>
                                    </Card>

                                    <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Form.Item
                                            name="content"
                                            label="Letter Content"
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
                                        title={<span style={{ fontSize: 14 }}>Available Placeholders</span>}
                                        bordered={false}
                                        style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', position: 'sticky', top: 88 }}
                                        size="small"
                                    >
                                        <Text type="secondary" style={{ fontSize: 12, marginBottom: 16, display: 'block' }}>
                                            Drag and drop these placeholders into the editor correctly.
                                        </Text>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {placeholders.map(ph => (
                                                <Tooltip title={`Drag ${ph.value} to editor`} key={ph.value}>
                                                    <Tag
                                                        color="blue"
                                                        style={{
                                                            cursor: 'move',
                                                            padding: '6px 12px',
                                                            borderRadius: '4px',
                                                            userSelect: 'none',
                                                            marginBottom: 8
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
                    </Content>
                </Layout>
            </Layout>
        );
    }

    // List View
    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar />
            <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
                <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}>
                    <Title level={4} style={{ margin: 0 }}>Letter Management</Title>
                </Header>
                <Content style={{ padding: 24 }}>
                    <Tabs defaultActiveKey="1" items={[
                        {
                            key: '1',
                            label: 'Letter Templates',
                            children: (
                                <Card title="Management Templates" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add Template</Button>}>
                                    <Table
                                        columns={templateColumns}
                                        dataSource={templates}
                                        rowKey="id"
                                        loading={loading}
                                        pagination={{ pageSize: 10 }}
                                    />
                                </Card>
                            )
                        },
                        {
                            key: '2',
                            label: 'Issued Letters',
                            children: (
                                <Card
                                    title="Previous Issued Letters"
                                    extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIssueOpen(true)}>Issue Letter</Button>}
                                >
                                    <Table
                                        columns={issuedColumns}
                                        dataSource={issuedLetters}
                                        rowKey="id"
                                        loading={loading}
                                        pagination={{ pageSize: 10 }}
                                    />
                                </Card>
                            )
                        }
                    ]} />
                </Content>
            </Layout>
            <Modal
                title="Issue Letter to Multiple Staff"
                open={issueOpen}
                onCancel={() => setIssueOpen(false)}
                onOk={handleIssueLetters}
                confirmLoading={issuing}
                okText="Issue"
                destroyOnClose
            >
                <Form form={issueForm} layout="vertical">
                    <Form.Item
                        name="templateId"
                        label="Select Letter Template"
                        rules={[{ required: true, message: 'Please select a template' }]}
                    >
                        <Select
                            placeholder="Choose a template"
                            options={(templates || []).map((t) => ({ value: t.id, label: t.title }))}
                            showSearch
                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>
                    <Form.Item
                        name="staffUserIds"
                        label="Select Staff"
                        rules={[{ required: true, message: 'Please select at least one staff member' }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Choose one or more staff"
                            options={staffOptions}
                            showSearch
                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>
                    <Text type="secondary">Letter content will be generated from the selected template for each selected staff.</Text>

                    <div style={{ marginTop: 20 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Additional Attachments (Optional)</Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <Button
                                icon={<UploadOutlined />}
                                onClick={() => document.getElementById('letter-attachment-input').click()}
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
        </Layout>
    );
};

export default LetterManagement;
