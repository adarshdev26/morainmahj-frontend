import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, UserPlus, LogIn, ChevronDown, Star, Quote, ChevronRight,
  Trophy, QrCode, Calendar, Users, BarChart3, Bell, LayoutGrid,
  Shield, Zap, Award, Heart, BookOpen, Building2, Gamepad2, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isCapacitorNative } from '@/lib/capacitor-utils';
import PricingPlansSection from '@/components/marketing/PricingPlansSection';

// Icon lookup — maps string names from DB to Lucide components
const ICON_MAP = {
  Trophy, QrCode, Calendar, Users, BarChart3, Bell, LayoutGrid,
  Shield, Zap, Award, Heart, BookOpen, Building2, Gamepad2, Check,
  ArrowRight, UserPlus, LogIn, Star,
};

function getIcon(name) {
  if (!name) return Star;
  return ICON_MAP[name] || Star;
}

function resolveAppLink(url) {
  if (!url) return '/';
  if (!isCapacitorNative()) return url;
  if (url.includes('player-signup') || url.includes('start-free-trial')) {
    return '/native-login?mode=signup';
  }
  return url;
}

// ── HERO SECTION ──
function HeroSection({ section }) {
  const isNative = isCapacitorNative();
  const navigate = useNavigate();

  if (isNative) {
    return (
      <section className="px-4 pt-6 pb-4">
        <div className="rounded-2xl bg-primary text-primary-foreground p-5 overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px',
          }} />
          <div className="relative">
            {section.title && (
              <h2 className="text-[22px] font-semibold leading-tight tracking-tight mb-2">
                {section.title}
              </h2>
            )}
            {section.subtitle && (
              <p className="text-[15px] text-primary-foreground/75 leading-relaxed mb-3">
                {section.subtitle}
              </p>
            )}
            {section.description && (
              <p className="text-[14px] text-primary-foreground/60 leading-relaxed mb-4">
                {section.description}
              </p>
            )}
            <div className="flex flex-col gap-2.5 mt-1">
              {section.button_text && (
                <Button
                  size="lg"
                  className="w-full h-12 rounded-xl bg-primary-foreground text-primary font-semibold gap-2"
                  onClick={() => navigate(resolveAppLink(section.button_url || '/start-free-trial'))}
                >
                  {section.button_text} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {section.config?.secondary_button_text && (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12 rounded-xl border-primary-foreground/35 text-primary-foreground bg-transparent font-semibold"
                  onClick={() => navigate(resolveAppLink(section.config.secondary_button_url || '/player-signup'))}
                >
                  {section.config.secondary_button_text}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px',
      }} />
      <div className="relative max-w-6xl mx-auto px-5 py-20 sm:py-28 text-center">
        {section.title && (
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold mb-5 text-primary-foreground">
            {section.title}
          </h1>
        )}
        {section.subtitle && (
          <p className="text-lg sm:text-xl font-body font-light tracking-wide text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
            {section.subtitle}
          </p>
        )}
        {section.description && (
          <p className="text-base text-primary-foreground/60 mb-10 max-w-xl mx-auto">
            {section.description}
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {section.button_text && (
            <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold">
              <Link to={section.button_url || '/start-free-trial'}>
                {section.button_text} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {section.config?.secondary_button_text && (
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
              <Link to={section.config.secondary_button_url || '/player-signup'}>
                {section.config.secondary_button_text}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

// ── TIMELINE SECTION ──
function TimelineSection({ section }) {
  const items = section.config?.items || [];
  const isNative = isCapacitorNative();

  if (isNative) {
    return (
      <section className="px-4 py-5">
        {(section.title || section.subtitle) && (
          <div className="mb-4 px-0.5">
            {section.title && <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{section.title}</h2>}
            {section.subtitle && <p className="text-[14px] text-muted-foreground mt-1">{section.subtitle}</p>}
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={i} className="flex items-start gap-3.5 p-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h3 className="text-[16px] font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-6xl mx-auto px-5 text-center">
        {section.title && <h2 className="text-3xl font-heading font-semibold mb-2">{section.title}</h2>}
        {section.subtitle && <p className="text-muted-foreground mb-10">{section.subtitle}</p>}
        <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-xl">
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── CARDS SECTION ──
function CardsSection({ section }) {
  const items = section.config?.items || [];
  const isNative = isCapacitorNative();
  const navigate = useNavigate();

  if (isNative) {
    return (
      <section className="px-4 py-5">
        {(section.title || section.subtitle) && (
          <div className="mb-4 px-0.5">
            {section.title && <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{section.title}</h2>}
            {section.subtitle && <p className="text-[14px] text-muted-foreground mt-1">{section.subtitle}</p>}
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            const href = item.button_url ? resolveAppLink(item.button_url) : null;
            const row = (
              <div className="flex items-center gap-3.5 p-4 min-h-[64px] active:bg-muted/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-semibold text-foreground leading-snug">{item.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{item.description}</p>
                </div>
                {(href || item.button_text) && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                )}
              </div>
            );
            if (href) {
              return (
                <button key={i} type="button" className="w-full text-left" onClick={() => navigate(href)}>
                  {row}
                </button>
              );
            }
            return <div key={i}>{row}</div>;
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20 bg-muted/40 border-y border-border">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10">
          {section.title && <h2 className="text-3xl font-heading font-semibold mb-2">{section.title}</h2>}
          {section.subtitle && <p className="text-muted-foreground">{section.subtitle}</p>}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-6 bg-card rounded-xl border border-border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.button_text && (
                  <Link to={item.button_url || '#'} className="text-sm font-medium text-primary hover:underline mt-auto">
                    {item.button_text}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── FEATURES SECTION ──
function FeaturesSection({ section, features }) {
  const items = features && features.length > 0
    ? features.filter(f => f.enabled).map(f => ({ title: f.title, description: f.description, icon: f.icon }))
    : (section.config?.items || []);
  const isNative = isCapacitorNative();

  if (isNative) {
    return (
      <section className="px-4 py-5">
        {(section.title || section.subtitle) && (
          <div className="mb-4 px-0.5">
            {section.title && <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{section.title}</h2>}
            {section.subtitle && <p className="text-[14px] text-muted-foreground mt-1">{section.subtitle}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={i} className="rounded-2xl bg-muted/60 p-3.5 flex flex-col gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground leading-snug mb-1">{item.title}</h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10">
          {section.title && <h2 className="text-3xl font-heading font-semibold mb-2">{section.title}</h2>}
          {section.subtitle && <p className="text-muted-foreground">{section.subtitle}</p>}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-6 bg-card rounded-xl border border-border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── BENEFITS SECTION ──
function BenefitsSection({ section }) {
  const items = section.config?.items || [];
  const isNative = isCapacitorNative();

  if (isNative) {
    return (
      <section className="px-4 py-5">
        {(section.title || section.subtitle) && (
          <div className="mb-4 px-0.5">
            {section.title && <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{section.title}</h2>}
            {section.subtitle && <p className="text-[14px] text-muted-foreground mt-1">{section.subtitle}</p>}
          </div>
        )}
        <div className="rounded-2xl bg-primary text-primary-foreground overflow-hidden divide-y divide-primary-foreground/10">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={i} className="flex items-start gap-3.5 p-4">
                <div className="w-9 h-9 rounded-xl bg-primary-foreground/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-snug">{item.title}</h3>
                  <p className="text-[13px] text-primary-foreground/65 leading-relaxed mt-0.5">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10">
          {section.title && <h2 className="text-3xl font-heading font-semibold mb-2 text-primary-foreground">{section.title}</h2>}
          {section.subtitle && <p className="text-primary-foreground/70">{section.subtitle}</p>}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-6 bg-primary-foreground/5 rounded-xl border border-primary-foreground/10">
                <div className="w-12 h-12 rounded-full bg-primary-foreground/10 text-primary-foreground flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-primary-foreground">{item.title}</h3>
                <p className="text-sm text-primary-foreground/60">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── FAQ SECTION ──
function FaqSection({ section, faqs }) {
  const items = faqs && faqs.length > 0
    ? faqs.filter(f => f.published).map(f => ({ question: f.question, answer: f.answer }))
    : (section.config?.items || []);
  const [openIndex, setOpenIndex] = useState(null);
  const isNative = isCapacitorNative();

  if (isNative) {
    return (
      <section className="px-4 py-5">
        {(section.title || section.subtitle) && (
          <div className="mb-4 px-0.5">
            {section.title && <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{section.title}</h2>}
            {section.subtitle && <p className="text-[14px] text-muted-foreground mt-1">{section.subtitle}</p>}
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {items.map((item, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left min-h-[52px] active:bg-muted/40"
              >
                <span className="text-[15px] font-semibold text-foreground leading-snug">{item.question}</span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-[14px] text-muted-foreground leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-10">
          {section.title && <h2 className="text-3xl font-heading font-semibold mb-2">{section.title}</h2>}
          {section.subtitle && <p className="text-muted-foreground">{section.subtitle}</p>}
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="font-heading font-semibold text-base">{item.question}</span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA SECTION ──
function CtaSection({ section }) {
  const isNative = isCapacitorNative();
  const navigate = useNavigate();

  if (isNative) {
    // Sticky Join/Sign In already in MarketingLayout — keep CTA compact
    return (
      <section className="px-4 py-5">
        <div className="rounded-2xl bg-muted/70 p-5 text-center">
          {section.title && <h2 className="text-[18px] font-semibold text-foreground mb-1.5">{section.title}</h2>}
          {section.description && <p className="text-[14px] text-muted-foreground mb-4 leading-relaxed">{section.description}</p>}
          {section.button_text && (
            <Button
              size="lg"
              className="w-full h-12 rounded-xl font-semibold gap-2"
              onClick={() => navigate(resolveAppLink(section.button_url || '/player-signup'))}
            >
              {section.button_text} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-primary text-primary-foreground py-14 sm:py-20">
      <div className="max-w-xl mx-auto px-5 text-center">
        <Star className="h-8 w-8 mx-auto mb-4 opacity-60" />
        {section.title && <h2 className="text-3xl font-heading font-semibold mb-3">{section.title}</h2>}
        {section.description && <p className="text-primary-foreground/70 mb-7">{section.description}</p>}
        {section.button_text && (
          <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold">
            <Link to={section.button_url || '/player-signup'}>
              {section.button_text} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}

// ── TEXT SECTION ──
function TextSection({ section }) {
  const isNative = isCapacitorNative();
  if (isNative) {
    return (
      <section className="px-4 py-5">
        {section.title && <h2 className="text-[20px] font-semibold tracking-tight mb-2">{section.title}</h2>}
        {section.subtitle && <p className="text-[15px] text-muted-foreground mb-2">{section.subtitle}</p>}
        {section.description && <p className="text-[14px] text-muted-foreground leading-relaxed">{section.description}</p>}
      </section>
    );
  }
  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-3xl mx-auto px-5">
        {section.title && <h2 className="text-3xl font-heading font-semibold mb-4">{section.title}</h2>}
        {section.subtitle && <p className="text-lg text-muted-foreground mb-4">{section.subtitle}</p>}
        {section.description && <p className="text-base text-muted-foreground leading-relaxed">{section.description}</p>}
      </div>
    </section>
  );
}

// ── STATS SECTION ──
function StatsSection({ section }) {
  const items = section.config?.items || [];
  const isNative = isCapacitorNative();
  if (isNative) {
    return (
      <section className="px-4 py-5">
        <div className="rounded-2xl border border-border bg-card grid grid-cols-2 gap-px bg-border overflow-hidden">
          {items.map((item, i) => (
            <div key={i} className="bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary tabular-nums">{item.value}</p>
              <p className="text-[12px] text-muted-foreground mt-1">{item.title}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="py-14 bg-muted/40 border-y border-border">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {items.map((item, i) => (
            <div key={i}>
              <p className="text-4xl font-heading font-bold text-primary">{item.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── TESTIMONIALS SECTION ──
function TestimonialsSection({ section, testimonials }) {
  const items = testimonials && testimonials.length > 0
    ? testimonials.filter(t => t.published)
    : [];
  if (items.length === 0) return null;
  const isNative = isCapacitorNative();

  if (isNative) {
    return (
      <section className="px-4 py-5">
        {section.title && (
          <h2 className="text-[20px] font-semibold tracking-tight text-foreground mb-3 px-0.5">{section.title}</h2>
        )}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
          {items.map((t, i) => (
            <div key={i} className="snap-start shrink-0 w-[78%] rounded-2xl border border-border bg-card p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: t.rating || 5 }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed flex-1 line-clamp-4">"{t.review}"</p>
              <p className="text-[14px] font-semibold text-foreground">{t.name}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10">
          {section.title && <h2 className="text-3xl font-heading font-semibold mb-2">{section.title}</h2>}
          {section.subtitle && <p className="text-muted-foreground">{section.subtitle}</p>}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <div key={i} className="flex flex-col gap-3 p-6 bg-card rounded-xl border border-border">
              <Quote className="h-8 w-8 text-primary/20" />
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.review}"</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: t.rating || 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="flex items-center gap-3">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {t.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-heading font-semibold text-sm">{t.name}</p>
                  {(t.role || t.company) && (
                    <p className="text-xs text-muted-foreground">{[t.role, t.company].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── MAIN RENDERER ──
export default function SectionRenderer({ section, features, faqs, testimonials }) {
  if (!section.visible && section.visible !== undefined) return null;

  switch (section.section_type) {
    case 'hero': return <HeroSection section={section} />;
    case 'timeline': return <TimelineSection section={section} />;
    case 'cards': return <CardsSection section={section} />;
    case 'features': return <FeaturesSection section={section} features={features} />;
    case 'benefits': return <BenefitsSection section={section} />;
    case 'faq': return <FaqSection section={section} faqs={faqs} />;
    case 'cta': return <CtaSection section={section} />;
    case 'text': return <TextSection section={section} />;
    case 'stats': return <StatsSection section={section} />;
    case 'gallery':
    case 'testimonials': return <TestimonialsSection section={section} testimonials={testimonials} />;
    case 'pricing':
      return <PricingPlansSection section={section} />;
    default: return null;
  }
}