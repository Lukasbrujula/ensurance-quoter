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
      agent_licenses: {
        Row: {
          agent_id: string
          created_at: string | null
          expiration_date: string | null
          id: string
          issue_date: string | null
          license_number: string
          license_type: string | null
          state: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          license_number: string
          license_type?: string | null
          state: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          license_number?: string
          license_type?: string | null
          state?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_phone_numbers: {
        Row: {
          agent_id: string
          ai_agent_id: string | null
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          phone_number: string
          sms_enabled: boolean
          telnyx_phone_number_id: string | null
          updated_at: string
          voice_enabled: boolean
        }
        Insert: {
          agent_id: string
          ai_agent_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone_number: string
          sms_enabled?: boolean
          telnyx_phone_number_id?: string | null
          updated_at?: string
          voice_enabled?: boolean
        }
        Update: {
          agent_id?: string
          ai_agent_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          phone_number?: string
          sms_enabled?: boolean
          telnyx_phone_number_id?: string | null
          updated_at?: string
          voice_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_phone_numbers_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          business_info: Json | null
          carrier_commissions: Json
          created_at: string
          default_first_year_percent: number
          default_renewal_percent: number
          id: string
          last_notifications_read_at: string | null
          telnyx_ai_assistant_id: string | null
          telnyx_ai_enabled: boolean | null
          telnyx_messaging_profile_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_info?: Json | null
          carrier_commissions?: Json
          created_at?: string
          default_first_year_percent?: number
          default_renewal_percent?: number
          id?: string
          last_notifications_read_at?: string | null
          telnyx_ai_assistant_id?: string | null
          telnyx_ai_enabled?: boolean | null
          telnyx_messaging_profile_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_info?: Json | null
          carrier_commissions?: Json
          created_at?: string
          default_first_year_percent?: number
          default_renewal_percent?: number
          id?: string
          last_notifications_read_at?: string | null
          telnyx_ai_assistant_id?: string | null
          telnyx_ai_enabled?: boolean | null
          telnyx_messaging_profile_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_calls: {
        Row: {
          age_range: string | null
          agent_id: string
          ai_agent_id: string | null
          callback_number: string | null
          callback_time: string | null
          caller_name: string | null
          caller_phone: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          processed: boolean | null
          reason: string | null
          state: string | null
          telnyx_conversation_id: string | null
          transcript: string | null
          urgency: string | null
        }
        Insert: {
          age_range?: string | null
          agent_id: string
          ai_agent_id?: string | null
          callback_number?: string | null
          callback_time?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          processed?: boolean | null
          reason?: string | null
          state?: string | null
          telnyx_conversation_id?: string | null
          transcript?: string | null
          urgency?: string | null
        }
        Update: {
          age_range?: string | null
          agent_id?: string
          ai_agent_id?: string | null
          callback_number?: string | null
          callback_time?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          processed?: boolean | null
          reason?: string | null
          state?: string | null
          telnyx_conversation_id?: string | null
          transcript?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_calls_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          after_hours_greeting: string | null
          agent_id: string
          business_hours: Json | null
          collect_fields: Json | null
          created_at: string | null
          description: string | null
          faq_entries: Json | null
          greeting: string | null
          id: string
          last_call_at: string | null
          model: string | null
          name: string
          personality: string | null
          phone_number: string | null
          post_call_actions: Json | null
          status: string
          system_prompt: string | null
          telnyx_assistant_id: string | null
          total_calls: number | null
          total_minutes: number | null
          updated_at: string | null
          voice: string | null
        }
        Insert: {
          after_hours_greeting?: string | null
          agent_id: string
          business_hours?: Json | null
          collect_fields?: Json | null
          created_at?: string | null
          description?: string | null
          faq_entries?: Json | null
          greeting?: string | null
          id?: string
          last_call_at?: string | null
          model?: string | null
          name?: string
          personality?: string | null
          phone_number?: string | null
          post_call_actions?: Json | null
          status?: string
          system_prompt?: string | null
          telnyx_assistant_id?: string | null
          total_calls?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          voice?: string | null
        }
        Update: {
          after_hours_greeting?: string | null
          agent_id?: string
          business_hours?: Json | null
          collect_fields?: Json | null
          created_at?: string | null
          description?: string | null
          faq_entries?: Json | null
          greeting?: string | null
          id?: string
          last_call_at?: string | null
          model?: string | null
          name?: string
          personality?: string | null
          phone_number?: string | null
          post_call_actions?: Json | null
          status?: string
          system_prompt?: string | null
          telnyx_assistant_id?: string | null
          total_calls?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          voice?: string | null
        }
        Relationships: []
      }
      ai_transcripts: {
        Row: {
          agent_id: string
          ai_agent_id: string
          call_id: string
          content: string
          created_at: string | null
          id: string
          message_index: number
          role: string
          timestamp: string | null
        }
        Insert: {
          agent_id: string
          ai_agent_id: string
          call_id: string
          content: string
          created_at?: string | null
          id?: string
          message_index?: number
          role: string
          timestamp?: string | null
        }
        Update: {
          agent_id?: string
          ai_agent_id?: string
          call_id?: string
          content?: string
          created_at?: string | null
          id?: string
          message_index?: number
          role?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_transcripts_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_transcripts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_calls"
            referencedColumns: ["id"]
          },
        ]
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
      google_integrations: {
        Row: {
          access_token: string
          agent_id: string
          calendar_id: string | null
          connected_at: string | null
          email: string | null
          id: string
          refresh_token: string
          token_expiry: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          agent_id: string
          calendar_id?: string | null
          connected_at?: string | null
          email?: string | null
          id?: string
          refresh_token: string
          token_expiry: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          agent_id?: string
          calendar_id?: string | null
          connected_at?: string | null
          email?: string | null
          id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          agent_id: string
          content: string
          created_at: string | null
          id: string
          lead_id: string
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
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
          google_event_id: string | null
          id: string
          income_range: string | null
          last_name: string | null
          marital_status: string | null
          medical_conditions: string[] | null
          notes: string | null
          occupation: string | null
          phone: string | null
          pre_screen: Json | null
          raw_csv_data: Json | null
          sms_reminder: boolean | null
          sms_reminder_sent_at: string | null
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
          google_event_id?: string | null
          id?: string
          income_range?: string | null
          last_name?: string | null
          marital_status?: string | null
          medical_conditions?: string[] | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          pre_screen?: Json | null
          raw_csv_data?: Json | null
          sms_reminder?: boolean | null
          sms_reminder_sent_at?: string | null
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
          google_event_id?: string | null
          id?: string
          income_range?: string | null
          last_name?: string | null
          marital_status?: string | null
          medical_conditions?: string[] | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          pre_screen?: Json | null
          raw_csv_data?: Json | null
          sms_reminder?: boolean | null
          sms_reminder_sent_at?: string | null
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
      sms_logs: {
        Row: {
          agent_id: string
          created_at: string | null
          direction: string
          from_number: string
          id: string
          lead_id: string
          message: string
          status: string | null
          telnyx_message_id: string | null
          to_number: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          direction?: string
          from_number: string
          id?: string
          lead_id: string
          message: string
          status?: string | null
          telnyx_message_id?: string | null
          to_number: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          direction?: string
          from_number?: string
          id?: string
          lead_id?: string
          message?: string
          status?: string | null
          telnyx_message_id?: string | null
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_lead_id_fkey"
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
      increment_agent_stats: {
        Args: { p_additional_minutes: number; p_agent_id: string }
        Returns: undefined
      }
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
