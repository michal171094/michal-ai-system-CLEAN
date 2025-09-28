/**
 * Knowledge Graph Service using Neo4j
 * Manages relationships between tasks, debts, bureaucracy, and life events
 */

class KnowledgeGraph {
    constructor() {
        this.driver = null;
        this.isConnected = false;
        this.entities = new Map(); // Cache for entities
        this.relationships = new Map(); // Cache for relationships
    }

    async connect() {
        try {
            // For now, we'll use a mock implementation
            // In production, this would connect to actual Neo4j
            console.log('🔗 Knowledge Graph: Mock connection established');
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('❌ Knowledge Graph connection failed:', error);
            return false;
        }
    }

    async addEntity(entity) {
        if (!this.isConnected) await this.connect();
        
        const entityData = {
            id: entity.id,
            type: entity.type, // task, debt, bureaucracy, person, organization
            properties: entity.properties,
            createdAt: new Date().toISOString()
        };

        this.entities.set(entity.id, entityData);
        console.log(`📊 Knowledge Graph: Added entity ${entity.type} - ${entity.id}`);
        return entityData;
    }

    async addRelationship(fromId, toId, relationshipType, properties = {}) {
        if (!this.isConnected) await this.connect();
        
        const relationshipData = {
            id: `${fromId}_${relationshipType}_${toId}`,
            from: fromId,
            to: toId,
            type: relationshipType,
            properties: properties,
            createdAt: new Date().toISOString()
        };

        this.relationships.set(relationshipData.id, relationshipData);
        console.log(`🔗 Knowledge Graph: Added relationship ${relationshipType} from ${fromId} to ${toId}`);
        return relationshipData;
    }

    async findRelatedEntities(entityId, relationshipTypes = []) {
        if (!this.isConnected) await this.connect();
        
        const related = [];
        
        for (const [relId, rel] of this.relationships) {
            if (rel.from === entityId || rel.to === entityId) {
                if (relationshipTypes.length === 0 || relationshipTypes.includes(rel.type)) {
                    const relatedEntityId = rel.from === entityId ? rel.to : rel.from;
                    const entity = this.entities.get(relatedEntityId);
                    if (entity) {
                        related.push({
                            entity: entity,
                            relationship: rel,
                            direction: rel.from === entityId ? 'outgoing' : 'incoming'
                        });
                    }
                }
            }
        }
        
        return related;
    }

    async analyzePatterns() {
        if (!this.isConnected) await this.connect();
        
        const patterns = {
            debtPatterns: [],
            bureaucracyPatterns: [],
            taskDependencies: [],
            riskClusters: []
        };

        // Analyze debt patterns
        const debts = Array.from(this.entities.values()).filter(e => e.type === 'debt');
        const debtOrganizations = new Map();
        
        for (const debt of debts) {
            const org = debt.properties.creditor_name || debt.properties.company;
            if (org) {
                if (!debtOrganizations.has(org)) {
                    debtOrganizations.set(org, []);
                }
                debtOrganizations.get(org).push(debt);
            }
        }

        // Find consolidation opportunities
        for (const [org, orgDebts] of debtOrganizations) {
            if (orgDebts.length > 1) {
                patterns.debtPatterns.push({
                    type: 'consolidation_opportunity',
                    organization: org,
                    debts: orgDebts,
                    totalAmount: orgDebts.reduce((sum, debt) => sum + (debt.properties.amount || 0), 0),
                    recommendation: `Consider consolidating ${orgDebts.length} debts with ${org}`
                });
            }
        }

        // Analyze task dependencies
        const tasks = Array.from(this.entities.values()).filter(e => e.type === 'task');
        for (const task of tasks) {
            const related = await this.findRelatedEntities(task.id, ['depends_on', 'blocks', 'related_to']);
            if (related.length > 0) {
                patterns.taskDependencies.push({
                    task: task,
                    dependencies: related.filter(r => r.relationship.type === 'depends_on'),
                    blockers: related.filter(r => r.relationship.type === 'blocks'),
                    related: related.filter(r => r.relationship.type === 'related_to')
                });
            }
        }

        return patterns;
    }

    async suggestProactiveActions() {
        if (!this.isConnected) await this.connect();
        
        const suggestions = [];
        const patterns = await this.analyzePatterns();

        // Debt consolidation suggestions
        for (const pattern of patterns.debtPatterns) {
            if (pattern.type === 'consolidation_opportunity') {
                suggestions.push({
                    type: 'debt_consolidation',
                    priority: 'high',
                    title: `Consolidate debts with ${pattern.organization}`,
                    description: `You have ${pattern.debts.length} separate debts with ${pattern.organization} totaling €${pattern.totalAmount}`,
                    actions: [
                        `Contact ${pattern.organization} to discuss consolidation`,
                        'Prepare debt consolidation proposal',
                        'Calculate potential savings from consolidation'
                    ],
                    estimatedSavings: pattern.totalAmount * 0.1, // Assume 10% savings
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                });
            }
        }

        // Task dependency suggestions
        for (const dependency of patterns.taskDependencies) {
            if (dependency.blockers.length > 0) {
                suggestions.push({
                    type: 'resolve_blockers',
                    priority: 'medium',
                    title: `Resolve blockers for: ${dependency.task.properties.title}`,
                    description: `${dependency.task.properties.title} is blocked by ${dependency.blockers.length} other tasks`,
                    actions: dependency.blockers.map(blocker => 
                        `Complete: ${blocker.entity.properties.title}`
                    ),
                    deadline: dependency.task.properties.deadline
                });
            }
        }

        return suggestions;
    }

    async searchKnowledge(query) {
        if (!this.isConnected) await this.connect();
        
        const results = [];
        const queryLower = query.toLowerCase();
        
        // Search entities
        for (const [id, entity] of this.entities) {
            const searchableText = JSON.stringify(entity.properties).toLowerCase();
            if (searchableText.includes(queryLower)) {
                results.push({
                    type: 'entity',
                    entity: entity,
                    relevance: this.calculateRelevance(queryLower, searchableText)
                });
            }
        }
        
        // Search relationships
        for (const [id, rel] of this.relationships) {
            const searchableText = `${rel.type} ${JSON.stringify(rel.properties)}`.toLowerCase();
            if (searchableText.includes(queryLower)) {
                results.push({
                    type: 'relationship',
                    relationship: rel,
                    relevance: this.calculateRelevance(queryLower, searchableText)
                });
            }
        }
        
        return results.sort((a, b) => b.relevance - a.relevance);
    }

    calculateRelevance(query, text) {
        // Simple relevance calculation based on keyword matches
        const queryWords = query.split(' ');
        let matches = 0;
        
        for (const word of queryWords) {
            if (text.includes(word)) {
                matches++;
            }
        }
        
        return matches / queryWords.length;
    }

    async disconnect() {
        if (this.driver) {
            await this.driver.close();
        }
        this.isConnected = false;
        console.log('🔌 Knowledge Graph disconnected');
    }

    // Utility methods for common operations
    async linkTaskToDebt(taskId, debtId, relationshipType = 'related_to') {
        return await this.addRelationship(taskId, debtId, relationshipType, {
            reason: 'Task involves debt management',
            createdAt: new Date().toISOString()
        });
    }

    async linkTaskToBureaucracy(taskId, bureaucracyId, relationshipType = 'related_to') {
        return await this.addRelationship(taskId, bureaucracyId, relationshipType, {
            reason: 'Task involves bureaucratic process',
            createdAt: new Date().toISOString()
        });
    }

    async findSimilarTasks(taskId) {
        const task = this.entities.get(taskId);
        if (!task) return [];
        
        const similar = [];
        for (const [id, entity] of this.entities) {
            if (entity.type === 'task' && id !== taskId) {
                const similarity = this.calculateTaskSimilarity(task, entity);
                if (similarity > 0.3) { // 30% similarity threshold
                    similar.push({
                        task: entity,
                        similarity: similarity
                    });
                }
            }
        }
        
        return similar.sort((a, b) => b.similarity - a.similarity);
    }

    calculateTaskSimilarity(task1, task2) {
        // Simple similarity calculation based on category, priority, and properties
        let similarity = 0;
        
        if (task1.properties.category === task2.properties.category) similarity += 0.4;
        if (task1.properties.priority === task2.properties.priority) similarity += 0.3;
        if (task1.properties.entity === task2.properties.entity) similarity += 0.3;
        
        return similarity;
    }
}

module.exports = KnowledgeGraph;
