import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, UserPlus, Star, ChevronRight, QrCode, Trophy, Users,
  Building2, GraduationCap, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { useQuery } from '@tanstack/react-query';
import { faqs as faqsApi, marketingFeatures as marketingFeaturesApi, testimonials as testimonialsApi } from '@/services/resources';
import { isCapacitorNative } from '@/lib/capacitor-utils';

const AUDIENCE_ICONS = {
  Players: Users,
  Organizers: Trophy,
  Clubs: Building2,
  Associations: LayoutGrid,
  Instructors: GraduationCap,
};

export default function MarketingHome() {
  const navigate = useNavigate();
  const isNative = isCapacitorNative();

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

  const steps = [
    { title: 'Register', desc: 'Create a free account and sign up for tournaments, leagues, or classes in your area.', icon: UserPlus },
    { title: 'Check In', desc: 'Scan your QR code on arrival. Your table and wind seat are assigned automatically.', icon: QrCode },
    { title: 'Play & Track Scores', desc: 'Enter scores after each set. Watch the live leaderboard update in real time.', icon: Trophy },
  ];

  const audiences = [
    { title: 'Players', desc: 'Track your scores, climb leaderboards, and join tournaments and leagues.' },
    { title: 'Organizers', desc: 'Run seamless tournaments with automated seating, scoring, and check-in.' },
    { title: 'Clubs', desc: 'Manage your club roster, schedule sessions, and communicate with members.' },
    { title: 'Associations', desc: 'Oversee multiple events and clubs with powerful analytics and reporting.' },
    { title: 'Instructors', desc: 'Teach classes, track student progress, and manage lesson scheduling.' },
  ];

  const benefits = [
    { title: 'For Players', desc: 'Real-time scores, live leaderboards, and easy registration — all from your phone.' },
    { title: 'For Organizers', desc: 'Eliminate paperwork. Automate seating, scoring, and check-in for every event.' },
    { title: 'For Instructors', desc: 'Schedule lessons, track progress, and keep students engaged between sessions.' },
    { title: 'For Associations', desc: 'Centralized management across multiple clubs, events, and regions.' },
  ];

  const featureList = features.length > 0 ? features : [
    { title: 'Tournament Management', description: 'Full lifecycle from setup to final scores.', icon: 'Trophy' },
    { title: 'Live Leaderboards', description: 'Real-time standings updated after every set.', icon: 'BarChart3' },
    { title: 'QR Check-in', description: 'Lightning-fast self check-in with QR codes.', icon: 'QrCode' },
    { title: 'Automatic Seating', description: 'Smart table and wind assignments every round.', icon: 'LayoutGrid' },
    { title: 'Real-time Scores', description: 'Score entry that updates instantly for everyone.', icon: 'Zap' },
    { title: 'Player Profiles', description: 'Track your history, stats, and achievements.', icon: 'Users' },
    { title: 'Analytics', description: 'Deep insights into performance and participation.', icon: 'BarChart3' },
    { title: 'Club Management', description: 'Manage rosters, sessions, and communications.', icon: 'Building2' },
    { title: 'Notifications', description: 'Push alerts for RSVPs, reminders, and results.', icon: 'Bell' },
  ];

  const faqList = faqs.length > 0 ? faqs : [
    { question: 'Is Morain Mahj free?', answer: 'Creating a player account is free. Organizers pay only for the events they run.' },
    { question: 'Do I need to download an app?', answer: 'Morain Mahj works in any browser. Native iOS and Android apps are also available.' },
    { question: 'Can I use it for my club?', answer: 'Yes! Morain Mahj supports leagues, clubs, and associations with full management tools.' },
  ];

  const signupPath = isNative ? '/native-login?mode=signup' : '/player-signup';

  if (isNative) {
    return (
      <MarketingLayout pageTitle="About">
        {/* Hero card */}
        <section className="px-4 pt-6 pb-4">
          <div className="rounded-2xl bg-primary text-primary-foreground p-5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '40px 40px',
            }} />
            <div className="relative">
              <h2 className="text-[22px] font-semibold leading-tight tracking-tight mb-2">
                What is Morain Mahj?
              </h2>
              <p className="text-[15px] text-primary-foreground/75 leading-relaxed mb-4">
                The all-in-one platform for Mah Jongg tournament management — registration, check-in, scoring, and leaderboards in one app.
              </p>
              <Button
                size="lg"
                className="w-full h-12 rounded-xl bg-primary-foreground text-primary font-semibold gap-2"
                onClick={() => navigate(signupPath)}
              >
                <UserPlus className="h-4 w-4" /> Create Free Account
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-12 rounded-xl mt-2.5 border-primary-foreground/35 text-primary-foreground bg-transparent font-semibold"
                onClick={() => navigate('/pricing')}
              >
                View Pricing
              </Button>
            </div>
          </div>
        </section>

        {/* How it works — grouped list */}
        <section className="px-4 py-5">
          <div className="mb-4 px-0.5">
            <h2 className="text-[20px] font-semibold tracking-tight">How It Works</h2>
            <p className="text-[14px] text-muted-foreground mt-1">Three steps from sign-up to final score.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-3.5 p-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h3 className="text-[16px] font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Who is it for — iOS settings-style list */}
        <section className="px-4 py-5">
          <div className="mb-4 px-0.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Who Is It For?</h2>
            <p className="text-[14px] text-muted-foreground mt-1">Every part of the Mah Jongg community.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {audiences.map((a, i) => {
              const Icon = AUDIENCE_ICONS[a.title] || Users;
              return (
                <div key={i} className="flex items-center gap-3.5 p-4 min-h-[64px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-semibold leading-snug">{a.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features grid */}
        <section className="px-4 py-5">
          <div className="mb-4 px-0.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Features</h2>
            <p className="text-[14px] text-muted-foreground mt-1">Everything you need to run and play.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {featureList.slice(0, 6).map((f, i) => (
              <div key={i} className="rounded-2xl bg-muted/60 p-3.5">
                <h3 className="text-[14px] font-semibold leading-snug mb-1">{f.title}</h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits list */}
        <section className="px-4 py-5">
          <div className="mb-4 px-0.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Benefits</h2>
          </div>
          <div className="rounded-2xl bg-primary text-primary-foreground overflow-hidden divide-y divide-primary-foreground/10">
            {benefits.map((b, i) => (
              <div key={i} className="p-4">
                <h3 className="text-[15px] font-semibold">{b.title}</h3>
                <p className="text-[13px] text-primary-foreground/65 leading-relaxed mt-0.5">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing row */}
        <section className="px-4 py-5">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-3 active:bg-muted/50 text-left"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold">Simple Pricing</h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">Free for players. Pay only for events you organize.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
          </button>
        </section>

        {/* FAQ */}
        <section className="px-4 py-5">
          <h2 className="text-[20px] font-semibold tracking-tight mb-3 px-0.5">FAQ</h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {faqList.map((f, i) => (
              <div key={i} className="px-4 py-3.5">
                <p className="text-[15px] font-semibold mb-1">{f.question}</p>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials carousel */}
        {testimonials.length > 0 && (
          <section className="px-4 py-5">
            <h2 className="text-[20px] font-semibold tracking-tight mb-3 px-0.5">What People Say</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory">
              {testimonials.map((t, i) => (
                <div key={i} className="snap-start shrink-0 w-[78%] rounded-2xl border border-border bg-card p-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[14px] text-muted-foreground leading-relaxed flex-1 line-clamp-4">"{t.review}"</p>
                  <p className="text-[14px] font-semibold">{t.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
        <div className="relative max-w-6xl mx-auto px-5 py-20 sm:py-28 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold mb-5">
            What is Morain Mahj?
          </h1>
          <p className="text-lg sm:text-xl font-body font-light tracking-wide text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
            The all-in-one platform for Mah Jongg tournament management — registration, check-in, scoring, leaderboards, and club management in one elegant app.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold">
              <Link to="/about">Learn More <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
              <Link to="/player-signup"><UserPlus className="h-4 w-4" /> Create Free Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-5 text-center">
          <h2 className="text-3xl font-heading font-semibold mb-2">How Morain Mahj Works</h2>
          <p className="text-muted-foreground mb-10">Three simple steps from sign-up to final score.</p>
          <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-xl">
                  {i + 1}
                </div>
                <h3 className="font-heading font-semibold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section className="py-14 sm:py-20 bg-muted/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-semibold mb-2">Who Is It For?</h2>
            <p className="text-muted-foreground">Morain Mahj serves every part of the Mah Jongg community.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((a, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-6 bg-card rounded-xl border border-border hover:shadow-md transition-shadow">
                <h3 className="font-heading font-semibold text-lg">{a.title}</h3>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-semibold mb-2">Features</h2>
            <p className="text-muted-foreground">Everything you need to run and play Mah Jongg.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureList.map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-6 bg-card rounded-xl border border-border hover:shadow-md transition-shadow">
                <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-14 sm:py-20 bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-semibold mb-2 text-primary-foreground">Benefits</h2>
            <p className="text-primary-foreground/70">Real value for every role in the community.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3 p-6 bg-primary-foreground/5 rounded-xl border border-primary-foreground/10">
                <h3 className="font-heading font-semibold text-lg text-primary-foreground">{b.title}</h3>
                <p className="text-sm text-primary-foreground/60">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING CTA ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-5 text-center">
          <h2 className="text-3xl font-heading font-semibold mb-2">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground mb-6">Free for players. Pay only for the events you organize.</p>
          <Button size="lg" asChild className="gap-2 font-semibold">
            <Link to="/pricing">View Pricing <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-20 bg-muted/40 border-y border-border">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-semibold mb-2">FAQ</h2>
          </div>
          <div className="space-y-3">
            {faqList.map((f, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4">
                  <p className="font-heading font-semibold text-base mb-2">{f.question}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-heading font-semibold mb-2">What People Say</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <div key={i} className="flex flex-col gap-3 p-6 bg-card rounded-xl border border-border">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.review}"</p>
                  <p className="font-heading font-semibold text-sm">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="bg-primary text-primary-foreground py-14 sm:py-20">
        <div className="max-w-xl mx-auto px-5 text-center">
          <Star className="h-8 w-8 mx-auto mb-4 opacity-60" />
          <h2 className="text-3xl font-heading font-semibold mb-3">Ready to Join?</h2>
          <p className="text-primary-foreground/70 mb-7">Create your free account and start playing today.</p>
          <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 font-semibold">
            <Link to="/player-signup"><UserPlus className="h-4 w-4" /> Create Free Account</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
