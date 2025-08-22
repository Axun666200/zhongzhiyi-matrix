@echo off
chcp 65001 >nul
echo 正在启动Chrome代理测试...
echo.
echo 代理服务器: 61.172.168.161:2081
echo 用户名: ravu01r1
echo 密码: ravu01r1
echo.

"C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-server="http://ravu01r1:ravu01r1@61.172.168.161:2081" --new-window --incognito "https://httpbin.org/ip"

echo.
echo Chrome已启动！请查看新的无痕窗口中显示的IP地址
echo 如果显示 61.172.168.161 说明代理工作正常
echo.
pause