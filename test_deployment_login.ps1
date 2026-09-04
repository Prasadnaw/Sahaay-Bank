Add-Type -AssemblyName System.Net.WebSockets
Add-Type -AssemblyName System.Threading.Tasks

$targetUrl = "http://localhost:5050/"
$tabs = Invoke-RestMethod -Uri "http://localhost:9222/json" -Method Get
$tab = $tabs | Where-Object { $_.url -like "*5050*" -and $_.type -eq "page" } | Select-Object -First 1

if (-not $tab) {
    Write-Host "No active page tab found on 9222"
    exit 0
}

$wsUri = [System.Uri]$tab.webSocketDebuggerUrl
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$cts = New-Object System.Threading.CancellationTokenSource
$ws.ConnectAsync($wsUri, $cts.Token).Wait()

function Send-Cdp ($msg) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
    $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
    $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
}

function Recv-Cdp {
    $buffer = New-Object byte[] 65536
    $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
    $result = $ws.ReceiveAsync($segment, $cts.Token).Result
    return [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
}

Send-Cdp '{"id":1,"method":"Runtime.enable"}'
$r1 = Recv-Cdp

# Test login with non-existent / 404 API URL
$testScript = @'
(async () => {
    // 1. Force a broken/static-host URL to simulate deployed environment where API returns 404
    window.SahaayConfig.apiBaseUrl = "/api-static-404-simulation";

    // 2. Select Standard profile
    window.SahaayApp.selectDisabilityAndProceed("standard");
    await new Promise(r => setTimeout(r, 200));

    // 3. Fill demo credentials
    document.getElementById("autoFillDemoBtn")?.click();
    const chk = document.getElementById("captchaCheckbox");
    if (chk) chk.checked = true;

    // 4. Test login directly
    const authRes = await window.SahaayAPI.login("asha.patel", "SahaaySafe2026!");

    // 5. Trigger attemptLogin
    await window.SahaayApp.attemptLogin();
    await new Promise(r => setTimeout(r, 400));

    const dash = document.getElementById("dashboardView");
    const err = document.getElementById("captchaError");

    return JSON.stringify({
        apiResult: authRes,
        dashboardVisible: dash ? !dash.hidden : false,
        errorVisible: err ? !err.hidden : false,
        errorText: err ? err.textContent : ""
    });
})()
'@

$evalPayload = @{
    id = 2
    method = "Runtime.evaluate"
    params = @{
        expression = $testScript
        returnByValue = $true
        awaitPromise = $true
    }
} | ConvertTo-Json

Send-Cdp $evalPayload

$done = $false
while (-not $done) {
    $msg = Recv-Cdp
    if ($msg -like '*"id":2*') {
        Write-Host "EVAL RESULT:"
        Write-Host $msg
        $done = $true
    }
}

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", $cts.Token).Wait()
