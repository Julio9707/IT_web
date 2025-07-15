const express = require('express');
const sql = require('mssql');
const path = require('path');
const initOrCheckDb = require('./init_or_check_db');

const app = express();
const PORT = 3000;

// 讀取資料庫連線設定
const config = require('./config.json');

// 中間件設定
app.use(express.static('public'));
app.use(express.json());

// 資料庫連線函數
async function connectDB() {
    try {
        await sql.connect(config);
    } catch (err) {
        console.error('資料庫連線失敗:', err.message);
        throw err;
    }
}

// 錯誤處理中間件
function handleError(err, res, operation = '操作') {
    console.error(`${operation}失敗:`, err);
    res.status(500).json({ 
        error: `${operation}失敗`, 
        detail: err.message 
    });
}

// ==================== 資產管理 API ====================

// 取得所有資產
app.get('/api/assets', async (req, res) => {
    try {
        await connectDB();
        const result = await sql.query('SELECT * FROM assets ORDER BY display_order ASC, id ASC');
        
        // 處理 customFieldValues JSON 數據
        const processedResult = result.recordset.map(record => {
            if (record.custom_field_values) {
                try {
                    record.customFieldValues = JSON.parse(record.custom_field_values);
                } catch (e) {
                    record.customFieldValues = {};
                }
            } else {
                record.customFieldValues = {};
            }
            return record;
        });
        
        res.json(processedResult);
    } catch (err) {
        handleError(err, res, '資產讀取');
    }
});

// 新增資產
app.post('/api/assets', async (req, res) => {
    const { name, type, owner, location } = req.body;
    
    if (!name || !type || !owner || !location) {
        return res.status(400).json({ error: '所有欄位都必須填寫' });
    }
    
    try {
        await connectDB();
        // 取得目前最大 display_order
        const maxOrderResult = await sql.query('SELECT MAX(display_order) AS maxOrder FROM assets');
        let nextOrder = (maxOrderResult.recordset[0].maxOrder ?? 0) + 1;
        await sql.query`
            INSERT INTO assets (name, type, owner, location, display_order)
            VALUES (${name}, ${type}, ${owner}, ${location}, ${nextOrder})
        `;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '資產新增');
    }
});

// 刪除資產
app.delete('/api/assets/:idx', async (req, res) => {
    const idx = parseInt(req.params.idx);
    
    if (isNaN(idx) || idx < 0) {
        return res.status(400).json({ error: '無效的索引' });
    }
    
    try {
        await connectDB();
        const result = await sql.query('SELECT id FROM assets ORDER BY id');
        
        if (idx >= result.recordset.length) {
            return res.status(400).json({ error: '索引超出範圍' });
        }
        
        const assetId = result.recordset[idx].id;
        await sql.query`DELETE FROM assets WHERE id = ${assetId}`;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '資產刪除');
    }
});

// 更新資產
app.put('/api/assets/:idx', async (req, res) => {
    const idx = parseInt(req.params.idx);
    const { name, type, owner, location, customFieldValues } = req.body;
    
    if (isNaN(idx) || idx < 0) {
        return res.status(400).json({ error: '無效的索引' });
    }
    
    if (!name || !type || !owner || !location) {
        return res.status(400).json({ error: '所有欄位都必須填寫' });
    }
    
    try {
        await connectDB();
        const result = await sql.query('SELECT id FROM assets ORDER BY display_order ASC, id ASC');
        
        if (idx >= result.recordset.length) {
            return res.status(400).json({ error: '索引超出範圍' });
        }
        
        const assetId = result.recordset[idx].id;
        const customFieldValuesJson = customFieldValues ? JSON.stringify(customFieldValues) : null;
        
        await sql.query`
            UPDATE assets 
            SET name = ${name}, type = ${type}, owner = ${owner}, location = ${location}, custom_field_values = ${customFieldValuesJson}
            WHERE id = ${assetId}
        `;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '資產更新');
    }
});

// 批次更新資產順序
app.patch('/api/assets/order', async (req, res) => {
    const updates = req.body; // [{id, display_order}]
    if (!Array.isArray(updates)) {
        return res.status(400).json({ error: '資料格式錯誤' });
    }
    try {
        await connectDB();
        for (const {id, display_order} of updates) {
            await sql.query`UPDATE assets SET display_order = ${display_order} WHERE id = ${id}`;
        }
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '資產排序更新');
    }
});

// ==================== 使用者管理 API ====================

// 登入
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '請輸入帳號和密碼' });
    }
    
    try {
        await connectDB();
        const result = await sql.query`
            SELECT * FROM users WHERE username = ${username} AND password = ${password}
        `;
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            
            // 取得使用者權限
            const permissionsResult = await sql.query`
                SELECT rp.permission 
                FROM role_permissions rp 
                JOIN roles r ON rp.role_id = r.id 
                WHERE r.name = ${user.role}
            `;
            
            const permissions = permissionsResult.recordset.map(p => p.permission);
            
            res.json({ 
                success: true, 
                role: user.role,
                permissions: permissions
            });
        } else {
            res.json({ success: false, error: '帳號或密碼錯誤' });
        }
    } catch (err) {
        handleError(err, res, '登入');
    }
});

// 取得所有使用者
app.get('/api/users', async (req, res) => {
    try {
        await connectDB();
        const result = await sql.query('SELECT id, username, role, remark FROM users ORDER BY id');
        res.json(result.recordset);
    } catch (err) {
        handleError(err, res, '使用者讀取');
    }
});

// 新增使用者
app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
        return res.status(400).json({ error: '請填寫所有必要欄位' });
    }
    
    try {
        await connectDB();
        
        // 檢查帳號是否已存在
        const checkResult = await sql.query`SELECT id FROM users WHERE username = ${username}`;
        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ error: '帳號已存在' });
        }
        
        await sql.query`
            INSERT INTO users (username, password, role)
            VALUES (${username}, ${password}, ${role})
        `;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '使用者新增');
    }
});

// 刪除使用者
app.delete('/api/users/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: '無效的使用者ID' });
    }
    
    try {
        await connectDB();
        await sql.query`DELETE FROM users WHERE id = ${id}`;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '使用者刪除');
    }
});

// 更新使用者
app.put('/api/users/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { password, role, remark } = req.body;
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: '無效的使用者ID' });
    }
    
    try {
        await connectDB();
        
        const updates = [];
        const params = [];
        
        if (password !== undefined && password !== '') {
            updates.push('password = @password');
            params.push({ name: 'password', value: password });
        }
        if (role !== undefined && role !== '') {
            updates.push('role = @role');
            params.push({ name: 'role', value: role });
        }
        if (remark !== undefined) {
            updates.push('remark = @remark');
            params.push({ name: 'remark', value: remark || '' });
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: '沒有要更新的欄位' });
        }
        
        const request = new sql.Request();
        params.forEach(param => request.input(param.name, param.value));
        
        await request.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ${id}`);
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '使用者更新');
    }
});

// ==================== 角色管理 API ====================

// 取得所有角色
app.get('/api/roles', async (req, res) => {
    try {
        await connectDB();
        const result = await sql.query(`
            SELECT r.id, r.name, r.description, r.remark,
                   CASE WHEN rp1.permission IS NOT NULL THEN 1 ELSE 0 END as canAddAsset,
                   CASE WHEN rp2.permission IS NOT NULL THEN 1 ELSE 0 END as canDeleteAsset,
                   CASE WHEN rp3.permission IS NOT NULL THEN 1 ELSE 0 END as canManageUser,
                   CASE WHEN rp4.permission IS NOT NULL THEN 1 ELSE 0 END as canManageRole
            FROM roles r
            LEFT JOIN role_permissions rp1 ON r.id = rp1.role_id AND rp1.permission = 'canAddAsset'
            LEFT JOIN role_permissions rp2 ON r.id = rp2.role_id AND rp2.permission = 'canDeleteAsset'
            LEFT JOIN role_permissions rp3 ON r.id = rp3.role_id AND rp3.permission = 'canManageUser'
            LEFT JOIN role_permissions rp4 ON r.id = rp4.role_id AND rp4.permission = 'canManageRole'
            ORDER BY r.id
        `);
        res.json(result.recordset);
    } catch (err) {
        handleError(err, res, '角色讀取');
    }
});

// 新增角色
app.post('/api/roles', async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: '角色名稱不能為空' });
    }
    
    try {
        await connectDB();
        await sql.query`INSERT INTO roles (name) VALUES (${name})`;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '角色新增');
    }
});

// 刪除角色
app.delete('/api/roles/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: '無效的角色ID' });
    }
    
    try {
        await connectDB();
        await sql.query`DELETE FROM role_permissions WHERE role_id = ${id}`;
        await sql.query`DELETE FROM roles WHERE id = ${id}`;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '角色刪除');
    }
});

// 更新角色
app.put('/api/roles/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, description, remark, canAddAsset, canDeleteAsset, canManageUser, canManageRole } = req.body;
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: '無效的角色ID' });
    }
    
    if (!name) {
        return res.status(400).json({ error: '角色名稱不能為空' });
    }
    
    try {
        await connectDB();
        
        // 更新角色基本資料
        await sql.query`
            UPDATE roles 
            SET name = ${name}, description = ${description || ''}, remark = ${remark || ''} 
            WHERE id = ${id}
        `;
        
        // 處理權限
        const permissions = [
            { key: 'canAddAsset', value: canAddAsset },
            { key: 'canDeleteAsset', value: canDeleteAsset },
            { key: 'canManageUser', value: canManageUser },
            { key: 'canManageRole', value: canManageRole }
        ];
        
        // 先清空所有權限
        await sql.query`DELETE FROM role_permissions WHERE role_id = ${id}`;
        
        // 重新插入勾選的權限
        for (const perm of permissions) {
            if (perm.value) {
                await sql.query`INSERT INTO role_permissions (role_id, permission) VALUES (${id}, ${perm.key})`;
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '角色更新');
    }
});

// 取得單一角色
app.get('/api/roles/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: '無效的角色ID' });
    }
    
    try {
        await connectDB();
        const result = await sql.query(`
            SELECT r.id, r.name, r.description, r.remark,
                   CASE WHEN rp1.permission IS NOT NULL THEN 1 ELSE 0 END as canAddAsset,
                   CASE WHEN rp2.permission IS NOT NULL THEN 1 ELSE 0 END as canDeleteAsset,
                   CASE WHEN rp3.permission IS NOT NULL THEN 1 ELSE 0 END as canManageUser,
                   CASE WHEN rp4.permission IS NOT NULL THEN 1 ELSE 0 END as canManageRole
            FROM roles r
            LEFT JOIN role_permissions rp1 ON r.id = rp1.role_id AND rp1.permission = 'canAddAsset'
            LEFT JOIN role_permissions rp2 ON r.id = rp2.role_id AND rp2.permission = 'canDeleteAsset'
            LEFT JOIN role_permissions rp3 ON r.id = rp3.role_id AND rp3.permission = 'canManageUser'
            LEFT JOIN role_permissions rp4 ON r.id = rp4.role_id AND rp4.permission = 'canManageRole'
            WHERE r.id = ${id}
        `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: '角色不存在' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        handleError(err, res, '角色讀取');
    }
});

// ==================== 資產類型管理 API ====================

// 取得所有資產類型
app.get('/api/asset-types', async (req, res) => {
    try {
        await connectDB();
        const result = await sql.query('SELECT * FROM asset_types ORDER BY name');
        
        // 處理 customFields JSON 數據
        const processedResult = result.recordset.map(record => {
            if (record.custom_fields) {
                try {
                    record.customFields = JSON.parse(record.custom_fields);
                } catch (e) {
                    record.customFields = [];
                }
            } else {
                record.customFields = [];
            }
            return record;
        });
        
        res.json(processedResult);
    } catch (err) {
        handleError(err, res, '資產類型讀取');
    }
});

// 新增資產類型
app.post('/api/asset-types', async (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: '類型名稱不能為空' });
    }
    
    try {
        await connectDB();
        await sql.query`INSERT INTO asset_types (name, description) VALUES (${name}, ${description || ''})`;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '資產類型新增');
    }
});

// 刪除資產類型
app.delete('/api/asset-types/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: '無效的類型ID' });
    }
    
    try {
        await connectDB();
        await sql.query`DELETE FROM asset_types WHERE id = ${id}`;
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '資產類型刪除');
    }
});

// 更新資產類型
app.put('/api/asset-types/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, description, customFields } = req.body;
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: '無效的類型ID' });
    }
    
    try {
        await connectDB();
        
        // 如果只更新自定義欄位，先獲取現有數據
        if (customFields !== undefined && (name === undefined || description === undefined)) {
            const currentResult = await sql.query`SELECT name, description FROM asset_types WHERE id = ${id}`;
            if (currentResult.recordset.length === 0) {
                return res.status(404).json({ error: '資產類型不存在' });
            }
            const current = currentResult.recordset[0];
            const customFieldsJson = customFields ? JSON.stringify(customFields) : null;
            await sql.query`UPDATE asset_types SET custom_fields = ${customFieldsJson} WHERE id = ${id}`;
        } else {
            // 完整更新
            if (!name) {
                return res.status(400).json({ error: '類型名稱不能為空' });
            }
            const customFieldsJson = customFields ? JSON.stringify(customFields) : null;
            await sql.query`UPDATE asset_types SET name = ${name}, description = ${description || ''}, custom_fields = ${customFieldsJson} WHERE id = ${id}`;
        }
        
        res.json({ success: true });
    } catch (err) {
        handleError(err, res, '資產類型更新');
    }
});

// ==================== 伺服器啟動 ====================

async function startServer() {
    try {
        // 初始化資料庫
        console.log('正在初始化資料庫...');
        await initOrCheckDb();
        console.log('資料庫初始化完成');
        
        // 啟動伺服器
        app.listen(PORT, () => {
            console.log(`🚀 IT資產管理系統伺服器已啟動`);
            console.log(`📍 網址: http://localhost:${PORT}`);
            console.log(`⏰ 啟動時間: ${new Date().toLocaleString()}`);
        });
    } catch (err) {
        console.error('❌ 伺服器啟動失敗:', err.message);
        process.exit(1);
    }
}

// 啟動伺服器
startServer(); 