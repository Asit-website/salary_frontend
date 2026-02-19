import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * ImpersonateRedirect
 * Reads token and user from URL params, stores in sessionStorage (tab-specific),
 * and redirects to /dashboard. This allows SuperAdmin to impersonate a client
 * without affecting their own session in other tabs.
 */
const ImpersonateRedirect = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const user = searchParams.get('user');

        if (token && user) {
            // Use sessionStorage so it's tab-specific and doesn't affect other tabs
            sessionStorage.setItem('impersonate_token', token);
            sessionStorage.setItem('impersonate_user', user);
            navigate('/dashboard', { replace: true });
        } else {
            navigate('/', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <p>Redirecting to client dashboard...</p>
        </div>
    );
};

export default ImpersonateRedirect;
