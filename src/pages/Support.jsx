import React from 'react';
import BackButton from '@/components/shared/BackButton';

export default function Support() {
  return (
    <div className="min-h-screen bg-background px-4 pb-12">
      <div className="max-w-3xl mx-auto">
        <div
          className="sticky top-0 z-20 bg-background -mx-4 px-4 pb-6"
          style={{ paddingTop: 'calc(var(--safe-area-top) + 16px)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <BackButton fallbackPath="/" />
            <div className="flex-1" />
          </div>
          <h1 className="text-4xl font-heading font-semibold text-foreground mb-2">Support</h1>
          <p className="text-sm text-muted-foreground">We're here to help</p>
        </div>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
            <p>
              New to Morain Mahj? Our app helps you register for Mah Jongg tournaments, track your scores,
              and view live leaderboards. If you need help getting started, check out our demo tournaments
              or contact your tournament director.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Common Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">How do I register for a tournament?</h3>
                <p className="text-muted-foreground">
                  Browse available tournaments from the home screen, tap on a tournament to view details,
                  and follow the registration prompts.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">How do I enter my scores?</h3>
                <p className="text-muted-foreground">
                  Once checked in, go to your Scorecard tab during an active tournament round to enter
                  and verify scores.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">I can't check in — what should I do?</h3>
                <p className="text-muted-foreground">
                  Check-in opens when the tournament director activates it. If you believe this is an error,
                  contact your director directly.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
            <p>
              If you need further assistance, please reach out to your tournament director or email us at
              {' '}
              <a href="mailto:support@morainmahj.com" className="text-primary underline">
                support@morainmahj.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Account & Data</h2>
            <p>
              For questions about your account, data privacy, or to request data deletion, please see our
              {' '}
              <a href="/privacy" className="text-primary underline">Privacy Policy</a>
              {' '}or contact us directly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}