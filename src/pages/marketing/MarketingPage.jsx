import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { faqs as faqsApi, marketingFeatures as marketingFeaturesApi, marketingPages as marketingPagesApi, marketingSections as marketingSectionsApi, testimonials as testimonialsApi } from '@/services/resources';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import SectionRenderer from '@/components/marketing/SectionRenderer';

export default function MarketingPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '') || 'home';

  const { data: page, isLoading: loadingPage } = useQuery({
    queryKey: ['marketing-page', slug],
    queryFn: async () => {
      const results = await marketingPagesApi.filter({ slug, status: 'published' });
      return results[0] || null;
    },
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['marketing-sections', slug],
    queryFn: () => marketingSectionsApi.filter({ page_slug: slug, visible: true }),
    enabled: !!page,
  });

  const { data: features = [] } = useQuery({
    queryKey: ['marketing-features'],
    queryFn: () => marketingFeaturesApi.filter({ enabled: true }),
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ['marketing-faqs'],
    queryFn: () => faqsApi.filter({ published: true }),
  });

  const { data: testimonials = [] } = useQuery({
    queryKey: ['marketing-testimonials'],
    queryFn: () => testimonialsApi.filter({ published: true }),
  });

  const layoutTitle = page?.nav_label || page?.title || 'Morain Mahj';

  if (loadingPage || loadingSections) {
    return (
      <MarketingLayout pageTitle={layoutTitle}>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </MarketingLayout>
    );
  }

  if (!page) return <Navigate to="/" replace />;

  const sortedSections = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <MarketingLayout pageTitle={page.nav_label || page.title}>
      {sortedSections.map(section => (
        <SectionRenderer
          key={section.id}
          section={section}
          features={features}
          faqs={faqs}
          testimonials={testimonials}
        />
      ))}
    </MarketingLayout>
  );
}