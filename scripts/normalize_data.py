#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Normalize and merge data from Excel and PowerPoint.

Matches competencies between model.json and actions.json,
creates final normalized JSON files for frontend.
"""

import json
import sys
from pathlib import Path
from difflib import SequenceMatcher

def similarity(a, b):
    """Calculate similarity between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

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

ALIASES = {
    # PPT name -> Excel name (normalized)
    "формирование_корпоративной_цифровой_архитектуры": "развитие_корпоративной_цифровой_архитектуры"
}

def apply_alias(comp_key: str) -> str:
    if not comp_key:
        return comp_key
    for alias_key, target_key in ALIASES.items():
        if comp_key == alias_key or comp_key.startswith(alias_key):
            return target_key
    return comp_key

def find_best_match(comp_name, comp_key, comp_list, threshold=0.8):
    """Find best matching competency from list."""
    best_match = None
    best_score = 0
    
    comp_key = comp_key or normalize_key(comp_name)
    
    for comp in comp_list:
        comp_id = comp.get("id") or normalize_key(comp.get("name", ""))
        comp_name_alt = comp.get("name", "")
        
        # Try exact key match first
        if comp_key == comp_id:
            return comp_id, 1.0
        
        # Try substring match
        if comp_key and (comp_key in comp_id or comp_id in comp_key):
            return comp_id, 0.9

        # Try name similarity
        score1 = similarity(comp_name, comp_name_alt)
        score2 = similarity(comp_key, comp_id)
        
        score = max(score1, score2)
        if score > best_score and score >= threshold:
            best_score = score
            best_match = comp_id
    
    return best_match, best_score

def merge_data(model_data, actions_data):
    """Merge model and actions data."""
    merged = {
        "categories": model_data.get("categories", []),
        "blocks": model_data.get("blocks", []),
        "clusters": model_data.get("clusters", []),
        "competencies": [],
        "target_levels": model_data.get("target_levels", {}),
        "level_descriptions": model_data.get("level_descriptions", {}),
        "glossary": model_data.get("glossary", {}),
        "level_scale": model_data.get("level_scale", {})
    }
    
    # Create competency lookup
    comp_lookup = {comp["id"]: comp for comp in model_data.get("competencies", [])}
    
    # Match actions to competencies
    matched_count = 0
    unmatched_actions = []
    actions_by_comp_id = {}
    
    for action_key, action_data in actions_data.items():
        comp_name = action_data.get("competency_name", "")
        
        comp_key = apply_alias(normalize_key(comp_name) or action_key)
        # Try to find matching competency
        best_match, score = find_best_match(
            comp_name,
            comp_key,
            model_data.get("competencies", [])
        )
        
        if best_match and best_match in comp_lookup:
            # Collect actions to attach later (preserve model order)
            existing = actions_by_comp_id.get(best_match)
            payload = {
                "by_level": action_data.get("actions_by_level", {}),
                "by_type": action_data.get("actions_by_type", {}),
                "all": action_data.get("all_actions", [])
            }
            if existing:
                # Merge in case of duplicate matches
                for level_key, actions in payload["by_level"].items():
                    existing["by_level"].setdefault(level_key, [])
                    existing["by_level"][level_key].extend(actions)
                for type_key, actions in payload["by_type"].items():
                    existing["by_type"].setdefault(type_key, [])
                    existing["by_type"][type_key].extend(actions)
                existing["all"].extend(payload["all"])
            else:
                actions_by_comp_id[best_match] = payload
            matched_count += 1
        else:
            # Keep unmatched for manual review
            unmatched_actions.append({
                "key": action_key,
                "name": comp_name,
                "best_match": best_match,
                "score": score,
                "actions": action_data
            })
            print(f"  Warning: Could not match '{comp_name}' (best: {best_match}, score: {score:.2f})")
    
    # Add competencies in original model order
    for comp in model_data.get("competencies", []):
        comp_copy = comp.copy()
        comp_copy["actions"] = actions_by_comp_id.get(comp["id"], {
            "by_level": {},
            "by_type": {"70": [], "20": [], "10": []},
            "all": []
        })
        merged["competencies"].append(comp_copy)
    
    # Save unmatched for review (write empty list when none)
    unmatched_path = Path(__file__).parent.parent / "frontend" / "data" / "unmatched_actions.json"
    with open(unmatched_path, 'w', encoding='utf-8') as f:
        json.dump(unmatched_actions, f, ensure_ascii=False, indent=2)
    if unmatched_actions:
        print(f"\n  Saved {len(unmatched_actions)} unmatched actions to: {unmatched_path}")
    
    return merged

def main():
    model_path = Path(__file__).parent.parent / "frontend" / "data" / "model.json"
    actions_path = Path(__file__).parent.parent / "frontend" / "data" / "actions.json"
    
    if not model_path.exists():
        print(f"Error: Model file not found at {model_path}")
        sys.exit(1)
    
    if not actions_path.exists():
        print(f"Error: Actions file not found at {actions_path}")
        sys.exit(1)
    
    print("Loading model data...")
    with open(model_path, 'r', encoding='utf-8') as f:
        model_data = json.load(f)
    
    print("Loading actions data...")
    with open(actions_path, 'r', encoding='utf-8') as f:
        actions_data = json.load(f)
    
    print(f"\nMatching competencies...")
    print(f"  Model competencies: {len(model_data.get('competencies', []))}")
    print(f"  Action sets: {len(actions_data)}")
    
    merged_data = merge_data(model_data, actions_data)
    
    # Save merged data
    output_path = Path(__file__).parent.parent / "frontend" / "data" / "data.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Merged data saved to: {output_path}")
    print(f"  - Total competencies: {len(merged_data['competencies'])}")
    print(f"  - Competencies with actions: {sum(1 for c in merged_data['competencies'] if c.get('actions', {}).get('all'))}")
    
    return merged_data

if __name__ == "__main__":
    main()
