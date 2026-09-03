import React, { useState, useEffect } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import L from 'leaflet';
import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function CommissionerDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [grievances, setGrievances] = useState([]);
    
    useEffect(() => {
        api.get('/grievances').then(res => setGrievances(res.data)).catch(console.error);
    }, []);

    const total = grievances.length;
    const resolved = grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length;
    const escalated = grievances.filter(g => g.status === 'ESCALATED').length;
    const resRate = total ? Math.round((resolved/total)*100) : 0;
    
    const byCategory = grievances.reduce((acc, curr) => {
        acc[curr.category || 'Unclassified'] = (acc[curr.category || 'Unclassified'] || 0) + 1;
        return acc;
    }, {});

    const barData = {
        labels: Object.keys(byCategory),
        datasets: [{
            label: 'Grievances',
            data: Object.values(byCategory),
            backgroundColor: '#1e3a8a',
            borderRadius: 6,
        }]
    };

    const doughnutData = {
        labels: ['Resolved', 'Pending', 'Escalated'],
        datasets: [{
            data: [resolved, total - resolved - escalated, escalated],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0
        }]
    };

    const chartOptions = { responsive: true, plugins: { legend: { display: false } } };

    return (
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'map' ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[750px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">City-Wide Territory GIS Map</h2>
                            <p className="text-xs text-gray-500">Live spatial distribution of all civic complaints across GHMC zones</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 font-bold"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> All Active ({total})</span>
                            <span className="flex items-center gap-1 font-bold text-red-600"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Escalated ({escalated})</span>
                        </div>
                    </div>
                    <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-inner z-0">
                        <MapContainer center={[17.3850, 78.4867]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                            {grievances.map(g => {
                                if (g.location_text && g.location_text.includes('Lat:')) {
                                    const match = g.location_text.match(/Lat:\s*([\d.]+),\s*Lng:\s*([\d.]+)/);
                                    if (match) {
                                        return (
                                            <Marker key={g.id} position={[parseFloat(match[1]), parseFloat(match[2])]}>
                                                <Popup>
                                                    <div className="p-1">
                                                        <strong className="text-blue-900 block">{g.tracking_id}</strong>
                                                        <span className="text-xs font-semibold text-gray-600">{g.category}</span>
                                                        <p className="text-xs mt-1 text-gray-800">Status: <strong>{g.status}</strong></p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    }
                                }
                                return null;
                            })}
                        </MapContainer>
                    </div>
                </div>
            ) : (
            <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Grievances', val: total, color: 'text-blue-600', bg: 'bg-blue-50', icon: FileText },
                    { label: 'Resolved Cases', val: resolved, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
                    { label: 'Resolution Rate', val: `${resRate}%`, color: 'text-purple-600', bg: 'bg-purple-50', icon: Clock },
                    { label: 'SLA Breaches', val: escalated, color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">{kpi.label}</p>
                            <h2 className={`text-4xl font-extrabold ${kpi.color}`}>{kpi.val}</h2>
                        </div>
                        <div className={`p-4 rounded-full ${kpi.bg}`}>
                            <kpi.icon size={28} className={kpi.color} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Charts Column */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">Category Analysis</h3>
                        <div className="h-[300px] flex items-center justify-center">
                            <Bar data={barData} options={chartOptions} />
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">Recent Escalations (SLA Breached)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                                        <th className="p-4 rounded-tl-lg">Tracking ID</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4 rounded-tr-lg">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {grievances.filter(g => g.status === 'ESCALATED').map((g, i) => (
                                        <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold text-gray-900">{g.tracking_id}</td>
                                            <td className="p-4 text-gray-600">{g.category}</td>
                                            <td className="p-4"><span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center inline-flex gap-1"><AlertTriangle size={12}/> Escalated</span></td>
                                        </tr>
                                    ))}
                                    {escalated === 0 && (
                                        <tr><td colSpan="3" className="p-8 text-center text-gray-500 font-medium">No active escalations. Your zone is performing optimally.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Map & Doughnut Column */}
                <div className="space-y-8 flex flex-col">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">Zone Health</h3>
                        <div className="p-4 flex justify-center">
                            <div className="w-[200px]">
                                <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-[400px]">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">Live GIS Heatmap</h3>
                        <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 shadow-inner z-0">
                            <MapContainer center={[17.3850, 78.4867]} zoom={11} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                {grievances.map(g => {
                                    if (g.location_text && g.location_text.includes('Lat:')) {
                                        const match = g.location_text.match(/Lat:\s*([\d.]+),\s*Lng:\s*([\d.]+)/);
                                        if (match) {
                                            return (
                                                <Marker key={g.id} position={[parseFloat(match[1]), parseFloat(match[2])]}>
                                                    <Popup>
                                                        <strong>{g.tracking_id}</strong><br/>
                                                        {g.category}<br/>
                                                        Status: {g.status}
                                                    </Popup>
                                                </Marker>
                                            );
                                        }
                                    }
                                    return null;
                                })}
                            </MapContainer>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            )}
        </Layout>
    );
}
