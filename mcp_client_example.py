#!/usr/bin/env python3
"""
Example MCP client to demonstrate ZTT1 validation using the ABAP MCP server
This shows how you would use the MCP server tools directly
"""

import asyncio
import json
from mcp import ClientSession, StdioServerParameters, stdio_client

def transform_to_local_class(original_code: str, original_class_name: str) -> tuple[str, str]:
    """
    Transform a global ABAP class to local class format for validation
    
    Args:
        original_code: Original ABAP class code
        original_class_name: Original class name (e.g., 'ztt1')
    
    Returns:
        Tuple of (local_class_name, transformed_code)
    """
    local_class_name = f"lcl_{original_class_name.lower()}"
    
    # Transform the code
    lines = original_code.split('\n')
    transformed_lines = []
    
    for line in lines:
        # Replace class definition
        if 'CLASS' in line.upper() and 'DEFINITION' in line.upper():
            transformed_lines.append(f"CLASS {local_class_name} DEFINITION.")
        # Skip PUBLIC, FINAL, CREATE PUBLIC declarations
        elif any(keyword in line.upper() for keyword in ['PUBLIC', 'FINAL', 'CREATE PUBLIC']) and 'SECTION' not in line.upper():
            continue
        # Replace class implementation
        elif 'CLASS' in line.upper() and 'IMPLEMENTATION' in line.upper():
            transformed_lines.append(f"CLASS {local_class_name} IMPLEMENTATION.")
        else:
            transformed_lines.append(line)
    
    transformed_code = '\n'.join(transformed_lines)
    return local_class_name.upper(), transformed_code

async def validate_ztt1_with_mcp():
    """Validate ZTT1 class using MCP server tools"""
    
    # Read the original ZTT1 class
    with open('ztt1.clas.abap', 'r') as f:
        original_code = f.read()
    
    # Transform to local class format
    local_class_name, transformed_code = transform_to_local_class(original_code, "ztt1")
    
    print("🔄 Transforming ZTT1 class for validation:")
    print(f"   Original: ztt1 (PUBLIC class)")
    print(f"   Transformed: {local_class_name} (local class)")
    print(f"   ✅ Original file remains unchanged")
    
    print("\n📝 Transformed class code:")
    print("=" * 50)
    print(transformed_code)
    print("=" * 50)
    
    # Connect to MCP server
    server_params = StdioServerParameters(
        command="python",
        args=["abap_mcp_server.py"]
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                # List available tools
                tools = await session.list_tools()
                print(f"\n🔧 Available MCP tools: {[tool.name for tool in tools.tools]}")
                
                # Call validate_abap_method tool
                result = await session.call_tool(
                    "validate_abap_method",
                    {
                        "class_name": local_class_name,
                        "class_code": transformed_code,
                        "method_name": "test",
                        "parameters": [
                            {
                                "name": "FIELD1",
                                "direction": "IMPORTING", 
                                "type": "STRING",
                                "value": "Hello World"
                            },
                            {
                                "name": "FIELD2", 
                                "direction": "RETURNING",
                                "type": "STRING",
                                "value": ""
                            }
                        ]
                    }
                )
                
                print(f"\n🎯 MCP Validation Result:")
                print("=" * 40)
                for content in result.content:
                    print(content.text)
                
                if not result.isError:
                    print(f"\n✅ ZTT1 class validation completed successfully!")
                    print(f"   Original file: ztt1.clas.abap (unchanged)")
                    print(f"   Validated as: {local_class_name}")
                else:
                    print(f"\n❌ Validation failed")
                
    except Exception as e:
        print(f"❌ MCP Client Error: {e}")
        print("\n💡 Alternative: Use the standalone validation script")

if __name__ == "__main__":
    asyncio.run(validate_ztt1_with_mcp())
