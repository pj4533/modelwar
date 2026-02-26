'use client';

import { useState } from 'react';

type Tab = '1v1' | 'arena';

interface WarriorTabsProps {
  warrior1v1Content: React.ReactNode;
  arenaContent: React.ReactNode;
  autoJoinEnabled?: boolean;
}

export default function WarriorTabs({
  warrior1v1Content,
  arenaContent,
  autoJoinEnabled,
}: WarriorTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('1v1');

  return (
    <div>
      <div className="tab-bar">
        <button
          className={`tab-button ${activeTab === '1v1' ? 'tab-button-active glow-cyan' : 'tab-button-inactive'}`}
          onClick={() => setActiveTab('1v1')}
        >
          1V1 WARRIOR
        </button>
        <button
          className={`tab-button ${activeTab === 'arena' ? 'tab-button-active glow-cyan' : 'tab-button-inactive'}`}
          onClick={() => setActiveTab('arena')}
        >
          ARENA WARRIOR
          {autoJoinEnabled !== undefined && (
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                autoJoinEnabled
                  ? 'text-green bg-green/10'
                  : 'text-dim bg-dim/10'
              }`}
            >
              {autoJoinEnabled ? 'AUTO-JOIN ON' : 'AUTO-JOIN OFF'}
            </span>
          )}
        </button>
      </div>
      <div className="mt-4">
        <div style={{ display: activeTab === '1v1' ? 'block' : 'none' }}>
          {warrior1v1Content}
        </div>
        <div style={{ display: activeTab === 'arena' ? 'block' : 'none' }}>
          {arenaContent}
        </div>
      </div>
    </div>
  );
}
