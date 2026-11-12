export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UnitType = 'HEADQUARTERS' | 'BRANCH';
export type GlobalRole = 'SUPERADMIN' | 'CORPORATE_MANAGER' | 'STANDARD_USER';
export type UnitRole = 'UNIT_MANAGER' | 'STOCK_OPERATOR' | 'UNIT_AUDITOR';
export type InvoiceStatus = 'PENDING_CONFERENCE' | 'CONFIRMED' | 'CANCELLED';
export type StockMovementType =
  | 'INVOICE_ENTRY'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'INVENTORY_ADJUSTMENT_POS'
  | 'INVENTORY_ADJUSTMENT_NEG'
  | 'WRITE_OFF';
export type TransferStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKING'
  | 'IN_TRANSIT'
  | 'RECEIVED_COMPLETE'
  | 'RECEIVED_WITH_DIVERGENCE'
  | 'CANCELLED';
export type DivergenceType = 'SHORTAGE' | 'EXCESS' | 'DAMAGED_IN_TRANSIT';
export type QuarantineStatus =
  | 'PENDING_AUTHORIZATION'
  | 'AUTHORIZED_INCORPORATED'
  | 'REJECTED_RETURNED'
  | 'WRITTEN_OFF';

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          corporate_name: string;
          trade_name: string;
          tax_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          corporate_name: string;
          trade_name: string;
          tax_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          corporate_name?: string;
          trade_name?: string;
          tax_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      units: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          city: string;
          state: string;
          state_code: string;
          unit_type: UnitType;
          tax_id: string | null;
          address: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          name: string;
          city: string;
          state: string;
          state_code: string;
          unit_type: UnitType;
          tax_id?: string | null;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          code?: string;
          name?: string;
          city?: string;
          state?: string;
          state_code?: string;
          unit_type?: UnitType;
          tax_id?: string | null;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          default_unit_id: string;
          global_role: GlobalRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          default_unit_id: string;
          global_role?: GlobalRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          default_unit_id?: string;
          global_role?: GlobalRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      unit_permissions: {
        Row: {
          id: string;
          profile_id: string;
          unit_id: string;
          unit_role: UnitRole;
          can_import_invoices: boolean;
          can_request_transfers: boolean;
          can_approve_transfers: boolean;
          can_dispatch_transfers: boolean;
          can_receive_transfers: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          unit_id: string;
          unit_role?: UnitRole;
          can_import_invoices?: boolean;
          can_request_transfers?: boolean;
          can_approve_transfers?: boolean;
          can_dispatch_transfers?: boolean;
          can_receive_transfers?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          unit_id?: string;
          unit_role?: UnitRole;
          can_import_invoices?: boolean;
          can_request_transfers?: boolean;
          can_approve_transfers?: boolean;
          can_dispatch_transfers?: boolean;
          can_receive_transfers?: boolean;
          created_at?: string;
        };
      };
      sectors: {
        Row: {
          id: string;
          unit_id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          sku: string;
          barcode: string | null;
          name: string;
          category: string | null;
          unit_of_measure: string;
          minimum_stock_boxes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          sku: string;
          barcode?: string | null;
          name: string;
          category?: string | null;
          unit_of_measure?: string;
          minimum_stock_boxes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          sku?: string;
          barcode?: string | null;
          name?: string;
          category?: string | null;
          unit_of_measure?: string;
          minimum_stock_boxes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_aliases: {
        Row: {
          id: string;
          product_id: string;
          supplier_tax_id: string | null;
          supplier_product_code: string;
          supplier_product_name: string;
          confidence_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          supplier_tax_id?: string | null;
          supplier_product_code: string;
          supplier_product_name: string;
          confidence_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          supplier_tax_id?: string | null;
          supplier_product_code?: string;
          supplier_product_name?: string;
          confidence_score?: number;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          unit_id: string;
          access_key: string;
          invoice_number: string;
          invoice_series: string;
          issue_date: string;
          issuer_name: string;
          issuer_tax_id: string;
          recipient_tax_id: string | null;
          total_value: number;
          pdf_storage_path: string;
          status: InvoiceStatus;
          uploaded_by: string;
          confirmed_by: string | null;
          confirmed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          access_key: string;
          invoice_number: string;
          invoice_series?: string;
          issue_date: string;
          issuer_name: string;
          issuer_tax_id: string;
          recipient_tax_id?: string | null;
          total_value?: number;
          pdf_storage_path: string;
          status?: InvoiceStatus;
          uploaded_by: string;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          access_key?: string;
          invoice_number?: string;
          invoice_series?: string;
          issue_date?: string;
          issuer_name?: string;
          issuer_tax_id?: string;
          recipient_tax_id?: string | null;
          total_value?: number;
          pdf_storage_path?: string;
          status?: InvoiceStatus;
          uploaded_by?: string;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          item_index: number;
          product_id: string | null;
          raw_product_code: string;
          raw_product_name: string;
          raw_ncm: string | null;
          raw_unit: string;
          raw_quantity: number;
          converted_boxes: number;
          unit_price: number;
          total_item_value: number;
          is_matched: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          item_index: number;
          product_id?: string | null;
          raw_product_code: string;
          raw_product_name: string;
          raw_ncm?: string | null;
          raw_unit: string;
          raw_quantity: number;
          converted_boxes?: number;
          unit_price?: number;
          total_item_value?: number;
          is_matched?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          item_index?: number;
          product_id?: string | null;
          raw_product_code?: string;
          raw_product_name?: string;
          raw_ncm?: string | null;
          raw_unit?: string;
          raw_quantity?: number;
          converted_boxes?: number;
          unit_price?: number;
          total_item_value?: number;
          is_matched?: boolean;
          created_at?: string;
        };
      };
      inventory_lots: {
        Row: {
          id: string;
          unit_id: string;
          sector_id: string;
          product_id: string;
          invoice_id: string;
          invoice_item_id: string;
          parent_lot_id: string | null;
          origin_unit_id: string;
          transfer_id: string | null;
          lot_number: string | null;
          manufacturing_date: string | null;
          expiration_date: string | null;
          initial_boxes: number;
          current_boxes: number;
          reserved_boxes: number;
          available_boxes: number;
          box_condition_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          sector_id: string;
          product_id: string;
          invoice_id: string;
          invoice_item_id: string;
          parent_lot_id?: string | null;
          origin_unit_id: string;
          transfer_id?: string | null;
          lot_number?: string | null;
          manufacturing_date?: string | null;
          expiration_date?: string | null;
          initial_boxes: number;
          current_boxes: number;
          reserved_boxes?: number;
          box_condition_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          sector_id?: string;
          product_id?: string;
          invoice_id?: string;
          invoice_item_id?: string;
          parent_lot_id?: string | null;
          origin_unit_id?: string;
          transfer_id?: string | null;
          lot_number?: string | null;
          manufacturing_date?: string | null;
          expiration_date?: string | null;
          initial_boxes?: number;
          current_boxes?: number;
          reserved_boxes?: number;
          box_condition_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stock_reservations: {
        Row: {
          id: string;
          lot_id: string;
          unit_id: string;
          product_id: string;
          transfer_id: string | null;
          reserved_boxes: number;
          status: 'ACTIVE' | 'DISPATCHED' | 'RELEASED_CANCELLED';
          created_by: string;
          created_at: string;
          released_at: string | null;
          release_reason: string | null;
        };
        Insert: {
          id?: string;
          lot_id: string;
          unit_id: string;
          product_id: string;
          transfer_id?: string | null;
          reserved_boxes: number;
          status?: 'ACTIVE' | 'DISPATCHED' | 'RELEASED_CANCELLED';
          created_by: string;
          created_at?: string;
          released_at?: string | null;
          release_reason?: string | null;
        };
        Update: {
          id?: string;
          lot_id?: string;
          unit_id?: string;
          product_id?: string;
          transfer_id?: string | null;
          reserved_boxes?: number;
          status?: 'ACTIVE' | 'DISPATCHED' | 'RELEASED_CANCELLED';
          created_by?: string;
          created_at?: string;
          released_at?: string | null;
          release_reason?: string | null;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          unit_id: string;
          lot_id: string;
          product_id: string;
          sector_id: string;
          movement_type: StockMovementType;
          quantity_boxes: number;
          balance_after_boxes: number;
          reference_id: string;
          reference_type: string;
          reason: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          lot_id: string;
          product_id: string;
          sector_id: string;
          movement_type: StockMovementType;
          quantity_boxes: number;
          balance_after_boxes: number;
          reference_id: string;
          reference_type: string;
          reason: string;
          created_by: string;
          created_at?: string;
        };
        Update: never; // Imutável
      };
      stock_balances: {
        Row: {
          id: string;
          unit_id: string;
          product_id: string;
          sector_id: string;
          physical_boxes: number;
          reserved_boxes: number;
          available_boxes: number;
          in_transit_boxes: number;
          last_movement_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          product_id: string;
          sector_id: string;
          physical_boxes?: number;
          reserved_boxes?: number;
          in_transit_boxes?: number;
          last_movement_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          product_id?: string;
          sector_id?: string;
          physical_boxes?: number;
          reserved_boxes?: number;
          in_transit_boxes?: number;
          last_movement_at?: string;
          updated_at?: string;
        };
      };
      transfers: {
        Row: {
          id: string;
          transfer_code: string;
          source_unit_id: string;
          destination_unit_id: string;
          status: TransferStatus;
          requested_by: string;
          requested_at: string;
          approved_by: string | null;
          approved_at: string | null;
          dispatched_by: string | null;
          dispatched_at: string | null;
          received_by: string | null;
          received_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          transfer_code: string;
          source_unit_id: string;
          destination_unit_id: string;
          status?: TransferStatus;
          requested_by: string;
          requested_at?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          dispatched_by?: string | null;
          dispatched_at?: string | null;
          received_by?: string | null;
          received_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          transfer_code?: string;
          source_unit_id?: string;
          destination_unit_id?: string;
          status?: TransferStatus;
          requested_by?: string;
          requested_at?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          dispatched_by?: string | null;
          dispatched_at?: string | null;
          received_by?: string | null;
          received_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transfer_items: {
        Row: {
          id: string;
          transfer_id: string;
          product_id: string;
          requested_boxes: number;
          approved_boxes: number;
          dispatched_boxes: number;
          received_boxes: number;
          divergence_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transfer_id: string;
          product_id: string;
          requested_boxes: number;
          approved_boxes?: number;
          dispatched_boxes?: number;
          received_boxes?: number;
          divergence_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transfer_id?: string;
          product_id?: string;
          requested_boxes?: number;
          approved_boxes?: number;
          dispatched_boxes?: number;
          received_boxes?: number;
          divergence_notes?: string | null;
          created_at?: string;
        };
      };
      transfer_allocations: {
        Row: {
          id: string;
          transfer_item_id: string;
          transfer_id: string;
          lot_id: string;
          unit_id: string;
          product_id: string;
          allocated_boxes: number;
          allocated_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          transfer_item_id: string;
          transfer_id: string;
          lot_id: string;
          unit_id: string;
          product_id: string;
          allocated_boxes: number;
          allocated_by: string;
          created_at?: string;
        };
        Update: never;
      };
      transfer_divergences: {
        Row: {
          id: string;
          transfer_id: string;
          transfer_item_id: string;
          unit_id: string;
          product_id: string;
          divergence_type: DivergenceType;
          expected_boxes: number;
          received_boxes: number;
          divergence_boxes: number;
          quarantine_sector_id: string | null;
          quarantine_status: QuarantineStatus;
          reported_by: string;
          reported_at: string;
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_notes: string | null;
        };
        Insert: {
          id?: string;
          transfer_id: string;
          transfer_item_id: string;
          unit_id: string;
          product_id: string;
          divergence_type: DivergenceType;
          expected_boxes: number;
          received_boxes: number;
          divergence_boxes: number;
          quarantine_sector_id?: string | null;
          quarantine_status?: QuarantineStatus;
          reported_by: string;
          reported_at?: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
        };
        Update: {
          id?: string;
          transfer_id?: string;
          transfer_item_id?: string;
          unit_id?: string;
          product_id?: string;
          divergence_type?: DivergenceType;
          expected_boxes?: number;
          received_boxes?: number;
          divergence_boxes?: number;
          quarantine_sector_id?: string | null;
          quarantine_status?: QuarantineStatus;
          reported_by?: string;
          reported_at?: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
        };
      };
      transfer_status_history: {
        Row: {
          id: string;
          transfer_id: string;
          from_status: TransferStatus | null;
          to_status: TransferStatus;
          changed_by: string;
          unit_id: string;
          reason: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          transfer_id: string;
          from_status?: TransferStatus | null;
          to_status: TransferStatus;
          changed_by: string;
          unit_id: string;
          reason: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: never; // Imutável
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          unit_id: string | null;
          table_name: string;
          record_id: string;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          unit_id?: string | null;
          table_name: string;
          record_id: string;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never; // Imutável
      };
    };
    Functions: {
      validate_nfe_access_key_mod11: {
        Args: { p_key: string };
        Returns: boolean;
      };
      has_unit_permission: {
        Args: { p_unit_id: string; p_permission_name: string };
        Returns: boolean;
      };
      rpc_confirm_invoice_entry: {
        Args: {
          p_invoice_id: string;
          p_sector_id: string;
          p_items_mapping: Json;
        };
        Returns: Json;
      };
      rpc_request_transfer: {
        Args: {
          p_destination_unit_id: string;
          p_source_unit_id: string;
          p_items: Json;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      rpc_approve_transfer: {
        Args: {
          p_transfer_id: string;
          p_approved_items: Json;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      rpc_allocate_and_reserve: {
        Args: {
          p_transfer_id: string;
          p_allocations: Json;
        };
        Returns: Json;
      };
      rpc_dispatch_transfer: {
        Args: { p_transfer_id: string };
        Returns: Json;
      };
      rpc_receive_transfer: {
        Args: {
          p_transfer_id: string;
          p_received_items: Json;
          p_divergence_notes?: string | null;
        };
        Returns: Json;
      };
      rpc_cancel_transfer: {
        Args: { p_transfer_id: string; p_reason: string };
        Returns: Json;
      };
      rpc_inventory_adjustment: {
        Args: {
          p_unit_id: string;
          p_lot_id: string;
          p_boxes: number;
          p_reason: string;
        };
        Returns: Json;
      };
      rpc_write_off: {
        Args: {
          p_unit_id: string;
          p_lot_id: string;
          p_boxes: number;
          p_reason: string;
        };
        Returns: Json;
      };
      reconcile_and_verify_stock: {
        Args: { p_unit_id: string };
        Returns: {
          unit_id: string;
          product_id: string;
          sector_id: string;
          lots_physical_boxes: number;
          balance_physical_boxes: number;
          ledger_physical_boxes: number;
          lots_reserved_boxes: number;
          balance_reserved_boxes: number;
          in_transit_boxes: number;
          divergence_type: string;
          has_divergence: boolean;
        }[];
      };
    };
  };
}
