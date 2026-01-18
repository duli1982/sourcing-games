import React from 'react';
import { Team } from '../types';

interface TeamCardProps {
  team: Team;
  rank?: number;
  onClick?: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, rank, onClick }) => {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`bg-gray-700 rounded-lg p-6 shadow-lg ${
        isClickable ? 'cursor-pointer hover:bg-gray-650 hover:shadow-xl transition-all' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Rank Badge */}
          {rank && (
            <div className="inline-block mb-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  rank === 1
                    ? 'bg-yellow-500 text-gray-900'
                    : rank === 2
                    ? 'bg-gray-300 text-gray-900'
                    : rank === 3
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}
              >
                #{rank}
              </span>
            </div>
          )}

          {/* Team Name */}
          <h3 className="text-xl font-bold text-white mb-2">{team.name}</h3>

          {/* Description */}
          {team.description && (
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{team.description}</p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-xs mb-1">Members</p>
              <p className="text-white font-semibold">
                {team.memberCount}/{team.maxMembers}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Average Score</p>
              <p className="text-cyan-400 font-bold text-lg">
                {team.averageScore !== undefined ? team.averageScore : '--'}
              </p>
            </div>
          </div>

          {/* Created By */}
          <div className="mt-4 pt-4 border-t border-gray-600">
            <p className="text-gray-500 text-xs">
              Created by <span className="text-cyan-400 font-semibold">{team.createdBy}</span>
            </p>
          </div>
        </div>

        {/* Team Logo (if available) */}
        {team.logoUrl && (
          <div className="ml-4 flex-shrink-0">
            <img
              src={team.logoUrl}
              alt={`${team.name} logo`}
              className="w-16 h-16 rounded-lg object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCard;
