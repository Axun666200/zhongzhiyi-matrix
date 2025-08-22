const fs = require('fs');

/**
 * 生成可用卡密报告
 * 统计并导出所有可以打包给客户的未使用卡密
 */

const CONFIG = {
    authFile: './auth/auth.json',
    outputFile: './available-cards-report.txt'
};

// 读取并分析数据库
function generateAvailableCardsReport() {
    try {
        console.log('🔍 开始分析可用卡密...\n');
        
        // 1. 读取数据库
        if (!fs.existsSync(CONFIG.authFile)) {
            throw new Error(`数据库文件不存在: ${CONFIG.authFile}`);
        }
        
        const authData = JSON.parse(fs.readFileSync(CONFIG.authFile, 'utf8'));
        
        // 2. 分析数据结构并统计
        let availableCards = [];
        let statistics = {
            total: 0,
            byType: {},
            byAccountLimit: {}
        };
        
        console.log('📊 数据库结构分析:');
        console.log(`- card_keys数组长度: ${authData.card_keys ? authData.card_keys.length : 0}`);
        console.log(`- cards数组长度: ${authData.cards ? authData.cards.length : 0}\n`);
        
        // 3. 处理card_keys数组（新格式）
        if (authData.card_keys && Array.isArray(authData.card_keys)) {
            authData.card_keys.forEach(card => {
                // 检查卡密是否可用（未使用状态）
                const isUnused = card.status === 'unused';
                
                if (isUnused && card.card_key && card.card_key.startsWith('HSAI-')) {
                    availableCards.push({
                        cardKey: card.card_key,
                        packageType: card.package_type,
                        accountCount: card.account_count,
                        durationDays: card.duration_days,
                        price: card.price,
                        createdAt: card.created_at,
                        format: 'card_keys'
                    });
                    
                    statistics.total++;
                    
                    // 按类型统计
                    const type = card.package_type || 'unknown';
                    statistics.byType[type] = (statistics.byType[type] || 0) + 1;
                    
                    // 按账号数量统计
                    const accounts = card.account_count || 'unknown';
                    statistics.byAccountLimit[accounts] = (statistics.byAccountLimit[accounts] || 0) + 1;
                }
            });
        }
        
        // 4. 处理cards数组（导入格式）
        if (authData.cards && Array.isArray(authData.cards)) {
            authData.cards.forEach(card => {
                // 检查卡密是否可用（未使用状态）
                const isUnused = !card.isUsed && card.isActive;
                
                if (isUnused && card.cardKey && card.cardKey.startsWith('HSAI-')) {
                    availableCards.push({
                        cardKey: card.cardKey,
                        packageType: card.packageType,
                        accountCount: card.accountLimit,
                        durationDays: getDurationDays(card.packageType),
                        price: card.price,
                        createdAt: card.createdAt,
                        format: 'cards'
                    });
                    
                    statistics.total++;
                    
                    // 按类型统计
                    const type = card.packageType || 'unknown';
                    statistics.byType[type] = (statistics.byType[type] || 0) + 1;
                    
                    // 按账号数量统计
                    const accounts = card.accountLimit || 'unknown';
                    statistics.byAccountLimit[accounts] = (statistics.byAccountLimit[accounts] || 0) + 1;
                }
            });
        }
        
        // 5. 去除重复卡密（两个数组可能有重复）
        const uniqueCards = removeDuplicateCards(availableCards);
        
        // 6. 按类型和账号数量分组
        const groupedCards = groupCardsByTypeAndAccounts(uniqueCards);
        
        // 7. 重新计算统计数据（去重后）
        const finalStatistics = calculateFinalStatistics(uniqueCards);
        
        // 8. 生成报告
        generateReport(groupedCards, finalStatistics);
        
        console.log('\n🎉 可用卡密报告生成完成！');
        console.log(`📝 报告文件: ${CONFIG.outputFile}`);
        
    } catch (error) {
        console.error('❌ 生成报告失败:', error.message);
    }
}

// 获取套餐对应的天数
function getDurationDays(packageType) {
    const durationMap = {
        'weekly': 7,
        'monthly': 30,
        'yearly': 365,
        'week': 7,
        'month': 30,
        'year': 365
    };
    return durationMap[packageType] || 0;
}

// 去除重复卡密
function removeDuplicateCards(cards) {
    const seen = new Set();
    return cards.filter(card => {
        if (seen.has(card.cardKey)) {
            return false;
        }
        seen.add(card.cardKey);
        return true;
    });
}

// 重新计算统计数据
function calculateFinalStatistics(cards) {
    const statistics = {
        total: cards.length,
        byType: {},
        byAccountLimit: {}
    };
    
    cards.forEach(card => {
        // 按类型统计
        const type = card.packageType || 'unknown';
        statistics.byType[type] = (statistics.byType[type] || 0) + 1;
        
        // 按账号数量统计
        const accounts = card.accountCount || 'unknown';
        statistics.byAccountLimit[accounts] = (statistics.byAccountLimit[accounts] || 0) + 1;
    });
    
    return statistics;
}

// 按类型和账号数量分组
function groupCardsByTypeAndAccounts(cards) {
    const grouped = {};
    
    cards.forEach(card => {
        const key = `${card.packageType}_${card.accountCount}`;
        if (!grouped[key]) {
            grouped[key] = {
                packageType: card.packageType,
                accountCount: card.accountCount,
                durationDays: card.durationDays,
                price: card.price,
                cards: []
            };
        }
        grouped[key].cards.push(card.cardKey);
    });
    
    return grouped;
}

// 生成报告文件
function generateReport(groupedCards, statistics) {
    let report = '';
    
    // 报告头部
    report += '='.repeat(60) + '\n';
    report += '              可用卡密统计报告\n';
    report += '='.repeat(60) + '\n';
    report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    
    // 总体统计
    report += '📊 总体统计:\n';
    report += `- 可用卡密总数: ${statistics.total} 张\n\n`;
    
    // 按类型统计
    report += '📋 按套餐类型统计:\n';
    Object.entries(statistics.byType).forEach(([type, count]) => {
        const typeNames = {
            'weekly': '周卡',
            'monthly': '月卡', 
            'yearly': '年卡',
            'week': '周卡',
            'month': '月卡',
            'year': '年卡'
        };
        report += `- ${typeNames[type] || type}: ${count} 张\n`;
    });
    report += '\n';
    
    // 按账号数量统计
    report += '🔢 按账号数量统计:\n';
    Object.entries(statistics.byAccountLimit).forEach(([accounts, count]) => {
        report += `- ${accounts}账号: ${count} 张\n`;
    });
    report += '\n';
    
    // 详细卡密列表
    report += '📝 可用卡密详细列表:\n';
    report += '='.repeat(60) + '\n\n';
    
    // 按组输出
    Object.entries(groupedCards).forEach(([key, group]) => {
        const typeNames = {
            'weekly': '周卡',
            'monthly': '月卡', 
            'yearly': '年卡',
            'week': '周卡',
            'month': '月卡',
            'year': '年卡'
        };
        
        report += `${typeNames[group.packageType] || group.packageType} ${group.accountCount}账号 (¥${group.price}/张) - ${group.cards.length}张:\n`;
        report += '-'.repeat(50) + '\n';
        
        group.cards.forEach((cardKey, index) => {
            report += `${String(index + 1).padStart(3, '0')}. ${cardKey}\n`;
        });
        
        report += '\n';
    });
    
    // 使用说明
    report += '💡 使用说明:\n';
    report += '- 以上所有卡密均为未使用状态，可以直接打包给客户\n';
    report += '- 建议按套餐类型和账号数量分别打包\n';
    report += '- 每个卡密只能使用一次，激活后会自动标记为已使用\n';
    report += '- 请妥善保管卡密，避免泄露\n\n';
    
    report += '='.repeat(60) + '\n';
    report += '报告生成完毕\n';
    report += '='.repeat(60) + '\n';
    
    // 保存报告
    fs.writeFileSync(CONFIG.outputFile, report, 'utf8');
    
    // 控制台输出摘要
    console.log('📋 统计摘要:');
    console.log(`✅ 可用卡密总数: ${statistics.total} 张`);
    console.log('\n按套餐类型:');
    Object.entries(statistics.byType).forEach(([type, count]) => {
        const typeNames = {
            'weekly': '周卡',
            'monthly': '月卡', 
            'yearly': '年卡',
            'week': '周卡',
            'month': '月卡',
            'year': '年卡'
        };
        console.log(`  ${typeNames[type] || type}: ${count}张`);
    });
    
    console.log('\n按账号数量:');
    Object.entries(statistics.byAccountLimit).forEach(([accounts, count]) => {
        console.log(`  ${accounts}账号: ${count}张`);
    });
}

// 如果直接运行此脚本
if (require.main === module) {
    generateAvailableCardsReport();
}

module.exports = {
    generateAvailableCardsReport
};