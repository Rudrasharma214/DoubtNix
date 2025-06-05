import React from 'react'
import { HelpCircle, Loader, Lightbulb } from 'lucide-react'

const SuggestedQuestions = ({ questions, loading, onQuestionClick }) => {
  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Suggested Questions
        </h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-12"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Suggested Questions
        </h3>
        <div className="text-center py-6">
          <HelpCircle className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No suggested questions available for this document.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Suggested Questions
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Click on any question to get started with your document analysis.
      </p>

      <div className="space-y-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-200 group"
          >
            <div className="flex items-start space-x-3">
              <HelpCircle className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                {question}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start space-x-2">
          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-300 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-100">
            <p className="font-medium">Tip:</p>
            <p>
              These questions are generated based on your document content to help you get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuggestedQuestions
