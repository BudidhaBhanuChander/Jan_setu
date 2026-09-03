import React, { useState, useEffect } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { 
    Users, Building2, ShieldCheck, Activity, Plus, CheckCircle2, 
    AlertTriangle, Clock, RefreshCw, UserPlus, Phone, Mail, MapPin, 
    Search, Filter, X, Zap, Cpu, ArrowUpRight
} from 'lucide-react';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [overview, setOverview] = useState(null);
    const [officers, setOfficers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [blackspots, setBlackspots] = useState([]);
    const [selectedBlackspot, setSelectedBlackspot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Modal states
    const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [officerSearch, setOfficerSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');

    // Forms
    const [officerForm, setOfficerForm] = useState({
        name: '',
        username: '',
        password: '',
        role: 'OFFICER_L1',
        department_id: '',
        phone: '',
        email: ''
    });

    const [deptForm, setDeptForm] = useState({
        name: '',
        code: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ovRes, offRes, deptRes, gisRes] = await Promise.all([
                api.get('/admin/overview'),
                api.get('/admin/officers'),
                api.get('/admin/departments'),
                api.get('/admin/gis/blackspots')
            ]);
            setOverview(ovRes.data);
            setOfficers(offRes.data);
            setDepartments(deptRes.data);
            setBlackspots(gisRes.data?.blackspots || []);
        } catch (err) {
            console.error('Failed to load admin data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOfficer = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                ...officerForm,
                department_id: officerForm.department_id ? parseInt(officerForm.department_id) : null
            };
            await api.post('/admin/officers', payload);
            alert('Officer onboarded successfully!');
            setIsOfficerModalOpen(false);
            setOfficerForm({
                name: '', username: '', password: '',
                role: 'OFFICER_L1', department_id: '', phone: '', email: ''
            });
            fetchData();
        } catch (err) {
            alert('Failed to create officer: ' + (err.response?.data?.detail || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateDept = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await api.post('/admin/departments', deptForm);
            alert('Department created successfully!');
            setIsDeptModalOpen(false);
            setDeptForm({ name: '', code: '', description: '' });
            fetchData();
        } catch (err) {
            alert('Failed to create department: ' + (err.response?.data?.detail || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleTriggerSLA = async () => {
        setActionLoading(true);
        try {
            const res = await api.post('/admin/sla/run-now');
            alert(`SLA Sweep completed! Actions taken: ${res.data.actions_taken}`);
            fetchData();
        } catch (err) {
            alert('SLA Sweep failed: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredOfficers = officers.filter(o => {
        const matchesSearch = !officerSearch || 
            o.name?.toLowerCase().includes(officerSearch.toLowerCase()) ||
            o.username?.toLowerCase().includes(officerSearch.toLowerCase()) ||
            o.department_name?.toLowerCase().includes(officerSearch.toLowerCase());
        
        const matchesDept = deptFilter === 'ALL' || o.department_id === parseInt(deptFilter);
        return matchesSearch && matchesDept;
    });

    return (
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            
            {/* TAB 1: Overview & Metrics */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    {/* Top KPI row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Registered Citizens</p>
                                <h2 className="text-3xl font-extrabold text-gray-900">{overview?.metrics?.citizens || 0}</h2>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center font-bold">
                                <Users size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Officers</p>
                                <h2 className="text-3xl font-extrabold text-green-700">{overview?.metrics?.officers || 0}</h2>
                            </div>
                            <div className="w-12 h-12 bg-green-50 text-green-700 rounded-xl flex items-center justify-center font-bold">
                                <ShieldCheck size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Departments</p>
                                <h2 className="text-3xl font-extrabold text-purple-700">{overview?.metrics?.departments || 0}</h2>
                            </div>
                            <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                                <Building2 size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Resolution Rate</p>
                                <h2 className="text-3xl font-extrabold text-amber-700">{overview?.metrics?.resolution_rate || 0}%</h2>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-bold">
                                <Activity size={24} />
                            </div>
                        </div>
                    </div>

                    {/* System Controls & Agent Audit Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* System Health Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                                <Cpu size={20} className="text-primary" /> AI Agent Multi-Core Health
                            </h3>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="font-semibold text-gray-700">LangGraph Orchestrator</span>
                                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full">ACTIVE</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="font-semibold text-gray-700">Groq LLM (Llama 3.3 70B)</span>
                                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full">ONLINE</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="font-semibold text-gray-700">Deepgram STT/TTS</span>
                                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full">READY</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="font-semibold text-gray-700">Watchdog SLA Daemon</span>
                                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">POLLING (10s)</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button 
                                    onClick={handleTriggerSLA}
                                    disabled={actionLoading}
                                    className="w-full bg-primary hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                                >
                                    <Zap size={16} /> {actionLoading ? 'Running Sweep...' : 'Trigger SLA Escalation Sweep'}
                                </button>
                            </div>
                        </div>

                        {/* Recent Agent Decisions Table */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Activity size={20} className="text-primary" /> Autonomous Agent Audit Logs
                                </h3>
                                <button onClick={fetchData} className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                    <RefreshCw size={12} /> Refresh
                                </button>
                            </div>

                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                            <th className="p-3 rounded-l-lg">Agent</th>
                                            <th className="p-3">Action</th>
                                            <th className="p-3">Grievance</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 rounded-r-lg">Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {overview?.recent_logs?.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-gray-400 font-medium">No logs recorded yet.</td>
                                            </tr>
                                        ) : (
                                            overview?.recent_logs?.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-3 font-bold text-gray-900 uppercase text-xs">{log.agent_name}</td>
                                                    <td className="p-3 text-gray-700 text-xs">{log.action}</td>
                                                    <td className="p-3 font-mono text-primary text-xs font-semibold">{log.tracking_id || 'N/A'}</td>
                                                    <td className="p-3">
                                                        <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-semibold text-gray-700 text-xs">
                                                        {log.confidence ? `${(log.confidence * 100).toFixed(0)}%` : 'Rule-based'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Officers & Staff Management */}
            {activeTab === 'officers' && (
                <div className="space-y-6">
                    {/* Header + Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900">Municipal Officers & Field Staff</h2>
                            <p className="text-gray-500 text-sm">Provision, assign, and monitor officer task queues across GHMC departments.</p>
                        </div>
                        <button 
                            onClick={() => setIsOfficerModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-800 transition-colors shadow-xs cursor-pointer text-sm"
                        >
                            <UserPlus size={18} />
                            Onboard New Officer
                        </button>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-80">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                value={officerSearch}
                                onChange={(e) => setOfficerSearch(e.target.value)}
                                placeholder="Search by officer name or department..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-xs font-bold text-gray-500 uppercase">Department:</span>
                            <select 
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none cursor-pointer"
                            >
                                <option value="ALL">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Officers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOfficers.map(off => (
                            <div key={off.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center font-bold text-lg">
                                                {off.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-gray-900 text-base">{off.name}</h4>
                                                <span className="text-xs text-gray-400 font-mono">@{off.username}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            off.role === 'OFFICER_L1' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                            {off.role.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="space-y-2 bg-gray-50 rounded-xl p-3.5 text-xs border border-gray-100 mb-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-semibold">Department:</span>
                                            <span className="font-bold text-gray-900">{off.department_name}</span>
                                        </div>
                                        {off.phone && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-semibold">Phone:</span>
                                                <span className="font-mono text-gray-800">{off.phone}</span>
                                            </div>
                                        )}
                                        {off.email && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-semibold">Email:</span>
                                                <span className="text-gray-800 truncate max-w-[150px]">{off.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            <span className="font-bold text-gray-700">{off.current_load} Active Tasks</span>
                                        </div>
                                        <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                            {off.resolved_tasks} Resolved
                                        </span>
                                    </div>
                                    {off.negligence_strikes > 0 ? (
                                        <div className="flex items-center justify-between bg-red-50 text-red-900 px-2.5 py-1 rounded-lg border border-red-200 text-[11px] font-bold animate-pulse">
                                            <span className="flex items-center gap-1 text-red-700">
                                                <AlertOctagon size={13} /> Negligence Strikes:
                                            </span>
                                            <span className="bg-red-600 text-white px-1.5 py-0.2 rounded font-black">
                                                {off.negligence_strikes} Incident{off.negligence_strikes > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                                            <CheckCircle2 size={12} className="text-emerald-600" /> Clean Integrity Record
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: Departments Management */}
            {activeTab === 'departments' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900">Municipal Departments</h2>
                            <p className="text-gray-500 text-sm">Configure municipal departments, codes, and automated dispatch routing targets.</p>
                        </div>
                        <button 
                            onClick={() => setIsDeptModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-800 transition-colors shadow-xs cursor-pointer text-sm"
                        >
                            <Plus size={18} />
                            Add Department
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {departments.map(d => (
                            <div key={d.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-mono font-bold text-xs bg-primary text-white px-2.5 py-1 rounded-md">
                                            {d.code}
                                        </span>
                                        <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                                            {d.officer_count} Officers
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{d.name}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{d.description || 'No description provided.'}</p>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-semibold">Active Queue:</span>
                                    <span className="font-bold text-primary bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                                        {d.active_tickets} Pending Grievances
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: GIS Blackspot Heatmap */}
            {activeTab === 'gis_heatmap' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                                    LIVE GHMC BLACKSPOT INTELLIGENCE
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                    {blackspots.length} Active Geo-Clusters Detected
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mt-1">Spatial Heatmap & Chronic Blackspot Radar</h2>
                            <p className="text-xs text-gray-500">Autonomous geospatial clustering across 6 GHMC zones to identify recurring municipal failures.</p>
                        </div>
                        <button
                            onClick={fetchData}
                            className="bg-primary hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                            <RefreshCw size={14} /> Refresh GIS Clusters
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Interactive Hyderabad Ward Heatmap Matrix */}
                        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
                            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MapPin size={18} className="text-primary" /> Hyderabad Municipal Zone Clusters
                            </h3>

                            {/* Stylized Visual Map Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {blackspots.map((spot, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedBlackspot(spot)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            selectedBlackspot?.location === spot.location
                                                ? 'border-primary bg-blue-50/70 shadow-sm'
                                                : spot.intensity === 'HIGH_RISK'
                                                ? 'border-red-200 bg-red-50/30 hover:border-red-400'
                                                : 'border-gray-100 bg-gray-50/50 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-gray-900">{spot.location}</span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                                spot.intensity === 'HIGH_RISK'
                                                    ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                            }`}>
                                                {spot.intensity === 'HIGH_RISK' ? '🔴 High Risk' : '🟡 Moderate'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-500 mb-2">Zone: <strong className="text-gray-700">{spot.zone}</strong></p>

                                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60 font-medium">
                                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                <span className="text-[10px] text-gray-400 block uppercase">Active</span>
                                                <strong className="text-gray-900 text-sm">{spot.active_tickets}</strong>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                <span className="text-[10px] text-red-500 block uppercase">Critical</span>
                                                <strong className="text-red-700 text-sm">{spot.critical_tickets}</strong>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-[11px] text-gray-600 truncate">
                                            Major Issue: <span className="font-semibold text-primary">{spot.top_category}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cluster Intelligence Detail Panel */}
                        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-primary" /> Cluster Diagnostic
                                </h3>

                                {selectedBlackspot ? (
                                    <div className="space-y-4 text-xs">
                                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Selected Landmark</span>
                                            <h4 className="text-lg font-black text-gray-900 mt-0.5">{selectedBlackspot.location}</h4>
                                            <p className="text-gray-500">Zone: {selectedBlackspot.zone} • Coords: {selectedBlackspot.lat}, {selectedBlackspot.lng}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
                                                <span className="text-gray-700">Total Unresolved Tickets:</span>
                                                <strong className="text-primary text-sm">{selectedBlackspot.active_tickets}</strong>
                                            </div>
                                            <div className="flex justify-between p-2.5 bg-red-50/60 rounded-lg border border-red-100">
                                                <span className="text-red-900 font-semibold">Critical Priority Issues:</span>
                                                <strong className="text-red-700 text-sm">{selectedBlackspot.critical_tickets}</strong>
                                            </div>
                                            <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                                <span className="text-gray-700">Primary Dept Needed:</span>
                                                <strong className="text-gray-900">{selectedBlackspot.top_category}</strong>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl text-indigo-950 space-y-1">
                                            <strong className="block text-[11px] uppercase tracking-wider text-indigo-700 font-bold">Autonomous Recommendation</strong>
                                            <p className="text-[11px] leading-relaxed">
                                                High incident density indicates systemic infrastructure failure. Recommend dispatching multi-department flying squad for preventative maintenance.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-16 text-gray-400">
                                        <MapPin size={40} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-xs font-semibold text-gray-600">Select any municipal ward cluster on the left to inspect root causes.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 text-center font-mono">
                                GHMC Automated Geo-Telemetry Active
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Onboard Officer */}
            {isOfficerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden">
                        <div className="bg-primary px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <UserPlus size={20} /> Onboard New Municipal Officer
                            </h3>
                            <button onClick={() => setIsOfficerModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOfficer} className="p-6 space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Officer Full Name</label>
                                <input 
                                    type="text" 
                                    value={officerForm.name}
                                    onChange={(e) => setOfficerForm({...officerForm, name: e.target.value})}
                                    placeholder="e.g. Ramesh Chandra" 
                                    required 
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Username / Badge ID</label>
                                    <input 
                                        type="text" 
                                        value={officerForm.username}
                                        onChange={(e) => setOfficerForm({...officerForm, username: e.target.value})}
                                        placeholder="e.g. officer_san1" 
                                        required 
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
                                    <input 
                                        type="password" 
                                        value={officerForm.password}
                                        onChange={(e) => setOfficerForm({...officerForm, password: e.target.value})}
                                        placeholder="Initial password" 
                                        required 
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role</label>
                                    <select 
                                        value={officerForm.role}
                                        onChange={(e) => setOfficerForm({...officerForm, role: e.target.value})}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                    >
                                        <option value="OFFICER_L1">L1 Field Officer</option>
                                        <option value="COMMISSIONER_L2">L2 Zonal Commissioner</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Department</label>
                                    <select 
                                        value={officerForm.department_id}
                                        onChange={(e) => setOfficerForm({...officerForm, department_id: e.target.value})}
                                        required
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Phone</label>
                                    <input 
                                        type="text" 
                                        value={officerForm.phone}
                                        onChange={(e) => setOfficerForm({...officerForm, phone: e.target.value})}
                                        placeholder="+91 9876543210" 
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        value={officerForm.email}
                                        onChange={(e) => setOfficerForm({...officerForm, email: e.target.value})}
                                        placeholder="officer@ghmc.gov.in" 
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsOfficerModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-blue-800 shadow-sm cursor-pointer"
                                >
                                    {actionLoading ? 'Creating...' : 'Provision Officer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Add Department */}
            {isDeptModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
                        <div className="bg-primary px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Building2 size={20} /> Add Municipal Department
                            </h3>
                            <button onClick={() => setIsDeptModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDept} className="p-6 space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Department Name</label>
                                <input 
                                    type="text" 
                                    value={deptForm.name}
                                    onChange={(e) => setDeptForm({...deptForm, name: e.target.value})}
                                    placeholder="e.g. Town Planning & Encroachment" 
                                    required 
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Department Code (3-4 Letters)</label>
                                <input 
                                    type="text" 
                                    value={deptForm.code}
                                    onChange={(e) => setDeptForm({...deptForm, code: e.target.value})}
                                    placeholder="e.g. TPE" 
                                    required 
                                    maxLength={5}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                <textarea 
                                    value={deptForm.description}
                                    onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
                                    placeholder="Scope of work and civic responsibilities..." 
                                    rows={3}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsDeptModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-blue-800 shadow-sm cursor-pointer"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </Layout>
    );
}
