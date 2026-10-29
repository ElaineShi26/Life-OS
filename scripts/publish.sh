#!/bin/sh
# 构建并同步产物到仓库根目录，供 GitHub Pages（分支 / 根目录）直接发布。
set -e
cd "$(dirname "$0")/.."

npm run build

rm -rf assets
cp dist/index.html ./index.html
cp -r dist/assets ./assets

echo "✓ 产物已同步到仓库根目录（index.html + assets/）"
