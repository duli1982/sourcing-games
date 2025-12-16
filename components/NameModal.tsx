import React, { useState } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import { useUIContext } from '../context/UIContext';
import { validateName } from '../utils/nameValidator';
import { requestSessionToken } from '../utils/sessionUtils';
import { hashPin, isValidPin, PIN_LENGTH } from '../utils/pinUtils';

const NameModal: React.FC = () => {
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [returningPin, setReturningPin] = useState('');
  const { setPlayer } = usePlayerContext();
  const { addToast } = useUIContext();

  const checkAvailability = async (candidate: string) => {
    if (!candidate.trim()) {
      setAvailable(null);
      setValidationError(null);
      return;
    }

    const validation = validateName(candidate);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid name');
      setAvailable(null);
      return;
    }

    setValidationError(null);

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

  const debounceRef = React.useRef<number>();
  const onNameChange = (v: string) => {
    setName(v);
    setAvailable(null);
    setValidationError(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => checkAvailability(v), 350);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      addToast('Please enter your name', 'error');
      return;
    }

    const validation = validateName(trimmedName);
    if (!validation.isValid) {
      addToast(validation.error || 'Invalid name', 'error');
      return;
    }

    if (available === false) {
      addToast('This name is already taken. If this is you, click "Returning User" below.', 'error');
      return;
    }

    if (checking) {
      addToast('Please wait while we check name availability', 'error');
      return;
    }

    if (available === null) {
      addToast('Please wait for name validation to complete', 'error');
      return;
    }

    if (!isValidPin(pin)) {
      addToast(`Create a ${PIN_LENGTH}-digit security PIN.`, 'error');
      return;
    }

    if (pin !== confirmPin) {
      addToast('PINs do not match', 'error');
      return;
    }

    const pinHash = await hashPin(pin);

    setIsCreating(true);
    try {
      await setPlayer({ name: trimmedName, score: 0, attempts: [], pinHash });
      addToast(`Welcome, ${trimmedName}! Ready to test your sourcing skills?`, 'success');
      setPin('');
      setConfirmPin('');
    } catch (error) {
      console.error('Failed to create player:', error);
      addToast('Failed to create account. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReturningUser = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      addToast('Please enter your name', 'error');
      return;
    }

    if (!isValidPin(returningPin)) {
      addToast(`Enter your ${PIN_LENGTH}-digit security PIN.`, 'error');
      return;
    }

    setIsCreating(true);
    try {
      const { fetchPlayerByName, updatePlayerSessionToken } = await import('../services/supabaseService');
      const existingPlayer = await fetchPlayerByName(trimmedName);

      if (existingPlayer) {
        if (!existingPlayer.pinHash) {
          addToast('This profile has not been secured with a PIN yet. Please contact an admin to restore access.', 'error');
          setIsCreating(false);
          return;
        }

        const hashedPin = await hashPin(returningPin);
        if (hashedPin !== existingPlayer.pinHash) {
          addToast('Incorrect security PIN. Please try again.', 'error');
          setIsCreating(false);
          return;
        }

        const newSessionToken = await requestSessionToken();
        const updatedPlayer = await updatePlayerSessionToken(existingPlayer.id!, newSessionToken);

        if (updatedPlayer) {
          await setPlayer(updatedPlayer);
          addToast(`Welcome back, ${trimmedName}! dYZ%`, 'success');
          setReturningPin('');
        } else {
          addToast('Failed to reconnect. Please try again.', 'error');
        }
      } else {
        addToast('Account not found. Please create a new account.', 'error');
      }
    } catch (error) {
      console.error('Failed to load returning user:', error);
      addToast('Failed to reconnect. Please try again.', 'error');
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
              className={`w-full bg-gray-700 border rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 ${validationError ? 'border-red-500 focus:ring-red-500' :
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
              <span className="absolute right-3 top-3 text-red-400 text-sm">⚠ Invalid</span>
            )}
            {!checking && !validationError && available === true && (
              <span className="absolute right-3 top-3 text-green-400 text-sm">✅ Available</span>
            )}
            {!checking && !validationError && available === false && (
              <span className="absolute right-3 top-3 text-red-400 text-sm">⚠ Taken</span>
            )}
          </div>
          {validationError && (
            <p className="text-red-400 text-sm mt-2">�s��,? {validationError}</p>
          )}
          {!validationError && name.length === 0 && (
            <p className="text-gray-400 text-xs mt-2">ℹ Use only letters, spaces, hyphens, and apostrophes (2-50 characters)</p>
          )}

          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-300 block mb-1">Create a {PIN_LENGTH}-digit Security PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="mt-3">
            <label className="text-sm font-semibold text-gray-300 block mb-1">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d*"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Re-enter PIN"
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            This PIN secures your account. You’ll need it to return on a new device or browser.
          </p>

          {!validationError && available === false && (
            <div className="mt-3 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-md">
              <p className="text-yellow-200 text-sm mb-2">⚠ This name already exists. Is this you?</p>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                value={returningPin}
                onChange={(e) => setReturningPin(e.target.value)}
                placeholder={`Enter your ${PIN_LENGTH}-digit PIN`}
                className="w-full bg-gray-800 border border-yellow-600 rounded-md px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                type="button"
                onClick={handleReturningUser}
                disabled={isCreating}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Reconnecting...' : 'Yes, I\'m a Returning User'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={available === false || checking || validationError !== null || available === null || isCreating}
            className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-md transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Join the League'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NameModal;
