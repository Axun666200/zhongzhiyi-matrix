#!/usr/bin/env python3
"""
生产级代理爬虫模板
基于测试验证的代理配置
"""

import requests
import time
import random
import json
from urllib.parse import urljoin, urlparse
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import logging

class ProductionCrawler:
    def __init__(self, delay_range=(1, 3), max_retries=3):
        """
        初始化生产级爬虫
        
        Args:
            delay_range: 请求间隔范围 (最小, 最大) 秒
            max_retries: 最大重试次数
        """
        # 代理配置 - 已验证工作正常
        self.proxies = {
            'http': 'http://ravu01r1:ravu01r1@61.172.168.161:2081',
            'https': 'http://ravu01r1:ravu01r1@61.172.168.161:2081'
        }
        
        # 创建session
        self.session = requests.Session()
        self.session.proxies = self.proxies
        
        # 配置重试策略
        retry_strategy = Retry(
            total=max_retries,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS"],
            backoff_factor=1
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # 设置真实浏览器Headers
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        })
        
        self.delay_range = delay_range
        self.request_count = 0
        
        # 设置日志
        self.setup_logging()
    
    def setup_logging(self):
        """设置日志"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('crawler.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def get_page(self, url, timeout=10, **kwargs):
        """
        获取页面内容
        
        Args:
            url: 目标URL
            timeout: 超时时间
            **kwargs: 其他requests参数
            
        Returns:
            requests.Response对象或None
        """
        self.request_count += 1
        
        try:
            self.logger.info(f"请求 #{self.request_count}: {url}")
            
            response = self.session.get(url, timeout=timeout, **kwargs)
            response.raise_for_status()  # 检查HTTP错误
            
            self.logger.info(f"成功 {response.status_code}: {len(response.content)} 字节")
            
            # 智能延迟
            self.smart_delay()
            
            return response
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"请求失败 {url}: {e}")
            return None
    
    def post_data(self, url, data=None, json_data=None, timeout=10, **kwargs):
        """
        发送POST请求
        
        Args:
            url: 目标URL
            data: 表单数据
            json_data: JSON数据
            timeout: 超时时间
            **kwargs: 其他requests参数
            
        Returns:
            requests.Response对象或None
        """
        self.request_count += 1
        
        try:
            self.logger.info(f"POST #{self.request_count}: {url}")
            
            if json_data:
                response = self.session.post(url, json=json_data, timeout=timeout, **kwargs)
            else:
                response = self.session.post(url, data=data, timeout=timeout, **kwargs)
            
            response.raise_for_status()
            
            self.logger.info(f"POST成功 {response.status_code}: {len(response.content)} 字节")
            
            self.smart_delay()
            
            return response
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"POST失败 {url}: {e}")
            return None
    
    def smart_delay(self):
        """智能延迟 - 根据请求频率自动调整"""
        base_delay = random.uniform(*self.delay_range)
        
        # 根据请求频率调整延迟
        if self.request_count > 50:
            base_delay *= 1.5  # 增加延迟避免被限制
        elif self.request_count > 100:
            base_delay *= 2
        
        self.logger.debug(f"延迟 {base_delay:.2f} 秒")
        time.sleep(base_delay)
    
    def get_json(self, url, **kwargs):
        """获取JSON数据"""
        response = self.get_page(url, **kwargs)
        if response:
            try:
                return response.json()
            except json.JSONDecodeError as e:
                self.logger.error(f"JSON解析失败 {url}: {e}")
        return None
    
    def download_file(self, url, filename, chunk_size=8192):
        """下载文件"""
        try:
            self.logger.info(f"下载文件: {url} -> {filename}")
            
            response = self.session.get(url, stream=True)
            response.raise_for_status()
            
            with open(filename, 'wb') as f:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
            
            self.logger.info(f"文件下载完成: {filename}")
            self.smart_delay()
            
            return True
            
        except Exception as e:
            self.logger.error(f"文件下载失败: {e}")
            return False
    
    def crawl_sitemap(self, sitemap_url):
        """爬取网站地图"""
        self.logger.info(f"爬取网站地图: {sitemap_url}")
        
        response = self.get_page(sitemap_url)
        if not response:
            return []
        
        # 简单的sitemap解析 (实际项目中建议使用专门的XML解析器)
        urls = []
        import re
        url_pattern = r'<loc>(.*?)</loc>'
        urls = re.findall(url_pattern, response.text)
        
        self.logger.info(f"发现 {len(urls)} 个URL")
        return urls
    
    def check_proxy_status(self):
        """检查代理状态"""
        self.logger.info("检查代理状态...")
        
        test_urls = [
            'http://httpbin.org/ip',
            'https://api.ipify.org?format=json',
            'http://ip-api.com/json'
        ]
        
        for url in test_urls:
            data = self.get_json(url)
            if data:
                self.logger.info(f"代理IP检测 {url}: {data}")
            else:
                self.logger.warning(f"代理检测失败: {url}")

def example_usage():
    """使用示例"""
    print("🚀 启动生产级代理爬虫...")
    
    # 创建爬虫实例
    crawler = ProductionCrawler(delay_range=(1, 3))
    
    # 检查代理状态
    crawler.check_proxy_status()
    
    print("\n" + "="*60)
    print("🕷️ 爬虫示例")
    print("="*60)
    
    # 示例1: 爬取JSON API
    print("\n1. 测试JSON API...")
    data = crawler.get_json('https://jsonplaceholder.typicode.com/posts/1')
    if data:
        print(f"✅ 获取数据: {data.get('title', 'N/A')}")
    
    # 示例2: 爬取HTML页面
    print("\n2. 测试HTML页面...")
    response = crawler.get_page('https://httpbin.org/html')
    if response:
        print(f"✅ 获取HTML: {len(response.text)} 字符")
    
    # 示例3: 测试POST请求
    print("\n3. 测试POST请求...")
    response = crawler.post_data(
        'http://httpbin.org/post',
        json_data={'message': 'Hello from proxy crawler!'}
    )
    if response:
        result = response.json()
        print(f"✅ POST成功: {result.get('json', {})}")
    
    # 示例4: 测试真实网站
    print("\n4. 测试真实网站...")
    response = crawler.get_page('https://www.baidu.com')
    if response:
        print(f"✅ 百度首页: {response.status_code}")
    
    print(f"\n📊 总请求数: {crawler.request_count}")
    print("🎉 爬虫测试完成!")

if __name__ == "__main__":
    example_usage()