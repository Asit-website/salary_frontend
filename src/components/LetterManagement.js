import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Table, Button, Space, Modal, Form, Input, Select, Tabs, message, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, DownloadOutlined, UserOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import api from '../api';
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
    const [loading, setLoading] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [form] = Form.useForm();
    const quillRef = useRef(null);
    const [view, setView] = useState('list'); // 'list' | 'editor'

    const loadData = async () => {
        setLoading(true);
        try {
            const [tplRes, issuedRes] = await Promise.all([
                api.get('/admin/letters/templates'),
                api.get('/admin/letters/issued'),
            ]);
            if (tplRes.data.success) setTemplates(tplRes.data.templates);
            if (issuedRes.data.success) setIssuedLetters(issuedRes.data.letters);
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
                                <Card title="Previous Issued Letters">
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
        </Layout>
    );
};

export default LetterManagement;
