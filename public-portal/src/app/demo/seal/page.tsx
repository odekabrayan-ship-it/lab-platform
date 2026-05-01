'use client';
import { useEffect } from 'react';

export default function SealDemo() {
    return (
        <div className="min-h-screen bg-slate-50 p-12 text-slate-900 font-sans">
            <div className="max-w-3xl mx-auto">
                <header className="mb-12 border-b border-slate-200 pb-8">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">B2B Simulation: External Brand Website</h1>
                    <p className="text-slate-500">This page demonstrates how a trusted brand (e.g., PureVital Labs) would embed their QualiCore Trust Seal on their own site.</p>
                </header>

                <div className="bg-white rounded-3xl shadow-xl p-12 border border-slate-100 mb-12">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-4xl font-bold mb-4">PureVital Premium Collagen</h2>
                            <p className="text-2xl text-indigo-600 font-bold mb-6">$45.00</p>
                        </div>
                        
                        {/* THE SEAL EMBED SIMULATION */}
                        <div id="seal-target">
                            <script 
                                src="http://localhost:3000/scripts/quali-seal.js" 
                                data-brand-id="1" 
                                data-theme="light"
                                async
                            ></script>
                        </div>
                    </div>

                    <div className="space-y-6 text-slate-600 leading-relaxed">
                        <p>Experience the highest purity collagen, verified through structured transparency and compliance frameworks. Our commitment to quality is publicly documented and verifiable in real-time.</p>
                        <button className="w-full py-5 bg-black text-white font-bold rounded-2xl hover:bg-slate-800 transition-all">Add to Cart</button>
                    </div>
                </div>

                <div className="bg-indigo-900 text-white p-8 rounded-3xl">
                    <h3 className="font-bold mb-4">How it works for the Brand:</h3>
                    <ol className="list-decimal list-inside space-y-3 text-indigo-100 text-sm">
                        <li>The brand copies their unique script from the QualiCore Admin Panel.</li>
                        <li>They paste it into their product pages or footer.</li>
                        <li>The seal fetches their current <span className="text-white font-bold underline">Real-Time Status</span> from the QualiCore Standalone Registry.</li>
                        <li>If their trust status expires, the seal automatically updates across their entire site.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
