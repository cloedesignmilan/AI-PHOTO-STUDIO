import React from 'react';
import type { HistoryItem } from '../types';

interface HistoryProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

const History: React.FC<HistoryProps> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) {
    return null; // Don't render anything if there's no history
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Generation History</h3>
        <button
          onClick={onClear}
          className="px-3 py-1 text-sm font-medium text-gray-300 bg-red-800/50 hover:bg-red-700/50 rounded-md transition-colors"
          aria-label="Clear all generation history"
        >
          Clear All
        </button>
      </div>
      <div className="flex space-x-4 pb-4 overflow-x-auto">
        {history.map(item => (
          <div
            key={item.id}
            className="flex-shrink-0 group cursor-pointer"
            onClick={() => onSelect(item)}
            role="button"
            tabIndex={0}
            aria-label={`Reload settings from generated image created at ${new Date(item.id).toLocaleString()}`}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(item)}
          >
            <img
              src={item.imageUrl}
              alt="Previously generated"
              className="w-32 h-32 object-cover rounded-lg border-2 border-transparent group-hover:border-indigo-500 transition-all duration-200"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
