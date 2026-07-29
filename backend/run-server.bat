@echo off
cd /d "C:\My Web Sites\E Training\backend"
set NODE_ENV=development
node server.js > "C:\My Web Sites\E Training\backend\server-main.log" 2>&1
