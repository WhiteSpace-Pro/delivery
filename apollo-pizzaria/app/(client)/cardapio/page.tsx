import { createClient } from "@/lib/supabase/server";
import MenuContent from "./MenuContent";

export default async function CardapioPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6';

  const supabase = createClient();

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (catError) console.error("Error fetching categories:", catError);
  if (prodError) console.error("Error fetching products:", prodError);

  return (
    <div className="container mx-auto px-4 py-12">
      <MenuContent
        categories={categories || []}
        products={products || []}
        tenantId={tenantId}
      />
    </div>
  );
}
