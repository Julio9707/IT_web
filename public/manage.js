document.addEventListener('DOMContentLoaded', () => {
    // 檢查登入狀態
    if (localStorage.getItem('login') !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    // (復原) 不再顯示 body

    // 權限檢查函數
    function hasPermission(permission) {
        const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
        return permissions.includes(permission);
    }

    // 標題點擊回首頁
    const homeLink = document.getElementById('home-link');
    homeLink.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // 分頁切換
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContentAsset = document.getElementById('tab-content-asset');
    const tabContentUser = document.getElementById('tab-content-user');
    const tabContentRole = document.getElementById('tab-content-role');
    const tabContentType = document.getElementById('tab-content-type');

    // 切換到指定分頁的函數
    function switchToTab(tabName) {
        tabBtns.forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // 隱藏所有分頁內容
        tabContentAsset.style.display = 'none';
        tabContentUser.style.display = 'none';
        tabContentRole.style.display = 'none';
        tabContentType.style.display = 'none';
        
        // 顯示選中的分頁內容
        if (tabName === 'asset') {
            tabContentAsset.style.display = '';
            // 根據權限控制資產管理功能
            if (!hasPermission('canAddAsset')) {
                document.getElementById('asset-form-section').style.display = 'none';
            } else {
                document.getElementById('asset-form-section').style.display = '';
            }
        } else if (tabName === 'user') {
            tabContentUser.style.display = '';
            // 僅有 canManageUser 權限的用戶可管理帳號
            if (!hasPermission('canManageUser')) {
                document.getElementById('user-add-section').style.display = 'none';
                document.getElementById('user-list-section').innerHTML = '<p style="color:red;">權限不足，無法管理帳號。</p>';
            } else {
                document.getElementById('user-add-section').style.display = '';
                loadUsers();
            }
        } else if (tabName === 'role') {
            tabContentRole.style.display = '';
            // 僅有 canManageRole 權限的用戶可管理角色
            if (!hasPermission('canManageRole')) {
                document.getElementById('role-add-section').style.display = 'none';
                document.getElementById('role-list-section').innerHTML = '<p style="color:red;">權限不足，無法管理角色。</p>';
            } else {
                document.getElementById('role-add-section').style.display = '';
                loadRoles();
            }
        } else if (tabName === 'type') {
            tabContentType.style.display = '';
            loadTypes();
        }
        
        // 記住當前分頁
        localStorage.setItem('currentTab', tabName);
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchToTab(tabName);
        });
    });

    // 頁面載入時恢復到上次選中的分頁，如果沒有則預設為資產管理
    const savedTab = localStorage.getItem('currentTab') || 'asset';
    
    // 根據權限控制側邊欄按鈕顯示
    if (!hasPermission('canManageUser')) {
        document.getElementById('tab-user').style.display = 'none';
    }
    if (!hasPermission('canManageRole')) {
        document.getElementById('tab-role').style.display = 'none';
    }
    
    switchToTab(savedTab);

    // 登出功能
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('login');
        localStorage.removeItem('role');
        localStorage.removeItem('permissions');
        localStorage.removeItem('currentTab');
        window.location.href = 'login.html';
    });

    // 資產管理功能
    const assetTableBody = document.querySelector('#asset-table tbody');
    const assetForm = document.getElementById('asset-form');
    const assetTypeSelect = document.getElementById('type');

    // 載入資產類型到下拉選單
    function loadAssetTypes() {
        fetch('/api/asset-types')
            .then(res => res.json())
            .then(data => {
                assetTypeSelect.innerHTML = '<option value="">請選擇資產類型</option>';
                data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.name;
                    option.textContent = type.name;
                    assetTypeSelect.appendChild(option);
                });
            });
    }

    // 載入資產清單
    function loadAssets() {
        fetch('/api/assets')
            .then(res => res.json())
            .then(data => {
                assetTableBody.innerHTML = '';
                data.forEach((asset, idx) => {
                    const tr = document.createElement('tr');
                    const canDelete = hasPermission('canDeleteAsset');
                    tr.innerHTML = `
                        <td>${asset.name}</td>
                        <td>${asset.type}</td>
                        <td>${asset.owner}</td>
                        <td>${asset.location}</td>
                        <td>
                            <button class="edit-btn" onclick="editAsset(${idx}, '${asset.name}', '${asset.type}', '${asset.owner}', '${asset.location}')">編輯</button>
                            ${canDelete ? `<button class="action-btn" onclick="deleteAsset(${idx})">刪除</button>` : ''}
                        </td>
                    `;
                    assetTableBody.appendChild(tr);
                });
            });
    }

    // 新增資產
    assetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const asset = {
            name: document.getElementById('name').value,
            type: document.getElementById('type').value,
            owner: document.getElementById('owner').value, // 用途欄位，資料庫欄位名稱保持不變
            location: document.getElementById('location').value
        };
        fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset)
        })
        .then(res => res.json())
        .then(() => {
            assetForm.reset();
            loadAssets();
        });
    });

    // 編輯資產表單處理
    const editAssetForm = document.getElementById('edit-asset-form');
    if (editAssetForm) {
        editAssetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const idx = document.getElementById('edit-asset-id').value;
            const asset = {
                name: document.getElementById('edit-asset-name').value,
                type: document.getElementById('edit-asset-type').value,
                owner: document.getElementById('edit-asset-owner').value, // 用途欄位，資料庫欄位名稱保持不變
                location: document.getElementById('edit-asset-location').value
            };
            
            fetch(`/api/assets/${idx}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asset)
            })
            .then(res => res.json())
            .then(() => {
                closeEditAssetModal();
                loadAssets();
                showSuccessModal(); // 顯示成功提示框
            });
        });
    }

    // 顯示成功提示框
    function showSuccessModal() {
        document.getElementById('success-modal').style.display = 'block';
    }

    // 關閉成功提示框
    function closeSuccessModal() {
        document.getElementById('success-modal').style.display = 'none';
    }

    // 為成功提示框的確定按鈕添加事件監聽器
    const successOkBtn = document.getElementById('success-ok-btn');
    if (successOkBtn) {
        successOkBtn.addEventListener('click', closeSuccessModal);
    }

    // 刪除資產（全域函式）
    window.deleteAsset = function(idx) {
        fetch(`/api/assets/${idx}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(() => loadAssets());
    }

    // 編輯資產（全域函式）
    window.editAsset = function(idx, name, type, owner, location) {
        document.getElementById('edit-asset-id').value = idx;
        document.getElementById('edit-asset-name').value = name;
        document.getElementById('edit-asset-owner').value = owner; // 用途欄位
        document.getElementById('edit-asset-location').value = location;
        
        // 載入資產類型到編輯下拉選單
        const editAssetTypeSelect = document.getElementById('edit-asset-type');
        fetch('/api/asset-types')
            .then(res => res.json())
            .then(data => {
                editAssetTypeSelect.innerHTML = '<option value="">請選擇資產類型</option>';
                data.forEach(assetType => {
                    const option = document.createElement('option');
                    option.value = assetType.name;
                    option.textContent = assetType.name;
                    if (assetType.name === type) {
                        option.selected = true;
                    }
                    editAssetTypeSelect.appendChild(option);
                });
            });
        
        document.getElementById('edit-asset-modal').style.display = 'block';
    }

    // 關閉編輯資產 modal（全域函式）
    window.closeEditAssetModal = function() {
        document.getElementById('edit-asset-modal').style.display = 'none';
    }

    // 帳號管理功能
    function loadRoleOptions() {
        fetch('/api/roles')
            .then(res => res.json())
            .then(data => {
                const addRoleSelect = document.getElementById('add-role');
                const editRoleSelect = document.getElementById('edit-role');
                
                // 清空現有選項（保留預設選項）
                addRoleSelect.innerHTML = '<option value="">請選擇角色</option>';
                editRoleSelect.innerHTML = '<option value="">請選擇角色</option>';
                
                // 新增角色選項
                data.forEach(role => {
                    addRoleSelect.innerHTML += `<option value="${role.name}">${role.name}</option>`;
                    editRoleSelect.innerHTML += `<option value="${role.name}">${role.name}</option>`;
                });
            });
    }

    function loadUsers() {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                const userListSection = document.getElementById('user-list-section');
                userListSection.innerHTML = '<table><thead><tr><th>帳號</th><th>權限</th><th>備註</th><th>操作</th></tr></thead><tbody>' +
                    data.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.role || '未設定'}</td>
                            <td>${user.remark || '-'}</td>
                            <td>
                                <button class="edit-btn" onclick="editUser(${user.id}, '${user.username}', '${user.role}', '${user.remark ? user.remark.replace(/'/g, "&#39;") : ''}')">編輯</button>
                                <button class="del-btn" onclick="deleteUser(${user.id})">刪除</button>
                            </td>
                        </tr>
                    `).join('') + '</tbody></table>';
            });
    }

    // 編輯帳號（全域函式）
    window.editUser = function(id, username, role, remark) {
        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-username-display').textContent = username;
        document.getElementById('edit-role').value = role;
        document.getElementById('edit-password').value = '';
        document.getElementById('edit-remark').value = remark || '';
        document.getElementById('edit-user-modal').style.display = 'block';
    }

    // 關閉編輯 modal（全域函式）
    window.closeEditModal = function() {
        document.getElementById('edit-user-modal').style.display = 'none';
    }

    // 刪除帳號（全域函式）
    window.deleteUser = function(id) {
        if (confirm('確定要刪除此帳號？')) {
            fetch(`/api/users/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(() => loadUsers());
        }
    }

    // 編輯帳號表單處理
    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('edit-user-id').value;
            const password = document.getElementById('edit-password').value;
            const role = document.getElementById('edit-role').value;
            const remark = document.getElementById('edit-remark').value;
            
            const updateData = {};
            if (password) updateData.password = password;
            if (role) updateData.role = role;
            updateData.remark = remark;
            
            fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(data => {
                        throw new Error(data.error || '編輯帳號失敗');
                    });
                }
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    closeEditModal();
                    loadUsers();
                    showUserSuccessModal();
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert(err.message || '編輯帳號失敗');
            });
        });
    }

    // 顯示/關閉帳號編輯成功提示框
    function showUserSuccessModal() {
        document.getElementById('user-success-modal').style.display = 'block';
    }
    function closeUserSuccessModal() {
        document.getElementById('user-success-modal').style.display = 'none';
    }
    const userSuccessOkBtn = document.getElementById('user-success-ok-btn');
    if (userSuccessOkBtn) {
        userSuccessOkBtn.addEventListener('click', closeUserSuccessModal);
    }

    // 新增帳號
    const userAddForm = document.getElementById('user-add-form');
    if (userAddForm) {
        // 即時檢查帳號重複
        const addUsernameInput = document.getElementById('add-username');
        if (addUsernameInput) {
            addUsernameInput.addEventListener('blur', function() {
                const username = this.value.trim();
                if (username) {
                    fetch('/api/users')
                        .then(res => res.json())
                        .then(users => {
                            const isDuplicate = users.some(user => user.username === username);
                            if (isDuplicate) {
                                this.style.borderColor = '#ff4444';
                                this.setCustomValidity('帳號已存在');
                                this.reportValidity();
                            } else {
                                this.style.borderColor = '';
                                this.setCustomValidity('');
                            }
                        });
                }
            });
        }

        userAddForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('add-username').value;
            const password = document.getElementById('add-password').value;
            const role = document.getElementById('add-role').value;
            
            fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(data => {
                        throw new Error(data.error || '新增帳號失敗');
                    });
                }
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    userAddForm.reset();
                    loadUsers();
                    // 清除錯誤樣式
                    addUsernameInput.style.borderColor = '';
                    addUsernameInput.setCustomValidity('');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert(err.message || '新增帳號失敗');
            });
        });
    }

    // 角色管理功能
    function loadRoles() {
        fetch('/api/roles')
            .then(res => res.json())
            .then(data => {
                const section = document.getElementById('role-list-section');
                section.innerHTML = '<table><thead><tr><th>角色名稱</th><th>說明</th><th>備註</th><th>操作</th></tr></thead><tbody>' +
                    data.map(role => `
                        <tr>
                            <td>${role.name}</td>
                            <td>${role.description || '-'}</td>
                            <td>${role.remark || '-'}</td>
                            <td>
                                <button class="edit-btn" onclick="editRole(${role.id})">編輯</button>
                                <button class="del-btn" onclick="deleteRole(${role.id})">刪除</button>
                            </td>
                        </tr>
                    `).join('') + '</tbody></table>';
            });
    }

    // 新增角色
    const roleAddForm = document.getElementById('role-add-form');
    if (roleAddForm) {
        roleAddForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('role-name').value;
            fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
            .then(res => res.json())
            .then(() => {
                roleAddForm.reset();
                loadRoles();
                loadRoleOptions(); // 重新載入角色選項
            });
        });
    }

    // 刪除角色（全域函式）
    window.deleteRole = function(id) {
        if (confirm('確定要刪除此角色？')) {
            fetch(`/api/roles/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(() => {
                    loadRoles();
                    loadRoleOptions(); // 重新載入角色選項
                });
        }
    }

    // 編輯角色（全域函式）
    window.editRole = function(id) {
        fetch(`/api/roles/${id}`)
            .then(res => res.json())
            .then(role => {
                document.getElementById('edit-role-id').value = role.id;
                document.getElementById('edit-role-name').value = role.name;
                document.getElementById('edit-role-desc').value = role.description || '';
                document.getElementById('edit-role-remark').value = role.remark || '';
                // 權限設定
                const permsDiv = document.getElementById('edit-role-perms');
                permsDiv.innerHTML = `
                    <label><input type="checkbox" id="perm-add" ${role.canAddAsset ? 'checked' : ''}> 可新增資產</label><br>
                    <label><input type="checkbox" id="perm-del" ${role.canDeleteAsset ? 'checked' : ''}> 可刪除資產</label><br>
                    <label><input type="checkbox" id="perm-user" ${role.canManageUser ? 'checked' : ''}> 可管理帳號</label><br>
                    <label><input type="checkbox" id="perm-role" ${role.canManageRole ? 'checked' : ''}> 可管理角色</label>
                `;
                document.getElementById('edit-role-modal').style.display = 'block';
            });
    }

    // 關閉編輯角色 modal（全域函式）
    window.closeEditRoleModal = function() {
        document.getElementById('edit-role-modal').style.display = 'none';
    }

    // 編輯角色表單送出
    const editRoleForm = document.getElementById('edit-role-form');
    if (editRoleForm) {
        editRoleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('edit-role-id').value;
            const name = document.getElementById('edit-role-name').value;
            const description = document.getElementById('edit-role-desc').value;
            const remark = document.getElementById('edit-role-remark').value;
            const canAddAsset = document.getElementById('perm-add').checked;
            const canDeleteAsset = document.getElementById('perm-del').checked;
            const canManageUser = document.getElementById('perm-user').checked;
            const canManageRole = document.getElementById('perm-role').checked;
            fetch(`/api/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, remark, canAddAsset, canDeleteAsset, canManageUser, canManageRole })
            })
            .then(res => res.json())
            .then(() => {
                closeEditRoleModal();
                showRoleSuccessModal(); // 顯示成功提示框
                loadRoles();
                loadRoleOptions(); // 重新載入角色選項
            });
        });
    }

    // 新增顯示/關閉角色編輯成功提示框
    function showRoleSuccessModal() {
        document.getElementById('role-success-modal').style.display = 'block';
    }
    function closeRoleSuccessModal() {
        document.getElementById('role-success-modal').style.display = 'none';
        loadRoles();
        loadRoleOptions(); // 重新載入角色選項
    }
    const roleSuccessOkBtn = document.getElementById('role-success-ok-btn');
    if (roleSuccessOkBtn) {
        roleSuccessOkBtn.addEventListener('click', closeRoleSuccessModal);
    }

    // 類型管理功能
    function loadTypes() {
        fetch('/api/asset-types')
            .then(res => res.json())
            .then(data => {
                const section = document.getElementById('type-list-section');
                section.innerHTML = '<table><thead><tr><th>類型名稱</th><th>描述</th><th>操作</th></tr></thead><tbody>' +
                    data.map(type => `
                        <tr>
                            <td>${type.name}</td>
                            <td>${type.description || '-'}</td>
                            <td>
                                <button class="edit-btn" onclick="editType(${type.id}, '${type.name}', '${type.description || ''}')">編輯</button>
                                <button class="del-btn" onclick="deleteType(${type.id})">刪除</button>
                            </td>
                        </tr>
                    `).join('') + '</tbody></table>';
            });
    }

    // 新增類型
    const typeAddForm = document.getElementById('type-add-form');
    if (typeAddForm) {
        typeAddForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('type-name').value;
            const description = document.getElementById('type-description').value;
            fetch('/api/asset-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            })
            .then(res => res.json())
            .then(() => {
                typeAddForm.reset();
                loadTypes();
                loadAssetTypes();
            });
        });
    }

    // 編輯類型（全域函式）
    window.editType = function(id, name, description) {
        document.getElementById('edit-type-id').value = id;
        document.getElementById('edit-type-name').value = name;
        document.getElementById('edit-type-description').value = description || '';
        document.getElementById('edit-type-modal').style.display = 'block';
    }

    // 關閉編輯類型 modal（全域函式）
    window.closeEditTypeModal = function() {
        document.getElementById('edit-type-modal').style.display = 'none';
    }

    // 編輯類型表單送出
    const editTypeForm = document.getElementById('edit-type-form');
    if (editTypeForm) {
        editTypeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('edit-type-id').value;
            const name = document.getElementById('edit-type-name').value;
            const description = document.getElementById('edit-type-description').value;
            fetch(`/api/asset-types/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            })
            .then(res => res.json())
            .then(() => {
                closeEditTypeModal();
                loadTypes();
                loadAssetTypes();
                showTypeSuccessModal();
            });
        });
    }

    // 顯示/關閉類型編輯成功提示框
    function showTypeSuccessModal() {
        document.getElementById('type-success-modal').style.display = 'block';
    }
    function closeTypeSuccessModal() {
        document.getElementById('type-success-modal').style.display = 'none';
    }
    const typeSuccessOkBtn = document.getElementById('type-success-ok-btn');
    if (typeSuccessOkBtn) {
        typeSuccessOkBtn.addEventListener('click', closeTypeSuccessModal);
    }

    // 刪除類型（全域函式）
    window.deleteType = function(id) {
        if (confirm('確定要刪除此類型？')) {
            fetch(`/api/asset-types/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(() => {
                    loadTypes();
                    loadAssetTypes();
                });
        }
    }

    loadAssets();
    loadAssetTypes();
    loadRoleOptions(); // 載入角色選項
    loadRoles(); // 載入角色列表
}); 