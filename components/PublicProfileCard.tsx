import React from 'react';
import type { PublicPlayer } from '../types';

interface PublicProfileCardProps {
  player: PublicPlayer;
}

/**
 * PublicProfileCard - Displays player profile header
 * Shows avatar, name, bio, score, and social links
 */
const PublicProfileCard: React.FC<PublicProfileCardProps> = ({ player }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={`${player.name}'s avatar`}
              className="w-24 h-24 rounded-full border-4 border-cyan-600"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-gray-600 bg-gray-700 flex items-center justify-center">
              <span className="text-4xl text-gray-400">
                {player.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white mb-2">{player.name}</h1>

          {/* Score Badge */}
          <div className="inline-flex items-center bg-cyan-600 px-4 py-2 rounded-full mb-3">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-bold text-lg">{player.score.toLocaleString()} points</span>
          </div>

          {/* Bio */}
          {player.bio && (
            <p className="text-gray-300 text-lg mb-4 max-w-2xl">{player.bio}</p>
          )}

          {/* Social Links */}
          {(player.socialLinks?.linkedin || player.socialLinks?.twitter) && (
            <div className="flex gap-3 justify-center md:justify-start">
              {player.socialLinks.linkedin && (
                <a
                  href={player.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                  LinkedIn
                </a>
              )}
              {player.socialLinks.twitter && (
                <a
                  href={player.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </a>
              )}
            </div>
          )}

          {/* Member Since */}
          <div className="mt-4 text-sm text-gray-400">
            Member since {new Date(player.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileCard;
