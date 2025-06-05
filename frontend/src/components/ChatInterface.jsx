import React, { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, Loader, Trash2 } from 'lucide-react'

const ChatInterface = ({ conversation, onAskQuestion, onClearChat, disabled }) => {
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [conversation.messages])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        })
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!question.trim() || disabled || isAsking) return

    const questionText = question.trim()
    setQuestion('')
    setIsAsking(true)

    // Prevent any scroll behavior
    document.body.style.overflow = 'hidden'

    try {
      await onAskQuestion(questionText)
    } finally {
      setIsAsking(false)
      // Restore scroll after a short delay
      setTimeout(() => {
        document.body.style.overflow = 'auto'
      }, 100)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()

      // Prevent any default browser behavior
      if (e.target) {
        e.target.blur()
        setTimeout(() => e.target.focus(), 50)
      }

      handleSubmit(e)
      return false
    }
  }

  const formatMessage = (content) => {
    // Enhanced formatting with full markdown support
    const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/);

    return parts.map((part, index) => {
      // Handle code blocks (```language ... ```)
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3);
        const lines = codeContent.split('\n');
        const language = lines[0].trim();
        const code = lines.slice(1).join('\n');

        return (
          <div key={index} className="my-3 w-full">
            <div className="bg-gray-800 dark:bg-gray-700 text-gray-100 dark:text-gray-200 rounded-t-lg px-3 py-1 text-xs font-medium">
              {language || 'code'}
            </div>
            <pre className="bg-gray-900 dark:bg-gray-800 text-gray-100 dark:text-gray-200 p-4 rounded-b-lg overflow-x-auto text-sm whitespace-pre-wrap break-words max-w-full">
              <code className="block w-full">{code}</code>
            </pre>
          </div>
        );
      }

      // Handle inline code (`code`)
      if (part.startsWith('`') && part.endsWith('`')) {
        const code = part.slice(1, -1);
        return (
          <code key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
            {code}
          </code>
        );
      }

      // Handle regular text with markdown formatting
      return formatTextWithMarkdown(part, `${index}`);
    });
  }

  const formatTextWithMarkdown = (text, keyPrefix) => {
    const lines = text.split('\n');

    return lines.map((line, lineIndex) => {
      const key = `${keyPrefix}-${lineIndex}`;

      // Handle headers (### ## #)
      if (line.startsWith('### ')) {
        return (
          <h3 key={key} className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={key} className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={key} className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
            {line.slice(2)}
          </h1>
        );
      }

      // Handle bullet points (* or -)
      if (line.match(/^\s*[\*\-]\s+/)) {
        const content = line.replace(/^\s*[\*\-]\s+/, '');
        return (
          <div key={key} className="flex items-start mb-1">
            <span className="text-gray-600 dark:text-gray-400 mr-2 mt-1">•</span>
            <span>{formatInlineMarkdown(content)}</span>
          </div>
        );
      }

      // Handle numbered lists
      if (line.match(/^\s*\d+\.\s+/)) {
        const content = line.replace(/^\s*\d+\.\s+/, '');
        const number = line.match(/^\s*(\d+)\./)[1];
        return (
          <div key={key} className="flex items-start mb-1">
            <span className="text-gray-600 dark:text-gray-400 mr-2 mt-1 font-medium">{number}.</span>
            <span>{formatInlineMarkdown(content)}</span>
          </div>
        );
      }

      // Handle empty lines
      if (line.trim() === '') {
        return <br key={key} />;
      }

      // Handle regular paragraphs
      return (
        <p key={key} className="mb-2">
          {formatInlineMarkdown(line)}
        </p>
      );
    });
  }

  const formatInlineMarkdown = (text) => {
    // Handle bold (**text**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle italic (*text*)
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">$1</a>');

    // Return JSX with dangerouslySetInnerHTML for simple formatting
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleClearChat = () => {
    if (conversation.messages.length === 0) return;

    if (window.confirm('Are you sure you want to clear this conversation? This action cannot be undone.')) {
      onClearChat();
    }
  };

  // console.log('ChatInterface rendering:', { disabled, messagesCount: conversation.messages.length });

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 min-h-80 sm:min-h-96 flex flex-col w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-3 sm:pb-4 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Ask Questions About Your Document
          </h2>
          {conversation.messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center space-x-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors text-sm self-start sm:self-auto"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
        {disabled && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            Please wait for document processing to complete before asking questions.
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-3 sm:space-y-4 mb-3 sm:mb-4 w-full max-w-full">
        {conversation.messages.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
              Start a Conversation
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Ask any question about your document and I'll help you find the answers.
            </p>
          </div>
        ) : (
          <>
            {conversation.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} w-full`}
              >
                <div
                  className={`message-bubble ${
                    message.type === 'user' ? 'message-user' : 'message-ai'
                  } max-w-full w-full sm:max-w-[85%]`}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3 w-full">
                    <div className="flex-shrink-0">
                      {message.type === 'user' ? (
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="text-xs sm:text-sm font-medium mb-1">
                        {message.type === 'user' ? 'You' : 'AI Assistant'}
                      </div>
                      <div className="text-xs sm:text-sm break-words overflow-wrap-anywhere">
                        {formatMessage(message.content)}
                      </div>
                      <div className={`text-xs mt-1 sm:mt-2 ${
                        message.type === 'user' ? 'text-blue-100 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isAsking && (
              <div className="flex justify-start">
                <div className="message-bubble message-ai">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-5 w-5" />
                    <div className="flex items-center space-x-2">
                      <Loader className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 chat-form"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <div className="flex space-x-2 sm:space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled
                  ? "Please wait for document processing to complete..."
                  : "Ask a question about your document..."
              }
              disabled={disabled || isAsking}
              rows={2}
              className="input-field resize-none text-sm sm:text-base"
            />
          </div>
          <button
            type="submit"
            disabled={!question.trim() || disabled || isAsking}
            className="btn-primary self-end px-3 sm:px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAsking ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1 sm:space-y-0">
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
          <span className="sm:hidden">Enter to send, Shift+Enter for new line</span>
          <span>{question.length}/1000</span>
        </div>
      </form>
    </div>
  )
}

export default ChatInterface
