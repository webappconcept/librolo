import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Smoke test di base — verifica che i componenti si renderizzino
// senza errori. Espandi con componenti reali del progetto.

const SimpleButton = ({ label, disabled = false }: { label: string; disabled?: boolean }) => (
  <button disabled={disabled} aria-label={label}>
    {label}
  </button>
)

const Badge = ({ text, variant }: { text: string; variant: 'success' | 'warning' | 'error' }) => (
  <span data-variant={variant} role="status">
    {text}
  </span>
)

describe('SimpleButton component', () => {
  it('renderizza correttamente con label', () => {
    render(<SimpleButton label="Salva" />)
    expect(screen.getByRole('button', { name: 'Salva' })).toBeInTheDocument()
  })

  it('è disabilitato quando disabled=true', () => {
    render(<SimpleButton label="Disabilitato" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Badge component', () => {
  it.each([
    ['Pubblicato', 'success'],
    ['Bozza', 'warning'],
    ['Errore', 'error'],
  ] as const)('renderizza badge %s con variante %s', (text, variant) => {
    render(<Badge text={text} variant={variant} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent(text)
    expect(badge).toHaveAttribute('data-variant', variant)
  })
})
