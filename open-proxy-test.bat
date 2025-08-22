@echo off
echo 正在启动代理测试浏览器窗口...
"C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-server="http://ravu01r1:ravu01r1@61.172.168.161:2081" --user-data-dir="proxy-test-final" --disable-web-security --window-size=1200,800 "https://httpbin.org/ip"
pause