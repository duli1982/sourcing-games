
import React from 'react';

const learningModules = [
    {
        title: "Advanced Boolean",
        description: "Go beyond AND, OR, NOT. Master X-ray searching, semantic search, and more.",
    },
    {
        title: "Candidate Engagement",
        description: "Learn to craft outreach messages that get replies and build talent pipelines.",
    },
    {
        title: "Decoding Job Descriptions",
        description: "Use AI to extract key skills and build the perfect candidate persona.",
    },
    {
        title: "Sourcing on GitHub",
        description: "Find top developers by analyzing their code, contributions, and activity.",
    }
];

const LearningHubPage: React.FC = () => {
    return (
        <div>
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Learning Hub</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {learningModules.map((module, index) => (
                    <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300">
                        <h3 className="font-bold text-xl mb-2 text-white">{module.title}</h3>
                        <p className="text-gray-400 mb-4">{module.description}</p>
                        <a href="#" className="text-cyan-400 font-semibold" onClick={e => e.preventDefault()}>Start Module &rarr;</a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LearningHubPage;
