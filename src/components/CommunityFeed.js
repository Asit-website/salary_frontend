import React, { useState, useEffect } from 'react';
import { Layout, Card, Avatar, Input, Button, List, Typography, Space, Divider, message, Skeleton, Empty, Tag, Tooltip, Menu, Badge } from 'antd';
import { 
    LikeOutlined, LikeFilled, CommentOutlined, SendOutlined, UserOutlined, ClockCircleOutlined, 
    TrophyOutlined, GiftOutlined, ShareAltOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined,
    GlobalOutlined, FireOutlined, StarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from './Sidebar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CommunityFeed = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const [commentInputs, setCommentInputs] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const resp = await api.get('/admin/social/posts');
            if (resp.data.success) {
                setPosts(resp.data.posts);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            message.error('Failed to load community feed');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        setPosting(true);
        try {
            const resp = await api.post('/admin/social/posts', { content: newPostContent });
            if (resp.data.success) {
                setNewPostContent('');
                message.success('Post shared successfully!');
                fetchPosts();
            }
        } catch (error) {
            message.error('Failed to share post');
        } finally {
            setPosting(false);
        }
    };

    const handleToggleLike = async (postId) => {
        try {
            const resp = await api.post(`/admin/social/posts/${postId}/like`);
            if (resp.data.success) {
                fetchPosts();
            }
        } catch (error) {
            message.error('Failed to update like');
        }
    };

    const handleAddComment = async (postId, content, parentId = null) => {
        if (!content.trim()) return;
        try {
            const resp = await api.post(`/admin/social/posts/${postId}/comment`, { 
                content,
                parentId 
            });
            if (resp.data.success) {
                setReplyingTo(null);
                setCommentInputs(prev => ({ ...prev, [postId]: '' }));
                fetchPosts();
            }
        } catch (error) {
            message.error('Failed to add comment');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const renderPostIcon = (type) => {
        if (type === 'birthday') return <Tooltip title="Birthday"><GiftOutlined style={{ color: '#eb2f96', fontSize: '20px' }} /></Tooltip>;
        if (type === 'anniversary') return <Tooltip title="Anniversary"><TrophyOutlined style={{ color: '#faad14', fontSize: '20px' }} /></Tooltip>;
        return null;
    };

    const renderComment = (comment, post, isReply = false) => (
        <List.Item key={comment.id} style={{ border: 'none', padding: '8px 0', marginLeft: isReply ? '40px' : '0' }}>
            <Space align="start" style={{ width: '100%' }}>
                <Avatar size={isReply ? "small" : "default"} src={comment.user?.profile?.photoUrl} icon={<UserOutlined />} />
                <div style={{ width: '100%' }}>
                    <div style={{ background: isReply ? '#f8f9fa' : '#ffffff', padding: '10px 14px', borderRadius: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', border: '1px solid #f0f0f0', display: 'inline-block', minWidth: '180px' }}>
                        <Text strong style={{ fontSize: '13px', display: 'block', color: '#1890ff' }}>{comment.user?.profile?.name || 'User'}</Text>
                        <Text style={{ fontSize: '14px' }}>{comment.content}</Text>
                    </div>
                    <div style={{ marginTop: '4px', paddingLeft: '8px' }}>
                        <Space size="middle">
                            <Text type="secondary" style={{ fontSize: '10px' }}>{dayjs(comment.createdAt).fromNow()}</Text>
                            {!isReply && (
                                <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: '12px', fontWeight: '500' }} onClick={() => setReplyingTo({ postId: post.id, commentId: comment.id, userName: comment.user?.profile?.name || 'User' })}>Reply</Button>
                            )}
                        </Space>
                    </div>
                    {comment.replies && comment.replies.length > 0 && <div style={{ marginTop: '8px' }}>{comment.replies.map(r => renderComment(r, post, true))}</div>}
                </div>
            </Space>
        </List.Item>
    );

    return (
        <Layout style={{ minHeight: '100vh', background: '#f4f7f9' }}>
            <Sidebar collapsed={collapsed} />
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
                <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, { className: 'trigger', onClick: () => setCollapsed(!collapsed), style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' } })}
                        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Community Feed</Title>
                    </div>
                    <Menu theme="light" mode="horizontal" style={{ border: 'none' }} items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }]} />
                </Header>
                <Content style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ flex: '0 0 250px', position: 'sticky', top: '96px', height: 'fit-content' }}>
                            <Card bordered={false} style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} bodyStyle={{ padding: '24px', color: '#fff' }}>
                                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                                    <Avatar size={64} src={currentUser?.profile?.photoUrl} icon={<UserOutlined />} style={{ border: '3px solid rgba(255,255,255,0.3)' }} />
                                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                        <Title level={4} style={{ color: '#fff', margin: 0 }}>{currentUser?.profile?.name || 'User'}</Title>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Premium Member</Text>
                                    </div>
                                    <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0' }} />
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around' }}>
                                        <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold' }}>{posts.length}</div><div style={{ fontSize: '10px', opacity: 0.8 }}>FEED</div></div>
                                        <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold' }}>{posts.filter(p => p.userId === currentUser?.id).length}</div><div style={{ fontSize: '10px', opacity: 0.8 }}>POSTS</div></div>
                                    </div>
                                </Space>
                            </Card>
                        </div>
                        <div style={{ flex: '1', minWidth: 0 }}>
                            <Card bordered={false} style={{ marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Avatar src={currentUser?.profile?.photoUrl} icon={<UserOutlined />} />
                                        <TextArea rows={2} placeholder="What's on your mind?" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} style={{ borderRadius: '12px', border: 'none', background: '#f0f2f5' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Space size="large"><Tooltip title="Announce"><FireOutlined style={{ color: '#faad14' }} /></Tooltip><Tooltip title="Public"><GlobalOutlined style={{ color: '#1890ff' }} /></Tooltip></Space>
                                        <Button type="primary" icon={<SendOutlined />} loading={posting} onClick={handleCreatePost} disabled={!newPostContent.trim()} style={{ borderRadius: '20px', padding: '0 24px', height: '36px', fontWeight: '600' }}>Post Feed</Button>
                                    </div>
                                </Space>
                            </Card>
                            {loading ? <Skeleton active avatar paragraph={{ rows: 4 }} /> : posts.length === 0 ? <Empty description="The feed is quiet today." /> : (
                                <List dataSource={posts} renderItem={(post) => (
                                    <Card key={post.id} bordered={false} style={{ marginBottom: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <Space size="middle"><Avatar src={post.user?.profile?.photoUrl} icon={<UserOutlined />} /><div style={{ lineHeight: 1.2 }}><Text strong style={{ fontSize: '15px' }}>{post.user?.profile?.name || 'User'}</Text><br /><Text type="secondary" style={{ fontSize: '11px' }}>{dayjs(post.createdAt).fromNow()}</Text></div></Space>
                                            {renderPostIcon(post.type)}
                                        </div>
                                        <Paragraph style={{ fontSize: '15px', color: '#434343', lineHeight: 1.6 }}>{post.content}</Paragraph>
                                        {post.mediaUrl && <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #f0f0f0' }}><img src={post.mediaUrl} alt="media" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} /></div>}
                                        <div style={{ display: 'flex', gap: '24px', padding: '8px 16px', background: '#fafafa', borderRadius: '10px' }}>
                                            <Space style={{ cursor: 'pointer' }} onClick={() => handleToggleLike(post.id)}>{post.likes?.some(l => l.userId === currentUser?.id) ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />} <Text strong>{post.likes?.length || 0}</Text></Space>
                                            <Space><CommentOutlined /> <Text strong>{post.comments?.length || 0}</Text></Space>
                                            <Button type="text" icon={<ShareAltOutlined />} size="small" style={{ color: '#8c8c8c' }}>Share</Button>
                                        </div>
                                        {post.comments?.length > 0 && <><Divider style={{ margin: '16px 0' }} /><List size="small" dataSource={post.comments} renderItem={(c) => renderComment(c, post)} /></>}
                                        <div style={{ marginTop: '16px' }}>
                                            {replyingTo?.postId === post.id && <div style={{ marginBottom: '8px', paddingLeft: '40px', display: 'flex', justifyContent: 'space-between' }}><Text type="secondary" style={{ fontSize: '11px' }}>Replying to <b>{replyingTo.userName}</b></Text><Button type="link" size="small" onClick={() => setReplyingTo(null)} style={{ color: '#ff4d4f', padding: 0, height: 'auto' }}>Cancel</Button></div>}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <Avatar size="small" icon={<UserOutlined />} src={currentUser?.profile?.photoUrl} />
                                                <Input 
                                                    placeholder={replyingTo?.postId === post.id ? "Write a reply..." : "Add a comment..."} 
                                                    bordered={false} 
                                                    style={{ background: '#f5f5f5', borderRadius: '20px', paddingLeft: '12px', fontSize: '13px' }} 
                                                    value={commentInputs[post.id] || ''}
                                                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                    onPressEnter={() => handleAddComment(post.id, commentInputs[post.id] || '', replyingTo?.postId === post.id ? replyingTo.commentId : null)} 
                                                    suffix={
                                                        <SendOutlined 
                                                            style={{ 
                                                                color: (commentInputs[post.id]?.trim()) ? '#1890ff' : '#bfbfbf', 
                                                                cursor: (commentInputs[post.id]?.trim()) ? 'pointer' : 'default' 
                                                            }} 
                                                            onClick={() => (commentInputs[post.id]?.trim()) && handleAddComment(post.id, commentInputs[post.id], replyingTo?.postId === post.id ? replyingTo.commentId : null)}
                                                        />
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                )} />
                            )}
                        </div>
                        <div style={{ flex: '0 0 280px', position: 'sticky', top: '96px', height: 'fit-content' }}>
                            <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} title={<Space><StarOutlined style={{ color: '#faad14' }} /> Achievements</Space>}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StarOutlined style={{ color: '#faad14' }} /></div><Text style={{ fontSize: '13px' }}>Social Butterfly</Text> <Badge count="New" style={{ backgroundColor: '#52c41a' }} /></div>
                                <Divider style={{ margin: '16px 0' }} /><Text type="secondary" style={{ fontSize: '12px' }}>Stay active to unlock more badges and rewards!</Text>
                            </Card>
                        </div>
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default CommunityFeed;
