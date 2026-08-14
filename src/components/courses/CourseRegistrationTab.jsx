import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, ExternalLink, Link, QrCode } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CourseInviteSection from '@/components/courses/CourseInviteSection';

export default function CourseRegistrationTab({ courseId, course }) {
  const { toast } = useToast();

  const registrationUrl = useMemo(() => {
    return `${window.location.origin}/course-register?courseId=${courseId}`;
  }, [courseId]);

  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(registrationUrl)}`;
  }, [registrationUrl]);

  const copyUrl = () => {
    navigator.clipboard.writeText(registrationUrl);
    toast({ title: 'Registration link copied!' });
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `course-register-${courseId}.png`;
    link.click();
    toast({ title: 'QR code downloaded' });
  };

  const openPage = () => window.open(registrationUrl, '_blank');

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Registration Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="h-4 w-4" /> Registration Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">Share this link with prospective students so they can register for <strong>{course?.name}</strong>.</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={registrationUrl}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-600"
            />
            <Button size="sm" variant="outline" onClick={copyUrl} className="gap-1.5 shrink-0">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <Button onClick={openPage} variant="outline" className="gap-2 w-full">
            <ExternalLink className="h-4 w-4" /> Open Registration Page
          </Button>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" /> QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="bg-white p-3 border-2 border-slate-200 rounded-lg shrink-0">
              <img src={qrImageUrl} alt="Registration QR code" className="w-48 h-48" />
            </div>
            <div className="space-y-3 flex-1">
              <p className="text-sm text-slate-500">Print or display this QR code at your venue. Students scan it to open the registration page directly on their phone.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
                <p className="font-semibold">Tips for sharing:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Print and post at the class venue</li>
                  <li>Include in flyers or email newsletters</li>
                  <li>Display on a screen at the door</li>
                </ul>
              </div>
              <Button onClick={downloadQR} variant="outline" className="gap-2 w-full">
                <Download className="h-4 w-4" /> Download QR Code PNG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CourseInviteSection course={course} courseId={courseId} />
    </div>
  );
}