import React from 'react'
import PropTypes from 'prop-types'

function HeaderSection({ title, subtitle }) {
  return (
    <header className="px-4 md:px-6 py-4 border-b bg-white">
      <h1 className="text-xl md:text-2xl font-semibold">{title}</h1>
      {subtitle ? (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      ) : null}
    </header>
  )
}

HeaderSection.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
}

export default HeaderSection

