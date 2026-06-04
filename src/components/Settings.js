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
  Radio,
  Switch,
  Table
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
  HomeOutlined,
  LockOutlined,
  QrcodeOutlined,
  KeyOutlined,
  SearchOutlined,
  SwapOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import Sidebar from './Sidebar';
import MainHeader from './MainHeader';
import api, { API_BASE_URL } from '../api';

const { Content } = Layout;
const { Title, Text } = Typography;

const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};


const Tile = ({ title, items }) => (
  <Card 
    className="sales-content-card" 
    style={{ height: '100%' }} 
    title={<span style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{title}</span>}
    bodyStyle={{ padding: '20px' }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((it) => (
        <div
          key={it.key}
          onClick={it.onClick}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: it.onClick ? 'pointer' : 'default',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            transition: 'all 0.25s',
          }}
          className="settings-tile-item"
          onMouseEnter={(e) => {
            if (it.onClick) {
              e.currentTarget.style.borderColor = '#91d5ff';
              e.currentTarget.style.background = '#e6f7ff30';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 119, 255, 0.04)';
            }
          }}
          onMouseLeave={(e) => {
            if (it.onClick) {
              e.currentTarget.style.borderColor = '#f1f5f9';
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {it.icon ? (
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '10px', 
                backgroundColor: '#e6f7ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#1677ff',
                fontSize: '16px',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(22, 119, 255, 0.04)'
              }}>
                {it.icon}
              </div>
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div><Text strong style={{ fontSize: '13px', color: '#1e293b' }}>{it.label}</Text></div>
              {it.desc ? (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc}</div>
              ) : null}
            </div>
          </div>
          {it.thumb ? (
            <img src={it.thumb} alt="thumb" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }} />
          ) : (
            <div style={{ 
              fontSize: '14px', 
              color: '#94a3b8', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              marginLeft: '12px',
              flexShrink: 0
            }}>
              {it.cta || '→'}
            </div>
          )}
        </div>
      ))}
    </div>
  </Card>
);

export default function Settings() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const DEFAULT_BRAND_TEXT = 'Your Company Name';
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
    docs: {},
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
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsSettings, setSmsSettings] = useState({
    orderCreation: true,
    attendanceMarking: true,
    payslipGeneration: true,
    missingAttendance: true
  });
  const [kioskOpen, setKioskOpen] = useState(false);
  const [kioskSaving, setKioskSaving] = useState(false);
  const [kioskUsername, setKioskUsername] = useState('');
  const [kioskPassword, setKioskPassword] = useState('');
  const [kioskPasswordSet, setKioskPasswordSet] = useState(false);

  const [mobileRestricted, setMobileRestricted] = useState(false);
  const [mobileRestrictedOpen, setMobileRestrictedOpen] = useState(false);
  const [mobileRestrictedSaving, setMobileRestrictedSaving] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [staffSearchText, setStaffSearchText] = useState('');

  const [qrRestricted, setQrRestricted] = useState(false);
  const [qrRestrictedOpen, setQrRestrictedOpen] = useState(false);
  const [qrRestrictedSaving, setQrRestrictedSaving] = useState(false);
  const [qrStaffList, setQrStaffList] = useState([]);
  const [qrStaffLoading, setQrStaffLoading] = useState(false);
  const [qrSelectedStaffIds, setQrSelectedStaffIds] = useState([]);
  const [qrStaffSearchText, setQrStaffSearchText] = useState('');
  const normalizeBrand = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return DEFAULT_BRAND_TEXT;
    return raw;
  };

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const resp = await api.get('/admin/settings/brand');
        const name = resp?.data?.brand?.displayName || '';
        setBrandName(normalizeBrand(name));
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
      try {
        const r4 = await api.get('/admin/settings/org');
        if (r4.data?.config?.smsNotificationSettings) {
          setSmsSettings({
            orderCreation: r4.data.config.smsNotificationSettings.orderCreation !== false,
            attendanceMarking: r4.data.config.smsNotificationSettings.attendanceMarking !== false,
            payslipGeneration: r4.data.config.smsNotificationSettings.payslipGeneration !== false,
            missingAttendance: r4.data.config.smsNotificationSettings.missingAttendance !== false,
          });
        }
      } catch (_) { }
      try {
        const r5 = await api.get('/admin/settings/kiosk');
        setKioskUsername(r5.data?.username || '');
        setKioskPasswordSet(!!r5.data?.passwordSet);
      } catch (_) { }
    };
    loadData();
  }, []);

  const openBrandModal = async () => {
    try {
      const resp = await api.get('/admin/settings/brand');
      const name = resp?.data?.brand?.displayName || '';
      setBrandName(normalizeBrand(name));
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
        docs: d.docs || {},
      });
    } catch (_) {
      setKyb({ businessType: '', gstin: '', businessName: '', businessAddress: '', cin: '', directorName: '', companyPan: '', bankAccountNumber: '', ifsc: '', docs: {} });
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
        message.success('KYC details saved');
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
        // Do not clear the brand name, as it is used for the display in the tile
        setBrandName(normalizeBrand(brandName.trim()));
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setBrandSaving(false);
    }
  };

  const openSmsModal = async () => {
    try {
      const resp = await api.get('/admin/settings/org');
      if (resp.data?.config?.smsNotificationSettings) {
        setSmsSettings({
          orderCreation: resp.data.config.smsNotificationSettings.orderCreation !== false,
          attendanceMarking: resp.data.config.smsNotificationSettings.attendanceMarking !== false,
          payslipGeneration: resp.data.config.smsNotificationSettings.payslipGeneration !== false,
          missingAttendance: resp.data.config.smsNotificationSettings.missingAttendance !== false,
        });
      }
    } catch (_) { }
    setSmsOpen(true);
  };

  const saveSmsSettings = async () => {
    try {
      setSmsSaving(true);
      // We need to preserve other org_config settings like industryType and features
      const current = await api.get('/admin/settings/org');
      const config = current.data?.config || {};

      const payload = {
        ...config,
        smsNotificationSettings: smsSettings
      };

      const resp = await api.put('/admin/settings/org', payload);
      if (resp?.data?.success) {
        message.success('SMS notification settings updated');
        setSmsOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSmsSaving(false);
    }
  };

  const openKioskModal = async () => {
    try {
      const resp = await api.get('/admin/settings/kiosk');
      setKioskUsername(resp.data?.username || '');
      setKioskPasswordSet(!!resp.data?.passwordSet);
      setKioskPassword(''); // Don't show old password
    } catch (_) { }
    setKioskOpen(true);
  };

  const saveKiosk = async () => {
    try {
      if (!kioskUsername.trim()) {
        message.warning('Please enter a kiosk username');
        return;
      }
      setKioskSaving(true);
      const resp = await api.put('/admin/settings/kiosk', { 
        username: kioskUsername.trim(),
        password: kioskPassword.trim() || undefined
      });
      if (resp?.data?.success) {
        message.success('Kiosk credentials updated');
        setKioskOpen(false);
        setKioskPasswordSet(true);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setKioskSaving(false);
    }
  };

  const openMobileRestrictionModal = async () => {
    try {
      const resp = await api.get('/admin/settings/org');
      setMobileRestricted(!!resp.data?.config?.mobilePunchRestricted);
    } catch (_) { }
    
    setMobileRestrictedOpen(true);
    fetchStaffForRestriction();
  };

  const fetchStaffForRestriction = async () => {
    try {
      setStaffLoading(true);
      const resp = await api.get('/admin/staff');
      setStaffList(resp.data?.data || []);
    } catch (e) {
      message.error('Failed to load staff list');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleBulkMobilePunch = async (enabled) => {
    if (selectedStaffIds.length === 0) {
      message.warning('Please select at least one staff member');
      return;
    }
    try {
      setStaffLoading(true);
      const resp = await api.post('/admin/staff/bulk-mobile-punch', {
        userIds: selectedStaffIds,
        enabled
      });
      if (resp.data?.success) {
        message.success(resp.data.message || 'Staff status updated');
        setSelectedStaffIds([]);
        fetchStaffForRestriction();
      } else {
        message.error(resp.data?.message || 'Update failed');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setStaffLoading(false);
    }
  };

  const toggleIndividualMobilePunch = async (userId, enabled) => {
    try {
      const resp = await api.post('/admin/staff/bulk-mobile-punch', {
        userIds: [userId],
        enabled
      });
      if (resp.data?.success) {
        setStaffList(prev => prev.map(s => s.id === userId ? { ...s, mobilePunchEnabled: enabled } : s));
        message.success('Status updated');
      } else {
        message.error(resp.data?.message || 'Update failed');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Update failed');
    }
  };

  const saveMobileRestriction = async () => {
    try {
      setMobileRestrictedSaving(true);
      const current = await api.get('/admin/settings/org');
      const config = current.data?.config || {};
      const payload = { ...config, mobilePunchRestricted: mobileRestricted };
      const resp = await api.put('/admin/settings/org', payload);
      if (resp?.data?.success) {
        message.success('Mobile punch restriction updated');
        setMobileRestrictedOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setMobileRestrictedSaving(false);
    }
  };

  const openQrRestrictionModal = async () => {
    try {
      const resp = await api.get('/admin/settings/org');
      setQrRestricted(!!resp.data?.config?.qrPunchRestricted);
    } catch (_) { }
    
    setQrRestrictedOpen(true);
    fetchStaffForQrRestriction();
  };

  const fetchStaffForQrRestriction = async () => {
    try {
      setQrStaffLoading(true);
      const resp = await api.get('/admin/staff');
      setQrStaffList(resp.data?.data || []);
    } catch (e) {
      message.error('Failed to load staff list');
    } finally {
      setQrStaffLoading(false);
    }
  };

  const handleBulkQrPunch = async (enabled) => {
    if (qrSelectedStaffIds.length === 0) {
      message.warning('Please select at least one staff member');
      return;
    }
    try {
      setQrStaffLoading(true);
      const resp = await api.post('/admin/staff/bulk-qr-punch', {
        userIds: qrSelectedStaffIds,
        enabled
      });
      if (resp.data?.success) {
        message.success(resp.data.message || 'Staff status updated');
        setQrSelectedStaffIds([]);
        fetchStaffForQrRestriction();
      } else {
        message.error(resp.data?.message || 'Update failed');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setQrStaffLoading(false);
    }
  };

  const toggleIndividualQrPunch = async (userId, enabled) => {
    try {
      const resp = await api.post('/admin/staff/bulk-qr-punch', {
        userIds: [userId],
        enabled
      });
      if (resp.data?.success) {
        setQrStaffList(prev => prev.map(s => s.id === userId ? { ...s, qrPunchEnabled: enabled } : s));
        message.success('Status updated');
      } else {
        message.error(resp.data?.message || 'Update failed');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Update failed');
    }
  };

  const saveQrRestriction = async () => {
    try {
      setQrRestrictedSaving(true);
      const current = await api.get('/admin/settings/org');
      const config = current.data?.config || {};
      const payload = { ...config, qrPunchRestricted: qrRestricted };
      const resp = await api.put('/admin/settings/org', payload);
      if (resp?.data?.success) {
        message.success('QR punch restriction updated');
        setQrRestrictedOpen(false);
      } else {
        message.error(resp?.data?.message || 'Failed to save');
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setQrRestrictedSaving(false);
    }
  };

  const tiles = useMemo(() => [
    {
      key: 'attendance',
      title: 'Attendance Settings',
      items: [
        // { key: 'att-tpl', icon: <ProfileOutlined />, label: 'Attendance Templates', desc: 'Set standard baselines for attendance tracking', onClick: () => navigate('/settings/attendance-templates') },
        { key: 'att-geo', icon: <EnvironmentOutlined />, label: 'Attendance Geofence Settings', desc: 'Set up virtual boundaries for attendance tracking', onClick: () => navigate('/settings/geofence') },
        { key: 'shift', icon: <ScheduleOutlined />, label: 'Shift Settings', desc: 'Create and manage shifts for employees', onClick: () => navigate('/settings/shifts') },
        { key: 'rules', icon: <ThunderboltOutlined />, label: 'Automation Rules', desc: 'Track late entry, overtime, early exit, breaks and biometric sync', onClick: () => navigate('/settings/automation-rules') },
        { key: 'holiday-work-pay', icon: <ThunderboltOutlined />, label: 'Holiday Work Pay Rules', desc: 'Configure multipliers for working on holidays/off-days', onClick: () => navigate('/settings/holiday-work-pay') },
        { key: 'mobile-punch-restriction', icon: <LockOutlined />, label: 'Mobile Punch Restriction', desc: 'Restrict staff from punching via mobile app', onClick: openMobileRestrictionModal },
        // { key: 'qr-punch-restriction', icon: <LockOutlined />, label: 'QR Punch Restriction', desc: 'Restrict staff from punching via QR codes', onClick: openQrRestrictionModal },
        { key: 'qr-attendance-settings', icon: <QrcodeOutlined />, label: 'QR Attendance Settings', desc: 'Generate secure QR poster with geofence protection', onClick: () => navigate('/settings/qr-attendance') },
      ],
    },
    {
      key: 'salary',
      title: 'Salary Settings',
      items: [
        // { key: 'sal-settings', icon: <SettingOutlined />, label: 'Salary Settings', desc: 'Manage salaries, leaves, and other HR-related policies.' },
        { key: 'sal-calendar', icon: <CalendarOutlined />, label: 'Salary Calculation logic', desc: 'Calendar Month', onClick: () => navigate('/settings/salary-calculation') },
        { key: 'sal-template', icon: <AppstoreOutlined />, label: 'Manage Salary Template', desc: 'Create and apply standard salary structures', onClick: () => navigate('/settings/salary-templates') },
        { key: 'sal-bonus', icon: <ThunderboltOutlined />, label: 'Tenure Bonus Rules', desc: 'Manage service-length based dynamic bonuses', onClick: () => navigate('/settings/tenure-bonus-rules') },
        { key: 'sal-access', icon: <EyeOutlined />, label: 'Salary Details Access', desc: 'Control who can view salary information', onClick: () => navigate('/settings/salary-access') },
        { key: 'esi-as-ta', icon: <SwapOutlined />, label: 'ESI as Travel Allowance Mapping', desc: 'Reimburse ESI deductions as Travel Allowance', onClick: () => navigate('/settings/esi-as-ta') },
        { key: 'no-absent-pay', icon: <CheckCircleOutlined />, label: 'No Absent Pay Settings', desc: 'Configure perfect attendance pay for staff', onClick: () => navigate('/settings/no-absent-pay') },
        { key: 'wo-holiday-as-ot', icon: <ThunderboltOutlined />, label: 'Weekly Off & Holiday Work as OT', desc: 'Pay weekly off/holiday work hours as Overtime', onClick: () => navigate('/settings/wo-holiday-as-ot') },
      ],
    },
    {
      key: 'company',
      title: 'Company Information',
      items: [
        { key: 'holiday', icon: <CalendarOutlined />, label: 'Holiday', desc: 'Configure company holidays and templates', onClick: () => navigate('/settings/holidays') },
        { key: 'leave-policy', icon: <FileTextOutlined />, label: 'Leave Policy', desc: 'Define leave categories and rules', onClick: () => navigate('/settings/leave-templates') },
        { key: 'departments', icon: <ApartmentOutlined />, label: 'Manage Departments', desc: 'Add or update departments and roles', onClick: () => navigate('/settings/business-functions') },
        { key: 'weekly', icon: <BorderOuterOutlined />, label: 'Weekly Holidays', desc: 'Configure weekly holidays', onClick: () => navigate('/settings/weekly-off') },
        { key: 'letter-mgmt', icon: <FileTextOutlined />, label: 'Letter Management', desc: 'Manage and issue organization letters', onClick: () => navigate('/settings/letters') },
      ],
    },
    {
      key: 'payments',
      title: 'Payment Settings',
      items: [
        { key: 'bank-statement-name', icon: <BankOutlined />, label: 'Business Name in Bank Statement', desc: normalizeBrand(brandName), onClick: openBrandModal },
        { key: 'bank-account', icon: <BankOutlined />, label: 'Business Bank Account', desc: bankMasked ? `XXXX XXXX XXXX ${String(bankMasked).slice(-4)}` : 'Account used for settlements', onClick: openBankModal },
        { key: 'kyc', icon: <SafetyCertificateOutlined />, label: 'KYC', desc: 'Upload and verify business documents', onClick: openKybModal },
        // { key: 'payment-methods', icon: <AppstoreOutlined />, label: 'Payment Methods', desc: 'Instant payment through virtual account' },
      ],
    },
    {
      key: 'business-info',
      title: 'Business Info',
      items: [
        { key: 'biz-name', icon: <ProfileOutlined />, label: 'Business Name', desc: normalizeBrand(brandName), onClick: openBrandModal },
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
        { key: 'sms-settings', icon: <NotificationOutlined />, label: 'SMS Notifications', desc: 'Enable/Disable SMS alerts', onClick: openSmsModal },
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
        { key: 'manage-users', icon: <TeamOutlined />, label: 'Manage Users', desc: 'Assign badges and sidebar tab access', onClick: () => navigate('/settings/user-access') },
        { key: 'roles', icon: <SafetyCertificateOutlined />, label: 'Roles & Permissions', desc: 'Create roles and assign permissions', onClick: () => navigate('/roles-permissions') },
      ],
    },
    {
      key: 'sales-settings',
      title: 'Sales Settings',
      items: [
        { key: 'order-products', icon: <AppstoreOutlined />, label: 'Order Product Settings', desc: 'Create products and assign to staff for order form', onClick: () => navigate('/settings/order-products') },
        { key: 'sales-incentives', icon: <ThunderboltOutlined />, label: 'Sales Incentive Rules', desc: 'Define and assign sales incentive rules for staff', onClick: () => navigate('/settings/sales-incentives') },
      ],
    },
    {
      key: 'devices',
      title: 'Device Management',
      items: [
        { key: 'device-mgmt', icon: <MobileOutlined />, label: 'Device Management', desc: 'Monitor and control devices used by employees', onClick: () => navigate('/settings/device-management') },
        { key: 'session-mgmt', icon: <KeyOutlined />, label: 'Active Sessions & Devices', desc: 'Manage your active devices and revoke remote sessions', onClick: () => navigate('/settings/sessions') },
        { key: 'kiosk-settings', icon: <SettingOutlined />, label: 'Kiosk Settings', desc: kioskUsername ? `User: ${kioskUsername}` : 'Set kiosk username/password', onClick: openKioskModal },
      ],
    },
    {
      key: 'integrations',
      title: 'Integrations',
      items: [
        { key: 'manage-integrations', icon: <ApiOutlined />, label: 'Manage Integrations', desc: 'Connect to third-party applications and services' },
      ],
    },
  ], [brandName, bizState, bizCity, addr1, addr2, addrPin, logoUrl, accName, accPhone, accEmail, bankMasked, sidebarHeaderType]);

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
      <Sidebar collapsed={collapsed} />
      <Layout style={{ marginLeft: collapsed ? 80 : 200, height: '100vh', overflow: 'hidden', transition: 'margin-left 0.2s' }}>
        <MainHeader 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          title="Settings" 
        />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5', height: 'calc(100vh - 64px - 48px)', overflow: 'auto' }}>
          <Card className="sales-content-card" bodyStyle={{ padding: '16px' }} style={{ marginBottom: 24 }}>
            <Input 
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Search settings..."
              allowClear
              style={{ maxWidth: 360, borderRadius: '20px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        title="Kiosk Settings"
        open={kioskOpen}
        onCancel={() => setKioskOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Set organization-wide credentials for the Kiosk App.</div>
          
          <div style={{ marginTop: 8 }}>
            <Text strong>Kiosk Username</Text>
            <Input 
              placeholder="e.g. thinktech_kiosk_01" 
              value={kioskUsername} 
              onChange={(e) => setKioskUsername(e.target.value)} 
              style={{ marginTop: 4 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <Text strong>Kiosk Password</Text>
            <Input.Password 
              placeholder={kioskPasswordSet ? "Leave blank to keep current" : "Set password"} 
              value={kioskPassword} 
              onChange={(e) => setKioskPassword(e.target.value)} 
              style={{ marginTop: 4 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setKioskOpen(false)}>Cancel</Button>
            <Button type="primary" loading={kioskSaving} onClick={saveKiosk}>Save Credentials</Button>
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
                  <a
                    href={kyb.docs[d.key].startsWith('/') ? `${API_BASE_URL}${kyb.docs[d.key]}` : kyb.docs[d.key]}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12 }}
                  >
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

                    const isLt10M = file.size / 1024 / 1024 < 10;
                    if (!isLt10M) {
                      message.error('File must be smaller than 10MB!');
                      return;
                    }

                    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];
                    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                    if (!allowedExts.includes(ext)) {
                      message.error('Only PDF, PNG, JPG, or JPEG files are allowed!');
                      return;
                    }

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
              }}>{kyb?.docs?.[d.key] ? 'Replace' : 'Upload'}</Button>
            </Card>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setKybOpen(false)}>Cancel</Button>
            <Button type="primary" loading={kybSaving} onClick={saveKyb}>Save</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title="SMS Notification Settings"
        open={smsOpen}
        onCancel={() => setSmsOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>
            Choose which activities should trigger an SMS notification to the staff or client.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Order Creation</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Send SMS when a new sales order is created</div>
            </div>
            <Switch
              checked={smsSettings.orderCreation}
              onChange={(val) => setSmsSettings(s => ({ ...s, orderCreation: val }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Attendance Marking</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Send SMS when attendance is marked (present/absent)</div>
            </div>
            <Switch
              checked={smsSettings.attendanceMarking}
              onChange={(val) => setSmsSettings(s => ({ ...s, attendanceMarking: val }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Payslip Generation</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Send SMS when a payslip is generated for staff</div>
            </div>
            <Switch
              checked={smsSettings.payslipGeneration}
              onChange={(val) => setSmsSettings(s => ({ ...s, payslipGeneration: val }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Missing Attendance Reminder</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Send daily reminders for missing attendance</div>
            </div>
            <Switch
              checked={smsSettings.missingAttendance}
              onChange={(val) => setSmsSettings(s => ({ ...s, missingAttendance: val }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button onClick={() => setSmsOpen(false)}>Cancel</Button>
            <Button type="primary" loading={smsSaving} onClick={saveSmsSettings}>Save Settings</Button>
          </div>
        </Space>
      </Modal>
      <Modal
        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>Mobile Punch Restriction</span>}
        open={mobileRestrictedOpen}
        onCancel={() => setMobileRestrictedOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            Configure how staff can punch attendance. 
            <strong> Global Restriction</strong> prevents everyone from using the mobile app.
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '16px 20px', 
            background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)', 
            borderRadius: '12px', 
            border: '1px solid #bae0ff',
            boxShadow: '0 2px 8px rgba(22, 119, 255, 0.04)'
          }}>
            <div>
              <Text strong style={{ fontSize: '14px', color: '#1e293b' }}>Global Mobile Punch Restriction</Text>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>When enabled, no staff can punch from mobile.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Switch checked={mobileRestricted} onChange={setMobileRestricted} />
              <Button 
                type="primary" 
                size="small" 
                shape="round"
                loading={mobileRestrictedSaving} 
                onClick={saveMobileRestriction}
                style={{ boxShadow: '0 2px 4px rgba(22, 119, 255, 0.15)' }}
              >
                Save Global
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Individual Staff Exceptions</span>
              <Input
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Search staff..."
                style={{ width: 220, borderRadius: '20px' }}
                size="small"
                value={staffSearchText}
                onChange={e => setStaffSearchText(e.target.value)}
              />
            </div>

            {selectedStaffIds.length > 0 && (
              <div style={{ 
                marginBottom: 12, 
                padding: '10px 16px', 
                background: '#fffbeb', 
                border: '1px solid #fef3c7', 
                borderRadius: '10px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Text style={{ fontSize: '12px', fontWeight: '600', color: '#d97706' }}>{selectedStaffIds.length} staff selected</Text>
                <Space size={8}>
                  <Button size="small" type="primary" shape="round" onClick={() => handleBulkMobilePunch(true)}>Enable Mobile</Button>
                  <Button size="small" danger shape="round" onClick={() => handleBulkMobilePunch(false)}>Disable Mobile</Button>
                </Space>
              </div>
            )}

            <Table
              size="small"
              dataSource={staffList.filter(s => 
                !staffSearchText || 
                s.name?.toLowerCase().includes(staffSearchText.toLowerCase()) || 
                s.phone?.includes(staffSearchText)
              )}
              loading={staffLoading}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              bordered={false}
              rowSelection={{
                selectedRowKeys: selectedStaffIds,
                onChange: (keys) => setSelectedStaffIds(keys),
              }}
              columns={[
                { 
                  title: 'Name', 
                  dataIndex: 'name', 
                  key: 'name', 
                  render: (text, record) => {
                    const initials = getInitials(text);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(3, 105, 161, 0.08)'
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{text}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{record.phone || '—'}</div>
                        </div>
                      </div>
                    );
                  }
                },
                { 
                  title: 'Mobile Punch', 
                  dataIndex: 'mobilePunchEnabled', 
                  key: 'status', 
                  align: 'center', 
                  width: 120,
                  render: (enabled, record) => (
                    <Switch 
                      size="small" 
                      checked={!!enabled} 
                      onChange={(val) => toggleIndividualMobilePunch(record.id, val)} 
                    />
                  )
                },
              ]}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <Button shape="round" onClick={() => setMobileRestrictedOpen(false)}>Close</Button>
          </div>
        </Space>
      </Modal>

      <Modal
        title={<span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>QR Punch Restriction</span>}
        open={qrRestrictedOpen}
        onCancel={() => setQrRestrictedOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            Configure how staff can punch QR attendance. 
            <strong> Global Restriction</strong> prevents everyone from using QR codes.
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '16px 20px', 
            background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)', 
            borderRadius: '12px', 
            border: '1px solid #bae0ff',
            boxShadow: '0 2px 8px rgba(22, 119, 255, 0.04)'
          }}>
            <div>
              <Text strong style={{ fontSize: '14px', color: '#1e293b' }}>Global QR Punch Restriction</Text>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>When enabled, no staff can punch via QR code.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Switch checked={qrRestricted} onChange={setQrRestricted} />
              <Button 
                type="primary" 
                size="small" 
                shape="round"
                loading={qrRestrictedSaving} 
                onClick={saveQrRestriction}
                style={{ boxShadow: '0 2px 4px rgba(22, 119, 255, 0.15)' }}
              >
                Save Global
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Individual Staff Exceptions</span>
              <Input
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Search staff..."
                style={{ width: 220, borderRadius: '20px' }}
                size="small"
                value={qrStaffSearchText}
                onChange={e => setQrStaffSearchText(e.target.value)}
              />
            </div>

            {qrSelectedStaffIds.length > 0 && (
              <div style={{ 
                marginBottom: 12, 
                padding: '10px 16px', 
                background: '#fffbeb', 
                border: '1px solid #fef3c7', 
                borderRadius: '10px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Text style={{ fontSize: '12px', fontWeight: '600', color: '#d97706' }}>{qrSelectedStaffIds.length} staff selected</Text>
                <Space size={8}>
                  <Button size="small" type="primary" shape="round" onClick={() => handleBulkQrPunch(true)}>Enable QR</Button>
                  <Button size="small" danger shape="round" onClick={() => handleBulkQrPunch(false)}>Disable QR</Button>
                </Space>
              </div>
            )}

            <Table
              size="small"
              dataSource={qrStaffList.filter(s => 
                !qrStaffSearchText || 
                s.name?.toLowerCase().includes(qrStaffSearchText.toLowerCase()) || 
                s.phone?.includes(qrStaffSearchText)
              )}
              loading={qrStaffLoading}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              bordered={false}
              rowSelection={{
                selectedRowKeys: qrSelectedStaffIds,
                onChange: (keys) => setQrSelectedStaffIds(keys),
              }}
              columns={[
                { 
                  title: 'Name', 
                  dataIndex: 'name', 
                  key: 'name', 
                  render: (text, record) => {
                    const initials = getInitials(text);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(3, 105, 161, 0.08)'
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{text}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{record.phone || '—'}</div>
                        </div>
                      </div>
                    );
                  }
                },
                { 
                  title: 'QR Punch', 
                  dataIndex: 'qrPunchEnabled', 
                  key: 'status', 
                  align: 'center', 
                  width: 120,
                  render: (enabled, record) => (
                    <Switch 
                      size="small" 
                      checked={!!enabled} 
                      onChange={(val) => toggleIndividualQrPunch(record.id, val)} 
                    />
                  )
                },
              ]}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <Button shape="round" onClick={() => setQrRestrictedOpen(false)}>Close</Button>
          </div>
        </Space>
      </Modal>
    </Layout>
  );
}
