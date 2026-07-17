CREATE TABLE faq_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT        NOT NULL,
  answer     TEXT        NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0,
  enabled    BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_select_enabled" ON faq_items FOR SELECT
  USING (enabled = true);

CREATE POLICY "faq_admin_select" ON faq_items FOR SELECT
  TO service_role USING (true);

CREATE POLICY "faq_admin_insert" ON faq_items FOR INSERT
  TO service_role WITH CHECK (true);

CREATE POLICY "faq_admin_update" ON faq_items FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "faq_admin_delete" ON faq_items FOR DELETE
  TO service_role USING (true);

INSERT INTO faq_items (question, answer, sort_order) VALUES
  ('What is Survive the Streak?', 'Survive the Streak is a daily skill game. Each day, one gate opens. You choose a torch — survive and keep your streak alive, fall and the streak resets. Build the longest streak, grow your pot, and qualify for weekly events.', 10),
  ('How does the daily gate work?', 'Once per day you are presented with the Skull Gate. You pick a torch. The outcome is determined at that moment. If you survive, your streak grows by one day and your pot increases. If you fall, your streak resets and any uncollected pot is lost.', 20),
  ('What is the pot and how do I cash it out?', 'Every time you survive, your staked amount is added to your pot. You can cash out your pot at any time — it moves to your wallet balance. Cashing out resets your streak to zero, so choose your moment wisely.', 30),
  ('What are qualification points and why do they matter?', 'Qualification points are earned by playing daily mini-games (Dice, Pick, Puzzle, etc.). Accumulate enough points before Saturday to qualify for the Saturday Showdown, and enough by Sunday to enter the Sunday Crown event.', 40),
  ('What are the Saturday Showdown and Sunday Crown?', 'These are weekly prize events. The Saturday Showdown rewards players who qualified during the week. The Sunday Crown is the top-tier event for high-point qualifiers. Entry is automatic — just earn enough points.', 50),
  ('What happens if I miss a day?', 'Missing a day does not automatically end your streak — you still need to face the gate. However, if you do not play the gate before midnight (your local time), the day will count as missed and your streak resets the following day.', 60),
  ('What are badges?', 'Badges are permanent achievements earned by reaching streak milestones (e.g. Day 3, Day 7, Day 30). Prestige badges are awarded for completing full 30-day cycles. Badges are yours forever — even if your streak resets.', 70),
  ('How do I add credits to my wallet?', 'Go to the Wallet page and tap "Add Credits". Credits are the in-game currency used to stake on the gate. All balances are in EUR. Contact support if a top-up does not appear within a few minutes.', 80),
  ('Is my progress safe if I switch devices?', 'Guest accounts are tied to your device. To protect your progress across devices, upgrade to a registered account. This links your streak, pot, wallet, and badges to your email or social login. Upgrading never resets your existing progress.', 90),
  ('How do I contact support?', 'Use the contact form below or reach out via the email address listed in the app. For urgent issues regarding wallet credits, include your user ID (shown in your account settings) so we can look up your account quickly.', 100);
