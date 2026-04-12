import sys

filepath = 'apollo-pizzaria/components/admin/OrderDetailModal.tsx'
with open(filepath, 'r') as f:
    content = f.read()

search_text = """                    {details?.order_items?.map((item: any) => {
                      const product = item['products!order_items_product_id_fkey'] || item.products
                      const halfProduct = item['products!order_items_product_id_fkey'] || item.half_product
                      const edge = item['pizza_options!order_items_edge_option_id_fkey'] || item.edge

                      return ("""

replace_text = """                    {details?.order_items?.map((item: any) => {
                      const product = item['products!order_items_product_id_fkey'] || item.products || item.product;
                      const halfProduct = item.half_product || item['half_product'] || item['half_product:products!order_items_half_product_id_fkey'];
                      const edge = item.edge || item['edge'] || item['edge:pizza_options!order_items_edge_option_id_fkey'];

                      const productName = product?.name || (item.product_id ? `Item #${item.product_id.slice(-4)}` : 'Item não identificado');
                      const halfName = halfProduct?.name;

                      return ("""

content = content.replace(search_text, replace_text)

# Also update the rendering part
search_render = """                                <p className="font-bold">
                                  {item.is_half ? `${product?.name} / ${halfProduct?.name}` : product?.name}
                                </p>
                                <p className="text-[10px] text-[#666] font-bold uppercase">{item.size} {edge ? `• Borda ${edge.name}` : ''}</p>"""

replace_render = """                                <p className="font-bold">
                                  {item.is_half && halfName ? `${productName} / ${halfName}` : productName}
                                </p>
                                <p className="text-[10px] text-[#666] font-bold uppercase">{item.size || ''} {edge ? `• Borda ${edge.name}` : ''}</p>"""

content = content.replace(search_render, replace_render)

with open(filepath, 'w') as f:
    f.write(content)
