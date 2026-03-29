// TENANT_ID gerado: 496c5a35-6843-4061-b3ab-159d15a0cbc6
// Copiar esse UUID para NEXT_PUBLIC_TENANT_ID_APOLLO no .env.local

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERRO: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('Iniciando SEED...');

  // 1. TENANT (upsert por slug)
  const tenantData: any = {
    name: 'Apollo Pizzaria',
    slug: 'apollo',
    plan: 'basic',
    is_active: true
  };

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .upsert(tenantData, { onConflict: 'slug' })
    .select()
    .single();

  if (tenantError) {
    console.error('Erro ao criar tenant:', tenantError);
    return;
  }

  const TENANT_ID = tenant.id;
  console.log('TENANT_ID:', TENANT_ID);

  // 2. CATEGORIAS (upsert por tenant_id + name)
  const categories = [
    { name: 'Pizzas', sort_order: 1, tenant_id: TENANT_ID, is_active: true },
    { name: 'Promoções', sort_order: 2, tenant_id: TENANT_ID, is_active: true },
    { name: 'Bebidas', sort_order: 3, tenant_id: TENANT_ID, is_active: true },
  ];

  const catMap: Record<string, string> = {};

  for (const cat of categories) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('name', cat.name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('categories')
        .update(cat)
        .eq('id', existing.id);

      if (error) console.error(`Erro ao atualizar categoria ${cat.name}:`, error);
      catMap[cat.name] = existing.id;
    } else {
      const { data, error } = await supabase
        .from('categories')
        .insert(cat)
        .select()
        .single();

      if (error) console.error(`Erro ao inserir categoria ${cat.name}:`, error);
      if (data) catMap[cat.name] = data.id;
    }
  }

  const CAT_PIZZAS = catMap['Pizzas'];
  const CAT_PROMOCOES = catMap['Promoções'];
  const CAT_BEBIDAS = catMap['Bebidas'];

  // 3. OPÇÕES DE PIZZA (edges)
  const edges = [
    { type: 'edge', name: 'Tradicional', extra_price: 0, sort_order: 1, tenant_id: TENANT_ID, is_available: true },
    { type: 'edge', name: 'Catupiry', extra_price: 12, sort_order: 2, tenant_id: TENANT_ID, is_available: true },
    { type: 'edge', name: 'Cheddar', extra_price: 12, sort_order: 3, tenant_id: TENANT_ID, is_available: true },
  ];

  for (const edge of edges) {
    const { data: existing } = await supabase
      .from('pizza_options')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('name', edge.name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('pizza_options')
        .update(edge)
        .eq('id', existing.id);
      if (error) console.error(`Erro ao atualizar opção ${edge.name}:`, error);
    } else {
      const { error } = await supabase
        .from('pizza_options')
        .insert(edge);
      if (error) console.error(`Erro ao inserir opção ${edge.name}:`, error);
    }
  }

  // 4. PIZZAS
  const pizzaNames = [
    { name: "Muçarela", tags: [] },
    { name: "Frango c/Catupiry", tags: ["frango"] },
    { name: "Moda da Casa", tags: [] },
    { name: "Frango c/Milho", tags: ["frango"] },
    { name: "Frango Especial", tags: ["frango"] },
    { name: "Strogonoff Frango", tags: ["frango"] },
    { name: "Strogonoff Carne", tags: [] },
    { name: "Pepperoni", tags: [] },
    { name: "Palmito", tags: ["vegetariana"] },
    { name: "Brócolis", tags: ["vegetariana"] },
    { name: "Alho e Óleo", tags: ["vegetariana"] },
    { name: "Vegetariana", tags: ["vegetariana"] },
    { name: "Nordestina", tags: [] },
    { name: "Portuguesa", tags: [] },
    { name: "Calabresa", tags: [] },
    { name: "Margherita", tags: ["vegetariana"] },
    { name: "4 Queijos", tags: [] },
    { name: "Bacon", tags: [] },
    { name: "Napolitana", tags: [] },
    { name: "Lombo c/Catupiry", tags: [] },
    { name: "Atum", tags: [] },
    { name: "Mexicana", tags: [] },
    { name: "Americana", tags: [] },
    { name: "Carne Seca", tags: [] },
    { name: "Frango Defumado", tags: ["frango"] },
    { name: "Tentação da Noite", tags: [] },
  ];

  for (const p of pizzaNames) {
    const slug = p.name.replace(/\s+/g, '');
    const data = {
      tenant_id: TENANT_ID,
      category_id: CAT_PIZZAS,
      name: p.name,
      type: 'pizza',
      allow_half: true,
      image_url: `https://placehold.co/400x300/1C1C1C/E85D24?text=${slug}`,
      price_m: 36,
      price_g: 48,
      price_gg: 58,
      tags: p.tags,
      is_available: true
    };

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('name', p.name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', existing.id);
      if (error) console.error(`Erro ao atualizar pizza ${p.name}:`, error);
    } else {
      const { error } = await supabase
        .from('products')
        .insert(data);
      if (error) console.error(`Erro ao inserir pizza ${p.name}:`, error);
    }
  }

  // 5. PROMOÇÕES
  const promos = [
    { name: "2 Pizzas Médias", price: 65 },
    { name: "2 Pizzas Grandes", price: 89 },
    { name: "2 Pizzas Gigantes", price: 108 },
    { name: "Pizza M + Refri 2L", price: 47 },
    { name: "Pizza G + Refri 2L", price: 59 },
    { name: "Pizza GG + Refri 2L", price: 69 },
    { name: "2 Pizzas M + Refri 2L", price: 75 },
    { name: "2 Pizzas G + Refri 2L", price: 99 },
  ];

  for (const promo of promos) {
    const data = {
      tenant_id: TENANT_ID,
      category_id: CAT_PROMOCOES,
      name: promo.name,
      price_single: promo.price,
      type: 'combo',
      image_url: "https://placehold.co/400x300/1C1C1C/D4941A?text=Combo",
      is_available: true
    };

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('name', promo.name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', existing.id);
      if (error) console.error(`Erro ao atualizar promoção ${promo.name}:`, error);
    } else {
      const { error } = await supabase
        .from('products')
        .insert(data);
      if (error) console.error(`Erro ao inserir promoção ${promo.name}:`, error);
    }
  }

  // 6. BEBIDAS
  const beverages = [
    { name: "Coca-Cola 2L", price: 12 },
    { name: "Coca-Cola Lata", price: 6 },
    { name: "Fanta Laranja 2L", price: 10 },
    { name: "Guaraná Antarctica 2L", price: 10 },
    { name: "Kuat 2L", price: 10 },
    { name: "Suco Del Valle 1L", price: 10 },
  ];

  for (const bev of beverages) {
    const data = {
      tenant_id: TENANT_ID,
      category_id: CAT_BEBIDAS,
      name: bev.name,
      price_single: bev.price,
      type: 'beverage',
      image_url: "https://placehold.co/400x300/1C1C1C/888480?text=Bebida",
      is_available: true
    };

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('name', bev.name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', existing.id);
      if (error) console.error(`Erro ao atualizar bebida ${bev.name}:`, error);
    } else {
      const { error } = await supabase
        .from('products')
        .insert(data);
      if (error) console.error(`Erro ao inserir bebida ${bev.name}:`, error);
    }
  }

  // 7. REGIÕES DE ENTREGA
  const regions = [
    { name: "Vera Cruz", fee: 2, estimated_time: 20 },
    { name: "Juliana", fee: 2, estimated_time: 20 },
    { name: "Tupi", fee: 2, estimated_time: 20 },
    { name: "Mantiqueira", fee: 2, estimated_time: 20 },
    { name: "Santa Mônica", fee: 3, estimated_time: 25 },
    { name: "Céu Azul", fee: 3, estimated_time: 25 },
    { name: "Floramar", fee: 3, estimated_time: 25 },
    { name: "Suzana", fee: 3, estimated_time: 25 },
    { name: "Ribeiro de Abreu", fee: 4, estimated_time: 30 },
    { name: "Aarão Reis", fee: 4, estimated_time: 30 },
    { name: "Conjunto Floramar", fee: 4, estimated_time: 30 },
    { name: "Primeiro de Maio", fee: 5, estimated_time: 30 },
    { name: "Ernesto do Nascimento", fee: 5, estimated_time: 30 },
    { name: "Concórdia", fee: 6, estimated_time: 35 },
    { name: "Cachoeirinha", fee: 6, estimated_time: 35 },
    { name: "Paulo VI", fee: 6, estimated_time: 35 },
    { name: "Serra Verde", fee: 7, estimated_time: 35 },
    { name: "Califórnia", fee: 7, estimated_time: 35 },
    { name: "Planalto", fee: 7, estimated_time: 35 },
    { name: "Caiçara", fee: 8, estimated_time: 40 },
    { name: "Braúnas", fee: 8, estimated_time: 40 },
    { name: "Conjunto Taquaril", fee: 8, estimated_time: 40 },
    { name: "São João Batista", fee: 9, estimated_time: 40 },
    { name: "Piratininga", fee: 9, estimated_time: 40 },
    { name: "Heliópolis", fee: 10, estimated_time: 45 },
    { name: "Sinimbu", fee: 10, estimated_time: 45 },
    { name: "Xangri-lá", fee: 10, estimated_time: 45 },
    { name: "Itatiaia", fee: 12, estimated_time: 50 },
    { name: "Jardim Leblon", fee: 12, estimated_time: 50 },
    { name: "Palmeiras", fee: 15, estimated_time: 60 },
  ];

  for (const region of regions) {
    const data = {
      tenant_id: TENANT_ID,
      name: region.name,
      fee: region.fee,
      estimated_time: region.estimated_time,
      is_active: true
    };

    const { data: existing } = await supabase
      .from('delivery_regions')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('name', region.name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('delivery_regions')
        .update(data)
        .eq('id', existing.id);
      if (error) console.error(`Erro ao atualizar região ${region.name}:`, error);
    } else {
      const { error } = await supabase
        .from('delivery_regions')
        .insert(data);
      if (error) console.error(`Erro ao inserir região ${region.name}:`, error);
    }
  }

  console.log('=== SEED CONCLUÍDO ===');
  console.log('TENANT_ID:', TENANT_ID);
  console.log('→ Copie esse UUID para NEXT_PUBLIC_TENANT_ID_APOLLO no .env.local');
  console.log('→ Atualize também o comentário no topo deste arquivo');
}

seed();
