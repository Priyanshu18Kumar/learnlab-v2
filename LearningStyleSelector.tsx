import React from 'react';
import { LearningStyle } from '../types';

interface Props {
  selectedStyle: LearningStyle;
  onStyleSelect: (style: LearningStyle) => void;
  disabled: boolean;
}

const stylesConfig = [
  {
    id: LearningStyle.GENERAL,
    icon: '🧠',
    label: 'Balanced',
    desc: 'Standard explanation'
  },
  {
    id: LearningStyle.VISUAL,
    icon: '👁️',
    label: 'Visual',
    desc: 'Metaphors & descriptions'
  },
  {
    id: LearningStyle.KINESTHETIC,
    icon: '⌨️',
    label: 'Code-Heavy',
    desc: 'Practical implementation'
  },
  {
    id: LearningStyle.AUDITORY,
    icon: '🎧',
    label: 'Conversational',
    desc: 'Reads like a script'
  }
];

export const LearningStyleSelector: React.FC<Props> = ({ selectedStyle, onStyleSelect, disabled }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">How do you learn best?</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stylesConfig.map((style) => {
          const isSelected = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onStyleSelect(style.id)}
              disabled={disabled}
              className={`relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-2xl mb-2">{style.icon}</span>
              <span className={`block text-sm font-semibold ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                {style.label}
              </span>
              <span className={`block text-xs mt-1 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`}>
                {style.desc}
              </span>
              
              {isSelected && (
                <div className="absolute top-3 right-3 text-primary-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};