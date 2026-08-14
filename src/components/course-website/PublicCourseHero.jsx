import React from 'react';
import { Calendar, MapPin, Users, DollarSign, GraduationCap, User } from 'lucide-react';
import { getBannerTheme } from '@/lib/banner-themes';

function formatDateRange(start, end) {
  if (!start) return 'TBD';
  const s = new Date(start + 'T12:00:00');
  if (!end || start === end) return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const e = new Date(end + 'T12:00:00');
  if (s.getMonth() === e.getMonth()) return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`;
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function PublicCourseHero({ course, organization, enrolledCount }) {
  const themeId = course.banner_theme || 'elegant_classic';
  const theme = getBannerTheme(themeId);
  const isCustom = themeId === 'custom' && course.banner_custom_url;

  const stats = [
    { icon: Calendar, label: 'Schedule', value: formatDateRange(course.start_date, course.end_date) },
    { icon: MapPin, label: 'Location', value: course.location || 'TBD' },
    ...(course.instructor_name ? [{ icon: User, label: 'Instructor', value: course.instructor_name }] : []),
    { icon: Users, label: 'Enrollment', value: `${enrolledCount || 0}${course.enrollment_cap ? '/' + course.enrollment_cap : ''}` },
    ...(course.payment_model === 'paid' && course.price ? [{ icon: DollarSign, label: 'Price', value: `$${(course.price / 100).toFixed(2)}` }] : []),
    { icon: GraduationCap, label: 'Status', value: (course.status || 'draft').replace(/_/g, ' ') },
  ];

  const sectionStyle = isCustom
    ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.4)), url(${course.banner_custom_url})`, backgroundSize: 'cover', backgroundPosition: 'center right', backgroundRepeat: 'no-repeat', minHeight: '420px' }
    : { backgroundImage: `${theme.overlay}, url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center right', backgroundRepeat: 'no-repeat', minHeight: '420px' };

  return (
    <section className="relative overflow-hidden flex items-center" style={sectionStyle}>
      <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20 w-full" style={{ color: theme.textColor }}>
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4"
          style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
        >
          Course
        </span>
        <div className="flex items-center gap-4 mb-3">
          {(course.logo_url || organization?.logo_url) && (
            <img
              src={course.logo_url || organization?.logo_url}
              alt={`${course.name} logo`}
              className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover ring-2 flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.accentColor + '40' }}
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold">{course.name}</h1>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <s.icon className="h-5 w-5" style={{ color: theme.textMuted }} />
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: theme.textMuted }}>{s.label}</p>
                <p className="text-sm font-semibold capitalize">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/course-register?course=${course.id}`}
            className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}
          >
            Enroll Now
          </a>
          <a
            href="#overview"
            className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold border-2 transition-colors hover:bg-black/10"
            style={{ borderColor: theme.secondaryButtonBorder, color: theme.secondaryButtonText }}
          >
            View Details
          </a>
        </div>
        <p className="mt-6 text-sm" style={{ color: theme.textMuted }}>
          Powered by <a href="https://morainmahj.com" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: theme.textColor }}>Morain Mahj</a>
        </p>
      </div>
    </section>
  );
}