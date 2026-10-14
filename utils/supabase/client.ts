import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dgxfvntlgnrcluhlbdbd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_oWJ4AL2V8rLO7YXr3LA3iA_3vRrHrCv';

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);

export const supabase = createClient();
