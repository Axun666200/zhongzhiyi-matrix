#!/usr/bin/env python3
"""
简单可靠的代理测试
"""

import requests
import time

def test_proxy():
    """测试代理基本功能"""
    
    proxies = {
        'http': 'http://ravu01r1:ravu01r1@61.172.168.161:2081',
        'https': 'http://ravu01r1:ravu01r1@61.172.168.161:2081'
    }
    
    print("🚀 代理测试开始")
    print("=" * 40)
    
    # 测试HTTP请求
    try:
        print("📡 测试HTTP请求...")
        response = requests.get('http://httpbin.org/ip', proxies=proxies, timeout=15)
        if response.status_code == 200:
            print(f"✅ HTTP成功: {response.status_code}")
            print(f"📄 响应: {response.text.strip()}")
        else:
            print(f"⚠️ HTTP状态码: {response.status_code}")
            
    except Exception as e:
        print(f"❌ HTTP测试失败: {e}")
    
    time.sleep(2)
    
    # 测试用户代理
    try:
        print("\n🔍 测试用户代理...")
        response = requests.get('http://httpbin.org/user-agent', proxies=proxies, timeout=15)
        if response.status_code == 200:
            print(f"✅ 用户代理成功: {response.status_code}")
            print(f"📄 响应: {response.text.strip()}")
        else:
            print(f"⚠️ 用户代理状态码: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 用户代理测试失败: {e}")
    
    time.sleep(2)
    
    # 测试真实网站
    try:
        print("\n🌐 测试真实网站...")
        response = requests.get('http://www.baidu.com', proxies=proxies, timeout=15)
        if response.status_code == 200:
            print(f"✅ 百度访问成功: {response.status_code}")
            print(f"📊 内容大小: {len(response.content)} 字节")
        else:
            print(f"⚠️ 百度状态码: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 百度测试失败: {e}")
    
    print("\n" + "=" * 40)
    print("🎉 代理测试完成!")
    
    # 显示配置
    print("\n📋 代理配置:")
    print("服务器: 61.172.168.161:2081")
    print("认证: ravu01r1:ravu01r1")
    print("\n📝 Python使用代码:")
    print("proxies = {")
    print("    'http': 'http://ravu01r1:ravu01r1@61.172.168.161:2081',")
    print("    'https': 'http://ravu01r1:ravu01r1@61.172.168.161:2081'")
    print("}")
    print("response = requests.get(url, proxies=proxies)")

if __name__ == "__main__":
    test_proxy()