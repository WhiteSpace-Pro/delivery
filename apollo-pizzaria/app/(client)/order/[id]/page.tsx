"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// import { useUser } from "@/hooks/useUser";
// Note: initial order fetch uses /api/orders/[id] (supabaseAdmin) to bypass RLS for anonymous users
import { uploadReceipt } from "@/lib/upload";
import {
  CheckCircle2,
  Copy,
  Upload,
  ArrowLeft,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CreditCard,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  payment_method: "pix" | "credit_card" | "debit_card" | "cash";
  created_at: string;
  receipt_url: string | null;
  change_for: number | null;
  tenant_id: string;
}

const FALLBACK_PIX_KEY = "31985375524";
const FALLBACK_PIX_TYPE = "telefone";

const supabase = createClient();

export default function OrderPage() {
  const { id } = useParams();
  const router = useRouter();
  // const { tenantId } = useUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pixKey = process.env.NEXT_PUBLIC_PIX_KEY || FALLBACK_PIX_KEY;
  const pixType = process.env.NEXT_PUBLIC_PIX_KEY_TYPE || FALLBACK_PIX_TYPE;

  useEffect(() => {
    async function fetchOrder() {
      if (!id) return;

      const res = await fetch(`/api/orders/${id as string}`);

      if (!res.ok) {
        console.error("[Apollo/order] Order not found:", res.status);
        router.push("/cardapio");
        return;
      }

      const data: Order = await res.json();
      setOrder(data);
      setUploadSuccess(!!data.receipt_url);
      setLoading(false);
    }

    fetchOrder();

    // Subscribe to order changes
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id as string}`
      }, (payload) => {
        setOrder(payload.new as unknown as Order);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, router]);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !order) return;

    setUploading(true);
    setUploadError(null);

    const result = await uploadReceipt(order.id, file, order.tenant_id);

    if (result.success) {
      setUploadSuccess(true);
      setOrder(prev => prev ? { ...prev, receipt_url: result.path! } : null);
    } else {
      setUploadError(result.error || "Erro ao enviar.");
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <Loader2 className="w-10 h-10 text-[#E85D24] animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F0E8] py-8 px-4 font-dm-sans">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* SECTION 1: Confirmation */}
        <section className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-green-500 w-12 h-12" />
          </div>
          <h1 className="text-4xl font-playfair font-bold">Pedido recebido!</h1>
          <div className="space-y-1">
            <p className="text-[#8A8480]">
              Seu pedido <span className="font-mono text-[#F5F0E8]">#{order.id.substring(0, 8)}</span> foi registrado.
            </p>
            <p className="text-xl font-bold text-[#E85D24]">
              Total: R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-[#8A8480]">Tempo estimado: 40–60 min</p>
          </div>
        </section>

        {/* SECTION 2 & 3: Pix Payment and Receipt Upload */}
        {order.payment_method === 'pix' && (
          <div className="space-y-6">
            {/* Card for Pix */}
            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="p-2 bg-[#E85D24]/10 rounded-xl">
                  <CreditCard className="text-[#E85D24]" size={24} />
                </div>
                <h2 className="text-xl font-bold font-playfair">Pagamento via Pix</h2>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-[#8A8480]">Copie a chave abaixo e realize o pagamento:</p>

                <div className="flex items-center gap-2 p-4 bg-[#0D0D0D] rounded-2xl border border-white/10 group hover:border-[#E85D24]/50 transition-colors">
                  <span className="flex-1 font-mono text-lg font-bold tracking-wider">{pixKey}</span>
                  <button
                    onClick={handleCopyPix}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all",
                      copied ? "bg-green-500 text-white" : "bg-[#E85D24] text-white hover:bg-[#D15420]"
                    )}
                  >
                    {copied ? (
                      <><CheckCircle2 size={16} /> Copiado ✓</>
                    ) : (
                      <><Copy size={16} /> Copiar</>
                    )}
                  </button>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8480]">Tipo da chave: <span className="text-[#F5F0E8] capitalize">{pixType}</span></span>
                  <span className="font-bold text-[#E85D24]">R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: Receipt Upload */}
            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 space-y-6">
              <h2 className="text-xl font-bold font-playfair flex items-center gap-3">
                <FileText className="text-[#E85D24]" size={24} />
                Envie o comprovante
              </h2>

              {!uploadSuccess ? (
                <div className="space-y-4">
                  <p className="text-sm text-[#8A8480]">
                    Após realizar o pagamento, envie o comprovante para agilizar a confirmação do seu pedido.
                  </p>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all",
                      file ? "border-[#E85D24] bg-[#E85D24]/5" : "border-white/10 hover:border-white/20 bg-[#0D0D0D]"
                    )}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                    />

                    {file ? (
                      <div className="space-y-4">
                        {preview ? (
                          <img src={preview} alt="Preview" className="w-32 h-32 object-cover mx-auto rounded-xl border border-white/10" />
                        ) : (
                          <FileText className="w-16 h-16 text-[#8A8480] mx-auto" />
                        )}
                        <div>
                          <p className="font-bold text-sm truncate max-w-[200px] mx-auto">{file.name}</p>
                          <p className="text-xs text-[#8A8480]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                          className="text-xs text-red-500 hover:underline flex items-center gap-1 mx-auto"
                        >
                          <X size={12} /> Remover
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-10 h-10 text-[#8A8480] mx-auto" />
                        <p className="font-bold">Toque para selecionar ou arraste aqui</p>
                        <p className="text-xs text-[#8A8480]">JPG, PNG, WEBP ou PDF (Máx 10MB)</p>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-xl">
                      <AlertCircle size={16} />
                      {uploadError}
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className={cn(
                      "w-full h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                      !file || uploading
                        ? "bg-white/5 text-[#8A8480] cursor-not-allowed"
                        : "bg-[#E85D24] text-white hover:bg-[#D15420] shadow-lg shadow-[#E85D24]/10"
                    )}
                  >
                    {uploading ? (
                      <><Loader2 className="animate-spin" size={20} /> Enviando...</>
                    ) : (
                      "Enviar comprovante"
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4 animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="text-green-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Comprovante enviado com sucesso!</h3>
                    <p className="text-sm text-[#8A8480]">Você pode enviar outro se necessário.</p>
                  </div>
                  <button
                    onClick={() => { setUploadSuccess(false); setFile(null); setPreview(null); }}
                    className="px-6 py-2 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/5 transition-colors"
                  >
                    Enviar outro comprovante
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 4: Other Payment Methods */}
        {order.payment_method !== 'pix' && (
          <section className="bg-[#141414] border border-white/5 rounded-3xl p-8 text-center space-y-4">
            <div className="p-4 bg-[#E85D24]/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              {order.payment_method === 'cash' ? (
                <DollarSign className="text-[#E85D24]" size={32} />
              ) : (
                <CreditCard className="text-[#E85D24]" size={32} />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Pagamento na entrega</h2>
              <p className="text-[#8A8480]">
                {order.payment_method === 'cash' ? '💵 Dinheiro' : '💳 Cartão de Débito/Crédito'}
              </p>
              {order.payment_method === 'cash' && order.change_for && (
                <p className="text-[#D4941A] font-bold">
                  Troco para R$ {order.change_for.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </section>
        )}

        {/* SECTION 5: Footer */}
        <footer className="text-center pt-8 border-t border-white/5">
          <Link href="/cardapio" className="flex items-center gap-2 justify-center text-[#8A8480] hover:text-[#E85D24] transition-colors">
            <ArrowLeft size={18} />
            <span className="font-bold">Voltar ao cardápio</span>
          </Link>
        </footer>

      </div>
    </div>
  );
}
