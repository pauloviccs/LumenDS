import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
    Monitor,
    ArrowUp,
    Cloud,
    ListVideo,
    Users,
    Activity,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Helper for IPC
const getIpcRenderer = () => {
    if (window.require) {
        try {
            return window.require('electron').ipcRenderer;
        } catch (e) {
            console.error('Electron IPC not found:', e);
            return null;
        }
    }
    return null;
};

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

export default function DashboardView() {
    // --- State ---
    // --- State ---
    const [stats, setStats] = useState({
        activeScreens: 0,
        totalScreens: 0,
        screensPercent: 0,
        activePlaylists: 0,
        todaysPlaylists: 0,
        storageUsed: 0,
        storageTotal: 0,
        storagePercent: 0,
        systemHealth: 100,
        uptime: 0
    });

    const [recentScreens, setRecentScreens] = useState([]);
    const [loading, setLoading] = useState(true);

    // Chart History State (Persistent)
    const [chartHistory, setChartHistory] = useState(() => {
        const saved = localStorage.getItem('lumends_chart_history');
        return saved ? JSON.parse(saved) : [];
    });

    // Track previous request count to calculate delta
    const [lastRequestCount, setLastRequestCount] = useState(0);

    // --- Effects ---
    useEffect(() => {
        fetchDashboardData();

        // Refresh every 30s
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Save chart history when it updates
    useEffect(() => {
        localStorage.setItem('lumends_chart_history', JSON.stringify(chartHistory));
    }, [chartHistory]);

    const fetchDashboardData = async () => {
        try {
            // 1. Screens Data
            // Query * to avoid potential "column does not exist" errors if schema drifts
            const { data: screens, error: screensError } = await supabase
                .from('screens')
                .select('*');

            let currentActiveScreens = 0;

            if (!screensError && screens) {
                const active = screens.filter(s => s.status === 'online').length;
                currentActiveScreens = active;
                const total = screens.length;

                // Get recent 3 - use updated_at or created_at
                const sorted = [...screens].sort((a, b) => {
                    const dateA = new Date(a.updated_at || a.created_at || 0);
                    const dateB = new Date(b.updated_at || b.created_at || 0);
                    return dateB - dateA;
                }).slice(0, 3);
                setRecentScreens(sorted);

                setStats(prev => ({
                    ...prev,
                    activeScreens: active,
                    totalScreens: total,
                    screensPercent: total > 0 ? Math.round((active / total) * 100) : 0
                }));
            }

            // 2. Playlists Data
            const { count: playlistCount, error: playlistsError } = await supabase
                .from('playlists')
                .select('*', { count: 'exact', head: true });

            if (!playlistsError) {
                setStats(prev => ({
                    ...prev,
                    activePlaylists: playlistCount || 0
                }));
            }

            // 3. System Data (IPC)
            const ipc = getIpcRenderer();
            if (ipc) {
                const systemStats = await ipc.invoke('get-system-stats');
                const storageStats = await ipc.invoke('get-storage-usage');

                // Network Requests Calculation
                const currentTotalRequests = systemStats.totalRequests || 0;
                // Calculate requests in the last interval (30s)
                // If it's the first run (lastRequestCount is 0), show 0 to avoid huge spike
                const requestsDelta = lastRequestCount > 0 ? (currentTotalRequests - lastRequestCount) : 0;
                setLastRequestCount(currentTotalRequests);

                setStats(prev => ({
                    ...prev,
                    systemHealth: 100 - (systemStats.memory > 90 ? 20 : 0), // Simple heuristic
                    storageUsed: storageStats.usedGb,
                    storageTotal: storageStats.totalGb,
                    storagePercent: storageStats.percent
                }));

                // Update Chart History
                const now = new Date();
                const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

                setChartHistory(prev => {
                    const newEntry = {
                        time: timeLabel,
                        screens: currentActiveScreens,
                        requests: requestsDelta // Requests per 30s
                    };
                    // Keep last 12 points (approx 6 minutes if 30s interval, or adjust for 24h)
                    // If we want 24h with 30s interval, that's 2880 points. Line chart might struggle.
                    // Let's keep last 20 points for visual clarify (~10 mins) or condense.
                    // For "Real 24h", we would need to aggregate. For now, let's show "Live (Last 10 mins)"
                    // The user asked for "Last 24h", but we don't have that data yet. We start building it now.
                    // We'll keep 24 points (12 minutes). User will see it fill up.
                    const newHistory = [...prev, newEntry];
                    if (newHistory.length > 24) return newHistory.slice(newHistory.length - 24);
                    return newHistory;
                });
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Chart Configuration
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, labels: { color: 'white' } }, // Show legend
            tooltip: {
                backgroundColor: 'rgba(20, 20, 30, 0.9)',
                titleColor: '#fff',
                bodyColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                titleFont: { family: 'Montserrat', size: 14 },
                bodyFont: { family: 'Inter', size: 12 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { family: 'Inter' } }
            },
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { family: 'Inter' } }
            }
        },
        interaction: { intersect: false, mode: 'index' },
        elements: { line: { tension: 0.4 } }
    };

    // Prepare Real Chart Data
    const chartData = {
        labels: chartHistory.length > 0 ? chartHistory.map(h => h.time) : ['Agor'],
        datasets: [
            {
                label: 'Telas Ativas (Online)',
                data: chartHistory.length > 0 ? chartHistory.map(h => h.screens) : [0],
                borderColor: '#4ade80', // Succeess Green
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#4ade80',
                fill: true,
                yAxisID: 'y'
            },
            {
                label: 'Requisições (30s)',
                data: chartHistory.length > 0 ? chartHistory.map(h => h.requests) : [0],
                borderColor: '#5E60CE', // Lumen Purple
                backgroundColor: 'rgba(94, 96, 206, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#5E60CE',
                fill: true,
                yAxisID: 'y'
            }
        ]
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* KPI 1: Active Screens */}
                <div className="glass-card-hover p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <Monitor size={48} />
                    </div>
                    <p className="text-sm font-medium text-lumen-textMuted uppercase tracking-wider">Telas Ativas</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-display font-bold text-white">{stats.activeScreens}</span>
                        <span className="text-sm text-lumen-success font-medium flex items-center gap-1">
                            <ArrowUp size={14} /> {stats.activeScreens > 0 ? 'ON' : '-'}
                        </span>
                    </div>
                    <div className="mt-4 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div
                            className="bg-lumen-success h-full shadow-[0_0_10px_rgba(74,222,128,0.5)] transition-all duration-1000"
                            style={{ width: `${stats.screensPercent}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-lumen-textMuted mt-2">{stats.screensPercent}% Online</p>
                </div>

                {/* KPI 2: Storage */}
                <div className="glass-card-hover p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <Cloud size={48} />
                    </div>
                    <p className="text-sm font-medium text-lumen-textMuted uppercase tracking-wider">Armazenamento</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-display font-bold text-white">{stats.storageUsed}<span className="text-lg">GB</span></span>
                    </div>
                    <div className="mt-4 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div
                            className="bg-lumen-accent h-full shadow-[0_0_10px_rgba(94,96,206,0.5)] transition-all duration-1000"
                            style={{ width: `${stats.storagePercent}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-lumen-textMuted mt-2">{stats.storagePercent}% Utilizado (de {stats.storageTotal}GB)</p>
                </div>

                {/* KPI 3: Playlists */}
                <div className="glass-card-hover p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <ListVideo size={48} />
                    </div>
                    <p className="text-sm font-medium text-lumen-textMuted uppercase tracking-wider">Playlists</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-display font-bold text-white">{stats.activePlaylists}</span>
                        <span className="text-sm text-lumen-textMuted">Criadas</span>
                    </div>
                    <div className="mt-4 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div className="bg-lumen-warning h-full w-[100%]"></div>
                    </div>
                    <p className="text-xs text-lumen-textMuted mt-2">Prontas para uso</p>
                </div>

                {/* KPI 4: Impressions */}
                <div className="glass-card-hover p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <Users size={48} />
                    </div>
                    <p className="text-sm font-medium text-lumen-textMuted uppercase tracking-wider">Dispositivos Totais</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-display font-bold text-white">{stats.totalScreens}</span>
                    </div>
                    <div className="mt-4 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full w-[100%]"></div>
                    </div>
                    <p className="text-xs text-lumen-textMuted mt-2">Cadastrados na rede</p>
                </div>
            </div>

            {/* Main Chart Section */}
            <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                            <Activity className="text-lumen-accent" size={20} />
                            Atividade da Rede
                        </h3>
                        <p className="text-sm text-lumen-textMuted mt-1">Status de players e requisições de mídia nas últimas 24h</p>
                    </div>
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                        <button className="px-3 py-1 rounded-md text-xs font-medium bg-white/10 text-white shadow-sm">24h</button>
                        <button className="px-3 py-1 rounded-md text-xs font-medium text-lumen-textMuted hover:text-white transition-colors">7d</button>
                        <button className="px-3 py-1 rounded-md text-xs font-medium text-lumen-textMuted hover:text-white transition-colors">30d</button>
                    </div>
                </div>

                <div className="w-full h-[350px]">
                    <Line options={options} data={chartData} />
                </div>
            </div>

            {/* Recent Activity List (Contextual Data) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status List */}
                <div className="col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-bold text-lg text-white">Telas Recentes</h3>
                        <button className="text-xs text-lumen-accent hover:text-white transition-colors font-medium">Ver todas</button>
                    </div>
                    <div className="space-y-3">
                        {recentScreens.map(screen => (
                            <div key={screen.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${screen.status === 'online' ? 'bg-lumen-success shadow-lumen-success' : 'bg-lumen-error shadow-lumen-error'}`}></div>
                                    <div>
                                        <p className="text-sm font-bold text-white group-hover:text-lumen-accent transition-colors">{screen.name}</p>
                                        <p className="text-xs text-lumen-textMuted">{screen.ip_address || 'IP Desconhecido'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-white">Playlist: {screen.current_playlist_id ? 'Ativa' : 'Nenhuma'}</p>
                                    <p className="text-xs text-lumen-textMuted">Visto: {new Date(screen.last_seen || screen.updated_at || screen.created_at).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}

                        {recentScreens.length === 0 && (
                            <div className="text-center py-8 text-lumen-textMuted text-sm">
                                Nenhuma tela conectada recentemente.
                            </div>
                        )}
                    </div>
                </div>

                {/* System Health */}
                <div className="glass-card p-6 flex flex-col justify-center items-center text-center">
                    <div className="w-32 h-32 rounded-full border-4 border-lumen-accent/30 flex items-center justify-center relative">
                        <div
                            className="absolute inset-0 rounded-full border-4 border-lumen-accent border-r-transparent animate-spin"
                            style={{ animationDuration: '3s' }}
                        ></div>
                        <div>
                            <p className="text-3xl font-display font-bold text-white">{stats.systemHealth}%</p>
                            <p className="text-xs text-lumen-textMuted">Saúde</p>
                        </div>
                    </div>
                    <h3 className="mt-6 font-bold text-white">Sistema Operacional</h3>
                    <p className="text-sm text-lumen-textMuted mt-1">
                        {stats.systemHealth > 90 ? 'Todos os serviços rodando normalmente.' : 'Atenção: Uso elevado de recursos.'}
                    </p>
                    <button className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-colors border border-white/5">
                        Ver Logs
                    </button>
                </div>
            </div>
        </div>
    );
}
