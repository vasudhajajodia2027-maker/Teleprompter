// Dodo Payments -> Supabase: the only writer of public.licenses.
// A succeeded payment marks the buyer's account (metadata.user_id) as paid;
// a full refund (the 14-day guarantee) or a chargeback takes it away again.
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

async function revoke(paymentId: string, tier: string) {
  const { error } = await admin.from('licenses').update({ is_pro: false, tier }).eq('dodo_payment_id', paymentId);
  if (error) throw error;
}

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
      // Events can arrive out of order: a retried payment.succeeded must not
      // hand back access that a later refund or chargeback already took away.
      const { data: revoked, error: lookupError } = await admin
        .from('licenses')
        .select('user_id')
        .eq('dodo_payment_id', payment.payment_id)
        .eq('is_pro', false)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (revoked) return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
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
      await revoke(event.data.payment_id, 'Refunded');
    } else if (event.type === 'dispute.lost' || event.type === 'dispute.accepted') {
      // The bank returned the money to the buyer.
      await revoke(event.data.payment_id, 'Charged back');
    }
  } catch (err) {
    // A non-2xx response makes Dodo retry the event later.
    console.error(`Handling ${event.type} failed:`, err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
