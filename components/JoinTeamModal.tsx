import React, { useState } from 'react';
import { useTeamContext } from '../context/TeamContext';
import { usePlayerContext } from '../context/PlayerContext';
import { formatInviteCode } from '../utils/teamUtils';

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JoinTeamModal: React.FC<JoinTeamModalProps> = ({ isOpen, onClose }) => {
  const { joinTeam, isLoading, error, clearError } = useTeamContext();
  const { player } = usePlayerContext();
  const [inviteCode, setInviteCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!player) {
      return;
    }

    try {
      await joinTeam(inviteCode.trim());

      // Success - close modal and reset form
      setInviteCode('');
      onClose();
    } catch (err) {
      // Error handled by context
      console.error('Failed to join team:', err);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    clearError();
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setInviteCode(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-cyan-400 mb-6">Join a Team</h2>

        <form onSubmit={handleSubmit}>
          {/* Invite Code */}
          <div className="mb-6">
            <label htmlFor="invite-code" className="block text-gray-300 text-sm font-semibold mb-2">
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={handleInputChange}
              placeholder="XXXX-XXXX"
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center text-lg tracking-wider font-mono"
              maxLength={9}
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              Enter the 8-character code provided by your team
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
            <p className="text-blue-300 text-sm">
              Ask your team owner for the invite code. You can be a member of multiple teams!
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || inviteCode.length < 8}
            >
              {isLoading ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinTeamModal;
