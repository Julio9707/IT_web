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
    const tabContentTypeDetail = document.getElementById('tab-content-type-detail');

    // 切換到指定分頁的函數
    function switchToTab(tabName) {
        tabBtns.forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // 隱藏所有分頁內容
        tabContentAsset.style.display = 'none';
        tabContentUser.style.display = 'none';
        tabContentRole.style.display = 'none';
        tabContentType.style.display = 'none';
        if (tabContentTypeDetail) tabContentTypeDetail.style.display = 'none';
        
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
        } else if (tabName === 'type-detail') {
            if (tabContentTypeDetail) {
                tabContentTypeDetail.style.display = '';
                // 只在第一次載入時調用
                if (tabContentTypeDetail.dataset.loaded !== 'true') {
                    loadAssetTypeSettingSelect();
                    tabContentTypeDetail.dataset.loaded = 'true';
                }
            }
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
    const logoutModal = document.getElementById('logout-confirm-modal');
    const logoutCancelBtn = document.getElementById('logout-cancel-btn');
    const logoutConfirmBtn = document.getElementById('logout-confirm-btn');
    logoutBtn.addEventListener('click', () => {
        logoutModal.style.display = 'block';
    });
    if (logoutCancelBtn) {
        logoutCancelBtn.onclick = function() {
            logoutModal.style.display = 'none';
        };
    }
    if (logoutConfirmBtn) {
        logoutConfirmBtn.onclick = function() {
            localStorage.removeItem('login');
            localStorage.removeItem('role');
            localStorage.removeItem('permissions');
            localStorage.removeItem('currentTab');
            window.location.href = 'login.html';
        };
    }

    // 資產管理功能
    const assetTableBody = document.querySelector('#asset-table tbody');
    const assetForm = document.getElementById('asset-form');
    const assetTypeSelect = document.getElementById('type');

    let allAssets = [];

    function loadAssets() {
        fetch('/api/assets')
            .then(res => res.json())
            .then(data => {
                allAssets = data;
                renderAssetTable();
                updateAssetTypeFilterOptions();
            });
    }

    function renderAssetTable() {
        const filterValue = document.getElementById('asset-type-filter-select')?.value || '';
        assetTableBody.innerHTML = '';
        let filteredAssets = allAssets;
        if (filterValue) {
            filteredAssets = allAssets.filter(asset => asset.type === filterValue);
        }
        filteredAssets.forEach((asset, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style=\"width:20px; text-align:center;\">${idx + 1}</td>
                <td>${asset.name}</td>
                <td>${asset.type}</td>
                <td>${asset.owner}</td>
                <td>${asset.location}</td>
                <td>
                    <button class=\"edit-btn\" onclick=\"editAsset(${idx}, '${asset.name}', '${asset.type}', '${asset.owner}', '${asset.location}')\">編輯</button>
                    ${hasPermission('canDeleteAsset') ? `<button class=\"action-btn\" onclick=\"deleteAsset(${idx})\">刪除</button>` : ''}
                </td>
            `;
            assetTableBody.appendChild(tr);
        });
    }

    function updateAssetTypeFilterOptions() {
        const filterSelect = document.getElementById('asset-type-filter-select');
        if (!filterSelect) return;
        const current = filterSelect.value;
        filterSelect.innerHTML = '<option value="">全部類型</option>';
        const types = [...new Set(allAssets.map(a => a.type))];
        types.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            filterSelect.appendChild(opt);
        });
        filterSelect.value = current;
    }

    document.getElementById('asset-type-filter-select')?.addEventListener('change', renderAssetTable);

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

    // 資產刪除彈窗控制
    let assetToDeleteIdx = null;
    const deleteAssetModal = document.getElementById('delete-asset-modal');
    const deleteAssetCancelBtn = document.getElementById('delete-asset-cancel-btn');
    const deleteAssetConfirmBtn = document.getElementById('delete-asset-confirm-btn');

    window.deleteAsset = function(idx) {
        assetToDeleteIdx = idx;
        deleteAssetModal.style.display = 'block';
    }
    if (deleteAssetCancelBtn) {
        deleteAssetCancelBtn.onclick = function() {
            deleteAssetModal.style.display = 'none';
            assetToDeleteIdx = null;
        }
    }
    if (deleteAssetConfirmBtn) {
        deleteAssetConfirmBtn.onclick = function() {
            if (assetToDeleteIdx !== null) {
                fetch(`/api/assets/${assetToDeleteIdx}`, { method: 'DELETE' })
                    .then(res => res.json())
                    .then(() => {
                        loadAssets();
                        deleteAssetModal.style.display = 'none';
                        assetToDeleteIdx = null;
                    });
            }
        }
    }

    // 資產新增成功彈窗控制
    const addAssetSuccessModal = document.getElementById('add-asset-success-modal');
    const addAssetSuccessOkBtn = document.getElementById('add-asset-success-ok-btn');
    if (addAssetSuccessOkBtn) {
        addAssetSuccessOkBtn.onclick = function() {
            addAssetSuccessModal.style.display = 'none';
        }
    }

    // 編輯資產表單處理
    const editAssetForm = document.getElementById('edit-asset-form');
    if (editAssetForm) {
        editAssetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const idx = document.getElementById('edit-asset-id').value;
            
            // 收集基本欄位
            const asset = {
                name: document.getElementById('edit-asset-name').value,
                type: document.getElementById('edit-asset-type').value,
                owner: document.getElementById('edit-asset-owner').value, // 用途欄位，資料庫欄位名稱保持不變
                location: document.getElementById('edit-asset-location').value
            };
            
            // 收集自定義欄位
            const customFieldInputs = document.querySelectorAll('#edit-asset-custom-fields-list .custom-field-input');
            if (customFieldInputs.length > 0) {
                const customFieldValues = {};
                customFieldInputs.forEach(input => {
                    const fieldLabel = input.getAttribute('data-field-label');
                    customFieldValues[fieldLabel] = input.value;
                });
                asset.customFieldValues = customFieldValues;
            }
            
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

    // 編輯資產（全域函式）
    window.editAsset = function(idx, name, type, owner, location) {
        document.getElementById('edit-asset-id').value = idx;
        document.getElementById('edit-asset-name').value = name;
        document.getElementById('edit-asset-owner').value = owner; // 用途欄位
        document.getElementById('edit-asset-location').value = location;
        
        // 獲取資產的自定義欄位值
        const asset = allAssets[idx];
        const customValues = asset.customFieldValues || {};
        
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
                
                // 載入對應類型的自定義欄位
                loadAssetCustomFields(type, customValues);
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
                                ${user.username === 'admin' ? `<button class="del-btn" style="background:#ccc; color:#888; cursor:not-allowed;" disabled>刪除</button>` : `<button class="del-btn" onclick="deleteUser(${user.id})">刪除</button>`}
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
        // 權限欄位不可編輯（admin）
        if (username === 'admin') {
            document.getElementById('edit-role').disabled = true;
        } else {
            document.getElementById('edit-role').disabled = false;
        }
        document.getElementById('edit-user-modal').style.display = 'block';
    }

    // 關閉編輯 modal（全域函式）
    window.closeEditModal = function() {
        document.getElementById('edit-user-modal').style.display = 'none';
    }

    // 刪除帳號（全域函式）
    window.deleteUser = function(id) {
        const modal = document.getElementById('delete-user-modal');
        const cancelBtn = document.getElementById('delete-user-cancel-btn');
        const confirmBtn = document.getElementById('delete-user-confirm-btn');
        modal.style.display = 'block';
        function close() { modal.style.display = 'none'; cancelBtn.removeEventListener('click', onCancel); confirmBtn.removeEventListener('click', onConfirm); }
        function onCancel() { close(); }
        function onConfirm() {
            fetch(`/api/users/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(() => { close(); loadUsers(); });
        }
        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
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
                                ${role.name === 'admin' ? '' : `
                                    <button class="edit-btn" onclick="editRole(${role.id})">編輯</button>
                                    <button class="del-btn" onclick="deleteRole(${role.id})">刪除</button>
                                `}
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
        const modal = document.getElementById('delete-role-modal');
        const cancelBtn = document.getElementById('delete-role-cancel-btn');
        const confirmBtn = document.getElementById('delete-role-confirm-btn');
        modal.style.display = 'block';
        function close() { modal.style.display = 'none'; cancelBtn.removeEventListener('click', onCancel); confirmBtn.removeEventListener('click', onConfirm); }
        function onCancel() { close(); }
        function onConfirm() {
            fetch(`/api/roles/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(() => { close(); loadRoles(); loadRoleOptions(); });
        }
        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
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
                // 重新載入類型詳細頁面的下拉選單
                reloadAssetTypeSettingSelect();
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
                // 重新載入類型詳細頁面的下拉選單
                reloadAssetTypeSettingSelect();
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
        const modal = document.getElementById('delete-type-modal');
        const cancelBtn = document.getElementById('delete-type-cancel-btn');
        const confirmBtn = document.getElementById('delete-type-confirm-btn');
        modal.style.display = 'block';
        function close() { modal.style.display = 'none'; cancelBtn.removeEventListener('click', onCancel); confirmBtn.removeEventListener('click', onConfirm); }
        function onCancel() { close(); }
        function onConfirm() {
            fetch(`/api/asset-types/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(() => { 
                    close(); 
                    loadTypes(); 
                    loadAssetTypes();
                    // 重新載入類型詳細頁面的下拉選單
                    reloadAssetTypeSettingSelect();
                });
        }
        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
    }

    // 排序功能彈窗
    const openSortModalBtn = document.getElementById('open-sort-modal-btn');
    const sortModal = document.getElementById('sort-modal');
    const sortList = document.getElementById('sort-list');
    const sortCancelBtn = document.getElementById('sort-cancel-btn');
    const sortConfirmBtn = document.getElementById('sort-confirm-btn');
    let currentSortAssets = [];
    let sortableInstance = null;

    if (openSortModalBtn) {
        openSortModalBtn.addEventListener('click', () => {
            fetch('/api/assets')
                .then(res => res.json())
                .then(data => {
                    currentSortAssets = data;
                    sortList.innerHTML = '';
                    data.forEach(asset => {
                        const li = document.createElement('li');
                        li.textContent = `${asset.name}（${asset.type}）`;
                        li.setAttribute('data-id', asset.id);
                        li.style.padding = '8px 12px';
                        li.style.border = '1px solid #ddd';
                        li.style.marginBottom = '6px';
                        li.style.background = '#fafbfc';
                        li.style.cursor = 'move';
                        sortList.appendChild(li);
                    });
                    Sortable.create(sortList, {
                        animation: 150,
                        handle: 'li',
                    });
                    sortModal.style.display = 'block';
                });
        });
    }
    if (sortCancelBtn) {
        sortCancelBtn.onclick = function() {
            sortModal.style.display = 'none';
            sortList.innerHTML = '';
        }
    }
    if (sortConfirmBtn) {
        sortConfirmBtn.onclick = function() {
            const newOrder = Array.from(sortList.children).map((li, i) => ({
                id: parseInt(li.getAttribute('data-id')), display_order: i + 1
            }));
            fetch('/api/assets/order', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            }).then(() => {
                sortModal.style.display = 'none';
                sortList.innerHTML = '';
                loadAssets();
            });
        }
    }

    loadAssets();
    loadAssetTypes();
    loadRoleOptions(); // 載入角色選項
    loadRoles(); // 載入角色列表

    // ========== 新增類型詳細功能 ==========
    
    // 儲存目前選擇的資產類型與欄位
    let currentTypeId = null;
    let currentCustomFields = [];

    // 載入資產類型到下拉選單
    async function loadAssetTypeSettingSelect() {
        const select = document.getElementById('asset-type-setting-select');
        if (!select) return;
        
        // 檢查是否已經載入過，避免重複載入
        if (select.children.length > 1) {
            return;
        }
        
        select.innerHTML = '<option value="">請選擇資產類型</option>';
        try {
            const res = await fetch('/api/asset-types');
            const types = await res.json();
            types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type.id;
                opt.textContent = type.name;
                select.appendChild(opt);
            });
        } catch (e) {
            alert('載入資產類型失敗');
        }
    }

    // 重新載入類型詳細頁面的下拉選單
    async function reloadAssetTypeSettingSelect() {
        const select = document.getElementById('asset-type-setting-select');
        if (!select) return;
        
        const currentValue = select.value; // 保存當前選中的值
        select.innerHTML = '<option value="">請選擇資產類型</option>';
        try {
            const res = await fetch('/api/asset-types');
            const types = await res.json();
            types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type.id;
                opt.textContent = type.name;
                select.appendChild(opt);
            });
            // 恢復之前選中的值
            if (currentValue) {
                select.value = currentValue;
            }
        } catch (e) {
            alert('載入資產類型失敗');
        }
    }

    // 顯示自訂欄位
    function renderCustomFields() {
        const fieldsList = document.getElementById('type-custom-fields-list');
        if (!fieldsList) return;
        fieldsList.innerHTML = '';
        currentCustomFields.forEach((field, idx) => {
            const div = document.createElement('div');
            div.style.marginBottom = '6px';
            div.innerHTML = `
                <input type="text" value="${field.label}" data-idx="${idx}" style="margin-right:8px; padding:6px; border:1px solid #ccc; border-radius:4px; width:200px;">
                <button type="button" class="delete-custom-field-btn" data-idx="${idx}" style="padding:6px 12px; background:#f44336; color:white; border:none; border-radius:4px; cursor:pointer;">刪除</button>
            `;
            fieldsList.appendChild(div);
        });
    }

    // 切換資產類型時載入欄位
    document.getElementById('asset-type-setting-select')?.addEventListener('change', async function() {
        currentTypeId = this.value;
        currentCustomFields = [];
        const section = document.getElementById('type-custom-fields-section');
        
        if (!currentTypeId) {
            section.style.display = 'none';
            return;
        }
        
        try {
            const res = await fetch('/api/asset-types');
            const types = await res.json();
            const type = types.find(t => t.id == currentTypeId);
            if (type && Array.isArray(type.customFields)) {
                currentCustomFields = type.customFields.map(f => ({ label: f.label }));
            }
            renderCustomFields();
            section.style.display = 'block';
        } catch (e) {
            alert('載入自訂欄位失敗');
        }
    });

    // 新增欄位
    document.getElementById('add-type-custom-field-btn')?.addEventListener('click', function() {
        currentCustomFields.push({ label: '' });
        renderCustomFields();
    });

    // 刪除欄位（事件委派）
    document.getElementById('type-custom-fields-list')?.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-custom-field-btn')) {
            const idx = e.target.getAttribute('data-idx');
            currentCustomFields.splice(idx, 1);
            renderCustomFields();
        }
    });

    // 編輯欄位名稱（事件委派）
    document.getElementById('type-custom-fields-list')?.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT') {
            const idx = e.target.getAttribute('data-idx');
            currentCustomFields[idx].label = e.target.value;
        }
    });

    // 儲存
    document.getElementById('type-custom-fields-save-btn')?.addEventListener('click', async function() {
        if (!currentTypeId) {
            alert('請先選擇資產類型');
            return;
        }
        // 過濾空白欄位
        const fieldsToSave = currentCustomFields.filter(f => f.label.trim() !== '');
        try {
            const res = await fetch(`/api/asset-types/${currentTypeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customFields: fieldsToSave })
            });
            if (res.ok) {
                alert('自訂欄位已儲存');
                // 重新載入
                document.getElementById('asset-type-setting-select').dispatchEvent(new Event('change'));
            } else {
                alert('儲存失敗');
            }
        } catch (e) {
            alert('儲存失敗');
        }
    });

    // ========== 資產編輯自定義欄位功能 ==========
    
    // 載入資產的自定義欄位
    async function loadAssetCustomFields(assetTypeName, assetCustomValues = {}) {
        const customFieldsSection = document.getElementById('edit-asset-custom-fields-section');
        const customFieldsList = document.getElementById('edit-asset-custom-fields-list');
        
        if (!customFieldsSection || !customFieldsList) return;
        
        try {
            const res = await fetch('/api/asset-types');
            const types = await res.json();
            const selectedType = types.find(t => t.name === assetTypeName);
            
            if (selectedType && Array.isArray(selectedType.customFields) && selectedType.customFields.length > 0) {
                // 顯示自定義欄位區域
                customFieldsSection.style.display = 'block';
                customFieldsList.innerHTML = '';
                
                // 渲染自定義欄位
                const fieldsContainer = document.createElement('div');
                fieldsContainer.style.display = 'flex';
                fieldsContainer.style.flexDirection = 'column';
                fieldsContainer.style.gap = '16px';
                
                selectedType.customFields.forEach(field => {
                    const div = document.createElement('div');
                    const fieldValue = assetCustomValues[field.label] || '';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.gap = '16px';
                    div.innerHTML = `
                        <label style="min-width:80px; font-weight:500; color:#495057; font-size:0.9em;">${field.label}</label>
                        <input type="text" 
                               class="custom-field-input" 
                               data-field-label="${field.label}"
                               value="${fieldValue}"
                               placeholder="請輸入${field.label}"
                               style="flex:1; padding:10px 12px; border:1px solid #ced4da; border-radius:6px; font-size:14px; transition:border-color 0.2s; box-sizing:border-box;"
                               onfocus="this.style.borderColor='#007bff'"
                               onblur="this.style.borderColor='#ced4da'">
                    `;
                    fieldsContainer.appendChild(div);
                });
                
                customFieldsList.appendChild(fieldsContainer);
            } else {
                // 隱藏自定義欄位區域
                customFieldsSection.style.display = 'none';
            }
        } catch (e) {
            console.error('載入自定義欄位失敗:', e);
            customFieldsSection.style.display = 'none';
        }
    }
    
    // 監聽編輯資產類型選擇的變化
    document.getElementById('edit-asset-type')?.addEventListener('change', function() {
        const selectedType = this.value;
        if (selectedType) {
            // 獲取當前資產的自定義欄位值
            const idx = document.getElementById('edit-asset-id').value;
            const asset = allAssets[idx];
            const customValues = asset ? (asset.customFieldValues || {}) : {};
            loadAssetCustomFields(selectedType, customValues);
        } else {
            // 隱藏自定義欄位區域
            const customFieldsSection = document.getElementById('edit-asset-custom-fields-section');
            if (customFieldsSection) {
                customFieldsSection.style.display = 'none';
            }
        }
    });

    // 初始化載入
    loadAssetTypeSettingSelect();
}); 