import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, Phone, Mail, MapPin, Globe, UserPlus, LogIn, Sparkles } from 'lucide-react';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [registerForm, setRegisterForm] = useState({
        name: '',
        username: '',
        password: '',
        phone: '',
        email: '',
        ward_colony: '',
        address: '',
        preferred_language: 'en'
    });
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login, register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(loginForm.username, loginForm.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register({
                ...registerForm,
                role: 'CITIZEN'
            });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    const quickLogin = async (username, password) => {
        setLoginForm({ username, password });
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError('Quick login failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50 font-sans">
            {/* Left Column: Forms */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 z-10 overflow-y-auto">
                <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-gray-100 my-auto">
                    
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-md">
                            <span className="text-white font-extrabold text-2xl">J</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Jan Setu</h1>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">GHMC AI Governance Platform</p>
                        </div>
                    </div>

                    {/* Mode Toggle Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
                        <button 
                            type="button"
                            onClick={() => { setIsRegister(false); setError(''); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                !isRegister ? 'bg-white text-primary shadow-xs' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <LogIn size={15} /> Sign In
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setIsRegister(true); setError(''); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isRegister ? 'bg-white text-primary shadow-xs' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <UserPlus size={15} /> Register Citizen
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            {error}
                        </div>
                    )}

                    {/* SIGN IN FORM */}
                    {!isRegister ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Username or Mobile</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={loginForm.username}
                                        onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                                        placeholder="Enter your username or phone"
                                        required 
                                        className="block w-full pl-10 pr-3.5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="password" 
                                        value={loginForm.password}
                                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                                        placeholder="••••••••"
                                        required 
                                        className="block w-full pl-10 pr-3.5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-primary hover:bg-blue-800 transition-colors cursor-pointer mt-6"
                            >
                                {loading ? 'Signing In...' : 'Sign In to Portal'}
                            </button>

                            {/* Demo Accounts Quick-Switch Pills */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">
                                    <Sparkles size={14} className="text-amber-500" /> Demo One-Click Logins:
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => quickLogin('citizen1', 'pass123')}
                                        className="p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl text-left transition-all cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-gray-900">👤 Citizen</div>
                                        <div className="text-[10px] text-gray-500">citizen1</div>
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={() => quickLogin('officer1', 'pass123')}
                                        className="p-2.5 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 rounded-xl text-left transition-all cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-green-900">🛡️ L1 Officer (Sanitation)</div>
                                        <div className="text-[10px] text-gray-500">officer1</div>
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={() => quickLogin('commissioner', 'pass123')}
                                        className="p-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-xl text-left transition-all cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-purple-900">🏛️ L2 Commissioner</div>
                                        <div className="text-[10px] text-gray-500">commissioner</div>
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={() => quickLogin('admin', 'pass123')}
                                        className="p-2.5 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 rounded-xl text-left transition-all cursor-pointer"
                                    >
                                        <div className="text-xs font-bold text-amber-900">⚙️ Super Admin</div>
                                        <div className="text-[10px] text-gray-500">admin</div>
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        /* REGISTRATION FORM */
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Legal Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={registerForm.name}
                                        onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                                        placeholder="e.g. Sravan Reddy"
                                        required 
                                        className="block w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Username *</label>
                                    <input 
                                        type="text" 
                                        value={registerForm.username}
                                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                                        placeholder="e.g. sravan_hyd"
                                        required 
                                        className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password *</label>
                                    <input 
                                        type="password" 
                                        value={registerForm.password}
                                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                                        placeholder="••••••••"
                                        required 
                                        className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Phone *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            value={registerForm.phone}
                                            onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                                            placeholder="9876543210"
                                            required 
                                            className="block w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="email" 
                                            value={registerForm.email}
                                            onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                                            placeholder="name@email.com"
                                            className="block w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ward / Colony *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            value={registerForm.ward_colony}
                                            onChange={(e) => setRegisterForm({...registerForm, ward_colony: e.target.value})}
                                            placeholder="e.g. Jubilee Hills"
                                            required 
                                            className="block w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Language</label>
                                    <select 
                                        value={registerForm.preferred_language}
                                        onChange={(e) => setRegisterForm({...registerForm, preferred_language: e.target.value})}
                                        className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary cursor-pointer"
                                    >
                                        <option value="en">English</option>
                                        <option value="te">తెలుగు (Telugu)</option>
                                        <option value="hi">हिंदी (Hindi)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Street Address</label>
                                <textarea 
                                    value={registerForm.address}
                                    onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})}
                                    placeholder="Flat No, House No, Street..."
                                    rows={2}
                                    className="block w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-primary hover:bg-blue-800 transition-colors cursor-pointer mt-4"
                            >
                                {loading ? 'Creating Account...' : 'Complete Registration'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Right Column: Hero Graphic */}
            <div className="flex-1 hidden lg:flex bg-primary relative overflow-hidden flex-col justify-center p-16 text-white">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 max-w-lg space-y-6">
                    <ShieldCheck size={72} className="text-blue-300" />
                    <h2 className="text-5xl font-black leading-tight">Next-Generation Civic Governance.</h2>
                    <p className="text-lg text-blue-100 leading-relaxed font-light">
                        Jan Setu integrates autonomous AI agents, multi-lingual voice intelligence, and real-time spatial GIS routing for the Greater Hyderabad Municipal Corporation.
                    </p>
                    <div className="pt-4 border-t border-blue-400/30 flex items-center gap-6 text-xs text-blue-200 font-mono">
                        <span>• LangGraph Orchestration</span>
                        <span>• Llama 3.3 70B</span>
                        <span>• Deepgram Voice AI</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
