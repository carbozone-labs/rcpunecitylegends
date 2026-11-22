# Interactive helper (Windows PowerShell). Asks for the Supabase / Resend / FTP values ONCE and puts each one in the right place:
#   - .env.production and .env.local  : only the 3 PUBLIC website values (URL, Supabase URL, anon key)
#   - Supabase Edge Function secrets   : Resend key, from/notify emails, allowed origins, IP salt  (never in the website code)
#   - GitHub Actions secrets           : the 2 public Supabase values + FTP login (needs the GitHub CLI `gh`, optional)
# Nothing secret is written into the code or printed back. Run from the project folder:
#   powershell -ExecutionPolicy Bypass -File .\scripts\utilities\setup-keys.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

function Ask([string]$label, [string]$default = "") {
  $suffix = ""
  if ($default) { $suffix = " [$default]" }
  $v = Read-Host "$label$suffix"
  if ([string]::IsNullOrWhiteSpace($v)) { return $default }
  return $v.Trim()
}
function AskSecret([string]$label) {
  $s = Read-Host $label -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)).Trim() }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
function YesNo([string]$label) {
  $a = Read-Host "$label (y/n)"
  return ($a -match '^(y|yes|h|haan)$')
}
function WriteUtf8([string]$path, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path (Get-Location).Path $path), $text, $enc)
}
function WriteUtf8Abs([string]$fullPath, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $text, $enc)
}
function Run([string]$what, [scriptblock]$cmd) {
  Write-Host ">> $what" -ForegroundColor Cyan
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "Failed: $what (exit code $LASTEXITCODE)" }
}

Write-Host "`n=== RC Pune City Legends: keys setup ===`n" -ForegroundColor Green

# ---- 1. Collect values -------------------------------------------------------------------------------------------
$domain = (Ask "Final domain (without https://)" "rcpunecitylegends.org").ToLower() -replace '^https?://', '' -replace '/+$', ''
$supaUrl = Ask "Supabase Project URL (Supabase > Project Settings > API), like https://abcdxyz.supabase.co"
if ($supaUrl -match '^https://([a-z0-9]+)\.supabase\.co/?$') { $projectRef = $Matches[1] } else { throw "That does not look like a Supabase Project URL." }
$supaUrl = $supaUrl.TrimEnd('/')
$anonKey = Ask "Supabase anon / publishable key (public key, NOT the service_role key)"
if ($anonKey.Length -lt 20) { throw "The anon key looks too short." }
if ($anonKey -match '^sb_secret_') { throw "That is a secret key. Use the anon / publishable key in the website." }
if ($anonKey -match '^eyJ[\w-]+\.([\w-]+)\.') {
  $p = $Matches[1].Replace('-', '+').Replace('_', '/')
  while ($p.Length % 4 -ne 0) { $p += '=' }
  $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p))
  if ($json -match '"role"\s*:\s*"service_role"') { throw "That is the service_role key. Never use it in the website. Use the anon key." }
}

$resendKey = AskSecret "Resend API key (starts with re_; typing is hidden)"
if ($resendKey -notmatch '^re_') { throw "A Resend API key starts with re_" }
$notifyTo = Ask "Email that should receive enquiries" "rcpunecitylegends@gmail.com"
$fromEmail = Ask "Resend FROM address" "RC Pune City Legends <noreply@$domain>"
$origins = "https://$domain,https://www.$domain"
$saltBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($saltBytes)
$ipSalt = [Convert]::ToBase64String($saltBytes)

# ---- 2. Website env files (PUBLIC values only) -------------------------------------------------------------------
$prod = "NEXT_PUBLIC_SITE_URL=https://$domain`nNEXT_PUBLIC_SUPABASE_URL=$supaUrl`nNEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey`n"
$local = "NEXT_PUBLIC_SITE_URL=http://localhost:3000`nNEXT_PUBLIC_SUPABASE_URL=$supaUrl`nNEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey`n"
WriteUtf8 ".env.production" $prod
WriteUtf8 ".env.local" $local
Write-Host "Written: .env.production and .env.local (public values only; both are git-ignored)." -ForegroundColor Green

# ---- 3. Supabase: table, secrets, Edge Function ------------------------------------------------------------------
if (YesNo "Now configure Supabase (login, link, secrets, deploy function)?") {
  Run "Supabase login (a browser window opens)" { npx --yes supabase login }
  Run "Link project $projectRef (it may ask for the database password)" { npx --yes supabase link --project-ref $projectRef }
  if (YesNo "Create the 'enquiries' table now (db push)? Say n if you already ran the SQL in the SQL Editor") {
    # Newer Supabase CLI versions push to the LOCAL Docker database unless told otherwise, so target the linked project.
    Write-Host ">> Create table (db push to the linked project)" -ForegroundColor Cyan
    npx --yes supabase db push --remote
    if ($LASTEXITCODE -ne 0) {
      Write-Host "--remote did not work, trying --linked (older CLI)..." -ForegroundColor Yellow
      Run "Create table (db push --linked)" { npx --yes supabase db push --linked }
    }
  }
  $secretFile = Join-Path $env:TEMP ("legends-secrets-" + [Guid]::NewGuid().ToString("N") + ".env")
  try {
    $lines = @(
      "RESEND_API_KEY=`"$resendKey`"",
      "RESEND_FROM_EMAIL=`"$fromEmail`"",
      "NOTIFY_EMAIL_TO=`"$notifyTo`"",
      "ALLOWED_ORIGINS=`"$origins`"",
      "IP_HASH_SALT=`"$ipSalt`""
    )
    WriteUtf8Abs $secretFile ($lines -join "`n")
    Run "Set Edge Function secrets" { npx --yes supabase secrets set --env-file $secretFile --project-ref $projectRef }
  } finally {
    if (Test-Path $secretFile) { Remove-Item $secretFile -Force }
  }
  Run "Deploy Edge Function submit-enquiry" { npx --yes supabase functions deploy submit-enquiry --project-ref $projectRef }
  Write-Host "Supabase done. Secrets names: " -NoNewline; npx --yes supabase secrets list --project-ref $projectRef
}

# ---- 4. GitHub Actions secrets (optional, needs GitHub CLI) --------------------------------------------------------
if (YesNo "Set the GitHub Actions secrets for auto-deploy to Hostinger?") {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI (gh) is not installed. Install it from https://cli.github.com, run 'gh auth login', then run this script again," -ForegroundColor Yellow
    Write-Host "or add the secrets by hand in GitHub > Settings > Secrets and variables > Actions (see GITHUB_docs/deployment/DEPLOY.md)." -ForegroundColor Yellow
  } else {
    $repo = Ask "GitHub repo (owner/name)" "carbozone-labs/rcpunecitylegends"
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { Run "GitHub login" { gh auth login } }
    $ftpServer = Ask "Hostinger FTP host (hPanel > Files > FTP Accounts)"
    $ftpUser = Ask "Hostinger FTP username"
    $ftpPass = AskSecret "Hostinger FTP password (hidden)"
    $ftpDir = Ask "FTP server dir (where index.html must go, ends with /)" "public_html/"
    $pairs = [ordered]@{
      NEXT_PUBLIC_SUPABASE_URL      = $supaUrl
      NEXT_PUBLIC_SUPABASE_ANON_KEY = $anonKey
      FTP_SERVER                    = $ftpServer
      FTP_USERNAME                  = $ftpUser
      FTP_PASSWORD                  = $ftpPass
      FTP_SERVER_DIR                = $ftpDir
    }
    foreach ($k in $pairs.Keys) {
      gh secret set $k --repo $repo --body $pairs[$k]
      if ($LASTEXITCODE -ne 0) { throw "Could not set GitHub secret $k" }
      Write-Host "GitHub secret set: $k" -ForegroundColor Green
    }
  }
}

Write-Host "`nDone. Still to do by hand:" -ForegroundColor Green
Write-Host " 1. Resend > Domains: add $domain, copy the DNS records into the DNS zone where your nameservers point, click Verify."
Write-Host " 2. npm run build  (local check), then git add . ; git commit ; git push  (deploy runs from GitHub Actions)."
