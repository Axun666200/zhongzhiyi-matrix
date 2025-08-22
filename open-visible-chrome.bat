@echo off
echo 正在启动可见的Chrome代理窗口...
echo.

REM 先关闭现有的Chrome进程
taskkill /f /im chrome.exe >nul 2>&1

echo 等待2秒...
timeout /t 2 /nobreak >nul

echo 启动新的Chrome窗口...
start "Proxy Test Chrome" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --proxy-server="http://ravu01r1:ravu01r1@61.172.168.161:2081" ^
  --user-data-dir="%temp%\chrome-proxy-test" ^
  --disable-web-security ^
  --window-size=1200,800 ^
  --new-window ^
  --force-visible ^
  "https://httpbin.org/ip"

echo.
echo Chrome窗口应该已经打开!
echo 如果看到 "origin": "61.172.168.161" 说明代理工作正常
echo.
pause