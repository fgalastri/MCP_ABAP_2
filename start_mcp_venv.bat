@echo off
REM ABAP MCP Server - Virtual Environment Launcher
REM This ensures the MCP server always runs in the correct environment

cd /d "%~dp0"
"%~dp0mcp_server_venv\Scripts\python.exe" "%~dp0abap_mcp_server.py" %*
