import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoffeeBeanCard } from './coffee-bean-card';

describe('CoffeeBeanCard', () => {
  const defaultProps = {
    id: 1,
    name: 'Ethiopian Yirgacheffe',
    description: 'A bright and fruity coffee with floral notes',
    imageKey: null,
    tastingNotes: 'Blueberry, Jasmine, Honey',
    priceInCents: 1899,
    roastLevel: 'Light' as const,
  };

  it('renders the bean name', () => {
    render(<CoffeeBeanCard {...defaultProps} />);
    expect(screen.getByText('Ethiopian Yirgacheffe')).toBeInTheDocument();
  });

  it('formats price correctly from cents to dollars', () => {
    render(<CoffeeBeanCard {...defaultProps} />);
    expect(screen.getByText('$18.99')).toBeInTheDocument();
  });

  it('formats price with leading zero for cents < 10', () => {
    render(<CoffeeBeanCard {...defaultProps} priceInCents={1505} />);
    expect(screen.getByText('$15.05')).toBeInTheDocument();
  });

  it('formats whole dollar amounts with .00', () => {
    render(<CoffeeBeanCard {...defaultProps} priceInCents={2000} />);
    expect(screen.getByText('$20.00')).toBeInTheDocument();
  });

  it('renders the roast level badge', () => {
    render(<CoffeeBeanCard {...defaultProps} />);
    expect(screen.getByText('Light Roast')).toBeInTheDocument();
  });

  it('applies correct styling for Light roast', () => {
    render(<CoffeeBeanCard {...defaultProps} roastLevel="Light" />);
    const badge = screen.getByText('Light Roast');
    expect(badge).toHaveClass('bg-amber-100', 'text-amber-800');
  });

  it('applies correct styling for Medium roast', () => {
    render(<CoffeeBeanCard {...defaultProps} roastLevel="Medium" />);
    const badge = screen.getByText('Medium Roast');
    expect(badge).toHaveClass('bg-amber-200', 'text-amber-900');
  });

  it('applies correct styling for Dark roast', () => {
    render(<CoffeeBeanCard {...defaultProps} roastLevel="Dark" />);
    const badge = screen.getByText('Dark Roast');
    expect(badge).toHaveClass('bg-amber-800', 'text-amber-50');
  });

  it('applies correct styling for Espresso roast', () => {
    render(<CoffeeBeanCard {...defaultProps} roastLevel="Espresso" />);
    const badge = screen.getByText('Espresso Roast');
    expect(badge).toHaveClass('bg-stone-900', 'text-stone-50');
  });

  it('does not render roast badge when roastLevel is null', () => {
    render(<CoffeeBeanCard {...defaultProps} roastLevel={null} />);
    expect(screen.queryByText(/Roast$/)).not.toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<CoffeeBeanCard {...defaultProps} />);
    expect(screen.getByText('A bright and fruity coffee with floral notes')).toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<CoffeeBeanCard {...defaultProps} description={null} />);
    expect(screen.queryByText('A bright and fruity coffee with floral notes')).not.toBeInTheDocument();
  });

  it('renders tasting notes section', () => {
    render(<CoffeeBeanCard {...defaultProps} />);
    expect(screen.getByText('Tasting Notes')).toBeInTheDocument();
    expect(screen.getByText('Blueberry, Jasmine, Honey')).toBeInTheDocument();
  });

  it('does not render tasting notes when null', () => {
    render(<CoffeeBeanCard {...defaultProps} tastingNotes={null} />);
    expect(screen.queryByText('Tasting Notes')).not.toBeInTheDocument();
  });

  it('links to the correct bean detail page', () => {
    render(<CoffeeBeanCard {...defaultProps} id={42} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/beans/42');
  });

  it('uses placeholder image when imageKey is null', () => {
    render(<CoffeeBeanCard {...defaultProps} imageKey={null} />);
    const img = screen.getByAltText('Ethiopian Yirgacheffe');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('placehold.co')
    );
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining(encodeURIComponent('Ethiopian Yirgacheffe'))
    );
  });
});
