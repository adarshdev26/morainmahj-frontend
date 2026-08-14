import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BrandGuide() {
  const [copied, setCopied] = useState(null);

  const handleExport = () => {
    window.print();
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const colors = [
    { name: 'Navy (Primary)', hex: '#1A3242', hsl: 'hsl(220, 40%, 20%)', usage: 'Main brand color, text, buttons' },
    { name: 'Cream (Background)', hex: '#F5F0EB', hsl: 'hsl(40, 33%, 96%)', usage: 'Primary background, highlights' },
    { name: 'Blush (Secondary)', hex: '#D9C9C5', hsl: 'hsl(0, 25%, 85%)', usage: 'Accents, secondary elements' },
    { name: 'Gold (Accent)', hex: '#D4A574', hsl: 'hsl(43, 50%, 65%)', usage: 'Highlights, hover states, badges' },
    { name: 'Black', hex: '#000000', hsl: 'hsl(0, 0%, 0%)', usage: 'Text contrast, borders' },
  ];

  const fonts = [
    { name: 'Cormorant Garamond', usage: 'Headings, logo', weights: '300, 400, 500, 600, 700' },
    { name: 'Inter', usage: 'Body text, UI elements', weights: '300, 400, 500, 600' },
  ];

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="mb-12 text-center">
          <Logo size="lg" className="justify-center mb-6 text-foreground" />
          <h1 className="text-4xl font-heading font-light mb-2 text-foreground">Brand Guide</h1>
          <p className="text-muted-foreground text-lg">Morain Mahj — Game Management</p>
          <Button onClick={handleExport} variant="outline" className="mt-4 gap-2 print:hidden">
            <Download className="h-4 w-4" /> Export as PDF
          </Button>
        </div>

        {/* Logo Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Logo</h2>
          <Card>
            <CardContent className="pt-8">
              <div className="space-y-8">
                <div className="border-b border-border pb-8">
                  <p className="text-sm text-muted-foreground mb-4">Full Logo</p>
                  <div className="bg-card rounded-lg p-12 flex justify-center">
                    <Logo size="md" className="text-foreground" />
                  </div>
                </div>

                <div className="border-b border-border pb-8">
                  <p className="text-sm text-muted-foreground mb-4">Icon Only</p>
                  <div className="flex gap-8 flex-wrap">
                    {['xs', 'sm', 'md', 'lg', 'xl'].map(size => (
                      <div key={size} className="flex flex-col items-center gap-2">
                        <div className="bg-card rounded-lg p-6 flex justify-center">
                          <Logo variant="icon" size={size} className="text-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground">{size}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-4">Logo Guidelines</p>
                  <ul className="space-y-2 text-sm text-foreground list-disc list-inside">
                    <li>Diamond monogram with serif "M"</li>
                    <li>Double-rule geometric borders</li>
                    <li>Light-weight typography</li>
                    <li>Works in navy, white, or brand colors</li>
                    <li>Minimum size: 32px for icon-only use</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Color Palette</h2>
          <div className="grid gap-4">
            {colors.map((color, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    <div
                      className="w-24 h-24 rounded-lg border border-border shadow-sm shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{color.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">{color.hex}</code>
                          <button
                            onClick={() => copyToClipboard(color.hex, `hex-${idx}`)}
                            className="p-1 hover:bg-muted rounded transition"
                          >
                            {copied === `hex-${idx}` ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">{color.hsl}</code>
                          <button
                            onClick={() => copyToClipboard(color.hsl, `hsl-${idx}`)}
                            className="p-1 hover:bg-muted rounded transition"
                          >
                            {copied === `hsl-${idx}` ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </div>
                        <p className="text-muted-foreground">{color.usage}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Typography</h2>
          <div className="space-y-6">
            {fonts.map((font, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-4">{font.name}</h3>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Usage</p>
                    <p className="text-foreground">{font.usage}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Available Weights</p>
                    <p className="text-foreground font-mono text-sm">{font.weights}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Sample</p>
                    <div
                      style={{
                        fontFamily: font.name === 'Cormorant Garamond' ? "'Cormorant Garamond', serif" : "'Inter', sans-serif",
                      }}
                      className="text-lg text-foreground"
                    >
                      The quick brown fox jumps over the lazy dog
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* UI Components */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">UI Components</h2>
          <Card>
            <CardContent className="pt-8">
              <div className="space-y-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Buttons</p>
                  <div className="flex flex-wrap gap-3">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                </div>

                <div className="border-t border-border pt-8">
                  <p className="text-sm text-muted-foreground mb-4">Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </div>

                <div className="border-t border-border pt-8">
                  <p className="text-sm text-muted-foreground mb-4">Headings</p>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-heading font-semibold text-foreground">Heading 1</h1>
                    <h2 className="text-3xl font-heading font-semibold text-foreground">Heading 2</h2>
                    <h3 className="text-2xl font-heading font-semibold text-foreground">Heading 3</h3>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Voice & Tone */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Voice & Tone</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Elegant & Professional</h3>
                <p className="text-muted-foreground">Morain Mahj speaks with sophistication and respect for the game and its players.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Clear & Approachable</h3>
                <p className="text-muted-foreground">Language is straightforward and accessible to all players, from beginners to experts.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Community-Focused</h3>
                <p className="text-muted-foreground">Emphasize connection, fair play, and the joy of competitive gameplay.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Business Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Business Cards</h2>
          <Card>
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-4">Front</p>
                  <div className="w-full max-w-sm h-32 rounded-lg border-2 border-dashed border-border bg-primary text-primary-foreground p-4 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="font-heading font-semibold text-lg">Morain Mahj</div>
                      <div className="font-body text-xs font-light tracking-wide">Game Management</div>
                    </div>
                    <div className="text-xs opacity-75">Tournament Director</div>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-4">Back</p>
                  <div className="w-full max-w-sm h-32 rounded-lg border-2 border-dashed border-border bg-card text-foreground p-4 flex flex-col justify-between shadow-lg">
                    <div className="text-xs space-y-1 text-foreground/70">
                      <div>www.morainmahj.com</div>
                      <div>contact@morainmahj.com</div>
                      <div>(555) 123-4567</div>
                    </div>
                    <div className="w-12 h-8 bg-primary/10 rounded flex items-center justify-center">
                      <div className="text-xs font-heading font-semibold text-primary">M</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Guidelines</p>
                <ul className="space-y-1 text-sm text-foreground list-disc list-inside">
                  <li>Standard size: 3.5" × 2"</li>
                  <li>Navy (primary) front, cream background for back</li>
                  <li>Include contact information on back</li>
                  <li>Use serif fonts for name, sans-serif for details</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Letterhead */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Letterhead</h2>
          <Card>
            <CardContent className="pt-8">
              <div className="border border-border rounded-lg p-8 bg-white min-h-[400px] text-foreground">
                <div className="flex items-center gap-4 mb-12 pb-6 border-b border-primary/20">
                  <div className="w-16 h-16 rounded-lg border border-primary flex items-center justify-center">
                    <Logo variant="icon" size="sm" className="text-primary" />
                  </div>
                  <div>
                    <div className="font-heading font-light text-lg text-primary">Morain Mahj</div>
                    <div className="font-body text-xs text-muted-foreground">Game Management</div>
                  </div>
                </div>
                <div className="space-y-6 text-sm">
                  <div>
                    <p className="font-heading font-semibold mb-2">Contact Information</p>
                    <p className="text-muted-foreground">www.morainmahj.com | contact@morainmahj.com | (555) 123-4567</p>
                  </div>
                  <div className="h-px bg-primary/10" />
                  <div className="min-h-[150px]">
                    <p className="font-heading font-semibold mb-2">Letter Content Goes Here</p>
                    <p className="text-muted-foreground leading-relaxed">Use navy text on cream background with ample white space for readability. Maintain the elegant, professional tone throughout all written communications.</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Guidelines</p>
                <ul className="space-y-1 text-sm text-foreground list-disc list-inside">
                  <li>Standard size: 8.5" × 11"</li>
                  <li>Cream background with navy text</li>
                  <li>Logo and contact header at top</li>
                  <li>Decorative line separates header from content</li>
                  <li>Minimum 1" margins on all sides</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Marketing Materials */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Marketing Materials</h2>
          <Card>
            <CardContent className="pt-8 space-y-8">
              <div>
                <h3 className="font-semibold text-foreground mb-4">Email Signature</h3>
                <div className="border border-border rounded-lg p-4 bg-card text-sm font-body space-y-2">
                  <div className="font-semibold text-foreground">John Tournament Director</div>
                  <div className="text-muted-foreground">Tournament Organizer</div>
                  <div className="text-muted-foreground">Morain Mahj</div>
                  <div className="text-muted-foreground">www.morainmahj.com</div>
                  <div className="text-muted-foreground">(555) 123-4567</div>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="font-semibold text-foreground mb-4">Social Media Headers</h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Facebook (820×312px) & LinkedIn (1200×627px)</p>
                  <div className="bg-gradient-to-r from-primary to-primary/80 h-32 rounded-lg flex items-center justify-center text-primary-foreground">
                    <div className="text-center">
                      <Logo size="sm" className="justify-center mb-2 text-primary-foreground opacity-90" />
                      <p className="text-sm tracking-widest">Join the Community</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="font-semibold text-foreground mb-4">Event Poster</h3>
                <div className="bg-primary text-primary-foreground p-8 rounded-lg text-center space-y-4">
                  <Logo size="md" className="justify-center text-primary-foreground opacity-90" />
                  <div className="space-y-2">
                    <h4 className="font-heading text-3xl font-light">Spring Tournament 2026</h4>
                    <p className="text-primary-foreground/80">Experience competitive Mah Jongg</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>Date:</strong> April 25, 2026</p>
                    <p><strong>Location:</strong> Community Center</p>
                    <p><strong>Register:</strong> www.morainmahj.com</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Merchandise */}
        <section className="mb-16">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-foreground">Merchandise</h2>
          <Card>
            <CardContent className="pt-8 space-y-8">
              <div>
                <h3 className="font-semibold text-foreground mb-4">T-Shirt Design</h3>
                <div className="flex justify-center">
                  <div className="bg-primary text-primary-foreground w-48 h-64 rounded-lg flex flex-col items-center justify-center gap-3 shadow-md">
                    <Logo variant="icon" size="md" className="text-primary-foreground opacity-90" />
                    <p className="text-center text-sm font-heading font-light tracking-widest">MORAIN MAHJ</p>
                    <p className="text-xs text-primary-foreground/70">Tournament 2026</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="font-semibold text-foreground mb-4">Mug Design</h3>
                <div className="flex justify-center">
                  <div className="bg-secondary text-foreground w-32 h-40 rounded-2xl rounded-bl-none flex flex-col items-center justify-center gap-2 shadow-md relative">
                    <Logo variant="icon" size="sm" className="text-foreground opacity-80" />
                    <p className="text-xs font-heading font-light tracking-wider text-center">MAHJ</p>
                    <div className="absolute right-0 top-8 w-6 h-6 bg-secondary rounded-full" />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="font-semibold text-foreground mb-4">Badge/Sticker</h3>
                <div className="flex gap-6 flex-wrap">
                  {[
                    { bg: 'bg-primary', text: 'text-primary-foreground', label: 'Navy Badge' },
                    { bg: 'bg-secondary', text: 'text-foreground', label: 'Blush Badge' },
                    { bg: 'bg-accent', text: 'text-foreground', label: 'Gold Badge' },
                  ].map((badge, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className={`w-24 h-24 rounded-full ${badge.bg} ${badge.text} flex flex-col items-center justify-center gap-1 shadow-md`}>
                        <Logo variant="icon" size="xs" className={badge.text} />
                        <p className="text-[10px] font-bold tracking-wider">MAHJ</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="py-8 text-center text-sm text-muted-foreground border-t border-border">
          <p>© {new Date().getFullYear()} Morain Mahj · Brand Guidelines</p>
        </div>
      </div>
    </div>
  );
}