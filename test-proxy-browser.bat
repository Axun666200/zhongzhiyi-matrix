@echo off
echo 启动代理测试浏览器...
echo.
echo 代理配置: 61.172.168.161:2081
echo 用户名: ravu01r1
echo 密码: ravu01r1
echo.
echo 正在启动Chrome浏览器...
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --proxy-server="http://ravu01r1:ravu01r1@61.172.168.161:2081" ^
  --user-data-dir="proxy-browser-test" ^
  --disable-web-security ^
  --window-size=1200,800 ^
  "https://httpbin.org/ip"

echo 浏览器已启动！
echo 如果看到IP: 61.172.168.161，说明代理工作正常
pause