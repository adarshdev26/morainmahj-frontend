import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { sendEmail } from '@/services/integrationsApi';
import { isCapacitorNative } from '@/lib/capacitor-utils';

export default function MarketingContact() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const isNative = isCapacitorNative();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sendEmail({
        to: 'support@morainmahj.com',
        subject: `Marketing Contact: ${form.name}`,
        body: `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
      });
      toast({ title: 'Message sent!', description: 'We\'ll get back to you soon.' });
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketingLayout pageTitle="Contact">
      <section className={isNative ? 'px-4 pt-6 pb-4' : 'py-14 sm:py-20'}>
        <div className={isNative ? '' : 'max-w-2xl mx-auto px-5'}>
          <div className={isNative ? 'mb-5' : 'text-center mb-10'}>
            <h1 className={isNative ? 'text-[22px] font-semibold tracking-tight mb-1.5' : 'text-4xl font-heading font-semibold mb-3'}>
              Get in Touch
            </h1>
            <p className={isNative ? 'text-[14px] text-muted-foreground leading-relaxed' : 'text-muted-foreground'}>
              Questions, partnerships, or just want to say hello? We'd love to hear from you.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className={isNative
              ? 'space-y-3.5 rounded-2xl border border-border bg-card p-4'
              : 'space-y-4 bg-card rounded-xl border border-border p-6'}
          >
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Your name"
                className={isNative ? 'h-11 rounded-xl' : undefined}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                placeholder="you@example.com"
                className={isNative ? 'h-11 rounded-xl' : undefined}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <Textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                required
                rows={5}
                placeholder="How can we help?"
                className={isNative ? 'rounded-xl' : undefined}
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className={`w-full gap-2 ${isNative ? 'h-12 rounded-xl font-semibold' : ''}`}
            >
              {submitting ? 'Sending…' : <><Mail className="h-4 w-4" /> Send Message</>}
            </Button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
