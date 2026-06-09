export interface SubscriptionResponse {
  id: string;
  subscriber_id: string;
  avatar_id: string;
  subscribed_at: string;
  is_active: boolean;
  expires_at: string | null;
}

export interface SubscriptionStatusResponse {
  subscribed: boolean;
  subscription: SubscriptionResponse | null;
}

export interface SubscriptionListResponse {
  subscriptions: SubscriptionResponse[];
  total: number;
}

export interface InsufficientCreditsError {
  error: 'insufficient_credits';
  required: number;
  available: number;
  message: string;
}
