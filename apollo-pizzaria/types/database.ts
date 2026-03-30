export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string | null
          delivery_fee: number | null
          delivery_region_id: string | null
          id: string
          is_primary: boolean | null
          label: string | null
          lat: number | null
          lng: number | null
          neighborhood: string
          number: string
          state: string | null
          street: string
          tenant_id: string | null
          user_id: string | null
          zipcode: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_region_id?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          neighborhood: string
          number: string
          state?: string | null
          street: string
          tenant_id?: string | null
          user_id?: string | null
          zipcode?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_region_id?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          neighborhood?: string
          number?: string
          state?: string | null
          street?: string
          tenant_id?: string | null
          user_id?: string | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_delivery_region_id_fkey"
            columns: ["delivery_region_id"]
            isOneToOne: false
            referencedRelation: "delivery_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_checkins: {
        Row: {
          accuracy: number | null
          created_at: string | null
          delivery_id: string | null
          distance_from_target: number | null
          id: string
          lat: number | null
          lng: number | null
          order_id: string | null
          photo_url: string | null
          problem_notes: string | null
          problem_reason: Database["public"]["Enums"]["problem_reason"] | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["checkin_type"]
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          delivery_id?: string | null
          distance_from_target?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          order_id?: string | null
          photo_url?: string | null
          problem_notes?: string | null
          problem_reason?: Database["public"]["Enums"]["problem_reason"] | null
          tenant_id?: string | null
          type: Database["public"]["Enums"]["checkin_type"]
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          delivery_id?: string | null
          distance_from_target?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          order_id?: string | null
          photo_url?: string | null
          problem_notes?: string | null
          problem_reason?: Database["public"]["Enums"]["problem_reason"] | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["checkin_type"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_checkins_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checkins_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_current_location: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          delivery_id: string | null
          heading: number | null
          lat: number | null
          lng: number | null
          order_id: string
          speed: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          delivery_id?: string | null
          heading?: number | null
          lat?: number | null
          lng?: number | null
          order_id: string
          speed?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          delivery_id?: string | null
          heading?: number | null
          lat?: number | null
          lng?: number | null
          order_id: string
          speed?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_current_location_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_current_location_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_regions: {
        Row: {
          boundary: Json | null
          estimated_time: number
          fee: number
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          boundary?: Json | null
          estimated_time: number
          fee: number
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          boundary?: Json | null
          estimated_time?: number
          fee?: number
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_regions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          accuracy: number | null
          altitude: number | null
          battery_level: number | null
          delivery_id: string | null
          heading: number | null
          id: string
          is_charging: boolean | null
          lat: number
          lng: number
          order_id: string
          speed: number | null
          tenant_id: string | null
          timestamp: string | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          delivery_id?: string | null
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          lat: number
          lng: number
          order_id: string
          speed?: number | null
          tenant_id?: string | null
          timestamp?: string | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          delivery_id?: string | null
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          lat?: number
          lng?: number
          order_id?: string
          speed?: number | null
          tenant_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          sent_via_push: boolean | null
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          sent_via_push?: boolean | null
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          sent_via_push?: boolean | null
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          edge_option_id: string | null
          half_product_id: string | null
          id: string
          is_half: boolean | null
          observations: string | null
          order_id: string | null
          product_id: string | null
          quantity: number
          size: Database["public"]["Enums"]["pizza_size"] | null
          tenant_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          edge_option_id?: string | null
          half_product_id?: string | null
          id?: string
          is_half?: boolean | null
          observations?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          size?: Database["public"]["Enums"]["pizza_size"] | null
          tenant_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          edge_option_id?: string | null
          half_product_id?: string | null
          id?: string
          is_half?: boolean | null
          observations?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          size?: Database["public"]["Enums"]["pizza_size"] | null
          tenant_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_edge_option_id_fkey"
            columns: ["edge_option_id"]
            isOneToOne: false
            referencedRelation: "pizza_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_half_product_id_fkey"
            columns: ["half_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_delivery_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          change_for: number | null
          confirmed_at: string | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          delivery_address_id: string | null
          delivery_fee: number
          delivery_instructions: string | null
          delivery_type: string
          discount: number | null
          dispatched_at: string | null
          estimated_delivery_at: string | null
          estimated_ready_at: string | null
          id: string
          order_number: number
          payment_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          rating: number | null
          rating_comment: string | null
          ready_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tenant_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          assigned_delivery_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          change_for?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_instructions?: string | null
          delivery_type: string
          discount?: number | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          estimated_ready_at?: string | null
          id?: string
          order_number?: number
          payment_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          rating?: number | null
          rating_comment?: string | null
          ready_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tenant_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          assigned_delivery_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          change_for?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_instructions?: string | null
          delivery_type?: string
          discount?: number | null
          dispatched_at?: string | null
          estimated_delivery_at?: string | null
          estimated_ready_at?: string | null
          id?: string
          order_number?: number
          payment_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          rating?: number | null
          rating_comment?: string | null
          ready_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_delivery_id_fkey"
            columns: ["assigned_delivery_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_options: {
        Row: {
          extra_price: number | null
          id: string
          is_available: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string | null
          type: string
        }
        Insert: {
          extra_price?: number | null
          id?: string
          is_available?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id?: string | null
          type: string
        }
        Update: {
          extra_price?: number | null
          id?: string
          is_available?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_half: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price_g: number | null
          price_gg: number | null
          price_m: number | null
          price_single: number | null
          sort_order: number | null
          tags: string[] | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string | null
        }
        Insert: {
          allow_half?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price_g?: number | null
          price_gg?: number | null
          price_m?: number | null
          price_single?: number | null
          sort_order?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Update: {
          allow_half?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price_g?: number | null
          price_gg?: number | null
          price_m?: number | null
          price_single?: number | null
          sort_order?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          fcm_token: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          fcm_token?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          fcm_token?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          name: string
          plan: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          plan?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          plan?: string | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_tracking: { Args: never; Returns: undefined }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      checkin_type:
        | "pickup"
        | "delivery_attempt"
        | "delivery_success"
        | "problem"
      notification_type:
        | "order_status"
        | "delivery_approaching"
        | "promotion"
        | "system"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method: "pix" | "credit_card" | "debit_card" | "cash"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      pizza_size: "M" | "G" | "GG"
      problem_reason:
        | "customer_absent"
        | "wrong_address"
        | "refused"
        | "accident"
        | "other"
      product_type: "pizza" | "beverage" | "combo" | "extra"
      user_role: "customer" | "admin" | "kitchen" | "delivery"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      checkin_type: [
        "pickup",
        "delivery_attempt",
        "delivery_success",
        "problem",
      ],
      notification_type: [
        "order_status",
        "delivery_approaching",
        "promotion",
        "system",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: ["pix", "credit_card", "debit_card", "cash"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      pizza_size: ["M", "G", "GG"],
      problem_reason: [
        "customer_absent",
        "wrong_address",
        "refused",
        "accident",
        "other",
      ],
      product_type: ["pizza", "beverage", "combo", "extra"],
      user_role: ["customer", "admin", "kitchen", "delivery"],
    },
  },
} as const
