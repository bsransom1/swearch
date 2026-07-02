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
      highlights: {
        Row: {
          ai_findings: string | null
          ai_limitations: string | null
          ai_methodology: string | null
          ai_relevance: string | null
          ai_sample_size: string | null
          ai_summary: string | null
          created_at: string | null
          exported_to_google_doc: boolean | null
          google_doc_exported_at: string | null
          highlight_text: string
          id: string
          paper_id: string
          project_id: string
          user_id: string
          user_note: string | null
        }
        Insert: {
          ai_findings?: string | null
          ai_limitations?: string | null
          ai_methodology?: string | null
          ai_relevance?: string | null
          ai_sample_size?: string | null
          ai_summary?: string | null
          created_at?: string | null
          exported_to_google_doc?: boolean | null
          google_doc_exported_at?: string | null
          highlight_text: string
          id?: string
          paper_id: string
          project_id: string
          user_id: string
          user_note?: string | null
        }
        Update: {
          ai_findings?: string | null
          ai_limitations?: string | null
          ai_methodology?: string | null
          ai_relevance?: string | null
          ai_sample_size?: string | null
          ai_summary?: string | null
          created_at?: string | null
          exported_to_google_doc?: boolean | null
          google_doc_exported_at?: string | null
          highlight_text?: string
          id?: string
          paper_id?: string
          project_id?: string
          user_id?: string
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "highlights_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers_analyzed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_recommendations: {
        Row: {
          created_at: string | null
          id: string
          openalex_work_id: string | null
          project_id: string
          recommended_abstract: string | null
          recommended_authors: string[] | null
          recommended_title: string
          recommended_url: string | null
          recommended_year: number | null
          relevance_reason: string | null
          semantic_scholar_id: string | null
          source_paper_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          openalex_work_id?: string | null
          project_id: string
          recommended_abstract?: string | null
          recommended_authors?: string[] | null
          recommended_title: string
          recommended_url?: string | null
          recommended_year?: number | null
          relevance_reason?: string | null
          semantic_scholar_id?: string | null
          source_paper_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          openalex_work_id?: string | null
          project_id?: string
          recommended_abstract?: string | null
          recommended_authors?: string[] | null
          recommended_title?: string
          recommended_url?: string | null
          recommended_year?: number | null
          relevance_reason?: string | null
          semantic_scholar_id?: string | null
          source_paper_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_recommendations_source_paper_id_fkey"
            columns: ["source_paper_id"]
            isOneToOne: false
            referencedRelation: "papers_analyzed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      papers_analyzed: {
        Row: {
          first_highlighted_at: string | null
          highlight_count: number | null
          id: string
          last_highlighted_at: string | null
          paper_abstract: string | null
          paper_authors: string[] | null
          paper_doi: string | null
          paper_title: string | null
          paper_url: string
          paper_year: number | null
          project_id: string
          user_id: string
        }
        Insert: {
          first_highlighted_at?: string | null
          highlight_count?: number | null
          id?: string
          last_highlighted_at?: string | null
          paper_abstract?: string | null
          paper_authors?: string[] | null
          paper_doi?: string | null
          paper_title?: string | null
          paper_url: string
          paper_year?: number | null
          project_id: string
          user_id: string
        }
        Update: {
          first_highlighted_at?: string | null
          highlight_count?: number | null
          id?: string
          last_highlighted_at?: string | null
          paper_abstract?: string | null
          paper_authors?: string[] | null
          paper_doi?: string | null
          paper_title?: string | null
          paper_url?: string
          paper_year?: number | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papers_analyzed_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papers_analyzed_user_id_fkey"
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
          created_at: string | null
          email: string
          full_name: string | null
          google_access_token: string | null
          google_connected_at: string | null
          google_refresh_token: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          google_access_token?: string | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          google_access_token?: string | null
          google_connected_at?: string | null
          google_refresh_token?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_google_docs: {
        Row: {
          cached_at: string | null
          cached_text: string | null
          created_at: string | null
          google_doc_id: string
          id: string
          project_id: string
          role: string
          sort_order: number
          summary: string | null
          summary_at: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cached_at?: string | null
          cached_text?: string | null
          created_at?: string | null
          google_doc_id: string
          id?: string
          project_id: string
          role: string
          sort_order?: number
          summary?: string | null
          summary_at?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cached_at?: string | null
          cached_text?: string | null
          created_at?: string | null
          google_doc_id?: string
          id?: string
          project_id?: string
          role?: string
          sort_order?: number
          summary?: string | null
          summary_at?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_google_docs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_google_docs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          created_at: string | null
          description: string | null
          google_doc_cached_at: string | null
          google_doc_cached_text: string | null
          google_doc_id: string | null
          google_doc_title: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          google_doc_cached_at?: string | null
          google_doc_cached_text?: string | null
          google_doc_id?: string | null
          google_doc_title?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          google_doc_cached_at?: string | null
          google_doc_cached_text?: string | null
          google_doc_id?: string | null
          google_doc_title?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_highlight_count: {
        Args: { paper_id: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
