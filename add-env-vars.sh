#!/bin/bash
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  echo "Adding $key..."
  printf "%s" "$value" | npx vercel env add "$key" production --yes
done < .env.local
