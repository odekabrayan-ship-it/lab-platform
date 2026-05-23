import React from 'react';
import { useNavigate } from 'react-router-dom';

const jwtDecode = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
};

const OversightSentinel = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    
    if (!token) return null;

    try {
        const decoded = jwtDecode(token);
        if (!decoded.impersonated_by) return null;

        const handleRevert = () => {
            const originalToken = localStorage.getItem('original_token');
            if (originalToken) {
                localStorage.setItem('token', originalToken);
                localStorage.removeItem('original_token');
                window.location.href = '/nexus';
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        };

        return (
            <div className="fixed top-0 left-0 w-full z-[9999] bg-red-600 text-white px-6 py-2 flex items-center justify-between shadow-2xl animate-pulse">
                <div className="flex items-center gap-4">
                    <span className="text-xl">🚨</span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Oversight Mode Active</span>
                        <span className="text-xs font-bold">Viewing Perspective: {decoded.email} ({decoded.role})</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex gap-4 text-[9px] font-bold uppercase tracking-widest opacity-60">
                        <span>Read/Write Audit Active</span>
                        <span>Sovereign Override Enforced</span>
                    </div>
                    <button 
                        onClick={handleRevert}
                        className="px-4 py-1.5 bg-white text-red-600 font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all shadow-lg"
                    >
                        Revert to Nexus
                    </button>
                </div>
            </div>
        );
    } catch (e) {
        return null;
    }
};

export default OversightSentinel;
