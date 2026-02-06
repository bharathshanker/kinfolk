export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      financial_records: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          person_id: string
          title: string
          type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          person_id: string
          title: string
          type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          person_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          notes: string | null
          person_id: string
          title: string
          type: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          person_id: string
          title: string
          type?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          person_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      health_markers: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          lab_max: number | null
          lab_min: number | null
          name: string
          optimal_max: number | null
          optimal_min: number | null
          system: string
          unit: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          lab_max?: number | null
          lab_min?: number | null
          name: string
          optimal_max?: number | null
          optimal_min?: number | null
          system: string
          unit?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          lab_max?: number | null
          lab_min?: number | null
          name?: string
          optimal_max?: number | null
          optimal_min?: number | null
          system?: string
          unit?: string | null
        }
        Relationships: []
      }
      health_physicals: {
        Row: {
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string | null
          created_by: string | null
          height_cm: number | null
          hip_cm: number | null
          id: string
          measurement_date: string
          notes: string | null
          person_id: string
          resting_hr: number | null
          waist_cm: number | null
          waist_hip_ratio: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string | null
          created_by?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measurement_date: string
          notes?: string | null
          person_id: string
          resting_hr?: number | null
          waist_cm?: number | null
          waist_hip_ratio?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string | null
          created_by?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measurement_date?: string
          notes?: string | null
          person_id?: string
          resting_hr?: number | null
          waist_cm?: number | null
          waist_hip_ratio?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_physicals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_physicals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      health_ratios: {
        Row: {
          created_at: string | null
          id: string
          is_optimal: boolean | null
          person_id: string
          ratio_code: string
          report_id: string | null
          test_date: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_optimal?: boolean | null
          person_id: string
          ratio_code: string
          report_id?: string | null
          test_date: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_optimal?: boolean | null
          person_id?: string
          ratio_code?: string
          report_id?: string | null
          test_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_ratios_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_ratios_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "health_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      health_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lab_name: string | null
          pdf_url: string | null
          person_id: string
          raw_extraction: Json | null
          report_type: string | null
          status: string | null
          test_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lab_name?: string | null
          pdf_url?: string | null
          person_id: string
          raw_extraction?: Json | null
          report_type?: string | null
          status?: string | null
          test_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lab_name?: string | null
          pdf_url?: string | null
          person_id?: string
          raw_extraction?: Json | null
          report_type?: string | null
          status?: string | null
          test_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_reports_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      health_values: {
        Row: {
          created_at: string | null
          id: string
          is_flagged: boolean | null
          marker_code: string | null
          marker_name: string | null
          notes: string | null
          person_id: string
          report_id: string | null
          test_date: string
          unit: string | null
          value: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_flagged?: boolean | null
          marker_code?: string | null
          marker_name?: string | null
          notes?: string | null
          person_id: string
          report_id?: string | null
          test_date: string
          unit?: string | null
          value?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_flagged?: boolean | null
          marker_code?: string | null
          marker_name?: string | null
          notes?: string | null
          person_id?: string
          report_id?: string | null
          test_date?: string
          unit?: string | null
          value?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_values_marker_code_fkey"
            columns: ["marker_code"]
            isOneToOne: false
            referencedRelation: "health_markers"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "health_values_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_values_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "health_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          person_id: string
          tags: string[] | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          person_id: string
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          person_id?: string
          tags?: string[] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          created_at: string | null
          created_by: string
          id: string
          name: string
          relation: string | null
          sharing_preference: string | null
          theme_color: string | null
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          relation?: string | null
          sharing_preference?: string | null
          theme_color?: string | null
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          relation?: string | null
          sharing_preference?: string | null
          theme_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      person_shares: {
        Row: {
          created_at: string | null
          id: string
          person_id: string
          role: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          person_id: string
          role?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          person_id?: string
          role?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_shares_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          person_id: string
          priority: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          person_id: string
          priority?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          person_id?: string
          priority?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_access_to_person: {
        Args: { target_person_id: string }
        Returns: boolean
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
