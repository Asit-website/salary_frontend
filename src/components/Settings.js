import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Row,
  Col,
  Card,
  Input,
  Typography,
  Space,
  Modal,
  message,
  Button,
  Select,
  AutoComplete,
  Menu,
  Radio
} from 'antd';
import {
  SettingOutlined,
  EnvironmentOutlined,
  ScheduleOutlined,
  ThunderboltOutlined,
  ProfileOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  EyeOutlined,
  BankOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  BorderOuterOutlined,
  NotificationOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  MobileOutlined,
  ApiOutlined,
  LogoutOutlined,
  LayoutOutlined,
  HomeOutlined
} from '@ant-design/icons';
import Sidebar from './Sidebar';
import api, { API_BASE_URL } from '../api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Tile = ({ title, items }) => (
  <Card bordered style={{ height: '100%' }} title={title}>
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {items.map((it) => (
        <div
          key={it.key}
          onClick={it.onClick}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: it.onClick ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {it.icon ? <span style={{ color: '#1677ff', lineHeight: '20px' }}>{it.icon}</span> : null}
            <div>
              <div><Text strong>{it.label}</Text></div>
              {it.desc ? (
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{it.desc}</div>
              ) : null}
            </div>
          </div>
          {it.thumb ? (
            <img src={it.thumb} alt="thumb" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid #E5E7EB' }} />
          ) : (
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{it.cta || '>'}</Text>
          )}
        </div>
      ))}
    </Space>
  </Card>
);

export default function Settings() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankHolder, setBankHolder] = useState('');
  const [bankAcc, setBankAcc] = useState('');
  const [bankAcc2, setBankAcc2] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankMasked, setBankMasked] = useState('');
  const [kybOpen, setKybOpen] = useState(false);
  const [kybSaving, setKybSaving] = useState(false);
  const [kyb, setKyb] = useState({
    businessType: '',
    gstin: '',
    businessName: '',
    businessAddress: '',
    cin: '',
    directorName: '',
    companyPan: '',
    bankAccountNumber: '',
    ifsc: '',
  });
  const [bizOpen, setBizOpen] = useState(false);
  const [bizSaving, setBizSaving] = useState(false);
  const [bizState, setBizState] = useState('');
  const [bizCity, setBizCity] = useState('');
  const [sidebarHeaderType, setSidebarHeaderType] = useState('name');
  const [sidebarHeaderOpen, setSidebarHeaderOpen] = useState(false);
  const [sidebarHeaderSaving, setSidebarHeaderSaving] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addr1, setAddr1] = useState('');
  const [addr2, setAddr2] = useState('');
  const [addrPin, setAddrPin] = useState('');
  const [logoOpen, setLogoOpen] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [accNameOpen, setAccNameOpen] = useState(false);
  const [accNameSaving, setAccNameSaving] = useState(false);
  const [accName, setAccName] = useState('');
  const [accPhoneOpen, setAccPhoneOpen] = useState(false);
  const [accPhoneSaving, setAccPhoneSaving] = useState(false);
  const [accPhone, setAccPhone] = useState('');
  const [accEmailOpen, setAccEmailOpen] = useState(false);
  const [accEmailSaving, setAccEmailSaving] = useState(false);
  const [accEmail, setAccEmail] = useState('');

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const resp = await api.get('/admin/settings/brand');
        const name = resp?.data?.brand?.displayName || '';
        setBrandName(String(name));
      } catch (_) { }
      try {
        const r2 = await api.get('/me/profile');
        setAccName(r2?.data?.profile?.name || '');
        setAccPhone(r2?.data?.profile?.phone || '');
        setAccEmail(r2?.data?.profile?.email || '');
      } catch (_) { }
      try {
        const r3 = await api.get('/admin/settings/business-info');
        const info = r3?.data?.info || {};
        setBizState(info.state || '');
        setBizCity(info.city || '');
        setAddr1(info.addressLine1 || '');
        setAddr2(info.addressLine2 || '');
        setAddrPin(info.pincode || '');
        setLogoUrl(info.logoUrl || '');
        setSidebarHeaderType(info.sidebarHeaderType || 'name');
      } catch (_) { }
    };
    loadData();
  }, []);

  const openBrandModal = async () => {
    try {
      const resp = await api.get('/admin/settings/brand');
      const name = resp?.data?.brand?.displayName || '';
      setBrandName(String(name));
      setBrandOpen(true);
    } catch (e) {
      message.error('Failed to load current business name');
      setBrandOpen(true);
    }
  };

  const openAccEmailModal = async () => {
    try {
      const resp = await api.get('/me/profile');
      const email = resp?.data?.profile?.email || '';
      setAccEmail(email);
    } catch (_) {
      setAccEmail('');
    } finally {
      setAccEmailOpen(true);
    }
  };

  const saveAccEmail = async () => {
    try {
      // Basic email format check
      const v = String(accEmail || '').trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!ok) { message.warning('Please enter a valid email address'); return; }
      setAccEmailSaving(true);
      const resp = await api.put('/me/profile', { email: v });
      if (resp?.data?.success) {
        message.success('Email updated');
        setAccEmailOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setAccEmailSaving(false);
    }
  };

  const openAccPhoneModal = async () => {
    try {
      const resp = await api.get('/me/profile');
      const phone = resp?.data?.profile?.phone || '';
      setAccPhone(phone);
    } catch (_) {
      setAccPhone('');
    } finally {
      setAccPhoneOpen(true);
    }
  };

  const saveAccPhone = async () => {
    try {
      // Client-side India validation: 10 digits
      const digits = String(accPhone || '').replace(/\D/g, '');
      if (digits.length !== 10) {
        message.warning('Please enter a valid 10-digit phone number');
        return;
      }
      setAccPhoneSaving(true);
      const resp = await api.put('/me/phone', { phone: digits });
      if (resp?.data?.success) {
        message.success('Phone number updated');
        setAccPhoneOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setAccPhoneSaving(false);
    }
  };

  const openAccNameModal = async () => {
    try {
      const resp = await api.get('/me/profile');
      const name = resp?.data?.profile?.name || '';
      setAccName(name);
    } catch (_) {
      setAccName('');
    } finally {
      setAccNameOpen(true);
    }
  };

  const saveAccName = async () => {
    try {
      setAccNameSaving(true);
      const resp = await api.put('/me/profile', { name: accName });
      if (resp?.data?.success) {
        message.success('Name updated');
        setAccNameOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setAccNameSaving(false);
    }
  };

  const openLogoModal = async () => {
    try {
      const resp = await api.get('/admin/settings/business-info');
      const info = resp?.data?.info || {};
      setLogoUrl(info.logoUrl || '');
    } catch (_) {
      setLogoUrl('');
    } finally {
      setLogoOpen(true);
    }
  };

  const uploadLogo = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.png,.jpg,.jpeg,.webp';
      input.onchange = async () => {
        if (!input.files || !input.files[0]) return;
        const form = new FormData();
        form.append('file', input.files[0]);
        const resp = await api.post('/admin/settings/business-info/logo', form);
        if (resp?.data?.success) {
          setLogoUrl(resp.data.url);
          message.success('Logo uploaded');
        } else {
          message.error(resp?.data?.message || 'Upload failed');
        }
      };
      input.click();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Upload failed');
    }
  };

  const deleteLogo = async () => {
    try {
      setLogoSaving(true);
      const resp = await api.delete('/admin/settings/business-info/logo');
      if (resp?.data?.success) {
        setLogoUrl('');
        message.success('Logo removed');
      } else {
        message.error(resp?.data?.message || 'Failed to remove logo');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to remove logo');
    } finally {
      setLogoSaving(false);
    }
  };

  const openAddressModal = async () => {
    try {
      const resp = await api.get('/admin/settings/business-info');
      const info = resp?.data?.info || {};
      setAddr1(info.addressLine1 || '');
      setAddr2(info.addressLine2 || '');
      setBizCity(info.city || '');
      setBizState(info.state || '');
      setAddrPin(info.pincode || '');
    } catch (_) {
      setAddr1(''); setAddr2(''); setBizCity(''); setBizState(''); setAddrPin('');
    } finally {
      setAddrOpen(true);
    }
  };

  const saveAddress = async () => {
    try {
      setAddrSaving(true);
      const resp = await api.put('/admin/settings/business-info', {
        addressLine1: addr1,
        addressLine2: addr2,
        city: bizCity,
        state: bizState,
        pincode: addrPin,
      });
      if (resp?.data?.success) {
        message.success('Business address saved');
        setAddrOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setAddrSaving(false);
    }
  };

  const openBizModal = async () => {
    try {
      const resp = await api.get('/admin/settings/business-info');
      const info = resp?.data?.info || {};
      setBizState(info.state || '');
      setBizCity(info.city || '');
    } catch (_) {
      setBizState('');
      setBizCity('');
    } finally {
      setBizOpen(true);
    }
  };

  const saveBiz = async () => {
    try {
      setBizSaving(true);
      const resp = await api.put('/admin/settings/business-info', { state: bizState, city: bizCity });
      if (resp?.data?.success) {
        message.success('Business state & city saved');
        setBizOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setBizSaving(false);
    }
  };

  const saveSidebarHeaderType = async () => {
    try {
      setSidebarHeaderSaving(true);
      const resp = await api.put('/admin/settings/business-info', { sidebarHeaderType });
      if (resp?.data?.success) {
        message.success('Sidebar header preference updated');
        setSidebarHeaderOpen(false);
        try { window.dispatchEvent(new CustomEvent('sidebar-header-updated', { detail: { sidebarHeaderType } })); } catch (_) { }
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSidebarHeaderSaving(false);
    }
  };

  const openKybModal = async () => {
    try {
      const resp = await api.get('/admin/settings/kyb');
      const d = resp?.data?.kyb || {};
      setKyb({
        businessType: d.businessType || '',
        gstin: d.gstin || '',
        businessName: d.businessName || '',
        businessAddress: d.businessAddress || '',
        cin: d.cin || '',
        directorName: d.directorName || '',
        companyPan: d.companyPan || '',
        bankAccountNumber: d.bankAccountNumber || '',
        ifsc: d.ifsc || '',
      });
    } catch (_) {
      setKyb({ businessType: '', gstin: '', businessName: '', businessAddress: '', cin: '', directorName: '', companyPan: '', bankAccountNumber: '', ifsc: '' });
    } finally {
      setKybOpen(true);
    }
  };

  const saveKyb = async () => {
    try {
      setKybSaving(true);
      const payload = { ...kyb };
      const resp = await api.put('/admin/settings/kyb', payload);
      if (resp?.data?.success) {
        message.success('KYB details saved');
        setKybOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setKybSaving(false);
    }
  };

  const openBankModal = async () => {
    try {
      const resp = await api.get('/admin/settings/bank-account');
      const b = resp?.data?.bank || null;
      setBankHolder(b?.accountHolderName || '');
      setBankAcc(b?.accountNumber || '');
      setBankAcc2(b?.accountNumber || '');
      setBankIfsc(b?.ifsc || '');
      setBankMasked(b?.maskedAccount || '');
    } catch (_) {
      setBankHolder(''); setBankAcc(''); setBankAcc2(''); setBankIfsc(''); setBankMasked('');
    } finally {
      setBankOpen(true);
    }
  };

  const saveBank = async () => {
    try {
      if (!bankHolder.trim() || !bankAcc.trim() || !bankIfsc.trim()) {
        message.warning('Please fill all required fields');
        return;
      }
      if (bankAcc.trim() !== bankAcc2.trim()) {
        message.warning('Account number mismatch');
        return;
      }
      setBankSaving(true);
      const resp = await api.put('/admin/settings/bank-account', {
        accountHolderName: bankHolder.trim(),
        accountNumber: bankAcc.trim(),
        confirmAccountNumber: bankAcc2.trim(),
        ifsc: bankIfsc.trim(),
      });
      if (resp?.data?.success) {
        message.success('Business bank account saved');
        // refresh masked view
        try {
          const g = await api.get('/admin/settings/bank-account');
          setBankMasked(g?.data?.bank?.maskedAccount || '');
        } catch (_) { }
        setBankOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setBankSaving(false);
    }
  };

  const saveBrand = async () => {
    try {
      if (!brandName || !brandName.trim()) {
        message.warning('Please enter a business name');
        return;
      }
      setBrandSaving(true);
      const resp = await api.put('/admin/settings/brand', { displayName: brandName.trim() });
      if (resp?.data?.success) {
        message.success('Business name updated');
        try { window.dispatchEvent(new CustomEvent('brand-updated', { detail: { displayName: brandName.trim() } })); } catch (_) { }
        setBrandOpen(false);
        // Clear the input field
        setBrandName('');
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setBrandSaving(false);
    }
  };
  const tiles = useMemo(() => [
    {
      key: 'attendance',
      title: 'Attendance Settings',
      items: [
        { key: 'att-tpl', icon: <ProfileOutlined />, label: 'Attendance Templates', desc: 'Set standard baselines for attendance tracking', onClick: () => navigate('/settings/attendance-templates') },
        { key: 'att-geo', icon: <EnvironmentOutlined />, label: 'Attendance Geofence Settings', desc: 'Set up virtual boundaries for attendance tracking', onClick: () => navigate('/settings/geofence') },
        { key: 'shift', icon: <ScheduleOutlined />, label: 'Shift Settings', desc: 'Create and manage shifts for employees', onClick: () => navigate('/settings/shifts') },
        { key: 'rules', icon: <ThunderboltOutlined />, label: 'Automation Rules', desc: 'Track late entry, breaks, early out, and leave rules' },
      ],
    },
    {
      key: 'salary',
      title: 'Salary Settings',
      items: [
        // { key: 'sal-settings', icon: <SettingOutlined />, label: 'Salary Settings', desc: 'Manage salaries, leaves, and other HR-related policies.' },
        { key: 'sal-calendar', icon: <CalendarOutlined />, label: 'Salary Calculation logic', desc: 'Calendar Month', onClick: () => navigate('/settings/salary-calculation') },
        { key: 'sal-template', icon: <AppstoreOutlined />, label: 'Manage Salary Template', desc: 'Create and apply standard salary structures', onClick: () => navigate('/settings/salary-templates') },
        { key: 'sal-access', icon: <EyeOutlined />, label: 'Salary Details Access', desc: 'Control who can view salary information', onClick: () => navigate('/settings/salary-access') },
      ],
    },
    {
      key: 'company',
      title: 'Company Information',
      items: [
        { key: 'holiday', icon: <CalendarOutlined />, label: 'Holiday', desc: 'Configure company holidays and templates', onClick: () => navigate('/settings/holidays') },
        { key: 'leave-policy', icon: <FileTextOutlined />, label: 'Leave Policy', desc: 'Define leave categories and rules', onClick: () => navigate('/settings/leave-templates') },
        { key: 'departments', icon: <ApartmentOutlined />, label: 'Manage Business Functions', desc: 'Add or update departments and roles', onClick: () => navigate('/settings/business-functions') },
        { key: 'weekly', icon: <BorderOuterOutlined />, label: 'Weekly Holidays', desc: 'Configure weekly holidays', onClick: () => navigate('/settings/weekly-off') },
        { key: 'letter-mgmt', icon: <FileTextOutlined />, label: 'Letter Management', desc: 'Manage and issue organization letters', onClick: () => navigate('/settings/letters') },
      ],
    },
    {
      key: 'payments',
      title: 'Payment Settings',
      items: [
        { key: 'bank-statement-name', icon: <BankOutlined />, label: 'Business Name in Bank Statement', desc: 'Shown on payouts and statements', onClick: openBrandModal },
        { key: 'bank-account', icon: <BankOutlined />, label: 'Business Bank Account', desc: bankMasked ? `XXXX XXXX XXXX ${String(bankMasked).slice(-4)}` : 'Account used for settlements', onClick: openBankModal },
        { key: 'kyc', icon: <SafetyCertificateOutlined />, label: 'KYB', desc: 'Upload and verify business documents', onClick: openKybModal },
        // { key: 'payment-methods', icon: <AppstoreOutlined />, label: 'Payment Methods', desc: 'Instant payment through virtual account' },
      ],
    },
    {
      key: 'business-info',
      title: 'Business Info',
      items: [
        { key: 'biz-name', icon: <ProfileOutlined />, label: 'Business Name', desc: brandName ? brandName : '—', onClick: openBrandModal },
        { key: 'biz-state', icon: <EnvironmentOutlined />, label: 'Business State & City', desc: [bizState, bizCity].filter(Boolean).join(', ') || '—', onClick: openBizModal },
        { key: 'sidebar-header', icon: <LayoutOutlined />, label: 'Sidebar Header Display', desc: sidebarHeaderType === 'logo' ? 'Business Logo' : 'Business Name', onClick: () => setSidebarHeaderOpen(true) },
        { key: 'biz-address', icon: <HomeOutlined />, label: 'Business Address', desc: [addr1, addr2].filter(Boolean).join(', ') || '—', onClick: () => setAddrOpen(true) },
        { key: 'biz-logo', icon: <ProfileOutlined />, label: 'Business Logo', desc: logoUrl ? 'Logo added' : 'Logo not added', onClick: openLogoModal, thumb: logoUrl ? (logoUrl.startsWith('/') ? `${API_BASE_URL}${logoUrl}` : logoUrl) : undefined },
      ],
    },
    {
      key: 'account-settings',
      title: 'Account Settings',
      items: [
        { key: 'acc-name', icon: <ProfileOutlined />, label: 'Name', desc: accName || '—', onClick: openAccNameModal },
        { key: 'acc-phone', icon: <MobileOutlined />, label: 'Phone Number', desc: accPhone || '—', onClick: openAccPhoneModal },
        { key: 'acc-email', icon: <ProfileOutlined />, label: 'Email Address', desc: accEmail || '—', onClick: openAccEmailModal },
        // { key: 'acc-subscriptions', icon: <AppstoreOutlined />, label: 'Subscriptions', desc: '—' },
        // { key: 'acc-businesses', icon: <ProfileOutlined />, label: 'Add/Delete Business', desc: '1 Active Business' },
      ],
    },
    {
      key: 'documents',
      title: 'Documents',
      items: [
        { key: 'manage-docs', icon: <ProfileOutlined />, label: 'Manage Documents', desc: 'Upload and manage organizational documents', onClick: () => navigate('/settings/documents') },
      ],
    },
    {
      key: 'users',
      title: 'Users & Access',
      items: [
        { key: 'broadcast', icon: <NotificationOutlined />, label: 'Broadcast Messages', desc: 'Company-wide communication for employees' },
        { key: 'manage-users', icon: <TeamOutlined />, label: 'Manage Users', desc: 'Configure user profiles and access' },
        { key: 'roles', icon: <SafetyCertificateOutlined />, label: 'Roles & Permissions', desc: 'Create roles and assign permissions', onClick: () => navigate('/roles-permissions') },
      ],
    },
    {
      key: 'devices',
      title: 'Device Management',
      items: [
        { key: 'device-mgmt', icon: <MobileOutlined />, label: 'Device Management', desc: 'Monitor and control devices used by employees' },
      ],
    },
    {
      key: 'integrations',
      title: 'Integrations',
      items: [
        { key: 'manage-integrations', icon: <ApiOutlined />, label: 'Manage Integrations', desc: 'Connect to third-party applications and services' },
      ],
    },
  ], [brandName, bizState, bizCity, addr1, logoUrl, accName, accPhone, bankMasked]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const displayTiles = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return tiles;
    return tiles
      .map((t) => ({
        ...t,
        items: t.items.filter((it) =>
          [it.label, it.desc]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(q))
        ),
      }))
      .filter((t) => t.items.length > 0);
  }, [tiles, search]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 200, background: '#f5f7fb' }}>
        <Header style={{ background: '#fff', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Settings</Title>
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
            style={{ borderRight: 'none', backgroundColor: 'transparent' }}
          />
        </Header>
        <Content style={{ padding: 24 }}>
          <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="Search"
              allowClear
              style={{ maxWidth: 360 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={(v) => setSearch(v)}
            />
          </Card>
          <Row gutter={[16, 16]}>
            {displayTiles.map((t) => (
              <Col key={t.key} xs={24} sm={12} lg={8}>
                <Tile title={t.title} items={t.items} />
              </Col>
            ))}
          </Row>
        </Content>
      </Layout>

      <Modal
        title="Business Name in Bank Statement"
        open={brandOpen}
        onCancel={() => setBrandOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#6b7280' }}>This name appears on payments and statements.</div>
          <Input
            placeholder="Enter business display name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            autoComplete="off"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBrandOpen(false)}>Cancel</Button>
            <Button type="primary" loading={brandSaving} onClick={saveBrand}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Email Address"
        open={accEmailOpen}
        onCancel={() => setAccEmailOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Email</div>
          <Input placeholder="Enter email" value={accEmail} onChange={(e) => setAccEmail(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setAccEmailOpen(false)}>Cancel</Button>
            <Button type="primary" loading={accEmailSaving} onClick={saveAccEmail}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Phone Number"
        open={accPhoneOpen}
        onCancel={() => setAccPhoneOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Phone Number</div>
          <Input
            placeholder="Enter 10-digit phone"
            value={accPhone}
            onChange={(e) => {
              // enforce digits only on input
              const v = e.target.value.replace(/\D/g, '').slice(0, 10);
              setAccPhone(v);
            }}
            autoComplete="off"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setAccPhoneOpen(false)}>Cancel</Button>
            <Button type="primary" loading={accPhoneSaving} onClick={saveAccPhone}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Name"
        open={accNameOpen}
        onCancel={() => setAccNameOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Name</div>
          <Input placeholder="Enter full name" value={accName} onChange={(e) => setAccName(e.target.value)} autoComplete="off" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setAccNameOpen(false)}>Cancel</Button>
            <Button type="primary" loading={accNameSaving} onClick={saveAccName}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Business Logo"
        open={logoOpen}
        onCancel={() => setLogoOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 120, height: 120, border: '1px solid #E5E7EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#FAFAFA' }}>
              {logoUrl ? (
                <img src={logoUrl.startsWith('/') ? `${API_BASE_URL}${logoUrl}` : logoUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
              ) : (
                <span style={{ color: '#9CA3AF', fontSize: 12 }}>No logo</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button onClick={uploadLogo}>Upload Logo</Button>
              {logoUrl ? <Button danger loading={logoSaving} onClick={deleteLogo}>Remove Logo</Button> : null}
              <div style={{ fontSize: 12, color: '#6b7280' }}>Max size: 2 MB • Formats: png, jpg, jpeg, webp</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setLogoOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={async () => {
              // refresh tile desc by reloading info
              try {
                const resp = await api.get('/admin/settings/business-info');
                const info = resp?.data?.info || {};
                setLogoUrl(info.logoUrl || '');
              } catch (_) { }
              setLogoOpen(false);
            }}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Sidebar Header Display"
        open={sidebarHeaderOpen}
        onOk={saveSidebarHeaderType}
        onCancel={() => setSidebarHeaderOpen(false)}
        confirmLoading={sidebarHeaderSaving}
      >
        <div style={{ marginBottom: 16 }}>
          <p>Choose what to display at the top of the sidebar:</p>
          <Radio.Group onChange={(e) => setSidebarHeaderType(e.target.value)} value={sidebarHeaderType}>
            <Radio value="name">Business Name (Default)</Radio>
            <Radio value="logo">Business Logo</Radio>
          </Radio.Group>
        </div>
        {sidebarHeaderType === 'logo' && !logoUrl && (
          <p style={{ color: '#faad14' }}>Note: You haven't added a business logo yet. It will show letters if logo is missing.</p>
        )}
      </Modal>

      <Modal
        title="Business Address"
        open={addrOpen}
        onCancel={() => setAddrOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>Address Line 1</div>
          <Input placeholder="Address Line 1" value={addr1} onChange={(e) => setAddr1(e.target.value)} />
          <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>Address Line 2</div>
          <Input placeholder="Address Line 2" value={addr2} onChange={(e) => setAddr2(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>City</div>
              <Input placeholder="City" value={bizCity} onChange={(e) => setBizCity(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>State</div>
              <AutoComplete
                placeholder="Search and select state"
                value={bizState || undefined}
                onChange={(v) => setBizState(v)}
                onSelect={(v) => setBizState(v)}
                options={[
                  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
                ].map((s) => ({ value: s, label: s }))}
                filterOption={(inputValue, option) =>
                  option.label.toLowerCase().includes(inputValue.toLowerCase())
                }
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>Pincode</div>
              <Input placeholder="Pincode" value={addrPin} onChange={(e) => setAddrPin(e.target.value)} />
            </div>
            <div style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setAddrOpen(false)}>Cancel</Button>
            <Button type="primary" loading={addrSaving} onClick={saveAddress}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Business State & City"
        open={bizOpen}
        onCancel={() => setBizOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>State</div>
              <AutoComplete
                placeholder="Search and select state"
                value={bizState || undefined}
                onChange={(v) => setBizState(v)}
                onSelect={(v) => setBizState(v)}
                options={[
                  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
                ].map((s) => ({ value: s, label: s }))}
                filterOption={(inputValue, option) =>
                  option.label.toLowerCase().includes(inputValue.toLowerCase())
                }
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>City</div>
              <Input placeholder="City" value={bizCity} onChange={(e) => setBizCity(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBizOpen(false)}>Cancel</Button>
            <Button type="primary" loading={bizSaving} onClick={saveBiz}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="Business Bank Account"
        open={bankOpen}
        onCancel={() => setBankOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {bankMasked ? (
            <Card size="small" bodyStyle={{ padding: 12 }} style={{ background: '#F9FAFB' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Saved Account Details</div>
              <div style={{ fontWeight: 600 }}>{bankHolder || '—'}</div>
              <div style={{ color: '#6b7280' }}>{bankMasked}</div>
            </Card>
          ) : null}
          <Input placeholder="Account Holder Name" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} />
          <Input placeholder="Account Number" value={bankAcc} onChange={(e) => setBankAcc(e.target.value)} />
          <Input placeholder="Confirm Account Number" value={bankAcc2} onChange={(e) => setBankAcc2(e.target.value)} />
          <Input placeholder="IFSC Code" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBankOpen(false)}>Cancel</Button>
            <Button type="primary" loading={bankSaving} onClick={saveBank}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="KYC"
        open={kybOpen}
        onCancel={() => setKybOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#6b7280' }}>Complete KYC to avail online payment services</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>Business Type</div>
              <Select
                value={kyb.businessType || undefined}
                onChange={(v) => setKyb({ ...kyb, businessType: v })}
                style={{ width: '100%' }}
                placeholder="Choose business type"
                options={[
                  { value: 'Proprietorship', label: 'Proprietorship' },
                  { value: 'Partnership', label: 'Partnership' },
                  { value: 'Private Limited', label: 'Private Limited' },
                  { value: 'Public Limited', label: 'Public Limited' },
                  { value: 'LLP', label: 'LLP' },
                  { value: 'Trust', label: 'Trust' },
                  { value: 'Society', label: 'Society' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, color: '#6b7280', fontSize: 12 }}>GSTIN Number</div>
              <Input placeholder="GSTIN" value={kyb.gstin} onChange={(e) => setKyb({ ...kyb, gstin: e.target.value.toUpperCase() })} autoComplete="off" />
            </div>
          </div>
          <Input placeholder="Business Name" value={kyb.businessName} onChange={(e) => setKyb({ ...kyb, businessName: e.target.value })} autoComplete="off" />
          <Input.TextArea placeholder="Business Address" value={kyb.businessAddress} onChange={(e) => setKyb({ ...kyb, businessAddress: e.target.value })} rows={3} autoComplete="off" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Input style={{ flex: 1 }} placeholder="CIN Number" value={kyb.cin} onChange={(e) => setKyb({ ...kyb, cin: e.target.value.toUpperCase() })} autoComplete="off" />
            <Input style={{ flex: 1 }} placeholder="Director's Name" value={kyb.directorName} onChange={(e) => setKyb({ ...kyb, directorName: e.target.value })} autoComplete="off" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input style={{ flex: 1 }} placeholder="Company PAN Number" value={kyb.companyPan} onChange={(e) => setKyb({ ...kyb, companyPan: e.target.value.toUpperCase() })} autoComplete="off" />
            <Input style={{ flex: 1 }} placeholder="Bank Account Number" value={kyb.bankAccountNumber} onChange={(e) => setKyb({ ...kyb, bankAccountNumber: e.target.value })} autoComplete="off" />
          </div>
          <Input placeholder="IFSC Code" value={kyb.ifsc} onChange={(e) => setKyb({ ...kyb, ifsc: e.target.value.toUpperCase() })} autoComplete="off" />

          <div style={{ marginTop: 8, fontWeight: 600 }}>Business Documents</div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>Upload pdf, png, or jpeg. Max size 10 MB.</div>

          {[
            { key: 'certificate_incorp', label: 'Certificate of Incorporation' },
            { key: 'company_pan', label: "Company PAN" },
            { key: 'director_pan', label: "Director's PAN" },
            { key: 'cancelled_cheque', label: 'Cancelled Cheque' },
            { key: 'director_id', label: "Director's Aadhaar/ID" },
            { key: 'gstin_certificate', label: 'GSTIN Certificate' },
          ].map((d) => (
            <Card key={d.key} size="small" style={{ borderRadius: 10 }} bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{d.label}</div>
                {kyb?.docs?.[d.key] ? (
                  <a href={kyb.docs[d.key]} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                    View current file
                  </a>
                ) : (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>No file uploaded</div>
                )}
              </div>
              <Button onClick={async () => {
                try {
                  // create a file input on the fly
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.png,.jpg,.jpeg';
                  input.onchange = async () => {
                    if (!input.files || !input.files[0]) return;
                    const file = input.files[0];
                    const form = new FormData();
                    form.append('file', file);
                    const resp = await api.post(`/admin/settings/kyb/doc/${d.key}`, form);
                    if (resp?.data?.success) {
                      message.success('Uploaded');
                      const g = await api.get('/admin/settings/kyb');
                      const fresh = g?.data?.kyb || {};
                      setKyb(prev => ({ ...prev, docs: fresh.docs || {} }));
                    } else {
                      message.error(resp?.data?.message || 'Failed');
                    }
                  };
                  input.click();
                } catch (e) {
                  message.error(e?.response?.data?.message || 'Upload failed');
                }
              }}>Upload</Button>
            </Card>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setKybOpen(false)}>Cancel</Button>
            <Button type="primary" loading={kybSaving} onClick={saveKyb}>Save</Button>
          </div>
        </Space>
      </Modal>
    </Layout>
  );
}
