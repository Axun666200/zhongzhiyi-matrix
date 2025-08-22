@echo off
echo 正在启动带代理的Chrome浏览器...
echo 代理服务器: 61.172.168.161:2081
echo 认证: ravu01r1
echo.

"C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-server="http://ravu01r1:ravu01r1@61.172.168.161:2081" --user-data-dir="proxy-test-session" --disable-web-security --window-size=1200,800 "https://httpbin.org/ip"

echo.
echo Chrome已启动！请查看浏览器窗口中显示的IP地址。
echo 如果显示 61.172.168.161 则代理工作正常。
pause