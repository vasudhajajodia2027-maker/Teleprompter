// Usage events, sent to Microsoft Clarity as custom events. Clarity loads only
// for visitors who accepted analytics cookies (ConsentBanner), so for everyone
// else window.clarity is undefined and this does nothing. Events carry a name
// only: never script text, titles or emails.
export type UsageEvent =
  | 'prompter_started' // pressed Start and the countdown finished (not a resume)
  | 'recording_started' // a take began recording
  | 'take_recorded' // a take finished and was kept
  | 'take_downloaded' // a take was saved to the computer
  | 'script_created' // New script in My Scripts
  | 'waitlist_joined' // email added on the checkout page
  | 'checkout_started' // Buy pressed and Dodo checkout opened
  | 'purchase_completed'; // back from Dodo with a succeeded payment

export function track(event: UsageEvent): void {
  try {
    window.clarity?.('event', event);
  } catch {
    // analytics must never break the app
  }
}
