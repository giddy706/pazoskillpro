require('dotenv').config();
const { app, start } = require('./src/app');

const PORT = process.env.PORT || 3000;

start().then(() => {
    app.listen(PORT, () => {
        console.log(`SkillPath Academy API running on http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
