import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { faqs as faqsApi, marketingFeatures as marketingFeaturesApi, marketingPages as marketingPagesApi, marketingSections as marketingSectionsApi, testimonials as testimonialsApi } from '@/services/resources';
import { FileText, LayoutTemplate, Zap, HelpCircle, Star, ExternalLink, ArrowRight, Lightbulb, Globe, Eye, EyeOff, Plus, QrCode, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRShareButton from '@/components/admin/marketing/QRShareButton';
import BeautifulQRCard from '@/components/admin/marketing/BeautifulQRCard';

export default function MarketingDashboardTab({ onNavigate }) {
  const { data: pages = [] } = useQuery({
    queryKey: ['admin-marketing-pages'],
    queryFn: () => marketingPagesApi.list(),
  });
  const { data: sections = [] } = useQuery({
    queryKey: ['admin-marketing-sections'],
    queryFn: () => marketingSectionsApi.list(),
  });
  const { data: features = [] } = useQuery({
    queryKey: ['admin-marketing-features'],
    queryFn: () => marketingFeaturesApi.list(),
  });
  const { data: faqs = [] } = useQuery({
    queryKey: ['admin-marketing-faqs'],
    queryFn: () => faqsApi.list(),
  });
  const { data: testimonials = [] } = useQuery({
    queryKey: ['admin-marketing-testimonials'],
    queryFn: () => testimonialsApi.list(),
  });

  const stats = [
    { label: 'Pages', count: pages.length, icon: FileText, tab: 'pages' },
    { label: 'Sections', count: sections.length, icon: LayoutTemplate, tab: 'sections' },
    { label: 'Features', count: features.length, icon: Zap, tab: 'features' },
    { label: 'FAQs', count: faqs.length, icon: HelpCircle, tab: 'faq' },
    { label: 'Testimonials', count: testimonials.length, icon: Star, tab: 'testimonials' },
  ];

  const quickLinks = [
    { label: 'About', url: '/about' },
    { label: 'How It Works', url: '/how-it-works' },
    { label: 'Features', url: '/features' },
    { label: 'FAQ', url: '/faq' },
    { label: 'Contact', url: '/contact' },
    { label: 'Start Free Trial', url: '/start-free-trial' },
  ];

  const sortedPages = [...pages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sectionsForPage = (slug) => sections.filter(s => s.page_slug === slug);

  const guide = [
    { step: 1, title: 'Create a Page', desc: 'Set up pages like About, How It Works, or Features with their URL slug.', tab: 'pages' },
    { step: 2, title: 'Add Sections', desc: 'Build each page with content blocks — hero banners, card grids, FAQs, and more.', tab: 'sections' },
    { step: 3, title: 'Add Features & Testimonials', desc: 'Highlight key features and showcase player reviews across the site.', tab: 'features' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => onNavigate?.(s.tab)}
              className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{s.count}</p>
            </button>
          );
        })}
      </div>

      {/* Getting Started Guide */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="font-heading font-semibold text-base">How It Works</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {guide.map(g => (
            <div key={g.step} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{g.step}</span>
                <h4 className="text-sm font-semibold">{g.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{g.desc}</p>
              <button
                onClick={() => onNavigate?.(g.tab)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                Go to {g.title} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Current Pages */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-base">Your Pages</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => onNavigate?.('pages')}>
            <Plus className="h-4 w-4" /> Add Page
          </Button>
        </div>

        {sortedPages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No pages yet. Click "Add Page" to create your first marketing page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Page Title</th>
                  <th className="py-2 pr-4 font-medium">URL Slug</th>
                  <th className="py-2 pr-4 font-medium">Nav Label</th>
                  <th className="py-2 pr-4 font-medium">Sections</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">In Nav</th>
                  <th className="py-2 pr-4 font-medium">View</th>
                </tr>
              </thead>
              <tbody>
                {sortedPages.map(page => {
                  const pageSections = sectionsForPage(page.slug);
                  const published = page.status !== 'draft';
                  return (
                    <tr key={page.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => onNavigate?.('sections')}
                          className="font-medium text-foreground hover:text-primary text-left"
                        >
                          {page.title || page.nav_label || page.slug}
                        </button>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">/{page.slug}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{page.nav_label || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted">
                          <LayoutTemplate className="h-3 w-3" /> {pageSections.length}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {published ? <><Eye className="h-3 w-3" /> Published</> : <><EyeOff className="h-3 w-3" /> Draft</>}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {page.show_in_nav ? (
                          <span className="text-xs text-green-600">Yes</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <a
                          href={`/${page.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading font-semibold text-base mb-1">Quick Links</h3>
        <p className="text-sm text-muted-foreground mb-4">Click to open your public marketing website in a new tab:</p>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
            >
              {link.label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      </div>

      {/* QR Code Share — Premium Cards */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-semibold text-base">Share Your Website</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Scan or share these branded QR cards to direct people to your marketing pages:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map(link => (
            <BeautifulQRCard key={link.url} path={link.url} label={link.label} />
          ))}
        </div>
      </div>
    </div>
  );
}