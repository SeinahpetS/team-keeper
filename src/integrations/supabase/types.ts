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
      clips: {
        Row: {
          approval_status: string
          broll_type: string | null
          content_type: string
          contributor_player_id: string | null
          contributor_type: string | null
          created_at: string
          event_id: string | null
          file_url: string
          hearted: boolean
          id: string
          note: string | null
          permission_cleared: boolean
          player_tags: string[]
          suggested_event_id: string | null
          team_id: string
          trim_end: number | null
          trim_start: number | null
          uploader_name: string | null
          vibe: string | null
        }
        Insert: {
          approval_status?: string
          broll_type?: string | null
          content_type?: string
          contributor_player_id?: string | null
          contributor_type?: string | null
          created_at?: string
          event_id?: string | null
          file_url: string
          hearted?: boolean
          id?: string
          note?: string | null
          permission_cleared?: boolean
          player_tags?: string[]
          suggested_event_id?: string | null
          team_id: string
          trim_end?: number | null
          trim_start?: number | null
          uploader_name?: string | null
          vibe?: string | null
        }
        Update: {
          approval_status?: string
          broll_type?: string | null
          content_type?: string
          contributor_player_id?: string | null
          contributor_type?: string | null
          created_at?: string
          event_id?: string | null
          file_url?: string
          hearted?: boolean
          id?: string
          note?: string | null
          permission_cleared?: boolean
          player_tags?: string[]
          suggested_event_id?: string | null
          team_id?: string
          trim_end?: number | null
          trim_start?: number | null
          uploader_name?: string | null
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clips_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      recaps: {
        Row: {
          created_at: string
          id: string
          mix_fan: number
          mix_full_game: number
          mix_individual: number
          mix_team_broll: number
          recap_type: string
          render_count: number
          sent_at: string | null
          social_status: string
          social_video_url: string | null
          status: string
          team_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mix_fan?: number
          mix_full_game?: number
          mix_individual?: number
          mix_team_broll?: number
          recap_type?: string
          render_count?: number
          sent_at?: string | null
          social_status?: string
          social_video_url?: string | null
          status?: string
          team_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mix_fan?: number
          mix_full_game?: number
          mix_individual?: number
          mix_team_broll?: number
          recap_type?: string
          render_count?: number
          sent_at?: string | null
          social_status?: string
          social_video_url?: string | null
          status?: string
          team_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recaps_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roster: {
        Row: {
          created_at: string
          id: string
          inactive_date: string | null
          jersey_number: string | null
          permission_status: string
          photo_url: string | null
          player_name: string
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inactive_date?: string | null
          jersey_number?: string | null
          permission_status?: string
          photo_url?: string | null
          player_name: string
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inactive_date?: string | null
          jersey_number?: string | null
          permission_status?: string
          photo_url?: string | null
          player_name?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_claims: {
        Row: {
          claimer_contact: string | null
          claimer_name: string
          contributor_type: string
          created_at: string
          id: string
          roster_player_id: string
          team_id: string
        }
        Insert: {
          claimer_contact?: string | null
          claimer_name: string
          contributor_type: string
          created_at?: string
          id?: string
          roster_player_id: string
          team_id: string
        }
        Update: {
          claimer_contact?: string | null
          claimer_name?: string
          contributor_type?: string
          created_at?: string
          id?: string
          roster_player_id?: string
          team_id?: string
        }
        Relationships: []
      }
      schedule_events: {
        Row: {
          created_at: string
          date: string
          end_date: string | null
          event_time: string | null
          event_type: string
          id: string
          location: string | null
          name: string
          notes: string | null
          opponent: string | null
          parent_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_date?: string | null
          event_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          opponent?: string | null
          parent_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_date?: string | null
          event_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          opponent?: string | null
          parent_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          name: string
          season_year: number
          sport: string
          upload_slug: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          name: string
          season_year: number
          sport: string
          upload_slug?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          name?: string
          season_year?: number
          sport?: string
          upload_slug?: string
        }
        Relationships: []
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
