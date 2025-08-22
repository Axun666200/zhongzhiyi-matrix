@echo off
echo 正在测试代理连接...
echo.
echo 代理服务器: 61.172.168.161:2081
echo 用户名/密码: ravu01r1/ravu01r1
echo.

start "Chrome代理测试" "C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-server="socks5://ravu01r1:ravu01r1@61.172.168.161:2081" --user-data-dir="proxy-test-simple" --disable-web-security "https://httpbin.org/ip"

echo Chrome已启动，请查看新窗口！
pause