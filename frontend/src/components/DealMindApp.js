import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import CategorySection from './CategorySection';
import ResultsTable from './ResultsTable';
import LogsPanel from './LogsPanel';

const DealMindApp = () => {
  // State management - mirrors Gradio state
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'error', 'success', 'warning'
  const [searchResults, setSearchResults] = useState([]);
  const [logs, setLogs] = useState([]);

  // WebSocket connection
  const wsRef = useRef(null);
  const logsContainerRef = useRef(null);
  
  // POLLING REFS - Prevent memory leaks
  const pollIntervalRef = useRef(null);
  const pollTimeoutRef = useRef(null);

  // Base API URL. For production build, set REACT_APP_API_BASE to your deployed API (e.g. https://your-app.onrender.com).
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

  const addLog = useCallback((message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    setLogs((prevLogs) => [...prevLogs.slice(-49), { message: formattedMessage, level }]);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setStatusMessage('Error loading categories');
      setStatusType('error');
    }
  }, [API_BASE]);

  const setupWebSocket = useCallback(() => {
    const wsUrl = `${API_BASE.replace('http', 'ws')}/ws/logs`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      addLog('Connected to DealMind AI logs', 'info');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'log') {
          addLog(message.data.formatted_message, (message.data.level || 'info').toLowerCase());
        } else if (message.type === 'status') {
          console.log('Status update:', message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      addLog('Disconnected from logs', 'warning');
    };

    wsRef.current.onerror = () => {
      console.error('WebSocket error');
      addLog('WebSocket connection error', 'error');
    };
  }, [API_BASE, addLog]);

  // Initialize - Load categories and WebSocket on component mount
  useEffect(() => {
    loadCategories();
    setupWebSocket();

    return () => {
      cleanupPolling();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loadCategories, setupWebSocket]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // CLEANUP FUNCTION - Prevent memory leaks
  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  // Handle category selection
  const handleCategoryChange = (categoryName, isChecked) => {
    if (isChecked) {
      if (selectedCategories.length >= 3) {
        setStatusMessage('⚠️ You can select up to 3 categories only.');
        setStatusType('warning');
        return;
      }
      setSelectedCategories(prev => [...prev, categoryName]);
    } else {
      setSelectedCategories(prev => prev.filter(cat => cat !== categoryName));
    }
    
    // Clear status message when categories are changed
    if (statusMessage) {
      setStatusMessage('');
      setStatusType('');
    }
  };

  // Validate categories (mirrors Gradio validation)
  const validateCategories = () => {
    if (selectedCategories.length === 0) {
      setStatusMessage('⚠️ Please select at least one category before running.');
      setStatusType('warning');
      return false;
    }
    if (selectedCategories.length > 3) {
      setStatusMessage('⚠️ You can select up to 3 categories only.');
      setStatusType('warning');
      return false;
    }
    return true;
  };

  // Start deal search (mirrors Gradio button click)
  const handleFindDeals = async () => {
    if (!validateCategories()) {
      return;
    }

    // CLEANUP PREVIOUS POLLING - Prevent multiple polls
    cleanupPolling();

    setIsSearching(true);
    setStatusMessage('Starting deal search...');
    setStatusType('success');
    setSearchResults([]); // Clear previous results
    addLog(`Starting search for categories: ${selectedCategories.join(', ')}`, 'info');

    try {
      // Start search
      const response = await axios.post(`${API_BASE}/api/search`, {
        selected_categories: selectedCategories
      });
      
      const jobId = response.data.job_id;

      setStatusMessage('Search in progress... Please wait');
      setStatusType('success');
      
      // Poll for results with optimized timing
      pollForResults(jobId);
      
    } catch (error) {
      console.error('Error starting search:', error);
      const errorMessage = error.response?.data?.detail || 'Error starting search';
      setStatusMessage(errorMessage);
      setStatusType('error');
      setIsSearching(false);
      addLog(`Error: ${errorMessage}`, 'error');
    }
  };

  // OPTIMIZED POLLING - Smart intervals with exponential backoff
  const pollForResults = async (jobId) => {
    let pollCount = 0;
    const maxPolls = 60; // Maximum 60 polls (6 minutes with final interval)
    
    const poll = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/results/${jobId}`);
        const { status, results, error_message, total_count } = response.data;
        
        if (status === 'completed') {
          cleanupPolling();
          setSearchResults(results);
          setStatusMessage(`Search completed! Found ${total_count} deals.`);
          setStatusType('success');
          setIsSearching(false);
          addLog(`Search completed with ${total_count} results`, 'info');
          return;
        } 
        
        if (status === 'error') {
          cleanupPolling();
          setStatusMessage(error_message || 'Search failed');
          setStatusType('error');
          setIsSearching(false);
          addLog(`Search failed: ${error_message}`, 'error');
          return;
        }
        
        // Continue polling if status is 'running'
        pollCount++;
        
        if (pollCount >= maxPolls) {
          cleanupPolling();
          setStatusMessage('Search timeout - please try again');
          setStatusType('error');
          setIsSearching(false);
          addLog('Search timeout', 'error');
          return;
        }
        
        // SMART INTERVALS - Start fast, then slow down
        let nextInterval;
        if (pollCount <= 5) {
          nextInterval = 3000; // First 5 polls: every 3 seconds (15 seconds total)
        } else if (pollCount <= 15) {
          nextInterval = 5000; // Next 10 polls: every 5 seconds (50 seconds more)
        } else {
          nextInterval = 10000; // Remaining polls: every 10 seconds
        }
        
        pollIntervalRef.current = setTimeout(poll, nextInterval);
        
      } catch (error) {
        console.error('Error polling results:', error);
        cleanupPolling();
        setStatusMessage('Error retrieving results');
        setStatusType('error');
        setIsSearching(false);
        addLog('Error retrieving results', 'error');
      }
    };
    
    // Start first poll immediately
    poll();
  };

  // Handle table row click (mirrors Gradio select)
  const handleRowClick = (index) => {
    console.log('Row clicked:', index);
  };

  return (
    <div className="dealmind-container">
      {/* Header Section - mirrors Gradio gr.Markdown */}
      <div className="header-section">
        <div className="app-title">🏷️ DealSense AI</div>
        <div className="app-subtitle">Multi-Agent AI Hunting & Evaluating the Best Deals Online</div>
      </div>

      {/* Description Section */}
      <div className="app-description">
        🏷️ <strong>DealSense AI, a Multi-Agent System</strong>, fetches deals in real time, predicts fair prices, 
      and filters only the best bargains — smart, fast, and fair. Let AI do the work so you never overpay.
      </div>

      {/* How It Works Section */}
      <div className="how-it-works">
        <h3>🤖 How It Works:</h3>
        <p>
          <strong>1</strong> Choose up to 3 categories to search.<br />
          <strong>2</strong> Click "Find Deals" — AI agents scan feeds, estimate fair prices, and filter top discounts.<br />
          <strong>3</strong> See the best deals in a table with prices, discounts, and direct links.
        </p>
      </div>


      {/* Category Selection */}
      <CategorySection
        categories={categories}
        selectedCategories={selectedCategories}
        isSearching={isSearching}
        onCategoryChange={handleCategoryChange}
      />

      {/* Find Deals Button */}
      <div className="button-section">
        <button
          type="button"
          className="find-deals-btn"
          onClick={handleFindDeals}
          disabled={isSearching}
          aria-busy={isSearching}
          aria-label={isSearching ? 'Searching for deals' : 'Find deals'}
        >
          {isSearching ? (
            <>
              <span className="spinner"></span>
              Searching...
            </>
          ) : (
            '🔍 Find Deals'
          )}
        </button>
      </div>

      {/* Status Message - aria-live for screen readers */}
      {statusMessage && (
        <div
          className={`status-message ${statusType}`}
          role="status"
          aria-live={statusType === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {statusMessage}
        </div>
      )}

      {/* Results Section */}
      <ResultsTable
        searchResults={searchResults}
        isSearching={isSearching}
        onRowClick={handleRowClick}
      />

      {/* Live Agent Logs Section */}
      <LogsPanel logs={logs} logsContainerRef={logsContainerRef} />
    </div>
  );
};

export default DealMindApp;