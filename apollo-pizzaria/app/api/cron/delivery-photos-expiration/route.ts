export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: expiredCheckins, error: fetchError } = await supabaseAdmin
      .from('delivery_checkins')
      .select('id, storage_bucket, storage_path')
      .not('storage_path', 'is', null)
      .not('storage_bucket', 'is', null)
      .lt('expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired checkins:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch expired checkins' }, { status: 500 })
    }

    if (!expiredCheckins || expiredCheckins.length === 0) {
      return NextResponse.json({ message: 'No expired checkins found' }, { status: 200 })
    }

    let successCount = 0
    const errors: string[] = []

    for (const checkin of expiredCheckins) {
      if (!checkin.storage_bucket || !checkin.storage_path) continue

      // Remove from storage
      const { error: removeError } = await supabaseAdmin.storage
        .from(checkin.storage_bucket)
        .remove([checkin.storage_path])

      if (removeError) {
        errors.push(`Failed to remove file ${checkin.storage_path} for checkin ${checkin.id}: ${removeError.message}`)
        continue
      }

      // Update db record
      const { error: updateError } = await supabaseAdmin
        .from('delivery_checkins')
        .update({
          storage_bucket: null,
          storage_path: null,
        } as any)
        .eq('id', checkin.id)

      if (updateError) {
        errors.push(`Failed to update DB for checkin ${checkin.id}: ${updateError.message}`)
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      message: `Expiration job completed.`,
      processed: expiredCheckins.length,
      success: successCount,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 200 })

  } catch (error: any) {
    console.error('Unexpected error in expiration job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
