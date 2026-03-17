#!/usr/bin/env bash

input=$(cat)

# Color codes
COLOR_CYAN='\033[0;36m'
COLOR_YELLOW='\033[0;33m'
COLOR_RESET='\033[0m'
COLOR_RED='\033[0;31m'
COLOR_GRAY='\033[1;30m'
COLOR_ORANGE='\033[38;5;208m'
COLOR_BLINK_RED='\033[5;31m'

# Bar and token constants
BAR_LENGTH=10

TOKEN_MILLION=1000000
TOKEN_HUNDRED_THOUSAND=100000
TOKEN_THOUSAND=1000

MODEL_TOKENS_OPUS_SONNET_4_6=1000000
MODEL_TOKENS_DEFAULT=200000

# Context token thresholds
CTX_THRESHOLD_BLINK_RED=600000
CTX_THRESHOLD_RED=450000
CTX_THRESHOLD_ORANGE=300000
CTX_THRESHOLD_YELLOW=150000

CTX_SUFFIX_BLINK_RED=" ctx - /cca:session-export"
CTX_SUFFIX_RED=" ctx - /cca:session-export"
CTX_SUFFIX_ORANGE=" ctx"
CTX_SUFFIX_YELLOW=" ctx"
CTX_SUFFIX_GRAY=" ctx"

print_colored() {
  local color="$1"; local text="$2"; printf "${color}%s${COLOR_RESET}" "$text"
}

get_value() {
  # arg: jq filter
  echo "$input" | jq -r "$1"
}

clamp() {
  local val="$1"
  local min="$2"
  local max="$3"
  if [ "$val" -lt "$min" ] 2>/dev/null; then
    echo "$min"
  elif [ "$val" -gt "$max" ] 2>/dev/null; then
    echo "$max"
  else
    echo "$val"
  fi
}

format_tokens() {
  local tokens="$1"
  if [ "$tokens" -ge $TOKEN_MILLION ] 2>/dev/null; then
    printf "%s.%sM" "$(( tokens / TOKEN_MILLION ))" "$(( (tokens % TOKEN_MILLION) / TOKEN_HUNDRED_THOUSAND ))"
  elif [ "$tokens" -ge $TOKEN_THOUSAND ] 2>/dev/null; then
    printf "%sk" "$(( tokens / TOKEN_THOUSAND ))"
  else
    printf "%s" "$tokens"
  fi
}

max_tokens_for_model() {
  local model="$1"
  case "$model" in
    *Opus*4.6*|*Sonnet*4.6*) echo $MODEL_TOKENS_OPUS_SONNET_4_6 ;;
    *) echo $MODEL_TOKENS_DEFAULT ;;
  esac
}

make_bar() {
  local percent="$1"
  local fill_len=$(( (percent * BAR_LENGTH + 50) / 100 ))
  (( fill_len > BAR_LENGTH )) && fill_len=$BAR_LENGTH
  (( fill_len < 0 )) && fill_len=0
  local empty_len=$(( BAR_LENGTH - fill_len ))

  for ((i=0; i<fill_len; i++)); do printf "█"; done
  for ((i=0; i<empty_len; i++)); do printf "▒"; done
}

ctx_bar_section() {
  local ctx="$1"
  [ -z "$ctx" ] && return

  local ctx_int
  ctx_int=$(clamp "${ctx%.*}" 0 100)
  local bar_color suffix

  local max_tokens
  max_tokens=$(max_tokens_for_model "$model")
  local current_tokens=$(( ctx_int * max_tokens / 100 ))

  if [ "$current_tokens" -ge $CTX_THRESHOLD_BLINK_RED ] 2>/dev/null; then
    bar_color=$COLOR_BLINK_RED
    suffix="$CTX_SUFFIX_BLINK_RED"
  elif [ "$current_tokens" -ge $CTX_THRESHOLD_RED ] 2>/dev/null; then
    bar_color=$COLOR_RED
    suffix="$CTX_SUFFIX_RED"
  elif [ "$current_tokens" -ge $CTX_THRESHOLD_ORANGE ] 2>/dev/null; then
    bar_color=$COLOR_ORANGE
    suffix="$CTX_SUFFIX_ORANGE"
  elif [ "$current_tokens" -ge $CTX_THRESHOLD_YELLOW ] 2>/dev/null; then
    bar_color=$COLOR_YELLOW
    suffix="$CTX_SUFFIX_YELLOW"
  else
    bar_color=$COLOR_GRAY
    suffix="$CTX_SUFFIX_GRAY"
  fi

  local current_fmt max_fmt
  current_fmt=$(format_tokens "$current_tokens")
  max_fmt=$(format_tokens "$max_tokens")

  local bar
  bar="$(make_bar "$ctx_int")"

  printf " | "
  printf "%s%% " "$ctx"
  print_colored "$bar_color" "[$bar]"
  printf " %s/%s%s" "$current_fmt" "$max_fmt" "$suffix"
}

cwd=$(get_value '.workspace.current_dir // .cwd // ""')
dir=$(basename "$cwd")
model=$(get_value '.model.display_name // ""')
ctx=$(get_value '.context_window.used_percentage // empty')
branch=$(git --no-optional-locks -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)

print_colored "$COLOR_CYAN" "$dir"

[ -n "$branch" ] && { printf " "; print_colored "$COLOR_YELLOW" "[$branch]"; }
[ -n "$model" ] && printf " | %s" "$model"

ctx_bar_section "$ctx"

printf '\n'
