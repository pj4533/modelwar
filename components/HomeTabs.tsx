'use client';

import { useState } from 'react';

type Tab = 'rankings' | 'featured' | 'recent';

interface HomeTabsProps {
  rankingsContent: React.ReactNode;
  featuredContent: React.ReactNode;
  recentContent: React.ReactNode;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'rankings', label: 'RANKINGS' },
  { key: 'featured', label: 'FEATURED' },
  { key: 'recent', label: 'RECENT' },
];

export default function HomeTabs({
  rankingsContent,
  featuredContent,
  recentContent,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rankings');

  return (
    <div>
      <div className="tab-bar">
        {TABS.map((tab) => (
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
      </div>
    </div>
  );
}
