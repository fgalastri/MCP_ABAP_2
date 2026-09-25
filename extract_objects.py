import re

# Read the file
with open('all_requests.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the H01K900019 task section
task_match = re.search(r'<tm:task tm:number="H01K900019".*?</tm:task>', content, re.DOTALL)
if task_match:
    task_content = task_match.group(0)
    
    # Find all objects with their positions
    objects = []
    pattern = r'<tm:abap_object[^>]*tm:pgmid="([^"]+)"[^>]*tm:type="([^"]+)"[^>]*tm:name="([^"]+)"[^>]*(?:tm:obj_desc="([^"]*)")?[^>]*tm:position="([^"]+)"'
    
    for match in re.finditer(pattern, task_content):
        pgmid = match.group(1)
        obj_type = match.group(2)
        name = match.group(3)
        obj_desc = match.group(4) if match.group(4) else ''
        position = match.group(5)
        objects.append({'name': name, 'type': obj_type, 'pgmid': pgmid, 'position': position, 'obj_desc': obj_desc})
    
    # Sort by position descending
    objects.sort(key=lambda x: x['position'], reverse=True)
    
    print(f'Found {len(objects)} objects in H01K900019')
    print(f'\nHighest position: {objects[0]["position"]}')
    print(f'Lowest position: {objects[-1]["position"]}')
    
    # Write to a JSON file for easy processing
    import json
    with open('h01k900019_objects.json', 'w') as f:
        json.dump(objects, f, indent=2)
    
    print(f'\nObjects saved to h01k900019_objects.json')
    print(f'\nFirst 5 objects to remove (highest positions):')
    for obj in objects[:5]:
        print(f'  {obj["position"]}: {obj["name"]} ({obj["type"]})')














