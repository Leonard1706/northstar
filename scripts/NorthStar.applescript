-- NorthStar macOS launcher
-- Recommended: run ./scripts/install-macos-app.sh to build an app with projectRoot injected.
-- Manual fallback: set projectRoot below to your repository absolute path.

property projectRoot : "__NORTHSTAR_PROJECT_ROOT__"
property serverURL : "http://localhost:3333"
property isLaunching : false
property isQuitting : false

on resolveProjectRoot()
	set pathCandidates to {}
	copy projectRoot to end of pathCandidates

	try
		set scriptPath to POSIX path of (path to me)
		set localCandidate1 to do shell script "cd \"$(dirname " & quoted form of scriptPath & ")/..\" 2>/dev/null && pwd || true"
		set localCandidate2 to do shell script "cd \"$(dirname " & quoted form of scriptPath & ")/../..\" 2>/dev/null && pwd || true"
		copy localCandidate1 to end of pathCandidates
		copy localCandidate2 to end of pathCandidates
	end try

	repeat with candidate in pathCandidates
		set candidatePath to candidate as text
		if candidatePath is not "" then
			try
				do shell script "test -x " & quoted form of (candidatePath & "/scripts/start-server.sh")
				return candidatePath
			end try
		end if
	end repeat

	return ""
end resolveProjectRoot

on run
	set isQuitting to false
	my ensureServerAndOpen()
end run

on reopen
	my ensureServerAndOpen()
end reopen

on activate
	my ensureServerAndOpen()
end activate

on ensureServerAndOpen()
	if isQuitting then
		return
	end if
	
	if isLaunching then
		return
	end if
	
	set appDir to resolveProjectRoot()
	if appDir is "" then
		display dialog "NorthStar failed to start: unable to resolve project path." buttons {"OK"} default button "OK"
		return
	end if

	set startScript to appDir & "/scripts/start-server.sh"
	set isLaunching to true
	try
		set launchResult to do shell script "/bin/bash " & quoted form of startScript
		set isLaunching to false
		if launchResult contains "ready" then
			do shell script "open " & serverURL
		else
			display dialog "NorthStar failed to start: " & launchResult buttons {"OK"} default button "OK"
		end if
	on error errMsg
		set isLaunching to false
		display dialog "NorthStar failed to start: " & errMsg buttons {"OK"} default button "OK"
	end try
end ensureServerAndOpen

on idle
	return 15
end idle

on quit
	set isQuitting to true
	
	if isLaunching then
		continue quit
	end if

	set appDir to resolveProjectRoot()
	if appDir is not "" then
		set stopScript to appDir & "/scripts/stop.sh"
		try
			do shell script "/bin/bash " & quoted form of stopScript
		end try
	end if

	continue quit
end quit
