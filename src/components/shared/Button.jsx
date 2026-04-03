import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

const VARIANT_STYLES = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

const SIZE_STYLES = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
};

function Button({
  children,
  className = '',
  disabled = false,
  size = 'md',
  to,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    className,
  );

  if (to) {
    return (
      <Link
        className={classes}
        to={to}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export default memo(Button);
