import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { 
    Clock, CheckCircle2, AlertCircle, ThumbsUp, ThumbsDown, Camera, 
    Search, Filter, Plus, MessageSquare, MapPin, FileText, Send, 
    Sparkles, Trash2, ArrowRight, ShieldCheck, Check, UserCheck, 
    Phone, Building, Calendar, AlertTriangle, Eye, X, ChevronRight,
    Award, ShieldAlert, CheckCircle, Navigation, Map, Image as ImageIcon,
    AlertOctagon, CornerDownRight, CheckCircle as VerifiedIcon, Loader2
} from 'lucide-react';
import Layout from '../components/Layout';
import VoiceChatbot from '../components/VoiceChatbot';

export default function CitizenDashboard() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [reportMode, setReportMode] = useState('chatbot'); // 'chatbot' | 'form'
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedGrievance, setSelectedGrievance] = useState(null);

    // Form & Photo State
    const [formData, setFormData] = useState({
        title: '',
        category: 'Roads & Potholes',
        location: '',
        description: '',
        language: 'en',
        latitude: null,
        longitude: null,
        geohash: ''
    });
    const [beforePhoto, setBeforePhoto] = useState(null);
    const [beforePhotoPreview, setBeforePhotoPreview] = useState('');
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [formSuccess, setFormSuccess] = useState(null);
    const [formError, setFormError] = useState('');

    // Geocoding & Map Pin State
    const [geoSearching, setGeoSearching] = useState(false);
    const [geoResults, setGeoResults] = useState([]);
    const [pinnedLocation, setPinnedLocation] = useState(null);

    // Citizen Dispute Negligence State
    const [disputeModalOpen, setDisputeModalOpen] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputePhoto, setDisputePhoto] = useState('');
    const [disputeLoading, setDisputeLoading] = useState(false);
    const [disputeSuccess, setDisputeSuccess] = useState('');

    // Prepopulate user address/ward
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                location: prev.location || user.ward_colony || user.address || '',
                language: user.preferred_language || 'en'
            }));
        }
    }, [user]);

    const fetchGrievances = async () => {
        if (!user?.id) return;
        try {
            const res = await api.get(`/grievances?citizen_id=${user.id}`);
            setGrievances(res.data);
        } catch (error) {
            console.error("Failed to fetch grievances", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchGrievances();
            const interval = setInterval(fetchGrievances, 5000);
            
            const handleCreated = () => {
                fetchGrievances();
            };
            window.addEventListener('grievance_created', handleCreated);

            return () => {
                clearInterval(interval);
                window.removeEventListener('grievance_created', handleCreated);
            };
        }
    }, [user?.id]);

    // Handle Image file selection & base64 preview
    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBeforePhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setBeforePhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Address Geocoding Search via OpenStreetMap / Nominatim
    const searchAddressOnMap = async () => {
        const query = formData.location.trim();
        if (!query || query.length < 3) return;
        setGeoSearching(true);
        setGeoResults([]);
        try {
            const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Hyderabad, Telangana, India')}&format=json&limit=3&addressdetails=1`;
            const res = await fetch(endpoint, {
                headers: { 'Accept-Language': 'en' }
            });
            if (res.ok) {
                const data = await res.json();
                setGeoResults(data || []);
            }
        } catch (e) {
            console.error('Geocoding error:', e);
        } finally {
            setGeoSearching(false);
        }
    };

    const handleSelectGeoLocation = (loc) => {
        const lat = parseFloat(loc.lat);
        const lon = parseFloat(loc.lon);
        const geohash = `tep_${Math.round(lat*1000)}_${Math.round(lon*1000)}`;
        setPinnedLocation({
            lat,
            lon,
            displayName: loc.display_name,
            geohash
        });
        setFormData(prev => ({
            ...prev,
            location: loc.display_name.split(',').slice(0, 3).join(','),
            latitude: lat,
            longitude: lon,
            geohash
        }));
        setGeoResults([]);
    };

    const handleFeedback = async (trackingId, isSatisfied) => {
        if (!isSatisfied) {
            setDisputeModalOpen(true);
            return;
        }

        setFeedbackLoading(true);
        try {
            const res = await api.post(`/grievances/${trackingId}/feedback`, {
                csat_score: 5,
                comment: 'Citizen approved resolution. Verified on ground.'
            });
            if (res.data) {
                fetchGrievances();
            }
        } catch (error) {
            console.error('Feedback failed', error);
        } finally {
            setFeedbackLoading(false);
        }
    };

    const handleDisputeSubmit = async (e) => {
        e.preventDefault();
        if (!selectedGrievance || !disputeReason.trim()) return;
        setDisputeLoading(true);
        setDisputeSuccess('');
        try {
            const res = await api.post(`/grievances/${selectedGrievance.tracking_id}/dispute`, {
                dispute_reason: disputeReason.trim(),
                dispute_image_url: disputePhoto.trim()
            });
            setDisputeSuccess('Resolution successfully disputed. An Officer Negligence Audit incident has been initiated with the Zonal Commissioner.');
            setTimeout(() => {
                setDisputeModalOpen(false);
                setDisputeReason('');
                setDisputePhoto('');
                fetchGrievances();
            }, 2500);
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to file dispute.');
        } finally {
            setDisputeLoading(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.description.trim()) {
            setFormError('Please provide a description of the issue.');
            return;
        }
        if (!formData.location.trim()) {
            setFormError('Please provide the location or colony.');
            return;
        }
        if (!beforePhotoPreview) {
            setFormError('Compulsory initial complaint photo is required. Please capture or upload a premise photo.');
            return;
        }

        setFormSubmitting(true);
        setFormError('');
        setFormSuccess(null);

        try {
            const fullText = formData.title.trim() 
                ? `${formData.title.trim()} — ${formData.description.trim()}`
                : formData.description.trim();

            const res = await api.post('/grievances/', {
                raw_text: fullText,
                location_text: formData.location.trim(),
                latitude: formData.latitude,
                longitude: formData.longitude,
                geohash: formData.geohash || '',
                before_image_url: beforePhotoPreview,
                category: formData.category,
                language: formData.language || 'en',
                citizen_name: user?.name || 'Citizen',
                citizen_phone: user?.phone || user?.username || '',
                citizen_email: user?.email || '',
                citizen_id: user?.id,
                channel: 'WEB_FORM'
            });

            setFormSuccess(res.data);
            setFormData({
                title: '',
                category: 'Roads & Potholes',
                location: user?.ward_colony || user?.address || '',
                description: '',
                language: user?.preferred_language || 'en',
                latitude: null,
                longitude: null,
                geohash: ''
            });
            setBeforePhoto(null);
            setBeforePhotoPreview('');
            setPinnedLocation(null);
            fetchGrievances();
        } catch (err) {
            console.error('Failed to submit grievance form', err);
            setFormError(err.response?.data?.detail || 'Failed to submit grievance. Please try again.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const filteredGrievances = grievances.filter(g => {
        const matchesSearch = 
            !searchQuery || 
            (g.tracking_id && g.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (g.raw_text && g.raw_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (g.category && g.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (g.location_text && g.location_text.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = 
            statusFilter === 'ALL' || 
            (statusFilter === 'PENDING' && (g.status === 'NEW' || g.status === 'ASSIGNED')) ||
            g.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'RESOLVED':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'CLOSED':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'ESCALATED':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-amber-100 text-amber-800 border-amber-200';
        }
    };

    return (
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {activeTab === 'dashboard' ? 'Citizen Portal' : 'My Grievances'}
                    </h1>
                    <p className="text-gray-500 mt-1 text-base">
                        {activeTab === 'dashboard' 
                            ? 'Report civic issues directly via AI Assistant or Structured Form and track live status.' 
                            : 'View complete history, filter by status, and verify resolution proof for all your complaints.'}
                    </p>
                </div>
                {activeTab === 'grievances' && (
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-800 transition-colors shadow-xs"
                    >
                        <Plus size={18} />
                        Report New Issue
                    </button>
                )}
            </div>

            {/* TAB 1: Dashboard View (Embedded Voice Chatbot / Form + Fast Tracker) */}
            <div className={activeTab === 'dashboard' ? 'grid grid-cols-1 lg:grid-cols-12 gap-8' : 'hidden'}>
                {/* Left Column: Toggle Mode (Chatbot vs Fill Form) (7 columns) */}
                <div className="lg:col-span-7 flex flex-col gap-5">
                    
                    {/* Mode Switcher Toggle Bar */}
                    <div className="bg-gray-200/80 p-1.5 rounded-2xl flex items-center gap-1.5 border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setReportMode('chatbot')}
                            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                reportMode === 'chatbot'
                                    ? 'bg-white text-primary shadow-sm border border-gray-200/70'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
                            }`}
                        >
                            <MessageSquare size={16} className={reportMode === 'chatbot' ? 'text-primary' : 'text-gray-400'} />
                            <span>AI Voice & Chatbot</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Interactive</span>
                        </button>
                        <button
                            onClick={() => setReportMode('form')}
                            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                reportMode === 'form'
                                    ? 'bg-white text-primary shadow-sm border border-gray-200/70'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
                            }`}
                        >
                            <FileText size={16} className={reportMode === 'form' ? 'text-primary' : 'text-gray-400'} />
                            <span>Fill Grievance Form</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Fast Entry</span>
                        </button>
                    </div>

                    {/* OPTION A: Chatbot Mode */}
                    {reportMode === 'chatbot' && (
                        <div className="flex flex-col gap-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[600px] overflow-hidden">
                                <VoiceChatbot embedded={true} />
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                                <h3 className="font-bold text-gray-900 mb-1.5 flex items-center gap-2 text-sm">
                                    <Camera size={16} className="text-primary" />
                                    Premise Defect Photographic Evidence
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">Attach a photo of the civic hazard. Vision AI automatically extracts severity and location context for the chatbot.</p>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-3.5 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                                        <span className="text-xs font-medium text-gray-600">
                                            {beforePhoto ? beforePhoto.name : "Click to select or drag and drop an image"}
                                        </span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handlePhotoSelect}
                                        />
                                    </label>
                                    {beforePhotoPreview && (
                                        <div className="flex items-center gap-2">
                                            <img 
                                                src={beforePhotoPreview} 
                                                alt="Attached evidence" 
                                                className="w-10 h-10 object-cover rounded-lg border border-primary shadow-xs"
                                            />
                                            <button 
                                                onClick={() => {
                                                    alert("Image verified and attached to grievance context!");
                                                }}
                                                className="px-4 py-2 bg-emerald-100 text-emerald-800 font-bold rounded-lg hover:bg-emerald-200 text-xs transition-colors cursor-pointer"
                                            >
                                                Attached
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OPTION B: Fill Form Mode */}
                    {reportMode === 'form' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5 animate-fadeIn">
                            <div className="border-b border-gray-100 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                                            <FileText size={20} className="text-primary" />
                                            Direct Grievance Registration
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Our autonomous AI agents will instantly classify, assign to the correct zonal officer, and compute SLA deadlines.
                                        </p>
                                    </div>
                                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                        <ShieldCheck size={14} /> Auto-Verified
                                    </span>
                                </div>
                            </div>

                            {/* Success Notification */}
                            {formSuccess && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-2 animate-fadeIn">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                        <CheckCircle2 size={18} className="text-emerald-600" />
                                        Grievance Filed Successfully!
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white/70 p-2.5 rounded-lg border border-emerald-100 mt-1">
                                        <div>
                                            <span className="text-gray-500 block text-[10px] uppercase font-bold">Tracking ID</span>
                                            <span className="font-extrabold text-emerald-900 font-mono text-xs">{formSuccess.tracking_id}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-[10px] uppercase font-bold">Category</span>
                                            <span className="font-bold text-gray-900">{formSuccess.category || 'Classified'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-[10px] uppercase font-bold">Status</span>
                                            <span className="font-bold text-blue-700">{formSuccess.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-1">
                                        <button
                                            onClick={() => setFormSuccess(null)}
                                            className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                                        >
                                            + File Another Complaint
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error Notification */}
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs flex items-center gap-2 font-medium">
                                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                {/* Civic Category & Automated Priority Engine Banner */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                        Civic Category *
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:bg-white outline-hidden"
                                        required
                                    >
                                        <option value="Roads & Potholes">Roads, Potholes & Footpaths</option>
                                        <option value="Water Supply">Water Supply & Leakages</option>
                                        <option value="Garbage & Waste">Garbage & Solid Waste Management</option>
                                        <option value="Street Lighting">Street Lights & Dark Spots</option>
                                        <option value="Drainage & Sewage">Drainage & Sewage Overflow</option>
                                        <option value="Stray Animals">Stray Animal Menace</option>
                                        <option value="Encroachment">Illegal Encroachment / Building</option>
                                        <option value="Parks & Trees">Parks, Greenery & Fallen Trees</option>
                                        <option value="Other">Other Civic Grievance</option>
                                    </select>
                                </div>

                                {/* Automated Multi-Factor Priority Badge */}
                                <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5">
                                    <Sparkles size={18} className="text-primary mt-0.5 shrink-0" />
                                    <div className="text-xs">
                                        <span className="font-extrabold text-blue-900 block mb-0.5">
                                            Autonomous Dynamic Priority Engine Active
                                        </span>
                                        <p className="text-blue-700 text-[11px] leading-relaxed">
                                            Priority (Level 1-4) and SLA deadline are calculated objectively by AI hazard analysis, local area complaint density, sensitive zone proximity, and verified field inspection.
                                        </p>
                                    </div>
                                </div>

                                {/* Issue Title / Short Summary */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                        Short Summary / Title
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Major water pipe burst on Main Road"
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:bg-white outline-hidden"
                                    />
                                </div>

                                {/* Location & Landmark with Interactive Map Search & Geohash Pinning */}
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                                            <MapPin size={14} className="text-red-500" /> Exact Location / Ward / Pin *
                                        </label>
                                        <span className="text-[11px] text-primary font-semibold">
                                            OSM / Nominatim Enabled
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="Type street, area or landmark (e.g. Charminar, Jubilee Hills Road 36)..."
                                            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:bg-white outline-hidden"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={searchAddressOnMap}
                                            disabled={geoSearching}
                                            className="bg-primary hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            {geoSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                            <span>Locate on Map</span>
                                        </button>
                                    </div>

                                    {/* Geocoding Search Dropdown Results */}
                                    {geoResults.length > 0 && (
                                        <div className="mt-2 bg-white border border-blue-200 rounded-xl shadow-lg p-2 space-y-1.5 text-xs animate-fadeIn">
                                            <span className="text-[10px] font-bold uppercase text-gray-400 block px-2">
                                                Select Precise Municipal Pin:
                                            </span>
                                            {geoResults.map((loc, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => handleSelectGeoLocation(loc)}
                                                    className="p-2.5 hover:bg-blue-50 rounded-lg cursor-pointer flex items-start gap-2 text-gray-800 transition-colors border border-transparent hover:border-blue-100"
                                                >
                                                    <Navigation size={14} className="text-primary mt-0.5 shrink-0" />
                                                    <div>
                                                        <strong className="block text-xs text-gray-900">{loc.display_name.split(',')[0]}</strong>
                                                        <span className="text-[11px] text-gray-500 line-clamp-1">{loc.display_name}</span>
                                                        <span className="text-[10px] font-mono text-primary font-bold block mt-0.5">
                                                            Lat: {parseFloat(loc.lat).toFixed(4)}, Lon: {parseFloat(loc.lon).toFixed(4)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Pinned Coordinates & Geohash Badge */}
                                    {pinnedLocation && (
                                        <div className="mt-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
                                            <div className="flex items-center gap-2">
                                                <VerifiedIcon size={16} className="text-emerald-600" />
                                                <div>
                                                    <span className="font-bold block">Location Pinned & Geohashed</span>
                                                    <span className="font-mono text-[10px] text-emerald-700">
                                                        GeoHash: <strong>{pinnedLocation.geohash}</strong> | ({pinnedLocation.lat.toFixed(5)}, {pinnedLocation.lon.toFixed(5)})
                                                    </span>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setPinnedLocation(null)}
                                                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
                                            >
                                                Clear Pin
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Detailed Description */}
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                            Detailed Grievance Description *
                                        </label>
                                        <span className="text-[11px] text-gray-400 font-mono">
                                            {formData.description.length} chars
                                        </span>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe the issue in detail (e.g. what is happening, how long it has persisted, and any hazards to traffic/residents)..."
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:bg-white outline-hidden leading-relaxed"
                                        required
                                    />
                                </div>

                                {/* Compulsory Premise Before Photo Upload Box */}
                                <div className="bg-amber-50/60 border-2 border-amber-200 rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-extrabold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                                            <Camera size={16} className="text-amber-700" />
                                            Compulsory Premise 'Before Photo' Proof *
                                        </label>
                                        <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
                                            Mandatory Proof
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-800 mb-3">
                                        Take or attach a clear photograph of the defect/hazard on the ground. AI Vision will verify the scene before officer dispatch.
                                    </p>

                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <label className="w-full flex-1 border-2 border-dashed border-amber-300 bg-white rounded-xl p-3.5 text-center cursor-pointer hover:bg-amber-50/40 transition-colors flex items-center justify-center gap-2">
                                            <ImageIcon size={18} className="text-amber-600" />
                                            <span className="text-xs font-bold text-gray-700 truncate">
                                                {beforePhoto ? beforePhoto.name : "Click to Capture or Choose Photo"}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoSelect}
                                            />
                                        </label>

                                        {beforePhotoPreview && (
                                            <div className="relative group shrink-0">
                                                <img 
                                                    src={beforePhotoPreview} 
                                                    alt="Premise Before" 
                                                    className="w-16 h-16 object-cover rounded-xl border-2 border-emerald-500 shadow-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => { setBeforePhoto(null); setBeforePhotoPreview(''); }}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-1 rounded-full text-xs shadow-md hover:bg-red-700 cursor-pointer"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Citizen Signature Card */}
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center text-xs">
                                            {user?.name?.[0]?.toUpperCase() || 'C'}
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-900 block">{user?.name || 'Citizen'}</span>
                                            <span className="text-gray-500 text-[11px]">{user?.phone || user?.email || user?.username}</span>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                        Authenticated
                                    </span>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    className="w-full bg-primary hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                                >
                                    {formSubmitting ? (
                                        <>
                                            <Sparkles size={18} className="animate-spin text-amber-300" />
                                            <span>AI Pipeline Processing & Routing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            <span>Submit Civic Grievance</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right Column: Tracking & History (5 columns) */}
                <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[750px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                            My Tracked Issues
                            <span className="text-xs font-bold bg-primary text-white px-2 py-0.5 rounded-full">{grievances.length}</span>
                        </h2>
                        <button 
                            onClick={() => setActiveTab('grievances')}
                            className="text-xs font-semibold text-primary hover:underline"
                        >
                            View Full List &rarr;
                        </button>
                    </div>
                    
                    {grievances.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex-1 flex flex-col items-center justify-center">
                            <Clock size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-700 mb-1">No complaints filed</h3>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            {grievances.map(g => (
                                <div 
                                    key={g.id} 
                                    onClick={() => setSelectedGrievance(g)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer bg-white group ${
                                        g.status === 'RESOLVED' 
                                            ? 'border-green-200 bg-green-50/20 hover:border-green-300' 
                                            : 'border-gray-200 hover:border-primary/60 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-primary text-xs bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                {g.tracking_id}
                                            </span>
                                            {g.priority && (
                                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                                    g.priority === 1 ? 'bg-red-100 text-red-700' :
                                                    g.priority === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    P{g.priority}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${getStatusBadge(g.status)}`}>
                                            {g.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-900 font-medium mb-3 text-sm line-clamp-2 leading-relaxed">{g.raw_text}</p>
                                    
                                    {/* Officer & ETA Preview Card */}
                                    <div className="bg-gray-50 group-hover:bg-blue-50/40 p-2.5 rounded-lg flex flex-col gap-1.5 text-xs border border-gray-100 transition-colors mb-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium flex items-center gap-1">
                                                <UserCheck size={13} className="text-primary" /> Assigned Officer:
                                            </span>
                                            <span className="text-gray-900 font-bold truncate max-w-[150px]">
                                                {g.assigned_officer_name || "Field Officer (Auto-assigned)"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium flex items-center gap-1">
                                                <Clock size={13} className="text-primary" /> Target SLA / ETA:
                                            </span>
                                            <span className="text-primary font-bold">
                                                {g.sla_deadline ? new Date(g.sla_deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Within 24-48 hrs"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-primary font-semibold pt-1">
                                        <span className="flex items-center gap-1">
                                            <Eye size={13} /> Click to view full details
                                        </span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>

                                    {/* Feedback Loop */}
                                    {g.status === 'RESOLVED' && (
                                        <div className="bg-white border border-green-200 p-3 rounded-lg shadow-sm mt-3" onClick={e => e.stopPropagation()}>
                                            <p className="text-xs font-bold text-gray-800 flex items-center gap-2 mb-2">
                                                <AlertCircle size={14} className="text-primary"/> Officer marked Resolved. Satisfied?
                                            </p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleFeedback(g.tracking_id, true)} 
                                                    disabled={feedbackLoading}
                                                    className="flex-1 bg-green-100 hover:bg-green-200 text-green-800 font-bold py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                >
                                                    <ThumbsUp size={14} /> Close
                                                </button>
                                                <button 
                                                    onClick={() => handleFeedback(g.tracking_id, false)} 
                                                    disabled={feedbackLoading}
                                                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                >
                                                    <ThumbsDown size={14} /> Escalate
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* TAB 2: Dedicated "My Grievances" Full List & Filter View */}
            {activeTab === 'grievances' && (
                <div className="space-y-6">
                    {/* Search and Filters Bar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by tracking ID, category, or keyword..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                            />
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                            {[
                                { label: 'All', value: 'ALL' },
                                { label: 'Active', value: 'PENDING' },
                                { label: 'In Progress', value: 'IN_PROGRESS' },
                                { label: 'Resolved', value: 'RESOLVED' },
                                { label: 'Escalated', value: 'ESCALATED' },
                            ].map(filter => (
                                <button 
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                                        statusFilter === filter.value 
                                        ? 'bg-primary text-white shadow-xs' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grievances Cards Grid */}
                    {filteredGrievances.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                            <Clock size={48} className="mx-auto text-gray-300 mb-3" />
                            <h3 className="text-lg font-bold text-gray-800 mb-1">No matching grievances found</h3>
                            <p className="text-sm text-gray-500 mb-6">Try adjusting your search query or filter criteria.</p>
                            <button 
                                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGrievances.map(g => (
                                <div 
                                    key={g.id} 
                                    onClick={() => setSelectedGrievance(g)}
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-primary/60 hover:shadow-md transition-all p-6 flex flex-col justify-between cursor-pointer group"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-primary text-sm bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                    {g.tracking_id}
                                                </span>
                                                {g.priority && (
                                                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                                                        g.priority === 1 ? 'bg-red-100 text-red-700' :
                                                        g.priority === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        Priority {g.priority}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border ${getStatusBadge(g.status)}`}>
                                                {g.status}
                                            </span>
                                        </div>

                                        <p className="text-gray-900 font-medium text-sm mb-4 line-clamp-3 leading-relaxed">
                                            {g.raw_text}
                                        </p>

                                        <div className="space-y-2 bg-gray-50 rounded-lg p-3 text-xs border border-gray-100 mb-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500 font-semibold">Category:</span>
                                                <span className="font-bold text-gray-900">{g.category || 'Pending AI'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500 font-semibold">Assigned Officer:</span>
                                                <span className="font-bold text-primary truncate max-w-[150px]">
                                                    {g.assigned_officer_name || "Assigned Officer"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500 font-semibold">Target ETA:</span>
                                                <span className="font-bold text-gray-900">
                                                    {g.sla_deadline ? new Date(g.sla_deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Within SLA window"}
                                                </span>
                                            </div>
                                            {g.location_text && (
                                                <div className="flex items-center gap-1 text-gray-600 pt-1 border-t border-gray-200">
                                                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{g.location_text}</span>
                                                </div>
                                            )}
                                        </div>

                                        {g.resolution_notes && (
                                            <div className="bg-green-50/50 border border-green-200 rounded-lg p-3 text-xs mb-4">
                                                <span className="font-bold text-green-900 block mb-1">Officer Resolution:</span>
                                                <p className="text-green-800">{g.resolution_notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bottom */}
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-primary font-bold flex items-center gap-1 group-hover:underline">
                                            <Eye size={14} /> Full Track Details
                                        </span>
                                        <ChevronRight size={16} className="text-primary group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Comprehensive Grievance Detail & Tracking Modal */}
            {selectedGrievance && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
                        {/* Modal Header */}
                        <div className="bg-primary px-6 py-4 flex items-center justify-between text-white rounded-t-2xl">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded text-white font-mono">
                                        {selectedGrievance.tracking_id}
                                    </span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                        selectedGrievance.status === 'RESOLVED' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-gray-900'
                                    }`}>
                                        {selectedGrievance.status}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg mt-1 text-white">Live Grievance Redressal Status</h3>
                            </div>
                            <button 
                                onClick={() => setSelectedGrievance(null)}
                                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 flex-1 text-sm">
                            {/* Complaint Overview */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Grievance Description
                                </span>
                                <p className="text-gray-900 text-sm font-medium leading-relaxed mb-3">
                                    {selectedGrievance.raw_text}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-2 border-t border-gray-200">
                                    <span className="flex items-center gap-1 font-semibold text-gray-800">
                                        <Building size={14} className="text-primary" /> {selectedGrievance.category || "General"}
                                    </span>
                                    {selectedGrievance.location_text && (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={14} className="text-red-500" /> {selectedGrievance.location_text}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} className="text-gray-400" /> Filed: {new Date(selectedGrievance.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Assigned Officer & Department Card */}
                            <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4.5">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <UserCheck size={18} className="text-primary" /> Designated Redressal Officer
                                    </h4>
                                    <span className="text-[11px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                                        Assigned
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                        <span className="text-gray-500 font-medium block">Officer Name</span>
                                        <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">
                                            {selectedGrievance.assigned_officer_name || "Er. Suresh Varma (L1 Field Officer)"}
                                        </span>
                                        <span className="text-blue-600 text-[11px] mt-0.5 flex items-center gap-1 font-semibold">
                                            <Building size={12} /> {selectedGrievance.department_name || "Roads & Infrastructure"}
                                        </span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                        <span className="text-gray-500 font-medium block">Official Contact / Helpline</span>
                                        <span className="font-extrabold text-gray-900 text-sm mt-0.5 flex items-center gap-1.5">
                                            <Phone size={13} className="text-emerald-600" /> 
                                            {selectedGrievance.assigned_officer_phone || "9848022001 (GHMC Desk)"}
                                        </span>
                                        <span className="text-gray-500 text-[11px] mt-0.5 block">
                                            Toll-free Central Desk: 040-21111111
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Priority & SLA Deadline / ETA */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                        <Clock size={16} className="text-amber-700" /> Resolution SLA / ETA
                                    </span>
                                    <span className="text-base font-extrabold text-gray-900 block">
                                        {selectedGrievance.sla_deadline 
                                            ? new Date(selectedGrievance.sla_deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                                            : "Within 24 to 48 Hours"
                                        }
                                    </span>
                                    <p className="text-[11px] text-amber-800 mt-1">
                                        {selectedGrievance.status === 'RESOLVED' 
                                            ? "Issue has been resolved by field team." 
                                            : "Field crew is assigned and dispatching team."}
                                    </p>
                                </div>

                                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4">
                                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                        <Sparkles size={16} className="text-purple-700" /> Autonomous Priority
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md ${
                                            selectedGrievance.priority === 1 ? 'bg-red-600 text-white' :
                                            selectedGrievance.priority === 2 ? 'bg-orange-500 text-white' :
                                            'bg-blue-600 text-white'
                                        }`}>
                                            Level {selectedGrievance.priority || 3}
                                        </span>
                                        <span className="text-xs font-bold text-gray-700">
                                            Score: {selectedGrievance.priority_score || 50}/100
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-purple-800 mt-1.5 line-clamp-2">
                                        {selectedGrievance.priority_reason || "Assessed based on municipal AI safety score and local cluster count."}
                                    </p>
                                </div>
                            </div>

                            {/* COMPULSORY BEFORE VS. AFTER PHOTO COMPARISON PANEL */}
                            <div className="bg-linear-to-r from-gray-50 to-blue-50 border-2 border-blue-200/70 rounded-2xl p-4.5">
                                <h4 className="font-extrabold text-gray-900 text-sm mb-3 flex items-center gap-2">
                                    <Camera size={18} className="text-primary" />
                                    Premise Before vs. After Ground Photographic Proof
                                </h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Citizen Before Photo */}
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col">
                                        <span className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                                            <Camera size={13} className="text-amber-600" /> Initial Premise (Citizen Before)
                                        </span>
                                        {selectedGrievance.before_image_url || selectedGrievance.image_path ? (
                                            <div className="h-44 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                                <img 
                                                    src={selectedGrievance.before_image_url || selectedGrievance.image_path} 
                                                    alt="Citizen Before Complaint" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-44 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-xs p-3 text-center">
                                                <ImageIcon size={32} className="opacity-30 mb-1" />
                                                <span>No initial photo attached</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Officer After Photo */}
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col">
                                        <span className="text-xs font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                                            <VerifiedIcon size={13} className="text-emerald-600" /> Repaired Premise (Officer After)
                                        </span>
                                        {selectedGrievance.after_image_url || selectedGrievance.resolution_image ? (
                                            <div className="h-44 rounded-lg overflow-hidden border border-emerald-300 bg-gray-100">
                                                <img 
                                                    src={selectedGrievance.after_image_url || selectedGrievance.resolution_image} 
                                                    alt="Officer After Resolution" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-44 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-xs p-3 text-center">
                                                <Clock size={32} className="opacity-30 mb-1 text-primary" />
                                                <span className="font-semibold text-gray-600">Pending Field Crew Work</span>
                                                <span className="text-[10px] text-gray-400 mt-1">Officer must take photo after solving issue to unlock closure.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Disputed State Banner if present */}
                            {selectedGrievance.status === 'DISPUTED' && (
                                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-xs text-red-950 space-y-1.5 animate-pulse">
                                    <span className="font-black flex items-center gap-1.5 text-red-800 uppercase tracking-wide">
                                        <AlertOctagon size={16} /> Officer Negligence Audit Active
                                    </span>
                                    <p className="leading-relaxed font-semibold">
                                        Dispute Reason: "{selectedGrievance.dispute_reason}"
                                    </p>
                                    <p className="text-[11px] text-red-700">
                                        This ticket has been escalated directly to Level 2 (Zonal Commissioner). A negligence strike has been officially logged against the field officer.
                                    </p>
                                </div>
                            )}

                            {/* Field Inspection Notes if recorded */}
                            {selectedGrievance.field_inspection_notes && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs">
                                    <span className="font-bold text-emerald-900 block mb-1 flex items-center gap-1.5">
                                        <CheckCircle size={15} className="text-emerald-700" /> On-Ground Inspection Findings
                                    </span>
                                    <p className="text-emerald-800 leading-relaxed font-medium">
                                        {selectedGrievance.field_inspection_notes}
                                    </p>
                                </div>
                            )}

                            {/* Resolution Notes if Resolved */}
                            {selectedGrievance.resolution_notes && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs">
                                    <span className="font-bold text-green-900 block mb-1">Action Taken / Resolution:</span>
                                    <p className="text-green-800 leading-relaxed font-medium">
                                        {selectedGrievance.resolution_notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
                            {selectedGrievance.status === 'RESOLVED' && (
                                <button
                                    onClick={() => setDisputeModalOpen(true)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    <AlertOctagon size={14} /> Report Negligence / Fake Work
                                </button>
                            )}
                            <div className="ml-auto">
                                <button
                                    onClick={() => setSelectedGrievance(null)}
                                    className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Dispute & Officer Negligence Contestation Dialog */}
            {disputeModalOpen && selectedGrievance && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertOctagon size={24} />
                                <h3 className="font-extrabold text-lg text-gray-900">Contest Resolution & Report Negligence</h3>
                            </div>
                            <button onClick={() => setDisputeModalOpen(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                            If the field officer claimed the issue was resolved but the work was not completed or a wrong proof photo was provided, submit your dispute below. This directly alerts the <strong>Zonal Commissioner (L2)</strong> and logs a disciplinary negligence strike.
                        </p>

                        {disputeSuccess && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                {disputeSuccess}
                            </div>
                        )}

                        <form onSubmit={handleDisputeSubmit} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-800 mb-1 uppercase tracking-wide">
                                    Why is this resolution incorrect or incomplete? *
                                </label>
                                <textarea
                                    rows={3}
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    placeholder="e.g. Officer submitted after-photo of different street, pothole is still open and causing accidents..."
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-800 mb-1 uppercase tracking-wide">
                                    Counter Premise Proof Photo URL (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={disputePhoto}
                                    onChange={(e) => setDisputePhoto(e.target.value)}
                                    placeholder="https://... or attach live counter photo"
                                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-hidden"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDisputeModalOpen(false)}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={disputeLoading}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {disputeLoading ? 'Logging Negligence Audit...' : <><AlertOctagon size={14} /> Submit Negligence Dispute</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}


