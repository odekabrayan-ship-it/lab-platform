import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import API from "../services/api";

const CATEGORIES = [
    { value: 'PHARMACY', label: 'Wellness & Pharma' },
    { value: 'DRINKING_WATER', label: 'Safe Hydration' },
    { value: 'BEVERAGES', label: 'Beverages' },
    { value: 'STAPLES', label: 'Pantry Purity' },
    { value: 'DAIRY', label: 'Dairy & Fresh' },
    { value: 'BABY_CARE', label: 'Infant Protection' }
];

export default function BrandPortfolio() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBrand, setCurrentBrand] = useState(null);
    const location = useLocation();
    const { fromAccelerator, tier } = location.state || {};

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const res = await API.get('/api/brands/my');
            setBrands(res.data.data || []);
        } catch (err) {
            console.error("Failed to load brands", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        const data = {
            name: e.target.name.value,
            category: e.target.category.value,
            brand_description: e.target.brand_description.value
        };

        try {
            if (currentBrand?.id) {
                await API.put(`/api/brands/my/${currentBrand.id}`, data);
            } else {
                await API.post('/api/brands/my', data);
            }
            setIsEditing(false);
            setCurrentBrand(null);
            fetchBrands();
        } catch (err) {
            alert("Error saving brand. Please try again.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this brand from your portfolio?")) return;
        try {
            await API.delete(`/api/brands/my/${id}`);
            fetchBrands();
        } catch (err) {
            alert("Error deleting brand.");
        }
    };

    const openEditor = (brand = null) => {
        setCurrentBrand(brand);
        setIsEditing(true);
    };

    return (
        <div className="animate-fade-in space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Brand <span className="text-indigo-400">Portfolio</span></h2>
                    <p className="text-slate-400 text-sm mt-1">Manage your public registry listings and product verticals.</p>
                </div>
                <div className="flex gap-4">
                    <Link to="/company-dashboard" className="px-6 py-2 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase no-underline hover:bg-slate-700 transition-all flex items-center">
                        ← Back
                    </Link>
                    {!isEditing && (
                        <button onClick={() => openEditor()} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2">
                            <span>➕ Add Brand</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Onboarding Banner */}
            {fromAccelerator && (
                <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-4 animate-scale-up">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-xl shrink-0">👑</div>
                    <div>
                        <h3 className="text-indigo-400 font-black text-lg">You're almost done!</h3>
                        <p className="text-slate-300 text-sm font-medium mt-1">
                            You've applied for <span className="text-white font-black">{tier}</span> status. To complete the sovereign application, you must register the specific brands you wish to cover under this tier. Add your first brand below.
                        </p>
                    </div>
                </div>
            )}

            {isEditing ? (
                <div className="glass-panel p-8 border-t-4 border-indigo-500 animate-scale-up">
                    <h3 className="text-xl font-black text-white mb-6">
                        {currentBrand ? 'Edit Brand Profile' : 'Register New Brand'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Brand Name *</label>
                                <input 
                                    required 
                                    name="name" 
                                    defaultValue={currentBrand?.name} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none text-white" 
                                    placeholder="e.g. GlobalFresh Milk" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Consumer Group *</label>
                                <select 
                                    required 
                                    name="category" 
                                    defaultValue={currentBrand?.category || ''} 
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none text-slate-300"
                                >
                                    <option value="" disabled>-- Select Vertical --</option>
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Public Description *</label>
                            <textarea 
                                required 
                                name="brand_description" 
                                rows={4}
                                defaultValue={currentBrand?.brand_description} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none text-white resize-none" 
                                placeholder="Describe the brand's commitment to quality, primary demographic, and product range..."
                            />
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-white/5">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
                                Cancel
                            </button>
                            <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                                Save Brand Profile
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Col: KPI */}
                    <div className="glass-panel p-6 border-white/5 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-3xl mb-4">🏷️</div>
                        <div className="text-4xl font-black tracking-tighter text-indigo-400 mb-1">{brands.length}</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Brands</div>
                        <p className="text-xs text-slate-400 mt-4 leading-relaxed font-medium">
                            Brands registered here can be submitted to the Public Trust Registry for sovereign consumer verification.
                        </p>
                    </div>

                    {/* Right Col: Brand List */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading ? (
                            <div className="glass-panel p-12 text-center text-slate-400">Loading portfolio...</div>
                        ) : brands.length === 0 ? (
                            <div className="glass-panel p-12 text-center border-dashed border-white/10 opacity-75 hover:opacity-100 transition-opacity">
                                <div className="text-4xl mb-4">📦</div>
                                <h3 className="text-xl font-bold text-white mb-2">Portfolio Empty</h3>
                                <p className="text-sm text-slate-400 mb-6">You haven't registered any brands yet.</p>
                                <button onClick={() => openEditor()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-indigo-600/20">
                                    Register First Brand
                                </button>
                            </div>
                        ) : (
                            brands.map(brand => (
                                <div key={brand.id} className="glass-panel p-6 border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-xl font-black text-white">{brand.name}</h4>
                                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
                                                {brand.category}
                                            </span>
                                            {brand.trust_badge === 'PENDING' ? (
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Sync</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Published</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                                            {brand.brand_description || 'No description provided.'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => openEditor(brand)} className="px-4 py-2 bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-slate-300 rounded-lg text-[10px] font-black uppercase transition-all border border-white/5">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(brand.id)} className="px-4 py-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-300 rounded-lg text-[10px] font-black uppercase transition-all border border-white/5">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
