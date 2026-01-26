#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract development actions from PowerPoint file.

Extracts:
- Development actions per competency
- Actions grouped by level (1-5)
- Actions grouped by 70/20/10 logic
"""

import json
import re
import sys
from pathlib import Path
from pptx import Presentation

def normalize_key(text):
    """Normalize text to create canonical keys for matching."""
    if not text:
        return ""
    text = str(text).strip()
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text.strip('_')

def extract_text_from_shape(shape):
    """Extract all text from a shape."""
    text_parts = []
    
    if hasattr(shape, "text"):
        text_parts.append(shape.text)
    elif hasattr(shape, "text_frame"):
        for paragraph in shape.text_frame.paragraphs:
            for run in paragraph.runs:
                if run.text:
                    text_parts.append(run.text)
    
    return "\n".join(text_parts).strip()

def is_title_slide(text):
    """Check if slide is a title/contents slide."""
    title_keywords = [
        "содержание", "меню развивающих действий", "цель меню",
        "из чего состоит", "как пользоваться", "руководство"
    ]
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in title_keywords)

def extract_competency_name_from_slide(slide):
    """Try to identify competency name from slide."""
    # Look for text that might be a competency name
    # Usually in title or first large text box
    
    if slide.shapes.title:
        title = slide.shapes.title.text.strip()
        if title and not is_title_slide(title):
            # Check if it's a block/cluster name (usually longer)
            if len(title) > 50:
                return None  # Probably a block/cluster, not competency
            return title
    
    # Check first few text shapes
    text_shapes = []
    for shape in slide.shapes:
        if shape.has_text_frame and shape != slide.shapes.title:
            text = extract_text_from_shape(shape)
            if text and len(text) > 5 and len(text) < 100:
                text_shapes.append(text)
    
    # First substantial text might be competency name
    for text in text_shapes[:3]:
        if not is_title_slide(text) and len(text) < 80:
            return text
    
    return None

def extract_actions_from_slide(slide, competency_name=None):
    """Extract development actions from a slide."""
    actions = []
    level = None
    action_type = None  # 70/20/10
    
    all_text = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            text = extract_text_from_shape(shape)
            if text:
                all_text.append(text)
    
    # Process all text to find actions
    for text in all_text:
        text_lower = text.lower()
        
        # Skip if this is the competency name
        if competency_name and normalize_key(text) == normalize_key(competency_name):
            continue
        
        # Check for level indicators
        level_match = re.search(r'уровень\s*(\d)', text_lower)
        if level_match:
            level = level_match.group(1)
            continue
        
        # Check for 70/20/10 indicators
        if re.search(r'\b70\s*%|\b70\s*процентов', text_lower):
            action_type = "70"
        elif re.search(r'\b20\s*%|\b20\s*процентов', text_lower):
            action_type = "20"
        elif re.search(r'\b10\s*%|\b10\s*процентов', text_lower):
            action_type = "10"
        
        # Extract action items
        # Actions are usually bulleted lists or numbered lists
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                continue
            
            # Remove bullet points and numbering
            line_clean = re.sub(r'^[•\-\*\d+\.\)]\s*', '', line)
            line_clean = re.sub(r'^\d+[\.\)]\s*', '', line_clean)
            
            # Skip if it's a header or very short
            if len(line_clean) < 10:
                continue
            
            # Skip common non-action text
            skip_patterns = [
                r'^уровень\s*\d',
                r'^список\s*ресурсов',
                r'^ресурсы\s*для',
                r'^книга',
                r'^курс',
                r'^\d+$'  # Just a number
            ]
            if any(re.match(pattern, line_clean.lower()) for pattern in skip_patterns):
                continue
            
            actions.append({
                "text": line_clean,
                "level": level,
                "type": action_type
            })
    
    return actions

def extract_all_actions(prs):
    """Extract all development actions from presentation."""
    all_actions = {}
    current_competency = None
    current_level = None
    current_type = None
    
    for slide_idx, slide in enumerate(prs.slides, 1):
        # Skip title slides
        slide_text = ""
        if slide.shapes.title:
            slide_text = slide.shapes.title.text.strip()
        
        if is_title_slide(slide_text):
            continue
        
        # Try to identify competency
        competency_name = extract_competency_name_from_slide(slide)
        
        if competency_name:
            # Check if this looks like a competency (not a block/cluster)
            # Competencies are usually shorter and more specific
            comp_key = normalize_key(competency_name)
            
            # Check if this matches a known competency pattern
            # If it's very long, it might be a block/cluster name
            if len(competency_name) < 80:
                current_competency = competency_name
                if comp_key not in all_actions:
                    all_actions[comp_key] = {
                        "competency_name": competency_name,
                        "actions_by_level": {},
                        "actions_by_type": {
                            "70": [],
                            "20": [],
                            "10": []
                        },
                        "all_actions": []
                    }
        
        # Extract actions from this slide
        if current_competency:
            actions = extract_actions_from_slide(slide, current_competency)
            
            comp_key = normalize_key(current_competency)
            if comp_key in all_actions:
                for action in actions:
                    level = action.get("level") or "all"
                    action_type = action.get("type")
                    action_text = action.get("text")
                    
                    if level not in all_actions[comp_key]["actions_by_level"]:
                        all_actions[comp_key]["actions_by_level"][level] = []
                    
                    action_obj = {
                        "text": action_text,
                        "type": action_type
                    }
                    
                    all_actions[comp_key]["actions_by_level"][level].append(action_obj)
                    
                    if action_type and action_type in ["70", "20", "10"]:
                        all_actions[comp_key]["actions_by_type"][action_type].append(action_obj)
                    
                    all_actions[comp_key]["all_actions"].append(action_obj)
    
    return all_actions

def main():
    pptx_path = Path(__file__).parent.parent / "data-src" / "menu.pptx"
    
    if not pptx_path.exists():
        print(f"Error: PowerPoint file not found at {pptx_path}")
        sys.exit(1)
    
    print(f"Loading PowerPoint file: {pptx_path}")
    prs = Presentation(pptx_path)
    
    print(f"Total slides: {len(prs.slides)}")
    
    # Extract actions
    all_actions = extract_all_actions(prs)
    
    # Save output
    output_path = Path(__file__).parent.parent / "frontend" / "data" / "actions.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_actions, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Extracted actions saved to: {output_path}")
    print(f"  - Competencies with actions: {len(all_actions)}")
    
    # Print summary
    for comp_key, comp_data in list(all_actions.items())[:10]:
        print(f"\n  {comp_data['competency_name']}:")
        print(f"    - Total actions: {len(comp_data['all_actions'])}")
        levels = [k for k in comp_data['actions_by_level'].keys() if k != 'all']
        if levels:
            print(f"    - Levels: {levels}")
        type_counts = {k: len(v) for k, v in comp_data['actions_by_type'].items() if v}
        if type_counts:
            print(f"    - 70/20/10: {type_counts}")
    
    return all_actions

if __name__ == "__main__":
    main()
