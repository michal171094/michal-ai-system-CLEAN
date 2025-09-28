"""
Life Orchestrator - Intelligent Life Management Agent
=====================================================
Complete rewrite to match the Life Orchestrator architecture
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass, field
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== Data Models ====================

class EntityType(Enum):
    PERSON = "person"
    TASK = "task"
    DOCUMENT = "document"
    EVENT = "event"
    GOAL = "goal"
    CONSTRAINT = "constraint"
    RESOURCE = "resource"
    PROCESS = "process"
    DEADLINE = "deadline"

class RelationType(Enum):
    REQUIRES = "requires"
    BLOCKS = "blocks"
    ENABLES = "enables"
    CONFLICTS = "conflicts"
    RELATED = "related"
    INFLUENCES = "influences"
    OWNED_BY = "owned_by"
    RESPONSIBLE_FOR = "responsible"
    DEPENDS_ON = "depends_on"

@dataclass
class ContextNode:
    id: str
    type: EntityType
    data: Dict[str, Any]
    status: str = "active"
    confidence: float = 1.0
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type.value,
            "data": self.data,
            "status": self.status,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

@dataclass
class ContextEdge:
    from_node: str
    to_node: str
    type: RelationType
    strength: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

# ==================== Context Graph ====================

class ContextGraph:
    def __init__(self):
        self.nodes: Dict[str, ContextNode] = {}
        self.edges: List[ContextEdge] = []
        self.index: Dict[EntityType, List[str]] = {}
    
    def add_node(self, node: ContextNode):
        self.nodes[node.id] = node
        if node.type not in self.index:
            self.index[node.type] = []
        self.index[node.type].append(node.id)
        logger.info(f"Added node: {node.id} of type {node.type}")
    
    def add_edge(self, edge: ContextEdge):
        self.edges.append(edge)
        logger.info(f"Added edge: {edge.from_node} -> {edge.to_node} ({edge.type})")
    
    def find_related(self, node_id: str, depth: int = 2) -> List[ContextNode]:
        """Find all nodes related to a given node up to specified depth"""
        related = []
        visited = set()
        queue = [(node_id, 0)]
        
        while queue:
            current_id, current_depth = queue.pop(0)
            if current_id in visited or current_depth > depth:
                continue
            
            visited.add(current_id)
            if current_id != node_id and current_id in self.nodes:
                related.append(self.nodes[current_id])
            
            # Find connected nodes
            for edge in self.edges:
                if edge.from_node == current_id:
                    queue.append((edge.to_node, current_depth + 1))
                elif edge.to_node == current_id:
                    queue.append((edge.from_node, current_depth + 1))
        
        return related

# ==================== Memory System ====================

class MemoryBank:
    def __init__(self):
        self.short_term = {}
        self.long_term = {}
        self.episodic = []
        self.patterns = {}
    
    def store(self, key: str, value: Any, memory_type: str = "short"):
        memory_item = {
            "value": value,
            "timestamp": datetime.now(),
            "access_count": 0,
            "importance": self._calculate_importance(value)
        }
        
        if memory_type == "short":
            self.short_term[key] = memory_item
        else:
            self.long_term[key] = memory_item
    
    def recall(self, key: str) -> Optional[Any]:
        if key in self.short_term:
            self.short_term[key]["access_count"] += 1
            return self.short_term[key]["value"]
        elif key in self.long_term:
            self.long_term[key]["access_count"] += 1
            return self.long_term[key]["value"]
        return None
    
    def _calculate_importance(self, value: Any) -> float:
        """Calculate importance score for memory item"""
        score = 5.0
        
        if isinstance(value, dict):
            if "deadline" in value:
                days_left = (datetime.fromisoformat(value["deadline"]) - datetime.now()).days
                if days_left <= 1:
                    score = 10.0
                elif days_left <= 3:
                    score = 8.0
                elif days_left <= 7:
                    score = 6.0
            
            if "priority" in value and value["priority"] == "critical":
                score = 10.0
            
            if "amount" in value and value["amount"] > 1000:
                score += 2.0
        
        return min(score, 10.0)

# ==================== Decision Engine ====================

class DecisionEngine:
    def __init__(self, graph: ContextGraph, memory: MemoryBank):
        self.graph = graph
        self.memory = memory
    
    def analyze_situation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze current situation and suggest actions"""
        decisions = []
        urgent_items = []
        opportunities = []
        conflicts = []
        
        # Check for urgent deadlines
        for node_id, node in self.graph.nodes.items():
            if "deadline" in node.data:
                deadline = datetime.fromisoformat(node.data["deadline"])
                days_left = (deadline - datetime.now()).days
                
                if days_left <= 0:
                    urgent_items.append({
                        "node": node,
                        "urgency": "overdue",
                        "action": "immediate_action_required"
                    })
                elif days_left <= 3:
                    urgent_items.append({
                        "node": node,
                        "urgency": "critical",
                        "action": "prioritize_today"
                    })
        
        # Check for blocked processes
        for edge in self.graph.edges:
            if edge.type == RelationType.BLOCKS:
                blocker = self.graph.nodes.get(edge.from_node)
                blocked = self.graph.nodes.get(edge.to_node)
                
                if blocker and blocked:
                    conflicts.append({
                        "blocker": blocker,
                        "blocked": blocked,
                        "suggestion": f"Resolve {blocker.id} to unblock {blocked.id}"
                    })
        
        # Find optimization opportunities
        for node_type, node_ids in self.graph.index.items():
            if len(node_ids) > 3 and node_type == EntityType.TASK:
                similar_tasks = [self.graph.nodes[nid] for nid in node_ids[:3]]
                opportunities.append({
                    "type": "batch_processing",
                    "tasks": similar_tasks,
                    "suggestion": "Consider handling these similar tasks together"
                })
        
        return {
            "urgent": urgent_items,
            "opportunities": opportunities,
            "conflicts": conflicts,
            "recommended_actions": self._generate_recommendations(urgent_items, opportunities, conflicts)
        }
    
    def _generate_recommendations(self, urgent, opportunities, conflicts):
        recommendations = []
        
        # Handle urgent items first
        for item in urgent[:3]:  # Top 3 urgent
            recommendations.append({
                "priority": 1,
                "action": f"Handle {item['node'].data.get('title', item['node'].id)}",
                "reason": f"Status: {item['urgency']}",
                "estimated_time": "30-60 minutes"
            })
        
        # Then conflicts
        for conflict in conflicts[:2]:  # Top 2 conflicts
            recommendations.append({
                "priority": 2,
                "action": conflict["suggestion"],
                "reason": "Unblocking dependent tasks",
                "estimated_time": "15-30 minutes"
            })
        
        # Then opportunities
        for opp in opportunities[:1]:  # Top opportunity
            recommendations.append({
                "priority": 3,
                "action": opp["suggestion"],
                "reason": "Efficiency optimization",
                "estimated_time": "Variable"
            })
        
        return recommendations

# ==================== Main Life Orchestrator ====================

class LifeOrchestrator:
    def __init__(self):
        self.graph = ContextGraph()
        self.memory = MemoryBank()
        self.decision_engine = DecisionEngine(self.graph, self.memory)
        self.is_running = False
        
        logger.info("Life Orchestrator initialized")
    
    async def perceive(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process new information and update internal state"""
        perception_result = {
            "received": input_data,
            "processed_nodes": [],
            "new_edges": [],
            "insights": []
        }
        
        # Process different types of input
        if "email" in input_data:
            node = self._process_email(input_data["email"])
            perception_result["processed_nodes"].append(node)
        
        if "task" in input_data:
            node = self._process_task(input_data["task"])
            perception_result["processed_nodes"].append(node)
        
        if "deadline" in input_data:
            node = self._process_deadline(input_data["deadline"])
            perception_result["processed_nodes"].append(node)
        
        # Auto-detect relationships
        self._detect_relationships()
        
        return perception_result
    
    def _process_email(self, email_data: Dict) -> ContextNode:
        """Process email and extract relevant information"""
        node = ContextNode(
            id=f"email_{datetime.now().timestamp()}",
            type=EntityType.DOCUMENT,
            data={
                "subject": email_data.get("subject", ""),
                "from": email_data.get("from", ""),
                "content": email_data.get("content", ""),
                "received": datetime.now().isoformat()
            }
        )
        
        self.graph.add_node(node)
        
        # Extract entities from email
        if "deadline" in email_data.get("content", "").lower():
            # Create deadline node
            deadline_node = ContextNode(
                id=f"deadline_{datetime.now().timestamp()}",
                type=EntityType.DEADLINE,
                data={"source": node.id, "extracted": True}
            )
            self.graph.add_node(deadline_node)
            self.graph.add_edge(ContextEdge(
                from_node=node.id,
                to_node=deadline_node.id,
                type=RelationType.RELATED
            ))
        
        return node
    
    def _process_task(self, task_data: Dict) -> ContextNode:
        """Process task information"""
        node = ContextNode(
            id=f"task_{task_data.get('id', datetime.now().timestamp())}",
            type=EntityType.TASK,
            data=task_data
        )
        
        self.graph.add_node(node)
        
        # Check for dependencies
        if "depends_on" in task_data:
            for dep_id in task_data["depends_on"]:
                self.graph.add_edge(ContextEdge(
                    from_node=dep_id,
                    to_node=node.id,
                    type=RelationType.BLOCKS
                ))
        
        return node
    
    def _process_deadline(self, deadline_data: Dict) -> ContextNode:
        """Process deadline information"""
        node = ContextNode(
            id=f"deadline_{deadline_data.get('id', datetime.now().timestamp())}",
            type=EntityType.DEADLINE,
            data=deadline_data
        )
        
        self.graph.add_node(node)
        self.memory.store(f"deadline_{node.id}", deadline_data, "long")
        
        return node
    
    def _detect_relationships(self):
        """Automatically detect relationships between nodes"""
        nodes_list = list(self.graph.nodes.values())
        
        for i, node1 in enumerate(nodes_list):
            for node2 in nodes_list[i+1:]:
                # Check for same person/entity
                if node1.data.get("client") == node2.data.get("client"):
                    self.graph.add_edge(ContextEdge(
                        from_node=node1.id,
                        to_node=node2.id,
                        type=RelationType.RELATED,
                        metadata={"reason": "same_client"}
                    ))
                
                # Check for temporal proximity
                if "deadline" in node1.data and "deadline" in node2.data:
                    d1 = datetime.fromisoformat(node1.data["deadline"])
                    d2 = datetime.fromisoformat(node2.data["deadline"])
                    
                    if abs((d1 - d2).days) <= 1:
                        self.graph.add_edge(ContextEdge(
                            from_node=node1.id,
                            to_node=node2.id,
                            type=RelationType.RELATED,
                            metadata={"reason": "same_timeframe"}
                        ))
    
    async def decide(self) -> Dict[str, Any]:
        """Make decisions based on current state"""
        analysis = self.decision_engine.analyze_situation({
            "graph_state": len(self.graph.nodes),
            "memory_state": len(self.memory.short_term)
        })
        
        return {
            "analysis": analysis,
            "timestamp": datetime.now().isoformat(),
            "confidence": 0.85
        }
    
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Execute actions based on decisions"""
        actions_taken = []
        
        for recommendation in decision.get("analysis", {}).get("recommended_actions", []):
            action_result = {
                "action": recommendation["action"],
                "status": "simulated",  # In real system, would execute
                "timestamp": datetime.now().isoformat()
            }
            actions_taken.append(action_result)
            
            # Store action in episodic memory
            self.memory.episodic.append(action_result)
        
        return {"actions_taken": actions_taken}
    
    async def learn(self, feedback: Dict[str, Any]):
        """Learn from feedback and update patterns"""
        # Extract patterns from feedback
        if "success" in feedback:
            pattern_key = f"pattern_{datetime.now().date()}"
            
            if pattern_key not in self.memory.patterns:
                self.memory.patterns[pattern_key] = []
            
            self.memory.patterns[pattern_key].append({
                "action": feedback.get("action"),
                "success": feedback["success"],
                "context": feedback.get("context", {})
            })
    
    async def process_message(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Main entry point for processing user messages"""
        logger.info(f"Processing message: {message}")
        
        # Perceive
        perception = await self.perceive({
            "message": message,
            "context": context,
            "timestamp": datetime.now().isoformat()
        })
        
        # Decide
        decision = await self.decide()
        
        # Act
        actions = await self.act(decision)
        
        # Generate response
        response = self._generate_response(perception, decision, actions)
        
        return {
            "response": response,
            "perception": perception,
            "decision": decision,
            "actions": actions,
            "graph_state": {
                "nodes": len(self.graph.nodes),
                "edges": len(self.graph.edges)
            },
            "memory_state": {
                "short_term": len(self.memory.short_term),
                "long_term": len(self.memory.long_term),
                "patterns": len(self.memory.patterns)
            }
        }
    
    def _generate_response(self, perception, decision, actions):
        """Generate human-friendly response"""
        urgent = decision.get("analysis", {}).get("urgent", [])
        recommendations = decision.get("analysis", {}).get("recommended_actions", [])
        
        response = "הבנתי את המצב. "
        
        if urgent:
            response += f"יש {len(urgent)} דברים דחופים שצריך לטפל בהם. "
        
        if recommendations:
            response += "הנה מה שאני ממליץ: "
            for i, rec in enumerate(recommendations[:3], 1):
                response += f"\n{i}. {rec['action']} ({rec['reason']})"
        
        return response

# Create global instance
orchestrator = LifeOrchestrator()

# FastAPI integration
async def process_request(message: str, context: Dict = None) -> Dict:
    """Process incoming request through orchestrator"""
    return await orchestrator.process_message(message, context or {})
