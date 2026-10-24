// Stripe -> Supabase: the only writer of public.licenses.
// A paid Checkout turns Pro on for the user in client_reference_id; a full
// refund (the 14-day guarantee) turns it off again.
//
// Deploy with --no-verify-jwt: Stripe signs requests itself and has no
// Supabase token.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.)
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function grantPro(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  if (!userId) throw new Error(`Checkout ${session.id} has no user id`);
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const { error } = await admin.from('licenses').upsert(
    {
      user_id: userId,
      is_pro: true,
      tier: 'Lifetime',
      activated_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId ?? null,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

async function revokePro(charge: Stripe.Charge) {
  if (!charge.refunded) return; // partial refunds keep the license
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const { error } = await admin
    .from('licenses')
    .update({ is_pro: false, tier: 'Refunded' })
    .eq('stripe_payment_intent_id', paymentIntentId);
  if (error) throw error;
}

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error('Webhook signature check failed:', err);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') await grantPro(session);
        break;
      }
      case 'charge.refunded':
        await revokePro(event.data.object as Stripe.Charge);
        break;
    }
  } catch (err) {
    // 500 makes Stripe retry the event later.
    console.error(`Handling ${event.type} failed:`, err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
