require('dotenv').config({ override: true });

const { createApp } = require('./app');
const r2Service = require('./services/r2.service');

const PORT = process.env.PORT || 3000;

r2Service.initR2Client();

const app = createApp();

app.listen(PORT, () => {
    console.log('----------------------------------------------------------');
    console.log('   🃏 YOULAI NOTE | P5R 风格个人技术博客系统启动成功！');
    console.log('----------------------------------------------------------');
    console.log(`   🚀 服务地址:      http://localhost:${PORT}`);
    console.log(`   📝 博客主页:      http://localhost:${PORT}/`);
    console.log(`   🔐 后台登录:      http://localhost:${PORT}/admin.html`);
    console.log('----------------------------------------------------------');
    console.log('   Welcome to the Metaverse of Code!');
    console.log('----------------------------------------------------------');
});

module.exports = app;
