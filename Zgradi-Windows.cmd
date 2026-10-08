@echo off
rem Zgradi namestitveni program za Windows na tem računalniku (brez GitHuba).
rem Potrebno: Node.js 20 ali novejši (https://nodejs.org) in Git (https://git-scm.com).
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js ni nameščen. Namestite ga z https://nodejs.org in zaženite znova. & pause & exit /b 1)
where git >nul 2>nul || (echo Git ni nameščen. Namestite ga z https://git-scm.com in zaženite znova. & pause & exit /b 1)
echo === 1/2 Nameščam odvisnosti ===
call npm install || goto napaka
echo === 2/2 Gradim program (traja nekaj minut) ===
call npm run dist:win || goto napaka
echo.
echo KONČANO. Namestitveni program je v mapi "dist".
explorer "%~dp0dist"
pause
exit /b 0
:napaka
echo.
echo NAPAKA pri gradnji. Sporočilo je zgoraj.
pause
exit /b 1
