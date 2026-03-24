import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Typography, Tabs, Button, Card, Table, Space, message, Select, DatePicker, TimePicker, Tag, Input, Popconfirm, Modal, Switch, Timeline, Menu } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, CheckOutlined, MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import api, { API_BASE_URL } from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function TaskManagement() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    // Data states
    const [activities, setActivities] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [staffList, setStaffList] = useState([]);

    // Loading states
    const [loading, setLoading] = useState(false);

    // Filter states
    const [dateRange, setDateRange] = useState(null);
    const [staffFilter, setStaffFilter] = useState(null);
    const [observers, setObservers] = useState([]);
    const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
    const [selectedObserver, setSelectedObserver] = useState(null);
    const [assignedStaffIds, setAssignedStaffIds] = useState([]);

    // History Modal states
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [historyType, setHistoryType] = useState('Ticket'); // 'Ticket', 'Activity' or 'Meeting'
    const [historyLoading, setHistoryLoading] = useState(false);

    // New Ticket Modal states
    const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
    const [newTicket, setNewTicket] = useState({
        title: '',
        ticketId: '',
        attachment: null,
        description: '',
        priority: 'MEDIUM',
        allocatedTo: null,
        dueDate: null
    });

    const [ticketSearchId, setTicketSearchId] = useState('');
    const [isTicketEditMode, setIsTicketEditMode] = useState(false);
    const [editingTicketId, setEditingTicketId] = useState(null);

    const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
    const [newActivity, setNewActivity] = useState({
        userId: null,
        title: '',
        description: '',
        date: null,
        turnAroundTime: ''
    });
    const [isActivityEditMode, setIsActivityEditMode] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);

    const [isMeetingModalVisible, setIsMeetingModalVisible] = useState(false);
    const [newMeeting, setNewMeeting] = useState({
        title: '',
        description: '',
        scheduledAt: null,
        attendees: [],
        meetLink: ''
    });
    const [isMeetingEditMode, setIsMeetingEditMode] = useState(false);
    const [editingMeetingId, setEditingMeetingId] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [actResp, meetResp, tickResp, staffResp] = await Promise.all([
                api.get('/admin/task-management/activities'),
                api.get('/admin/task-management/meetings'),
                api.get('/admin/task-management/tickets'),
                api.get('/admin/staff')
            ]);

            setActivities(actResp.data.activities || []);
            setMeetings(meetResp.data.meetings || []);
            setTickets(tickResp.data.tickets || []);
            setStaffList(staffResp.data.staff || []);

            // Only fetch observers if user is admin
            const userStr = sessionStorage.getItem('impersonate_user') || localStorage.getItem('user');
            const role = JSON.parse(userStr)?.role;
            if (role === 'admin' || role === 'superadmin') {
                const obsResp = await api.get('/admin/task-management/observers');
                setObservers(obsResp.data.observers || []);
            }
        } catch (error) {
            message.error('Failed to load task management data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const staffOptions = useMemo(() =>
        staffList.map(s => ({ label: s.name || s.profile?.name || `Staff ${s.id}`, value: s.id })),
        [staffList]);

    const getValue = (obj, path) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    const filterData = (data, dateField, userField) => {
        return data.filter(item => {
            const valStaff = getValue(item, userField);
            const matchesStaff = !staffFilter || valStaff === staffFilter || (valStaff?.id === staffFilter);

            let matchesDate = true;
            if (dateRange && dateRange[0] && dateRange[1]) {
                const itemDate = dayjs(getValue(item, dateField));
                matchesDate = itemDate.isAfter(dateRange[0].startOf('day')) && itemDate.isBefore(dateRange[1].endOf('day'));
            }

            return matchesStaff && matchesDate;
        });
    };

    const handleClose = async (type, id) => {
        try {
            let endpoint = '';
            if (type === 'activity') endpoint = `/admin/task-management/activities/${id}/close`;
            else if (type === 'ticket') endpoint = `/admin/task-management/tickets/${id}/close`;
            else if (type === 'meeting') endpoint = `/admin/task-management/meetings/${id}/close`;

            const resp = await api.patch(endpoint);
            if (resp.data.success) {
                message.success('Task closed permanently');
                fetchInitialData();
            }
        } catch (error) {
            message.error('Failed to close task');
        }
    };

    const handleToggleObserver = async (id) => {
        try {
            const resp = await api.patch(`/admin/task-management/observers/${id}/toggle`);
            if (resp.data.success) {
                message.success('Observer status updated');
                fetchInitialData();
            }
        } catch (error) {
            message.error('Failed to update observer status');
        }
    };

    const openAssignModal = async (observer) => {
        setSelectedObserver(observer);
        try {
            const resp = await api.get(`/admin/task-management/observers/${observer.id}/mappings`);
            setAssignedStaffIds(resp.data.assignedStaffIds || []);
            setIsAssignModalVisible(true);
        } catch (error) {
            message.error('Failed to load assignments');
        }
    };

    const handleSaveAssignments = async () => {
        try {
            const resp = await api.post(`/admin/task-management/observers/${selectedObserver.id}/mappings`, {
                staffIds: assignedStaffIds
            });
            if (resp.data.success) {
                message.success('Assignments saved');
                setIsAssignModalVisible(false);
            }
        } catch (error) {
            message.error('Failed to save assignments');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('impersonate_user');
        sessionStorage.removeItem('impersonate_token');
        navigate('/');
    };

    const openTicketEditModal = (record) => {
        setEditingTicketId(record.id);
        setIsTicketEditMode(true);
        setNewTicket({
            title: record.title,
            ticketId: record.ticketId || '',
            attachment: null, // Don't reset attachment on edit unless changed
            description: record.description,
            priority: record.priority,
            allocatedTo: record.allocatedTo,
            dueDate: record.dueDate ? dayjs(record.dueDate) : null
        });
        setIsTicketModalVisible(true);
    };

    const openActivityEditModal = (record) => {
        setEditingActivityId(record.id);
        setIsActivityEditMode(true);
        setNewActivity({
            userId: record.userId,
            title: record.title,
            description: record.description,
            date: record.date ? dayjs(record.date) : null,
            turnAroundTime: record.turnAroundTime ? dayjs(record.turnAroundTime, 'HH:mm') : null
        });
        setIsActivityModalVisible(true);
    };

    const openMeetingEditModal = (record) => {
        setEditingMeetingId(record.id);
        setIsMeetingEditMode(true);
        setNewMeeting({
            title: record.title,
            description: record.description,
            scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : null,
            attendees: (record.attendees || []).map(a => a.id),
            meetLink: record.meetLink || ''
        });
        setIsMeetingModalVisible(true);
    };

    const handleCreateTicket = async () => {
        if (!newTicket.title || !newTicket.allocatedTo || !newTicket.ticketId) {
            message.error('Please fill in Title, Assignee and Ticket ID');
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', newTicket.title);
            formData.append('ticketId', newTicket.ticketId);
            formData.append('description', newTicket.description || '');
            formData.append('priority', newTicket.priority);
            formData.append('allocatedTo', newTicket.allocatedTo);
            if (newTicket.dueDate) {
                formData.append('dueDate', newTicket.dueDate.format('YYYY-MM-DD'));
            }
            if (newTicket.attachment) {
                formData.append('attachment', newTicket.attachment);
            }

            const resp = isTicketEditMode
                ? await api.patch(`/admin/task-management/tickets/${editingTicketId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                : await api.post('/admin/task-management/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            if (resp.data.success) {
                message.success(isTicketEditMode ? 'Ticket updated' : 'Ticket created and assigned');
                setIsTicketModalVisible(false);
                setIsTicketEditMode(false);
                setEditingTicketId(null);
                setNewTicket({
                    title: '',
                    ticketId: '',
                    attachment: null,
                    description: '',
                    priority: 'MEDIUM',
                    allocatedTo: null,
                    dueDate: null
                });
                fetchInitialData();
            }
        } catch (error) {
            message.error(error.response?.data?.message || (isTicketEditMode ? 'Failed to update ticket' : 'Failed to create ticket'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateActivity = async () => {
        if (!newActivity.title || !newActivity.userId || !newActivity.date) {
            message.error('Please fill in Title, Staff and Date');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...newActivity,
                date: newActivity.date ? newActivity.date.format('YYYY-MM-DD') : null,
                turnAroundTime: newActivity.turnAroundTime ? newActivity.turnAroundTime.format('HH:mm') : ''
            };
            const resp = isActivityEditMode
                ? await api.patch(`/admin/task-management/activities/${editingActivityId}`, payload)
                : await api.post('/admin/task-management/activities', payload);

            if (resp.data.success) {
                message.success(isActivityEditMode ? 'Activity updated' : 'Activity created and assigned');
                setIsActivityModalVisible(false);
                setIsActivityEditMode(false);
                setEditingActivityId(null);
                setNewActivity({
                    userId: null,
                    title: '',
                    description: '',
                    date: null,
                    turnAroundTime: ''
                });
                fetchInitialData();
            }
        } catch (error) {
            message.error(isActivityEditMode ? 'Failed to update activity' : 'Failed to create activity');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMeeting = async () => {
        const link = newMeeting.meetLink?.trim();
        const gmeetRegex = /^(https?:\/\/)?meet\.google\.com\/[a-z0-9-]+$/i;

        if (!newMeeting.title || !newMeeting.scheduledAt || !link) {
            message.error('Please fill in Title, Scheduled Time and Google Meet Link');
            return;
        }

        if (!gmeetRegex.test(link)) {
            message.error('Please enter a valid Google Meet link (e.g., meet.google.com/xxx-xxxx-xxx)');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...newMeeting,
                meetLink: link,
                scheduledAt: newMeeting.scheduledAt ? newMeeting.scheduledAt.toISOString() : null
            };
            const resp = isMeetingEditMode
                ? await api.patch(`/admin/task-management/meetings/${editingMeetingId}`, payload)
                : await api.post('/admin/task-management/meetings', payload);

            if (resp.data.success) {
                message.success(isMeetingEditMode ? 'Meeting updated' : 'Meeting created and assigned');
                setIsMeetingModalVisible(false);
                setIsMeetingEditMode(false);
                setEditingMeetingId(null);
                setNewMeeting({ title: '', description: '', scheduledAt: null, attendees: [], meetLink: '' });
                fetchInitialData();
            }
        } catch (error) {
            message.error(isMeetingEditMode ? 'Failed to update meeting' : 'Failed to create meeting');
        } finally {
            setLoading(false);
        }
    };


    
    const handleTicketSearch = async () => {
        if (!ticketSearchId.trim()) {
            message.warning('Please enter a Ticket ID');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/task-management/tickets/search/${ticketSearchId.trim()}`);
            if (data.success && data.ticket) {
                fetchTicketHistory(data.ticket.id);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Ticket not found');
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketHistory = async (ticketId) => {
        setHistoryLoading(true);
        setHistoryType('Ticket');
        setIsHistoryModalVisible(true);
        try {
            const { data } = await api.get(`/admin/task-management/tickets/${ticketId}/history`);
            if (data.success) {
                setHistoryData(data.history || []);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to fetch history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchActivityHistory = async (activityId) => {
        setHistoryLoading(true);
        setHistoryType('Activity');
        setIsHistoryModalVisible(true);
        try {
            const { data } = await api.get(`/admin/task-management/activities/${activityId}/history`);
            if (data.success) {
                setHistoryData(data.history || []);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to fetch history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchMeetingHistory = async (meetingId) => {
        setHistoryLoading(true);
        setHistoryType('Meeting');
        setIsHistoryModalVisible(true);
        try {
            const { data } = await api.get(`/admin/task-management/meetings/${meetingId}/history`);
            if (data.success) {
                setHistoryData(data.history || []);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to fetch history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const activityColumns = [
        { title: 'Staff', render: (_, r) => r.user?.profile?.name || 'Unknown', onCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
        { title: 'Title', dataIndex: 'title', key: 'title', onCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
        { title: 'Description', dataIndex: 'description', key: 'description' },
        {
            title: 'Status',
            onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (_, r) => (
                <Space>
                    <Tag color={r.status === 'DONE' ? 'green' : r.status === 'SCHEDULE' ? 'blue' : 'orange'}>{r.status}</Tag>
                    {r.isClosed && <Tag color="magenta">CLOSED</Tag>}
                </Space>
            )
        },
        { title: 'Date', dataIndex: 'date', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (d) => dayjs(d).format('DD MMM YYYY') },
        { title: 'Shared With', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, r) => r.transferredTo?.profile?.name || '-' },
        {
            title: 'Mark Close',
            onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (_, r) => (
                <Popconfirm
                    title="Close Activity"
                    description="Are you sure you want to close this activity permanently?"
                    onConfirm={() => handleClose('activity', r.id)}
                    disabled={r.isClosed}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button
                        type={r.isClosed ? "primary" : "default"}
                        icon={r.isClosed ? <CheckOutlined /> : null}
                        size="small"
                        disabled={r.isClosed}
                    >
                        {r.isClosed ? 'Closed' : 'Close'}
                    </Button>
                </Popconfirm>
            )
        },
        { title: 'Closed By', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, r) => r.isClosed ? (r.closedBy?.profile?.name || 'Admin') : '-' },
        {
            title: 'Action',
            key: 'action',
            fixed: 'right',
            render: (_, r) => (
                <Space size="small">
                    <Button type="link" size="small" onClick={() => fetchActivityHistory(r.id)}>View</Button>
                    {!r.isClosed && (
                        <Button type="link" size="small" onClick={() => openActivityEditModal(r)}>Edit</Button>
                    )}
                </Space>
            )
        }
    ];

    const meetingColumns = [
        { title: 'Creator', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, r) => r.creator?.profile?.name || 'Admin' },
        { title: 'Title', dataIndex: 'title', key: 'title', onCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
        { title: 'Staff', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, r) => r.attendees?.map(u => u.profile?.name || 'Unknown').join(', ') || '-' },
        { title: 'Schedule Time', dataIndex: 'scheduledAt', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (d) => dayjs(d).format('DD MMM YYYY hh:mm A') },
        {
            title: 'Status',
            onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (_, r) => (
                <Tag color={r.status === 'DONE' ? 'green' : r.status === 'IN_PROGRESS' ? 'blue' : 'orange'}>
                    {r.status || 'SCHEDULE'}
                </Tag>
            )
        },
        {
            title: 'Meeting Link',
            dataIndex: 'meetLink',
            onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (link, r) => {
                const isExpired = dayjs().isAfter(dayjs(r.scheduledAt).add(1, 'hour')); // Assume 1 hour window
                if (!link) return '-';
                return (
                    <div>
                        {isExpired ? (
                            <span style={{ color: '#888', cursor: 'not-allowed' }}>
                                {link}
                                <div style={{ fontSize: '10px', color: '#ff4d4f' }}>(expired)</div>
                            </span>
                        ) : (
                            <a href={link} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                                {link}
                            </a>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Mark Close',
            render: (_, r) => (
                <Popconfirm
                    title="Close Meeting"
                    description="Are you sure you want to close this meeting permanently?"
                    onConfirm={() => handleClose('meeting', r.id)}
                    disabled={r.isClosed}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button
                        type={r.isClosed ? "primary" : "default"}
                        icon={r.isClosed ? <CheckOutlined /> : null}
                        size="small"
                        disabled={r.isClosed}
                    >
                        {r.isClosed ? 'Closed' : 'Close'}
                    </Button>
                </Popconfirm>
            )
        },
        { title: 'Closed By', render: (_, r) => r.isClosed ? (r.closedBy?.profile?.name || 'Admin') : '-' },
        { title: 'Description', dataIndex: 'description', key: 'description' },
        {
            title: 'Action',
            key: 'action',
            fixed: 'right',
            render: (_, r) => (
                <Space size="small">
                    <Button type="link" size="small" onClick={() => fetchMeetingHistory(r.id)}>View</Button>
                    {!r.isClosed && (
                        <Button type="link" size="small" onClick={() => openMeetingEditModal(r)}>Edit</Button>
                    )}
                </Space>
            )
        }
    ];


    const ticketColumns = [
        { title: 'Ticket ID', dataIndex: 'ticketId', key: 'ticketId', render: (id) => <Tag color="cyan">{id}</Tag>, onCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
        { title: 'Title', dataIndex: 'title', key: 'title', onCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
        { title: 'By', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, r) => r.creator?.profile?.name || 'Admin' },
        { title: 'To', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, r) => r.assignee?.profile?.name || 'Staff' },
        { 
            title: 'File', 
            render: (_, r) => r.attachment ? (
                <a href={`${API_BASE_URL}${r.attachment}`} target="_blank" rel="noreferrer">
                    <Button type="link" size="small">View Attachment</Button>
                </a>
            ) : '-',
            onCell: () => ({ style: { whiteSpace: 'nowrap' } })
        },
        {
            title: 'Status',
            onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (_, r) => (
                <Space>
                    <Tag color={r.status === 'DONE' ? 'green' : r.status === 'IN_PROGRESS' ? 'blue' : 'orange'}>{r.status}</Tag>
                    {r.isClosed && <Tag color="magenta">CLOSED</Tag>}
                </Space>
            )
        },
        {
            title: 'Mark Close',
            onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            render: (_, r) => (
                <Popconfirm
                    title="Close Ticket"
                    description="Are you sure you want to close this ticket permanently?"
                    onConfirm={() => handleClose('ticket', r.id)}
                    disabled={r.isClosed}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button
                        type={r.isClosed ? "primary" : "default"}
                        icon={r.isClosed ? <CheckOutlined /> : null}
                        size="small"
                        disabled={r.isClosed}
                    >
                        {r.isClosed ? 'Closed' : 'Close'}
                    </Button>
                </Popconfirm>
            )
        },
        { title: 'Closed By', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, r) => r.isClosed ? (r.closedBy?.profile?.name || 'Admin') : '-' },
        { title: 'Created At', dataIndex: 'createdAt', onCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (d) => dayjs(d).format('DD MMM YYYY HH:mm') },
        {
            title: 'Action',
            key: 'action',
            fixed: 'right',
            render: (_, r) => (
                <Space size="small">
                    <Button type="link" size="small" onClick={() => fetchTicketHistory(r.id)}>View</Button>
                    {!r.isClosed && (
                        <Button type="link" size="small" onClick={() => openTicketEditModal(r)}>Edit</Button>
                    )}
                </Space>
            )
        }
    ];

    const observerColumns = [
        { title: 'Name', render: (_, r) => r.profile?.name || 'Unknown' },
        { title: 'Phone', dataIndex: 'phone', key: 'phone' },
        {
            title: 'Observer Status',
            render: (_, r) => (
                <Switch
                    checked={r.isTaskObserver}
                    onChange={() => handleToggleObserver(r.id)}
                />
            )
        },
        {
            title: 'Assignments',
            render: (_, r) => (
                <Button
                    size="small"
                    disabled={!r.isTaskObserver}
                    onClick={() => openAssignModal(r)}
                >
                    Assign Staff
                </Button>
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s', height: '100vh', overflow: 'hidden' }}>
                <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                            className: 'trigger',
                            onClick: () => setCollapsed(!collapsed),
                            style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' }
                        })}
                        <Title level={4} style={{ margin: 0 }}>Task Management</Title>
                    </div>
                    <Menu
                        theme="light"
                        mode="horizontal"
                        items={[
                            {
                                key: 'logout',
                                icon: <LogoutOutlined />,
                                label: 'Logout',
                                onClick: handleLogout
                            }
                        ]}
                        style={{ borderBottom: 'none', lineHeight: '64px' }}
                    />
                </Header>

                <Content style={{ margin: '24px', overflow: 'auto' }}>
                    <Card style={{ marginBottom: 24 }}>
                        <Space wrap size="large">
                            <div>
                                <span style={{ marginRight: 8 }}>Filter by Staff:</span>
                                <Select
                                    placeholder="Select Staff"
                                    allowClear
                                    style={{ width: 220 }}
                                    options={staffOptions}
                                    value={staffFilter}
                                    onChange={setStaffFilter}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </div>
                            <div>
                                <span style={{ marginRight: 8 }}>Date Range:</span>
                                <RangePicker
                                    value={dateRange}
                                    onChange={setDateRange}
                                />
                            </div>
                        </Space>
                    </Card>

                    <Tabs defaultActiveKey="activities" type="card">
                        <Tabs.TabPane tab="Activities" key="activities">
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="primary" onClick={() => setIsActivityModalVisible(true)}>Create Activity</Button>
                            </div>
                            <Table
                                loading={loading}
                                dataSource={filterData(activities, 'date', 'userId')}
                                columns={activityColumns}
                                rowKey="id"
                                scroll={{ x: 'max-content' }}
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Meetings" key="meetings">
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="primary" onClick={() => setIsMeetingModalVisible(true)}>Create Meeting</Button>
                            </div>
                            <Table
                                loading={loading}
                                dataSource={filterData(meetings, 'scheduledAt', 'createdBy')}
                                columns={meetingColumns}
                                rowKey="id"
                                scroll={{ x: 'max-content' }}
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Tickets" key="tickets">
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                    <Input 
                                        placeholder="Search by Ticket ID (e.g. TKT-001)" 
                                        value={ticketSearchId}
                                        onChange={e => setTicketSearchId(e.target.value)}
                                        onPressEnter={handleTicketSearch}
                                        style={{ width: 250 }}
                                    />
                                    <Button type="primary" onClick={handleTicketSearch} icon={<SearchOutlined />}>Search History</Button>
                                </Space>
                                <Button type="primary" onClick={() => setIsTicketModalVisible(true)}>Create Ticket</Button>
                            </div>
                            <Table
                                loading={loading}
                                dataSource={filterData(tickets, 'createdAt', 'allocatedTo')}
                                columns={ticketColumns}
                                rowKey="id"
                                scroll={{ x: 'max-content' }}
                            />
                        </Tabs.TabPane>
                        {(JSON.parse(sessionStorage.getItem('impersonate_user') || localStorage.getItem('user'))?.role === 'admin' || JSON.parse(localStorage.getItem('user'))?.role === 'superadmin') && (
                            <Tabs.TabPane tab="Observers" key="observers">
                                <Table
                                    loading={loading}
                                    dataSource={observers}
                                    columns={observerColumns}
                                    rowKey="id"
                                />
                            </Tabs.TabPane>
                        )}
                    </Tabs>

                    <Modal
                        title={`Assign Staff to ${selectedObserver?.name || selectedObserver?.profile?.name || 'Observer'}`}
                        visible={isAssignModalVisible}
                        onOk={handleSaveAssignments}
                        onCancel={() => setIsAssignModalVisible(false)}
                        width={600}
                        destroyOnClose
                    >
                        <div style={{ marginBottom: 16 }}>
                            <Typography.Text strong>Select Staff to Manage:</Typography.Text>
                        </div>
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder="Select staff members"
                            value={assignedStaffIds}
                            onChange={setAssignedStaffIds}
                            options={staffList.map(s => ({
                                label: `${s.name || s.profile?.name || `Staff ${s.id}`}${s.department || s.profile?.department ? ` (${s.department || s.profile.department})` : ''}`,
                                value: s.id
                            }))}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Modal>

                    <Modal
                        title={isTicketEditMode ? "Edit Ticket" : "Create New Ticket"}
                        visible={isTicketModalVisible}
                        onOk={handleCreateTicket}
                        onCancel={() => {
                            setIsTicketModalVisible(false);
                            setIsTicketEditMode(false);
                            setEditingTicketId(null);
                            setNewTicket({
                                title: '',
                                description: '',
                                priority: 'MEDIUM',
                                allocatedTo: null,
                                dueDate: null
                            });
                        }}
                        okText={isTicketEditMode ? "Save" : "Create"}
                        confirmLoading={loading}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Ticket ID (Mandatory & Unique):</div>
                                    <Input
                                        value={newTicket.ticketId}
                                        onChange={e => setNewTicket({ ...newTicket, ticketId: e.target.value })}
                                        placeholder="TKT-001"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Title:</div>
                                    <Input
                                        value={newTicket.title}
                                        onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                                        placeholder="Ticket title"
                                    />
                                </div>
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>Attachment:</div>
                                {!newTicket.attachment ? (
                                    <Input 
                                        type="file" 
                                        onChange={e => setNewTicket({ ...newTicket, attachment: e.target.files[0] })}
                                    />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                        {newTicket.attachment.type?.startsWith('image/') && (
                                            <img 
                                                src={URL.createObjectURL(newTicket.attachment)} 
                                                alt="preview" 
                                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                            />
                                        )}
                                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {newTicket.attachment.name}
                                        </div>
                                        <Button 
                                            type="text" 
                                            danger 
                                            icon={<span style={{ fontWeight: 'bold' }}>✕</span>} 
                                            onClick={() => setNewTicket({ ...newTicket, attachment: null })}
                                        />
                                    </div>
                                )}
                                {isTicketEditMode && !newTicket.attachment && <div style={{ fontSize: '12px', color: '#888', marginTop: 4 }}>Leave blank to keep existing file</div>}
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>Description:</div>
                                <Input.TextArea
                                    value={newTicket.description}
                                    onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                                    placeholder="Details about the task"
                                    rows={3}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Assign To:</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select staff"
                                        options={staffOptions}
                                        value={newTicket.allocatedTo}
                                        onChange={val => setNewTicket({ ...newTicket, allocatedTo: val })}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Priority:</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        value={newTicket.priority}
                                        onChange={val => setNewTicket({ ...newTicket, priority: val })}
                                        options={[
                                            { label: 'Low', value: 'LOW' },
                                            { label: 'Medium', value: 'MEDIUM' },
                                            { label: 'High', value: 'HIGH' },
                                        ]}
                                    />
                                </div>
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>Due Date:</div>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    value={newTicket.dueDate}
                                    onChange={val => setNewTicket({ ...newTicket, dueDate: val })}
                                />
                            </div>
                        </div>
                    </Modal>

                    <Modal
                        title={isActivityEditMode ? "Edit Activity" : "Create New Activity"}
                        visible={isActivityModalVisible}
                        onOk={handleCreateActivity}
                        onCancel={() => {
                            setIsActivityModalVisible(false);
                            setIsActivityEditMode(false);
                            setEditingActivityId(null);
                            setNewActivity({
                                userId: null,
                                title: '',
                                description: '',
                                date: null,
                                turnAroundTime: ''
                            });
                        }}
                        okText={isActivityEditMode ? "Save" : "Create"}
                        confirmLoading={loading}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ marginBottom: 8 }}>Title:</div>
                                <Input
                                    value={newActivity.title}
                                    onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
                                    placeholder="Activity title"
                                />
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>Description:</div>
                                <Input.TextArea
                                    value={newActivity.description}
                                    onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                                    placeholder="Details about the activity"
                                    rows={3}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Assign To Staff:</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select staff"
                                        options={staffOptions}
                                        value={newActivity.userId}
                                        onChange={val => setNewActivity({ ...newActivity, userId: val })}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Date:</div>
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        value={newActivity.date}
                                        onChange={val => setNewActivity({ ...newActivity, date: val })}
                                    />
                                </div>
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>Turn Around Time (Target Time):</div>
                                <TimePicker
                                    style={{ width: '100%' }}
                                    value={newActivity.turnAroundTime ? dayjs(newActivity.turnAroundTime, 'HH:mm') : null}
                                    onChange={val => setNewActivity({ ...newActivity, turnAroundTime: val })}
                                    format="HH:mm"
                                    placeholder="Select time"
                                />
                            </div>
                        </div>
                    </Modal>

                    <Modal
                        title={isMeetingEditMode ? "Edit Meeting" : "Create New Meeting"}
                        open={isMeetingModalVisible}
                        onOk={handleCreateMeeting}
                        onCancel={() => {
                            setIsMeetingModalVisible(false);
                            setIsMeetingEditMode(false);
                            setEditingMeetingId(null);
                            setNewMeeting({ title: '', description: '', scheduledAt: null, attendees: [], meetLink: '' });
                        }}
                        okText={isMeetingEditMode ? "Save" : "Create"}
                        confirmLoading={loading}
                        width={600}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ marginBottom: 8 }}>Title:</div>
                                <Input
                                    value={newMeeting.title}
                                    onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                    placeholder="Meeting title"
                                />
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>Description:</div>
                                <Input.TextArea
                                    value={newMeeting.description}
                                    onChange={e => setNewMeeting({ ...newMeeting, description: e.target.value })}
                                    placeholder="Details about the meeting"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>Google Meet Link *:</div>
                                <Input
                                    value={newMeeting.meetLink}
                                    onChange={e => setNewMeeting({ ...newMeeting, meetLink: e.target.value })}
                                    placeholder="meet.google.com/xxx-xxxx-xxx"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Scheduled Time:</div>
                                    <DatePicker
                                        showTime
                                        style={{ width: '100%' }}
                                        value={newMeeting.scheduledAt}
                                        onChange={val => setNewMeeting({ ...newMeeting, scheduledAt: val })}
                                        placeholder="Select date and time"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>Attendees:</div>
                                    <Select
                                        mode="multiple"
                                        style={{ width: '100%' }}
                                        placeholder="Select attendees"
                                        value={newMeeting.attendees}
                                        onChange={val => setNewMeeting({ ...newMeeting, attendees: val })}
                                        showSearch
                                        options={staffOptions}
                                    />
                                </div>
                            </div>
                        </div>
                    </Modal>
                </Content>
            </Layout>

            {/* History Modal */}
            <Modal
                title={`${historyType} History`}
                open={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={null}
                width={600}
            >
                {historyLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Loading history...</div>
                ) : historyData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>No history found for this {historyType.toLowerCase()}.</div>
                ) : (
                    <Timeline mode="left" style={{ marginTop: '20px' }}>
                        {historyData.map((item, index) => (
                            <Timeline.Item key={index} color={item.newStatus === 'DONE' ? 'green' : 'blue'}>
                                <div style={{ marginBottom: 4 }}>
                                    <strong>{item.updater?.profile?.name || 'Unknown User'}</strong>
                                    <span style={{ color: '#888', marginLeft: 8, fontSize: '12px' }}>
                                        {dayjs(item.createdAt).format('DD MMM YYYY HH:mm')}
                                    </span>
                                </div>
                                <div style={{ marginBottom: 4 }}>
                                    <Tag color={item.newStatus === 'DONE' ? 'green' : item.newStatus === 'IN_PROGRESS' || item.newStatus === 'SCHEDULE' ? 'blue' : 'orange'}>
                                        {item.newStatus}
                                    </Tag>
                                </div>
                                {item.remarks && (
                                    <div style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', fontStyle: 'italic', marginTop: 4 }}>
                                        {item.remarks}
                                    </div>
                                )}
                            </Timeline.Item>
                        ))}
                    </Timeline>
                )}
            </Modal>
        </Layout>
    );
}
