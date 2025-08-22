@echo off
chcp 65001 >nul
echo 🚀 代理认证快速测试
echo ===========================
echo 代理服务器: 61.172.168.161:2081
echo 用户名: ravu01r1
echo 密码: ravu01r1
echo.
echo 🧪 启动Chrome测试代理认证...
echo.

REM 清理旧的测试数据
if exist "quick-test-profile" rd /s /q "quick-test-profile"

REM 启动Chrome进行代理测试
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --proxy-server="http://ravu01r1:ravu01r1@61.172.168.161:2081" ^
  --user-data-dir="quick-test-profile" ^
  --new-window ^
  --window-size=1000,700 ^
  "https://httpbin.org/ip"

echo ✅ Chrome已启动，请查看浏览器窗口
echo.
echo 📋 预期结果:
echo   ✅ 如果显示IP: 61.172.168.161 = 代理认证成功！
echo   ❌ 如果显示其他IP = 代理未生效
echo   ❌ 如果弹出认证框 = 需要进一步修复
echo.
pause