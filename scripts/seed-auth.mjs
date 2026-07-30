import { createClient } from '@supabase/supabase-js'

const url = 'https://tfucaggnigrgkvyxofea.supabase.co'
const key = 'sb_publishable_CN2Rev19N3DJ_Pp9UKvxLQ_hi3WzNWj'
const supabase = createClient(url, key)

async function main() {
  const total = 2 + 100 + 1200
  let ok = 0
  let fail = 0

  for (let i = 1; i <= 2; i++) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: `admin${i}@ppst.ums.local`,
      password: '123',
      email_confirm: true,
    })
    if (error) { console.error('FAIL', `admin${i}`, error.message); fail++ }
    else { console.log('OK', `admin${i}@ppst.ums.local`); ok++ }
  }

  for (let i = 1; i <= 100; i++) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: `lecturer${i}@ppst.ums.local`,
      password: '123',
      email_confirm: true,
    })
    if (error) { console.error('FAIL', `lecturer${i}`, error.message); fail++ }
    else { console.log('OK', `lecturer${i}@ppst.ums.local`); ok++ }
  }

  for (let i = 1; i <= 1200; i++) {
    const { data, error } = await supabase.auth.admin.createUser({
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
