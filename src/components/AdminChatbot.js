import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Input, Button, List, Avatar, Space, Spin, message, Divider, Tag } from 'antd';
import { 
  RobotOutlined, 
  SendOutlined, 
  UserOutlined, 
  ReloadOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import api from '../api';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const INITIAL_ASSISTANT_MESSAGE = `Hi Admin 👋
I’m your AI Workforce Intelligence Assistant.

I don’t just show data — I analyze it.`;

const renderInlineText = (text) => {
  const normalizedText = String(text || '');
  const segments = normalizedText.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={`segment-${index}`}>{segment.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={`segment-${index}`}>{segment}</React.Fragment>;
  });
};

const renderMessageContent = (content) => {
  const normalizedContent = String(content || '').replace(/\r\n/g, '\n').trim();

  if (!normalizedContent) {
    return null;
  }

  const lines = normalizedContent.split('\n').filter(line => line.trim() !== '');
  const isList = lines.length > 1 && lines.every(line => /^(?:[-*]\s+|\d+\.\s+)/.test(line.trim()));

  if (isList) {
    return (
      <div>
        {lines.map((line, index) => {
          const cleanedLine = line.trim().replace(/^(?:[-*]\s+|\d+\.\s+)/, '');
          return (
            <div key={`line-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: index === lines.length - 1 ? 0 : 6 }}>
              <span style={{ lineHeight: 1.6 }}>•</span>
              <span>{renderInlineText(cleanedLine)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {lines.map((line, index) => (
        <div key={`line-${index}`} style={{ marginBottom: index === lines.length - 1 ? 0 : 6 }}>
          {renderInlineText(line)}
        </div>
      ))}
    </div>
  );
};

const AdminChatbot = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: INITIAL_ASSISTANT_MESSAGE
    }
  ]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    if (currentInput.trim().toLowerCase() === 'hi') {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'How can I help you?' }]);
      }, 300);
      return;
    }

    setLoading(true);

    try {
      const history = messages.slice(-10); // Send last 10 messages as context
      const resp = await api.post('/admin/ai/chat', { 
        message: currentInput,
        history 
      });

      if (resp.data?.success) {
        setMessages(prev => [...prev, resp.data.response]);
      } else {
        message.error('AI is busy. Please try again later.');
      }
    } catch (error) {
      console.error('Chat error:', error);
      message.error(error.response?.data?.message || 'Failed to connect to AI assistant');
    } finally {
      setLoading(false);
    }
  };

  const suggestedQueries = [
    "How many staff are present today?",
    "Who is on leave today?",
    "List of holidays for this month",
    "Who is late today?",
    "What is the total staff count?"
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)', background: 'transparent', height: '100vh', overflow: 'hidden' }}>
        <Header style={{ 
          background: '#1f3f77', 
          padding: '12px 28px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          height: '84px',
          lineHeight: 'normal',
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          zIndex: 10
        }}>
          <Space size="large" align="center">
            <div style={{ 
              background: 'rgba(255,255,255,0.14)', 
              padding: '9px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)'
            }}>
              <RobotOutlined style={{ fontSize: '24px', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#fff', fontSize: '30px', fontWeight: 700, lineHeight: '1.15', paddingTop: 2 }}>AI Admin Assistant</Title>
              <Space size={8} style={{ marginTop: '4px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a', boxShadow: '0 0 8px rgba(82, 196, 26, 0.8)' }} />
                <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: '12px', fontWeight: 500 }}>Secure • Live • Professional</Text>
              </Space>
            </div>
          </Space>
          <Button 
            type="text" 
            icon={<ReloadOutlined style={{ color: '#fff' }} />} 
            onClick={() => setMessages([{ role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE }])}
            style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </Header>

        <Content style={{ padding: '20px', display: 'flex', flexDirection: 'column', maxWidth: '1280px', margin: '0 auto', width: '100%', height: 'calc(100vh - 84px)', minHeight: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
          {/* Main Chat Area */}
          <Card 
            bordered={false}
            style={{ 
              flex: 1, 
              height: '100%',
              minHeight: 0,
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 14, 
              overflow: 'hidden',
              boxShadow: '0 8px 26px rgba(16, 24, 40, 0.08)',
              background: '#fff'
            }}
            bodyStyle={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0, overflow: 'hidden' }}
          >
            {messages.length <= 1 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 0,
                opacity: 0.04,
                pointerEvents: 'none'
              }}>
                <style>
                  {`
                    @keyframes spin-slow {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}
                </style>
                <RobotOutlined style={{
                  fontSize: '30vw',
                  color: '#1f3f77',
                  animation: 'spin-slow 30s linear infinite'
                }} />
              </div>
            )}
            <div ref={messagesContainerRef} style={{ 
              position: 'relative',
              zIndex: 1,
              flex: 1, 
              height: '100%',
              minHeight: 0,
              overflowY: 'auto', 
              padding: '24px', 
              background: '#f6f8fb',
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}>
              <List
                itemLayout="horizontal"
                dataSource={messages}
                renderItem={(item) => (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 24,
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{ 
                      maxWidth: '75%', 
                      display: 'flex',
                      flexDirection: item.role === 'user' ? 'row-reverse' : 'row',
                      gap: 16,
                      alignItems: 'flex-start'
                    }}>
                      <div style={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: item.role === 'user' ? '#3b82f6' : '#475569',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        flexShrink: 0
                      }}>
                        {item.role === 'user' ? <UserOutlined style={{ color: '#fff' }} /> : <RobotOutlined style={{ color: '#fff' }} />}
                      </div>
                      <div style={{ 
                        padding: '14px 16px', 
                        borderRadius: item.role === 'user' ? '14px 6px 14px 14px' : '6px 14px 14px 14px',
                        background: item.role === 'user' ? '#2563eb' : '#ffffff',
                        color: item.role === 'user' ? '#fff' : '#2D3748',
                        boxShadow: item.role === 'user' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 2px 10px rgba(15, 23, 42, 0.05)',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        border: item.role === 'user' ? 'none' : '1px solid #e5e7eb'
                      }}>
                        {renderMessageContent(item.content)}
                      </div>
                    </div>
                  </div>
                )}
              />
              {loading && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, animation: 'pulse 1.5s infinite' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RobotOutlined style={{ color: '#fff' }} />
                  </div>
                  <div style={{ padding: '14px 16px', background: '#fff', borderRadius: '6px 14px 14px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
                    <Space size="small">
                      <div className="typing-dot" style={{ width: 6, height: 6, background: '#334155', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
                      <div className="typing-dot" style={{ width: 6, height: 6, background: '#334155', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
                      <div className="typing-dot" style={{ width: 6, height: 6, background: '#334155', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }} />
                    </Space>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Section */}
            <div style={{ 
              padding: '24px 32px', 
              background: '#fff', 
              borderTop: '1px solid #f0f4f8'
            }}>
              {/* Suggestions */}
              <div style={{ marginBottom: 16 }}>
                <Space wrap size={8}>
                  <Text type="secondary" style={{ fontSize: '12px', marginRight: 8 }}><ThunderboltOutlined style={{ color: '#f59e0b' }} /> Suggested queries:</Text>
                  {suggestedQueries.map((q, i) => (
                    <Button 
                      key={i} 
                      size="small" 
                      onClick={() => { setInput(q); }}
                      style={{ 
                        borderRadius: '14px', 
                        fontSize: '12px', 
                        height: '30px',
                        background: '#f8fafc',
                        border: '1px solid #dbe3ef',
                        color: '#334155',
                        transition: 'all 0.2s'
                      }}
                      className="suggestion-btn"
                    >
                      {q}
                    </Button>
                  ))}
                </Space>
              </div>

              {/* Input Area */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '8px', 
                borderRadius: '12px',
                border: '1px solid #dbe3ef',
                display: 'flex',
                alignItems: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <Input.TextArea 
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  placeholder="Ask me about attendance, salaries, or results..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                  style={{ 
                    border: 'none', 
                    background: 'transparent', 
                    boxShadow: 'none',
                    fontSize: '15px',
                    padding: '8px 12px',
                    resize: 'none'
                  }}
                />
                <Button 
                  type="primary" 
                  shape="circle"
                  icon={<SendOutlined />} 
                  onClick={handleSend}
                  loading={loading}
                  style={{ 
                    minWidth: '44px', 
                    height: '44px', 
                    marginLeft: '8px',
                    background: '#1d4ed8',
                    boxShadow: '0 4px 10px rgba(29, 78, 216, 0.3)',
                    border: 'none'
                  }}
                />
              </div>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: '11px', color: '#CBD5E0' }}>
                  AI responses are assistive. Please verify critical HR and payroll decisions.
                </Text>
              </div>
            </div>
          </Card>
        </Content>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); opacity: 0.5; }
            50% { transform: translateY(-4px); opacity: 1; }
          }
          .suggestion-btn:hover {
            border-color: #3b82f6 !important;
            color: #1d4ed8 !important;
            background: #fff !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
        `}</style>
      </Layout>
    </Layout>
  );
};

export default AdminChatbot;
