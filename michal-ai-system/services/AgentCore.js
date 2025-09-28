/**
 * AgentCore - The Brain of Life Orchestrator
 * ===========================================
 */

const fs = require('fs');
const path = require('path');

class MemorySystem {
    constructor() {
        this.shortTerm = new Map();
        this.longTerm = new Map();
        this.episodic = [];
        this.patterns = new Map();
    }

    remember(key, value, type = 'short') {
        const memory = {
            key,
            value,
            timestamp: new Date(),
            accessCount: 0,
            importance: this.calculateImportance(value)
        };

        if (type === 'short') {
            this.shortTerm.set(key, memory);
            // Move to long-term if accessed frequently
            if (memory.accessCount > 5) {
                this.longTerm.set(key, memory);
            }
        } else {
            this.longTerm.set(key, memory);
        }
    }

    recall(key) {
        let memory = this.shortTerm.get(key) || this.longTerm.get(key);
        if (memory) {
            memory.accessCount++;
            memory.lastAccessed = new Date();
            return memory.value;
        }
        return null;
    }

    calculateImportance(value) {
        let score = 5;
        if (value.deadline) {
            const daysLeft = Math.ceil((new Date(value.deadline) - new Date()) / 86400000);
            if (daysLeft <= 1) score = 10;
            else if (daysLeft <= 3) score = 8;
            else if (daysLeft <= 7) score = 6;
        }
        if (value.amount && value.amount > 1000) score += 2;
        if (value.priority === 'critical') score = 10;
        return Math.min(score, 10);
    }

    findPattern(events) {
        // Simple pattern detection
        const timePatterns = {};
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            timePatterns[hour] = (timePatterns[hour] || 0) + 1;
        });
        
        const mostActiveHour = Object.entries(timePatterns)
            .sort((a, b) => b[1] - a[1])[0];
        
        return {
            mostActiveHour: mostActiveHour ? parseInt(mostActiveHour[0]) : null,
            totalEvents: events.length
        };
    }
}

class KnowledgeGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.index = new Map();
    }

    addNode(type, data) {
        const id = `${type}_${data.id || Date.now()}`;
        const node = {
            id,
            type,
            data,
            created: new Date(),
            connections: []
        };
        
        this.nodes.set(id, node);
        
        // Index by type
        if (!this.index.has(type)) {
            this.index.set(type, []);
        }
        this.index.get(type).push(id);
        
        // Auto-connect related nodes
        this.autoConnect(node);
        
        return id;
    }

    autoConnect(newNode) {
        // Connect to related existing nodes
        this.nodes.forEach((node, id) => {
            if (node.id !== newNode.id) {
                const relationship = this.detectRelationship(newNode, node);
                if (relationship) {
                    this.addEdge(newNode.id, node.id, relationship);
                }
            }
        });
    }

    detectRelationship(node1, node2) {
        const data1 = node1.data;
        const data2 = node2.data;
        
        // Same client/person
        if (data1.client && data2.client && data1.client === data2.client) {
            return 'SAME_CLIENT';
        }
        
        // Same authority/company
        if (data1.authority && data2.authority && data1.authority === data2.authority) {
            return 'SAME_AUTHORITY';
        }
        
        // Temporal relationship
        if (data1.deadline && data2.deadline) {
            const diff = Math.abs(new Date(data1.deadline) - new Date(data2.deadline));
            if (diff < 86400000) return 'SAME_DAY';
            if (diff < 604800000) return 'SAME_WEEK';
        }
        
        // Financial relationship
        if (data1.creditor && data2.creditor && data1.creditor === data2.creditor) {
            return 'SAME_CREDITOR';
        }
        
        return null;
    }

    addEdge(from, to, type, metadata = {}) {
        const edge = {
            from,
            to,
            type,
            metadata,
            created: new Date()
        };
        
        this.edges.push(edge);
        
        // Update node connections
        const fromNode = this.nodes.get(from);
        const toNode = this.nodes.get(to);
        
        if (fromNode) fromNode.connections.push({ to, type });
        if (toNode) toNode.connections.push({ from, type });
    }

    findPath(from, to) {
        // Simple BFS pathfinding
        const visited = new Set();
        const queue = [[from]];
        
        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];
            
            if (current === to) return path;
            
            if (!visited.has(current)) {
                visited.add(current);
                const node = this.nodes.get(current);
                
                if (node) {
                    node.connections.forEach(conn => {
                        queue.push([...path, conn.to]);
                    });
                }
            }
        }
        
        return null;
    }

    getContext(nodeId, depth = 2) {
        const context = {
            node: this.nodes.get(nodeId),
            related: [],
            patterns: []
        };
        
        if (!context.node) return context;
        
        // Get connected nodes up to depth
        const visited = new Set();
        const queue = [{ id: nodeId, level: 0 }];
        
        while (queue.length > 0) {
            const { id, level } = queue.shift();
            
            if (level > depth || visited.has(id)) continue;
            visited.add(id);
            
            const node = this.nodes.get(id);
            if (node && id !== nodeId) {
                context.related.push({ node, level });
            }
            
            if (node && level < depth) {
                node.connections.forEach(conn => {
                    queue.push({ id: conn.to || conn.from, level: level + 1 });
                });
            }
        }
        
        return context;
    }
}

class AgentCore {
    constructor() {
        this.memory = new MemorySystem();
        this.graph = new KnowledgeGraph();
        this.state = {
            currentFocus: null,
            activeProcesses: [],
            pendingDecisions: [],
            userProfile: {}
        };
    }

    static instance = null;

    static getInstance() {
        if (!AgentCore.instance) {
            AgentCore.instance = new AgentCore();
        }
        return AgentCore.instance;
    }

    static ingestInitial(appData) {
        const instance = AgentCore.getInstance();
        instance.ingest(appData);
    }

    ingest(appData) {
        // Ingest all data into knowledge graph and memory
        ['tasks', 'debts', 'bureaucracy', 'emails'].forEach(category => {
            if (appData[category]) {
                appData[category].forEach(item => {
                    const nodeId = this.graph.addNode(category, item);
                    this.memory.remember(`${category}_${item.id}`, item);
                    
                    // Track active processes
                    if (item.status && item.status !== 'completed') {
                        this.state.activeProcesses.push({
                            id: nodeId,
                            type: category,
                            item
                        });
                    }
                });
            }
        });
        
        console.log(`📊 Ingested ${this.graph.nodes.size} items into knowledge graph`);
    }

    static getPriorities(appData) {
        const instance = AgentCore.getInstance();
        return instance.calculatePriorities(appData);
    }

    calculatePriorities(appData) {
        const priorities = [];
        const now = new Date();
        
        // Process all items and calculate priority scores
        ['tasks', 'debts', 'bureaucracy'].forEach(category => {
            if (appData[category]) {
                appData[category].forEach(item => {
                    let score = 0;
                    let factors = [];
                    
                    // Deadline factor
                    if (item.deadline) {
                        const daysLeft = Math.ceil((new Date(item.deadline) - now) / 86400000);
                        if (daysLeft <= 0) {
                            score += 100;
                            factors.push('overdue');
                        } else if (daysLeft <= 1) {
                            score += 90;
                            factors.push('due_today');
                        } else if (daysLeft <= 3) {
                            score += 70;
                            factors.push('due_soon');
                        } else if (daysLeft <= 7) {
                            score += 50;
                            factors.push('this_week');
                        } else {
                            score += 20;
                        }
                    }
                    
                    // Priority factor
                    if (item.priority === 'critical' || item.priority === 'דחוף') score += 50;
                    else if (item.priority === 'high' || item.priority === 'גבוה') score += 30;
                    else if (item.priority === 'medium' || item.priority === 'בינוני') score += 10;
                    
                    // Financial factor
                    if (item.amount || item.value) {
                        const amount = item.amount || item.value;
                        if (amount > 5000) score += 30;
                        else if (amount > 1000) score += 20;
                        else if (amount > 500) score += 10;
                    }
                    
                    // Status factor
                    if (item.status === 'blocked') score += 40;
                    else if (item.status === 'waiting') score += 20;
                    
                    // Context from knowledge graph
                    const context = this.graph.getContext(`${category}_${item.id}`);
                    if (context.related.length > 3) {
                        score += 15; // Many dependencies
                        factors.push('complex');
                    }
                    
                    priorities.push({
                        ...item,
                        category,
                        priorityScore: score,
                        factors,
                        context
                    });
                });
            }
        });
        
        // Sort by priority score
        priorities.sort((a, b) => b.priorityScore - a.priorityScore);
        
        return priorities;
    }

    static generateQuestions(appData) {
        const instance = AgentCore.getInstance();
        return instance.generateContextualQuestions(appData);
    }

    generateContextualQuestions(appData) {
        const questions = [];
        const patterns = this.memory.findPattern(this.state.activeProcesses);
        
        // Questions based on incomplete information
        this.state.activeProcesses.forEach(process => {
            if (!process.item.estimated_completion) {
                questions.push({
                    id: `q_${Date.now()}_1`,
                    type: 'estimation',
                    text: `מתי את מעריכה שתסיימי את ${process.item.project || process.item.task}?`,
                    context: process
                });
            }
            
            if (process.item.status === 'blocked' && !process.item.blocker_reason) {
                questions.push({
                    id: `q_${Date.now()}_2`,
                    type: 'blocker',
                    text: `מה חוסם את ${process.item.project || process.item.task}?`,
                    context: process
                });
            }
        });
        
        // Questions based on patterns
        if (patterns.mostActiveHour) {
            questions.push({
                id: `q_${Date.now()}_3`,
                type: 'pattern',
                text: `שמתי לב שאת הכי פעילה בשעה ${patterns.mostActiveHour}:00. האם להתמקד אז במשימות החשובות?`,
                context: patterns
            });
        }
        
        // Strategic questions
        const criticalItems = this.calculatePriorities(appData).filter(p => p.priorityScore > 80);
        if (criticalItems.length > 3) {
            questions.push({
                id: `q_${Date.now()}_4`,
                type: 'strategy',
                text: 'יש לך ${criticalItems.length} משימות קריטיות. איזו הכי חשובה לך כרגע?',
                options: criticalItems.map(item => item.project || item.task || item.creditor)
            });
        }
        
        return questions;
    }

    static runSyncSimulation(sources = ['emails', 'calendar', 'documents']) {
        const instance = AgentCore.getInstance();
        return instance.simulateSync(sources);
    }

    simulateSync(sources) {
        const results = [];
        
        sources.forEach(source => {
            const items = Math.floor(Math.random() * 5) + 1;
            const duration = 300 + Math.floor(Math.random() * 700);
            
            results.push({
                source,
                items,
                duration,
                status: 'success',
                newData: this.generateMockSyncData(source, items)
            });
            
            // Simulate ingesting new data
            if (source === 'emails') {
                for (let i = 0; i < items; i++) {
                    this.graph.addNode('email', {
                        id: `email_${Date.now()}_${i}`,
                        subject: `New email ${i}`,
                        from: 'system@example.com',
                        importance: Math.random() > 0.5 ? 'high' : 'normal'
                    });
                }
            }
        });
        
        this.memory.remember('last_sync', {
            timestamp: new Date(),
            results
        });
        
        return { results, summary: `Synced ${results.reduce((a, r) => a + r.items, 0)} items` };
    }

    generateMockSyncData(source, count) {
        const data = [];
        for (let i = 0; i < count; i++) {
            switch(source) {
                case 'emails':
                    data.push({
                        subject: `Email ${i}`,
                        from: `sender${i}@example.com`,
                        date: new Date()
                    });
                    break;
                case 'calendar':
                    data.push({
                        title: `Event ${i}`,
                        date: new Date(Date.now() + i * 86400000)
                    });
                    break;
                default:
                    data.push({ type: source, index: i });
            }
        }
        return data;
    }

    static stateSnapshot(appData) {
        const instance = AgentCore.getInstance();
        return instance.getSnapshot(appData);
    }

    getSnapshot(appData) {
        return {
            memory: {
                shortTerm: Array.from(this.memory.shortTerm.entries()).slice(-10),
                patterns: this.memory.findPattern(this.state.activeProcesses),
                stats: {
                    shortTermSize: this.memory.shortTerm.size,
                    longTermSize: this.memory.longTerm.size,
                    episodicCount: this.memory.episodic.length
                }
            },
            knowledgeGraph: {
                nodes: this.graph.nodes.size,
                edges: this.graph.edges.length,
                nodeTypes: Array.from(this.graph.index.keys())
            },
            state: this.state,
            priorities: this.calculatePriorities(appData).slice(0, 5)
        };
    }

    static metrics(appData) {
        const instance = AgentCore.getInstance();
        return {
            timestamp: new Date().toISOString(),
            memory: {
                shortTerm: instance.memory.shortTerm.size,
                longTerm: instance.memory.longTerm.size
            },
            graph: {
                nodes: instance.graph.nodes.size,
                edges: instance.graph.edges.length
            },
            activeProcesses: instance.state.activeProcesses.length,
            pendingDecisions: instance.state.pendingDecisions.length
        };
    }

    static generateAutoActions(appData) {
        const instance = AgentCore.getInstance();
        return instance.suggestActions(appData);
    }

    suggestActions(appData) {
        const actions = [];
        const priorities = this.calculatePriorities(appData);
        
        priorities.slice(0, 5).forEach(item => {
            if (item.factors.includes('overdue')) {
                actions.push({
                    type: 'urgent',
                    action: 'send_reminder',
                    target: item,
                    message: `⚠️ ${item.project || item.task} באיחור! צריך לטפל דחוף`
                });
            }
            
            if (item.category === 'debt' && item.factors.includes('due_soon')) {
                actions.push({
                    type: 'preparation',
                    action: 'prepare_objection',
                    target: item,
                    message: `להכין התנגדות ל-${item.creditor}`
                });
            }
            
            if (item.status === 'blocked') {
                actions.push({
                    type: 'unblock',
                    action: 'investigate_blocker',
                    target: item,
                    message: `לבדוק מה חוסם את ${item.project || item.task}`
                });
            }
        });
        
        return actions;
    }

    static updateFinancialBalance(balance) {
        const instance = AgentCore.getInstance();
        instance.memory.remember('financial_balance', {
            amount: balance,
            updated: new Date()
        }, 'long');
        instance.state.userProfile.currentBalance = balance;
        return { success: true, stored: balance };
    }
}

// Memory persistence methods
MemorySystem.prototype.persist = function() {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const memoryData = {
            shortTerm: Array.from(this.shortTerm.entries()),
            longTerm: Array.from(this.longTerm.entries()),
            episodic: this.episodic,
            patterns: Array.from(this.patterns.entries())
        };
        
        fs.writeFileSync(
            path.join(dataDir, 'memory.json'),
            JSON.stringify(memoryData, null, 2)
        );
        
        return true;
    } catch (error) {
        console.error('Failed to persist memory:', error);
        return false;
    }
};

// Load persisted memory on init
MemorySystem.prototype.load = function() {
    try {
        const memoryFile = path.join(__dirname, 'data', 'memory.json');
        if (fs.existsSync(memoryFile)) {
            const data = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
            
            if (data.shortTerm) {
                this.shortTerm = new Map(data.shortTerm);
            }
            if (data.longTerm) {
                this.longTerm = new Map(data.longTerm);
            }
            if (data.episodic) {
                this.episodic = data.episodic;
            }
            if (data.patterns) {
                this.patterns = new Map(data.patterns);
            }
            
            console.log('✅ Loaded persisted memory');
            return true;
        }
    } catch (error) {
        console.error('Failed to load memory:', error);
    }
    return false;
};

module.exports = AgentCore;
