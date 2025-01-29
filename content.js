// 선택된 텍스트에 대한 이벤트 처리
let lastSelectedText = '';

document.addEventListener('mouseup', function() {
  lastSelectedText = window.getSelection().toString().trim();
});

// 메시지 리스너
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'PING':
        sendResponse({status: 'ok'});
        break;
      case 'SHOW_RESPONSE':
        removeSpinner();
        showDialog(request.response, 'response');
        if (request.question && request.selectedText && request.response) {
          saveConversation(request.question, request.selectedText, request.response);
        }
        break;
      case 'SHOW_ERROR':
        removeSpinner();
        showDialog(request.error, 'error');
        break;
      case 'SHOW_QUESTION_DIALOG':
        showQuestionDialog(request.selectedText);
        break;
      case 'SHOW_HISTORY_DIALOG':
        showHistoryDialog(request.conversation);
        break;
    }
  } catch (error) {
    console.error('Error in message listener:', error);
    removeSpinner();
  }
  return true;
});

// 공통 스타일 정의
const commonStyles = {
  dialog: `
    position: fixed;
    top: 20px;
    right: 20px;
    width: min(380px, calc(100vw - 40px));
    max-height: calc(100vh - 40px);
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    animation: slideIn 0.3s ease-out;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  `,
  scrollbar: `
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `,
  button: `
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  `,
  primaryButton: `
    background: #2563eb;
    color: white;
    &:hover {
      background: #1d4ed8;
    }
  `,
  secondaryButton: `
    background: #e5e7eb;
    color: #374151;
    &:hover {
      background: #d1d5db;
    }
  `
};

// CSS 애니메이션 추가
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .ai-helper-dialog {
    backdrop-filter: blur(8px);
    ${commonStyles.scrollbar}
  }
  
  .ai-helper-spinner {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    border-left: 4px solid #2563eb;
    animation: slideIn 0.3s ease-out;
  }
  
  .ai-helper-spinner-circle {
    width: 20px;
    height: 20px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .ai-helper-textarea {
    width: 100%;
    min-height: 80px;
    max-height: 200px;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.2s ease;
    ${commonStyles.scrollbar}
  }
  
  .ai-helper-content {
    max-height: 400px;
    overflow-y: auto;
    ${commonStyles.scrollbar}
  }
  
  .ai-helper-selected-text {
    max-height: 150px;
    overflow-y: auto;
    ${commonStyles.scrollbar}
  }
  
  .ai-helper-textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  .ai-helper-button {
    ${commonStyles.button}
  }
  
  .ai-helper-button-primary {
    ${commonStyles.button}
    ${commonStyles.primaryButton}
  }
  
  .ai-helper-button-secondary {
    ${commonStyles.button}
    ${commonStyles.secondaryButton}
  }
`;
document.head.appendChild(styleSheet);

function showDialog(content, type) {
  const dialog = document.createElement('div');
  dialog.className = 'ai-helper-dialog';
  dialog.style.cssText = commonStyles.dialog;
  
  if (type === 'error') {
    dialog.style.borderLeft = '4px solid #ef4444';
  } else {
    dialog.style.borderLeft = '4px solid #2563eb';
  }
  
  dialog.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
      <div style="font-weight: 600; font-size: 16px; color: ${type === 'error' ? '#ef4444' : '#1f2937'}">
        ${type === 'error' ? '오류' : 'AI 답변'}
      </div>
      <button class="ai-helper-button-secondary" style="padding: 4px 8px; min-width: 28px;" onclick="this.parentElement.parentElement.remove()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="ai-helper-content" style="margin-bottom: 16px; line-height: 1.6; color: ${type === 'error' ? '#ef4444' : '#374151'}; font-size: 14px;">
      ${content}
    </div>
  `;
  
  document.body.appendChild(dialog);

  // ESC 키 이벤트 처리
  function handleEscKey(event) {
    if (event.key === 'Escape') {
      dialog.remove();
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }

  // 외부 클릭 이벤트 처리
  function handleClickOutside(event) {
    if (!dialog.contains(event.target)) {
      dialog.remove();
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }

  // 이벤트 리스너 등록
  setTimeout(() => {
    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('mousedown', handleClickOutside);
  }, 100);
}

function showSpinner() {
  const spinner = document.createElement('div');
  spinner.className = 'ai-helper-spinner';
  spinner.id = 'ai-helper-spinner';
  
  spinner.innerHTML = `
    <div class="ai-helper-spinner-circle"></div>
    <div style="font-size: 14px; color: #4b5563;">답변을 생성하고 있습니다...</div>
  `;
  
  document.body.appendChild(spinner);
}

function removeSpinner() {
  const spinner = document.getElementById('ai-helper-spinner');
  if (spinner) {
    spinner.remove();
  }
}

function showQuestionDialog(selectedText) {
  const dialog = document.createElement('div');
  dialog.className = 'ai-helper-dialog';
  dialog.style.cssText = commonStyles.dialog;
  dialog.style.borderLeft = '4px solid #2563eb';
  
  dialog.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
      <div style="font-weight: 600; font-size: 16px; color: #1f2937">AI에게 질문하기</div>
      <button class="ai-helper-button-secondary" style="padding: 4px 8px; min-width: 28px;" onclick="this.parentElement.parentElement.remove()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 500; font-size: 14px; color: #4b5563; margin-bottom: 8px;">선택된 텍스트</div>
      <div class="ai-helper-selected-text" style="padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #374151;">
        ${selectedText}
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 500; font-size: 14px; color: #4b5563; margin-bottom: 8px;">질문 입력</div>
      <textarea class="ai-helper-textarea" id="questionInput" placeholder="질문을 입력하세요..." style="width: calc(100% - 24px);"></textarea>
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: auto;">
      <button class="ai-helper-button-secondary" onclick="this.parentElement.parentElement.remove()">취소</button>
      <button class="ai-helper-button-primary" id="submitQuestion">질문하기</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  const submitButton = dialog.querySelector('#submitQuestion');
  const textarea = dialog.querySelector('#questionInput');
  
  // ESC 키 이벤트 처리
  function handleEscKey(event) {
    if (event.key === 'Escape') {
      dialog.remove();
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }

  // 외부 클릭 이벤트 처리
  function handleClickOutside(event) {
    if (!dialog.contains(event.target)) {
      dialog.remove();
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }

  // 이벤트 리스너 등록
  setTimeout(() => {
    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('mousedown', handleClickOutside);
  }, 100);
  
  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      submitButton.click();
    }
  });
  
  submitButton.addEventListener('click', function() {
    const question = textarea.value;
    if (question.trim()) {
      showSpinner();
      chrome.runtime.sendMessage({
        type: 'SUBMIT_QUESTION',
        question: question,
        selectedText: selectedText
      });
      dialog.remove();
      document.removeEventListener('mousedown', handleClickOutside);
    }
  });
}

// 대화 저장 함수 수정
function saveConversation(question, selectedText, response) {
  chrome.storage.local.get(['conversations'], function(result) {
    const conversations = result.conversations || [];
    const newConversation = {
      question,
      selectedText,
      response,
      timestamp: new Date().getTime()
    };
    
    conversations.push(newConversation);
    chrome.storage.local.set({ conversations: conversations }, function() {
      console.log('대화가 저장되었습니다:', newConversation);
    });
  });
}

// 히스토리 대화창 표시 함수
function showHistoryDialog(conversation) {
  const dialog = document.createElement('div');
  dialog.className = 'ai-helper-dialog';
  dialog.style.cssText = commonStyles.dialog;
  dialog.style.borderLeft = '4px solid #2563eb';
  
  dialog.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
      <div style="font-weight: 600; font-size: 16px; color: #1f2937">저장된 대화</div>
      <button class="ai-helper-button-secondary" style="padding: 4px 8px; min-width: 28px;" onclick="this.parentElement.parentElement.remove()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 500; font-size: 14px; color: #4b5563; margin-bottom: 8px;">질문</div>
      <div style="padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #374151;">
        ${conversation.question}
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 500; font-size: 14px; color: #4b5563; margin-bottom: 8px;">선택된 텍스트</div>
      <div class="ai-helper-selected-text" style="padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #374151;">
        ${conversation.selectedText}
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 500; font-size: 14px; color: #4b5563; margin-bottom: 8px;">AI 답변</div>
      <div class="ai-helper-content" style="padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #374151;">
        ${conversation.response}
      </div>
    </div>
    <div style="font-size: 12px; color: #94a3b8; text-align: right;">
      ${new Date(conversation.timestamp).toLocaleString()}
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // ESC 키 이벤트 처리
  function handleEscKey(event) {
    if (event.key === 'Escape') {
      dialog.remove();
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }

  // 외부 클릭 이벤트 처리
  function handleClickOutside(event) {
    if (!dialog.contains(event.target)) {
      dialog.remove();
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }

  // 이벤트 리스너 등록
  setTimeout(() => {
    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('mousedown', handleClickOutside);
  }, 100);
} 