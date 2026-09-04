$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5050/api"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🧪 STARTING SAHAAY BANK QR, RISK & RUNNING BALANCE TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$passed = 0
$total = 13

function Assert-Test($name, $condition) {
    if ($condition) {
        Write-Host "  ✅ PASS: $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  ❌ FAIL: $name" -ForegroundColor Red
        throw "Assertion failed for $name"
    }
}

# 1. Login as Asha Patel
Write-Host "`n[1/13] Authenticating as Asha Patel..." -ForegroundColor Yellow
$loginBody = @{
    username = "asha.patel"
    password = "SahaaySafe2026!"
} | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$ashaToken = $loginRes.token
$ashaId = $loginRes.user.id
$headersAsha = @{
    "Authorization" = "Bearer $ashaToken"
    "x-user-id" = $ashaId
}
Assert-Test "Asha Patel authentication successful" ($loginRes.success -and $ashaToken.Length -gt 10)

# 2. Login as Rajesh Kumar
Write-Host "`n[2/13] Authenticating as Rajesh Kumar..." -ForegroundColor Yellow
$rajeshLogin = @{
    username = "rajesh.kumar"
    password = "BlindAccess2026!"
} | ConvertTo-Json
$rajeshRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $rajeshLogin -ContentType "application/json"
$rajeshToken = $rajeshRes.token
$rajeshId = $rajeshRes.user.id
$headersRajesh = @{
    "Authorization" = "Bearer $rajeshToken"
    "x-user-id" = $rajeshId
}
Assert-Test "Rajesh Kumar authentication successful" ($rajeshRes.success -and $rajeshToken.Length -gt 10)

# 3. Test My QR Payload
Write-Host "`n[3/13] Testing My QR Generation for Authenticated User..." -ForegroundColor Yellow
$qrRes = Invoke-RestMethod -Uri "$baseUrl/qr/my-qr" -Method Get -Headers $headersAsha
$qrData = $qrRes.data
Assert-Test "My QR returns SAHAAY_PAYMENT format" ($qrRes.success -and $qrData.type -eq "SAHAAY_PAYMENT" -and $qrData.upiId -eq "asha.patel@sahaay")
Assert-Test "My QR masks account and excludes private auth" ($qrData.accountNumberMasked.StartsWith("****") -and $qrData.password -eq $null -and $qrData.upiPin -eq $null)

# 4. Test Recipient Lookup
Write-Host "`n[4/13] Testing Recipient Lookup (/api/users/lookup?upiId=rajesh@sahaay)..." -ForegroundColor Yellow
$lookupRes = Invoke-RestMethod -Uri "$baseUrl/users/lookup?upiId=rajesh@sahaay" -Method Get -Headers $headersAsha
Assert-Test "Lookup returns authentic safe recipient details" ($lookupRes.success -and $lookupRes.user.name -eq "Rajesh Kumar" -and $lookupRes.user.upiId -eq "rajesh@sahaay" -and $lookupRes.user.accountNumberMasked -eq "****8821")

# 5. True QR-to-QR Transfer: ₹500 from Asha to Rajesh
Write-Host "`n[5/13] Executing True QR Transfer: ₹500 Asha -> Rajesh..." -ForegroundColor Yellow
$ashaAccBefore = (Invoke-RestMethod -Uri "$baseUrl/account" -Method Get -Headers $headersAsha).data
$rajeshAccBefore = (Invoke-RestMethod -Uri "$baseUrl/account" -Method Get -Headers $headersRajesh).data

$transferPayload = @{
    payee = "rajesh@sahaay"
    amount = 500
    pin = "1234"
    verificationMethod = "pin"
    paymentMethod = "QR"
} | ConvertTo-Json
$transferRes = Invoke-RestMethod -Uri "$baseUrl/transfer" -Method Post -Body $transferPayload -ContentType "application/json" -Headers $headersAsha
Assert-Test "Transfer execution responds with success" ($transferRes.success -and $transferRes.data.referenceId.StartsWith("SAH-QR-"))

$ashaAccAfter = (Invoke-RestMethod -Uri "$baseUrl/account" -Method Get -Headers $headersAsha).data
$rajeshAccAfter = (Invoke-RestMethod -Uri "$baseUrl/account" -Method Get -Headers $headersRajesh).data
Assert-Test "Asha balance decreased by exactly ₹500" ($ashaAccAfter.balance -eq [Math]::Round($ashaAccBefore.balance - 500, 2))
Assert-Test "Rajesh balance increased by exactly ₹500" ($rajeshAccAfter.balance -eq [Math]::Round($rajeshAccBefore.balance + 500, 2))

# 6. Transaction History Verification for Sender and Receiver
Write-Host "`n[6/13] Verifying Transaction History & Running Balance Column..." -ForegroundColor Yellow
$ashaTxRes = (Invoke-RestMethod -Uri "$baseUrl/transactions" -Method Get -Headers $headersAsha).data
$rajeshTxRes = (Invoke-RestMethod -Uri "$baseUrl/transactions" -Method Get -Headers $headersRajesh).data

$latestAshaTx = $ashaTxRes[0]
$latestRajeshTx = $rajeshTxRes[0]

Assert-Test "Asha transaction has type=QR_PAYMENT, direction=DEBIT, paymentMethod=QR" ($latestAshaTx.type -eq "QR_PAYMENT" -and $latestAshaTx.direction -eq "DEBIT" -and $latestAshaTx.paymentMethod -eq "QR")
Assert-Test "Asha transaction records running balanceAfter" ($latestAshaTx.balanceAfter -eq $ashaAccAfter.balance)
Assert-Test "Rajesh transaction has type=QR_PAYMENT, direction=CREDIT, paymentMethod=QR" ($latestRajeshTx.type -eq "QR_PAYMENT" -and $latestRajeshTx.direction -eq "CREDIT" -and $latestRajeshTx.paymentMethod -eq "QR")
Assert-Test "Shared reference ID matches on both dual records" ($latestAshaTx.referenceId -eq $latestRajeshTx.referenceId)

# 7. Normal Transfer below Risk Threshold (< ₹10,000)
Write-Host "`n[7/13] Testing Transfer below Demo Risk Threshold (₹9,999 without reason)..." -ForegroundColor Yellow
$belowThresholdPayload = @{
    payee = "rajesh@sahaay"
    amount = 9999
    pin = "1234"
    paymentMethod = "UPI"
} | ConvertTo-Json
$belowRes = Invoke-RestMethod -Uri "$baseUrl/transfer" -Method Post -Body $belowThresholdPayload -ContentType "application/json" -Headers $headersAsha
Assert-Test "Transfer below ₹10,000 succeeds without requiring reason" ($belowRes.success)

# 8. Transfer >= ₹10,000 without reason must be rejected
Write-Host "`n[8/13] Testing Transfer >= ₹10,000 without reason (Must be rejected)..." -ForegroundColor Yellow
$noReasonPayload = @{
    payee = "rajesh@sahaay"
    amount = 10000
    pin = "1234"
    paymentMethod = "UPI"
} | ConvertTo-Json

$rejectedAsExpected = $false
try {
    Invoke-RestMethod -Uri "$baseUrl/transfer" -Method Post -Body $noReasonPayload -ContentType "application/json" -Headers $headersAsha
} catch {
    $rejectedAsExpected = ($_.Exception.Response.StatusCode -eq 400)
}
Assert-Test "Transfer >= ₹10,000 without reason is rejected by backend (HTTP 400)" ($rejectedAsExpected)

# 9. Transfer >= ₹10,000 with valid reason category
Write-Host "`n[9/13] Testing Transfer >= ₹10,000 with valid category (Education)..." -ForegroundColor Yellow
$validReasonPayload = @{
    payee = "rajesh@sahaay"
    amount = 10000
    pin = "1234"
    paymentMethod = "UPI"
    reasonCategory = "Education"
} | ConvertTo-Json
$validReasonRes = Invoke-RestMethod -Uri "$baseUrl/transfer" -Method Post -Body $validReasonPayload -ContentType "application/json" -Headers $headersAsha
Assert-Test "Transfer >= ₹10,000 with reasonCategory succeeds" ($validReasonRes.success -and $validReasonRes.data.reasonCategory -eq "Education")

# 10. Transfer >= ₹10,000 with 'Other' and empty explanation must be rejected
Write-Host "`n[10/13] Testing Transfer >= ₹10,000 with Other and empty text (Must be rejected)..." -ForegroundColor Yellow
$emptyOtherPayload = @{
    payee = "rajesh@sahaay"
    amount = 10000
    pin = "1234"
    paymentMethod = "UPI"
    reasonCategory = "Other"
    reasonText = ""
} | ConvertTo-Json

$otherRejected = $false
try {
    Invoke-RestMethod -Uri "$baseUrl/transfer" -Method Post -Body $emptyOtherPayload -ContentType "application/json" -Headers $headersAsha
} catch {
    $otherRejected = ($_.Exception.Response.StatusCode -eq 400)
}
Assert-Test "Transfer with Other and empty text is rejected (HTTP 400)" ($otherRejected)

# 11. Transfer >= ₹10,000 with 'Other' and valid reasonText
Write-Host "`n[11/13] Testing Transfer >= ₹10,000 with Other and custom explanation..." -ForegroundColor Yellow
$otherSuccessPayload = @{
    payee = "rajesh@sahaay"
    amount = 10000
    pin = "1234"
    paymentMethod = "UPI"
    reasonCategory = "Other"
    reasonText = "College fee semester payment"
} | ConvertTo-Json
$otherSuccessRes = Invoke-RestMethod -Uri "$baseUrl/transfer" -Method Post -Body $otherSuccessPayload -ContentType "application/json" -Headers $headersAsha
Assert-Test "Transfer with Other and valid reasonText succeeds" ($otherSuccessRes.success -and $otherSuccessRes.data.reasonText -eq "College fee semester payment")

# 12. Account Freeze Blocking
Write-Host "`n[12/13] Testing Account Freeze Protection..." -ForegroundColor Yellow
# Freeze account
Invoke-RestMethod -Uri "$baseUrl/account/freeze" -Method Post -Body (@{ frozen = $true } | ConvertTo-Json) -ContentType "application/json" -Headers $headersAsha | Out-Null
$freezeBlocked = $false
try {
    $attemptPayload = @{ payee = "rajesh@sahaay"; amount = 100; pin = "1234" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/transfer" -Method Post -Body $attemptPayload -ContentType "application/json" -Headers $headersAsha
} catch {
    $freezeBlocked = ($_.Exception.Response.StatusCode -eq 403)
}
# Unfreeze
Invoke-RestMethod -Uri "$baseUrl/account/freeze" -Method Post -Body (@{ frozen = $false } | ConvertTo-Json) -ContentType "application/json" -Headers $headersAsha | Out-Null
Assert-Test "Transfers while account is frozen are blocked (HTTP 403)" ($freezeBlocked)

# 13. Demo Deposit with Balance Refresh & Running Balance Record
Write-Host "`n[13/13] Testing Demo Deposit and balanceAfter Recording..." -ForegroundColor Yellow
$depRes = Invoke-RestMethod -Uri "$baseUrl/account/deposit" -Method Post -Body (@{ amount = 2500 } | ConvertTo-Json) -ContentType "application/json" -Headers $headersAsha
$depTx = $depRes.data.transaction
Assert-Test "Demo deposit records type=DEPOSIT, direction=CREDIT, and balanceAfter" ($depRes.success -and $depTx.type -eq "DEPOSIT" -and $depTx.direction -eq "CREDIT" -and $depTx.balanceAfter -eq $depRes.data.newBalance)

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "🎉 ALL $passed of $total BACKEND API & BUSINESS LOGIC TESTS PASSED!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
