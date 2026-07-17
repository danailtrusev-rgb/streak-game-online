-- Add leave-game confirmation dialog translation keys
INSERT INTO translations (language_code, key, value) VALUES
  ('en', 'game.leave_confirm',      'Leave game?'),
  ('en', 'game.leave_confirm_desc', 'Your progress will not be saved.'),
  ('en', 'game.leave_action',       'Leave'),

  ('es', 'game.leave_confirm',      '¿Salir del juego?'),
  ('es', 'game.leave_confirm_desc', 'Tu progreso no será guardado.'),
  ('es', 'game.leave_action',       'Salir'),

  ('pt', 'game.leave_confirm',      'Sair do jogo?'),
  ('pt', 'game.leave_confirm_desc', 'Seu progresso não será salvo.'),
  ('pt', 'game.leave_action',       'Sair'),

  ('fr', 'game.leave_confirm',      'Quitter la partie?'),
  ('fr', 'game.leave_confirm_desc', 'Votre progression ne sera pas sauvegardée.'),
  ('fr', 'game.leave_action',       'Quitter'),

  ('id', 'game.leave_confirm',      'Tinggalkan permainan?'),
  ('id', 'game.leave_confirm_desc', 'Progres Anda tidak akan disimpan.'),
  ('id', 'game.leave_action',       'Tinggalkan'),

  ('vi', 'game.leave_confirm',      'Rời trò chơi?'),
  ('vi', 'game.leave_confirm_desc', 'Tiến trình của bạn sẽ không được lưu.'),
  ('vi', 'game.leave_action',       'Rời'),

  ('th', 'game.leave_confirm',      'ออกจากเกม?'),
  ('th', 'game.leave_confirm_desc', 'ความคืบหน้าของคุณจะไม่ถูกบันทึก'),
  ('th', 'game.leave_action',       'ออก')

ON CONFLICT (language_code, key) DO UPDATE SET value = EXCLUDED.value;
