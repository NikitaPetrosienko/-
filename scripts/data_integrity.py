#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Data integrity report script.
Checks completeness of extracted data and identifies missing mappings.
"""

import json
import sys
from pathlib import Path

def load_json(filepath):
    """Load JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {filepath}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        return None

def normalize_key(text):
    """Normalize text to create canonical keys."""
    if not text:
        return ""
    import re
    text = str(text).strip()
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text.strip('_')

def main():
    data_path = Path(__file__).parent.parent / "frontend" / "data" / "data.json"
    
    if not data_path.exists():
        print(f"Error: Data file not found at {data_path}")
        sys.exit(1)
    
    print("=" * 80)
    print("DATA INTEGRITY REPORT")
    print("=" * 80)
    print()
    
    data = load_json(data_path)
    if not data:
        sys.exit(1)
    
    # Basic counts
    categories = data.get('categories', [])
    blocks = data.get('blocks', [])
    clusters = data.get('clusters', [])
    competencies = data.get('competencies', [])
    target_levels = data.get('target_levels', {})
    level_descriptions = data.get('level_descriptions', {})
    glossary = data.get('glossary', {})
    
    print("BASIC COUNTS:")
    print(f"  Categories: {len(categories)}")
    print(f"  Blocks: {len(blocks)}")
    print(f"  Clusters: {len(clusters)}")
    print(f"  Competencies: {len(competencies)}")
    print(f"  Glossary terms: {len(glossary)}")
    print()
    
    # Check target levels
    print("TARGET LEVELS CHECK:")
    missing_targets = []
    for category in categories:
        cat_id = category['id']
        cat_targets = target_levels.get(cat_id, {})
        for comp in competencies:
            comp_id = comp['id']
            if comp_id not in cat_targets:
                missing_targets.append({
                    'category': category['name'],
                    'competency': comp['name'],
                    'category_id': cat_id,
                    'competency_id': comp_id
                })
    
    if missing_targets:
        print(f"  ⚠️  Found {len(missing_targets)} missing target levels:")
        for item in missing_targets[:10]:  # Show first 10
            print(f"     - {item['category']} × {item['competency']}")
        if len(missing_targets) > 10:
            print(f"     ... and {len(missing_targets) - 10} more")
    else:
        print("  ✓ All competencies have target levels for all categories")
    print()
    
    # Check level descriptions
    print("LEVEL DESCRIPTIONS CHECK:")
    missing_descriptions = []
    for comp in competencies:
        comp_id = comp['id']
        comp_descriptions = level_descriptions.get(comp_id, {})
        for level in range(1, 6):
            if str(level) not in comp_descriptions:
                missing_descriptions.append({
                    'competency': comp['name'],
                    'competency_id': comp_id,
                    'level': level
                })
    
    if missing_descriptions:
        print(f"  ⚠️  Found {len(missing_descriptions)} missing level descriptions:")
        for item in missing_descriptions[:10]:
            print(f"     - {item['competency']} (Level {item['level']})")
        if len(missing_descriptions) > 10:
            print(f"     ... and {len(missing_descriptions) - 10} more")
    else:
        print("  ✓ All competencies have descriptions for all 5 levels")
    print()
    
    # Check actions
    print("DEVELOPMENT ACTIONS CHECK:")
    competencies_without_actions = []
    competencies_with_actions = []
    
    for comp in competencies:
        comp_id = comp['id']
        actions = comp.get('actions', {})
        all_actions = actions.get('all', [])
        
        if not all_actions or len(all_actions) == 0:
            competencies_without_actions.append({
                'competency': comp['name'],
                'competency_id': comp_id
            })
        else:
            competencies_with_actions.append({
                'competency': comp['name'],
                'competency_id': comp_id,
                'action_count': len(all_actions)
            })
    
    print(f"  Competencies with actions: {len(competencies_with_actions)}")
    print(f"  Competencies without actions: {len(competencies_without_actions)}")
    
    if competencies_without_actions:
        print(f"  ⚠️  Missing actions for:")
        for item in competencies_without_actions[:10]:
            print(f"     - {item['competency']}")
        if len(competencies_without_actions) > 10:
            print(f"     ... and {len(competencies_without_actions) - 10} more")
    print()
    
    # Check action grouping
    print("ACTION GROUPING CHECK:")
    actions_by_type = {'70': 0, '20': 0, '10': 0, 'other': 0}
    actions_by_level = {}
    
    for comp in competencies:
        actions = comp.get('actions', {})
        by_type = actions.get('by_type', {})
        by_level = actions.get('by_level', {})
        
        for type_key, type_actions in by_type.items():
            if type_key in actions_by_type:
                actions_by_type[type_key] += len(type_actions)
        
        for level, level_actions in by_level.items():
            if level not in actions_by_level:
                actions_by_level[level] = 0
            actions_by_level[level] += len(level_actions)
    
    print(f"  Actions by type:")
    print(f"    70% (Learning on practice): {actions_by_type['70']}")
    print(f"    20% (Workplace development): {actions_by_type['20']}")
    print(f"    10% (Learning and self-development): {actions_by_type['10']}")
    print(f"    Other: {actions_by_type['other']}")
    print(f"  Actions by level: {dict(actions_by_level)}")
    print()
    
    # Check cluster-competency relationships
    print("CLUSTER-COMPETENCY RELATIONSHIPS:")
    cluster_comp_map = {}
    for cluster in clusters:
        cluster_comp_map[cluster['id']] = []
    
    for comp in competencies:
        cluster_id = comp.get('cluster_id')
        if cluster_id:
            if cluster_id not in cluster_comp_map:
                cluster_comp_map[cluster_id] = []
            cluster_comp_map[cluster_id].append(comp['id'])
    
    orphaned_competencies = []
    for comp in competencies:
        cluster_id = comp.get('cluster_id')
        if not cluster_id or cluster_id not in [c['id'] for c in clusters]:
            orphaned_competencies.append(comp['name'])
    
    if orphaned_competencies:
        print(f"  ⚠️  Found {len(orphaned_competencies)} competencies without valid cluster:")
        for name in orphaned_competencies[:10]:
            print(f"     - {name}")
    else:
        print("  ✓ All competencies are assigned to valid clusters")
    
    print(f"  Cluster distribution:")
    for cluster in clusters:
        comp_count = len(cluster_comp_map.get(cluster['id'], []))
        print(f"     {cluster['name']}: {comp_count} competencies")
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total_issues = len(missing_targets) + len(missing_descriptions) + len(competencies_without_actions) + len(orphaned_competencies)
    
    if total_issues == 0:
        print("✓ All data appears to be complete!")
    else:
        print(f"⚠️  Found {total_issues} potential data issues")
        print("   Review the details above and update extraction scripts if needed.")
    print()

if __name__ == "__main__":
    main()
