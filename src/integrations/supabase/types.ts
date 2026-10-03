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
      admin_warnings: {
        Row: {
          admin_id: string
          created_at: string
          created_by: string | null
          id: string
          message: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_warnings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "area_admins"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_assist_usage: {
        Row: {
          client_hash: string
          created_at: string
          id: string
        }
        Insert: {
          client_hash: string
          created_at?: string
          id?: string
        }
        Update: {
          client_hash?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          default_deadline_days: number
          id: number
          updated_at: string
        }
        Insert: {
          default_deadline_days?: number
          id?: number
          updated_at?: string
        }
        Update: {
          default_deadline_days?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      area_admin_areas: {
        Row: {
          admin_id: string
          area_id: string
        }
        Insert: {
          admin_id: string
          area_id: string
        }
        Update: {
          admin_id?: string
          area_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_admin_areas_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "area_admins"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "area_admin_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      area_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          browser_notifications: boolean
          created_at: string
          email: string
          email_notifications: boolean
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          browser_notifications?: boolean
          created_at?: string
          email?: string
          email_notifications?: boolean
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          browser_notifications?: boolean
          created_at?: string
          email?: string
          email_notifications?: boolean
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          report_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          report_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          report_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_status_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          address: string
          admin_notes: string | null
          annotated_image_url: string | null
          area_id: string | null
          assigned_admin_id: string | null
          citizen_rating: number | null
          confidence: number | null
          created_at: string
          deadline_at: string | null
          description: string | null
          estimated_height: number | null
          estimated_width: number | null
          id: string
          latitude: number | null
          longitude: number | null
          original_image_url: string | null
          pothole_count: number
          rated_at: string | null
          report_number: string
          resolved_at: string | null
          road_position: string | null
          severity: string
          status: string
          submitter_email: string
          submitter_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          admin_notes?: string | null
          annotated_image_url?: string | null
          area_id?: string | null
          assigned_admin_id?: string | null
          citizen_rating?: number | null
          confidence?: number | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          estimated_height?: number | null
          estimated_width?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          original_image_url?: string | null
          pothole_count?: number
          rated_at?: string | null
          report_number?: string
          resolved_at?: string | null
          road_position?: string | null
          severity?: string
          status?: string
          submitter_email?: string
          submitter_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          annotated_image_url?: string | null
          area_id?: string | null
          assigned_admin_id?: string | null
          citizen_rating?: number | null
          confidence?: number | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          estimated_height?: number | null
          estimated_width?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          original_image_url?: string | null
          pothole_count?: number
          rated_at?: string | null
          report_number?: string
          resolved_at?: string | null
          road_position?: string | null
          severity?: string
          status?: string
          submitter_email?: string
          submitter_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
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
      admins: {
        Row: {
          admin_since: string | null
          email: string | null
          full_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_performance: {
        Args: { _admin_id: string }
        Returns: {
          avg_rating: number
          fixed: number
          fixed_on_time: number
          on_time_rate: number
          overdue: number
          rating_count: number
          total: number
        }[]
      }
      can_manage_report: {
        Args: { _area_id: string; _assigned: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_area_admin: { Args: { _user_id: string }; Returns: boolean }
      rate_report: {
        Args: { _rating: number; _report_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "admin"],
    },
  },
} as const
