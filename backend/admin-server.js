const express = require('express');
const path = require('path');
const app = express();
const PORT = 8001;

const adminPath = path.join(__dirname, '..', 'frontend', 'admin');
const publicJsPath = path.join(__dirname, '..', 'frontend', 'public', 'js');

app.use(express.static(adminPath));
app.use('/js', express.static(publicJsPath));

app.get('*', (req, res) => {
    res.sendFile(path.join(adminPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Admin Dashboard running on http://localhost:${PORT}`);
});
