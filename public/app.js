document.addEventListener('DOMContentLoaded', () => {
    const assetTableBody = document.querySelector('#asset-table tbody');
    const assetForm = document.getElementById('asset-form');
    const loginBtn = document.getElementById('login-btn');

    let allAssets = [];

    // 載入資產清單
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
                <td>${asset.name}</td>
                <td>${asset.type}</td>
                <td>${asset.owner}</td>
                <td>${asset.location}</td>
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

    // 新增資產（僅管理頁有）
    if (assetForm) {
        assetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const asset = {
                name: document.getElementById('name').value,
                type: document.getElementById('type').value,
                owner: document.getElementById('owner').value,
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
    }

    // 刪除資產（全域函式）
    window.deleteAsset = function(idx) {
        fetch(`/api/assets/${idx}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(() => loadAssets());
    }

    // 登入按鈕導向登入頁面
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    loadAssets();
}); 