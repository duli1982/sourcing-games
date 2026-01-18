import React, { useState } from 'react';

interface OnboardingTutorialProps {
    onComplete: () => void;
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to AI Sourcing League! 🎯",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 text-lg">
                        You're about to join a global competition of top recruiters competing in sourcing challenges!
                    </p>
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-bold text-cyan-400 mb-2">What You'll Do:</h4>
                        <ul className="space-y-2 text-gray-300">
                            <li>✅ Play individual games weekly or collaborate with teams bi-weekly</li>
                            <li>✅ Get AI-powered feedback on every scored submission</li>
                            <li>✅ Earn points and climb multiple leaderboards</li>
                            <li>✅ Build your skills solo and strengthen teamwork abilities</li>
                        </ul>
                    </div>
                    <p className="text-sm text-gray-400 italic">
                        Let's take a quick tour to get you started! (Takes ~1 minute)
                    </p>
                </div>
            ),
            icon: "🎯"
        },
        {
            title: "How Scoring Works 📊",
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-cyan-900 to-cyan-800 p-4 rounded-lg border-2 border-cyan-600">
                        <h4 className="font-bold text-white text-xl mb-2">Every submission earns 0-100 points</h4>
                        <p className="text-cyan-100">Based on quality, accuracy, and completeness</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-red-900/30 p-3 rounded border border-red-600">
                            <div className="text-2xl font-bold text-red-400">0-59</div>
                            <div className="text-xs text-gray-400 mt-1">Needs Work</div>
                        </div>
                        <div className="bg-yellow-900/30 p-3 rounded border border-yellow-600">
                            <div className="text-2xl font-bold text-yellow-400">60-79</div>
                            <div className="text-xs text-gray-400 mt-1">Good</div>
                        </div>
                        <div className="bg-green-900/30 p-3 rounded border border-green-600">
                            <div className="text-2xl font-bold text-green-400">80-100</div>
                            <div className="text-xs text-gray-400 mt-1">Excellent</div>
                        </div>
                    </div>

                    <div className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-bold text-white mb-2">Important:</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li>🎯 <strong>Best score per game counts</strong> - only your highest score for each game</li>
                            <li>📊 <strong>Total score</strong> - sum of your best scores across all games</li>
                            <li>🔄 <strong>Unlimited retries</strong> - improve your best scores anytime</li>
                            <li>🏆 <strong>Higher total</strong> = Higher leaderboard rank</li>
                        </ul>
                    </div>
                </div>
            ),
            icon: "📊"
        },
        {
            title: "Challenge vs Practice Mode 🎮",
            content: (
                <div className="space-y-4">
                    <div className="bg-cyan-900/30 p-4 rounded-lg border-2 border-cyan-600">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🏆</span>
                            <h4 className="font-bold text-cyan-400 text-lg">Weekly Challenge</h4>
                        </div>
                        <ul className="space-y-1 text-sm text-gray-300 ml-8">
                            <li>✅ One new game every Friday</li>
                            <li>✅ Full AI feedback and scoring</li>
                            <li>✅ Points count toward leaderboard</li>
                            <li>✅ Unlocks game for practice mode</li>
                        </ul>
                    </div>

                    <div className="bg-purple-900/30 p-4 rounded-lg border-2 border-purple-600">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🎯</span>
                            <h4 className="font-bold text-purple-400 text-lg">Practice Mode</h4>
                        </div>
                        <ul className="space-y-1 text-sm text-gray-300 ml-8">
                            <li>✅ Play previously unlocked games</li>
                            <li>✅ Draft and refine your answers</li>
                            <li>❌ No AI feedback or scoring</li>
                            <li>❌ Doesn't affect leaderboard</li>
                        </ul>
                    </div>

                    <div className="bg-gray-700 p-3 rounded-lg">
                        <p className="text-sm text-cyan-300">
                            💡 <strong>Pro Tip:</strong> Use Practice Mode to draft your answers before submitting in Challenge Mode!
                        </p>
                    </div>
                </div>
            ),
            icon: "🎮"
        },
        {
            title: "Teams & Team Games 👥",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Join forces with other recruiters and tackle collaborative challenges together!
                    </p>

                    <div className="bg-purple-900/30 p-4 rounded-lg border-2 border-purple-600">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">👥</span>
                            <h4 className="font-bold text-purple-400 text-lg">Team Games</h4>
                        </div>
                        <ul className="space-y-1 text-sm text-gray-300 ml-8">
                            <li>✅ New challenge every 2 weeks (15th & end of month)</li>
                            <li>✅ Collaborate with your team on one submission</li>
                            <li>✅ Team's best score per game counts</li>
                            <li>✅ Compete on Team Games Leaderboard</li>
                        </ul>
                    </div>

                    <div className="bg-cyan-900/30 p-4 rounded-lg border-2 border-cyan-600">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🏆</span>
                            <h4 className="font-bold text-cyan-400 text-lg">Teams Leaderboard</h4>
                        </div>
                        <ul className="space-y-1 text-sm text-gray-300 ml-8">
                            <li>✅ Join or create teams with other players</li>
                            <li>✅ Your individual game scores contribute to team total</li>
                            <li>✅ Be on multiple teams simultaneously</li>
                            <li>✅ Compete as a unified squad</li>
                        </ul>
                    </div>

                    <div className="bg-gray-700 p-3 rounded-lg">
                        <p className="text-sm text-purple-300">
                            💡 <strong>Pro Tip:</strong> Teams are optional but unlock collaborative challenges and networking opportunities!
                        </p>
                    </div>
                </div>
            ),
            icon: "👥"
        },
        {
            title: "Achievements & Progress 🏅",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Unlock achievements as you play and improve your sourcing skills!
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-gray-700 p-3 rounded-lg flex items-center gap-3">
                            <span className="text-3xl">🎯</span>
                            <div>
                                <div className="font-bold text-white">Score Achievements</div>
                                <div className="text-xs text-gray-400">Reach scoring milestones (100, 500, 1000+ points)</div>
                            </div>
                        </div>
                        <div className="bg-gray-700 p-3 rounded-lg flex items-center gap-3">
                            <span className="text-3xl">🎮</span>
                            <div>
                                <div className="font-bold text-white">Game Achievements</div>
                                <div className="text-xs text-gray-400">Complete multiple games and challenges</div>
                            </div>
                        </div>
                        <div className="bg-gray-700 p-3 rounded-lg flex items-center gap-3">
                            <span className="text-3xl">⭐</span>
                            <div>
                                <div className="font-bold text-white">Skill Achievements</div>
                                <div className="text-xs text-gray-400">Master specific sourcing categories</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-cyan-900/30 p-4 rounded-lg border border-cyan-600">
                        <p className="text-sm text-cyan-200">
                            🎉 Check your Profile page to see your achievements, game history, and progress over time!
                        </p>
                    </div>
                </div>
            ),
            icon: "🏅"
        },
        {
            title: "You're Ready! 🚀",
            content: (
                <div className="space-y-4 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-xl text-gray-300">
                        You're all set to start your sourcing journey!
                    </p>

                    <div className="bg-gray-700 p-6 rounded-lg text-left">
                        <h4 className="font-bold text-cyan-400 mb-3 text-center">Quick Recap:</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li>1️⃣ Play <strong className="text-cyan-400">Weekly Individual Games</strong> for points & AI feedback</li>
                            <li>2️⃣ Join a <strong className="text-purple-400">Team</strong> to unlock bi-weekly team challenges</li>
                            <li>3️⃣ Compete on <strong className="text-cyan-400">Three Leaderboards</strong> (Individual, Teams, Team Games)</li>
                            <li>4️⃣ Use <strong className="text-purple-400">Practice Mode</strong> to refine your answers</li>
                            <li>5️⃣ Track progress in your <strong className="text-cyan-400">Profile</strong> and earn achievements</li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-r from-cyan-900 to-cyan-800 p-4 rounded-lg border-2 border-cyan-600">
                        <p className="text-cyan-100">
                            💡 You can reopen this tutorial anytime from the <strong>Help</strong> button in the top navigation!
                        </p>
                    </div>
                </div>
            ),
            icon: "🚀"
        }
    ];

    const currentStep = steps[step];
    const isLastStep = step === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            setStep(step + 1);
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">{currentStep.icon}</span>
                            <h2 className="text-2xl font-bold text-cyan-400">{currentStep.title}</h2>
                        </div>
                        {!isLastStep && (
                            <button
                                onClick={handleSkip}
                                className="text-gray-400 hover:text-gray-300 text-sm"
                            >
                                Skip Tutorial
                            </button>
                        )}
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-2 mt-4">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 flex-1 rounded-full transition-all ${
                                    index === step
                                        ? 'bg-cyan-400'
                                        : index < step
                                        ? 'bg-cyan-600'
                                        : 'bg-gray-600'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {currentStep.content}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6 flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                        Step {step + 1} of {steps.length}
                    </div>
                    <div className="flex gap-3">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-md transition"
                            >
                                ← Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-md transition"
                        >
                            {isLastStep ? "Let's Go! 🚀" : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTutorial;
