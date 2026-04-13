import React, { useState, useEffect } from 'react';
import { Layout, Tabs, Card, Button, Table, Tag, Space, Modal, Form, Input, Select, DatePicker, message, Typography, Row, Col, Statistic, Empty, Upload, Menu, Drawer, Rate, Divider, Progress, List, Avatar } from 'antd';
import { PlusOutlined, FileTextOutlined, TeamOutlined, CalendarOutlined, UploadOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SearchOutlined, EyeOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, AppstoreOutlined, BarsOutlined, StarFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import moment from 'moment';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Recruitment = () => {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('jobs');
    const [viewMode, setViewMode] = useState('board'); // 'table' or 'board'
    const [loading, setLoading] = useState(false);

    // Data states
    const [jobs, setJobs] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [interviews, setInterviews] = useState([]);
    const [interviewers, setInterviewers] = useState([]);
    const [stats, setStats] = useState({ total: 0, applied: 0, screening: 0, interview: 0, offered: 0, hired: 0 });
    const [funnel, setFunnel] = useState([]);

    // Modal/Drawer states
    const [jobModalVisible, setJobModalVisible] = useState(false);
    const [candidateModalVisible, setCandidateModalVisible] = useState(false);
    const [interviewModalVisible, setInterviewModalVisible] = useState(false);
    const [candidateDrawerVisible, setCandidateDrawerVisible] = useState(false);
    
    const [form] = Form.useForm();
    const [candidateForm] = Form.useForm();
    const [interviewForm] = Form.useForm();

    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [selectedInterview, setSelectedInterview] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [jobsRes, candidatesRes, interviewsRes] = await Promise.all([
                api.get('/admin/recruitment/jobs'),
                api.get('/admin/recruitment/candidates'),
                api.get('/admin/recruitment/interviews')
            ]);
            
            if (jobsRes.data.success) setJobs(jobsRes.data.jobs);
            if (candidatesRes.data.success) {
                setCandidates(candidatesRes.data.candidates);
                setStats(candidatesRes.data.stats || stats);
                setFunnel(candidatesRes.data.funnel || []);
            }
            if (interviewsRes.data.success) setInterviews(interviewsRes.data.interviews);
        } catch (error) {
            message.error('Failed to fetch recruitment data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        api.get('/admin/staff').then(res => {
            if (res.data.success) setInterviewers(res.data.staff);
        });
    }, []);

    const handleCreateJob = async (values) => {
        try {
            const endpoint = selectedJob ? `/admin/recruitment/jobs/${selectedJob.id}` : '/admin/recruitment/jobs';
            const method = selectedJob ? 'put' : 'post';
            const res = await api[method](endpoint, values);
            if (res.data.success) {
                message.success(`Job ${selectedJob ? 'updated' : 'created'} successfully`);
                setJobModalVisible(false);
                setSelectedJob(null);
                form.resetFields();
                fetchData();
            }
        } catch (error) {
            message.error('Operation failed');
        }
    };

    const handleAddUpdateCandidate = async (values) => {
        try {
            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (key === 'resume' && values[key] && values[key].length > 0 && values[key][0].originFileObj) {
                    formData.append('resume', values[key][0].originFileObj);
                } else if (key !== 'resume' && values[key] !== undefined) {
                    formData.append(key, values[key]);
                }
            });

            const endpoint = selectedCandidate && selectedCandidate.id && !candidateDrawerVisible ? `/admin/recruitment/candidates/${selectedCandidate.id}` : '/admin/recruitment/candidates';
            const method = selectedCandidate && selectedCandidate.id && !candidateDrawerVisible ? 'put' : 'post';

            const res = await api[method](endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success) {
                message.success(`Candidate ${selectedCandidate && selectedCandidate.id && !candidateDrawerVisible ? 'updated' : 'added'} successfully`);
                setCandidateModalVisible(false);
                setSelectedCandidate(null);
                candidateForm.resetFields();
                fetchData();
            }
        } catch (error) {
            message.error('Action failed');
        }
    };

    const handleUpdateCandidate = async (id, data) => {
        try {
            const res = await api.put(`/admin/recruitment/candidates/${id}`, data);
            if (res.data.success) {
                message.success('Updated successfully');
                fetchData();
            }
        } catch (error) {
            message.error('Update failed');
        }
    };

    const handleUpdateInterview = async (values) => {
        try {
            const endpoint = selectedInterview ? `/admin/recruitment/interviews/${selectedInterview.id}` : '/admin/recruitment/interviews';
            const method = selectedInterview ? 'put' : 'post';
            
            const payload = {
                ...values,
                scheduledAt: values.scheduledAt ? values.scheduledAt.toDate() : undefined
            };

            const res = await api[method](endpoint, payload);
            if (res.data.success) {
                message.success(`Interview ${selectedInterview ? 'updated' : 'scheduled'}`);
                setInterviewModalVisible(false);
                setSelectedInterview(null);
                interviewForm.resetFields();
                fetchData();
            }
        } catch (error) {
            message.error('Operation failed');
        }
    };


    const renderBoardView = () => {
        const statuses = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED'];
        const colors = { APPLIED: '#e6f7ff', SCREENING: '#fff7e6', INTERVIEW: '#f9f0ff', OFFERED: '#f6ffed', HIRED: '#f0f5ff' };

        return (
            <div className="kanban-board" style={{ display: 'flex', overflowX: 'auto', padding: '10px 0', gap: '16px' }}>
                {statuses.map(status => (
                    <div key={status} style={{ minWidth: '280px', flex: 1, background: '#f0f2f5', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <Text strong>{status}</Text>
                            <Tag color="default">{candidates.filter(c => c.status === status).length}</Tag>
                        </div>
                        <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                            {candidates.filter(c => c.status === status).map(c => (
                                <Card 
                                    key={c.id} 
                                    size="small" 
                                    style={{ marginBottom: '8px', cursor: 'pointer', borderRadius: '6px' }}
                                    onClick={() => { setSelectedCandidate(c); setCandidateDrawerVisible(true); }}
                                    hoverable
                                >
                                    <div style={{ marginBottom: '4px' }}><strong>{c.name}</strong></div>
                                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{c.Job?.title}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                        <Rate disabled defaultValue={c.rating || 0} style={{ fontSize: '12px' }} />
                                        <Space>
                                            <Button size="small" type="text" onClick={(e) => { e.stopPropagation(); handleUpdateCandidate(c.id, { status: statuses[statuses.indexOf(status) + 1] || status }); }} disabled={status === 'HIRED'} icon={<PlusOutlined style={{ fontSize: '10px' }} />} />
                                        </Space>
                                    </div>
                                </Card>
                            ))}
                            {candidates.filter(c => c.status === status).length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const jobColumns = [
        { title: 'Job Title', dataIndex: 'title', key: 'title', render: text => <strong>{text}</strong> },
        { title: 'Location', dataIndex: 'location', key: 'location' },
        { title: 'Type', dataIndex: 'jobType', key: 'jobType', render: type => <Tag color="blue">{type}</Tag> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: status => (
            <Tag color={status === 'OPEN' ? 'green' : 'red'}>{status}</Tag>
        )},
        { title: 'Actions', key: 'actions', render: (_, record) => (
            <Button size="small" onClick={() => { setSelectedJob(record); form.setFieldsValue(record); setJobModalVisible(true); }}>Edit</Button>
        )}
    ];

    const candidateColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name', render: (text, r) => (
            <div style={{ cursor: 'pointer' }} onClick={() => { setSelectedCandidate(r); setCandidateDrawerVisible(true); }}>
                <strong>{text}</strong><br/><Text size="small" type="secondary">{r.email}</Text>
            </div>
        )},
        { title: 'Job Applied', key: 'job', render: (_, r) => r.Job?.title },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status, r) => (
            <Select defaultValue={status} style={{ width: 130 }} onChange={(val) => handleUpdateCandidate(r.id, { status: val })}>
                {['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'SELECTED', 'REJECTED', 'HIRED'].map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>
        )},
        { title: 'Rating', dataIndex: 'rating', key: 'rating', render: (val, r) => <Rate value={val} onChange={(v) => handleUpdateCandidate(r.id, { rating: v })} style={{ fontSize: '14px' }} /> },
        { title: 'Resume', key: 'resume', render: (_, r) => r.resumeUrl ? (
            <Button type="link" icon={<FileTextOutlined />} onClick={() => window.open(`${api.defaults.baseURL}${r.resumeUrl}`, '_blank')}>View</Button>
        ) : 'N/A' },
        { title: 'Interview', key: 'interview', render: (_, r) => (
            <Button size="small" icon={<CalendarOutlined />} onClick={() => { 
                setSelectedCandidate(r); 
                interviewForm.setFieldsValue({ candidateId: r.id });
                setInterviewModalVisible(true); 
            }}>Schedule</Button>
        )},
        { title: 'Actions', key: 'actions', fixed: 'right', render: (_, r) => (
            <Button size="small" onClick={() => { 
                setSelectedCandidate(r); 
                candidateForm.setFieldsValue({
                    ...r,
                    resume: undefined // Can't populate file input
                });
                setCandidateModalVisible(true); 
            }}>Edit</Button>
        )},
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden' }}>
                <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, { onClick: () => setCollapsed(!collapsed), style: { fontSize: '18px', padding: '0 24px' } })}
                        <Title level={4} style={{ margin: 0 }}>Recruitment System (ATS)</Title>
                    </div>
                </Header>

                <Content style={{ margin: '0', padding: '24px', background: '#f5f5f5', height: 'calc(100vh - 64px)', overflow: 'auto' }}>
                    <Row gutter={16} style={{ marginBottom: '24px' }}>
                        <Col span={6}><Card bordered={false} className="stat-card"><Statistic title="Total Pool" value={stats.total} prefix={<TeamOutlined />} /></Card></Col>
                        <Col span={6}><Card bordered={false} className="stat-card"><Statistic title="Active Interviews" value={stats.interview} valueStyle={{ color: '#722ed1' }} prefix={<CalendarOutlined />} /></Card></Col>
                        <Col span={6}><Card bordered={false} className="stat-card"><Statistic title="Offered" value={stats.offered} valueStyle={{ color: '#faad14' }} prefix={<FileTextOutlined />} /></Card></Col>
                        <Col span={6}><Card bordered={false} className="stat-card"><Statistic title="Hired" value={stats.hired} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
                    </Row>

                    <Card style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Tabs 
                            activeKey={activeTab} 
                            onChange={setActiveTab}
                            tabBarExtraContent={
                                <Space>
                                    {activeTab === 'candidates' && (
                                        <Space className="view-switcher" style={{ background: '#f0f0f0', padding: '4px', borderRadius: '8px' }}>
                                            <Button type={viewMode === 'board' ? 'primary' : 'text'} size="small" icon={<AppstoreOutlined />} onClick={() => setViewMode('board')}>Board</Button>
                                            <Button type={viewMode === 'table' ? 'primary' : 'text'} size="small" icon={<BarsOutlined />} onClick={() => setViewMode('table')}>List</Button>
                                        </Space>
                                    )}
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setJobModalVisible(true)}>New Job</Button>
                                    <Button icon={<TeamOutlined />} onClick={() => setCandidateModalVisible(true)}>Add Candidate</Button>
                                </Space>
                            }
                        >
                            <TabPane tab={<span><FileTextOutlined />Job Postings</span>} key="jobs">
                                <Table columns={jobColumns} dataSource={jobs} loading={loading} rowKey="id" pagination={{ pageSize: 6 }} />
                            </TabPane>
                            <TabPane tab={<span><TeamOutlined />Candidates</span>} key="candidates">
                                {viewMode === 'table' ? <Table columns={candidateColumns} dataSource={candidates} loading={loading} rowKey="id" pagination={{ pageSize: 8 }} /> : renderBoardView()}
                            </TabPane>
                            <TabPane tab={<span><CalendarOutlined />Interviews</span>} key="interviews">
                                <Table 
                                    columns={[
                                        { title: 'Time', dataIndex: 'scheduledAt', key: 'time', render: d => moment(d).format('MMM DD, hh:mm A') },
                                        { title: 'Candidate', key: 'candidate', render: (_, r) => r.Candidate?.name },
                                        { title: 'Round', dataIndex: 'roundName', key: 'round' },
                                        { title: 'Status', dataIndex: 'status', key: 'status', render: (status, r) => (
                                            <Select 
                                                defaultValue={status} 
                                                style={{ width: 140 }} 
                                                onChange={(val) => {
                                                    setSelectedInterview(r);
                                                    handleUpdateInterview({ status: val });
                                                }}
                                            >
                                                {['SCHEDULED', 'COMPLETED', 'CANCELLED'].map(s => <Option key={s} value={s}>{s}</Option>)}
                                            </Select>
                                        )},
                                        { title: 'Score', dataIndex: 'score', key: 'score', render: (score, r) => (
                                            <Input 
                                                type="number" 
                                                defaultValue={score} 
                                                style={{ width: 60 }} 
                                                onBlur={(e) => {
                                                    setSelectedInterview(r);
                                                    handleUpdateInterview({ score: e.target.value });
                                                }}
                                            />
                                        )},
                                        { title: 'Meeting', key: 'meeting', render: (_, r) => r.meetingLink ? <Button type="link" size="small" onClick={() => window.open(r.meetingLink)}>Join</Button> : 'Offline' },
                                        { title: 'Actions', key: 'actions', fixed: 'right', render: (_, r) => (
                                            <Button size="small" onClick={() => {
                                                setSelectedInterview(r);
                                                setSelectedCandidate(r.Candidate);
                                                interviewForm.setFieldsValue({
                                                    ...r,
                                                    scheduledAt: moment(r.scheduledAt)
                                                });
                                                setInterviewModalVisible(true);
                                            }}>Edit</Button>
                                        )},
                                    ]} 
                                    dataSource={interviews} loading={loading} rowKey="id" 
                                />
                            </TabPane>
                        </Tabs>
                    </Card>
                </Content>

                <Modal title={selectedJob ? "Edit Job" : "New Job Posting"} visible={jobModalVisible} onCancel={() => setJobModalVisible(false)} onOk={() => form.submit()} width={800}>
                    <Form form={form} layout="vertical" onFinish={handleCreateJob}>
                        <Row gutter={16}>
                            <Col span={18}><Form.Item name="title" label="Job Title" rules={[{ required: true }]}><Input /></Form.Item></Col>
                            <Col span={6}><Form.Item name="jobType" label="Type" initialValue="Full-time"><Select><Option value="Full-time">Full-time</Option><Option value="Contract">Contract</Option></Select></Form.Item></Col>
                        </Row>
                        <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                            <ReactQuill theme="snow" style={{ height: '150px', marginBottom: '40px' }} />
                        </Form.Item>
                        <Form.Item name="requirements" label="Requirements">
                            <ReactQuill theme="snow" style={{ height: '150px', marginBottom: '40px' }} />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="location" label="Location"><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="salaryRange" label="Salary Range"><Input placeholder="e.g. ₹10L - ₹15L" /></Form.Item></Col>
                            <Col span={8}><Form.Item name="status" label="Status" initialValue="OPEN"><Select><Option value="OPEN">Open</Option><Option value="CLOSED">Closed</Option></Select></Form.Item></Col>
                        </Row>
                    </Form>
                </Modal>

                <Drawer 
                    title="Candidate Details" 
                    width={640} 
                    onClose={() => setCandidateDrawerVisible(false)} 
                    visible={candidateDrawerVisible}
                >
                    {selectedCandidate && (
                        <div>
                            <Row gutter={16} align="middle" style={{ marginBottom: '24px' }}>
                                <Col><Avatar size={64} icon={<TeamOutlined />} /></Col>
                                <Col>
                                    <Title level={4} style={{ margin: 0 }}>{selectedCandidate.name}</Title>
                                    <Text type="secondary">{selectedCandidate.email} | {selectedCandidate.phone}</Text>
                                </Col>
                            </Row>
                            <Divider orientation="left">Profile Info</Divider>
                            <Row gutter={16}>
                                <Col span={12}><Statistic title="Status" value={selectedCandidate.status} valueStyle={{ fontSize: '16px' }} /></Col>
                                <Col span={12}><Text type="secondary">Rating</Text><br/><Rate value={selectedCandidate.rating} onChange={(v) => handleUpdateCandidate(selectedCandidate.id, { rating: v })} /></Col>
                            </Row>
                            <div style={{ marginTop: '16px' }}><Text strong>Applied For:</Text> {selectedCandidate.Job?.title}</div>
                            <div style={{ marginTop: '8px' }}><Text strong>Experience:</Text> {selectedCandidate.totalExperience || 'N/A'}</div>
                            
                            <Divider orientation="left">Experience & CTC</Divider>
                            <Row gutter={16}>
                                <Col span={12}><Text type="secondary">Current CTC</Text><br/><Text strong>{selectedCandidate.currentCtc || 'N/A'}</Text></Col>
                                <Col span={12}><Text type="secondary">Expected CTC</Text><br/><Text strong>{selectedCandidate.expectedCtc || 'N/A'}</Text></Col>
                            </Row>

                            <Divider orientation="left">Interviews</Divider>
                            <List
                                size="small"
                                dataSource={interviews.filter(i => i.candidateId === selectedCandidate.id)}
                                renderItem={item => (
                                    <List.Item>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Text strong>{item.roundName}</Text>
                                                <Tag color={item.status === 'COMPLETED' ? 'green' : 'blue'}>{item.status}</Tag>
                                            </div>
                                            <Text type="secondary">{moment(item.scheduledAt).format('MMM DD, YYYY hh:mm A')}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />

                            {selectedCandidate.resumeUrl && (
                                <>
                                    <Divider orientation="left">Resume Preview</Divider>
                                    <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', height: '400px', overflow: 'hidden' }}>
                                        <iframe 
                                            src={`${api.defaults.baseURL}${selectedCandidate.resumeUrl}`} 
                                            width="100%" 
                                            height="100%" 
                                            style={{ border: 'none' }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </Drawer>

                <Modal title={selectedCandidate && selectedCandidate.id ? "Edit Candidate" : "Add Candidate"} visible={candidateModalVisible} onCancel={() => { setCandidateModalVisible(false); setSelectedCandidate(null); candidateForm.resetFields(); }} onOk={() => candidateForm.submit()}>
                    <Form form={candidateForm} layout="vertical" onFinish={handleAddUpdateCandidate}>
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        </Row>
                        <Form.Item 
                            name="jobId" 
                            label="Job" 
                            rules={[
                                { required: true, message: 'Please select a job' },
                                {
                                    validator: (_, value) => {
                                        const job = jobs.find(j => j.id === value);
                                        if (job && job.status === 'CLOSED') {
                                            return Promise.reject(new Error('This job is closed'));
                                        }
                                        return Promise.resolve();
                                    }
                                }
                            ]}
                        >
                            <Select 
                                onChange={(value) => {
                                    const job = jobs.find(j => j.id === value);
                                    if (job && job.status === 'CLOSED') {
                                        message.warning('This job is closed. Please select an open job.');
                                    }
                                }}
                            >
                                {jobs.map(j => (
                                    <Option key={j.id} value={j.id}>
                                        {j.title} {j.status === 'CLOSED' ? '(CLOSED)' : ''}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="source" label="Source" initialValue="Direct"><Select><Option value="Direct">Direct</Option><Option value="LinkedIn">LinkedIn</Option><Option value="Referral">Referral</Option></Select></Form.Item>
                        <Form.Item 
                            name="resume" 
                            label="Resume"
                            valuePropName="fileList"
                            getValueFromEvent={(e) => {
                                if (Array.isArray(e)) return e;
                                return e && e.fileList;
                            }}
                            help={selectedCandidate && selectedCandidate.resumeUrl && (
                                <div style={{ marginTop: '8px' }}>
                                    Current Resume: <Button type="link" size="small" onClick={() => window.open(`${api.defaults.baseURL}${selectedCandidate.resumeUrl}`, '_blank')}>View Existing</Button>
                                </div>
                            )}
                        >
                            <Upload beforeUpload={() => false} maxCount={1}>
                                <Button icon={<UploadOutlined />}>Select New Resume</Button>
                            </Upload>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal title={selectedInterview ? "Edit Interview" : "Schedule Interview"} visible={interviewModalVisible} onCancel={() => { setInterviewModalVisible(false); setSelectedInterview(null); interviewForm.resetFields(); }} onOk={() => interviewForm.submit()}>
                    <Form form={interviewForm} layout="vertical" onFinish={handleUpdateInterview}>
                        <Form.Item name="candidateId" hidden><Input /></Form.Item>
                        <Form.Item name="roundName" label="Interview Round" initialValue="Technical Round 1"><Input /></Form.Item>
                        <Form.Item name="interviewerId" label="Interviewer" rules={[{ required: true }]}>
                            <Select>{interviewers.map(s => <Option key={s.id} value={s.id}>{s.name || s.phone}</Option>)}</Select>
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={14}><Form.Item name="scheduledAt" label="Time" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={10}><Form.Item name="durationMinutes" label="Duration" initialValue={30}><Input suffix="mins" type="number" /></Form.Item></Col>
                        </Row>
                        <Form.Item name="meetingLink" label="Link"><Input /></Form.Item>
                    </Form>
                </Modal>
            </Layout>
            <style jsx>{`
                .stat-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
                .kanban-board::-webkit-scrollbar { height: 8px; }
                .kanban-board::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 4px; }
            `}</style>
        </Layout>
    );
};

export default Recruitment;
