@echo off
cd /d "%~dp0"
echo Spoustim aplikaci Mikroekonomie 1 na adrese http://localhost:8521
echo Toto okno nezavirej. Aplikaci ukoncis klavesami Ctrl+C.
npx --yes http-server -p 8521 -c-1 -o
pause
