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
  display_id?: string | null;
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
  comboPizzas?: {
    firstFlavorId: string;
    isHalf: boolean;
    secondFlavorId: string | null;
  }[];
}

export type TrackingPoint = Database['public']['Tables']['delivery_current_location']['Row'];

export interface DeliveryWithOrder extends Profile {
  orders: Order[];
}

export interface Driver {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  role: string;
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
    lat: number | null;
    lng: number | null;
    updated_at?: string | null;
  } | null;
}
