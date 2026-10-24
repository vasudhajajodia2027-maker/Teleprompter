// Dodo Payments -> Supabase: the only writer of public.licenses.
// A succeeded payment marks the buyer's account (metadata.user_id) as paid;
// a full refund (the 14-day guarantee) takes it away again.
//
// Deploy with --no-verify-jwt: Dodo signs requests itself (Standard
// Webhooks) and has no Supabase token.
// Secrets: DODO_PAYMENTS_API_KEY, DODO_WEBHOOK_SECRET, DODO_ENVIRONMENT
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.)
import DodoPayments from 'npm:dodopayments@2.56.1';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const dodo = new DodoPayments({
  bearerToken: Deno.env.get('DODO_PAYMENTS_API_KEY')!,
  webhookKey: Deno.env.get('DODO_WEBHOOK_SECRET')!,
  environment: Deno.env.get('DODO_ENVIRONMENT') === 'live_mode' ? 'live_mode' : 'test_mode',
});
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.text();
  let event: ReturnType<typeof dodo.webhooks.unwrap>;
  try {
    event = dodo.webhooks.unwrap(body, {
      headers: {
        'webhook-id': req.headers.get('webhook-id') ?? '',
        'webhook-signature': req.headers.get('webhook-signature') ?? '',
        'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      },
    });
  } catch (err) {
    console.error('Webhook signature check failed:', err);
    return new Response('Bad signature', { status: 401 });
  }

  try {
    if (event.type === 'payment.succeeded') {
      const payment = event.data;
      const userId = payment.metadata?.user_id;
      if (!userId) throw new Error(`Payment ${payment.payment_id} has no user_id in metadata`);
      const { error } = await admin.from('licenses').upsert(
        {
          user_id: userId,
          is_pro: true,
          tier: 'Lifetime',
          activated_at: new Date().toISOString(),
          dodo_payment_id: payment.payment_id,
          amount_paid: payment.total_amount,
          currency: payment.currency,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
    } else if (event.type === 'refund.succeeded' && !event.data.is_partial) {
      const { error } = await admin
        .from('licenses')
        .update({ is_pro: false, tier: 'Refunded' })
        .eq('dodo_payment_id', event.data.payment_id);
      if (error) throw error;
    }
  } catch (err) {
    // A non-2xx response makes Dodo retry the event later.
    console.error(`Handling ${event.type} failed:`, err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
