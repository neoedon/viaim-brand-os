#!/usr/bin/env bash
# 简单启动脚本：开本地 HTTP 服务器并自动打开浏览器
set -e
cd "$(dirname "$0")"
PORT="${1:-5173}"
echo "→ viaim Brand OS 启动中"
echo "→ 端口: $PORT"
echo "→ 地址: http://localhost:$PORT"
echo ""
# 优先 python3 → python → npx serve
if command -v python3 >/dev/null 2>&1; then
  (sleep 0.6 && command -v open >/dev/null && open "http://localhost:$PORT" || true) &
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m SimpleHTTPServer "$PORT"
elif command -v npx >/dev/null 2>&1; then
  npx -y serve -l "$PORT" .
else
  echo "需要 python3 或 node/npx，请安装其中之一"
  exit 1
fi
