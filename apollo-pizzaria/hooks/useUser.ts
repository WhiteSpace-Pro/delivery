'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

const supabase = createClient()

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setIsLoading(false)
          return
        }

        setUser(user)

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setProfile(profile)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUserData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        setProfile(null)
        setIsLoading(false)
        return
      }
      getUserData()
    })

    return () => subscription.unsubscribe()
  }, [])

  const role = profile?.role || null
  const tenantId = profile?.tenant_id || null
  const isAdmin = role === 'admin' || role === 'kitchen'
  const isDelivery = role === 'delivery'

  return {
    user,
    profile,
    role,
    tenantId,
    isLoading,
    isAdmin,
    isDelivery,
  }
}
