export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          full_name: string | null
          email: string | null
          phone: string | null
          role: 'customer' | 'admin' | 'kitchen' | 'delivery'
          created_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          role?: 'customer' | 'admin' | 'kitchen' | 'delivery'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          role?: 'customer' | 'admin' | 'kitchen' | 'delivery'
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          slug: string
          order: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          slug: string
          order?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          slug?: string
          order?: number
          active?: boolean
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_pizza: boolean
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_pizza?: boolean
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_pizza?: boolean
          active?: boolean
          created_at?: string
        }
      }
      pizza_options: {
        Row: {
          id: string
          tenant_id: string
          product_id: string | null
          name: string
          price: number
          type: string
          active: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          product_id?: string | null
          name: string
          price: number
          type: string
          active?: boolean
        }
        Update: {
          id?: string
          tenant_id?: string
          product_id?: string | null
          name?: string
          price?: number
          type?: string
          active?: boolean
        }
      }
      delivery_regions: {
        Row: {
          id: string
          tenant_id: string
          name: string
          fee: number
          active: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          fee: number
          active?: boolean
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          fee?: number
          active?: boolean
        }
      }
      addresses: {
        Row: {
          id: string
          profile_id: string
          tenant_id: string
          street: string
          number: string
          complement: string | null
          neighborhood: string
          city: string
          state: string
          zip_code: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          tenant_id: string
          street: string
          number: string
          complement?: string | null
          neighborhood: string
          city: string
          state: string
          zip_code: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          tenant_id?: string
          street?: string
          number?: string
          complement?: string | null
          neighborhood?: string
          city?: string
          state?: string
          zip_code?: string
          is_default?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          tenant_id: string
          customer_id: string
          address_id: string
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          total_amount: number
          delivery_fee: number
          payment_method: 'pix' | 'credit_card' | 'debit_card' | 'cash'
          payment_status: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          customer_id: string
          address_id: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          total_amount: number
          delivery_fee: number
          payment_method: 'pix' | 'credit_card' | 'debit_card' | 'cash'
          payment_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_id?: string
          address_id?: string
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          total_amount?: number
          delivery_fee?: number
          payment_method?: 'pix' | 'credit_card' | 'debit_card' | 'cash'
          payment_status?: string
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          size: 'M' | 'G' | 'GG' | null
          edge_option_id: string | null
          half_product_id: string | null
          observations: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          size?: 'M' | 'G' | 'GG' | null
          edge_option_id?: string | null
          half_product_id?: string | null
          observations?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          size?: 'M' | 'G' | 'GG' | null
          edge_option_id?: string | null
          half_product_id?: string | null
          observations?: string | null
        }
      }
      delivery_tracking: {
        Row: {
          id: string
          order_id: string
          status: string
          lat: number
          lng: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: string
          lat: number
          lng: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: string
          lat?: number
          lng?: number
          created_at?: string
        }
      }
      delivery_current_location: {
        Row: {
          id: string
          profile_id: string
          lat: number
          lng: number
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          lat: number
          lng: number
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          lat?: number
          lng?: number
          updated_at?: string
        }
      }
      delivery_checkins: {
        Row: {
          id: string
          profile_id: string
          tenant_id: string
          checked_in_at: string
          checked_out_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          tenant_id: string
          checked_in_at?: string
          checked_out_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          tenant_id?: string
          checked_in_at?: string
          checked_out_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          tenant_id: string
          profile_id: string
          title: string
          message: string
          read: boolean
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          profile_id: string
          title: string
          message: string
          read?: boolean
          type: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          profile_id?: string
          title?: string
          message?: string
          read?: boolean
          type?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'customer' | 'admin' | 'kitchen' | 'delivery'
      order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
      payment_method: 'pix' | 'credit_card' | 'debit_card' | 'cash'
      pizza_size: 'M' | 'G' | 'GG'
    }
  }
}
