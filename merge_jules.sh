#!/bin/bash
set -e

echo "🔍 Buscando branch do Jules..."
git fetch --all --quiet

JULES_BRANCH=$(git branch -r | grep "origin/main-apollo-" | sed 's/origin\///' | sort | tail -1 | tr -d ' ')

if [ -z "$JULES_BRANCH" ]; then
  echo "❌ Nenhuma branch do Jules encontrada."
  exit 1
fi

echo "✅ Branch encontrada: $JULES_BRANCH"
echo ""
echo "📁 Arquivos modificados:"
git diff origin/main-apollo..origin/$JULES_BRANCH --name-only
echo ""

read -p "Deseja fazer o merge? (s/n): " confirm
if [ "$confirm" != "s" ]; then
  echo "❌ Merge cancelado."
  exit 0
fi

echo "🔀 Fazendo merge..."
git merge origin/$JULES_BRANCH --no-commit --no-ff

echo ""
echo "🗑️ Removendo arquivos de lixo..."
for f in apollo-pizzaria/dev.log apollo-pizzaria/dev_server*.log dev_server*.log apollo-pizzaria/test_shift.js code_review_summary.md fix_contrast.patch; do
  git rm --cached "$f" 2>/dev/null || true
  rm -f "$f"
done
git rm --cached "apollo-pizzaria/components/admin/.OrderDetailModal.tsx.swp" 2>/dev/null || true
find . -name "*.orig" -exec git rm --cached {} \; 2>/dev/null || true
find . -name "*.orig" -delete 2>/dev/null || true

AUTO_MSG=$(git log origin/$JULES_BRANCH --oneline -1 | sed 's/^[a-f0-9]* //')
echo ""
echo "📝 Mensagem sugerida: $AUTO_MSG"
read -p "Usar essa mensagem? (s/n): " use_auto
if [ "$use_auto" = "s" ]; then
  MSG="$AUTO_MSG"
else
  read -p "Mensagem do commit: " MSG
fi

git commit -m "$MSG"
git push origin main-apollo

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Push confirmado! Deletando branch do Jules..."
  git push origin --delete $JULES_BRANCH 2>/dev/null || echo "⚠️ Não foi possível deletar a branch remota."
  echo "✅ Pronto!"
else
  echo "❌ Push falhou — branch do Jules mantida."
fi
