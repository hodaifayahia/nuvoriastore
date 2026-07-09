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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_orders: {
        Row: {
          abandoned_at: string
          cart_items: Json
          cart_total: number
          created_at: string
          customer_name: string
          customer_phone: string
          customer_wilaya: string | null
          id: string
          item_count: number
          notes: string | null
          recovered_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          abandoned_at?: string
          cart_items?: Json
          cart_total?: number
          created_at?: string
          customer_name: string
          customer_phone: string
          customer_wilaya?: string | null
          id?: string
          item_count?: number
          notes?: string | null
          recovered_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          abandoned_at?: string
          cart_items?: Json
          cart_total?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string
          customer_wilaya?: string | null
          id?: string
          item_count?: number
          notes?: string | null
          recovered_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_orders_recovered_order_id_fkey"
            columns: ["recovered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      baladiyat: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          wilaya_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          wilaya_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          wilaya_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baladiyat_wilaya_id_fkey"
            columns: ["wilaya_id"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          transaction_type: string
          unit_price: number
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          transaction_type?: string
          unit_price?: number
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          transaction_type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      confirmation_settings: {
        Row: {
          assignment_mode: string
          auto_timeout_minutes: number
          created_at: string
          enable_confirm_chat: boolean
          id: string
          max_call_attempts: number
          updated_at: string
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          assignment_mode?: string
          auto_timeout_minutes?: number
          created_at?: string
          enable_confirm_chat?: boolean
          id?: string
          max_call_attempts?: number
          updated_at?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          assignment_mode?: string
          auto_timeout_minutes?: number
          created_at?: string
          enable_confirm_chat?: boolean
          id?: string
          max_call_attempts?: number
          updated_at?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
      confirmers: {
        Row: {
          cancellation_price: number | null
          confirmation_price: number | null
          created_at: string | null
          email: string | null
          id: string
          monthly_salary: number | null
          name: string
          notes: string | null
          payment_mode: string
          phone: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancellation_price?: number | null
          confirmation_price?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_salary?: number | null
          name: string
          notes?: string | null
          payment_mode?: string
          phone: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancellation_price?: number | null
          confirmation_price?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_salary?: number | null
          name?: string
          notes?: string | null
          payment_mode?: string
          phone?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_products: {
        Row: {
          coupon_id: string
          id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          discount_type: string
          discount_value: number
          expiry_date: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          code: string
          discount_type: string
          discount_value: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          code?: string
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      delivery_companies: {
        Row: {
          api_url: string | null
          created_at: string
          id: string
          is_active: boolean
          is_builtin: boolean
          logo_url: string | null
          name: string
        }
        Insert: {
          api_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          logo_url?: string | null
          name: string
        }
        Update: {
          api_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      delivery_company_credentials: {
        Row: {
          api_key: string | null
          api_secret: string | null
          delivery_company_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          delivery_company_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          delivery_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_company_credentials_delivery_company_id_fkey"
            columns: ["delivery_company_id"]
            isOneToOne: true
            referencedRelation: "delivery_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_pixels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          pixel_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pixel_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pixel_id?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          content: Json
          created_at: string
          generated_images: string[] | null
          id: string
          language: string
          product_id: string
          selected_image: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          generated_images?: string[] | null
          id?: string
          language?: string
          product_id: string
          selected_image?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          generated_images?: string[] | null
          id?: string
          language?: string
          product_id?: string
          selected_image?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      launchpage_orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string
          id: string
          page_id: string | null
          phone: string
          price: string | null
          product_name: string | null
          quantity: number
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name: string
          id?: string
          page_id?: string | null
          phone: string
          price?: string | null
          product_name?: string | null
          quantity?: number
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          page_id?: string | null
          phone?: string
          price?: string | null
          product_name?: string | null
          quantity?: number
          wilaya?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launchpage_orders_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "launchpage_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      launchpage_pages: {
        Row: {
          content_json: Json
          created_at: string
          id: string
          image_urls: Json
          product_description: string | null
          product_name: string
          target_audience: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          id?: string
          image_urls?: Json
          product_description?: string | null
          product_name: string
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          id?: string
          image_urls?: Json
          product_description?: string | null
          product_name?: string
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
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
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          baladiya: string | null
          coupon_code: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string
          delivery_type: string | null
          discount_amount: number | null
          id: string
          landing_page_id: string | null
          order_number: string
          payment_method: string | null
          payment_receipt_url: string | null
          shipping_cost: number | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          user_id: string | null
          wilaya_id: string | null
        }
        Insert: {
          address?: string | null
          baladiya?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone: string
          delivery_type?: string | null
          discount_amount?: number | null
          id?: string
          landing_page_id?: string | null
          order_number: string
          payment_method?: string | null
          payment_receipt_url?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          user_id?: string | null
          wilaya_id?: string | null
        }
        Update: {
          address?: string | null
          baladiya?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_type?: string | null
          discount_amount?: number | null
          id?: string
          landing_page_id?: string | null
          order_number?: string
          payment_method?: string | null
          payment_receipt_url?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          user_id?: string | null
          wilaya_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_wilaya_id_fkey"
            columns: ["wilaya_id"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          created_at: string
          id: string
          other_cost: number
          other_cost_label: string | null
          packaging_cost: number
          product_id: string
          purchase_cost: number
          storage_cost: number
          total_cost_per_unit: number | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          other_cost?: number
          other_cost_label?: string | null
          packaging_cost?: number
          product_id: string
          purchase_cost?: number
          storage_cost?: number
          total_cost_per_unit?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          other_cost?: number
          other_cost_label?: string | null
          packaging_cost?: number
          product_id?: string
          purchase_cost?: number
          storage_cost?: number
          total_cost_per_unit?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_costs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_offers: {
        Row: {
          created_at: string | null
          description: string
          id: string
          position: number | null
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          position?: number | null
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          position?: number | null
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          display_type: string
          id: string
          name: string
          position: number | null
          product_id: string
        }
        Insert: {
          display_type?: string
          id?: string
          name: string
          position?: number | null
          product_id: string
        }
        Update: {
          display_type?: string
          id?: string
          name?: string
          position?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_values: {
        Row: {
          color_hex: string | null
          id: string
          label: string
          option_group_id: string
          position: number | null
        }
        Insert: {
          color_hex?: string | null
          id?: string
          label: string
          option_group_id: string
          position?: number | null
        }
        Update: {
          color_hex?: string | null
          id?: string
          label?: string
          option_group_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_options: {
        Row: {
          option_value_id: string
          variant_id: string
        }
        Insert: {
          option_value_id: string
          variant_id: string
        }
        Update: {
          option_value_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_options_option_value_id_fkey"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          compare_at_price: number | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          option_values: Json
          price: number
          product_id: string
          quantity: number
          sku: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          option_values?: Json
          price: number
          product_id: string
          quantity?: number
          sku?: string | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          option_values?: Json
          price?: number
          product_id?: string
          quantity?: number
          sku?: string | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          price_adjustment: number | null
          product_id: string
          stock: number | null
          variation_type: string
          variation_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id: string
          stock?: number | null
          variation_type: string
          variation_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id?: string
          stock?: number | null
          variation_type?: string
          variation_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string[]
          created_at: string | null
          description: string | null
          has_variants: boolean | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean
          is_free_shipping: boolean | null
          main_image_index: number | null
          name: string
          offer_ends_at: string | null
          offer_title: string | null
          old_price: number | null
          price: number
          product_type: string
          shipping_price: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
          stock: number | null
        }
        Insert: {
          brand?: string | null
          category: string[]
          created_at?: string | null
          description?: string | null
          has_variants?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean
          is_free_shipping?: boolean | null
          main_image_index?: number | null
          name: string
          offer_ends_at?: string | null
          offer_title?: string | null
          old_price?: number | null
          price: number
          product_type?: string
          shipping_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          stock?: number | null
        }
        Update: {
          brand?: string | null
          category?: string[]
          created_at?: string | null
          description?: string | null
          has_variants?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean
          is_free_shipping?: boolean | null
          main_image_index?: number | null
          name?: string
          offer_ends_at?: string | null
          offer_title?: string | null
          old_price?: number | null
          price?: number
          product_type?: string
          shipping_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          stock?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      return_items: {
        Row: {
          created_at: string
          exchange_product_id: string | null
          exchange_product_name: string | null
          exchange_unit_price: number | null
          id: string
          item_condition: string | null
          item_total: number
          order_item_id: string
          price_difference: number | null
          product_id: string
          product_name: string
          quantity_ordered: number
          quantity_returned: number
          restock_decision: string | null
          restocked: boolean
          return_request_id: string
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          exchange_product_id?: string | null
          exchange_product_name?: string | null
          exchange_unit_price?: number | null
          id?: string
          item_condition?: string | null
          item_total: number
          order_item_id: string
          price_difference?: number | null
          product_id: string
          product_name: string
          quantity_ordered: number
          quantity_returned: number
          restock_decision?: string | null
          restocked?: boolean
          return_request_id: string
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          exchange_product_id?: string | null
          exchange_product_name?: string | null
          exchange_unit_price?: number | null
          id?: string
          item_condition?: string | null
          item_total?: number
          order_item_id?: string
          price_difference?: number | null
          product_id?: string
          product_name?: string
          quantity_ordered?: number
          quantity_returned?: number
          restock_decision?: string | null
          restocked?: boolean
          return_request_id?: string
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_exchange_product_id_fkey"
            columns: ["exchange_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      return_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          return_item_id: string | null
          return_request_id: string
          uploaded_by: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          return_item_id?: string | null
          return_request_id: string
          uploaded_by?: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          return_item_id?: string | null
          return_request_id?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_photos_return_item_id_fkey"
            columns: ["return_item_id"]
            isOneToOne: false
            referencedRelation: "return_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_photos_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_reasons: {
        Row: {
          created_at: string
          fault_type: string
          id: string
          is_active: boolean
          label_ar: string
          position: number
          requires_photos: boolean
        }
        Insert: {
          created_at?: string
          fault_type?: string
          id?: string
          is_active?: boolean
          label_ar: string
          position?: number
          requires_photos?: boolean
        }
        Update: {
          created_at?: string
          fault_type?: string
          id?: string
          is_active?: boolean
          label_ar?: string
          position?: number
          requires_photos?: boolean
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          approved_at: string | null
          completed_at: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          item_received_at: string | null
          merchant_notes: string | null
          net_refund_amount: number
          order_id: string
          pickup_scheduled_at: string | null
          pickup_tracking_number: string | null
          reason_id: string | null
          reason_notes: string | null
          refund_method: string | null
          refund_reference: string | null
          refunded_at: string | null
          rejection_reason: string | null
          requested_at: string
          resolution_type: string
          return_number: string
          return_shipping_cost: number
          shipping_paid_by: string
          status: string
          total_refund_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          item_received_at?: string | null
          merchant_notes?: string | null
          net_refund_amount?: number
          order_id: string
          pickup_scheduled_at?: string | null
          pickup_tracking_number?: string | null
          reason_id?: string | null
          reason_notes?: string | null
          refund_method?: string | null
          refund_reference?: string | null
          refunded_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          resolution_type: string
          return_number: string
          return_shipping_cost?: number
          shipping_paid_by?: string
          status?: string
          total_refund_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          item_received_at?: string | null
          merchant_notes?: string | null
          net_refund_amount?: number
          order_id?: string
          pickup_scheduled_at?: string | null
          pickup_tracking_number?: string | null
          reason_id?: string | null
          reason_notes?: string | null
          refund_method?: string | null
          refund_reference?: string | null
          refunded_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          resolution_type?: string
          return_number?: string
          return_shipping_cost?: number
          shipping_paid_by?: string
          status?: string
          total_refund_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "return_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      return_settings: {
        Row: {
          allow_exchange: boolean
          allow_refund: boolean
          allow_store_credit: boolean
          auto_approve_returns: boolean
          created_at: string
          id: string
          is_returns_enabled: boolean
          max_photos_per_return: number
          require_return_photos: boolean
          return_policy_text: string | null
          return_window_days: number
          updated_at: string
        }
        Insert: {
          allow_exchange?: boolean
          allow_refund?: boolean
          allow_store_credit?: boolean
          auto_approve_returns?: boolean
          created_at?: string
          id?: string
          is_returns_enabled?: boolean
          max_photos_per_return?: number
          require_return_photos?: boolean
          return_policy_text?: string | null
          return_window_days?: number
          updated_at?: string
        }
        Update: {
          allow_exchange?: boolean
          allow_refund?: boolean
          allow_store_credit?: boolean
          auto_approve_returns?: boolean
          created_at?: string
          id?: string
          is_returns_enabled?: boolean
          max_photos_per_return?: number
          require_return_photos?: boolean
          return_policy_text?: string | null
          return_window_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      return_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          return_request_id: string
          to_status: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          return_request_id: string
          to_status: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          return_request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_status_history_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_name: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          is_public: boolean
          key: string
          value: string | null
        }
        Insert: {
          id?: string
          is_public?: boolean
          key: string
          value?: string | null
        }
        Update: {
          id?: string
          is_public?: boolean
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      supplier_products: {
        Row: {
          category: string | null
          created_at: string
          date: string
          document_name: string | null
          document_url: string | null
          id: string
          low_stock_threshold: number
          notes: string | null
          product_name: string
          quantity_received: number
          quantity_returned: number
          reference_sku: string | null
          remaining_stock: number | null
          supplier_id: string
          total_price: number | null
          unit: string
          unit_price: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          date?: string
          document_name?: string | null
          document_url?: string | null
          id?: string
          low_stock_threshold?: number
          notes?: string | null
          product_name: string
          quantity_received?: number
          quantity_returned?: number
          reference_sku?: string | null
          remaining_stock?: number | null
          supplier_id: string
          total_price?: number | null
          unit?: string
          unit_price?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          document_name?: string | null
          document_url?: string | null
          id?: string
          low_stock_threshold?: number
          notes?: string | null
          product_name?: string
          quantity_received?: number
          quantity_returned?: number
          reference_sku?: string | null
          remaining_stock?: number | null
          supplier_id?: string
          total_price?: number | null
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_transactions: {
        Row: {
          created_at: string
          date: string
          description: string | null
          document_name: string | null
          document_url: string | null
          id: string
          items_given: number
          items_received: number
          notes: string | null
          supplier_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          items_given?: number
          items_received?: number
          notes?: string | null
          supplier_id: string
          transaction_type?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          items_given?: number
          items_received?: number
          notes?: string | null
          supplier_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          chat_id: string
          state: Json
          updated_at: string
        }
        Insert: {
          chat_id: string
          state?: Json
          updated_at?: string
        }
        Update: {
          chat_id?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variation_options: {
        Row: {
          color_code: string | null
          created_at: string
          id: string
          is_active: boolean
          variation_type: string
          variation_value: string
        }
        Insert: {
          color_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          variation_type: string
          variation_value: string
        }
        Update: {
          color_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          variation_type?: string
          variation_value?: string
        }
        Relationships: []
      }
      wilayas: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          shipping_price: number
          shipping_price_home: number
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          shipping_price: number
          shipping_price_home?: number
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          shipping_price?: number
          shipping_price_home?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_guest_orders_for_phone: {
        Args: { p_phone: string }
        Returns: number
      }
      create_public_order: {
        Args: { p_items: Json; p_order: Json }
        Returns: {
          id: string
          order_number: string
        }[]
      }
      get_active_facebook_pixels: {
        Args: never
        Returns: {
          pixel_id: string
        }[]
      }
      get_order_tracking: {
        Args: { p_order_number: string }
        Returns: {
          baladiya: string
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_type: string
          order_number: string
          payment_method: string
          status: string
          total_amount: number
          wilaya_name: string
        }[]
      }
      get_return_status: {
        Args: { p_phone: string; p_return_number: string }
        Returns: {
          created_at: string
          history: Json
          return_number: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_abandoned_recovered: {
        Args: { p_order_id: string; p_phone: string }
        Returns: undefined
      }
      upsert_abandoned_order: {
        Args: {
          p_cart_items: Json
          p_cart_total: number
          p_item_count: number
          p_name: string
          p_notes?: string
          p_phone: string
          p_wilaya: string
        }
        Returns: string
      }
      validate_coupon: {
        Args: { p_code: string }
        Returns: {
          code: string
          discount_type: string
          discount_value: number
          expiry_date: string
          id: string
          is_active: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "confirmer"
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
      app_role: ["admin", "user", "confirmer"],
    },
  },
} as const
