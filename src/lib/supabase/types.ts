export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      class_bookings: {
        Row: {
          checked_in_at: string | null
          class_date: string
          created_at: string
          id: string
          is_free_trial: boolean
          schedule_id: string
          status: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          class_date: string
          created_at?: string
          id?: string
          is_free_trial?: boolean
          schedule_id: string
          status?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          class_date?: string
          created_at?: string
          id?: string
          is_free_trial?: boolean
          schedule_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          day_of_week: number
          description: string | null
          duration_minutes: number
          id: string
          name: string
          start_time: string
          trainer_id: string | null
        }
        Insert: {
          active?: boolean
          capacity?: number
          created_at?: string
          day_of_week: number
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          start_time: string
          trainer_id?: string | null
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          day_of_week?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          start_time?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pt_trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          read: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          read?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read?: boolean
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          interval: string
          interval_count: number
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          interval_count?: number
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          interval_count?: number
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          payment_method: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_method: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          payment_method?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: string
          received_by: string | null
          reference_id: string | null
          status: string
          stripe_event_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          method: string
          received_by?: string | null
          reference_id?: string | null
          status?: string
          stripe_event_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          received_by?: string | null
          reference_id?: string | null
          status?: string
          stripe_event_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          free_trial_claimed_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          free_trial_claimed_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          free_trial_claimed_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pt_availability: {
        Row: {
          active: boolean
          day_of_week: number
          end_time: string
          id: string
          slot_minutes: number
          start_time: string
          trainer_id: string
        }
        Insert: {
          active?: boolean
          day_of_week: number
          end_time: string
          id?: string
          slot_minutes?: number
          start_time: string
          trainer_id: string
        }
        Update: {
          active?: boolean
          day_of_week?: number
          end_time?: string
          id?: string
          slot_minutes?: number
          start_time?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pt_trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_bookings: {
        Row: {
          created_at: string
          end_at: string
          id: string
          notes: string | null
          purchase_id: string | null
          start_at: string
          status: string
          trainer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          notes?: string | null
          purchase_id?: string | null
          start_at: string
          status?: string
          trainer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          notes?: string | null
          purchase_id?: string | null
          start_at?: string
          status?: string
          trainer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_bookings_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "pt_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_bookings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pt_trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_packages: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          price_cents: number
          session_count: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_cents: number
          session_count: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          session_count?: number
          sort_order?: number
        }
        Relationships: []
      }
      pt_purchases: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          package_id: string
          payment_method: string
          sessions_remaining: number
          sessions_total: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          package_id: string
          payment_method: string
          sessions_remaining: number
          sessions_total: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          package_id?: string
          payment_method?: string
          sessions_remaining?: number
          sessions_total?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "pt_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          quote: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          quote: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          quote?: string
          sort_order?: number
        }
        Relationships: []
      }
      pt_trainers: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          title: string | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_class: {
        Args: { p_class_date: string; p_schedule_id: string }
        Returns: {
          class_date: string
          created_at: string
          id: string
          is_free_trial: boolean
          schedule_id: string
          status: string
          user_id: string
        }
      }
      cancel_class_booking: {
        Args: { p_booking_id: string }
        Returns: {
          class_date: string
          created_at: string
          id: string
          is_free_trial: boolean
          schedule_id: string
          status: string
          user_id: string
        }
      }
      get_class_occurrences: {
        Args: { p_from: string; p_to: string }
        Returns: {
          booked_count: number
          capacity: number
          class_date: string
          description: string | null
          end_at: string
          name: string
          schedule_id: string
          start_at: string
          trainer_name: string | null
        }[]
      }
      book_pt_session: {
        Args: { p_end_at: string; p_start_at: string; p_trainer_id: string }
        Returns: {
          created_at: string
          end_at: string
          id: string
          notes: string | null
          purchase_id: string | null
          start_at: string
          status: string
          trainer_id: string
          user_id: string
        }
      }
      cancel_pt_booking: {
        Args: { p_booking_id: string }
        Returns: {
          created_at: string
          end_at: string
          id: string
          notes: string | null
          purchase_id: string | null
          start_at: string
          status: string
          trainer_id: string
          user_id: string
        }
      }
      get_open_pt_slots: {
        Args: { p_from: string; p_to: string; p_trainer_id: string }
        Returns: {
          end_at: string
          start_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      dismiss_pt_purchase_notice: { Args: { p_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Update"]
