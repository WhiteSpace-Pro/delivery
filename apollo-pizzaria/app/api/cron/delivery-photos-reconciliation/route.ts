export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const BUCKET = 'delivery-photos'

async function listAllFilesRecursively(path: string = ''): Promise<string[]> {
  const files: string[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(path, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      console.error(`Error listing files in ${path}:`, error)
      break
    }

    if (!data || data.length === 0) {
      break
    }

    for (const item of data) {
      // .emptyFolderPlaceholder is sometimes used in Supabase
      if (item.name === '.emptyFolderPlaceholder') continue

      const itemPath = path ? `${path}/${item.name}` : item.name

      // Check if it's a folder (usually doesn't have metadata/id if it's a folder or we can check via trailing slash or lack of extension)
      // Supabase storage list returns folders as well. A simple check is if it has no id or metadata.
      if (!item.id) {
        // It's a folder, recurse
        const subFiles = await listAllFilesRecursively(itemPath)
        files.push(...subFiles)
      } else {
        files.push(itemPath)
      }
    }

    // If we received fewer items than the limit, we're done
    if (data.length < limit) {
      break
    }

    offset += limit
  }

  return files
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = {
      orphanedFilesDeleted: 0,
      missingFilesCleared: 0,
      errors: [] as string[]
    }

    // 1. Fetch all expected paths from DB
    const { data: checkins, error: dbError } = await supabaseAdmin
      .from('delivery_checkins')
      .select('id, storage_path')
      .not('storage_path', 'is', null)
      .eq('storage_bucket', BUCKET)

    if (dbError) {
      console.error('Error fetching checkins:', dbError)
      return NextResponse.json({ error: 'Failed to fetch checkins' }, { status: 500 })
    }

    const expectedPathsMap = new Map<string, string>()
    checkins?.forEach(c => {
      if (c.storage_path) expectedPathsMap.set(c.storage_path, c.id)
    })

    // 2. Fetch all actual files from Storage
    const allFiles = await listAllFilesRecursively()
    const actualFilesSet = new Set(allFiles)

    // Caso A: Arquivo no bucket sem registro correspondente em delivery_checkins
    for (const actualPath of allFiles) {
      if (!expectedPathsMap.has(actualPath)) {
        // Delete orphaned file
        const { error } = await supabaseAdmin.storage.from(BUCKET).remove([actualPath])
        if (error) {
          report.errors.push(`Failed to delete orphaned file ${actualPath}: ${error.message}`)
        } else {
          report.orphanedFilesDeleted++
        }
      }
    }

    // Caso B: Registro com storage_path não nulo mas arquivo inexistente no bucket
    for (const [expectedPath, checkinId] of Array.from(expectedPathsMap.entries())) {
      if (!actualFilesSet.has(expectedPath)) {
        // Clear storage_path and storage_bucket
        const { error } = await supabaseAdmin
          .from('delivery_checkins')
          .update({
            storage_path: null,
            storage_bucket: null,
          } as any)
          .eq('id', checkinId)

        if (error) {
          report.errors.push(`Failed to clear storage path for checkin ${checkinId}: ${error.message}`)
        } else {
          console.error(`Reconciliation: File missing for checkin ${checkinId}, path: ${expectedPath}`)
          report.missingFilesCleared++
        }
      }
    }

    return NextResponse.json({
      message: 'Reconciliation completed',
      report
    }, { status: 200 })

  } catch (error: any) {
    console.error('Unexpected error in reconciliation job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
