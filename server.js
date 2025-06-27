const initOrCheckDb = require('./init_or_check_db');

(async () => {
  try {
    await initOrCheckDb();
  } catch (err) {
    console.error('初始化流程失敗，伺服器未啟動');
    process.exit(1);
  }

  const express = require('express');
  const fs = require('fs');
  const path = require('path');
  const sql = require('mssql');
  const app = express();
  const PORT = 3000;

  // 讀取 SQL Server 連線設定
  const config = require('./config.json');

  // 帳號密碼（可改為讀 users.json）
  const USERS = [
      { username: 'admin', password: '123456' }
  ];

  app.use(express.static('public'));
  app.use(express.json());

  // 取得所有資產
  app.get('/api/assets', async (req, res) => {
      try {
          await sql.connect(config);
          const result = await sql.query('SELECT * FROM assets');
          res.json(result.recordset);
      } catch (err) {
          res.status(500).json({ error: '資料庫讀取失敗', detail: err.message });
      }
  });

  // 新增資產
  app.post('/api/assets', async (req, res) => {
      const { name, type, owner, location } = req.body;
      try {
          await sql.connect(config);
          await sql.query`
              INSERT INTO assets (name, type, owner, location)
              VALUES (${name}, ${type}, ${owner}, ${location})
          `;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '資料庫寫入失敗', detail: err.message });
      }
  });

  // 刪除資產
  app.delete('/api/assets/:idx', async (req, res) => {
      const idx = parseInt(req.params.idx);
      try {
          await sql.connect(config);
          // 先查出資產ID
          const result = await sql.query('SELECT id FROM assets ORDER BY id');
          if (idx < 0 || idx >= result.recordset.length) {
              return res.status(400).json({ error: '索引錯誤' });
          }
          const assetId = result.recordset[idx].id;
          await sql.query`DELETE FROM assets WHERE id = ${assetId}`;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '資料庫刪除失敗', detail: err.message });
      }
  });

  // 更新資產
  app.put('/api/assets/:idx', async (req, res) => {
      const idx = parseInt(req.params.idx);
      const { name, type, owner, location } = req.body;
      try {
          await sql.connect(config);
          // 先查出資產ID
          const result = await sql.query('SELECT id FROM assets ORDER BY id');
          if (idx < 0 || idx >= result.recordset.length) {
              return res.status(400).json({ error: '索引錯誤' });
          }
          const assetId = result.recordset[idx].id;
          await sql.query`
              UPDATE assets 
              SET name = ${name}, type = ${type}, owner = ${owner}, location = ${location}
              WHERE id = ${assetId}
          `;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '資料庫更新失敗', detail: err.message });
      }
  });

  // 登入API
  app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;
      try {
          await sql.connect(config);
          const result = await sql.query`SELECT * FROM users WHERE username = ${username} AND password = ${password}`;
          if (result.recordset.length > 0) {
              const user = result.recordset[0];
              
              // 獲取用戶的權限
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
          res.status(500).json({ success: false, error: '資料庫錯誤', detail: err.message });
      }
  });

  // 取得所有帳號（帳號管理分頁用）
  app.get('/api/users', async (req, res) => {
      try {
          await sql.connect(config);
          const result = await sql.query('SELECT id, username, role, remark FROM users');
          res.json(result.recordset);
      } catch (err) {
          res.status(500).json({ error: '資料庫讀取失敗', detail: err.message });
      }
  });

  // 新增帳號
  app.post('/api/users', async (req, res) => {
      const { username, password, role } = req.body;
      console.log('新增帳號請求:', { username, password, role }); // 除錯用
      try {
          await sql.connect(config);
          
          // 檢查帳號是否已存在
          const checkResult = await sql.query`SELECT id FROM users WHERE username = ${username}`;
          if (checkResult.recordset.length > 0) {
              console.log('帳號已存在:', username); // 除錯用
              return res.status(400).json({ error: '帳號已存在' });
          }
          
          // 檢查角色是否為必填
          if (!role) {
              console.log('角色未選擇'); // 除錯用
              return res.status(400).json({ error: '請選擇角色' });
          }
          
          await sql.query`
              INSERT INTO users (username, password, role)
              VALUES (${username}, ${password}, ${role})
          `;
          console.log('帳號新增成功:', username); // 除錯用
          res.json({ success: true });
      } catch (err) {
          console.error('新增帳號錯誤:', err); // 除錯用
          res.status(500).json({ error: '帳號新增失敗', detail: err.message });
      }
  });

  // 刪除帳號
  app.delete('/api/users/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      try {
          await sql.connect(config);
          await sql.query`DELETE FROM users WHERE id = ${id}`;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '帳號刪除失敗', detail: err.message });
      }
  });

  // 修改密碼/權限/備註
  app.put('/api/users/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const { password, role, remark } = req.body;
      try {
          await sql.connect(config);
          
          // 檢查是否有要更新的欄位
          if (password === undefined && role === undefined && remark === undefined) {
              return res.status(400).json({ error: '沒有要更新的欄位' });
          }
          
          // 使用簡單的條件更新
          let updateQuery = 'UPDATE users SET ';
          const updates = [];
          
          if (password !== undefined && password !== '') {
              updates.push(`password = '${password}'`);
          }
          if (role !== undefined && role !== '') {
              updates.push(`role = '${role}'`);
          }
          if (remark !== undefined) {
              updates.push(`remark = '${remark || ''}'`);
          }
          
          if (updates.length === 0) {
              return res.status(400).json({ error: '沒有要更新的欄位' });
          }
          
          updateQuery += updates.join(', ') + ` WHERE id = ${id}`;
          await sql.query(updateQuery);
          res.json({ success: true });
      } catch (err) {
          console.error('更新帳號錯誤:', err); // 除錯用
          res.status(500).json({ error: '帳號更新失敗', detail: err.message });
      }
  });

  // 角色管理 API
  app.get('/api/roles', async (req, res) => {
      try {
          await sql.connect(config);
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
          `);
          res.json(result.recordset);
      } catch (err) {
          res.status(500).json({ error: '角色讀取失敗', detail: err.message });
      }
  });

  app.post('/api/roles', async (req, res) => {
      const { name } = req.body;
      try {
          await sql.connect(config);
          await sql.query`INSERT INTO roles (name) VALUES (${name})`;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '角色新增失敗', detail: err.message });
      }
  });

  app.delete('/api/roles/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      try {
          await sql.connect(config);
          await sql.query`DELETE FROM role_permissions WHERE role_id = ${id}`;
          await sql.query`DELETE FROM roles WHERE id = ${id}`;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '角色刪除失敗', detail: err.message });
      }
  });

  app.put('/api/roles/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const { name, description, remark, canAddAsset, canDeleteAsset, canManageUser, canManageRole } = req.body;
      try {
          await sql.connect(config);
          // 更新角色基本資料
          await sql.query`UPDATE roles SET name = ${name}, description = ${description}, remark = ${remark} WHERE id = ${id}`;
          // 權限處理
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
          res.status(500).json({ error: '角色更新失敗', detail: err.message });
      }
  });

  app.get('/api/roles/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      try {
          await sql.connect(config);
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
          if (result.recordset.length === 0) return res.status(404).json({ error: '角色不存在' });
          res.json(result.recordset[0]);
      } catch (err) {
          res.status(500).json({ error: '角色讀取失敗', detail: err.message });
      }
  });

  // 資產類型管理 API
  app.get('/api/asset-types', async (req, res) => {
      try {
          await sql.connect(config);
          const result = await sql.query('SELECT * FROM asset_types ORDER BY name');
          res.json(result.recordset);
      } catch (err) {
          res.status(500).json({ error: '資產類型讀取失敗', detail: err.message });
      }
  });

  app.post('/api/asset-types', async (req, res) => {
      const { name, description } = req.body;
      try {
          await sql.connect(config);
          await sql.query`INSERT INTO asset_types (name, description) VALUES (${name}, ${description})`;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '資產類型新增失敗', detail: err.message });
      }
  });

  app.delete('/api/asset-types/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      try {
          await sql.connect(config);
          await sql.query`DELETE FROM asset_types WHERE id = ${id}`;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '資產類型刪除失敗', detail: err.message });
      }
  });

  app.put('/api/asset-types/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const { name, description } = req.body;
      try {
          await sql.connect(config);
          await sql.query`UPDATE asset_types SET name = ${name}, description = ${description} WHERE id = ${id}`;
          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: '資產類型更新失敗', detail: err.message });
      }
  });

  app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
  });
})(); 