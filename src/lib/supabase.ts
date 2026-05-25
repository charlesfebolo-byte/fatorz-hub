import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ezfpxvezwpjtokbzsidu.supabase.co'

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZnB4dmV6d3BqdG9rYnpzaWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NTA0MTQsImV4cCI6MjA5NTIyNjQxNH0.Q-IxcY36aSR9XUe43DCRxrkQyJKuL3YJmduvIDFTDZ0'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)