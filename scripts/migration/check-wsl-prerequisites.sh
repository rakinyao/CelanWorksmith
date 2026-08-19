#!/usr/bin/env bash

set -euo pipefail

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    missing_commands+=("$1")
  fi
}

check_tcp_port() {
  local host="$1"
  local port="$2"
  if timeout 2 bash -c "</dev/tcp/${host}/${port}" >/dev/null 2>&1; then
    printf 'PASS  TCP %s:%s is reachable\n' "$host" "$port"
  else
    printf 'WARN  TCP %s:%s is not reachable\n' "$host" "$port"
    unavailable_services+=("${host}:${port}")
  fi
}

missing_commands=()
unavailable_services=()
for command_name in git node yarn java mvn docker; do
  require_command "$command_name"
done

if ((${#missing_commands[@]} > 0)); then
  printf 'ERROR Missing commands: %s\n' "${missing_commands[*]}" >&2
  exit 1
fi

node_version="$(node --version)"
node_major="${node_version#v}"
node_major="${node_major%%.*}"
if [[ "$node_major" -lt 24 ]]; then
  printf 'ERROR Node.js 24.14.1 or newer is required; found %s\n' "$node_version" >&2
  exit 1
fi

java_version="$(java -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1)"
if [[ "$java_version" != "25" ]]; then
  printf 'ERROR Java 25 is required; found major version %s\n' "${java_version:-unknown}" >&2
  exit 1
fi

maven_version="$(mvn --version | sed -n 's/Apache Maven \([^ ]*\).*/\1/p' | head -1)"
if [[ -z "$maven_version" ]]; then
  printf 'ERROR Could not determine Maven version\n' >&2
  exit 1
fi

printf 'PASS  Git: %s\n' "$(git --version)"
printf 'PASS  Node.js: %s\n' "$node_version"
printf 'PASS  Yarn: %s\n' "$(yarn --version)"
printf 'PASS  Java: %s\n' "$(java -version 2>&1 | head -1)"
printf 'PASS  Maven: %s\n' "$maven_version"
printf 'PASS  Docker: %s\n' "$(docker --version)"

if ! docker info >/dev/null 2>&1; then
  printf 'ERROR Docker CLI is installed but Docker Desktop/daemon is unavailable\n' >&2
  exit 1
fi
printf 'PASS  Docker daemon is reachable\n'

check_tcp_port "127.0.0.1" "27017"
check_tcp_port "127.0.0.1" "6379"
check_tcp_port "127.0.0.1" "8081"
check_tcp_port "127.0.0.1" "8091"

if [[ "${MIGRATION_REQUIRE_SERVICES:-0}" == "1" && ${#unavailable_services[@]} -gt 0 ]]; then
  printf 'ERROR Required development services are unavailable: %s\n' "${unavailable_services[*]}" >&2
  exit 1
fi

printf 'PASS  Prerequisite check completed\n'
if ((${#unavailable_services[@]} > 0)); then
  printf 'INFO  Start MongoDB, Redis, RTS, and backend before running the strict check\n'
fi
