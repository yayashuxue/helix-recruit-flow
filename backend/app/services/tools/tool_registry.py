from typing import Dict, Any, List, Callable, Optional
from flask import current_app
import json
import traceback

# Dictionary to store all registered tools
_tools: Dict[str, Dict[str, Any]] = {}

def register_tool(tool_definition: Dict[str, Any]) -> None:
    """Register a tool so it can be used by the AI.
    
    Args:
        tool_definition: A dictionary containing the tool definition
    """
    if 'name' not in tool_definition:
        raise ValueError("Tool must have a name")
    
    if 'function' not in tool_definition:
        raise ValueError("Tool must have a function")
    
    _tools[tool_definition['name']] = tool_definition

def get_tools() -> List[Dict[str, Any]]:
    """Get all registered tools in Anthropic tool format.
    
    Returns:
        List of tool definitions in the format expected by Anthropic
    """
    # Format tools for Anthropic API
    formatted_tools = []
    for name, tool in _tools.items():
        # Create a copy without the implementation
        formatted_tool = {
            "name": name,
            "description": tool.get('description', ''),
            "input_schema": tool.get('input_schema', {})
        }
        formatted_tools.append(formatted_tool)
    
    return formatted_tools

async def execute_tool_call(tool_call: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool call and return the result.
    
    Args:
        tool_call: A dictionary containing the tool call details
        
    Returns:
        The result of the tool execution
    """
    try:
        tool_name = tool_call.get('name')
        if not tool_name or tool_name not in _tools:
            return {
                "error": f"Tool '{tool_name}' not found"
            }
        
        tool = _tools[tool_name]
        function = tool['function']
        
        # Parse arguments from JSON string
        arguments = tool_call.get('arguments', "{}")
        if isinstance(arguments, str):
            arguments = json.loads(arguments)
        
        # Execute the function with the provided arguments
        try:
            result = await function(**arguments)
            
            # 记录成功并通过socketio发送通知
            try:
                from .. import socketio
                socketio.emit('tool_execution_complete', {
                    'name': tool_name,
                    'success': True
                })
            except Exception as e:
                print(f"Error emitting tool execution event: {str(e)}")
                
            return {"result": result}
        except Exception as e:
            error_message = f"Error executing tool '{tool_name}': {str(e)}"
            stack_trace = traceback.format_exc()
            try:
                current_app.logger.error(f"{error_message}\n{stack_trace}")
            except RuntimeError:
                print(f"{error_message}\n{stack_trace}")
            
            # 发送失败通知
            try:
                from .. import socketio
                socketio.emit('tool_execution_complete', {
                    'name': tool_name,
                    'success': False,
                    'error': str(e)
                })
            except Exception as e2:
                print(f"Error emitting tool error event: {str(e2)}")
            
            return {"error": error_message}
            
    except Exception as e:
        error_message = f"Unexpected error processing tool call: {str(e)}"
        stack_trace = traceback.format_exc()
        try:
            current_app.logger.error(f"{error_message}\n{stack_trace}")
        except RuntimeError:
            print(f"{error_message}\n{stack_trace}")
        
        return {"error": error_message} 