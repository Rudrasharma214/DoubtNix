import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { uploadAPI, doubtAPI } from "../services/api";
import ChatInterface from "../components/ChatInterface";
import DocumentInfo from "../components/DocumentInfo";
import SuggestedQuestions from "../components/SuggestedQuestions";
import { ArrowLeft, Loader, AlertCircle } from "lucide-react";

const DocumentPage = () => {
  const params = useParams();
  const documentId = params.documentId;
  const navigate = useNavigate();

  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === "development") {
    console.log("DocumentPage - useParams() result:", params);
    console.log(
      "DocumentPage - documentId extracted:",
      documentId,
      "Type:",
      typeof documentId
    );
  }
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId] = useState(() => {
    // Ensure documentId is a string
    const docId = String(documentId || "unknown");

    // Try to get existing session ID from localStorage for this document
    const storageKey = `session_${docId}`;
    const existingSessionId = localStorage.getItem(storageKey);

    if (existingSessionId) {
      return existingSessionId;
    }

    // Create new session ID and store it
    const newSessionId = `s_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;
    localStorage.setItem(storageKey, newSessionId);
    return newSessionId;
  });
  const [conversation, setConversation] = useState({ messages: [] });
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    // Only load document if we have a valid documentId
    if (
      documentId &&
      typeof documentId === "string" &&
      documentId !== "undefined"
    ) {
      loadDocument();
    } else {
      console.error("Invalid documentId in useEffect:", documentId);
      setError("Invalid document ID");
      setLoading(false);
    }

    // Cleanup function to remove session from localStorage when component unmounts
    return () => {
      // Optional: You can choose to keep the session or clear it
      // localStorage.removeItem(`session_${documentId}`)
    };
  }, [documentId]);

  useEffect(() => {
    if (document && document.processingStatus === "completed") {
      loadSuggestedQuestions();
      loadConversationHistory();
    }
  }, [document]);

  const loadConversationHistory = async () => {
    try {
      const docId = String(documentId);
      const response = await doubtAPI.getConversationHistory(docId, sessionId);
      if (response.success && response.data.messages) {
        setConversation({ messages: response.data.messages });
      }
    } catch (error) {
      // If no conversation exists yet, that's fine - start with empty conversation
      console.log("No previous conversation found, starting fresh");
    }
  };

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      // Debug logging (can be removed in production)
      if (process.env.NODE_ENV === "development") {
        console.log(
          "DocumentPage - Loading document with ID:",
          documentId,
          "Type:",
          typeof documentId
        );
      }

      // Ensure documentId is a string
      const docId = String(documentId);
      if (
        !docId ||
        docId === "undefined" ||
        docId === "null" ||
        docId === "unknown"
      ) {
        throw new Error(
          `Invalid document ID: ${docId}. Please navigate to this page from a valid document link.`
        );
      }

      const response = await uploadAPI.getDocumentStatus(docId);
      setDocument(response.data);

      // If document is still processing, poll for updates
      if (response.data.processingStatus === "processing") {
        pollDocumentStatus();
      }
    } catch (error) {
      console.error("Error loading document:", error);
      setError(error.message);
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const pollDocumentStatus = () => {
    const interval = setInterval(async () => {
      try {
        const docId = String(documentId);
        const response = await uploadAPI.getDocumentStatus(docId);
        setDocument(response.data);

        if (response.data.processingStatus !== "processing") {
          clearInterval(interval);
          if (response.data.processingStatus === "completed") {
            toast.success("Document processing completed!");
            loadSuggestedQuestions();
          } else if (response.data.processingStatus === "failed") {
            toast.error("Document processing failed");
          }
        }
      } catch (error) {
        console.error("Error polling document status:", error);
        clearInterval(interval);
      }
    }, 3000); // Poll every 3 seconds

    // Clean up interval after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  const loadSuggestedQuestions = async () => {
    try {
      setLoadingSuggestions(true);
      const docId = String(documentId);
      const response = await doubtAPI.getSuggestedQuestions(docId);
      setSuggestedQuestions(response.data.suggestions || []);
    } catch (error) {
      console.error("Error loading suggested questions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAskQuestion = async (question) => {
    try {
      // Add user message to conversation immediately
      const userMessage = {
        type: "user",
        content: question,
        timestamp: new Date(),
      };

      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Send question to API
      const docId = String(documentId);
      console.log("Sending question:", {
        documentId: docId,
        question,
        sessionId,
      });
      const response = await doubtAPI.askDoubt(docId, question, sessionId);

      // Add AI response to conversation
      const aiMessage = {
        type: "ai",
        content: response.data.answer,
        timestamp: new Date(response.data.timestamp),
      };

      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
      }));
    } catch (error) {
      console.error("Error asking question:", error);
      toast.error(error.message || "Failed to get answer");

      // Remove the user message if there was an error
      setConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -1),
      }));
    }
  };

  const handleSuggestedQuestion = (question) => {
    handleAskQuestion(question);
  };

  const handleClearChat = async () => {
    try {
      // Clear the conversation in the UI immediately
      setConversation({ messages: [] });

      // If there's a conversation ID, delete it from the backend
      if (conversation.messages.length > 0) {
        // We need to find the conversation ID first
        // For now, we'll just clear the localStorage session
        const docId = String(documentId);
        localStorage.removeItem(`session_${docId}`);

        // Generate a new session ID
        const newSessionId = `s_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 6)}`;
        localStorage.setItem(`session_${docId}`, newSessionId);

        toast.success("Conversation cleared successfully");
      }
    } catch (error) {
      console.error("Error clearing conversation:", error);
      toast.error("Failed to clear conversation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Document
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => navigate("/")} className="btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Document Not Found
        </h3>
        <p className="text-gray-600 mb-4">
          The document you're looking for doesn't exist or has been deleted.
        </p>
        <button onClick={() => navigate("/")} className="btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </button>
      </div>

      {/* Document Info */}
      <DocumentInfo document={document} />

      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="rounded-lg p-4 text-sm border 
                  bg-yellow-50 border-yellow-200 text-yellow-900 
                  dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-100"
        >
          <strong>Debug Info:</strong> Processing Status:{" "}
          {document.processingStatus},<br />
          Messages: {conversation.messages.length},<br />
          Chat Disabled:{" "}
          {document.processingStatus !== "completed" ? "Yes" : "No"}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Chat Interface */}
        <div className="w-full">
          <ChatInterface
            conversation={conversation}
            onAskQuestion={handleAskQuestion}
            onClearChat={handleClearChat}
            disabled= {document.processingStatus !== "completed"}
          />
        </div>

        {/* Suggested Questions */}
       {document.processingStatus === "completed" && (
          <div className="w-full max-w-md">
            <SuggestedQuestions
              questions={suggestedQuestions}
              loading={loadingSuggestions}
              onQuestionClick={handleSuggestedQuestion}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPage;
