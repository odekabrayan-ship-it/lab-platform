import React from 'react';
import { useParams } from 'react-router-dom';

const SealVerification = () => {
    const { code } = useParams();

    return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
            <div className="text-center bg-[#0f172a] p-10 rounded-3xl border border-blue-500/30">
                <h1 className="text-3xl font-black text-blue-400 mb-4">Trust Seal Verification</h1>
                <p className="text-lg">Verifying Seal Code: <span className="font-mono text-emerald-400">{code}</span></p>
                <p className="text-sm text-gray-400 mt-6">Verification engine loading...</p>
            </div>
        </div>
    );
};

export default SealVerification;
