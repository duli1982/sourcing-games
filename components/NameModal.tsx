
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const NameModal: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const { setPlayer, addToast } = useAppContext() as any;

  const handleInfoContinue = () => setStep(2);

  const checkAvailability = async (candidate: string) => {
    if (!candidate.trim()) { setAvailable(null); return; }
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
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => checkAvailability(v), 350);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName && (available !== false)) {
      setPlayer({ name: trimmedName, score: 0 });
      addToast('Welcome! You can set up secure sign-in later in Profile.', 'info');
    }
  };

  const handleMagicLink = async () => {
    try {
      if (!email.trim()) return;
      const { signInWithMagicLink } = await import('../services/authService');
      await signInWithMagicLink(email.trim());
      addToast('Magic link sent. Check your email to sign in.', 'success');
    } catch (err) {
      addToast('Failed to send magic link. Please try again.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">Welcome to the AI Sourcing Quiz!</h2>
        <p className="text-gray-300 mb-6">Please enter your full name to join the competition.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
          <button type="submit" className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
            Start Sourcing!
          </button>
        </form>
      </div>
    </div>
  );
};

export default NameModal;


