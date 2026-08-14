import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import BackButton from "@/components/shared/BackButton";
import {
  TrendingUp, DollarSign, Users, Building2, Percent, GraduationCap,
  Target, BarChart3, CheckCircle2, Zap, ArrowRight, Trophy, Globe
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

const mrrProjection = [
  { month: "M1",  subscription: 870,   transaction: 0,    course: 0,    club: 0 },
  { month: "M3",  subscription: 3480,  transaction: 600,  course: 200,  club: 0 },
  { month: "M6",  subscription: 9570,  transaction: 2200, course: 800,  club: 1200 },
  { month: "M9",  subscription: 19140, transaction: 5500, course: 2000, club: 3600 },
  { month: "M12", subscription: 31050, transaction: 9800, course: 4000, club: 7200 },
  { month: "M18", subscription: 52200, transaction: 18000,course: 8000, club: 14400 },
  { month: "M24", subscription: 70000, transaction: 25000,course: 10000,club: 18000 },
];

const revenueComparison = [
  { model: "Subscription only",    mrr: 70000 },
  { model: "+ Transaction fee",    mrr: 95000 },
  { model: "+ Course marketplace", mrr: 105000 },
  { model: "+ Club licensing",     mrr: 123000 },
];

const useCaseRevenue = [
  { scenario: "50-player @ $50",  fee2pct: "$50",  fee25pct: "$62" },
  { scenario: "100-player @ $50", fee2pct: "$100", fee25pct: "$125" },
  { scenario: "150-player @ $75", fee2pct: "$225", fee25pct: "$281" },
  { scenario: "200-player @ $100",fee2pct: "$400", fee25pct: "$500" },
];

const REVENUE_STREAMS = [
  {
    icon: Zap,
    color: "blue",
    title: "Organizer Subscriptions",
    subtitle: "$29 – $299 / mo",
    description: "Tiered SaaS for individual directors (Starter $29, Pro $69) and club/association org-wide licenses ($299). Annual billing at 20% discount reduces churn.",
    upside: "Predictable, low-CAC recurring base",
  },
  {
    icon: Percent,
    color: "green",
    title: "Transaction Fee (Entry Fees)",
    subtitle: "1.5 – 2.5% per event",
    description: "Applied to every entry fee processed through the app's Stripe integration. Organizers pass this to players at checkout — invisible to the director. Scales automatically with event size.",
    upside: "Fastest path to 3–5× revenue per organizer",
  },
  {
    icon: GraduationCap,
    color: "purple",
    title: "Course / Instructor Marketplace",
    subtitle: "10% of enrollment revenue",
    description: "Instructors list paid Mah Jongg classes and the app takes 10% at checkout — like Eventbrite. Infrastructure is already built. Zero incremental dev cost.",
    upside: "Taps an underserved digital teaching market",
  },
  {
    icon: Building2,
    color: "amber",
    title: "Club / Association White-Label",
    subtitle: "$299 – $499 / mo org license",
    description: "Sell to clubs with 5–10 active directors. One high-ACV contract covers many events. Clubs have far lower churn than individual organizers.",
    upside: "Higher ACV, lower churn, org-level stickiness",
  },
];

const MILESTONES = [
  { label: "Month 1",  target: "10 paying organizers, 1 club pilot", mrr: "$870" },
  { label: "Month 3",  target: "40 organizers, beta course marketplace", mrr: "$4,280" },
  { label: "Month 6",  target: "110 organizers, 4 clubs, marketplace live", mrr: "$13,770" },
  { label: "Month 9",  target: "220 organizers, 10 clubs, transaction fees scaled", mrr: "$30,240" },
  { label: "Month 12", target: "350 organizers, 20 clubs — breakeven", mrr: "$52,050" },
  { label: "Month 18", target: "600 organizers, 40 clubs", mrr: "$92,600" },
  { label: "Month 24", target: "1,000 organizers, 60 clubs", mrr: "$123,000" },
];

const LOAN_USE = [
  { label: "Product & Engineering (6 months runway)", amount: "$48,000", pct: 32 },
  { label: "Sales & Marketing (tournaments, clubs)", amount: "$36,000", pct: 24 },
  { label: "App Store / Infrastructure / Hosting",    amount: "$15,000", pct: 10 },
  { label: "Legal, Compliance, Accounting",           amount: "$12,000", pct: 8 },
  { label: "Customer Success & Support",              amount: "$24,000", pct: 16 },
  { label: "Working Capital Reserve",                 amount: "$15,000", pct: 10 },
];

function ColorDot({ color }) {
  const map = { blue: "bg-blue-500", green: "bg-green-500", purple: "bg-purple-500", amber: "bg-amber-500" };
  return <span className={`inline-block w-3 h-3 rounded-full mr-2 ${map[color]}`} />;
}

export default function BusinessPlan() {
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview",   label: "Overview" },
    { id: "revenue",    label: "Revenue Model" },
    { id: "projection", label: "Projections" },
    { id: "loan",       label: "Loan Pitch" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 pb-0" style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <BackButton fallbackPath="/pricing" />
            <div>
              <h1 className="text-xl font-heading font-bold leading-tight">Business Plan & Investor Pitch</h1>
              <p className="text-xs text-muted-foreground">Mah Jongg Tournament Platform — Updated June 2026</p>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeSection === s.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <Badge className="mb-3 bg-primary/10 text-primary border-0">Executive Summary</Badge>
              <h2 className="text-3xl font-heading font-bold mb-3">The only all-in-one platform built for Mah Jongg</h2>
              <p className="text-muted-foreground">
                We built the tools tournament directors, league organizers, and instructors actually need — tournament registration, live scoring, table assignments, leaderboards, prize management, and push notifications — in one app, available on iOS, Android, and web.
              </p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Addressable Market",  value: "~350K", sub: "active US players" },
                { label: "Target Organizers",   value: "~12K",  sub: "active directors" },
                { label: "Month 24 MRR Target", value: "$123K", sub: "blended model" },
                { label: "Break-Even",          value: "~M12",  sub: "350 organizers" },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4 text-center">
                    <div className="text-2xl font-bold text-primary">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
                    <div className="text-xs font-medium mt-1">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Problem / Solution */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><h3 className="font-bold text-base flex items-center gap-2"><Target className="h-4 w-4 text-red-500" /> The Problem</h3></CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Directors manage tournaments via spreadsheets, email chains, and pen-and-paper scorecards</p>
                  <p>• No dedicated software exists for Mah Jongg — generic event tools miss critical game-specific features</p>
                  <p>• Instructors have no digital marketplace to reach students outside their local club</p>
                  <p>• Leagues have no way to track long-term standings, attendance, or prizes digitally</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><h3 className="font-bold text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Our Solution</h3></CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Full tournament lifecycle: registration → check-in → table assignment → scoring → leaderboard → prizes</p>
                  <p>• Automated push notifications, room maps, borrowed set management, and real-time timers</p>
                  <p>• League management with RSVP, attendance history, and session-level standings</p>
                  <p>• Course marketplace for instructors to list and sell paid classes</p>
                </CardContent>
              </Card>
            </div>

            {/* Competitive moat */}
            <Card>
              <CardHeader className="pb-2"><h3 className="font-bold text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Competitive Moat</h3></CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
                {[
                  { title: "Domain specificity", body: "Built only for Mah Jongg — NMJL rules, flight logic, special hand tracking are native to the product, not bolt-ons." },
                  { title: "Network effects", body: "Every player on the platform is a potential referee for a new organizer's tournament. Growth is self-reinforcing." },
                  { title: "Data advantage", body: "As player histories accumulate, we build the richest Mah Jongg stats database in existence — a defensible asset competitors can't replicate quickly." },
                ].map(c => (
                  <div key={c.title}>
                    <p className="font-semibold mb-1">{c.title}</p>
                    <p className="text-muted-foreground">{c.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* REVENUE MODEL */}
        {activeSection === "revenue" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <Badge className="mb-3 bg-green-100 text-green-700 border-0">Four Revenue Streams</Badge>
              <h2 className="text-3xl font-heading font-bold mb-3">A blended model that scales with usage</h2>
              <p className="text-muted-foreground text-sm">
                Unlike pure SaaS, our transaction fee layer means revenue scales automatically with tournament size — directors who run bigger events pay more, without us raising subscription prices.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {REVENUE_STREAMS.map(stream => {
                const Icon = stream.icon;
                const bg = { blue: "bg-blue-100", green: "bg-green-100", purple: "bg-purple-100", amber: "bg-amber-100" }[stream.color];
                const ic = { blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600", amber: "text-amber-600" }[stream.color];
                return (
                  <Card key={stream.title}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                          <Icon className={`h-5 w-5 ${ic}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                            <h3 className="font-bold">{stream.title}</h3>
                            <Badge variant="outline" className="text-xs">{stream.subtitle}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{stream.description}</p>
                          <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" /> {stream.upside}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Transaction fee table */}
            <Card>
              <CardHeader className="pb-2">
                <h3 className="font-bold flex items-center gap-2"><Percent className="h-4 w-4 text-green-600" /> Transaction Fee Impact — Per Event</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Event Size</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Pro (2%)</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Starter (2.5%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {useCaseRevenue.map(row => (
                        <tr key={row.scenario} className="border-b border-border/50">
                          <td className="py-2.5">{row.scenario}</td>
                          <td className="text-right py-2.5 font-semibold text-green-700">{row.fee2pct}</td>
                          <td className="text-right py-2.5 font-semibold text-amber-700">{row.fee25pct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Director runs 4 events/year at 100 players avg → $400–$500/yr from transaction fees alone, on top of their subscription.</p>
              </CardContent>
            </Card>

            {/* Month 24 comparison */}
            <Card>
              <CardHeader className="pb-2">
                <h3 className="font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Month 24 MRR by Revenue Model</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueComparison} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="model" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, "MRR"]} />
                    <Bar dataKey="mrr" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PROJECTIONS */}
        {activeSection === "projection" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <Badge className="mb-3 bg-primary/10 text-primary border-0">24-Month Forecast</Badge>
              <h2 className="text-3xl font-heading font-bold mb-3">Path to $123K MRR</h2>
              <p className="text-muted-foreground text-sm">Conservative model assuming 1,000 organizers and 60 clubs by Month 24.</p>
            </div>

            {/* Stacked line chart */}
            <Card>
              <CardHeader className="pb-2"><h3 className="font-bold">MRR Growth by Revenue Stream</h3></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={mrrProjection} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, ""]} />
                    <Legend />
                    <Line type="monotone" dataKey="subscription" name="Subscriptions" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="transaction"  name="Transaction Fees" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="course"       name="Course Marketplace" stroke="#a855f7" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="club"         name="Club Licenses" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Milestone table */}
            <Card>
              <CardHeader className="pb-2"><h3 className="font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Growth Milestones</h3></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Period</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Target</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Blended MRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MILESTONES.map(m => (
                        <tr key={m.label} className="border-b border-border/50">
                          <td className="py-2.5 font-medium">{m.label}</td>
                          <td className="py-2.5 text-muted-foreground text-xs">{m.target}</td>
                          <td className="text-right py-2.5 font-bold text-primary">{m.mrr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Key assumptions */}
            <Card>
              <CardHeader className="pb-2"><h3 className="font-bold">Key Assumptions</h3></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                {[
                  "Average subscription MRR/organizer: $70 blended (Starter + Pro mix)",
                  "Average transaction fee per organizer per month: $25 (4 events/yr, 100 players avg)",
                  "Course marketplace: 10% of $100K annual course GMV by Month 24",
                  "Club license: 60 clubs at avg $299/mo by Month 24",
                  "Monthly churn rate: 3% for individuals, 1% for clubs",
                  "CAC: $80 average (cold outreach, tournament directories, word-of-mouth)",
                ].map(a => (
                  <p key={a} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {a}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* LOAN PITCH */}
        {activeSection === "loan" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <Badge className="mb-3 bg-amber-100 text-amber-700 border-0">Investor / Loan Pitch</Badge>
              <h2 className="text-3xl font-heading font-bold mb-3">$150,000 Seed Round</h2>
              <p className="text-muted-foreground text-sm">
                Seeking $150,000 to accelerate growth from early traction to break-even. At current burn, this provides 14 months of runway with a clear path to profitability at Month 12.
              </p>
            </div>

            {/* The ask */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "Loan / Round Size",   value: "$150,000" },
                { label: "Projected Break-Even", value: "Month 12" },
                { label: "Month 24 MRR",        value: "$123,000" },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4 text-center">
                    <div className="text-2xl font-bold text-primary">{s.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Use of funds */}
            <Card>
              <CardHeader className="pb-2"><h3 className="font-bold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Use of Funds</h3></CardHeader>
              <CardContent className="space-y-3">
                {LOAN_USE.map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="font-semibold">{item.amount}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Why now */}
            <Card>
              <CardHeader className="pb-2"><h3 className="font-bold flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> Why Now</h3></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Market timing:</strong> Mah Jongg participation surged 40%+ post-pandemic and continues growing. New players → new clubs → new tournaments.</p>
                <p>• <strong>No incumbent:</strong> No software company owns this vertical. The first mover with a polished product wins the distribution.</p>
                <p>• <strong>App Store approved:</strong> Already live on iOS and Android. Competitors would need 12–18 months to catch up to where we are today.</p>
                <p>• <strong>Transaction fee unlock:</strong> With Stripe already integrated, adding the 2% fee requires zero new infrastructure — it's a pricing change, not an engineering project.</p>
                <p>• <strong>Course marketplace:</strong> The teaching module is built. Enabling public listings and marketplace payouts is weeks of work, not months.</p>
              </CardContent>
            </Card>

            {/* Risk & mitigation */}
            <Card>
              <CardHeader className="pb-2"><h3 className="font-bold">Risk & Mitigation</h3></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Risk</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Mitigation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { risk: "Slow organizer adoption", mit: "Free 14-day trial removes friction; tournament director community is tight-knit (word-of-mouth)" },
                        { risk: "Transaction fee pushback", mit: "Fee is passed to players at checkout — directors see zero out-of-pocket cost" },
                        { risk: "Competitor enters market", mit: "Domain expertise + data moat + App Store presence create 12+ month lead" },
                        { risk: "Revenue concentration", mit: "4 revenue streams ensure no single stream is >60% of MRR by Month 12" },
                      ].map(row => (
                        <tr key={row.risk} className="border-b border-border/50">
                          <td className="py-2.5 text-red-600 font-medium">{row.risk}</td>
                          <td className="py-2.5 text-muted-foreground">{row.mit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Closing statement */}
            <div className="bg-primary text-primary-foreground rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-heading font-bold mb-3">The Ask</h3>
              <p className="text-primary-foreground/80 mb-4 max-w-xl mx-auto">
                $150,000 in seed funding to go from early traction to a $123K/mo revenue business in 24 months — in a market with no dominant incumbent and a product that is already App Store approved and in players' hands.
              </p>
              <p className="text-xl font-bold">Break-even at Month 12. Cashflow positive by Month 14.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}