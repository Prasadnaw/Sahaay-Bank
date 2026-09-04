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
        $responseJson = '{"status":"ok","backend":"sahaay","engine":"Windows .NET HttpListener"}'
      }
      elseif ($rawUrl -eq "/api/auth/register" -and $method -eq "POST") {
        $db = Get-Db
        $name = if ($reqData -and $reqData.name) { $reqData.name.ToString().Trim() } else { "" }
        $username = if ($reqData -and $reqData.username) { $reqData.username.ToString().Trim().ToLower() } else { "" }
        $password = if ($reqData -and $reqData.password) { $reqData.password.ToString() } else { "" }
        $phone = if ($reqData -and $reqData.phone) { $reqData.phone.ToString() } else { "9800000000" }
        $profile = if ($reqData -and $reqData.accessibilityProfile) { $reqData.accessibilityProfile.ToString() } else { "standard" }
        $faceTpl = if ($reqData -and $reqData.faceTemplate) { $reqData.faceTemplate.ToString() } else { $null }

        if (-not $name -or -not $username -or -not $password) {
          $res.StatusCode = 400
          $responseJson = '{"success":false,"error":"Name, username, and password are required."}'
        } else {
          $existing = $null
          if ($db.users) {
            foreach ($u in $db.users) {
              if ($u.username.ToLower() -eq $username) { $existing = $u; break }
            }
          }
          if ($existing) {
            $res.StatusCode = 409
            $responseJson = '{"success":false,"error":"Username already registered."}'
          } else {
            $newId = "USR-" + (1000 + ($db.users.Count + 1))
            $newAccNum = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
            $newUpiId = "$username@sahaay"

            $newUser = [ordered]@{
              id = $newId
              username = $username
              password = $password
              name = $name
              phone = $phone
              accountNumber = $newAccNum
              upiId = $newUpiId
              balance = 0.00
              upiPin = "1234"
              accessibilityProfile = $profile
              isFrozen = $false
              faceVerification = [ordered]@{
                enrolled = ($null -ne $faceTpl)
                template = $faceTpl
              }
              transactions = @()
            }
            $db.users += $newUser
            Save-Db $db

            $safeUser = [ordered]@{
              id = $newId
              username = $username
              name = $name
              phone = $phone
              accountNumber = $newAccNum
              upiId = $newUpiId
              balance = 0.00
              accessibilityProfile = $profile
              faceVerification = [ordered]@{ enrolled = ($null -ne $faceTpl) }
            }
            $res.StatusCode = 201
            $responseJson = @{
              success = $true
              message = "Account created successfully"
              user = $safeUser
              token = "sah_token_${newId}_ps"
            } | ConvertTo-Json
          }
        }
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
          $db.account.isFrozen = [bool]$foundUser.isFrozen
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
            faceEnrolled = ($null -ne $foundUser.faceVerification -and $foundUser.faceVerification.enrolled)
          }
          $responseJson = @{
            success = $true
            message = "Authentication successful"
            user = $safeUser
            token = "sah_token_$($foundUser.id)_ps"
          } | ConvertTo-Json
        } else {
          $res.StatusCode = 401
          $responseJson = @{
            success = $false
            error = "Invalid username or password. Check credentials."
          } | ConvertTo-Json
        }
      }
      elseif ($rawUrl -like "/api/users/search*" -and $method -eq "GET") {
        $db = Get-Db
        $query = ""
        if ($rawUrl -match "\?q=([^&]*)") { $query = [System.Uri]::UnescapeDataString($matches[1]).ToLower() }
        $safeUsers = @()
        if ($db.users) {
          foreach ($u in $db.users) {
            if (-not $query -or $u.name.ToLower().Contains($query) -or $u.username.ToLower().Contains($query) -or $u.upiId.ToLower().Contains($query)) {
              $safeUsers += [ordered]@{
                id = $u.id
                username = $u.username
                name = $u.name
                accountNumber = $u.accountNumber
                upiId = $u.upiId
                accessibilityProfile = $u.accessibilityProfile
              }
            }
          }
        }
        $responseJson = @{ success = $true; data = $safeUsers } | ConvertTo-Json
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
        # Resolve active user from auth header or default to account
        $authHdr = $req.Headers["Authorization"]
        $activeUser = $null
        if ($authHdr -and $authHdr -match "USR-\d+") {
          $uid = $matches[0]
          foreach ($u in $db.users) { if ($u.id -eq $uid) { $activeUser = $u; break } }
        }
        if (-not $activeUser -and $db.users) { $activeUser = $db.users[0] }

        $safeAccount = [ordered]@{
          id = if ($activeUser) { $activeUser.id } else { "USR-1001" }
          accountHolder = if ($activeUser) { $activeUser.name } else { $db.account.accountHolder }
          name = if ($activeUser) { $activeUser.name } else { $db.account.accountHolder }
          accountNumber = if ($activeUser) { $activeUser.accountNumber } else { $db.account.accountNumber }
          upiId = if ($activeUser) { $activeUser.upiId } else { $db.account.upiId }
          balance = if ($activeUser) { $activeUser.balance } else { $db.account.balance }
          isFrozen = if ($activeUser) { [bool]$activeUser.isFrozen } else { [bool]$db.account.isFrozen }
          accessibilityProfile = if ($activeUser) { $activeUser.accessibilityProfile } else { "standard" }
          faceEnrolled = if ($activeUser -and $activeUser.faceVerification) { [bool]$activeUser.faceVerification.enrolled } else { $false }
        }
        $responseJson = @{ success = $true; data = $safeAccount } | ConvertTo-Json
      }
      elseif ($rawUrl -eq "/api/account/deposit" -and $method -eq "POST") {
        $db = Get-Db
        $authHdr = $req.Headers["Authorization"]
        $activeUser = $null
        if ($authHdr -and $authHdr -match "USR-\d+") {
          $uid = $matches[0]
          foreach ($u in $db.users) { if ($u.id -eq $uid) { $activeUser = $u; break } }
        }
        if (-not $activeUser -and $db.users) { $activeUser = $db.users[0] }

        $amount = if ($reqData -and $reqData.amount) { [double]$reqData.amount } else { 0 }
        if ($amount -le 0) {
          $res.StatusCode = 400
          $responseJson = '{"success":false,"error":"Deposit amount must be greater than 0"}'
        } else {
          $activeUser.balance = [Math]::Round(($activeUser.balance + $amount), 2)
          $refId = "SAH-" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
          $newTx = [ordered]@{
            id = "TXN-" + (Get-Date).Ticks
            userId = $activeUser.id
            date = "Today"
            description = "Demo Deposit / Added Money"
            type = "Credit"
            amount = $amount
            tag = "DEPOSIT"
            counterparty = "Sahaay Self Deposit"
            counterpartyUserId = $activeUser.id
            status = "SUCCESS"
            referenceId = $refId
          }
          $activeUser.transactions = @($newTx) + $activeUser.transactions
          Save-Db $db
          $responseJson = @{
            success = $true
            data = @{
              newBalance = $activeUser.balance
              transaction = $newTx
            }
          } | ConvertTo-Json
        }
      }
      elseif ($rawUrl -eq "/api/transactions" -and $method -eq "GET") {
        $db = Get-Db
        $authHdr = $req.Headers["Authorization"]
        $activeUser = $null
        if ($authHdr -and $authHdr -match "USR-\d+") {
          $uid = $matches[0]
          foreach ($u in $db.users) { if ($u.id -eq $uid) { $activeUser = $u; break } }
        }
        if (-not $activeUser -and $db.users) { $activeUser = $db.users[0] }
        $txs = if ($activeUser.transactions) { $activeUser.transactions } else { $db.transactions }
        $responseJson = @{ success = $true; data = $txs } | ConvertTo-Json -Depth 5
      }
      elseif ($rawUrl -eq "/api/upi/verify-pin" -and $method -eq "POST") {
        $db = Get-Db
        $pin = if ($reqData) { $reqData.pin } else { "" }
        $isValid = ($pin -eq "1234" -or ($db.account -and $pin -eq $db.account.upiPin))
        $responseJson = @{ success = $isValid; error = if ($isValid) { $null } else { "Invalid UPI PIN" } } | ConvertTo-Json
      }
      elseif ($rawUrl -eq "/api/transfer" -and $method -eq "POST") {
        $db = Get-Db
        $payee = if ($reqData -and $reqData.payee) { $reqData.payee.ToString().Trim() } else { "Merchant" }
        $amount = if ($reqData) { [double]$reqData.amount } else { 0 }
        $pin = if ($reqData) { $reqData.pin } else { "" }
        $faceVerified = if ($reqData -and $reqData.faceVerified) { [bool]$reqData.faceVerified } else { $false }
        $verifMethod = if ($reqData -and $reqData.verificationMethod) { $reqData.verificationMethod.ToString() } else { "pin" }

        # Resolve sender
        $authHdr = $req.Headers["Authorization"]
        $sender = $null
        if ($authHdr -and $authHdr -match "USR-\d+") {
          $uid = $matches[0]
          foreach ($u in $db.users) { if ($u.id -eq $uid) { $sender = $u; break } }
        }
        if (-not $sender -and $db.users) { $sender = $db.users[0] }

        # Resolve recipient
        $recipient = $null
        $pClean = $payee.ToLower()
        if ($db.users) {
          foreach ($u in $db.users) {
            if ($u.upiId.ToLower() -eq $pClean -or $u.username.ToLower() -eq $pClean -or $u.accountNumber.ToString() -eq $pClean -or $u.upiId.ToLower() -eq "$pClean@sahaay") {
              $recipient = $u
              break
            }
          }
        }

        if ($sender.isFrozen) {
          $res.StatusCode = 403
          $responseJson = '{"success":false,"error":"Account is currently frozen"}'
        }
        elseif (-not $recipient) {
          $res.StatusCode = 404
          $responseJson = @{ success = $false; error = "Recipient $payee not found in demo accounts." } | ConvertTo-Json
        }
        elseif ($recipient.id -eq $sender.id) {
          $res.StatusCode = 400
          $responseJson = '{"success":false,"error":"Self-transfers are not permitted."}'
        }
        elseif ($amount -le 0) {
          $res.StatusCode = 400
          $responseJson = '{"success":false,"error":"Transfer amount must be greater than 0"}'
        }
        elseif ($sender.balance -lt $amount) {
          $res.StatusCode = 400
          $responseJson = '{"success":false,"error":"Insufficient demo balance"}'
        }
        elseif ($verifMethod -eq "pin" -and $pin -ne $sender.upiPin -and $pin -ne "1234") {
          $res.StatusCode = 401
          $responseJson = '{"success":false,"error":"Invalid UPI PIN"}'
        }
        else {
          # Update balances
          $sender.balance = [Math]::Round(($sender.balance - $amount), 2)
          $recipient.balance = [Math]::Round(($recipient.balance + $amount), 2)
          $refId = "SAH-" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()

          $senderTx = [ordered]@{
            id = "TXN-" + (Get-Date).Ticks
            userId = $sender.id
            date = "Today"
            description = "Transfer to $($recipient.name) ($($recipient.upiId))"
            type = "Debit"
            amount = $amount
            tag = "TRANSFER"
            counterparty = $recipient.name
            counterpartyUserId = $recipient.id
            status = "SUCCESS"
            referenceId = $refId
          }

          $recipientTx = [ordered]@{
            id = "TXN-" + ((Get-Date).Ticks + 1)
            userId = $recipient.id
            date = "Today"
            description = "Transfer from $($sender.name) ($($sender.upiId))"
            type = "Credit"
            amount = $amount
            tag = "TRANSFER"
            counterparty = $sender.name
            counterpartyUserId = $sender.id
            status = "SUCCESS"
            referenceId = $refId
          }

          $sender.transactions = @($senderTx) + $sender.transactions
          $recipient.transactions = @($recipientTx) + $recipient.transactions
          Save-Db $db

          $responseJson = @{
            success = $true
            data = @{
              referenceId = $refId
              newBalance = $sender.balance
              transaction = $senderTx
              recipient = @{
                id = $recipient.id
                name = $recipient.name
                upiId = $recipient.upiId
                accountNumber = $recipient.accountNumber
              }
            }
          } | ConvertTo-Json
        }
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

