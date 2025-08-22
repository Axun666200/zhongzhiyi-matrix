const fs = require('fs');

/**
 * 增强版卡密导入脚本
 * 将新生成的账号数量细分卡密导入到认证系统
 */

// 配置
const CONFIG = {
    authFile: './auth/auth.json',
    cardsFile: './enhanced-cards-0817.txt',
    backupFile: './auth/auth-backup-enhanced.json'
};

// 账号数量到价格的映射
const PRICING = {
    'weekly': {
        10: 75, 15: 113, 20: 150, 25: 188, 30: 225
    },
    'monthly': {
        10: 300, 15: 450, 20: 600, 25: 750, 30: 900
    },
    'yearly': {
        10: 2520, 15: 3780, 20: 5040, 25: 6300, 30: 7560
    }
};

// 解析卡密类型和账号数量
function parseCardInfo(cardKey, contextLine) {
    // 从卡密和上下文中解析信息
    // 格式: HSAI-WEEK-0817-XXXX-XXXX (周卡)
    // 格式: HSAI-MONTH-0817-XXXX-XXXX (月卡)
    // 格式: HSAI-YEAR-0817-XXXX-XXXX (年卡)
    
    if (!cardKey.startsWith('HSAI-')) return null;
    
    const parts = cardKey.split('-');
    if (parts.length < 3) return null;
    
    const typeMap = {
        'WEEK': 'weekly',
        'MNTH': 'monthly',  // 月卡使用MNTH缩写
        'YEAR': 'yearly'
    };
    
    const type = typeMap[parts[1]];
    if (!type) return null;
    
    // 从上下文行解析账号数量
    // 例如: "10账号周卡 (¥75/张) - 20张:"
    let accounts = null;
    if (contextLine) {
        const accountMatch = contextLine.match(/(\d+)账号/);
        if (accountMatch) {
            accounts = parseInt(accountMatch[1]);
        }
    }
    
    if (!accounts) return null;
    
    return {
        packageType: type,
        accountLimit: accounts,
        price: PRICING[type][accounts] || 0
    };
}

// 计算到期时间
function calculateExpiration(packageType) {
    const now = new Date();
    const expiration = new Date(now);
    
    switch (packageType) {
        case 'weekly':
            expiration.setDate(now.getDate() + 7);
            break;
        case 'monthly':
            expiration.setMonth(now.getMonth() + 1);
            break;
        case 'yearly':
            expiration.setFullYear(now.getFullYear() + 1);
            break;
    }
    
    return expiration.toISOString();
}

// 主要导入功能
async function importEnhancedCards() {
    try {
        console.log('🚀 开始导入增强版卡密...\n');
        
        // 1. 备份当前auth.json
        if (fs.existsSync(CONFIG.authFile)) {
            const currentAuth = fs.readFileSync(CONFIG.authFile, 'utf8');
            fs.writeFileSync(CONFIG.backupFile, currentAuth);
            console.log('✅ 已备份当前auth.json');
        }
        
        // 2. 读取当前认证数据
        let authData = { card_keys: [] };
        if (fs.existsSync(CONFIG.authFile)) {
            try {
                authData = JSON.parse(fs.readFileSync(CONFIG.authFile, 'utf8'));
                // 确保card_keys数组存在
                if (!authData.card_keys) {
                    authData.card_keys = [];
                }
            } catch (error) {
                console.log('⚠️  auth.json格式错误，使用默认结构');
                authData = { card_keys: [] };
            }
        }
        
        // 3. 读取新卡密文件
        if (!fs.existsSync(CONFIG.cardsFile)) {
            throw new Error(`卡密文件不存在: ${CONFIG.cardsFile}`);
        }
        
        const cardsContent = fs.readFileSync(CONFIG.cardsFile, 'utf8');
        
        // 4. 解析卡密
        const lines = cardsContent.split('\n');
        let importCount = 0;
        let skipCount = 0;
        const summary = {};
        let currentAccountType = null;
        
        console.log(`📝 开始解析卡密文件...`);
        
        // 5. 逐行处理
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检测账号类型行
            const accountTypeMatch = line.match(/(\d+)账号(周|月|年)卡/);
            if (accountTypeMatch) {
                currentAccountType = line;
                continue;
            }
            
            // 检测卡密行 (格式: 001. HSAI-WEEK-0817-XXXX-XXXX)
            const cardMatch = line.match(/^\d+\.\s+(HSAI-[A-Z0-9-]+)$/);
            if (!cardMatch) continue;
            
            const cardKey = cardMatch[1];
            
            // 检查是否已存在
            const exists = authData.card_keys.some(card => card.cardKey === cardKey);
            if (exists) {
                skipCount++;
                continue;
            }
            
            // 解析卡密信息
            const cardInfo = parseCardInfo(cardKey, currentAccountType);
            if (!cardInfo) {
                console.log(`⚠️  无法解析卡密: ${cardKey} (context: ${currentAccountType})`);
                continue;
            }
            
            // 创建卡密记录
            const cardRecord = {
                cardKey: cardKey,
                packageType: cardInfo.packageType,
                accountLimit: cardInfo.accountLimit,
                price: cardInfo.price,
                isUsed: false,
                usedBy: null,
                usedAt: null,
                createdAt: new Date().toISOString(),
                expirationDate: calculateExpiration(cardInfo.packageType),
                isActive: true
            };
            
            authData.card_keys.push(cardRecord);
            importCount++;
            
            // 统计
            const key = `${cardInfo.packageType}_${cardInfo.accountLimit}`;
            summary[key] = (summary[key] || 0) + 1;
        }
        
        // 6. 保存更新后的数据
        fs.writeFileSync(CONFIG.authFile, JSON.stringify(authData, null, 2));
        
        console.log(`📝 处理完成，找到 ${importCount + skipCount} 张卡密`);
        
        // 7. 显示结果
        console.log('\n📊 导入完成统计:');
        console.log(`✅ 成功导入: ${importCount} 张`);
        console.log(`⏭️  跳过重复: ${skipCount} 张`);
        console.log(`📁 总卡密数: ${authData.card_keys.length} 张\n`);
        
        console.log('📋 按类型统计:');
        Object.entries(summary).forEach(([key, count]) => {
            const [type, accounts] = key.split('_');
            const typeNames = {
                'weekly': '周卡',
                'monthly': '月卡', 
                'yearly': '年卡'
            };
            console.log(`  ${typeNames[type]} ${accounts}账号: ${count}张`);
        });
        
        console.log('\n🎉 增强版卡密导入完成！');
        
    } catch (error) {
        console.error('❌ 导入失败:', error.message);
        
        // 如果有备份，尝试恢复
        if (fs.existsSync(CONFIG.backupFile)) {
            try {
                const backup = fs.readFileSync(CONFIG.backupFile, 'utf8');
                fs.writeFileSync(CONFIG.authFile, backup);
                console.log('🔄 已从备份恢复auth.json');
            } catch (restoreError) {
                console.error('❌ 备份恢复失败:', restoreError.message);
            }
        }
    }
}

// 验证导入结果
function verifyImport() {
    try {
        const authData = JSON.parse(fs.readFileSync(CONFIG.authFile, 'utf8'));
        const totalCards = authData.card_keys.length;
        const enhancedCards = authData.card_keys.filter(card => 
            card.cardKey && card.accountLimit
        );
        
        console.log('\n🔍 验证结果:');
        console.log(`📊 总卡密数: ${totalCards}`);
        console.log(`🆕 增强版卡密: ${enhancedCards.length}`);
        
        // 按类型分组验证
        const groups = {};
        enhancedCards.forEach(card => {
            const key = `${card.packageType}_${card.accountLimit}`;
            groups[key] = (groups[key] || 0) + 1;
        });
        
        console.log('\n📈 增强版卡密分布:');
        Object.entries(groups).forEach(([key, count]) => {
            const [type, accounts] = key.split('_');
            const typeNames = {
                'weekly': '周卡',
                'monthly': '月卡',
                'yearly': '年卡'
            };
            const price = PRICING[type][accounts];
            console.log(`  ${typeNames[type]} ${accounts}账号 (¥${price}): ${count}张`);
        });
        
    } catch (error) {
        console.error('❌ 验证失败:', error.message);
    }
}

// 主程序
if (require.main === module) {
    console.log('🎯 增强版卡密导入工具\n');
    
    importEnhancedCards()
        .then(() => {
            verifyImport();
        })
        .catch(error => {
            console.error('程序执行失败:', error);
        });
}

module.exports = {
    importEnhancedCards,
    verifyImport,
    parseCardInfo,
    PRICING
};