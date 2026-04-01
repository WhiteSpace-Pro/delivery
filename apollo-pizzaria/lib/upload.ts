import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Sanitizes a filename by removing special characters and replacing spaces with underscores.
 */
function sanitizeFilename(filename: string): string {
  const extension = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));

  const sanitized = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9]/g, '_')   // Replace special chars with underscore
    .replace(/_+/g, '_');            // Collapse multiple underscores

  return `${sanitized}.${extension}`;
}

export async function uploadReceipt(orderId: string, file: File, tenantId: string) {
  try {
    // 1. Validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("O arquivo é muito grande. O limite é 10MB.");
    }

    const supabase = createClient();
    const timestamp = Date.now();
    const fileName = sanitizeFilename(file.name);
    const path = `receipts/${orderId}/${timestamp}_${fileName}`;

    // 2. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, file, {
        upsert: false
      });

    if (uploadError) {
      console.error("[Apollo/upload] Storage error:", uploadError);
      throw new Error("Erro ao fazer upload do arquivo para o servidor.");
    }

    // 3. Update orders table
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { error: updateError } = await supabase
      .from('orders')
      .update({ receipt_url: uploadData.path } as any)
      .eq('id', orderId);

    if (updateError) {
      console.error("[Apollo/upload] Database update error:", updateError);
      throw new Error("Erro ao vincular o comprovante ao pedido.");
    }

    // 4. Send notification (Fire and forget-ish)
    try {
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          tenant_id: tenantId,
          type: 'receipt_uploaded',
          order_id: orderId,
          message: `Comprovante Pix enviado para o pedido #${orderId.substring(0, 8)}`,
          read: false
        } as any);

      if (notifyError) {
        console.warn("[Apollo/notify] Failed to insert notification:", notifyError);
      }
    } catch (nErr) {
      console.warn("[Apollo/notify] Unexpected error inserting notification:", nErr);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, path: uploadData.path };
  } catch (error) {
    console.error("[Apollo/upload] Upload failed:", error);
    const message = (error instanceof Error) ? error.message : "Erro desconhecido ao processar o upload.";
    return {
      success: false,
      error: message
    };
  }
}
