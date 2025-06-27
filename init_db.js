const sql = require('mssql');
const config = require('./config.json');

async function initDB() {
    try {
        await sql.connect(config);
        // 建立 assets 資料表
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='assets' AND xtype='U')
            CREATE TABLE assets (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100),
                type NVARCHAR(100),
                owner NVARCHAR(100),
                location NVARCHAR(100)
            )
        `);
        // 建立 users 資料表
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(100) UNIQUE,
                password NVARCHAR(100),
                role NVARCHAR(20) DEFAULT 'user'
            )
        `);
        // 插入 admin 帳號（如不存在）
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
            INSERT INTO users (username, password, role) VALUES ('admin', '123456', 'admin')
        `);
        console.log('資料庫初始化完成');
        process.exit(0);
    } catch (err) {
        console.error('資料庫初始化失敗:', err);
        process.exit(1);
    }
}

initDB(); 