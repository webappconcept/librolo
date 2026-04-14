import { describe, it, expect } from 'vitest'

// Tipi allineati alla struttura di Librolo
type BookStatus = 'draft' | 'published' | 'archived'

interface Book {
  id: number
  title: string
  status: BookStatus
  chapters: number
  createdAt: Date
}

// Helpers di dominio (mock — sostituire con import reali)
const canPublish = (book: Book) =>
  book.status === 'draft' && book.chapters > 0

const formatBookTitle = (title: string) => title.trim().replace(/\s+/g, ' ')

describe('Book domain logic', () => {
  const sampleBook: Book = {
    id: 1,
    title: 'Il Viaggio',
    status: 'draft',
    chapters: 3,
    createdAt: new Date('2024-01-01'),
  }

  it('può pubblicare libro draft con capitoli', () => {
    expect(canPublish(sampleBook)).toBe(true)
  })

  it('non può pubblicare libro senza capitoli', () => {
    expect(canPublish({ ...sampleBook, chapters: 0 })).toBe(false)
  })

  it('non può pubblicare libro già pubblicato', () => {
    expect(canPublish({ ...sampleBook, status: 'published' })).toBe(false)
  })

  it('non può pubblicare libro archiviato', () => {
    expect(canPublish({ ...sampleBook, status: 'archived' })).toBe(false)
  })

  it('formatta titolo rimuovendo spazi extra', () => {
    expect(formatBookTitle('  Il   Viaggio  ')).toBe('Il Viaggio')
  })
})
