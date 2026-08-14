import React from 'react';
import BackButton from '@/components/shared/BackButton';

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-heading font-semibold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 30, 2026</p>
        </div>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p>
              Welcome to Morain Mahj ("we," "our," or "us"). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy explains how we collect, use, and
              safeguard your information when you use our app and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><span className="text-foreground font-medium">Account Information:</span> Name, email address, and password when you register.</li>
              <li><span className="text-foreground font-medium">Profile Information:</span> Phone number and other optional profile details you choose to provide.</li>
              <li><span className="text-foreground font-medium">Tournament & League Data:</span> RSVP responses, game scores, table assignments, and participation history.</li>
              <li><span className="text-foreground font-medium">Payment Information:</span> Payment transactions are processed securely by Stripe. We do not store full credit card numbers.</li>
              <li><span className="text-foreground font-medium">Usage Data:</span> How you interact with the app, including pages visited and features used.</li>
              <li><span className="text-foreground font-medium">Device Information:</span> Device type, operating system, and browser type for app compatibility purposes.</li>
              <li><span className="text-foreground font-medium">Push Notification Token:</span> If you enable push notifications, we collect a device token to deliver alerts to your device.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Create and manage your account</li>
              <li>Facilitate tournament and league registration, scheduling, and management</li>
              <li>Send session invitations, reminders, and RSVP confirmations via email and push notification</li>
              <li>Process payments for tournament entry fees and subscriptions</li>
              <li>Display leaderboards, scores, and table assignments</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Sharing Your Information</h2>
            <p className="mb-2">We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><span className="text-foreground font-medium">Tournament & League Organizers:</span> Names and contact details may be visible to administrators managing events you participate in.</li>
              <li><span className="text-foreground font-medium">Other Players (Limited):</span> Your name may appear on public RSVP lists or leaderboards if enabled by the organizer. Email and phone are never shown to other players.</li>
              <li><span className="text-foreground font-medium">Stripe:</span> For payment processing. Stripe's privacy policy applies to payment data.</li>
              <li><span className="text-foreground font-medium">Service Providers:</span> Trusted third-party vendors who assist us in operating the app, subject to confidentiality agreements.</li>
              <li><span className="text-foreground font-medium">Legal Requirements:</span> If required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services.
              Tournament and league records are retained for up to 7 years for historical and compliance purposes.
              You may request deletion of your account and associated data at any time (see Section 8).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Security</h2>
            <p>
              We implement industry-standard security measures including role-based access controls, encrypted data
              transmission (HTTPS), and audit logging of sensitive data access. However, no method of transmission
              over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Push Notifications</h2>
            <p>
              With your permission, we use OneSignal to send push notifications to your device for table assignments,
              tournament updates, league session invites, and score verifications. We collect and store a device
              push token solely for this purpose. You can withdraw consent at any time via your device settings
              or through the Notifications section in your Profile. We do not use push notification data for
              advertising or share it with third parties beyond OneSignal's delivery service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies & Analytics</h2>
            <p>
              We use cookies and similar tracking technologies to maintain your session and analyze app usage.
              We may use anonymized analytics data to understand how users interact with the app and to improve
              our services. You can disable cookies in your browser settings, though some features may not function properly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Your Rights</h2>
            <p className="mb-2">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and personal data</li>
              <li>Opt out of non-essential communications</li>
              <li>Data portability (receive a copy of your data)</li>
            </ul>
            <p className="mt-3">To exercise these rights, please contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
            <p>
              Our app is not directed to children under the age of 13. We do not knowingly collect personal
              information from children under 13. If you believe we have inadvertently collected such information,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              by posting the new policy on this page with an updated date. Your continued use of the app
              after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or how we handle your data, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <p className="font-medium">Morain Mahj</p>
              <p className="text-muted-foreground">Email: support@morainmahj.com</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}