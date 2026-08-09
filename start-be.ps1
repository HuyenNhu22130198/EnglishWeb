# Starts Docker Desktop (if not running), brings up the whisper.cpp container,
# then runs the Spring Boot backend. Run from repo root: .\start-be.ps1
$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot
$dockerDesktopExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

function Test-DockerReady {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

if (-not (Test-DockerReady)) {
    Write-Host "Docker chua san sang, dang khoi dong Docker Desktop..."
    Start-Process -FilePath $dockerDesktopExe | Out-Null

    $timeoutSeconds = 120
    $elapsed = 0
    while (-not (Test-DockerReady)) {
        if ($elapsed -ge $timeoutSeconds) {
            Write-Error "Docker Desktop khong san sang sau $timeoutSeconds giay. Hay mo Docker Desktop thu cong roi chay lai script."
            exit 1
        }
        Start-Sleep -Seconds 3
        $elapsed += 3
        Write-Host "... dang cho Docker (${elapsed}s)"
    }
    Write-Host "Docker da san sang."
}

Write-Host "Khoi dong whisper.cpp container..."
docker compose -f "$repoRoot\docker-compose.yml" up -d whisper

Write-Host "Khoi dong backend Spring Boot..."
Set-Location "$repoRoot\be"
& "$repoRoot\be\mvnw.cmd" spring-boot:run
