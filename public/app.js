document.addEventListener('DOMContentLoaded', () => {
    const assetTableBody = document.querySelector('#asset-table tbody');
    const assetForm = document.getElementById('asset-form');
    const loginBtn = document.getElementById('login-btn');

    // 載入資產清單
    function loadAssets() {
        fetch('/api/assets')
            .then(res => res.json())
            .then(data => {
                assetTableBody.innerHTML = '';
                data.forEach((asset, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${asset.name}</td>
                        <td>${asset.type}</td>
                        <td>${asset.owner}</td>
                        <td>${asset.location}</td>
                    `;
                    assetTableBody.appendChild(tr);
                });
            });
    }

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