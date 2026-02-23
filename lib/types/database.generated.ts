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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          agent_id: string
          created_at: string | null
          details: Json | null
          id: string
          lead_id: string
          title: string
        }
        Insert: {
          activity_type: string
          agent_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id: string
          title: string
        }
        Update: {
          activity_type?: string
          agent_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          carrier_commissions: Json
          created_at: string
          default_first_year_percent: number
          default_renewal_percent: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier_commissions?: Json
          created_at?: string
          default_first_year_percent?: number
          default_renewal_percent?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier_commissions?: Json
          created_at?: string
          default_first_year_percent?: number
          default_renewal_percent?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          ai_summary: string | null
          coaching_hints: Json | null
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lead_id: string
          provider: string
          provider_call_id: string | null
          recording_url: string | null
          started_at: string | null
          transcript_text: string | null
        }
        Insert: {
          ai_summary?: string | null
          coaching_hints?: Json | null
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id: string
          provider: string
          provider_call_id?: string | null
          recording_url?: string | null
          started_at?: string | null
          transcript_text?: string | null
        }
        Update: {
          ai_summary?: string | null
          coaching_hints?: Json | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string
          provider?: string
          provider_call_id?: string | null
          recording_url?: string | null
          started_at?: string | null
          transcript_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichments: {
        Row: {
          enriched_at: string
          id: string
          lead_id: string
          pdl_data: Json
        }
        Insert: {
          enriched_at?: string
          id?: string
          lead_id: string
          pdl_data: Json
        }
        Update: {
          enriched_at?: string
          id?: string
          lead_id?: string
          pdl_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "enrichments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          age: number | null
          agent_id: string
          city: string | null
          coverage_amount: number | null
          created_at: string
          date_of_birth: string | null
          dependents: number | null
          dui_history: boolean | null
          email: string | null
          existing_coverage: string | null
          first_name: string | null
          follow_up_date: string | null
          follow_up_note: string | null
          gender: string | null
          id: string
          income_range: string | null
          last_name: string | null
          marital_status: string | null
          medical_conditions: string[] | null
          notes: string | null
          occupation: string | null
          phone: string | null
          raw_csv_data: Json | null
          source: string
          state: string | null
          status: string
          status_updated_at: string | null
          term_length: number | null
          tobacco_status: string | null
          updated_at: string
          years_since_last_dui: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          agent_id: string
          city?: string | null
          coverage_amount?: number | null
          created_at?: string
          date_of_birth?: string | null
          dependents?: number | null
          dui_history?: boolean | null
          email?: string | null
          existing_coverage?: string | null
          first_name?: string | null
          follow_up_date?: string | null
          follow_up_note?: string | null
          gender?: string | null
          id?: string
          income_range?: string | null
          last_name?: string | null
          marital_status?: string | null
          medical_conditions?: string[] | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          raw_csv_data?: Json | null
          source?: string
          state?: string | null
          status?: string
          status_updated_at?: string | null
          term_length?: number | null
          tobacco_status?: string | null
          updated_at?: string
          years_since_last_dui?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          agent_id?: string
          city?: string | null
          coverage_amount?: number | null
          created_at?: string
          date_of_birth?: string | null
          dependents?: number | null
          dui_history?: boolean | null
          email?: string | null
          existing_coverage?: string | null
          first_name?: string | null
          follow_up_date?: string | null
          follow_up_note?: string | null
          gender?: string | null
          id?: string
          income_range?: string | null
          last_name?: string | null
          marital_status?: string | null
          medical_conditions?: string[] | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          raw_csv_data?: Json | null
          source?: string
          state?: string | null
          status?: string
          status_updated_at?: string | null
          term_length?: number | null
          tobacco_status?: string | null
          updated_at?: string
          years_since_last_dui?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          request_data: Json
          response_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          request_data: Json
          response_data: Json
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          request_data?: Json
          response_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
