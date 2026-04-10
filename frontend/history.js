// Tab switching logic
function switchTab(tab) {
    const tabUpload = document.getElementById('tab-upload');
    const tabHistory = document.getElementById('tab-history');
    const mainUpload = document.getElementById('main-upload');
    const mainHistory = document.getElementById('main-history');

    if (tab === 'upload') {
        tabUpload.className = "text-white font-medium border-b-2 border-white pb-1 px-2";
        tabHistory.className = "text-green-100 hover:text-white font-medium border-b-2 border-transparent hover:border-green-200 pb-1 px-2 transition";
        mainUpload.classList.remove('hidden');
        mainUpload.classList.add('flex');
        mainHistory.classList.add('hidden');
        mainHistory.classList.remove('flex');
    } else if (tab === 'history') {
        tabHistory.className = "text-white font-medium border-b-2 border-white pb-1 px-2";
        tabUpload.className = "text-green-100 hover:text-white font-medium border-b-2 border-transparent hover:border-green-200 pb-1 px-2 transition";
        mainHistory.classList.remove('hidden');
        mainHistory.classList.add('flex');
        mainUpload.classList.add('hidden');
        mainUpload.classList.remove('flex');
        
        // Load history data when tab is opened
        loadHistory();
    }
}

// Fetch history from backend
async function loadHistory() {
    const grid = document.getElementById('history-grid');
    const loading = document.getElementById('history-loading');
    const empty = document.getElementById('history-empty');
    
    // Reset views
    grid.innerHTML = '';
    loading.classList.remove('hidden');
    loading.classList.add('flex');
    empty.classList.add('hidden');
    empty.classList.remove('flex');
    
    try {
        const userId = localStorage.getItem('deviceUserId') || 'anonymous';
        
        // Detect if running locally without Nginx proxy
        const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? `http://127.0.0.1:8000/history?user_id=${userId}` 
            : `/api/history?user_id=${userId}`;
            
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch history");
        
        const data = await response.json();
        
        // Hide loading
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        
        if (!data.success || !data.history || data.history.length === 0) {
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            if (data.message && data.message.includes("Database not configured")) {
                empty.innerHTML = `
                    <svg class="w-16 h-16 text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p class="text-lg font-medium text-gray-700">数据库未连接</p>
                    <p class="text-gray-500 text-sm mt-2">请在后端配置 MySQL 连接信息以启用历史记录功能。</p>
                `;
            }
            return;
        }
        
        // Populate history items
        data.history.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow";
            
            const confPercent = item.confidence ? (parseFloat(item.confidence) * 100).toFixed(1) : "0.0";
            
            // Convert UTC time to local time
            // Parse the date string format: "YYYY-MM-DD HH:MM:SS"
            const dateParts = item.date.split(' ');
            const date = dateParts[0].split('-');
            const time = dateParts[1].split(':');
            // Create UTC date object
            const utcDate = new Date(Date.UTC(
                parseInt(date[0]),
                parseInt(date[1]) - 1, // Month is 0-indexed
                parseInt(date[2]),
                parseInt(time[0]),
                parseInt(time[1]),
                parseInt(time[2])
            ));
            // Convert to local time
            const localDate = utcDate.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Handle local vs production image URLs
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const imageUrl = item.result_url ? (isLocal ? `http://127.0.0.1:8000${item.result_url}` : `/api${item.result_url}`) : '';
            
            card.innerHTML = `
                <div class="h-48 bg-gray-100 relative group">
                    <img src="${imageUrl}" alt="检测结果" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'><rect width=\'100\' height=\'100\' fill=\'%23f3f4f6\'/><text x=\'50\' y=\'50\' font-family=\'Arial\' font-size=\'12\' fill=\'%239ca3af\' text-anchor=\'middle\' dy=\'.3em\'>图片加载失败</text></svg>'">
                    <div class="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        ${item.detections.length} 个目标
                    </div>
                </div>
                <div class="p-4">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="font-bold text-gray-800 text-lg truncate" title="${item.primary_disease}">
                                ${item.primary_disease !== "None" ? item.primary_disease : "未检测出病害"}
                            </h3>
                            <p class="text-xs text-gray-500 mt-1">${localDate}</p>
                        </div>
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${item.primary_disease !== "None" ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                            ${confPercent}% 置信
                        </span>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-50">
                        <button onclick="window.open('${imageUrl}', '_blank')" class="text-sm text-green-600 hover:text-green-800 font-medium flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            查看大图
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error fetching history:', error);
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        empty.classList.remove('hidden');
        empty.classList.add('flex');
        empty.innerHTML = `
            <svg class="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p class="text-lg font-medium text-gray-700">加载失败</p>
            <p class="text-gray-500 text-sm mt-2">无法连接到服务器获取历史记录</p>
        `;
    }
}
