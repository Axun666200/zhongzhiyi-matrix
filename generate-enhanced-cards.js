const fs = require('fs');
const path = require('path');

class EnhancedCardGenerator {
    constructor() {
        this.dateCode = '0817'; // 当前日期码
    }

    // 生成随机卡密码
    generateCardCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 生成单张卡密
    generateCard(duration, accountCount) {
        const code1 = this.generateCardCode();
        const code2 = this.generateCardCode();
        return `HSAI-${duration}-${this.dateCode}-${code1}-${code2}`;
    }

    // 计算价格 (基础价格：每账号每月30元)
    calculatePrice(accountCount, durationDays) {
        const basePrice = 30; // 每账号每月基础价格
        const monthlyPrice = accountCount * basePrice;
        
        if (durationDays === 7) {
            // 周卡：月价格的25%
            return Math.round(monthlyPrice * 0.25);
        } else if (durationDays === 30) {
            // 月卡：标准价格
            return monthlyPrice;
        } else if (durationDays === 365) {
            // 年卡：月价格 * 12 * 0.7 (7折优惠)
            return Math.round(monthlyPrice * 12 * 0.7);
        }
        return monthlyPrice;
    }

    // 生成指定配置的卡密批次
    generateBatch(config) {
        const { duration, durationName, accountCount, quantity = 20 } = config;
        const cards = [];
        const durationDays = duration === 'WEEK' ? 7 : (duration === 'MNTH' ? 30 : 365);
        const price = this.calculatePrice(accountCount, durationDays);

        console.log(`\n📦 生成${accountCount}账号${durationName} (${quantity}张)...`);

        for (let i = 0; i < quantity; i++) {
            const cardKey = this.generateCard(duration, accountCount);
            cards.push({
                cardKey,
                packageType: duration.toLowerCase(),
                accountCount,
                durationDays,
                price,
                description: `${accountCount}账号${durationName}`
            });
        }

        return cards;
    }

    // 生成所有增强版卡密套餐
    generateAllPackages() {
        const accountCounts = [10, 15, 20, 25, 30]; // 账号数量选项
        const durations = [
            { duration: 'WEEK', durationName: '周卡' },
            { duration: 'MNTH', durationName: '月卡' },
            { duration: 'YEAR', durationName: '年卡' }
        ];

        const allCards = [];
        const summary = {
            week: {},
            month: {},
            year: {}
        };

        // 为每种时长和账号数量组合生成卡密
        for (const { duration, durationName } of durations) {
            console.log(`\n🎯 ===== ${durationName}系列 =====`);
            
            for (const accountCount of accountCounts) {
                const batch = this.generateBatch({
                    duration,
                    durationName,
                    accountCount,
                    quantity: 20 // 每种配置生成20张
                });

                allCards.push(...batch);

                // 统计信息
                const key = duration.toLowerCase() === 'week' ? 'week' : 
                           duration.toLowerCase() === 'mnth' ? 'month' : 'year';
                summary[key][accountCount] = {
                    count: batch.length,
                    price: batch[0].price,
                    description: batch[0].description
                };
            }
        }

        return { cards: allCards, summary };
    }

    // 生成格式化的卡密文件
    generateFormattedFile() {
        console.log('🚀 开始生成增强版卡密套餐...\n');
        
        const { cards, summary } = this.generateAllPackages();
        
        // 生成文件内容
        let content = '';
        content += '='.repeat(60) + '\n';
        content += '光子矩阵 - 增强版卡密套餐 (账号数量细分)\n';
        content += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
        content += '='.repeat(60) + '\n\n';

        // 按类型分组显示
        const durations = [
            { key: 'week', name: '周卡', duration: 'WEEK' },
            { key: 'month', name: '月卡', duration: 'MNTH' },
            { key: 'year', name: '年卡', duration: 'YEAR' }
        ];

        let cardIndex = 1;

        for (const { key, name, duration } of durations) {
            content += `【${name}系列 - 5种账号规格】\n`;
            content += '-'.repeat(50) + '\n\n';

            // 获取该类型的卡密
            const typeCards = cards.filter(card => card.packageType === duration.toLowerCase());
            
            // 按账号数量分组
            const accountGroups = {};
            typeCards.forEach(card => {
                if (!accountGroups[card.accountCount]) {
                    accountGroups[card.accountCount] = [];
                }
                accountGroups[card.accountCount].push(card);
            });

            // 显示每个账号数量的卡密
            for (const accountCount of [10, 15, 20, 25, 30]) {
                if (accountGroups[accountCount]) {
                    const groupCards = accountGroups[accountCount];
                    const price = groupCards[0].price;
                    
                    content += `\n${accountCount}账号${name} (¥${price}/张) - ${groupCards.length}张:\n`;
                    
                    groupCards.forEach(card => {
                        content += `${String(cardIndex).padStart(3, '0')}. ${card.cardKey}\n`;
                        cardIndex++;
                    });
                }
            }
            content += '\n';
        }

        // 添加统计信息
        content += '='.repeat(60) + '\n';
        content += '套餐价格表:\n';
        content += '='.repeat(60) + '\n';

        for (const { key, name } of durations) {
            if (summary[key] && Object.keys(summary[key]).length > 0) {
                content += `\n${name}:\n`;
                for (const accountCount of [10, 15, 20, 25, 30]) {
                    if (summary[key][accountCount]) {
                        const info = summary[key][accountCount];
                        content += `  ${accountCount}账号: ¥${info.price} (${info.count}张)\n`;
                    }
                }
            }
        }

        content += `\n总计: ${cards.length}张卡密\n`;
        content += '='.repeat(60) + '\n';

        // 保存文件
        const filename = `enhanced-cards-${this.dateCode}.txt`;
        fs.writeFileSync(filename, content, 'utf8');

        console.log('\n✅ 卡密生成完成！');
        console.log(`📁 文件保存为: ${filename}`);
        console.log(`📊 总计: ${cards.length}张卡密`);

        // 显示价格表
        console.log('\n💰 价格表:');
        for (const { key, name } of durations) {
            if (summary[key] && Object.keys(summary[key]).length > 0) {
                console.log(`\n${name}:`);
                for (const accountCount of [10, 15, 20, 25, 30]) {
                    if (summary[key][accountCount]) {
                        const info = summary[key][accountCount];
                        console.log(`  ${accountCount}账号: ¥${info.price}`);
                    }
                }
            }
        }

        return { filename, cards, summary };
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const generator = new EnhancedCardGenerator();
    generator.generateFormattedFile();
}

module.exports = EnhancedCardGenerator;