import { Database } from './database';
import { PizzaSize } from './enums';

export type { Database };
export type Product = Database['public']['Tables']['products']['Row'];
export type PizzaOption = Database['public']['Tables']['pizza_options']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

export interface OrderItemWithProduct extends OrderItem {
  products: {
    name: string;
    type: Database['public']['Enums']['product_type'];
  } | null;
  half_product?: { name: string } | null;
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithProduct[];
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

export interface Driver {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Database['public']['Enums']['user_role'];
  email: string;
  is_active: boolean | null;
  vehicle_type: string | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  ordersToday: number;
  inProgressCount: number;
  previousShiftCount: number;
  location: {
    delivery_id: string;
    lat: number;
    lng: number;
    updated_at: string;
  } | null;
}
