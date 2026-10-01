#!/usr/bin/env bash
# loop-watchdog — "automatically clear whenever needed" (Brian 2026-10-01).
#
# A wedged or saturated /run-the-loop session cannot rescue itself: the durable
# 15-min cron fires INTO the running REPL, and a session-level harness wedge
# (Bash-classifier outage) or lead saturation sticks for that session's lifetime.
# This launchd job is the OUT-OF-SESSION clear: when the loop signals it needs a
# fresh session, launch one headless (`claude -p "run the loop"`) — it claims the
# lease, executes progress.md's SHIP PIPELINE, and continues the loop.
#
# Triggers (any one):
#   1. Lease phase == "released-handoff"      — a lead handed off deliberately.
#   2. Lease heartbeat older than 25 min      — a lead died mid-fire.
#   3. No lease but progress.md exists        — unshipped debt with no live fire.
# A LIVE lease (fresh heartbeat) means a healthy fire is running → do nothing.
#
# Guards: single-flight lock (skip while a launched session still runs) + 30-min
# backoff between launches. All activity appends to watchdog.log.
#
# Arm:  launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/space.megabyte.loop-watchdog.plist
# Disarm: launchctl bootout "gui/$(id -u)/space.megabyte.loop-watchdog"
set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

REPO="${1:-$HOME/emdash/repositories/megabyte.space}"
LEASE="$REPO/.claude/run-the-loop/.fire-lease.json"
DEBT="$REPO/progress.md"
LOCK="$REPO/.claude/run-the-loop/.watchdog.lock"
LOG="$REPO/.claude/run-the-loop/watchdog.log"
STALE_SECS=1500   # 25 min — outside the loop's own 20-min stale window
BACKOFF_SECS=1800 # at most one fresh launch per 30 min

# Styled output for interactive runs; log() is the durable record either way.
if [ -f "$HOME/.claude/hooks/style.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.claude/hooks/style.sh"
else
  emdash_log() { printf '%s\n' "watchdog: $1" >&2; }
fi
log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$1" >>"$LOG"; }

jsonField() { sed -n "s/.*\"$2\": *\"\([^\"]*\)\".*/\1/p" "$1" | head -1; }

needsFire() {
  if [ -f "$LEASE" ]; then
    local phase beat beatEpoch now
    phase="$(jsonField "$LEASE" phase)"
    if [ "$phase" = "released-handoff" ]; then
      log "trigger: lease phase released-handoff"
      return 0
    fi
    beat="$(jsonField "$LEASE" heartbeat)"
    beat="${beat%Z}"
    beat="${beat%%.*}"
    beatEpoch="$(date -ju -f %Y-%m-%dT%H:%M:%S "$beat" +%s 2>/dev/null || printf 0)"
    now="$(date -u +%s)"
    if [ $((now - beatEpoch)) -gt "$STALE_SECS" ]; then
      log "trigger: lease heartbeat stale (${beat:-unparseable})"
      return 0
    fi
    return 1 # live fire — never preempt it
  fi
  if [ -f "$DEBT" ]; then
    log "trigger: progress.md debt with no live fire"
    return 0
  fi
  return 1
}

# Single-flight + backoff
if [ -f "$LOCK" ]; then
  lockPid="$(cat "$LOCK" 2>/dev/null || true)"
  if [ -n "$lockPid" ] && kill -0 "$lockPid" 2>/dev/null; then
    log "skip: launched session (pid $lockPid) still running"
    exit 0
  fi
  lockAge=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || printf 0) ))
  if [ "$lockAge" -lt "$BACKOFF_SECS" ]; then
    log "skip: backoff (${lockAge}s < ${BACKOFF_SECS}s)"
    exit 0
  fi
fi

needsFire || exit 0

if ! command -v claude >/dev/null 2>&1; then
  log "ERROR: claude CLI not on PATH"
  emdash_log "claude CLI not on PATH" error
  exit 1
fi

log "launching fresh headless fire (claude -p)"
( cd "$REPO" && claude -p "run the loop" --output-format text ) >>"$LOG" 2>&1 &
printf '%s' "$!" >"$LOCK"
log "launched pid $(cat "$LOCK")"
emdash_log "fresh loop session launched (pid $(cat "$LOCK"))" info
