/**
 * Seed script: loads all registered emails from Supabase into the Upstash Bloom filter.
 * Run once after setup or to rebuild the filter:
 *   pnpm tsx scripts/seed-bloom-emails.ts
 */
import 'dotenv/config'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { ensureBloomFilter, addEmailsBulkToBloom } from '@/lib/bloom'

const BATCH_SIZE = 500

async function main() {
  console.log('🌱 Seeding Bloom filter for emails...')

  await ensureBloomFilter()
  console.log('✅ Bloom filter key ready')

  let offset = 0
  let totalSeeded = 0

  while (true) {
    const rows = await db
      .select({ email: users.email })
      .from(users)
      .limit(BATCH_SIZE)
      .offset(offset)

    if (rows.length === 0) break

    const emails = rows.map((r) => r.email).filter(Boolean) as string[]
    await addEmailsBulkToBloom(emails)

    totalSeeded += emails.length
    offset += BATCH_SIZE
    console.log(`  → Seeded batch: ${totalSeeded} emails so far...`)
  }

  console.log(`\n🎉 Done! Total emails seeded into Bloom filter: ${totalSeeded}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
