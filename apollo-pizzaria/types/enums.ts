export const USER_ROLES = ['customer', 'admin', 'kitchen', 'delivery'] as const;
export type UserRole = typeof USER_ROLES[number];

export const ORDER_STATUS = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
] as const;
export type OrderStatus = typeof ORDER_STATUS[number];

export const PAYMENT_METHODS = ['pix', 'credit_card', 'debit_card', 'cash'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const PIZZA_SIZES = ['M', 'G', 'GG'] as const;
export type PizzaSize = typeof PIZZA_SIZES[number];
