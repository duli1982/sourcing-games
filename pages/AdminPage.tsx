import React, { useEffect, useMemo, useState } from 'react';
import { games as baseGames } from '../data/games';
import { useUIContext } from '../context/UIContext';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import PlayerDetailModal from '../components/PlayerDetailModal';
import { AdminAnalytics, AdminPlayer, AdminAttempt, GameOverride } from '../types';

const AdminPage: React.FC = () => {
  const { addToast } = useUIContext();
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [adminActor, setAdminActor] = useState(() => localStorage.getItem('admin_actor') || 'admin');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [attempts, setAttempts] = useState<AdminAttempt[]>([]);
  const [gameOverrides, setGameOverrides] = useState<GameOverride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'attempts' | 'games'>('overview');
  const isAuthorized = Boolean(adminToken);

  // New feature states
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null);

  const authHeaders = useMemo(
    () => ({ 'x-admin-token': adminToken, 'x-admin-actor': adminActor, 'Content-Type': 'application/json' }),
    [adminToken, adminActor]
  );

  const requireToken = (): boolean => {
    if (!adminToken) {
      addToast('Set admin token first.', 'error');
      return false;
    }
    localStorage.setItem('admin_token', adminToken);
    localStorage.setItem('admin_actor', adminActor || 'admin');
    return true;
  };

  const fetchAll = async () => {
    if (!requireToken()) return;
    setIsLoading(true);
    try {
      const [analyticsRes, playersRes, attemptsRes, gamesRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers: authHeaders }),
        fetch('/api/admin/players', { headers: authHeaders }),
        fetch('/api/admin/attempts?limit=50', { headers: authHeaders }),
        fetch('/api/admin/games', { headers: authHeaders }),
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      else addToast('Failed to load analytics', 'error');

      if (playersRes.ok) {
        const body = await playersRes.json();
        setPlayers(body.players || []);
      } else {
        addToast('Failed to load players', 'error');
      }

      if (attemptsRes.ok) {
        const body = await attemptsRes.json();
        setAttempts(body.attempts || []);
      } else {
        addToast('Failed to load attempts', 'error');
      }

      if (gamesRes.ok) {
        const body = await gamesRes.json();
        setGameOverrides(body.overrides || []);
      }
    } catch (err) {
      addToast('Admin fetch failed', 'error');
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (playerId: string, action: 'ban' | 'unban' | 'reset-score') => {
    if (!requireToken()) return;
    const res = await fetch('/api/admin/playerAction', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ playerId, action }),
    });
    if (!res.ok) {
      addToast(`Failed to ${action}`, 'error');
      return;
    }
    addToast(`Player ${action} success`, 'success');
    fetchAll();
  };

  const handleSaveOverride = async (override: GameOverride) => {
    if (!requireToken()) return;
    const res = await fetch('/api/admin/games', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(override),
    });
    if (res.ok) {
      addToast('Saved game override', 'success');
      fetchAll();
    } else {
      const body = await res.json().catch(() => ({}));
      addToast(body?.error?.message || 'Failed to save game', 'error');
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && adminToken) {
      interval = setInterval(() => {
        fetchAll();
      }, 30000); // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, adminToken]);



  const handleBan = (id: string) => handleAction(id, 'ban');
  const handleUnban = (id: string) => handleAction(id, 'unban');
  const handleResetScore = (id: string) => handleAction(id, 'reset-score');

  const overridesMap = useMemo(() => {
    const map = new Map<string, GameOverride>();
    gameOverrides.forEach(o => map.set(o.id, o));
    return map;
  }, [gameOverrides]);

  const renderOverview = () => (
    <div className="space-y-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Load" to view analytics. This tab is locked until you authenticate.
        </div>
      )}
      {isAuthorized && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Players" value={analytics?.totalPlayers ?? 0} />
        <StatCard label="Active (7d)" value={analytics?.active7d ?? 0} />
        <StatCard label="Active (30d)" value={analytics?.active30d ?? 0} />
        <StatCard label="Attempts (7d)" value={analytics?.attempts7d ?? 0} />
        <StatCard label="Attempts (30d)" value={analytics?.attempts30d ?? 0} />
        <StatCard label="Repeat Players" value={analytics?.repeatPlayers ?? 0} />
        <StatCard label="Churned (14d)" value={analytics?.churned14d ?? 0} />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-bold text-gray-400 mb-4">Game Popularity</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.gameStats.slice(0, 10) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="gameTitle" hide />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#e5e7eb' }}
                  cursor={{ fill: '#374151' }}
                />
                <Bar dataKey="attempts" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-bold text-gray-400 mb-4">Score Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.gameStats.slice(0, 10).map(g => ({ name: g.gameTitle, score: g.avgScore })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="score" stroke="#c084fc" fill="#c084fc" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-bold text-white mb-3">Top Games (by attempts)</h4>
        <div className="space-y-2">
          {(analytics?.gameStats || []).map(game => (
            <div key={game.gameId} className="flex justify-between text-sm text-gray-200 bg-gray-700 px-3 py-2 rounded">
              <div>
                <p className="font-semibold">{game.gameTitle}</p>
                <p className="text-xs text-gray-400">ID: {game.gameId}</p>
              </div>
              <div className="text-right">
                <p className="text-cyan-400 font-bold">{game.attempts} attempts</p>
                <p className="text-gray-400 text-xs">Avg Score: {game.avgScore.toFixed(1)}</p>
              </div>
            </div>
          ))}
          {(analytics?.gameStats || []).length === 0 && (
            <p className="text-gray-400 text-sm">No attempts yet.</p>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );

  const renderPlayers = () => (
    <div className="bg-gray-800 rounded-lg p-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Load" to view players. This tab is locked until you authenticate.
        </div>
      )}
      {isAuthorized && (
        <>
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h4 className="text-lg font-bold text-white">Players</h4>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search players..."
              value={playerSearchQuery}
              onChange={(e) => setPlayerSearchQuery(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
            />
            {playerSearchQuery && (
              <button
                onClick={() => setPlayerSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
          <button className="text-sm text-cyan-400 whitespace-nowrap" onClick={fetchAll}>Refresh</button>
        </div>
      </div>
      <div className="space-y-2">
        {players
          .filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
          .map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedPlayer(p)}
              className="bg-gray-700 rounded p-3 flex justify-between items-center cursor-pointer hover:bg-gray-600 transition duration-200"
            >
              <div>
                <p className="text-white font-semibold">{p.name}</p>
                <p className="text-xs text-gray-400">Score: {p.score} • Attempts: {p.totalAttempts} • Last: {p.lastAttemptAt ? new Date(p.lastAttemptAt).toLocaleString() : '—'}</p>
                <p className={`text-xs ${p.status === 'banned' ? 'text-red-400' : 'text-green-400'}`}>{p.status}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-gray-600 text-white text-xs" onClick={() => handleAction(p.id, 'reset-score')}>Reset Score</button>
                {p.status === 'banned' ? (
                  <button className="px-3 py-1 rounded bg-green-600 text-white text-xs" onClick={() => handleAction(p.id, 'unban')}>Unban</button>
                ) : (
                  <button className="px-3 py-1 rounded bg-red-600 text-white text-xs" onClick={() => handleAction(p.id, 'ban')}>Ban</button>
                )}
              </div>
            </div>
          ))}
        {players.length === 0 && <p className="text-gray-400 text-sm">No players yet.</p>}
      </div>
      </>
      )}
    </div>
  );

  const renderAttempts = () => (
    <div className="bg-gray-800 rounded-lg p-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Load" to view submissions. This tab is locked until you authenticate.
        </div>
      )}
      {isAuthorized && (
        <>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-lg font-bold text-white">Recent Attempts</h4>
        <button className="text-sm text-cyan-400" onClick={fetchAll}>Refresh</button>
      </div>
      <div className="space-y-2">
        {attempts.map(a => (
          <div key={a.attemptId} className="bg-gray-700 rounded p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-white font-semibold">{a.playerName}</p>
                <p className="text-xs text-gray-400">{new Date(a.ts).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-cyan-400 text-sm font-bold">{a.score}/100</p>
                <p className="text-xs text-gray-400">{a.gameTitle}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mt-2 line-clamp-3">{a.submission}</p>
          </div>
        ))}
        {attempts.length === 0 && <p className="text-gray-400 text-sm">No attempts yet.</p>}
      </div>
      </>
      )}
    </div>
  );

  const renderGames = () => (
    <div className="space-y-3">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token to edit games. All fields are locked until you load with a valid token.
        </div>
      )}
      {baseGames.map(game => {
        const override = overridesMap.get(game.id) || { id: game.id, featured: false, active: true };
        return (
          <div key={game.id} className="bg-gray-800 rounded-lg p-4 opacity-100 relative">
            {!isAuthorized && (
              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg cursor-not-allowed" />
            )}
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-white font-semibold">{game.title}</p>
                <p className="text-xs text-gray-400">ID: {game.id}</p>
                <p className="text-gray-300 text-sm mt-2">{override.description || game.description}</p>
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={override.active !== false}
                    disabled={!isAuthorized}
                    onChange={e => setGameOverrides(prev => {
                      const next = [...prev.filter(o => o.id !== game.id), { ...override, id: game.id, active: e.target.checked }];
                      return next;
                    })}
                  />
                  Active
                </label>
                <label className="flex items-center gap-1 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={Boolean(override.featured)}
                    disabled={!isAuthorized}
                    onChange={e => setGameOverrides(prev => {
                      const next = [...prev.filter(o => o.id !== game.id), { ...override, id: game.id, featured: e.target.checked }];
                      return next;
                    })}
                  />
                  Featured
                </label>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-400">Prompt Template Override</label>
              <textarea
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-100"
                rows={4}
                placeholder="Optional: replace prompt"
                value={override.prompt_template || ''}
                disabled={!isAuthorized}
                onChange={e => setGameOverrides(prev => {
                  const next = [...prev.filter(o => o.id !== game.id), { ...override, id: game.id, prompt_template: e.target.value }];
                  return next;
                })}
              />
            </div>
            <div className="flex justify-end mt-3">
              <button
                className={`px-3 py-1 rounded text-sm ${isAuthorized ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
                onClick={() => isAuthorized && handleSaveOverride(override)}
                disabled={!isAuthorized}
              >
                Save Override
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-cyan-400">Admin Dashboard</h2>
          <p className="text-gray-400 text-sm">Monitor players, games, and moderation.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Admin name (for audit log)"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
            value={adminActor}
            onChange={e => setAdminActor(e.target.value)}
          />
          <input
            type="password"
            placeholder="Admin token"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
            value={adminToken}
            onChange={e => setAdminToken(e.target.value)}
          />
          <button className="px-3 py-2 bg-cyan-600 text-white rounded text-sm" onClick={fetchAll} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load'}
          </button>
          <button
            className="px-3 py-2 bg-gray-700 text-white rounded text-sm"
            onClick={() => {
              setAdminToken('');
              setAdminActor('admin');
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_actor');
              addToast('Admin token cleared', 'info');
              window.location.reload();
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <TabButton label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} disabled={!isAuthorized} />
        <TabButton label="Players" active={activeTab === 'players'} onClick={() => setActiveTab('players')} disabled={!isAuthorized} />
        <TabButton label="Submissions" active={activeTab === 'attempts'} onClick={() => setActiveTab('attempts')} disabled={!isAuthorized} />
        <TabButton label="Games" active={activeTab === 'games'} onClick={() => setActiveTab('games')} disabled={!isAuthorized} />
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'players' && renderPlayers()}
      {activeTab === 'attempts' && renderAttempts()}
      {activeTab === 'games' && renderGames()}
      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          attempts={attempts}
          onClose={() => setSelectedPlayer(null)}
          onAction={async (playerId, action) => {
            if (action === 'ban') handleBan(playerId);
            if (action === 'unban') handleUnban(playerId);
            if (action === 'reset_score') handleResetScore(playerId);
            // Close modal after action if needed, or keep open to see updated status
            // For now, we'll refresh data
            await fetchAll();
            // Update selected player with new data
            const updated = players.find(p => p.id === playerId);
            if (updated) setSelectedPlayer(updated);
          }}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
    <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
  </div>
);

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void; disabled?: boolean }> = ({ label, active, onClick, disabled }) => (
  <button
    onClick={() => !disabled && onClick()}
    disabled={disabled}
    className={`px-3 py-2 rounded text-sm font-semibold ${disabled ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : active ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-300'}`}
  >
    {label}
  </button>
);

export default AdminPage;
