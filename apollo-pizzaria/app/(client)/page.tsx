import { createClient } from "@/lib/supabase/server";
import ClientPageContent from "./ClientPageContent";

export default async function HomePage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6';

  if (!process.env.NEXT_PUBLIC_TENANT_ID_APOLLO) {
    console.warn("NEXT_PUBLIC_TENANT_ID_APOLLO is not defined in environment variables. Using fallback tenant ID.");
  }

  const supabase = createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4 container mx-auto text-center">
        <h1 className="text-[36px] md:text-[56px] font-playfair font-bold text-[#F5F0E8] leading-tight mb-2">
          Apollo Pizzaria
        </h1>
        <p className="font-dm text-[#8A8480] text-lg mb-8">
          Vera Cruz, Belo Horizonte
        </p>

        <div className="inline-flex flex-wrap justify-center items-center gap-4 md:gap-8 py-4 px-6 md:px-10 rounded-full bg-white/5 border border-white/10 text-xs md:text-sm font-medium text-[#F5F0E8]/80">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D24]" />
            Ter–Dom 17h40–23h59
          </div>
          <div className="hidden md:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D24]" />
            Entrega 35–60min
          </div>
          <div className="hidden md:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D24]" />
            A partir R$2
          </div>
        </div>
      </section>

      {/* Main Menu Content */}
      <ClientPageContent initialProducts={products || []} tenantId={tenantId} />
    </div>
  );
}
