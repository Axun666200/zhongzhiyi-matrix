// 众之翼矩阵 - 特殊卡密添加工具
// 直接添加50个3分钟测试卡密 + 50个2天10账号卡密

const CardGenerator = require('./auth/card-generator');

class SpecialCardAdder {
    constructor() {
        this.cardGenerator = new CardGenerator();
    }

    async addSpecialCards() {
        console.log('🎯 众之翼矩阵 - 特殊卡密添加工具');
        console.log('='.repeat(60));
        console.log('📦 准备添加:');
        console.log('   • 50张 3分钟测试卡密');
        console.log('   • 50张 2天10账号卡密');
        console.log('='.repeat(60));
        
        try {
            // 配置1：50个3分钟测试卡密
            console.log('🚀 正在添加3分钟测试卡密...');
            const testConfig = {
                packageType: 'test',
                accountCount: 1,
                durationDays: 0.002083, // 3分钟 = 3/1440天
                price: 0,
                quantity: 50,
                agentId: 'admin',
                description: '3分钟测试卡密'
            };
            
            const testResult = await this.cardGenerator.generateBatchCards(testConfig);
            
            if (testResult.success) {
                console.log(`✅ 3分钟测试卡密生成成功: ${testResult.cards.length}张`);
                console.log('   📋 示例卡密:');
                testResult.cards.slice(0, 3).forEach((card, index) => {
                    console.log(`      ${index + 1}. ${card.cardKey}`);
                });
            } else {
                console.error(`❌ 3分钟测试卡密生成失败: ${testResult.message}`);
            }
            
            // 配置2：50个2天10账号卡密
            console.log('\n🚀 正在添加2天10账号卡密...');
            const dayConfig = {
                packageType: '10',
                accountCount: 10,
                durationDays: 2,
                price: 20,
                quantity: 50,
                agentId: 'admin',
                description: '2天10账号体验卡密'
            };
            
            const dayResult = await this.cardGenerator.generateBatchCards(dayConfig);
            
            if (dayResult.success) {
                console.log(`✅ 2天10账号卡密生成成功: ${dayResult.cards.length}张`);
                console.log('   📋 示例卡密:');
                dayResult.cards.slice(0, 3).forEach((card, index) => {
                    console.log(`      ${index + 1}. ${card.cardKey} - ¥${card.price}`);
                });
            } else {
                console.error(`❌ 2天10账号卡密生成失败: ${dayResult.message}`);
            }
            
            // 生成总结报告
            const testSuccess = testResult.success ? testResult.cards.length : 0;
            const daySuccess = dayResult.success ? dayResult.cards.length : 0;
            const totalSuccess = testSuccess + daySuccess;
            
            console.log('\n' + '='.repeat(60));
            console.log('📊 卡密添加完成报告');
            console.log('='.repeat(60));
            console.log(`🧪 3分钟测试卡密: ${testSuccess}张`);
            console.log(`📦 2天10账号卡密: ${daySuccess}张`);
            console.log(`✅ 总计成功添加: ${totalSuccess}张卡密`);
            console.log('='.repeat(60));
            
            if (totalSuccess > 0) {
                console.log('\n🎉 所有卡密已成功添加到系统数据库！');
                console.log('💡 现在可以在管理后台的"卡密管理"中查看和管理这些卡密');
                console.log('🔗 也可以通过API接口使用这些卡密进行激活');
                
                // 保存卡密到文件（备份）
                const allCards = [];
                if (testResult.success) {
                    allCards.push(...testResult.cards);
                }
                if (dayResult.success) {
                    allCards.push(...dayResult.cards);
                }
                
                if (allCards.length > 0) {
                    await this.saveCardsToFile(allCards);
                }
                
            } else {
                console.log('\n❌ 没有成功添加任何卡密，请检查错误信息');
            }
            
        } catch (error) {
            console.error('\n❌ 执行过程中发生错误:', error);
            console.error('错误详情:', error.stack);
        }
    }

    async saveCardsToFile(cards) {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `special-cards-backup-${timestamp}.json`;
            const filepath = path.join(__dirname, 'generated-cards', filename);
            
            // 确保目录存在
            const dir = path.dirname(filepath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // 保存卡密数据
            const cardData = {
                timestamp: new Date().toISOString(),
                total: cards.length,
                cards: cards.map(card => ({
                    cardKey: card.cardKey,
                    packageType: card.packageType,
                    accountCount: card.accountCount,
                    durationDays: card.durationDays,
                    price: card.price,
                    status: card.status,
                    description: card.description
                }))
            };
            
            fs.writeFileSync(filepath, JSON.stringify(cardData, null, 2), 'utf8');
            console.log(`💾 卡密备份已保存到: ${filename}`);
            
        } catch (error) {
            console.warn('⚠️  保存卡密备份文件失败:', error.message);
        }
    }
}

// 执行添加任务
async function main() {
    const adder = new SpecialCardAdder();
    await adder.addSpecialCards();
    process.exit(0);
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = SpecialCardAdder;