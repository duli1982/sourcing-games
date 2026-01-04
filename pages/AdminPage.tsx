import React, { useEffect, useMemo, useState } from 'react';
import { games as baseGames } from '../data/games';
import { useUIContext } from '../context/UIContext';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import PlayerDetailModal from '../components/PlayerDetailModal';
import FlaggedCommentsTable from '../components/FlaggedCommentsTable';
import { AdminAnalytics, AdminAttempt, AdminPlayer, AdminTeam, AdminTeamMember, GameOverride, TeamAttempt } from '../types';

interface TeamGameLeaderboardEntry {
  team_id: string;
  team_name: string;
  total_score: number;
  games_played: number;
  rank: number;
}

const AdminPage: React.FC = () => {
  const { addToast } = useUIContext();
  // Security: Admin auth now uses httpOnly cookies, not localStorage
  const [adminToken, setAdminToken] = useState(''); // For login form input only
  const [adminActor, setAdminActor] = useState('admin'); // For login form input only
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [attempts, setAttempts] = useState<AdminAttempt[]>([]);
  const [gameOverrides, setGameOverrides] = useState<GameOverride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'attempts' | 'games' | 'teams' | 'team-games' | 'flagged-comments'>('overview');
  const [teamGameLeaderboard, setTeamGameLeaderboard] = useState<TeamGameLeaderboardEntry[]>([]);
  const [teamGameAttempts, setTeamGameAttempts] = useState<TeamAttempt[]>([]);
  const [teamGamesTeamId, setTeamGamesTeamId] = useState<string>('');
  const [isLoadingTeamGames, setIsLoadingTeamGames] = useState(false);
  const [teamGamesError, setTeamGamesError] = useState<string | null>(null);

  // New feature states
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  /**
   * Security: Login using httpOnly cookies instead of localStorage
   * Admin credentials are never stored client-side
   */
  const handleLogin = async () => {
    if (!adminToken) {
      addToast('Enter admin token', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: adminToken, actor: adminActor }),
      });

      if (response.ok) {
        setIsAuthorized(true);
        setAdminToken(''); // Clear form input
        addToast('Admin login successful', 'success');
        fetchAll(); // Load data after successful login
      } else {
        const error = await response.json();
        addToast(error.error || 'Invalid admin credentials', 'error');
      }
    } catch (error) {
      addToast('Login failed', 'error');
    }
  };

  /**
   * Logout and clear httpOnly cookies
   */
  const handleLogout = async () => {
    try {
      await fetch('/api/admin?action=logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthorized(false);
      setAnalytics(null);
      setPlayers([]);
      setAttempts([]);
      setGameOverrides([]);
      setTeams([]);
      addToast('Logged out', 'success');
    } catch (error) {
      addToast('Logout failed', 'error');
    }
  };

  /**
   * Security: All admin API calls now use httpOnly cookies
   * Credentials sent automatically via cookies
   */
  const fetchAll = async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      const [analyticsRes, playersRes, attemptsRes, gamesRes, teamsRes] = await Promise.all([
        fetch('/api/admin?action=analytics', { credentials: 'include' }),
        fetch('/api/admin?action=players', { credentials: 'include' }),
        fetch('/api/admin?action=attempts&limit=50', { credentials: 'include' }),
        fetch('/api/admin?action=games', { credentials: 'include' }),
        fetch('/api/admin?action=teams', { credentials: 'include' }),
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      else if (analyticsRes.status === 401) {
        setIsAuthorized(false);
        addToast('Session expired, please log in again', 'error');
        return;
      } else addToast('Failed to load analytics', 'error');

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

      if (teamsRes.ok) {
        const body = await teamsRes.json();
        setTeams(body.teams || []);
      } else {
        addToast('Failed to load teams', 'error');
      }
    } catch (err) {
      addToast('Admin fetch failed', 'error');
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  const fetchTeams = async () => {
    if (!isAuthorized) return;
    try {
      const res = await fetch('/api/admin?action=teams', { credentials: 'include' });
      if (res.ok) {
        const body = await res.json();
        setTeams(body.teams || []);
        return;
      }
      if (res.status === 401) {
        setIsAuthorized(false);
        addToast('Session expired, please log in again', 'error');
        return;
      }
      addToast('Failed to load teams', 'error');
    } catch {
      addToast('Failed to load teams', 'error');
    }
  };

  const fetchTeamGamesData = async (opts?: { teamId?: string }) => {
    if (!isAuthorized) return;

    const selectedTeamId = opts?.teamId ?? teamGamesTeamId;
    setIsLoadingTeamGames(true);
    setTeamGamesError(null);

    try {
      const leaderboardRes = await fetch('/api/team-games?action=leaderboard&limit=50', { credentials: 'include' });
      if (!leaderboardRes.ok) {
        const body = await leaderboardRes.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to fetch team games leaderboard (HTTP ${leaderboardRes.status})`);
      }
      const leaderboardBody: TeamGameLeaderboardEntry[] = await leaderboardRes.json();
      setTeamGameLeaderboard(leaderboardBody || []);

      if (selectedTeamId) {
        const attemptsRes = await fetch(`/api/team-games?action=attempts&teamId=${encodeURIComponent(selectedTeamId)}`, {
          credentials: 'include',
        });
        if (!attemptsRes.ok) {
          const body = await attemptsRes.json().catch(() => ({}));
          throw new Error(body?.error || `Failed to fetch team game submissions (HTTP ${attemptsRes.status})`);
        }
        const attemptsBody: TeamAttempt[] = await attemptsRes.json();
        setTeamGameAttempts(attemptsBody || []);
      } else {
        setTeamGameAttempts([]);
      }
    } catch (err) {
      setTeamGamesError(err instanceof Error ? err.message : 'Failed to load team games');
      setTeamGameLeaderboard([]);
      setTeamGameAttempts([]);
    } finally {
      setIsLoadingTeamGames(false);
    }
  };

  const handleTeamAction = async (
    teamId: string,
    action: 'activate' | 'deactivate' | 'regenerate-invite' | 'remove-member',
    playerId?: string
  ) => {
    if (!isAuthorized) {
      addToast('Please log in first', 'error');
      return;
    }

    const res = await fetch('/api/admin?action=team-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ teamId, action, playerId }),
    });

    if (res.status === 401) {
      setIsAuthorized(false);
      addToast('Session expired, please log in again', 'error');
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      addToast(body?.error?.message || 'Team action failed', 'error');
      return;
    }

    addToast('Team updated', 'success');
    fetchTeams();
  };

  // Check if already authenticated on mount (cookie may still be valid)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin?action=analytics', { credentials: 'include' });
        if (response.ok) {
          setIsAuthorized(true);
          fetchAll();
        }
      } catch (error) {
        // Not authenticated, stay on login screen
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (playerId: string, action: 'ban' | 'unban' | 'reset-score') => {
    if (!isAuthorized) {
      addToast('Please log in first', 'error');
      return;
    }
    const res = await fetch('/api/admin?action=player-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send httpOnly cookie
      body: JSON.stringify({ playerId, action }),
    });
    if (res.status === 401) {
      setIsAuthorized(false);
      addToast('Session expired, please log in again', 'error');
      return;
    }
    if (!res.ok) {
      addToast(`Failed to ${action}`, 'error');
      return;
    }
    addToast(`Player ${action} success`, 'success');
    fetchAll();
  };

  const handleSaveOverride = async (override: GameOverride) => {
    if (!isAuthorized) {
      addToast('Please log in first', 'error');
      return;
    }
    const res = await fetch('/api/admin?action=save-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send httpOnly cookie
      body: JSON.stringify(override),
    });
    if (res.status === 401) {
      setIsAuthorized(false);
      addToast('Session expired, please log in again', 'error');
      return;
    }
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
    if (autoRefresh && isAuthorized) {
      interval = setInterval(() => {
        fetchAll();
      }, 30000); // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab !== 'team-games') return;

    if (!teamGamesTeamId && teams.length > 0) {
      setTeamGamesTeamId(teams[0].id);
      fetchTeamGamesData({ teamId: teams[0].id });
      return;
    }

    fetchTeamGamesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthorized]);



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

  const formatDateTime = (ts: string | null) => ts ? new Date(ts).toLocaleString() : '—';

  const renderTeams = () => (
    <div className="bg-gray-800 rounded-lg p-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Login" to view teams. This tab is locked until you authenticate.
        </div>
      )}
      {isAuthorized && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h4 className="text-lg font-bold text-white">Teams</h4>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
                />
                {teamSearchQuery && (
                  <button
                    onClick={() => setTeamSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
              <button className="text-sm text-cyan-400 whitespace-nowrap" onClick={fetchTeams}>Refresh</button>
            </div>
          </div>

          <div className="space-y-2">
            {teams
              .filter(t => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()))
              .map((t) => {
                const expanded = expandedTeamId === t.id;
                return (
                  <div key={t.id} className="bg-gray-700 rounded p-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-left text-white font-semibold hover:text-cyan-300"
                            onClick={() => setExpandedTeamId(expanded ? null : t.id)}
                          >
                            {t.name}
                          </button>
                          <span className={`text-xs px-2 py-0.5 rounded ${t.isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                            {t.isActive ? 'active' : 'inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">
                          Members: {t.memberCount}/{t.maxMembers} • Weekly score (Top 5 avg): {t.averageScore} • Created by: {t.createdBy}
                        </p>
                        <p className="text-xs text-gray-400">
                          Last activity: {formatDateTime(t.lastActivityAt)} • Last join: {formatDateTime(t.lastMemberJoinedAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1 rounded bg-gray-600 text-white text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(t.inviteCode);
                            addToast('Invite code copied', 'success');
                          }}
                        >
                          Copy Invite
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-gray-600 text-white text-xs"
                          onClick={() => handleTeamAction(t.id, 'regenerate-invite')}
                        >
                          Regenerate Invite
                        </button>
                        {t.isActive ? (
                          <button
                            className="px-3 py-1 rounded bg-red-700 text-white text-xs"
                            onClick={() => handleTeamAction(t.id, 'deactivate')}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className="px-3 py-1 rounded bg-green-700 text-white text-xs"
                            onClick={() => handleTeamAction(t.id, 'activate')}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-3 bg-gray-800 rounded p-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                          <p className="text-sm text-gray-200">
                            Invite code: <span className="font-mono text-cyan-300">{t.inviteCode}</span>
                          </p>
                          <p className="text-xs text-gray-400">Team ID: {t.id}</p>
                        </div>

                        <div className="space-y-2">
                          {(t.members || []).map((m: AdminTeamMember) => (
                            <div key={m.id} className="bg-gray-700 rounded p-2 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-white text-sm font-semibold">{m.playerName}</p>
                                <p className="text-xs text-gray-300">
                                  Role: {m.role} • Score: {m.score ?? 0} • Joined: {formatDateTime(m.joinedAt)}
                                </p>
                              </div>
                              {m.role !== 'owner' && (
                                <button
                                  className="px-3 py-1 rounded bg-red-700 text-white text-xs"
                                  onClick={() => handleTeamAction(t.id, 'remove-member', m.playerId)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          {(!t.members || t.members.length === 0) && (
                            <p className="text-gray-400 text-sm">No members found.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            {teams.length === 0 && <p className="text-gray-400 text-sm">No teams yet.</p>}
          </div>
        </>
      )}
    </div>
  );

  const renderTeamGames = () => (
    <div className="bg-gray-800 rounded-lg p-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Login" to view team game activity. This tab is locked until you authenticate.
        </div>
      )}
      {isAuthorized && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div>
              <h4 className="text-lg font-bold text-white">Team Games</h4>
              <p className="text-xs text-gray-400">Leaderboard + per-team submissions (1 per team per game).</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={teamGamesTeamId}
                onChange={async (e) => {
                  const nextTeamId = e.target.value;
                  setTeamGamesTeamId(nextTeamId);
                  await fetchTeamGamesData({ teamId: nextTeamId });
                }}
                className="flex-1 md:w-72 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
              >
                <option value="">Select a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                className="text-sm text-cyan-400 whitespace-nowrap"
                onClick={() => fetchTeamGamesData()}
                disabled={isLoadingTeamGames}
              >
                {isLoadingTeamGames ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>

          {teamGamesError && (
            <div className="bg-red-900 bg-opacity-40 border border-red-600 text-red-100 p-3 rounded mb-4 text-sm">
              {teamGamesError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-white font-semibold">Team Games Leaderboard</h5>
                <span className="text-xs text-gray-400">Top {teamGameLeaderboard.length || 0}</span>
              </div>

              {teamGameLeaderboard.length === 0 ? (
                <p className="text-sm text-gray-400">No team game leaderboard data yet.</p>
              ) : (
                <table className="w-full text-left min-w-[520px]">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="py-2 pr-4 text-xs text-gray-400">Rank</th>
                      <th className="py-2 pr-4 text-xs text-gray-400">Team</th>
                      <th className="py-2 pr-4 text-xs text-gray-400">Total</th>
                      <th className="py-2 pr-4 text-xs text-gray-400">Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamGameLeaderboard.map((row) => (
                      <tr key={row.team_id} className="border-b border-gray-800 hover:bg-gray-800/40">
                        <td className="py-2 pr-4 text-sm text-gray-200">{row.rank}</td>
                        <td className="py-2 pr-4 text-sm">
                          <button
                            className="text-cyan-400 hover:text-cyan-300 hover:underline"
                            onClick={async () => {
                              setTeamGamesTeamId(row.team_id);
                              await fetchTeamGamesData({ teamId: row.team_id });
                            }}
                          >
                            {row.team_name}
                          </button>
                        </td>
                        <td className="py-2 pr-4 text-sm text-gray-200">{row.total_score}</td>
                        <td className="py-2 pr-4 text-sm text-gray-200">{row.games_played}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-white font-semibold">Team Submissions</h5>
                <span className="text-xs text-gray-400">{teamGameAttempts.length} attempts</span>
              </div>

              {!teamGamesTeamId ? (
                <p className="text-sm text-gray-400">Select a team to view submissions.</p>
              ) : teamGameAttempts.length === 0 ? (
                <p className="text-sm text-gray-400">No submissions found for this team.</p>
              ) : (
                <div className="space-y-2">
                  {teamGameAttempts.slice(0, 25).map((a) => (
                    <div key={a.id ?? `${a.teamId}-${a.gameId}-${a.ts}`} className="bg-gray-800 rounded p-3">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">{a.gameTitle}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(a.ts).toLocaleString()} • by {a.submittedByName || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-cyan-400 text-sm font-bold">{a.score}/100</p>
                          <p className="text-xs text-gray-400">{a.gameId}</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mt-2 line-clamp-3">{a.submission}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
          {!isAuthorized ? (
            <>
              {/* Security: Login form - credentials sent via httpOnly cookie */}
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
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                className="px-3 py-2 bg-cyan-600 text-white rounded text-sm"
                onClick={handleLogin}
                disabled={isLoading}
              >
                Login
              </button>
            </>
          ) : (
            <>
              {/* Authenticated - show refresh and logout */}
              <span className="text-sm text-gray-400">
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
              </span>
              <label className="flex items-center gap-1 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh (30s)
              </label>
              <button
                className="px-3 py-2 bg-cyan-600 text-white rounded text-sm"
                onClick={fetchAll}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                className="px-3 py-2 bg-gray-700 text-white rounded text-sm"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <TabButton label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} disabled={!isAuthorized} />
        <TabButton label="Players" active={activeTab === 'players'} onClick={() => setActiveTab('players')} disabled={!isAuthorized} />
        <TabButton label="Submissions" active={activeTab === 'attempts'} onClick={() => setActiveTab('attempts')} disabled={!isAuthorized} />
        <TabButton label="Games" active={activeTab === 'games'} onClick={() => setActiveTab('games')} disabled={!isAuthorized} />
        <TabButton label="Teams" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} disabled={!isAuthorized} />
        <TabButton label="Team Games" active={activeTab === 'team-games'} onClick={() => setActiveTab('team-games')} disabled={!isAuthorized} />
        <TabButton label="Flagged Comments" active={activeTab === 'flagged-comments'} onClick={() => setActiveTab('flagged-comments')} disabled={!isAuthorized} />
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'players' && renderPlayers()}
      {activeTab === 'attempts' && renderAttempts()}
      {activeTab === 'games' && renderGames()}
      {activeTab === 'teams' && renderTeams()}
      {activeTab === 'team-games' && renderTeamGames()}
      {activeTab === 'flagged-comments' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <FlaggedCommentsTable />
        </div>
      )}
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
