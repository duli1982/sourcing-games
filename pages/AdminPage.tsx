import React, { useEffect, useMemo, useState } from 'react';
import { games as baseGames } from '../data/games';
import { useUIContext } from '../context/UIContext';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import PlayerDetailModal from '../components/PlayerDetailModal';
import FlaggedCommentsTable from '../components/FlaggedCommentsTable';
import { AdminAnalytics, AdminAttempt, AdminPlayer, AdminTeam, AdminTeamMember, GameOverride, TeamAttempt, SkillCategory, Difficulty } from '../types';

interface TeamGameLeaderboardEntry {
  team_id: string;
  team_name: string;
  total_score: number;
  games_played: number;
  rank: number;
}

interface ReviewQueueItem {
  id: string;
  attempt_id: string;
  player_id: string;
  player_name: string;
  game_id: string;
  game_title: string;
  game_type: 'individual' | 'team';
  score: number;
  confidence: number | null;
  integrity_risk: string | null;
  gaming_risk: string | null;
  reasons: string[];
  status: string;
  created_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
}

interface GameOverrideVersion {
  id: string;
  game_id: string;
  title: string | null;
  description: string | null;
  task: string | null;
  prompt_template: string | null;
  rubric_json: any;
  featured: boolean;
  active: boolean;
  created_at: string;
  created_by?: string | null;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'attempts' | 'games' | 'teams' | 'team-games' | 'team-analytics' | 'rubric-tuning' | 'flagged-comments' | 'review-queue'>('overview');
  const [teamGameLeaderboard, setTeamGameLeaderboard] = useState<TeamGameLeaderboardEntry[]>([]);
  const [teamGameAttempts, setTeamGameAttempts] = useState<TeamAttempt[]>([]);
  const [reviewQueueItems, setReviewQueueItems] = useState<ReviewQueueItem[]>([]);
  const [reviewQueueStatus, setReviewQueueStatus] = useState<'pending' | 'all'>('pending');
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [reviewQueueError, setReviewQueueError] = useState<string | null>(null);
  const [teamAnalytics, setTeamAnalytics] = useState<any[]>([]);
  const [teamAnalyticsLoading, setTeamAnalyticsLoading] = useState(false);
  const [teamAnalyticsError, setTeamAnalyticsError] = useState<string | null>(null);
  const [rubricFlags, setRubricFlags] = useState<any[]>([]);
  const [rubricFlagsLoading, setRubricFlagsLoading] = useState(false);
  const [rubricFlagsError, setRubricFlagsError] = useState<string | null>(null);
  const [gameVersionMap, setGameVersionMap] = useState<Record<string, GameOverrideVersion[]>>({});
  const [gameVersionLoading, setGameVersionLoading] = useState<Record<string, boolean>>({});
  const [gameVersionError, setGameVersionError] = useState<Record<string, string | null>>({});
  const [teamGamesTeamId, setTeamGamesTeamId] = useState<string>('');
  const [isLoadingTeamGames, setIsLoadingTeamGames] = useState(false);
  const [teamGamesError, setTeamGamesError] = useState<string | null>(null);
  const [customGameDraft, setCustomGameDraft] = useState({
    id: '',
    title: '',
    description: '',
    task: '',
    placeholder: '',
    skillCategory: 'boolean' as SkillCategory,
    difficulty: 'easy' as Difficulty,
    exampleSolution: '',
    promptTemplate: '',
    validationJson: '',
    rubricJson: '',
    featured: false,
    active: true,
    isTeamGame: false,
  });
  const [customEditorJson, setCustomEditorJson] = useState<Record<string, { validation: string; rubric: string }>>({});

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


  const fetchReviewQueue = async (statusOverride?: 'pending' | 'all') => {
    if (!isAuthorized) return;
    const status = statusOverride || reviewQueueStatus;
    setReviewQueueLoading(true);
    setReviewQueueError(null);
    try {
      const res = await fetch(`/api/admin?action=review-queue&status=${status}`, { credentials: 'include' });
      if (res.status === 401) {
        setIsAuthorized(false);
        addToast('Session expired, please log in again', 'error');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || body?.error || 'Failed to load review queue');
      }
      const body = await res.json();
      setReviewQueueItems(body.items || []);
    } catch (err) {
      setReviewQueueError(err instanceof Error ? err.message : 'Failed to load review queue');
      setReviewQueueItems([]);
    } finally {
      setReviewQueueLoading(false);
    }
  };

  const fetchTeamAnalytics = async () => {
    if (!isAuthorized) return;
    setTeamAnalyticsLoading(true);
    setTeamAnalyticsError(null);
    try {
      const res = await fetch('/api/admin?action=team-analytics', { credentials: 'include' });
      if (res.status === 401) {
        setIsAuthorized(false);
        addToast('Session expired, please log in again', 'error');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || body?.error || 'Failed to load team analytics');
      }
      const body = await res.json();
      setTeamAnalytics(body.teams || []);
    } catch (err) {
      setTeamAnalyticsError(err instanceof Error ? err.message : 'Failed to load team analytics');
      setTeamAnalytics([]);
    } finally {
      setTeamAnalyticsLoading(false);
    }
  };

  const fetchRubricFlags = async () => {
    if (!isAuthorized) return;
    setRubricFlagsLoading(true);
    setRubricFlagsError(null);
    try {
      const res = await fetch('/api/admin?action=rubric-flags', { credentials: 'include' });
      if (res.status === 401) {
        setIsAuthorized(false);
        addToast('Session expired, please log in again', 'error');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || body?.error || 'Failed to load rubric flags');
      }
      const body = await res.json();
      setRubricFlags(body.flags || []);
    } catch (err) {
      setRubricFlagsError(err instanceof Error ? err.message : 'Failed to load rubric flags');
      setRubricFlags([]);
    } finally {
      setRubricFlagsLoading(false);
    }
  };

  const fetchGameVersions = async (gameId: string) => {
    if (!isAuthorized) return;
    setGameVersionLoading(prev => ({ ...prev, [gameId]: true }));
    setGameVersionError(prev => ({ ...prev, [gameId]: null }));
    try {
      const res = await fetch(`/api/admin?action=game-versions&id=${encodeURIComponent(gameId)}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setIsAuthorized(false);
        addToast('Session expired, please log in again', 'error');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || body?.error || 'Failed to load versions');
      }
      const body = await res.json();
      setGameVersionMap(prev => ({ ...prev, [gameId]: body.versions || [] }));
    } catch (err) {
      setGameVersionError(prev => ({
        ...prev,
        [gameId]: err instanceof Error ? err.message : 'Failed to load versions'
      }));
    } finally {
      setGameVersionLoading(prev => ({ ...prev, [gameId]: false }));
    }
  };

  const rollbackGameVersion = async (versionId: string, gameId: string) => {
    if (!isAuthorized) {
      addToast('Please log in first', 'error');
      return;
    }
    const res = await fetch('/api/admin?action=rollback-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ versionId }),
    });
    if (res.status === 401) {
      setIsAuthorized(false);
      addToast('Session expired, please log in again', 'error');
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      addToast(body?.error?.message || 'Rollback failed', 'error');
      return;
    }
    addToast('Rollback complete', 'success');
    fetchAll();
    fetchGameVersions(gameId);
  };

  const resolveReviewItem = async (id: string, status: 'resolved' | 'dismissed') => {
    if (!isAuthorized) {
      addToast('Please log in first', 'error');
      return;
    }
    const res = await fetch('/api/admin?action=resolve-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status }),
    });
    if (res.status === 401) {
      setIsAuthorized(false);
      addToast('Session expired, please log in again', 'error');
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      addToast(body?.error?.message || 'Failed to update review item', 'error');
      return;
    }
    addToast('Review item updated', 'success');
    fetchReviewQueue();
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

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab !== 'review-queue') return;
    fetchReviewQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthorized, reviewQueueStatus]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab !== 'team-analytics') return;
    fetchTeamAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab !== 'rubric-tuning') return;
    fetchRubricFlags();
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

  const baseGameIds = useMemo(() => new Set(baseGames.map(g => g.id)), []);
  const skillCategories = useMemo(() => {
    const categories = Array.from(new Set(baseGames.map(g => g.skillCategory)));
    return categories.length ? categories : ['boolean'];
  }, []);
  const customOverrides = useMemo(
    () => gameOverrides.filter(o => !baseGameIds.has(o.id)),
    [gameOverrides, baseGameIds]
  );

  const updateOverride = (id: string, patch: Partial<GameOverride>) => {
    setGameOverrides(prev => {
      const existing = prev.find(o => o.id === id) || { id };
      return [...prev.filter(o => o.id !== id), { ...existing, ...patch }];
    });
  };

  const normalizeCustomConfig = (override?: GameOverride) => {
    let config: any = override?.rubric_json ?? {};
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch {
        config = {};
      }
    }
    return {
      isCustom: true,
      difficulty: (config.difficulty || 'easy') as Difficulty,
      skillCategory: (config.skillCategory || 'boolean') as SkillCategory,
      placeholder: config.placeholder || '',
      exampleSolution: config.exampleSolution || '',
      validation: config.validation,
      rubric: config.rubric,
      isTeamGame: Boolean(config.isTeamGame),
    };
  };

  const updateCustomOverride = (
    override: GameOverride,
    patchOverride: Partial<GameOverride>,
    patchConfig: Partial<ReturnType<typeof normalizeCustomConfig>>
  ) => {
    const existing = overridesMap.get(override.id) || override;
    const nextConfig = { ...normalizeCustomConfig(existing), ...patchConfig, isCustom: true };
    updateOverride(override.id, { ...existing, ...patchOverride, rubric_json: nextConfig });
  };

  const parseJsonInput = (label: string, raw: string) => {
    if (!raw.trim()) return undefined;
    try {
      return JSON.parse(raw);
    } catch (err) {
      addToast(`${label} must be valid JSON`, 'error');
      throw err;
    }
  };

  const handleCreateCustomGame = async () => {
    if (!isAuthorized) {
      addToast('Please log in first', 'error');
      return;
    }
    if (!customGameDraft.id || !customGameDraft.title || !customGameDraft.task) {
      addToast('Custom games require ID, title, and task', 'error');
      return;
    }

    let validation: any = undefined;
    let rubric: any = undefined;
    try {
      validation = parseJsonInput('Validation JSON', customGameDraft.validationJson);
      rubric = parseJsonInput('Rubric JSON', customGameDraft.rubricJson);
    } catch {
      return;
    }

    const config = {
      isCustom: true,
      difficulty: customGameDraft.difficulty,
      skillCategory: customGameDraft.skillCategory,
      placeholder: customGameDraft.placeholder,
      exampleSolution: customGameDraft.exampleSolution,
      validation,
      rubric,
      isTeamGame: customGameDraft.isTeamGame,
    };

    await handleSaveOverride({
      id: customGameDraft.id,
      title: customGameDraft.title,
      description: customGameDraft.description,
      task: customGameDraft.task,
      prompt_template: customGameDraft.promptTemplate,
      rubric_json: config,
      featured: customGameDraft.featured,
      active: customGameDraft.active,
    });

    setCustomGameDraft({
      id: '',
      title: '',
      description: '',
      task: '',
      placeholder: '',
      skillCategory: customGameDraft.skillCategory,
      difficulty: customGameDraft.difficulty,
      exampleSolution: '',
      promptTemplate: '',
      validationJson: '',
      rubricJson: '',
      featured: false,
      active: true,
      isTeamGame: false,
    });
  };

  const handleSaveCustomOverride = async (override: GameOverride) => {
    const config = normalizeCustomConfig(override);
    const editor = customEditorJson[override.id];

    let validation: any = config.validation;
    let rubric: any = config.rubric;
    try {
      if (editor?.validation !== undefined) {
        validation = parseJsonInput('Validation JSON', editor.validation);
      }
      if (editor?.rubric !== undefined) {
        rubric = parseJsonInput('Rubric JSON', editor.rubric);
      }
    } catch {
      return;
    }

    const payload: GameOverride = {
      ...override,
      rubric_json: {
        ...config,
        validation,
        rubric,
        isCustom: true,
      },
    };

    await handleSaveOverride(payload);
  };

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
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-bold text-white mb-3">Custom Game Builder</h4>
        <p className="text-xs text-gray-400 mb-4">
          Create new games that appear in the main game list. Required fields are ID, title, and task.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-xs text-gray-400">Game ID (unique)</label>
            <div className="flex gap-2 mt-1">
              <input
                value={customGameDraft.id}
                onChange={e => setCustomGameDraft(prev => ({ ...prev, id: e.target.value }))}
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                placeholder="custom-game-001"
                disabled={!isAuthorized}
              />
              <button
                type="button"
                className="px-2 py-1 bg-gray-700 text-gray-200 rounded text-xs"
                disabled={!isAuthorized}
                onClick={() => {
                  const newId = `custom-${Date.now()}`;
                  setCustomGameDraft(prev => ({ ...prev, id: newId }));
                }}
              >
                Generate
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Title</label>
            <input
              value={customGameDraft.title}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, title: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              placeholder="New custom challenge"
              disabled={!isAuthorized}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Description</label>
            <input
              value={customGameDraft.description}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, description: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              placeholder="Short summary shown in the game list"
              disabled={!isAuthorized}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Task</label>
            <textarea
              value={customGameDraft.task}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, task: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              rows={3}
              placeholder="Player instructions for this custom game"
              disabled={!isAuthorized}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Skill Category</label>
            <select
              value={customGameDraft.skillCategory}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, skillCategory: e.target.value as SkillCategory }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              disabled={!isAuthorized}
            >
              {skillCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Difficulty</label>
            <select
              value={customGameDraft.difficulty}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, difficulty: e.target.value as Difficulty }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              disabled={!isAuthorized}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Placeholder</label>
            <input
              value={customGameDraft.placeholder}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, placeholder: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              placeholder="Enter your response..."
              disabled={!isAuthorized}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Example Solution (optional)</label>
            <textarea
              value={customGameDraft.exampleSolution}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, exampleSolution: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              rows={3}
              placeholder="Provide a reference example for similarity scoring"
              disabled={!isAuthorized}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Prompt Template (optional)</label>
            <textarea
              value={customGameDraft.promptTemplate}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, promptTemplate: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              rows={3}
              placeholder="Override the scoring prompt for this custom game"
              disabled={!isAuthorized}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Validation JSON (optional)</label>
            <textarea
              value={customGameDraft.validationJson}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, validationJson: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              rows={4}
              placeholder='{"minWords": 50}'
              disabled={!isAuthorized}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Rubric JSON (optional)</label>
            <textarea
              value={customGameDraft.rubricJson}
              onChange={e => setCustomGameDraft(prev => ({ ...prev, rubricJson: e.target.value }))}
              className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
              rows={4}
              placeholder='[{"criteria":"Clarity","points":25,"description":"Clear structure"}]'
              disabled={!isAuthorized}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={customGameDraft.featured}
                onChange={e => setCustomGameDraft(prev => ({ ...prev, featured: e.target.checked }))}
                disabled={!isAuthorized}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={customGameDraft.active}
                onChange={e => setCustomGameDraft(prev => ({ ...prev, active: e.target.checked }))}
                disabled={!isAuthorized}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={customGameDraft.isTeamGame}
                onChange={e => setCustomGameDraft(prev => ({ ...prev, isTeamGame: e.target.checked }))}
                disabled={!isAuthorized}
              />
              Team Game
            </label>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className={`px-3 py-2 rounded text-sm ${isAuthorized ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
            onClick={handleCreateCustomGame}
            disabled={!isAuthorized}
          >
            Save Custom Game
          </button>
        </div>
      </div>

      {customOverrides.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-white">Custom Games</h4>
          {customOverrides.map(override => {
            const config = normalizeCustomConfig(override);
            const editor = customEditorJson[override.id] || {
              validation: config.validation ? JSON.stringify(config.validation, null, 2) : '',
              rubric: config.rubric ? JSON.stringify(config.rubric, null, 2) : '',
            };
            return (
              <div key={override.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white font-semibold">{override.title || 'Custom Game'}</p>
                    <p className="text-xs text-gray-400">ID: {override.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={override.active !== false}
                        disabled={!isAuthorized}
                        onChange={e => updateOverride(override.id, { ...override, active: e.target.checked })}
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-1 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={Boolean(override.featured)}
                        disabled={!isAuthorized}
                        onChange={e => updateOverride(override.id, { ...override, featured: e.target.checked })}
                      />
                      Featured
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <label className="text-xs text-gray-400">Title</label>
                    <input
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      value={override.title || ''}
                      disabled={!isAuthorized}
                      onChange={e => updateOverride(override.id, { ...override, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Skill Category</label>
                    <select
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      value={config.skillCategory}
                      disabled={!isAuthorized}
                      onChange={e => updateCustomOverride(override, {}, { skillCategory: e.target.value as SkillCategory })}
                    >
                      {skillCategories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Difficulty</label>
                    <select
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      value={config.difficulty}
                      disabled={!isAuthorized}
                      onChange={e => updateCustomOverride(override, {}, { difficulty: e.target.value as Difficulty })}
                    >
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Placeholder</label>
                    <input
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      value={config.placeholder}
                      disabled={!isAuthorized}
                      onChange={e => updateCustomOverride(override, {}, { placeholder: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Description</label>
                    <input
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      value={override.description || ''}
                      disabled={!isAuthorized}
                      onChange={e => updateOverride(override.id, { ...override, description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Task</label>
                    <textarea
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      rows={3}
                      value={override.task || ''}
                      disabled={!isAuthorized}
                      onChange={e => updateOverride(override.id, { ...override, task: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Example Solution</label>
                    <textarea
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      rows={3}
                      value={config.exampleSolution}
                      disabled={!isAuthorized}
                      onChange={e => updateCustomOverride(override, {}, { exampleSolution: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Prompt Template</label>
                    <textarea
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      rows={3}
                      value={override.prompt_template || ''}
                      disabled={!isAuthorized}
                      onChange={e => updateOverride(override.id, { ...override, prompt_template: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Validation JSON</label>
                    <textarea
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      rows={4}
                      value={editor.validation}
                      disabled={!isAuthorized}
                      onChange={e => setCustomEditorJson(prev => ({
                        ...prev,
                        [override.id]: { ...editor, validation: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Rubric JSON</label>
                    <textarea
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                      rows={4}
                      value={editor.rubric}
                      disabled={!isAuthorized}
                      onChange={e => setCustomEditorJson(prev => ({
                        ...prev,
                        [override.id]: { ...editor, rubric: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    className={`px-3 py-1 rounded text-sm ${isAuthorized ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
                    onClick={() => isAuthorized && handleSaveCustomOverride(override)}
                    disabled={!isAuthorized}
                  >
                    Save Custom Game
                  </button>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Version History</p>
                    <button
                      className="text-xs text-cyan-400"
                      onClick={() => fetchGameVersions(override.id)}
                      disabled={!isAuthorized || gameVersionLoading[override.id]}
                    >
                      {gameVersionLoading[override.id] ? 'Loading...' : 'Load Versions'}
                    </button>
                  </div>
                  {gameVersionError[override.id] && (
                    <p className="text-xs text-red-400 mt-1">{gameVersionError[override.id]}</p>
                  )}
                  {(gameVersionMap[override.id] || []).length > 0 && (
                    <div className="mt-2 space-y-2">
                      {gameVersionMap[override.id].slice(0, 5).map(version => (
                        <div key={version.id} className="bg-gray-900 rounded p-2 text-xs text-gray-300 flex items-center justify-between gap-2">
                          <div>
                            <p>Saved: {new Date(version.created_at).toLocaleString()}</p>
                            <p>By: {version.created_by || 'admin'}</p>
                          </div>
                          <button
                            className="px-2 py-1 bg-gray-700 text-white rounded"
                            onClick={() => rollbackGameVersion(version.id, override.id)}
                          >
                            Rollback
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                  onChange={e => updateOverride(game.id, { ...override, id: game.id, active: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-1 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={Boolean(override.featured)}
                  disabled={!isAuthorized}
                  onChange={e => updateOverride(game.id, { ...override, id: game.id, featured: e.target.checked })}
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
              onChange={e => updateOverride(game.id, { ...override, id: game.id, prompt_template: e.target.value })}
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
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Version History</p>
                <button
                  className="text-xs text-cyan-400"
                  onClick={() => fetchGameVersions(game.id)}
                  disabled={!isAuthorized || gameVersionLoading[game.id]}
                >
                  {gameVersionLoading[game.id] ? 'Loading...' : 'Load Versions'}
                </button>
              </div>
              {gameVersionError[game.id] && (
                <p className="text-xs text-red-400 mt-1">{gameVersionError[game.id]}</p>
              )}
              {(gameVersionMap[game.id] || []).length > 0 && (
                <div className="mt-2 space-y-2">
                  {gameVersionMap[game.id].slice(0, 5).map(version => (
                    <div key={version.id} className="bg-gray-900 rounded p-2 text-xs text-gray-300 flex items-center justify-between gap-2">
                      <div>
                        <p>Saved: {new Date(version.created_at).toLocaleString()}</p>
                        <p>By: {version.created_by || 'admin'}</p>
                      </div>
                      <button
                        className="px-2 py-1 bg-gray-700 text-white rounded"
                        onClick={() => rollbackGameVersion(version.id, game.id)}
                      >
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

  const renderTeamAnalytics = () => (
    <div className="bg-gray-800 rounded-lg p-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Login" to view team analytics.
        </div>
      )}
      {isAuthorized && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div>
              <h4 className="text-lg font-bold text-white">Team Analytics</h4>
              <p className="text-xs text-gray-400">Skill gaps, contribution impact, and collaboration patterns.</p>
            </div>
            <button
              className="text-sm text-cyan-400"
              onClick={fetchTeamAnalytics}
              disabled={teamAnalyticsLoading}
            >
              {teamAnalyticsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {teamAnalyticsError && (
            <div className="bg-red-900 bg-opacity-40 border border-red-600 text-red-100 p-3 rounded mb-4 text-sm">
              {teamAnalyticsError}
            </div>
          )}

          {teamAnalytics.length === 0 ? (
            <p className="text-sm text-gray-400">No team analytics available.</p>
          ) : (
            <div className="space-y-4">
              {teamAnalytics.map((team) => (
                <div key={team.teamId} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold">{team.teamName}</p>
                      <p className="text-xs text-gray-400">Members: {team.memberCount} | Team submissions: {team.totalTeamSubmissions} | Avg score: {team.avgTeamScore}/100</p>
                      {team.lastTeamSubmissionAt && (
                        <p className="text-xs text-gray-400">Last team submission: {new Date(team.lastTeamSubmissionAt).toLocaleString()}</p>
                      )}
                      <p className="text-xs text-gray-400">Unique submitters: {team.uniqueSubmitters} | Top submitter share: {team.topSubmitterShare}%</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${team.isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                      {team.isActive ? 'active' : 'inactive'}
                    </span>
                  </div>

                  {Array.isArray(team.skillGaps) && team.skillGaps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-2">Skill gaps (lowest averages first)</p>
                      <div className="flex flex-wrap gap-2">
                        {team.skillGaps.slice(0, 6).map((gap: any) => (
                          <span key={gap.skill} className="text-xs bg-gray-800 text-cyan-300 px-2 py-1 rounded">
                            {gap.skill}: {gap.avgScore}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(team.members) && team.members.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-400 mb-2">Contribution impact</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {team.members.slice(0, 6).map((member: any) => (
                          <div key={member.playerId} className="bg-gray-800 rounded p-2">
                            <p className="text-sm text-white">{member.playerName} <span className="text-xs text-gray-400">({member.role})</span></p>
                            <p className="text-xs text-gray-400">Attempts: {member.totalAttempts} | Avg: {member.avgScore}/100 | Team submissions: {member.teamSubmissions}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderRubricTuning = () => (
    <div className="bg-gray-800 rounded-lg p-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Login" to view rubric tuning flags.
        </div>
      )}
      {isAuthorized && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div>
              <h4 className="text-lg font-bold text-white">Rubric Tuning</h4>
              <p className="text-xs text-gray-400">Auto-flagged criteria with inconsistent scoring.</p>
            </div>
            <button
              className="text-sm text-cyan-400"
              onClick={fetchRubricFlags}
              disabled={rubricFlagsLoading}
            >
              {rubricFlagsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {rubricFlagsError && (
            <div className="bg-red-900 bg-opacity-40 border border-red-600 text-red-100 p-3 rounded mb-4 text-sm">
              {rubricFlagsError}
            </div>
          )}

          {rubricFlags.length === 0 ? (
            <p className="text-sm text-gray-400">No rubric flags detected yet.</p>
          ) : (
            <div className="space-y-3">
              {rubricFlags.map((flag: any, idx: number) => (
                <div key={`${flag.gameId}-${flag.criterion}-${idx}`} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-white font-semibold">{flag.gameTitle} | {flag.criterion}</p>
                  <p className="text-xs text-gray-400">Samples: {flag.sampleSize} | Avg: {flag.avgPoints} | Std dev: {flag.stdDev}</p>
                  <p className="text-xs text-orange-200 mt-1">{flag.reason}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderReviewQueue = () => (
    <div className="bg-gray-800 rounded-lg p-4">
      {!isAuthorized && (
        <div className="bg-yellow-900 bg-opacity-40 border border-yellow-600 text-yellow-100 p-4 rounded">
          Enter an admin token and click "Login" to view review queue items.
        </div>
      )}
      {isAuthorized && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div>
              <h4 className="text-lg font-bold text-white">Human Review Queue</h4>
              <p className="text-xs text-gray-400">Low-confidence or gaming-flagged submissions.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={reviewQueueStatus}
                onChange={e => setReviewQueueStatus(e.target.value as 'pending' | 'all')}
                className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="all">All</option>
              </select>
              <button
                className="text-sm text-cyan-400"
                onClick={() => fetchReviewQueue()}
                disabled={reviewQueueLoading}
              >
                {reviewQueueLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {reviewQueueError && (
            <div className="bg-red-900 bg-opacity-40 border border-red-600 text-red-100 p-3 rounded mb-4 text-sm">
              {reviewQueueError}
            </div>
          )}

          {reviewQueueItems.length === 0 ? (
            <p className="text-sm text-gray-400">No review items found.</p>
          ) : (
            <div className="space-y-3">
              {reviewQueueItems.map(item => (
                <div key={item.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold">{item.player_name} | {item.game_title}</p>
                      <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString()} | {item.game_type} | Score {item.score}/100</p>
                      {item.confidence !== null && (
                        <p className="text-xs text-gray-400">Confidence: {Math.round(item.confidence)}%</p>
                      )}
                      {(item.integrity_risk || item.gaming_risk) && (
                        <p className="text-xs text-gray-400">
                          Integrity: {item.integrity_risk || 'n/a'} | Gaming: {item.gaming_risk || 'n/a'}
                        </p>
                      )}
                      {Array.isArray(item.reasons) && item.reasons.length > 0 && (
                        <ul className="text-xs text-orange-200 mt-2 list-disc list-inside">
                          {item.reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded bg-green-700 text-white text-xs"
                        onClick={() => resolveReviewItem(item.id, 'resolved')}
                      >
                        Resolve
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-gray-700 text-white text-xs"
                        onClick={() => resolveReviewItem(item.id, 'dismissed')}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
        <TabButton label="Team Analytics" active={activeTab === 'team-analytics'} onClick={() => setActiveTab('team-analytics')} disabled={!isAuthorized} />
        <TabButton label="Rubric Tuning" active={activeTab === 'rubric-tuning'} onClick={() => setActiveTab('rubric-tuning')} disabled={!isAuthorized} />
        <TabButton label="Review Queue" active={activeTab === 'review-queue'} onClick={() => setActiveTab('review-queue')} disabled={!isAuthorized} />
        <TabButton label="Flagged Comments" active={activeTab === 'flagged-comments'} onClick={() => setActiveTab('flagged-comments')} disabled={!isAuthorized} />
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'players' && renderPlayers()}
      {activeTab === 'attempts' && renderAttempts()}
      {activeTab === 'games' && renderGames()}
      {activeTab === 'teams' && renderTeams()}
      {activeTab === 'team-games' && renderTeamGames()}
      {activeTab === 'team-analytics' && renderTeamAnalytics()}
      {activeTab === 'rubric-tuning' && renderRubricTuning()}
      {activeTab === 'review-queue' && renderReviewQueue()}
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
