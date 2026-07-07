// Copy for the operator access gate. Deliberately minimal — no sales
// proposition, no retention language, nothing that reveals positioning
// to anyone who hasn't entered a valid access code yet.

export const operatorAccessContent = {
  meta: {
    title: 'Private Partner Access',
  },
  title: 'Private Partner Access',
  instructions: 'This is a private site for invited operators and partners. Enter your access code to continue.',
  codeLabel: 'Access code',
  continueCta: 'Continue',
  invalidMessage: 'That code is not valid. Please check with your contact and try again.',
  rateLimitedMessage: 'Too many attempts. Please wait a moment and try again.',
  contactLine: 'Invited partner without a code?',
  contactCta: 'Contact us',
  contactHref: 'mailto:partners@survivethestreak.com',
  lockAccessLabel: 'Lock access',
} as const;
