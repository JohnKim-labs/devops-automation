import React from 'react'
import PropTypes from 'prop-types'
import { Slot } from '@radix-ui/react-slot'
import { clsx } from 'clsx'

const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2'

function Button({ asChild, className, variant = 'default', ...props }) {
  const Comp = asChild ? Slot : 'button'
  const variants = {
    default: 'bg-primary text-white hover:opacity-90',
    outline: 'border border-input bg-white hover:bg-muted',
    ghost: 'hover:bg-muted',
  }
  return (
    <Comp className={clsx(base, variants[variant], className)} {...props} />
  )
}

Button.propTypes = {
  asChild: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'outline', 'ghost'])
}

export default Button

