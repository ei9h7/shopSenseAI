export interface Message {
  id: string
  phone_number: string
  body: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  processed: boolean
  ai_response?: string
  intent?: string
  action?: string
  created_at: string
}

export interface BusinessSettings {
  id: string
  business_name: string
  labor_rate: number
  phone_number: string
  business_number?: string
  gst_setting: 'parts' | 'labor' | 'both' | 'none'
  openai_api_key?: string
  openphone_api_key?: string
  dnd_enabled?: boolean
  created_at: string
  updated_at: string
}

export interface AIResponse {
  reply: string
  intent: string
  action: string
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}