import React, { useState } from 'react';
import MarketingPagesTab from '@/components/admin/marketing/MarketingPagesTab';
import MarketingSectionsTab from '@/components/admin/marketing/MarketingSectionsTab';
import MarketingFeaturesTab from '@/components/admin/marketing/MarketingFeaturesTab';
import MarketingFaqTab from '@/components/admin/marketing/MarketingFaqTab';
import MarketingTestimonialsTab from '@/components/admin/marketing/MarketingTestimonialsTab';
import MarketingDashboardTab from '@/components/admin/marketing/MarketingDashboardTab';
import {
  LayoutDashboard, FileText, LayoutTemplate, Zap, HelpCircle, Star
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & quick links to your live pages' },
  { id: 'pages', label: 'Pages', icon: FileText, desc: 'Create pages like About, How It Works, Features' },
  { id: 'sections', label: 'Sections', icon: LayoutTemplate, desc: 'Add content blocks (hero, cards, FAQs) to pages' },
  { id: 'features', label: 'Features', icon: Zap, desc: 'Highlight cards shown across the site' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, desc: 'Frequently asked questions for visitors' },
  { id: 'testimonials', label: 'Testimonials', icon: Star, desc: 'Player & organizer reviews' },
];

export default function AdminMarketing() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Marketing Website</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your public marketing website content.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab description */}
      <p className="text-sm text-muted-foreground -mt-2">
        {TABS.find(t => t.id === activeTab)?.desc}
      </p>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && <MarketingDashboardTab onNavigate={setActiveTab} />}
        {activeTab === 'pages' && <MarketingPagesTab />}
        {activeTab === 'sections' && <MarketingSectionsTab />}
        {activeTab === 'features' && <MarketingFeaturesTab />}
        {activeTab === 'faq' && <MarketingFaqTab />}
        {activeTab === 'testimonials' && <MarketingTestimonialsTab />}
      </div>
    </div>
  );
}