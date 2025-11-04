import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeaderSection from './HeaderSection';

describe('HeaderSection', () => {
  it('renders the title correctly', () => {
    render(<HeaderSection title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(
      <HeaderSection
        title="Test Title"
        subtitle="Test Subtitle"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<HeaderSection title="Test Title" />);

    const subtitle = screen.queryByText('Test Subtitle');
    expect(subtitle).not.toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <HeaderSection
        title="Test Title"
        subtitle="Test Subtitle"
      />
    );

    const header = container.querySelector('header');
    expect(header).toHaveClass('px-4', 'md:px-6', 'py-4', 'border-b', 'bg-white');
  });
});
