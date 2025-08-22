// 简单的星系动效
class SimpleGalaxy {
    constructor(container) {
        this.container = container;
        this.stars = [];
        this.init();
    }

    init() {
        this.createStars();
        this.animate();
    }

    createStars() {
        const numStars = 200;
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // 随机位置
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = Math.random() * 3 + 1;
            const opacity = Math.random() * 0.8 + 0.2;
            const animationDuration = Math.random() * 3 + 2;
            
            star.style.cssText = `
                position: absolute;
                left: ${x}%;
                top: ${y}%;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle, rgba(100, 181, 246, ${opacity}) 0%, transparent 70%);
                border-radius: 50%;
                animation: twinkle ${animationDuration}s infinite alternate;
                pointer-events: none;
            `;
            
            this.container.appendChild(star);
            this.stars.push({
                element: star,
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 0.02,
                vy: (Math.random() - 0.5) * 0.02
            });
        }
    }

    animate() {
        this.stars.forEach(star => {
            star.x += star.vx;
            star.y += star.vy;
            
            // 边界检测
            if (star.x < 0 || star.x > 100) star.vx *= -1;
            if (star.y < 0 || star.y > 100) star.vy *= -1;
            
            star.element.style.left = star.x + '%';
            star.element.style.top = star.y + '%';
        });
        
        requestAnimationFrame(() => this.animate());
    }

    destroy() {
        this.stars.forEach(star => {
            star.element.remove();
        });
        this.stars = [];
    }
}

// 全局可用
window.SimpleGalaxy = SimpleGalaxy;