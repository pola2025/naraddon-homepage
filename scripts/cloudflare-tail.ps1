param(
  [string] = ,
  [string] = 
)

if (-not ) {
  Write-Error 'Set CLOUDFLARE_WORKER_NAME or pass -Service to tail logs.'
  exit 1
}

 = @('tail', , '--format', 'json')

if () {
   += @('--env', )
}

wrangler @tailArgs