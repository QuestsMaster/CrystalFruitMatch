# iPhone release checklist

Run this checklist on an iPhone Safari device against the production GitHub Pages URL.

- [ ] First load is online and the status changes to **Offline ready**.
- [ ] Share menu offers **Add to Home Screen**; the installed app opens in standalone portrait mode.
- [ ] In Airplane Mode, launch from the Home Screen and confirm the board appears.
- [ ] Swipe horizontally and vertically; a valid match updates moves/goal progress, and an invalid swap keeps moves unchanged.
- [ ] Reload during a level and confirm the exact board, score, goals, and remaining moves are restored.
- [ ] Complete a level and select **Следующий уровень**; exhaust moves and select **Повторить**.
- [ ] Pause and resume without changing the board, score, or remaining moves.
- [ ] Inspect top/bottom controls around the notch and home indicator: all content respects the safe-area insets.
- [ ] On level 4, confirm both `ICE 0/16` and `SCORE 0/1500` remain readable at the device's native Retina scale.
- [ ] Corrupt localStorage in Safari Web Inspector (or use a stale schema), confirm the original value remains until **Start new game** is selected, then confirm the recovery message clears and level 1 starts without crashing.
- [ ] Deploy a second release, interrupt one app-shell asset during service-worker installation, and confirm the previously cached release still launches offline; after a successful update, confirm unrelated origin caches remain present.
