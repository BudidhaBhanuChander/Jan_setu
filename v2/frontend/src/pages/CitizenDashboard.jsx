import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import VoiceChatbot from '../components/VoiceChatbot';
import { 
    MessageSquare, FileText, Search, Plus, Star, MapPin, Phone, 
    CheckCircle2, Clock, AlertTriangle, ChevronRight, X, Camera, 
    Upload, ExternalLink, RefreshCw, Send, ArrowLeft, Home, 
    ThumbsUp, ShieldAlert, Sparkles, Navigation, Globe, Bell, 
    Check, Copy, CornerDownRight, MessageCircle, User, Lock, 
    Trash2, HelpCircle, Info, Download, ShieldCheck, Award, CloudRain,
    Wrench, Zap, Trash, Droplets, Building2, Trees, Bug
} from 'lucide-react';

const GHMC_CATEGORIES = [
    {
        name: 'Roads & Infrastructure Engineering',
        icon: 'Wrench',
        subcategories: [
            'Repairs to Road (Pot holes)',
            'Damaged Footpath / Pavement',
            'Water Logging on Carriage Way',
            'Missing / Broken Manhole Cover',
            'Desilting of Storm Water Drain (SWD)',
            'Road Widening & Median Repair'
        ]
    },
    {
        name: 'Electrical & Street Lighting',
        icon: 'Zap',
        subcategories: [
            'Non Glowing of Street Lights',
            'Flickering Street Light',
            'Exposed Electric Cable Hazard',
            'Damaged Electric Pole',
            'Street Light Glowing During Day'
        ]
    },
    {
        name: 'Sanitation & Solid Waste Management',
        icon: 'Trash',
        subcategories: [
            'Garbage Dump & Waste Cleansing',
            'Garbage Vulnerable Point (GVP) Clearance',
            'Overflowing DVP Dustbin',
            'Dead Animal Spot Clearance',
            'Public Toilet Unhygienic Maintenance'
        ]
    },
    {
        name: 'Drainage & Sewerage (HMWSSB / GHMC)',
        icon: 'Droplets',
        subcategories: [
            'Drainage & Sewage Overflow on Road',
            'Contaminated Drinking Water Supply',
            'Water Pipeline Burst / Leakage',
            'Low Pressure in Colony Pipeline',
            'Open Sump / Valve Hazard'
        ]
    },
    {
        name: 'Town Planning & Enforcement',
        icon: 'Building2',
        subcategories: [
            'Unauthorized / Illegal Construction',
            'Footpath Encroachment by Commercial Vendors',
            'Dilapidated Dangerous Building Hazard',
            'Illegal Flex Banner & Hoarding'
        ]
    },
    {
        name: 'Veterinary & Animal Husbandry',
        icon: 'Award',
        subcategories: [
            'Stray Dog Menace & Catching Request',
            'Dog Bite / Suspected Rabies Case',
            'Stray Cattle on Main Thoroughfare',
            'Monkey Menace in Residential Colony'
        ]
    },
    {
        name: 'Entomology & Vector Control',
        icon: 'Bug',
        subcategories: [
            'Anti-Larval Spray & Mosquito Fogging Request',
            'Dengue / Malaria Prevention Survey',
            'Stagnant Dirty Water Pool'
        ]
    },
    {
        name: 'Urban Biodiversity & DRF',
        icon: 'Trees',
        subcategories: [
            'Fallen Tree / Dangerous Branch Clearance',
            'Monsoon Inundation Emergency Pumpout',
            'Park Maintenance & Boundary Repair'
        ]
    }
];

const GHMC_ZONAL_OFFICES = [
    { zone: 'Charminar Zone', commissioner: 'Sri. K. Ashok Reddy, IAS', office: 'Sardar Mahal, Charminar', phone: '040-21111111', wards: 'Ward 1 to Ward 30' },
    { zone: 'Khairatabad Zone', commissioner: 'Smt. P. Anuradha, IAS', office: 'Khairatabad Circle Office', phone: '040-21111112', wards: 'Ward 31 to Ward 60' },
    { zone: 'Secunderabad Zone', commissioner: 'Sri. M. Venkat Rao', office: 'Opp. City Civil Court, West Marredpally', phone: '040-21111113', wards: 'Ward 61 to Ward 90' },
    { zone: 'Serilingampally Zone', commissioner: 'Sri. B. Srinivas Reddy', office: 'Gachibowli Main Road', phone: '040-21111114', wards: 'Ward 91 to Ward 115' },
    { zone: 'Kukatpally Zone', commissioner: 'Sri. V. Prashanth', office: 'KPHB Colony Main Road', phone: '040-21111115', wards: 'Ward 116 to Ward 130' },
    { zone: 'LB Nagar Zone', commissioner: 'Sri. G. Ramesh', office: 'Near Kamineni Hospital, LB Nagar', phone: '040-21111116', wards: 'Ward 131 to Ward 150' }
];

export default function CitizenDashboard() {
    const { user, logout } = useContext(AuthContext);
    
    // Active View Tab:
    // 'dashboard' | 'lodge_ghmc' | 'check_status' | 'monsoon_emergency' | 'appeals' | 'activity' | 'edit_profile' | 'change_password' | 'prajavani'
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Language: 'en' | 'te' | 'hi'
    const [lang, setLang] = useState('en');

    const [grievances, setGrievances] = useState([]);
    const [nodalOfficers, setNodalOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedGrievance, setSelectedGrievance] = useState(null);

    // Live session countdown timer (29:29)
    const [sessionSeconds, setSessionSeconds] = useState(1769);

    // GHMC Informational Modals
    const [zonalModalOpen, setZonalModalOpen] = useState(false);
    const [charterModalOpen, setCharterModalOpen] = useState(false);
    const [appealModalOpen, setAppealModalOpen] = useState(false);
    const [mobileAppModalOpen, setMobileAppModalOpen] = useState(false);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [aboutModalOpen, setAboutModalOpen] = useState(false);
    const [faqModalOpen, setFaqModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Lodge GHMC Grievance Form State (Matching MyCURE GHMC fields)
    const [ghmcForm, setGhmcForm] = useState({
        userName: user?.name || 'Budidha Bhanu Chander',
        mobileNo: user?.phone || '8978053027',
        locationType: 'current', // 'current' | 'map'
        category: 'Roads & Infrastructure Engineering',
        subcategory: 'Repairs to Road (Pot holes)',
        landmark: 'Near by BODRAI, Chilkanagar',
        description: 'we citizens are facing difficulty to cross the path during heavy rains due to deep potholes and loose gravel on the main road.',
        latitude: 17.3850,
        longitude: 78.4867,
        geohash: 'tepf29b'
    });
    const [ghmcPhotos, setGhmcPhotos] = useState([null, null, null]);
    const [ghmcPhotoPreviews, setGhmcPhotoPreviews] = useState(['', '', '']);
    const [submittingGhmc, setSubmittingGhmc] = useState(false);
    const [ghmcSuccessMessage, setGhmcSuccessMessage] = useState('');

    // Monsoon Emergency Drive Form State
    const [monsoonForm, setMonsoonForm] = useState({
        userName: user?.name || 'Budidha Bhanu Chander',
        mobileNo: user?.phone || '8978053027',
        hazardType: 'Inundation / Heavy Waterlogging',
        landmark: 'Chilkanagar Junction, Uppal',
        severity: 'EMERGENCY_CRITICAL',
        description: 'Severe waterlogging with water entering ground floor residences. Drain overflow reported.'
    });
    const [submittingMonsoon, setSubmittingMonsoon] = useState(false);
    const [monsoonSuccessMessage, setMonsoonSuccessMessage] = useState('');

    // Edit Profile State
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        ward_colony: user?.ward_colony || 'Ward 21, Chilkanagar',
        preferred_language: user?.preferred_language || 'en'
    });
    const [profileUpdating, setProfileUpdating] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');

    // Change Password State
    const [pwdForm, setPwdForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pwdUpdating, setPwdUpdating] = useState(false);
    const [pwdSuccess, setPwdSuccess] = useState('');

    // Rating & Feedback Modal State (Screenshot 2026-09-02 172434.png)
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [ratingGrievanceId, setRatingGrievanceId] = useState('');
    const [starRating, setStarRating] = useState(1);
    const [ratingComments, setRatingComments] = useState('');
    const [captchaCode, setCaptchaCode] = useState('DQ8Ukh');
    const [userCaptcha, setUserCaptcha] = useState('');
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    // SMS Notifications Drawer State (WhatsApp Image 5.44.23 PM (1))
    const [smsDrawerOpen, setSmsDrawerOpen] = useState(false);
    const [smsList, setSmsList] = useState([
        {
            sender: 'AD-GHMCHY-S',
            time: '5:34 pm',
            text: '3130 is the OTP for verification in My GHMC Mobile App. Pls do not share with anyone - GHMC'
        },
        {
            sender: 'AD-GHMCHY-S',
            time: '5:43 pm',
            text: 'Dear Sir/ Madam, Swachh Namaskaram!! We regret the inconvenience caused. Your issue will be resolved shortly. Ref ID : 209266109401 - GHMC'
        }
    ]);

    // Citizen Activity Log
    const [activityLog, setActivityLog] = useState([
        { time: 'Just now', action: 'Accessed My GHMC Citizen Grievance Portal' },
        { time: 'Today 09:48 AM', action: 'Authentication token verified for Ward 21 session' },
        { time: 'Yesterday 05:43 PM', action: 'Official SMS alert dispatched from AD-GHMCHY-S' }
    ]);

    // Live session countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setSessionSeconds(prev => (prev > 0 ? prev - 1 : 1800));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatSessionTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const fetchGrievances = async () => {
        if (!user?.id) return;
        try {
            const res = await api.get(`/grievances?citizen_id=${user.id}`);
            setGrievances(res.data || []);
        } catch (error) {
            console.error("Failed to fetch grievances", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNodalOfficers = async () => {
        try {
            const res = await api.get('/admin/officers');
            setNodalOfficers(res.data || []);
        } catch (e) {
            console.error('Failed to load nodal officers:', e);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchGrievances();
            fetchNodalOfficers();
            const interval = setInterval(fetchGrievances, 6000);
            
            const handleCreated = (e) => {
                fetchGrievances();
                const newId = e.detail?.tracking_id || '209266' + Math.floor(100000 + Math.random() * 900000);
                setSmsList(prev => [
                    ...prev,
                    {
                        sender: 'AD-GHMCHY-S',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        text: `Dear Sir/ Madam, Swachh Namaskaram!! We regret the inconvenience caused. Your issue will be resolved shortly. Ref ID : ${newId} - GHMC`
                    }
                ]);
                setActivityLog(prev => [
                    { time: 'Just now', action: `GHMC Complaint registered: ${newId}` },
                    ...prev
                ]);
            };
            window.addEventListener('grievance_created', handleCreated);

            return () => {
                clearInterval(interval);
                window.removeEventListener('grievance_created', handleCreated);
            };
        }
    }, [user?.id]);

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                phone: user.phone || '',
                email: user.email || '',
                ward_colony: user.ward_colony || 'Ward 21, Chilkanagar',
                preferred_language: user.preferred_language || 'en'
            });
            setGhmcForm(prev => ({
                ...prev,
                userName: user.name || prev.userName,
                mobileNo: user.phone || prev.mobileNo
            }));
        }
    }, [user]);

    // Handle GHMC Photo Selection
    const handlePhotoSelect = (index, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const newPhotos = [...ghmcPhotos];
        newPhotos[index] = file;
        setGhmcPhotos(newPhotos);

        const reader = new FileReader();
        reader.onloadend = () => {
            const newPreviews = [...ghmcPhotoPreviews];
            newPreviews[index] = reader.result;
            setGhmcPhotoPreviews(newPreviews);
        };
        reader.readAsDataURL(file);
    };

    // Submit GHMC Grievance Form (Full Desktop Web Format inspired by MyCURE)
    const handleGhmcFormSubmit = async (e) => {
        e.preventDefault();
        if (!ghmcForm.subcategory) {
            alert('Please select a subcategory first to capture photos and submit');
            return;
        }
        if (!ghmcForm.description.trim()) {
            alert('Please enter grievance description');
            return;
        }
        if (!ghmcPhotoPreviews[0]) {
            alert('Compulsory Photographic Proof required. Please click camera box #1 to capture/attach premise evidence.');
            return;
        }

        setSubmittingGhmc(true);
        try {
            const payload = {
                raw_text: `${ghmcForm.subcategory}: ${ghmcForm.description}. Landmark: ${ghmcForm.landmark}`,
                location_text: ghmcForm.landmark + ', Ward 21, Hyderabad',
                latitude: ghmcForm.latitude,
                longitude: ghmcForm.longitude,
                geohash: ghmcForm.geohash,
                before_image_url: ghmcPhotoPreviews[0],
                category: ghmcForm.category.includes('Road') ? 'Roads & Infrastructure' : ghmcForm.category.includes('Light') ? 'Electrical' : ghmcForm.category.includes('Sanitation') ? 'Sanitation' : 'Public Health',
                citizen_name: ghmcForm.userName,
                citizen_phone: ghmcForm.mobileNo,
                citizen_email: user?.email || 'citizen@ghmc.gov.in',
                citizen_id: user?.id,
                channel: 'GHMC_WEB_PORTAL'
            };

            const res = await api.post('/grievances/', payload);
            const created = res.data;
            setGhmcSuccessMessage(`🎉 GHMC Grievance registered successfully! Ref ID: ${created.tracking_id}`);
            fetchGrievances();

            // Append SMS
            setSmsList(prev => [
                ...prev,
                {
                    sender: 'AD-GHMCHY-S',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    text: `Dear Sir/ Madam, Swachh Namaskaram!! We regret the inconvenience caused. Your issue will be resolved shortly. Ref ID : ${created.tracking_id} - GHMC`
                }
            ]);

            setActivityLog(prev => [
                { time: 'Just now', action: `Submitted GHMC Complaint: ${created.tracking_id}` },
                ...prev
            ]);

            setTimeout(() => {
                setActiveTab('check_status');
                setGhmcSuccessMessage('');
            }, 1800);
        } catch (err) {
            console.error('GHMC submission error:', err);
            alert('Submission failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSubmittingGhmc(false);
        }
    };

    // Submit Monsoon Emergency Drive Form
    const handleMonsoonSubmit = async (e) => {
        e.preventDefault();
        setSubmittingMonsoon(true);
        try {
            const payload = {
                raw_text: `[MONSOON EMERGENCY DRF] Hazard: ${monsoonForm.hazardType} | Location: ${monsoonForm.landmark} | Details: ${monsoonForm.description}`,
                location_text: monsoonForm.landmark + ', Hyderabad (Emergency DRF Inundation)',
                category: 'Roads & Infrastructure',
                severity: 'CRITICAL',
                citizen_name: monsoonForm.userName,
                citizen_phone: monsoonForm.mobileNo,
                citizen_id: user?.id,
                channel: 'GHMC_MONSOON_DRF'
            };
            const res = await api.post('/grievances/', payload);
            const created = res.data;
            setMonsoonSuccessMessage(`🚨 Emergency Alert Dispatched to GHMC DRF! Ticket ID: ${created.tracking_id}`);
            fetchGrievances();
            setTimeout(() => {
                setActiveTab('check_status');
                setMonsoonSuccessMessage('');
            }, 1800);
        } catch (err) {
            alert('Emergency dispatch failed: ' + err.message);
        } finally {
            setSubmittingMonsoon(false);
        }
    };

    // Profile Submit
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileUpdating(true);
        try {
            await api.patch('/auth/me', profileForm);
            setProfileSuccess('Profile updated successfully!');
            setTimeout(() => setProfileSuccess(''), 3000);
        } catch (err) {
            alert('Failed to update profile: ' + (err.response?.data?.detail || err.message));
        } finally {
            setProfileUpdating(false);
        }
    };

    // Password Submit
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            alert('New password and confirm password do not match');
            return;
        }
        if (pwdForm.newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }
        setPwdUpdating(true);
        setTimeout(() => {
            setPwdSuccess('Password changed successfully!');
            setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPwdUpdating(false);
            setTimeout(() => setPwdSuccess(''), 3000);
        }, 800);
    };

    const refreshCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz';
        let res = '';
        for (let i = 0; i < 6; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptchaCode(res);
    };

    const handleRatingSubmit = (e) => {
        e.preventDefault();
        if (userCaptcha.trim().toLowerCase() !== captchaCode.toLowerCase()) {
            alert('Security code does not match the image. Please try again.');
            refreshCaptcha();
            return;
        }
        setRatingSubmitted(true);
        setTimeout(() => {
            alert('Thank you! Your GHMC citizen feedback has been recorded.');
            setRatingModalOpen(false);
            setRatingSubmitted(false);
            setUserCaptcha('');
            setRatingComments('');
        }, 800);
    };

    // Filter grievances
    const filteredGrievances = grievances.filter(g => {
        const matchesSearch = !searchQuery || 
            (g.tracking_id && g.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (g.category && g.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (g.raw_text && g.raw_text.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (statusFilter === 'ALL') return matchesSearch;
        if (statusFilter === 'PENDING') return matchesSearch && (g.status === 'NEW' || g.status === 'ASSIGNED' || g.status === 'TEAM_DISPATCHED');
        if (statusFilter === 'IN_PROGRESS') return matchesSearch && (g.status === 'ON_SITE_INSPECTION' || g.status === 'WORK_IN_PROGRESS');
        if (statusFilter === 'COMPLETED') return matchesSearch && (g.status === 'RESOLVED' || g.status === 'CLOSED');
        return matchesSearch;
    });

    const pendingCount = grievances.filter(g => g.status !== 'RESOLVED' && g.status !== 'CLOSED').length;
    const closedCount = grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length;
    const appealsList = grievances.filter(g => g.status === 'DISPUTED' || g.escalation_level >= 2);

    return (
        <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans">
            
            {/* 1. TOPMOST GOVERNMENT OF TELANGANA & GHMC MAROON BANNER */}
            <header className="bg-[#6b0033] text-white shadow-md z-30">
                {/* Upper Sub-Header with Ministries & Utility Links */}
                <div className="w-full px-4 lg:px-8 py-1.5 flex flex-wrap items-center justify-between text-xs border-b border-white/10 opacity-95">
                    <div className="flex items-center gap-3">
                        <span>తెలంగాణ ప్రభుత్వం <strong>Government of Telangana</strong></span>
                        <span className="opacity-50">|</span>
                        <span>పురపాలక పరిపాలన పట్టణాభివృద్ధి శాఖ <strong>Municipal Administration & Urban Development (MA&UD)</strong></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSmsDrawerOpen(true)} className="hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold">
                            <Bell size={12} className="text-amber-400" /> SMS Alerts ({smsList.length})
                        </button>
                        <span className="opacity-50">|</span>
                        <button onClick={() => setContactModalOpen(true)} className="hover:underline cursor-pointer">GHMC Helpline: 040-21111111</button>
                        <span className="opacity-50">|</span>
                        <button onClick={() => setAboutModalOpen(true)} className="hover:underline cursor-pointer">About GHMC</button>
                        <span className="opacity-50">|</span>
                        <button onClick={() => setFaqModalOpen(true)} className="hover:underline cursor-pointer">Citizen FAQs</button>
                    </div>
                </div>

                {/* Main GHMC Municipal Branding Banner */}
                <div className="w-full px-4 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img 
                            src="/assets/ashoka_emblem.png" 
                            alt="Emblem of India" 
                            className="h-14 w-auto brightness-200 invert object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                            <div className="text-sm text-amber-200 font-bold tracking-wide">
                                గ్రేటర్ హైదరాబాద్ మున్సిపల్ కార్పొరేషన్ (GHMC)
                            </div>
                            <div className="text-base md:text-xl font-black uppercase tracking-wide">
                                GREATER HYDERABAD MUNICIPAL CORPORATION
                            </div>
                            <div className="text-xs text-gray-200 font-medium">
                                Government of Telangana — Autonomous Civic Grievance Redressal System
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* MY GHMC / JAN SETU Logo Badge */}
                        <div className="text-center">
                            <div className="bg-emerald-800 text-white font-black px-4 py-1 rounded-lg text-base tracking-wider border border-emerald-600 shadow-inner flex items-center gap-1.5 justify-center">
                                <span>MY GHMC</span>
                                <span className="bg-amber-400 text-gray-900 text-[10px] px-1.5 py-0.5 rounded font-extrabold">JAN SETU</span>
                            </div>
                            <div className="text-[9px] text-gray-200 mt-0.5 font-medium">
                                Citizen Civic Services & Grievance Redressal
                            </div>
                        </div>

                        {/* Live Session Timer (Clickable to reset/refresh) */}
                        <div 
                            onClick={() => { setSessionSeconds(1800); alert('GHMC Session refreshed for 30 minutes.'); }}
                            className="hidden sm:flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-mono cursor-pointer hover:bg-black/40 transition-colors"
                            title="Click to refresh GHMC session timer"
                        >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="font-bold text-emerald-300">Session: {formatSessionTime(sessionSeconds)}</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Navigation Bar (Deep Maroon) with 100% Functional GHMC Buttons */}
                <div className="bg-[#560029] border-t border-white/10 px-4 py-2">
                    <div className="w-full px-4 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-sm font-bold">
                        <div className="flex items-center gap-4 lg:gap-6">
                            <button 
                                onClick={() => setActiveTab('check_status')} 
                                className={`hover:text-amber-300 cursor-pointer transition-colors ${activeTab === 'check_status' ? 'text-amber-300 font-black underline' : ''}`}
                            >
                                Track Grievance Status
                            </button>
                            <button 
                                onClick={() => setZonalModalOpen(true)} 
                                className="hover:text-amber-300 cursor-pointer transition-colors"
                            >
                                GHMC 6 Zonal Offices
                            </button>
                            <button 
                                onClick={() => setCharterModalOpen(true)} 
                                className="hover:text-amber-300 cursor-pointer transition-colors"
                            >
                                Citizen Charter & SLAs
                            </button>
                            <button 
                                onClick={() => setActiveTab('lodge_ghmc')} 
                                className={`hover:text-amber-300 cursor-pointer transition-colors ${activeTab === 'lodge_ghmc' ? 'text-amber-300 font-black underline' : ''}`}
                            >
                                Lodge Civic Complaint
                            </button>
                            <button 
                                onClick={() => setAppealModalOpen(true)} 
                                className="hover:text-amber-300 cursor-pointer transition-colors"
                            >
                                First Appellate Authority (Zonal Commissioners)
                            </button>
                            <button 
                                onClick={() => setMobileAppModalOpen(true)} 
                                className="hover:text-amber-300 cursor-pointer transition-colors flex items-center gap-1"
                            >
                                <span>My GHMC App</span>
                                <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded text-[10px]">CGG</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('prajavani')} 
                                className={`hover:text-amber-300 cursor-pointer flex items-center gap-1 transition-colors ${activeTab === 'prajavani' ? 'text-amber-300 font-black underline' : ''}`}
                            >
                                <span>ప్రజావాణి AI</span>
                                <span className="bg-[#f37021] text-white px-1.5 py-0.2 rounded text-[10px]">Voice Bot</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded">
                                <Globe size={13} className="text-amber-300" />
                                <span className="opacity-80">Language:</span>
                                <select 
                                    value={lang} 
                                    onChange={(e) => setLang(e.target.value)}
                                    className="bg-transparent text-white font-bold outline-none cursor-pointer"
                                >
                                    <option value="en" className="text-gray-900">English</option>
                                    <option value="te" className="text-gray-900">తెలుగు (Telugu)</option>
                                    <option value="hi" className="text-gray-900">हिंदी (Hindi)</option>
                                </select>
                            </div>

                            <button 
                                onClick={() => setActiveTab('edit_profile')}
                                className="hover:text-amber-200 cursor-pointer"
                                title="Click to view citizen profile"
                            >
                                Citizen: <strong className="text-amber-200">{user?.name || 'Budidha Bhanu Chander'}</strong>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. MAIN APPLICATION WORKSPACE WITH FULL WEB FORMAT */}
            <div className="flex-1 w-full px-4 lg:px-8 py-4 flex flex-col lg:flex-row gap-6">

                {/* Left Navy Sidebar with GHMC Navigation */}
                <aside className="w-full lg:w-72 bg-[#0b2545] text-white rounded-2xl p-5 shadow-md flex flex-col justify-between shrink-0">
                    <div className="space-y-1.5">
                        <button 
                            onClick={() => setActiveTab('dashboard')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'dashboard' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <FileText size={22} /> GHMC Command Dashboard
                        </button>
                        <button 
                            onClick={() => setActiveTab('check_status')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'check_status' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <Clock size={22} /> Check Status & 5-Step Tracker
                        </button>
                        <button 
                            onClick={() => setActiveTab('lodge_ghmc')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'lodge_ghmc' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <Plus size={22} /> Lodge GHMC Civic Grievance
                        </button>
                        <button 
                            onClick={() => setActiveTab('monsoon_emergency')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'monsoon_emergency' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <CloudRain size={22} className="text-cyan-400" /> Monsoon Emergency & DRF Drive
                        </button>
                        <button 
                            onClick={() => setActiveTab('appeals')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                activeTab === 'appeals' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={22} /> Zonal Commissioner Appeals (L2)
                            </div>
                            {appealsList.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {appealsList.length}
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={() => setActiveTab('activity')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'activity' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <Clock size={22} /> My Ward & Colony Activity
                        </button>
                        <button 
                            onClick={() => setActiveTab('edit_profile')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'edit_profile' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <User size={22} /> Citizen Profile & Ward Settings
                        </button>
                        <button 
                            onClick={() => setActiveTab('change_password')} 
                            className={`w-full text-left px-3.5 py-3.5 px-4 rounded-xl text-base font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'change_password' 
                                    ? 'bg-blue-900/80 border-l-4 border-amber-400 text-amber-200 shadow-xs' 
                                    : 'hover:bg-white/10 text-gray-200'
                            }`}
                        >
                            <Lock size={22} /> Change Password
                        </button>
                        <button 
                            onClick={() => setDeleteModalOpen(true)} 
                            className="w-full text-left px-3.5 py-3.5 px-4 rounded-xl hover:bg-white/10 text-base text-gray-200 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            <Trash2 size={22} /> Account Privacy Notice
                        </button>
                        <button 
                            onClick={logout} 
                            className="w-full text-left px-3.5 py-3.5 px-4 rounded-xl hover:bg-red-500/20 text-base text-amber-300 font-black flex items-center gap-2 transition-colors font-black cursor-pointer pt-2"
                        >
                            <X size={22} /> Sign out
                        </button>
                    </div>

                    {/* Bottom Praja Vani AI Promo Banner (GHMC Praja Vani) */}
                    <div 
                        onClick={() => setActiveTab('prajavani')} 
                        className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 text-gray-900 rounded-xl p-3 shadow-md border border-amber-200 cursor-pointer hover:scale-[1.02] transition-transform"
                        title="Click to talk to GHMC Praja Vani AI AI Chatbot"
                    >
                        <div className="flex items-center gap-3">
                            <img 
                                src="/assets/prajavani_ai.png" 
                                alt="Praja Vani AI" 
                                className="w-12 h-12 rounded-full object-cover border-2 border-orange-400 shrink-0"
                            />
                            <div>
                                <div className="text-[11px] font-bold text-[#b7410e] leading-tight">
                                    మాట్లాడి మీ సమస్యను చెప్పండి
                                </div>
                                <div className="text-xs font-black text-[#962e00] mt-0.5">
                                    GHMC Praja Vani Voice AI
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Right Main Content Panel */}
                <main className="flex-1 flex flex-col gap-6 overflow-hidden">

                    {/* ========================================================================= */}
                    {/* TAB 1: GHMC CIVIC DASHBOARD */}
                    {/* ========================================================================= */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* 3 Large Colorful Stat KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div 
                                    onClick={() => { setActiveTab('check_status'); setStatusFilter('ALL'); }}
                                    className="bg-[#f37a1f] text-white rounded-2xl p-7 shadow-md flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all"
                                >
                                    <div>
                                        <div className="text-5xl lg:text-6xl font-black">{grievances.length}</div>
                                        <div className="text-sm lg:text-base font-extrabold uppercase tracking-wide mt-2 opacity-95">
                                            Total GHMC Grievances Logged
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white">
                                        <FileText size={36} />
                                    </div>
                                </div>

                                <div 
                                    onClick={() => { setActiveTab('check_status'); setStatusFilter('PENDING'); }}
                                    className="bg-[#2e7d32] text-white rounded-2xl p-7 shadow-md flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all"
                                >
                                    <div>
                                        <div className="text-5xl lg:text-6xl font-black">{pendingCount}</div>
                                        <div className="text-sm lg:text-base font-extrabold uppercase tracking-wide mt-2 opacity-95">
                                            Complaints In-Process / Dispatched
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white">
                                        <Clock size={36} />
                                    </div>
                                </div>

                                <div 
                                    onClick={() => { setActiveTab('check_status'); setStatusFilter('COMPLETED'); }}
                                    className="bg-[#d32f2f] text-white rounded-2xl p-7 shadow-md flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all"
                                >
                                    <div>
                                        <div className="text-5xl lg:text-6xl font-black">{closedCount}</div>
                                        <div className="text-sm lg:text-base font-extrabold uppercase tracking-wide mt-2 opacity-95">
                                            Attended & Resolved Complaints
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white">
                                        <CheckCircle2 size={36} />
                                    </div>
                                </div>
                            </div>

                            {/* Grievance Table Container */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-lg font-black text-gray-900 tracking-tight">GHMC Grievance Registry</h2>
                                        <p className="text-xs text-gray-500">Live registry of civic complaints across Hyderabad wards and circles.</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search tracking ID / wing..."
                                                className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-blue-500 w-48"
                                            />
                                            <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
                                        </div>

                                        <button 
                                            onClick={() => setActiveTab('lodge_ghmc')}
                                            className="px-3.5 py-1.5 bg-[#f37021] hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                        >
                                            <Plus size={14} /> Lodge Complaint
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100/80 text-gray-800 font-extrabold border-y border-gray-200 text-sm">
                                                <th className="py-2.5 px-3">Sn.</th>
                                                <th className="py-2.5 px-3">Tracking ID</th>
                                                <th className="py-2.5 px-3">Grievance Date</th>
                                                <th className="py-2.5 px-3">GHMC Category & Issue</th>
                                                <th className="py-2.5 px-3">Current Status</th>
                                                <th className="py-2.5 px-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredGrievances.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-10 text-gray-400 font-medium">
                                                        No complaints registered yet. Click 'Lodge Civic Complaint' to report an issue.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredGrievances.map((g, index) => (
                                                    <tr key={g.id || index} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="py-3 px-3 font-semibold text-gray-500">{index + 1}</td>
                                                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{g.tracking_id}</td>
                                                        <td className="py-3 px-3 text-gray-600">
                                                            {g.created_at ? new Date(g.created_at).toLocaleString() : '02-AUG-2026 09:48:50'}
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-800 max-w-xs truncate font-medium">{g.raw_text}</td>
                                                        <td className="py-3 px-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                                g.status === 'RESOLVED' || g.status === 'CLOSED'
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : g.status === 'DISPUTED'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {g.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            <button 
                                                                onClick={() => { setSelectedGrievance(g); setActiveTab('check_status'); }}
                                                                className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-md transition-colors cursor-pointer"
                                                            >
                                                                View Status
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: LODGE GHMC CIVIC GRIEVANCE (FULL WEB FORMAT INSPIRED BY MyCURE) */}
                    {/* ========================================================================= */}
                    {activeTab === 'lodge_ghmc' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        <Plus className="text-[#f37021]" /> Lodge GHMC Civic Grievance
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Report civic infrastructure defects (potholes, street lights, sanitation, drainage, stray dogs).
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('dashboard')}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                    Back to Dashboard
                                </button>
                            </div>

                            {ghmcSuccessMessage && (
                                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl text-sm font-bold animate-fade-in">
                                    {ghmcSuccessMessage}
                                </div>
                            )}

                            <form onSubmit={handleGhmcFormSubmit} className="space-y-6">
                                {/* Citizen Details & Location Toggle */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div>
                                        <label className="block text-base font-extrabold text-gray-900 mb-2">User Name *</label>
                                        <input 
                                            type="text" 
                                            value={ghmcForm.userName} 
                                            onChange={(e) => setGhmcForm(prev => ({ ...prev, userName: e.target.value }))}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold outline-none focus:border-blue-500 rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-base font-extrabold text-gray-900 mb-2">Mobile Number *</label>
                                        <input 
                                            type="text" 
                                            value={ghmcForm.mobileNo} 
                                            onChange={(e) => setGhmcForm(prev => ({ ...prev, mobileNo: e.target.value }))}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold outline-none focus:border-blue-500 rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-base font-extrabold text-gray-900 mb-2">GPS Location Mode</label>
                                        <div className="flex gap-2 pt-1">
                                            <label className={`flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                                ghmcForm.locationType === 'current' 
                                                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs' 
                                                    : 'bg-white border-gray-200 text-gray-600'
                                            }`}>
                                                <input 
                                                    type="radio" 
                                                    name="locType" 
                                                    checked={ghmcForm.locationType === 'current'}
                                                    onChange={() => setGhmcForm(prev => ({ ...prev, locationType: 'current' }))}
                                                    className="accent-[#f37021]"
                                                />
                                                <span>Current GPS</span>
                                            </label>

                                            <label className={`flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                                ghmcForm.locationType === 'map' 
                                                    ? 'bg-purple-100 border-purple-400 text-purple-900 shadow-2xs' 
                                                    : 'bg-white border-gray-200 text-gray-600'
                                            }`}>
                                                <input 
                                                    type="radio" 
                                                    name="locType" 
                                                    checked={ghmcForm.locationType === 'map'}
                                                    onChange={() => setGhmcForm(prev => ({ ...prev, locationType: 'map' }))}
                                                    className="accent-purple-600"
                                                />
                                                <span>GHMC Map</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Category & Subcategory Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-base font-extrabold text-gray-900 mb-2">* Select GHMC Category</label>
                                        <select 
                                            value={ghmcForm.category}
                                            onChange={(e) => {
                                                const cat = e.target.value;
                                                const sub = GHMC_CATEGORIES.find(c => c.name === cat)?.subcategories[0] || '';
                                                setGhmcForm(prev => ({ ...prev, category: cat, subcategory: sub }));
                                            }}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3.5 text-base font-bold text-gray-900 outline-none focus:border-blue-500 cursor-pointer rounded-xl"
                                        >
                                            {GHMC_CATEGORIES.map((c) => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-base font-extrabold text-gray-900 mb-2">* Select Subcategory</label>
                                        <select 
                                            value={ghmcForm.subcategory}
                                            onChange={(e) => setGhmcForm(prev => ({ ...prev, subcategory: e.target.value }))}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3.5 text-base font-bold text-gray-900 outline-none focus:border-blue-500 cursor-pointer rounded-xl"
                                        >
                                            <option value="">-- Choose Subcategory --</option>
                                            {(GHMC_CATEGORIES.find(c => c.name === ghmcForm.category)?.subcategories || []).map((sub) => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Landmark */}
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Landmark *</label>
                                    <input 
                                        type="text" 
                                        value={ghmcForm.landmark} 
                                        onChange={(e) => setGhmcForm(prev => ({ ...prev, landmark: e.target.value }))}
                                        placeholder="e.g. NEAR BODRAI, Uppal Main Road, Chilkanagar"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold outline-none focus:border-blue-500 rounded-xl"
                                        required
                                    />
                                </div>

                                {/* Detailed Description */}
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Enter Description *</label>
                                    <textarea 
                                        rows={4}
                                        value={ghmcForm.description} 
                                        onChange={(e) => setGhmcForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="we citizens are facing difficulty to cross the path during heavy rains..."
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-xs outline-none focus:border-blue-500 resize-none font-medium"
                                        required
                                    />
                                </div>

                                {/* 3 Circular Photographic Evidence Buttons (Exact match to MyCURE GHMC WhatsApp Image 5.44.23 PM) */}
                                <div>
                                    <label className="block text-base font-black text-gray-950 mb-2">
                                        Attach Premise Proof (3 Photos) * <span className="text-red-500">(At least 1 photo required)</span>
                                    </label>
                                    <p className="text-[11px] text-gray-500 mb-3">
                                        GHMC bylaws require photographic evidence before dispatching field engineering teams.
                                    </p>

                                    <div className="flex items-center gap-6 py-2">
                                        {[0, 1, 2].map((idx) => (
                                            <label key={idx} className="cursor-pointer group flex flex-col items-center">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={(e) => handlePhotoSelect(idx, e)}
                                                />
                                                {ghmcPhotoPreviews[idx] ? (
                                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md relative group-hover:scale-105 transition-transform">
                                                        <img src={ghmcPhotoPreviews[idx]} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white rounded-full p-1 shadow-xs">
                                                            <Check size={12} strokeWidth={3} />
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#f37021] to-[#ff914d] text-white flex flex-col items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                                        <Camera size={32} />
                                                    </div>
                                                )}
                                                <span className="text-xs font-black text-gray-800 mt-2">
                                                    {idx === 0 ? 'Photo 1 (Required)' : `Photo ${idx + 1} (Optional)`}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Submit Button (Orange Pill Button matching MyCURE) */}
                                <div className="pt-4 flex items-center justify-between border-t border-gray-200">
                                    <button 
                                        type="submit"
                                        disabled={submittingGhmc}
                                        className="px-12 py-4 bg-gradient-to-r from-[#f37021] to-[#e65100] text-white font-black text-base rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
                                    >
                                        {submittingGhmc ? 'Submitting to GHMC...' : 'SUBMIT COMPLAINT TO GHMC'}
                                    </button>
                                    
                                    <div className="text-[11px] text-gray-500 font-semibold">
                                        Rights Reserved @MyCURE GHMC | Powered by CGG
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: CHECK STATUS & 5-STEP MILESTONE TRACKER (FULL WEB FORMAT) */}
                    {/* ========================================================================= */}
                    {activeTab === 'check_status' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                            <Clock className="text-[#009688]" /> GHMC Grievance Status & 5-Step Milestones
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Track real-time resolution progress from initial registration through field officer attendance.
                                        </p>
                                    </div>

                                    {/* Filter pills matching MyCURE */}
                                    <div className="flex items-center gap-2 overflow-x-auto text-xs">
                                        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setStatusFilter(tab)}
                                                className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all ${
                                                    statusFilter === tab 
                                                        ? 'bg-[#009688] text-white shadow-xs' 
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Full Width Desktop Cards (Exact match to MyCURE WhatsApp Image 5.49.23 PM (1)) */}
                                <div className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                                    {filteredGrievances.length === 0 ? (
                                        <div className="text-center py-16 text-gray-400 font-medium">
                                            No complaints found in this status category.
                                        </div>
                                    ) : (
                                        filteredGrievances.map((ticket, i) => (
                                            <div key={ticket.id || i} className="border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white">
                                                {/* Header Banner (Teal) */}
                                                <div className="bg-[#009688] text-white px-6 py-2.5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3 font-extrabold text-xs tracking-wide">
                                                        <span>▲ {ticket.category || 'Electrical'}</span>
                                                        <span className="opacity-60">|</span>
                                                        <span>ID: {ticket.tracking_id}</span>
                                                    </div>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                                                            ? 'bg-emerald-100 text-emerald-900'
                                                            : ticket.status === 'DISPUTED'
                                                            ? 'bg-red-100 text-red-900'
                                                            : 'bg-white text-[#009688]'
                                                    }`}>
                                                        {ticket.status}
                                                    </span>
                                                </div>

                                                {/* Body Grid */}
                                                <div className="p-6 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 text-base">
                                                        <div>
                                                            <span className="text-gray-500 font-bold block mb-1.5 text-sm">Subcategory Name</span>
                                                            <span className="font-extrabold text-gray-900">{ticket.sub_category || 'Non Glowing of Street Lights'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 font-bold block mb-1.5 text-sm">Grievance Date</span>
                                                            <span className="font-semibold text-gray-800">
                                                                {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '02-AUG-2026 09:48:50'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 font-bold block mb-1.5 text-sm">Assigned to Field Officer</span>
                                                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                                                <span>{ticket.assigned_officer_name || 'D.Rajkumar,AE/ENG(7331189510)'}</span>
                                                                <a 
                                                                    href={`tel:${ticket.assigned_officer_phone || '7331189510'}`} 
                                                                    className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200"
                                                                    title="Call Nodal Officer"
                                                                >
                                                                    <Phone size={12} />
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 font-bold block mb-1.5 text-sm">Officer Remarks</span>
                                                            <span className="italic text-gray-700 font-medium">{ticket.resolution_notes || 'rectified'}</span>
                                                        </div>
                                                    </div>

                                                    {/* 5-Step Horizontal Milestone Tracker (Exact match to MyCURE GHMC 5.49.23 PM (1)) */}
                                                    <div className="pt-4 pb-2 border-t border-gray-100">
                                                        <div className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3.5">
                                                            GHMC 5-Step Resolution Progression
                                                        </div>
                                                        <div className="flex items-center justify-between text-center relative text-sm font-bold text-gray-700">
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <div className="w-7 h-7 rounded-full text-xs font-extrabold bg-emerald-500 text-white flex items-center justify-center text-[10px] mb-1.5 shadow-xs">✓</div>
                                                                <span className="text-emerald-700 font-black">Open</span>
                                                            </div>
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <div className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center text-[10px] mb-1.5 shadow-xs ${
                                                                    ticket.status !== 'NEW' ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300 bg-white text-gray-400'
                                                                }`}>
                                                                    {ticket.status !== 'NEW' ? '✓' : '2'}
                                                                </div>
                                                                <span>Under Process</span>
                                                            </div>
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <div className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center text-[10px] mb-1.5 shadow-xs ${
                                                                    ticket.status === 'ON_SITE_INSPECTION' || ticket.status === 'WORK_IN_PROGRESS' || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                                                                        ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300 bg-white text-gray-400'
                                                                }`}>
                                                                    {ticket.status === 'WORK_IN_PROGRESS' || ticket.status === 'RESOLVED' ? '✓' : '3'}
                                                                </div>
                                                                <span>Attended by Officer</span>
                                                            </div>
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <div className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center text-[10px] mb-1.5 shadow-xs ${
                                                                    ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                                                                        ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300 bg-white text-gray-400'
                                                                }`}>
                                                                    {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? '✓' : '4'}
                                                                </div>
                                                                <span className={ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'text-emerald-700 font-black' : ''}>
                                                                    Closed By Citizen
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <div className="w-7 h-7 rounded-full text-xs font-extrabold border-2 border-gray-300 bg-white text-gray-400 flex items-center justify-center text-[10px] mb-1.5">5</div>
                                                                <span>Conditional Closed</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Actions Row */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                        <div className="text-[11px] text-gray-500">
                                                            Pending Days: <strong>0 Days</strong> | Completed Days: <strong>0 Days</strong>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                onClick={() => setSelectedGrievance(ticket)}
                                                                className="px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                View Details & Before/After Proof
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setRatingGrievanceId(ticket.tracking_id);
                                                                    setRatingModalOpen(true);
                                                                }}
                                                                className="px-4 py-1.5 bg-[#009688] hover:bg-[#00796b] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                                            >
                                                                <Star size={13} /> Rate Redressal
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 4: MONSOON EMERGENCY & DRF DRIVE */}
                    {/* ========================================================================= */}
                    {activeTab === 'monsoon_emergency' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-cyan-900 tracking-tight flex items-center gap-2">
                                        <CloudRain className="text-cyan-600" /> GHMC Monsoon Disaster Response Force (DRF)
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Immediate 2-hour rapid dispatch for waterlogging, tree falls, open manholes, and wall collapse hazards during rains.
                                    </p>
                                </div>
                                <button onClick={() => setActiveTab('dashboard')} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer">
                                    Back to Dashboard
                                </button>
                            </div>

                            {monsoonSuccessMessage && (
                                <div className="bg-cyan-50 border border-cyan-300 text-cyan-900 p-4 rounded-xl text-sm font-bold animate-fade-in">
                                    {monsoonSuccessMessage}
                                </div>
                            )}

                            <form onSubmit={handleMonsoonSubmit} className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-base font-extrabold text-gray-900 mb-2">Emergency Hazard Type *</label>
                                        <select 
                                            value={monsoonForm.hazardType}
                                            onChange={(e) => setMonsoonForm(prev => ({ ...prev, hazardType: e.target.value }))}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-cyan-500 cursor-pointer"
                                        >
                                            <option value="Inundation / Heavy Waterlogging">Inundation / Heavy Waterlogging on Colony Road</option>
                                            <option value="Open Manhole / Missing Grating Hazard">Open Manhole / Missing Grating Hazard</option>
                                            <option value="Tree Fall / Snapped Electric Cable">Tree Fall / Snapped Electric Cable</option>
                                            <option value="Old Dilapidated Wall Collapse Risk">Old Dilapidated Wall Collapse Risk</option>
                                            <option value="Nala Overflow & Flood Silt">Nala Overflow & Flood Silt Ingress</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-base font-extrabold text-gray-900 mb-2">Priority Classification</label>
                                        <input 
                                            type="text" 
                                            readOnly
                                            value="CRITICAL — 2 HOUR DRF EMERGENCY SLA"
                                            className="w-full bg-red-50 border border-red-200 text-red-700 font-extrabold text-xs px-3 py-2.5 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Location & Colony Landmark *</label>
                                    <input 
                                        type="text" 
                                        value={monsoonForm.landmark}
                                        onChange={(e) => setMonsoonForm(prev => ({ ...prev, landmark: e.target.value }))}
                                        placeholder="e.g. Underpass near Uppal Metro Pillar #12, Chilkanagar"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-cyan-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Situation Description *</label>
                                    <textarea 
                                        rows={4}
                                        value={monsoonForm.description}
                                        onChange={(e) => setMonsoonForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe the emergency, depth of water, or risk to public safety..."
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-xs outline-none focus:border-cyan-500 resize-none font-medium"
                                        required
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={submittingMonsoon}
                                    className="px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
                                >
                                    {submittingMonsoon ? 'Dispatching DRF Crew...' : 'DISPATCH GHMC DRF RAPID SQUAD'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 5: APPEAL DASHBOARD (Level 2 Zonal Commissioner Disputes) */}
                    {/* ========================================================================= */}
                    {activeTab === 'appeals' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-200 pb-4">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <ShieldAlert className="text-red-600" /> First Appellate Authority (Zonal Commissioner Appeals)
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Disputed grievances escalated to Level 2 (Zonal Commissioners) due to officer negligence or false after-photo proof.
                                </p>
                            </div>

                            {appealsList.length === 0 ? (
                                <div className="text-center py-16 text-gray-400 font-medium">
                                    No active appeals filed. If a field officer uploads fake work proof, click 'Dispute' on the ticket to escalate here.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {appealsList.map((appeal) => (
                                        <div key={appeal.id} className="border border-red-200 bg-red-50/30 rounded-2xl p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-red-700 text-sm">GHMC Case #{appeal.tracking_id}</span>
                                                <span className="bg-red-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                                                    Escalated to Zonal Commissioner
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-800">
                                                <strong>Dispute Reason:</strong> {appeal.dispute_reason || 'Citizen disputed resolution stating work was incomplete or photo fake.'}
                                            </div>
                                            <div className="text-[11px] text-gray-500">
                                                Appellate Jurisdiction: <strong>GHMC Zonal Commissionerate (Secunderabad / Charminar Zone)</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 6: ACCOUNT & WARD ACTIVITY */}
                    {/* ========================================================================= */}
                    {activeTab === 'activity' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fade-in">
                            <div className="border-b border-gray-200 pb-4">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <Clock className="text-blue-600" /> Ward & Colony Activity Timeline
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Audit trail of account authentications, submissions, and official GHMC SMS updates.
                                </p>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {activityLog.map((log, i) => (
                                    <div key={i} className="py-3 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                            <span className="font-semibold text-gray-800">{log.action}</span>
                                        </div>
                                        <span className="text-gray-400 font-mono">{log.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 7: EDIT PROFILE */}
                    {/* ========================================================================= */}
                    {activeTab === 'edit_profile' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fade-in max-w-2xl">
                            <div className="border-b border-gray-200 pb-4">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <User className="text-blue-600" /> Citizen Profile & GHMC Ward Coordinates
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Update your registered municipal contact coordinates.</p>
                            </div>

                            {profileSuccess && (
                                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-bold">
                                    {profileSuccess}
                                </div>
                            )}

                            <form onSubmit={handleProfileSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={profileForm.name} 
                                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold outline-none focus:border-blue-500 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Mobile Phone (My GHMC Registered)</label>
                                    <input 
                                        type="text" 
                                        value={profileForm.phone} 
                                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold outline-none focus:border-blue-500 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={profileForm.email} 
                                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold outline-none focus:border-blue-500 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">GHMC Ward / Division</label>
                                    <input 
                                        type="text" 
                                        value={profileForm.ward_colony} 
                                        onChange={(e) => setProfileForm(prev => ({ ...prev, ward_colony: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold outline-none focus:border-blue-500 rounded-xl"
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={profileUpdating}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                    {profileUpdating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 8: CHANGE PASSWORD */}
                    {/* ========================================================================= */}
                    {activeTab === 'change_password' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 animate-fade-in max-w-xl">
                            <div className="border-b border-gray-200 pb-4">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <Lock className="text-blue-600" /> Change Account Password
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Ensure your password is at least 6 characters long.</p>
                            </div>

                            {pwdSuccess && (
                                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-bold">
                                    {pwdSuccess}
                                </div>
                            )}

                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Current Password *</label>
                                    <input 
                                        type="password" 
                                        value={pwdForm.currentPassword} 
                                        onChange={(e) => setPwdForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">New Password *</label>
                                    <input 
                                        type="password" 
                                        value={pwdForm.newPassword} 
                                        onChange={(e) => setPwdForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-extrabold text-gray-900 mb-2">Confirm New Password *</label>
                                    <input 
                                        type="password" 
                                        value={pwdForm.confirmPassword} 
                                        onChange={(e) => setPwdForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={pwdUpdating}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                    {pwdUpdating ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 9: PRAJA VANI / SAMADHAN DIDI AI CONVERSATIONAL CHATBOT */}
                    {/* ========================================================================= */}
                    {activeTab === 'prajavani' && (
                        <div className="h-[calc(100vh-210px)] min-h-[750px] animate-fade-in">
                            <VoiceChatbot 
                                embedded={true} 
                                onGrievanceRegistered={() => fetchGrievances()}
                            />
                        </div>
                    )}

                </main>
            </div>

            {/* 3. MODAL: GHMC 6 ZONAL OFFICES DIRECTORY */}
            {zonalModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-200 animate-scale-up">
                        <div className="bg-[#6b0033] text-white px-6 py-4 flex items-center justify-between">
                            <h3 className="font-extrabold text-sm flex items-center gap-2">
                                <Building2 size={18} /> GHMC 6 Zonal Offices & Commissioners Directory
                            </h3>
                            <button onClick={() => setZonalModalOpen(false)} className="hover:opacity-80 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                            <p className="text-xs text-gray-600">Greater Hyderabad Municipal Corporation is divided into 6 administrative zones:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {GHMC_ZONAL_OFFICES.map((z, idx) => (
                                    <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col justify-between text-xs space-y-1.5 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-gray-900 text-sm">{z.zone}</span>
                                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{z.wards}</span>
                                        </div>
                                        <div className="text-gray-700"><strong>Zonal Commissioner:</strong> {z.commissioner}</div>
                                        <div className="text-gray-600"><strong>Office:</strong> {z.office}</div>
                                        <div className="text-blue-700 font-mono font-bold flex items-center gap-1 pt-1">
                                            <Phone size={13} /> {z.phone}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. MODAL: CITIZEN CHARTER & GHMC SLA TIMELINES */}
            {charterModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-scale-up">
                        <div className="bg-[#6b0033] text-white px-6 py-4 flex items-center justify-between">
                            <h3 className="font-extrabold text-sm">GHMC Citizen Charter & Guaranteed SLA Standards</h3>
                            <button onClick={() => setCharterModalOpen(false)} className="hover:opacity-80 cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 text-xs text-gray-700 leading-relaxed">
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                                <h4 className="font-black text-emerald-900">Guaranteed Municipal SLA Deadlines:</h4>
                                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                                    <li><strong>Street Light Glow Failure:</strong> Resolved within <strong>24 Hours</strong>.</li>
                                    <li><strong>Garbage Dump / GVP Spot:</strong> Cleared within <strong>12 Hours</strong>.</li>
                                    <li><strong>Potholes & Road Patching:</strong> Attended within <strong>48 Hours</strong>.</li>
                                    <li><strong>Drainage / Sewer Overflow:</strong> Attended within <strong>6–12 Hours</strong>.</li>
                                    <li><strong>Monsoon Inundation (DRF):</strong> Emergency squad dispatched in <strong>2 Hours</strong>.</li>
                                </ul>
                            </div>
                            <p className="text-[11px] text-gray-600">
                                If unresolved within SLA timelines or if proof is rejected, complaints automatically trigger disciplinary negligence strikes against the designated ward engineering officer.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. MODAL: FIRST APPELLATE AUTHORITY (ZONAL COMMISSIONERS) */}
            {appealModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-scale-up">
                        <div className="bg-[#6b0033] text-white px-6 py-4 flex items-center justify-between">
                            <h3 className="font-extrabold text-sm">GHMC First Appellate Authority (L2)</h3>
                            <button onClick={() => setAppealModalOpen(false)} className="hover:opacity-80 cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3 text-xs text-gray-700">
                            <p className="font-semibold">Under GHMC Public Grievance Guidelines, disputed tickets are audited by:</p>
                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-1.5">
                                <div className="font-bold text-gray-900 text-sm">Zonal Commissioner (Appeals & Vigilance)</div>
                                <div className="text-gray-600">GHMC Head Office, CC Complex, Tank Bund Road, Hyderabad - 500063</div>
                                <div className="text-blue-700 font-mono">Email: commissioner-appeals@ghmc.gov.in</div>
                                <div className="text-gray-600">Call Center: 040-21111111 (Extension: 100)</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. MODAL: My GHMC MOBILE APP & CGG QR */}
            {mobileAppModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-scale-up text-center p-6 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                            <Download size={28} />
                        </div>
                        <h3 className="font-black text-lg text-gray-900">Download My GHMC Mobile App</h3>
                        <p className="text-xs text-gray-600">Developed by Centre for Good Governance (CGG) for citizens of Hyderabad.</p>
                        <div className="bg-gray-100 p-4 rounded-2xl inline-block border border-gray-300">
                            <div className="font-mono text-xs text-gray-700 font-bold">[ SCAN QR CODE TO INSTALL ]</div>
                            <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto mt-2 flex items-center justify-center text-[10px] text-gray-500 font-mono">
                                QR: ghmc.gov.in/app
                            </div>
                        </div>
                        <div>
                            <button onClick={() => setMobileAppModalOpen(false)} className="w-full py-2.5 bg-[#009688] text-white font-bold text-xs rounded-xl cursor-pointer">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. MODAL: CONTACT US */}
            {contactModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-gray-900">GHMC 24x7 Control Room</h3>
                            <button onClick={() => setContactModalOpen(false)} className="cursor-pointer"><X size={18}/></button>
                        </div>
                        <p className="text-gray-600">Direct Citizen Support Lines:</p>
                        <div className="space-y-2 bg-gray-50 p-4 rounded-xl font-medium">
                            <div>📞 <strong>GHMC Call Center:</strong> 040-21111111</div>
                            <div>🌧️ <strong>Monsoon Emergency (DRF):</strong> 040-29555500</div>
                            <div>✉️ <strong>Email:</strong> commissioner-ghmc@gov.in</div>
                            <div>🏢 <strong>Headquarters:</strong> CC Complex, Tank Bund Road, Hyderabad</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 8. MODAL: ABOUT US */}
            {aboutModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-3 text-xs text-gray-700">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-gray-900">About GHMC & Jan Setu AI</h3>
                            <button onClick={() => setAboutModalOpen(false)} className="cursor-pointer"><X size={18}/></button>
                        </div>
                        <p>Greater Hyderabad Municipal Corporation (GHMC) administers urban civic governance across 6 zones and 150 municipal divisions in the Hyderabad metropolitan region.</p>
                        <p>Jan Setu AI integrates citizen photo validation, autonomous multi-factor priority triage, and zero bogus photo verification into the official My GHMC architecture.</p>
                    </div>
                </div>
            )}

            {/* 9. MODAL: FAQS */}
            {faqModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-3 text-xs text-gray-700">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-gray-900">GHMC Citizen FAQs</h3>
                            <button onClick={() => setFaqModalOpen(false)} className="cursor-pointer"><X size={18}/></button>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            <div>
                                <strong className="text-gray-900">Q1: How do I track my complaint progress in GHMC?</strong>
                                <p className="text-gray-600">Click on 'Track Grievance Status' to monitor the 5-step milestone progression bar (Open ➔ Under Process ➔ Attended ➔ Closed By Citizen ➔ Conditional Closed).</p>
                            </div>
                            <div>
                                <strong className="text-gray-900">Q2: What if the officer uploads a fake resolution photo?</strong>
                                <p className="text-gray-600">Click 'Dispute (False Work)' on any resolved complaint. This escalates the case to the Zonal Commissioner and logs a disciplinary negligence strike against the officer.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 10. MODAL: PRIVACY NOTICE */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="font-black text-lg text-gray-900">GHMC Citizen Audit Retention</h3>
                        <p className="text-xs text-gray-600">Under Government of Telangana municipal audit regulations, submitted civic grievance records are retained for 3 years to ensure contractor accountability.</p>
                        <button onClick={() => setDeleteModalOpen(false)} className="w-full py-2.5 bg-gray-200 text-gray-800 rounded-xl font-bold text-xs cursor-pointer">
                            Close Notice
                        </button>
                    </div>
                </div>
            )}

            {/* 11. CITIZEN RATING & FEEDBACK MODAL (Screenshot 2026-09-02 172434.png) */}
            {ratingModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-scale-up">
                        <div className="bg-[#009688] text-white px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-base">
                                <Star size={18} />
                                <span>Rating</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium">
                                <span>Fields marked * are mandatory</span>
                                <button onClick={() => setRatingModalOpen(false)} className="hover:opacity-80 cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleRatingSubmit} className="p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <label className="w-48 text-xs font-extrabold text-gray-700">
                                    <span className="text-red-500">*</span> Registration Number
                                </label>
                                <input 
                                    type="text" 
                                    value={ratingGrievanceId || (grievances[0]?.tracking_id || '208266031056')} 
                                    onChange={(e) => setRatingGrievanceId(e.target.value)}
                                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-gray-900 outline-none"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <label className="w-48 text-xs font-extrabold text-gray-700">
                                    <span className="text-red-500">*</span> Your rating for grievance redressal
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setStarRating(star)}
                                                className="cursor-pointer transition-transform hover:scale-110"
                                            >
                                                <Star 
                                                    size={24} 
                                                    className={star <= starRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} 
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                        starRating === 1 ? 'bg-red-500 text-white' :
                                        starRating === 2 ? 'bg-orange-500 text-white' :
                                        starRating === 3 ? 'bg-amber-400 text-gray-900' :
                                        starRating === 4 ? 'bg-green-600 text-white' :
                                        'bg-emerald-700 text-white'
                                    }`}>
                                        {starRating === 1 ? 'POOR' : starRating === 2 ? 'AVERAGE' : starRating === 3 ? 'GOOD' : starRating === 4 ? 'VERY GOOD' : 'EXCELLENT'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                <label className="w-48 text-xs font-extrabold text-gray-700 pt-2">
                                    Comments
                                </label>
                                <div className="flex-1 space-y-1">
                                    <div className="text-[11px] text-gray-500">
                                        Maximum 500 characters are allowed in comment. ({500 - ratingComments.length} characters remaining)
                                    </div>
                                    <textarea 
                                        rows={3}
                                        maxLength={500}
                                        value={ratingComments}
                                        onChange={(e) => setRatingComments(e.target.value)}
                                        placeholder="Comments"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-xs outline-none focus:border-[#009688] resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <label className="w-48 text-xs font-extrabold text-gray-700">
                                    <span className="text-red-500">*</span> Security Code
                                </label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="text" 
                                        value={userCaptcha}
                                        onChange={(e) => setUserCaptcha(e.target.value)}
                                        placeholder="Type the numbers shown in the image"
                                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#009688] w-64"
                                    />
                                    <div className="bg-emerald-50 border border-emerald-300 px-4 py-1.5 rounded font-serif italic text-lg tracking-widest text-emerald-950 font-bold select-none line-through">
                                        {captchaCode}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={refreshCaptcha}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                        title="Reload Captcha"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 text-center">
                                <button 
                                    type="submit"
                                    className="px-8 py-2.5 bg-[#009688] hover:bg-[#00796b] text-white font-black text-xs rounded-lg shadow-md transition-all cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 mx-auto"
                                >
                                    <span>SUBMIT</span>
                                    <Check size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 12. BEFORE / AFTER PROOF DETAIL MODAL (WhatsApp Image 5.49.23 PM) */}
            {selectedGrievance && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-scale-up">
                        <div className="bg-[#009688] text-white px-6 py-3.5 flex items-center justify-between">
                            <h3 className="font-extrabold text-sm">Grievance Details</h3>
                            <button onClick={() => setSelectedGrievance(null)} className="cursor-pointer hover:opacity-80">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-xs">
                                <div className="flex justify-between"><span className="font-bold text-gray-500">ID:</span> <span className="font-mono font-bold text-gray-900">{selectedGrievance.tracking_id}</span></div>
                                <div className="flex justify-between"><span className="font-bold text-gray-500">Category:</span> <span className="font-semibold text-gray-800">{selectedGrievance.category}</span></div>
                                <div className="flex justify-between"><span className="font-bold text-gray-500">Landmark:</span> <span className="font-semibold text-gray-800">{selectedGrievance.location_text}</span></div>
                                <div className="flex justify-between"><span className="font-bold text-gray-500">Status:</span> <span className="font-bold text-emerald-700">{selectedGrievance.status}</span></div>
                                <div className="flex justify-between"><span className="font-bold text-gray-500">Posted by:</span> <span className="font-semibold text-gray-800">{selectedGrievance.citizen_name || user?.name}</span></div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide mb-2">Images uploaded by you</h4>
                                {selectedGrievance.before_image_url ? (
                                    <div className="w-36 h-36 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                        <img src={selectedGrievance.before_image_url} alt="Before Premise" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400">
                                        No image available
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide mb-2">Images uploaded by officer</h4>
                                {selectedGrievance.after_image_url ? (
                                    <div className="w-36 h-36 rounded-2xl overflow-hidden border border-emerald-400 shadow-sm relative">
                                        <img src={selectedGrievance.after_image_url} alt="After Premise" className="w-full h-full object-cover" />
                                        <span className="absolute top-1.5 left-1.5 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                                            JPG
                                        </span>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400">
                                        Work is in progress. Officer after-photo pending.
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 flex gap-3 border-t border-gray-100">
                                <button 
                                    onClick={() => {
                                        setRatingGrievanceId(selectedGrievance.tracking_id);
                                        setSelectedGrievance(null);
                                        setRatingModalOpen(true);
                                    }}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                                >
                                    Rate Redressal
                                </button>
                                {selectedGrievance.status === 'RESOLVED' && (
                                    <button 
                                        onClick={() => {
                                            const reason = prompt('Please explain why the resolution is incorrect (e.g. fake photo, pothole still open):');
                                            if (reason) {
                                                api.post(`/grievances/${selectedGrievance.tracking_id}/dispute`, { dispute_reason: reason })
                                                    .then(() => {
                                                        alert('Dispute submitted! Ticket escalated to Level 2 Zonal Commissioner.');
                                                        setSelectedGrievance(null);
                                                        fetchGrievances();
                                                    })
                                                    .catch(err => alert('Failed to submit dispute: ' + err.message));
                                            }
                                        }}
                                        className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                                    >
                                        Dispute (False Work)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 13. SMS NOTIFICATIONS DRAWER (WhatsApp Image 5.44.23 PM (1)) */}
            {smsDrawerOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
                    <div className="w-full max-w-sm bg-[#121212] text-white h-full shadow-2xl flex flex-col animate-slide-left border-l border-white/10">
                        <div className="bg-[#1e1e1e] px-4 py-3.5 flex items-center justify-between border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSmsDrawerOpen(false)} className="text-gray-300 hover:text-white cursor-pointer">
                                    <ArrowLeft size={18} />
                                </button>
                                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs">
                                    GH
                                </div>
                                <div>
                                    <div className="text-xs font-bold">AD-GHMCHY-S</div>
                                    <div className="text-[10px] text-gray-400">Government of Telangana</div>
                                </div>
                            </div>
                            <button onClick={() => setSmsDrawerOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans">
                            <div className="text-center text-[10px] text-gray-500 uppercase tracking-wider my-2">
                                Official GHMC SMS Delivery Simulation
                            </div>

                            {smsList.map((sms, idx) => (
                                <div key={idx} className="bg-[#242424] border border-white/10 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
                                    <div className="text-[11px] text-gray-300 leading-relaxed font-normal">
                                        {sms.text}
                                    </div>
                                    <div className="text-[9px] text-gray-500 text-right">
                                        {sms.time}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 bg-[#1e1e1e] text-center text-[10px] text-gray-400 border-t border-white/10">
                            Sender can't accept replies. Contact GHMC Call Center: 040-21111111.
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
