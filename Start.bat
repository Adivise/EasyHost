@echo off
title SpaceHost

:menu
cls
echo Please select an option:
echo (1.) AutoHost
echo (2.) AutoMap
echo (3.) AutoMods
echo (4.) AutoTeam

choice /c 1234 /n

if errorlevel 4 (
	cls
	title SpaceHost - AutoTeam
	color 4
	:start4
	node servers/AutoTeam.js
	goto start4
) else if errorlevel 3 (
	cls
	title SpaceHost - AutoMods
	color 3
	:start3
	node servers/AutoMods.js
	goto start3
) else if errorlevel 2 (
	cls
	title SpaceHost - AutoMap
	color 6
	:start2
	node servers/AutoMap.js
	goto start2
) else if errorlevel 1 (
	cls
	title SpaceHost - AutoHost
	color a
	:start1
	node servers/AutoHost.js
	goto start1
)

goto menu
