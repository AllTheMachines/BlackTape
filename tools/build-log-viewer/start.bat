@echo off
cd /d "%~dp0"
node server.js --file "..\..\BUILD-LOG.md"
