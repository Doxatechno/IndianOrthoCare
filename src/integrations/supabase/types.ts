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
      amc_contracts: {
        Row: {
          customer_id: string
          customer_name: string
          end_date: string
          equipment_id: string
          equipment_name: string
          id: string
          price: number
          start_date: string
          status: Database["public"]["Enums"]["amc_status"]
          updated_at: string
          warranty_end_date: string | null
        }
        Insert: {
          customer_id?: string
          customer_name?: string
          end_date: string
          equipment_id: string
          equipment_name?: string
          id: string
          price?: number
          start_date: string
          status?: Database["public"]["Enums"]["amc_status"]
          updated_at?: string
          warranty_end_date?: string | null
        }
        Update: {
          customer_id?: string
          customer_name?: string
          end_date?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          price?: number
          start_date?: string
          status?: Database["public"]["Enums"]["amc_status"]
          updated_at?: string
          warranty_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amc_contracts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          contact_person: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          contact_person?: string
          created_at?: string
          email?: string
          id: string
          name: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          customer_id: string
          customer_name: string
          id: string
          installation_date: string | null
          model_number: string
          name: string
          serial_number: string
          updated_at: string
          warranty_end_date: string | null
          warranty_start_date: string | null
        }
        Insert: {
          customer_id: string
          customer_name?: string
          id: string
          installation_date?: string | null
          model_number?: string
          name: string
          serial_number?: string
          updated_at?: string
          warranty_end_date?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          customer_id?: string
          customer_name?: string
          id?: string
          installation_date?: string | null
          model_number?: string
          name?: string
          serial_number?: string
          updated_at?: string
          warranty_end_date?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_schedules: {
        Row: {
          amc_id: string
          assigned_technician: string | null
          customer_name: string
          equipment_id: string
          equipment_name: string
          id: string
          planned_date: string
          pm_number: number
          status: Database["public"]["Enums"]["pm_status"]
          updated_at: string
        }
        Insert: {
          amc_id: string
          assigned_technician?: string | null
          customer_name?: string
          equipment_id: string
          equipment_name?: string
          id: string
          planned_date: string
          pm_number: number
          status?: Database["public"]["Enums"]["pm_status"]
          updated_at?: string
        }
        Update: {
          amc_id?: string
          assigned_technician?: string | null
          customer_name?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          planned_date?: string
          pm_number?: number
          status?: Database["public"]["Enums"]["pm_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "amc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          id: string
          model_number: string
          name: string
          stock_qty: number | null
          synced_at: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          id: string
          model_number?: string
          name?: string
          stock_qty?: number | null
          synced_at?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          id?: string
          model_number?: string
          name?: string
          stock_qty?: number | null
          synced_at?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sales_orders: {
        Row: {
          customer_name: string
          delivered_pct: number | null
          delivery_date: string | null
          delivery_for: string
          id: string
          invoiced_pct: number | null
          order_date: string | null
          portal_id: string | null
          status: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          customer_name?: string
          delivered_pct?: number | null
          delivery_date?: string | null
          delivery_for?: string
          id: string
          invoiced_pct?: number | null
          order_date?: string | null
          portal_id?: string | null
          status?: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          customer_name?: string
          delivered_pct?: number | null
          delivery_date?: string | null
          delivery_for?: string
          id?: string
          invoiced_pct?: number | null
          order_date?: string | null
          portal_id?: string | null
          status?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          customer_count: number | null
          error_msg: string | null
          id: number
          orders_count: number | null
          product_count: number | null
          status: string
          synced_at: string
        }
        Insert: {
          customer_count?: number | null
          error_msg?: string | null
          id?: number
          orders_count?: number | null
          product_count?: number | null
          status?: string
          synced_at?: string
        }
        Update: {
          customer_count?: number | null
          error_msg?: string | null
          id?: number
          orders_count?: number | null
          product_count?: number | null
          status?: string
          synced_at?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string
          specialization: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          is_active?: boolean
          name: string
          phone?: string
          specialization?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          specialization?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_technician: string | null
          completed_date: string | null
          created_date: string
          customer_id: string
          customer_name: string
          equipment_id: string
          equipment_name: string
          id: string
          issue_type: string | null
          location: string
          remarks: string
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
        }
        Insert: {
          assigned_technician?: string | null
          completed_date?: string | null
          created_date?: string
          customer_id?: string
          customer_name?: string
          equipment_id: string
          equipment_name?: string
          id: string
          issue_type?: string | null
          location?: string
          remarks?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Update: {
          assigned_technician?: string | null
          completed_date?: string | null
          created_date?: string
          customer_id?: string
          customer_name?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          issue_type?: string | null
          location?: string
          remarks?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_technician_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      amc_status:
        | "Quotation Sent"
        | "PO Released"
        | "Invoice Generated"
        | "Payment Received"
      app_role: "admin" | "technician"
      pm_status: "Pending" | "Assigned" | "Completed"
      ticket_status:
        | "Pending"
        | "Assigned"
        | "In Progress"
        | "Completed"
        | "Issue Reported"
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
      amc_status: [
        "Quotation Sent",
        "PO Released",
        "Invoice Generated",
        "Payment Received",
      ],
      app_role: ["admin", "technician"],
      pm_status: ["Pending", "Assigned", "Completed"],
      ticket_status: [
        "Pending",
        "Assigned",
        "In Progress",
        "Completed",
        "Issue Reported",
      ],
    },
  },
} as const
