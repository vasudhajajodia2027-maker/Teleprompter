// Starts a Stripe Checkout for the one-time First Take license.
// Called by the signed-in user from the checkout page; the user id travels
// in client_reference_id so the webhook knows whose license to turn on.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL
// (SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase.)
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
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

  // Already Pro: don't take a second payment.
  const { data: lic } = await supabase.from('licenses').select('is_pro').eq('user_id', user.id).maybeSingle();
  if (lic?.is_pro) return json({ error: 'This account already has First Take.' }, 409);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: Deno.env.get('STRIPE_PRICE_ID')!, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { user_id: user.id },
      payment_intent_data: { metadata: { user_id: user.id } },
      success_url: `${siteUrl}/checkout?paid=1`,
      cancel_url: `${siteUrl}/checkout`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return json({ error: 'Could not start checkout. Please try again.' }, 500);
  }
});
