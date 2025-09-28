/**
 * Life Pattern Analyzer - זיהוי דפוסי חיים
 * חלק מהחזון של Life Orchestrator
 */

class LifePatternAnalyzer {
    constructor() {
        this.patterns = {
            workPatterns: [],
            decisionPatterns: [],
            stressTriggers: [],
            resourceUsage: [],
            timePatterns: []
        };
        
        this.insights = [];
        this.learningData = new Map();
    }

    /**
     * ניתוח דפוסי עבודה
     */
    analyzeWorkPatterns(tasks, completionData) {
        const patterns = {
            peakHours: this.findPeakHours(tasks),
            taskTypes: this.analyzeTaskTypes(tasks),
            completionRates: this.calculateCompletionRates(completionData),
            energyLevels: this.trackEnergyLevels(tasks)
        };

        this.patterns.workPatterns.push({
            timestamp: new Date(),
            patterns: patterns,
            insights: this.generateWorkInsights(patterns)
        });

        return patterns;
    }

    /**
     * ניתוח דפוסי קבלת החלטות
     */
    analyzeDecisionPatterns(decisions) {
        const patterns = {
            decisionTime: this.calculateDecisionTime(decisions),
            riskTolerance: this.assessRiskTolerance(decisions),
            resourceAllocation: this.analyzeResourceAllocation(decisions),
            preferencePatterns: this.identifyPreferences(decisions)
        };

        this.patterns.decisionPatterns.push({
            timestamp: new Date(),
            patterns: patterns,
            insights: this.generateDecisionInsights(patterns)
        });

        return patterns;
    }

    /**
     * זיהוי טריגרים לסטרס
     */
    identifyStressTriggers(events, stressLevels) {
        const triggers = {
            deadlinePressure: this.analyzeDeadlinePressure(events),
            resourceConstraints: this.analyzeResourceConstraints(events),
            complexityOverload: this.analyzeComplexityOverload(events),
            uncertaintyFactors: this.analyzeUncertainty(events)
        };

        this.patterns.stressTriggers.push({
            timestamp: new Date(),
            triggers: triggers,
            insights: this.generateStressInsights(triggers)
        });

        return triggers;
    }

    /**
     * ניתוח שימוש במשאבים
     */
    analyzeResourceUsage(resourceData) {
        const patterns = {
            financial: this.analyzeFinancialPatterns(resourceData.financial),
            time: this.analyzeTimePatterns(resourceData.time),
            energy: this.analyzeEnergyPatterns(resourceData.energy),
            relationships: this.analyzeRelationshipPatterns(resourceData.relationships)
        };

        this.patterns.resourceUsage.push({
            timestamp: new Date(),
            patterns: patterns,
            insights: this.generateResourceInsights(patterns)
        });

        return patterns;
    }

    /**
     * זיהוי הזדמנויות לאופטימיזציה
     */
    identifyOptimizationOpportunities() {
        const opportunities = [];

        // ניתוח דפוסי זמן
        const timePatterns = this.analyzeTimePatterns();
        if (timePatterns.inefficiencies.length > 0) {
            opportunities.push({
                type: 'time_optimization',
                description: 'זיהוי חלונות זמן לא מנוצלים',
                potential: timePatterns.inefficiencies,
                impact: 'high'
            });
        }

        // ניתוח דפוסי כסף
        const financialPatterns = this.analyzeFinancialPatterns();
        if (financialPatterns.savings.length > 0) {
            opportunities.push({
                type: 'financial_optimization',
                description: 'הזדמנויות לחיסכון',
                potential: financialPatterns.savings,
                impact: 'medium'
            });
        }

        // ניתוח דפוסי אנרגיה
        const energyPatterns = this.analyzeEnergyPatterns();
        if (energyPatterns.optimizations.length > 0) {
            opportunities.push({
                type: 'energy_optimization',
                description: 'אופטימיזציה של רמות אנרגיה',
                potential: energyPatterns.optimizations,
                impact: 'high'
            });
        }

        return opportunities;
    }

    /**
     * יצירת המלצות פרואקטיביות
     */
    generateProactiveRecommendations(currentState) {
        const recommendations = [];

        // המלצות על בסיס דפוסים
        const workPatterns = this.getLatestPatterns('workPatterns');
        if (workPatterns) {
            recommendations.push(...this.generateWorkRecommendations(workPatterns));
        }

        // המלצות על בסיס משאבים
        const resourcePatterns = this.getLatestPatterns('resourceUsage');
        if (resourcePatterns) {
            recommendations.push(...this.generateResourceRecommendations(resourcePatterns));
        }

        // המלצות על בסיס סטרס
        const stressPatterns = this.getLatestPatterns('stressTriggers');
        if (stressPatterns) {
            recommendations.push(...this.generateStressRecommendations(stressPatterns));
        }

        return recommendations;
    }

    // Helper methods
    findPeakHours(tasks) {
        const hourCounts = {};
        tasks.forEach(task => {
            const hour = new Date(task.completedAt).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        return Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => hour);
    }

    analyzeTaskTypes(tasks) {
        const typeCounts = {};
        tasks.forEach(task => {
            typeCounts[task.category] = (typeCounts[task.category] || 0) + 1;
        });
        
        return typeCounts;
    }

    calculateCompletionRates(completionData) {
        const rates = {};
        Object.entries(completionData).forEach(([category, data]) => {
            rates[category] = data.completed / data.total;
        });
        
        return rates;
    }

    trackEnergyLevels(tasks) {
        // ניתוח רמות אנרגיה על בסיס סוג המשימות ושעת הביצוע
        return tasks.map(task => ({
            category: task.category,
            hour: new Date(task.completedAt).getHours(),
            energyLevel: task.energyLevel || 'medium'
        }));
    }

    generateWorkInsights(patterns) {
        const insights = [];
        
        if (patterns.peakHours.length > 0) {
            insights.push(`שעות פרודוקטיביות: ${patterns.peakHours.join(', ')}`);
        }
        
        if (patterns.completionRates) {
            const bestCategory = Object.entries(patterns.completionRates)
                .sort(([,a], [,b]) => b - a)[0];
            if (bestCategory) {
                insights.push(`הקטגוריה הכי מוצלחת: ${bestCategory[0]} (${Math.round(bestCategory[1] * 100)}%)`);
            }
        }
        
        return insights;
    }

    generateDecisionInsights(patterns) {
        const insights = [];
        
        if (patterns.decisionTime) {
            insights.push(`זמן קבלת החלטה ממוצע: ${patterns.decisionTime} שעות`);
        }
        
        if (patterns.riskTolerance) {
            insights.push(`רמת נטילת סיכונים: ${patterns.riskTolerance}`);
        }
        
        return insights;
    }

    generateStressInsights(triggers) {
        const insights = [];
        
        if (triggers.deadlinePressure) {
            insights.push(`לחץ דדליינים: ${triggers.deadlinePressure.level}`);
        }
        
        if (triggers.resourceConstraints) {
            insights.push(`אילוצי משאבים: ${triggers.resourceConstraints.type}`);
        }
        
        return insights;
    }

    generateResourceInsights(patterns) {
        const insights = [];
        
        if (patterns.financial) {
            insights.push(`דפוסי הוצאות: ${patterns.financial.trend}`);
        }
        
        if (patterns.time) {
            insights.push(`ניצול זמן: ${patterns.time.efficiency}%`);
        }
        
        return insights;
    }

    getLatestPatterns(patternType) {
        const patterns = this.patterns[patternType];
        return patterns.length > 0 ? patterns[patterns.length - 1] : null;
    }

    generateWorkRecommendations(patterns) {
        const recommendations = [];
        
        if (patterns.patterns.peakHours) {
            recommendations.push({
                type: 'scheduling',
                priority: 'high',
                message: `תכנן משימות חשובות לשעות ${patterns.patterns.peakHours.join(', ')}`,
                reasoning: 'אלה השעות הכי פרודוקטיביות שלך'
            });
        }
        
        return recommendations;
    }

    generateResourceRecommendations(patterns) {
        const recommendations = [];
        
        if (patterns.patterns.financial) {
            recommendations.push({
                type: 'financial',
                priority: 'medium',
                message: 'שקול לחסוך במשאבים לא חיוניים השבוע',
                reasoning: 'יש עלייה בהוצאות החודש'
            });
        }
        
        return recommendations;
    }

    generateStressRecommendations(patterns) {
        const recommendations = [];
        
        if (patterns.triggers.deadlinePressure) {
            recommendations.push({
                type: 'stress_management',
                priority: 'high',
                message: 'קח הפסקה קצרה לפני המשימה הבאה',
                reasoning: 'זיהיתי רמת לחץ גבוהה'
            });
        }
        
        return recommendations;
    }

    // Placeholder methods for complex analysis
    analyzeFinancialPatterns(data = {}) {
        return { trend: 'stable', savings: [], inefficiencies: [] };
    }

    analyzeTimePatterns(data = {}) {
        return { efficiency: 85, inefficiencies: [], opportunities: [] };
    }

    analyzeEnergyPatterns(data = {}) {
        return { average: 'medium', optimizations: [], lowPoints: [] };
    }

    analyzeRelationshipPatterns(data = {}) {
        return { interactions: [], support: [], conflicts: [] };
    }

    calculateDecisionTime(decisions) {
        // Calculate average decision time
        return 24; // hours
    }

    assessRiskTolerance(decisions) {
        // Analyze risk-taking patterns
        return 'moderate';
    }

    analyzeResourceAllocation(decisions) {
        // Analyze how resources are allocated
        return { time: 60, money: 30, energy: 10 };
    }

    identifyPreferences(decisions) {
        // Identify decision preferences
        return { speed: 'quick', quality: 'high', cost: 'moderate' };
    }

    analyzeDeadlinePressure(events) {
        return { level: 'medium', sources: ['work', 'bureaucracy'] };
    }

    analyzeResourceConstraints(events) {
        return { type: 'financial', severity: 'low' };
    }

    analyzeComplexityOverload(events) {
        return { level: 'medium', factors: ['multiple_dependencies'] };
    }

    analyzeUncertainty(events) {
        return { level: 'high', sources: ['bureaucracy', 'external_dependencies'] };
    }
}

module.exports = LifePatternAnalyzer;
