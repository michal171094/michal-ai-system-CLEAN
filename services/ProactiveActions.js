/**
 * Proactive Actions Service
 * Identifies and suggests proactive actions to prevent problems and seize opportunities
 */

class ProactiveActions {
    constructor() {
        this.actionTypes = {
            PREVENTIVE: 'preventive',
            OPPORTUNITY: 'opportunity',
            OPTIMIZATION: 'optimization',
            PREPARATION: 'preparation'
        };
        
        this.actions = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        console.log('⚡ Initializing Proactive Actions Service...');
        this.isInitialized = true;
        console.log('✅ Proactive Actions Service ready');
    }

    async analyzeAndSuggestActions(tasks, debts, bureaucracy, context = {}) {
        if (!this.isInitialized) await this.initialize();
        
        const suggestions = [];
        
        // Analyze different aspects for proactive opportunities
        suggestions.push(...await this.analyzeDebtOpportunities(debts));
        suggestions.push(...await this.analyzeBureaucracyOpportunities(bureaucracy));
        suggestions.push(...await this.analyzeTaskDependencies(tasks));
        suggestions.push(...await this.analyzeDeadlinePatterns(tasks, bureaucracy));
        suggestions.push(...await this.analyzeResourceOptimization(context));
        
        // Filter and prioritize suggestions
        return this.prioritizeActions(suggestions);
    }

    async analyzeDebtOpportunities(debts) {
        const suggestions = [];
        
        // Group debts by creditor
        const creditorGroups = new Map();
        for (const debt of debts) {
            const creditor = debt.creditor_name || debt.company;
            if (creditor) {
                if (!creditorGroups.has(creditor)) {
                    creditorGroups.set(creditor, []);
                }
                creditorGroups.get(creditor).push(debt);
            }
        }

        // Suggest consolidation opportunities
        for (const [creditor, creditorDebts] of creditorGroups) {
            if (creditorDebts.length > 1) {
                const totalAmount = creditorDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
                
                suggestions.push({
                    id: `debt_consolidation_${creditor}`,
                    type: this.actionTypes.OPTIMIZATION,
                    priority: 'high',
                    title: `Consolidate debts with ${creditor}`,
                    description: `You have ${creditorDebts.length} separate debts with ${creditor} totaling €${totalAmount}`,
                    reasoning: 'Consolidating multiple debts with the same creditor can simplify management and potentially reduce interest rates',
                    actions: [
                        `Contact ${creditor} to discuss consolidation options`,
                        'Prepare debt consolidation proposal',
                        'Calculate potential savings from consolidation',
                        'Negotiate better terms or payment plan'
                    ],
                    expectedBenefits: [
                        'Simplified debt management',
                        'Potential interest rate reduction',
                        'Single monthly payment',
                        'Improved credit score over time'
                    ],
                    estimatedSavings: totalAmount * 0.05, // Assume 5% savings
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    effort: 'medium',
                    risk: 'low'
                });
            }
        }

        // Suggest early payment opportunities
        for (const debt of debts) {
            if (debt.amount && debt.amount < 100) { // Small debts
                suggestions.push({
                    id: `early_payment_${debt.id}`,
                    type: this.actionTypes.PREVENTIVE,
                    priority: 'medium',
                    title: `Pay off small debt: ${debt.creditor_name || debt.company}`,
                    description: `Quick win: Pay off €${debt.amount} debt with ${debt.creditor_name || debt.company}`,
                    reasoning: 'Small debts can be paid off quickly, reducing the number of creditors and improving cash flow',
                    actions: [
                        `Make payment of €${debt.amount} to ${debt.creditor_name || debt.company}`,
                        'Request confirmation of debt closure',
                        'Update debt tracking system'
                    ],
                    expectedBenefits: [
                        'Reduced number of active debts',
                        'Improved cash flow',
                        'Psychological boost from quick win'
                    ],
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    effort: 'low',
                    risk: 'none'
                });
            }
        }

        return suggestions;
    }

    async analyzeBureaucracyOpportunities(bureaucracy) {
        const suggestions = [];
        
        // Group by entity for batch processing
        const entityGroups = new Map();
        for (const item of bureaucracy) {
            const entity = item.entity;
            if (entity) {
                if (!entityGroups.has(entity)) {
                    entityGroups.set(entity, []);
                }
                entityGroups.get(entity).push(item);
            }
        }

        // Suggest batch processing
        for (const [entity, entityItems] of entityGroups) {
            if (entityItems.length > 1) {
                suggestions.push({
                    id: `batch_bureaucracy_${entity}`,
                    type: this.actionTypes.OPTIMIZATION,
                    priority: 'medium',
                    title: `Batch process ${entity} tasks`,
                    description: `Complete ${entityItems.length} tasks with ${entity} in one visit`,
                    reasoning: 'Batch processing similar bureaucratic tasks saves time and reduces travel costs',
                    actions: [
                        `Prepare all required documents for ${entityItems.length} tasks`,
                        `Schedule single appointment with ${entity}`,
                        'Complete all tasks in one visit',
                        'Follow up on all submissions together'
                    ],
                    expectedBenefits: [
                        'Time savings (estimated 2-3 hours)',
                        'Reduced travel costs',
                        'More efficient process',
                        'Better organization'
                    ],
                    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
                    effort: 'medium',
                    risk: 'low'
                });
            }
        }

        // Suggest deadline preparation
        for (const item of bureaucracy) {
            if (item.deadline) {
                const deadline = new Date(item.deadline);
                const daysUntilDeadline = (deadline - new Date()) / (1000 * 60 * 60 * 24);
                
                if (daysUntilDeadline < 30 && daysUntilDeadline > 7) {
                    suggestions.push({
                        id: `prepare_deadline_${item.id}`,
                        type: this.actionTypes.PREPARATION,
                        priority: 'high',
                        title: `Prepare for ${item.subject} deadline`,
                        description: `${item.subject} deadline is in ${Math.round(daysUntilDeadline)} days`,
                        reasoning: 'Early preparation prevents last-minute stress and ensures quality completion',
                        actions: [
                            'Gather all required documents',
                            'Review requirements and procedures',
                            'Schedule completion time',
                            'Prepare backup plan if needed'
                        ],
                        expectedBenefits: [
                            'Reduced stress',
                            'Better quality work',
                            'No last-minute rush',
                            'Peace of mind'
                        ],
                        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                        effort: 'medium',
                        risk: 'low'
                    });
                }
            }
        }

        return suggestions;
    }

    async analyzeTaskDependencies(tasks) {
        const suggestions = [];
        
        // Find tasks that might be blocking others
        const taskMap = new Map();
        for (const task of tasks) {
            taskMap.set(task.id, task);
        }

        // Look for potential dependencies (simple heuristic)
        for (const task of tasks) {
            if (task.category === 'bureaucracy' && task.status === 'pending') {
                // Check if this might be blocking other tasks
                const relatedTasks = tasks.filter(t => 
                    t.id !== task.id && 
                    (t.entity === task.entity || t.category === task.category) &&
                    t.status === 'pending'
                );

                if (relatedTasks.length > 0) {
                    suggestions.push({
                        id: `resolve_blocker_${task.id}`,
                        type: this.actionTypes.PREVENTIVE,
                        priority: 'high',
                        title: `Resolve blocking task: ${task.subject}`,
                        description: `${task.subject} might be blocking ${relatedTasks.length} other tasks`,
                        reasoning: 'Completing blocking tasks first can unblock multiple dependent tasks',
                        actions: [
                            `Complete: ${task.subject}`,
                            'Update task status',
                            'Check if other tasks are now unblocked',
                            'Prioritize newly unblocked tasks'
                        ],
                        expectedBenefits: [
                            'Unblock dependent tasks',
                            'Improve overall progress',
                            'Reduce task backlog',
                            'Better task flow'
                        ],
                        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                        effort: 'high',
                        risk: 'medium'
                    });
                }
            }
        }

        return suggestions;
    }

    async analyzeDeadlinePatterns(tasks, bureaucracy) {
        const suggestions = [];
        
        // Combine all items with deadlines
        const allItems = [...tasks, ...bureaucracy].filter(item => item.deadline);
        
        // Sort by deadline
        allItems.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        
        // Look for deadline clusters
        const clusters = [];
        let currentCluster = [];
        
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            const deadline = new Date(item.deadline);
            
            if (currentCluster.length === 0) {
                currentCluster.push(item);
            } else {
                const lastDeadline = new Date(currentCluster[currentCluster.length - 1].deadline);
                const daysDiff = (deadline - lastDeadline) / (1000 * 60 * 60 * 24);
                
                if (daysDiff <= 7) { // Within a week
                    currentCluster.push(item);
                } else {
                    if (currentCluster.length > 1) {
                        clusters.push([...currentCluster]);
                    }
                    currentCluster = [item];
                }
            }
        }
        
        if (currentCluster.length > 1) {
            clusters.push(currentCluster);
        }

        // Suggest deadline cluster management
        for (const cluster of clusters) {
            suggestions.push({
                id: `deadline_cluster_${cluster[0].id}`,
                type: this.actionTypes.PREPARATION,
                priority: 'high',
                title: `Manage deadline cluster (${cluster.length} items)`,
                description: `${cluster.length} items have deadlines within a week of each other`,
                reasoning: 'Clustered deadlines require careful planning to avoid last-minute stress',
                actions: [
                    'Create detailed timeline for all items',
                    'Prioritize items by importance and effort',
                    'Allocate time blocks for each item',
                    'Set intermediate milestones',
                    'Prepare contingency plan'
                ],
                expectedBenefits: [
                    'Better deadline management',
                    'Reduced stress',
                    'Higher quality completion',
                    'No missed deadlines'
                ],
                deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
                effort: 'medium',
                risk: 'low'
            });
        }

        return suggestions;
    }

    async analyzeResourceOptimization(context) {
        const suggestions = [];
        
        // Suggest time optimization
        suggestions.push({
            id: 'time_optimization',
            type: this.actionTypes.OPTIMIZATION,
            priority: 'medium',
            title: 'Optimize daily schedule for maximum efficiency',
            description: 'Analyze current time usage and optimize for better productivity',
            reasoning: 'Better time management can free up hours for important tasks',
            actions: [
                'Track time usage for one week',
                'Identify time wasters and inefficiencies',
                'Create optimized daily schedule',
                'Implement time-blocking technique',
                'Set up productivity routines'
            ],
            expectedBenefits: [
                '2-3 hours saved per day',
                'Better focus on important tasks',
                'Reduced stress from poor time management',
                'More time for personal activities'
            ],
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            effort: 'medium',
            risk: 'low'
        });

        // Suggest energy optimization
        suggestions.push({
            id: 'energy_optimization',
            type: this.actionTypes.OPTIMIZATION,
            priority: 'medium',
            title: 'Optimize energy levels for peak performance',
            description: 'Schedule demanding tasks during high-energy periods',
            reasoning: 'Matching task difficulty to energy levels improves quality and speed',
            actions: [
                'Track energy levels throughout the day',
                'Identify peak performance periods',
                'Schedule demanding tasks during high energy',
                'Plan low-energy tasks for low-energy periods',
                'Optimize sleep and nutrition'
            ],
            expectedBenefits: [
                'Better task completion quality',
                'Faster completion of important tasks',
                'Reduced mental fatigue',
                'Improved overall well-being'
            ],
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
            effort: 'medium',
            risk: 'low'
        });

        return suggestions;
    }

    prioritizeActions(suggestions) {
        // Sort by priority and impact
        return suggestions.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            const typeOrder = { 
                [this.actionTypes.PREVENTIVE]: 4, 
                [this.actionTypes.PREPARATION]: 3, 
                [this.actionTypes.OPTIMIZATION]: 2, 
                [this.actionTypes.OPPORTUNITY]: 1 
            };
            
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            const aType = typeOrder[a.type] || 0;
            const bType = typeOrder[b.type] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            return bType - aType;
        });
    }

    async trackActionProgress(actionId, progress) {
        if (!this.actions.has(actionId)) {
            this.actions.set(actionId, {
                id: actionId,
                status: 'pending',
                progress: 0,
                startedAt: new Date(),
                updatedAt: new Date()
            });
        }
        
        const action = this.actions.get(actionId);
        action.progress = progress;
        action.updatedAt = new Date();
        
        if (progress >= 100) {
            action.status = 'completed';
            action.completedAt = new Date();
        } else if (progress > 0) {
            action.status = 'in_progress';
        }
        
        console.log(`📊 Action ${actionId} progress: ${progress}%`);
        return action;
    }

    async getActionStatus(actionId) {
        return this.actions.get(actionId) || null;
    }

    async getAllActions() {
        return Array.from(this.actions.values());
    }
}

module.exports = ProactiveActions;
