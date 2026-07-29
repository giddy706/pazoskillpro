Set-Location "C:\My Web Sites\E Training\backend"
$env:NODE_ENV = "development"
node server.js > "C:\My Web Sites\E Training\backend\server-main.log" 2>&1
