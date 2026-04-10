import { CartProvider } from "@/contexts/CartContext";
import { Header } from "@/components/client/Header";
import { createClient } from "@/lib/supabase/server";

async function StoreStatusBanner() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6';
  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('is_active')
    .eq('id', tenantId)
    .single();

  if ((tenant as any)?.is_active === false) {
    return (
      <div className="bg-apollo-orange text-white text-center py-2 text-sm font-bold font-dm">
        Estamos fechados no momento. Sinta-se à vontade para navegar em nosso cardápio.
      </div>
    );
  }

  return null;
}

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = "";

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile?.full_name) {
      userName = profile.full_name.split(' ')[0];
    } else if (user.email) {
      userName = user.email.split('@')[0];
    }
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F0E8] font-dm">
        <StoreStatusBanner />
        <Header userName={userName} />
        <main>
          {children}
        </main>
      </div>
    </CartProvider>
  );
}
