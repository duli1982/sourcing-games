import React, { useState } from 'react';
import { useTeamContext } from '../context/TeamContext';
import { usePlayerContext } from '../context/PlayerContext';
import { isValidTeamName } from '../utils/teamUtils';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose }) => {
  const { createTeam, isLoading, error, clearError } = useTeamContext();
  const { player } = usePlayerContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    // Validate team name
    const nameValidation = isValidTeamName(name);
    if (!nameValidation.valid) {
      setValidationError(nameValidation.error!);
      return;
    }

    if (!player) {
      setValidationError('You must be logged in to create a team');
      return;
    }

    try {
      const newTeam = await createTeam({ name, description });

      // Success - close modal and reset form
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      // Error handled by context
      console.error('Failed to create team:', err);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    clearError();
    setValidationError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-cyan-400 mb-6">Create a New Team</h2>

        <form onSubmit={handleSubmit}>
          {/* Team Name */}
          <div className="mb-4">
            <label htmlFor="team-name" className="block text-gray-300 text-sm font-semibold mb-2">
              Team Name *
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name (3-50 characters)"
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              maxLength={50}
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="team-description" className="block text-gray-300 text-sm font-semibold mb-2">
              Description (Optional)
            </label>
            <textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell others about your team..."
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 h-24 resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-400 mt-1">
              {description.length}/200 characters
            </p>
          </div>

          {/* Error Messages */}
          {(validationError || error) && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{validationError || error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
            <p className="text-blue-300 text-sm">
              You'll receive an invite code after creating the team. Share it with others to let them join!
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
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamModal;
