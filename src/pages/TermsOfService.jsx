import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '@/components/shared/BackButton';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-heading font-semibold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: June 20, 2026</p>
        </div>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using the Morain Mahj application ("App"), you agree to be bound by
              these Terms of Service ("Terms"). If you do not agree, do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p>
              Morain Mahj provides a platform for organizing and participating in Mahjong tournaments, leagues,
              and instructional classes. Features include player registration, table assignments, scorecard
              management, leaderboards, and community communications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must be at least 18 years of age to create an account.</li>
              <li>Accounts are non-transferable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Tournament & League Participation</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Registration fees, where applicable, are processed securely through our payment provider.</li>
              <li>Entry fees are non-refundable unless a tournament is cancelled by the organizer.</li>
              <li>Waitlist promotions are handled automatically and you will be notified by push notification or email.</li>
              <li>Scorecard submissions are considered final once verified by the East seat player.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Payment Terms</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Payments are processed via Stripe. We do not store your full payment card details.</li>
              <li>Refunds are issued at the sole discretion of the tournament director.</li>
              <li>App processing fees are separate from entry fees and are non-refundable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Code of Conduct</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You agree to treat all other players, directors, and instructors with respect.</li>
              <li>Harassment, hate speech, spam, or any inappropriate content posted in community feeds is strictly prohibited.</li>
              <li>Violations may result in immediate suspension or permanent ban from the platform.</li>
              <li>You may report violations using the in-app reporting tool.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Scoring & Leaderboards</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Scores are submitted by players and verified by the designated East seat player.</li>
              <li>Disputes must be raised with the tournament director before the round closes.</li>
              <li>The platform is not responsible for incorrect scores submitted by users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Data & Privacy</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>We collect personal data including your name, email address, and phone number for the purposes of tournament management and communications.</li>
              <li>Your data may be shared with tournament directors solely for event coordination purposes.</li>
              <li>You may request deletion of your account and data at any time via the in-app "Delete Account" feature.</li>
            </ul>
            <p className="mt-3">
              Please review our{' '}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>{' '}
              for full details on how your data is stored and used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Push Notifications & Communications</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>By registering, you consent to receiving push notifications and emails related to your registrations, table assignments, scores, and tournament updates.</li>
              <li>You may manage notification preferences in your Profile settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Intellectual Property</h2>
            <p>
              All content, branding, and software within the App is the property of Morain Mahj, LLC and may not
              be reproduced without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Disclaimer of Warranties</h2>
            <p>
              The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or
              error-free service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Morain Mahj, LLC shall not be liable for any indirect,
              incidental, or consequential damages arising from your use of the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued use of the App after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <p className="font-medium">Morain Mahj, LLC</p>
              <p className="text-muted-foreground">Email: support@morainmahj.com</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
