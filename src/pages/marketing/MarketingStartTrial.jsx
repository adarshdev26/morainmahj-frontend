import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserPlus, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { isCapacitorNative, redirectToLogin } from '@/lib/capacitor-utils';

export default function MarketingStartTrial() {
  const navigate = useNavigate();
  const isNative = isCapacitorNative();

  const benefits = [
    'Free player account — no credit card required',
    'Register for tournaments, leagues, and classes',
    'Real-time scoring and live leaderboards',
    'QR check-in and automatic table assignments',
    'Push notifications for reminders and results',
    'Available on web, iOS, and Android',
  ];

  const signupPath = isNative ? '/native-login?mode=signup' : '/player-signup';

  if (isNative) {
    return (
      <MarketingLayout pageTitle="Join Free">
        <section className="px-4 pt-6 pb-4">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6" />
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight mb-1.5">Start Your Free Account</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Join the community today. Free for players — always.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
            {benefits.map((b, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-[14px] text-foreground/80 leading-snug">{b}</span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full h-12 rounded-xl font-semibold gap-2"
            onClick={() => navigate(signupPath)}
          >
            <UserPlus className="h-4 w-4" /> Create Free Account
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 rounded-xl font-semibold gap-2 mt-2.5"
            onClick={() => navigate('/pricing')}
          >
            View Pricing <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-[13px] text-muted-foreground text-center mt-5">
            Already have an account?{' '}
            <button
              type="button"
              className="font-semibold text-primary"
              onClick={() => redirectToLogin('/app')}
            >
              Sign in
            </button>
          </p>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout pageTitle="Start Free Trial">
      <section className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <Star className="h-10 w-10 mx-auto mb-4 text-amber-400" />
          <h1 className="text-4xl font-heading font-semibold mb-3">Start Your Free Account</h1>
          <p className="text-muted-foreground mb-8">Join the Morain Mahj community today. It's free for players — always.</p>

          <div className="bg-card rounded-xl border border-border p-6 mb-8 text-left">
            <h3 className="font-heading font-semibold text-lg mb-4 text-center">What you get:</h3>
            <ul className="space-y-3">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="text-sm text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 font-semibold">
              <Link to="/player-signup"><UserPlus className="h-4 w-4" /> Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2">
              <Link to="/pricing">View Pricing <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/player-signup" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
