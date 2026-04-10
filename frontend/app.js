let selectedFile = null;
let deviceUserId = localStorage.getItem('deviceUserId');

// Setup Drag and Drop events
document.addEventListener('DOMContentLoaded', () => {
    // Generate and store a unique device ID if not exists
    if (!deviceUserId) {
        deviceUserId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('deviceUserId', deviceUserId);
    }
    console.log("Current Device User ID:", deviceUserId);

    const dropzoneLabel = document.getElementById('dropzone-label');
    const fileInput = document.getElementById('dropzone-file');

    if (dropzoneLabel && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzoneLabel.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzoneLabel.addEventListener(eventName, () => {
                dropzoneLabel.classList.add('bg-green-100');
                dropzoneLabel.classList.remove('bg-green-50');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzoneLabel.addEventListener(eventName, () => {
                dropzoneLabel.classList.remove('bg-green-100');
                dropzoneLabel.classList.add('bg-green-50');
            }, false);
        });

        dropzoneLabel.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files && files.length > 0) {
                // Trigger the file input change event manually
                fileInput.files = files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        }, false);
    }
});

// Handle file input change
function previewImage(event) {
    const input = event.target;
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        
        // Setup FileReader to show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('display-image').src = e.target.result;
            document.getElementById('display-image').classList.remove('hidden');
            document.getElementById('placeholder-text').classList.add('hidden');
            
            // UI updates
            document.getElementById('action-buttons').classList.remove('hidden');
            document.getElementById('status-badge').innerText = '准备就绪';
            document.getElementById('status-badge').className = 'px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700';
            
            // Hide previous results
            document.getElementById('results-panel').style.display = 'none';
        }
        reader.readAsDataURL(selectedFile);
    }
}

// Reset upload state
function resetUpload() {
    selectedFile = null;
    document.getElementById('dropzone-file').value = '';
    
    // UI updates
    document.getElementById('display-image').src = '';
    document.getElementById('display-image').classList.add('hidden');
    document.getElementById('placeholder-text').classList.remove('hidden');
    document.getElementById('action-buttons').classList.add('hidden');
    
    document.getElementById('status-badge').innerText = '待上传';
    document.getElementById('status-badge').className = 'px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600';
    
    document.getElementById('results-panel').style.display = 'none';
}

// Trigger detection on the backend
async function startDetection() {
    if (!selectedFile) {
        alert("请先上传图片");
        return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('user_id', deviceUserId);

    // Show loading UI
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('status-badge').innerText = '检测中...';
    document.getElementById('status-badge').className = 'px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700';

    try {
        // Detect if running locally without Nginx proxy
        const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://127.0.0.1:8000/detect' 
            : '/api/detect';
            
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            // Display result image
            document.getElementById('display-image').src = `data:image/jpeg;base64,${data.image_base64}`;
            
            // Update UI
            document.getElementById('status-badge').innerText = '检测完成';
            document.getElementById('status-badge').className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700';
            
            // If the backend also returned URLs (we display base64 for speed but save urls)
            if (data.result_url) {
                console.log("Record saved with ID:", data.record_id);
            }
            
            // Populate Results
            populateResults(data.detections);
        } else {
            alert("检测失败: " + data.message);
            document.getElementById('status-badge').innerText = '检测失败';
            document.getElementById('status-badge').className = 'px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700';
        }

    } catch (error) {
        console.error('Error during detection:', error);
        alert("请求后端服务失败，请确保FastAPI服务已启动。");
        document.getElementById('status-badge').innerText = '请求错误';
        document.getElementById('status-badge').className = 'px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700';
    } finally {
        // Hide loading UI
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}

// Populate the detection list
function populateResults(detections) {
    const resultsPanel = document.getElementById('results-panel');
    const detectionList = document.getElementById('detection-list');
    const detectCount = document.getElementById('detect-count');
    
    // Show panel
    resultsPanel.style.display = 'block';
    
    // Clear previous
    detectionList.innerHTML = '';
    
    if (detections.length === 0) {
        detectCount.innerText = '0 个目标';
        detectCount.className = 'text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full';
        
        const emptyLi = document.createElement('li');
        emptyLi.className = "text-center text-gray-500 py-4";
        emptyLi.innerText = "未检测到任何病害目标";
        detectionList.appendChild(emptyLi);
        return;
    }

    // Update count
    detectCount.innerText = `${detections.length} 个目标`;
    detectCount.className = 'text-sm font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full';

    // Group by class to summarize (Optional, but nice for UI)
    // For now, list every detection
    detections.forEach((det, index) => {
        const li = document.createElement('li');
        li.className = "flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow";
        
        // Format confidence to percentage
        const confPercent = (det.confidence * 100).toFixed(1);
        
        li.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                    ${index + 1}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-semibold text-gray-800">${det.class_name}</p>
                    <p class="text-xs text-gray-500">坐标: [${det.box.map(b => Math.round(b)).join(', ')}]</p>
                </div>
            </div>
            <div class="text-right">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ${confPercent}% 置信度
                </span>
            </div>
        `;
        detectionList.appendChild(li);
    });
}
