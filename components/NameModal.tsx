
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { validateName } from '../utils/nameValidator';

const NameModal: React.FC = () => {
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { setPlayer, addToast } = useAppContext();

  const checkAvailability = async (candidate: string) => {
    if (!candidate.trim()) {
      setAvailable(null);
      setValidationError(null);
      setShowLoginPrompt(false);
      return;
    }

    // First validate the name format
    const validation = validateName(candidate);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid name');
      setAvailable(null);
      setShowLoginPrompt(false);
      return;
    }

    // Clear validation error if name is valid
    setValidationError(null);

    // Then check availability
    setChecking(true);
    try {
      const taken = await (await import('../services/supabaseService')).isNameTaken(candidate.trim());
      setAvailable(!taken);
      setShowLoginPrompt(taken); // Show login prompt if name is taken
    } catch {
      setAvailable(null);
      setShowLoginPrompt(false);
    } finally {
      setChecking(false);
    }
  };

  let debounceTimer: number | undefined;
  const onNameChange = (v: string) => {
    setName(v);
    setAvailable(null); // Reset availability when typing
    setValidationError(null); // Reset validation error when typing
    setShowLoginPrompt(false); // Reset login prompt when typing
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => checkAvailability(v), 350);
  };

  const handleLogin = async () => {
    const trimmedName = name.trim();
    setIsCreating(true);
    try {
      const { fetchPlayerByName } = await import('../services/supabaseService');
      const existingPlayer = await fetchPlayerByName(trimmedName);

      if (!existingPlayer) {
        addToast('Account not found. Please try again.', 'error');
        return;
      }

      // Load the existing player
      await setPlayer(existingPlayer);
      addToast(`Welcome back, ${existingPlayer.name}!`, 'success');
    } catch (error) {
      console.error('Failed to log in:', error);
      addToast('Failed to log in. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
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

    // Check if we haven't validated availability yet
    if (available === null) {
      addToast('Please wait for name validation to complete', 'error');
      return;
    }

    // If name is taken, user should use login button instead
    if (available === false) {
      addToast('This name is already registered. Please click "Log In" to access your account.', 'error');
      return;
    }

    // Create new player in Supabase
    setIsCreating(true);
    try {
      await setPlayer({ name: trimmedName, score: 0, attempts: [] });
      addToast(`Welcome, ${trimmedName}! Ready to test your sourcing skills?`, 'success');
    } catch (error) {
      console.error('Failed to create player:', error);
      addToast('Failed to create account. Please try again.', 'error');
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
                available === false ? 'border-red-500 focus:ring-red-500' :
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
              <span className="absolute right-3 top-3 text-green-400 text-sm">✓ Available</span>
            )}
            {!checking && !validationError && available === false && (
              <span className="absolute right-3 top-3 text-red-400 text-sm">✗ Taken</span>
            )}
          </div>
          {validationError && (
            <p className="text-red-400 text-sm mt-2">⚠️ {validationError}</p>
          )}
          {!validationError && name.length === 0 && (
            <p className="text-gray-400 text-xs mt-2">💡 Use only letters, spaces, hyphens, and apostrophes (2-50 characters)</p>
          )}
          {!validationError && showLoginPrompt && (
            <div className="mt-3 p-3 bg-cyan-900 bg-opacity-30 border border-cyan-600 rounded-md">
              <p className="text-cyan-200 text-sm mb-2">
                <strong>Account found!</strong> This name is already registered.
              </p>
              <p className="text-cyan-300 text-xs">
                Is this your account? Click "Log In" to access it, or enter a different name to create a new account.
              </p>
            </div>
          )}

          {/* Show Login button if name is taken, otherwise show Create Account button */}
          {showLoginPrompt ? (
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setAvailable(null);
                  setShowLoginPrompt(false);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
              >
                Choose Different Name
              </button>
              <button
                type="button"
                onClick={handleLogin}
                disabled={isCreating}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Logging In...' : '🔑 Log In'}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={checking || validationError !== null || available === null || available === false || isCreating}
              className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Account...' : '🚀 Start Sourcing!'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default NameModal;


