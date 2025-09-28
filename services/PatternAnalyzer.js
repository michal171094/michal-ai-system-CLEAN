const { createClient } = require('@supabase/supabase-js');

class PatternAnalyzer {
    constructor() {
        this.patterns = new Map();
        this.insights = [];
        this.lastAnalysis = null;
        
        // Import Life Pattern Analyzer
        const LifePatternAnalyzer = require('./LifePatternAnalyzer');
        this.lifeAnalyzer = new LifePatternAnalyzer();
    }

    // Analyze patterns in user data
    async analyzePatterns(tasks, debts, bureaucracy) {
        console.log('🔍 מתחיל ניתוח דפוסים...');
        
        const analysis = {
            timestamp: new Date().toISOString(),
            debtPatterns: await this.analyzeDebtPatterns(debts),
            bureaucracyPatterns: await this.analyzeBureaucracyPatterns(bureaucracy),
            crossCategoryPatterns: await this.analyzeCrossCategoryPatterns(tasks, debts, bureaucracy),
            lifePatterns: await this.analyzeLifePatterns(tasks, debts, bureaucracy),
            smartSuggestions: [],
            riskAssessment: {},
            opportunities: []
        };

        // Generate smart suggestions based on patterns
        analysis.smartSuggestions = await this.generateSmartSuggestions(analysis);
        
        // Assess risks
        analysis.riskAssessment = await this.assessRisks(analysis);
        
        // Identify opportunities
        analysis.opportunities = await this.identifyOpportunities(analysis);

        this.lastAnalysis = analysis;
        return analysis;
    }

    // Analyze debt patterns
    async analyzeDebtPatterns(debts) {
        const patterns = {
            creditorConsolidation: {},
            amountPatterns: {},
            urgencyPatterns: {},
            paymentHistory: {},
            consolidationOpportunities: []
        };

        // Group debts by creditor
        const creditorGroups = {};
        debts.forEach(debt => {
            const creditor = debt.creditor || debt.collection_agency || 'לא ידוע';
            if (!creditorGroups[creditor]) {
                creditorGroups[creditor] = [];
            }
            creditorGroups[creditor].push(debt);
        });

        // Identify consolidation opportunities
        Object.entries(creditorGroups).forEach(([creditor, debtList]) => {
            if (debtList.length > 1) {
                const totalAmount = debtList.reduce((sum, debt) => sum + (debt.amount || 0), 0);
                patterns.consolidationOpportunities.push({
                    creditor,
                    debtCount: debtList.length,
                    totalAmount,
                    suggestion: `איחוד ${debtList.length} חובות של ${creditor} לסכום כולל של €${totalAmount.toFixed(2)}`,
                    priority: totalAmount > 500 ? 'high' : 'medium'
                });
            }
        });

        // Analyze amount patterns
        const amounts = debts.map(d => d.amount || 0).filter(a => a > 0);
        if (amounts.length > 0) {
            patterns.amountPatterns = {
                average: amounts.reduce((a, b) => a + b, 0) / amounts.length,
                median: amounts.sort()[Math.floor(amounts.length / 2)],
                total: amounts.reduce((a, b) => a + b, 0),
                distribution: this.categorizeAmounts(amounts)
            };
        }

        return patterns;
    }

    // Analyze bureaucracy patterns
    async analyzeBureaucracyPatterns(bureaucracy) {
        const patterns = {
            processTypes: {},
            deadlinePatterns: {},
            crossCountryOpportunities: [],
            efficiencySuggestions: []
        };

        // Group by process type
        bureaucracy.forEach(process => {
            const type = this.categorizeProcessType(process);
            if (!patterns.processTypes[type]) {
                patterns.processTypes[type] = [];
            }
            patterns.processTypes[type].push(process);
        });

        // Look for cross-country opportunities (Israel-Germany)
        const israelProcesses = bureaucracy.filter(p => 
            p.entity && (p.entity.includes('ישראל') || p.entity.includes('Israel') || p.entity.includes('ירושלים') || p.entity.includes('תל אביב'))
        );
        
        const germanyProcesses = bureaucracy.filter(p => 
            p.entity && (p.entity.includes('Germany') || p.entity.includes('Berlin') || p.entity.includes('גרמניה') || p.entity.includes('ברלין'))
        );

        if (israelProcesses.length > 0 && germanyProcesses.length > 0) {
            patterns.crossCountryOpportunities.push({
                type: 'benefit_transfer',
                description: 'זיהוי פוטנציאל להעברת זכויות בין ישראל לגרמניה',
                israelProcesses: israelProcesses.length,
                germanyProcesses: germanyProcesses.length,
                suggestion: 'בדוק אפשרות להעביר קצבאות או זכויות בין המדינות',
                priority: 'high'
            });
        }

        return patterns;
    }

    // Analyze cross-category patterns
    async analyzeCrossCategoryPatterns(tasks, debts, bureaucracy) {
        const patterns = {
            interconnectedProcesses: [],
            priorityConflicts: [],
            resourceOptimization: []
        };

        // Find interconnected processes
        const allItems = [...tasks, ...debts, ...bureaucracy];
        
        allItems.forEach(item1 => {
            allItems.forEach(item2 => {
                if (item1.id !== item2.id) {
                    const connection = this.findConnection(item1, item2);
                    if (connection) {
                        patterns.interconnectedProcesses.push({
                            item1: item1.title || item1.subject,
                            item2: item2.title || item2.subject,
                            connectionType: connection.type,
                            strength: connection.strength,
                            suggestion: connection.suggestion
                        });
                    }
                }
            });
        });

        return patterns;
    }

    // Generate smart suggestions based on analysis
    async generateSmartSuggestions(analysis) {
        const suggestions = [];

        // Debt consolidation suggestions
        analysis.debtPatterns.consolidationOpportunities.forEach(opportunity => {
            suggestions.push({
                type: 'debt_consolidation',
                title: `איחוד חובות עם ${opportunity.creditor}`,
                description: opportunity.suggestion,
                priority: opportunity.priority,
                action: 'contact_creditor',
                estimatedSavings: opportunity.totalAmount * 0.1, // Assume 10% savings
                steps: [
                    `צור קשר עם ${opportunity.creditor}`,
                    'בקש הצעה לאיחוד החובות',
                    'השווה עם אפשרויות אחרות',
                    'חתום על הסכם איחוד'
                ]
            });
        });

        // Cross-country benefit suggestions
        analysis.bureaucracyPatterns.crossCountryOpportunities.forEach(opportunity => {
            suggestions.push({
                type: 'cross_country_benefit',
                title: 'העברת זכויות בין ישראל לגרמניה',
                description: opportunity.suggestion,
                priority: opportunity.priority,
                action: 'research_benefits',
                estimatedValue: 'לא ידוע - דורש מחקר',
                steps: [
                    'חקור זכויות קצבה בישראל',
                    'חקור זכויות קצבה בגרמניה',
                    'בדוק הסכמי ביטוח לאומי בין המדינות',
                    'הגש בקשה להעברת זכויות'
                ]
            });
        });

        // Efficiency suggestions
        if (analysis.debtPatterns.amountPatterns.total > 5000) {
            suggestions.push({
                type: 'financial_planning',
                title: 'תכנון פיננסי כולל',
                description: 'עם סך חובות של €' + analysis.debtPatterns.amountPatterns.total.toFixed(2) + ', מומלץ לפנות ליועץ פיננסי',
                priority: 'high',
                action: 'find_financial_advisor',
                estimatedValue: 'חיסכון משמעותי בטווח הארוך',
                steps: [
                    'חפש יועץ פיננסי מוסמך',
                    'הכן מסמכים פיננסיים',
                    'תכנן אסטרטגיית תשלום',
                    'בצע מעקב שוטף'
                ]
            });
        }

        return suggestions;
    }

    // Assess risks based on patterns
    async assessRisks(analysis) {
        const risks = {
            high: [],
            medium: [],
            low: []
        };

        // High priority debt risks
        const urgentDebts = analysis.debtPatterns.consolidationOpportunities.filter(o => o.priority === 'high');
        if (urgentDebts.length > 0) {
            risks.high.push({
                type: 'debt_escalation',
                description: `${urgentDebts.length} חובות דחופים עלולים להסלים`,
                impact: 'גבוה',
                mitigation: 'פנה לנושים בהקדם לדיון על הסדר'
            });
        }

        // Deadline risks
        const upcomingDeadlines = analysis.bureaucracyPatterns.deadlinePatterns;
        if (upcomingDeadlines.urgent && upcomingDeadlines.urgent > 0) {
            risks.medium.push({
                type: 'deadline_miss',
                description: `${upcomingDeadlines.urgent} דדליינים קרובים`,
                impact: 'בינוני',
                mitigation: 'הקדם עדיפות למשימות עם דדליינים'
            });
        }

        return risks;
    }

    // Identify opportunities
    async identifyOpportunities(analysis) {
        const opportunities = [];

        // Research opportunities
        opportunities.push({
            type: 'research_opportunity',
            title: 'חקור אפשרויות איחוד חובות',
            description: 'חקור אפשרויות איחוד חובות עם נושים שונים',
            potentialValue: 'חיסכון של 10-30%',
            effort: 'בינוני',
            timeframe: '1-2 חודשים'
        });

        // Legal aid opportunities
        if (analysis.debtPatterns.amountPatterns.total > 2000) {
            opportunities.push({
                type: 'legal_aid',
                title: 'פנה לסיוע משפטי',
                description: 'עם חובות גבוהים, ייתכן זכאות לסיוע משפטי',
                potentialValue: 'ייצוג משפטי חינם',
                effort: 'נמוך',
                timeframe: '2-4 שבועות'
            });
        }

        return opportunities;
    }

    // Helper methods
    categorizeAmounts(amounts) {
        const ranges = {
            low: amounts.filter(a => a < 100).length,
            medium: amounts.filter(a => a >= 100 && a < 500).length,
            high: amounts.filter(a => a >= 500).length
        };
        return ranges;
    }

    categorizeProcessType(process) {
        const entity = (process.entity || '').toLowerCase();
        const subject = (process.subject || '').toLowerCase();
        
        if (entity.includes('standesamt') || subject.includes('חתונה')) return 'marriage';
        if (entity.includes('finanzamt') || subject.includes('מס')) return 'tax';
        if (entity.includes('jobcenter') || subject.includes('תעסוקה')) return 'employment';
        if (entity.includes('krankenkasse') || subject.includes('ביטוח')) return 'insurance';
        return 'general';
    }

    findConnection(item1, item2) {
        // Check for common entities
        if (item1.entity && item2.entity && item1.entity === item2.entity) {
            return {
                type: 'same_entity',
                strength: 0.9,
                suggestion: `שני תהליכים עם אותה ישות: ${item1.entity}`
            };
        }

        // Check for similar amounts
        if (item1.amount && item2.amount && Math.abs(item1.amount - item2.amount) < 10) {
            return {
                type: 'similar_amount',
                strength: 0.7,
                suggestion: `סכומים דומים: €${item1.amount} ו-€${item2.amount}`
            };
        }

        // Check for similar case numbers
        if (item1.case_number && item2.case_number && item1.case_number === item2.case_number) {
            return {
                type: 'same_case',
                strength: 0.95,
                suggestion: `אותו מספר תיק: ${item1.case_number}`
            };
        }

        return null;
    }

    // Get current status snapshot
    getStatusSnapshot() {
        if (!this.lastAnalysis) {
            return {
                status: 'לא נותח',
                message: 'עדיין לא בוצע ניתוח דפוסים',
                lastUpdate: null
            };
        }

        const analysis = this.lastAnalysis;
        const totalSuggestions = analysis.smartSuggestions.length;
        const highPriorityRisks = analysis.riskAssessment.high.length;
        const opportunities = analysis.opportunities.length;

        return {
            status: 'מנותח',
            message: `${totalSuggestions} הצעות חכמות, ${highPriorityRisks} סיכונים גבוהים, ${opportunities} הזדמנויות`,
            lastUpdate: analysis.timestamp,
            summary: {
                debtConsolidation: analysis.debtPatterns.consolidationOpportunities.length,
                crossCountry: analysis.bureaucracyPatterns.crossCountryOpportunities.length,
                interconnected: analysis.crossCategoryPatterns.interconnectedProcesses.length
            }
        };
    }

    // Update pattern analysis periodically
    async updateAnalysis(tasks, debts, bureaucracy) {
        console.log('🔄 מעדכן ניתוח דפוסים...');
        return await this.analyzePatterns(tasks, debts, bureaucracy);
    }

    // Analyze life patterns - new method inspired by Life Orchestrator vision
    async analyzeLifePatterns(tasks, debts, bureaucracy) {
        console.log('🧠 מנתח דפוסי חיים...');
        
        const lifePatterns = {
            workPatterns: this.lifeAnalyzer.analyzeWorkPatterns(tasks, {}),
            decisionPatterns: this.lifeAnalyzer.analyzeDecisionPatterns([]),
            stressTriggers: this.lifeAnalyzer.identifyStressTriggers([], {}),
            resourceUsage: this.lifeAnalyzer.analyzeResourceUsage({
                financial: debts,
                time: tasks,
                energy: tasks,
                relationships: []
            }),
            optimizationOpportunities: this.lifeAnalyzer.identifyOptimizationOpportunities(),
            proactiveRecommendations: this.lifeAnalyzer.generateProactiveRecommendations({})
        };

        return lifePatterns;
    }
}

module.exports = PatternAnalyzer;
