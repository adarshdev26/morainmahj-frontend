import { Link } from 'react-router-dom';

export default function PaymentLegalNotice({
  className = '',
  variant = 'default',
  action = 'completing payment',
}) {
  const linkClass =
    variant === 'onPrimary'
      ? 'underline underline-offset-2 hover:text-primary-foreground font-medium'
      : 'underline underline-offset-2 hover:text-foreground font-medium';

  return (
    <p className={className}>
      By {action}, you agree to our{' '}
      <Link to="/terms" className={linkClass}>Terms of Service</Link>
      {' '}and{' '}
      <Link to="/privacy" className={linkClass}>Privacy Policy</Link>.
    </p>
  );
}
