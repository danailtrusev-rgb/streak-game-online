export interface UserProfile {
  id: string;
  guest_id: string;
  status: 'active' | 'banned';
}

export interface GameState {
  current_streak: number;
  pot_cents: number;
  last_play_date: string | null;
  max_streak: number;
  completed_cycles: number;
}

export interface StakeTier {
  tier: number;
  stake_cents: number;
  unlock_streak: number;
  unlocked: boolean;
}

export interface PlayerState {
  user: UserProfile;
  game_state: GameState;
  wallet_balance_cents: number;
  jackpot_cents: number;
  played_today: boolean;
  available_tiers: StakeTier[];
}

export interface PlayResult {
  outcome: 'SURVIVE' | 'DIE';
  streak: number;
  pot_cents: number;
  wallet_balance_cents: number;
  jackpot_cents: number;
  milestone_hit: number | null;
  played_today: boolean;
  play_id: string;
  /** Badges awarded on this play (populated client-side after RPC) */
  badges_earned?: BadgeKey[];
}

export interface CashoutResult {
  streak: number;
  pot_cents: number;
  wallet_balance_cents: number;
  jackpot_cents: number;
  cashout_amount_cents: number;
  played_today: boolean;
}

export interface TopupResult {
  balance_cents: number;
  topup_amount_cents: number;
}

export interface WalletEntry {
  id: string;
  type: 'TOPUP' | 'STAKE' | 'CASHOUT' | 'ADMIN_ADJUST' | 'JACKPOT_CONTRIB' | 'JACKPOT_WIN';
  amount_cents: number;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface LeaderboardEntry {
  guest_id: string;
  current_streak: number;
  pot_cents: number;
  rank: number;
}

export interface GameModule {
  game_id: string;
  name: string;
  short_label: string;
  description: string;
  status: 'active' | 'coming_soon' | 'disabled';
  launch_state: 'live' | 'coming_soon' | 'beta';
  icon: string;
  sort_order: number;
  category: 'daily' | 'qualifier' | 'weekend' | 'special';
  play_frequency: 'daily' | 'weekly' | 'special';
  qualification_enabled: boolean;
  visible_from_dow: number;
  visible_to_dow: number;
  points_on_play: number;
  points_on_win: number;
  config_json: Record<string, unknown>;
}

export interface QualificationStatus {
  week_start: string;
  total_points: number;
  games_played_count: number;
  games_won_count: number;
  saturday_qualified: boolean;
  sunday_qualified: boolean;
  saturday_entry_used: boolean;
  sunday_entry_used: boolean;
  sat_pts_threshold: number;
  sun_pts_threshold: number;
  sat_gp_threshold: number;
  sun_gp_threshold: number;
}

export interface TodayGameProgress {
  game_id: string;
  played_today: boolean;
  won_today: boolean;
  points_earned: number;
}

export interface PromotionalAsset {
  id: string;
  asset_type: 'flyer' | 'winner_card' | 'event_banner' | 'qualification_badge';
  template_key: string;
  title: string;
  subtitle: string;
  body_json: Record<string, unknown>;
  image_path: string;
  sort_order: number;
}

export interface WinnerAnnouncement {
  id: string;
  event_game_id: string;
  event_date: string;
  display_name: string;
  result_summary: string;
  payout_cents: number;
  share_text: string;
  created_at: string;
}

export interface EcosystemState {
  player: PlayerState | null;
  qualification: QualificationStatus | null;
  today_progress: TodayGameProgress[];
  promotions: PromotionalAsset[];
  winners: WinnerAnnouncement[];
}

export interface WeekendEventEntry {
  id: string;
  user_id: string;
  event_game_id: string;
  week_start_date: string;
  qualification_source_json: Record<string, unknown>;
  entered_at: string;
  result_status: 'pending' | 'entered' | 'completed';
  reward_cents: number;
}

export interface QualificationRule {
  id: string;
  rule_name: string;
  target_event: string;
  rule_type: string;
  threshold_value: number;
  required_games_json: string[];
  active: boolean;
  priority: number;
}

export interface DiceResult {
  outcome: 'WIN' | 'LOSE';
  won: boolean;
  dice_value: number;
  points_earned: number;
}

export interface PickResult {
  outcome: 'WIN' | 'LOSE';
  won: boolean;
  player_choice: number;
  winning_idx: number;
  points_earned: number;
}

// SafeBox reuses PickResult shape
export type SafeBoxResult = PickResult;

// Path reuses PickResult shape (0=left, 1=right)
export type PathResult = PickResult;

export interface PuzzleResult {
  outcome: 'CORRECT' | 'WRONG';
  won: boolean;
  correct_answer: string;
  points_earned: number;
}

// ─── Generic microgame result (union) ────────────────────────────────────────
export type MicrogameResult = PickResult | SafeBoxResult | PathResult | DiceResult | PuzzleResult;

// ─── Game engine config ───────────────────────────────────────────────────────
export type GameType = 'pick' | 'safebox' | 'path' | 'dice' | 'ladder' | 'spin';

export interface ClickZone {
  id: string | number;
  label: string;
  /** Percent-based position & size (0-100) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Path to image shown when zone is hidden */
  hiddenImage?: string;
  /** Path to image revealed on selection */
  revealImage?: string;
  /** Fallback emoji when image missing */
  fallbackEmoji?: string;
  /** Override icon size in pixels (default 36) */
  iconSize?: number;
}

export interface GameEngineConfig {
  game_id: string;
  type: GameType;
  /** Background image for Layer 1 */
  background: string;
  /** Optional foreground overlay image for Layer 2 */
  foreground?: string;
  instruction_text: string;
  win_text: string;
  lose_text: string;
  /** Win probability label (cosmetic) */
  winChance: string;
  zones: ClickZone[];
  /** db config fields */
  points_on_play?: number;
  points_on_win?: number;
}

export interface AdminKPIs {
  dau: number;
  wau: number;
  new_users_today: number;
  total_users: number;
  avg_streak: number;
  avg_pot: number;
  total_topups_today: number;
  total_stakes_today: number;
  cashouts_today_count: number;
  cashouts_today_sum: number;
  jackpot_cents: number;
  survival_rate_actual: number;
  survival_rate_configured: number;
}

export interface EcosystemKPIs {
  saturday_qualified: number;
  sunday_qualified: number;
  saturday_entries: number;
  sunday_entries: number;
  game_play_counts: Record<string, number>;
  avg_qualification_points: number;
  week_start: string;
}

export interface AdminUser {
  id: string;
  guest_id: string;
  status: string;
  risk_flags: Record<string, unknown>;
  created_at: string;
  current_streak: number;
  pot_cents: number;
  last_play_date: string | null;
  wallet_balance: number;
  recent_plays: Array<{
    play_date: string;
    outcome: string;
    stake_cents: number;
    streak_after: number;
  }>;
  qualification: QualificationStatus | null;
}

export interface AuditLogEntry {
  id: string;
  admin_actor: string;
  action: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

// ── Badge / Achievement types ─────────────────────────────────────────────────

export type StreakBadgeKey =
  | 'streak_1'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30';

export type PrestigeBadgeKey =
  | 'prestige_cycle_1'
  | 'prestige_cycle_2'
  | 'prestige_cycle_3'
  | 'prestige_cycle_4'
  | 'prestige_cycle_5';

export type BadgeKey = StreakBadgeKey | PrestigeBadgeKey;

export interface UserBadge {
  badge_key:      BadgeKey;
  unlocked_at:    string;
  source_play_id: string | null;
}

export interface BadgeDef {
  key:         BadgeKey;
  name:        string;
  lore:        string;
  asset:       string;
  milestone:   number;   // streak day or cycle number
  isPrestige:  boolean;
}

// ─── Skull Gate Micro-Game Scene Types ───────────────────────────────────────
// Foundation types for the future Skull Gate scene renderer and editor.
// These are not yet consumed by live gameplay — added in Prompt 18.
// Prompt 19 will wire these into SkullGateChallenge via SceneRenderer.
// Prompt 20+ will allow editing and publishing configs via Admin Builder.

export type SkullGateTemplateType =
  | 'choice_2'
  | 'choice_3'
  | 'tap_reveal'
  | 'hold_reveal'
  | 'drag_to_target'
  | 'timed_tap'
  | 'reveal_tiles'
  | 'ritual_roll'
  | 'spin_reveal'
  | 'swipe_reveal';

export type LayerRole =
  | 'none'
  | 'background'
  | 'backplate'
  | 'gate_frame'
  | 'gate_door_left'
  | 'gate_door_right'
  | 'gate_inner_light'
  | 'gate_glow'
  | 'gate_seal'
  | 'choice_object'
  | 'torch_flame'
  | 'foreground_decoration'
  | 'atmosphere_effect'
  | 'particle_effect'
  | 'result_effect'
  | 'text'
  | 'button'
  | 'overlay';

export type LayerType =
  | 'image'
  | 'text'
  | 'button'
  | 'effect'
  | 'particle'
  | 'overlay';

export type DoorAnimationPreset =
  | 'none'
  | 'slide_open'
  | 'swing_open'
  | 'crack_open'
  | 'rumble_only';

export type DoorAnimationTrigger =
  | 'on_select'
  | 'on_cta'
  | 'on_result_reveal'
  | 'on_survive'
  | 'on_fail';

export type AnimationPreset =
  | 'none'
  | 'slow_float'
  | 'slow_sway'
  | 'fog_drift'
  | 'rain_fall'
  | 'flicker_opacity'
  | 'pulse_glow'
  | 'branch_sway'
  | 'ember_float'
  | 'firefly_random'
  | 'light_ray_pulse'
  | 'gate_rumble'
  | 'torch_flicker'
  | 'inner_light_pulse';

export type EffectPreset =
  | 'none'
  | 'fog'
  | 'rain'
  | 'light_rays'
  | 'fireflies'
  | 'embers'
  | 'dust'
  | 'vignette'
  | 'glow_overlay'
  | 'foreground_branches'
  | 'torch_fire'
  | 'gate_glow'
  | 'inner_light';

export interface DoorAnimationConfig {
  preset:           DoorAnimationPreset;
  trigger:          DoorAnimationTrigger;
  durationMs:       number;
  delayMs:          number;
  openTranslateX?:  number;
  openTranslateY?:  number;
  openRotation?:    number;
  openScale?:       number;
  openOpacity?:     number;
  easing?:          string;
}

export interface LayerEffectsConfig {
  glow?:           boolean;
  shadow?:         boolean;
  flicker?:        boolean;
  pulse?:          boolean;
  selectedGlow?:   boolean;
  selectedScale?:  number;
  brightness?:     number;
  blur?:           number;
  opacityPulse?:   boolean;
  colorMood?:      string;
}

export interface SceneLayer {
  id:                string;
  name:              string;
  type:              LayerType;
  role:              LayerRole;
  assetPath?:        string;
  /** Text content for type='text' or label for type='button' */
  text?:             string;
  /** Alias for text — kept for compatibility */
  content?:          string;
  x?:                number;
  y?:                number;
  width?:            number;
  height?:           number;
  rotation?:         number;
  opacity?:          number;
  zIndex:            number;
  visible:           boolean;
  locked?:           boolean;
  animationPreset?:  AnimationPreset;
  effectPreset?:     EffectPreset;
  clickable?:        boolean;
  clickAction?:      string;
  choiceId?:         string;
  doorAnimation?:    DoorAnimationConfig;
  effects?:          LayerEffectsConfig;
  mobileSafeArea?:   boolean;
  parallaxEnabled?:  boolean;
}

export interface SkullGateSceneConfig {
  id:               string;
  slug:             string;
  title:            string;
  description?:     string;
  templateType:     SkullGateTemplateType;
  status:           'draft' | 'published' | 'archived';
  enabled:          boolean;
  weight?:          number;
  cooldownDays?:    number;
  minStreak?:       number;
  maxStreak?:       number | null;
  introText?:       string;
  instructionText:  string;
  ctaText:          string;
  surviveText:      string;
  failText:         string;
  cashoutText?:     string;
  layers:           SceneLayer[];
  createdAt?:       string;
  updatedAt?:       string;
}
