import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import Layout from '../components/Layout';
import { 
    CheckCircle2, Clock, MapPin, AlertTriangle, Check, 
    ShieldAlert, Sparkles, ClipboardCheck, ArrowUpRight, Flame,
    Truck, Navigation, Wrench, Camera, Image as ImageIcon, AlertOctagon,
    X, CheckCircle as VerifiedIcon
} from 'lucide-react';

export default function OfficerDashboard() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolutionImage, setResolutionImage] = useState('');
    const [afterPhotoFile, setAfterPhotoFile] = useState(null);
    const [afterPhotoPreview, setAfterPhotoPreview] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [resolutionError, setResolutionError] = useState('');
    const [resolutionSuccess, setResolutionSuccess] = useState('');

    // Intermediary Milestone State
    const [milestoneLoading, setMilestoneLoading] = useState(false);
    const [milestoneSuccess, setMilestoneSuccess] = useState('');

    // On-Ground Inspection State
    const [inspectMode, setInspectMode] = useState(false);
    const [inspectedSeverity, setInspectedSeverity] = useState('HIGH');
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [inspectLoading, setInspectLoading] = useState(false);
    const [inspectSuccess, setInspectSuccess] = useState('');

    useEffect(() => { fetchTasks(); }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get(`/grievances?officer_id=${user.id}`);
            setTasks(res.data);
            if (selectedTask) {
                const refreshed = res.data.find(t => t.id === selectedTask.id);
                if (refreshed) setSelectedTask(refreshed);
            }
        } catch (err) { console.error('Failed to fetch tasks', err); }
    };

    const handleAfterPhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAfterPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAfterPhotoPreview(reader.result);
            setResolutionImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleMilestoneTransition = async (nextStatus) => {
        if (!selectedTask) return;
        setMilestoneLoading(true);
        setMilestoneSuccess('');
        try {
            const res = await api.post(`/grievances/${selectedTask.tracking_id}/milestone`, {
                status: nextStatus,
                notes: `Officer updated stage to ${nextStatus}`
            });
            setMilestoneSuccess(`Milestone updated to ${nextStatus}. Citizen notified in real-time.`);
            fetchTasks();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to update milestone.');
        } finally {
            setMilestoneLoading(false);
        }
    };

    const handleResolve = async (e) => {
        e.preventDefault();
        if (!selectedTask) return;
        const photoToSubmit = resolutionImage || afterPhotoPreview;
        if (!photoToSubmit) {
            setResolutionError('Compulsory Premise After Photo is required before resolving ticket.');
            return;
        }

        setIsUpdating(true);
        setResolutionError('');
        setResolutionSuccess('');
        try {
            const res = await api.patch(`/grievances/${selectedTask.tracking_id}/status`, {
                status: 'RESOLVED',
                resolution_notes: resolutionNotes,
                resolution_image: photoToSubmit,
                after_image_url: photoToSubmit
            });
            setResolutionSuccess(res.data.message || 'Grievance verified and marked resolved by AI Quality Gate!');
            setResolutionNotes('');
            setResolutionImage('');
            setAfterPhotoPreview('');
            setAfterPhotoFile(null);
            fetchTasks();
        } catch (err) { 
            const errorMsg = err.response?.data?.detail || 'Failed to resolve task.';
            setResolutionError(errorMsg);
        } 
        finally { setIsUpdating(false); }
    };

    const handleFieldInspect = async (e) => {
        e.preventDefault();
        if (!selectedTask) return;
        setInspectLoading(true);
        setInspectSuccess('');
        try {
            const res = await api.post(`/grievances/${selectedTask.tracking_id}/inspect`, {
                severity: inspectedSeverity,
                inspection_notes: inspectionNotes
            });
            setInspectSuccess(`Priority re-assessed to Level ${res.data.new_priority} (${res.data.new_severity}). SLA updated.`);
            setInspectionNotes('');
            setInspectMode(false);
            fetchTasks();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to submit inspection report.');
        } finally {
            setInspectLoading(false);
        }
    };

    const pendingTasks = tasks.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED');
    const resolvedTasks = tasks.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');

    const getPriorityBadge = (p) => {
        switch (p) {
            case 1:
                return 'bg-red-100 text-red-800 border-red-300 font-extrabold';
            case 2:
                return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
            case 3:
                return 'bg-blue-100 text-blue-800 border-blue-300 font-medium';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'history' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Resolution History</h2>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">{resolvedTasks.length} Completed</span>
                    </div>

                    {resolvedTasks.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <CheckCircle2 size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-600">No resolved tasks yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resolvedTasks.map(t => (
                                <div key={t.id} className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-primary text-sm">{t.tracking_id}</span>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">{t.status}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 mb-3 font-medium">"{t.raw_text}"</p>
                                        {t.resolution_notes && (
                                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-xs text-green-900 mb-2">
                                                <strong>Resolution Notes:</strong> {t.resolution_notes}
                                            </div>
                                        )}
                                        {t.field_inspection_notes && (
                                            <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg text-xs text-indigo-900 mb-2">
                                                <strong>Field Inspection Notes:</strong> {t.field_inspection_notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 flex justify-between">
                                        <span>Category: {t.category}</span>
                                        <span>{t.location_text}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Task Queue (5 columns) */}
                <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-[750px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-extrabold text-gray-900">Assigned Tasks</h2>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">{pendingTasks.length} Active</span>
                    </div>

                    {tasks.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <CheckCircle2 size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-600">No tasks assigned right now. Great job!</p>
                        </div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                            {tasks.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => setSelectedTask(t)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedTask?.id === t.id 
                                        ? 'border-primary bg-blue-50/70 shadow-sm' 
                                        : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-xs'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-900 font-mono text-sm">{t.tracking_id}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md border ${getPriorityBadge(t.priority)}`}>
                                                P{t.priority} • {t.severity}
                                            </span>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                                                t.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                                t.status === 'ESCALATED' ? 'bg-red-100 text-red-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>{t.status}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-700 font-medium line-clamp-2 mb-2.5">"{t.raw_text}"</p>
                                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                                        <span className="truncate max-w-[160px] flex items-center gap-1">
                                            <MapPin size={12} className="shrink-0 text-gray-400" /> {t.location_text || 'Hyderabad'}
                                        </span>
                                        <span className="flex items-center gap-1 font-mono text-blue-600">
                                            <Clock size={12} /> {t.sla_deadline ? new Date(t.sla_deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Action & Inspection Panel (7 columns) */}
                <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-[750px] overflow-y-auto">
                    <h2 className="text-xl font-extrabold text-gray-900 mb-4">Grievance Action & Ground Inspection</h2>
                    
                    {!selectedTask ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400 my-auto">
                            <CheckCircle2 size={64} className="mb-4 opacity-20 text-primary" />
                            <p className="font-medium text-gray-500">Select a grievance from your queue to inspect or resolve.</p>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fadeIn">
                            {/* Grievance Summary Card */}
                            <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 font-mono">{selectedTask.tracking_id}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{selectedTask.category} • {selectedTask.sub_category || 'General'}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xs px-2.5 py-1 rounded-lg border uppercase tracking-wider ${getPriorityBadge(selectedTask.priority)}`}>
                                            Priority Level {selectedTask.priority} ({selectedTask.severity})
                                        </span>
                                        <span className="text-[11px] font-mono text-gray-500 mt-1">
                                            SLA: {selectedTask.sla_deadline ? new Date(selectedTask.sla_deadline).toLocaleString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-gray-800 text-xs italic shadow-xs mb-3">
                                    "{selectedTask.raw_text}"
                                </div>

                                <div className="text-xs space-y-1.5 text-gray-600">
                                    <p className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-gray-400" />
                                        <strong className="text-gray-800">Location:</strong> {selectedTask.location_text}
                                    </p>
                                    {selectedTask.priority_reason && (
                                        <p className="text-[11px] bg-blue-50/80 border border-blue-100 p-2 rounded-lg text-blue-900">
                                            <strong className="text-blue-950">Engine Breakdown:</strong> {selectedTask.priority_reason}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Inspection Success Message */}
                            {inspectSuccess && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2 font-bold animate-fadeIn">
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    {inspectSuccess}
                                </div>
                            )}

                            {/* Milestone Success Message */}
                            {milestoneSuccess && (
                                <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-xl p-3 text-xs flex items-center gap-2 font-bold animate-fadeIn">
                                    <VerifiedIcon size={16} className="text-purple-600 shrink-0" />
                                    {milestoneSuccess}
                                </div>
                            )}

                            {/* Citizen's Initial Before Premise Photo */}
                            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 text-xs">
                                <span className="font-extrabold text-amber-950 flex items-center gap-1.5 mb-2">
                                    <Camera size={14} className="text-amber-700" /> Citizen's Initial Premise Photo (Before Inspection)
                                </span>
                                {selectedTask.before_image_url || selectedTask.image_path ? (
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={selectedTask.before_image_url || selectedTask.image_path} 
                                            alt="Citizen Premise Defect" 
                                            className="w-24 h-24 object-cover rounded-lg border border-amber-300 shadow-2xs"
                                        />
                                        <p className="text-[11px] text-amber-900 leading-relaxed">
                                            Ground defect photograph recorded at time of complaint registration. Verify location matches your inspection site.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No initial citizen image uploaded.</p>
                                )}
                            </div>

                            {/* Disputed Negligence Alert if applicable */}
                            {selectedTask.status === 'DISPUTED' && (
                                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-xs text-red-950 space-y-1.5 animate-pulse">
                                    <span className="font-black flex items-center gap-1.5 text-red-800 uppercase tracking-wide">
                                        <AlertOctagon size={16} /> Disputed by Citizen (Negligence Incident Logged)
                                    </span>
                                    <p className="font-bold text-red-900">
                                        Citizen Reason: "{selectedTask.dispute_reason}"
                                    </p>
                                    <p className="text-[11px] text-red-700">
                                        You must re-inspect the premise immediately and upload genuine After-Repair photographic proof to close this ticket.
                                    </p>
                                </div>
                            )}

                            {/* Section 1: Intermediary Field Milestones Transition Bar */}
                            {selectedTask.status !== 'RESOLVED' && selectedTask.status !== 'CLOSED' && (
                                <div className="border border-purple-200 bg-purple-50/40 rounded-2xl p-4 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                                            <Truck size={15} className="text-purple-700" /> Operational Field Milestones
                                        </span>
                                        <span className="text-[11px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200">
                                            Stage: {selectedTask.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-purple-800">
                                        Keep citizen informed in real-time by updating your crew progression:
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            disabled={milestoneLoading || selectedTask.status === 'TEAM_DISPATCHED'}
                                            onClick={() => handleMilestoneTransition('TEAM_DISPATCHED')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                selectedTask.status === 'TEAM_DISPATCHED'
                                                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                                                    : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                                            }`}
                                        >
                                            <Truck size={13} /> Dispatch Crew
                                        </button>
                                        <button
                                            type="button"
                                            disabled={milestoneLoading || selectedTask.status === 'ON_SITE_INSPECTION'}
                                            onClick={() => handleMilestoneTransition('ON_SITE_INSPECTION')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                selectedTask.status === 'ON_SITE_INSPECTION'
                                                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                                                    : 'bg-white text-teal-900 border-teal-200 hover:bg-teal-100'
                                            }`}
                                        >
                                            <Navigation size={13} /> On-Site Inspect
                                        </button>
                                        <button
                                            type="button"
                                            disabled={milestoneLoading || selectedTask.status === 'WORK_IN_PROGRESS'}
                                            onClick={() => handleMilestoneTransition('WORK_IN_PROGRESS')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                selectedTask.status === 'WORK_IN_PROGRESS'
                                                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                                                    : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                                            }`}
                                        >
                                            <Wrench size={13} /> Start Work
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Section 2: Field Inspection / Priority Override */}
                            {selectedTask.status !== 'RESOLVED' && selectedTask.status !== 'CLOSED' && (
                                <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4.5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                                            <ClipboardCheck size={18} className="text-indigo-600" />
                                            <span>On-Ground Field Inspection & Priority Assessment</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setInspectMode(!inspectMode)}
                                            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                                        >
                                            {inspectMode ? 'Cancel' : '+ Record Ground Inspection'}
                                        </button>
                                    </div>

                                    {inspectMode && (
                                        <form onSubmit={handleFieldInspect} className="space-y-3 pt-2 border-t border-indigo-100 animate-fadeIn">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                                    On-Ground Inspected Severity Level
                                                </label>
                                                <div className="grid grid-cols-4 gap-1.5">
                                                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => (
                                                        <button
                                                            key={sev}
                                                            type="button"
                                                            onClick={() => setInspectedSeverity(sev)}
                                                            className={`py-1.5 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                                                                inspectedSeverity === sev
                                                                    ? sev === 'CRITICAL' ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                                                    : sev === 'HIGH' ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                                                    : sev === 'MEDIUM' ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                                    : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {sev}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                                    Inspection Findings / Hazard Verification *
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={inspectionNotes}
                                                    onChange={(e) => setInspectionNotes(e.target.value)}
                                                    placeholder="State ground reality (e.g. Major pipe rupture confirmed, 400 households affected, safety cordon set up)..."
                                                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                                    required
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={inspectLoading}
                                                className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <ShieldAlert size={14} />
                                                <span>{inspectLoading ? 'Recalculating SLA...' : 'Update Ground Severity & Recalculate SLA'}</span>
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}

                            {/* Section 3: Compulsory After-Photo & Task Resolution */}
                            {selectedTask.status !== 'RESOLVED' && selectedTask.status !== 'CLOSED' && (
                                <form onSubmit={handleResolve} className="space-y-3.5 pt-2">
                                    {resolutionError && (
                                        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-start gap-2">
                                            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="block">AI Verification Gate Rejected:</strong>
                                                <span>{resolutionError}</span>
                                            </div>
                                        </div>
                                    )}

                                    {resolutionSuccess && (
                                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-start gap-2 font-bold">
                                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                            <span>{resolutionSuccess}</span>
                                        </div>
                                    )}

                                    {/* Compulsory After-Resolution Photo Box */}
                                    <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                                                <Camera size={16} className="text-emerald-700" />
                                                Compulsory Premise 'After Photo' Proof *
                                            </label>
                                            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
                                                Mandatory Proof
                                            </span>
                                        </div>
                                        <p className="text-xs text-emerald-800 mb-3">
                                            You must capture & upload a photograph of the repaired site before ticket resolution is allowed by the AI Quality Gate.
                                        </p>

                                        <div className="flex flex-col sm:flex-row items-center gap-3">
                                            <label className="w-full flex-1 border-2 border-dashed border-emerald-300 bg-white rounded-xl p-3 text-center cursor-pointer hover:bg-emerald-50/50 transition-colors flex items-center justify-center gap-2">
                                                <ImageIcon size={18} className="text-emerald-600" />
                                                <span className="text-xs font-bold text-gray-700 truncate">
                                                    {afterPhotoFile ? afterPhotoFile.name : "Capture or Upload Repaired Premise Photo"}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleAfterPhotoSelect}
                                                />
                                            </label>

                                            {afterPhotoPreview && (
                                                <div className="relative group shrink-0">
                                                    <img 
                                                        src={afterPhotoPreview} 
                                                        alt="Repaired Premise Proof" 
                                                        className="w-16 h-16 object-cover rounded-xl border-2 border-emerald-600 shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setAfterPhotoFile(null); setAfterPhotoPreview(''); setResolutionImage(''); }}
                                                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-1 rounded-full text-xs shadow-md hover:bg-red-700 cursor-pointer"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                            Resolution Action & Technical Work *
                                        </label>
                                        <textarea
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                            placeholder="Detail the exact operational work carried out (e.g. repaved road with bitumen, cleared 2 tons waste, replaced LED bulb)..."
                                            rows={3}
                                            required
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-xs bg-gray-50/50 outline-hidden"
                                        />
                                    </div>

                                    <button 
                                        disabled={isUpdating} 
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
                                    >
                                        {isUpdating ? 'Validating Resolution & After-Photo via AI...' : <><Check size={16} /> Submit & AI Verify Resolution Proof</>}
                                    </button>
                                </form>
                            )}

                            {(selectedTask.status === 'RESOLVED' || selectedTask.status === 'CLOSED') && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center text-xs font-bold gap-2">
                                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                                    This task has been verified and marked resolved by the AI Quality Gate.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            )}
        </Layout>
    );
}

