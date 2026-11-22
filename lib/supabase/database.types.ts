
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ad_spend": {
                  Row: {
                    "amount_minor": number,"campaign": string | null,"channel": string,"created_at": string,"currency": string,"date": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"campaign"?: string | null,"channel": string,"created_at"?: string,"currency": string,"date": string,"id"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"campaign"?: string | null,"channel"?: string,"created_at"?: string,"currency"?: string,"date"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"after": Json | null,"at": string,"before": Json | null,"entity_id": string | null,"entity_type": string,"id": string,"staff_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity_id"?: string | null,"entity_type": string,"id"?: string,"staff_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity_id"?: string | null,"entity_type"?: string,"id"?: string,"staff_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"collections": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "all_drops_alerts": boolean,"auth_user_id": string | null,"country": string | null,"created_at": string,"drop_alert_consent": boolean,"drop_alert_consent_at": string | null,"drop_alert_consent_source": string | null,"email": string,"first_utm": Json | null,"id": string,"is_vip": boolean,"marketing_consent": boolean,"marketing_consent_at": string | null,"marketing_consent_source": string | null,"name": string | null,"phone": string | null,"prive_requested_at": string | null,"updated_at": string,"vip_approved_at": string | null,"vip_approved_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "all_drops_alerts"?: boolean,"auth_user_id"?: string | null,"country"?: string | null,"created_at"?: string,"drop_alert_consent"?: boolean,"drop_alert_consent_at"?: string | null,"drop_alert_consent_source"?: string | null,"email": string,"first_utm"?: Json | null,"id"?: string,"is_vip"?: boolean,"marketing_consent"?: boolean,"marketing_consent_at"?: string | null,"marketing_consent_source"?: string | null,"name"?: string | null,"phone"?: string | null,"prive_requested_at"?: string | null,"updated_at"?: string,"vip_approved_at"?: string | null,"vip_approved_by"?: string | null
                  }
                  Update: {
                    "all_drops_alerts"?: boolean,"auth_user_id"?: string | null,"country"?: string | null,"created_at"?: string,"drop_alert_consent"?: boolean,"drop_alert_consent_at"?: string | null,"drop_alert_consent_source"?: string | null,"email"?: string,"first_utm"?: Json | null,"id"?: string,"is_vip"?: boolean,"marketing_consent"?: boolean,"marketing_consent_at"?: string | null,"marketing_consent_source"?: string | null,"name"?: string | null,"phone"?: string | null,"prive_requested_at"?: string | null,"updated_at"?: string,"vip_approved_at"?: string | null,"vip_approved_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_vip_approved_by_fkey"
      columns: ["vip_approved_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"drop_notifications": {
                  Row: {
                    "attempts": number,"claimed_at": string | null,"created_at": string,"customer_id": string,"drop_id": string,"error": string | null,"id": string,"kind": string,"sent_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"claimed_at"?: string | null,"created_at"?: string,"customer_id": string,"drop_id": string,"error"?: string | null,"id"?: string,"kind": string,"sent_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "attempts"?: number,"claimed_at"?: string | null,"created_at"?: string,"customer_id"?: string,"drop_id"?: string,"error"?: string | null,"id"?: string,"kind"?: string,"sent_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drop_notifications_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drop_notifications_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    }
                  ]
                },"drop_products": {
                  Row: {
                    "drop_id": string,"product_id": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "drop_id": string,"product_id": string,"sort"?: number
                  }
                  Update: {
                    "drop_id"?: string,"product_id"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "drop_products_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drop_products_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"drop_slug_history": {
                  Row: {
                    "created_at": string,"drop_id": string,"id": string,"old_slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"drop_id": string,"id"?: string,"old_slug": string
                  }
                  Update: {
                    "created_at"?: string,"drop_id"?: string,"id"?: string,"old_slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drop_slug_history_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    }
                  ]
                },"drops": {
                  Row: {
                    "closes_at": string | null,"created_at": string,"hero_alt": string,"hero_storage_path": string | null,"id": string,"name": string,"on_close": string,"pitch": string,"public_opens_at": string,"published": boolean,"slug": string,"updated_at": string,"vip_limit_per_member": number | null,"vip_opens_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closes_at"?: string | null,"created_at"?: string,"hero_alt"?: string,"hero_storage_path"?: string | null,"id"?: string,"name": string,"on_close"?: string,"pitch"?: string,"public_opens_at": string,"published"?: boolean,"slug": string,"updated_at"?: string,"vip_limit_per_member"?: number | null,"vip_opens_at": string
                  }
                  Update: {
                    "closes_at"?: string | null,"created_at"?: string,"hero_alt"?: string,"hero_storage_path"?: string | null,"id"?: string,"name"?: string,"on_close"?: string,"pitch"?: string,"public_opens_at"?: string,"published"?: boolean,"slug"?: string,"updated_at"?: string,"vip_limit_per_member"?: number | null,"vip_opens_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"fx_rates": {
                  Row: {
                    "base": string,"id": string,"quote": string,"rate": number,"rounding_increment_minor": number | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "base": string,"id"?: string,"quote": string,"rate": number,"rounding_increment_minor"?: number | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "base"?: string,"id"?: string,"quote"?: string,"rate"?: number,"rounding_increment_minor"?: number | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fx_rates_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"measurements": {
                  Row: {
                    "bust_cm": number | null,"hip_cm": number | null,"id": string,"length_cm": number | null,"product_id": string,"size": string,"sort": number,"waist_cm": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bust_cm"?: number | null,"hip_cm"?: number | null,"id"?: string,"length_cm"?: number | null,"product_id": string,"size": string,"sort"?: number,"waist_cm"?: number | null
                  }
                  Update: {
                    "bust_cm"?: number | null,"hip_cm"?: number | null,"id"?: string,"length_cm"?: number | null,"product_id"?: string,"size"?: string,"sort"?: number,"waist_cm"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "measurements_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "body": string,"created_at": string,"entity_id": string,"entity_type": string,"id": string,"staff_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: string,"staff_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string,"staff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "colour": string,"id": string,"order_id": string,"product_name": string,"qty": number,"size": string,"sku": string,"unit_price_minor": number,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "colour": string,"id"?: string,"order_id": string,"product_name": string,"qty": number,"size": string,"sku": string,"unit_price_minor": number,"variant_id"?: string | null
                  }
                  Update: {
                    "colour"?: string,"id"?: string,"order_id"?: string,"product_name"?: string,"qty"?: number,"size"?: string,"sku"?: string,"unit_price_minor"?: number,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "channel": Database["public"]['Enums']["order_channel"],"courier": string | null,"created_at": string,"currency": string,"customer_id": string | null,"drop_id": string | null,"email": string,"id": string,"number": string,"paid_at": string | null,"phone": string | null,"provider": string | null,"provider_ref": string | null,"shipping_address": Json | null,"shipping_minor": number,"shipping_rate_id": string | null,"status": Database["public"]['Enums']["order_status"],"subtotal_minor": number,"total_minor": number,"tracking_number": string | null,"tracking_url": string | null,"updated_at": string,"utm": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "channel"?: Database["public"]['Enums']["order_channel"],"courier"?: string | null,"created_at"?: string,"currency": string,"customer_id"?: string | null,"drop_id"?: string | null,"email": string,"id"?: string,"number"?: string,"paid_at"?: string | null,"phone"?: string | null,"provider"?: string | null,"provider_ref"?: string | null,"shipping_address"?: Json | null,"shipping_minor"?: number,"shipping_rate_id"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal_minor": number,"total_minor": number,"tracking_number"?: string | null,"tracking_url"?: string | null,"updated_at"?: string,"utm"?: Json | null
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["order_channel"],"courier"?: string | null,"created_at"?: string,"currency"?: string,"customer_id"?: string | null,"drop_id"?: string | null,"email"?: string,"id"?: string,"number"?: string,"paid_at"?: string | null,"phone"?: string | null,"provider"?: string | null,"provider_ref"?: string | null,"shipping_address"?: Json | null,"shipping_minor"?: number,"shipping_rate_id"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal_minor"?: number,"total_minor"?: number,"tracking_number"?: string | null,"tracking_url"?: string | null,"updated_at"?: string,"utm"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_shipping_rate_id_fkey"
      columns: ["shipping_rate_id"]
isOneToOne: false
      referencedRelation: "shipping_rates"
      referencedColumns: ["id"]
    }
                  ]
                },"pages": {
                  Row: {
                    "body": string,"id": string,"published": boolean,"slug": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"id"?: string,"published"?: boolean,"slug": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"id"?: string,"published"?: boolean,"slug"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payment_events": {
                  Row: {
                    "event_type": string,"id": string,"payload": NonNullable<Json>,"provider": string,"provider_ref": string,"received_at": string,"signature_valid": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "event_type": string,"id"?: string,"payload": NonNullable<Json>,"provider": string,"provider_ref": string,"received_at"?: string,"signature_valid": boolean
                  }
                  Update: {
                    "event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"provider"?: string,"provider_ref"?: string,"received_at"?: string,"signature_valid"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"prive_sessions": {
                  Row: {
                    "created_at": string,"customer_id": string,"drop_id": string | null,"expires_at": string,"id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id": string,"drop_id"?: string | null,"expires_at": string,"id"?: string,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"drop_id"?: string | null,"expires_at"?: string,"id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prive_sessions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prive_sessions_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    }
                  ]
                },"product_media": {
                  Row: {
                    "alt": string,"created_at": string,"duration_sec": number | null,"effect": string,"focus": string | null,"id": string,"label": string,"mux_asset_id": string | null,"mux_playback_id": string | null,"mux_upload_id": string | null,"product_id": string,"sort": number,"status": string,"storage_path": string | null,"type": Database["public"]['Enums']["media_type"],"zoom": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alt": string,"created_at"?: string,"duration_sec"?: number | null,"effect"?: string,"focus"?: string | null,"id"?: string,"label"?: string,"mux_asset_id"?: string | null,"mux_playback_id"?: string | null,"mux_upload_id"?: string | null,"product_id": string,"sort"?: number,"status"?: string,"storage_path"?: string | null,"type": Database["public"]['Enums']["media_type"],"zoom"?: number
                  }
                  Update: {
                    "alt"?: string,"created_at"?: string,"duration_sec"?: number | null,"effect"?: string,"focus"?: string | null,"id"?: string,"label"?: string,"mux_asset_id"?: string | null,"mux_playback_id"?: string | null,"mux_upload_id"?: string | null,"product_id"?: string,"sort"?: number,"status"?: string,"storage_path"?: string | null,"type"?: Database["public"]['Enums']["media_type"],"zoom"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_media_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_slug_history": {
                  Row: {
                    "created_at": string,"id": string,"old_slug": string,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"old_slug": string,"product_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"old_slug"?: string,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_slug_history_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "base_amount_minor": number | null,"base_currency": string | null,"care": string,"collection_id": string | null,"created_at": string,"delivery_timing": string,"description": string,"fabric": string,"fit_notes": string,"id": string,"name": string,"pricing_mode": Database["public"]['Enums']["pricing_mode"],"published_at": string | null,"slug": string,"status": Database["public"]['Enums']["product_status"],"tagline": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_amount_minor"?: number | null,"base_currency"?: string | null,"care"?: string,"collection_id"?: string | null,"created_at"?: string,"delivery_timing"?: string,"description"?: string,"fabric"?: string,"fit_notes"?: string,"id"?: string,"name": string,"pricing_mode"?: Database["public"]['Enums']["pricing_mode"],"published_at"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["product_status"],"tagline"?: string,"updated_at"?: string
                  }
                  Update: {
                    "base_amount_minor"?: number | null,"base_currency"?: string | null,"care"?: string,"collection_id"?: string | null,"created_at"?: string,"delivery_timing"?: string,"description"?: string,"fabric"?: string,"fit_notes"?: string,"id"?: string,"name"?: string,"pricing_mode"?: Database["public"]['Enums']["pricing_mode"],"published_at"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["product_status"],"tagline"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    }
                  ]
                },"restock_requests": {
                  Row: {
                    "created_at": string,"customer_id": string,"id": string,"notified_at": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id": string,"id"?: string,"notified_at"?: string | null,"variant_id": string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"id"?: string,"notified_at"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "restock_requests_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "restock_requests_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_rates": {
                  Row: {
                    "active": boolean,"amount_minor": number,"currency": string,"eta_text": string,"id": string,"name": string,"sort": number,"zone_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount_minor": number,"currency": string,"eta_text"?: string,"id"?: string,"name": string,"sort"?: number,"zone_id": string
                  }
                  Update: {
                    "active"?: boolean,"amount_minor"?: number,"currency"?: string,"eta_text"?: string,"id"?: string,"name"?: string,"sort"?: number,"zone_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipping_rates_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "shipping_zones"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_zones": {
                  Row: {
                    "countries": (string)[],"id": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "countries"?: (string)[],"id"?: string,"name": string,"sort"?: number
                  }
                  Update: {
                    "countries"?: (string)[],"id"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"staff": {
                  Row: {
                    "active": boolean,"auth_user_id": string,"created_at": string,"email": string,"id": string,"name": string,"role": Database["public"]['Enums']["staff_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"auth_user_id": string,"created_at"?: string,"email": string,"id"?: string,"name": string,"role": Database["public"]['Enums']["staff_role"]
                  }
                  Update: {
                    "active"?: boolean,"auth_user_id"?: string,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string,"role"?: Database["public"]['Enums']["staff_role"]
                  }
                  Relationships: [
                    
                  ]
                },"stock_reservations": {
                  Row: {
                    "consumed_at": string | null,"created_at": string,"expires_at": string,"id": string,"order_id": string,"qty": number,"released_at": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consumed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"order_id": string,"qty": number,"released_at"?: string | null,"variant_id": string
                  }
                  Update: {
                    "consumed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"order_id"?: string,"qty"?: number,"released_at"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_reservations_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_reservations_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                },"variant_prices": {
                  Row: {
                    "amount_minor": number,"currency": string,"id": string,"product_id": string,"updated_at": string,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"currency": string,"id"?: string,"product_id": string,"updated_at"?: string,"variant_id"?: string | null
                  }
                  Update: {
                    "amount_minor"?: number,"currency"?: string,"id"?: string,"product_id"?: string,"updated_at"?: string,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "variant_prices_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "variant_prices_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "variants"
      referencedColumns: ["id"]
    }
                  ]
                },"variants": {
                  Row: {
                    "colour": string,"colour_hex": string | null,"created_at": string,"id": string,"product_id": string,"reserved_public_qty": number,"size": string,"sku": string,"sort": number,"stock_on_hand": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "colour": string,"colour_hex"?: string | null,"created_at"?: string,"id"?: string,"product_id": string,"reserved_public_qty"?: number,"size": string,"sku": string,"sort"?: number,"stock_on_hand"?: number,"updated_at"?: string
                  }
                  Update: {
                    "colour"?: string,"colour_hex"?: string | null,"created_at"?: string,"id"?: string,"product_id"?: string,"reserved_public_qty"?: number,"size"?: string,"sku"?: string,"sort"?: number,"stock_on_hand"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"vip_access_links": {
                  Row: {
                    "created_at": string,"created_by": string | null,"customer_id": string,"drop_id": string | null,"expires_at": string,"id": string,"revoked_at": string | null,"token_hash": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"customer_id": string,"drop_id"?: string | null,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"token_hash": string,"used_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"drop_id"?: string | null,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"token_hash"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vip_access_links_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vip_access_links_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vip_access_links_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    }
                  ]
                },"waitlist_entries": {
                  Row: {
                    "colour": string | null,"created_at": string,"customer_id": string,"id": string,"product_id": string,"size": string | null,"source_utm": Json | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "colour"?: string | null,"created_at"?: string,"customer_id": string,"id"?: string,"product_id": string,"size"?: string | null,"source_utm"?: Json | null,"updated_at"?: string
                  }
                  Update: {
                    "colour"?: string | null,"created_at"?: string,"customer_id"?: string,"id"?: string,"product_id"?: string,"size"?: string | null,"source_utm"?: Json | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "waitlist_entries_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "waitlist_entries_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_add_staff":
{ Args: { "p_email": string,"p_name": string,"p_role": Database["public"]['Enums']["staff_role"] }; Returns: string
                           },
"admin_approve_vip_emails":
{ Args: { "p_emails": (string)[] }; Returns: number
                           },
"admin_audit_log":
{ Args: { "p_entity_type"?: string,"p_limit"?: number }; Returns: {
              "action": string,"after": Json,"at": string,"before": Json,"entity_id": string,"entity_label": string,"entity_type": string,"id": string,"staff_email": string,"staff_name": string
            }[]
                           },
"admin_create_access_link":
{ Args: { "p_customer_id": string,"p_drop_id"?: string,"p_expires_at": string,"p_token_hash": string }; Returns: string
                           },
"admin_customer":
{ Args: { "p_id": string }; Returns: Json
                           },
"admin_customers":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_product_id"?: string,"p_purchased"?: boolean,"p_search"?: string,"p_vip"?: boolean }; Returns: Json
                           },
"admin_customers_export":
{ Args: { "p_product_id"?: string,"p_purchased"?: boolean,"p_search"?: string,"p_vip"?: boolean }; Returns: Json
                           },
"admin_delete_drop":
{ Args: { "p_id": string }; Returns: undefined
                           },
"admin_drop":
{ Args: { "p_id": string }; Returns: Json
                           },
"admin_drops":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_prive_members":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_product":
{ Args: { "p_id": string }; Returns: Json
                           },
"admin_products":
{ Args: { "p_status"?: Database["public"]['Enums']["product_status"] }; Returns: {
              "collection_name": string,"cover_path": string,"id": string,"name": string,"slug": string,"sold_out": boolean,"status": Database["public"]['Enums']["product_status"],"updated_at": string,"variant_count": number
            }[]
                           },
"admin_reorder_media":
{ Args: { "p_ids": (string)[],"p_product_id": string }; Returns: Json
                           },
"admin_report":
{ Args: { "p_from": string,"p_to": string }; Returns: Json
                           },
"admin_revoke_access_link":
{ Args: { "p_link_id": string }; Returns: boolean
                           },
"admin_save_drop":
{ Args: { "p_data": Json,"p_id"?: string }; Returns: string
                           },
"admin_save_variants":
{ Args: { "p_product_id": string,"p_variants": Json }; Returns: Json
                           },
"admin_set_drop_products":
{ Args: { "p_drop_id": string,"p_product_ids": (string)[] }; Returns: undefined
                           },
"admin_set_measurements":
{ Args: { "p_product_id": string,"p_rows": Json }; Returns: Json
                           },
"admin_set_order_status":
{ Args: { "p_courier"?: string,"p_order_id": string,"p_to": Database["public"]['Enums']["order_status"],"p_tracking_number"?: string,"p_tracking_url"?: string }; Returns: Database["public"]['Enums']["order_status"]
                           },
"admin_set_prices":
{ Args: { "p_prices": Json,"p_product_id": string }; Returns: Json
                           },
"admin_set_vip":
{ Args: { "p_customer_ids": (string)[],"p_is_vip": boolean }; Returns: number
                           },
"attach_payment_ref":
{ Args: { "p_order_id": string,"p_provider": string,"p_provider_ref": string }; Returns: undefined
                           },
"can_purchase":
{ Args: { "p_customer_id": string,"p_product_id": string,"p_qty"?: number }; Returns: {
              "allowed": boolean,"channel": Database["public"]['Enums']["order_channel"],"drop_id": string,"reason": string
            }[]
                           },
"check_add_to_cart":
{ Args: { "p_prive_customer_id": string,"p_qty": number,"p_variant_id": string }; Returns: undefined
                           },
"claim_drop_notifications":
{ Args: { "p_limit"?: number }; Returns: {
              "customer_id": string,"drop_id": string,"drop_name": string,"drop_pitch": string,"email": string,"id": string,"kind": string,"name": string,"public_opens_at": string,"vip_opens_at": string
            }[]
                           },
"complete_drop_notification":
{ Args: { "p_error"?: string,"p_id": string,"p_retry"?: boolean }; Returns: undefined
                           },
"create_checkout":
{ Args: { "p_address": Json,"p_currency": string,"p_email": string,"p_items": Json,"p_phone": string,"p_prive_customer_id": string,"p_shipping_rate_id": string,"p_utm": Json }; Returns: string
                           },
"current_customer_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_staff":
{ Args: Record<PropertyKey, never>; Returns: {
              "email": string,"id": string,"name": string,"role": Database["public"]['Enums']["staff_role"]
            }[]
                           },
"drop_state":
{ Args: { "p_drop_id": string }; Returns: string
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"is_staff":
{ Args: { "roles"?: (Database["public"]['Enums']["staff_role"])[] }; Returns: boolean
                           },
"join_drop_alerts":
{ Args: { "p_drop_alert_consent"?: boolean,"p_email": string,"p_marketing_consent"?: boolean,"p_utm"?: Json }; Returns: undefined
                           },
"join_waitlist":
{ Args: { "p_colour"?: string,"p_drop_alert_consent"?: boolean,"p_email": string,"p_marketing_consent"?: boolean,"p_name"?: string,"p_phone"?: string,"p_product_id": string,"p_size"?: string,"p_utm"?: Json }; Returns: string
                           },
"mark_order_paid":
{ Args: { "p_amount_minor": number,"p_currency": string,"p_event_type": string,"p_payload": Json,"p_provider": string,"p_provider_ref": string }; Returns: string
                           },
"prive_session_customer":
{ Args: { "p_session_hash": string }; Returns: string
                           },
"record_customer_export":
{ Args: { "p_filters"?: Json,"p_row_count": number }; Returns: undefined
                           },
"redeem_access_link":
{ Args: { "p_link_hash": string,"p_session_hash": string }; Returns: Json
                           },
"release_expired_reservations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"release_order":
{ Args: { "p_order_id": string }; Returns: boolean
                           },
"request_prive_access":
{ Args: { "p_drop_alert_consent"?: boolean,"p_email": string,"p_name"?: string,"p_phone"?: string }; Returns: undefined
                           },
"request_restock":
{ Args: { "p_email": string,"p_variant_id": string }; Returns: string
                           },
"server_now":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"storefront_drop":
{ Args: { "p_slug": string }; Returns: Json
                           },
"storefront_drops":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"storefront_product":
{ Args: { "p_slug": string }; Returns: Json
                           },
"storefront_products":
{ Args: Record<PropertyKey, never>; Returns: {
              "collection_name": string,"collection_slug": string,"cover_alt": string,"cover_path": string,"drop_id": string,"drop_name": string,"drop_state": string,"id": string,"name": string,"prices": Json,"public_opens_at": string,"published_at": string,"section": string,"slug": string,"sold_out": boolean,"vip_opens_at": string
            }[]
                           },
"variant_price_minor":
{ Args: { "p_currency": string,"p_variant_id": string }; Returns: number
                           }
          }
          Enums: {
            "media_type": "image"|"video","order_channel": "vip"|"public","order_status": "pending_payment"|"paid"|"processing"|"dispatched"|"delivered"|"cancelled"|"refunded","pricing_mode": "fixed"|"fx","product_status": "draft"|"published","staff_role": "owner"|"manager"|"merchandiser"|"fulfilment"|"support"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "media_type": ["image", "video"],"order_channel": ["vip", "public"],"order_status": ["pending_payment", "paid", "processing", "dispatched", "delivered", "cancelled", "refunded"],"pricing_mode": ["fixed", "fx"],"product_status": ["draft", "published"],"staff_role": ["owner", "manager", "merchandiser", "fulfilment", "support"]
          }
        }
} as const
