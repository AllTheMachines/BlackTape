' Start build-log-viewer without a visible console window.
' Place a shortcut to this file in shell:startup to auto-launch on login.

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "node server.js --file ..\..\BUILD-LOG.md", 0, False
