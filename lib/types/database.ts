export type OperatorRole = 'owner' | 'staff';

export interface Operator {
  id: string;
  email: string;
  display_name: string | null;
  role: OperatorRole;
  created_at: string;
}

export interface TemplateConfig {
  layout?: 'grid' | 'diptych' | 'single';
  dimensions?: { width: number; height: number }; // In pixels or mm at 300 DPI
  margins?: { top: number; bottom: number; left: number; right: number };
  overlay_url?: string;
  thumbnail_url?: string;
  photo_slots?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }>;
  background_color?: string;
  branding_text?: string;
}

export interface Template {
  id: string;
  owner_id: string;
  name: string;
  config: TemplateConfig;
  created_at: string;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  template_id: string | null;
  is_active: boolean;
  price_per_session?: number;
  is_payment_enabled?: boolean;
  gallery_expires_at: string | null;
  created_at: string;
}

export type PrinterStatus = 'online' | 'offline' | 'error' | 'paper_low' | 'ink_low';

export interface Printer {
  id: string;
  event_id: string;
  name: string;
  daemon_hostname: string;
  status: PrinterStatus;
  is_backup: boolean;
  last_heartbeat_at: string | null;
}

export type SessionStatus = 'capturing' | 'processing' | 'completed' | 'failed';
export type PaymentStatus = 'pending' | 'paid' | 'bypassed';

export interface Session {
  id: string;
  event_id: string;
  session_code: string;
  customer_email?: string | null;
  status: SessionStatus;
  raw_photos: string[];
  composite_url: string | null;
  gif_url?: string | null;
  enhanced_url: string | null;
  payment_status?: PaymentStatus;
  payment_gateway_tx_id?: string | null;
  download_count: number;
  created_at: string;
}

export type PrintJobStatus = 'queued' | 'printing' | 'printed' | 'failed';

export interface PrintJob {
  id: string;
  session_id: string;
  event_id: string;
  printer_id: string | null;
  image_url: string;
  copies: number;
  status: PrintJobStatus;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  printed_at: string | null;
}
