
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { validateName } from '../utils/nameValidator';

const NameModal: React.FC = () => {
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { setPlayer, addToast } = useAppContext();

  const checkAvailability = async (candidate: string) => {
    if (!candidate.trim()) {
      setAvailable(null);
      setValidationError(null);
      return;
    }

    // First validate the name format
    const validation = validateName(candidate);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid name');
      setAvailable(null);
      return;
    }

    // Clear validation error if name is valid
    setValidationError(null);

    // Then check availability
    setChecking(true);
    try {
      const taken = await (await import('../services/supabaseService')).isNameTaken(candidate.trim());
      setAvailable(!taken);
    } catch {
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  let debounceTimer: number | undefined;
  const onNameChange = (v: string) => {
    setName(v);
    setAvailable(null); // Reset availability when typing
    setValidationError(null); // Reset validation error when typing
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => checkAvailability(v), 350);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();

    // Check if name is empty
    if (!trimmedName) {
      addToast('Please enter your name', 'error');
      return;
    }

    // Validate name format (length, characters, profanity)
    const validation = validateName(trimmedName);
    if (!validation.isValid) {
      addToast(validation.error || 'Invalid name', 'error');
      return;
    }

    // Check if availability check is still in progress
    if (checking) {
      addToast('Please wait while we check name availability', 'error');
      return;
    }

    setIsCreating(true);
    try {
      // Check if name is already taken (existing player)
      if (available === false) {
        // Name exists - log in as that player
        const existingPlayer = await (await import('../services/supabaseService')).fetchPlayerByName(trimmedName);

        if (existingPlayer) {
          await setPlayer(existingPlayer);
          addToast(`Welcome back, ${existingPlayer.name}! Your score: ${existingPlayer.score} points`, 'success');
        } else {
          addToast('Player not found. Please try again.', 'error');
        }
      } else if (available === true) {
        // Name is available - create new player
        await setPlayer({ name: trimmedName, score: 0, attempts: [] });
        addToast(`Welcome, ${trimmedName}! Ready to test your sourcing skills?`, 'success');
      } else {
        // Availability check hasn't completed
        addToast('Please wait for name validation to complete', 'error');
      }
    } catch (error) {
      console.error('Failed to login/create player:', error);
      addToast('Failed to login/create account. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">Welcome to the AI Sourcing Quiz!</h2>
        <p className="text-gray-300 mb-6">Please enter your full name to join the competition.</p>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Your Name"
              className={`w-full bg-gray-700 border rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 ${
                validationError ? 'border-red-500 focus:ring-red-500' :
                available === true ? 'border-green-500 focus:ring-green-500' :
                available === false ? 'border-cyan-500 focus:ring-cyan-500' :
                'border-gray-600 focus:ring-cyan-500'
              }`}
              required
              minLength={2}
              maxLength={50}
            />
            {checking && (
              <span className="absolute right-3 top-3 text-gray-400 text-sm">Checking...</span>
            )}
            {!checking && validationError && (
              <span className="absolute right-3 top-3 text-red-400 text-sm">✗ Invalid</span>
            )}
            {!checking && !validationError && available === true && (
              <span className="absolute right-3 top-3 text-green-400 text-sm">✓ New player</span>
            )}
            {!checking && !validationError && available === false && (
              <span className="absolute right-3 top-3 text-cyan-400 text-sm">✓ Existing player</span>
            )}
          </div>
          {validationError && (
            <p className="text-red-400 text-sm mt-2">⚠️ {validationError}</p>
          )}
          {!validationError && name.length === 0 && (
            <p className="text-gray-400 text-xs mt-2">💡 Use only letters, spaces, hyphens, and apostrophes (2-50 characters)</p>
          )}
          <button
            type="submit"
            disabled={checking || validationError !== null || available === null || isCreating}
            className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isCreating
              ? (available === false ? 'Logging in...' : 'Creating Account...')
              : (available === false ? 'Login' : 'Create Account')
            }
          </button>
        </form>
      </div>
    </div>
  );
};

export default NameModal;


