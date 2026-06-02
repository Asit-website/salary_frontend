import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function InactivityHandler({ children }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();

  const idleTimer = useRef(null);
  const showWarningRef = useRef(false);
  showWarningRef.current = showWarning;

  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem('token');

  // Reset the main idle timer
  const resetTimer = () => {
    if (showWarningRef.current) return; // Do not reset if warning is already visible

    if (idleTimer.current) clearTimeout(idleTimer.current);

    idleTimer.current = setTimeout(() => {
      triggerWarning();
    }, INACTIVITY_LIMIT);
  };

  const triggerWarning = () => {
    if (!isLoggedIn) return;
    setShowWarning(true);
  };

  const handleLogout = async () => {
    setShowWarning(false);

    try {
      // Direct logout API call
      await api.post('/auth/logout', {}).catch(() => {});
    } catch (_) {}

    // Clear client side credentials
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/');
    Modal.info({
      title: 'Logged Out',
      content: 'You have been logged out due to inactivity to protect your account.',
      okText: 'Login Again',
    });
  };

  const keepSessionAlive = () => {
    setShowWarning(false);
    resetTimer();

    // Ping the backend to slide activity timestamp
    api.get('/admin/settings/sessions').catch(() => {});
  };

  // Main Inactivity Detection Effect
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];

    if (isLoggedIn && location.pathname !== '/') {
      resetTimer();
      events.forEach((event) => {
        window.addEventListener(event, resetTimer);
      });
    }

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isLoggedIn, location.pathname]);

  // Warning Countdown Effect
  useEffect(() => {
    if (!showWarning) return;

    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning]);

  return (
    <>
      {children}
      <Modal
        title="Session Timeout Warning"
        open={showWarning}
        closable={false}
        maskClosable={false}
        footer={[
          <Button key="logout" type="text" danger onClick={handleLogout}>
            Logout Now
          </Button>,
          <Button key="keep" type="primary" onClick={keepSessionAlive}>
            Keep Me Logged In
          </Button>,
        ]}
      >
        <p>You have been inactive for a while.</p>
        <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#ff4d4f' }}>
          You will be logged out in {countdown} seconds due to security policy.
        </p>
      </Modal>
    </>
  );
}
