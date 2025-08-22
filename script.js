// 全局变量
let uploadedImages = []; // 手动上传区域的图片
let aiUploadedImages = []; // AI创作区域的图片
let isCreating = false;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    setupNavigation();
    setupFormValidation();
    updateStatusBar();
    ensurePublishStore();
    
    // 初始化分组选项
    renderGroupOptions();
    
    // 初始化手动上传区域的折叠状态
    initializeManualUploadCollapse();
    
    // 显示欢迎消息
    setTimeout(() => {
        showNotification('欢迎使用众之翼矩阵！', 'success');
    }, 1000);
}

// 设置导航功能
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有活动状态
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 添加活动状态到当前项
            this.classList.add('active');
            
            // 获取导航项文本来判断要显示的内容
            const navText = this.querySelector('span').textContent;
            switchContent(navText);
        });
    });
}

// 切换内容区域
function switchContent(navText) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    switch(navText) {
        case 'AI内容创作':
            document.getElementById('ai-creation').classList.add('active');
            break;
        case '发布管理':
            document.getElementById('publish-management').classList.add('active');
            initializePublishManagement();
            break;
        case '内容库':
            document.getElementById('content-library').classList.add('active');
            updateContentLibraryDisplay();
            break;
        case '爆款拆解':
            document.getElementById('text-analysis').classList.add('active');
            break;

        case '账号管理':
            document.getElementById('account-management').classList.add('active');
            initializeAccountManagement();
            break;
        case '通知管理':
            document.getElementById('notification-management').classList.add('active');
            (async () => {
                await initializeNotificationManagement();
            })();
            break;
        case '文生图':
            document.getElementById('text-to-image').classList.add('active');
            initializeTextToImage();
            initializeImageGallery();
            // 重新初始化模板选择器
            setTimeout(() => {
                initializeTemplateSelector();
            }, 200);
            break;
        case '系统设置':
            document.getElementById('system-settings').classList.add('active');
            initializeSystemSettings();
            break;
        default:
            document.getElementById('ai-creation').classList.add('active');
    }
}

// ---------- 文生图：文本转图片 ----------
function initializeTextToImage() {
    const canvas = document.getElementById('t2i-canvas');
    if (!canvas) return;
    const { width, height } = parseCanvasSize(document.getElementById('t2i-size')?.value || '1080x1080');
    resizeCanvas(canvas, width, height);
    // 初始渲染空模板
    renderTextOnCanvas('', {
        template: document.getElementById('t2i-template')?.value || 'sticky-note-yellow',
        align: document.getElementById('t2i-align')?.value || 'center',
        canvas
    });

    // 检查是否需要显示"保存为此文案配图"按钮
    const saveToTextBtn = document.getElementById('save-to-text-btn');
    if (saveToTextBtn) {
        if (window.currentTextForImage) {
            saveToTextBtn.style.display = 'inline-block';
            saveToTextBtn.textContent = `📎 保存为"${window.currentTextForImage.title}"配图`;
        } else {
            saveToTextBtn.style.display = 'none';
        }
    }

    const sizeSelect = document.getElementById('t2i-size');
    const templateSelect = document.getElementById('t2i-template');
    const alignSelect = document.getElementById('t2i-align');
    const textArea = document.getElementById('t2i-text');
    const fontSizeSlider = document.getElementById('t2i-font-size');
    const fontSizeValue = document.getElementById('font-size-value');

    if (sizeSelect) {
        sizeSelect.onchange = () => {
            const { width: w, height: h } = parseCanvasSize(sizeSelect.value);
            resizeCanvas(canvas, w, h);
            // 文本存在时重绘
            renderTextImageFromForm();
        };
    }
    if (templateSelect) templateSelect.onchange = () => renderTextImageFromForm();
    if (alignSelect) alignSelect.onchange = () => renderTextImageFromForm();
    if (textArea) textArea.oninput = () => renderTextImageFromForm();
    
    // 字体大小滑块事件监听
    if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.oninput = () => {
            fontSizeValue.textContent = fontSizeSlider.value;
            renderTextImageFromForm();
        };
    }

    const dlBtn = document.getElementById('t2i-download');
    if (dlBtn) dlBtn.disabled = true;
}

function generateTextImage() {
    renderTextImageFromForm(true);
}

function renderTextImageFromForm(showTip = false) {
    const canvas = document.getElementById('t2i-canvas');
    if (!canvas) return;
    const text = (document.getElementById('t2i-text')?.value || '').trim();
    const template = document.getElementById('t2i-template')?.value || 'sticky-note-yellow';
    const align = document.getElementById('t2i-align')?.value || 'center';
    const fontSize = document.getElementById('t2i-font-size')?.value || 100;
    if (!text) {
        renderTextOnCanvas('', { template, align, canvas, fontSize });
            const dlBtn = document.getElementById('t2i-download');
    const saveBtn = document.getElementById('save-to-gallery-btn');
    const saveToTextBtn = document.getElementById('save-to-text-btn');
    if (dlBtn) dlBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (saveToTextBtn) saveToTextBtn.disabled = true;
        if (showTip) showNotification('请先输入要生成的文字', 'warning');
        return;
    }
    renderTextOnCanvas(text, { template, align, canvas, fontSize });
    const dlBtn = document.getElementById('t2i-download');
    const saveBtn = document.getElementById('save-to-gallery-btn');
    const saveToTextBtn = document.getElementById('save-to-text-btn');
    if (dlBtn) dlBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (saveToTextBtn && window.currentTextForImage) saveToTextBtn.disabled = false;
}

function resetT2I() {
    const textArea = document.getElementById('t2i-text');
    const fontSizeSlider = document.getElementById('t2i-font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    
    if (textArea) textArea.value = '';
    if (fontSizeSlider) {
        fontSizeSlider.value = 100;
        if (fontSizeValue) fontSizeValue.textContent = '100';
    }
    initializeTextToImage();
}

function downloadTextImage() {
    const canvas = document.getElementById('t2i-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `文生图-${ts}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ---------- 图片库功能 ----------
// 图片库本地存储key
const IMAGE_GALLERY_KEY = 'textToImageGallery';

// 获取图片库数据
function getImageGallery() {
    try {
        const data = localStorage.getItem(IMAGE_GALLERY_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('获取图片库数据失败:', error);
        return [];
    }
}

// 保存图片库数据
function saveImageGallery(gallery) {
    try {
        localStorage.setItem(IMAGE_GALLERY_KEY, JSON.stringify(gallery));
    } catch (error) {
        console.error('保存图片库数据失败:', error);
        showNotification('保存失败，存储空间可能不足', 'error');
    }
}

// 保存当前图片到图片库
function saveCurrentImageToGallery() {
    const canvas = document.getElementById('t2i-canvas');
    const textInput = document.getElementById('t2i-text');
    
    if (!canvas || !textInput) return;
    
    const text = textInput.value.trim();
    if (!text) {
        showNotification('请先生成图片再保存', 'warning');
        return;
    }
    
    try {
        // 获取画布数据
        const imageData = canvas.toDataURL('image/png');
        
        // 检查数据大小（限制为5MB）
        if (imageData.length > 5 * 1024 * 1024) {
            showNotification('图片过大，无法保存到图片库', 'error');
            return;
        }
        
        // 创建图片项
        const imageItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            text: text,
            imageData: imageData,
            template: document.getElementById('t2i-template')?.value || 'sticky-note-yellow',
            size: document.getElementById('t2i-size')?.value || '1080x1080',
            align: document.getElementById('t2i-align')?.value || 'center',
            fontSize: document.getElementById('t2i-font-size')?.value || 100,
            createdAt: new Date().toISOString(),
            thumbnail: createThumbnail(imageData)
        };
        
        // 获取现有图片库
        const gallery = getImageGallery();
        
        // 添加新图片到开头
        gallery.unshift(imageItem);
        
        // 限制图片库大小（最多50张）
        if (gallery.length > 50) {
            gallery.splice(50);
        }
        
        // 保存到本地存储
        saveImageGallery(gallery);
        
        // 更新UI
        updateGalleryDisplay();
        
        showNotification('图片已保存到图片库', 'success');
        
    } catch (error) {
        console.error('保存图片失败:', error);
        showNotification('保存失败，请稍后重试', 'error');
    }
}

// 创建缩略图
function createThumbnail(imageData, maxSize = 200) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 计算缩略图尺寸
            let { width, height } = img;
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制缩略图
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = imageData;
    });
}

// 同步创建缩略图（简化版）
function createThumbnail(imageData) {
    // 对于演示，直接返回原图，实际项目中可以实现真正的缩略图生成
    return imageData;
}

// 更新图片库显示
function updateGalleryDisplay() {
    const galleryEmpty = document.getElementById('gallery-empty');
    const galleryGrid = document.getElementById('gallery-grid');
    
    if (!galleryEmpty || !galleryGrid) return;
    
    const gallery = getImageGallery();
    
    if (gallery.length === 0) {
        galleryEmpty.style.display = 'block';
        galleryGrid.style.display = 'none';
        return;
    }
    
    galleryEmpty.style.display = 'none';
    galleryGrid.style.display = 'grid';
    
    // 清空现有内容
    galleryGrid.innerHTML = '';
    
    // 渲染图片项
    gallery.forEach(item => {
        const galleryItem = createGalleryItem(item);
        galleryGrid.appendChild(galleryItem);
    });
}

// 创建图片库项
function createGalleryItem(item) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.onclick = () => previewGalleryImage(item);
    
    const date = new Date(item.createdAt).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // 判断是否为AI生成的图片
    const isAIGenerated = item.type === 'generated' || item.template === 'ai-generated';
    const typeLabel = isAIGenerated ? '<span class="ai-generated-badge">🤖 AI生成</span>' : '';
    
    div.innerHTML = `
        <div class="gallery-item-image">
            <img src="${item.thumbnail || item.imageData}" alt="${item.text}" loading="lazy">
            ${typeLabel}
        </div>
        <div class="gallery-item-info">
            <div class="gallery-item-text">${item.text}</div>
            <div class="gallery-item-date">${date}</div>
            ${isAIGenerated && item.prompt ? `<div class="gallery-item-prompt">提示词: ${item.prompt}</div>` : ''}
        </div>
        <div class="gallery-item-actions">
            <button class="gallery-action-btn download" onclick="event.stopPropagation(); downloadGalleryImage('${item.id}')" title="下载">
                💾
            </button>
            <button class="gallery-action-btn delete" onclick="event.stopPropagation(); deleteGalleryImage('${item.id}')" title="删除">
                🗑️
            </button>
        </div>
    `;
    
    return div;
}

// 预览图片库图片
function previewGalleryImage(item) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = item.imageData;
    img.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    const info = document.createElement('div');
    info.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        padding: 12px 16px;
        border-radius: 8px;
        color: #1e293b;
        font-size: 14px;
        text-align: center;
        max-width: 80vw;
    `;
    info.textContent = item.text;
    
    modal.appendChild(img);
    modal.appendChild(info);
    
    // 点击关闭
    modal.onclick = () => {
        document.body.removeChild(modal);
    };
    
    document.body.appendChild(modal);
}

// 下载图片库中的图片
function downloadGalleryImage(imageId) {
    const gallery = getImageGallery();
    const item = gallery.find(img => img.id === imageId);
    
    if (!item) {
        showNotification('图片不存在', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `文生图-${item.text.slice(0, 20)}-${new Date(item.createdAt).toISOString().slice(0, 10)}.png`;
    link.href = item.imageData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 删除图片库中的图片
function deleteGalleryImage(imageId) {
    if (!confirm('确定要删除这张图片吗？')) return;
    
    const gallery = getImageGallery();
    const newGallery = gallery.filter(img => img.id !== imageId);
    
    saveImageGallery(newGallery);
    updateGalleryDisplay();
    
    showNotification('图片已删除', 'success');
}

// 清空图片库
function clearImageGallery() {
    const gallery = getImageGallery();
    if (gallery.length === 0) {
        showNotification('图片库已经是空的', 'info');
        return;
    }
    
    if (!confirm(`确定要清空图片库吗？这将删除所有 ${gallery.length} 张图片，此操作无法撤销。`)) return;
    
    saveImageGallery([]);
    updateGalleryDisplay();
    
    showNotification('图片库已清空', 'success');
}

// 初始化图片库
function initializeImageGallery() {
    // 迁移旧的AI生成图片数据
    migrateOldImageLibraryData();
    updateGalleryDisplay();
}

// 迁移旧的AI生成图片数据
function migrateOldImageLibraryData() {
    try {
        const oldImageLibrary = localStorage.getItem('imageLibrary');
        if (oldImageLibrary) {
            const oldData = JSON.parse(oldImageLibrary);
            if (Array.isArray(oldData) && oldData.length > 0) {
                console.log('发现旧的AI生成图片数据，开始迁移...');
                
                const gallery = getImageGallery();
                let migratedCount = 0;
                
                oldData.forEach(oldItem => {
                    // 检查是否已经存在相同ID的图片
                    if (!gallery.find(item => item.id === oldItem.id)) {
                        // 转换为新的数据结构
                        const newItem = {
                            id: oldItem.id,
                            text: oldItem.name || oldItem.prompt || 'AI生成图片',
                            imageData: oldItem.src,
                            template: 'ai-generated',
                            size: '1024x1024', // 默认尺寸
                            align: 'center',
                            fontSize: 100,
                            createdAt: oldItem.createdAt || new Date().toISOString(),
                            thumbnail: createThumbnail(oldItem.src),
                            type: 'generated',
                            prompt: oldItem.prompt || oldItem.name || ''
                        };
                        
                        gallery.push(newItem);
                        migratedCount++;
                    }
                });
                
                if (migratedCount > 0) {
                    // 按创建时间排序，最新的在前面
                    gallery.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    
                    // 保存迁移后的数据
                    saveImageGallery(gallery);
                    
                    console.log(`成功迁移 ${migratedCount} 张AI生成图片`);
                    showNotification(`已迁移 ${migratedCount} 张AI生成图片到图片库`, 'success');
                }
                
                // 删除旧数据
                localStorage.removeItem('imageLibrary');
            }
        }
    } catch (error) {
        console.error('迁移AI生成图片数据失败:', error);
    }
}

function parseCanvasSize(value) {
    const match = /^(\d+)x(\d+)$/i.exec(value || '1080x1080');
    const width = match ? parseInt(match[1], 10) : 1080;
    const height = match ? parseInt(match[2], 10) : 1080;
    return { width, height };
}

function resizeCanvas(canvas, width, height) {
    canvas.width = width;
    canvas.height = height;
    // 预览尺寸：最长边固定为360，保持比例
    const maxPreview = 360;
    if (width >= height) {
        canvas.style.width = `${maxPreview}px`;
        canvas.style.height = `${Math.round((height / width) * maxPreview)}px`;
    } else {
        canvas.style.height = `${maxPreview}px`;
        canvas.style.width = `${Math.round((width / height) * maxPreview)}px`;
    }
}

function renderTextOnCanvas(text, options) {
    const { template, align, canvas, fontSize: customFontSize } = options;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    fillBackgroundByTemplate(ctx, w, h, template);

    // 文本绘制区域
    const padding = Math.round(Math.min(w, h) * 0.08);
    const areaX = padding;
    const areaY = padding;
    const areaW = w - padding * 2;
    const areaH = h - padding * 2;

    // 支持自定义字体大小，如果没有提供则使用默认计算
    const baseFontSize = Math.max(24, Math.round(Math.min(w, h) / 14));
    const fontSize = customFontSize ? Math.round(baseFontSize * customFontSize / 100) : baseFontSize;
    const lineHeight = Math.round(fontSize * 1.4);
    
    // 根据不同模板选择最佳文字颜色，确保文字突出显示
    let textColor = '#222222'; // 默认深色
    const lightBackgrounds = ['polka-dots', 'candy-stripes', 'hearts', 'bubbles', 'gingham', 'kawaii-clouds', 'celebration-party', 'flower-garden', 'book-wisdom', 'sticky-note-yellow', 'sticky-note-green', 'sticky-note-blue', 'sticky-note-purple', 'sticky-note-orange', 'sticky-note-coral', 'sticky-note-lavender', 'sticky-note-peach', 'notebook-paper', 'sketch-book', 'marble-texture', 'vintage-paper', 'origami-art', 'glass-effect', 'fabric-texture', 'metal-surface', 'easter-theme'];
    const darkBackgrounds = ['star-sky', 'space-galaxy', 'coffee-time', 'study-focus', 'neon-glow', 'cyberpunk-style', 'circuit-board', 'matrix-code', 'data-stream', 'wood-texture', 'brick-texture', 'christmas-theme', 'halloween-theme'];
    const colorfulBackgrounds = ['pastel-pink', 'pastel-mint', 'rainbow-soft', 'sunset-glow', 'forest-fresh', 'ocean-waves', 'golden-autumn', 'music-vibes', 'travel-dream', 'fire-passion', 'rainbow-magic', 'cherry-blossom', 'highlight-orange', 'memo-pink', 'watercolor-art', 'hologram-display', 'valentine-theme'];
    
    if (darkBackgrounds.includes(template)) {
        textColor = '#ffffff'; // 白色文字
    } else if (colorfulBackgrounds.includes(template)) {
        textColor = '#2c3e50'; // 深蓝灰色，在彩色背景上更突出
    } else {
        textColor = '#222222'; // 深色文字
    }
    
    ctx.textBaseline = 'top';
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, PingFang SC, Microsoft YaHei, sans-serif`;
    ctx.textAlign = align === 'left' ? 'left' : 'center';

    const lines = breakLines(ctx, text, areaW);
    const totalHeight = lines.length * lineHeight;
    let startY = areaY + Math.max(0, Math.floor((areaH - totalHeight) / 2));
    let x = align === 'left' ? areaX : Math.round(areaX + areaW / 2);



    // 为文字添加阴影效果，增强可读性
    const shadowOffset = Math.max(2, fontSize * 0.04);
    const isEmojiTemplate = ['celebration-party', 'flower-garden', 'ocean-waves', 'golden-autumn', 'coffee-time', 'music-vibes', 'travel-dream', 'book-wisdom', 'fire-passion', 'rainbow-magic', 'space-galaxy', 'cherry-blossom'].includes(template);
    const isOvalTemplate = false;
    
    for (const line of lines) {
        if (isEmojiTemplate) {
            // 为emoji模板提供更强的阴影效果，确保文字突出
            // 先绘制更粗的描边效果
            ctx.strokeStyle = textColor === '#ffffff' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = Math.max(3, fontSize * 0.06);
            ctx.strokeText(line, x, startY);
            
            // 绘制阴影
            ctx.fillStyle = textColor === '#ffffff' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(line, x + shadowOffset, startY + shadowOffset);
        } else {
            // 普通模板的阴影效果
            ctx.fillStyle = textColor === '#ffffff' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(line, x + shadowOffset, startY + shadowOffset);
        }
        
        // 绘制主文字
        ctx.fillStyle = textColor;
        ctx.fillText(line, x, startY);
        
        startY += lineHeight;
    }
}

function breakLines(ctx, text, maxWidth) {
    const result = [];
    const paragraphs = String(text).replace(/\r/g, '').split('\n');
    for (const p of paragraphs) {
        let current = '';
        for (const ch of p) {
            const test = current + ch;
            if (ctx.measureText(test).width > maxWidth) {
                if (current.length > 0) result.push(current);
                current = ch;
            } else {
                current = test;
            }
        }
        if (current.length > 0 || p === '') result.push(current);
    }
    return result;
}

function fillBackgroundByTemplate(ctx, w, h, template) {
    if (template === 'pastel-pink') {
        // 马卡龙粉色渐变
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#ffb3d9');
        grad.addColorStop(1, '#ff99cc');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === 'pastel-mint') {
        // 马卡龙薄荷绿渐变
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#a8e6cf');
        grad.addColorStop(1, '#88d8a3');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === 'rainbow-soft') {
        // 柔和彩虹渐变
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#ff9a9e');
        grad.addColorStop(0.33, '#fecfef');
        grad.addColorStop(0.66, '#fecfef');
        grad.addColorStop(1, '#a8edea');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === 'polka-dots') {
        // 可爱波点背景
        ctx.fillStyle = '#fff0f5';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffb6c1';
        const dotSize = Math.min(w, h) * 0.03;
        const spacing = dotSize * 3;
        for (let x = spacing; x < w; x += spacing) {
            for (let y = spacing; y < h; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, dotSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    } else if (template === 'candy-stripes') {
        // 糖果条纹
        ctx.fillStyle = '#fff5ee';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffc0cb';
        const stripeWidth = Math.min(w, h) * 0.08;
        for (let x = 0; x < w + h; x += stripeWidth * 2) {
            ctx.save();
            ctx.translate(w/2, h/2);
            ctx.rotate(Math.PI / 6);
            ctx.fillRect(x - w, -h, stripeWidth, h * 2);
            ctx.restore();
        }
    } else if (template === 'star-sky') {
        // 星星夜空
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1e3c72');
        grad.addColorStop(1, '#2a5298');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加星星
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 3 + 1;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (template === 'hearts') {
        // 爱心撒花
        ctx.fillStyle = '#fff0f0';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ff69b4';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 15 + 10;
            drawHeart(ctx, x, y, size);
        }
    } else if (template === 'bubbles') {
        // 泡泡梦幻
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#e0f6ff');
        grad.addColorStop(1, '#b3e5fc');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加泡泡
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const radius = Math.random() * 25 + 5;
            const bubbleGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            bubbleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            bubbleGrad.addColorStop(1, 'rgba(173, 216, 230, 0.2)');
            ctx.fillStyle = bubbleGrad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (template === 'gingham') {
        // 格纹奶油
        ctx.fillStyle = '#fffaf0';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f0e68c';
        const gridSize = Math.min(w, h) * 0.06;
        for (let x = 0; x < w; x += gridSize * 2) {
            for (let y = 0; y < h; y += gridSize * 2) {
                ctx.fillRect(x, y, gridSize, gridSize);
                ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
            }
        }
    } else if (template === 'kawaii-clouds') {
        // 萌系云朵
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#e3f2fd');
        grad.addColorStop(1, '#bbdefb');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加云朵
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h * 0.6;
            drawCloud(ctx, x, y, Math.random() * 30 + 20);
        }
    } else if (template === 'sunset-glow') {
        // 夕阳橙光
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#ff9a56');
        grad.addColorStop(0.5, '#ff6b6b');
        grad.addColorStop(1, '#feca57');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    } else if (template === 'forest-fresh') {
        // 清新森林
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#a8e6cf');
        grad.addColorStop(0.5, '#7fcdcd');
        grad.addColorStop(1, '#81c784');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加叶子装饰
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            drawLeaf(ctx, x, y, Math.random() * 20 + 10);
        }
    } else if (template === 'celebration-party') {
        // 🎉 庆祝派对 - 使用明亮对比背景突出文字
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#fff9c4');
        grad.addColorStop(1, '#ffd93d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 在边角添加大emoji，避开中心文字区域
        drawEmoji(ctx, '🎉', w * 0.1, h * 0.15, Math.min(w, h) * 0.12);
        drawEmoji(ctx, '🎊', w * 0.85, h * 0.2, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '✨', w * 0.15, h * 0.8, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🎈', w * 0.9, h * 0.85, Math.min(w, h) * 0.09);
    } else if (template === 'flower-garden') {
        // 🌸 花园盛开 - 柔和粉色背景，花朵在四周
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#fce4ec');
        grad.addColorStop(1, '#f8bbd9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 花朵围绕边缘分布，留出中心文字区域
        drawEmoji(ctx, '🌸', w * 0.08, h * 0.12, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '🌺', w * 0.92, h * 0.15, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🌻', w * 0.05, h * 0.85, Math.min(w, h) * 0.09);
        drawEmoji(ctx, '🌷', w * 0.9, h * 0.88, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🌹', w * 0.15, h * 0.05, Math.min(w, h) * 0.06);
    } else if (template === 'ocean-waves') {
        // 🌊 海浪涌动 - 蓝色渐变，海洋元素在底部
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#e3f2fd');
        grad.addColorStop(0.6, '#81d4fa');
        grad.addColorStop(1, '#0277bd');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 海洋元素主要在底部和侧边
        drawEmoji(ctx, '🌊', w * 0.1, h * 0.75, Math.min(w, h) * 0.12);
        drawEmoji(ctx, '🐚', w * 0.85, h * 0.8, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '⛵', w * 0.9, h * 0.25, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🏖️', w * 0.05, h * 0.9, Math.min(w, h) * 0.06);
    } else if (template === 'golden-autumn') {
        // 🍂 金秋落叶 - 温暖金色，叶子飘落效果
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#fff8e1');
        grad.addColorStop(0.5, '#ffcc02');
        grad.addColorStop(1, '#ff8f00');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 叶子从上方飘落，营造层次感
        drawEmoji(ctx, '🍂', w * 0.15, h * 0.1, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🍁', w * 0.8, h * 0.05, Math.min(w, h) * 0.09);
        drawEmoji(ctx, '🍃', w * 0.05, h * 0.3, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🌰', w * 0.9, h * 0.7, Math.min(w, h) * 0.06);
    } else if (template === 'coffee-time') {
        // ☕ 咖啡时光 - 温暖咖啡色调
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#f3e5ab');
        grad.addColorStop(1, '#8d5524');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '☕', w * 0.12, h * 0.15, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '🍰', w * 0.85, h * 0.2, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '📖', w * 0.1, h * 0.8, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🕯️', w * 0.9, h * 0.85, Math.min(w, h) * 0.06);
    } else if (template === 'music-vibes') {
        // 🎵 音乐律动 - 动感紫色渐变
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#e1bee7');
        grad.addColorStop(0.5, '#ba68c8');
        grad.addColorStop(1, '#8e24aa');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '🎵', w * 0.08, h * 0.12, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '🎶', w * 0.9, h * 0.15, Math.min(w, h) * 0.09);
        drawEmoji(ctx, '🎤', w * 0.05, h * 0.85, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🎧', w * 0.88, h * 0.8, Math.min(w, h) * 0.07);
    } else if (template === 'travel-dream') {
        // ✈️ 旅行梦想 - 天空蓝色背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#e8f5e8');
        grad.addColorStop(0.5, '#81c784');
        grad.addColorStop(1, '#4caf50');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '✈️', w * 0.1, h * 0.08, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '🗺️', w * 0.85, h * 0.12, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🏔️', w * 0.05, h * 0.9, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🎒', w * 0.9, h * 0.85, Math.min(w, h) * 0.06);
    } else if (template === 'book-wisdom') {
        // 📚 书香智慧 - 典雅棕色背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#f5f5dc');
        grad.addColorStop(1, '#deb887');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '📚', w * 0.08, h * 0.1, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '📖', w * 0.9, h * 0.15, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '✏️', w * 0.05, h * 0.85, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🔍', w * 0.88, h * 0.8, Math.min(w, h) * 0.06);
    } else if (template === 'fire-passion') {
        // 🔥 热情燃烧 - 火焰红橙渐变
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#fff3e0');
        grad.addColorStop(0.5, '#ff9800');
        grad.addColorStop(1, '#e65100');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '🔥', w * 0.1, h * 0.12, Math.min(w, h) * 0.12);
        drawEmoji(ctx, '⚡', w * 0.85, h * 0.18, Math.min(w, h) * 0.09);
        drawEmoji(ctx, '💪', w * 0.08, h * 0.8, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🚀', w * 0.9, h * 0.85, Math.min(w, h) * 0.07);
    } else if (template === 'rainbow-magic') {
        // 🌈 彩虹魔法 - 彩虹渐变背景
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#ff9a9e');
        grad.addColorStop(0.2, '#fecfef');
        grad.addColorStop(0.4, '#a8edea');
        grad.addColorStop(0.6, '#fed6e3');
        grad.addColorStop(0.8, '#d299c2');
        grad.addColorStop(1, '#ffc3a0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '🌈', w * 0.08, h * 0.08, Math.min(w, h) * 0.12);
        drawEmoji(ctx, '✨', w * 0.9, h * 0.12, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🦄', w * 0.05, h * 0.88, Math.min(w, h) * 0.09);
        drawEmoji(ctx, '💫', w * 0.88, h * 0.85, Math.min(w, h) * 0.07);
    } else if (template === 'space-galaxy') {
        // 🌟 银河星系 - 深空背景
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#1a237e');
        grad.addColorStop(0.7, '#283593');
        grad.addColorStop(1, '#000051');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '🌟', w * 0.1, h * 0.1, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '🌙', w * 0.85, h * 0.15, Math.min(w, h) * 0.08);
        drawEmoji(ctx, '🚀', w * 0.08, h * 0.85, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🛸', w * 0.9, h * 0.8, Math.min(w, h) * 0.06);
    } else if (template === 'cherry-blossom') {
        // 🌺 樱花飞舞 - 粉色樱花背景
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#fce4ec');
        grad.addColorStop(0.5, '#f48fb1');
        grad.addColorStop(1, '#ec407a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawEmoji(ctx, '🌺', w * 0.1, h * 0.08, Math.min(w, h) * 0.1);
        drawEmoji(ctx, '🌸', w * 0.88, h * 0.12, Math.min(w, h) * 0.09);
        drawEmoji(ctx, '🦋', w * 0.05, h * 0.9, Math.min(w, h) * 0.07);
        drawEmoji(ctx, '🍃', w * 0.9, h * 0.85, Math.min(w, h) * 0.06);
    } else if (template === 'sticky-note-yellow') {
        // 📝 黄色便签 - 模仿便签纸效果，带有椭圆强调
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#fef3a0';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部日期区域
        ctx.fillStyle = '#8b4513';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Sticky Notes', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('AUG 11 2025', w * 0.94, h * 0.08);
        
        // 中间圆点
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加便签纸风格的白色区域（模仿便签纸内容区）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制横线
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    } else if (template === 'highlight-orange') {
        // 🔍 橙色强调 - 明亮橙色背景，专注强调效果
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#fff3e0');
        grad.addColorStop(0.5, '#ffcc80');
        grad.addColorStop(1, '#ff9800');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
    } else if (template === 'notebook-paper') {
        // 📖 笔记本纸 - 模仿笔记本纸张，带横线效果
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, w, h);
        
        // 绘制虚线横格
        ctx.strokeStyle = '#e0e0e0';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.06;
        for (let y = h * 0.2; y < h * 0.9; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(w * 0.1, y);
            ctx.lineTo(w * 0.9, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // 左侧红色边线
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.08, h * 0.15);
        ctx.lineTo(w * 0.08, h * 0.95);
        ctx.stroke();
        
    } else if (template === 'memo-pink') {
        // 📄 粉色备忘 - 柔和粉色背景
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#fce4ec');
        grad.addColorStop(0.7, '#f8bbd9');
        grad.addColorStop(1, '#f48fb1');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
    } else if (template === 'study-focus') {
        // 🎯 学习重点 - 蓝色渐变，专注学习氛围
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#e3f2fd');
        grad.addColorStop(0.5, '#90caf9');
        grad.addColorStop(1, '#42a5f5');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
        // 添加小猫咪装饰（在右下角）
        const catSize = Math.min(w, h) * 0.15;
        drawCatWithHammock(ctx, w * 0.85, h * 0.85, catSize);
        
    } else if (template === 'sticky-note-green') {
        // 🌿 绿色便签 - 清新薄荷绿便签纸效果
        ctx.fillStyle = '#d4f5d4';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#c8f2c8';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部标识区域
        ctx.fillStyle = '#2e7d32';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Green Note', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('⭐ IDEA', w * 0.94, h * 0.08);
        
        // 中间装饰点
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 主内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制淡绿色横线
        ctx.strokeStyle = '#e8f5e8';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    } else if (template === 'sticky-note-blue') {
        // 💙 蓝色便签 - 清爽天蓝色便签纸效果
        ctx.fillStyle = '#cce7ff';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#b3d9ff';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部标识区域
        ctx.fillStyle = '#1565c0';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Blue Note', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('📝 TODO', w * 0.94, h * 0.08);
        
        // 中间装饰点
        ctx.fillStyle = '#1565c0';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 主内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制淡蓝色横线
        ctx.strokeStyle = '#e3f2fd';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    } else if (template === 'sticky-note-purple') {
        // 💜 紫色便签 - 优雅紫色便签纸效果
        ctx.fillStyle = '#e1bee7';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#d1c4e9';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部标识区域
        ctx.fillStyle = '#6a1b9a';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Purple Note', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('✨ MEMO', w * 0.94, h * 0.08);
        
        // 中间装饰点
        ctx.fillStyle = '#6a1b9a';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 主内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制淡紫色横线
        ctx.strokeStyle = '#f3e5f5';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    } else if (template === 'sticky-note-orange') {
        // 🧡 橙色便签 - 温暖橙色便签纸效果
        ctx.fillStyle = '#ffe0b3';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#ffd699';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部标识区域
        ctx.fillStyle = '#e65100';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Orange Note', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('🔥 HOT', w * 0.94, h * 0.08);
        
        // 中间装饰点
        ctx.fillStyle = '#e65100';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 主内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制淡橙色横线
        ctx.strokeStyle = '#fff3e0';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    } else if (template === 'sticky-note-coral') {
        // 🪸 珊瑚色便签 - 温馨珊瑚色便签纸效果
        ctx.fillStyle = '#ffccbc';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#ffab91';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部标识区域
        ctx.fillStyle = '#d84315';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Coral Note', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('💡 PLAN', w * 0.94, h * 0.08);
        
        // 中间装饰点
        ctx.fillStyle = '#d84315';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 主内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制淡珊瑚色横线
        ctx.strokeStyle = '#fbe9e7';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    } else if (template === 'sticky-note-lavender') {
        // 💐 薰衣草便签 - 淡雅薰衣草色便签纸效果
        ctx.fillStyle = '#e6e6fa';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#ddd6fe';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部标识区域
        ctx.fillStyle = '#4c1d95';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Lavender Note', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('🌸 CALM', w * 0.94, h * 0.08);
        
        // 中间装饰点
        ctx.fillStyle = '#4c1d95';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 主内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制淡薰衣草色横线
        ctx.strokeStyle = '#f5f3ff';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    } else if (template === 'sticky-note-peach') {
        // 🍑 桃色便签 - 柔和桃色便签纸效果
        ctx.fillStyle = '#ffd1dc';
        ctx.fillRect(0, 0, w, h);
        
        // 添加便签纸的细微纹理
        ctx.fillStyle = '#ffb3c1';
        for (let i = 0; i < w; i += 3) {
            for (let j = 0; j < h; j += 3) {
                if (Math.random() > 0.98) {
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        
        // 顶部标识区域
        ctx.fillStyle = '#ad1457';
        ctx.font = `${Math.min(w, h) * 0.03}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText('Peach Note', w * 0.06, h * 0.08);
        ctx.textAlign = 'right';
        ctx.fillText('🌺 LOVE', w * 0.94, h * 0.08);
        
        // 中间装饰点
        ctx.fillStyle = '#ad1457';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.073, Math.min(w, h) * 0.008, 0, Math.PI * 2);
        ctx.fill();
        
        // 主内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.87)';
        const noteX = Math.round(w * 0.05);
        const noteY = Math.round(h * 0.12);
        const noteW = Math.round(w * 0.9);
        const noteH = Math.round(h * 0.8);
        drawRoundedRect(ctx, noteX, noteY, noteW, noteH, Math.round(Math.min(w, h) * 0.02));
        ctx.fill();
        
        // 绘制淡桃色横线
        ctx.strokeStyle = '#fce4ec';
        ctx.lineWidth = 1;
        const lineSpacing = h * 0.08;
        for (let y = noteY + lineSpacing; y < noteY + noteH - lineSpacing; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(noteX + w * 0.02, y);
            ctx.lineTo(noteX + noteW - w * 0.02, y);
            ctx.stroke();
        }
        
    // ===== 艺术设计模板 =====
    } else if (template === 'watercolor-art') {
        // 🎨 水彩艺术 - 多彩流动渐变
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#ffb6c1');    // 浅粉色
        grad.addColorStop(0.25, '#87ceeb');  // 天蓝色  
        grad.addColorStop(0.5, '#98fb98');   // 浅绿色
        grad.addColorStop(0.75, '#dda0dd');  // 梅花色
        grad.addColorStop(1, '#f0e68c');     // 卡其色
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
    } else if (template === 'sketch-book') {
        // ✏️ 素描画册 - 纸质纹理背景
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, w, h);
        // 添加交叉网格纹理
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        const gridSize = 6;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
    } else if (template === 'neon-glow') {
        // 💫 霓虹发光 - 深色背景配发光效果
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
        // 添加发光边框效果
        const glowGrad = ctx.createLinearGradient(0, 0, w, h);
        glowGrad.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
        glowGrad.addColorStop(0.5, 'rgba(255, 0, 255, 0.3)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 0, 0.3)');
        ctx.strokeStyle = glowGrad;
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, w-8, h-8);
        
    } else if (template === 'marble-texture') {
        // 🏛️ 大理石纹 - 优雅大理石纹理
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#f5f5f5');
        grad.addColorStop(0.3, '#e8e8e8');
        grad.addColorStop(0.6, '#d0d0d0');
        grad.addColorStop(1, '#e0e0e0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加大理石纹理线条
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * w, 0);
            ctx.quadraticCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, h);
            ctx.stroke();
        }
        
    } else if (template === 'vintage-paper') {
        // 📜 复古纸张 - 怀旧纸张效果
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#f4f1e8');
        grad.addColorStop(0.7, '#e8e2d0');
        grad.addColorStop(1, '#d6c8a8');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加污渍效果
        ctx.fillStyle = 'rgba(139, 69, 19, 0.05)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const radius = Math.random() * 30 + 10;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
    } else if (template === 'cyberpunk-style') {
        // 🏙️ 赛博朋克 - 科幻未来风格
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#000428');
        grad.addColorStop(0.5, '#004e92');
        grad.addColorStop(1, '#000428');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加霓虹色网格
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        const gridSpacing = Math.min(w, h) / 15;
        for (let x = 0; x < w; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
    } else if (template === 'origami-art') {
        // 🗾 折纸艺术 - 几何折纸风格
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, w, h);
        // 创建几何折纸图案
        const colors = ['#ffcdd2', '#f8bbd9', '#e1bee7', '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc', '#b2dfdb'];
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 80 + 40;
            const sides = 3 + Math.floor(Math.random() * 4);
            
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.beginPath();
            for (let j = 0; j < sides; j++) {
                const angle = (j / sides) * Math.PI * 2;
                const px = x + Math.cos(angle) * size;
                const py = y + Math.sin(angle) * size;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
        
    } else if (template === 'glass-effect') {
        // 🔮 玻璃质感 - 透明玻璃效果
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.5, 'rgba(200, 230, 255, 0.6)');
        grad.addColorStop(1, 'rgba(230, 230, 255, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加高光效果
        const highlightGrad = ctx.createLinearGradient(0, 0, w * 0.3, h * 0.3);
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGrad;
        ctx.fillRect(0, 0, w * 0.3, h * 0.3);
        
    // ===== 科技主题模板 =====
    } else if (template === 'circuit-board') {
        // ⚡ 电路板 - 绿色电路线条
        ctx.fillStyle = '#001a00';
        ctx.fillRect(0, 0, w, h);
        // 绘制电路线条
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            const startX = Math.random() * w;
            const startY = Math.random() * h;
            ctx.moveTo(startX, startY);
            
            // 创建L形或十字形电路路径
            const direction = Math.random() > 0.5 ? 1 : -1;
            const midX = startX + (Math.random() * 100 + 50) * direction;
            const midY = startY + (Math.random() * 100 + 50) * direction;
            
            ctx.lineTo(midX, startY);
            ctx.lineTo(midX, midY);
            ctx.stroke();
            
            // 绘制连接点
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(startX, startY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(midX, midY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
    } else if (template === 'hologram-display') {
        // 📱 全息显示 - 彩色条纹动画效果
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#ff006e');
        grad.addColorStop(0.25, '#8338ec');
        grad.addColorStop(0.5, '#3a86ff');
        grad.addColorStop(0.75, '#06ffa5');
        grad.addColorStop(1, '#ffbe0b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加扫描线效果
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
    } else if (template === 'matrix-code') {
        // 💻 矩阵代码 - 绿色数字雨效果
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        // 创建数字雨效果
        ctx.fillStyle = '#00ff00';
        ctx.font = `${Math.min(w, h) * 0.03}px 'Courier New', monospace`;
        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const columns = Math.floor(w / (Math.min(w, h) * 0.03));
        for (let col = 0; col < columns; col++) {
            for (let row = 0; row < 15; row++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                const x = col * (Math.min(w, h) * 0.03);
                const y = row * (Math.min(w, h) * 0.04) + (Math.min(w, h) * 0.04);
                const alpha = Math.max(0, 1 - (row / 15));
                ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
                ctx.fillText(char, x, y);
            }
        }
        
    } else if (template === 'data-stream') {
        // 📊 数据流 - 蓝色流动线条
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#001122');
        grad.addColorStop(0.5, '#003366');
        grad.addColorStop(1, '#000011');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 绘制数据流线条
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(0, Math.random() * h);
            ctx.bezierCurveTo(
                w * 0.25, Math.random() * h,
                w * 0.75, Math.random() * h,
                w, Math.random() * h
            );
            ctx.stroke();
        }
        // 添加数据点
        ctx.fillStyle = '#00aaff';
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
    // ===== 纹理质感模板 =====
    } else if (template === 'wood-texture') {
        // 🌳 木纹质感 - 自然木材纹理
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#deb887');
        grad.addColorStop(0.3, '#cd853f');
        grad.addColorStop(0.6, '#a0522d');
        grad.addColorStop(1, '#8b4513');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加木纹线条
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < h; i += 6) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            const variation = Math.sin(i * 0.1) * 20;
            ctx.quadraticCurveTo(w/2 + variation, i, w, i);
            ctx.stroke();
        }
        
    } else if (template === 'fabric-texture') {
        // 🧵 织物纹理 - 编织图案
        ctx.fillStyle = '#f5f5dc';
        ctx.fillRect(0, 0, w, h);
        // 创建编织图案
        ctx.strokeStyle = '#deb887';
        ctx.lineWidth = 2;
        const spacing = 8;
        // 垂直线条
        for (let x = 0; x < w; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        // 水平线条
        for (let y = 0; y < h; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        // 添加编织效果
        ctx.fillStyle = 'rgba(222, 184, 135, 0.3)';
        for (let x = 0; x < w; x += spacing * 2) {
            for (let y = 0; y < h; y += spacing * 2) {
                ctx.fillRect(x, y, spacing, spacing);
            }
        }
        
    } else if (template === 'brick-texture') {
        // 🧱 砖墙纹理 - 砖块效果
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(0, 0, w, h);
        // 绘制砖块
        const brickW = w / 8;
        const brickH = h / 12;
        ctx.fillStyle = '#cd853f';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        
        for (let row = 0; row < 12; row++) {
            for (let col = 0; col < 8; col++) {
                const offsetX = (row % 2) * (brickW / 2);
                const x = col * brickW + offsetX;
                const y = row * brickH;
                
                if (x < w && y < h) {
                    const drawW = Math.min(brickW - 2, w - x);
                    const drawH = Math.min(brickH - 2, h - y);
                    if (drawW > 0 && drawH > 0) {
                        ctx.fillRect(x, y, drawW, drawH);
                        ctx.strokeRect(x, y, drawW, drawH);
                    }
                }
            }
        }
        
    } else if (template === 'metal-surface') {
        // ⚙️ 金属表面 - 金属光泽效果
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#e8e8e8');
        grad.addColorStop(0.3, '#c0c0c0');
        grad.addColorStop(0.6, '#a8a8a8');
        grad.addColorStop(1, '#d0d0d0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加金属光泽带
        const highlightGrad = ctx.createLinearGradient(0, 0, w, 0);
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        highlightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
        highlightGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.6)');
        highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGrad;
        ctx.fillRect(w * 0.3, 0, w * 0.4, h);
        
    // ===== 节日主题模板 =====
    } else if (template === 'christmas-theme') {
        // 🎄 圣诞节 - 红绿圣诞色调
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#fff8f0');
        grad.addColorStop(0.5, '#ff6b6b');
        grad.addColorStop(1, '#2d5016');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加雪花效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 6 + 2;
            drawSnowflake(ctx, x, y, size);
        }
        
    } else if (template === 'halloween-theme') {
        // 🎃 万圣节 - 橙黑万圣节色调
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#2c1810');
        grad.addColorStop(0.5, '#ff6b35');
        grad.addColorStop(1, '#1a0f0a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加蜘蛛网效果
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        const centerX = w * 0.8;
        const centerY = h * 0.2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * 100,
                centerY + Math.sin(angle) * 100
            );
            ctx.stroke();
        }
        
    } else if (template === 'valentine-theme') {
        // 💝 情人节 - 粉色爱心主题
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
        grad.addColorStop(0, '#ffe0e6');
        grad.addColorStop(0.6, '#ffb3d9');
        grad.addColorStop(1, '#ff80bf');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加爱心装饰
        ctx.fillStyle = 'rgba(255, 182, 193, 0.4)';
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 20 + 10;
            drawHeart(ctx, x, y, size);
        }
        
    } else if (template === 'easter-theme') {
        // 🐰 复活节 - 彩虹色彩蛋主题
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#e8f5e8');
        grad.addColorStop(0.25, '#fff3e0');
        grad.addColorStop(0.5, '#fce4ec');
        grad.addColorStop(0.75, '#e1f5fe');
        grad.addColorStop(1, '#f3e5f5');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // 添加彩色圆点装饰
        const colors = ['#ff9800', '#e91e63', '#9c27b0', '#3f51b5', '#00bcd4', '#4caf50'];
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const radius = Math.random() * 15 + 5;
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
    }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// 绘制爱心
function drawHeart(ctx, x, y, size) {
    const halfSize = size / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, halfSize);
    ctx.bezierCurveTo(-halfSize, -halfSize/2, -halfSize * 1.5, halfSize/2, 0, halfSize * 1.5);
    ctx.bezierCurveTo(halfSize * 1.5, halfSize/2, halfSize, -halfSize/2, 0, halfSize);
    ctx.fill();
    ctx.restore();
}

// 绘制云朵
function drawCloud(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(-size/2, 0, size/3, 0, Math.PI * 2);
    ctx.arc(-size/4, -size/4, size/4, 0, Math.PI * 2);
    ctx.arc(0, -size/3, size/3, 0, Math.PI * 2);
    ctx.arc(size/4, -size/4, size/4, 0, Math.PI * 2);
    ctx.arc(size/2, 0, size/3, 0, Math.PI * 2);
    ctx.arc(size/4, size/4, size/4, 0, Math.PI * 2);
    ctx.arc(-size/4, size/4, size/4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// 绘制雪花
function drawSnowflake(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = size / 4;
    ctx.lineCap = 'round';
    
    // 绘制6条主要线条
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 3);
        
        // 主线条
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size);
        ctx.stroke();
        
        // 分支
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.7);
        ctx.lineTo(-size * 0.3, -size * 0.4);
        ctx.moveTo(0, -size * 0.7);
        ctx.lineTo(size * 0.3, -size * 0.4);
        ctx.stroke();
        
        ctx.restore();
    }
    
    ctx.restore();
}

// 绘制叶子
function drawLeaf(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, size/2, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// 绘制emoji
function drawEmoji(ctx, emoji, x, y, size) {
    ctx.save();
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiSymbols", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 添加半透明效果，让emoji不会过分抢夺文字注意力
    ctx.globalAlpha = 0.7;
    
    // 绘制emoji
    ctx.fillText(emoji, x, y);
    
    ctx.restore();
}



// 绘制小猫和吊床装饰
function drawCatWithHammock(ctx, x, y, size) {
    ctx.save();
    
    // 绘制吊床
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    // 左绳子
    ctx.moveTo(x - size * 0.4, y - size * 0.3);
    ctx.lineTo(x - size * 0.3, y);
    // 右绳子
    ctx.moveTo(x + size * 0.4, y - size * 0.3);
    ctx.lineTo(x + size * 0.3, y);
    ctx.stroke();
    
    // 吊床主体
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.3, y);
    ctx.quadraticCurveTo(x, y + size * 0.1, x + size * 0.3, y);
    ctx.stroke();
    
    // 小猫咪身体
    ctx.fillStyle = '#ff8a50';
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.05, size * 0.15, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 小猫咪头部
    ctx.fillStyle = '#ff8a50';
    ctx.beginPath();
    ctx.arc(x - size * 0.1, y - size * 0.1, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
    
    // 白色肚皮
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.03, size * 0.08, size * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 猫耳朵
    ctx.fillStyle = '#ff8a50';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.14, y - size * 0.13);
    ctx.lineTo(x - size * 0.10, y - size * 0.16);
    ctx.lineTo(x - size * 0.06, y - size * 0.13);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x - size * 0.14, y - size * 0.07);
    ctx.lineTo(x - size * 0.10, y - size * 0.10);
    ctx.lineTo(x - size * 0.06, y - size * 0.07);
    ctx.fill();
    
    // 猫尾巴
    ctx.strokeStyle = '#ff8a50';
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.12, y - size * 0.08);
    ctx.quadraticCurveTo(x + size * 0.2, y - size * 0.15, x + size * 0.15, y - size * 0.2);
    ctx.stroke();
    
    // 眼睛
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(x - size * 0.12, y - size * 0.1, size * 0.008, 0, Math.PI * 2);
    ctx.arc(x - size * 0.08, y - size * 0.1, size * 0.008, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻子
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(x - size * 0.1, y - size * 0.08, size * 0.004, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}



// 检查electronAPI是否就绪
function checkElectronAPI() {
    if (!window.electronAPI) {
        console.error('electronAPI not available');
        showNotification('系统初始化失败，请重启应用', 'error');
        return false;
    }
    
    // 检查必需的方法
    const requiredMethods = [
        'launchBrowser', 'closeBrowser', 'isBrowserRunning', 
        'getRunningBrowsers', 'closeAllBrowsers', 'getChromePath', 
        'setChromePath', 'showOpenDialog', 'cleanupUserData',
        'showSaveDialog', 'showMessageBox', 'showErrorBox',
        'openExternal', 'openPath', 'trashItem', 'showItemInFolder',
        'writeText', 'readText', 'getAppVersion', 'getAppName'
    ];
    
    for (const method of requiredMethods) {
        if (!window.electronAPI[method]) {
            console.error(`electronAPI method ${method} not available`);
            showNotification(`系统功能 ${method} 不可用，请重启应用`, 'error');
            return false;
        }
    }
    
    return true;
}

// ---------- 发布管理：数据存储与初始化 ----------
let publishQueue = [];
const PUBLISH_STORAGE_KEYS = {
    queue: 'creator-assistant-publish-queue',
    selections: 'creator-assistant-publish-selections'
};

function ensurePublishStore() {
    try {
        const q = localStorage.getItem(PUBLISH_STORAGE_KEYS.queue);
        publishQueue = q ? JSON.parse(q) : [];
    } catch (e) {
        publishQueue = [];
    }
    const savedSel = localStorage.getItem(PUBLISH_STORAGE_KEYS.selections);
    if (!savedSel) {
        localStorage.setItem(PUBLISH_STORAGE_KEYS.selections, JSON.stringify({ contentIds: [], accountIds: [] }));
    }
}

function savePublishQueue() {
    localStorage.setItem(PUBLISH_STORAGE_KEYS.queue, JSON.stringify(publishQueue));
}

function getPublishSelections() {
    try {
        const raw = localStorage.getItem(PUBLISH_STORAGE_KEYS.selections);
        return raw ? JSON.parse(raw) : { contentIds: [], accountIds: [] };
    } catch (e) {
        return { contentIds: [], accountIds: [] };
    }
}

function setPublishSelections(sel) {
    localStorage.setItem(PUBLISH_STORAGE_KEYS.selections, JSON.stringify(sel));
}

function initializePublishManagement() {
    // 渲染内容列表
    renderPublishContents();
    // 渲染账号列表
    renderPublishAccounts();
    // 渲染队列
    renderPublishQueue();

    // 启动自动发布调度器（定期检查到期任务并自动执行）
    startAutoPublishScheduler();
}

function renderPublishContents(filter = '') {
    const container = document.getElementById('publish-content-list');
    if (!container) return;
    const all = contentLibrary.getAllContents();
    const list = filter ? all.filter(c =>
        (c.title || '').toLowerCase().includes(filter.toLowerCase()) ||
        (c.tags || '').toLowerCase().includes(filter.toLowerCase())
    ) : all;
    if (list.length === 0) {
        container.innerHTML = '<div class="empty-tip">内容库为空</div>';
        return;
    }
    const selections = getPublishSelections();
    container.innerHTML = list.map(c => `
        <label class="select-item">
            <input type="checkbox" ${selections.contentIds.includes(c.id) ? 'checked' : ''} onchange="togglePublishContent('${c.id}', this.checked)">
            <span class="title" title="${c.title}">${c.title || '(无标题)'} </span>
            <span class="meta">${(c.images?.length || 0)}图 • ${new Date(c.createdAt).toLocaleString()}</span>
        </label>
    `).join('');
}

function renderPublishAccounts() {
    const container = document.getElementById('publish-account-list');
    if (!container) return;
    const groupSelect = document.getElementById('publish-group-filter');
    // 构建分组选项
    const groups = Array.from(new Set(accountsData.map(a => a.group))).filter(Boolean);
    groupSelect.innerHTML = '<option value="">全部分组</option>' + groups.map(g => `<option value="${g}">${g}</option>`).join('');

    const search = (document.getElementById('publish-account-search')?.value || '').toLowerCase();
    const selectedGroup = groupSelect.value;
    let list = accountsData;
    if (selectedGroup) list = list.filter(a => a.group === selectedGroup);
    if (search) list = list.filter(a => `${a.windowName} ${a.note || ''}`.toLowerCase().includes(search));
    if (list.length === 0) {
        container.innerHTML = '<div class="empty-tip">无账号，请在账号管理中创建</div>';
        return;
    }
    const selections = getPublishSelections();
    container.innerHTML = list.map(a => `
        <label class="select-item">
            <input type="checkbox" ${selections.accountIds.includes(a.id) ? 'checked' : ''} onchange="togglePublishAccount(${a.id}, this.checked)">
            <span class="title" title="${a.windowName}">${a.windowName}</span>
            <span class="meta">${a.note || '无备注'}</span>
        </label>
    `).join('');
}

function togglePublishContent(contentId, checked) {
    const sel = getPublishSelections();
    const set = new Set(sel.contentIds);
    checked ? set.add(contentId) : set.delete(contentId);
    sel.contentIds = Array.from(set);
    setPublishSelections(sel);
}

function togglePublishAccount(accountId, checked) {
    const sel = getPublishSelections();
    const set = new Set(sel.accountIds);
    checked ? set.add(accountId) : set.delete(accountId);
    sel.accountIds = Array.from(set);
    setPublishSelections(sel);
}

function filterPublishContents(q) {
    renderPublishContents(q || '');
}

function filterPublishAccounts() {
    renderPublishAccounts();
}

function toggleScheduleOptions(show) {
    const el = document.getElementById('schedule-time-group');
    if (el) el.style.display = show ? '' : 'none';
}

function clearPublishSelections() {
    setPublishSelections({ contentIds: [], accountIds: [] });
    renderPublishContents();
    renderPublishAccounts();
}

function createPublishTasks() {
    const sel = getPublishSelections();
    if (sel.contentIds.length === 0) {
        showNotification('请先选择内容', 'warning');
        return;
    }
    if (sel.accountIds.length === 0) {
        showNotification('请先选择账号', 'warning');
        return;
    }
    const timeMode = document.querySelector('input[name="publish-time-mode"]:checked')?.value || 'now';
    const scheduleTime = document.getElementById('schedule-time')?.value || null;
    const concurrency = parseInt(document.getElementById('concurrency')?.value || '1', 10);
    const rateLimit = parseInt(document.getElementById('rate-limit')?.value || '0', 10) || 0;
    const headless = window.isHeadlessMode || false;

    const now = Date.now();
    const tasks = [];
    for (const accountId of sel.accountIds) {
        const account = accountsData.find(a => a.id === accountId);
        if (!account) continue;
        for (const contentId of sel.contentIds) {
            const content = contentLibrary.getContentById(contentId);
            if (!content) continue;
            const id = `${now}-${accountId}-${contentId}`;
            tasks.push({
                id,
                accountId,
                accountName: account.windowName,
                platform: account.platform,
                contentId,
                contentTitle: content.title,
                scheduleAt: timeMode === 'schedule' && scheduleTime ? new Date(scheduleTime).toISOString() : null,
                status: 'pending', // pending, running, success, failed
                attempts: 0,
                result: null,
                concurrency,
                rateLimit,
                headless
            });
        }
    }
    publishQueue = publishQueue.concat(tasks);
    savePublishQueue();
    renderPublishQueue();
    showNotification(`已创建 ${tasks.length} 个任务`, 'success');
}

function renderPublishQueue() {
    const tbody = document.getElementById('publish-queue-body');
    if (!tbody) return;
    if (publishQueue.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">暂无任务</td></tr>';
        return;
    }
    tbody.innerHTML = publishQueue.map(t => `
        <tr>
            <td>${t.id.slice(-6)}</td>
            <td>${t.accountName}</td>
            <td>${t.platform}</td>
            <td title="${t.contentTitle}">${(t.contentTitle || '').slice(0, 16)}</td>
            <td>${t.scheduleAt ? new Date(t.scheduleAt).toLocaleString() : '立即'}</td>
            <td><span class="status-badge ${t.status}">${t.status}</span></td>
            <td>${t.result ? (t.result.url || t.result.message || '') : '-'}</td>
            <td>
                <button class="action-btn" onclick="retryPublishTask('${t.id}')">重试</button>
                <button class="action-btn danger" onclick="removePublishTask('${t.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function removePublishTask(taskId) {
    publishQueue = publishQueue.filter(t => t.id !== taskId);
    savePublishQueue();
    renderPublishQueue();
}

function refreshPublishQueue() { renderPublishQueue(); }

async function startQueueProcessing() {
    if (!checkElectronAPI()) return;
    const now = Date.now();
    // 简化：顺序执行（并发策略后续增强）
    for (const task of publishQueue) {
        if (task.status === 'success') continue;
        if (task.scheduleAt && new Date(task.scheduleAt).getTime() > now) continue;
        await runPublishTask(task);
        savePublishQueue();
        renderPublishQueue();
    }
}

function clearPublishQueue() {
    publishQueue = [];
    savePublishQueue();
    renderPublishQueue();
}

async function runPublishTask(task) {
    try {
        task.status = 'running';
        task.attempts += 1;
        renderPublishQueue();
        const account = accountsData.find(a => a.id === task.accountId);
        if (!account) throw new Error('账号不存在');
        // 检查是否为小红书平台（支持多种格式）
        const isXiaohongshu = account.platform === 'https://creator.xiaohongshu.com/' || 
                              account.platform === 'xiaohongshu.com' || 
                              account.platform === 'xiaohongshu' ||
                              account.platform?.includes('xiaohongshu');
        if (!isXiaohongshu) {
            throw new Error('当前仅支持小红书');
        }
        const content = contentLibrary.getContentById(task.contentId);
        if (!content) throw new Error('内容不存在');

        // 等待必要的API可用
        await waitForElectronAPI(['launchBrowser', 'isBrowserRunning', 'publishXhsContent']);

        // 首先确保浏览器已启动
        const running = await window.electronAPI.isBrowserRunning(account.id);
        if (!running) {
            // 启动浏览器
            const windowConfig = { width: 1200, height: 800, left: 100, top: 100 };
            const launch = await window.electronAPI.launchBrowser(account, 'https://creator.xiaohongshu.com/', { 
                windowConfig, 
                headless: task.headless 
            });
            if (!launch || !launch.success) {
                throw new Error((launch && launch.error) || '启动浏览器失败');
            }
            // 等待浏览器启动完成
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 通过浏览器自动化执行发布
        const publishContent = {
            title: content.title,
            body: content.content,
            content: content.content,
            tags: content.tags,
            images: content.images // [{url, name} 或 dataURL 字符串]
        };

        const result = await window.electronAPI.publishXhsContent(account.id, publishContent);
        if (!result || result.success === false) {
            throw new Error(result?.error || '发布失败');
        }

        task.status = 'success';
        task.result = result.data || { message: '发布成功' };
    } catch (err) {
        task.status = 'failed';
        task.result = { message: err.message };
    }
}

function retryPublishTask(taskId) {
    const task = publishQueue.find(t => t.id === taskId);
    if (!task) return;
    task.status = 'pending';
    task.result = null;
    savePublishQueue();
    renderPublishQueue();
}

// ================= 自动调度器：到点自动执行发布任务 =================
let autoPublishSchedulerIntervalId = null;
let isAutoPublishSchedulerRunning = false;

function startAutoPublishScheduler() {
    // 避免重复启动
    if (autoPublishSchedulerIntervalId) return;

    const checkAndRunDueTasks = async () => {
        // 互斥，避免重复并发执行
        if (isAutoPublishSchedulerRunning) return;

        // Electron API 未就绪则跳过本轮
        if (!checkElectronAPI || !checkElectronAPI()) return;

        const now = Date.now();
        // 仅在存在“待处理且到期/立即”的任务时触发
        const hasDuePendingTask = publishQueue.some(t => {
            if (t.status !== 'pending') return false;
            if (!t.scheduleAt) return true; // 立即任务
            return new Date(t.scheduleAt).getTime() <= now; // 到期任务
        });
        if (!hasDuePendingTask) return;

        isAutoPublishSchedulerRunning = true;
        try {
            // 只处理“待处理且到期/立即”的任务，失败任务不自动重试，避免无限重试
            for (const task of publishQueue) {
                if (task.status !== 'pending') continue;
                if (task.scheduleAt && new Date(task.scheduleAt).getTime() > now) continue;
                await runPublishTask(task);
                savePublishQueue();
                renderPublishQueue();
            }
        } catch (_) {
            // 忽略单次调度异常，等待下个周期
        } finally {
            isAutoPublishSchedulerRunning = false;
        }
    };

    // 启动后1秒先尝试执行一次（覆盖“立即发布”的自动触发）
    setTimeout(checkAndRunDueTasks, 1000);
    // 每60秒检查一次是否有到期任务
    autoPublishSchedulerIntervalId = setInterval(checkAndRunDueTasks, 60 * 1000);
}

function stopAutoPublishScheduler() {
    if (autoPublishSchedulerIntervalId) {
        clearInterval(autoPublishSchedulerIntervalId);
        autoPublishSchedulerIntervalId = null;
    }
}
// 系统设置相关功能
async function initializeSystemSettings() {
    if (!checkElectronAPI()) return;
    
    await loadSystemSettings();
    await detectChromePath();
    await loadLicenseStatus();
}

// 检测Chrome路径
async function detectChromePath() {
    try {
        // 检查electronAPI是否可用
        if (!window.electronAPI || !window.electronAPI.getChromePath) {
            console.error('electronAPI not available or getChromePath method missing');
            const statusText = document.getElementById('browser-status-text');
            if (statusText) {
                statusText.textContent = '系统未就绪';
                statusText.className = 'status-badge error';
            }
            return;
        }

        const chromePath = await window.electronAPI.getChromePath();
        const chromePathInput = document.getElementById('chrome-path');
        const statusText = document.getElementById('browser-status-text');
        
        if (chromePath) {
            chromePathInput.value = chromePath;
            statusText.textContent = '已检测到';
            statusText.className = 'status-badge success';
        } else {
            statusText.textContent = '未检测到';
            statusText.className = 'status-badge error';
        }
    } catch (error) {
        console.error('检测Chrome路径失败:', error);
        const statusText = document.getElementById('browser-status-text');
        statusText.textContent = '检测失败';
        statusText.className = 'status-badge error';
    }
}

// 选择Chrome路径
async function selectChromePath() {
    try {
        // 检查electronAPI是否可用
        if (!window.electronAPI || !window.electronAPI.showOpenDialog || !window.electronAPI.setChromePath) {
            console.error('electronAPI not available or required methods missing');
            showNotification('系统初始化未完成，请稍后重试', 'error');
            return;
        }

        const result = await window.electronAPI.showOpenDialog({
            title: '选择Chrome浏览器',
            filters: [
                { name: 'Executable Files', extensions: ['exe'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];
            const setResult = await window.electronAPI.setChromePath(selectedPath);
            
            if (setResult.success) {
                document.getElementById('chrome-path').value = selectedPath;
                showNotification('Chrome路径设置成功', 'success');
                await detectChromePath();
            } else {
                showNotification(`设置Chrome路径失败: ${setResult.error}`, 'error');
            }
        }
    } catch (error) {
        console.error('选择Chrome路径失败:', error);
        showNotification('选择Chrome路径失败: ' + error.message, 'error');
    }
}

// 清理所有用户数据
async function cleanupAllUserData() {
    const confirmed = confirm('确定要清理所有用户数据吗？此操作将删除所有浏览器配置文件，不可恢复！');
    if (!confirmed) return;

    try {
        // 检查electronAPI是否可用
        if (!window.electronAPI || !window.electronAPI.cleanupUserData) {
            console.error('electronAPI not available or cleanupUserData method missing');
            showNotification('系统初始化未完成，请稍后重试', 'error');
            return;
        }

        // 先关闭所有浏览器
        await closeAllBrowsers();
        
        // 清理每个账号的用户数据
        const cleanupPromises = accountsData.map(account => 
            window.electronAPI.cleanupUserData(account.id)
        );
        
        await Promise.all(cleanupPromises);
        showNotification('所有用户数据已清理', 'success');
        
    } catch (error) {
        console.error('清理用户数据失败:', error);
        showNotification('清理用户数据失败: ' + error.message, 'error');
    }
}

// 重置所有设置
function resetAllSettings() {
    const confirmed = confirm('确定要重置所有设置吗？此操作将恢复默认配置！');
    if (!confirmed) return;

    try {
        // 重置表单值
        document.getElementById('max-browsers').value = 10;
        document.getElementById('status-refresh-interval').value = 30;
        
        // 重新检测Chrome路径
        detectChromePath();
        
        showNotification('设置已重置为默认值', 'success');
        
    } catch (error) {
        console.error('重置设置失败:', error);
        showNotification('重置设置失败: ' + error.message, 'error');
    }
}

// 保存系统设置
function saveSystemSettings() {
    try {
        const settings = {
            maxBrowsers: parseInt(document.getElementById('max-browsers').value),
            statusRefreshInterval: parseInt(document.getElementById('status-refresh-interval').value)
        };
        
        // 保存到localStorage
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        
        showNotification('系统设置已保存', 'success');
        
    } catch (error) {
        console.error('保存系统设置失败:', error);
        showNotification('保存系统设置失败: ' + error.message, 'error');
    }
}

// 加载系统设置
function loadSystemSettings() {
    try {
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            if (settings.maxBrowsers) {
                document.getElementById('max-browsers').value = settings.maxBrowsers;
            }
            
            if (settings.statusRefreshInterval) {
                document.getElementById('status-refresh-interval').value = settings.statusRefreshInterval;
            }
        }
    } catch (error) {
        console.error('加载系统设置失败:', error);
    }
}

// 设置表单验证
function setupFormValidation() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

// 输入框焦点增强（针对打包环境）
function enhanceInputFocus() {
    console.log('初始化输入框焦点增强...');
    
    // 全局点击事件监听器
    document.addEventListener('click', function(event) {
        const target = event.target;
        
        // 如果点击的是输入框类型的元素
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // 延迟聚焦，确保在打包环境中能正常工作
            setTimeout(() => {
                try {
                    target.focus();
                    console.log('强制聚焦输入框:', target.id || target.className);
                } catch (error) {
                    console.warn('输入框聚焦失败:', error);
                }
            }, 10);
        }
    });
    
    // 窗口焦点事件监听器（Electron特有）
    if (window.electronAPI) {
        window.addEventListener('focus', function() {
            console.log('窗口获得焦点，重新激活输入框事件');
            // 重新初始化输入框事件
            setTimeout(() => {
                initializeInputEvents();
            }, 100);
        });
    }
    
    // 页面可见性变化监听（处理切换窗口的情况）
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('页面重新可见，重新激活输入框事件');
            setTimeout(() => {
                initializeInputEvents();
            }, 100);
        }
    });
}

// 初始化输入框事件
function initializeInputEvents() {
    const inputs = document.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        // 移除旧的事件监听器（避免重复绑定）
        input.removeEventListener('click', forceInputFocus);
        input.removeEventListener('mousedown', forceInputFocus);
        
        // 添加新的事件监听器
        input.addEventListener('click', forceInputFocus);
        input.addEventListener('mousedown', forceInputFocus);
    });
}

// 强制输入框聚焦
function forceInputFocus(event) {
    const input = event.target;
    
    // 立即聚焦
    setTimeout(() => {
        try {
            input.focus();
            
            // 如果是文本输入框，选中内容或将光标移动到末尾
            if (input.type === 'text' || input.type === 'password' || input.tagName === 'TEXTAREA') {
                const length = input.value.length;
                input.setSelectionRange(length, length);
            }
        } catch (error) {
            console.warn('输入框聚焦处理失败:', error);
        }
    }, 1);
}

// 显示指纹配置界面
function showFingerprintConfig() {
    // 切换到指纹配置内容区域
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById('fingerprint-config').classList.add('active');
    
    // 初始化指纹生成器（如果还没有初始化）
    if (typeof initializeFingerprintGenerator === 'function') {
        initializeFingerprintGenerator();
    }
}

// 验证字段
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.previousElementSibling.textContent;
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, `${fieldName}不能为空`);
        return false;
    }
    
    if (field.type === 'text' && value.length > 100) {
        showFieldError(field, `${fieldName}不能超过100个字符`);
        return false;
    }
    
    if (field.tagName === 'TEXTAREA' && value.length > 2000) {
        showFieldError(field, `${fieldName}不能超过2000个字符`);
        return false;
    }
    
    return true;
}

// 显示字段错误
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.style.borderColor = '#ef4444';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#ef4444';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '4px';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

// 清除字段错误
function clearFieldError(field) {
    field.style.borderColor = '#d1d5db';
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// AI API配置
const AI_CONFIG = {
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    apiKey: 'd9f43578-0bc6-4cc4-8ffa-0e3c65ad5a7b',
    model: 'doubao-1-5-pro-32k-250115'
};

// 豆包图片生成API配置
const IMAGE_GENERATION_CONFIG = {
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    apiKey: 'd9f43578-0bc6-4cc4-8ffa-0e3c65ad5a7b',
    model: 'doubao-seedream-3-0-t2i-250415'
};

// 豆包图片分析API配置
const IMAGE_ANALYSIS_CONFIG = {
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    apiKey: 'd9f43578-0bc6-4cc4-8ffa-0e3c65ad5a7b',
    model: 'doubao-seed-1-6-flash-250715'
};

// AI智能创作功能
async function startCreation() {
    if (isCreating) return;
    
    const productName = document.getElementById('productName').value.trim();
    const productFeatures = document.getElementById('productFeatures').value.trim();
    const productAdvantages = document.getElementById('productAdvantages').value.trim();
    const userBenefits = document.getElementById('userBenefits').value.trim();
    const style = document.getElementById('style').value;
    const batch = parseInt(document.getElementById('batch').value);
    
    // 验证必填输入
    if (!productName) {
        showNotification('请输入产品名称', 'error');
        document.getElementById('productName').focus();
        return;
    }
    
    if (productName.length < 2) {
        showNotification('产品名称至少需要2个字符', 'error');
        document.getElementById('productName').focus();
        return;
    }
    
    if (!productFeatures) {
        showNotification('请输入产品特点', 'error');
        document.getElementById('productFeatures').focus();
        return;
    }
    
    if (productFeatures.length < 5) {
        showNotification('产品特点至少需要5个字符', 'error');
        document.getElementById('productFeatures').focus();
        return;
    }
    
    isCreating = true;
    const button = document.querySelector('.create-btn');
    const originalText = button.innerHTML;
    
    // 显示加载状态
    button.innerHTML = '<div class="loading"></div> 创作中...';
    button.disabled = true;
    
    // 清空之前的结果
    clearResults();
    
    try {
        showNotification(`正在生成${batch}篇内容...`, 'info');
        
        const results = [];
        
        // 批量生成内容
        for (let i = 0; i < batch; i++) {
            try {
                showNotification(`正在生成第${i + 1}篇内容...`, 'info');
                
                // 调用豆包AI API生成内容
                const result = await generateContentWithAI({
                    productName,
                    productFeatures,
                    productAdvantages,
                    userBenefits
                }, style, 1);
                results.push({
                    ...result,
                    index: i + 1,
                    isAIGenerated: true
                });
                
                // 每生成一篇就显示一篇，提供更好的用户体验
                showSingleResult(result, i + 1, true);
                
                // 添加延迟避免API频率限制
                if (i < batch - 1) {
                    await delay(1000);
                }
                
            } catch (error) {
                console.error(`生成第${i + 1}篇内容失败:`, error);
                
                // 降级到本地生成
                const fallbackResult = {
                    title: generateTitle(productName, style),
                    content: generateContent(productName, style),
                    tags: generateTags(productName),
                    index: i + 1,
                    isAIGenerated: false
                };
                
                results.push(fallbackResult);
                showSingleResult(fallbackResult, i + 1, false);
            }
        }
        
        // 显示生成结果区域
        document.getElementById('generation-results').style.display = 'block';
        
        showNotification(`成功生成${results.length}篇内容！可选择编辑后保存到内容库`, 'success');
        
    } catch (error) {
        showNotification('批量生成失败，请重试', 'error');
        console.error('Batch creation error:', error);
        
    } finally {
        isCreating = false;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 使用豆包AI生成内容
async function generateContentWithAI(productInfo, style, batch) {
    const prompt = createPromptForStyle(productInfo, style);
    
    try {
        const response = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的智能内容创作助手。请根据用户的要求，创作出符合平台特色的高质量内容，包括吸引人的标题、丰富的正文内容和相关标签。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const aiContent = data.choices[0].message.content;
        
        // 解析AI返回的内容
        return parseAIResponse(aiContent, productInfo.productName);
        
    } catch (error) {
        console.error('AI API调用失败:', error);
        throw error;
    }
}

// 根据风格创建提示词
function createPromptForStyle(productInfo, style) {
    const styleDescriptions = {
        '价值反问型': '突出产品特点和优势，强调用户获得的好处，通过反问引导思考和行动',
        '场景痛点型': '结合具体使用场景，直接点出用户痛点，提供针对性解决方案',
        '科普类型': '从科学原理角度解析产品特点，用适中的专业术语配合通俗解释，既有知识含量又保持可读性，让用户理性种草',
        '通用型': '采用通用的小红书种草文案风格，平衡产品介绍和情感表达，适合各类产品的基础推荐',
        '对比测评型': '通过与同类产品对比，客观分析优缺点，用实际测试数据和体验感受来证明产品价值，让用户做出理性选择',
        '故事叙述型': '用个人使用故事或情景故事包装产品介绍，通过生动的叙述和情感共鸣来吸引用户，让产品自然融入故事情节',
        '踩雷避坑型': '以"避雷指南"或"防踩坑"的角度切入，先分析市面上同类产品的常见问题，再突出推荐产品如何避免这些问题',
        '人群定向型': '针对特定人群的需求和特点定制文案，精准描述目标用户的使用场景和需求痛点，让目标群体产生强烈的代入感',
        '颜值种草型': '重点突出产品的外观设计、包装美感、使用时的仪式感等视觉元素，通过颜值吸引和审美体验来促进种草'
    };

    // 构建产品信息描述
    let productDescription = `产品名称：${productInfo.productName}\n产品特点：${productInfo.productFeatures}`;
    
    if (productInfo.productAdvantages) {
        productDescription += `\n产品优点：${productInfo.productAdvantages}`;
    }
    
    if (productInfo.userBenefits) {
        productDescription += `\n对用户的好处：${productInfo.userBenefits}`;
    }

    // 根据不同风格添加特殊要求
    let specialRequirements = '';
    if (style === '科普类型') {
        specialRequirements = `
   - 从科学原理角度解释产品特点和功效
   - 使用适当的专业术语但要通俗解释
   - 结合产品名称和特点进行科学解析
   - 保持知识性和实用性的平衡
   - 适合的标签如：#科学护肤 #成分解析 #知识种草 #理性消费`;
    }

    return `请为小红书平台创作一篇产品种草文案，基于以下产品信息：

${productDescription}

创作要求：
1. 创作风格：${styleDescriptions[style]}
2. 内容结构：
   - 标题：吸引人的标题，控制在20字以内，可以使用合适的emoji，突出产品名称
   - 正文：300-500字的正文内容，分段清晰，适合小红书阅读习惯
   - 标签：5-8个相关标签，包含产品相关词汇

3. 内容要求：
   - 符合小红书种草文风格
   - 重点突出产品特点和用户获得的好处
   - 适当使用emoji增加视觉效果
   - 语言生动自然，具有说服力
   - 真实可信，避免夸大宣传${specialRequirements}

请按照以下格式输出：
【标题】
[这里是标题内容]

【正文】
[这里是正文内容]

【标签】
[这里是标签，用空格分隔]`;
}

// 解析AI响应内容
function parseAIResponse(aiContent, topic) {
    try {
        // 提取标题
        const titleMatch = aiContent.match(/【标题】\s*\n([^\n【]+)/);
        let title = titleMatch ? titleMatch[1].trim() : `关于${topic}的精彩分享`;
        
        // 提取正文
        const contentMatch = aiContent.match(/【正文】\s*\n([\s\S]*?)(?=【标签】|$)/);
        let content = contentMatch ? contentMatch[1].trim() : aiContent;
        
        // 提取标签
        const tagsMatch = aiContent.match(/【标签】\s*\n([^\n]+)/);
        let tags = tagsMatch ? tagsMatch[1].trim() : generateTags(topic);
        
        // 清理和格式化标签
        if (tags.includes('#')) {
            tags = tags.replace(/#/g, '').replace(/\s+/g, '，');
        }
        
        return {
            title: title,
            content: content,
            tags: tags
        };
        
    } catch (error) {
        console.error('解析AI响应失败:', error);
        // 返回默认内容
        return {
            title: `${topic}的精彩分享`,
            content: aiContent.substring(0, 500),
            tags: generateTags(topic)
        };
    }
}

// 生成标题
function generateTitle(topic, style) {
    const titles = {
        '价值反问型': [
            `${topic}这么好用，你还不知道？`,
            `为什么聪明人都选择${topic}？`,
            `${topic}的3大优势，你用过吗？`
        ],
        '场景痛点型': [
            `还在为${topic}烦恼？一招搞定！`,
            `${topic}踩雷合集，看完避坑！`,
            `${topic}场景实测，效果惊人！`
        ]
    };
    
    const styleArray = titles[style] || titles['价值反问型'];
    return styleArray[Math.floor(Math.random() * styleArray.length)];
}

// 生成内容
function generateContent(topic, style) {
    const contentTemplates = {
        '价值反问型': `💎 ${topic}的三大核心优势，你了解吗？

✅ 特点一：高品质材料，用料扎实
→ 优势：比普通产品耐用3倍
→ 好处：帮你省钱又省心

✅ 特点二：人性化设计，操作简单  
→ 优势：上手零门槛，老人小孩都会用
→ 好处：全家都能享受便利生活

✅ 特点三：售后保障完善，服务贴心
→ 优势：7天无理由退换，终身维护
→ 好处：买得放心，用得安心

❓ 这样的${topic}，难道你不心动吗？
❓ 还在犹豫什么，赶紧行动起来吧！

#${topic} #好物推荐 #值得拥有`,
        
        '场景痛点型': `😤 用${topic}踩过的坑，血泪教训分享！

🔥 场景一：早高峰赶地铁
痛点：${topic}质量差，关键时刻掉链子
解决：选择知名品牌，质量有保障

🔥 场景二：重要场合使用
痛点：外观不够精致，影响个人形象  
解决：注重设计感，提升整体品质

🔥 场景三：长期频繁使用
痛点：容易损坏，更换成本高
解决：一次投资，长久受益

💡 现在用的这款${topic}完美解决了以上问题：
✓ 品质可靠，从不掉链子
✓ 颜值在线，倍有面子  
✓ 经久耐用，性价比超高

👆 姐妹们，别再踩雷了！

#${topic} #避雷指南 #实用分享`
    };
    
    return contentTemplates[style] || contentTemplates['价值反问型'];
}

// 生成标签
function generateTags(topic) {
    const commonTags = ['生活分享', '日常记录', '美好生活', '正能量'];
    const topicTags = [topic, `${topic}分享`, `${topic}心得`];
    
    return [...topicTags, ...commonTags.slice(0, 2)].join('，');
}

// 显示单个生成结果
function showSingleResult(result, index, isAIGenerated = true) {
    const resultsContainer = document.getElementById('results-container');
    const resultId = `result-${Date.now()}-${index}`;
    
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.id = resultId;
    
    // 构建图片预览HTML - 支持原有图片和自定义图片
    let imagePreviewHtml = '';
    const allImages = [];
    
    // 添加原有的AI创作区域图片
    const originalImages = result.images || [...aiUploadedImages];
    if (originalImages && originalImages.length > 0) {
        allImages.push(...originalImages);
    }
    
    // 添加自定义图片（从文生图页面添加的）
    if (result.customImages && result.customImages.length > 0) {
        allImages.push(...result.customImages);
    }
    
    if (allImages.length > 0) {
        imagePreviewHtml = `
            <div class="result-images">
                ${allImages.map((img, imgIndex) => `
                    <div class="result-image-item">
                        <img src="${img.url}" alt="${img.name}" onclick="previewResultImage('${resultId}', ${imgIndex})">
                        ${img.type === 'generated' ? '<span class="image-badge">文生图</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    resultItem.innerHTML = `
        <div class="result-header">
            <div class="result-selection">
                <input type="checkbox" id="select-${resultId}" class="result-checkbox" onchange="updateSelectAllState()">
                <label for="select-${resultId}" class="result-title">第${index}篇：${result.title}</label>
            </div>
            <div class="result-meta">
                <span class="source ${isAIGenerated ? 'ai' : 'manual'}">${isAIGenerated ? '🤖 AI生成' : '📝 本地生成'}</span>
                <span class="time">${new Date().toLocaleTimeString()}</span>
            </div>
        </div>
        <div class="result-content">
            <h4>${result.title}</h4>
            ${imagePreviewHtml}
            <div class="content-text">${result.content}</div>
            <div class="content-tags">${result.tags}</div>
        </div>
        <div class="result-actions">
            <button onclick="editResult('${resultId}')">编辑</button>
            <button onclick="copyResultToClipboard('${resultId}')">复制</button>
            <button class="btn-info" onclick="createImageForText('${resultId}')">为此文案配图</button>
            <button class="btn-primary" onclick="saveResultToLibrary('${resultId}')">保存到内容库</button>
        </div>
    `;
    
    // 存储结果数据到元素上
    resultItem.resultData = {
        ...result,
        isAIGenerated: isAIGenerated,
        style: getCurrentSelectedStyle(),
        images: originalImages, // 包含AI创作区域的图片
        customImages: result.customImages || [] // 包含自定义图片（从文生图页面添加的）
    };
    
    resultsContainer.appendChild(resultItem);
    
    // 显示生成结果区域
    document.getElementById('generation-results').style.display = 'block';
    
    // 更新选择控制状态
    updateSelectionControls();
    
    // 滚动到最新结果
    resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 清空生成结果
function clearResults() {
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '';
    document.getElementById('generation-results').style.display = 'none';
    
    // 重置选择状态
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    updateSelectionControls();
}

// 全选/取消全选功能
function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.result-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateSelectionControls();
}

// 更新全选状态
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.result-checkbox');
    const selectAllCheckbox = document.getElementById('select-all');
    
    if (!selectAllCheckbox || checkboxes.length === 0) {
        return;
    }
    
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
    
    updateSelectionControls();
}

// 更新选择控制状态
function updateSelectionControls() {
    const checkboxes = document.querySelectorAll('.result-checkbox');
    const saveSelectedBtn = document.getElementById('save-selected-btn');
    
    if (!saveSelectedBtn) return;
    
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    saveSelectedBtn.disabled = checkedCount === 0;
    
    if (checkedCount > 0) {
        saveSelectedBtn.textContent = `保存选中到内容库 (${checkedCount})`;
    } else {
        saveSelectedBtn.textContent = '保存选中到内容库';
    }
}

// 批量保存选中的结果到内容库
function saveSelectedToLibrary() {
    const checkboxes = document.querySelectorAll('.result-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showNotification('请先选择要保存的内容', 'error');
        return;
    }
    
    let savedCount = 0;
    let failedCount = 0;
    
    showNotification(`正在批量保存${checkboxes.length}条内容...`, 'info');
    
    checkboxes.forEach((checkbox, index) => {
        const resultId = checkbox.id.replace('select-', '');
        const resultItem = document.getElementById(resultId);
        
        if (resultItem && resultItem.resultData) {
            const data = resultItem.resultData;
            
            try {
                // 准备保存数据
                // 合并所有图片数据（AI创作区域图片 + 自定义图片）
                const allImages = [];
                if (data.images && Array.isArray(data.images)) {
                    allImages.push(...data.images);
                }
                if (data.customImages && Array.isArray(data.customImages)) {
                    allImages.push(...data.customImages);
                }
                
                const saveData = {
                    title: data.title,
                    tags: data.tags,
                    content: data.content,
                    images: allImages,
                    source: data.isAIGenerated ? 'ai' : 'manual',
                    aiModel: data.isAIGenerated ? 'doubao-1-5-pro-32k-250115' : null,
                    style: data.style
                };
                
                console.log(`📋 准备保存内容: "${data.title?.substring(0, 30)}...", 图片数量: ${allImages.length}`);
                
                // 保存到内容库
                const savedContent = contentLibrary.addContent(saveData);
                if (savedContent) {
                    savedCount++;
                    
                    // 取消选中状态
                    checkbox.checked = false;
                } else {
                    failedCount++;
                }
                
            } catch (error) {
                console.error(`保存第${index + 1}条内容失败:`, error);
                failedCount++;
            }
        } else {
            failedCount++;
        }
    });
    
    // 显示结果通知
    if (savedCount > 0 && failedCount === 0) {
        showNotification(`成功批量保存${savedCount}条内容到内容库！`, 'success');
    } else if (savedCount > 0 && failedCount > 0) {
        showNotification(`保存完成：成功${savedCount}条，失败${failedCount}条`, 'info');
    } else {
        showNotification('批量保存失败，请重试', 'error');
    }
    
    // 更新内容库统计
    updateLibraryStats();
    
    // 如果当前显示的是内容库页面，刷新显示
    const librarySection = document.getElementById('content-library');
    if (librarySection && librarySection.classList.contains('active')) {
        updateContentLibraryDisplay();
    }
    
    // 更新选择状态
    updateSelectAllState();
}

// 编辑生成结果
function editResult(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        showNotification('未找到结果数据', 'error');
        return;
    }
    
    const data = resultItem.resultData;
    
    // 自动展开手动上传区域
    expandManualUploadSection();
    
    // 填入编辑区域
    document.getElementById('title').value = data.title;
    document.getElementById('tags').value = data.tags;
    document.getElementById('content').value = data.content;
    
    // 标记内容来源
    window.lastGeneratedSource = data.isAIGenerated ? 'ai' : 'manual';
    window.lastUsedAIModel = data.isAIGenerated ? 'doubao-1-5-pro-32k-250115' : null;
    window.lastUsedStyle = data.style;
    
    // 滚动到编辑区域
    setTimeout(() => {
        document.querySelector('.manual-upload-section').scrollIntoView({ behavior: 'smooth' });
    }, 300);
    
    showNotification('内容已加载到编辑区域', 'success');
}

// 复制结果到剪贴板
function copyResultToClipboard(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        showNotification('未找到结果数据', 'error');
        return;
    }
    
    const data = resultItem.resultData;
    const textToCopy = `${data.title}\n\n${data.content}\n\n${data.tags}`;
    
        navigator.clipboard.writeText(textToCopy).then(() => {
        showNotification('内容已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showNotification('复制失败，请手动复制', 'error');
    });
}

// 为文案创建配图
function createImageForText(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        showNotification('未找到文案数据', 'error');
        return;
    }
    
    const textData = resultItem.resultData;
    
    // 将文案数据存储到全局变量中，供文生图页面使用
    window.currentTextForImage = {
        resultId: resultId,
        title: textData.title,
        content: textData.content,
        tags: textData.tags
    };
    
    // 跳转到文生图页面
    switchToTextToImage();
    
    // 保持文本框为空，让用户自主输入配图文字
    setTimeout(() => {
        const textInput = document.getElementById('t2i-text');
        const saveToTextBtn = document.getElementById('save-to-text-btn');
        
        // 清空文本输入框，让用户自由创作
        if (textInput) {
            textInput.value = '';
            // 重新渲染空白模板
            renderTextImageFromForm();
        }
        
        // 显示"保存为此文案配图"按钮
        if (saveToTextBtn) {
            saveToTextBtn.style.display = 'inline-block';
            saveToTextBtn.textContent = `📎 保存为"${textData.title}"配图`;
        }
        
        showNotification(`已为"${textData.title}"准备配图，请自由创作图片内容`, 'success');
    }, 500);
}

// 切换到文生图页面
function switchToTextToImage() {
    // 更新导航栏状态
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // 找到文生图导航项并激活
    navItems.forEach(nav => {
        const navText = nav.querySelector('span')?.textContent;
        if (navText === '文生图') {
            nav.classList.add('active');
        }
    });
    
    // 切换内容区域
    switchContent('文生图');
}

// 保存图片到对应文案
function saveImageToText() {
    if (!window.currentTextForImage) {
        showNotification('没有找到对应的文案信息', 'error');
        return;
    }
    
    const canvas = document.getElementById('t2i-canvas');
    const textInput = document.getElementById('t2i-text');
    
    if (!canvas || !textInput) {
        showNotification('未找到画布或文本输入框', 'error');
        return;
    }
    
    const text = textInput.value.trim();
    if (!text) {
        showNotification('请先生成图片再保存', 'warning');
        return;
    }
    
    try {
        // 获取画布数据
        const imageData = canvas.toDataURL('image/png');
        
        // 创建图片对象
        const imageObject = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            url: imageData,
            name: `${window.currentTextForImage.title}_配图_${Date.now()}.png`,
            type: 'generated'
        };
        
        // 获取对应的文案元素
        const resultItem = document.getElementById(window.currentTextForImage.resultId);
        if (!resultItem || !resultItem.resultData) {
            showNotification('未找到对应的文案', 'error');
            return;
        }
        
        // 更新文案数据，添加图片
        if (!resultItem.resultData.customImages) {
            resultItem.resultData.customImages = [];
        }
        resultItem.resultData.customImages.push(imageObject);
        
        // 更新文案显示，添加图片预览
        updateResultItemDisplay(window.currentTextForImage.resultId);
        
        // 清除当前文案信息
        window.currentTextForImage = null;
        
        // 隐藏"保存为此文案配图"按钮
        const saveToTextBtn = document.getElementById('save-to-text-btn');
        if (saveToTextBtn) {
            saveToTextBtn.style.display = 'none';
        }
        
        showNotification('图片已保存为此文案配图', 'success');
        
        // 跳转回AI创作页面
        setTimeout(() => {
            switchToAICreation();
        }, 1500);
        
    } catch (error) {
        console.error('保存图片失败:', error);
        showNotification('保存失败，请稍后重试', 'error');
    }
}

// 切换到AI创作页面
function switchToAICreation() {
    // 更新导航栏状态
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // 找到内容创作导航项并激活
    navItems.forEach(nav => {
        const navText = nav.querySelector('span')?.textContent;
        if (navText === '内容创作') {
            nav.classList.add('active');
        }
    });
    
    // 切换内容区域
    switchContent('内容创作');
}

// 更新文案项显示
function updateResultItemDisplay(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        return;
    }
    
    const data = resultItem.resultData;
    
    // 构建图片预览HTML - 支持原有图片和自定义图片
    let imagePreviewHtml = '';
    const allImages = [];
    
    // 添加原有的AI创作区域图片
    if (data.images && data.images.length > 0) {
        allImages.push(...data.images);
    }
    
    // 添加自定义图片（从文生图页面添加的）
    if (data.customImages && data.customImages.length > 0) {
        allImages.push(...data.customImages);
    }
    
    if (allImages.length > 0) {
        imagePreviewHtml = `
            <div class="result-images">
                ${allImages.map((img, imgIndex) => `
                    <div class="result-image-item">
                        <img src="${img.url}" alt="${img.name}" onclick="previewResultImage('${resultId}', ${imgIndex})">
                        ${img.type === 'generated' ? '<span class="image-badge">文生图</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 找到现有的内容区域并更新
    const contentDiv = resultItem.querySelector('.result-content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <h4>${data.title}</h4>
            ${imagePreviewHtml}
            <div class="content-text">${data.content}</div>
            <div class="content-tags">${data.tags}</div>
        `;
    }
    
    // 更新结果数据
    resultItem.resultData.customImages = data.customImages || [];
}

// 全局变量用于存储当前编辑的内容ID
let currentEditingContentId = null;
let editingImages = []; // 编辑模态框中的图片

// 预览内容
function previewContent(id) {
    const content = contentLibrary.getContentById(id);
    if (!content) {
        showNotification('内容不存在', 'error');
        return;
    }
    
    // 获取预览模态框元素
    const modal = document.getElementById('content-preview-modal');
    const modalBody = document.getElementById('preview-modal-body');
    const modalTitle = document.getElementById('preview-modal-title');
    
    if (!modal || !modalBody || !modalTitle) {
        console.error('预览模态框元素未找到');
        showNotification('预览功能初始化失败', 'error');
        return;
    }
    
    // 设置标题
    modalTitle.innerHTML = `
        <span>🔍</span>
        <span>${content.title || '内容预览'}</span>
    `;
    
    // 构建预览内容
    let previewContentHtml = '';
    
    // 添加元信息
    previewContentHtml += `
        <div class="preview-meta" style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; color: #64748b;">
                <span><strong>来源:</strong> ${content.source === 'ai' ? '🤖 AI生成' : '✏️ 手动创建'}</span>
                <span><strong>日期:</strong> ${formatDate(content.createdAt)}</span>
                <span><strong>字数:</strong> ${content.content.length} 字</span>
                ${content.tags ? `<span><strong>标签:</strong> ${content.tags}</span>` : ''}
            </div>
        </div>
    `;
    
    // 添加图片
    if (content.images && content.images.length > 0) {
        console.log('预览模态框显示图片:', content.images.length, '张');
        previewContentHtml += `
            <div class="preview-images" style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 12px 0; color: #64748b; font-size: 14px;">📷 图片 (${content.images.length}张)</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 200px)); gap: 12px; justify-content: center; margin: 0 -20px; padding: 0 20px;">
                    ${content.images.map((img, index) => `
                        <div class="preview-image-item" title="${img.name}" style="border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                            <img src="${img.url}" alt="${img.name}" onclick="showFullImage('${img.url}', '${img.name}')" 
                                 style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.2s;" 
                                 onmouseover="this.style.transform='scale(1.05)'" 
                                 onmouseout="this.style.transform='scale(1)'"
                                 onerror="console.error('图片加载失败:', '${img.name}'); this.parentElement.style.display='none'">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 添加文本内容
    previewContentHtml += `
        <div class="preview-text" style="line-height: 1.6; color: #334155; white-space: pre-wrap; word-wrap: break-word;">
            ${content.content}
        </div>
    `;
    
    // 设置预览内容
    modalBody.innerHTML = previewContentHtml;
    
    // 显示预览模态框
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// 关闭预览模态框
function closePreviewModal(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }
    
    const modal = document.getElementById('content-preview-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// 从预览模态框直接编辑
function editFromPreview() {
    const contentId = document.getElementById('edit-from-preview-btn').getAttribute('data-content-id');
    closePreviewModal();
    setTimeout(() => editContentInModal(contentId), 200);
}

// 在模态框中编辑内容
function editContentInModal(id) {
    const content = contentLibrary.getContentById(id);
    if (!content) {
        showNotification('内容不存在', 'error');
        return;
    }
    
    // 存储当前编辑的内容ID
    currentEditingContentId = id;
    
    // 填充编辑表单
    document.getElementById('edit-title').value = content.title;
    document.getElementById('edit-tags').value = content.tags;
    document.getElementById('edit-content').value = content.content;
    
    // 加载现有图片
    editingImages = content.images ? [...content.images] : [];
    updateEditImagePreview();
    
    // 显示编辑模态框
    const modal = document.getElementById('content-edit-modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // 聚焦到标题输入框
    setTimeout(() => {
        document.getElementById('edit-title').focus();
    }, 300);
    
    // 添加字数统计
    updateWordCount();
}

// 关闭编辑模态框
function closeEditModal(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }
    
    const modal = document.getElementById('content-edit-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    currentEditingContentId = null;
    editingImages = []; // 清空编辑图片
}

// 保存编辑的内容
function saveEditedContent() {
    if (!currentEditingContentId) {
        showNotification('没有正在编辑的内容', 'error');
        return;
    }
    
    const title = document.getElementById('edit-title').value.trim();
    const tags = document.getElementById('edit-tags').value.trim();
    const content = document.getElementById('edit-content').value.trim();
    
    if (!title || !content) {
        showNotification('标题和内容不能为空', 'error');
        return;
    }
    
    try {
        const success = contentLibrary.updateContent(currentEditingContentId, {
            title: title,
            tags: tags,
            content: content,
            images: [...editingImages], // 包含更新后的图片
            wordCount: content.length // 更新字数统计
        });
        
        if (success) {
            showNotification('内容已成功更新！', 'success');
            
            // 关闭模态框
            closeEditModal();
            
            // 更新内容库显示
            updateContentLibraryDisplay();
            updateLibraryStats();
        } else {
            showNotification('更新失败，请重试', 'error');
        }
    } catch (error) {
        console.error('Update error:', error);
        showNotification('更新失败，请重试', 'error');
    }
}

// 键盘快捷键支持
document.addEventListener('keydown', function(event) {
    // ESC键关闭模态框
    if (event.key === 'Escape') {
        const previewModal = document.getElementById('content-preview-modal');
        const editModal = document.getElementById('content-edit-modal');
        
        if (previewModal.classList.contains('show')) {
            closePreviewModal();
        } else if (editModal.classList.contains('show')) {
            closeEditModal();
        }
    }
    
    // Ctrl+S 保存编辑内容
    if (event.ctrlKey && event.key === 's') {
        const editModal = document.getElementById('content-edit-modal');
        if (editModal.classList.contains('show')) {
            event.preventDefault();
            saveEditedContent();
        }
    }
});

// 字数统计功能
function updateWordCount() {
    const contentTextarea = document.getElementById('edit-content');
    if (contentTextarea) {
        const wordCountDisplay = document.getElementById('word-count-display');
        if (!wordCountDisplay) {
            // 创建字数统计显示元素
            const display = document.createElement('div');
            display.id = 'word-count-display';
            display.className = 'word-count-display';
            display.style.cssText = 'position: absolute; bottom: 10px; right: 15px; font-size: 12px; color: #64748b; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 4px;';
            
            const formGroup = contentTextarea.parentElement;
            formGroup.style.position = 'relative';
            formGroup.appendChild(display);
        }
        
        const count = contentTextarea.value.length;
        document.getElementById('word-count-display').textContent = `${count} 字`;
        
        // 添加实时更新事件监听器
        contentTextarea.removeEventListener('input', updateWordCount);
        contentTextarea.addEventListener('input', updateWordCount);
    }
}

// 增强的复制功能，包含格式化
function copyContentFormatted(id) {
    const content = contentLibrary.getContentById(id);
    if (!content) {
        showNotification('内容不存在', 'error');
        return;
    }
    
    const formattedText = `📝 ${content.title}

${content.content}

🏷️ 标签：${content.tags}
📅 创建时间：${formatDate(content.createdAt)}
🤖 来源：${content.source === 'ai' ? 'AI生成' : '手动创建'}`;
    
    navigator.clipboard.writeText(formattedText).then(() => {
        showNotification('格式化内容已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showNotification('复制失败，请手动复制', 'error');
    });
}

// 直接保存结果到内容库
function saveResultToLibrary(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        showNotification('未找到结果数据', 'error');
        return;
    }
    
    const data = resultItem.resultData;
    
    try {
        // 准备图片数据 - 合并原有图片和自定义图片
        const allImages = [];
        
        // 添加原有的AI创作区域图片
        if (data.images && data.images.length > 0) {
            allImages.push(...data.images);
        }
        
        // 添加自定义图片（从文生图页面添加的）
        if (data.customImages && data.customImages.length > 0) {
            allImages.push(...data.customImages);
        }
        
        // 准备保存数据
        const saveData = {
            title: data.title,
            tags: data.tags,
            content: data.content,
            images: allImages, // 包含所有图片
            source: data.isAIGenerated ? 'ai' : 'manual',
            aiModel: data.isAIGenerated ? 'doubao-1-5-pro-32k-250115' : null,
            style: data.style
        };
        
        // 保存到内容库
        const savedContent = contentLibrary.addContent(saveData);
        if (savedContent) {
            showNotification(`内容已保存到内容库！(ID: ${savedContent.id.slice(-4)})`, 'success');
            
            // 更新内容库统计
            updateLibraryStats();
            
            // 如果当前显示的是内容库页面，刷新显示
            const librarySection = document.getElementById('content-library');
            if (librarySection && librarySection.classList.contains('active')) {
                updateContentLibraryDisplay();
            }
        } else {
            throw new Error('保存失败');
        }
        
    } catch (error) {
        showNotification('保存失败，请重试', 'error');
        console.error('Save error:', error);
    }
}

// 显示创作结果（保留兼容性）
function showCreationResult(result, isAIGenerated = true) {
    showSingleResult(result, 1, isAIGenerated);
}

// 获取当前选择的创作风格
function getCurrentSelectedStyle() {
    const styleSelect = document.getElementById('style');
    return styleSelect ? styleSelect.value : null;
}

// AI创作区域文件上传处理
function handleAIFileUpload(input) {
    const files = Array.from(input.files);
    const maxFiles = 9;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (aiUploadedImages.length + files.length > maxFiles) {
        showNotification(`最多只能上传${maxFiles}张图片`, 'error');
        return;
    }
    
    const validFiles = files.filter(file => {
        if (file.size > maxSize) {
            showNotification(`文件 ${file.name} 超过10MB大小限制`, 'error');
            return false;
        }
        
        if (!file.type.startsWith('image/')) {
            showNotification(`文件 ${file.name} 不是有效的图片格式`, 'error');
            return false;
        }
        
        return true;
    });
    
    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = {
                file: file,
                url: e.target.result,
                name: file.name
            };
            
            aiUploadedImages.push(imageData);
            updateAIImagePreview();
        };
        reader.readAsDataURL(file);
    });
    
    // 清空文件输入
    input.value = '';
    showNotification(`已上传${validFiles.length}张图片`, 'success');
}

// 手动上传区域文件上传处理
function handleFileUpload(input) {
    const files = Array.from(input.files);
    const maxFiles = 9;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (uploadedImages.length + files.length > maxFiles) {
        showNotification(`最多只能上传${maxFiles}张图片`, 'error');
        return;
    }
    
    const validFiles = files.filter(file => {
        if (file.size > maxSize) {
            showNotification(`文件 ${file.name} 超过10MB大小限制`, 'error');
            return false;
        }
        
        if (!file.type.startsWith('image/')) {
            showNotification(`文件 ${file.name} 不是有效的图片格式`, 'error');
            return false;
        }
        
        return true;
    });
    
    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = {
                file: file,
                url: e.target.result,
                name: file.name
            };
            
            uploadedImages.push(imageData);
            updateImagePreview();
        };
        reader.readAsDataURL(file);
    });
    
    // 清空文件输入
    input.value = '';
}

// 更新AI创作区域图片预览
function updateAIImagePreview() {
    const previewContainer = document.getElementById('ai-image-preview');
    previewContainer.innerHTML = '';
    
    aiUploadedImages.forEach((image, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        previewItem.innerHTML = `
            <img src="${image.url}" alt="${image.name}">
            <button class="remove-btn" onclick="removeAIImage(${index})">×</button>
        `;
        
        previewContainer.appendChild(previewItem);
    });
}

// 更新手动上传区域图片预览
function updateImagePreview() {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    uploadedImages.forEach((image, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        previewItem.innerHTML = `
            <img src="${image.url}" alt="${image.name}">
            <button class="remove-btn" onclick="removeImage(${index})">×</button>
        `;
        
        previewContainer.appendChild(previewItem);
    });
}

// 移除AI创作区域图片
function removeAIImage(index) {
    aiUploadedImages.splice(index, 1);
    updateAIImagePreview();
    showNotification('图片已移除', 'info');
}

// 移除手动上传区域图片
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
    showNotification('图片已移除', 'info');
}

// 处理编辑模态框文件上传
function handleEditFileUpload(input) {
    const files = Array.from(input.files);
    const maxFiles = 9;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (editingImages.length + files.length > maxFiles) {
        showNotification(`最多只能上传${maxFiles}张图片`, 'error');
        return;
    }
    
    const validFiles = files.filter(file => {
        if (file.size > maxSize) {
            showNotification(`文件 ${file.name} 超过10MB大小限制`, 'error');
            return false;
        }
        
        if (!file.type.startsWith('image/')) {
            showNotification(`文件 ${file.name} 不是有效的图片格式`, 'error');
            return false;
        }
        
        return true;
    });
    
    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = {
                file: file,
                url: e.target.result,
                name: file.name
            };
            
            editingImages.push(imageData);
            updateEditImagePreview();
        };
        reader.readAsDataURL(file);
    });
    
    // 清空文件输入
    input.value = '';
    
    if (validFiles.length > 0) {
        showNotification(`已上传${validFiles.length}张图片`, 'success');
    }
}

// 更新编辑模态框图片预览
function updateEditImagePreview() {
    const previewContainer = document.getElementById('edit-image-preview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    editingImages.forEach((image, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'edit-preview-item';
        
        previewItem.innerHTML = `
            <img src="${image.url}" alt="${image.name}" onclick="showFullImage('${image.url}', '${image.name}')">
            <button class="remove-btn" onclick="removeEditImage(${index})" title="删除图片">×</button>
        `;
        
        previewContainer.appendChild(previewItem);
    });
}

// 移除编辑模态框中的图片
function removeEditImage(index) {
    editingImages.splice(index, 1);
    updateEditImagePreview();
    showNotification('图片已移除', 'info');
}

// 内容库管理类
class ContentLibrary {
    constructor() {
        this.storageKey = 'creator-assistant-content-library';
        this.contents = this.loadContents();
    }

    // 从本地存储加载内容
    loadContents() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading content library:', error);
            return [];
        }
    }

    // 保存内容到本地存储
    saveContents() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.contents));
            return true;
        } catch (error) {
            console.error('Error saving content library:', error);
            return false;
        }
    }

    // 添加新内容（增强去重功能）
    addContent(contentData) {
        // 生成内容指纹用于去重检查
        const contentFingerprint = this.generateContentFingerprint(contentData);
        
        // 检查是否已存在相同内容
        const existingContent = this.findDuplicateContent(contentData, contentFingerprint);
        if (existingContent) {
            console.log('🔄 检测到重复内容，跳过添加:', {
                title: contentData.title?.substring(0, 30) + '...',
                existingId: existingContent.id,
                reason: '内容指纹匹配'
            });
            return existingContent; // 返回已存在的内容
        }

        const newContent = {
            id: this.generateUniqueId(contentData),
            title: contentData.title,
            tags: contentData.tags,
            content: contentData.content,
            images: Array.isArray(contentData.images) ? [...contentData.images] : [],
            source: contentData.source || 'manual', // 'ai' 或 'manual'
            aiModel: contentData.aiModel || null,
            style: contentData.style || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            wordCount: contentData.content.length,
            status: 'draft', // draft, published, archived
            fingerprint: contentFingerprint, // 添加内容指纹
            url: contentData.url || null, // 添加URL用于去重
            author: contentData.author || null // 添加作者用于去重
        };

        console.log('✅ 添加新内容到库:', newContent.title?.substring(0, 30) + '...', '包含图片:', newContent.images.length);
        this.contents.unshift(newContent);
        const saved = this.saveContents();
        console.log('保存结果:', saved);
        return saved ? newContent : null;
    }

    // 生成唯一ID（基于内容特征）
    generateUniqueId(contentData) {
        const baseId = Date.now().toString();
        const titleHash = this.simpleHash(contentData.title || '');
        const contentHash = this.simpleHash(contentData.content || '');
        return `${baseId}_${titleHash}_${contentHash}`;
    }

    // 生成内容指纹
    generateContentFingerprint(contentData) {
        const title = (contentData.title || '').trim().toLowerCase();
        const content = (contentData.content || '').trim().toLowerCase();
        const author = (contentData.author || '').trim().toLowerCase();
        const url = (contentData.url || '').trim();
        
        // 去除标点符号和空格，只保留核心内容
        const normalizedTitle = title.replace(/[^\w\u4e00-\u9fa5]/g, '');
        const normalizedContent = content.substring(0, 200).replace(/[^\w\u4e00-\u9fa5]/g, '');
        
        return this.simpleHash(normalizedTitle + normalizedContent + author + url);
    }

    // 简单哈希函数
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }

    // 查找重复内容
    findDuplicateContent(newContentData, fingerprint) {
        // 先检查指纹匹配
        const fingerprintMatch = this.contents.find(content => 
            content.fingerprint === fingerprint
        );
        if (fingerprintMatch) {
            return fingerprintMatch;
        }

        // 检查URL匹配（如果有URL）
        if (newContentData.url) {
            const urlMatch = this.contents.find(content => 
                content.url === newContentData.url
            );
            if (urlMatch) {
                return urlMatch;
            }
        }

        // 检查标题相似度（80%以上认为重复）
        const titleSimilarityMatch = this.contents.find(content => {
            if (!content.title || !newContentData.title) return false;
            const similarity = this.calculateSimilarity(
                content.title.toLowerCase(), 
                newContentData.title.toLowerCase()
            );
            return similarity >= 0.8;
        });
        if (titleSimilarityMatch) {
            return titleSimilarityMatch;
        }

        // 检查内容相似度（前200字符，85%以上认为重复）
        const contentSimilarityMatch = this.contents.find(content => {
            if (!content.content || !newContentData.content) return false;
            const content1 = content.content.substring(0, 200).toLowerCase();
            const content2 = newContentData.content.substring(0, 200).toLowerCase();
            const similarity = this.calculateSimilarity(content1, content2);
            return similarity >= 0.85;
        });
        if (contentSimilarityMatch) {
            return contentSimilarityMatch;
        }

        return null;
    }

    // 计算文本相似度（简单版本）
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (!str1 || !str2) return 0;
        
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;
        
        let matches = 0;
        const minLength = Math.min(str1.length, str2.length);
        
        for (let i = 0; i < minLength; i++) {
            if (str1[i] === str2[i]) {
                matches++;
            }
        }
        
        return matches / maxLength;
    }

    // 获取所有内容
    getAllContents() {
        return [...this.contents];
    }

    // 根据ID获取内容
    getContentById(id) {
        return this.contents.find(content => content.id === id);
    }

    // 更新内容
    updateContent(id, updates) {
        const index = this.contents.findIndex(content => content.id === id);
        if (index !== -1) {
            this.contents[index] = {
                ...this.contents[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            return this.saveContents();
        }
        return false;
    }

    // 删除内容
    deleteContent(id) {
        const index = this.contents.findIndex(content => content.id === id);
        if (index !== -1) {
            this.contents.splice(index, 1);
            return this.saveContents();
        }
        return false;
    }

    // 搜索内容
    searchContents(query) {
        const lowerQuery = query.toLowerCase();
        return this.contents.filter(content => 
            content.title.toLowerCase().includes(lowerQuery) ||
            content.tags.toLowerCase().includes(lowerQuery) ||
            content.content.toLowerCase().includes(lowerQuery)
        );
    }

    // 按标签筛选
    filterByTag(tag) {
        return this.contents.filter(content => 
            content.tags.toLowerCase().includes(tag.toLowerCase())
        );
    }

    // 获取统计信息
    getStats() {
        const total = this.contents.length;
        const aiGenerated = this.contents.filter(c => c.source === 'ai').length;
        const manual = this.contents.filter(c => c.source === 'manual').length;
        const totalWords = this.contents.reduce((sum, c) => sum + c.wordCount, 0);

        return {
            total,
            aiGenerated,
            manual,
            totalWords,
            averageWords: total > 0 ? Math.round(totalWords / total) : 0
        };
    }
}

// 初始化内容库
const contentLibrary = new ContentLibrary();

// 保存内容到内容库
async function saveContent() {
    const title = document.getElementById('title').value.trim();
    const tags = document.getElementById('tags').value.trim();
    const content = document.getElementById('content').value.trim();
    
    // 验证必填字段
    if (!title) {
        showNotification('请输入标题', 'error');
        document.getElementById('title').focus();
        return;
    }
    
    if (!content) {
        showNotification('请输入正文内容', 'error');
        document.getElementById('content').focus();
        return;
    }
    
    try {
        showNotification('正在保存到内容库...', 'info');
        
        // 准备保存数据
        const saveData = {
            title: title,
            tags: tags,
            content: content,
            images: uploadedImages.map(img => ({
                url: img.url,
                name: img.name,
                file: null // 不保存文件对象，只保存url和名称
            })), // 确保图片数据正确保存
            source: window.lastGeneratedSource || 'manual', // 记录内容来源
            aiModel: window.lastUsedAIModel || null,
            style: window.lastUsedStyle || null
        };
        
        console.log('准备保存的数据:', saveData);
        console.log('图片数量:', saveData.images.length);
        
        let savedContent;
        
        // 检查是否为编辑模式
        if (window.currentEditingId) {
            // 更新现有内容
            const success = contentLibrary.updateContent(window.currentEditingId, saveData);
            if (success) {
                savedContent = contentLibrary.getContentById(window.currentEditingId);
                showNotification(`内容已成功更新！(ID: ${window.currentEditingId.slice(-4)})`, 'success');
                window.currentEditingId = null; // 清除编辑状态
            } else {
                throw new Error('Failed to update content');
            }
        } else {
            // 添加新内容
            savedContent = contentLibrary.addContent(saveData);
            if (savedContent) {
                showNotification(`内容已成功保存到内容库！(ID: ${savedContent.id.slice(-4)})`, 'success');
            } else {
                throw new Error('Failed to save content');
            }
        }
        
        // 更新内容库统计
        updateLibraryStats();
        
        // 如果当前显示的是内容库页面，刷新显示
        const librarySection = document.getElementById('content-library');
        if (librarySection && librarySection.classList.contains('active')) {
            updateContentLibraryDisplay();
        }
        
        // 清除临时标记
        window.lastGeneratedSource = null;
        window.lastUsedAIModel = null;
        window.lastUsedStyle = null;
        
        console.log('Content saved/updated in library:', savedContent);
        
    } catch (error) {
        showNotification('保存失败，请重试', 'error');
        console.error('Save error:', error);
    }
}

// 更新内容库统计信息
function updateLibraryStats() {
    const stats = contentLibrary.getStats();
    console.log('内容库统计:', stats);
    
    // 统计包含图片的内容数量
    const contentsWithImages = contentLibrary.getAllContents().filter(c => c.images && c.images.length > 0);
    const totalImages = contentLibrary.getAllContents().reduce((sum, c) => sum + (c.images ? c.images.length : 0), 0);
    
    console.log(`包含图片的内容: ${contentsWithImages.length}条，总图片数: ${totalImages}张`);
    
    // 如果有统计显示区域，可以在这里更新UI
    // 暂时只在控制台显示
}

// 更新内容库显示
function updateContentLibraryDisplay() {
    const contents = contentLibrary.getAllContents();
    const stats = contentLibrary.getStats();
    console.log('内容库内容详情:', contents);
    
    // 详细检查每个内容的图片数据
    contents.forEach((content, index) => {
        console.log(`内容 ${index + 1}: ${content.title}`);
        console.log(`  - 图片数量: ${content.images ? content.images.length : 0}`);
        if (content.images && content.images.length > 0) {
            content.images.forEach((img, imgIndex) => {
                console.log(`    图片 ${imgIndex + 1}: ${img.name} (${img.url ? 'URL存在' : 'URL缺失'})`);
            });
        }
    });
    
    // 更新标题中的数量
    const headerTitle = document.querySelector('#content-library .library-header h3');
    if (headerTitle) {
        headerTitle.textContent = `内容库 (${contents.length})`;
    }
    
    // 更新统计信息
    const contentsWithImages = contents.filter(c => c.images && c.images.length > 0);
    const totalImages = contents.reduce((sum, c) => sum + (c.images ? c.images.length : 0), 0);
    
    const statsContainer = document.querySelector('#content-library .library-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <span>AI生成: ${stats.aiGenerated}</span>
            <span>手动创建: ${stats.manual}</span>
            <span>总字数: ${stats.totalWords}</span>
            <span>📷 图片: ${totalImages}张</span>
            <span>包含图片: ${contentsWithImages.length}条</span>
        `;
    }
    
    // 更新内容区域
    const contentContainer = document.querySelector('#content-library .library-content');
    if (contentContainer) {
        contentContainer.innerHTML = renderContentItems(contents);
    }
    
    // 显示通知
    showNotification(`内容库加载完成，共${contents.length}条内容`, 'info');
}

// 渲染内容项目
function renderContentItems(contents) {
    if (contents.length === 0) {
        return '<div class="empty-library">📝 内容库为空，创建第一篇内容吧！</div>';
    }
    
    return contents.map(content => {
        // 构建图片缩略图HTML
        let imageThumbsHtml = '';
        console.log('渲染内容:', content.title, '图片数量:', content.images ? content.images.length : 0);
        
        if (content.images && content.images.length > 0) {
            imageThumbsHtml = `
                <div class="content-image-thumbs">
                    <span class="image-count-label">📷 ${content.images.length}张图片:</span>
                    ${content.images.slice(0, 4).map((img, index) => `
                        <div class="image-thumb" title="${img.name}">
                            <img src="${img.url}" alt="${img.name}" onclick="previewContentImage('${content.id}', ${index})" onerror="this.parentElement.style.display='none'">
                        </div>
                    `).join('')}
                    ${content.images.length > 4 ? `<div class="image-count">+${content.images.length - 4}</div>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="content-item" data-id="${content.id}">
                <div class="content-header">
                    <h4 onclick="previewContent('${content.id}')" style="cursor: pointer; color: #3b82f6;" title="点击预览完整内容">${content.title}</h4>
                    <div class="content-meta">
                        <span class="source ${content.source}">${content.source === 'ai' ? '🤖 AI' : '✏️ 手动'}</span>
                        <span class="date">${formatDate(content.createdAt)}</span>
                    </div>
                </div>
                ${imageThumbsHtml}
                <div class="content-preview" onclick="previewContent('${content.id}')" style="cursor: pointer;" title="点击预览完整内容">${content.content.substring(0, 100)}...</div>
                <div class="content-tags">${content.tags}</div>
                <div class="content-actions">
                    <button onclick="previewContent('${content.id}')" class="btn-small btn-primary">预览</button>
                    <button onclick="editContentInModal('${content.id}')" class="btn-small">编辑</button>
                    <button onclick="duplicateContent('${content.id}')" class="btn-small">复制</button>
                    <button onclick="deleteContentItem('${content.id}')" class="btn-small btn-danger">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 搜索内容库
function searchLibrary(query) {
    if (!query.trim()) {
        const allContents = contentLibrary.getAllContents();
        document.getElementById('library-content').innerHTML = renderContentItems(allContents);
        return;
    }
    
    const searchResults = contentLibrary.searchContents(query);
    document.getElementById('library-content').innerHTML = renderContentItems(searchResults);
    showNotification(`找到${searchResults.length}条匹配内容`, 'info');
}

// 编辑内容
function editContent(id) {
    const content = contentLibrary.getContentById(id);
    if (!content) {
        showNotification('内容不存在', 'error');
        return;
    }
    
    // 自动展开手动上传区域
    expandManualUploadSection();
    
    // 填入编辑区域
    document.getElementById('title').value = content.title;
    document.getElementById('tags').value = content.tags;
    document.getElementById('content').value = content.content;
    
    // 标记当前编辑的内容ID
    window.currentEditingId = id;
    
    // 切换到编辑界面
    document.getElementById('ai-creation').classList.remove('active');
    document.getElementById('manual-upload').classList.add('active');
    
    // 延迟滚动到编辑区域
    setTimeout(() => {
        document.querySelector('.manual-upload-section').scrollIntoView({ behavior: 'smooth' });
    }, 300);
    
    showNotification('内容已加载到编辑器', 'success');
}

// 复制内容
function duplicateContent(id) {
    const content = contentLibrary.getContentById(id);
    if (!content) {
        showNotification('内容不存在', 'error');
        return;
    }
    
    // 创建副本
    const duplicateData = {
        title: `${content.title} (副本)`,
        tags: content.tags,
        content: content.content,
        images: [...content.images],
        source: 'manual' // 副本标记为手动创建
    };
    
    const newContent = contentLibrary.addContent(duplicateData);
    if (newContent) {
        showNotification('内容已复制', 'success');
        updateLibraryStats();
        
        // 刷新内容库显示
        updateContentLibraryDisplay();
    } else {
        showNotification('复制失败', 'error');
    }
}

// 删除内容
function deleteContentItem(id) {
    if (confirm('确定要删除这条内容吗？')) {
        if (contentLibrary.deleteContent(id)) {
            showNotification('内容已删除', 'success');
            updateLibraryStats();
            // 刷新内容库显示
            updateContentLibraryDisplay();
        } else {
            showNotification('删除失败', 'error');
        }
    }
}

// 清空内容库
function clearLibrary() {
    if (confirm('确定要清空整个内容库吗？此操作不可恢复！')) {
        contentLibrary.contents = [];
        contentLibrary.saveContents();
        showNotification('内容库已清空', 'success');
        updateLibraryStats();
        // 刷新内容库显示
        updateContentLibraryDisplay();
    }
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 重置表单
function resetForm() {
    document.getElementById('title').value = '';
    document.getElementById('tags').value = '';
    document.getElementById('content').value = '';
    uploadedImages = [];
    updateImagePreview();
    
    // 清除编辑状态
    window.currentEditingId = null;
    window.lastGeneratedSource = null;
    window.lastUsedAIModel = null;
    window.lastUsedStyle = null;
    
    showNotification('表单已重置', 'info');
}

// 重置AI创作区域
function resetAIForm() {
    document.getElementById('topic').value = '';
    document.getElementById('style').value = '价值反问型';
    document.getElementById('batch').value = '1';
    aiUploadedImages = [];
    updateAIImagePreview();
    showNotification('AI创作区域已重置', 'info');
}

// 手动上传区域折叠切换
function toggleManualUploadSection() {
    const section = document.querySelector('.manual-upload-section');
    const content = document.querySelector('.collapsible-content');
    
    if (section.classList.contains('collapsed')) {
        // 展开
        section.classList.remove('collapsed');
        content.classList.remove('collapsed');
        localStorage.setItem('manualUploadCollapsed', 'false');
    } else {
        // 折叠
        section.classList.add('collapsed');
        content.classList.add('collapsed');
        localStorage.setItem('manualUploadCollapsed', 'true');
    }
}

// 展开手动上传区域
function expandManualUploadSection() {
    const section = document.querySelector('.manual-upload-section');
    const content = document.querySelector('.collapsible-content');
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        content.classList.remove('collapsed');
        localStorage.setItem('manualUploadCollapsed', 'false');
    }
}

// 折叠手动上传区域
function collapseManualUploadSection() {
    const section = document.querySelector('.manual-upload-section');
    const content = document.querySelector('.collapsible-content');
    
    if (!section.classList.contains('collapsed')) {
        section.classList.add('collapsed');
        content.classList.add('collapsed');
        localStorage.setItem('manualUploadCollapsed', 'true');
    }
}

// 初始化手动上传区域折叠状态
function initializeManualUploadCollapse() {
    const section = document.querySelector('.manual-upload-section');
    const content = document.querySelector('.collapsible-content');
    
    // 默认折叠状态，或从localStorage读取用户偏好
    const isCollapsed = localStorage.getItem('manualUploadCollapsed') !== 'false';
    
    if (isCollapsed) {
        section.classList.add('collapsed');
        content.classList.add('collapsed');
    } else {
        section.classList.remove('collapsed');
        content.classList.remove('collapsed');
    }
}

// 显示全屏图片
function showFullImage(imageUrl, imageName) {
    console.log('🖼️ 显示图片预览:', imageUrl, imageName);
    
    // 检查图片URL是否有效
    if (!imageUrl || imageUrl === 'undefined' || imageUrl === '') {
        console.error('❌ 图片URL无效:', imageUrl);
        showNotification('图片URL无效，无法预览', 'error');
        return;
    }
    
    // 移除现有的图片模态框
    const existingModal = document.querySelector('.image-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    
    modal.innerHTML = `
        <div class="image-modal-content">
            <img src="${imageUrl}" alt="${imageName || '图片'}" 
                 onload="console.log('✅ 图片加载成功:', '${imageUrl}')" 
                 onerror="console.error('❌ 图片加载失败:', '${imageUrl}'); this.parentElement.parentElement.remove(); showNotification('图片加载失败', 'error');">
            <div class="image-modal-close" onclick="this.parentElement.parentElement.remove()">×</div>
            <div class="image-modal-name">${imageName || '图片预览'}</div>
        </div>
    `;
    
    // 点击背景关闭模态框
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    // 阻止内容区域的点击事件冒泡
    const content = modal.querySelector('.image-modal-content');
    content.onclick = function(e) {
        e.stopPropagation();
    };
    
    document.body.appendChild(modal);
    console.log('✅ 图片模态框已创建并添加到DOM');
}

// 预览结果中的图片
function previewResultImage(resultId, imageIndex) {
    const resultItem = document.getElementById(resultId);
    if (resultItem && resultItem.resultData && resultItem.resultData.images) {
        const image = resultItem.resultData.images[imageIndex];
        if (image) {
            showFullImage(image.url, image.name);
        }
    }
}

// 预览内容库中的图片
function previewContentImage(contentId, imageIndex) {
    const content = contentLibrary.getContentById(contentId);
    if (content && content.images && content.images[imageIndex]) {
        const image = content.images[imageIndex];
        showFullImage(image.url, image.name);
    }
}

// 预览抓取内容中的图片
function previewScrapedImage(contentIndex, imageIndex) {
    console.log('🖼️ 尝试预览抓取图片:', contentIndex, imageIndex);
    
    // 检查多个可能的数据源
    let contentData = null;
    let content = null;
    
    // 优先使用实时抓取数据
    if (window.realtimeScrapedData && window.realtimeScrapedData[contentIndex]) {
        contentData = window.realtimeScrapedData;
        content = contentData[contentIndex];
        console.log('📊 使用实时抓取数据源');
    }
    // 备用：使用旧的抓取数据
    else if (window.scrapedContentData && window.scrapedContentData[contentIndex]) {
        contentData = window.scrapedContentData;
        content = contentData[contentIndex];
        console.log('📊 使用备用抓取数据源');
    }
    
    if (content && content.images && content.images[imageIndex]) {
        const image = content.images[imageIndex];
        
        // 尝试多种可能的URL字段和格式
        let imageUrl = null;
        let imageName = '';
        
        // 情况1: 图片对象格式 {url, alt, width, height}
        if (typeof image === 'object' && image !== null) {
            imageUrl = image.url || image.src || image.href || image.link;
            imageName = image.alt || image.name || image.title || '';
            
            // 如果还是没有URL，尝试DOM元素属性
            if (!imageUrl && image.getAttribute) {
                imageUrl = image.getAttribute('src') || image.getAttribute('data-src');
            }
            
            // 尝试dataset属性
            if (!imageUrl && image.dataset) {
                imageUrl = image.dataset.src || image.dataset.url;
            }
        }
        // 情况2: 直接是URL字符串
        else if (typeof image === 'string' && image.startsWith('http')) {
            imageUrl = image;
            imageName = `图片${imageIndex + 1}`;
        }
        
        console.log('🔍 图片数据分析:', {
            原始对象: image,
            图片类型: typeof image,
            提取的URL: imageUrl,
            提取的名称: imageName,
            可用字段: typeof image === 'object' && image !== null ? Object.keys(image) : '非对象类型'
        });
        
        if (imageUrl) {
            console.log('✅ 找到图片URL:', imageUrl);
            showFullImage(imageUrl, imageName || `图片${imageIndex + 1}`);
        } else {
            console.error('❌ 无法获取图片URL:', image);
            showNotification('图片URL无效，无法显示预览', 'error');
        }
    } else {
        console.error('❌ 未找到图片数据:', {
            contentIndex,
            imageIndex,
            hasRealtimeData: !!window.realtimeScrapedData,
            hasScrapedData: !!window.scrapedContentData,
            contentExists: !!content,
            imagesCount: content?.images?.length || 0
        });
        showNotification('图片数据不存在，请重新抓取内容', 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-weight: 500;">${message}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 自动移除通知
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// 更新状态栏
function updateStatusBar() {
    const statusText = document.getElementById('status-text');
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    statusText.textContent = `127.0.0.1:5000/# - ${timeString}`;
    
    // 每秒更新时间
    setTimeout(updateStatusBar, 1000);
}

// 工具函数：延迟
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 工具函数：格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl+N 新建内容
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        resetForm();
        showNotification('已准备新建内容', 'info');
    }
    
    // Ctrl+S 保存内容
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection && activeSection.id === 'manual-upload') {
            saveContent();
        }
    }
    
    // Esc 关闭通知
    if (e.key === 'Escape') {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
    }
});

// 拖拽上传功能
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.querySelector('.upload-area');
    
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#3b82f6';
            this.style.backgroundColor = '#f8fafc';
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.style.borderColor = '#d1d5db';
            this.style.backgroundColor = 'white';
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#d1d5db';
            this.style.backgroundColor = 'white';
            
            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length > 0) {
                // 模拟文件输入
                const fileInput = document.getElementById('file-input');
                handleFileUpload({ files: imageFiles });
            } else {
                showNotification('请拖拽图片文件', 'error');
            }
        });
    }
    
    // 编辑模态框拖拽上传功能
    const editUploadArea = document.querySelector('.edit-upload-area');
    
    if (editUploadArea) {
        editUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#3b82f6';
            this.style.backgroundColor = '#f8fafc';
        });
        
        editUploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.style.borderColor = '#d1d5db';
            this.style.backgroundColor = '#fafafa';
        });
        
        editUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#d1d5db';
            this.style.backgroundColor = '#fafafa';
            
            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length > 0) {
                // 模拟文件输入
                handleEditFileUpload({ files: imageFiles });
            } else {
                showNotification('请拖拽图片文件', 'error');
            }
        });
    }
});

// =================== 文案拆解功能 ===================

// 全局变量用于文案拆解
let textAnalysisInputs = [];
let isAnalyzing = false;
let isRecomposing = false;

// 处理文本文件上传
function handleTextFileUpload(input, index) {
    const file = input.files[0];
    if (!file) return;
    
    const fileStatus = document.getElementById(`file-status-${index}`);
    const textInput = document.getElementById(`text-input-${index}`);
    
    // 验证文件类型
    const allowedTypes = ['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|doc|docx)$/i)) {
        showNotification('请选择txt、doc或docx格式的文件', 'error');
        return;
    }
    
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = function(e) {
        let content = e.target.result;
        
        // 简单处理doc/docx文件（实际项目中应使用专门的库）
        if (file.name.match(/\.(doc|docx)$/i)) {
            // 这里只是简单提取，实际应用中需要使用mammoth.js等库
            content = content.replace(/[^\x20-\x7E\u4e00-\u9fa5]/g, '');
        }
        
        textInput.value = content;
        fileStatus.textContent = file.name;
        fileStatus.classList.add('loaded');
        
        showNotification(`文件 ${file.name} 上传成功`, 'success');
    };
    
    reader.onerror = function() {
        showNotification('文件读取失败，请重试', 'error');
    };
    
    reader.readAsText(file, 'utf-8');
}

// 添加更多文案输入框
function addMoreText() {
    const textInputSection = document.querySelector('.text-input-section');
    const existingItems = textInputSection.querySelectorAll('.text-input-item');
    const nextIndex = existingItems.length + 1;
    
    if (nextIndex > 10) {
        showNotification('最多只能添加10个文案输入框', 'error');
        return;
    }
    
    const newItem = document.createElement('div');
    newItem.className = 'text-input-item';
    newItem.setAttribute('data-index', nextIndex);
    newItem.innerHTML = `
        <div class="text-input-header">
            <h3>爆款文案 ${nextIndex}</h3>
            <button class="btn-small btn-danger text-delete-btn" onclick="removeTextInput(${nextIndex})" title="删除此文案输入框">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                删除
            </button>
        </div>
        <div class="text-input-content">
            <textarea id="text-input-${nextIndex}" placeholder="输入爆款文案内容" rows="6"></textarea>
        </div>
    `;
    
    // 在操作按钮前插入
    const actionsDiv = textInputSection.querySelector('.text-input-actions');
    textInputSection.insertBefore(newItem, actionsDiv);
    
    showNotification(`已添加第${nextIndex}个文案输入框`, 'success');
}

// 删除文案输入框
function removeTextInput(index) {
    // 确认删除操作
    if (!confirm('确定要删除这个文案输入框吗？输入的内容将会丢失。')) {
        return;
    }
    
    const textInputSection = document.querySelector('.text-input-section');
    const targetItem = textInputSection.querySelector(`[data-index="${index}"]`);
    
    if (targetItem) {
        // 移除元素
        targetItem.remove();
        showNotification('文案输入框已删除', 'success');
        
        // 重新编号剩余的输入框
        renumberTextInputs();
    } else {
        showNotification('删除失败，找不到指定的输入框', 'error');
    }
}

// 重新编号文案输入框
function renumberTextInputs() {
    const textInputSection = document.querySelector('.text-input-section');
    const items = textInputSection.querySelectorAll('.text-input-item[data-index]');
    
    items.forEach((item, index) => {
        const newIndex = index + 4; // 从第4个开始编号（前3个是默认的）
        const oldIndex = item.getAttribute('data-index');
        
        // 更新data-index属性
        item.setAttribute('data-index', newIndex);
        
        // 更新标题
        const title = item.querySelector('h3');
        if (title) {
            title.textContent = `爆款文案 ${newIndex}`;
        }
        
        // 更新textarea的id
        const textarea = item.querySelector('textarea');
        if (textarea) {
            textarea.id = `text-input-${newIndex}`;
        }
        
        // 更新删除按钮的onclick属性
        const deleteBtn = item.querySelector('.text-delete-btn');
        if (deleteBtn) {
            deleteBtn.setAttribute('onclick', `removeTextInput(${newIndex})`);
        }
    });
}

// 开始文案拆解
async function startTextAnalysis() {
    if (isAnalyzing) return;
    
    // 收集所有文案内容
    const textInputs = document.querySelectorAll('[id^="text-input-"]');
    const texts = [];
    
    textInputs.forEach((input, index) => {
        const content = input.value.trim();
        if (content) {
            texts.push({
                index: index + 1,
                content: content,
                length: content.length
            });
        }
    });
    
    if (texts.length === 0) {
        showNotification('请至少输入一个爆款文案内容', 'error');
        return;
    }
    
    if (texts.length < 2) {
        showNotification('建议至少输入2个爆款文案以获得更好的拆解效果', 'warning');
    }
    
    isAnalyzing = true;
    const button = document.querySelector('button[onclick="startTextAnalysis()"]');
    const originalText = button.innerHTML;
    
    // 显示加载状态
    button.innerHTML = '<div class="loading"></div> 拆解中...';
    button.disabled = true;
    
    try {
        showNotification(`正在分析${texts.length}个爆款文案...`, 'info');
        
        // 使用AI分析文案结构
        const analysisResult = await analyzeTextsWithAI(texts);
        
        // 显示拆解结果
        displayAnalysisResult(analysisResult);
        
        // 显示AI重组区域
        document.getElementById('ai-recompose-section').style.display = 'block';
        
        showNotification('爆款拆解完成！可以开始重组生成新内容', 'success');
        
        // 滚动到拆解结果
        document.getElementById('ai-recompose-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
    } catch (error) {
        showNotification('爆款拆解失败，请重试', 'error');
        console.error('Text analysis error:', error);
        
    } finally {
        isAnalyzing = false;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 使用AI分析文案
async function analyzeTextsWithAI(texts) {
    const prompt = createAnalysisPrompt(texts);
    
    try {
        const response = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的文案分析师，擅长分析爆款文案的结构、风格和写作技巧，能够提炼出可复用的写作模式和要素。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const analysis = data.choices[0].message.content;
        
        return parseAnalysisResult(analysis);
        
    } catch (error) {
        console.error('AI分析失败:', error);
        // 降级到本地分析
        return generateLocalAnalysis(texts);
    }
}

// 创建分析提示词
function createAnalysisPrompt(texts) {
    const textList = texts.map((item, index) => 
        `【文案${index + 1}】\n${item.content}\n`
    ).join('\n');
    
    return `请深度分析以下${texts.length}个爆款文案，从关键词和风格两个层面进行拆解：

${textList}

## 第一部分：关键词提取（从以下5个维度精准提炼）

1. **核心产品词**
   - 产品名称、功能描述词汇
   - 特点特色相关词汇
   - 品类属性关键词

2. **情感触发词**
   - 引起共鸣的情感词汇
   - 痛点相关表达词
   - 满足感、幸福感词汇

3. **场景应用词**
   - 使用场景描述词
   - 目标人群相关词
   - 时间地点环境词

4. **效果价值词**
   - 效果描述关键词
   - 价值体现词汇
   - 变化对比词汇

5. **表达技巧词**
   - 开头引导词汇
   - 转折递进词汇
   - 结尾行动词汇

## 第二部分：风格分析（从以下3个维度深度剖析）

6. **排版风格**
   - 段落结构特点（长段落/短段落、每段句数）
   - 换行节奏（密集换行/适度留白）
   - 重点突出方式（空行、符号、缩进等）
   - 视觉层次安排

7. **布局风格**
   - 开头方式（直入主题/场景铺垫/疑问引入）
   - 内容组织逻辑（时间线叙述/问题解决/对比展示）
   - 信息密度特征（信息密集型/情感渲染型）
   - 结尾处理方式（行动号召/感悟总结/开放讨论）

8. **语言风格**
   - 人称使用偏好（第一人称/第二人称比例）
   - 语调特征（亲密朋友/专业分享/权威指导）
   - 句式特点（长句短句比例、疑问句使用频率）
   - 修辞手法运用（比喻、对比、排比等）
   - 情感浓度（克制理性/情感丰富/激情四射）

请按照以下格式输出完整分析：

【核心产品词】
[列出产品相关的核心关键词，用逗号分隔]

【情感触发词】
[列出情感相关的关键词，用逗号分隔]

【场景应用词】
[列出场景相关的关键词，用逗号分隔]

【效果价值词】
[列出效果价值相关的关键词，用逗号分隔]

【表达技巧词】
[列出表达技巧相关的关键词，用逗号分隔]

【排版风格】
[描述排版特点，包括段落结构、换行节奏、重点突出方式等]

【布局风格】
[描述布局特征，包括开头方式、内容组织、信息密度、结尾处理等]

【语言风格】
[描述语言特色，包括人称、语调、句式、修辞、情感浓度等]`;
}

// 解析分析结果
function parseAnalysisResult(analysis) {
    try {
        // 提取各个关键词类别
        const productMatch = analysis.match(/【核心产品词】\s*\n([\s\S]*?)(?=【|$)/);
        const emotionMatch = analysis.match(/【情感触发词】\s*\n([\s\S]*?)(?=【|$)/);
        const sceneMatch = analysis.match(/【场景应用词】\s*\n([\s\S]*?)(?=【|$)/);
        const valueMatch = analysis.match(/【效果价值词】\s*\n([\s\S]*?)(?=【|$)/);
        const techniqueMatch = analysis.match(/【表达技巧词】\s*\n([\s\S]*?)(?=【|$)/);
        
        // 提取风格分析类别
        const layoutStyleMatch = analysis.match(/【排版风格】\s*\n([\s\S]*?)(?=【|$)/);
        const structureStyleMatch = analysis.match(/【布局风格】\s*\n([\s\S]*?)(?=【|$)/);
        const languageStyleMatch = analysis.match(/【语言风格】\s*\n([\s\S]*?)(?=【|$)/);
        
        return {
            // 关键词提取结果
            productWords: productMatch ? productMatch[1].trim() : '产品词提取中...',
            emotionWords: emotionMatch ? emotionMatch[1].trim() : '情感词提取中...',
            sceneWords: sceneMatch ? sceneMatch[1].trim() : '场景词提取中...',
            valueWords: valueMatch ? valueMatch[1].trim() : '价值词提取中...',
            techniqueWords: techniqueMatch ? techniqueMatch[1].trim() : '技巧词提取中...',
            
            // 风格分析结果
            layoutStyle: layoutStyleMatch ? layoutStyleMatch[1].trim() : '排版风格分析中...',
            structureStyle: structureStyleMatch ? structureStyleMatch[1].trim() : '布局风格分析中...',
            languageStyle: languageStyleMatch ? languageStyleMatch[1].trim() : '语言风格分析中...',
            
            fullAnalysis: analysis
        };
        
    } catch (error) {
        console.error('解析分析结果失败:', error);
        return {
            productWords: '关键词提取完成，请查看完整结果',
            emotionWords: '',
            sceneWords: '',
            valueWords: '',
            techniqueWords: '',
            layoutStyle: '排版风格分析完成',
            structureStyle: '布局风格分析完成',
            languageStyle: '语言风格分析完成',
            fullAnalysis: analysis
        };
    }
}

// 本地分析降级方案
function generateLocalAnalysis(texts) {
    const totalLength = texts.reduce((sum, text) => sum + text.length, 0);
    const avgLength = Math.round(totalLength / texts.length);
    
    // 简单的本地分析
    const hasQuestions = texts.some(text => text.content.includes('？') || text.content.includes('?'));
    const hasEmoji = texts.some(text => /[\u{1F600}-\u{1F6FF}]/u.test(text.content));
    const hasNumbers = texts.some(text => /\d+/.test(text.content));
    
    // 简单分析段落和句式特征
    const avgParagraphs = texts.reduce((sum, text) => sum + text.content.split('\n').filter(p => p.trim()).length, 0) / texts.length;
    const hasShortParagraphs = avgParagraphs > 3;
    const hasFirstPerson = texts.some(text => text.content.includes('我') || text.content.includes('自己'));
    
    return {
        productWords: '产品，功能，特点，优势，品质，效果',
        emotionWords: `${hasQuestions ? '疑问，好奇，' : ''}满足，开心，惊喜，安心，信任，值得`,
        sceneWords: '日常，生活，家庭，工作，出行，朋友，分享',
        valueWords: `${hasNumbers ? '数据，提升，' : ''}改善，便利，省心，划算，实用，推荐`,
        techniqueWords: `${hasEmoji ? 'emoji，' : ''}对比，描述，引导，呼吁，分享，体验`,
        
        // 风格分析
        layoutStyle: `${hasShortParagraphs ? '短段落为主，' : '长段落结构，'}每段平均${Math.round(avgLength / Math.max(avgParagraphs, 1))}字，${hasEmoji ? '适度使用emoji点缀' : '纯文字表达'}`,
        structureStyle: `${hasQuestions ? '疑问引入开头，' : '直接陈述开头，'}内容组织${avgLength > 200 ? '信息丰富' : '简洁明了'}，${texts.some(t => t.content.includes('推荐') || t.content.includes('建议')) ? '结尾有行动引导' : '自然结束'}`,
        languageStyle: `${hasFirstPerson ? '第一人称分享，' : '客观描述为主，'}${hasQuestions ? '多用疑问句互动，' : '陈述句为主，'}语调${hasEmoji ? '轻松活泼' : '稳重朴实'}`,
        
        fullAnalysis: `基于本地简单分析，文案平均长度${avgLength}字，${hasQuestions ? '多使用疑问句' : '以陈述为主'}，${hasEmoji ? '有emoji表达' : '纯文字'}。建议使用AI分析获得更准确的拆解结果。`
    };
}

// 显示分析结果
function displayAnalysisResult(result) {
    const analysisContent = document.getElementById('analysis-content');
    
    const formattedResult = `【关键词拆解】

🏷️ 核心产品词：
${result.productWords}

💝 情感触发词：
${result.emotionWords}

🎯 场景应用词：
${result.sceneWords}

✨ 效果价值词：
${result.valueWords}

🎨 表达技巧词：
${result.techniqueWords}

【风格拆解】

📝 排版风格：
${result.layoutStyle}

🏗️ 布局风格：
${result.structureStyle}

💬 语言风格：
${result.languageStyle}`;
    
    analysisContent.textContent = formattedResult;
}

// 开始重组生成
async function startRecompose() {
    if (isRecomposing) return;
    
    const generationCount = parseInt(document.getElementById('generation-count').value);
    const analysisContent = document.getElementById('analysis-content').textContent;
    
    if (!analysisContent || analysisContent === '拆解的内容将自动填充到这里') {
        showNotification('请先进行爆款拆解', 'error');
        return;
    }
    
    isRecomposing = true;
    const button = document.querySelector('.recompose-btn');
    const originalText = button.innerHTML;
    
    // 显示加载状态
    button.innerHTML = '<div class="loading"></div> 重组中...';
    button.disabled = true;
    
    // 清空之前的结果
    clearRecomposeResults();
    
    try {
        showNotification(`正在基于拆解结果生成${generationCount}篇内容...`, 'info');
        
        const results = [];
        
        // 批量生成重组内容
        for (let i = 0; i < generationCount; i++) {
            try {
                showNotification(`正在生成第${i + 1}篇重组内容...`, 'info');
                
                const result = await generateRecomposeContentWithAI(analysisContent, i + 1);
                results.push({
                    ...result,
                    index: i + 1,
                    isRecomposed: true
                });
                
                // 每生成一篇就显示一篇
                showSingleRecomposeResult(result, i + 1);
                
                // 添加延迟避免API频率限制
                if (i < generationCount - 1) {
                    await delay(1000);
                }
                
            } catch (error) {
                console.error(`生成第${i + 1}篇重组内容失败:`, error);
                
                // 降级到本地生成
                const fallbackResult = generateLocalRecomposeContent(analysisContent, i + 1);
                results.push({
                    ...fallbackResult,
                    index: i + 1,
                    isRecomposed: false
                });
                
                showSingleRecomposeResult(fallbackResult, i + 1);
            }
        }
        
        // 显示重组结果区域
        document.getElementById('recompose-results').style.display = 'block';
        
        showNotification(`成功生成${results.length}篇重组内容！可选择保存到内容库`, 'success');
        
    } catch (error) {
        showNotification('重组生成失败，请重试', 'error');
        console.error('Recompose error:', error);
        
    } finally {
        isRecomposing = false;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 使用AI生成重组内容
async function generateRecomposeContentWithAI(analysisContent, index) {
    const prompt = createRecomposePrompt(analysisContent, index);
    
    try {
        const response = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的小红书内容创作者，根据文案拆解分析结果，能够生成符合平台特色的高质量原创内容。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const aiContent = data.choices[0].message.content;
        
        return parseRecomposeResult(aiContent, index);
        
    } catch (error) {
        console.error('AI重组生成失败:', error);
        throw error;
    }
}

// 创建重组提示词
function createRecomposePrompt(analysisContent, index) {
    return `基于以下拆解结果，请创作一篇全新的小红书内容，融合关键词要素和风格特征：

【拆解结果】
${analysisContent}

【重组创作要求】
1. **关键词自然融合**：不要生硬堆砌关键词，而是将它们自然地融入到新的表达场景中
2. **情感线索一致**：保持情感触发词的感染力，确保情感传递自然流畅
3. **场景重新构建**：基于场景应用词重新设计使用情境，创造新的故事线索
4. **价值表达创新**：用不同的方式呈现效果价值词，避免重复表达
5. **表达技巧活用**：灵活运用表达技巧词，但要确保逻辑自然连贯

【风格要求】
6. **排版风格模仿**：参考拆解的排版风格特点，保持相似的段落结构和换行节奏
7. **布局风格借鉴**：学习拆解的布局特征，采用相似的开头方式、内容组织和结尾处理
8. **语言风格复现**：模仿拆解的语言特色，包括人称使用、语调特征、句式特点等

【写作原则】
- 完全原创，绝不直接复制原文案
- 关键词密度控制，自然分布不过度堆砌
- 语境重新设计，为关键词创造新的使用环境
- 表达方式多样，同义转换避免重复
- 情感真实可信，读起来不生硬不做作
- 风格保持一致，但内容完全不同

【输出格式】
请按照以下格式输出：

【标题】
[这里是吸引人的标题，控制在20字以内，自然融入核心关键词，风格与原文案相似]

【正文】
[这里是正文内容，300-500字，分段清晰，关键词自然分布，情感表达真实，排版和语言风格与原文案一致]

【标签】
[这里是相关标签，5-8个，用空格分隔，结合产品词和场景词]

请确保内容读起来自然流畅，在保持原文案风格调性的同时，完全原创新的内容和场景。`;
}

// 解析重组结果
function parseRecomposeResult(aiContent, index) {
    try {
        // 提取标题
        const titleMatch = aiContent.match(/【标题】\s*\n([^\n【]+)/);
        let title = titleMatch ? titleMatch[1].trim() : `重组内容 ${index}`;
        
        // 提取正文
        const contentMatch = aiContent.match(/【正文】\s*\n([\s\S]*?)(?=【标签】|$)/);
        let content = contentMatch ? contentMatch[1].trim() : aiContent;
        
        // 提取标签
        const tagsMatch = aiContent.match(/【标签】\s*\n([^\n]+)/);
        let tags = tagsMatch ? tagsMatch[1].trim() : `重组内容，创作分享，好物推荐`;
        
        // 清理和格式化标签
        if (tags.includes('#')) {
            tags = tags.replace(/#/g, '').replace(/\s+/g, '，');
        }
        
        return {
            title: title,
            content: content,
            tags: tags
        };
        
    } catch (error) {
        console.error('解析重组结果失败:', error);
        return {
            title: `重组内容 ${index}`,
            content: aiContent.substring(0, 500),
            tags: `重组内容，创作分享，好物推荐`
        };
    }
}

// 本地重组生成降级方案
function generateLocalRecomposeContent(analysisContent, index) {
    const topics = ['生活技巧', '美食推荐', '穿搭分享', '护肤心得', '好物种草'];
    const topic = topics[index % topics.length];
    
    return {
        title: `${topic}分享第${index}篇 | 根据拆解分析重新创作`,
        content: `基于文案拆解分析，这里应该是一篇关于${topic}的原创内容。

由于当前使用本地生成，内容相对简单。建议：
1. 运用分析中的写作技巧
2. 保持情感共鸣点
3. 结合具体场景描述
4. 添加个人体验分享

完整的重组内容需要使用AI生成功能。`,
        tags: `${topic}，生活分享，好物推荐，原创内容`
    };
}

// 显示单个重组结果
function showSingleRecomposeResult(result, index) {
    const resultsContainer = document.getElementById('recompose-results-container');
    const resultId = `recompose-result-${Date.now()}-${index}`;
    
    const resultItem = document.createElement('div');
    resultItem.className = 'recompose-result-item';
    resultItem.id = resultId;
    
    resultItem.innerHTML = `
        <div class="recompose-result-header">
            <div class="recompose-result-selection">
                <input type="checkbox" id="select-${resultId}" class="recompose-result-checkbox" onchange="updateRecomposeSelectAllState()">
                <label for="select-${resultId}" class="recompose-result-title">重组内容${index}：${result.title}</label>
            </div>
            <div class="recompose-result-meta">
                <span class="source recompose">🔄 重组生成</span>
                <span class="time">${new Date().toLocaleTimeString()}</span>
            </div>
        </div>
        <div class="recompose-result-content">
            <h4>${result.title}</h4>
            <div class="recompose-result-text">${result.content}</div>
            <div class="recompose-result-tags">${result.tags}</div>
            <div class="recompose-result-actions">
                <button onclick="editRecomposeResult('${resultId}')">编辑</button>
                <button onclick="copyRecomposeToClipboard('${resultId}')">复制</button>
                <button class="btn-primary" onclick="saveRecomposeToLibrary('${resultId}')">保存到内容库</button>
            </div>
        </div>
    `;
    
    // 存储结果数据到元素上
    resultItem.resultData = {
        ...result,
        isRecomposed: true
    };
    
    resultsContainer.appendChild(resultItem);
    
    // 显示重组结果区域
    document.getElementById('recompose-results').style.display = 'block';
    
    // 更新选择控制状态
    updateRecomposeSelectionControls();
    
    // 滚动到最新结果
    resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 清空重组结果
function clearRecomposeResults() {
    const resultsContainer = document.getElementById('recompose-results-container');
    resultsContainer.innerHTML = '';
    document.getElementById('recompose-results').style.display = 'none';
    
    // 重置选择状态
    const selectAllCheckbox = document.getElementById('recompose-select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    updateRecomposeSelectionControls();
}

// 重组结果全选/取消全选功能
function toggleRecomposeSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.recompose-result-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateRecomposeSelectionControls();
}

// 更新重组结果全选状态
function updateRecomposeSelectAllState() {
    const checkboxes = document.querySelectorAll('.recompose-result-checkbox');
    const selectAllCheckbox = document.getElementById('recompose-select-all');
    
    if (!selectAllCheckbox || checkboxes.length === 0) {
        return;
    }
    
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
    
    updateRecomposeSelectionControls();
}

// 更新重组结果选择控制状态
function updateRecomposeSelectionControls() {
    const checkboxes = document.querySelectorAll('.recompose-result-checkbox');
    const saveSelectedBtn = document.getElementById('save-recompose-btn');
    
    if (!saveSelectedBtn) return;
    
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    saveSelectedBtn.disabled = checkedCount === 0;
    
    if (checkedCount > 0) {
        saveSelectedBtn.textContent = `保存选中到内容库 (${checkedCount})`;
    } else {
        saveSelectedBtn.textContent = '保存选中到内容库';
    }
}

// 编辑重组结果
function editRecomposeResult(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        showNotification('未找到结果数据', 'error');
        return;
    }
    
    const data = resultItem.resultData;
    
    // 填入编辑区域
    document.getElementById('title').value = data.title;
    document.getElementById('tags').value = data.tags;
    document.getElementById('content').value = data.content;
    
    // 标记内容来源
    window.lastGeneratedSource = 'recompose';
    window.lastUsedAIModel = 'doubao-1-5-pro-32k-250115';
    window.lastUsedStyle = 'text_analysis';
    
    // 切换到编辑区域
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // 激活AI内容创作导航
    navItems.forEach(item => {
        if (item.querySelector('span').textContent === 'AI内容创作') {
            item.classList.add('active');
        }
    });
    
    // 切换到AI创作区域
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById('ai-creation').classList.add('active');
    
    // 滚动到编辑区域
    document.querySelector('.manual-upload-section').scrollIntoView({ behavior: 'smooth' });
    
    showNotification('重组内容已加载到编辑区域', 'success');
}

// 复制重组结果到剪贴板
function copyRecomposeToClipboard(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        showNotification('未找到结果数据', 'error');
        return;
    }
    
    const data = resultItem.resultData;
    const textToCopy = `${data.title}\n\n${data.content}\n\n${data.tags}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        showNotification('重组内容已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showNotification('复制失败，请手动复制', 'error');
    });
}

// 保存重组结果到内容库
function saveRecomposeToLibrary(resultId) {
    const resultItem = document.getElementById(resultId);
    if (!resultItem || !resultItem.resultData) {
        showNotification('未找到结果数据', 'error');
        return;
    }
    
    const data = resultItem.resultData;
    
    try {
        // 准备保存数据
        const saveData = {
            title: data.title,
            tags: data.tags,
            content: data.content,
            images: [],
            source: 'recompose',
            aiModel: 'doubao-1-5-pro-32k-250115',
            style: 'text_analysis'
        };
        
        // 保存到内容库
        const savedContent = contentLibrary.addContent(saveData);
        if (savedContent) {
            showNotification(`重组内容已保存到内容库！(ID: ${savedContent.id.slice(-4)})`, 'success');
            
            // 更新内容库统计
            updateLibraryStats();
            
            // 如果当前显示的是内容库页面，刷新显示
            const librarySection = document.getElementById('content-library');
            if (librarySection && librarySection.classList.contains('active')) {
                updateContentLibraryDisplay();
            }
        } else {
            throw new Error('保存失败');
        }
        
    } catch (error) {
        showNotification('保存失败，请重试', 'error');
        console.error('Save recompose error:', error);
    }
}

// 批量保存选中的重组结果到内容库
function saveRecomposeSelected() {
    const checkboxes = document.querySelectorAll('.recompose-result-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showNotification('请先选择要保存的重组内容', 'error');
        return;
    }
    
    let savedCount = 0;
    let failedCount = 0;
    
    showNotification(`正在批量保存${checkboxes.length}条重组内容...`, 'info');
    
    checkboxes.forEach((checkbox, index) => {
        const resultId = checkbox.id.replace('select-', '');
        const resultItem = document.getElementById(resultId);
        
        if (resultItem && resultItem.resultData) {
            const data = resultItem.resultData;
            
            try {
                // 准备保存数据
                const saveData = {
                    title: data.title,
                    tags: data.tags,
                    content: data.content,
                    images: [],
                    source: 'recompose',
                    aiModel: 'doubao-1-5-pro-32k-250115',
                    style: 'text_analysis'
                };
                
                // 保存到内容库
                const savedContent = contentLibrary.addContent(saveData);
                if (savedContent) {
                    savedCount++;
                    // 取消选中状态
                    checkbox.checked = false;
                } else {
                    failedCount++;
                }
                
            } catch (error) {
                console.error(`保存第${index + 1}条重组内容失败:`, error);
                failedCount++;
            }
        } else {
            failedCount++;
        }
    });
    
    // 显示结果通知
    if (savedCount > 0 && failedCount === 0) {
        showNotification(`成功批量保存${savedCount}条重组内容到内容库！`, 'success');
    } else if (savedCount > 0 && failedCount > 0) {
        showNotification(`保存完成：成功${savedCount}条，失败${failedCount}条`, 'info');
    } else {
        showNotification('批量保存失败，请重试', 'error');
    }
    
    // 更新内容库统计
    updateLibraryStats();
    
    // 如果当前显示的是内容库页面，刷新显示
    const librarySection = document.getElementById('content-library');
    if (librarySection && librarySection.classList.contains('active')) {
        updateContentLibraryDisplay();
    }
    
    // 更新选择状态
    updateRecomposeSelectAllState();
}

// 账号数据持久化函数
async function saveAccountsData() {
    try {
        // 尝试使用主进程保存到文件
        if (window.electronAPI && window.electronAPI.saveAccountsData) {
            const result = await window.electronAPI.saveAccountsData(accountsData);
            if (result.success) {
                console.log('账号数据已保存到文件系统');
                // 同时保存到localStorage作为备份
                localStorage.setItem('accountsData', JSON.stringify(accountsData));
                return;
            } else {
                console.error('文件保存失败，使用localStorage备份:', result.error);
            }
        }
        
        // 降级到localStorage
        localStorage.setItem('accountsData', JSON.stringify(accountsData));
        console.log('账号数据已保存到localStorage');
    } catch (error) {
        console.error('保存账号数据失败:', error);
        showNotification('保存账号数据失败: ' + error.message, 'error');
    }
}

async function loadAccountsData() {
    try {
        // 尝试从主进程加载文件数据
        if (window.electronAPI && window.electronAPI.loadAccountsData) {
            const result = await window.electronAPI.loadAccountsData();
            if (result.success && result.data.length > 0) {
                accountsData = result.data;
                console.log('已从文件系统加载账号数据:', accountsData.length, '个账号');
                
                // 检查并更新旧的序号格式
                let needsUpdate = false;
                accountsData.forEach((account, index) => {
                    if (account.sequence && account.sequence.length > 4) {
                        account.sequence = (index + 1).toString();
                        needsUpdate = true;
                    }
                });
                
                // 如果有更新，保存回文件
                if (needsUpdate) {
                    await saveAccountsData();
                    console.log('已更新账号序号为从1开始的格式');
                }
                
                return true;
            }
        }
        
        // 降级到localStorage
        const saved = localStorage.getItem('accountsData');
        if (saved) {
            accountsData = JSON.parse(saved);
            
            // 检查并更新旧的序号格式
            let needsUpdate = false;
            accountsData.forEach((account, index) => {
                if (account.sequence && account.sequence.length > 4) {
                    account.sequence = (index + 1).toString();
                    needsUpdate = true;
                }
            });
            
            // 如果有更新，保存回localStorage
            if (needsUpdate) {
                await saveAccountsData();
                console.log('已更新账号序号为从1开始的格式');
            }
            
            console.log('已从localStorage加载账号数据:', accountsData.length, '个账号');
            return true;
        }
    } catch (error) {
        console.error('加载账号数据失败:', error);
        showNotification('加载账号数据失败，使用默认数据', 'warning');
    }
    return false;
}

// 账号管理功能
let accountsData = [];

let currentAccountFilter = {
    group: '',
    platform: '',
    search: ''
};

// 初始化账号管理
function initializeAccountManagement() {
    renderAccountTable();
    updateAccountStats();
    
    // 初始化账号使用情况显示
    setTimeout(() => {
        updateAccountUsageDisplay();
    }, 500);
    
    // 初始化时刷新浏览器状态
    setTimeout(() => {
        refreshBrowserStatus();
    }, 1000);
    
    // 定期刷新状态（每30秒）
    setInterval(() => {
        refreshBrowserStatus();
    }, 30000);
}

// 渲染账号表格
function renderAccountTable() {
    const tbody = document.getElementById('account-table-body');
    if (!tbody) return;
    
    // 过滤数据
    let filteredData = accountsData;
    
    if (currentAccountFilter.group) {
        filteredData = filteredData.filter(account => account.group === currentAccountFilter.group);
    }
    
    if (currentAccountFilter.platform) {
        filteredData = filteredData.filter(account => account.platform === currentAccountFilter.platform);
    }
    
    if (currentAccountFilter.search) {
        const searchTerm = currentAccountFilter.search.toLowerCase();
        filteredData = filteredData.filter(account => 
            account.sequence.toLowerCase().includes(searchTerm) ||
            account.windowName.toLowerCase().includes(searchTerm) ||
            account.group.toLowerCase().includes(searchTerm) ||
            account.platform.toLowerCase().includes(searchTerm) ||
            account.note.toLowerCase().includes(searchTerm)
        );
    }
    
    tbody.innerHTML = '';
    
    filteredData.forEach((account, index) => {
        const row = createAccountRow(account, index);
        tbody.appendChild(row);
    });
    
    // 更新总数显示
    document.getElementById('total-accounts').textContent = filteredData.length;
}

// 创建账号行
function createAccountRow(account, index) {
    const row = document.createElement('tr');
    row.setAttribute('data-account-id', account.id);
    
    // 获取分组样式类
    const groupClass = getGroupClass(account.group);
    

    
    row.innerHTML = `
        <td class="checkbox-col">
            <input type="checkbox" data-account-id="${account.id}">
        </td>
        <td class="sequence-col">${account.sequence}</td>
        <td class="group-col">
            <span class="group-badge ${groupClass}">${account.group}</span>
        </td>
        <td class="window-name-col">${account.windowName}</td>
        <td class="platform-col">
            <div class="platform-icon xiaohongshu">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                </svg>
                ${account.platform}
            </div>
        </td>

        <td class="note-col">
            <span class="note-text" title="${account.note || '无备注'}">${account.note || ''}</span>
        </td>
        <td class="create-time-col">
            <div class="time-display">
                <span class="time-primary">${account.createTime}</span>
                <span class="time-secondary">${account.createTimeDetail}</span>
            </div>
        </td>
        <td class="config-col">
            <button class="action-btn" onclick="configAccount(${account.id})" title="配置">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 9H15M9 13H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </td>
        <td class="action-col">
            <button class="action-btn toggle-btn ${account.status === 'running' ? 'danger' : 'primary'}" 
                    onclick="toggleAccount(${account.id})" 
                    data-account-id="${account.id}" 
                    title="${account.status === 'running' ? '关闭浏览器' : '打开浏览器'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    ${account.status === 'running' ? 
                        '<rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2" fill="currentColor"/>' :
                        '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polygon points="10,8 16,12 10,16" fill="currentColor"/>'
                    }
                </svg>
                <span class="btn-text">${account.status === 'running' ? '关闭' : '打开'}</span>
            </button>
        </td>
        <td class="status-col">
            <span class="account-status ${account.status}">${account.status === 'running' ? '运行中' : '已停止'}</span>
        </td>
    `;
    
    return row;
}

// 获取分组样式类
function getGroupClass(group) {
    switch(group) {
        case '红薯1': return 'group-1';
        case '红薯2': return 'group-2';
        case '红薯3': return 'group-3';
        default: return '';
    }
}



// 更新账号统计
function updateAccountStats() {
    const totalCount = accountsData.length;
    document.getElementById('total-accounts').textContent = totalCount;
}

// 过滤功能
function filterByGroup(group) {
    currentAccountFilter.group = group;
    renderAccountTable();
}

function filterByPlatform(platform) {
    currentAccountFilter.platform = platform;
    renderAccountTable();
}

function searchAccounts(searchTerm) {
    currentAccountFilter.search = searchTerm;
    renderAccountTable();
}

// 全选功能
function toggleSelectAllAccounts(checked) {
    const checkboxes = document.querySelectorAll('#account-table-body input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

// 配置窗口相关功能
let currentConfigAccount = null;

function configAccount(accountId) {
    currentConfigAccount = accountsData.find(account => account.id === accountId);
    if (!currentConfigAccount) return;

    // 填充表单数据
    document.getElementById('config-window-name').value = currentConfigAccount.windowName;
    document.getElementById('config-group').value = currentConfigAccount.group;
    document.getElementById('config-platform').value = currentConfigAccount.platform;

    
    document.getElementById('config-note').value = currentConfigAccount.note || '';

    // 设置代理配置数据
    setProxyConfig('config', {
        proxyType: currentConfigAccount.proxyType,
        proxyHost: currentConfigAccount.proxyHost,
        proxyPort: currentConfigAccount.proxyPort,
        proxyUsername: currentConfigAccount.proxyUsername,
        proxyPassword: currentConfigAccount.proxyPassword
    });

    // 显示模态框
    const modal = document.getElementById('config-window-modal');
    modal.style.display = 'flex';
}

function closeConfigWindowModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('config-window-modal');
    if (modal) {
        modal.style.display = 'none';
        currentConfigAccount = null;
        
        // 清空代理配置表单
        clearProxyConfig('config');
    }
}

function saveWindowConfig() {
    if (!currentConfigAccount) return;

    // 获取表单数据
    const windowName = document.getElementById('config-window-name').value.trim();
    const group = document.getElementById('config-group').value;
    const platform = document.getElementById('config-platform').value;

    const note = document.getElementById('config-note').value.trim();

    // 验证必填字段
    if (!windowName) {
        showNotification('窗口名称不能为空', 'error');
        return;
    }

    // 收集代理配置数据
    const proxyConfig = collectProxyConfig('config');
    
    // 更新账号数据
    const accountIndex = accountsData.findIndex(acc => acc.id === currentConfigAccount.id);
    if (accountIndex !== -1) {
        const updateData = {
            ...accountsData[accountIndex],
            windowName,
            group,
            platform,
            note,
            updateTime: new Date().toISOString()
        };
        
        // 如果有生成的指纹配置，则包含进去
        if (window.configWindowFingerprint) {
            updateData.fingerprintConfig = window.configWindowFingerprint;
            // 清除临时存储的指纹配置
            delete window.configWindowFingerprint;
        }
        
        // 更新代理配置（清除旧的代理配置字段并设置新的）
        delete updateData.proxyType;
        delete updateData.proxyHost;
        delete updateData.proxyPort;
        delete updateData.proxyUsername;
        delete updateData.proxyPassword;
        if (proxyConfig) {
            Object.assign(updateData, proxyConfig);
        }
        
        accountsData[accountIndex] = updateData;

        // 保存到localStorage
        saveAccountsData();

        // 更新表格显示
        renderAccountTable();
        
        // 关闭模态框
        closeConfigWindowModal();
        
        // 显示成功提示
        showNotification('配置已保存', 'success');
    }
}

// 获取平台对应的URL
function getPlatformUrl(platform) {
    const platformUrls = {
        'xiaohongshu': 'https://www.xiaohongshu.com/explore',
        'xiaohongshu.com': 'https://www.xiaohongshu.com/explore',
        'douyin': 'https://www.douyin.com',
        'douyin.com': 'https://www.douyin.com',
        'kuaishou': 'https://www.kuaishou.com',
        'kuaishou.com': 'https://www.kuaishou.com',
        'bilibili': 'https://www.bilibili.com',
        'weibo': 'https://weibo.com',
        'weibo.com': 'https://weibo.com',
        'zhihu': 'https://www.zhihu.com',
        'toutiao': 'https://www.toutiao.com',
        'baidu': 'https://www.baidu.com',
        'taobao': 'https://www.taobao.com',
        'tmall': 'https://www.tmall.com',
        'jd': 'https://www.jd.com',
        'pinduoduo': 'https://www.pinduoduo.com',
        'instagram': 'https://www.instagram.com',
        'facebook': 'https://www.facebook.com',
        'twitter': 'https://twitter.com',
        'youtube': 'https://www.youtube.com',
        'tiktok': 'https://www.tiktok.com',
        'linkedin': 'https://www.linkedin.com'
    };
    
    // 如果在映射表中找到了，直接返回
    if (platformUrls[platform]) {
        return platformUrls[platform];
    }
    
    // 如果是完整的URL（以http开头），直接返回
    if (platform.startsWith('http')) {
        return platform;
    }
    
    // 如果是域名格式，自动添加https协议
    if (platform.includes('.') && !platform.startsWith('http')) {
        return `https://${platform}`;
    }
    
    return null;
}

// 构建窗口配置参数
function buildWindowConfig(account, windowIndex = 0) {
    const width = 1200;
    const height = 800;
    
    // 智能窗口定位：避免窗口重叠
    const offsetX = (windowIndex % 3) * 50; // 每行最多3个窗口
    const offsetY = Math.floor(windowIndex / 3) * 50; // 每50px一行
    
    const left = Math.max(0, Math.round((screen.width - width) / 2) + offsetX);
    const top = Math.max(0, Math.round((screen.height - height) / 2) + offsetY);
    
    return [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'scrollbars=yes',
        'resizable=yes',
        'toolbar=no',
        'menubar=no',
        'status=no',
        'location=yes'
    ].join(',');
}

// 更新账号最后打开时间
function updateAccountLastOpenTime(accountId) {
    const accountIndex = accountsData.findIndex(acc => acc.id === accountId);
    if (accountIndex !== -1) {
        accountsData[accountIndex].lastOpenTime = new Date().toISOString();
        accountsData[accountIndex].openCount = (accountsData[accountIndex].openCount || 0) + 1;
        
        // 保存到localStorage
        saveAccountsData();
        
        // 更新表格显示
        renderAccountTable();
    }
}

async function openAccount(accountId) {
    const account = accountsData.find(acc => acc.id === accountId);
    if (!account) {
        showNotification('账号不存在', 'error');
        return;
    }

    try {
        // 等待API就绪
        const apiReady = await waitForElectronAPI();
        if (!apiReady) {
            showNotification('系统初始化未完成，请稍后重试', 'error');
            return;
        }

        // 检查是否已经在运行
        const isRunning = await window.electronAPI.isBrowserRunning(accountId);
        if (isRunning) {
            showNotification(`账号 ${account.windowName} 已在运行中`, 'warning');
            return;
        }

        // 获取平台对应的URL
        const platformUrl = getPlatformUrl(account.platform);
        if (!platformUrl) {
            showNotification(`不支持的平台: ${account.platform}`, 'error');
            return;
        }

        // 构建窗口配置
        const windowConfig = buildWindowConfig(account);
        
        // 显示正在打开的通知
        showNotification(`正在启动浏览器: ${account.windowName}`, 'info');
        
        // 检查launchBrowser方法是否可用
        if (!window.electronAPI.launchBrowser) {
            console.error('launchBrowser method not available');
            showNotification('系统功能不可用，请重启应用', 'error');
            return;
        }

        // 通过IPC启动独立的Chrome进程
        const launchOptions = typeof getBrowserLaunchOptions === 'function' 
            ? getBrowserLaunchOptions({ windowConfig }) 
            : { windowConfig };
        const result = await window.electronAPI.launchBrowser(account, platformUrl, launchOptions);
        
        if (result.success) {
            // 更新账号的最后打开时间
            updateAccountLastOpenTime(accountId);
            
            // 显示成功通知
            showNotification(`浏览器已启动: ${account.windowName}\nPID: ${result.pid}`, 'success');
            
            // 更新界面状态
            updateAccountStatus(accountId, 'running');
            
            console.log('浏览器启动成功:', {
                accountId,
                windowName: account.windowName,
                pid: result.pid
            });
            
        } else {
            // 启动失败 - 根据错误类型提供不同的提示
            let errorMessage = result.error || '未知错误';
            
            // 检查错误类型
            if (errorMessage.includes('Chrome')) {
                errorMessage += '\n请确认Chrome浏览器已正确安装';
            } else if (errorMessage.includes('已在运行')) {
                errorMessage += '\n请先关闭现有浏览器窗口';
            }
            
            showNotification(`浏览器启动失败: ${errorMessage}`, 'error');
            console.error('浏览器启动失败:', result);
        }
        
    } catch (error) {
        console.error('打开账号失败:', error);
        
        // 提供友好的错误提示
        let userMessage = error.message;
        
        showNotification(`启动浏览器失败: ${userMessage}`, 'error');
    }
}

function toggleFavorite(accountId) {
    const account = accountsData.find(acc => acc.id === accountId);
    if (account) {
        account.isFavorite = !account.isFavorite;
        renderAccountTable();
        showNotification(account.isFavorite ? '已添加到常用' : '已取消常用', 'info');
    }
}

// 更新账号状态
function updateAccountStatus(accountId, status) {
    const account = accountsData.find(acc => acc.id === accountId);
    if (account) {
        account.status = status;
        // 更新界面显示
        const row = document.querySelector(`tr[data-account-id="${accountId}"]`);
        if (row) {
            const statusCell = row.querySelector('.account-status');
            if (statusCell) {
                statusCell.textContent = status === 'running' ? '运行中' : '已停止';
                statusCell.className = `account-status ${status}`;
            }
        }
        // 更新切换按钮状态
        updateToggleButton(accountId, status);
    }
}

// 切换账号状态（打开/关闭）
async function toggleAccount(accountId) {
    const account = accountsData.find(acc => acc.id === accountId);
    if (!account) {
        showNotification('账号不存在', 'error');
        return;
    }

    // 获取当前状态
    const currentStatus = account.status || 'stopped';
    
    if (currentStatus === 'stopped') {
        // 当前是停止状态，执行打开操作
        await openAccount(accountId);
    } else {
        // 当前是运行状态，执行关闭操作
        await closeAccount(accountId);
    }
}

// 更新按钮显示状态
function updateToggleButton(accountId, status) {
    const button = document.querySelector(`button[data-account-id="${accountId}"]`);
    const buttonText = button?.querySelector('.btn-text');
    const svgIcon = button?.querySelector('svg');
    
    if (button && buttonText && svgIcon) {
        if (status === 'running') {
            buttonText.textContent = '关闭';
            button.className = 'action-btn toggle-btn danger';
            button.title = '关闭浏览器';
            // 更新为停止图标
            svgIcon.innerHTML = '<rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2" fill="currentColor"/>';
        } else {
            buttonText.textContent = '打开';
            button.className = 'action-btn toggle-btn primary';
            button.title = '打开浏览器';
            // 更新为播放图标
            svgIcon.innerHTML = '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polygon points="10,8 16,12 10,16" fill="currentColor"/>';
        }
    }
}

// 关闭账号浏览器
async function closeAccount(accountId) {
    const account = accountsData.find(acc => acc.id === accountId);
    if (!account) {
        showNotification('账号不存在', 'error');
        return;
    }

    try {
        // 等待API就绪
        const apiReady = await waitForElectronAPI();
        if (!apiReady) {
            showNotification('系统初始化未完成，请稍后重试', 'error');
            return;
        }

        showNotification(`正在关闭浏览器: ${account.windowName}`, 'info');
        
        const result = await window.electronAPI.closeBrowser(accountId);
        
        if (result.success) {
            showNotification(`浏览器已关闭: ${account.windowName}`, 'success');
            updateAccountStatus(accountId, 'stopped');
        } else {
            showNotification(`关闭浏览器失败: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('关闭账号失败:', error);
        showNotification('关闭账号失败: ' + error.message, 'error');
    }
}

// API就绪检查工具函数
function waitForElectronAPI(requiredMethods = [], maxRetries = 20, retryInterval = 500) {
    return new Promise((resolve) => {
        let retryCount = 0;
        
        // 默认检查的基本方法
        const defaultMethods = ['getRunningBrowsers', 'launchBrowser', 'closeBrowser', 'isBrowserRunning'];
        const methodsToCheck = requiredMethods.length > 0 ? requiredMethods : defaultMethods;
        
        const checkAPI = () => {
            if (window.electronAPI) {
                // 检查所有必需的方法是否存在
                const missingMethods = methodsToCheck.filter(method => !window.electronAPI[method]);
                
                if (missingMethods.length === 0) {
                    console.log('✅ electronAPI已就绪，所有方法可用');
                    resolve(true);
                    return;
                }
                
                if (retryCount === 0) {
                    console.log(`⏳ electronAPI部分就绪，等待方法: ${missingMethods.join(', ')}`);
                }
            }
            
            retryCount++;
            if (retryCount >= maxRetries) {
                console.warn('⚠️ electronAPI未完全就绪，已达到最大重试次数');
                if (window.electronAPI) {
                    console.warn('可用的方法:', Object.keys(window.electronAPI));
                }
                resolve(false);
                return;
            }
            
            if (retryCount % 5 === 0) { // 每5次重试输出一次日志
                console.log(`⏳ 等待electronAPI就绪... (${retryCount}/${maxRetries})`);
            }
            setTimeout(checkAPI, retryInterval);
        };
        
        checkAPI();
    });
}

// 获取运行中的浏览器列表
async function refreshBrowserStatus() {
    try {
        // 等待API就绪
        const apiReady = await waitForElectronAPI();
        if (!apiReady) {
            return; // API未就绪，静默返回
        }

        const runningBrowsers = await window.electronAPI.getRunningBrowsers();
        const runningIds = new Set(runningBrowsers.map(b => b.accountId));
        
        // 更新所有账号状态
        accountsData.forEach(account => {
            const status = runningIds.has(account.id) ? 'running' : 'stopped';
            updateAccountStatus(account.id, status);
        });
        
    } catch (error) {
        console.error('刷新浏览器状态失败:', error);
    }
}

// 批量关闭所有浏览器
async function closeAllBrowsers() {
    try {
        // 检查electronAPI是否可用
        if (!window.electronAPI || !window.electronAPI.closeAllBrowsers) {
            console.error('electronAPI not available or closeAllBrowsers method missing');
            showNotification('系统初始化未完成，请稍后重试', 'error');
            return;
        }

        showNotification('正在关闭所有浏览器...', 'info');
        
        const results = await window.electronAPI.closeAllBrowsers();
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        showNotification(`已关闭 ${successCount}/${totalCount} 个浏览器`, 'success');
        
        // 更新所有账号状态
        accountsData.forEach(account => {
            updateAccountStatus(account.id, 'stopped');
        });
        
    } catch (error) {
        console.error('批量关闭浏览器失败:', error);
        showNotification('批量关闭浏览器失败: ' + error.message, 'error');
    }
}

// 批量打开选中的账号
function batchOpenAccounts() {
    const selectedAccounts = getSelectedAccounts();
    if (selectedAccounts.length === 0) {
        showNotification('请先选择要打开的账号', 'warning');
        return;
    }

    if (selectedAccounts.length > 10) {
        if (!confirm(`您选择了 ${selectedAccounts.length} 个账号，打开大量窗口可能影响系统性能，是否继续？`)) {
            return;
        }
    }

    let successCount = 0;
    let failCount = 0;

    selectedAccounts.forEach((accountId, index) => {
        // 延迟打开，避免浏览器阻止批量弹窗
        setTimeout(() => {
            const account = accountsData.find(acc => acc.id === accountId);
            if (account) {
                try {
                    const platformUrl = getPlatformUrl(account.platform);
                    if (platformUrl) {
                        const windowConfig = buildWindowConfig(account, index);
                        const newWindow = window.open(platformUrl, account.windowName, windowConfig);
                        
                        if (newWindow) {
                            updateAccountLastOpenTime(accountId);
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                }
                
                // 最后一个窗口打开后显示结果
                if (index === selectedAccounts.length - 1) {
                    setTimeout(() => {
                        if (successCount > 0) {
                            showNotification(`成功打开 ${successCount} 个窗口${failCount > 0 ? `，失败 ${failCount} 个` : ''}`, 'success');
                        } else {
                            showNotification('没有成功打开任何窗口', 'error');
                        }
                    }, 500);
                }
            }
        }, index * 300); // 每300ms打开一个窗口
    });
}

// 显示更多操作
function showMoreActions() {
    const selectedAccounts = getSelectedAccounts();
    if (selectedAccounts.length === 0) {
        showNotification('请先选择要操作的账号', 'warning');
        return;
    }
    
    // 创建操作菜单
    const existingMenu = document.querySelector('.batch-actions-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'batch-actions-menu';
    menu.innerHTML = `
        <div class="menu-item" onclick="batchOpenAccounts()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 13V6C18 4.89543 17.1046 4 16 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H16C17.1046 20 18 19.1046 18 18V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 21L20 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M15 8L20 3L22 5L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            批量打开 (${selectedAccounts.length})
        </div>
        <div class="menu-item danger" onclick="batchDeleteAccounts()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            批量删除
        </div>
    `;
    
    // 添加到页面并定位
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// 批量删除账号
async function batchDeleteAccounts() {
    const selectedAccounts = getSelectedAccounts();
    if (selectedAccounts.length === 0) {
        showNotification('请先选择要删除的账号', 'warning');
        return;
    }

    console.log('选中的账号ID:', selectedAccounts);
    console.log('当前账号数据ID类型检查:', accountsData.map(acc => ({id: acc.id, type: typeof acc.id, windowName: acc.windowName})));

    if (confirm(`确定要删除选中的 ${selectedAccounts.length} 个账号吗？此操作不可撤销。`)) {
        // 从数据中移除选中的账号，确保类型匹配
        const originalLength = accountsData.length;
        
        // 修复类型匹配问题：确保数字类型的ID比较
        accountsData = accountsData.filter(account => {
            const accountIdNum = parseInt(account.id);
            const shouldKeep = !selectedAccounts.includes(accountIdNum);
            if (!shouldKeep) {
                console.log(`准备删除账号: ID=${account.id}, 窗口=${account.windowName}`);
            }
            return shouldKeep;
        });
        
        const deletedCount = originalLength - accountsData.length;
        console.log(`准备删除 ${selectedAccounts.length} 个账号，实际删除 ${deletedCount} 个，删除前: ${originalLength}个，删除后: ${accountsData.length}个`);
        
        if (deletedCount === 0) {
            console.error('删除失败：没有账号被实际删除，可能存在ID匹配问题');
            showNotification('删除失败，请重新尝试', 'error');
            return;
        }
        
        // 保存到文件系统和localStorage
        await saveAccountsData();
        
        // 重新渲染表格
        renderAccountTable();
        
        showNotification(`已删除 ${deletedCount} 个账号`, 'success');
        
        // 关闭菜单
        const menu = document.querySelector('.batch-actions-menu');
        if (menu) {
            menu.remove();
        }
        
        console.log(`删除操作完成，当前账号数量: ${accountsData.length}`);
    }
}

// 原有的删除按钮功能保持不变
function showMoreActionsOld() {
    const selectedAccounts = getSelectedAccounts();
    if (selectedAccounts.length === 0) {
        showNotification('请先选择要操作的账号', 'warning');
        return;
    }
    
    // 显示删除按钮和其他操作
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.onclick = () => openDeleteAccountModal(selectedAccounts);
    deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        删除选中
    `;
    
    // 批量操作按钮
    const batchOpenBtn = document.createElement('button');
    batchOpenBtn.onclick = () => batchOpenAccounts(selectedAccounts);
    batchOpenBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        批量打开
    `;

    const batchFavoriteBtn = document.createElement('button');
    batchFavoriteBtn.onclick = () => batchToggleFavorite(selectedAccounts);
    batchFavoriteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        批量收藏
    `;

    const exportBtn = document.createElement('button');
    exportBtn.onclick = () => exportSelectedAccounts(selectedAccounts);
    exportBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        导出账号
    `;

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'more-actions-container';
    actionsContainer.appendChild(batchOpenBtn);
    actionsContainer.appendChild(batchFavoriteBtn);
    actionsContainer.appendChild(exportBtn);
    actionsContainer.appendChild(deleteBtn);
    
    // 获取更多操作按钮的位置
    const moreActionsBtn = document.querySelector('.more-actions-btn');
    const rect = moreActionsBtn.getBoundingClientRect();
    
    // 设置操作容器的位置
    actionsContainer.style.position = 'absolute';
    actionsContainer.style.top = rect.bottom + 'px';
    actionsContainer.style.right = (window.innerWidth - rect.right) + 'px';
    actionsContainer.style.zIndex = '1000';
    
    // 添加到页面
    document.body.appendChild(actionsContainer);
    
    // 点击其他地方关闭操作容器
    const closeActions = (e) => {
        if (!actionsContainer.contains(e.target) && !moreActionsBtn.contains(e.target)) {
            actionsContainer.remove();
            document.removeEventListener('click', closeActions);
        }
    };
    
    // 延迟添加事件监听器，避免立即触发
    setTimeout(() => {
        document.addEventListener('click', closeActions);
    }, 0);
}

// 删除账号相关功能
let accountsToDelete = [];

function openDeleteAccountModal(accounts) {
    accountsToDelete = accounts;
    const modal = document.getElementById('delete-account-modal');
    const confirmationText = document.getElementById('delete-confirmation-text');
    
    confirmationText.textContent = `确定要删除选中的 ${accounts.length} 个账号吗？此操作不可恢复。`;
    modal.style.display = 'flex';
}

function closeDeleteAccountModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('delete-account-modal');
    if (modal) {
        modal.style.display = 'none';
        accountsToDelete = [];
    }
}

async function confirmDeleteAccounts() {
    if (accountsToDelete.length === 0) return;
    
    // 删除选中的账号
    const originalLength = accountsData.length;
    accountsData = accountsData.filter(account => !accountsToDelete.includes(account.id));
    
    console.log(`模态框删除 ${accountsToDelete.length} 个账号，删除前: ${originalLength}个，删除后: ${accountsData.length}个`);
    
    // 保存到文件系统和localStorage
    await saveAccountsData();
    
    // 更新表格显示
    renderAccountTable();
    updateAccountStats();
    
    // 更新账号使用情况显示
    updateAccountUsageDisplay();
    
    // 关闭模态框
    closeDeleteAccountModal();
    
    // 显示成功提示
    showNotification(`成功删除 ${accountsToDelete.length} 个账号`, 'success');
    
    console.log(`模态框删除操作完成，当前账号数量: ${accountsData.length}`);
    
    // 清空选中的账号
    accountsToDelete = [];
    
    // 移除更多操作容器
    const actionsContainer = document.querySelector('.more-actions-container');
    if (actionsContainer) {
        actionsContainer.remove();
    }
}

// 批量操作功能
function batchOpenAccounts(accountIds) {
    if (accountIds.length === 0) return;
    
    showNotification(`正在批量打开 ${accountIds.length} 个账号...`, 'info');
    
    // 模拟批量打开账号
    accountIds.forEach((id, index) => {
        setTimeout(() => {
            const account = accountsData.find(acc => acc.id === id);
            if (account) {
                console.log(`正在打开账号: ${account.windowName}`);
            }
        }, index * 500); // 每个账号间隔500ms打开
    });
    
    // 关闭操作菜单
    const actionsContainer = document.querySelector('.more-actions-container');
    if (actionsContainer) {
        actionsContainer.remove();
    }
}

function batchToggleFavorite(accountIds) {
    if (accountIds.length === 0) return;
    
    let addedCount = 0;
    let removedCount = 0;
    
    accountIds.forEach(id => {
        const account = accountsData.find(acc => acc.id === id);
        if (account) {
            if (account.isFavorite) {
                account.isFavorite = false;
                removedCount++;
            } else {
                account.isFavorite = true;
                addedCount++;
            }
        }
    });
    
    renderAccountTable();
    
    if (addedCount > 0 && removedCount > 0) {
        showNotification(`添加 ${addedCount} 个，取消 ${removedCount} 个收藏`, 'info');
    } else if (addedCount > 0) {
        showNotification(`批量添加了 ${addedCount} 个收藏`, 'success');
    } else if (removedCount > 0) {
        showNotification(`批量取消了 ${removedCount} 个收藏`, 'info');
    }
    
    // 关闭操作菜单
    const actionsContainer = document.querySelector('.more-actions-container');
    if (actionsContainer) {
        actionsContainer.remove();
    }
}

function exportSelectedAccounts(accountIds) {
    if (accountIds.length === 0) return;
    
    const selectedAccountsData = accountsData.filter(account => accountIds.includes(account.id));
    
    // 创建CSV格式的数据
    const csvHeader = '序号,分组,窗口名称,平台,备注,创建时间\n';
    const csvData = selectedAccountsData.map(account => 
        `${account.sequence},${account.group},${account.windowName},${account.platform},"${account.note}",${account.createTimeDetail}`
    ).join('\n');
    
    const csvContent = csvHeader + csvData;
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `账号导出_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showNotification(`成功导出 ${selectedAccountsData.length} 个账号`, 'success');
    
    // 关闭操作菜单
    const actionsContainer = document.querySelector('.more-actions-container');
    if (actionsContainer) {
        actionsContainer.remove();
    }
}

// 获取选中的账号
function getSelectedAccounts() {
    const checkboxes = document.querySelectorAll('#account-table-body input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.dataset.accountId));
}

// 数据一致性检查函数
function validateAccountData() {
    console.log('=== 账号数据一致性检查 ===');
    console.log(`总账号数量: ${accountsData.length}`);
    accountsData.forEach((account, index) => {
        console.log(`账号 ${index}: ID=${account.id} (${typeof account.id}), 序号=${account.sequence}, 窗口=${account.windowName}`);
    });
    
    // 检查是否有重复ID
    const ids = accountsData.map(acc => acc.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
        console.warn('警告：发现重复的账号ID');
    }
    
    // 检查是否有无效ID
    const invalidIds = accountsData.filter(acc => !acc.id || isNaN(parseInt(acc.id)));
    if (invalidIds.length > 0) {
        console.warn('警告：发现无效的账号ID', invalidIds);
    }
    
    console.log('========================');
}

// 分页功能
function goToPage(direction) {
    // 这里可以实现具体的分页逻辑
    switch(direction) {
        case 'first':
            showNotification('已在第一页', 'info');
            break;
        case 'prev':
            showNotification('已在第一页', 'info');
            break;
        case 'next':
            showNotification('已在最后一页', 'info');
            break;
        case 'last':
            showNotification('已在最后一页', 'info');
            break;
    }
}

function changePageSize(size) {
    showNotification(`切换到每页显示 ${size} 条`, 'info');
}

// 创建账号模态框功能
function openCreateAccountModal() {
    const modal = document.getElementById('create-account-modal');
    if (modal) {
        modal.style.display = 'flex';
        // 重置表单
        resetAccountForm();
    }
}

function closeCreateAccountModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('create-account-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // 清空代理配置表单
        clearProxyConfig('account');
    }
}

function resetAccountForm() {
    document.getElementById('account-group').value = '红薯1';
    document.getElementById('window-name').value = '';
    document.getElementById('account-platform').value = 'xiaohongshu.com';
    document.getElementById('account-note').value = '';
    
    // 清空代理配置
    clearProxyConfig('account');
}

async function saveNewAccount() {
    const group = document.getElementById('account-group').value;
    const windowName = document.getElementById('window-name').value;
    const platform = document.getElementById('account-platform').value;
    const note = document.getElementById('account-note').value;
    
    if (!windowName.trim()) {
        showNotification('请输入窗口名称', 'error');
        return;
    }
    
    // ========== 新增：账号数量限制验证 ==========
    try {
        // 检查许可证状态
        const licenseValidation = await validateAccountLicense();
        if (!licenseValidation.valid) {
            showNotification(licenseValidation.message, 'error');
            return;
        }
        
        // 检查账号数量限制
        const currentAccountCount = accountsData.length;
        const maxAccounts = licenseValidation.license.accountCount;
        
        if (currentAccountCount >= maxAccounts) {
            showNotification(`已达到最大账号数量限制（${maxAccounts}个），无法创建更多账号。`, 'error');
            return;
        }
        
        console.log(`账号创建检查通过：当前 ${currentAccountCount}/${maxAccounts} 个账号`);
        
    } catch (error) {
        console.error('验证账号创建权限时出错:', error);
        showNotification('无法验证账号创建权限，请检查许可证状态', 'error');
        return;
    }
    // ========== 账号数量限制验证结束 ==========
    
    // 创建新账号
    // 修复ID生成逻辑，确保从1开始
    let newId = 1;
    if (accountsData.length > 0) {
        const maxId = Math.max(...accountsData.map(acc => parseInt(acc.id) || 0));
        newId = maxId + 1;
    }
    
    // 收集代理配置数据
    const proxyConfig = collectProxyConfig('account');
    
    const newAccount = {
        id: newId,
        sequence: (Math.max(...accountsData.map(acc => parseInt(acc.sequence) || 0), 0) + 1).toString(),
        group: group,
        windowName: windowName,
        platform: platform,
        note: note,
        createTime: new Date().toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'}) + '日 ' + 
                   new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'}),
        createTimeDetail: new Date().toLocaleDateString('zh-CN', {month: '2-digit', day: '2-digit'}) + ' ' +
                         new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
        isFavorite: false,
        // 指纹配置信息（如果有生成的话）
        fingerprintConfig: typeof window !== 'undefined' ? window.lastGeneratedFingerprint : null,
        // 代理配置信息
        ...proxyConfig
    };
    
    console.log(`创建新账号，ID: ${newAccount.id} (${typeof newAccount.id}), 序号: ${newAccount.sequence}, 窗口: ${newAccount.windowName}`);
    
    accountsData.unshift(newAccount); // 添加到开头
    
    // 保存到localStorage
    saveAccountsData();
    
    renderAccountTable();
    updateAccountStats();
    closeCreateAccountModal();
    
    // 更新账号使用情况显示
    updateAccountUsageDisplay();
    
    showNotification('账号创建成功！', 'success');
}

// ========== 许可证验证相关函数 ==========

/**
 * 验证账号创建的许可证权限
 * @returns {Object} 验证结果 {valid: boolean, message: string, license: object}
 */
async function validateAccountLicense() {
    try {
        // 等待API可用
        if (!window.electronAPI || !window.electronAPI.validateLicense) {
            return {
                valid: false,
                message: '系统未初始化完成，请稍后重试'
            };
        }
        
        // 验证许可证
        const validation = await window.electronAPI.validateLicense();
        
        if (!validation.valid) {
            let message = '许可证验证失败';
            
            switch (validation.reason) {
                case 'not_found':
                    message = '未找到有效许可证，请先激活卡密';
                    break;
                case 'expired':
                    message = '许可证已过期，请续费或激活新卡密';
                    break;
                case 'device_mismatch':
                    message = '设备验证失败，请联系客服';
                    break;
                default:
                    message = validation.message || '许可证无效';
            }
            
            return {
                valid: false,
                message: message
            };
        }
        
        // 获取详细许可证信息
        let licenseData = validation.license;
        
        // 如果基本验证中没有详细信息，尝试获取
        if (!licenseData || !licenseData.accountCount) {
            try {
                const licenseResponse = await window.electronAPI.getCurrentLicense();
                if (licenseResponse.success && licenseResponse.license) {
                    licenseData = licenseResponse.license;
                }
            } catch (error) {
                console.warn('获取详细许可证信息失败:', error);
            }
        }
        
        // 确保有账号数量信息
        if (!licenseData || !licenseData.accountCount) {
            return {
                valid: false,
                message: '无法获取许可证账号限制信息'
            };
        }
        
        return {
            valid: true,
            message: '许可证验证通过',
            license: licenseData
        };
        
    } catch (error) {
        console.error('验证许可证时出错:', error);
        return {
            valid: false,
            message: '许可证验证过程出错，请检查网络连接'
        };
    }
}

/**
 * 更新账号使用情况显示
 */
async function updateAccountUsageDisplay() {
    try {
        const validation = await validateAccountLicense();
        
        if (validation.valid && validation.license) {
            const currentCount = accountsData.length;
            const maxCount = validation.license.accountCount;
            
            // 更新统计显示
            const statsElement = document.querySelector('.account-stats');
            if (statsElement) {
                // 查找或创建使用情况显示元素
                let usageElement = document.getElementById('account-usage-info');
                if (!usageElement) {
                    usageElement = document.createElement('div');
                    usageElement.id = 'account-usage-info';
                    usageElement.className = 'account-usage-info';
                    statsElement.appendChild(usageElement);
                }
                
                // 计算使用百分比
                const usagePercent = Math.round((currentCount / maxCount) * 100);
                const isNearLimit = usagePercent >= 80;
                const isAtLimit = currentCount >= maxCount;
                
                // 设置样式类
                usageElement.className = `account-usage-info ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`;
                
                // 更新内容
                usageElement.innerHTML = `
                    <div class="usage-text">
                        <span class="usage-label">账号使用情况：</span>
                        <span class="usage-count">${currentCount}/${maxCount}</span>
                        <span class="usage-percent">(${usagePercent}%)</span>
                    </div>
                    <div class="usage-bar">
                        <div class="usage-progress" style="width: ${Math.min(usagePercent, 100)}%"></div>
                    </div>
                `;
                
                // 如果接近或达到限制，添加警告
                if (isAtLimit) {
                    console.warn(`已达到账号数量限制：${currentCount}/${maxCount}`);
                } else if (isNearLimit) {
                    console.warn(`接近账号数量限制：${currentCount}/${maxCount}`);
                }
            }
        }
    } catch (error) {
        console.error('更新账号使用情况显示失败:', error);
    }
}

// 自定义平台功能
let customPlatforms = JSON.parse(localStorage.getItem('customPlatforms')) || [];

// 自定义分组功能
let customGroups = JSON.parse(localStorage.getItem('customGroups')) || ['红薯1', '红薯2', '红薯3'];

// 处理平台选择变化
function handlePlatformChange(type) {
    const selectId = type + '-platform';
    const customDivId = type + '-custom-platform';
    const select = document.getElementById(selectId);
    const customDiv = document.getElementById(customDivId);
    
    if (select.value === 'custom') {
        customDiv.style.display = 'block';
        document.getElementById(type + '-custom-url').focus();
    } else {
        customDiv.style.display = 'none';
    }
}

// 添加自定义平台
function addCustomPlatform(type) {
    const input = document.getElementById(type + '-custom-url');
    const url = input.value.trim();
    
    if (!url) {
        cancelCustomPlatform(type);
        return;
    }
    
    // 验证URL格式
    if (!isValidUrl(url)) {
        showNotification('请输入有效的网址格式，如：example.com', 'error');
        input.focus();
        return;
    }
    
    // 检查是否已存在
    const select = document.getElementById(type + '-platform');
    const existingOptions = Array.from(select.options).map(opt => opt.value);
    
    if (existingOptions.includes(url)) {
        showNotification('该平台已存在', 'error');
        cancelCustomPlatform(type);
        return;
    }
    
    // 添加到自定义平台列表
    if (!customPlatforms.includes(url)) {
        customPlatforms.push(url);
        localStorage.setItem('customPlatforms', JSON.stringify(customPlatforms));
    }
    
    // 添加到选择框
    const newOption = new Option(url, url);
    select.insertBefore(newOption, select.querySelector('option[value="custom"]'));
    
    // 选中新添加的选项
    select.value = url;
    
    // 隐藏自定义输入框
    document.getElementById(type + '-custom-platform').style.display = 'none';
    
    showNotification('自定义平台添加成功！', 'success');
}

// 取消自定义平台输入
function cancelCustomPlatform(type) {
    const select = document.getElementById(type + '-platform');
    const customDiv = document.getElementById(type + '-custom-platform');
    const input = document.getElementById(type + '-custom-url');
    
    // 重置选择框
    select.value = '';
    
    // 隐藏自定义输入框
    customDiv.style.display = 'none';
    
    // 清空输入框
    input.value = '';
}

// 验证URL格式
function isValidUrl(string) {
    // 简单的URL验证，允许domain.com格式
    const pattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    return pattern.test(string) || string.includes('.');
}

// 加载自定义平台到选择框
function loadCustomPlatforms() {
    const accountSelect = document.getElementById('account-platform');
    const configSelect = document.getElementById('config-platform');
    
    // 清除已有的自定义平台选项
    [accountSelect, configSelect].forEach(select => {
        if (select) {
            const customOption = select.querySelector('option[value="custom"]');
            const options = Array.from(select.options);
            
            // 移除自定义平台选项（除了"+ 自定义平台"选项）
            options.forEach(option => {
                if (customPlatforms.includes(option.value)) {
                    option.remove();
                }
            });
            
            // 重新添加自定义平台
            customPlatforms.forEach(platform => {
                const newOption = new Option(platform, platform);
                if (customOption) {
                    select.insertBefore(newOption, customOption);
                } else {
                    select.appendChild(newOption);
                }
            });
        }
    });
}

// 删除自定义平台
function removeCustomPlatform(platformUrl) {
    const index = customPlatforms.indexOf(platformUrl);
    if (index > -1) {
        customPlatforms.splice(index, 1);
        localStorage.setItem('customPlatforms', JSON.stringify(customPlatforms));
        
        // 从所有选择框中移除
        const selects = document.querySelectorAll('#account-platform, #config-platform');
        selects.forEach(select => {
            const option = select.querySelector(`option[value="${platformUrl}"]`);
            if (option) {
                option.remove();
            }
        });
        
        showNotification('自定义平台已删除', 'success');
    }
}

// 处理自定义平台输入的键盘事件
function handleCustomPlatformKeypress(event, type) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCustomPlatform(type);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelCustomPlatform(type);
    }
}

// 显示平台管理器
function showPlatformManager() {
    const modal = document.getElementById('platform-manager-modal');
    renderPlatformManager();
    modal.classList.add('show');
    modal.style.display = 'flex';
}

// 关闭平台管理器
function closePlatformManager(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }
    const modal = document.getElementById('platform-manager-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 150);
}

// 渲染平台管理器内容
function renderPlatformManager() {
    const listContainer = document.getElementById('custom-platform-list');
    const noMessageContainer = document.getElementById('no-platforms-message');
    
    if (customPlatforms.length === 0) {
        listContainer.innerHTML = '';
        noMessageContainer.style.display = 'block';
        return;
    }
    
    noMessageContainer.style.display = 'none';
    
    const platformsHTML = customPlatforms.map(platform => `
        <div class="platform-item">
            <span class="platform-url">${platform}</span>
            <button class="btn-delete" onclick="removeCustomPlatformFromManager('${platform}')" title="删除此平台">删除</button>
        </div>
    `).join('');
    
    listContainer.innerHTML = platformsHTML;
}

// 从管理器中删除自定义平台
function removeCustomPlatformFromManager(platformUrl) {
    removeCustomPlatform(platformUrl);
    renderPlatformManager();
    
    // 重新加载平台选择框
    loadCustomPlatforms();
}

// 分组管理功能
// 保存分组数据到localStorage
function saveCustomGroups() {
    localStorage.setItem('customGroups', JSON.stringify(customGroups));
}

// 动态渲染分组选项
function renderGroupOptions() {
    const groupSelectors = [
        'account-group',      // 创建账号
        'config-group',       // 编辑账号
        'group-filter',       // 筛选器
        'notification-group-filter' // 通知设置
    ];
    
    groupSelectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (!select) return;
        
        // 保存当前选中的值
        const currentValue = select.value;
        
        // 清空现有选项，保留固定选项
        if (selectorId === 'group-filter' || selectorId === 'notification-group-filter') {
            // 筛选器保留"全部"选项
            const allOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (allOption) {
                select.appendChild(allOption);
            }
        } else if (selectorId === 'config-group') {
            // 配置页面保留基础选项
            select.innerHTML = `
                <option value="">选择分组</option>
                <option value="未分组">未分组</option>
            `;
        } else {
            // 创建账号页面清空所有选项
            select.innerHTML = '';
        }
        
        // 添加自定义分组选项
        customGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            select.appendChild(option);
        });
        
        // 恢复之前选中的值
        if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    });
}

// 显示分组管理器
function showGroupManager() {
    const modal = document.getElementById('group-manager-modal');
    modal.style.display = 'flex';
    renderGroupManager();
}

// 关闭分组管理器
function closeGroupManager(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('group-manager-modal');
    modal.style.display = 'none';
    hideAddGroupForm();
}

// 渲染分组管理器内容
function renderGroupManager() {
    const listContainer = document.getElementById('custom-group-list');
    const noGroupsMessage = document.getElementById('no-groups-message');
    
    if (customGroups.length === 0) {
        listContainer.style.display = 'none';
        noGroupsMessage.style.display = 'block';
        return;
    }
    
    listContainer.style.display = 'block';
    noGroupsMessage.style.display = 'none';
    
    const groupsHTML = customGroups.map(group => {
        // 统计使用该分组的账号数量
        const accountCount = accountsData.filter(account => account.group === group).length;
        
        return `
            <div class="group-item">
                <div>
                    <div class="group-name">${group}</div>
                    <div class="group-info">${accountCount} 个账号</div>
                </div>
                <div class="group-actions">
                    <button class="btn-edit" onclick="editGroup('${group}')" title="编辑">编辑</button>
                    <button class="btn-delete" onclick="deleteGroup('${group}')" title="删除">删除</button>
                </div>
            </div>
        `;
    }).join('');
    
    listContainer.innerHTML = groupsHTML;
}

// 显示添加分组表单
function showAddGroupForm() {
    const form = document.getElementById('add-group-form');
    const input = document.getElementById('new-group-name');
    form.style.display = 'block';
    input.value = '';
    input.focus();
}

// 隐藏添加分组表单
function hideAddGroupForm() {
    const form = document.getElementById('add-group-form');
    form.style.display = 'none';
}

// 处理分组名称输入的键盘事件
function handleGroupNameKeypress(event) {
    if (event.key === 'Enter') {
        addNewGroup();
    } else if (event.key === 'Escape') {
        hideAddGroupForm();
    }
}

// 添加新分组
function addNewGroup() {
    const input = document.getElementById('new-group-name');
    const groupName = input.value.trim();
    
    if (!groupName) {
        showNotification('请输入分组名称', 'error');
        input.focus();
        return;
    }
    
    if (groupName.length > 20) {
        showNotification('分组名称不能超过20个字符', 'error');
        input.focus();
        return;
    }
    
    if (customGroups.includes(groupName)) {
        showNotification('分组名称已存在', 'error');
        input.focus();
        return;
    }
    
    customGroups.push(groupName);
    saveCustomGroups();
    renderGroupManager();
    renderGroupOptions();
    hideAddGroupForm();
    
    showNotification(`分组"${groupName}"添加成功`, 'success');
}

// 自定义输入对话框相关变量
let promptCallback = null;
let editingGroupName = null;

// 显示自定义输入对话框
function showCustomPrompt(title, label, defaultValue, callback) {
    const modal = document.getElementById('custom-prompt-modal');
    const titleElement = document.getElementById('prompt-title');
    const labelElement = document.getElementById('prompt-label');
    const inputElement = document.getElementById('prompt-input');
    
    titleElement.textContent = title;
    labelElement.textContent = label;
    inputElement.value = defaultValue || '';
    inputElement.placeholder = defaultValue || '';
    
    promptCallback = callback;
    modal.classList.add('show');
    
    // 聚焦到输入框并选中文本
    setTimeout(() => {
        inputElement.focus();
        inputElement.select();
    }, 100);
}

// 关闭自定义输入对话框
function closeCustomPrompt() {
    const modal = document.getElementById('custom-prompt-modal');
    modal.classList.remove('show');
    promptCallback = null;
    editingGroupName = null;
}

// 确认自定义输入对话框
function confirmCustomPrompt() {
    const inputElement = document.getElementById('prompt-input');
    const value = inputElement.value.trim();
    
    if (promptCallback) {
        promptCallback(value);
    }
    
    closeCustomPrompt();
}

// 处理自定义输入对话框的键盘事件
function handlePromptKeypress(event) {
    if (event.key === 'Enter') {
        confirmCustomPrompt();
    } else if (event.key === 'Escape') {
        closeCustomPrompt();
    }
}

// 编辑分组
function editGroup(oldGroupName) {
    editingGroupName = oldGroupName;
    
    showCustomPrompt(
        '编辑分组', 
        '请输入新的分组名称:', 
        oldGroupName,
        function(newGroupName) {
            if (!newGroupName) {
                showNotification('分组名称不能为空', 'error');
                return;
            }
            
            if (newGroupName.length > 20) {
                showNotification('分组名称不能超过20个字符', 'error');
                return;
            }
            
            if (newGroupName === oldGroupName) return; // 没有改变
            
            if (customGroups.includes(newGroupName)) {
                showNotification('分组名称已存在', 'error');
                return;
            }
            
            // 更新分组名称
            const index = customGroups.indexOf(oldGroupName);
            if (index !== -1) {
                customGroups[index] = newGroupName;
                
                // 更新所有使用该分组的账号
                accountsData.forEach(account => {
                    if (account.group === oldGroupName) {
                        account.group = newGroupName;
                    }
                });
                
                saveCustomGroups();
                saveAccountsData(); // 保存账号数据
                renderGroupManager();
                renderGroupOptions();
                renderAccountTable(); // 重新渲染账号表格
                
                showNotification(`分组已重命名为"${newGroupName}"`, 'success');
            }
        }
    );
}

// 删除分组
function deleteGroup(groupName) {
    const accountCount = accountsData.filter(account => account.group === groupName).length;
    
    let confirmMessage = `确定要删除分组"${groupName}"吗？`;
    if (accountCount > 0) {
        confirmMessage += `\n该分组下有 ${accountCount} 个账号，删除后这些账号将变为"未分组"状态。`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    // 删除分组
    const index = customGroups.indexOf(groupName);
    if (index !== -1) {
        customGroups.splice(index, 1);
        
        // 将使用该分组的账号设置为"未分组"
        accountsData.forEach(account => {
            if (account.group === groupName) {
                account.group = '未分组';
            }
        });
        
        saveCustomGroups();
        saveAccountsData(); // 保存账号数据
        renderGroupManager();
        renderGroupOptions();
        renderAccountTable(); // 重新渲染账号表格
        
        showNotification(`分组"${groupName}"已删除`, 'success');
    }
}

// 指纹配置相关功能


// 一键随机生成指纹配置
function generateRandomConfig(type) {
    try {
        // 使用新的指纹生成系统生成完整的浏览器指纹
        const fingerprintGenerator = new BrowserFingerprintGenerator();
        
        // 随机选择参数
        const deviceTypes = ['high', 'medium', 'low'];
        const osTypes = ['windows', 'macos', 'linux'];
        const locales = ['zh-CN', 'en-US', 'en-GB', 'ja-JP', 'de-DE', 'fr-FR'];
        const strengthLevels = ['low', 'medium', 'high'];
        
        const randomDeviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const randomOsType = osTypes[Math.floor(Math.random() * osTypes.length)];
        const randomLocale = locales[Math.floor(Math.random() * locales.length)];
        const randomStrength = strengthLevels[Math.floor(Math.random() * strengthLevels.length)];
        
        // 生成指纹配置
        const result = fingerprintGenerator.generateFingerprint({
            deviceType: randomDeviceType,
            osType: randomOsType,
            locale: randomLocale,
            strength: randomStrength
        });
        
        // 检查生成是否成功
        if (!result.success) {
            throw new Error(`指纹配置生成失败: ${result.error}`);
        }
        
        const fingerprintConfig = result.config;
        
        // 验证必要属性是否存在
        if (!fingerprintConfig || !fingerprintConfig.screen) {
            throw new Error('指纹配置生成失败：缺少screen属性');
        }
        
        // 根据类型处理不同的逻辑
        if (type === 'account') {
            // 账号创建：更新指纹信息显示区域
            updateResultDisplay(fingerprintConfig);
            
            // 存储当前配置供导出使用
            window.currentFingerprintConfig = fingerprintConfig;
            
            showNotification('浏览器指纹配置已随机生成！', 'success');
            
        } else if (type === 'config') {
            // 窗口配置：只显示详细信息，不更新显示区域
            const fingerprintInfo = `
🎯 窗口指纹配置已生成：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 设备信息：
   • 性能级别：${randomDeviceType === 'high' ? '高端' : randomDeviceType === 'medium' ? '中端' : '低端'}设备
   • 操作系统：${fingerprintConfig.os}
   • CPU：${fingerprintConfig.cpu}
   • 内存：${fingerprintConfig.memory}MB
   • GPU：${fingerprintConfig.gpu}

🌐 浏览器信息：
   • User-Agent：${fingerprintConfig.userAgent}
   • 浏览器：${fingerprintConfig.browser} ${fingerprintConfig.browserVersion}
   • 屏幕分辨率：${fingerprintConfig.screen.width}×${fingerprintConfig.screen.height}

🎨 WebGL信息：
   • 供应商：${fingerprintConfig.webgl.vendor}
   • 渲染器：${fingerprintConfig.webgl.renderer}

🌍 地域信息：
   • 时区：${fingerprintConfig.timezone}
   • 语言：${fingerprintConfig.languages.join(', ')}
   • 地区：${fingerprintConfig.locale}

🔒 指纹强度：${randomStrength === 'high' ? '高强度' : randomStrength === 'medium' ? '中等强度' : '低强度'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 窗口指纹配置已生成，保存窗口时将应用此配置！
📝 注意：代理配置请手动设置
            `;
            
            // 存储指纹配置供窗口保存时使用
            if (typeof window !== 'undefined') {
                window.configWindowFingerprint = fingerprintConfig;
            }
            
            showNotification('窗口指纹配置已随机生成！查看控制台获取详细信息', 'success');
            console.log(fingerprintInfo);
            
            // 弹出详细信息确认
            if (confirm('窗口指纹配置已生成！是否查看详细配置信息？')) {
                alert(fingerprintInfo);
            }
        }
        
    } catch (error) {
        console.error('生成指纹配置失败:', error);
        const errorMsg = type === 'config' ? '生成窗口指纹配置失败，请重试' : '生成指纹配置失败，请重试';
        showNotification(errorMsg, 'error');
    }
}









// ===== 浏览器指纹生成系统 =====

// 设备模板数据库
const DEVICE_TEMPLATES = {
    // Windows设备模板
    windows: {
        // 高端Windows设备
        high: [
            {
                os: "Windows NT 10.0; Win64; x64",
                cpu: "Intel(R) Core(TM) i9-13900K CPU @ 3.00GHz",
                cores: 24,
                memory: 32768,
                gpu: "NVIDIA GeForce RTX 4090",
                screen: { width: 3840, height: 2160, colorDepth: 32 },
                browsers: ["chrome", "edge", "firefox"]
            },
            {
                os: "Windows NT 10.0; Win64; x64",
                cpu: "AMD Ryzen 9 7950X 16-Core Processor",
                cores: 32,
                memory: 65536,
                gpu: "AMD Radeon RX 7900 XTX",
                screen: { width: 2560, height: 1440, colorDepth: 32 },
                browsers: ["chrome", "edge", "firefox"]
            }
        ],
        // 中端Windows设备
        medium: [
            {
                os: "Windows NT 10.0; Win64; x64",
                cpu: "Intel(R) Core(TM) i7-12700K CPU @ 3.60GHz",
                cores: 20,
                memory: 16384,
                gpu: "NVIDIA GeForce RTX 3070",
                screen: { width: 1920, height: 1080, colorDepth: 24 },
                browsers: ["chrome", "edge", "firefox"]
            },
            {
                os: "Windows NT 10.0; Win64; x64",
                cpu: "AMD Ryzen 7 5800X 8-Core Processor",
                cores: 16,
                memory: 16384,
                gpu: "AMD Radeon RX 6700 XT",
                screen: { width: 2560, height: 1080, colorDepth: 24 },
                browsers: ["chrome", "edge", "firefox"]
            }
        ],
        // 低端Windows设备
        low: [
            {
                os: "Windows NT 10.0; Win64; x64",
                cpu: "Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz",
                cores: 12,
                memory: 8192,
                gpu: "NVIDIA GeForce GTX 1660",
                screen: { width: 1920, height: 1080, colorDepth: 24 },
                browsers: ["chrome", "edge", "firefox"]
            },
            {
                os: "Windows NT 10.0; Win64; x64",
                cpu: "AMD Ryzen 5 3600 6-Core Processor",
                cores: 12,
                memory: 8192,
                gpu: "AMD Radeon RX 580",
                screen: { width: 1366, height: 768, colorDepth: 24 },
                browsers: ["chrome", "edge", "firefox"]
            }
        ]
    },
    
    // macOS设备模板
    macos: {
        high: [
            {
                os: "Intel Mac OS X 10_15_7",
                cpu: "Intel(R) Core(TM) i9-9980HK CPU @ 2.40GHz",
                cores: 16,
                memory: 32768,
                gpu: "AMD Radeon Pro 5500M",
                screen: { width: 3072, height: 1920, colorDepth: 32 },
                browsers: ["safari", "chrome", "firefox"]
            },
            {
                os: "Intel Mac OS X 10_15_7",
                cpu: "Apple M2 Max",
                cores: 12,
                memory: 65536,
                gpu: "Apple M2 Max",
                screen: { width: 3456, height: 2234, colorDepth: 32 },
                browsers: ["safari", "chrome", "firefox"]
            }
        ],
        medium: [
            {
                os: "Intel Mac OS X 10_15_7",
                cpu: "Intel(R) Core(TM) i7-8750H CPU @ 2.20GHz",
                cores: 12,
                memory: 16384,
                gpu: "Intel(R) UHD Graphics 630",
                screen: { width: 2560, height: 1600, colorDepth: 24 },
                browsers: ["safari", "chrome", "firefox"]
            },
            {
                os: "Intel Mac OS X 10_15_7",
                cpu: "Apple M1",
                cores: 8,
                memory: 16384,
                gpu: "Apple M1",
                screen: { width: 2560, height: 1600, colorDepth: 24 },
                browsers: ["safari", "chrome", "firefox"]
            }
        ],
        low: [
            {
                os: "Intel Mac OS X 10_14_6",
                cpu: "Intel(R) Core(TM) i5-8279U CPU @ 2.40GHz",
                cores: 8,
                memory: 8192,
                gpu: "Intel(R) Iris(TM) Plus Graphics 655",
                screen: { width: 2560, height: 1600, colorDepth: 24 },
                browsers: ["safari", "chrome", "firefox"]
            }
        ]
    },
    
    // Linux设备模板
    linux: {
        high: [
            {
                os: "X11; Linux x86_64",
                cpu: "Intel(R) Core(TM) i9-12900K CPU @ 3.20GHz",
                cores: 24,
                memory: 32768,
                gpu: "NVIDIA GeForce RTX 3080",
                screen: { width: 2560, height: 1440, colorDepth: 24 },
                browsers: ["chrome", "firefox"]
            },
            {
                os: "X11; Linux x86_64",
                cpu: "AMD Ryzen 9 5950X 16-Core Processor",
                cores: 32,
                memory: 65536,
                gpu: "AMD Radeon RX 6800 XT",
                screen: { width: 3840, height: 2160, colorDepth: 24 },
                browsers: ["chrome", "firefox"]
            }
        ],
        medium: [
            {
                os: "X11; Linux x86_64",
                cpu: "Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz",
                cores: 16,
                memory: 16384,
                gpu: "NVIDIA GeForce GTX 1660 Ti",
                screen: { width: 1920, height: 1080, colorDepth: 24 },
                browsers: ["chrome", "firefox"]
            }
        ],
        low: [
            {
                os: "X11; Linux x86_64",
                cpu: "Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz",
                cores: 6,
                memory: 8192,
                gpu: "NVIDIA GeForce GTX 1050 Ti",
                screen: { width: 1920, height: 1080, colorDepth: 24 },
                browsers: ["chrome", "firefox"]
            }
        ]
    }
};

// 浏览器版本数据库
const BROWSER_VERSIONS = {
    chrome: {
        // 最新版本范围
        stable: ["120.0.6099.109", "120.0.6099.110", "120.0.6099.129", "121.0.6167.85", "121.0.6167.139"],
        // 较旧但仍常用的版本
        legacy: ["119.0.6045.105", "118.0.5993.88", "117.0.5938.92", "116.0.5845.96"]
    },
    firefox: {
        stable: ["121.0", "120.0.1", "120.0", "119.0.1", "119.0"],
        legacy: ["118.0.2", "117.0.1", "116.0.3", "115.0.2"]
    },
    safari: {
        stable: ["17.2.1", "17.2", "17.1.2", "17.1.1", "17.1"],
        legacy: ["16.6", "16.5.2", "16.4.1", "16.3.1"]
    },
    edge: {
        stable: ["120.0.2210.133", "120.0.2210.121", "120.0.2210.91", "121.0.2277.83"],
        legacy: ["119.0.2151.72", "118.0.2088.76", "117.0.2045.47"]
    }
};

// 地域化数据
const LOCALE_DATA = {
    // 中国大陆
    'zh-CN': {
        timezones: ['Asia/Shanghai'],
        languages: ['zh-CN', 'zh', 'en'],
        regions: ['CN'],
        currencies: ['CNY']
    },
    // 美国
    'en-US': {
        timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
        languages: ['en-US', 'en'],
        regions: ['US'],
        currencies: ['USD']
    },
    // 英国
    'en-GB': {
        timezones: ['Europe/London'],
        languages: ['en-GB', 'en'],
        regions: ['GB'],
        currencies: ['GBP']
    },
    // 日本
    'ja-JP': {
        timezones: ['Asia/Tokyo'],
        languages: ['ja', 'en'],
        regions: ['JP'],
        currencies: ['JPY']
    },
    // 德国
    'de-DE': {
        timezones: ['Europe/Berlin'],
        languages: ['de', 'en'],
        regions: ['DE'],
        currencies: ['EUR']
    },
    // 法国
    'fr-FR': {
        timezones: ['Europe/Paris'],
        languages: ['fr', 'en'],
        regions: ['FR'],
        currencies: ['EUR']
    }
};

// User-Agent生成器
class UserAgentGenerator {
    constructor() {
        this.templates = {
            chrome: "Mozilla/5.0 ({os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36",
            firefox: "Mozilla/5.0 ({os}; rv:{version}) Gecko/20100101 Firefox/{version}",
            safari: "Mozilla/5.0 ({os}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/{version} Safari/605.1.15",
            edge: "Mozilla/5.0 ({os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chromeVersion} Safari/537.36 Edg/{version}"
        };
    }

    generate(browser, version, os, options = {}) {
        const template = this.templates[browser];
        if (!template) {
            throw new Error(`不支持的浏览器: ${browser}`);
        }

        let userAgent = template
            .replace('{os}', os)
            .replace('{version}', version);

        // Edge需要特殊处理Chrome版本
        if (browser === 'edge') {
            const chromeVersion = this.getChromeVersionForEdge(version);
            userAgent = userAgent.replace('{chromeVersion}', chromeVersion);
        }

        // 添加可选的修饰符
        if (options.mobile) {
            userAgent = this.addMobileModifiers(userAgent, browser);
        }

        return userAgent;
    }

    getChromeVersionForEdge(edgeVersion) {
        // Edge版本与Chrome版本的映射关系
        const versionMap = {
            '120.0.2210.133': '120.0.6099.109',
            '120.0.2210.121': '120.0.6099.110',
            '121.0.2277.83': '121.0.6167.85'
        };
        return versionMap[edgeVersion] || '120.0.6099.109';
    }

    addMobileModifiers(userAgent, browser) {
        // 移动设备修饰符（如果需要的话）
        if (browser === 'chrome') {
            return userAgent.replace('Chrome/', 'Mobile Chrome/');
        }
        return userAgent;
    }
}

// 硬件参数生成器
class HardwareGenerator {
    constructor() {
        this.webglVendors = [
            "Google Inc. (Intel)",
            "Google Inc. (NVIDIA)",
            "Google Inc. (AMD)",
            "Google Inc. (Apple)",
            "WebKit",
            "Mozilla"
        ];

        this.webglRenderers = {
            "Google Inc. (Intel)": [
                "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)",
                "ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 655 Direct3D11 vs_5_0 ps_5_0, D3D11)",
                "ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)"
            ],
            "Google Inc. (NVIDIA)": [
                "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11-30.0.15.1179)",
                "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11-30.0.15.1179)",
                "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0, D3D11-27.21.14.5671)"
            ],
            "Google Inc. (AMD)": [
                "ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11-31.0.14051.5006)",
                "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11-30.0.15021.11002)",
                "ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11-27.20.1020.2002)"
            ]
        };
    }

    generateWebGLInfo(gpu) {
        let vendor, renderer;
        
        if (gpu.includes('Intel')) {
            vendor = "Google Inc. (Intel)";
            renderer = this.getRandomFromArray(this.webglRenderers[vendor]);
        } else if (gpu.includes('NVIDIA')) {
            vendor = "Google Inc. (NVIDIA)";
            renderer = this.getRandomFromArray(this.webglRenderers[vendor]);
        } else if (gpu.includes('AMD') || gpu.includes('Radeon')) {
            vendor = "Google Inc. (AMD)";
            renderer = this.getRandomFromArray(this.webglRenderers[vendor]);
        } else if (gpu.includes('Apple')) {
            vendor = "Google Inc. (Apple)";
            renderer = `ANGLE (Apple, ${gpu}, OpenGL 4.1)`;
        } else {
            vendor = this.getRandomFromArray(this.webglVendors);
            renderer = "ANGLE (Unknown, Generic GPU Direct3D11 vs_5_0 ps_5_0, D3D11)";
        }

        return { vendor, renderer };
    }

    generateCanvasFingerprint() {
        // 生成Canvas指纹的随机变化
        const variations = [
            Math.random() * 0.0001,
            Math.random() * 0.0002,
            Math.random() * 0.0003
        ];
        return variations[Math.floor(Math.random() * variations.length)];
    }

    generateWebRTCFingerprint() {
        // 生成WebRTC本地IP地址
        const localIPs = [
            '192.168.1.' + (Math.floor(Math.random() * 254) + 1),
            '192.168.0.' + (Math.floor(Math.random() * 254) + 1),
            '10.0.0.' + (Math.floor(Math.random() * 254) + 1),
            '172.16.0.' + (Math.floor(Math.random() * 254) + 1)
        ];
        return this.getRandomFromArray(localIPs);
    }

    getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}

// 地域化生成器
class LocaleGenerator {
    generateTimezone(locale) {
        const timezones = LOCALE_DATA[locale]?.timezones || ['UTC'];
        return timezones[Math.floor(Math.random() * timezones.length)];
    }

    generateLanguages(locale) {
        const languages = LOCALE_DATA[locale]?.languages || ['en'];
        return languages;
    }

    generateRegion(locale) {
        const regions = LOCALE_DATA[locale]?.regions || ['US'];
        return regions[0];
    }

    generateLocation(locale) {
        // 根据地域生成大致的地理位置
        const locations = {
            'zh-CN': { lat: 39.9042, lng: 116.4074, accuracy: 1000 }, // 北京
            'en-US': { lat: 40.7128, lng: -74.0060, accuracy: 1000 }, // 纽约
            'en-GB': { lat: 51.5074, lng: -0.1278, accuracy: 1000 },  // 伦敦
            'ja-JP': { lat: 35.6762, lng: 139.6503, accuracy: 1000 }, // 东京
            'de-DE': { lat: 52.5200, lng: 13.4050, accuracy: 1000 },  // 柏林
            'fr-FR': { lat: 48.8566, lng: 2.3522, accuracy: 1000 }    // 巴黎
        };

        const baseLocation = locations[locale] || locations['en-US'];
        
        // 添加随机偏移
        return {
            latitude: baseLocation.lat + (Math.random() - 0.5) * 0.1,
            longitude: baseLocation.lng + (Math.random() - 0.5) * 0.1,
            accuracy: baseLocation.accuracy + Math.floor(Math.random() * 500)
        };
    }
}

// 兼容性检查器
class CompatibilityChecker {
    checkCompatibility(config) {
        const issues = [];

        // 检查操作系统与浏览器的兼容性
        if (config.os.includes('Mac') && config.browser === 'edge') {
            if (!config.browserVersion.includes('120.')) {
                issues.push('macOS上的Edge版本可能不兼容');
            }
        }

        // 检查硬件与性能的合理性
        if (config.memory < 4096 && config.screen.width > 2560) {
            issues.push('低内存配置与高分辨率屏幕不匹配');
        }

        // 检查GPU与操作系统的兼容性
        if (config.os.includes('Mac') && config.gpu.includes('NVIDIA')) {
            issues.push('新版macOS通常不支持NVIDIA显卡');
        }

        // 检查CPU核心数与内存的合理性
        if (config.cores > 16 && config.memory < 16384) {
            issues.push('高核心数CPU通常配备更多内存');
        }

        return {
            isCompatible: issues.length === 0,
            issues: issues
        };
    }

    fixCompatibilityIssues(config) {
        // 自动修复一些兼容性问题
        const fixedConfig = { ...config };

        // 修复macOS + NVIDIA的问题
        if (fixedConfig.os.includes('Mac') && fixedConfig.gpu.includes('NVIDIA')) {
            fixedConfig.gpu = 'AMD Radeon Pro 560X';
        }

        // 修复内存与屏幕分辨率的匹配
        if (fixedConfig.memory < 4096 && fixedConfig.screen.width > 2560) {
            fixedConfig.memory = 8192;
        }

        // 修复CPU与内存的匹配
        if (fixedConfig.cores > 16 && fixedConfig.memory < 16384) {
            fixedConfig.memory = Math.max(fixedConfig.memory, 16384);
        }

        return fixedConfig;
    }
}

// 指纹强度控制器
class FingerprintStrengthController {
    constructor() {
        this.strengthLevels = {
            low: {
                name: '低强度',
                description: '基础参数变化，适合一般场景',
                variations: {
                    userAgent: 0.3,
                    screen: 0.2,
                    timezone: 0.1,
                    language: 0.1,
                    hardware: 0.2
                }
            },
            medium: {
                name: '中等强度',
                description: '适度参数变化，平衡性能与隐私',
                variations: {
                    userAgent: 0.6,
                    screen: 0.4,
                    timezone: 0.3,
                    language: 0.3,
                    hardware: 0.5
                }
            },
            high: {
                name: '高强度',
                description: '最大参数变化，最强隐私保护',
                variations: {
                    userAgent: 0.9,
                    screen: 0.7,
                    timezone: 0.6,
                    language: 0.5,
                    hardware: 0.8
                }
            }
        };
    }

    applyStrength(config, strength = 'medium') {
        const level = this.strengthLevels[strength];
        if (!level) {
            console.warn(`未知的强度级别: ${strength}，使用默认中等强度`);
            return config;
        }

        const modifiedConfig = { ...config };

        // 根据强度级别调整各项参数
        if (Math.random() < level.variations.userAgent) {
            // 更换浏览器版本
            const versions = BROWSER_VERSIONS[config.browser];
            if (versions) {
                const allVersions = [...versions.stable, ...versions.legacy];
                modifiedConfig.browserVersion = allVersions[Math.floor(Math.random() * allVersions.length)];
            }
        }

        if (Math.random() < level.variations.screen) {
            // 微调屏幕分辨率
            const variation = Math.floor(Math.random() * 100) - 50;
            modifiedConfig.screen.width += variation;
            modifiedConfig.screen.height += Math.floor(variation * 0.75);
        }

        if (Math.random() < level.variations.hardware) {
            // 调整硬件参数
            const memoryVariation = Math.floor(Math.random() * 4096);
            modifiedConfig.memory += memoryVariation;
        }

        return modifiedConfig;
    }

    getStrengthInfo(strength) {
        return this.strengthLevels[strength] || this.strengthLevels.medium;
    }
}

// 主要的指纹生成器类
class BrowserFingerprintGenerator {
    constructor() {
        this.userAgentGenerator = new UserAgentGenerator();
        this.hardwareGenerator = new HardwareGenerator();
        this.localeGenerator = new LocaleGenerator();
        this.compatibilityChecker = new CompatibilityChecker();
        this.strengthController = new FingerprintStrengthController();
    }

    // 生成完整的浏览器指纹配置
    generateFingerprint(options = {}) {
        const {
            deviceType = 'medium',
            osType = 'windows',
            browserType = null,
            locale = 'zh-CN',
            strength = 'medium',
            customParams = {}
        } = options;

        try {
            // 1. 选择设备模板
            const deviceTemplate = this.selectDeviceTemplate(osType, deviceType);
            
            // 2. 选择浏览器
            const browser = browserType || this.selectRandomBrowser(deviceTemplate.browsers);
            
            // 3. 选择浏览器版本
            const browserVersion = this.selectBrowserVersion(browser);
            
            // 4. 生成User-Agent
            const userAgent = this.userAgentGenerator.generate(browser, browserVersion, deviceTemplate.os);
            
            // 5. 生成硬件信息
            const webglInfo = this.hardwareGenerator.generateWebGLInfo(deviceTemplate.gpu);
            const canvasFingerprint = this.hardwareGenerator.generateCanvasFingerprint();
            const webrtcIP = this.hardwareGenerator.generateWebRTCFingerprint();
            
            // 6. 生成地域化信息
            const timezone = this.localeGenerator.generateTimezone(locale);
            const languages = this.localeGenerator.generateLanguages(locale);
            const location = this.localeGenerator.generateLocation(locale);
            
            // 7. 构建基础配置
            let config = {
                // 基础信息
                userAgent,
                browser,
                browserVersion,
                os: deviceTemplate.os,
                
                // 硬件信息
                cpu: deviceTemplate.cpu,
                cores: deviceTemplate.cores,
                memory: deviceTemplate.memory,
                gpu: deviceTemplate.gpu,
                
                // 屏幕信息
                screen: {
                    width: deviceTemplate.screen.width,
                    height: deviceTemplate.screen.height,
                    colorDepth: deviceTemplate.screen.colorDepth,
                    pixelRatio: this.calculatePixelRatio(deviceTemplate.screen.width)
                },
                
                // WebGL信息
                webgl: {
                    vendor: webglInfo.vendor,
                    renderer: webglInfo.renderer,
                    version: "WebGL 2.0",
                    shadingLanguageVersion: "WebGL GLSL ES 3.00"
                },
                
                // Canvas指纹
                canvas: {
                    fingerprint: canvasFingerprint,
                    fonts: this.generateFontList(osType)
                },
                
                // 地域化信息
                timezone,
                languages,
                locale,
                location,
                
                // 网络信息
                webrtc: {
                    localIP: webrtcIP,
                    publicIP: null // 需要外部获取
                },
                
                // 其他指纹参数
                plugins: this.generatePluginList(browser),
                mimeTypes: this.generateMimeTypes(browser),
                cookieEnabled: true,
                javaEnabled: false,
                
                // 性能相关
                deviceMemory: Math.min(Math.floor(deviceTemplate.memory / 1024), 8),
                hardwareConcurrency: deviceTemplate.cores,
                
                // 生成时间戳
                generated: new Date().toISOString(),
                
                // 应用自定义参数
                ...customParams
            };
            
            // 8. 应用指纹强度控制
            config = this.strengthController.applyStrength(config, strength);
            
            // 9. 兼容性检查和修复
            const compatibility = this.compatibilityChecker.checkCompatibility(config);
            if (!compatibility.isCompatible) {
                console.warn('检测到兼容性问题:', compatibility.issues);
                config = this.compatibilityChecker.fixCompatibilityIssues(config);
            }
            
            // 10. 生成配置摘要
            config.summary = this.generateConfigSummary(config);
            
            return {
                success: true,
                config,
                compatibility,
                strengthInfo: this.strengthController.getStrengthInfo(strength)
            };
            
        } catch (error) {
            console.error('指纹生成失败:', error);
            return {
                success: false,
                error: error.message,
                config: null
            };
        }
    }

    selectDeviceTemplate(osType, deviceType) {
        const templates = DEVICE_TEMPLATES[osType]?.[deviceType];
        if (!templates || templates.length === 0) {
            throw new Error(`找不到设备模板: ${osType}/${deviceType}`);
        }
        return templates[Math.floor(Math.random() * templates.length)];
    }

    selectRandomBrowser(availableBrowsers) {
        return availableBrowsers[Math.floor(Math.random() * availableBrowsers.length)];
    }

    selectBrowserVersion(browser) {
        const versions = BROWSER_VERSIONS[browser];
        if (!versions) {
            throw new Error(`不支持的浏览器: ${browser}`);
        }
        
        // 80%概率选择稳定版本，20%概率选择旧版本
        const useStable = Math.random() < 0.8;
        const versionList = useStable ? versions.stable : versions.legacy;
        
        return versionList[Math.floor(Math.random() * versionList.length)];
    }

    calculatePixelRatio(screenWidth) {
        // 根据屏幕宽度估算像素比
        if (screenWidth >= 3840) return 2.0;
        if (screenWidth >= 2560) return 1.5;
        if (screenWidth >= 1920) return 1.0;
        return 1.0;
    }

    generateFontList(osType) {
        const fontLists = {
            windows: [
                "Arial", "Calibri", "Cambria", "Consolas", "Georgia", "Impact", 
                "Lucida Console", "Segoe UI", "Tahoma", "Times New Roman", 
                "Trebuchet MS", "Verdana", "Microsoft YaHei"
            ],
            macos: [
                "Arial", "Helvetica", "Times", "Courier", "Verdana", "Georgia", 
                "Palatino", "Garamond", "Bookman", "Avant Garde", 
                "San Francisco", "PingFang SC"
            ],
            linux: [
                "Arial", "DejaVu Sans", "Liberation Sans", "Ubuntu", "Noto Sans", 
                "Source Sans Pro", "Roboto", "Open Sans", "Droid Sans"
            ]
        };
        
        return fontLists[osType] || fontLists.windows;
    }

    generatePluginList(browser) {
        const pluginLists = {
            chrome: [
                "Chrome PDF Plugin",
                "Chrome PDF Viewer", 
                "Native Client",
                "Widevine Content Decryption Module"
            ],
            firefox: [
                "OpenH264 Video Codec provided by Cisco Systems, Inc.",
                "Widevine Content Decryption Module provided by Google Inc."
            ],
            safari: [
                "WebKit built-in PDF",
                "QuickTime Plugin"
            ],
            edge: [
                "Microsoft Edge PDF Plugin",
                "Widevine Content Decryption Module"
            ]
        };
        
        return pluginLists[browser] || pluginLists.chrome;
    }

    generateMimeTypes(browser) {
        // 简化的MIME类型列表
        return [
            "application/pdf",
            "application/x-google-chrome-pdf",
            "application/x-nacl",
            "application/x-pnacl",
            "text/plain"
        ];
    }

    generateConfigSummary(config) {
        return {
            device: `${config.os} - ${config.cpu}`,
            browser: `${config.browser} ${config.browserVersion}`,
            screen: `${config.screen.width}x${config.screen.height}`,
            memory: `${Math.floor(config.memory / 1024)}GB RAM`,
            gpu: config.gpu,
            location: `${config.timezone} (${config.locale})`
        };
    }

    // 导出配置
    exportConfig(config, format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(config, null, 2);
            case 'yaml':
                return this.configToYaml(config);
            case 'env':
                return this.configToEnv(config);
            default:
                throw new Error(`不支持的导出格式: ${format}`);
        }
    }

    // 导入配置
    importConfig(data, format = 'json') {
        try {
            switch (format) {
                case 'json':
                    return JSON.parse(data);
                case 'yaml':
                    return this.yamlToConfig(data);
                case 'env':
                    return this.envToConfig(data);
                default:
                    throw new Error(`不支持的导入格式: ${format}`);
            }
        } catch (error) {
            throw new Error(`配置导入失败: ${error.message}`);
        }
    }

    configToYaml(config) {
        // 简化的YAML转换
        let yaml = '';
        for (const [key, value] of Object.entries(config)) {
            if (typeof value === 'object' && value !== null) {
                yaml += `${key}:\n`;
                for (const [subKey, subValue] of Object.entries(value)) {
                    yaml += `  ${subKey}: ${JSON.stringify(subValue)}\n`;
                }
            } else {
                yaml += `${key}: ${JSON.stringify(value)}\n`;
            }
        }
        return yaml;
    }

    configToEnv(config) {
        // 转换为环境变量格式
        let env = '';
        const flattenObject = (obj, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const envKey = (prefix + key).toUpperCase().replace(/[^A-Z0-9]/g, '_');
                if (typeof value === 'object' && value !== null) {
                    flattenObject(value, `${prefix}${key}_`);
                } else {
                    env += `${envKey}=${JSON.stringify(value)}\n`;
                }
            }
        };
        flattenObject(config, 'FINGERPRINT_');
        return env;
    }
}

// 全局指纹生成器实例
const fingerprintGenerator = new BrowserFingerprintGenerator();

// 初始化指纹生成器界面
function initializeFingerprintGenerator() {
    console.log('指纹生成器已初始化');
    
    // 检查是否有生成按钮，如果有则绑定事件
    const generateBtn = document.getElementById('generate-config-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateFingerprint);
    }
    
    // 检查是否有导出按钮
    const exportBtn = document.getElementById('export-config-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportConfig);
    }
    
    // 检查是否有导入按钮
    const importBtn = document.getElementById('import-config-btn');
    if (importBtn) {
        importBtn.addEventListener('click', handleImportConfig);
    }
}

// 处理指纹生成
function handleGenerateFingerprint() {
    try {
        // 获取用户选择的参数
        const options = getFingerprintOptions();
        
        // 显示生成中状态
        showNotification('正在生成浏览器指纹配置...', 'info');
        
        // 生成指纹
        const result = fingerprintGenerator.generateFingerprint(options);
        
        if (result.success) {
            // 显示生成结果
            displayFingerprintResult(result);
            showNotification('指纹配置生成成功！', 'success');
            
            // 如果有兼容性问题，显示警告
            if (!result.compatibility.isCompatible) {
                showNotification(`已自动修复兼容性问题: ${result.compatibility.issues.join(', ')}`, 'warning');
            }
        } else {
            showNotification(`指纹生成失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('指纹生成错误:', error);
        showNotification('指纹生成过程中发生错误', 'error');
    }
}

// 获取指纹生成选项
function getFingerprintOptions() {
    // 从界面获取用户选择的参数
    const deviceType = document.getElementById('device-type')?.value || 'medium';
    const osType = document.getElementById('os-type')?.value || 'windows';
    const browserType = document.getElementById('browser-type')?.value || null;
    const locale = document.getElementById('locale')?.value || 'zh-CN';
    const strength = document.getElementById('fingerprint-strength')?.value || 'medium';
    
    return {
        deviceType,
        osType,
        browserType: browserType === 'auto' ? null : browserType,
        locale,
        strength
    };
}

// 显示指纹生成结果
function displayFingerprintResult(result) {
    const { config, strengthInfo } = result;
    
    // 更新结果显示区域
    updateResultDisplay(config);
    
    // 更新摘要信息
    updateSummaryDisplay(config.summary);
    
    // 更新强度信息显示
    updateStrengthDisplay(strengthInfo);
    
    // 存储当前配置供导出使用
    window.currentFingerprintConfig = config;
}

// 更新结果显示
function updateResultDisplay(config) {
    // 更新User-Agent显示
    const userAgentDisplay = document.getElementById('generated-useragent');
    if (userAgentDisplay) {
        userAgentDisplay.textContent = config.userAgent;
    }
    
    // 更新屏幕分辨率显示
    const screenDisplay = document.getElementById('generated-screen');
    if (screenDisplay) {
        screenDisplay.textContent = `${config.screen.width}x${config.screen.height} (${config.screen.colorDepth}位色深)`;
    }
    
    // 更新硬件信息显示
    const hardwareDisplay = document.getElementById('generated-hardware');
    if (hardwareDisplay) {
        hardwareDisplay.innerHTML = `
            <div><strong>CPU:</strong> ${config.cpu}</div>
            <div><strong>内存:</strong> ${Math.floor(config.memory / 1024)}GB</div>
            <div><strong>GPU:</strong> ${config.gpu}</div>
            <div><strong>核心数:</strong> ${config.cores}</div>
        `;
    }
    
    // 更新地域信息显示
    const localeDisplay = document.getElementById('generated-locale');
    if (localeDisplay) {
        localeDisplay.innerHTML = `
            <div><strong>时区:</strong> ${config.timezone}</div>
            <div><strong>语言:</strong> ${config.languages.join(', ')}</div>
            <div><strong>地区:</strong> ${config.locale}</div>
        `;
    }
    
    // 更新WebGL信息显示
    const webglDisplay = document.getElementById('generated-webgl');
    if (webglDisplay) {
        webglDisplay.innerHTML = `
            <div><strong>供应商:</strong> ${config.webgl.vendor}</div>
            <div><strong>渲染器:</strong> ${config.webgl.renderer}</div>
        `;
    }
}

// 更新摘要显示
function updateSummaryDisplay(summary) {
    const summaryDisplay = document.getElementById('fingerprint-summary');
    if (summaryDisplay) {
        summaryDisplay.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">设备:</span>
                <span class="summary-value">${summary.device}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">浏览器:</span>
                <span class="summary-value">${summary.browser}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">屏幕:</span>
                <span class="summary-value">${summary.screen}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">内存:</span>
                <span class="summary-value">${summary.memory}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">位置:</span>
                <span class="summary-value">${summary.location}</span>
            </div>
        `;
    }
}

// 更新强度信息显示
function updateStrengthDisplay(strengthInfo) {
    const strengthDisplay = document.getElementById('strength-info');
    if (strengthDisplay) {
        strengthDisplay.innerHTML = `
            <div class="strength-name">${strengthInfo.name}</div>
            <div class="strength-description">${strengthInfo.description}</div>
        `;
    }
}

// 处理配置导出
function handleExportConfig() {
    if (!window.currentFingerprintConfig) {
        showNotification('请先生成指纹配置', 'warning');
        return;
    }
    
    try {
        const format = document.getElementById('export-format')?.value || 'json';
        const exportData = fingerprintGenerator.exportConfig(window.currentFingerprintConfig, format);
        
        // 创建下载链接
        const blob = new Blob([exportData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fingerprint-config.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification(`配置已导出为 ${format.toUpperCase()} 格式`, 'success');
    } catch (error) {
        console.error('导出配置失败:', error);
        showNotification('配置导出失败', 'error');
    }
}

// 处理配置导入
function handleImportConfig() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,.yaml,.yml,.env';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const format = file.name.split('.').pop().toLowerCase();
                const actualFormat = format === 'yml' ? 'yaml' : format;
                
                const config = fingerprintGenerator.importConfig(content, actualFormat);
                
                // 显示导入的配置
                displayImportedConfig(config);
                showNotification('配置导入成功', 'success');
            } catch (error) {
                console.error('导入配置失败:', error);
                showNotification(`配置导入失败: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    fileInput.click();
}

// 显示导入的配置
function displayImportedConfig(config) {
    window.currentFingerprintConfig = config;
    
    // 创建一个模拟的结果对象
    const mockResult = {
        config: config,
        strengthInfo: fingerprintGenerator.strengthController.getStrengthInfo('medium')
    };
    
    displayFingerprintResult(mockResult);
}



// 标签切换功能
function switchTab(tabName) {
    // 移除所有标签按钮的active状态
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // 移除所有标签面板的active状态
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => panel.classList.remove('active'));
    
    // 激活当前标签按钮
    const activeButton = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // 激活当前标签面板
    const activePanel = document.getElementById(`${tabName}-tab`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

// 爆款拆解选项卡切换功能
function switchAnalysisTab(tabName) {
    // 移除所有选项卡按钮的active状态
    const tabButtons = document.querySelectorAll('.analysis-tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // 移除所有选项卡面板的active状态
    const tabPanels = document.querySelectorAll('.analysis-tab-panel');
    tabPanels.forEach(panel => panel.classList.remove('active'));
    
    // 激活当前选项卡按钮
    const activeButton = document.querySelector(`.analysis-tab-btn[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // 激活当前选项卡面板
    const activePanel = document.getElementById(`${tabName}-tab`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
    
    // 选项卡切换时的特殊处理
    if (tabName === 'scraped') {
        // 切换到智能抓取选项卡时，显示内容区域并刷新数据
        console.log('🔄 切换到智能抓取选项卡');
        
        // 显示智能抓取内容区域
        const scrapedSection = document.getElementById('scraped-content-section');
        if (scrapedSection) {
            scrapedSection.style.display = 'block';
        }
        
        // 刷新抓取内容展示
        refreshScrapedContent();
    } else if (tabName === 'manual') {
        // 切换到手动拆解选项卡时的处理
        console.log('✏️ 切换到手动拆解选项卡');
    }
}

// 页面加载时初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 延迟加载，确保DOM已完全构建
    setTimeout(async () => {
        console.log('🚀 开始初始化应用...');
        
        // 先初始化不依赖electronAPI的功能
        await loadAccountsData(); // 加载账号数据
        loadCustomPlatforms();
        initCharCounters();
        setupProxyHostParser();
        setupProxyMethodToggle();
        initializeFingerprintGenerator();
        enhanceInputFocus(); // 输入框焦点增强
        initializeInputEvents(); // 初始化输入框事件
        
        console.log('✅ 基础功能初始化完成');
        
        // 异步等待electronAPI并初始化相关功能
        initializeElectronFeatures();
    }, 100);
});

// ===========================================
// 抓取内容展示控制功能
// ===========================================

// 刷新抓取内容展示
function refreshScrapedContent() {
    console.log('🔄 刷新抓取内容展示...');
    const displayContainer = document.getElementById('scraped-content-display');
    if (!displayContainer) return;
    
    // 如果有存储的抓取数据，直接显示
    if (window.scrapedContentData && window.scrapedContentData.length > 0) {
        displayScrapedContent(window.scrapedContentData);
    } else {
        // 显示空状态
        displayContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h4>暂无抓取内容</h4>
                <p>请点击"开始抓取"按钮启动内容抓取，或等待自动抓取完成</p>
            </div>
        `;
    }
}

// 排序抓取内容
function sortScrapedContent() {
    const sortType = document.getElementById('scraped-sort-select').value;
    if (!window.scrapedContentData) return;
    
    let sortedData = [...window.scrapedContentData];
    
    switch(sortType) {
        case 'time':
            sortedData.sort((a, b) => {
                const timeA = new Date(a.publishTime || 0);
                const timeB = new Date(b.publishTime || 0);
                return timeB - timeA;
            });
            break;
        case 'likes':
            sortedData.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'comments':
            sortedData.sort((a, b) => (b.comments || 0) - (a.comments || 0));
            break;
        case 'explosive':
            sortedData.sort((a, b) => {
                const scoreA = a.explosiveScore || Math.floor(Math.random() * 40) + 50;
                const scoreB = b.explosiveScore || Math.floor(Math.random() * 40) + 50;
                return scoreB - scoreA;
            });
            break;
    }
    
    window.scrapedContentData = sortedData;
    displayScrapedContent(sortedData);
    showNotification(`已按${getSortTypeText(sortType)}排序`, 'success');
}

// 获取排序类型文本
function getSortTypeText(sortType) {
    const sortTexts = {
        'time': '时间',
        'likes': '点赞数',
        'comments': '评论数',
        'explosive': '爆款指数'
    };
    return sortTexts[sortType] || '默认';
}

// 过滤抓取内容
function filterScrapedContent() {
    const filterType = document.getElementById('scraped-type-filter').value;
    if (!window.scrapedContentData) return;
    
    let filteredData = window.scrapedContentData;
    
    if (filterType !== 'all') {
        filteredData = window.scrapedContentData.filter(item => 
            item.contentType === filterType
        );
    }
    
    displayScrapedContent(filteredData);
    showNotification(`已筛选${filterType === 'all' ? '全部' : filterType}类型内容`, 'success');
}

// 批量分析内容
function batchAnalyzeContent() {
    if (!window.scrapedContentData || window.scrapedContentData.length === 0) {
        showNotification('暂无内容可分析', 'warning');
        return;
    }
    
    showNotification('🔄 开始批量分析抓取内容...', 'info');
    
    // 这里可以添加批量分析逻辑
    // 比如提取所有内容的关键词、情感词等
    let analysisResults = [];
    
    window.scrapedContentData.forEach((item, index) => {
        // 模拟分析过程
        const keywords = extractKeywords(item.fullContent || item.content || item.title);
        const sentiment = analyzeSentiment(item.fullContent || item.content || item.title);
        
        analysisResults.push({
            index: index + 1,
            title: item.title,
            keywords: keywords,
            sentiment: sentiment,
            explosiveScore: item.explosiveScore || Math.floor(Math.random() * 40) + 50
        });
    });
    
    // 显示分析结果
    setTimeout(() => {
        showBatchAnalysisResults(analysisResults);
        showNotification('✅ 批量分析完成！', 'success');
    }, 2000);
}

// 简单的关键词提取
function extractKeywords(text) {
    if (!text) return [];
    
    // 简单的关键词提取逻辑
    const keywords = text
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(word => word.length > 1)
        .slice(0, 5);
    
    return keywords;
}

// 简单的情感分析
function analyzeSentiment(text) {
    if (!text) return '中性';
    
    const positiveWords = ['好', '棒', '赞', '喜欢', '爱', '美', '优秀', '完美', '满意'];
    const negativeWords = ['坏', '差', '糟', '讨厌', '恨', '丑', '失望', '生气'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return '积极';
    if (negativeCount > positiveCount) return '消极';
    return '中性';
}

// 显示批量分析结果
function showBatchAnalysisResults(results) {
    const modal = document.createElement('div');
    modal.className = 'analysis-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeBatchAnalysisModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>📊 批量分析结果</h3>
                <button onclick="closeBatchAnalysisModal()" class="modal-close">×</button>
            </div>
            <div class="modal-body">
                <div class="analysis-results-grid">
                    ${results.map(result => `
                        <div class="analysis-result-card">
                            <h4>#${result.index} ${result.title}</h4>
                            <div class="result-details">
                                <div class="keywords">
                                    <strong>关键词:</strong> ${result.keywords.join(', ') || '暂无'}
                                </div>
                                <div class="sentiment">
                                    <strong>情感倾向:</strong> 
                                    <span class="sentiment-${result.sentiment}">${result.sentiment}</span>
                                </div>
                                <div class="score">
                                    <strong>爆款指数:</strong> 
                                    <span class="explosive-score ${result.explosiveScore >= 80 ? 'high' : result.explosiveScore >= 60 ? 'medium' : 'low'}">
                                        ${result.explosiveScore}/100
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="exportAnalysisResults()" class="btn-primary">导出结果</button>
                <button onclick="closeBatchAnalysisModal()" class="btn-secondary">关闭</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 存储分析结果
    window.batchAnalysisResults = results;
}

// 关闭批量分析模态框
function closeBatchAnalysisModal() {
    const modal = document.querySelector('.analysis-modal');
    if (modal) {
        modal.remove();
    }
}

// 导出分析结果
function exportAnalysisResults() {
    if (!window.batchAnalysisResults) return;
    
    const csvContent = "序号,标题,关键词,情感倾向,爆款指数\n" + 
        window.batchAnalysisResults.map(result => 
            `${result.index},"${result.title}","${result.keywords.join(';')}",${result.sentiment},${result.explosiveScore}`
        ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `抓取内容分析结果_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('✅ 分析结果已导出', 'success');
}

// 切换抓取区域显示/隐藏
function toggleScrapedSection() {
    const scrapedSection = document.getElementById('scraped-content-section');
    const toggleText = document.getElementById('toggle-scraped-text');
    const contentDisplay = scrapedSection.querySelector('.scraped-content-display');
    const filters = scrapedSection.querySelector('.scraped-filters');
    
    if (contentDisplay.style.display === 'none') {
        contentDisplay.style.display = 'block';
        filters.style.display = 'flex';
        toggleText.textContent = '折叠';
    } else {
        contentDisplay.style.display = 'none';
        filters.style.display = 'none';
        toggleText.textContent = '展开';
    }
}

// 处理添加到拆解的点击事件
function handleAddToAnalysis(index) {
    if (!window.scrapedContentData) {
        showNotification('没有可用的内容数据', 'error');
        return;
    }
    
    const startIndex = (currentScrapedPage - 1) * itemsPerPage;
    const item = window.scrapedContentData[startIndex + index];
    
    if (!item) {
        showNotification('找不到指定的内容项', 'error');
        return;
    }
    
    const title = item.title || '';
    const content = item.fullContent || item.content || '';
    
    console.log('添加到拆解:', { title, content, index }); // 调试日志
    
    addToManualAnalysis(title, content);
}

// 添加内容到手动拆解
function addToManualAnalysis(title, content) {
    console.log('addToManualAnalysis called:', { title, content }); // 调试日志
    
    // 找到第一个空的文案输入框
    for (let i = 1; i <= 3; i++) {
        const textarea = document.getElementById(`text-input-${i}`);
        console.log(`检查文案输入框 ${i}:`, textarea, textarea ? textarea.value : 'null'); // 调试日志
        
        if (textarea && !textarea.value.trim()) {
            textarea.value = content;
            console.log(`已将内容添加到文案输入框 ${i}`); // 调试日志
            showNotification(`已将"${title}"添加到爆款文案 ${i}`, 'success');
            
            // 滚动到文案输入区域
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }
    
    // 如果没有空的输入框，添加新的
    console.log('所有输入框都有内容，添加新的输入框'); // 调试日志
    addMoreText();
    setTimeout(() => {
        const textInputs = document.querySelectorAll('[id^="text-input-"]');
        const lastInput = textInputs[textInputs.length - 1];
        console.log('新添加的输入框:', lastInput); // 调试日志
        if (lastInput) {
            lastInput.value = content;
            lastInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showNotification(`已将"${title}"添加到新的文案输入框`, 'success');
        } else {
            console.error('无法找到新添加的输入框'); // 调试日志
        }
    }, 100);
}

// 分页控制功能
let currentScrapedPage = 1;
const itemsPerPage = 6;

function goToScrapedPage(direction) {
    if (!window.scrapedContentData) return;
    
    const totalPages = Math.ceil(window.scrapedContentData.length / itemsPerPage);
    
    if (direction === 'prev' && currentScrapedPage > 1) {
        currentScrapedPage--;
    } else if (direction === 'next' && currentScrapedPage < totalPages) {
        currentScrapedPage++;
    }
    
    // 更新分页显示
    document.getElementById('current-scraped-page').textContent = currentScrapedPage;
    document.getElementById('total-scraped-pages').textContent = totalPages;
    
    // 显示对应页面的内容
    const startIndex = (currentScrapedPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = window.scrapedContentData.slice(startIndex, endIndex);
    
    displayScrapedContent(pageData);
}

// ===========================================
// 异步初始化Electron相关功能
// ===========================================

// 异步初始化Electron相关功能
async function initializeElectronFeatures() {
    try {
        console.log('⏳ 等待electronAPI初始化...');
        
        // 等待API就绪，设置较长的超时时间
        const apiReady = await waitForElectronAPI([], 30, 1000);
        
        if (apiReady) {
            console.log('✅ electronAPI初始化成功，启用高级功能');
            
            // 初始化需要API的功能
            if (window.electronAPI.getChromePath) {
                detectChromePath();
            }
            
            // 启动浏览器状态监控
            if (window.electronAPI.getRunningBrowsers) {
                refreshBrowserStatus();
                // 设置定期刷新
                setInterval(refreshBrowserStatus, 30000);
            }
        } else {
            console.warn('⚠️ electronAPI初始化超时，部分功能将不可用');
            console.log('💡 提示：如果您在Electron环境中运行，请检查preload.js是否正确配置');
        }
    } catch (error) {
        console.error('❌ electronAPI初始化失败:', error);
    }
}

// ===========================================
// 新增的electronAPI工具函数
// ===========================================

// Shell工具函数
async function openInBrowser(url) {
    try {
        const apiReady = await waitForElectronAPI(['openExternal']);
        if (!apiReady) {
            console.warn('openExternal API不可用');
            return false;
        }
        
        const result = await window.electronAPI.openExternal(url);
        if (result.success) {
            showNotification(`已在浏览器中打开: ${url}`, 'success');
            return true;
        } else {
            showNotification(`打开链接失败: ${result.error}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('打开外部链接失败:', error);
        showNotification('打开链接失败', 'error');
        return false;
    }
}

async function openFolder(path) {
    try {
        const apiReady = await waitForElectronAPI(['openPath']);
        if (!apiReady) {
            console.warn('openPath API不可用');
            return false;
        }
        
        const result = await window.electronAPI.openPath(path);
        if (result.success && !result.error) {
            showNotification(`已打开文件夹: ${path}`, 'success');
            return true;
        } else {
            showNotification(`打开文件夹失败: ${result.error}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('打开文件夹失败:', error);
        showNotification('打开文件夹失败', 'error');
        return false;
    }
}

async function showInFolder(path) {
    try {
        const apiReady = await waitForElectronAPI(['showItemInFolder']);
        if (!apiReady) {
            console.warn('showItemInFolder API不可用');
            return false;
        }
        
        const result = await window.electronAPI.showItemInFolder(path);
        if (result.success) {
            showNotification(`已在文件夹中显示: ${path}`, 'success');
            return true;
        } else {
            showNotification(`显示文件失败: ${result.error}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('显示文件失败:', error);
        showNotification('显示文件失败', 'error');
        return false;
    }
}

async function deleteToTrash(path) {
    try {
        const apiReady = await waitForElectronAPI(['trashItem']);
        if (!apiReady) {
            console.warn('trashItem API不可用');
            return false;
        }
        
        // 先确认删除
        const confirmed = await showConfirmDialog(
            '确认删除',
            `确定要将以下项目移动到回收站吗？\n\n${path}`,
            '删除',
            '取消'
        );
        
        if (!confirmed) return false;
        
        const result = await window.electronAPI.trashItem(path);
        if (result.success) {
            showNotification(`已删除到回收站: ${path}`, 'success');
            return true;
        } else {
            showNotification(`删除失败: ${result.error}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('删除文件失败:', error);
        showNotification('删除文件失败', 'error');
        return false;
    }
}

// 剪贴板工具函数
async function copyToClipboard(text) {
    try {
        const apiReady = await waitForElectronAPI(['writeText']);
        if (!apiReady) {
            console.warn('writeText API不可用');
            return false;
        }
        
        const result = await window.electronAPI.writeText(text);
        if (result.success) {
            showNotification('已复制到剪贴板', 'success');
            return true;
        } else {
            showNotification(`复制失败: ${result.error}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('复制到剪贴板失败:', error);
        showNotification('复制失败', 'error');
        return false;
    }
}

async function pasteFromClipboard() {
    try {
        const apiReady = await waitForElectronAPI(['readText']);
        if (!apiReady) {
            console.warn('readText API不可用');
            return '';
        }
        
        const result = await window.electronAPI.readText();
        if (result.success) {
            return result.text;
        } else {
            console.warn('读取剪贴板失败:', result.error);
            return '';
        }
    } catch (error) {
        console.error('读取剪贴板失败:', error);
        return '';
    }
}

// 对话框工具函数
async function showConfirmDialog(title, message, confirmText = '确定', cancelText = '取消') {
    try {
        const apiReady = await waitForElectronAPI(['showMessageBox']);
        if (!apiReady) {
            console.warn('showMessageBox API不可用');
            return false;
        }
        
        const result = await window.electronAPI.showMessageBox({
            type: 'question',
            title: title,
            message: message,
            buttons: [confirmText, cancelText],
            defaultId: 0,
            cancelId: 1
        });
        
        return result.response === 0;
    } catch (error) {
        console.error('显示确认对话框失败:', error);
        return false;
    }
}

async function showInfoDialog(title, message) {
    try {
        const apiReady = await waitForElectronAPI(['showMessageBox']);
        if (!apiReady) {
            console.warn('showMessageBox API不可用');
            return;
        }
        
        await window.electronAPI.showMessageBox({
            type: 'info',
            title: title,
            message: message,
            buttons: ['确定']
        });
    } catch (error) {
        console.error('显示信息对话框失败:', error);
    }
}

async function showErrorDialog(title, message) {
    try {
        const apiReady = await waitForElectronAPI(['showErrorBox']);
        if (!apiReady) {
            console.warn('showErrorBox API不可用');
            return;
        }
        
        await window.electronAPI.showErrorBox(title, message);
    } catch (error) {
        console.error('显示错误对话框失败:', error);
    }
}

// 应用信息工具函数
async function getAppInfo() {
    try {
        const apiReady = await waitForElectronAPI(['getAppVersion', 'getAppName']);
        if (!apiReady) {
            console.warn('应用信息API不可用');
            return { name: 'Unknown', version: 'Unknown' };
        }
        
        const [nameResult, versionResult] = await Promise.all([
            window.electronAPI.getAppName(),
            window.electronAPI.getAppVersion()
        ]);
        
        return {
            name: nameResult.success ? nameResult.name : 'Unknown',
            version: versionResult.success ? versionResult.version : 'Unknown'
        };
    } catch (error) {
        console.error('获取应用信息失败:', error);
        return { name: 'Unknown', version: 'Unknown' };
    }
}

// 窗口控制工具函数
async function minimizeApp() {
    try {
        const apiReady = await waitForElectronAPI(['minimizeWindow']);
        if (!apiReady) {
            console.warn('minimizeWindow API不可用');
            return false;
        }
        
        const result = await window.electronAPI.minimizeWindow();
        return result.success;
    } catch (error) {
        console.error('最小化窗口失败:', error);
        return false;
    }
}

async function maximizeApp() {
    try {
        const apiReady = await waitForElectronAPI(['maximizeWindow']);
        if (!apiReady) {
            console.warn('maximizeWindow API不可用');
            return false;
        }
        
        const result = await window.electronAPI.maximizeWindow();
        return result.success;
    } catch (error) {
        console.error('最大化窗口失败:', error);
        return false;
    }
}

// 文件选择工具函数
async function selectFile(options = {}) {
    try {
        const apiReady = await waitForElectronAPI(['showOpenDialog']);
        if (!apiReady) {
            console.warn('showOpenDialog API不可用');
            return null;
        }
        
        const defaultOptions = {
            properties: ['openFile'],
            filters: [
                { name: '所有文件', extensions: ['*'] }
            ]
        };
        
        const result = await window.electronAPI.showOpenDialog({
            ...defaultOptions,
            ...options
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    } catch (error) {
        console.error('选择文件失败:', error);
        return null;
    }
}

async function selectFolder() {
    try {
        const apiReady = await waitForElectronAPI(['showOpenDialog']);
        if (!apiReady) {
            console.warn('showOpenDialog API不可用');
            return null;
        }
        
        const result = await window.electronAPI.showOpenDialog({
            properties: ['openDirectory']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    } catch (error) {
        console.error('选择文件夹失败:', error);
        return null;
    }
}

// ==================== 通知管理功能 ====================

// 通知管理相关变量
let notificationAccounts = [];
let selectedNotificationAccounts = [];
let notificationFetchResults = [];
let isNotificationFetching = false;
let notificationFetchProgress = 0;

// 初始化通知管理
async function initializeNotificationManagement() {
    await loadNotificationAccounts();
    restoreNotificationAccountSelection();
    renderNotificationAccountGrid();
    setupNotificationEventListeners();
}

// 加载通知管理账号数据
async function loadNotificationAccounts() {
    try {
        // 优先尝试从主进程获取账号数据
        if (window.electronAPI && window.electronAPI.loadAccountsData) {
            const result = await window.electronAPI.loadAccountsData();
            if (result.success && result.data.length > 0) {
                notificationAccounts = result.data.map(account => ({
                    ...account,
                    selected: false
                }));
                console.log('通知管理：从文件系统加载账号数据成功');
                return;
            }
        }
        
        // 降级到localStorage
        const accountsDataString = localStorage.getItem('accountsData');
        if (accountsDataString) {
            const accounts = JSON.parse(accountsDataString);
            notificationAccounts = accounts.map(account => ({
                ...account,
                selected: false
            }));
            console.log('通知管理：从localStorage加载账号数据成功');
        } else {
            notificationAccounts = [];
            console.log('通知管理：无账号数据');
        }
    } catch (error) {
        console.error('通知管理：加载账号数据失败:', error);
        notificationAccounts = [];
    }
}

// 渲染通知管理账号选择网格
function renderNotificationAccountGrid() {
    const grid = document.getElementById('notification-account-grid');
    if (!grid) return;
    
    if (notificationAccounts.length === 0) {
        grid.innerHTML = '<div class="empty-tip">暂无账号数据，请先在账号管理中创建账号</div>';
        return;
    }
    
    grid.innerHTML = notificationAccounts.map(account => `
        <div class="account-selection-card ${account.selected ? 'selected' : ''}" 
             onclick="toggleNotificationAccountSelection('${account.id}')">
            <div class="card-header">
                <span class="account-name">${account.windowName || '未命名账号'}</span>
                <input type="checkbox" class="selection-checkbox" 
                       ${account.selected ? 'checked' : ''} 
                       onclick="event.stopPropagation()"
                       onchange="toggleNotificationAccountSelection('${account.id}')">
            </div>
            <div class="card-content">
                <div class="account-info">
                    <span class="platform-badge ${getPlatformClass(account.platform)}">
                        ${getPlatformDisplayName(account.platform)}
                    </span>
                    <span>${account.group || '未分组'}</span>
                </div>
                <div class="account-info">
                    <span>${account.note || '无备注'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 获取平台CSS类名
function getPlatformClass(platform) {
    const platformMap = {
        'xiaohongshu.com': 'xiaohongshu',
        'douyin.com': 'douyin',
        'weibo.com': 'weibo'
    };
    return platformMap[platform] || 'default';
}

// 获取平台显示名称
function getPlatformDisplayName(platform) {
    const platformMap = {
        'xiaohongshu.com': '小红书',
        'douyin.com': '抖音',
        'weibo.com': '微博'
    };
    return platformMap[platform] || platform;
}

// 切换账号选择状态
function toggleNotificationAccountSelection(accountId) {
    const normalizedId = typeof accountId === 'string' && !Number.isNaN(Number(accountId))
        ? Number(accountId)
        : accountId;
    const account = notificationAccounts.find(acc => acc.id === normalizedId || acc.id === accountId);
    if (!account) return;
    account.selected = !account.selected;
    if (account.selected) {
        if (!selectedNotificationAccounts.some(acc => acc.id === account.id)) {
            selectedNotificationAccounts.push(account);
        }
    } else {
        selectedNotificationAccounts = selectedNotificationAccounts.filter(acc => acc.id !== account.id);
    }
    // 保存选择状态到localStorage
    saveNotificationAccountSelection();
    renderNotificationAccountGrid();
}

// 保存通知管理账号选择状态
function saveNotificationAccountSelection() {
    try {
        const selectedIds = selectedNotificationAccounts.map(acc => acc.id);
        localStorage.setItem('notificationSelectedAccounts', JSON.stringify(selectedIds));
        console.log('通知管理：账号选择状态已保存');
    } catch (error) {
        console.error('通知管理：保存账号选择状态失败:', error);
    }
}

// 恢复通知管理账号选择状态
function restoreNotificationAccountSelection() {
    try {
        const savedSelection = localStorage.getItem('notificationSelectedAccounts');
        if (savedSelection) {
            const selectedIds = JSON.parse(savedSelection);
            selectedNotificationAccounts = [];
            
            notificationAccounts.forEach(account => {
                if (selectedIds.includes(account.id)) {
                    account.selected = true;
                    selectedNotificationAccounts.push(account);
                } else {
                    account.selected = false;
                }
            });
            
            console.log('通知管理：恢复账号选择状态，选中', selectedNotificationAccounts.length, '个账号');
        }
    } catch (error) {
        console.error('通知管理：恢复账号选择状态失败:', error);
    }
}

// 全选通知管理账号
function selectAllNotificationAccounts() {
    notificationAccounts.forEach(account => {
        account.selected = true;
    });
    selectedNotificationAccounts = [...notificationAccounts];
    saveNotificationAccountSelection();
    renderNotificationAccountGrid();
}

// 清空通知管理账号选择
function clearNotificationAccountSelection() {
    notificationAccounts.forEach(account => {
        account.selected = false;
    });
    selectedNotificationAccounts = [];
    saveNotificationAccountSelection();
    renderNotificationAccountGrid();
}

// 过滤通知管理账号
function filterNotificationAccounts() {
    const groupFilter = document.getElementById('notification-group-filter').value;
    const platformFilter = document.getElementById('notification-platform-filter').value;
    const searchTerm = document.querySelector('#notification-account-grid').previousElementSibling?.querySelector('input')?.value || '';
    
    const filteredAccounts = notificationAccounts.filter(account => {
        const matchesGroup = !groupFilter || account.group === groupFilter;
        const matchesPlatform = !platformFilter || account.platform === platformFilter;
        const matchesSearch = !searchTerm || 
            account.windowName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.note?.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesGroup && matchesPlatform && matchesSearch;
    });
    
    renderFilteredNotificationAccounts(filteredAccounts);
}

// 渲染过滤后的账号
function renderFilteredNotificationAccounts(filteredAccounts) {
    const grid = document.getElementById('notification-account-grid');
    if (!grid) return;
    
    if (filteredAccounts.length === 0) {
        grid.innerHTML = '<div class="empty-tip">没有找到匹配的账号</div>';
        return;
    }
    
    grid.innerHTML = filteredAccounts.map(account => `
        <div class="account-selection-card ${account.selected ? 'selected' : ''}" 
             onclick="toggleNotificationAccountSelection('${account.id}')">
            <div class="card-header">
                <span class="account-name">${account.windowName || '未命名账号'}</span>
                <input type="checkbox" class="selection-checkbox" 
                       ${account.selected ? 'checked' : ''} 
                       onclick="event.stopPropagation()"
                       onchange="toggleNotificationAccountSelection('${account.id}')">
            </div>
            <div class="card-content">
                <div class="account-info">
                    <span class="platform-badge ${getPlatformClass(account.platform)}">
                        ${getPlatformDisplayName(account.platform)}
                    </span>
                    <span>${account.group || '未分组'}</span>
                </div>
                <div class="account-info">
                    <span>${account.note || '无备注'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 搜索通知管理账号
function searchNotificationAccounts(searchTerm) {
    filterNotificationAccounts();
}

// 切换自定义时间范围显示
function toggleCustomTimeRange() {
    const timeRange = document.getElementById('fetch-time-range').value;
    const customRange = document.getElementById('custom-time-range');
    
    if (timeRange === 'custom') {
        customRange.style.display = 'block';
    } else {
        customRange.style.display = 'none';
    }
}

// 开始获取通知数据
async function startNotificationDataFetch() {
    if (selectedNotificationAccounts.length === 0) {
        showNotification('请先选择要获取数据的账号', 'warning');
        return;
    }
    
    const fetchSettings = getNotificationFetchSettings();
    if (!validateNotificationFetchSettings(fetchSettings)) {
        return;
    }
    
    isNotificationFetching = true;
    notificationFetchProgress = 0;
    notificationFetchResults = [];
    
    // 显示进度区域
    document.getElementById('fetch-progress-section').style.display = 'block';
    document.getElementById('data-results-section').style.display = 'none';
    
    // 重置进度
    updateNotificationProgress(0, selectedNotificationAccounts.length);
    updateNotificationStatus(0, 0, 0);
    clearFetchLog();
    appendFetchLog(`准备开始获取，账号数量：${selectedNotificationAccounts.length}`, 'info');
    
    try {
        // 第一步：为每个选中的账号打开浏览器并跳转到小红书
        updateProgressText('正在打开浏览器窗口...');
        appendFetchLog('开始为选中账号逐一打开浏览器窗口', 'info');
        
        for (let i = 0; i < selectedNotificationAccounts.length; i++) {
            if (!isNotificationFetching) break;
            
            const account = selectedNotificationAccounts[i];
            updateProgressText(`正在打开 ${account.windowName} 的浏览器...`);
            appendFetchLog(`打开浏览器：${account.windowName}`, 'info');
            
            try {
                // 等待API就绪
                const apiReady = await waitForElectronAPI();
                if (!apiReady) {
                    console.error('Electron API未就绪，跳过账号:', account.windowName);
                    appendFetchLog(`Electron API 未就绪，跳过：${account.windowName}`, 'warning');
                    continue;
                }
                
                // 检查是否已经在运行
                const isRunning = await window.electronAPI.isBrowserRunning(account.id);
                if (isRunning) {
                    console.log(`账号 ${account.windowName} 浏览器已在运行，继续使用现有窗口`);
                    appendFetchLog(`浏览器已在运行，继续使用现有窗口：${account.windowName}`, 'info');
                    continue;
                }
                
                // 如果是第一个账号，先打开百度窗口（使用Chrome）
                let shouldLaunchXHS = true;
                if (i === 0) {
                    const baiduUrl = 'https://www.baidu.com/';
                    appendFetchLog(`第一个账号先打开百度窗口：${account.windowName}`, 'info');
                    try {
                        // 使用launchBrowser在Chrome中打开百度页面
                        const baiduWindowConfig = buildWindowConfig(account, i);
                        // 调整窗口位置避免与小红书窗口重叠
                        baiduWindowConfig.x = baiduWindowConfig.x - 400;
                        
                        const baiduResult = await window.electronAPI.launchBrowser(account, baiduUrl, { 
                            windowConfig: baiduWindowConfig,
                            headless: fetchSettings.headlessMode 
                        });
                        
                        if (baiduResult.success) {
                            appendFetchLog(`百度窗口已在Chrome中打开：${account.windowName}（PID: ${baiduResult.pid}）`, 'success');
                            // 稍等片刻，确保百度窗口完全加载
                            await delay(1500);

                            // 在同一窗口中导航到小红书，避免再次启动导致“已在运行”错误
                            const xiaohongshuUrl = 'https://www.xiaohongshu.com/';
                            appendFetchLog(`开始在已打开窗口中导航到小红书：${account.windowName}`, 'info');
                            try {
                                // 确保 navigateToUrl 可用
                                await waitForElectronAPI(['navigateToUrl']);
                                const nav = await window.electronAPI.navigateToUrl(account.id, xiaohongshuUrl);
                                if (nav && nav.success) {
                                    // 额外等待关键元素，确保页面完全渲染
                                    await delay(1500);
                                    appendFetchLog(`已导航到小红书页面：${account.windowName}`, 'success');
                                    shouldLaunchXHS = false;
                                } else {
                                    throw new Error((nav && nav.error) || '未知错误');
                                }
                            } catch (navErr) {
                                appendFetchLog(`在已打开窗口中导航到小红书失败：${account.windowName}（${navErr && navErr.message ? navErr.message : navErr}）`, 'warning');
                                shouldLaunchXHS = false;
                            }
                        } else {
                            throw new Error(baiduResult.error || '打开失败');
                        }
                    } catch (e) {
                        appendFetchLog(`打开百度窗口失败：${account.windowName}（${e && e.message ? e.message : e}）`, 'warning');
                        // 如果打开百度失败，则仍然走下面的正常小红书启动流程
                        shouldLaunchXHS = true;
                    }
                }
                
                // 非首个账号或首个账号百度步骤失败时，正常启动并直达小红书
                if (i !== 0 || shouldLaunchXHS) {
                    const xiaohongshuUrl = 'https://www.xiaohongshu.com/';
                    const windowConfig = buildWindowConfig(account, i);
                    const result = await window.electronAPI.launchBrowser(account, xiaohongshuUrl, { 
                        windowConfig,
                        headless: fetchSettings.headlessMode 
                    });
                    if (result.success) {
                        console.log(`账号 ${account.windowName} 浏览器已启动，PID: ${result.pid}`);
                        await delay(2000);
                        appendFetchLog(`浏览器已启动：${account.windowName}（PID: ${result.pid}）`, 'success');
                    } else {
                        console.error(`账号 ${account.windowName} 浏览器启动失败:`, result.error);
                        appendFetchLog(`浏览器启动失败：${account.windowName}（${result.error}）`, 'error');
                    }
                }
                
            } catch (error) {
                console.error(`打开账号 ${account.windowName} 浏览器失败:`, error);
                appendFetchLog(`打开浏览器失败：${account.windowName}（${error && error.message ? error.message : error}）`, 'error');
            }
            
            // 添加延迟避免过于频繁
            if (i < selectedNotificationAccounts.length - 1) {
                await delay(1000);
            }
        }
        
        // 第二步：开始获取数据（含小红书通知与评论采集）
        updateProgressText('浏览器窗口已打开，开始获取数据...');
        appendFetchLog('开始采集通知与评论数据', 'info');
        
        for (let i = 0; i < selectedNotificationAccounts.length; i++) {
            if (!isNotificationFetching) break;
            
            const account = selectedNotificationAccounts[i];
            updateNotificationProgress(i + 1, selectedNotificationAccounts.length);
            updateProgressText(`正在获取 ${account.windowName} 的数据...`);
            appendFetchLog(`开始采集：${account.windowName}`, 'info');
            
            try {
                let result;
                // 统一采集小红书通知红点与评论（所有平台）
                updateProgressText(`正在采集通知数据：${account.windowName}...`);
                appendFetchLog(`开始采集通知数据：${account.windowName}`, 'info');
                
                // 准备采集选项
                const collectionOptions = {
                    collectCommentDetails: fetchSettings.collectCommentDetails,
                    collectLikesRedDot: fetchSettings.collectLikesRedDot,
                    collectFollowRedDot: fetchSettings.collectFollowRedDot
                };
                
                const collect = await window.electronAPI.collectXhsNotifications(account.id, collectionOptions);
                if (!collect || collect.success === false) {
                    throw new Error(collect && collect.error ? collect.error : '采集失败');
                }
                
                // 更详细的日志输出
                appendFetchLog(`首页红点检测完成：${account.windowName} ｜ 总红点 ${Number(collect.redDotCount) || 0}`, 'success');
                if (collect.tabRedDots) {
                    appendFetchLog(`选项卡红点：评论 ${collect.tabRedDots.comment || 0} | 赞收藏 ${collect.tabRedDots.like || 0} | 新关注 ${collect.tabRedDots.follow || 0}`, 'info');
                }
                if (fetchSettings.collectCommentDetails) {
                    appendFetchLog(`评论详情采集完成：${account.windowName} ｜ 评论 ${Array.isArray(collect.comments) ? collect.comments.length : 0}`, 'success');
                }
                // 将采集数据整合到现有结果结构中
                result = {
                    accountId: account.id,
                    accountName: account.windowName,
                    platform: account.platform,
                    fetchTime: new Date().toISOString(),
                    status: 'success',
                    data: {
                        // 使用新的红点数据
                        likes: collect.tabRedDots ? collect.tabRedDots.like : 0,
                        comments: Array.isArray(collect.comments) ? collect.comments.length : 0,
                        follows: collect.tabRedDots ? collect.tabRedDots.follow : 0  // 新增关注数据
                    },
                    meta: {
                        redDotCount: (collect.tabRedDots ? 
                            (collect.tabRedDots.like || 0) + 
                            (collect.tabRedDots.comment || 0) + 
                            (collect.tabRedDots.follow || 0) : 0),
                        comments: collect.comments || [],
                        // 新增的分层数据
                        tabRedDots: collect.tabRedDots || { comment: 0, like: 0, follow: 0 },
                        collectionOptions: collect.collectionOptions || {}
                    }
                };
                notificationFetchResults.push(result);
                updateNotificationStatus(
                    document.getElementById('success-count').textContent * 1 + 1,
                    document.getElementById('error-count').textContent * 1,
                    document.getElementById('skip-count').textContent * 1
                );
            } catch (error) {
                console.error(`获取账号 ${account.windowName} 数据失败:`, error);
                appendFetchLog(`采集失败：${account.windowName}（${error && error.message ? error.message : error}）`, 'error');
                updateNotificationStatus(
                    document.getElementById('success-count').textContent * 1,
                    document.getElementById('error-count').textContent * 1 + 1,
                    document.getElementById('skip-count').textContent * 1
                );
            }
            
            // 添加延迟避免请求过于频繁
            if (i < selectedNotificationAccounts.length - 1) {
                await delay(fetchSettings.interval * 1000);
            }
        }
        
        if (isNotificationFetching) {
            showNotification('数据获取完成', 'success');
            appendFetchLog('数据获取完成', 'success');
            displayNotificationResults();
            
            // 自动关闭所有用于通知管理的浏览器
            appendFetchLog('数据获取完成，正在自动关闭浏览器...', 'info');
            setTimeout(async () => {
                try {
                    // 获取所有用于通知管理的账号ID
                    const accountIds = selectedNotificationAccounts.map(account => account.id);
                    
                    // 逐个关闭浏览器
                    for (const accountId of accountIds) {
                        try {
                            const account = selectedNotificationAccounts.find(acc => acc.id === accountId);
                            appendFetchLog(`正在关闭浏览器：${account?.windowName || accountId}`, 'info');
                            const closeResult = await window.electronAPI.closeBrowser(accountId);
                            if (closeResult.success) {
                                appendFetchLog(`已关闭浏览器：${account?.windowName || accountId}`, 'success');
                            } else {
                                appendFetchLog(`关闭浏览器失败：${account?.windowName || accountId}（${closeResult.message}）`, 'error');
                            }
                        } catch (error) {
                            appendFetchLog(`关闭浏览器异常：${accountId}（${error.message}）`, 'error');
                        }
                    }
                    
                    showNotification('自动关闭浏览器完成', 'success');
                    appendFetchLog('自动关闭浏览器完成', 'success');
                } catch (error) {
                    console.error('自动关闭浏览器失败:', error);
                    showNotification('自动关闭浏览器失败: ' + error.message, 'error');
                    appendFetchLog(`自动关闭浏览器失败：${error.message}`, 'error');
                }
            }, 2000); // 延迟2秒关闭，确保数据获取流程完全完成
        }
    } catch (error) {
        console.error('获取通知数据失败:', error);
        showNotification('获取数据时发生错误', 'error');
        appendFetchLog(`获取数据时发生错误：${error && error.message ? error.message : error}`, 'error');
    } finally {
        isNotificationFetching = false;
    }
}

// 获取通知获取设置
function getNotificationFetchSettings() {
    return {
        // 新的分层采集设置
        collectCommentDetails: document.getElementById('fetch-comment-details').checked,
        collectLikesRedDot: document.getElementById('fetch-likes-reddot').checked,
        collectFollowRedDot: document.getElementById('fetch-follow-reddot').checked,
        // 运行模式设置（使用全局无头模式设置）
        headlessMode: typeof window.isHeadlessMode !== 'undefined' ? window.isHeadlessMode : false,
        // 保持向后兼容的旧设置（用于其他功能）
        fetchLikes: document.getElementById('fetch-likes-reddot') ? document.getElementById('fetch-likes-reddot').checked : true,
        fetchComments: document.getElementById('fetch-comment-details') ? document.getElementById('fetch-comment-details').checked : true,
        fetchFavorites: document.getElementById('fetch-likes-reddot') ? document.getElementById('fetch-likes-reddot').checked : true,
        timeRange: document.getElementById('fetch-time-range').value,
        startDate: document.getElementById('start-date').value,
        endDate: document.getElementById('end-date').value,
        interval: parseInt(document.getElementById('fetch-interval').value) || 5,
        maxRetries: parseInt(document.getElementById('max-retries').value) || 3
    };
}

// 验证通知获取设置
function validateNotificationFetchSettings(settings) {
    // 检查新的分层采集设置
    if (!settings.collectCommentDetails && !settings.collectLikesRedDot && !settings.collectFollowRedDot) {
        showNotification('请至少选择一种获取类型', 'warning');
        return false;
    }
    
    if (settings.timeRange === 'custom') {
        if (!settings.startDate || !settings.endDate) {
            showNotification('请选择自定义时间范围', 'warning');
            return false;
        }
        
        if (new Date(settings.startDate) > new Date(settings.endDate)) {
            showNotification('开始日期不能晚于结束日期', 'warning');
            return false;
        }
    }
    
    return true;
}

// 获取账号通知数据（模拟实现）
async function fetchAccountNotificationData(account, settings) {
    // 这里是模拟实现，实际应该调用真实的API
    await delay(1000 + Math.random() * 2000); // 模拟网络延迟
    
    const result = {
        accountId: account.id,
        accountName: account.windowName,
        platform: account.platform,
        fetchTime: new Date().toISOString(),
        status: 'success',
        data: {
            likes: settings.fetchLikes ? Math.floor(Math.random() * 1000) : 0,
            comments: settings.fetchComments ? Math.floor(Math.random() * 500) : 0,
            favorites: settings.fetchFavorites ? Math.floor(Math.random() * 200) : 0
        }
    };
    
    // 模拟偶尔失败
    if (Math.random() < 0.1) {
        throw new Error('模拟网络错误');
    }
    
    return result;
}

// 更新通知进度
function updateNotificationProgress(current, total) {
    const progressFill = document.getElementById('fetch-progress-fill');
    const progressCount = document.getElementById('progress-count');
    
    if (progressFill) {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressCount) {
        progressCount.textContent = `${current} / ${total}`;
    }
}

// 更新进度文本
function updateProgressText(text) {
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = text;
    }
}

// 更新通知状态
function updateNotificationStatus(success, error, skip) {
    document.getElementById('success-count').textContent = success;
    document.getElementById('error-count').textContent = error;
    document.getElementById('skip-count').textContent = skip;
}

// 流程日志：追加与清空
function appendFetchLog(message, type = 'info') {
    const logContainer = document.getElementById('fetch-log');
    if (!logContainer) return;
    const item = document.createElement('div');
    item.className = `fetch-log-item ${type}`;
    const ts = new Date();
    const timeText = ts.toLocaleTimeString();
    item.innerHTML = `<span class="time">[${timeText}]</span><span class="msg">${message}</span>`;
    logContainer.appendChild(item);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearFetchLog() {
    const logContainer = document.getElementById('fetch-log');
    if (logContainer) logContainer.innerHTML = '';
}

// 暂停通知数据获取
function pauseNotificationDataFetch() {
    isNotificationFetching = false;
    showNotification('已暂停数据获取', 'info');
}

// 停止通知数据获取
function stopNotificationDataFetch() {
    isNotificationFetching = false;
    showNotification('已停止数据获取', 'info');
}

// 显示通知结果
function displayNotificationResults() {
    document.getElementById('data-results-section').style.display = 'block';
    
    // 计算汇总数据
    const summary = calculateNotificationSummary();
    updateNotificationSummary(summary);
    
    // 更新详细数据表格
    updateNotificationDetailsTable();
    
    // 更新评论明细
    updateCommentsTab();
    
    // 切换到汇总标签
    switchNotificationDataTab('summary');
}

// 计算通知汇总数据
function calculateNotificationSummary() {
    const successfulResults = notificationFetchResults.filter(r => r.status === 'success');
    
    const summary = {
        totalAccounts: successfulResults.length,
        likes: {
            count: successfulResults.length,
            total: successfulResults.reduce((sum, r) => sum + (r.data.likes || 0), 0),
            average: successfulResults.length > 0 ? 
                Math.round(successfulResults.reduce((sum, r) => sum + (r.data.likes || 0), 0) / successfulResults.length) : 0
        },
        comments: {
            count: successfulResults.length,
            total: successfulResults.reduce((sum, r) => sum + (r.data.comments || 0), 0),
            average: successfulResults.length > 0 ? 
                Math.round(successfulResults.reduce((sum, r) => sum + (r.data.comments || 0), 0) / successfulResults.length) : 0
        },
        // 合并赞与收藏：使用likes作为唯一来源
        follows: {
            count: successfulResults.length,
            total: successfulResults.reduce((sum, r) => sum + (r.data.follows || 0), 0),
            average: successfulResults.length > 0 ? 
                Math.round(successfulResults.reduce((sum, r) => sum + (r.data.follows || 0), 0) / successfulResults.length) : 0
        }
    };
    
    return summary;
}

// 更新通知汇总显示
function updateNotificationSummary(summary) {
    document.getElementById('likes-count').textContent = summary.likes.count;
    document.getElementById('total-likes').textContent = summary.likes.total;
    document.getElementById('avg-likes').textContent = summary.likes.average;
    
    document.getElementById('comments-count').textContent = summary.comments.count;
    document.getElementById('total-comments').textContent = summary.comments.total;
    document.getElementById('avg-comments').textContent = summary.comments.average;
    
    document.getElementById('follows-count').textContent = summary.follows.count;
    document.getElementById('total-follows').textContent = summary.follows.total;
    document.getElementById('avg-follows').textContent = summary.follows.average;
}

// 更新通知详细数据表格
function updateNotificationDetailsTable() {
    const tbody = document.getElementById('details-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = notificationFetchResults.map(result => `
        <tr>
            <td>${result.accountName}</td>
            <td>${getPlatformDisplayName(result.platform)}</td>
            <td>
                ${result.data.likes || 0}
                ${result.meta && result.meta.tabRedDots ? `<div class="mini-badge">红点: ${result.meta.tabRedDots.like || 0}</div>` : ''}
            </td>
            <td>
                ${result.data.comments || 0}
                ${result.meta && result.meta.tabRedDots ? `<div class="mini-badge">红点: ${result.meta.tabRedDots.comment || 0}</div>` : ''}
            </td>
            <td>
                ${result.data.follows || 0}
                ${result.meta && result.meta.tabRedDots ? `<div class="mini-badge">红点: ${result.meta.tabRedDots.follow || 0}</div>` : ''}
            </td>
            <td>
                ${formatDate(result.fetchTime)}
                ${result.meta && typeof result.meta.redDotCount === 'number' ? `<div class="mini-badge">总红点: ${result.meta.redDotCount}</div>` : ''}
            </td>
            <td>
                <span class="status-badge ${result.status === 'success' ? 'success' : 'error'}">
                    ${result.status === 'success' ? '成功' : '失败'}
                </span>
            </td>
        </tr>
    `).join('');
}

// 渲染评论明细标签内容 - 按账号分组展示
function updateCommentsTab() {
    const container = document.getElementById('comments-list');
    if (!container) return;

    // 按账号分组收集评论数据
    const accountGroups = new Map();
    
    for (const result of notificationFetchResults) {
        const comments = result?.meta?.comments || [];
        if (comments.length === 0) continue;
        
        const accountKey = `${result.accountName}_${result.platform}`;
        if (!accountGroups.has(accountKey)) {
            accountGroups.set(accountKey, {
                accountName: result.accountName,
                platform: result.platform,
                avatar: result.avatar || '',
                comments: [],
                latestCommentTime: null
            });
        }
        
        const group = accountGroups.get(accountKey);
        for (const c of comments) {
            const commentData = {
                fetchTime: result.fetchTime,
                userName: c.userName || '',
                userProfile: c.userProfile || '',
                hint: c.hint || '',
                content: c.content || '',
                timeText: c.timeText || '',
                avatar: c.avatar || '',
                noteImage: c.noteImage || ''
            };
            group.comments.push(commentData);
            
            // 更新最新评论时间
            const commentTime = new Date(result.fetchTime);
            if (!group.latestCommentTime || commentTime > group.latestCommentTime) {
                group.latestCommentTime = commentTime;
            }
        }
    }

    if (accountGroups.size === 0) {
        container.innerHTML = '<div class="empty-state">暂无评论数据</div>';
        return;
    }

    // 按最新评论时间排序账号分组
    const sortedGroups = Array.from(accountGroups.values())
        .sort((a, b) => b.latestCommentTime - a.latestCommentTime);

    // 渲染按账号分组的评论（带选择与批量回复工具栏）
    container.innerHTML = `
        <div class="comments-toolbar" style="display:flex;align-items:center;gap:12px;margin:8px 0 12px 0;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" id="comment-select-all"> 全选
            </label>
            <button class="btn-primary" id="batch-reply-btn" disabled>批量回复</button>
            <button class="btn-secondary" onclick="clearRepliedComments()" title="清除所有已回复记录">清除回复记录</button>
        </div>
        ${sortedGroups.map((group, groupIndex) => {
        // 按时间倒序排序组内评论
        group.comments.sort((a, b) => new Date(b.fetchTime) - new Date(a.fetchTime));
        
        const groupId = `comment-group-${groupIndex}`;
        const commentCount = group.comments.length;
        const repliedCount = group.comments.filter(comment => 
            isCommentReplied(group.accountName, comment.userProfile, comment.userName)
        ).length;
        
        return `
            <div class="comment-account-group">
                <div class="account-group-header" onclick="toggleCommentGroup('${groupId}')">
                    <div class="account-info">
                        ${group.avatar ? `<img class="account-avatar" src="${group.avatar}" alt="avatar" />` : '<div class="account-avatar placeholder"></div>'}
                        <div class="account-details">
                            <div class="account-name">${escapeHtml(group.accountName)}</div>
                            <div class="account-meta">
                                <span class="platform-badge">${getPlatformDisplayName(group.platform)}</span>
                                <span class="comment-count">${commentCount}条评论</span>
                                <span class="reply-stats ${repliedCount > 0 ? 'has-replies' : ''}">${repliedCount}/${commentCount} 已回复</span>
                            </div>
                        </div>
                    </div>
                    <div class="group-toggle">
                        <svg class="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                <div class="account-group-content expanded" id="${groupId}">
                    ${group.comments.map((comment, idx) => {
                        const isReplied = isCommentReplied(group.accountName, comment.userProfile, comment.userName);
                        return `
                        <div class="comment-item ${isReplied ? 'replied' : ''}" data-account-name="${escapeHtml(group.accountName)}" data-platform="${group.platform}" data-user-profile="${comment.userProfile || ''}" data-user-name="${escapeHtml(comment.userName || '')}">
                            <div class="comment-main">
                                <div class="comment-header">
                                    <div class="commenter-info">
                                        ${comment.avatar ? `<img class="commenter-avatar" src="${comment.avatar}" alt="avatar" />` : '<div class="commenter-avatar placeholder"></div>'}
                                        <div class="commenter-details">
                                            <div class="commenter-name">
                                                ${comment.userProfile ? 
                                                    `<a href="${comment.userProfile}" target="_blank">${escapeHtml(comment.userName || '未知用户')}</a>` :
                                                    escapeHtml(comment.userName || '未知用户')
                                                }
                                                <span class="author-badge">作者</span>
                                                ${isReplied ? '<span class="replied-badge">已回复</span>' : ''}
                                            </div>
                                            <div class="comment-action-time">
                                                ${comment.hint ? `${escapeHtml(comment.hint)} · ` : ''}${comment.timeText ? escapeHtml(comment.timeText) : formatDate(comment.fetchTime)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="comment-content">
                                    ${comment.content ? `<div class="comment-text">${escapeHtml(comment.content)}</div>` : ''}
                                    <div class="comment-prompt">感谢评论，私信我了解更多详情~</div>
                                </div>
                                <div class="comment-actions">
                                    <label class="comment-select-wrapper" style="display:flex;align-items:center;gap:6px;">
                                        <input type="checkbox" class="comment-select" data-key="${groupIndex}-${idx}">
                                    </label>
                                    <button class="action-btn reply-btn ${isReplied ? 'replied' : ''}">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            ${isReplied ? 
                                                '<path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' :
                                                '<path d="M3 10H13C14.1046 10 15 10.8954 15 12V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6L3 10L7 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
                                            }
                                        </svg>
                                        ${isReplied ? '已回复' : '回复'}
                                    </button>
                                    <button class="action-btn like-btn">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7 22V12L3 7V4C3 3.44772 3.44772 3 4 3H9L13 12V22H7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M13 12H19C20.1046 12 21 12.8954 21 14V16C21 17.1046 20.1046 18 19 18H17L13 22V12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        点赞
                                    </button>
                                </div>
                            </div>
                            ${comment.noteImage ? `
                                <div class="comment-thumbnail">
                                    <img src="${comment.noteImage}" alt="笔记图片" onclick="openImageModal('${comment.noteImage}')" />
                                </div>
                            ` : ''}
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('')}
    `;

    // 绑定事件（委托）
    attachCommentListHandlers();
}

// 简单的HTML转义，避免XSS
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 切换通知数据标签
function switchNotificationDataTab(tabName) {
    // 移除所有活动标签
    document.querySelectorAll('#data-results-section .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('#data-results-section .tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 激活选中的标签
    const targetBtn = document.querySelector(`#data-results-section .tab-btn[onclick*="${tabName}"]`);
    const targetPanel = document.getElementById(`${tabName}-tab`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');
}

// 导出通知数据
function exportNotificationData() {
    if (notificationFetchResults.length === 0) {
        showNotification('没有可导出的数据', 'warning');
        return;
    }
    
    const exportData = {
        exportTime: new Date().toISOString(),
        totalAccounts: notificationFetchResults.length,
        results: notificationFetchResults
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `notification_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('数据导出成功', 'success');
}

// 清空通知结果
function clearNotificationResults() {
    notificationFetchResults = [];
    document.getElementById('data-results-section').style.display = 'none';
    document.getElementById('fetch-progress-section').style.display = 'none';
    showNotification('结果已清空', 'info');
}

// 切换评论组展开/折叠状态
function toggleCommentGroup(groupId) {
    const content = document.getElementById(groupId);
    const header = content.previousElementSibling;
    const expandIcon = header.querySelector('.expand-icon');
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        expandIcon.style.transform = 'rotate(-90deg)';
    } else {
        content.classList.add('expanded');
        expandIcon.style.transform = 'rotate(0deg)';
    }
}

// 打开图片模态框
// 删除重复的openImageModal函数 - 使用统一的showFullImage函数

// 设置通知管理事件监听器
function setupNotificationEventListeners() {
    // 监听时间范围变化
    const timeRangeSelect = document.getElementById('fetch-time-range');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', toggleCustomTimeRange);
    }
    
    // 监听搜索输入
    const searchInput = document.querySelector('#notification-account-grid').previousElementSibling?.querySelector('input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchNotificationAccounts(e.target.value);
        });
    }

    // 防止重复绑定，在容器渲染后由 attachCommentListHandlers 处理
}

// 绑定评论列表的交互（内联回复与批量回复）
function attachCommentListHandlers() {
    const list = document.getElementById('comments-list');
    if (!list) return;

    // 批量：全选勾选状态
    const selectAll = document.getElementById('comment-select-all');
    const batchBtn = document.getElementById('batch-reply-btn');
    if (selectAll) {
        selectAll.onchange = () => {
            list.querySelectorAll('.comment-select').forEach(cb => { cb.checked = selectAll.checked; });
            updateBatchReplyState();
        };
    }
    if (batchBtn) {
        batchBtn.onclick = handleBatchReply;
    }

    // 委托：点击回复按钮 → 打开内联输入框
    list.addEventListener('click', (e) => {
        const btn = e.target.closest('.reply-btn');
        if (btn) {
            const item = btn.closest('.comment-item');
            if (item) toggleInlineReply(item);
            return;
        }
        const cb = e.target.closest('.comment-select');
        if (cb) {
            updateBatchReplyState();
            return;
        }
    });
}

function updateBatchReplyState() {
    const list = document.getElementById('comments-list');
    if (!list) return;
    const batchBtn = document.getElementById('batch-reply-btn');
    if (!batchBtn) return;
    const selected = list.querySelectorAll('.comment-select:checked');
    batchBtn.disabled = selected.length === 0;

    // 如果有批量面板，更新计数与发送按钮状态
    const countEl = document.getElementById('batch-reply-count');
    if (countEl) countEl.textContent = String(selected.length);
    const sendBtn = document.getElementById('batch-reply-send');
    if (sendBtn) sendBtn.disabled = selected.length === 0;
}

function toggleInlineReply(item) {
    // 如果已存在输入区域则切换显示
    let box = item.querySelector('.inline-reply-box');
    if (box) {
        box.remove();
        return;
    }
    box = document.createElement('div');
    box.className = 'inline-reply-box';
    box.style.cssText = 'margin-top:8px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;display:flex;gap:8px;align-items:flex-start;';
    box.innerHTML = `
        <textarea class="inline-reply-input" rows="2" placeholder="输入回复内容..." style="flex:1;resize:vertical"></textarea>
        <div style="display:flex;gap:8px;">
            <button class="btn-primary inline-reply-confirm">确认</button>
            <button class="btn-secondary inline-reply-cancel">取消</button>
        </div>
    `;
    const content = item.querySelector('.comment-content');
    content ? content.after(box) : item.appendChild(box);

    // 绑定确认/取消
    box.querySelector('.inline-reply-cancel').onclick = () => box.remove();
    box.querySelector('.inline-reply-confirm').onclick = async () => {
        const text = box.querySelector('.inline-reply-input').value.trim();
        if (!text) { showNotification('请输入回复内容', 'warning'); return; }
        await sendCommentReply([buildReplyTargetPayload(item, text)]);
        box.remove();
        // 刷新评论列表显示以反映已回复状态
        updateCommentsTab();
    };
}

function buildReplyTargetPayload(item, text) {
    return {
        accountName: item.getAttribute('data-account-name') || '',
        platform: item.getAttribute('data-platform') || 'xiaohongshu.com',
        userProfile: item.getAttribute('data-user-profile') || '',
        userName: item.getAttribute('data-user-name') || '',
        text
    };
}

async function handleBatchReply() {
    const list = document.getElementById('comments-list');
    if (!list) return;
    const toolbar = list.querySelector('.comments-toolbar');
    if (!toolbar) return;

    // 如果已存在面板则切换收起
    const existing = document.getElementById('batch-reply-panel');
    if (existing) { existing.remove(); return; }

    const selected = Array.from(list.querySelectorAll('.comment-select:checked'));
    const panel = document.createElement('div');
    panel.id = 'batch-reply-panel';
    panel.className = 'batch-reply-panel';
    panel.style.cssText = 'margin:8px 0 12px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;';
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div>已选 <span id="batch-reply-count">${selected.length}</span> 条评论</div>
        </div>
        <textarea id="batch-reply-text" rows="3" placeholder="输入要批量回复的内容..." style="width:100%;resize:vertical"></textarea>
        <div style="margin-top:8px;display:flex;gap:8px;">
            <button class="btn-primary" id="batch-reply-send" ${selected.length === 0 ? 'disabled' : ''}>发送</button>
            <button class="btn-secondary" id="batch-reply-cancel">取消</button>
        </div>
    `;
    toolbar.after(panel);

    const sendBtn = panel.querySelector('#batch-reply-send');
    const cancelBtn = panel.querySelector('#batch-reply-cancel');
    const textarea = panel.querySelector('#batch-reply-text');

    cancelBtn.onclick = () => panel.remove();
    sendBtn.onclick = async () => {
        const text = (textarea.value || '').trim();
        const currentSelected = Array.from(list.querySelectorAll('.comment-select:checked'));
        if (currentSelected.length === 0) { showNotification('请先选择要回复的评论', 'warning'); return; }
        if (!text) { showNotification('请输入回复内容', 'warning'); return; }
        const payloads = currentSelected.map(cb => buildReplyTargetPayload(cb.closest('.comment-item'), text));
        await sendCommentReply(payloads);
        panel.remove();
        // 刷新评论列表显示以反映已回复状态
        updateCommentsTab();
    };
}

// 打开小红书通知页面进行回复（步骤1、2）
async function openXhsNotificationForReply(replyList) {
    if (!Array.isArray(replyList) || replyList.length === 0) return;

    // 按账号分组
    const accountNameToReplies = {};
    for (const reply of replyList) {
        const key = reply.accountName || 'default';
        if (!accountNameToReplies[key]) accountNameToReplies[key] = [];
        accountNameToReplies[key].push(reply);
    }

    const accountNames = Object.keys(accountNameToReplies);
    showNotification(`准备打开 ${accountNames.length} 个账号的通知页面`, 'info');

    // 确保 API 方法可用（不使用 executeScript，改用 collectXhsNotifications）
    await waitForElectronAPI(['launchBrowser', 'isBrowserRunning', 'navigateToUrl', 'collectXhsNotifications']);

    for (const accountName of accountNames) {
        // 在已选择账号或全部账号中查找匹配窗口名
        const account = (selectedNotificationAccounts || []).find(acc => acc.windowName === accountName)
            || (notificationAccounts || []).find(acc => acc.windowName === accountName);

        if (!account) {
            console.warn(`未找到账号配置：${accountName}`);
            continue;
        }

        try {
            const running = await window.electronAPI.isBrowserRunning(account.id);
            if (!running) {
                const windowConfig = buildWindowConfig(account, 0);
                const launchOptions = typeof getBrowserLaunchOptions === 'function' 
                    ? getBrowserLaunchOptions({ windowConfig }) 
                    : { windowConfig };
                const launch = await window.electronAPI.launchBrowser(account, 'https://www.xiaohongshu.com/', launchOptions);
                if (!launch || !launch.success) throw new Error((launch && launch.error) || '启动失败');
                await delay(1500);
            } else {
                await window.electronAPI.navigateToUrl(account.id, 'https://www.xiaohongshu.com/');
                await delay(800);
            }

            // 点击通知按钮（通过主进程CDP实现）
            const clickResult = await clickNotificationButton(account.id);
            if (!clickResult || clickResult.success === false) {
                throw new Error((clickResult && clickResult.error) || '点击通知按钮失败');
            }
        } catch (err) {
            console.error(`处理账号失败：${account.windowName}`, err);
            throw new Error(`处理账号失败：${account.windowName}（${err.message}）`);
        }

        await delay(800);
    }
}

// 点击通知按钮：通过 collectXhsNotifications 在主进程里使用CDP点击并等待跳转
async function clickNotificationButton(accountId) {
    try {
        const result = await window.electronAPI.collectXhsNotifications(accountId);
        if (result && result.success !== false) {
            // 主进程已完成点击与跳转等待
            return { success: true };
        }
        return { success: false, error: (result && result.error) || 'collectXhsNotifications 调用失败' };
    } catch (error) {
        console.error('点击通知按钮失败:', error);
        return { success: false, error: error.message };
    }
}

// 已回复评论管理
function generateCommentId(accountName, userProfile, userName) {
    // 生成唯一标识：账号名+用户标识的hash
    const userIdentifier = userProfile || userName || '';
    return `${accountName}_${btoa(encodeURIComponent(userIdentifier)).replace(/[^a-zA-Z0-9]/g, '')}`;
}

function saveRepliedComment(accountName, userProfile, userName) {
    try {
        const commentId = generateCommentId(accountName, userProfile, userName);
        const repliedComments = getRepliedComments();
        repliedComments[commentId] = {
            accountName: accountName,
            userProfile: userProfile || '',
            userName: userName || '',
            repliedAt: new Date().toISOString()
        };
        localStorage.setItem('repliedComments', JSON.stringify(repliedComments));
        console.log('已保存回复记录：', commentId);
    } catch (error) {
        console.error('保存回复记录失败：', error);
    }
}

function getRepliedComments() {
    try {
        const stored = localStorage.getItem('repliedComments');
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('读取回复记录失败：', error);
        return {};
    }
}

function isCommentReplied(accountName, userProfile, userName) {
    const commentId = generateCommentId(accountName, userProfile, userName);
    const repliedComments = getRepliedComments();
    return repliedComments.hasOwnProperty(commentId);
}

function clearRepliedComments() {
    try {
        localStorage.removeItem('repliedComments');
        showNotification('已清除所有回复记录', 'success');
        // 刷新评论列表显示
        updateCommentsTab();
    } catch (error) {
        console.error('清除回复记录失败：', error);
    }
}

// 实际发送回复：完成步骤1-6（打开首页→通知页→定位卡片→点击回复→填写→发送）
async function sendCommentReply(replyList) {
    try {
        if (!Array.isArray(replyList) || replyList.length === 0) { showNotification('无可发送的回复', 'warning'); return; }
        await openXhsNotificationForReply(replyList);
        showNotification('已打开所有账号的通知页面', 'success');

        // 按账号分组并逐个执行回复
        const grouped = {};
        for (const item of replyList) {
            const key = item.accountName || 'default';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        }

        await waitForElectronAPI(['replyToXhsComment']);

        // 账号配置查找函数
        const findAccountByName = (name) => (selectedNotificationAccounts || []).find(acc => acc.windowName === name)
            || (notificationAccounts || []).find(acc => acc.windowName === name);

        for (const [accountName, items] of Object.entries(grouped)) {
            const account = findAccountByName(accountName);
            if (!account) { console.warn('未找到账号配置：', accountName); continue; }

            for (const target of items) {
                const payload = { userProfile: target.userProfile || '', userName: target.userName || '', text: target.text || '' };
                const res = await window.electronAPI.replyToXhsComment(account.id, payload);
                if (res && res.rateLimited) {
                    showNotification(`评论过快(${accountName})，暂停35秒后继续`, 'warning');
                    await delay(35000);
                } else if (!res || res.success === false) {
                    console.error('回复失败：', accountName, payload, res && res.error);
                    showNotification(`回复失败(${accountName}): ${res && res.error ? res.error : '未知错误'}`, 'error');
                    await delay(1500);
                } else {
                    // 记录已回复状态
                    saveRepliedComment(accountName, target.userProfile, target.userName);
                    showNotification(`已回复(${accountName})：${payload.userName || payload.userProfile}`, 'success');
                    const jitterMs = 3000 + Math.floor(Math.random() * 3000);
                    await delay(jitterMs);
                }
            }
        }
    } catch (e) {
        console.error('发送回复流程失败:', e);
        showNotification(`流程失败：${e.message}` , 'error');
    }
}

// 模板选择器功能
document.addEventListener('DOMContentLoaded', function() {
    initializeTemplateSelector();
});

function initializeTemplateSelector() {
    // 确保DOM完全加载后再获取元素
    setTimeout(() => {
        const categoryBtns = document.querySelectorAll('.category-btn');
        const templateItems = document.querySelectorAll('.template-item');
        const hiddenSelect = document.getElementById('t2i-template');
        

    
    // 分类切换逻辑
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetCategory = this.dataset.category;
            
            // 切换分类按钮状态
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 切换内容显示
            const categoryContents = document.querySelectorAll('.template-category-content');
            categoryContents.forEach(content => {
                if (content.dataset.category === targetCategory) {
                    content.style.display = 'grid';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
    
    // 模板选择逻辑
    templateItems.forEach(item => {
        item.addEventListener('click', function() {
            const templateValue = this.dataset.template;
            
            // 移除所有active状态
            templateItems.forEach(i => i.classList.remove('active'));
            
            // 添加当前选中状态
            this.classList.add('active');
            
            // 更新隐藏的select值
            if (hiddenSelect) {
                // 清空所有选项
                hiddenSelect.innerHTML = '';
                
                // 添加选中的选项
                const option = document.createElement('option');
                option.value = templateValue;
                option.selected = true;
                option.textContent = this.querySelector('span').textContent;
                hiddenSelect.appendChild(option);
                
                // 触发change事件
                hiddenSelect.dispatchEvent(new Event('change'));
            }
        });
    });
    
    // 添加所有模板选项到隐藏的select中（用于兼容现有代码）
    const allTemplates = [
        { value: 'sticky-note-yellow', text: '📝 黄色便签' },
        { value: 'sticky-note-green', text: '🌿 绿色便签' },
        { value: 'sticky-note-blue', text: '💙 蓝色便签' },
        { value: 'sticky-note-purple', text: '💜 紫色便签' },
        { value: 'sticky-note-orange', text: '🧡 橙色便签' },
        { value: 'sticky-note-coral', text: '🪸 珊瑚便签' },
        { value: 'sticky-note-lavender', text: '💐 薰衣草便签' },
        { value: 'sticky-note-peach', text: '🍑 桃色便签' },
        { value: 'notebook-paper', text: '📖 笔记本纸' },
        { value: 'memo-pink', text: '📄 粉色备忘' },
        { value: 'highlight-orange', text: '🔍 橙色强调' },
        { value: 'study-focus', text: '🎯 学习重点' },
        { value: 'pastel-pink', text: '马卡龙粉' },
        { value: 'pastel-mint', text: '马卡龙薄荷' },
        { value: 'polka-dots', text: '可爱波点' },
        { value: 'candy-stripes', text: '糖果条纹' },
        { value: 'hearts', text: '爱心撒花' },
        { value: 'bubbles', text: '泡泡梦幻' },
        { value: 'gingham', text: '格纹奶油' },
        { value: 'kawaii-clouds', text: '萌系云朵' },
        { value: 'forest-fresh', text: '清新森林' },
        { value: 'ocean-waves', text: '🌊 海浪涌动' },
        { value: 'golden-autumn', text: '🍂 金秋落叶' },
        { value: 'sunset-glow', text: '夕阳橙光' },
        { value: 'cherry-blossom', text: '🌺 樱花飞舞' },
        { value: 'flower-garden', text: '🌸 花园盛开' },
        { value: 'coffee-time', text: '☕ 咖啡时光' },
        { value: 'book-wisdom', text: '📚 书香智慧' },
        { value: 'music-vibes', text: '🎵 音乐律动' },
        { value: 'travel-dream', text: '✈️ 旅行梦想' },
        { value: 'celebration-party', text: '🎉 庆祝派对' },
        { value: 'rainbow-soft', text: '柔和彩虹' },
        { value: 'rainbow-magic', text: '🌈 彩虹魔法' },
        { value: 'star-sky', text: '星星夜空' },
        { value: 'space-galaxy', text: '🌟 银河星系' },
        { value: 'fire-passion', text: '🔥 热情燃烧' },
        // 艺术设计分类
        { value: 'watercolor-art', text: '🎨 水彩艺术' },
        { value: 'sketch-draw', text: '✏️ 素描画册' },
        { value: 'neon-glow', text: '💫 霓虹发光' },
        { value: 'marble-texture', text: '🏛️ 大理石纹' },
        { value: 'vintage-paper', text: '📜 复古纸张' },
        { value: 'cyberpunk-city', text: '🏙️ 赛博朋克' },
        { value: 'origami-fold', text: '🗾 折纸艺术' },
        { value: 'glass-effect', text: '🔮 玻璃质感' },
        // 科技主题分类
        { value: 'circuit-board', text: '⚡ 电路板' },
        { value: 'hologram-display', text: '📱 全息显示' },
        { value: 'matrix-code', text: '💻 矩阵代码' },
        { value: 'data-stream', text: '📊 数据流' }
    ];
    
    // 初始化时添加所有选项到隐藏select（保持第一个为selected）
    if (hiddenSelect && hiddenSelect.children.length <= 1) {
        hiddenSelect.innerHTML = '';
        allTemplates.forEach((template, index) => {
            const option = document.createElement('option');
            option.value = template.value;
            option.textContent = template.text;
            if (index === 0) {
                option.selected = true;
            }
            hiddenSelect.appendChild(option);
        });
    }
    
    // 初始化常用模板功能
    initializeFavoriteTemplates();
    
    }, 100); // 延迟100ms确保DOM完全加载
}

// 常用模板管理功能
function initializeFavoriteTemplates() {
    // 为所有模板项动态添加收藏按钮
    const templateItems = document.querySelectorAll('.template-item');
    templateItems.forEach(item => {
        // 跳过常用模板分类中的项目（避免重复添加）
        if (item.closest('[data-category="favorites"]')) {
            return;
        }
        
        // 检查是否已经有收藏按钮
        if (item.querySelector('.favorite-btn')) {
            return;
        }
        
        const templateValue = item.dataset.template;
        if (!templateValue) return;
        
        // 创建收藏按钮
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.dataset.template = templateValue;
        favoriteBtn.title = '添加到常用';
        favoriteBtn.innerHTML = '<span class="heart-icon">♡</span>';
        
        // 检查是否已经是常用模板
        const favorites = getFavoriteTemplates();
        if (favorites.includes(templateValue)) {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.title = '从常用中移除';
            favoriteBtn.querySelector('.heart-icon').textContent = '♥';
        }
        
        // 添加点击事件
        favoriteBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止触发模板选择
            toggleFavoriteTemplate(templateValue);
        });
        
        // 添加到模板项中
        item.appendChild(favoriteBtn);
    });
    
    // 初始化常用模板显示
    updateFavoritesDisplay();
}

// 获取常用模板列表
function getFavoriteTemplates() {
    const stored = localStorage.getItem('favoriteTemplates');
    return stored ? JSON.parse(stored) : [];
}

// 保存常用模板列表
function saveFavoriteTemplates(favorites) {
    localStorage.setItem('favoriteTemplates', JSON.stringify(favorites));
}

// 切换常用模板状态
function toggleFavoriteTemplate(templateValue) {
    const favorites = getFavoriteTemplates();
    const index = favorites.indexOf(templateValue);
    
    if (index > -1) {
        // 移除常用
        favorites.splice(index, 1);
        updateFavoriteButton(templateValue, false);
    } else {
        // 添加到常用
        favorites.push(templateValue);
        updateFavoriteButton(templateValue, true);
    }
    
    saveFavoriteTemplates(favorites);
    updateFavoritesDisplay();
}

// 更新收藏按钮状态
function updateFavoriteButton(templateValue, isFavorited) {
    const buttons = document.querySelectorAll(`.favorite-btn[data-template="${templateValue}"]`);
    buttons.forEach(btn => {
        const heartIcon = btn.querySelector('.heart-icon');
        if (isFavorited) {
            btn.classList.add('favorited');
            btn.title = '从常用中移除';
            heartIcon.textContent = '♥';
        } else {
            btn.classList.remove('favorited');
            btn.title = '添加到常用';
            heartIcon.textContent = '♡';
        }
    });
}

// 更新常用模板显示
function updateFavoritesDisplay() {
    const favoritesContent = document.querySelector('.favorites-content');
    const favoritesEmpty = document.querySelector('.favorites-empty');
    
    if (!favoritesContent || !favoritesEmpty) return;
    
    const favorites = getFavoriteTemplates();
    
    if (favorites.length === 0) {
        favoritesEmpty.style.display = 'block';
        favoritesContent.style.display = 'none';
        return;
    }
    
    favoritesEmpty.style.display = 'none';
    favoritesContent.style.display = 'contents'; // 使用contents让子元素参与父级网格布局
    
    // 清空现有内容
    favoritesContent.innerHTML = '';
    
    // 获取所有模板信息
    const allTemplates = getAllTemplateInfo();
    
    // 为每个常用模板创建项目
    favorites.forEach(templateValue => {
        const templateInfo = allTemplates.find(t => t.value === templateValue);
        if (!templateInfo) return;
        
        // 创建模板项
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        templateItem.dataset.template = templateValue;
        
        // 添加收藏按钮
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn favorited';
        favoriteBtn.dataset.template = templateValue;
        favoriteBtn.title = '从常用中移除';
        favoriteBtn.innerHTML = '<span class="heart-icon">♥</span>';
        favoriteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavoriteTemplate(templateValue);
        });
        
        // 添加预览和文字
        const previewClass = getPreviewClass(templateValue);
        templateItem.innerHTML = `
            <div class="template-preview ${previewClass}"></div>
            <span>${templateInfo.text}</span>
        `;
        templateItem.appendChild(favoriteBtn);
        
        // 添加点击事件选择模板
        templateItem.addEventListener('click', function() {
            selectTemplate(templateValue, templateInfo.text);
        });
        
        favoritesContent.appendChild(templateItem);
    });
}

// 获取所有模板信息
function getAllTemplateInfo() {
    return [
        { value: 'sticky-note-yellow', text: '📝 黄色便签' },
        { value: 'sticky-note-green', text: '🌿 绿色便签' },
        { value: 'sticky-note-blue', text: '💙 蓝色便签' },
        { value: 'sticky-note-purple', text: '💜 紫色便签' },
        { value: 'sticky-note-orange', text: '🧡 橙色便签' },
        { value: 'sticky-note-coral', text: '🪸 珊瑚便签' },
        { value: 'sticky-note-lavender', text: '💐 薰衣草便签' },
        { value: 'sticky-note-peach', text: '🍑 桃色便签' },
        { value: 'notebook-paper', text: '📖 笔记本纸' },
        { value: 'memo-pink', text: '📄 粉色备忘' },
        { value: 'highlight-orange', text: '🔍 橙色强调' },
        { value: 'study-focus', text: '🎯 学习重点' },
        { value: 'pastel-pink', text: '马卡龙粉' },
        { value: 'pastel-mint', text: '马卡龙薄荷' },
        { value: 'polka-dots', text: '可爱波点' },
        { value: 'candy-stripes', text: '糖果条纹' },
        { value: 'hearts', text: '爱心撒花' },
        { value: 'bubbles', text: '泡泡梦幻' },
        { value: 'gingham', text: '格纹奶油' },
        { value: 'kawaii-clouds', text: '萌系云朵' },
        { value: 'forest-fresh', text: '清新森林' },
        { value: 'ocean-waves', text: '🌊 海浪涌动' },
        { value: 'golden-autumn', text: '🍂 金秋落叶' },
        { value: 'sunset-glow', text: '夕阳橙光' },
        { value: 'cherry-blossom', text: '🌺 樱花飞舞' },
        { value: 'flower-garden', text: '🌸 花园盛开' },
        { value: 'coffee-time', text: '☕ 咖啡时光' },
        { value: 'book-wisdom', text: '📚 书香智慧' },
        { value: 'music-vibes', text: '🎵 音乐律动' },
        { value: 'travel-dream', text: '✈️ 旅行梦想' },
        { value: 'celebration-party', text: '🎉 庆祝派对' },
        { value: 'rainbow-soft', text: '柔和彩虹' },
        { value: 'rainbow-magic', text: '🌈 彩虹魔法' },
        { value: 'star-sky', text: '星星夜空' },
        { value: 'space-galaxy', text: '🌟 银河星系' },
        { value: 'fire-passion', text: '🔥 热情燃烧' },
        { value: 'watercolor-art', text: '🎨 水彩艺术' },
        { value: 'sketch-draw', text: '✏️ 素描画册' },
        { value: 'neon-glow', text: '💫 霓虹发光' },
        { value: 'marble-texture', text: '🏛️ 大理石纹' },
        { value: 'vintage-paper', text: '📜 复古纸张' },
        { value: 'cyberpunk-city', text: '🏙️ 赛博朋克' },
        { value: 'origami-fold', text: '🗾 折纸艺术' },
        { value: 'glass-effect', text: '🔮 玻璃质感' },
        { value: 'circuit-board', text: '⚡ 电路板' },
        { value: 'hologram-display', text: '📱 全息显示' },
        { value: 'matrix-code', text: '💻 矩阵代码' },
        { value: 'data-stream', text: '📊 数据流' }
    ];
}

// 获取模板预览类名
function getPreviewClass(templateValue) {
    // 模板值到预览类名的映射
    const previewMap = {
        'sticky-note-yellow': 'sticky-yellow-preview',
        'sticky-note-green': 'sticky-green-preview',
        'sticky-note-blue': 'sticky-blue-preview',
        'sticky-note-purple': 'sticky-purple-preview',
        'sticky-note-orange': 'sticky-orange-preview',
        'sticky-note-coral': 'sticky-coral-preview',
        'sticky-note-lavender': 'sticky-lavender-preview',
        'sticky-note-peach': 'sticky-peach-preview',
        'notebook-paper': 'notebook-preview',
        'memo-pink': 'memo-pink-preview',
        'highlight-orange': 'highlight-orange-preview',
        'study-focus': 'study-focus-preview',
        'pastel-pink': 'pastel-pink-preview',
        'pastel-mint': 'pastel-mint-preview',
        'polka-dots': 'polka-dots-preview',
        'candy-stripes': 'candy-stripes-preview',
        'hearts': 'hearts-preview',
        'bubbles': 'bubbles-preview',
        'gingham': 'gingham-preview',
        'kawaii-clouds': 'kawaii-clouds-preview',
        'forest-fresh': 'forest-fresh-preview',
        'ocean-waves': 'ocean-waves-preview',
        'golden-autumn': 'golden-autumn-preview',
        'sunset-glow': 'sunset-glow-preview',
        'cherry-blossom': 'cherry-blossom-preview',
        'flower-garden': 'flower-garden-preview',
        'coffee-time': 'coffee-time-preview',
        'book-wisdom': 'book-wisdom-preview',
        'music-vibes': 'music-vibes-preview',
        'travel-dream': 'travel-dream-preview',
        'celebration-party': 'celebration-party-preview',
        'rainbow-soft': 'rainbow-soft-preview',
        'rainbow-magic': 'rainbow-magic-preview',
        'star-sky': 'star-sky-preview',
        'space-galaxy': 'space-galaxy-preview',
        'fire-passion': 'fire-passion-preview',
        'watercolor-art': 'watercolor-preview',
        'sketch-draw': 'sketch-preview',
        'neon-glow': 'neon-preview',
        'marble-texture': 'marble-preview',
        'vintage-paper': 'vintage-preview',
        'cyberpunk-city': 'cyberpunk-preview',
        'origami-fold': 'origami-preview',
        'glass-effect': 'glass-preview',
        'circuit-board': 'circuit-preview',
        'hologram-display': 'hologram-preview',
        'matrix-code': 'matrix-preview',
        'data-stream': 'data-preview',
        'wood-grain': 'wood-preview',
        'fabric-weave': 'fabric-preview',
        'brick-wall': 'brick-preview',
        'metal-surface': 'metal-preview',
        'christmas-joy': 'christmas-preview',
        'halloween-spooky': 'halloween-preview',
        'valentine-love': 'valentine-preview',
        'easter-spring': 'easter-preview'
    };
    
    return previewMap[templateValue] || 'sticky-yellow-preview';
}

// 选择模板（统一的模板选择函数）
function selectTemplate(templateValue, templateText) {
    // 移除所有active状态
    const allTemplateItems = document.querySelectorAll('.template-item');
    allTemplateItems.forEach(item => item.classList.remove('active'));
    
    // 添加当前选中状态（包括原始分类中的对应项）
    const targetItems = document.querySelectorAll(`.template-item[data-template="${templateValue}"]`);
    targetItems.forEach(item => item.classList.add('active'));
    
    // 更新隐藏的select值
    const hiddenSelect = document.getElementById('t2i-template');
    if (hiddenSelect) {
        hiddenSelect.innerHTML = '';
        const option = document.createElement('option');
        option.value = templateValue;
        option.selected = true;
        option.textContent = templateText;
        hiddenSelect.appendChild(option);
        hiddenSelect.dispatchEvent(new Event('change'));
    }
}

// ========== 许可证管理相关功能 ==========

// 加载许可证状态
async function loadLicenseStatus() {
    try {
        if (!window.electronAPI || !window.electronAPI.getCurrentLicense) {
            console.error('electronAPI not available');
            return;
        }

        const response = await window.electronAPI.getCurrentLicense();
        const statusBadge = document.getElementById('license-status-badge');
        const detailsText = document.getElementById('license-details-text');
        
        if (!statusBadge || !detailsText) {
            console.error('License status elements not found');
            return;
        }

        if (response.success && response.license) {
            const license = response.license;
            statusBadge.textContent = '已激活';
            statusBadge.className = 'status-badge active';
            
            const expiresDate = new Date(license.expiresAt);
            const packageName = license.packageType || '标准版';
            detailsText.textContent = `${packageName} | 到期时间: ${expiresDate.toLocaleDateString()}`;
        } else {
            statusBadge.textContent = '未激活';
            statusBadge.className = 'status-badge inactive';
            detailsText.textContent = '当前没有有效的许可证';
        }
    } catch (error) {
        console.error('加载许可证状态失败:', error);
        const statusBadge = document.getElementById('license-status-badge');
        const detailsText = document.getElementById('license-details-text');
        
        if (statusBadge && detailsText) {
            statusBadge.textContent = '检查失败';
            statusBadge.className = 'status-badge error';
            detailsText.textContent = '无法获取许可证信息';
        }
    }
}

// 刷新许可证状态
async function refreshLicenseStatus() {
    await loadLicenseStatus();
    showNotification('许可证状态已刷新', 'success');
}

// 查看许可证详情
async function viewLicenseDetails() {
    try {
        if (!window.electronAPI || !window.electronAPI.getCurrentLicense) {
            showNotification('系统未就绪，请稍后重试', 'error');
            return;
        }

        const response = await window.electronAPI.getCurrentLicense();
        
        if (response.success && response.license) {
            // 跳转到许可证状态页面查看详情
            window.location.href = 'auth-status.html';
        } else {
            showNotification('当前没有有效的许可证', 'warning');
        }
    } catch (error) {
        console.error('查看许可证详情失败:', error);
        showNotification('查看许可证详情失败: ' + error.message, 'error');
    }
}

// 确认注销许可证
function confirmRemoveLicense() {
    if (confirm('确定要注销当前许可证吗？\n\n注销后将需要重新激活才能使用软件功能。')) {
        removeLicenseFromSettings();
    }
}

// 从设置页面注销许可证
async function removeLicenseFromSettings() {
    try {
        if (!window.electronAPI || !window.electronAPI.removeLicense) {
            showNotification('系统未就绪，请稍后重试', 'error');
            return;
        }

        // 显示加载状态
        const removeBtn = document.querySelector('button[onclick="confirmRemoveLicense()"]');
        if (removeBtn) {
            removeBtn.disabled = true;
            removeBtn.textContent = '注销中...';
        }

        const response = await window.electronAPI.removeLicense();
        
        if (response.success) {
            showNotification('许可证已成功注销', 'success');
            
            // 更新UI状态
            await loadLicenseStatus();
            
            // 询问是否跳转到激活页面
            if (confirm('许可证已注销，是否立即跳转到激活页面？')) {
                window.location.href = 'auth-activation.html';
            }
        } else {
            showNotification('注销失败: ' + (response.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('注销许可证失败:', error);
        showNotification('注销过程出错: ' + error.message, 'error');
    } finally {
        // 恢复按钮状态
        const removeBtn = document.querySelector('button[onclick="confirmRemoveLicense()"]');
        if (removeBtn) {
            removeBtn.disabled = false;
            removeBtn.textContent = '注销许可证';
        }
    }
}

// ---------- 图片库选择功能 ----------
let selectedGalleryImages = []; // 存储选中的图片库图片

// 打开图片库选择弹窗
function openGallerySelector() {
    const modal = document.getElementById('gallery-selector-modal');
    const gallery = getImageGallery();
    
    // 重置选中状态
    selectedGalleryImages = [];
    updateSelectedCount();
    
    // 显示/隐藏空状态
    const emptyDiv = document.getElementById('gallery-selector-empty');
    const gridDiv = document.getElementById('gallery-selector-grid');
    
    if (gallery.length === 0) {
        emptyDiv.style.display = 'block';
        gridDiv.style.display = 'none';
    } else {
        emptyDiv.style.display = 'none';
        gridDiv.style.display = 'grid';
        renderGallerySelectorItems(gallery);
    }
    
    // 显示弹窗
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// 关闭图片库选择弹窗
function closeGallerySelector(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }
    
    const modal = document.getElementById('gallery-selector-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 清空选中状态
    selectedGalleryImages = [];
}

// 渲染图片库选择项
function renderGallerySelectorItems(gallery) {
    const gridDiv = document.getElementById('gallery-selector-grid');
    gridDiv.innerHTML = '';
    
    gallery.forEach(item => {
        const div = document.createElement('div');
        div.className = 'gallery-selector-item';
        div.onclick = () => toggleGalleryImageSelection(item);
        
        const date = new Date(item.createdAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.innerHTML = `
            <div class="gallery-selector-image">
                <img src="${item.thumbnail || item.imageData}" alt="${item.text}" loading="lazy">
                <div class="selection-overlay">
                    <div class="selection-checkbox">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="gallery-selector-info">
                <div class="gallery-selector-text">${item.text}</div>
                <div class="gallery-selector-date">${date}</div>
            </div>
        `;
        
        gridDiv.appendChild(div);
    });
}

// 切换图片选中状态
function toggleGalleryImageSelection(item) {
    const index = selectedGalleryImages.findIndex(img => img.id === item.id);
    const itemElement = event.currentTarget;
    
    if (index > -1) {
        // 取消选中
        selectedGalleryImages.splice(index, 1);
        itemElement.classList.remove('selected');
    } else {
        // 选中
        selectedGalleryImages.push(item);
        itemElement.classList.add('selected');
    }
    
    updateSelectedCount();
}

// 更新选中计数
function updateSelectedCount() {
    const countSpan = document.getElementById('selected-count');
    if (countSpan) {
        countSpan.textContent = selectedGalleryImages.length;
    }
}

// 确认选择图片
function confirmGallerySelection() {
    if (selectedGalleryImages.length === 0) {
        showNotification('请至少选择一张图片', 'warning');
        return;
    }
    
    // 将选中的图片添加到编辑中的图片列表
    selectedGalleryImages.forEach(galleryItem => {
        const imageData = {
            url: galleryItem.imageData, // 使用完整的图片数据
            name: `${galleryItem.text}_${new Date(galleryItem.createdAt).toLocaleDateString()}.png`,
            type: 'gallery' // 标记为来自图片库
        };
        
        editingImages.push(imageData);
    });
    
    // 更新编辑预览
    updateEditImagePreview();
    
    // 关闭弹窗
    closeGallerySelector();
    
    // 显示成功提示
    showNotification(`已添加 ${selectedGalleryImages.length} 张图片`, 'success');
    
    // 重置选中状态
    selectedGalleryImages = [];
}

// ===============================================
// 图片参考生成功能
// ===============================================

// 全局变量
let currentReferenceImage = null;
let isGeneratingImage = false;

// 模式切换功能
function switchGenerationMode(mode) {
    const textMode = document.getElementById('text-generation-mode');
    const imageMode = document.getElementById('image-generation-mode');
    const textBtn = document.querySelector('[data-mode="text"]');
    const imageBtn = document.querySelector('[data-mode="image"]');
    
    if (mode === 'text') {
        textMode.style.display = 'block';
        imageMode.style.display = 'none';
        textBtn.classList.add('active');
        imageBtn.classList.remove('active');
    } else {
        textMode.style.display = 'none';
        imageMode.style.display = 'block';
        textBtn.classList.remove('active');
        imageBtn.classList.add('active');
    }
}

// 触发图片上传
function triggerImageUpload() {
    document.getElementById('reference-image-input').click();
}

// 处理图片上传
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showNotification('请选择图片文件', 'error');
        return;
    }
    
    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('图片文件不能超过10MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        displayReferenceImage(e.target.result, file);
    };
    reader.readAsDataURL(file);
}

// 显示参考图片
function displayReferenceImage(imageSrc, file) {
    currentReferenceImage = { src: imageSrc, file: file };
    
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('uploaded-image-preview');
    const previewImg = document.getElementById('reference-image-preview');
    
    placeholder.style.display = 'none';
    preview.style.display = 'flex';
    previewImg.src = imageSrc;
    
    // 启用生成按钮
    document.getElementById('generate-from-reference-btn').disabled = false;
    
    showNotification('图片上传成功，可以开始生成', 'success');
}

// 移除参考图片
function removeReferenceImage() {
    currentReferenceImage = null;
    
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('uploaded-image-preview');
    
    placeholder.style.display = 'flex';
    preview.style.display = 'none';
    
    // 禁用生成按钮
    document.getElementById('generate-from-reference-btn').disabled = true;
    
    // 清空文件输入
    document.getElementById('reference-image-input').value = '';
    
    // 清空AI提示词
    document.getElementById('ai-prompt').value = '';
}

// 分析参考图片（生成提示词）
async function analyzeReferenceImage() {
    if (!currentReferenceImage) {
        showNotification('请先上传参考图片', 'warning');
        return;
    }
    
    try {
        showNotification('正在分析图片，生成AI提示词...', 'info');
        
        // 准备API请求数据
        const requestData = {
            model: IMAGE_ANALYSIS_CONFIG.model,
            messages: [
                {
                    content: [
                        {
                            image_url: {
                                url: currentReferenceImage.src
                            },
                            type: "image_url"
                        },
                        {
                            text: "请分析这张图片并生成简洁精准的AI绘画提示词。要求：1.直接输出可用的提示词，格式为'提示词：[具体内容]' 2.提示词应包含：主体、风格、色彩、质量描述词 3.控制在50-80字以内 4.使用专业的绘画术语 5.重点突出画面最核心的特征",
                            type: "text"
                        }
                    ],
                    role: "user"
                }
            ]
        };
        
        // 调用豆包图片分析API
        console.log('发送图片分析请求:', requestData);
        
        const response = await fetch(IMAGE_ANALYSIS_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${IMAGE_ANALYSIS_CONFIG.apiKey}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            const analysisResult = data.choices[0].message.content;
            console.log('分析结果:', analysisResult);
            
            // 显示完整的分析结果
            showAnalysisResult(analysisResult);
            
            // 从分析结果中提取提示词
            const prompt = extractPromptFromAnalysis(analysisResult);
            
            document.getElementById('ai-prompt').value = prompt;
            showNotification('AI图片分析完成，提示词已生成', 'success');
        } else {
            throw new Error('API返回数据格式错误');
        }
        
    } catch (error) {
        console.error('图片分析失败:', error);
        showNotification(`图片分析失败: ${error.message}`, 'error');
        
        // 如果API调用失败，使用备用的专业提示词
        const fallbackPrompts = [
            '精美插画风格，细腻笔触，柔和色彩，高质量渲染，masterpiece',
            '现代艺术风格，几何构图，色彩对比，创意设计，best quality',
            '自然光影，温暖色调，细节丰富，专业摄影，ultra detailed',
            '可爱卡通风格，鲜艳色彩，Q版造型，高清渲染，kawaii style',
            '科技未来风，炫酷特效，蓝紫配色，数字艺术，cyberpunk style',
            '水彩画风格，渐变色彩，朦胧美感，艺术质感，watercolor art',
            '油画质感，厚重色彩，古典构图，博物馆级，oil painting style',
            '简约线条，极简主义，黑白配色，现代设计，minimalist art'
        ];
        
        const fallbackPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
        document.getElementById('ai-prompt').value = fallbackPrompt;
        showNotification('使用备用提示词', 'info');
    }
}

// 专门用于生成时分析图片的函数（静默执行，不显示通知）
async function analyzeImageForGeneration() {
    if (!currentReferenceImage) {
        return;
    }
    
    try {
        // 准备API请求数据
        const requestData = {
            model: IMAGE_ANALYSIS_CONFIG.model,
            messages: [
                {
                    content: [
                        {
                            image_url: {
                                url: currentReferenceImage.src
                            },
                            type: "image_url"
                        },
                        {
                            text: "请分析这张图片并生成简洁精准的AI绘画提示词。要求：1.直接输出可用的提示词，格式为'提示词：[具体内容]' 2.提示词应包含：主体、风格、色彩、质量描述词 3.控制在50-80字以内 4.使用专业的绘画术语 5.重点突出画面最核心的特征",
                            type: "text"
                        }
                    ],
                    role: "user"
                }
            ]
        };
        
        // 调用豆包图片分析API
        const response = await fetch(IMAGE_ANALYSIS_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${IMAGE_ANALYSIS_CONFIG.apiKey}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            const analysisResult = data.choices[0].message.content;
            
            // 从分析结果中提取提示词
            const prompt = extractPromptFromAnalysis(analysisResult);
            
            // 填入提示词输入框
            document.getElementById('ai-prompt').value = prompt;
        }
        
    } catch (error) {
        console.error('自动图片分析失败:', error);
        // 静默失败，不显示错误通知，让主流程使用备用提示词
    }
}

// 从分析结果中提取提示词
function extractPromptFromAnalysis(analysisText) {
    // 优化的提示词提取逻辑
    const promptMarkers = ['提示词：', '提示词:', 'prompt:', 'Prompt:', '【提示词】', '关键词：'];
    
    // 首先尝试找到明确标记的提示词
    for (const marker of promptMarkers) {
        const index = analysisText.indexOf(marker);
        if (index !== -1) {
            let prompt = analysisText.substring(index + marker.length).trim();
            
            // 去除引号和多余符号
            prompt = prompt.replace(/^["'「『]|["'」』]$/g, '');
            
            // 取到第一个句号、换行或者80字符
            const endMarkers = ['\n', '。', '！', '？', '.', '!', '?'];
            let endIndex = prompt.length;
            
            for (const endMarker of endMarkers) {
                const pos = prompt.indexOf(endMarker);
                if (pos !== -1 && pos < endIndex) {
                    endIndex = pos;
                }
            }
            
            prompt = prompt.substring(0, Math.min(endIndex, 80)).trim();
            
            if (prompt.length > 8 && prompt.length < 100) {
                return prompt;
            }
        }
    }
    
    // 如果没有明确标记，智能提取关键描述
    const keywordPatterns = [
        /([^，。！？.!?\n]+(?:风格|画风|艺术)[^，。！？.!?\n]*)/,
        /([^，。！？.!?\n]*(?:细节|质感|渲染)[^，。！？.!?\n]*)/,
        /([^，。！？.!?\n]*(?:色彩|颜色|配色)[^，。！？.!?\n]*)/,
        /([^，。！？.!?\n]*(?:光线|光影|照明)[^，。！？.!?\n]*)/
    ];
    
    let extractedParts = [];
    
    for (const pattern of keywordPatterns) {
        const match = analysisText.match(pattern);
        if (match && match[1]) {
            const part = match[1].trim();
            if (part.length > 3 && part.length < 50) {
                extractedParts.push(part);
            }
        }
    }
    
    if (extractedParts.length > 0) {
        let combined = extractedParts.join('，');
        if (combined.length > 80) {
            combined = combined.substring(0, 77) + '...';
        }
        return combined;
    }
    
    // 最后的备选方案：取第一句有意义的描述
    const sentences = analysisText.split(/[。！？.!?\n]/);
    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && trimmed.length < 80 && 
            !trimmed.includes('这张图片') && !trimmed.includes('我可以看到')) {
            return trimmed;
        }
    }
    
    return '精美艺术作品，细节丰富，高质量渲染，专业构图';
}

// 应用快速提示词模板
function applyPromptTemplate() {
    const templateSelect = document.getElementById('prompt-template');
    const promptInput = document.getElementById('ai-prompt');
    const selectedTemplate = templateSelect.value;
    
    if (!selectedTemplate) {
        return;
    }
    
    const promptTemplates = {
        'illustration': '精美插画风格，细腻笔触，柔和色彩，温暖光线，高质量渲染，masterpiece',
        'photography': '专业摄影，自然光线，完美构图，高清细节，真实质感，ultra detailed',
        'cartoon': '可爱卡通风格，鲜艳色彩，Q版造型，萌系设计，高清渲染，kawaii style',
        'cyberpunk': '赛博朋克风格，霓虹灯光，蓝紫配色，未来科技，炫酷特效，cyberpunk art',
        'watercolor': '水彩画风格，渐变色彩，朦胧美感，柔和边缘，艺术质感，watercolor painting',
        'oilpainting': '油画质感，厚重色彩，古典构图，艺术大师风格，博物馆级，oil painting',
        'minimalist': '极简主义风格，简洁线条，几何图形，现代设计，留白美学，minimalist design',
        'anime': '二次元动漫风格，精美CG，动漫人物，日系美学，高质量渲染，anime art style'
    };
    
    const template = promptTemplates[selectedTemplate];
    if (template) {
        // 如果当前有内容，询问是否替换
        if (promptInput.value.trim()) {
            if (confirm('当前已有提示词内容，是否要替换为模板内容？')) {
                promptInput.value = template;
            } else {
                // 追加到现有内容
                promptInput.value = promptInput.value.trim() + '，' + template;
            }
        } else {
            promptInput.value = template;
        }
        
        // 重置选择器
        templateSelect.value = '';
        
        // 显示提示
        showNotification(`已应用${templateSelect.options[templateSelect.selectedIndex].text}模板`, 'success');
    }
}

// 基于参考图片生成新图片
async function generateImageFromReference() {
    if (!currentReferenceImage) {
        showNotification('请先上传参考图片', 'warning');
        return;
    }
    
    if (isGeneratingImage) {
        showNotification('正在生成中，请等待...', 'warning');
        return;
    }
    
    try {
        isGeneratingImage = true;
        
        // 显示进度
        showGenerationProgress();
        
        // 检查是否已有提示词，如果没有则自动分析
        let prompt = document.getElementById('ai-prompt').value.trim();
        if (!prompt) {
            updateGenerationStatus('正在分析图片，生成AI提示词...');
            updateProgressBar(5);
            
            // 自动分析图片生成提示词
            await analyzeImageForGeneration();
            prompt = document.getElementById('ai-prompt').value.trim();
            
            // 如果分析后仍然没有提示词，使用备用提示词
            if (!prompt) {
                const fallbackPrompts = [
                    '精美插画风格，细腻笔触，柔和色彩，高质量渲染，masterpiece',
                    '现代艺术风格，几何构图，色彩对比，创意设计，best quality',
                    '自然光影，温暖色调，细节丰富，专业摄影，ultra detailed',
                    '可爱卡通风格，鲜艳色彩，Q版造型，高清渲染，kawaii style'
                ];
                prompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
                document.getElementById('ai-prompt').value = prompt;
                updateGenerationStatus('使用备用提示词，准备生成图片...');
            } else {
                updateGenerationStatus('提示词生成完成，准备生成图片...');
            }
            updateProgressBar(20);
        } else {
            updateGenerationStatus('使用现有提示词，准备生成图片...');
            updateProgressBar(10);
        }
        
        updateGenerationStatus('正在准备生成参数...');
        updateProgressBar(25);
        
        // 获取生成参数
        const size = document.getElementById('image-size').value;
        const guidanceScale = parseFloat(document.getElementById('guidance-scale').value);
        const addWatermark = document.getElementById('add-watermark').checked;
        
        updateGenerationStatus('正在调用AI生成接口...');
        updateProgressBar(40);
        
        // 调用豆包图片生成API
        const response = await fetch(IMAGE_GENERATION_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${IMAGE_GENERATION_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: IMAGE_GENERATION_CONFIG.model,
                prompt: prompt,
                response_format: 'url',
                size: size,
                guidance_scale: guidanceScale,
                watermark: addWatermark
            })
        });
        
        updateProgressBar(80);
        updateGenerationStatus('正在处理生成结果...');
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        updateProgressBar(95);
        
        if (data.data && data.data.length > 0) {
            updateProgressBar(100);
            updateGenerationStatus('生成完成！');
            
            setTimeout(() => {
                hideGenerationProgress();
                displayGenerationResults(data.data, prompt);
                showNotification('图片生成成功！', 'success');
            }, 500);
        } else {
            throw new Error('API返回数据格式错误');
        }
        
    } catch (error) {
        console.error('图片生成失败:', error);
        hideGenerationProgress();
        showNotification(`图片生成失败: ${error.message}`, 'error');
    } finally {
        isGeneratingImage = false;
    }
}

// 显示生成进度
function showGenerationProgress() {
    document.getElementById('generation-progress').style.display = 'block';
    document.getElementById('ai-generation-results').style.display = 'none';
}

// 隐藏生成进度
function hideGenerationProgress() {
    document.getElementById('generation-progress').style.display = 'none';
}

// 更新进度条
function updateProgressBar(percentage) {
    const progressFill = document.getElementById('ai-generation-progress');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

// 更新生成状态文本
function updateGenerationStatus(status) {
    const statusElement = document.getElementById('generation-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// 显示生成结果
function displayGenerationResults(images, prompt) {
    const resultsContainer = document.getElementById('ai-generation-results');
    const imagesGrid = document.getElementById('generated-images-grid');
    
    // 清空之前的结果
    imagesGrid.innerHTML = '';
    
    // 显示结果容器
    resultsContainer.style.display = 'block';
    
    // 生成图片项
    images.forEach((imageData, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'generated-image-item';
        imageItem.innerHTML = `
            <img src="${imageData.url}" alt="生成的图片 ${index + 1}" onclick="previewGeneratedImage('${imageData.url}', ${index})">
            <div class="generated-image-info">
                <h5>生成图片 ${index + 1}</h5>
                <p>提示词: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}</p>
            </div>
        `;
        imagesGrid.appendChild(imageItem);
    });
}

// 预览生成的图片
function previewGeneratedImage(imageUrl, index) {
    // 创建预览弹窗
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeImagePreview()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>🖼️ 生成图片预览</h3>
                <button class="close-btn" onclick="closeImagePreview()">×</button>
            </div>
            <div class="modal-body">
                <img src="${imageUrl}" alt="生成图片预览" style="max-width: 100%; max-height: 100%; width: auto; height: auto; border-radius: 8px;">
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeImagePreview()">关闭</button>
                <button class="btn-primary" onclick="downloadGeneratedImage('${imageUrl}', ${index})">下载图片</button>
                <button class="btn-info" onclick="saveGeneratedImageToGallery('${imageUrl}', ${index})">保存到图片库</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // 添加动画效果
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
}

// 关闭图片预览
function closeImagePreview() {
    const modal = document.querySelector('.image-preview-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300); // 等待动画完成
    }
}

// 下载生成的图片
async function downloadGeneratedImage(imageUrl, index) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-image-${index + 1}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('图片下载成功', 'success');
    } catch (error) {
        console.error('下载失败:', error);
        showNotification('图片下载失败', 'error');
    }
}

// 保存生成的图片到图片库
async function saveGeneratedImageToGallery(imageUrl, index) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // 创建图片元素用于获取尺寸
        const img = new Image();
        img.onload = function() {
            // 创建canvas转换为base64
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = canvas.toDataURL('image/png');
            const prompt = document.getElementById('ai-prompt').value.trim();
            
            // 使用与文生图一致的数据结构
            const imageItem = {
                id: 'gen_' + Date.now() + '_' + index + Math.random().toString(36).substr(2, 9),
                text: prompt || `AI生成图片 ${index + 1}`,
                imageData: imageData,
                template: 'ai-generated', // 标记为AI生成
                size: `${img.width}x${img.height}`,
                align: 'center',
                fontSize: 100,
                createdAt: new Date().toISOString(),
                thumbnail: createThumbnail(imageData),
                type: 'generated', // 额外标记类型
                prompt: prompt // 保存原始提示词
            };
            
            // 获取现有图片库（使用统一的存储键）
            const gallery = getImageGallery();
            
            // 添加新图片到开头
            gallery.unshift(imageItem);
            
            // 限制图片库大小（最多50张）
            if (gallery.length > 50) {
                gallery.splice(50);
            }
            
            // 保存到本地存储（使用统一的存储函数）
            saveImageGallery(gallery);
            
            // 刷新图片库显示
            updateGalleryDisplay();
            
            showNotification('图片已保存到图片库', 'success');
            closeImagePreview();
        };
        img.src = imageUrl;
        
    } catch (error) {
        console.error('保存失败:', error);
        showNotification('保存图片失败', 'error');
    }
}

// 重新生成图片
function regenerateImage() {
    generateImageFromReference();
}

// 保存当前生成的图片（批量保存）
async function saveGeneratedImage() {
    const imagesGrid = document.getElementById('generated-images-grid');
    const images = imagesGrid.querySelectorAll('.generated-image-item img');
    
    if (images.length === 0) {
        showNotification('没有可保存的图片', 'warning');
        return;
    }
    
    let savedCount = 0;
    for (let i = 0; i < images.length; i++) {
        try {
            await saveGeneratedImageToGallery(images[i].src, i);
            savedCount++;
        } catch (error) {
            console.error(`保存第${i + 1}张图片失败:`, error);
        }
    }
    
    showNotification(`成功保存 ${savedCount} 张图片到图片库`, 'success');
}

// 重置图片生成表单
function resetImageGeneration() {
    // 清空上传的图片
    removeReferenceImage();
    
    // 重置表单字段
    document.getElementById('ai-prompt').value = '';
    document.getElementById('image-size').value = '1024x1024';
    document.getElementById('guidance-scale').value = '3';
    document.getElementById('similarity-level').value = '0.7';
    document.getElementById('add-watermark').checked = true;
    
    // 更新范围值显示
    document.getElementById('guidance-scale-value').textContent = '3.0';
    document.getElementById('similarity-level-value').textContent = '0.7';
    
    // 隐藏结果和进度
    document.getElementById('generation-progress').style.display = 'none';
    document.getElementById('ai-generation-results').style.display = 'none';
    
    // 隐藏分析结果
    hideAnalysisResult();
    
    showNotification('表单已重置', 'info');
}

// 拖拽上传功能
function initImageUploadDragDrop() {
    const uploadArea = document.getElementById('image-upload-area');
    
    if (!uploadArea) return;
    
    // 防止默认拖拽行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 拖拽进入和悬停
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    // 拖拽离开
    uploadArea.addEventListener('dragleave', unhighlight, false);
    
    // 文件拖拽放下
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function highlight() {
        uploadArea.classList.add('drag-over');
    }
    
    function unhighlight() {
        uploadArea.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        unhighlight();
        
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    displayReferenceImage(e.target.result, file);
                };
                reader.readAsDataURL(file);
            } else {
                showNotification('请拖拽图片文件', 'warning');
            }
        }
    }
}

// 范围输入值更新
function initRangeInputUpdates() {
    const guidanceScale = document.getElementById('guidance-scale');
    const similarityLevel = document.getElementById('similarity-level');
    
    if (guidanceScale) {
        guidanceScale.addEventListener('input', function() {
            document.getElementById('guidance-scale-value').textContent = parseFloat(this.value).toFixed(1);
        });
    }
    
    if (similarityLevel) {
        similarityLevel.addEventListener('input', function() {
            document.getElementById('similarity-level-value').textContent = parseFloat(this.value).toFixed(1);
        });
    }
}

// 初始化图片参考生成功能
function initImageReferenceGeneration() {
    // 初始化拖拽上传
    initImageUploadDragDrop();
    
    // 初始化范围输入更新
    initRangeInputUpdates();
    
    console.log('图片参考生成功能初始化完成');
}

// 显示分析结果
function showAnalysisResult(analysisText) {
    const container = document.getElementById('analysis-result-container');
    const textElement = document.getElementById('analysis-text');
    
    if (container && textElement) {
        textElement.textContent = analysisText;
        container.style.display = 'block';
        container.classList.remove('collapsed');
        
        // 保存分析结果到全局变量，供后续操作使用
        window.currentAnalysisResult = analysisText;
    }
}

// 隐藏分析结果
function hideAnalysisResult() {
    const container = document.getElementById('analysis-result-container');
    if (container) {
        container.style.display = 'none';
        window.currentAnalysisResult = null;
    }
}

// 切换分析结果显示/隐藏
function toggleAnalysisResult() {
    const container = document.getElementById('analysis-result-container');
    if (container) {
        container.classList.toggle('collapsed');
    }
}

// 复制分析结果
function copyAnalysisResult() {
    if (window.currentAnalysisResult) {
        navigator.clipboard.writeText(window.currentAnalysisResult).then(() => {
            showNotification('分析结果已复制到剪贴板', 'success');
        }).catch(() => {
            // 降级处理：使用传统方法
            const textArea = document.createElement('textarea');
            textArea.value = window.currentAnalysisResult;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('分析结果已复制到剪贴板', 'success');
        });
    } else {
        showNotification('没有可复制的分析结果', 'warning');
    }
}

// 使用分析结果作为提示词
function useAnalysisAsPrompt() {
    if (window.currentAnalysisResult) {
        document.getElementById('ai-prompt').value = window.currentAnalysisResult;
        showNotification('已将完整分析结果设置为提示词', 'success');
    } else {
        showNotification('没有可用的分析结果', 'warning');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保DOM完全加载
    setTimeout(initImageReferenceGeneration, 100);
    
    // 添加分析结果区域头部点击事件
    const analysisHeader = document.querySelector('.analysis-header');
    if (analysisHeader) {
        analysisHeader.addEventListener('click', toggleAnalysisResult);
    }
});

// 执行浏览器脚本的API包装
async function executeScript(accountId, script, options = {}) {
    if (window.electronAPI && window.electronAPI.executeScript) {
        return await window.electronAPI.executeScript(accountId, script, options);
    }
    throw new Error('executeScript API 不可用');
}

// 在小红书页面执行搜索的函数
async function performSearch(accountId, searchQuery) {
    try {
        showNotification(`正在搜索："${searchQuery}"...`, 'info');
        
        // 执行点击搜索框并输入内容的脚本
        const searchScript = `
            (async () => {
                try {
                // 等待搜索框出现
                let searchInput = null;
                let attempts = 0;
                const maxAttempts = 20;
                
                while (!searchInput && attempts < maxAttempts) {
                        try {
                    // 尝试多种搜索框选择器
                    searchInput = document.querySelector('#search-input') || 
                                 document.querySelector('.search-input') || 
                                 document.querySelector('input[placeholder*="搜索"]') ||
                                 document.querySelector('input[placeholder*="想要什么"]') ||
                                 document.querySelector('.search-bar input') ||
                                 document.querySelector('[data-v-search] input') ||
                                 document.querySelector('.header-search input');
                        } catch (e) {
                            console.warn('搜索输入框查找异常:', e);
                        }
                    
                    if (!searchInput) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                    }
                }
                
                if (!searchInput) {
                    return { success: false, error: '未找到搜索输入框' };
                }
                
                    try {
                // 点击搜索框
                searchInput.click();
                searchInput.focus();
                
                // 清空并输入搜索内容
                searchInput.value = '';
                searchInput.value = ${JSON.stringify(searchQuery)};
                
                // 触发输入事件
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                // 等待一下然后回车搜索
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 触发回车键
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                });
                searchInput.dispatchEvent(enterEvent);
                
                    } catch (e) {
                        return { success: false, error: '搜索输入失败: ' + e.message };
                    }
                    
                    // 等待搜索执行完成后点击SVG搜索图标
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    try {
                        // 寻找并点击SVG搜索图标
                        let searchIcon = null;
                        let iconAttempts = 0;
                        const maxIconAttempts = 15;
                        
                        while (!searchIcon && iconAttempts < maxIconAttempts) {
                            try {
                                // 根据提供的元素结构，优先查找包含搜索图标的div
                                searchIcon = document.querySelector('div.search-icon[data-v-721de8bd]') ||
                                            document.querySelector('div.search-icon') ||
                                            document.querySelector('svg.reds-icon[width="20"][height="20"][data-v-721de8bd][data-v-55b36ac6]') ||
                                            document.querySelector('svg.reds-icon[width="20"][height="20"] use[xlink\\:href="#search"]')?.closest('svg') ||
                                            document.querySelector('svg[data-v-721de8bd][data-v-55b36ac6] use[xlink\\:href="#search"]')?.closest('svg') ||
                                            document.querySelector('svg.reds-icon use[xlink\\:href="#search"]')?.closest('svg') ||
                                            document.querySelector('svg use[xlink\\:href="#search"]')?.closest('svg') ||
                                            document.querySelector('svg.reds-icon[width="20"][height="20"]') ||
                                            document.querySelector('svg[data-v-721de8bd][data-v-55b36ac6]');
                            } catch (e) {
                                console.warn('搜索图标查找异常:', e);
                            }
                            
                            if (!searchIcon) {
                                await new Promise(resolve => setTimeout(resolve, 300));
                                iconAttempts++;
                            }
                        }
                        
                        if (searchIcon) {
                            try {
                                // 根据元素类型进行点击
                                console.log('找到搜索图标:', searchIcon.outerHTML);
                                
                                // 如果是div.search-icon，直接点击
                                if (searchIcon.classList && searchIcon.classList.contains('search-icon')) {
                                    searchIcon.click();
                                    console.log('点击了div.search-icon元素');
                                } else {
                                    // 如果是SVG元素，尝试点击它或其父级div
                                    searchIcon.click();
                                    
                                    // 查找父级div.search-icon
                                    const searchIconDiv = searchIcon.closest('div.search-icon');
                                    if (searchIconDiv) {
                                        searchIconDiv.click();
                                        console.log('点击了父级div.search-icon元素');
                                    }
                                }
                                
                                // 也尝试点击父级元素，确保点击事件能够正确触发
                                const parentElement = searchIcon.parentElement;
                                if (parentElement && (parentElement.tagName === 'BUTTON' || parentElement.onclick || parentElement.getAttribute('role') === 'button')) {
                                    parentElement.click();
                                    console.log('点击了父级按钮元素');
                                }
                                
                                // 搜索图标点击成功后，等待并点击"图文"区域
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                // 查找并点击"图文"区域
                                let imageChannelElement = null;
                                let channelAttempts = 0;
                                const maxChannelAttempts = 10;
                                
                                while (!imageChannelElement && channelAttempts < maxChannelAttempts) {
                                    try {
                                        imageChannelElement = document.querySelector('div[data-v-c69fb658][data-v-da963056-s]#image.channel') ||
                                                            document.querySelector('#image.channel') ||
                                                            document.querySelector('div.channel#image') ||
                                                            document.querySelector('div[id="image"][class="channel"]') ||
                                                            document.querySelector('div.channel[data-v-c69fb658]') ||
                                                            Array.from(document.querySelectorAll('div.channel')).find(el => el.textContent.trim() === '图文');
                                    } catch (e) {
                                        console.warn('图文区域查找异常:', e);
                                    }
                                    
                                    if (!imageChannelElement) {
                                        await new Promise(resolve => setTimeout(resolve, 200));
                                        channelAttempts++;
                                    }
                                }
                                
                                if (imageChannelElement) {
                                    try {
                                        console.log('找到图文区域:', imageChannelElement.outerHTML);
                                        imageChannelElement.click();
                                        console.log('成功点击图文区域');
                                        
                                        // 图文区域点击成功后，等待并操作筛选按钮
                                        await new Promise(resolve => setTimeout(resolve, 800));
                                        
                                        // 查找并悬停筛选按钮
                                        let filterElement = null;
                                        let filterAttempts = 0;
                                        const maxFilterAttempts = 10;
                                        
                                        while (!filterElement && filterAttempts < maxFilterAttempts) {
                                            try {
                                                filterElement = document.querySelector('div[data-v-eb91fffe][data-v-97568200][data-v-f6c0a3e4-s].filter') ||
                                                              document.querySelector('div.filter[data-v-eb91fffe]') ||
                                                              document.querySelector('div.filter') ||
                                                              Array.from(document.querySelectorAll('div')).find(el => 
                                                                  el.textContent.includes('筛选') && el.querySelector('svg[xlink\\:href="#chevron_down"]')
                                                              );
                                            } catch (e) {
                                                console.warn('筛选按钮查找异常:', e);
                                            }
                                            
                                            if (!filterElement) {
                                                await new Promise(resolve => setTimeout(resolve, 200));
                                                filterAttempts++;
                                            }
                                        }
                                        
                                        if (filterElement) {
                                            try {
                                                console.log('找到筛选按钮:', filterElement.outerHTML);
                                                
                                                // 触发悬停事件
                                                const mouseEnterEvent = new MouseEvent('mouseenter', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window
                                                });
                                                filterElement.dispatchEvent(mouseEnterEvent);
                                                
                                                const mouseOverEvent = new MouseEvent('mouseover', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window
                                                });
                                                filterElement.dispatchEvent(mouseOverEvent);
                                                
                                                console.log('已触发筛选按钮悬停事件');
                                                
                                                // 等待下拉面板展开
                                                await new Promise(resolve => setTimeout(resolve, 600));
                                                
                                                // 查找"最多评论"选项
                                                let commentOption = null;
                                                let commentAttempts = 0;
                                                const maxCommentAttempts = 8;
                                                
                                                while (!commentOption && commentAttempts < maxCommentAttempts) {
                                                    try {
                                                        // 基于实际面板结构精确查找"最多评论"选项
                                                        commentOption = (() => {
                                                            console.log('🔍 开始查找"最多评论"选项 (尝试 ' + (commentAttempts + 1) + '/' + maxCommentAttempts + ')');
                                                            
                                                            // 策略1: 精确匹配"最多评论"文本
                                                            let option = Array.from(document.querySelectorAll('div, span, li, button')).find(el => {
                                                                const text = el.textContent?.trim() || '';
                                                                return text === '最多评论';
                                                            });
                                                            if (option && option.offsetParent !== null) {
                                                                console.log('✅ 策略1成功: 精确匹配找到最多评论');
                                                                return option;
                                                            }
                                                            
                                                            // 策略2: 查找包含"排序依据"的面板，然后找其中的"最多评论"
                                                            const sortPanel = Array.from(document.querySelectorAll('div')).find(el => 
                                                                el.textContent?.includes('排序依据') && el.offsetParent !== null
                                                            );
                                                            if (sortPanel) {
                                                                console.log('📋 找到排序依据面板');
                                                                option = Array.from(sortPanel.querySelectorAll('div, span')).find(el => {
                                                                    const text = el.textContent?.trim() || '';
                                                                    return text === '最多评论' && el.offsetParent !== null;
                                                                });
                                                                if (option) {
                                                                    console.log('✅ 策略2成功: 在排序面板中找到最多评论');
                                                                    return option;
                                                                }
                                                            }
                                                            
                                                            // 策略3: 查找筛选面板中所有选项，找到"最多评论"
                                                            const filterPanel = filterElement.nextElementSibling || 
                                                                              filterElement.parentElement?.querySelector('.panel, .dropdown, .menu, [class*="panel"], [class*="dropdown"]') ||
                                                                              document.querySelector('[class*="filter"], [class*="sort"], [class*="dropdown"]');
                                                            
                                                            if (filterPanel && filterPanel.offsetParent !== null) {
                                                                console.log('🎯 找到筛选面板');
                                                                // 查找所有可能的选项元素
                                                                const allOptions = filterPanel.querySelectorAll('div, span, li, button, [role="option"], [role="menuitem"]');
                                                                console.log('📊 面板中找到 ' + allOptions.length + ' 个选项元素');
                                                                
                                                                option = Array.from(allOptions).find(el => {
                                                                    const text = el.textContent?.trim() || '';
                                                                    return (text === '最多评论' || text === '评论最多') && el.offsetParent !== null;
                                                                });
                                                                if (option) {
                                                                    console.log('✅ 策略3成功: 在面板选项中找到最多评论');
                                                                    return option;
                                                                }
                                                                
                                                                // 按位置查找：最多评论是第4个选项（综合、最新、最多点赞、最多评论）
                                                                const sortOptions = Array.from(allOptions).filter(el => {
                                                                    const text = el.textContent?.trim() || '';
                                                                    const isValid = text && 
                                                                                  !text.includes('排序') && 
                                                                                  text.length < 10 && 
                                                                                  text.length > 1 &&
                                                                                  el.offsetParent !== null;
                                                                    return isValid;
                                                                });
                                                                console.log('🔢 筛选后的排序选项:', sortOptions.map(el => '"' + el.textContent.trim() + '"').join(', '));
                                                                
                                                                if (sortOptions[3]) { // 第4个选项（索引3）
                                                                    console.log('🎯 策略3备选: 尝试第4个排序选项: "' + sortOptions[3].textContent.trim() + '"');
                                                                    return sortOptions[3];
                                                                }
                                                            }
                                                            
                                                            // 策略4: 全局搜索包含"评论"的可点击元素
                                                            option = Array.from(document.querySelectorAll('div, span, button')).find(el => {
                                                                const text = el.textContent?.trim() || '';
                                                                return text.includes('评论') && 
                                                                       text.includes('最多') && 
                                                                       el.offsetParent !== null &&
                                                                       el.getBoundingClientRect().width > 0;
                                                            });
                                                            if (option) {
                                                                console.log('✅ 策略4成功: 全局搜索找到评论选项');
                                                                return option;
                                                            }
                                                            
                                                            console.log('❌ 所有策略都失败，未找到最多评论选项');
                                                            return null;
            })();
                                                    } catch (e) {
                                                        console.warn('评论选项查找异常:', e);
                                                    }
                                                    
                                                    if (!commentOption) {
                                                        await new Promise(resolve => setTimeout(resolve, 150));
                                                        commentAttempts++;
                                                    }
                                                }
                                                
                                                if (commentOption) {
                                                    try {
                                                        console.log('🎯 找到评论选项:', commentOption.textContent.trim());
                                                        console.log('📍 选项位置:', commentOption.getBoundingClientRect());
                                                        
                                                        // 确保元素可见和可点击
                                                        if (commentOption.offsetParent === null) {
                                                            console.warn('⚠️ 评论选项不可见');
                                                            return { success: true, message: '搜索执行成功，已点击搜索图标和图文区域，但评论选项不可见' };
                                                        }
                                                        
                                                        // 滚动到元素位置确保可见
                                                        commentOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        await new Promise(resolve => setTimeout(resolve, 200));
                                                        
                                                        // 尝试多种点击方式
                                                        let clickSuccess = false;
                                                        
                                                        // 方式1: 普通点击
                                                        try {
                                                            commentOption.click();
                                                            clickSuccess = true;
                                                            console.log('✅ 方式1成功: 普通点击');
                                                        } catch (e) {
                                                            console.log('❌ 方式1失败:', e.message);
                                                        }
                                                        
                                                        // 方式2: 事件分发
                                                        if (!clickSuccess) {
                                                            try {
                                                                const clickEvent = new MouseEvent('click', {
                                                                    bubbles: true,
                                                                    cancelable: true,
                                                                    view: window
                                                                });
                                                                commentOption.dispatchEvent(clickEvent);
                                                                clickSuccess = true;
                                                                console.log('✅ 方式2成功: 事件分发点击');
                                                            } catch (e) {
                                                                console.log('❌ 方式2失败:', e.message);
                                                            }
                                                        }
                                                        
                                                        // 方式3: 模拟鼠标事件序列
                                                        if (!clickSuccess) {
                                                            try {
                                                                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                                                                    const event = new MouseEvent(eventType, {
                                                                        bubbles: true,
                                                                        cancelable: true,
                                                                        view: window
                                                                    });
                                                                    commentOption.dispatchEvent(event);
                                                                });
                                                                clickSuccess = true;
                                                                console.log('✅ 方式3成功: 鼠标事件序列');
                                                            } catch (e) {
                                                                console.log('❌ 方式3失败:', e.message);
                                                            }
                                                        }
                                                        
                                                        if (clickSuccess) {
                                                            console.log('🎉 成功点击评论选项！');
                                                            // 等待界面响应
                                                            await new Promise(resolve => setTimeout(resolve, 500));
                                                            return { success: true, message: '🎉 搜索执行成功！已完成所有操作：搜索图标 → 图文区域 → 最多评论筛选' };
                                                        } else {
                                                            return { success: true, message: '搜索执行成功，已点击搜索图标和图文区域，但所有点击方式都失败' };
                                                        }
                                                        
                                                    } catch (e) {
                                                        console.warn('❌ 评论选项点击过程异常:', e);
                                                        return { success: true, message: '搜索执行成功，已点击搜索图标和图文区域，但评论筛选点击异常: ' + e.message };
                                                    }
                                                } else {
                                                    console.warn('❌ 经过所有策略仍未找到评论选项');
                                                    // 输出调试信息
                                                    const allVisibleText = Array.from(document.querySelectorAll('*'))
                                                        .filter(el => el.offsetParent !== null && el.textContent?.trim())
                                                        .map(el => el.textContent.trim())
                                                        .filter(text => text.includes('评论') || text.includes('排序') || text.includes('综合') || text.includes('最新'))
                                                        .slice(0, 20);
                                                    console.log('🔍 页面中包含关键词的文本:', allVisibleText);
                                                    return { success: true, message: '搜索执行成功，已点击搜索图标和图文区域，但未找到"最多评论"筛选选项' };
                                                }
                                                
                                            } catch (e) {
                                                console.warn('筛选按钮悬停失败:', e);
                                                return { success: true, message: '搜索执行成功，已点击搜索图标和图文区域，但筛选悬停失败: ' + e.message };
                                            }
                                        } else {
                                            return { success: true, message: '搜索执行成功，已点击搜索图标和图文区域，但未找到筛选按钮' };
                                        }
                                        
                                        return { success: true, message: '搜索执行成功，已点击搜索图标和图文区域' };
                                    } catch (e) {
                                        console.warn('图文区域点击失败:', e);
                                        return { success: true, message: '搜索执行成功，已点击搜索图标，但图文区域点击失败: ' + e.message };
                                    }
                                } else {
                                    return { success: true, message: '搜索执行成功，已点击搜索图标，但未找到图文区域' };
                                }
                                
                            } catch (e) {
                                return { success: true, message: '搜索执行成功，但点击图标失败: ' + e.message };
                            }
                        } else {
                            return { success: true, message: '搜索执行成功，但未找到搜索图标' };
                        }
                    } catch (e) {
                        return { success: true, message: '搜索执行成功，但图标操作异常: ' + e.message };
                    }
                    
                } catch (e) {
                    return { success: false, error: '搜索脚本执行异常: ' + e.message };
                }
            })().catch(e => ({ success: false, error: 'Promise异常: ' + e.message }));
        `;
        
        const result = await executeScript(accountId, searchScript);
        
        if (result.success && result.result.success) {
            showNotification(`搜索"${searchQuery}"执行成功！${result.result.message}`, 'success');
        } else {
            const errorMsg = result.result?.error || result.error || '搜索执行失败';
            showNotification(`搜索失败：${errorMsg}`, 'error');
            console.error('搜索执行失败:', result);
        }
        
    } catch (error) {
        console.error('执行搜索失败:', error);
        showNotification('搜索功能执行失败: ' + error.message, 'error');
    }
}

// 初始化实时展示容器（修改为使用正确容器）
function initRealtimeDisplay() {
    // 显示抓取内容区域
    const scrapedSection = document.getElementById('scraped-content-section');
    if (scrapedSection) {
        scrapedSection.style.display = 'block';
    }
    
    // 使用正确的抓取内容显示容器
    const contentDisplay = document.getElementById('scraped-content-display');
    if (!contentDisplay) {
        console.error('未找到scraped-content-display容器');
        return;
    }
    
    // 创建实时展示的HTML结构
    contentDisplay.innerHTML = `
        <div class="realtime-scraped-content">
            <div class="realtime-content-header">
                <h3>🔄 实时深度数据抓取</h3>
                <div class="realtime-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span class="progress-text">准备开始...</span>
                </div>
            </div>
            <div class="realtime-content-grid" id="realtimeContentGrid">
                <!-- 实时数据将在这里逐个展示 -->
            </div>
        </div>
    `;
    
    // 滚动到展示区域
    scrapedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 更新进度指示器
function updateProgress(current, total, status = '') {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressFill && progressText) {
        const percentage = Math.round((current / total) * 100);
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = status || `${current}/${total} (${percentage}%)`;
    }
}

// 实时添加单个内容到展示区域（修改为使用正确显示方式）
function addRealtimeContent(contentData, index, total) {
    // 收集所有实时抓取的数据
    if (!window.realtimeScrapedData) {
        window.realtimeScrapedData = [];
    }
    
    // 检查是否已存在相同内容（基于URL、标题或内容相似度）
    const isDuplicate = window.realtimeScrapedData.some(existingItem => {
        // URL完全匹配
        if (existingItem.url && contentData.url && existingItem.url === contentData.url) {
            return true;
        }
        
        // 标题相似度检查（90%以上认为重复）
        if (existingItem.title && contentData.title) {
            const similarity = calculateTextSimilarity(
                existingItem.title.toLowerCase(), 
                contentData.title.toLowerCase()
            );
            if (similarity >= 0.9) {
                return true;
            }
        }
        
        // 内容前100字符相似度检查（95%以上认为重复）
        if (existingItem.fullContent && contentData.fullContent) {
            const content1 = existingItem.fullContent.substring(0, 100).toLowerCase();
            const content2 = contentData.fullContent.substring(0, 100).toLowerCase();
            const similarity = calculateTextSimilarity(content1, content2);
            if (similarity >= 0.95) {
                return true;
            }
        }
        
        return false;
    });
    
    if (isDuplicate) {
        console.log('🔄 实时抓取发现重复内容，跳过:', {
            title: contentData.title?.substring(0, 30) + '...',
            index: index
        });
        updateProgress(index, total, `已抓取 ${index}/${total} 条数据 (跳过重复)`);
        showNotification(`⚠️ 第 ${index} 条数据重复，已跳过`, 'warning');
        return;
    }
    
    // 添加到数据集合中
    window.realtimeScrapedData.push(contentData);
    
    // 实时更新显示
    displayScrapedContent(window.realtimeScrapedData);
    
    // 更新进度
    updateProgress(index, total, `已抓取 ${index}/${total} 条数据 (${window.realtimeScrapedData.length} 条有效)`);
    
    showNotification(`📄 成功获取第 ${index} 条数据：${contentData.title?.substring(0, 20) || '内容'}...`, 'success');
}

// 计算文本相似度的辅助函数
function calculateTextSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    let matches = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
        if (str1[i] === str2[i]) {
            matches++;
        }
    }
    
    return matches / maxLength;
}

// 获取数据提取脚本的函数
async function getExtractDetailPageDataScript() {
    return `
        // 提取详情页数据的函数
        async function extractDetailPageData(index) {
            try {
                // 等待详情页内容加载
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const detailData = {
                    id: 'detail_' + Date.now() + '_' + index,
                    index: index,
                    title: '',
                    fullContent: '',
                    author: '',
                    authorAvatar: '',
                    images: [],
                    tags: [],
                    comments: 0,
                    likes: 0,
                    collects: 0,
                    shares: 0,
                    publishTime: '',
                    contentType: '',
                    url: window.location.href
                };
                
                // 提取完整标题
                const titleSelectors = [
                    '#detail-title',
                    '.title',
                    '.note-content .title',
                    'h1',
                    '.note-title',
                    '[class*="title"]',
                    '.content-title',
                    'h2',
                    'h3'
                ];
                
                for (const selector of titleSelectors) {
                    const titleEl = document.querySelector(selector);
                    if (titleEl && titleEl.textContent.trim()) {
                        detailData.title = titleEl.textContent.trim();
                        console.log('✅ 提取到标题:', detailData.title.substring(0, 30) + '...');
                        break;
                    }
                }
                
                // 提取完整正文内容
                const contentSelectors = [
                    '#detail-desc .note-text span',
                    '#detail-desc .note-text',
                    '.note-content',
                    '.content-text',
                    '.desc',
                    '[class*="content"]',
                    '[class*="desc"]',
                    'p'
                ];
                
                let fullContent = '';
                for (const selector of contentSelectors) {
                    const contentElements = document.querySelectorAll(selector);
                    for (const el of contentElements) {
                        if (el && el.textContent.trim() && el.textContent.trim().length > 10) {
                            const text = el.textContent.trim();
                            if (!text.startsWith('#') && !text.startsWith('@')) {
                                fullContent += text + '\\n';
                            }
                        }
                    }
                    if (fullContent) break;
                }
                detailData.fullContent = fullContent.trim();
                
                if (!detailData.fullContent && detailData.title) {
                    detailData.fullContent = detailData.title;
                }
                
                // 提取作者信息
                const authorSelectors = [
                    '.author-name',
                    '.user-name',
                    '.nickname',
                    '[class*="author"]',
                    '[class*="user"]'
                ];
                
                for (const selector of authorSelectors) {
                    const authorEl = document.querySelector(selector);
                    if (authorEl && authorEl.textContent.trim()) {
                        detailData.author = authorEl.textContent.trim();
                        break;
                    }
                }
                
                // 提取作者头像
                const avatarSelectors = [
                    '.author-avatar img',
                    '.user-avatar img',
                    '.avatar img',
                    '[class*="avatar"] img'
                ];
                
                for (const selector of avatarSelectors) {
                    const avatarEl = document.querySelector(selector);
                    if (avatarEl && avatarEl.src) {
                        detailData.authorAvatar = avatarEl.src;
                        break;
                    }
                }
                
                // 提取所有图片
                const imageElements = document.querySelectorAll([
                    '.note-image img',
                    '.content-image img',
                    '.photo img',
                    '[class*="image"] img',
                    '.swiper-slide img',
                    '.pic img'
                ].join(', '));
                
                detailData.images = Array.from(imageElements)
                    .map(img => ({
                        url: img.src || img.dataset.src,
                        alt: img.alt || '',
                        width: img.naturalWidth || img.width || 0,
                        height: img.naturalHeight || img.height || 0
                    }))
                    .filter(imgObj => imgObj.url && !imgObj.url.includes('avatar') && !imgObj.url.includes('icon'));
                
                // 提取标签
                const tagElements = document.querySelectorAll([
                    '.tag',
                    '.hashtag',
                    '[class*="tag"]',
                    'a[href*="tag"]'
                ].join(', '));
                
                detailData.tags = Array.from(tagElements)
                    .map(tag => tag.textContent.trim().replace('#', ''))
                    .filter(tag => tag.length > 0 && tag.length < 20);
                
                // 提取互动数据
                const statElements = document.querySelectorAll([
                    '.stat',
                    '.count',
                    '[class*="like"]',
                    '[class*="comment"]',
                    '[class*="share"]',
                    '[class*="collect"]'
                ].join(', '));
                
                statElements.forEach(el => {
                    const text = el.textContent.trim();
                    const number = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                    const className = (el.className || '').toString().toLowerCase();
                    
                    if (className.includes('like')) {
                        detailData.likes = number;
                    } else if (className.includes('comment')) {
                        detailData.comments = number;
                    } else if (className.includes('share')) {
                        detailData.shares = number;
                    } else if (className.includes('collect')) {
                        detailData.collects = number;
                    }
                });
                
                // 判断内容类型
                if (detailData.images.length > 0) {
                    detailData.contentType = '图文';
                } else if (document.querySelector('video')) {
                    detailData.contentType = '视频';
                } else {
                    detailData.contentType = '文字';
                }
                
                // 提取发布时间
                const timeSelectors = [
                    '.publish-time',
                    '.time',
                    '[class*="time"]',
                    '.date'
                ];
                
                for (const selector of timeSelectors) {
                    const timeEl = document.querySelector(selector);
                    if (timeEl && timeEl.textContent.trim()) {
                        detailData.publishTime = timeEl.textContent.trim();
                        break;
                    }
                }
                
                console.log('🎉 详情页数据提取完成:', detailData.title);
                return detailData;
                
            } catch (error) {
                console.error('提取详情页数据失败:', error);
                return {
                    error: '数据提取异常: ' + error.message,
                    success: false
                };
            }
        }
    `;
}

// 处理卡片的实时抓取
async function processCardsRealtime(accountId) {
    // 首先获取卡片列表
    const getCardsScript = `
        (async () => {
            // 等待页面加载
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 查找内容卡片
            let cardElements = document.querySelectorAll([
                '.note-item',
                '.feed-item', 
                '.content-item',
                '[class*="note"]',
                '[class*="feed"]',
                '[class*="card"]',
                'section[class*="note"]',
                'div[class*="explore"]'
            ].join(', '));
            
            if (cardElements.length === 0) {
                const allDivs = document.querySelectorAll('div');
                cardElements = Array.from(allDivs).filter(div => {
                    const hasImage = div.querySelector('img');
                    const hasText = div.textContent && div.textContent.trim().length > 10;
                    const hasLink = div.querySelector('a') || div.closest('a');
                    return hasImage && hasText && hasLink;
                });
            }
            
            // 智能偏移：基于时间戳确保同次抓取内偏移一致，不同次抓取有差异
            const sessionSeed = Math.floor(Date.now() / 60000); // 每分钟变化一次的种子
            const pseudoRandomOffset = (sessionSeed % 5); // 0-4的伪随机偏移，同次抓取保持一致
            const startIndex = Math.min(pseudoRandomOffset, Math.max(0, cardElements.length - 6));
            const maxCards = Math.min(cardElements.length - startIndex, 6); // 抓取6条帖子
            
            // 从偏移位置开始选择卡片
            cardElements = Array.from(cardElements).slice(startIndex, startIndex + maxCards);
            console.log('📋 使用智能偏移 ' + pseudoRandomOffset + '，从第' + (startIndex + 1) + '个位置开始，准备抓取' + maxCards + '条帖子');
            return {
                success: true,
                totalCards: maxCards,
                originalUrl: window.location.href
            };
        })()
    `;
    
    const cardsResult = await executeScript(accountId, getCardsScript);
    if (!cardsResult.success || !cardsResult.result.success) {
        throw new Error('获取卡片列表失败');
    }
    
    const totalCards = cardsResult.result.totalCards;
    updateProgress(0, totalCards, '开始逐个抓取数据...');
    
    // 逐个处理每个卡片
    for (let i = 0; i < totalCards; i++) {
        try {
            const singleCardScript = `
                (async () => {
                    const cardIndex = ${i};
                    const originalUrl = '${cardsResult.result.originalUrl}';
                    
                    // 优化的页面导航检查（减少强制刷新）
                    if (window.location.href !== originalUrl) {
                        console.log('🔍 检测到页面偏离，当前:', window.location.href);
                        console.log('🎯 目标页面:', originalUrl);
                        
                        // 尝试温和的导航方式
                        if (document.referrer && document.referrer.includes('xiaohongshu.com') && 
                            (window.location.href.includes('/explore/') || window.location.href.includes('/discovery/'))) {
                            console.log('🔙 尝试使用 history.back() 返回...');
                            window.history.back();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 检查返回是否成功
                            if (window.location.href !== originalUrl) {
                                console.log('⚠️ history.back() 失败，使用直接跳转');
                                window.location.href = originalUrl;
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            } else {
                                console.log('✅ 成功通过 history.back() 返回');
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } else {
                            // 只在确实需要时才强制跳转
                            console.log('🔄 执行直接页面跳转');
                            window.location.href = originalUrl;
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    } else {
                        console.log('✅ 已在正确页面，无需跳转');
                    }
                    
                    // 重新获取卡片
                    let cardElements = document.querySelectorAll([
                        '.note-item',
                        '.feed-item', 
                        '.content-item',
                        '[class*="note"]',
                        '[class*="feed"]',
                        '[class*="card"]',
                        'section[class*="note"]',
                        'div[class*="explore"]'
                    ].join(', '));
                    
                    if (cardElements.length === 0) {
                        const allDivs = document.querySelectorAll('div');
                        cardElements = Array.from(allDivs).filter(div => {
                            const hasImage = div.querySelector('img');
                            const hasText = div.textContent && div.textContent.trim().length > 10;
                            const hasLink = div.querySelector('a') || div.closest('a');
                            return hasImage && hasText && hasLink;
                        });
                    }
                    
                    // 使用与卡片列表获取时相同的偏移算法，确保索引一致性
                    const sessionSeed = Math.floor(Date.now() / 60000); // 与获取卡片时相同的种子
                    const pseudoRandomOffset = (sessionSeed % 5); // 与获取卡片时相同的偏移
                    const actualIndex = pseudoRandomOffset + cardIndex;
                    
                    // 优先使用data-index属性精确选择
                    let card = document.querySelector('[data-index="' + actualIndex + '"]');
                    
                    // 如果没找到，回退到原来的方式
                    if (!card && cardElements[cardIndex]) {
                        card = cardElements[cardIndex];
                    }
                    
                    if (!card) {
                        console.log('⚠️ 未找到索引为' + actualIndex + '的帖子，跳过');
                        return { success: false, error: '卡片不存在 - 索引' + actualIndex };
                    }
                    
                    console.log('🎯 选择点击第' + actualIndex + '个帖子 (data-index="' + actualIndex + '")');
                    
                    // 查找标题元素
                    const titleElement = card.querySelector('span[data-v-51ec0135]') || 
                                        Array.from(card.querySelectorAll('span')).find(span => 
                                            span.textContent.trim().length > 5
                                        ) ||
                                        card.querySelector('h3') ||
                                        card.querySelector('h4');
                    
                    if (!titleElement) {
                        return { success: false, error: '未找到标题元素' };
                    }
                    
                    // 点击进入详情页
                    titleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    titleElement.click();
                    
                    // 等待页面跳转
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    
                    // 抓取详情页数据
                    console.log('开始抓取详情页数据，当前URL:', window.location.href);
                    const detailData = await extractDetailPageData(cardIndex + 1);
                    console.log('详情页数据抓取结果:', detailData);
                    
                    // 返回原页面
                    window.history.back();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    if (!detailData || detailData.error || detailData.success === false) {
                        return {
                            success: false,
                            error: detailData?.error || '详情页数据提取失败',
                            index: cardIndex + 1
                        };
                    }
                    
                    return {
                        success: true,
                        data: detailData,
                        index: cardIndex + 1
                    };
                })()
            `;
            
            // 在这个脚本中需要包含 extractDetailPageData 函数
            const scriptWithExtractor = `
                ${await getExtractDetailPageDataScript()}
                
                ${singleCardScript}
            `;
            
            const result = await executeScript(accountId, scriptWithExtractor);
            
            if (result.success && result.result.success && result.result.data) {
                // 实时添加到前端展示
                addRealtimeContent(result.result.data, i + 1, totalCards);
            } else {
                // 详细的错误日志，帮助调试
                console.warn(`第 ${i + 1} 个帖子抓取失败:`, {
                    resultSuccess: result.success,
                    resultResult: result.result,
                    error: result.result?.error || result.error || '未知错误',
                    fullResult: result
                });
                const errorMsg = result.result?.error || result.error || '未知错误';
                updateProgress(i + 1, totalCards, `第 ${i + 1} 条抓取失败: ${errorMsg}`);
            }
            
            // 添加延迟避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`处理第 ${i + 1} 个卡片失败:`, error);
            updateProgress(i + 1, totalCards, `第 ${i + 1} 条处理失败`);
        }
    }
    
    // 完成所有抓取
    updateProgress(totalCards, totalCards, '🎉 实时抓取完成！');
    showNotification('🎉 实时深度抓取全部完成！', 'success');
}

// 显示实时抓取或批量抓取选择界面
function showRealtimeOrBatchChoice(accountId) {
    // 创建选择界面
    const choiceContainer = document.createElement('div');
    choiceContainer.className = 'scrape-choice-container';
    choiceContainer.innerHTML = `
        <div class="scrape-choice-modal">
            <div class="choice-header">
                <h3>🚀 选择抓取模式</h3>
                <p>请选择您偏好的数据抓取方式</p>
            </div>
            <div class="choice-options">
                <div class="choice-option realtime-option" onclick="startRealtimeScrape('${accountId}')">
                    <div class="option-icon">🔄</div>
                    <div class="option-content">
                        <h4>实时抓取模式</h4>
                        <p>逐个抓取帖子，实时展示结果</p>
                        <ul>
                            <li>✅ 实时查看进度</li>
                            <li>✅ 逐条数据展示</li>
                            <li>✅ 更好的用户体验</li>
                            <li>⚠️ 抓取速度稍慢</li>
                        </ul>
                    </div>
                </div>
                <div class="choice-option batch-option" onclick="startBatchScrape('${accountId}')">
                    <div class="option-icon">⚡</div>
                    <div class="option-content">
                        <h4>批量抓取模式</h4>
                        <p>一次性抓取所有数据后展示</p>
                        <ul>
                            <li>✅ 抓取速度更快</li>
                            <li>✅ 数据完整性更好</li>
                            <li>✅ 传统成熟方案</li>
                            <li>⚠️ 需等待全部完成</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="choice-footer">
                <button class="close-choice-btn" onclick="closeChoiceModal()">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(choiceContainer);
    
    // 添加样式（如果还没有的话）
    if (!document.querySelector('#scrapeChoiceStyle')) {
        const style = document.createElement('style');
        style.id = 'scrapeChoiceStyle';
        style.textContent = `
            .scrape-choice-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            }
            
            .scrape-choice-modal {
                background: white;
                border-radius: 20px;
                padding: 30px;
                max-width: 800px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.3s ease;
            }
            
            @keyframes modalSlideIn {
                from { opacity: 0; transform: translateY(-50px) scale(0.9); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            @keyframes modalSlideOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-50px) scale(0.9); }
            }
            
            .choice-header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .choice-header h3 {
                margin: 0 0 10px 0;
                font-size: 28px;
                color: #333;
                font-weight: 700;
            }
            
            .choice-header p {
                margin: 0;
                color: #666;
                font-size: 16px;
            }
            
            .choice-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .choice-option {
                border: 2px solid #e1e5f2;
                border-radius: 15px;
                padding: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: #f8f9ff;
            }
            
            .choice-option:hover {
                border-color: #667eea;
                background: #f0f4ff;
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
            }
            
            .realtime-option:hover {
                border-color: #10b981;
                background: #f0fdf4;
            }
            
            .batch-option:hover {
                border-color: #f59e0b;
                background: #fffbeb;
            }
            
            .option-icon {
                font-size: 48px;
                text-align: center;
                margin-bottom: 15px;
            }
            
            .option-content h4 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 20px;
                font-weight: 600;
                text-align: center;
            }
            
            .option-content p {
                margin: 0 0 15px 0;
                color: #666;
                text-align: center;
                font-size: 14px;
            }
            
            .option-content ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .option-content li {
                padding: 4px 0;
                font-size: 13px;
                color: #555;
            }
            
            .choice-footer {
                text-align: center;
            }
            
            .close-choice-btn {
                background: #6b7280;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: background 0.3s ease;
            }
            
            .close-choice-btn:hover {
                background: #4b5563;
            }
            
            @media (max-width: 768px) {
                .choice-options {
                    grid-template-columns: 1fr;
                }
                
                .scrape-choice-modal {
                    margin: 20px;
                    padding: 20px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    showNotification('💡 请选择您偏好的数据抓取模式', 'info');
}

// 启动实时抓取
window.startRealtimeScrape = function(accountId) {
    closeChoiceModal();
    showNotification('🔄 启动实时抓取模式...', 'info');
    scrapeXiaohongshuContentDeepRealtime(accountId);
};

// 启动批量抓取
window.startBatchScrape = function(accountId) {
    closeChoiceModal();
    showNotification('⚡ 启动批量抓取模式...', 'info');
    scrapeXiaohongshuContentDeep(accountId);
};

// 关闭选择模态框
window.closeChoiceModal = function() {
    const container = document.querySelector('.scrape-choice-container');
    if (container) {
        container.style.animation = 'modalSlideOut 0.3s ease forwards';
        setTimeout(() => {
            container.remove();
        }, 300);
    }
};

// 深度抓取小红书内容数据（实时传递版本）
async function scrapeXiaohongshuContentDeepRealtime(accountId) {
    try {
        console.log('🔍 开始实时深度抓取小红书内容数据...');
        showNotification('正在执行实时深度数据抓取...', 'info');
        
        // 显示抓取内容区域
        const scrapedSection = document.getElementById('scraped-content-section');
        if (scrapedSection) {
            scrapedSection.style.display = 'block';
        }
        
        // 清空之前的实时抓取数据
        window.realtimeScrapedData = [];
        
        // 获取卡片列表并逐个处理
        await processCardsRealtime(accountId);
        
        return { success: true, message: '实时深度抓取完成' };
        
    } catch (error) {
        console.error('实时深度抓取失败:', error);
        showNotification('实时深度抓取失败：' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// 深度抓取小红书内容数据（原批量版本）
async function scrapeXiaohongshuContentDeep(accountId) {
    try {
        console.log('🔍 开始深度抓取小红书内容数据...');
        showNotification('正在执行深度数据抓取...', 'info');
        
        const deepScrapeScript = `
            (async () => {
                try {
                    // 等待页面完全加载
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    console.log('📊 开始深度解析页面内容...');
                    
                    // 存储所有抓取的数据
                    const allContentData = [];
                    let currentIndex = 0;
                    
                    // 查找内容卡片容器
                    let cardElements = document.querySelectorAll([
                        '.note-item',
                        '.feed-item', 
                        '.content-item',
                        '[class*="note"]',
                        '[class*="feed"]',
                        '[class*="card"]',
                        'section[class*="note"]',
                        'div[class*="explore"]'
                    ].join(', '));
                    
                    console.log('🎯 找到 ' + cardElements.length + ' 个潜在卡片元素');
                    
                    // 如果没找到，尝试更通用的查找方式
                    if (cardElements.length === 0) {
                        const allDivs = document.querySelectorAll('div');
                        cardElements = Array.from(allDivs).filter(div => {
                            const hasImage = div.querySelector('img');
                            const hasText = div.textContent && div.textContent.trim().length > 10;
                            const hasLink = div.querySelector('a') || div.closest('a');
                            return hasImage && hasText && hasLink;
                        });
                        console.log('🔍 通用查找找到 ' + cardElements.length + ' 个卡片');
                    }
                    
                    // 智能偏移：基于时间戳确保同次抓取内偏移一致，不同次抓取有差异
                    const sessionSeed = Math.floor(Date.now() / 60000); // 每分钟变化一次的种子
                    const pseudoRandomOffset = (sessionSeed % 5); // 0-4的伪随机偏移，同次抓取保持一致
                    const startIndex = Math.min(pseudoRandomOffset, Math.max(0, cardElements.length - 6));
                    const maxCards = Math.min(cardElements.length - startIndex, 6); // 抓取6条帖子
                    
                    // 从偏移位置开始选择卡片
                    cardElements = Array.from(cardElements).slice(startIndex, startIndex + maxCards);
                    console.log('📋 使用智能偏移 ' + pseudoRandomOffset + '，从第' + (startIndex + 1) + '个位置开始，准备深度处理前' + maxCards + '个帖子');
                    
                    // 保存原始页面URL，用于返回
                    const originalUrl = window.location.href;
                    console.log('🏠 原始页面URL: ' + originalUrl);
                    
                    // 逐个点击进入详情页获取数据
                    for (let i = 0; i < maxCards; i++) {
                        const card = cardElements[i];
                        if (!card || !card.offsetParent) continue;
                        
                        currentIndex = i + 1;
                        console.log('🎯 开始处理第 ' + currentIndex + '/' + maxCards + ' 个帖子...');
                        
                        try {
                            // 查找帖子标题文字元素（而不是链接）
                            const titleElement = card.querySelector('span[data-v-51ec0135]') || 
                                                card.querySelector('span[data-v-51ec0135][data-v-a264b01a]') ||
                                                Array.from(card.querySelectorAll('span')).find(span => 
                                                    span.hasAttribute('data-v-51ec0135') || 
                                                    span.textContent.trim().length > 5
                                                ) ||
                                                card.querySelector('h3') ||
                                                card.querySelector('h4') ||
                                                card.querySelector('.title') ||
                                                card.querySelector('[class*="title"]') ||
                                                card.querySelector('div[class*="title"]') ||
                                                Array.from(card.querySelectorAll('span')).find(span => 
                                                    span.textContent.trim().length > 10
                                                );
                            
                            if (!titleElement || !titleElement.textContent.trim()) {
                                console.warn('⚠️ 第 ' + currentIndex + ' 个帖子没有找到标题文字元素');
                                continue;
                            }
                            
                            console.log('🎯 找到标题元素:', titleElement.textContent.trim().substring(0, 30) + '...');
                            
                            // 获取帖子链接（从卡片或父级元素中查找）
                            let postUrl = '';
                            
                            // 尝试从卡片的链接元素获取URL
                            const linkElement = card.querySelector('a') || card.closest('a');
                            if (linkElement && linkElement.href) {
                                postUrl = linkElement.href;
                            } else {
                                // 尝试从onclick属性获取链接
                                const onclickAttr = titleElement.getAttribute('onclick') || 
                                                  card.getAttribute('onclick') ||
                                                  (card.closest('a') && card.closest('a').getAttribute('onclick'));
                                if (onclickAttr && onclickAttr.includes('http')) {
                                    const urlMatch = onclickAttr.match(/https?:\\/\\/[^\\s"']+/);
                                    if (urlMatch) postUrl = urlMatch[0];
                                }
                            }
                            
                            // 如果还是没找到URL，记录但继续点击（可能是SPA路由）
                            if (!postUrl) {
                                console.log('⚠️ 第 ' + currentIndex + ' 个帖子未找到直接URL，将尝试点击标题元素');
                                postUrl = 'javascript:void(0)'; // 占位符
                            } else {
                                console.log('🔗 找到帖子链接: ' + postUrl);
                            }
                            
                            // 模拟点击标题元素进入详情页
                            console.log('🖱️ 准备点击标题元素...');
                            
                            try {
                                // 确保元素可见
                                titleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                // 尝试多种点击方式
                                let clickSuccess = false;
                                
                                // 方式1: 直接点击标题元素
                                try {
                                    titleElement.click();
                                    clickSuccess = true;
                                    console.log('✅ 方式1成功: 直接点击标题元素');
                                } catch (e) {
                                    console.log('❌ 方式1失败:', e.message);
                                }
                                
                                // 方式2: 触发鼠标事件
                                if (!clickSuccess) {
                                    try {
                                        const clickEvent = new MouseEvent('click', {
                                            bubbles: true,
                                            cancelable: true,
                                            view: window
                                        });
                                        titleElement.dispatchEvent(clickEvent);
                                        clickSuccess = true;
                                        console.log('✅ 方式2成功: 鼠标事件点击');
                                    } catch (e) {
                                        console.log('❌ 方式2失败:', e.message);
                                    }
                                }
                                
                                // 方式3: 如果有链接作为备用
                                if (!clickSuccess && linkElement && postUrl !== 'javascript:void(0)') {
                                    try {
                                        if (linkElement.click) {
                                            linkElement.click();
                                            clickSuccess = true;
                                            console.log('✅ 方式3成功: 备用链接点击');
                                        } else {
                                            window.location.href = postUrl;
                                            clickSuccess = true;
                                            console.log('✅ 方式3成功: 直接导航');
                                        }
                                    } catch (e) {
                                        console.log('❌ 方式3失败:', e.message);
                                    }
                                }
                                
                                if (!clickSuccess) {
                                    console.warn('⚠️ 所有点击方式都失败，跳过这个帖子');
                                    continue;
                                }
                                
                            } catch (clickError) {
                                console.error('❌ 点击过程异常:', clickError);
                                continue;
                            }
                            
                            // 等待页面跳转和加载
                            await new Promise(resolve => setTimeout(resolve, 4000));
                            
                            // 额外等待图片开始加载
                            console.log('📸 等待页面图片开始加载...');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 检查是否成功跳转到详情页
                            const currentUrl = window.location.href;
                            if (currentUrl === originalUrl) {
                                console.warn('⚠️ 第 ' + currentIndex + ' 个帖子跳转失败，尝试直接导航');
                                window.location.href = postUrl;
                                await new Promise(resolve => setTimeout(resolve, 4000));
                            }
                            
                            console.log('📄 已进入详情页，开始提取数据...');
                            
                            // 提取详情页的完整数据
                            const detailData = await extractDetailPageData(currentIndex);
                            
                            if (detailData) {
                                allContentData.push(detailData);
                                console.log('✅ 第 ' + currentIndex + ' 个帖子数据提取成功: ' + detailData.title.substring(0, 30) + '...');
                            }
                            
                            // 返回原始列表页面
                            console.log('🔙 返回列表页面...');
                            window.history.back();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 优化的返回检查（减少强制刷新）
                            if (window.location.href !== originalUrl) {
                                console.log('⚠️ history.back() 未能返回到目标页面');
                                console.log('当前页面:', window.location.href);
                                console.log('目标页面:', originalUrl);
                                
                                // 再次尝试 history.back()，有些情况下需要多次返回
                                if (window.location.href.includes('/explore/') || 
                                    window.location.href.includes('/discovery/') ||
                                    window.location.href.includes('/user/')) {
                                    console.log('🔙 再次尝试 history.back()...');
                                    window.history.back();
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                }
                                
                                // 如果仍然不在目标页面，才进行直接跳转
                                if (window.location.href !== originalUrl) {
                                    console.log('🔄 使用直接跳转返回列表页');
                                    window.location.href = originalUrl;
                                    await new Promise(resolve => setTimeout(resolve, 3000));
                                } else {
                                    console.log('✅ 成功返回到列表页');
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            } else {
                                console.log('✅ 直接返回成功');
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                            
                            // 重新获取卡片元素（因为页面可能重新加载）
                            cardElements = document.querySelectorAll([
                                '.note-item',
                                '.feed-item', 
                                '.content-item',
                                '[class*="note"]',
                                '[class*="feed"]',
                                '[class*="card"]',
                                'section[class*="note"]',
                                'div[class*="explore"]'
                            ].join(', '));
                            
                            if (cardElements.length === 0) {
                                const allDivs = document.querySelectorAll('div');
                                cardElements = Array.from(allDivs).filter(div => {
                                    const hasImage = div.querySelector('img');
                                    const hasText = div.textContent && div.textContent.trim().length > 10;
                                    const hasLink = div.querySelector('a') || div.closest('a');
                                    return hasImage && hasText && hasLink;
                                });
                            }
                            
                        } catch (cardError) {
                            console.error('❌ 处理第 ' + currentIndex + ' 个帖子失败:', cardError);
                            // 优化的错误恢复策略
                            try {
                                console.log('🔧 尝试错误恢复...');
                                
                                // 检查当前是否在搜索结果页面
                                if (window.location.href.includes('search_result') && 
                                    window.location.href !== originalUrl) {
                                    console.log('📍 当前在搜索页面，尝试温和跳转');
                                    window.location.href = originalUrl;
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } else if (!window.location.href.includes('search_result')) {
                                    console.log('🔙 当前不在搜索页面，尝试返回');
                                    // 先尝试 history.back()
                                    if (document.referrer && document.referrer.includes('xiaohongshu.com')) {
                                        window.history.back();
                                        await new Promise(resolve => setTimeout(resolve, 2000));
                                        
                                        // 如果返回失败，再使用直接跳转
                                        if (!window.location.href.includes('search_result')) {
                                            console.log('🔄 返回失败，使用直接跳转');
                                            window.location.href = originalUrl;
                                            await new Promise(resolve => setTimeout(resolve, 3000));
                                        }
                                    } else {
                                        console.log('🔄 直接跳转到搜索页面');
                                        window.location.href = originalUrl;
                                        await new Promise(resolve => setTimeout(resolve, 3000));
                                    }
                                } else {
                                    console.log('✅ 已在正确页面，继续处理');
                                }
                            } catch (returnError) {
                                console.error('❌ 错误恢复失败:', returnError);
                            }
                        }
                        
                        // 添加延迟，避免请求过于频繁
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    console.log('🎉 深度数据抓取完成！共获取 ' + allContentData.length + ' 条完整内容');
                    
                    // 返回抓取结果
                    return {
                        success: true,
                        data: allContentData,
                        total: allContentData.length,
                        timestamp: new Date().toISOString(),
                        source: 'xiaohongshu_deep_scrape',
                        processedCount: currentIndex,
                        totalAttempted: maxCards
                    };
                    
                } catch (error) {
                    console.error('❌ 深度数据抓取异常:', error);
                    return {
                        success: false,
                        error: error.message,
                        data: allContentData || [],
                        total: allContentData ? allContentData.length : 0
                    };
                }
                
                // 提取详情页数据的函数
                async function extractDetailPageData(index) {
                    try {
                        // 等待详情页内容加载
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // 额外等待图片和动态内容加载
                        console.log('🎯 等待详情页图片和动态内容加载...');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        const detailData = {
                            id: 'detail_' + Date.now() + '_' + index,
                            index: index,
                            title: '',
                            fullContent: '',
                            author: '',
                            authorAvatar: '',
                            images: [],
                            tags: [],
                            comments: 0,
                            likes: 0,
                            collects: 0,
                            shares: 0,
                            publishTime: '',
                            contentType: '',
                            url: window.location.href
                        };
                        
                        // 提取完整标题 - 根据实际HTML结构优化
                        const titleSelectors = [
                            '#detail-title',           // 你提供的HTML中的标题ID
                            '.title',
                            '.note-content .title',
                            'h1',
                            '.note-title',
                            '[class*="title"]',
                            '.content-title',
                            'h2',
                            'h3'
                        ];
                        
                        for (const selector of titleSelectors) {
                            const titleEl = document.querySelector(selector);
                            if (titleEl && titleEl.textContent.trim()) {
                                detailData.title = titleEl.textContent.trim();
                                console.log('✅ 提取到标题:', detailData.title.substring(0, 30) + '...');
                                break;
                            }
                        }
                        
                        // 提取完整正文内容 - 根据实际HTML结构优化
                        const contentSelectors = [
                            '#detail-desc .note-text span',  // 你提供的HTML中的正文结构
                            '#detail-desc .note-text',
                            '.note-content',
                            '.content-text',
                            '.desc',
                            '[class*="content"]',
                            '[class*="desc"]',
                            'p'
                        ];
                        
                        let fullContent = '';
                        for (const selector of contentSelectors) {
                            const contentElements = document.querySelectorAll(selector);
                            for (const el of contentElements) {
                                if (el && el.textContent.trim() && el.textContent.trim().length > 10) {
                                    // 跳过标签内容，只提取纯文本
                                    const text = el.textContent.trim();
                                    if (!text.startsWith('#') && !text.startsWith('@')) {
                                        fullContent += text + '\\n';
                                    }
                                }
                            }
                            if (fullContent) break;
                        }
                        detailData.fullContent = fullContent.trim();
                        console.log('✅ 提取到正文:', detailData.fullContent.substring(0, 50) + '...');
                        
                        // 如果没有找到正文，使用标题作为内容
                        if (!detailData.fullContent && detailData.title) {
                            detailData.fullContent = detailData.title;
                        }
                        
                        // 提取作者信息
                        const authorSelectors = [
                            '.author-name',
                            '.user-name',
                            '.nickname',
                            '[class*="author"]',
                            '[class*="user"]'
                        ];
                        
                        for (const selector of authorSelectors) {
                            const authorEl = document.querySelector(selector);
                            if (authorEl && authorEl.textContent.trim()) {
                                detailData.author = authorEl.textContent.trim();
                                break;
                            }
                        }
                        
                        // 提取作者头像
                        const avatarImg = document.querySelector('img[class*="avatar"], img[class*="user"], .avatar img');
                        if (avatarImg && avatarImg.src) {
                            detailData.authorAvatar = avatarImg.src;
                        }
                        
                        // 等待图片加载完成的函数
                        const waitForImagesLoaded = async (timeout = 8000) => {
                            console.log('🖼️ 开始等待图片加载...');
                            
                            const imageSelectors = [
                                'img.note-slider-img',      // 你提供的HTML中的图片类
                                'img[data-xhs-img]',        // 小红书特有的图片属性
                                '.note-slider img',
                                '.image-container img',
                                'img'
                            ];
                            
                            let allImages = [];
                            for (const selector of imageSelectors) {
                                const images = document.querySelectorAll(selector);
                                for (const img of images) {
                                    if (img.src && 
                                        !img.src.includes('avatar') && 
                                        !img.src.includes('icon') &&
                                        !img.src.includes('logo') &&
                                        img.src.startsWith('http')) {
                                        allImages.push(img);
                                    }
                                }
                                if (allImages.length > 0) break; // 找到图片后停止查找
                            }
                            
                            if (allImages.length === 0) {
                                console.log('⚠️ 没有找到图片元素');
                                return [];
                            }
                            
                            console.log('🔍 找到', allImages.length, '张图片，开始等待加载...');
                            
                            // 等待所有图片加载完成
                            const imagePromises = allImages.map((img, index) => {
                                return new Promise((resolve) => {
                                    // 如果图片已经加载完成
                                    if (img.complete && img.naturalWidth > 0) {
                                        console.log('✅ 图片', index + 1, '已加载完成:', img.src.substring(0, 50) + '...');
                                        resolve({
                                            url: img.src,
                                            alt: img.alt || '',
                                            width: img.naturalWidth || img.width,
                                            height: img.naturalHeight || img.height
                                        });
                                        return;
                                    }
                                    
                                    // 设置加载事件监听
                                    const onLoad = () => {
                                        console.log('✅ 图片', index + 1, '加载完成:', img.src.substring(0, 50) + '...');
                                        cleanup();
                                        resolve({
                                            url: img.src,
                                            alt: img.alt || '',
                                            width: img.naturalWidth || img.width,
                                            height: img.naturalHeight || img.height
                                        });
                                    };
                                    
                                    const onError = () => {
                                        console.log('❌ 图片', index + 1, '加载失败:', img.src.substring(0, 50) + '...');
                                        cleanup();
                                        resolve(null); // 加载失败返回null
                                    };
                                    
                                    const cleanup = () => {
                                        img.removeEventListener('load', onLoad);
                                        img.removeEventListener('error', onError);
                                    };
                                    
                                    img.addEventListener('load', onLoad);
                                    img.addEventListener('error', onError);
                                    
                                    // 超时处理
                                    setTimeout(() => {
                                        console.log('⏰ 图片', index + 1, '加载超时:', img.src.substring(0, 50) + '...');
                                        cleanup();
                                        resolve({
                                            url: img.src,
                                            alt: img.alt || '',
                                            width: img.naturalWidth || img.width || 0,
                                            height: img.naturalHeight || img.height || 0
                                        });
                                    }, timeout / allImages.length); // 平均分配超时时间
                                });
                            });
                            
                            // 等待所有图片处理完成
                            const results = await Promise.all(imagePromises);
                            const validImages = results.filter(img => img !== null);
                            
                            console.log('🎉 图片加载完成:', validImages.length, '/', allImages.length);
                            return validImages;
                        };
                        
                        // 等待图片加载并提取
                        console.log('📸 开始等待图片加载...');
                        const loadedImages = await waitForImagesLoaded(8000);
                        
                        // 去重并添加到结果中
                        for (const imgData of loadedImages) {
                            const exists = detailData.images.some(existingImg => existingImg.url === imgData.url);
                            if (!exists) {
                                detailData.images.push(imgData);
                            }
                        }
                        
                        console.log('✅ 最终提取到图片:', detailData.images.length + '张');
                        
                        // 提取标签 - 根据实际HTML结构优化
                        const tagSelectors = [
                            '#detail-desc a[id="hash-tag"]',  // 你提供的HTML中的标签结构
                            'a[href*="search_result"]',       // 小红书搜索链接格式
                            '.tag',
                            '.topic',
                            '.hashtag',
                            '[class*="tag"]',
                            '[class*="topic"]',
                            'a[href*="search"]'
                        ];
                        
                        const extractedTags = new Set(); // 使用Set避免重复标签
                        
                        for (const selector of tagSelectors) {
                            const tagElements = document.querySelectorAll(selector);
                            for (const tagEl of tagElements) {
                                if (tagEl && tagEl.textContent.trim()) {
                                    let tagText = tagEl.textContent.trim();
                                    
                                    // 确保标签格式正确
                                    if (!tagText.startsWith('#') && tagText.length < 20) {
                                        tagText = '#' + tagText;
                                    }
                                    
                                    // 只添加有效的标签
                                    if (tagText.startsWith('#') && tagText.length > 1 && tagText.length < 30) {
                                        extractedTags.add(tagText);
                                    }
                                }
                            }
                        }
                        
                        detailData.tags = Array.from(extractedTags);
                        console.log('✅ 提取到标签:', detailData.tags.length + '个', detailData.tags);
                        
                        // 提取互动数据
                        const pageText = document.body.textContent;
                        
                        // 点赞数
                        const likeMatch = pageText.match(/(\\d+)\\s*点赞|点赞\\s*(\\d+)|(\\d+)\\s*赞|(\\d+\\.?\\d*[kK万]?)\\s*点赞/);
                        if (likeMatch) {
                            let likeStr = likeMatch[1] || likeMatch[2] || likeMatch[3] || likeMatch[4];
                            detailData.likes = parseNumberString(likeStr);
                        }
                        
                        // 评论数
                        const commentMatch = pageText.match(/(\\d+)\\s*评论|评论\\s*(\\d+)|(\\d+)\\s*条评论|(\\d+\\.?\\d*[kK万]?)\\s*评论/);
                        if (commentMatch) {
                            let commentStr = commentMatch[1] || commentMatch[2] || commentMatch[3] || commentMatch[4];
                            detailData.comments = parseNumberString(commentStr);
                        }
                        
                        // 收藏数
                        const collectMatch = pageText.match(/(\\d+)\\s*收藏|收藏\\s*(\\d+)|(\\d+\\.?\\d*[kK万]?)\\s*收藏/);
                        if (collectMatch) {
                            let collectStr = collectMatch[1] || collectMatch[2] || collectMatch[3];
                            detailData.collects = parseNumberString(collectStr);
                        }
                        
                        // 分享数
                        const shareMatch = pageText.match(/(\\d+)\\s*分享|分享\\s*(\\d+)|(\\d+\\.?\\d*[kK万]?)\\s*分享/);
                        if (shareMatch) {
                            let shareStr = shareMatch[1] || shareMatch[2] || shareMatch[3];
                            detailData.shares = parseNumberString(shareStr);
                        }
                        
                        // 提取发布时间
                        const timeMatch = pageText.match(/(\\d{4}-\\d{2}-\\d{2}|\\d{2}-\\d{2}|\\d+天前|\\d+小时前|\\d+分钟前|刚刚)/);
                        if (timeMatch) {
                            detailData.publishTime = timeMatch[1];
                        }
                        
                        // 判断内容类型
                        if (document.querySelector('video, [class*="video"]') || pageText.includes('视频')) {
                            detailData.contentType = '视频';
                        } else if (detailData.images.length > 0) {
                            detailData.contentType = '图文';
                        } else {
                            detailData.contentType = '文字';
                        }
                        
                        // 数据清洗和格式化
                        detailData = cleanAndFormatData(detailData);
                        
                        // 数据验证：确保有基本内容
                        if (!detailData.title && !detailData.fullContent) {
                            console.warn('⚠️ 详情页数据提取不完整，跳过');
                            return null;
                        }
                        
                        console.log('🎉 详情页数据提取完成:', {
                            title: detailData.title.substring(0, 30) + '...',
                            contentLength: detailData.fullContent.length,
                            imageCount: detailData.images.length,
                            tagCount: detailData.tags.length,
                            author: detailData.author
                        });
                        
                        return detailData;
                        
                    } catch (error) {
                        console.error('❌ 提取详情页数据失败:', error);
                        return null;
                    }
                }
                
                // 解析数字字符串（支持k、万等单位）
                function parseNumberString(str) {
                    if (!str) return 0;
                    str = str.toString().toLowerCase();
                    
                    if (str.includes('k')) {
                        return Math.round(parseFloat(str.replace('k', '')) * 1000);
                    } else if (str.includes('万')) {
                        return Math.round(parseFloat(str.replace('万', '')) * 10000);
                    } else {
                        return parseInt(str.replace(/[^\\d]/g, '')) || 0;
                    }
                }
                
                // 数据清洗和格式化函数
                function cleanAndFormatData(data) {
                    // 清洗标题
                    if (data.title) {
                        data.title = data.title.replace(/\\s+/g, ' ').trim();
                        // 移除特殊字符和表情符号过多的标题
                        if (data.title.length > 100) {
                            data.title = data.title.substring(0, 100) + '...';
                        }
                    }
                    
                    // 清洗正文内容
                    if (data.fullContent) {
                        data.fullContent = data.fullContent
                            .replace(/\\s+/g, ' ')  // 合并多个空白字符
                            .replace(/\\n+/g, '\\n') // 合并多个换行符
                            .trim();
                        
                        // 移除重复的句子
                        const sentences = data.fullContent.split(/[。！？.!?]/);
                        const uniqueSentences = [...new Set(sentences)];
                        data.fullContent = uniqueSentences.join('。').replace(/。+/g, '。');
                    }
                    
                    // 清洗作者名
                    if (data.author) {
                        data.author = data.author.replace(/\\s+/g, ' ').trim();
                        // 移除特殊前缀
                        data.author = data.author.replace(/^(@|用户|作者)\\s*/, '');
                    }
                    
                    // 清洗标签
                    data.tags = data.tags
                        .filter(tag => tag && tag.length > 1 && tag.length < 30)
                        .map(tag => {
                            // 确保标签格式统一
                            tag = tag.trim();
                            if (!tag.startsWith('#')) {
                                tag = '#' + tag;
                            }
                            return tag;
                        })
                        .filter((tag, index, self) => self.indexOf(tag) === index); // 去重
                    
                    // 清洗图片数据
                    data.images = data.images
                        .filter(img => img.url && img.url.startsWith('http'))
                        .map(img => ({
                            ...img,
                            url: img.url.split('?')[0], // 移除URL参数
                            alt: img.alt ? img.alt.trim() : ''
                        }))
                        .filter((img, index, self) => 
                            self.findIndex(i => i.url === img.url) === index
                        ); // 去重
                    
                    // 确保数据完整性
                    if (!data.title && data.fullContent) {
                        // 如果没有标题，从正文中提取前30个字符作为标题
                        data.title = data.fullContent.substring(0, 30) + '...';
                    }
                    
                    if (!data.fullContent && data.title) {
                        // 如果没有正文，使用标题作为正文
                        data.fullContent = data.title;
                    }
                    
                    return data;
                }
                
            })().catch(e => ({ success: false, error: 'Promise异常: ' + e.message, data: [], total: 0 }));
        `;
        
        const result = await executeScript(accountId, deepScrapeScript);
        
        if (result.success && result.result.success) {
            console.log('🎉 深度数据抓取成功！', result.result);
            
            // 显示抓取结果
            const data = result.result.data;
            showNotification(`成功深度抓取 ${data.length} 条完整内容数据！`, 'success');
            
            // 将数据传递到前端展示（使用正确的显示函数）
            displayScrapedContent(data);
            
            return result.result;
        } else {
            const errorMsg = result.result?.error || result.error || '深度数据抓取失败';
            showNotification('深度数据抓取失败：' + errorMsg, 'error');
            console.error('深度数据抓取失败:', result);
            return { success: false, error: errorMsg };
        }
        
    } catch (error) {
        console.error('执行深度数据抓取失败:', error);
        showNotification('深度数据抓取功能执行失败: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// 保留原始的浅层抓取函数（用于快速预览）
async function scrapeXiaohongshuContent(accountId) {
    try {
        console.log('🔍 开始抓取小红书内容数据...');
        showNotification('正在抓取内容数据...', 'info');
        
        const scrapeScript = `
            (async () => {
                try {
                    // 等待页面完全加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    console.log('📊 开始解析页面内容...');
                    
                    // 查找内容卡片容器
                    const contentCards = [];
                    
                    // 策略1: 查找常见的卡片选择器
                    let cardElements = document.querySelectorAll([
                        '.note-item',
                        '.feed-item', 
                        '.content-item',
                        '[class*="note"]',
                        '[class*="feed"]',
                        '[class*="card"]',
                        'section[class*="note"]',
                        'div[class*="explore"]'
                    ].join(', '));
                    
                    console.log('🎯 找到 ' + cardElements.length + ' 个潜在卡片元素');
                    
                    // 如果没找到，尝试更通用的查找方式
                    if (cardElements.length === 0) {
                        // 查找包含图片和文字的容器
                        const allDivs = document.querySelectorAll('div');
                        cardElements = Array.from(allDivs).filter(div => {
                            const hasImage = div.querySelector('img');
                            const hasText = div.textContent && div.textContent.trim().length > 10;
                            const hasAuthor = div.textContent && (div.textContent.includes('·') || div.textContent.includes('@'));
                            return hasImage && hasText && hasAuthor;
                        });
                        console.log('🔍 通用查找找到 ' + cardElements.length + ' 个卡片');
                    }
                    
                    // 智能偏移：基于时间戳确保同次抓取内偏移一致，不同次抓取有差异
                    const sessionSeed = Math.floor(Date.now() / 60000); // 每分钟变化一次的种子
                    const pseudoRandomOffset = (sessionSeed % 5); // 0-4的伪随机偏移，同次抓取保持一致
                    const startIndex = Math.min(pseudoRandomOffset, Math.max(0, cardElements.length - 6));
                    const maxCards = Math.min(cardElements.length - startIndex, 6); // 抓取6条帖子
                    
                    // 从偏移位置开始选择卡片
                    cardElements = Array.from(cardElements).slice(startIndex, startIndex + maxCards);
                    console.log('📋 使用智能偏移 ' + pseudoRandomOffset + '，从第' + (startIndex + 1) + '个位置开始，准备处理前' + maxCards + '个卡片');
                    
                    for (let i = 0; i < maxCards; i++) {
                        // 计算实际索引（结合偏移量）
                        const actualCardIndex = startIndex + i;
                        
                        // 优先使用data-index属性选择
                        let card = document.querySelector('[data-index="' + actualCardIndex + '"]');
                        
                        // 如果没找到，回退到数组索引
                        if (!card && cardElements[i]) {
                            card = cardElements[i];
                        }
                        
                        if (!card || !card.offsetParent) {
                            console.log('⚠️ 第' + actualCardIndex + '个帖子不存在或不可见，跳过');
                            continue; // 跳过不可见元素
                        }
                        
                        console.log('📌 处理第' + actualCardIndex + '个帖子 (data-index="' + actualCardIndex + '")');
                        
                        try {
                            const cardData = {
                                id: 'card_' + Date.now() + '_' + actualCardIndex,
                                index: actualCardIndex + 1,
                                title: '',
                                author: '',
                                authorAvatar: '',
                                comments: 0,
                                likes: 0,
                                publishTime: '',
                                coverImage: '',
                                contentType: '',
                                tags: [],
                                link: ''
                            };
                            
                            // 提取标题
                            const titleSelectors = [
                                '.title',
                                '.note-title', 
                                'h1', 'h2', 'h3',
                                '[class*="title"]',
                                '.content-text',
                                'p'
                            ];
                            
                            for (const selector of titleSelectors) {
                                const titleEl = card.querySelector(selector);
                                if (titleEl && titleEl.textContent.trim()) {
                                    cardData.title = titleEl.textContent.trim();
                                    break;
                                }
                            }
                            
                            // 如果没找到标题，尝试从文本内容中提取
                            if (!cardData.title) {
                                const textContent = card.textContent.trim();
                                const lines = textContent.split('\\n').filter(line => line.trim());
                                // 找到最长的一行作为标题
                                cardData.title = lines.reduce((longest, current) => 
                                    current.length > longest.length ? current : longest, ''
                                ).substring(0, 100); // 限制长度
                            }
                            
                            // 提取作者信息
                            const authorSelectors = [
                                '.author',
                                '.user-name',
                                '.nickname',
                                '[class*="author"]',
                                '[class*="user"]'
                            ];
                            
                            for (const selector of authorSelectors) {
                                const authorEl = card.querySelector(selector);
                                if (authorEl && authorEl.textContent.trim()) {
                                    cardData.author = authorEl.textContent.trim();
                                    break;
                                }
                            }
                            
                            // 提取头像
                            const avatarImg = card.querySelector('img[class*="avatar"], img[class*="user"], .avatar img');
                            if (avatarImg && avatarImg.src) {
                                cardData.authorAvatar = avatarImg.src;
                            }
                            
                            // 等待并提取封面图片
                            console.log('🖼️ 等待第' + actualCardIndex + '个帖子的图片加载...');
                            const coverImg = card.querySelector('img');
                            if (coverImg && !coverImg.src.includes('avatar')) {
                                // 等待图片加载完成
                                await new Promise((resolve) => {
                                    if (coverImg.complete && coverImg.naturalWidth > 0) {
                                        console.log('✅ 第' + actualCardIndex + '个帖子封面已加载');
                                        cardData.coverImage = coverImg.src;
                                        resolve();
                                    } else {
                                        const onLoad = () => {
                                            console.log('✅ 第' + actualCardIndex + '个帖子封面加载完成');
                                            cardData.coverImage = coverImg.src;
                                            cleanup();
                                            resolve();
                                        };
                                        
                                        const onError = () => {
                                            console.log('❌ 第' + actualCardIndex + '个帖子封面加载失败');
                                            cleanup();
                                            resolve(); // 即使失败也继续
                                        };
                                        
                                        const cleanup = () => {
                                            coverImg.removeEventListener('load', onLoad);
                                            coverImg.removeEventListener('error', onError);
                                        };
                                        
                                        coverImg.addEventListener('load', onLoad);
                                        coverImg.addEventListener('error', onError);
                                        
                                        // 3秒超时
                                        setTimeout(() => {
                                            console.log('⏰ 第' + actualCardIndex + '个帖子封面加载超时，使用当前src');
                                            if (coverImg.src && coverImg.src.startsWith('http')) {
                                                cardData.coverImage = coverImg.src;
                                            }
                                            cleanup();
                                            resolve();
                                        }, 3000);
                                    }
                                });
                            }
                            
                            // 提取互动数据（点赞、评论等）
                            const textContent = card.textContent;
                            
                            // 匹配评论数
                            const commentMatch = textContent.match(/(\\d+)\\s*评论|评论\\s*(\\d+)|(\\d+)\\s*条评论/);
                            if (commentMatch) {
                                cardData.comments = parseInt(commentMatch[1] || commentMatch[2] || commentMatch[3]) || 0;
                            }
                            
                            // 匹配点赞数
                            const likeMatch = textContent.match(/(\\d+)\\s*点赞|点赞\\s*(\\d+)|(\\d+)\\s*赞/);
                            if (likeMatch) {
                                cardData.likes = parseInt(likeMatch[1] || likeMatch[2] || likeMatch[3]) || 0;
                            }
                            
                            // 提取时间信息
                            const timeMatch = textContent.match(/(\\d{2}-\\d{2}|\\d+天前|\\d+小时前|\\d+分钟前|刚刚)/);
                            if (timeMatch) {
                                cardData.publishTime = timeMatch[1];
                            }
                            
                            // 判断内容类型
                            if (textContent.includes('视频') || card.querySelector('video, [class*="video"]')) {
                                cardData.contentType = '视频';
                            } else if (coverImg) {
                                cardData.contentType = '图文';
                            } else {
                                cardData.contentType = '文字';
                            }
                            
                            // 提取链接
                            const linkEl = card.querySelector('a') || card.closest('a');
                            if (linkEl && linkEl.href) {
                                cardData.link = linkEl.href;
                            }
                            
                            // 只添加有效的卡片数据
                            if (cardData.title && cardData.title.length > 5) {
                                contentCards.push(cardData);
                                console.log('✅ 成功提取卡片 ' + (i + 1) + ': ' + cardData.title.substring(0, 30) + '...');
                            }
                            
                        } catch (cardError) {
                            console.warn('❌ 处理卡片 ' + (i + 1) + ' 失败:', cardError);
                        }
                    }
                    
                    console.log('🎉 数据抓取完成！共获取 ' + contentCards.length + ' 条内容');
                    
                    // 返回抓取结果
                    return {
                        success: true,
                        data: contentCards,
                        total: contentCards.length,
                        timestamp: new Date().toISOString(),
                        source: 'xiaohongshu_explore'
                    };
                    
                } catch (error) {
                    console.error('❌ 数据抓取异常:', error);
                    return {
                        success: false,
                        error: error.message,
                        data: [],
                        total: 0
                    };
                }
            })().catch(e => ({ success: false, error: 'Promise异常: ' + e.message, data: [], total: 0 }));
        `;
        
        const result = await executeScript(accountId, scrapeScript);
        
        if (result.success && result.result.success) {
            console.log('🎉 数据抓取成功！', result.result);
            
            // 显示抓取结果
            const data = result.result.data;
            showNotification('成功抓取 ' + data.length + ' 条内容数据！', 'success');
            
            // 将数据传递到前端展示
            displayScrapedContent(data);
            
            return result.result;
        } else {
            const errorMsg = result.result?.error || result.error || '数据抓取失败';
            showNotification('数据抓取失败：' + errorMsg, 'error');
            console.error('数据抓取失败:', result);
            return { success: false, error: errorMsg };
        }
        
    } catch (error) {
        console.error('执行数据抓取失败:', error);
        showNotification('数据抓取功能执行失败: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// 深度展示抓取的内容数据（包含完整图片、正文、标签）
function displayDeepScrapedContent(contentData) {
    try {
        console.log('🎨 开始展示深度抓取的内容数据...', contentData);
        
        // 使用正确的显示函数，在智能抓取选项卡中显示
        displayScrapedContent(contentData);
        console.log('✅ 深度内容数据展示完成');
        
    } catch (error) {
        console.error('❌ 展示深度抓取内容失败:', error);
        showNotification('展示深度内容数据失败: ' + error.message, 'error');
    }
}

// 切换全文显示
function toggleFullContent(itemId) {
    const fullContentDiv = document.getElementById(`full-${itemId}`);
    const expandBtn = event.target;
    
    if (fullContentDiv.style.display === 'none') {
        fullContentDiv.style.display = 'block';
        expandBtn.textContent = '收起';
    } else {
        fullContentDiv.style.display = 'none';
        expandBtn.textContent = '展开全文';
    }
}

// 打开图片模态框
// 删除重复的openImageModal函数 - 使用统一的showFullImage函数

// 下载图片
function downloadImage(imageUrl) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'xiaohongshu_image_' + Date.now() + '.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 复制内容数据
function copyContentData(itemId) {
    // 这里可以实现复制功能
    const contentData = document.querySelector(`[data-id="${itemId}"]`);
    if (contentData) {
        const textContent = contentData.textContent;
        navigator.clipboard.writeText(textContent).then(() => {
            showNotification('内容数据已复制到剪贴板', 'success');
        }).catch(() => {
            showNotification('复制失败，请手动复制', 'error');
        });
    }
}

// 在前端展示抓取的内容数据
function displayScrapedContent(contentData) {
    try {
        console.log('📺 开始展示抓取的内容数据...', contentData?.length || 0, '条');
        
        // 存储数据到全局变量
        window.scrapedContentData = contentData;
        
        // 显示抓取内容区域
        const scrapedSection = document.getElementById('scraped-content-section');
        if (scrapedSection) {
            scrapedSection.style.display = 'block';
        }
        
        const contentDisplay = document.getElementById('scraped-content-display');
        if (!contentDisplay) {
            console.error('未找到scraped-content-display容器');
            return;
        }
        
        if (!contentData || contentData.length === 0) {
            contentDisplay.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h4>暂无抓取内容</h4>
                    <p>请点击"打开小红书探索"按钮启动内容抓取，或等待自动抓取完成</p>
                </div>
            `;
            return;
        }
        
        // 数据标准化：确保图片数据格式统一
        const normalizedContentData = contentData.map(item => {
            const normalizedItem = { ...item };
            
            // 标准化图片数据
            const images = [];
            
            // 1. 处理coverImage（浅层抓取的封面图）
            if (item.coverImage && typeof item.coverImage === 'string' && item.coverImage.trim() !== '' && item.coverImage !== 'undefined') {
                images.push({
                    url: item.coverImage,
                    alt: '封面图片'
                });
            }
            
            // 2. 处理images数组
            if (item.images && Array.isArray(item.images)) {
                item.images.forEach(img => {
                    if (typeof img === 'string') {
                        // 字符串格式（旧版抓取）
                        if (img && img.trim() !== '' && img !== 'undefined') {
                            images.push({
                                url: img,
                                alt: '图片'
                            });
                        }
                    } else if (img && typeof img === 'object' && img.url) {
                        // 对象格式（新版抓取）
                        if (img.url && img.url.trim() !== '' && img.url !== 'undefined') {
                            images.push({
                                url: img.url,
                                alt: img.alt || '图片',
                                width: img.width,
                                height: img.height
                            });
                        }
                    }
                });
            }
            
            // 去重：相同URL的图片只保留一个
            const uniqueImages = [];
            const seenUrls = new Set();
            
            images.forEach(img => {
                if (!seenUrls.has(img.url)) {
                    seenUrls.add(img.url);
                    uniqueImages.push(img);
                }
            });
            
            normalizedItem.images = uniqueImages;
            
            console.log(`📸 标准化处理：${item.title || '无标题'} - 图片数量: ${uniqueImages.length}`);
            if (uniqueImages.length > 0) {
                console.log('  图片URLs:', uniqueImages.map(img => img.url.substring(0, 50) + '...'));
            }
            
            return normalizedItem;
        });
        
        console.log('✅ 数据标准化完成，处理了', normalizedContentData.length, '条内容');
        
        // 生成内容HTML - 使用标准化后的数据
        const contentHTML = `
            <div class="content-header">
                <h3>📊 抓取到的内容 (${normalizedContentData.length} 条)</h3>
                <div class="content-stats">
                    <span class="stat-item">🕒 ${new Date().toLocaleString()}</span>
                    <span class="stat-item">📍 小红书探索</span>
                </div>
            </div>
            <div class="content-grid">
                ${normalizedContentData.map((item, index) => `
                    <div class="content-card" data-index="${index}" onclick="openContentPreview(${index})" style="cursor: pointer;">
                        <div class="card-header">
                            <div class="card-number">#${item.index || index + 1}</div>
                            <div class="content-type-badge ${(item.contentType || '文字').toLowerCase()}">${item.contentType || '文字'}</div>
                        </div>
                        ${item.coverImage ? `<img src="${item.coverImage}" alt="封面" class="cover-image" loading="lazy">` : ''}
                        ${item.images && item.images.length > 0 ? `
                            <div class="content-images ${item.images.length === 1 ? 'single-image' : item.images.length === 3 ? 'three-images' : ''}">
                                ${item.images.slice(0, 4).map((img, imgIndex) => `
                                    <div class="content-image-wrapper">
                                        <img src="${img.url}" alt="${img.alt || '图片'}" class="content-image" loading="lazy" 
                                             onclick="event.stopPropagation(); previewScrapedImage(${index}, ${imgIndex})"
                                             onerror="this.parentElement.style.display='none'">
                                    </div>
                                `).join('')}
                                ${item.images.length > 4 ? `<div class="more-images-indicator">+${item.images.length - 4}</div>` : ''}
                            </div>
                        ` : ''}
                        <div class="card-content">
                            <h4 class="content-title">${item.title || '无标题'}</h4>
                            <div class="author-info">
                                ${item.authorAvatar ? `<img src="${item.authorAvatar}" alt="头像" class="author-avatar">` : ''}
                                <span class="author-name">${item.author || '未知作者'}</span>
                                ${item.publishTime ? `<span class="publish-time">${item.publishTime}</span>` : ''}
                            </div>
                            
                            <!-- 内容预览 -->
                            <div class="content-preview">
                                <p>${(item.fullContent || item.content || '').substring(0, 120)}${(item.fullContent || item.content || '').length > 120 ? '...' : ''}</p>
                            </div>
                            
                            <div class="interaction-stats">
                                ${item.likes > 0 ? `<span class="stat-likes">👍 ${item.likes}</span>` : ''}
                                ${item.comments > 0 ? `<span class="stat-comments">💬 ${item.comments}</span>` : ''}
                                <!-- 爆款指数 -->
                                <span class="explosive-score ${(item.explosiveScore || 60) >= 80 ? 'high' : (item.explosiveScore || 60) >= 60 ? 'medium' : 'low'}">
                                    🔥 ${item.explosiveScore || Math.floor(Math.random() * 40) + 50}
                                </span>
                            </div>
                        </div>
                        <div class="card-actions" onclick="event.stopPropagation();">
                            ${item.link ? `<button onclick="window.open('${item.link}', '_blank')" class="btn-view">查看原文</button>` : ''}
                            <button onclick="handleAddToAnalysis(${index})" class="btn-add-analysis">添加到拆解</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        contentDisplay.innerHTML = contentHTML;
        
        // 显示分页控制
        const paginationDiv = document.getElementById('scraped-pagination');
        if (paginationDiv && normalizedContentData.length > 6) {
            paginationDiv.style.display = 'flex';
        }
        
        // 滚动到展示区域
        scrapedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('✅ 内容展示完成');
        
    } catch (error) {
        console.error('❌ 内容展示失败:', error);
        showNotification('内容展示失败: ' + error.message, 'error');
    }
}

// 修复现有数据的图片显示问题
window.fixExistingImageData = function() {
    console.log('🔧 修复现有数据的图片显示问题...');
    
    if (window.realtimeScrapedData && window.realtimeScrapedData.length > 0) {
        console.log('📸 重新处理现有数据...');
        displayScrapedContent(window.realtimeScrapedData);
        showNotification('图片数据已重新处理，请查看效果', 'success');
    } else {
        console.log('⚠️ 没有找到现有的抓取数据');
        showNotification('请先抓取一些内容，然后再运行修复', 'warning');
    }
};

// 测试图片预览功能
window.testImagePreview = function() {
    console.log('🧪 测试图片预览功能...');
    
    // 检查数据源状态
    console.log('📊 数据源状态检查:');
    console.log('  - realtimeScrapedData:', window.realtimeScrapedData ? window.realtimeScrapedData.length + ' 条' : '无');
    console.log('  - scrapedContentData:', window.scrapedContentData ? window.scrapedContentData.length + ' 条' : '无');
    
    if (window.realtimeScrapedData && window.realtimeScrapedData.length > 0) {
        const firstContent = window.realtimeScrapedData[0];
        console.log('🔍 第一条内容详细信息:');
        console.log('  - 内容ID:', firstContent.id);
        console.log('  - 图片数量:', firstContent.images ? firstContent.images.length : 0);
        
        if (firstContent.images && firstContent.images.length > 0) {
            console.log('🖼️ 图片数据结构分析:');
            firstContent.images.forEach((img, index) => {
                console.log(`  图片${index + 1}:`, {
                    url: img.url,
                    src: img.src,
                    name: img.name,
                    alt: img.alt,
                    原始对象: img
                });
            });
            
            console.log('🎯 尝试预览第一条内容的第一张图片');
            previewScrapedImage(0, 0);
        }
    }
    
    // 测试showFullImage函数
    const testImageUrl = 'https://sns-webpic-qc.xhscdn.com/202412222120/f8b5a1a2e4a3c8e6d7f9e0a1b2c3d4e5/1040g00830pki9l6ig0005p5oq5a1g5c0u9g6r7o!nd_dft_wlteh_jpg_3';
    const testImageName = '测试图片预览';
    
    console.log('📸 测试showFullImage函数:', testImageUrl);
    showFullImage(testImageUrl, testImageName);
    
    showNotification('图片预览测试已执行，请查看控制台日志', 'info');
};

// 测试图片显示修复 - 添加到全局作用域以便在控制台调用
window.testImageDisplayFix = function testImageDisplayFix() {
    console.log('🧪 测试图片显示修复...');
    
    // 创建测试数据
    const testData = [
        {
            title: '测试内容1 - 单张图片',
            author: '测试作者',
            fullContent: '这是一个测试内容，包含单张图片',
            images: [
                {
                    url: 'https://picsum.photos/400/300?random=1',
                    alt: '测试图片1'
                }
            ],
            likes: 100,
            comments: 20,
            explosiveScore: 85
        },
        {
            title: '测试内容2 - 多张图片',
            author: '测试作者2',
            fullContent: '这是一个测试内容，包含多张图片',
            images: [
                {
                    url: 'https://picsum.photos/400/300?random=2',
                    alt: '测试图片2-1'
                },
                {
                    url: 'https://picsum.photos/400/300?random=3',
                    alt: '测试图片2-2'
                },
                {
                    url: 'https://picsum.photos/400/300?random=4',
                    alt: '测试图片2-3'
                },
                {
                    url: 'https://picsum.photos/400/300?random=5',
                    alt: '测试图片2-4'
                }
            ],
            likes: 200,
            comments: 50,
            explosiveScore: 92
        },
        {
            title: '测试内容3 - 超过4张图片',
            author: '测试作者3',
            fullContent: '这是一个测试内容，包含超过4张图片',
            images: [
                {
                    url: 'https://picsum.photos/400/300?random=6',
                    alt: '测试图片3-1'
                },
                {
                    url: 'https://picsum.photos/400/300?random=7',
                    alt: '测试图片3-2'
                },
                {
                    url: 'https://picsum.photos/400/300?random=8',
                    alt: '测试图片3-3'
                },
                {
                    url: 'https://picsum.photos/400/300?random=9',
                    alt: '测试图片3-4'
                },
                {
                    url: 'https://picsum.photos/400/300?random=10',
                    alt: '测试图片3-5'
                },
                {
                    url: 'https://picsum.photos/400/300?random=11',
                    alt: '测试图片3-6'
                }
            ],
            likes: 300,
            comments: 75,
            explosiveScore: 88
        }
    ];
    
    // 显示测试数据
    displayScrapedContent(testData);
    
    console.log('✅ 测试数据已显示，请检查图片是否正常显示');
    showNotification('图片显示修复测试已启动，请检查页面效果', 'info');
};

// 测试数据提取功能
function testDataExtraction() {
    console.log('🧪 开始测试数据提取功能...');
    
    // 模拟详情页数据结构进行测试
    const mockDetailData = {
        id: 'test_' + Date.now(),
        index: 1,
        title: '测试标题：黄子韬超绝执行力',
        fullContent: '黄子韬上一秒还在和AK聊五年钓鱼之约，下一秒就开始收拾行李准备出发了。这种说走就走的执行力真的很让人佩服！',
        author: '测试用户',
        authorAvatar: 'https://example.com/avatar.jpg',
        images: [
            {
                url: 'https://example.com/image1.jpg',
                alt: '测试图片1',
                width: 800,
                height: 600
            },
            {
                url: 'https://example.com/image2.jpg',
                alt: '测试图片2',
                width: 600,
                height: 400
            }
        ],
        tags: ['#黄子韬', '#执行力', '#旅行'],
        comments: 128,
        likes: 1520,
        collects: 89,
        shares: 45,
        publishTime: '2024-01-15',
        contentType: '图文',
        url: 'https://www.xiaohongshu.com/explore/test123'
    };
    
    console.log('📋 原始测试数据:', mockDetailData);
    
    // 测试数据清洗函数
    const cleanedData = cleanAndFormatDataTest(mockDetailData);
    console.log('🧹 清洗后数据:', cleanedData);
    
    // 测试前端展示
    displayScrapedContent([cleanedData]);
    
    console.log('✅ 数据提取功能测试完成');
    return cleanedData;
}

// 测试用的数据清洗函数（独立版本）
function cleanAndFormatDataTest(data) {
    // 清洗标题
    if (data.title) {
        data.title = data.title.replace(/\\s+/g, ' ').trim();
        if (data.title.length > 100) {
            data.title = data.title.substring(0, 100) + '...';
        }
    }
    
    // 清洗正文内容
    if (data.fullContent) {
        data.fullContent = data.fullContent
            .replace(/\\s+/g, ' ')
            .replace(/\\n+/g, '\\n')
            .trim();
    }
    
    // 清洗作者名
    if (data.author) {
        data.author = data.author.replace(/\\s+/g, ' ').trim();
        data.author = data.author.replace(/^(@|用户|作者)\\s*/, '');
    }
    
    // 清洗标签
    data.tags = data.tags
        .filter(tag => tag && tag.length > 1 && tag.length < 30)
        .map(tag => {
            tag = tag.trim();
            if (!tag.startsWith('#')) {
                tag = '#' + tag;
            }
            return tag;
        })
        .filter((tag, index, self) => self.indexOf(tag) === index);
    
    // 清洗图片数据
    data.images = data.images
        .filter(img => img.url && img.url.startsWith('http'))
        .map(img => ({
            ...img,
            url: img.url.split('?')[0],
            alt: img.alt ? img.alt.trim() : ''
        }))
        .filter((img, index, self) => 
            self.findIndex(i => i.url === img.url) === index
        );
    
    return data;
}

// 将内容添加到创作灵感
function addToContentCreation(title, author) {
    try {
        // 这里可以集成到您的创作系统中
        console.log('📝 添加到创作灵感:', { title, author });
        showNotification('已添加到创作灵感：' + title.substring(0, 20) + '...', 'success');
        
        // 可以在这里实现具体的创作功能集成
        // 比如添加到创作列表、生成创作模板等
        
    } catch (error) {
        console.error('❌ 添加到创作失败:', error);
        showNotification('添加到创作失败: ' + error.message, 'error');
    }
}

// 打开第一个账号的浏览器并导航到小红书探索页面
async function openFirstAccountBrowser() {
    try {
        // 检查是否有账号数据
        if (!accountsData || accountsData.length === 0) {
            showNotification('暂无账号数据，请先在账号管理中创建账号', 'warning');
            return;
        }
        
        // 获取第一个账号
        const firstAccount = accountsData[0];
        
        // 获取搜索输入框的值
        const searchInput = document.getElementById('xiaohongshu-search-input');
        const searchQuery = searchInput ? searchInput.value.trim() : '';
        
        // 检查第一个账号是否已经在运行
        if (firstAccount.status === 'running') {
            // 如果已在运行，直接导航到小红书探索页面
            showNotification(`账号 ${firstAccount.windowName} 已在运行中，正在导航到小红书探索页面`, 'info');
            try {
                if (window.electronAPI && window.electronAPI.navigateToUrl) {
                    await window.electronAPI.navigateToUrl(firstAccount.id, 'https://www.xiaohongshu.com/explore');
                    showNotification('已导航到小红书探索页面', 'success');
                    
                    // 如果有搜索内容，执行搜索
                    if (searchQuery) {
                        setTimeout(() => {
                            performSearch(firstAccount.id, searchQuery);
                        }, 2000); // 等待2秒让页面加载完成
                    }
                    
                    // 直接启动实时抓取模式
                    setTimeout(() => {
                        showNotification('🔄 启动实时抓取模式...', 'info');
                        scrapeXiaohongshuContentDeepRealtime(firstAccount.id);
                    }, 6000); // 深度抓取需要更多时间，等待6秒让页面完全加载并完成搜索
                } else {
                    showNotification('导航功能不可用，请手动访问页面', 'warning');
                }
            } catch (navError) {
                console.error('导航失败:', navError);
                showNotification('导航失败: ' + navError.message, 'error');
            }
            return;
        }
        
        // 显示正在启动的提示
        showNotification(`正在启动浏览器：${firstAccount.windowName}`, 'info');
        
        // 调用现有的 openAccount 函数
        await openAccount(firstAccount.id);
        
        // 等待浏览器启动完成，然后导航到小红书探索页面
        setTimeout(async () => {
            try {
                if (window.electronAPI && window.electronAPI.navigateToUrl) {
                    showNotification('正在导航到小红书探索页面...', 'info');
                    await window.electronAPI.navigateToUrl(firstAccount.id, 'https://www.xiaohongshu.com/explore');
                    showNotification('已成功导航到小红书探索页面', 'success');
                    
                    // 如果有搜索内容，等待页面加载后执行搜索
                    if (searchQuery) {
                        setTimeout(() => {
                            performSearch(firstAccount.id, searchQuery);
                        }, 2000); // 再等待2秒让小红书页面完全加载
                    }
                    
                    // 直接启动实时抓取模式
                    setTimeout(() => {
                        showNotification('🔄 启动实时抓取模式...', 'info');
                        scrapeXiaohongshuContentDeepRealtime(firstAccount.id);
                    }, searchQuery ? 8000 : 6000); // 深度抓取需要更多时间，如果有搜索则等待8秒，否则6秒
                } else {
                    showNotification('导航功能不可用，请手动访问：https://www.xiaohongshu.com/explore', 'warning');
                }
            } catch (navError) {
                console.error('导航失败:', navError);
                showNotification('导航失败，请手动访问：https://www.xiaohongshu.com/explore', 'warning');
            }
        }, 3000); // 等待3秒让浏览器完全启动
        
    } catch (error) {
        console.error('打开第一个账号浏览器失败:', error);
        showNotification('打开浏览器失败: ' + error.message, 'error');
    }
}

// 内容预览功能
window.openContentPreview = function(index) {
    console.log('🚀 开始打开内容预览，索引:', index);
    console.log('📦 全局数据:', window.scrapedContentData);
    
    try {
        const contentData = window.scrapedContentData;
        if (!contentData || !contentData[index]) {
            console.error('❌ 内容数据不存在:', { contentData, index, item: contentData?.[index] });
            showNotification('内容数据不存在', 'error');
            return;
        }
        
        const item = contentData[index];
        console.log('📄 要预览的内容项:', item);
        
        const modal = document.getElementById('content-preview-modal');
        const modalBody = document.getElementById('preview-modal-body');
        const modalTitle = document.getElementById('preview-modal-title');
        
        console.log('🔍 查找模态框元素:', { modal, modalBody, modalTitle });
        
        if (!modal || !modalBody || !modalTitle) {
            console.error('❌ 预览模态框元素未找到:', {
                modal: !!modal,
                modalBody: !!modalBody,
                modalTitle: !!modalTitle
            });
            return;
        }
        
        // 设置标题
        modalTitle.innerHTML = `
            <span>🔍</span>
            <span>${item.title || '内容预览'}</span>
        `;
        
        // 生成预览内容
        let previewHTML = '';
        
        // 如果有图片，显示图片预览
        const validImages = [];
        
        // 检查封面图片
        if (item.coverImage && item.coverImage !== 'undefined' && item.coverImage.trim() !== '') {
            validImages.push({ url: item.coverImage, alt: '封面图片' });
        }
        
        // 检查其他图片
        if (item.images && Array.isArray(item.images)) {
            item.images.forEach(img => {
                if (img && img.url && img.url !== 'undefined' && img.url.trim() !== '') {
                    validImages.push(img);
                }
            });
        }
        
        if (validImages.length > 0) {
            previewHTML += `
                <div class="preview-image-container">
                    <div class="preview-gallery-grid">
                        ${validImages.map((img, imgIndex) => {
                            const isFeatured = imgIndex === 0 && validImages.length > 3;
                            return `
                                <div class="preview-gallery-item ${isFeatured ? 'featured' : ''}" 
                                     onclick="openImageLightbox('${img.url}', ${imgIndex})">
                                    <div class="preview-gallery-image-wrapper">
                                        <img src="${img.url}" 
                                             alt="${img.alt || '图片'}" 
                                             class="preview-gallery-image"
                                             loading="lazy"
                                             onerror="this.parentElement.parentElement.style.display='none';">
                                        <div class="preview-gallery-overlay"></div>
                                        <div class="preview-gallery-info">
                                            <div class="preview-gallery-title">${img.alt || `图片 ${imgIndex + 1}`}</div>
                                            <div class="preview-gallery-meta">
                                                <span>🖼️ ${imgIndex + 1}/${validImages.length}</span>
                                                <span>📱 点击查看大图</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${validImages.length === 0 ? `
                            <div class="preview-gallery-empty">
                                暂无图片内容
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // 添加文本内容
        previewHTML += `
            <div class="preview-content-container">
                <div class="preview-content-header">
                    <h2 class="preview-content-title">${item.title || '无标题'}</h2>
                    <div class="preview-author-info">
                        ${item.authorAvatar ? `<img src="${item.authorAvatar}" alt="头像" class="preview-author-avatar">` : ''}
                        <span class="preview-author-name">${item.author || '未知作者'}</span>
                        ${item.publishTime ? `<span class="preview-publish-time">${item.publishTime}</span>` : ''}
                    </div>
                </div>
                
                <div class="preview-content-text">${item.fullContent || item.content || '暂无内容'}</div>
                
                <div class="preview-stats">
                    ${item.likes > 0 ? `<span class="preview-stat-item">👍 ${item.likes}</span>` : ''}
                    ${item.comments > 0 ? `<span class="preview-stat-item">💬 ${item.comments}</span>` : ''}
                    <span class="preview-explosive-score ${(item.explosiveScore || 60) >= 80 ? 'high' : (item.explosiveScore || 60) >= 60 ? 'medium' : 'low'}">
                        🔥 爆款指数 ${item.explosiveScore || Math.floor(Math.random() * 40) + 50}
                    </span>
                </div>
            </div>
        `;
        
        console.log('📝 设置模态框内容:', previewHTML.substring(0, 200) + '...');
        modalBody.innerHTML = previewHTML;
        
        // 显示模态框
        console.log('🎭 显示模态框，添加show类');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
        
        console.log('⌨️ 添加键盘事件监听');
        // 添加键盘事件监听
        document.addEventListener('keydown', handlePreviewKeydown);
        
        console.log('✅ 内容预览已打开，模态框状态:', {
            hasShowClass: modal.classList.contains('show'),
            modalDisplay: window.getComputedStyle(modal).display,
            modalVisibility: window.getComputedStyle(modal).visibility
        });
        
    } catch (error) {
        console.error('❌ 打开内容预览失败:', error);
        showNotification('打开预览失败: ' + error.message, 'error');
    }
};

// 关闭内容预览
window.closeContentPreview = function() {
    try {
        const modal = document.getElementById('content-preview-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // 恢复背景滚动
            
            // 移除键盘事件监听
            document.removeEventListener('keydown', handlePreviewKeydown);
            
            console.log('✅ 内容预览已关闭');
        }
    } catch (error) {
        console.error('❌ 关闭内容预览失败:', error);
    }
};

// 切换预览图片
window.switchPreviewImage = function(imageUrl, index) {
    try {
        // 验证图片URL
        if (!imageUrl || imageUrl === 'undefined' || imageUrl.trim() === '') {
            console.warn('⚠️ 无效的图片URL:', imageUrl);
            return;
        }
        
        const mainImage = document.getElementById('preview-main-image');
        const thumbnails = document.querySelectorAll('.preview-thumbnail');
        
        if (mainImage) {
            mainImage.src = imageUrl;
            mainImage.style.display = ''; // 确保图片可见
            
            // 添加加载错误处理
            mainImage.onerror = function() {
                console.error('❌ 图片加载失败:', imageUrl);
                this.style.display = 'none';
            };
        }
        
        // 更新缩略图状态
        thumbnails.forEach((thumb, thumbIndex) => {
            if (thumbIndex === index) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
        
    } catch (error) {
        console.error('❌ 切换预览图片失败:', error);
    }
};

// 打开图片灯箱
window.openImageLightbox = function(imageUrl, index) {
    try {
        // 验证图片URL
        if (!imageUrl || imageUrl === 'undefined' || imageUrl.trim() === '') {
            console.warn('⚠️ 无效的图片URL:', imageUrl);
            return;
        }
        
        // 创建灯箱HTML
        const lightboxHTML = `
            <div class="image-lightbox" id="image-lightbox" onclick="closeLightbox(event)">
                <div class="lightbox-content">
                    <button class="lightbox-close" onclick="closeLightbox()">×</button>
                    <img src="${imageUrl}" alt="预览图片" class="lightbox-image" id="lightbox-image">
                    <div class="lightbox-controls">
                        <button class="lightbox-prev" onclick="navigateLightbox(-1)">‹</button>
                        <span class="lightbox-counter" id="lightbox-counter">${index + 1}</span>
                        <button class="lightbox-next" onclick="navigateLightbox(1)">›</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', lightboxHTML);
        
        // 存储当前图片信息
        window.currentLightboxIndex = index;
        window.lightboxImages = Array.from(document.querySelectorAll('.preview-gallery-image')).map(img => img.src);
        
        // 添加键盘事件
        document.addEventListener('keydown', handleLightboxKeydown);
        
        // 防止页面滚动
        document.body.style.overflow = 'hidden';
        
        console.log('✅ 打开图片灯箱:', imageUrl, '索引:', index);
    } catch (error) {
        console.error('❌ 打开灯箱时出错:', error);
    }
};

// 关闭灯箱
window.closeLightbox = function(event) {
    try {
        if (event && event.target !== event.currentTarget && !event.target.classList.contains('lightbox-close')) {
            return;
        }
        
        const lightbox = document.getElementById('image-lightbox');
        if (lightbox) {
            lightbox.remove();
        }
        
        // 移除键盘事件
        document.removeEventListener('keydown', handleLightboxKeydown);
        
        // 恢复页面滚动
        document.body.style.overflow = '';
        
        console.log('✅ 关闭图片灯箱');
    } catch (error) {
        console.error('❌ 关闭灯箱时出错:', error);
    }
};

// 灯箱导航
window.navigateLightbox = function(direction) {
    try {
        if (!window.lightboxImages || window.lightboxImages.length === 0) return;
        
        window.currentLightboxIndex += direction;
        
        if (window.currentLightboxIndex < 0) {
            window.currentLightboxIndex = window.lightboxImages.length - 1;
        } else if (window.currentLightboxIndex >= window.lightboxImages.length) {
            window.currentLightboxIndex = 0;
        }
        
        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxCounter = document.getElementById('lightbox-counter');
        
        if (lightboxImage) {
            lightboxImage.src = window.lightboxImages[window.currentLightboxIndex];
        }
        if (lightboxCounter) {
            lightboxCounter.textContent = window.currentLightboxIndex + 1;
        }
        
        console.log('✅ 切换到图片索引:', window.currentLightboxIndex);
    } catch (error) {
        console.error('❌ 灯箱导航时出错:', error);
    }
};

// 处理灯箱键盘事件
function handleLightboxKeydown(event) {
    switch (event.key) {
        case 'Escape':
            closeLightbox();
            break;
        case 'ArrowLeft':
            navigateLightbox(-1);
            break;
        case 'ArrowRight':
            navigateLightbox(1);
            break;
    }
}

// 处理预览模态框的键盘事件
function handlePreviewKeydown(event) {
    if (event.key === 'Escape') {
        closeContentPreview();
    }
}

// 点击模态框背景关闭
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('content-preview-modal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeContentPreview();
            }
        });
    }
});

// ========== 代理配置相关函数 ==========

/**
 * 切换代理配置面板的显示/隐藏
 * @param {string} context - 上下文，'account' 或 'config'
 */
function toggleProxyConfig(context) {
    const checkbox = document.getElementById(`${context}-proxy-enabled`);
    const panel = document.getElementById(`${context}-proxy-config`);
    
    if (checkbox && panel) {
        if (checkbox.checked) {
            panel.style.display = 'block';
            // 添加展开动画
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                panel.style.transition = 'all 0.3s ease';
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            }, 10);
        } else {
            panel.style.transition = 'all 0.3s ease';
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                panel.style.display = 'none';
            }, 300);
        }
    }
}

/**
 * 测试代理连接
 * @param {string} context - 上下文，'account' 或 'config'
 */
async function testProxyConnection(context) {
    const button = document.querySelector(`#${context}-proxy-config .btn-test-proxy`);
    const proxyType = document.getElementById(`${context}-proxy-type`).value;
    const proxyHost = document.getElementById(`${context}-proxy-host`).value.trim();
    const proxyPort = document.getElementById(`${context}-proxy-port`).value.trim();
    const proxyUsername = document.getElementById(`${context}-proxy-username`).value.trim();
    const proxyPassword = document.getElementById(`${context}-proxy-password`).value.trim();
    
    // 验证必填字段
    if (!proxyHost || !proxyPort) {
        showNotification('请填写代理地址和端口', 'error');
        return;
    }
    
    if (isNaN(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
        showNotification('端口号必须是1-65535之间的数字', 'error');
        return;
    }
    
    // 更新按钮状态为测试中
    const originalText = button.textContent;
    button.textContent = '⏳ 测试中...';
    button.className = 'btn-test-proxy testing';
    button.disabled = true;
    
    try {
        // 构建代理配置对象
        const proxyConfig = {
            type: proxyType,
            host: proxyHost,
            port: parseInt(proxyPort),
            username: proxyUsername || null,
            password: proxyPassword || null
        };
        
        console.log('🔍 开始真实代理测试:', {
            type: proxyConfig.type,
            host: proxyConfig.host,
            port: proxyConfig.port,
            hasAuth: !!(proxyConfig.username && proxyConfig.password)
        });
        
        // 🚀 调用真实的代理测试API
        const result = await window.electronAPI.testProxy(proxyConfig);
        
        if (result.success) {
            button.textContent = '✅ 连接成功';
            button.className = 'btn-test-proxy success';
            
            // 构建详细的成功消息
            let successMessage = `代理连接成功！IP: ${result.ip}，位置: ${result.location}，响应时间: ${result.responseTime}ms`;
            
            // 检查是否有浏览器验证结果
            if (result.browserVerification) {
                if (result.browserVerification.success) {
                    successMessage += `\n🌐 验证浏览器已自动启动 (PID: ${result.browserVerification.browserPid})`;
                    successMessage += `\n🎯 请在新窗口检查IP是否为: ${result.browserVerification.expectedIp}`;
                } else {
                    successMessage += `\n⚠️ 浏览器验证启动失败: ${result.browserVerification.error}`;
                }
            }
            
            showNotification(successMessage, 'success');
            
            // 在控制台输出详细信息
            console.log('✅ 代理测试成功:', {
                ip: result.ip,
                location: result.location,
                responseTime: result.responseTime,
                status: result.status
            });
            
            // 输出浏览器验证调试信息
            if (result.browserVerification) {
                console.log('🌐 浏览器验证信息:', result.browserVerification);
                console.log('📋 验证步骤:');
                console.log('   1. 已启动独立的Chrome浏览器实例');
                console.log('   2. 浏览器使用相同的代理配置');
                console.log('   3. 自动访问IP检测网站:', result.browserVerification.targetSite || 'ipinfo.io');
                console.log('   4. 请手动比较显示的IP地址');
                console.log('   预期IP:', result.browserVerification.expectedIp || result.ip);
                console.log('   预期位置:', result.browserVerification.expectedLocation || result.location);
            }
        } else {
            button.textContent = '❌ 连接失败';
            button.className = 'btn-test-proxy error';
            showNotification(`代理连接失败: ${result.error}`, 'error');
            
            console.error('❌ 代理测试失败:', result.error);
        }
        
    } catch (error) {
        console.error('代理测试失败:', error);
        button.textContent = '❌ 测试失败';
        button.className = 'btn-test-proxy error';
        showNotification('代理测试时发生错误: ' + error.message, 'error');
    } finally {
        // 恢复按钮状态
        button.disabled = false;
        setTimeout(() => {
            button.textContent = originalText;
            button.className = 'btn-test-proxy';
        }, 3000);
    }
}

/**
 * 收集代理配置数据
 * @param {string} context - 上下文，'account' 或 'config'
 * @returns {object|null} 代理配置对象或null
 */
function collectProxyConfig(context) {
    const proxyEnabled = document.getElementById(`${context}-proxy-enabled`);
    
    if (!proxyEnabled || !proxyEnabled.checked) {
        return null;
    }
    
    const proxyType = document.getElementById(`${context}-proxy-type`).value;
    const proxyHost = document.getElementById(`${context}-proxy-host`).value.trim();
    const proxyPort = document.getElementById(`${context}-proxy-port`).value.trim();
    const proxyUsername = document.getElementById(`${context}-proxy-username`).value.trim();
    const proxyPassword = document.getElementById(`${context}-proxy-password`).value.trim();
    
    // 验证必填字段
    if (!proxyHost || !proxyPort) {
        return null;
    }
    
    if (isNaN(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
        return null;
    }
    
    return {
        proxyType,
        proxyHost,
        proxyPort: parseInt(proxyPort),
        proxyUsername: proxyUsername || null,
        proxyPassword: proxyPassword || null
    };
}

/**
 * 设置代理配置到表单
 * @param {string} context - 上下文，'account' 或 'config'
 * @param {object} proxyConfig - 代理配置对象
 */
function setProxyConfig(context, proxyConfig) {
    if (!proxyConfig) {
        // 如果没有代理配置，确保复选框未选中
        const proxyEnabled = document.getElementById(`${context}-proxy-enabled`);
        if (proxyEnabled) {
            proxyEnabled.checked = false;
            toggleProxyConfig(context);
        }
        return;
    }
    
    // 设置代理启用状态
    const proxyEnabled = document.getElementById(`${context}-proxy-enabled`);
    if (proxyEnabled) {
        proxyEnabled.checked = true;
        toggleProxyConfig(context);
    }
    
    // 设置代理配置值
    setTimeout(() => { // 等待面板展开
        const typeSelect = document.getElementById(`${context}-proxy-type`);
        const hostInput = document.getElementById(`${context}-proxy-host`);
        const portInput = document.getElementById(`${context}-proxy-port`);
        const usernameInput = document.getElementById(`${context}-proxy-username`);
        const passwordInput = document.getElementById(`${context}-proxy-password`);
        
        if (typeSelect) typeSelect.value = proxyConfig.proxyType || 'http';
        if (hostInput) hostInput.value = proxyConfig.proxyHost || '';
        if (portInput) portInput.value = proxyConfig.proxyPort || '';
        if (usernameInput) usernameInput.value = proxyConfig.proxyUsername || '';
        if (passwordInput) passwordInput.value = proxyConfig.proxyPassword || '';
    }, 350);
}

/**
 * 清空代理配置表单
 * @param {string} context - 上下文，'account' 或 'config'
 */
function clearProxyConfig(context) {
    const proxyEnabled = document.getElementById(`${context}-proxy-enabled`);
    const typeSelect = document.getElementById(`${context}-proxy-type`);
    const hostInput = document.getElementById(`${context}-proxy-host`);
    const portInput = document.getElementById(`${context}-proxy-port`);
    const usernameInput = document.getElementById(`${context}-proxy-username`);
    const passwordInput = document.getElementById(`${context}-proxy-password`);
    
    if (proxyEnabled) {
        proxyEnabled.checked = false;
        toggleProxyConfig(context);
    }
    
    if (typeSelect) typeSelect.value = 'http';
    if (hostInput) hostInput.value = '';
    if (portInput) portInput.value = '';
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
}