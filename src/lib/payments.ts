import { supabase } from '../../utils/supabase/client';

// Real purchases are switched on by setting VITE_PAYMENTS_ENABLED=true in
// Vercel once Stripe and the Supabase Edge Functions are set up. Until then
// the checkout page collects waitlist emails.
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

// Set before the Google sign-in redirect so the buyer lands back on checkout.
export const RESUME_CHECKOUT_KEY = 'ft_resume_checkout';

// Opens Stripe Checkout for the signed-in user. Resolves with an error
// message, or never (the page navigates away).
export async function startCheckout(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', { method: 'POST' });
  if (error) {
    let message = 'Could not start checkout. Please try again.';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    return message;
  }
  if (!data?.url) return 'Could not start checkout. Please try again.';
  window.location.assign(data.url);
  return new Promise(() => {});
}
