import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  AI: any;
  VECTOR_INDEX: any; // Vectorize index binding
}

export interface IRequest extends Request {
  user?: any; // The decoded JWT user from Supabase
  supabase?: SupabaseClient<Database>;
}
