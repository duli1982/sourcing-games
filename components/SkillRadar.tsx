import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { SkillProficiency } from '../utils/analyticsUtils';

interface SkillRadarProps {
  data: SkillProficiency[];
}

const SkillRadar: React.FC<SkillRadarProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-400">
        <p>No skill data available. Complete games across different skill categories!</p>
      </div>
    );
  }

  // Format data for radar chart (limit to top 8 skills for readability)
  const radarData = data.slice(0, 8).map((skill) => ({
    skill: skill.skill,
    score: skill.avgScore,
    fullMark: 100,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const skillData = data.find((s) => s.skill === payload[0].payload.skill);
      return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold">{payload[0].payload.skill}</p>
          <p className="text-cyan-400 font-bold">
            Average: {payload[0].value}/100
          </p>
          <p className="text-gray-300 text-sm">
            Attempts: {skillData?.attempts || 0}
          </p>
          <p className="text-green-400 text-sm">
            Best: {skillData?.bestScore || 0}/100
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="skill"
            stroke="#9CA3AF"
            style={{ fontSize: '11px' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            stroke="#9CA3AF"
            style={{ fontSize: '10px' }}
          />
          <Radar
            name="Your Average Score"
            dataKey="score"
            stroke="#06B6D4"
            fill="#06B6D4"
            fillOpacity={0.6}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '14px', color: '#9CA3AF' }} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Skill Legend with Details */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.slice(0, 8).map((skill, index) => (
          <div
            key={skill.skillKey}
            className="flex items-center justify-between bg-gray-700 rounded-lg p-2"
          >
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{skill.skill}</p>
              <p className="text-gray-400 text-xs">
                {skill.attempts} attempt{skill.attempts !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-cyan-400 font-bold">{skill.avgScore}</p>
              <p className="text-xs text-gray-400">avg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillRadar;
