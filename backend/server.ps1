<#
.SYNOPSIS
  Sahaay Bank Native Windows Zero-Dependency HTTP & REST API Server
.DESCRIPTION
  Runs on Windows using built-in .NET HttpListener without requiring Node.js or any external runtimes.
#>
param (
  [int]$Port = 5050
)

$ErrorActionPreference = "Continue"
$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Error "Failed to start listener on $prefix : $_"
  exit 1
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 Sahaay Bank Native REST API Server Online!" -ForegroundColor Green
Write-Host "📡 Endpoint: $prefix" -ForegroundColor Yellow
Write-Host "📂 Frontend Root: http://localhost:$Port/" -ForegroundColor Yellow
Write-Host "Press Ctrl+C in terminal to stop." -ForegroundColor Gray
Write-Host "====================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbPath = Join-Path $scriptDir "data\db.json"
$frontendDir = Join-Path (Split-Path -Parent $scriptDir) "frontend"

function Get-Db {
  if (Test-Path $dbPath) {
    return (Get-Content -Raw -Path $dbPath -Encoding UTF8 | ConvertFrom-Json)
  }
  return @{
    account = @{
      accountHolder = "Asha Patel"
      accountNumber = "4417"
      upiId = "asha.patel@sahaay"
      balance = 42180.50
      isFrozen = $false
      upiPin = "1234"
    }
    transactions = @()
  }
}

function Save-Db ($dbObj) {
  $dbObj | ConvertTo-Json -Depth 10 | Set-Content -Path $dbPath -Encoding UTF8
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    # CORS Headers
    $res.AddHeader("Access-Control-Allow-Origin", "*")
    $res.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

    if ($req.HttpMethod -eq "OPTIONS") {
      $res.StatusCode = 200
      $res.Close()
      continue
    }

    $rawUrl = $req.Url.AbsolutePath
    $method = $req.HttpMethod

    # Body reader
    $body = ""
    if ($req.HasEntityBody) {
      $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
      $body = $reader.ReadToEnd()
      $reader.Close()
    }
    $reqData = if ($body) { try { $body | ConvertFrom-Json } catch { $null } } else { $null }

    # 1. API ROUTES
    if ($rawUrl -like "/api*") {
      $res.ContentType = "application/json; charset=utf-8"
      $responseJson = ""

      if ($rawUrl -eq "/api/health") {
        $responseJson = '{"status":"UP","engine":"Windows .NET HttpListener"}'
      }
      elseif ($rawUrl -eq "/api/auth/login" -and $method -eq "POST") {
        $db = Get-Db
        $userInp = if ($reqData -and $reqData.username) { $reqData.username.ToString().Trim() } else { "" }
        $passInp = if ($reqData -and $reqData.password) { $reqData.password.ToString().Trim() } else { "" }

        $foundUser = $null
        if ($db.users) {
          foreach ($u in $db.users) {
            if ($u.username.ToLower() -eq $userInp.ToLower() -and $u.password -eq $passInp) {
              $foundUser = $u
              break
            }
          }
        }

        if ($foundUser) {
          $db.account.accountHolder = $foundUser.name
          $db.account.accountNumber = $foundUser.accountNumber
          $db.account.upiId = $foundUser.upiId
          $db.account.balance = $foundUser.balance
          $db.account.upiPin = $foundUser.upiPin
          Save-Db $db

          $safeUser = [ordered]@{
            id = $foundUser.id
            username = $foundUser.username
            name = $foundUser.name
            phone = $foundUser.phone
            accountNumber = $foundUser.accountNumber
            upiId = $foundUser.upiId
            balance = $foundUser.balance
            accessibilityProfile = $foundUser.accessibilityProfile
          }
          $responseJson = @{
            success = $true
            message = "Authentication successful"
            user = $safeUser
          } | ConvertTo-Json
        } else {
          $res.StatusCode = 401
          $responseJson = @{
            success = $false
            error = "Invalid username or password. Check credentials."
          } | ConvertTo-Json
        }
      }
      elseif ($rawUrl -eq "/api/users" -and $method -eq "GET") {
        $db = Get-Db
        $safeUsers = @()
        if ($db.users) {
          foreach ($u in $db.users) {
            $safeUsers += [ordered]@{
              username = $u.username
              name = $u.name
              accountNumber = $u.accountNumber
              upiId = $u.upiId
              accessibilityProfile = $u.accessibilityProfile
            }
          }
        }
        $responseJson = @{ success = $true; data = $safeUsers } | ConvertTo-Json
      }
      elseif ($rawUrl -eq "/api/account" -and $method -eq "GET") {
        $db = Get-Db
        $safeAccount = [ordered]@{
          accountHolder = $db.account.accountHolder
          accountNumber = $db.account.accountNumber
          upiId = $db.account.upiId
          balance = $db.account.balance
          isFrozen = $db.account.isFrozen
        }
        $responseJson = @{ success = $true; data = $safeAccount } | ConvertTo-Json
      }
      elseif ($rawUrl -eq "/api/transactions" -and $method -eq "GET") {
        $db = Get-Db
        $responseJson = @{ success = $true; data = $db.transactions } | ConvertTo-Json -Depth 5
      }
      elseif ($rawUrl -eq "/api/upi/verify-pin" -and $method -eq "POST") {
        $db = Get-Db
        $pin = if ($reqData) { $reqData.pin } else { "" }
        $isValid = ($pin -eq $db.account.upiPin)
        $responseJson = @{ success = $isValid; error = if ($isValid) { $null } else { "Invalid UPI PIN" } } | ConvertTo-Json
      }
      elseif ($rawUrl -eq "/api/transfer" -and $method -eq "POST") {
        $db = Get-Db
        $payee = if ($reqData) { $reqData.payee } else { "Merchant" }
        $amount = if ($reqData) { [double]$reqData.amount } else { 0 }
        $pin = if ($reqData) { $reqData.pin } else { "" }

        if ($db.account.isFrozen) {
          $res.StatusCode = 403
          $responseJson = '{"success":false,"error":"Account is frozen"}'
        }
        elseif ($pin -ne $db.account.upiPin) {
          $res.StatusCode = 401
          $responseJson = '{"success":false,"error":"Invalid UPI PIN"}'
        }
        else {
          $db.account.balance -= $amount
          $newTx = [ordered]@{
            id = (Get-Date).Ticks
            date = "Today"
            description = "UPI Payment to $payee"
            type = "Debit"
            amount = $amount
            tag = "UPI"
          }
          $db.transactions = @($newTx) + $db.transactions
          Save-Db $db
          $responseJson = @{
            success = $true
            data = @{
              newBalance = $db.account.balance
              transaction = $newTx
            }
          } | ConvertTo-Json
        }
      }
      elseif ($rawUrl -eq "/api/account/freeze" -and $method -eq "POST") {
        $db = Get-Db
        $frozenVal = if ($reqData -and $null -ne $reqData.frozen) { $reqData.frozen } else { -not $db.account.isFrozen }
        $db.account.isFrozen = [bool]$frozenVal
        Save-Db $db
        $responseJson = @{ success = $true; isFrozen = $db.account.isFrozen } | ConvertTo-Json
      }
      else {
        $res.StatusCode = 404
        $responseJson = '{"error":"Not Found"}'
      }

      $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseJson)
      $res.ContentLength64 = $buffer.Length
      $res.OutputStream.Write($buffer, 0, $buffer.Length)
      $res.Close()
      continue
    }

    # 2. STATIC FILE SERVING FOR FRONTEND
    $relPath = $rawUrl.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($relPath)) { $relPath = "index.html" }
    $filePath = Join-Path $frontendDir $relPath

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = switch ($ext) {
        ".html" { "text/html; charset=utf-8" }
        ".css"  { "text/css; charset=utf-8" }
        ".js"   { "application/javascript; charset=utf-8" }
        ".json" { "application/json; charset=utf-8" }
        ".svg"  { "image/svg+xml" }
        ".pptx" { "application/vnd.openxmlformats-officedocument.presentationml.presentation" }
        ".pdf"  { "application/pdf" }
        default { "application/octet-stream" }
      }
      $res.ContentType = $contentType
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
    } else {
      $res.StatusCode = 404
      $res.Close()
    }
  } catch {
    Write-Host "Request error: $_" -ForegroundColor Red
  }
}

