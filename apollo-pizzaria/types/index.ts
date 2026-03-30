import { Database } from './database';
import { PizzaSize } from './enums';

export type Product = Database['public']['Tables']['products']['Row'] & {
  type?: 'pizza' | 'beverage' | 'combo';
  allow_half?: boolean;
  price_m?: number | null;
  price_g?: number | null;
  price_gg?: number | null;
  price_single?: number | null;
  tags?: string[] | null;
  is_available?: boolean;
  sort_order?: number;
};

export type PizzaOption = Database['public']['Tables']['pizza_options']['Row'] & {
  extra_price: number;
  is_available?: boolean;
  sort_order?: number;
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  profiles: Profile;
}

export interface CartItem {
  id: string;
  product: Product;
  size: PizzaSize | null;
  edgeOption: PizzaOption | null;
  isHalf: boolean;
  halfProduct: Product | null;
  quantity: number;
  unitPrice: number;
  observations: string;
}

export type TrackingPoint = Database['public']['Tables']['delivery_current_location']['Row'];

export interface DeliveryWithOrder extends Profile {
  orders: Order[];
}
