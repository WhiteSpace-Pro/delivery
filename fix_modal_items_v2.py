import sys

filepath = 'apollo-pizzaria/components/admin/OrderDetailModal.tsx'
with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '{details?.order_items?.map((item: any) => {' in line:
        new_lines.append(line)
        # Add definitions
        new_lines.append("                      const product = item.products || item['products!order_items_product_id_fkey'] || item.product;\n")
        new_lines.append("                      const halfProduct = item.half_product || item['half_product'] || item['half_product:products!order_items_half_product_id_fkey'];\n")
        new_lines.append("                      const edge = item.edge || item['edge'] || item['edge:pizza_options!order_items_edge_option_id_fkey'];\n")
        new_lines.append("\n")
        new_lines.append("                      const productName = product?.name || (item.product_id ? `Item #${item.product_id.slice(-4)}` : 'Item não identificado');\n")
        new_lines.append("                      const halfName = halfProduct?.name;\n")
        skip = True
        continue

    if skip:
        if 'return (' in line:
            new_lines.append(line)
            skip = False
        continue

    new_lines.append(line)

with open(filepath, 'w') as f:
    f.writelines(new_lines)
