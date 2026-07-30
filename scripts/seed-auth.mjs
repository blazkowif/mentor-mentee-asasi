import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const total = 2 + 100 + 1200
  let ok = 0
  let fail = 0

  for (let i = 1; i <= 2; i++) {
    const { error } = await supabase.auth.admin.createUser({
      email: `admin${i}@ppst.ums.local`,
      password: '123',
      email_confirm: true,
    })
    if (error) { console.error('FAIL', `admin${i}`, error.message); fail++ }
    else { console.log('OK', `admin${i}@ppst.ums.local`); ok++ }
  }

  for (let i = 1; i <= 100; i++) {
    const { error } = await supabase.auth.admin.createUser({
      email: `lecturer${i}@ppst.ums.local`,
      password: '123',
      email_confirm: true,
    })
    if (error) { console.error('FAIL', `lecturer${i}`, error.message); fail++ }
    else { console.log('OK', `lecturer${i}@ppst.ums.local`); ok++ }
  }

  for (let i = 1; i <= 1200; i++) {
    const { error } = await supabase.auth.admin.createUser({
      email: `student${i}@ppst.ums.local`,
      password: '123',
      email_confirm: true,
    })
    if (error) { console.error('FAIL', `student${i}`, error.message); fail++ }
    else { ok++ }
  }

  console.log(`\nDone. Created ${ok}/${total} auth users. Failures: ${fail}`)
}

main()
