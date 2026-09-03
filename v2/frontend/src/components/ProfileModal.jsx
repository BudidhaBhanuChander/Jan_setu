import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { X, User, Phone, Mail, MapPin, Globe, Shield, Save, CheckCircle2 } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
    const { user, updateProfile } = useContext(AuthContext);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        ward_colony: '',
        pincode: '',
        preferred_language: 'en'
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                email: user.email || '',
                address: user.address || '',
                ward_colony: user.ward_colony || '',
                pincode: user.pincode || '',
                preferred_language: user.preferred_language || 'en'
            });
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMessage('');
        try {
            await updateProfile(formData);
            setSuccessMessage('Profile details updated successfully!');
            setIsEditing(false);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            alert('Failed to update profile: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const roleName = user.role?.replace('_', ' ') || 'Citizen';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-primary px-8 py-6 text-white flex justify-between items-center relative">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black shadow-inner">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight">{user.name || 'User Profile'}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-white/20 text-blue-100 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {roleName}
                                </span>
                                <span className="text-blue-200 text-xs font-mono">@{user.username}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 space-y-6">
                    {successMessage && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-600" />
                            {successMessage}
                        </div>
                    )}

                    {/* Stats Row (for Citizens) */}
                    {user.role === 'CITIZEN' && user.stats && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                                <div className="text-2xl font-black text-primary">{user.stats.total_filed || 0}</div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mt-0.5">Complaints Filed</div>
                            </div>
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                                <div className="text-2xl font-black text-green-700">{user.stats.resolved || 0}</div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mt-0.5">Resolved</div>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                                <div className="text-2xl font-black text-amber-700">{user.stats.pending || 0}</div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mt-0.5">In Progress</div>
                            </div>
                        </div>
                    )}

                    {/* Form / Details View */}
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Full Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-75 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Mobile Phone</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={formData.phone}
                                        disabled={!isEditing}
                                        placeholder="e.g. +91 9876543210"
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-75 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        disabled={!isEditing}
                                        placeholder="name@example.com"
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-75 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Preferred Language</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select 
                                        value={formData.preferred_language}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({...formData, preferred_language: e.target.value})}
                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-75 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white cursor-pointer"
                                    >
                                        <option value="en">English</option>
                                        <option value="te">తెలుగు (Telugu)</option>
                                        <option value="hi">हिंदी (Hindi)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ward / Colony / Locality</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={formData.ward_colony}
                                        disabled={!isEditing}
                                        placeholder="e.g. Ward 112, Jubilee Hills, Hyderabad"
                                        onChange={(e) => setFormData({...formData, ward_colony: e.target.value})}
                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-75 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Complete Street Address</label>
                                <textarea 
                                    value={formData.address}
                                    disabled={!isEditing}
                                    rows={2}
                                    placeholder="House/Flat No, Street, Landmark..."
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-75 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Shield size={14} /> GHMC Citizen Identity Verified
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {isEditing ? (
                                    <>
                                        <button 
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={saving}
                                            className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                            <Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors shadow-sm cursor-pointer"
                                    >
                                        Edit Details
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
