@echo off
cd /d "C:\My Web Sites\E Training\backend"
set NODE_ENV=development
node admin-server.js > "C:\My Web Sites\E Training\backend\server-admin.log" 2>&1
