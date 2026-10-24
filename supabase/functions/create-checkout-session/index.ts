// Starts a Dodo Payments checkout for the one-time First Take license.
// Called by the signed-in user from the checkout page; the user id travels
// in metadata so the webhook knows whose account the payment belongs to.
//
// Secrets: DODO_PAYMENTS_API_KEY, DODO_PRODUCT_ID, DODO_ENVIRONMENT
// ("test_mode" or "live_mode"), SITE_URL
// (SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase.)
import DodoPayments from 'npm:dodopayments@2.56.1';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const dodo = new DodoPayments({
  bearerToken: Deno.env.get('DODO_PAYMENTS_API_KEY')!,
  environment: Deno.env.get('DODO_ENVIRONMENT') === 'live_mode' ? 'live_mode' : 'test_mode',
});
const siteUrl = Deno.env.get('SITE_URL') ?? 'https://getfirsttake.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': siteUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: 'Sign in to buy First Take.' }, 401);

  // Already paid: don't take a second payment.
  const { data: lic } = await supabase.from('licenses').select('is_pro').eq('user_id', user.id).maybeSingle();
  if (lic?.is_pro) return json({ error: 'This account already has First Take.' }, 409);

  try {
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: Deno.env.get('DODO_PRODUCT_ID')!, quantity: 1 }],
      customer: { email: user.email!, name: user.user_metadata?.full_name ?? user.email! },
      metadata: { user_id: user.id },
      // Dodo appends ?payment_id=...&status=... to this URL.
      return_url: `${siteUrl}/checkout?paid=1`,
    });
    return json({ url: session.checkout_url });
  } catch (err) {
    console.error('Dodo checkout error:', err);
    return json({ error: 'Could not start checkout. Please try again.' }, 500);
  }
});
