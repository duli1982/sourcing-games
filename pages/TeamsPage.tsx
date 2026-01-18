import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamContext } from '../context/TeamContext';
import { usePlayerContext } from '../context/PlayerContext';
import CreateTeamModal from '../components/CreateTeamModal';
import JoinTeamModal from '../components/JoinTeamModal';
import TeamCard from '../components/TeamCard';
import { Spinner } from '../components/Spinner';
import { TeamLeaderboardEntry } from '../types';

const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { player } = usePlayerContext();
  const { userTeams, currentTeam, setCurrentTeam, fetchUserTeams } = useTeamContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-teams' | 'leaderboard'>('my-teams');

  // Fetch user teams on mount
  useEffect(() => {
    if (player?.id) {
      fetchUserTeams();
    }
  }, [player?.id, fetchUserTeams]);

  // Fetch team leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      try {
        const response = await fetch('/api/teams?action=leaderboard&limit=50');
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        }
      } catch (error) {
        console.error('Failed to fetch team leaderboard:', error);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };

    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const handleTeamClick = (teamId: string) => {
    navigate(`/team/${teamId}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-cyan-400">Teams</h2>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
          >
            Join Team
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold"
          >
            Create Team
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('my-teams')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'my-teams'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          My Teams ({userTeams.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'leaderboard'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* My Teams Tab */}
      {activeTab === 'my-teams' && (
        <div>
          {userTeams.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center shadow-xl">
              <p className="text-gray-400 text-lg mb-4">You haven't joined any teams yet!</p>
              <p className="text-gray-500 mb-6">
                Create your own team or join an existing one with an invite code.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
                >
                  Join Team
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold"
                >
                  Create Team
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onClick={() => handleTeamClick(team.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div>
          {isLoadingLeaderboard ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center shadow-xl">
              <Spinner />
              <p className="text-gray-400 mt-4">Loading team leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center shadow-xl">
              <p className="text-gray-400 text-lg mb-4">No teams yet!</p>
              <p className="text-gray-500 mb-6">Be the first to create a team and compete!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold"
              >
                Create Team
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((entry) => (
                <TeamCard
                  key={entry.team.id}
                  team={{ ...entry.team, averageScore: entry.averageScore }}
                  rank={entry.rank}
                  onClick={() => handleTeamClick(entry.team.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </div>
  );
};

export default TeamsPage;
