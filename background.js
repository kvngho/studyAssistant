// 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'askAI',
    title: 'AI에게 질문하기',
    contexts: ['selection']
  });
});

// 컨텍스트 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'askAI') {
    // 먼저 탭이 활성 상태인지 확인
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id === tab.id) {
        // 탭이 로드되었는지 확인
        chrome.tabs.sendMessage(tab.id, {
          type: 'PING'
        }).then(response => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_QUESTION_DIALOG',
            selectedText: info.selectionText
          });
        }).catch(() => {
          // 연결이 안되어 있으면 탭 리로드
          chrome.tabs.reload(tab.id, {}, () => {
            // 리로드 후 잠시 대기
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                type: 'SHOW_QUESTION_DIALOG',
                selectedText: info.selectionText
              });
            }, 1000);
          });
        });
      }
    });
  }
});

// 질문 제출 처리
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.type === 'SUBMIT_QUESTION') {
    handleQuestion(request, sender);
  }
});

async function handleQuestion(request, sender) {
  try {
    const { openaiApiKey } = await chrome.storage.sync.get(['openaiApiKey']);
    
    if (!openaiApiKey) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SHOW_ERROR',
        error: 'OpenAI API 키를 설정해주세요.'
      });
      return;
    }

    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `다음 텍스트에 대해 답변해주세요.\n\n텍스트: ${request.selectedText}\n\n질문: ${request.question}`
      }]
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    chrome.tabs.sendMessage(sender.tab.id, {
      type: 'SHOW_RESPONSE',
      response: data.choices[0].message.content,
      question: request.question,
      selectedText: request.selectedText
    });
  } catch (error) {
    console.error('Error in handleQuestion:', error);
    
    // 실제 API 오류인 경우에만 에러 메시지 표시
    if (error.message.includes('API') || 
        error.message.includes('key') || 
        error.message.includes('401') || 
        error.message.includes('429')) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SHOW_ERROR',
        error: error.message
      });
    }
  }
} 