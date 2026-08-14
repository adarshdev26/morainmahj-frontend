import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { navigateBackFromDetail } from '@/lib/discover-navigation';

export default function BackButton({ fallbackPath = null, to = null, beforeNavigate = null, onPrimary = false } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    try {
      beforeNavigate?.();
    } catch {
      // ignore
    }

    if (to) {
      navigate(to, { replace: true });
      return;
    }

    if (location.state?.fromDiscover) {
      navigateBackFromDetail(navigate, location, fallbackPath || '/app');
      return;
    }

    if (fallbackPath && window.history.length <= 1) {
      navigate(fallbackPath, { replace: true });
      return;
    }

    navigate(-1);
  };

  return (
    <button
      onClick={handleBack}
      className={onPrimary
        ? 'w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/15 active:scale-95 transition-transform'
        : 'w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors active:scale-95'}
      title="Go back"
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
  );
}
