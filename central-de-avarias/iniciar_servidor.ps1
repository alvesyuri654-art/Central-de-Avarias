# ==============================================================================
# CENTRAL DE AVARIAS — SERVIDOR WEB NATIVO WINDOWS / POWERSHELL
# ==============================================================================
# Desenvolvido com System.Net.Sockets.TcpListener (DualMode IPv4 + IPv6)
# Suporta execucao corporativa sem Node.js, sem dependencias externas e sem admin.
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Central de Avarias - Servidor Web Ativo"

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $baseDir) { $baseDir = Get-Location }

# Portas preferenciais em ordem de tentativa
$preferredPorts = @(5173, 5174, 5175, 19090, 19091, 18090)
$listener = $null
$activePort = $null

foreach ($p in $preferredPorts) {
    try {
        # Tenta modo dual IPv6 + IPv4 (cobre localhost ::1 e 127.0.0.1)
        $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::IPv6Any, $p)
        $l.Server.DualMode = $true
        $l.Start()
        $listener = $l
        $activePort = $p
        break
    } catch {
        try {
            # Fallback para IPv4 Any se IPv6 estiver desabilitado na interface
            $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $p)
            $l.Start()
            $listener = $l
            $activePort = $p
            break
        } catch {
            if ($l) { $l.Stop() }
        }
    }
}

if (-not $listener -or -not $activePort) {
    Write-Host "[ERRO CRITICO] Nao foi possivel abrir nenhuma das portas preferenciais." -ForegroundColor Red
    exit 1
}

# Registra porta ativa e status para scripts utilitarios
$activePort | Out-File -FilePath (Join-Path $baseDir "active_port.txt") -Encoding utf8 -Force
$serverInfo = @{
    appName = "Central de Avarias"
    port = $activePort
    url = "http://localhost:${activePort}/"
    startedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json
$serverInfo | Out-File -FilePath (Join-Path $baseDir "server_info.json") -Encoding utf8 -Force

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         CENTRAL DE AVARIAS - SERVIDOR WEB PRONTO E ATIVO             " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  > Acesso Local   : http://localhost:${activePort}/" -ForegroundColor Yellow
Write-Host "  > Acesso Loopback: http://127.0.0.1:${activePort}/" -ForegroundColor Yellow
Write-Host "  > Diretorio Base : $baseDir" -ForegroundColor Gray
Write-Host ""
Write-Host "  [OK] Conexoes ativas prontas para navegadores (Chrome, Edge, Firefox)" -ForegroundColor Green
Write-Host "  [DICA] Mantenha esta janela aberta enquanto utilizar o sistema." -ForegroundColor Cyan
Write-Host "  Pressione Ctrl + C para encerrar o servidor." -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan

# Mapeamento de Tipos MIME
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".pdf"  = "application/pdf"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

# Loop de atendimento de requisicoes HTTP
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 4000
            $stream.WriteTimeout = 4000

            $buf = New-Object byte[] 8192
            $bytesRead = $stream.Read($buf, 0, $buf.Length)
            if ($bytesRead -le 0) {
                $client.Close()
                continue
            }

            $reqText = [System.Text.Encoding]::ASCII.GetString($buf, 0, $bytesRead)
            $firstLine = $reqText.Split("`n")[0].Trim()
            $parts = $firstLine.Split(" ")
            $method = if ($parts.Length -gt 0) { $parts[0].ToUpper() } else { "GET" }
            $rawUrl = if ($parts.Length -gt 1) { $parts[1] } else { "/" }

            # Resposta para requisicoes OPTIONS (CORS preflight)
            if ($method -eq "OPTIONS") {
                $optHeaders = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS, HEAD`r`nAccess-Control-Allow-Headers: *`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                $optBytes = [System.Text.Encoding]::ASCII.GetBytes($optHeaders)
                $stream.Write($optBytes, 0, $optBytes.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            # Tratamento de URL (remove query strings e hashes)
            $pathPart = $rawUrl.Split("?")[0].Split("#")[0]
            $pathDecoded = [System.Uri]::UnescapeDataString($pathPart)
            if ($pathDecoded -eq "/" -or [string]::IsNullOrWhiteSpace($pathDecoded)) {
                $pathDecoded = "/index.html"
            }

            # Resposta de Health Check
            if ($pathDecoded -eq "/api/health") {
                $healthBody = '{"status":"ok","app":"central-de-avarias","port":' + $activePort + '}'
                $healthBytes = [System.Text.Encoding]::UTF8.GetBytes($healthBody)
                $headers = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($healthBytes.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
                $headBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                $stream.Write($headBytes, 0, $headBytes.Length)
                if ($method -ne "HEAD") {
                    $stream.Write($healthBytes, 0, $healthBytes.Length)
                }
                $stream.Flush()
                $client.Close()
                continue
            }

            # Localizacao segura do arquivo em disco
            $relPath = $pathDecoded.TrimStart("/").Replace("/", "\")
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $baseDir $relPath))

            # Evita Path Traversal fora do diretorio do projeto
            if (-not $fullPath.StartsWith($baseDir, [System.StringComparison]::OrdinalIgnoreCase)) {
                $fullPath = Join-Path $baseDir "index.html"
            }

            # Fallback SPA para rotas client-side (ex: /inventory, /transfers, /invoices)
            if (-not (Test-Path $fullPath -PathType Leaf)) {
                $ext = [System.IO.Path]::GetExtension($fullPath)
                if ([string]::IsNullOrEmpty($ext)) {
                    $fullPath = Join-Path $baseDir "index.html"
                }
            }

            if (Test-Path $fullPath -PathType Leaf) {
                $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                $cType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

                $headers = "HTTP/1.1 200 OK`r`nContent-Type: $cType`r`nContent-Length: $($fileBytes.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache`r`n`r`n"
                $headBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                $stream.Write($headBytes, 0, $headBytes.Length)
                if ($method -ne "HEAD") {
                    $stream.Write($fileBytes, 0, $fileBytes.Length)
                }
                $stream.Flush()
            } else {
                $msg = "404 - Arquivo nao encontrado: $pathDecoded"
                $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
                $headers = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($msgBytes.Length)`r`nConnection: close`r`n`r`n"
                $headBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                $stream.Write($headBytes, 0, $headBytes.Length)
                if ($method -ne "HEAD") {
                    $stream.Write($msgBytes, 0, $msgBytes.Length)
                }
                $stream.Flush()
            }
        } catch {
            # Conexao finalizada pelo cliente ou timeout
        } finally {
            try { $client.Close() } catch {}
        }
    }
} finally {
    if ($listener) {
        $listener.Stop()
    }
}
