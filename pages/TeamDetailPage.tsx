import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeamContext } from '../context/TeamContext';
import { usePlayerContext } from '../context/PlayerContext';
import { Team, TeamMember, TeamAttempt } from '../types';
import { getRoleDisplayText, getRoleBadgeColor, formatInviteCode } from '../utils/teamUtils';
import Header from '../components/Header';
import { useUIContext } from '../context/UIContext';

const TeamDetailPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { player } = usePlayerContext();
  const { leaveTeam: leaveTeamContext } = useTeamContext();
  const { setCurrentPage } = useUIContext();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamAttempts, setTeamAttempts] = useState<TeamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setCurrentPage('teams');
  }, [setCurrentPage]);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) {
        setError('Invalid team ID');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/teams?action=details&teamId=${encodeURIComponent(teamId)}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type') || '';
          const body = contentType.includes('application/json')
            ? JSON.stringify(await response.json())
            : (await response.text()).slice(0, 200);
          throw new Error(`Team not found (HTTP ${response.status}): ${body}`);
        }

        const teamData: Team = await response.json();
        setTeam(teamData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  // Fetch team game attempts
  useEffect(() => {
    const fetchTeamAttempts = async () => {
      if (!teamId) return;

      setIsLoadingAttempts(true);
      try {
        const response = await fetch(`/api/team-games?action=attempts&teamId=${encodeURIComponent(teamId)}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const attempts: TeamAttempt[] = await response.json();
          setTeamAttempts(attempts);
        }
      } catch (err) {
        console.error('Failed to fetch team attempts:', err);
      } finally {
        setIsLoadingAttempts(false);
      }
    };

    fetchTeamAttempts();
  }, [teamId]);

  const handleLeaveTeam = async () => {
    if (!team || !player) return;

    const confirmed = window.confirm('Are you sure you want to leave this team?');
    if (!confirmed) return;

    try {
      await leaveTeamContext(team.id);
      navigate('/teams');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave team');
    }
  };

  const handleCopyInviteCode = () => {
    if (!team) return;

    navigator.clipboard.writeText(team.inviteCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const isUserMember = team?.members?.some((m) => m.playerId === player?.id);
  const userMember = team?.members?.find((m) => m.playerId === player?.id);
  const isOwner = userMember?.role === 'owner';

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg p-12 text-center shadow-xl">
            <p className="text-gray-400">Loading team details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !team) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg p-12 text-center shadow-xl">
            <p className="text-red-400 text-lg mb-4">{error || 'Team not found'}</p>
            <button
              onClick={() => navigate('/teams')}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold"
            >
              Back to Teams
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/teams')}
          className="mb-6 text-cyan-400 hover:text-cyan-300 transition flex items-center gap-2"
        >
          ← Back to Teams
        </button>

        {/* Team Header */}
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{team.name}</h1>
              {team.description && (
                <p className="text-gray-400 mb-4">{team.description}</p>
              )}

              {/* Team Stats */}
              <div className="grid grid-cols-3 gap-6 mt-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Members</p>
                  <p className="text-2xl font-bold text-white">
                    {team.memberCount}/{team.maxMembers}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Average Score</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {team.averageScore !== undefined ? team.averageScore : '--'}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Created</p>
                  <p className="text-white font-semibold">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            {isUserMember && !isOwner && (
              <button
                onClick={handleLeaveTeam}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
              >
                Leave Team
              </button>
            )}

            {isUserMember && (
              <button
                onClick={() => setShowInviteCode(!showInviteCode)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
              >
                {showInviteCode ? 'Hide' : 'Show'} Invite Code
              </button>
            )}
          </div>

          {/* Invite Code Section */}
          {showInviteCode && isUserMember && (
            <div className="mt-4 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
              <p className="text-blue-300 text-sm mb-2">Share this code to invite others:</p>
              <div className="flex items-center gap-3">
                <code className="text-2xl font-mono font-bold text-white bg-gray-700 px-4 py-2 rounded-lg">
                  {formatInviteCode(team.inviteCode)}
                </code>
                <button
                  onClick={handleCopyInviteCode}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold"
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-cyan-400 mb-6">Team Members</h2>

          {!team.members || team.members.length === 0 ? (
            <p className="text-gray-400">No members found.</p>
          ) : (
            <div className="space-y-3">
              {team.members
                .sort((a, b) => {
                  // Sort by role (owner > admin > member) then by score
                  const roleOrder = { owner: 0, admin: 1, member: 2 };
                  if (roleOrder[a.role] !== roleOrder[b.role]) {
                    return roleOrder[a.role] - roleOrder[b.role];
                  }
                  return (b.score || 0) - (a.score || 0);
                })
                .map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-white font-semibold">{member.playerName}</p>
                        <p className="text-gray-400 text-sm">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(
                          member.role
                        )}`}
                      >
                        {getRoleDisplayText(member.role)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-cyan-400 font-bold text-xl">{member.score || 0}</p>
                      <p className="text-gray-400 text-xs">Score</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Team Game Attempts */}
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl mt-6">
          <h2 className="text-2xl font-bold text-purple-400 mb-6">Team Game History</h2>

          {isLoadingAttempts ? (
            <p className="text-gray-400">Loading team game attempts...</p>
          ) : !teamAttempts || teamAttempts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No team game attempts yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Play team games to see your team's performance here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="bg-gray-700 rounded-lg p-4 border-l-4 border-purple-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{attempt.gameTitle}</h3>
                      <p className="text-gray-400 text-sm">
                        Submitted by {attempt.submittedByName} •{' '}
                        {new Date(attempt.ts).toLocaleDateString()} at{' '}
                        {new Date(attempt.ts).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        attempt.score >= 80
                          ? 'text-green-400'
                          : attempt.score >= 60
                          ? 'text-yellow-400'
                          : 'text-orange-400'
                      }`}>
                        {attempt.score}/100
                      </p>
                      {attempt.skill && (
                        <span className="inline-block mt-1 px-2 py-1 bg-purple-900 text-purple-300 text-xs rounded-full">
                          {attempt.skill}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission Preview */}
                  <div className="mt-3 p-3 bg-gray-800 rounded-md">
                    <p className="text-gray-400 text-xs mb-1">Submission:</p>
                    <p className="text-gray-300 text-sm line-clamp-3">{attempt.submission}</p>
                  </div>

                  {/* Feedback if available */}
                  {attempt.feedback && (
                    <details className="mt-3">
                      <summary className="text-purple-400 text-sm cursor-pointer hover:text-purple-300">
                        View Feedback
                      </summary>
                      <div className="mt-2 p-3 bg-gray-800 rounded-md text-gray-300 text-sm">
                        {(() => {
                          try {
                            const feedbackData = JSON.parse(attempt.feedback);
                            return (
                              <div>
                                {feedbackData.strengths && feedbackData.strengths.length > 0 && (
                                  <div className="mb-2">
                                    <p className="font-semibold text-green-400">Strengths:</p>
                                    <ul className="list-disc list-inside">
                                      {feedbackData.strengths.map((s: string, i: number) => (
                                        <li key={i}>{s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {feedbackData.feedback && feedbackData.feedback.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-yellow-400">Feedback:</p>
                                    <ul className="list-disc list-inside">
                                      {feedbackData.feedback.map((f: string, i: number) => (
                                        <li key={i}>{f}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          } catch {
                            return <p>{attempt.feedback}</p>;
                          }
                        })()}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TeamDetailPage;
