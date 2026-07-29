$logFile = "C:\My Web Sites\E Training\backend\server.log"
Set-Location "C:\My Web Sites\E Training\backend"
$env:NODE_ENV = "development"
node server.js > $logFile 2>&1
