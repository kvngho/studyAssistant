document.addEventListener('DOMContentLoaded', function() {
  // 탭 전환 처리
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const contents = document.querySelectorAll('.content');
      contents.forEach(content => content.classList.remove('active'));
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // API 키 저장 처리
  chrome.storage.sync.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }
  });

  document.getElementById('saveButton').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value;
    chrome.storage.sync.set({
      openaiApiKey: apiKey
    }, function() {
      alert('API 키가 저장되었습니다.');
    });
  });

  // 대화 기록 로드
  loadHistory();
});

function loadHistory() {
  chrome.storage.local.get(['conversations'], function(result) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (result.conversations && result.conversations.length > 0) {
      result.conversations.reverse().forEach(conv => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <div class="history-question">${conv.question}</div>
          <div class="history-text">선택된 텍스트: ${conv.selectedText}</div>
          <div class="history-date">${new Date(conv.timestamp).toLocaleString()}</div>
        `;
        
        item.addEventListener('click', () => {
          showHistoryDialog(conv);
        });
        
        historyList.appendChild(item);
      });
    } else {
      historyList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 16px;">저장된 대화가 없습니다.</div>';
    }
  });
}

function showHistoryDialog(conversation) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'SHOW_HISTORY_DIALOG',
      conversation: conversation
    });
  });
} 