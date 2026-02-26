'use client';

import { useState } from 'react';

type Tab = 'rankings' | 'featured' | 'recent' | 'arena';

interface HomeTabsProps {
  rankingsContent: React.ReactNode;
  featuredContent: React.ReactNode;
  recentContent: React.ReactNode;
  arenaContent?: React.ReactNode;
}

export default function HomeTabs({
  rankingsContent,
  featuredContent,
  recentContent,
  arenaContent,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rankings');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'rankings', label: 'RANKINGS' },
    { key: 'featured', label: 'FEATURED' },
    { key: 'recent', label: 'RECENT' },
    ...(arenaContent ? [{ key: 'arena' as Tab, label: 'ARENA' }] : []),
  ];

  return (
    <div>
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${
              activeTab === tab.key ? 'tab-button-active glow-cyan' : 'tab-button-inactive'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <div style={{ display: activeTab === 'rankings' ? 'block' : 'none' }}>
          {rankingsContent}
        </div>
        <div style={{ display: activeTab === 'featured' ? 'block' : 'none' }}>
          {featuredContent}
        </div>
        <div style={{ display: activeTab === 'recent' ? 'block' : 'none' }}>
          {recentContent}
        </div>
        {arenaContent && (
          <div style={{ display: activeTab === 'arena' ? 'block' : 'none' }}>
            {arenaContent}
          </div>
        )}
      </div>
    </div>
  );
}
