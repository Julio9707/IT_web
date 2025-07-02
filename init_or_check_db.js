const sql = require('mssql');
const config = require('./config.json');

// 確保資料表存在
async function ensureTable(tableName, createSql) {
    const checkSql = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}'`;
    const result = await sql.query(checkSql);
    if (result.recordset.length === 0) {
        await sql.query(createSql);
        console.log(`已建立資料表: ${tableName}`);
    } else {
        console.log(`資料表已存在: ${tableName}`);
    }
}

// 確保欄位存在
async function ensureColumn(tableName, columnName, columnDefinition) {
    const checkSql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${columnName}'`;
    const result = await sql.query(checkSql);
    if (result.recordset.length === 0) {
        await sql.query(`ALTER TABLE ${tableName} ADD ${columnName} ${columnDefinition}`);
        console.log(`已新增欄位: ${tableName}.${columnName}`);
    }
}

// 確保 admin 帳號存在
async function ensureAdminUser() {
    const result = await sql.query(`SELECT * FROM users WHERE username = 'admin'`);
    if (result.recordset.length === 0) {
        await sql.query(`INSERT INTO users (username, password, role, remark) VALUES ('admin', '123456', 'admin', '系統管理員')`);
        console.log('已建立預設 admin 帳號');
    } else {
        console.log('admin 帳號已存在');
    }
}

// 確保預設角色存在
async function ensureDefaultRoles() {
    // 建立 admin 角色
    let result = await sql.query(`SELECT * FROM roles WHERE name = 'admin'`);
    if (result.recordset.length === 0) {
        await sql.query(`INSERT INTO roles (name, description, remark) VALUES ('admin', '系統管理員', '擁有所有權限')`);
        const adminRole = await sql.query(`SELECT id FROM roles WHERE name = 'admin'`);
        const adminId = adminRole.recordset[0].id;
        // admin 擁有所有權限
        await sql.query(`INSERT INTO role_permissions (role_id, permission) VALUES (${adminId}, 'canAddAsset')`);
        await sql.query(`INSERT INTO role_permissions (role_id, permission) VALUES (${adminId}, 'canDeleteAsset')`);
        await sql.query(`INSERT INTO role_permissions (role_id, permission) VALUES (${adminId}, 'canManageUser')`);
        await sql.query(`INSERT INTO role_permissions (role_id, permission) VALUES (${adminId}, 'canManageRole')`);
        console.log('已建立 admin 角色及權限');
    }
    
    // 建立 user 角色
    result = await sql.query(`SELECT * FROM roles WHERE name = 'user'`);
    if (result.recordset.length === 0) {
        await sql.query(`INSERT INTO roles (name, description, remark) VALUES ('user', '一般使用者', '基本權限')`);
        const userRole = await sql.query(`SELECT id FROM roles WHERE name = 'user'`);
        const userId = userRole.recordset[0].id;
        // user 只有基本權限
        await sql.query(`INSERT INTO role_permissions (role_id, permission) VALUES (${userId}, 'canAddAsset')`);
        console.log('已建立 user 角色及權限');
    }
}

// 確保預設資產類型存在
async function ensureDefaultAssetTypes() {
    const result = await sql.query(`SELECT * FROM asset_types`);
    if (result.recordset.length === 0) {
        await sql.query(`INSERT INTO asset_types (name, description) VALUES ('未分類', '未分類資產')`);
        await sql.query(`INSERT INTO asset_types (name, description) VALUES ('電腦', '個人電腦')`);
        await sql.query(`INSERT INTO asset_types (name, description) VALUES ('手機', '智慧型手機')`);
        await sql.query(`INSERT INTO asset_types (name, description) VALUES ('平板', '平板電腦')`);
        await sql.query(`INSERT INTO asset_types (name, description) VALUES ('配件', '電腦配件')`);
        console.log('已建立預設資產類型');
    }
}

// 主要初始化函數
async function main() {
    try {
        console.log('開始檢查/建立資料庫...');
        await sql.connect(config);
        
        // 建立基本資料表
        await ensureTable('users', `CREATE TABLE users (
            id INT IDENTITY(1,1) PRIMARY KEY,
            username NVARCHAR(100) UNIQUE NOT NULL,
            password NVARCHAR(100) NOT NULL,
            role NVARCHAR(50),
            remark NVARCHAR(255)
        )`);
        
        await ensureTable('assets', `CREATE TABLE assets (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name NVARCHAR(100) NOT NULL,
            type NVARCHAR(100),
            owner NVARCHAR(100),
            location NVARCHAR(100)
        )`);
        
        await ensureTable('roles', `CREATE TABLE roles (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name NVARCHAR(50) UNIQUE NOT NULL,
            description NVARCHAR(255),
            remark NVARCHAR(255)
        )`);
        
        await ensureTable('role_permissions', `CREATE TABLE role_permissions (
            id INT IDENTITY(1,1) PRIMARY KEY,
            role_id INT NOT NULL,
            permission NVARCHAR(50) NOT NULL,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )`);
        
        await ensureTable('asset_types', `CREATE TABLE asset_types (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name NVARCHAR(100) UNIQUE NOT NULL,
            description NVARCHAR(500)
        )`);
        
        // 確保所有必要欄位都存在（向後相容）
        await ensureColumn('users', 'remark', 'NVARCHAR(255)');
        await ensureColumn('roles', 'description', 'NVARCHAR(255)');
        await ensureColumn('roles', 'remark', 'NVARCHAR(255)');
        await ensureColumn('assets', 'owner', 'NVARCHAR(100)');
        await ensureColumn('assets', 'location', 'NVARCHAR(100)');
        await ensureColumn('assets', 'type', 'NVARCHAR(100)');
        await ensureColumn('asset_types', 'description', 'NVARCHAR(500)');
        await ensureColumn('assets', 'display_order', 'INT NULL');
        
        // 建立預設資料
        await ensureDefaultRoles();
        await ensureDefaultAssetTypes();
        await ensureAdminUser();
        
        console.log('資料表檢查/建立完成');
        
    } catch (err) {
        console.error('資料庫檢查/建立失敗:', err);
        throw err;
    } finally {
        await sql.close();
    }
}

module.exports = main; 