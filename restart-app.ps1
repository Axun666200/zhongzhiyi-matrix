# 关闭现有进程
Write-Host "正在关闭Chrome和Electron进程..."
try {
    Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
} catch {
    Write-Host "进程关闭完成"
}

# 等待进程完全关闭
Start-Sleep -Seconds 3

# 重新启动应用
Write-Host "正在启动应用..."
npm start