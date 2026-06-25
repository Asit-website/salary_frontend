import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, Typography, Space, Tag, Avatar, Row, Col, Spin, Divider, Tabs, Empty, Tooltip, message, Modal, Input, Badge } from 'antd';
import { ArrowLeftOutlined, GiftOutlined, CalendarOutlined, HeartOutlined, MessageOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api from '../api';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Wishes() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [birthdays, setBirthdays] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  
  // Custom wishes modal
  const [wishModalVisible, setWishModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [wishType, setWishType] = useState('birthday'); // birthday or anniversary
  const [wishText, setWishText] = useState('');

  const loadWishes = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/admin/wishes');
      if (resp.data?.success) {
        setBirthdays(resp.data.birthdays || []);
        setAnniversaries(resp.data.anniversaries || []);
      } else {
        message.error('Failed to load wishes data');
      }
    } catch (err) {
      console.error(err);
      message.error('Error fetching wishes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishes();
  }, []);

  const getYearsOfService = (dateOfJoining) => {
    if (!dateOfJoining) return 0;
    const joinDate = new Date(dateOfJoining);
    const today = new Date();
    let years = today.getFullYear() - joinDate.getFullYear();
    const m = today.getMonth() - joinDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < joinDate.getDate())) {
      years--;
    }
    return Math.max(0, years);
  };

  const getTurningAge = (dob) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age + 1); // Turning age next/this birthday
  };

  const openWishModal = (staff, type) => {
    setSelectedStaff(staff);
    setWishType(type);
    
    let defaultMsg = '';
    if (type === 'birthday') {
      defaultMsg = `🎉 Happy Birthday, ${staff.name}! Wishing you a wonderful day filled with joy, and a fantastic year ahead. Thank you for being such an important part of our team! 🎂✨`;
    } else {
      const years = getYearsOfService(staff.dateOfJoining);
      const yearText = years > 0 ? ` completed ${years} year${years > 1 ? 's' : ''} of service` : ' work anniversary';
      defaultMsg = `💼 Happy Work Anniversary, ${staff.name}! Congratulations on your${yearText} with us. Thank you for your dedication, hard work, and support! 🌟👏`;
    }
    
    setWishText(defaultMsg);
    setWishModalVisible(true);
  };

  const handleCopyWish = () => {
    navigator.clipboard.writeText(wishText);
    message.success('Personalized wish copied to clipboard!');
    setWishModalVisible(false);
  };

  const handleSendWhatsApp = () => {
    if (!selectedStaff) return;
    
    let rawPhone = selectedStaff.phone || '';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    
    if (!cleanPhone) {
      message.error('Phone number not available for this staff member!');
      return;
    }
    
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    
    const encodedText = encodeURIComponent(wishText);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
    setWishModalVisible(false);
    message.success('Opening WhatsApp...');
  };

  const renderCurrentMonthHighlights = (type) => {
    const currentMonthNum = new Date().getMonth() + 1; // 1-12
    const currentDayNum = new Date().getDate();
    
    const items = type === 'birthday' ? birthdays : anniversaries;
    const thisMonthItems = items.filter(item => item.month === currentMonthNum);
    const todayItems = thisMonthItems.filter(item => item.day === currentDayNum);

    if (thisMonthItems.length === 0) {
      return (
        <Card style={{ borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#f8fafc', marginBottom: 24 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${type}s this month`} />
        </Card>
      );
    }

    return (
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ color: '#0f172a', marginBottom: 12 }}>
          {MONTH_NAMES[currentMonthNum - 1]} Highlights
        </Title>
        <Row gutter={[16, 16]}>
          {thisMonthItems.map(item => {
            const isToday = item.day === currentDayNum;
            const years = type === 'anniversary' ? getYearsOfService(item.dateOfJoining) : 0;
            const turningAge = type === 'birthday' ? getTurningAge(item.dob) : 0;

            return (
              <Col xs={24} sm={12} md={8} key={item.id}>
                <Card 
                  hoverable
                  className="wish-highlight-card"
                  style={{
                    borderRadius: '16px',
                    border: isToday ? '2px solid #ff4d4f' : '1px solid #e2e8f0',
                    background: isToday ? 'linear-gradient(135deg, #fff1f0 0%, #fff 100%)' : '#fff',
                    boxShadow: isToday ? '0 4px 20px rgba(255, 77, 79, 0.15)' : '0 4px 6px -1px rgba(0,0,0,0.05)'
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Badge dot={isToday} offset={[-2, 38]} color="#ff4d4f" size="large">
                      <Avatar 
                        src={item.photoUrl} 
                        size={60} 
                        style={{ backgroundColor: '#1890ff', fontSize: '20px' }}
                      >
                        {item.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text strong style={{ fontSize: '15px', color: '#1e293b' }}>{item.name}</Text>
                        {isToday && <Tag color="error">TODAY 🎉</Tag>}
                      </div>
                      <Text type="secondary" block style={{ fontSize: '12px' }}>{item.designation || 'Staff member'}</Text>
                      <Text type="secondary" block style={{ fontSize: '12px' }}>{item.department || '-'}</Text>
                      
                      <div style={{ marginTop: 8 }}>
                        {type === 'birthday' ? (
                          <Tag color="blue" icon={<GiftOutlined />}>
                            {item.day} {MONTH_NAMES[item.month - 1].substring(0, 3)} (Turning {turningAge})
                          </Tag>
                        ) : (
                          <Tag color="purple" icon={<CalendarOutlined />}>
                            {item.day} {MONTH_NAMES[item.month - 1].substring(0, 3)} ({years === 0 ? 'Joined' : `${years} Year${years > 1 ? 's' : ''}`})
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      type={isToday ? "primary" : "default"} 
                      danger={isToday}
                      icon={<MessageOutlined />} 
                      onClick={() => openWishModal(item, type)}
                      size="small"
                      style={{ borderRadius: '6px' }}
                    >
                      Wish
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  const renderMonthGrid = (type) => {
    const items = type === 'birthday' ? birthdays : anniversaries;
    
    // Group by month
    const grouped = {};
    for (let m = 1; m <= 12; m++) {
      grouped[m] = [];
    }
    
    items.forEach(item => {
      grouped[item.month].push(item);
    });

    // Check if there is any data at all
    const hasData = items.length > 0;
    if (!hasData) {
      return (
        <Card style={{ borderRadius: '12px', border: '1px dashed #cbd5e1', padding: '50px 0', textAlign: 'center' }}>
          <Empty description={`No staff ${type} data available`} />
        </Card>
      );
    }

    return (
      <Row gutter={[20, 20]}>
        {MONTH_NAMES.map((monthName, idx) => {
          const monthNum = idx + 1;
          const monthItems = grouped[monthNum];
          
          if (monthItems.length === 0) return null;

          return (
            <Col xs={24} md={12} lg={8} key={monthName}>
              <Card 
                className="wish-month-card"
                title={
                  <Space>
                    <CalendarOutlined style={{ color: '#4f46e5' }} />
                    <span style={{ fontWeight: 600 }}>{monthName}</span>
                    <Tag color="default" style={{ borderRadius: '50%', margin: 0 }}>{monthItems.length}</Tag>
                  </Space>
                }
                bordered={true}
                style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}
                headStyle={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {monthItems.map(item => {
                    const years = type === 'anniversary' ? getYearsOfService(item.dateOfJoining) : 0;
                    
                    return (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                        <Space size={10}>
                          <Avatar src={item.photoUrl} size={36}>
                            {item.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <Text strong style={{ fontSize: '13px', display: 'block' }}>{item.name}</Text>
                            <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                              {item.designation || '-'}
                            </Text>
                          </div>
                        </Space>
                        <div style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: '12px', fontWeight: 500, color: '#475569', display: 'block' }}>
                            {item.day} {monthName.substring(0, 3)}
                          </Text>
                          {type === 'birthday' ? (
                            <Text type="secondary" style={{ fontSize: '10px' }}>
                              {item.dob.substring(0, 4)}
                            </Text>
                          ) : (
                            <Text type="secondary" style={{ fontSize: '10px' }}>
                              {years === 0 ? 'Joined' : `${years} Yr${years > 1 ? 's' : ''}`}
                            </Text>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  const tabItems = [
    {
      key: 'birthdays',
      label: (
        <Space>
          <GiftOutlined />
          <span>Birthdays (DOB)</span>
        </Space>
      ),
      children: (
        <div>
          {renderCurrentMonthHighlights('birthday')}
          <Divider style={{ margin: '20px 0' }} />
          <Title level={4} style={{ color: '#0f172a', marginBottom: 16 }}>Yearly Birthday Calendar</Title>
          {renderMonthGrid('birthday')}
        </div>
      )
    },
    {
      key: 'anniversaries',
      label: (
        <Space>
          <HeartOutlined />
          <span>Anniversaries (Joining Date)</span>
        </Space>
      ),
      children: (
        <div>
          {renderCurrentMonthHighlights('anniversary')}
          <Divider style={{ margin: '20px 0' }} />
          <Title level={4} style={{ color: '#0f172a', marginBottom: 16 }}>Yearly Work Anniversaries</Title>
          {renderMonthGrid('anniversary')}
        </div>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <style>{`
        .wish-highlight-card {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }
        .wish-highlight-card:hover {
          transform: translateY(-5px) !important;
          box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.08) !important;
        }
        .wish-month-card {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }
        .wish-month-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03) !important;
          border-color: #6366f1 !important;
        }
      `}</style>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s', minHeight: '100vh' }}>
        <MainHeader collapsed={collapsed} onCollapse={setCollapsed} />
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280, overflow: 'auto', borderRadius: '8px' }}>
          {/* Header Banner */}
          <div 
            style={{ 
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', 
              padding: '24px 32px', 
              borderRadius: '16px', 
              marginBottom: 24, 
              color: '#fff',
              boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2)'
            }}
          >
            <Row align="middle" justify="space-between">
              <Col>
                <Title level={2} style={{ color: '#fff', margin: 0 }}>Staff Celebrations & Milestones</Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0 0', fontSize: '14px' }}>
                  Celebrate birthdays and check-in milestones with your team. Keep track of date of births and company joining anniversaries.
                </Paragraph>
              </Col>
              <Col xs={0} sm={4} style={{ textAlign: 'right' }}>
                <GiftOutlined style={{ fontSize: '64px', color: 'rgba(255,255,255,0.2)' }} />
              </Col>
            </Row>
          </div>

          <Space align="center" style={{ marginBottom: 20 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} />
            <Title level={3} style={{ margin: 0 }}>Milestones & Wishes</Title>
          </Space>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" tip="Loading staff milestones..." />
            </div>
          ) : (
            <Tabs 
              defaultActiveKey="birthdays" 
              items={tabItems}
              size="large"
              type="card"
              className="wishes-tabs"
            />
          )}

          {/* Personalized Wish Modal */}
          <Modal
            title={
              <Space>
                <GiftOutlined style={{ color: '#ff4d4f' }} />
                <span>Send greeting to {selectedStaff?.name}</span>
              </Space>
            }
            open={wishModalVisible}
            onCancel={() => setWishModalVisible(false)}
            footer={[
              <Button key="cancel" onClick={() => setWishModalVisible(false)}>
                Cancel
              </Button>,
              <Button key="copy" type="default" icon={<CopyOutlined />} onClick={handleCopyWish}>
                Copy Greeting
              </Button>,
              <Button 
                key="whatsapp" 
                type="primary" 
                style={{ backgroundColor: '#25D366', borderColor: '#25D366' }} 
                icon={<MessageOutlined />} 
                onClick={handleSendWhatsApp}
              >
                Send via WhatsApp
              </Button>
            ]}
            destroyOnClose
          >
            <div style={{ padding: '10px 0' }}>
              <Paragraph>Copy this template to wish your employee via WhatsApp, Slack, or email:</Paragraph>
              <Input.TextArea 
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                rows={5}
                style={{ borderRadius: '8px', fontSize: '13px' }}
              />
            </div>
          </Modal>

        </Content>
      </Layout>
    </Layout>
  );
}
