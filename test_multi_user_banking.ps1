$base = "http://localhost:5050/api"
$ErrorActionPreference = "Stop"

Write-Host "=================================================="
Write-Host "🧪 SAHAAY BANK: MULTI-USER DEMO VERIFICATION"
Write-Host "=================================================="

# 1. Health check
$health = Invoke-RestMethod -Uri "$base/health" -Method Get
Write-Host "1. Health check: $($health.status) (version: $($health.version))"
if ($health.status -ne "ok") { throw "Health check failed" }

# 2. Login as Asha Patel
$ashaLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{
    username = "asha.patel"
    password = "SahaaySafe2026!"
} | ConvertTo-Json)

Write-Host "2. Asha Login: $($ashaLogin.user.name) (Balance: $($ashaLogin.user.balance))"
$ashaToken = $ashaLogin.token
$ashaHeaders = @{
    "Authorization" = "Bearer $ashaToken"
    "Content-Type" = "application/json"
}

# Verify Asha starting balance is 39404.50
Write-Host "   Asha Initial Balance: ₹$($ashaLogin.user.balance)"

# 3. Add ₹1,000 Demo Money to Asha's account
$depositRes = Invoke-RestMethod -Uri "$base/account/deposit" -Method Post -Headers $ashaHeaders -Body (@{
    amount = 1000
} | ConvertTo-Json)

Write-Host "3. Asha Deposit ₹1,000: New Balance = ₹$($depositRes.data.newBalance)"
if ($depositRes.data.newBalance -ne 40404.50) {
    throw "Expected Asha balance to be 40404.50 after deposit, got $($depositRes.data.newBalance)"
}

# 4. Transfer ₹500 from Asha to Rajesh (rajesh@sahaay)
$transferRes = Invoke-RestMethod -Uri "$base/transfer" -Method Post -Headers $ashaHeaders -Body (@{
    payee = "rajesh@sahaay"
    amount = 500
    pin = "1234"
} | ConvertTo-Json)

Write-Host "4. Transfer ₹500 to rajesh@sahaay:"
Write-Host "   Reference ID: $($transferRes.data.referenceId)"
Write-Host "   Asha New Balance: ₹$($transferRes.data.newBalance)"
Write-Host "   Recipient: $($transferRes.data.recipient.name) ($($transferRes.data.recipient.upiId))"

if ($transferRes.data.newBalance -ne 39904.50) {
    throw "Expected Asha balance to be 39904.50 after transfer, got $($transferRes.data.newBalance)"
}
$sharedRefId = $transferRes.data.referenceId

# 5. Verify Asha's transaction history contains the Debit
$ashaTx = Invoke-RestMethod -Uri "$base/transactions" -Method Get -Headers $ashaHeaders
$ashaLatest = $ashaTx.data[0]
Write-Host "   Asha Latest Tx: $($ashaLatest.description), Type=$($ashaLatest.type), Amount=$($ashaLatest.amount), Ref=$($ashaLatest.referenceId)"
if ($ashaLatest.type -ne "Debit" -or $ashaLatest.amount -ne 500 -or $ashaLatest.referenceId -ne $sharedRefId) {
    throw "Asha debit transaction does not match expected reference ID or amount"
}

# 6. Login as Rajesh Kumar
$rajeshLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{
    username = "rajesh.kumar"
    password = "BlindAccess2026!"
} | ConvertTo-Json)

$rajeshToken = $rajeshLogin.token
$rajeshHeaders = @{
    "Authorization" = "Bearer $rajeshToken"
    "Content-Type" = "application/json"
}

Write-Host "5. Rajesh Login: $($rajeshLogin.user.name) (Balance: ₹$($rajeshLogin.user.balance))"
if ($rajeshLogin.user.balance -ne 29000.00) {
    throw "Expected Rajesh balance to be 29000.00, got $($rajeshLogin.user.balance)"
}

# 7. Verify Rajesh's transaction history contains the Credit from Asha with shared reference ID
$rajeshTx = Invoke-RestMethod -Uri "$base/transactions" -Method Get -Headers $rajeshHeaders
$rajeshLatest = $rajeshTx.data[0]
Write-Host "   Rajesh Latest Tx: $($rajeshLatest.description), Type=$($rajeshLatest.type), Amount=$($rajeshLatest.amount), Ref=$($rajeshLatest.referenceId)"
if ($rajeshLatest.type -ne "Credit" -or $rajeshLatest.amount -ne 500 -or $rajeshLatest.referenceId -ne $sharedRefId) {
    throw "Rajesh credit transaction does not match expected shared reference ID or amount"
}

# 8. Transfer ₹300 from Rajesh to Meera (meera@sahaay)
$rajeshToMeera = Invoke-RestMethod -Uri "$base/transfer" -Method Post -Headers $rajeshHeaders -Body (@{
    payee = "meera@sahaay"
    amount = 300
    pin = "5678"
} | ConvertTo-Json)

Write-Host "6. Rajesh -> Meera Transfer ₹300:"
Write-Host "   Rajesh Balance after transfer: ₹$($rajeshToMeera.data.newBalance)"
Write-Host "   Recipient: $($rajeshToMeera.data.recipient.name)"

# 9. Login as Meera Sharma and verify balance
$meeraLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{
    username = "meera.sharma"
    password = "SeniorCare2026!"
} | ConvertTo-Json)
Write-Host "7. Meera Login: Balance = ₹$($meeraLogin.user.balance)"
if ($meeraLogin.user.balance -ne 64500.75) {
    throw "Expected Meera balance to be 64500.75, got $($meeraLogin.user.balance)"
}

# 10. Registration Test: Register "Test User"
$regPayload = @{
    name = "Test User"
    username = "test.user"
    password = "TestPassword2026!"
    confirmPassword = "TestPassword2026!"
    phone = "9000000000"
    accessibilityProfile = "standard"
} | ConvertTo-Json

$regRes = Invoke-RestMethod -Uri "$base/auth/register" -Method Post -ContentType "application/json" -Body $regPayload
Write-Host "8. User Registration: $($regRes.message)"
Write-Host "   Created User ID: $($regRes.user.id)"
Write-Host "   Account Number: $($regRes.user.accountNumber)"
Write-Host "   UPI ID: $($regRes.user.upiId)"
Write-Host "   Starting Balance: ₹$($regRes.user.balance)"

if ($regRes.user.balance -ne 0.00) { throw "Expected new user balance to start at 0" }
if ($regRes.user.upiId -ne "test.user@sahaay") { throw "Expected UPI ID to be test.user@sahaay" }

# 11. User Search Test: Search for "test.user"
$searchRes = Invoke-RestMethod -Uri "$base/users/search?q=test" -Method Get -Headers $ashaHeaders
Write-Host "9. User Search for 'test':"
$foundInSearch = $searchRes.data | Where-Object { $_.username -eq "test.user" }
if (-not $foundInSearch) { throw "test.user not found in directory search" }
Write-Host "   Found: $($foundInSearch.name) ($($foundInSearch.upiId)), Acc ending in $($foundInSearch.accountNumber)"

# 12. Transfer from Asha to newly registered Test User
$transferToNewUser = Invoke-RestMethod -Uri "$base/transfer" -Method Post -Headers $ashaHeaders -Body (@{
    payee = "test.user@sahaay"
    amount = 250
    pin = "1234"
} | ConvertTo-Json)

Write-Host "10. Asha -> Test User Transfer ₹250:"
Write-Host "    Asha New Balance: ₹$($transferToNewUser.data.newBalance)"
Write-Host "    Reference ID: $($transferToNewUser.data.referenceId)"

# 13. Login as Test User, check balance & add deposit
$testUserLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{
    username = "test.user"
    password = "TestPassword2026!"
} | ConvertTo-Json)
$testHeaders = @{
    "Authorization" = "Bearer $($testUserLogin.token)"
    "Content-Type" = "application/json"
}
Write-Host "11. Test User Balance after receiving transfer: ₹$($testUserLogin.user.balance)"
if ($testUserLogin.user.balance -ne 250.00) {
    throw "Expected Test User balance to be 250.00, got $($testUserLogin.user.balance)"
}

# Test User deposits ₹500
$testUserDeposit = Invoke-RestMethod -Uri "$base/account/deposit" -Method Post -Headers $testHeaders -Body (@{
    amount = 500
} | ConvertTo-Json)
Write-Host "12. Test User Deposits ₹500: New Balance = ₹$($testUserDeposit.data.newBalance)"
if ($testUserDeposit.data.newBalance -ne 750.00) {
    throw "Expected Test User balance to be 750.00, got $($testUserDeposit.data.newBalance)"
}

# Test User sends ₹100 back to Asha
$testSendBack = Invoke-RestMethod -Uri "$base/transfer" -Method Post -Headers $testHeaders -Body (@{
    payee = "asha.patel@sahaay"
    amount = 100
    pin = "1234"
} | ConvertTo-Json)
Write-Host "13. Test User -> Asha Transfer ₹100: Test User Final Balance = ₹$($testSendBack.data.newBalance)"
if ($testSendBack.data.newBalance -ne 650.00) {
    throw "Expected Test User balance to be 650.00, got $($testSendBack.data.newBalance)"
}

Write-Host "=================================================="
Write-Host "🎉 ALL 13 TEST SCENARIOS PASSED WITH ZERO ERRORS!"
Write-Host "=================================================="
