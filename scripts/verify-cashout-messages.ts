// Manual verification script for cashout copy interpolation.
// Run: npx tsx scripts/verify-cashout-messages.ts

import { cashoutContent, fillCashoutTemplate as fill } from '../src/lib/cashoutMessages';

let passed = 0;
let failed = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) { passed++; console.log(`  ok  - ${label}`); }
  else { failed++; console.log(`FAIL  - ${label}${detail ? ` (${detail})` : ''}`); }
}

console.log('\n== Confirm stage ==');
{
  const body = fill(cashoutContent.confirm.body, { amount: '€12.40' });
  check('amount interpolates', body.includes('€12.40'), body);
  check('no raw placeholder left', !/\{[a-zA-Z]+\}/.test(body), body);
}
{
  const cta = fill(cashoutContent.confirm.primaryCta, { amount: '€0.00' });
  check('zero-value amount still renders cleanly (no NaN/undefined)', !/undefined|null|NaN/.test(cta), cta);
}

console.log('\n== Success stage ==');
{
  const consequence = fill(cashoutContent.success.consequence, { amount: '€45.00' });
  check('success amount interpolates', consequence.includes('€45.00'), consequence);
}
{
  const streakMsg = fill(cashoutContent.success.streakMessage, { streak: 12 });
  check('streak number interpolates', streakMsg.includes('12'), streakMsg);
}
{
  // Defensive case: missing var should never render literal "undefined"/"null"
  const broken = fill(cashoutContent.success.streakMessage, {});
  check('missing var never renders "undefined"/"null"/"NaN"', !/undefined|null|NaN/.test(broken), broken);
}

console.log('\n== Error stage — no dynamic vars, just confirm no raw keys/placeholders ==');
{
  const allErrorText = Object.values(cashoutContent.error).join(' ');
  check('no raw {placeholder} tokens anywhere in error copy', !/\{[a-zA-Z]+\}/.test(allErrorText), allErrorText);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
