-- NorthStar macOS launcher
-- To use: Open in Script Editor > File > Export as Application
-- Then move the .app to your Applications folder or Dock

on run
	-- Resolve the app directory (parent of scripts/)
	set scriptDir to POSIX path of (path to me)
	-- When exported as .app, use a fixed path or adjust this:
	set appDir to do shell script "cd \"$(dirname " & quoted form of scriptDir & ")/../..\" 2>/dev/null && pwd || echo ''"

	if appDir is "" then
		display dialog "Could not determine NorthStar directory. Please set appDir manually in the script." buttons {"OK"} default button "OK"
		return
	end if

	set pidFile to appDir & "/.northstar.pid"
	set serverURL to "http://localhost:3333"
	set startScript to appDir & "/scripts/start-server.sh"

	-- Check if already running
	set alreadyRunning to false
	try
		set pid to do shell script "cat " & quoted form of pidFile
		do shell script "kill -0 " & pid
		set alreadyRunning to true
	end try

	if alreadyRunning then
		do shell script "open " & serverURL
		return
	end if

	-- Start server via shell script (it backgrounds the server and waits for ready)
	try
		set result to do shell script "/bin/bash " & quoted form of startScript
		if result contains "ready" then
			do shell script "open " & serverURL
		else
			display dialog "NorthStar server timed out." buttons {"OK"} default button "OK"
		end if
	on error errMsg
		display dialog "NorthStar failed to start: " & errMsg buttons {"OK"} default button "OK"
	end try
end run

on quit
	set scriptDir to POSIX path of (path to me)
	set appDir to do shell script "cd \"$(dirname " & quoted form of scriptDir & ")/../..\" 2>/dev/null && pwd || echo ''"
	set pidFile to appDir & "/.northstar.pid"
	try
		set pid to do shell script "cat " & quoted form of pidFile
		do shell script "kill " & pid & " 2>/dev/null; rm -f " & quoted form of pidFile
	end try
	continue quit
end quit
