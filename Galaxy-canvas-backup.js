// Galaxy星空背景类
class Galaxy {
    constructor(containerId, options = {}) {
        console.log('🌌 Galaxy构造函数被调用，容器ID:', containerId);
        
        // 获取容器
        this.container = typeof containerId === 'string' ? 
            document.getElementById(containerId) : containerId;
            
        if (!this.container) {
            console.error('❌ Galaxy容器未找到:', containerId);
            return;
        }
        
        console.log('✅ Galaxy容器找到:', this.container);
        
        // 默认配置
        this.options = {
            starCount: options.starCount || 200,
            shootingStarCount: options.shootingStarCount || 3,
            animationSpeed: options.animationSpeed || 1,
            colors: options.colors || ['#ffffff', '#f0f8ff', '#87ceeb'],
            ...options
        };
        
        console.log('🌌 Galaxy配置:', this.options);
        
        // 创建canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        // 星星数组
        this.stars = [];
        this.shootingStars = [];
        
        // 初始化
        this.resize();
        this.createStars();
        this.animate();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.resize());
        
        // 将实例保存到window对象，供控制面板使用
        window.galaxyInstance = this;
        
        console.log('✅ Galaxy初始化完成！');
    }
    
    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        
        console.log('🌌 Galaxy canvas尺寸调整:', this.canvas.width, 'x', this.canvas.height);
    }
    
    createStars() {
        this.stars = [];
        
        for (let i = 0; i < this.options.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                color: this.options.colors[Math.floor(Math.random() * this.options.colors.length)],
                opacity: Math.random() * 0.8 + 0.2,
                twinkle: Math.random() * 0.02 + 0.005
            });
        }
        
        console.log('⭐ 创建了', this.stars.length, '颗星星');
    }
    
    createShootingStar() {
        if (this.shootingStars.length < this.options.shootingStarCount) {
            this.shootingStars.push({
                x: Math.random() * this.canvas.width,
                y: 0,
                speed: Math.random() * 8 + 4,
                size: Math.random() * 2 + 1,
                angle: Math.random() * Math.PI / 4 + Math.PI / 8, // 45-90度角
                color: this.options.colors[Math.floor(Math.random() * this.options.colors.length)],
                trail: [],
                life: 100
            });
        }
    }
    
    updateStars() {
        this.stars.forEach(star => {
            // 星星闪烁效果
            star.opacity += star.twinkle;
            if (star.opacity >= 1 || star.opacity <= 0.2) {
                star.twinkle = -star.twinkle;
            }
            
            // 星星缓慢移动
            star.y += star.speed * this.options.animationSpeed;
            star.x += Math.sin(star.y * 0.01) * 0.2;
            
            // 重置超出屏幕的星星
            if (star.y > this.canvas.height) {
                star.y = -10;
                star.x = Math.random() * this.canvas.width;
            }
        });
    }
    
    updateShootingStars() {
        this.shootingStars.forEach((star, index) => {
            // 添加轨迹点
            star.trail.unshift({ x: star.x, y: star.y });
            if (star.trail.length > 20) {
                star.trail.pop();
            }
            
            // 移动流星
            star.x += Math.cos(star.angle) * star.speed * this.options.animationSpeed;
            star.y += Math.sin(star.angle) * star.speed * this.options.animationSpeed;
            
            star.life--;
            
            // 移除超出屏幕或生命结束的流星
            if (star.x > this.canvas.width + 50 || 
                star.y > this.canvas.height + 50 || 
                star.life <= 0) {
                this.shootingStars.splice(index, 1);
            }
        });
        
        // 随机创建新流星
        if (Math.random() < 0.001 * this.options.animationSpeed) {
            this.createShootingStar();
        }
    }
    
    drawStars() {
        this.stars.forEach(star => {
            this.ctx.save();
            this.ctx.globalAlpha = star.opacity;
            this.ctx.fillStyle = star.color;
            this.ctx.shadowBlur = star.size * 2;
            this.ctx.shadowColor = star.color;
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    drawShootingStars() {
        this.shootingStars.forEach(star => {
            // 绘制轨迹
            star.trail.forEach((point, index) => {
                this.ctx.save();
                this.ctx.globalAlpha = (1 - index / star.trail.length) * 0.8;
                this.ctx.fillStyle = star.color;
                this.ctx.shadowBlur = star.size;
                this.ctx.shadowColor = star.color;
                
                const size = star.size * (1 - index / star.trail.length);
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.restore();
            });
            
            // 绘制流星头部
            this.ctx.save();
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = star.color;
            this.ctx.shadowBlur = star.size * 3;
            this.ctx.shadowColor = star.color;
            
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    render() {
        // 清除canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制星星和流星
        this.drawStars();
        this.drawShootingStars();
    }
    
    animate() {
        this.updateStars();
        this.updateShootingStars();
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }
    
    // 销毁方法
    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        window.removeEventListener('resize', this.resize);
        console.log('🌌 Galaxy已销毁');
    }
}

// 将Galaxy类添加到全局window对象
console.log('🚀 正在将Galaxy类添加到window对象...');
window.Galaxy = Galaxy;
console.log('📦 galaxy.js脚本执行完成');
console.log('✅ Galaxy类已加载到window.Galaxy:', !!window.Galaxy);
console.log('🔍 Galaxy类详细信息:', Galaxy);
console.log('🔍 window.Galaxy引用:', window.Galaxy);