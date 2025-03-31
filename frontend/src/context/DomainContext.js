import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { arrayToPathString, pathStringToArray, getCurrentDomainFromPath } from '../utils/pathUtils';
import { saveDomainState, loadDomainState, clearDomainState } from '../utils/dbService';

// Initial state
const initialState = {
  domains: {
    items: [],  // Empty default array instead of example domains
    children: {}
  },
  currentPath: [],
  documents: {},
  loading: false,
  error: null,
  config: {
    maxDepth: 10  // Maximum allowed depth for hierarchy
  }
};

// Action types
const ADD_DOMAIN = 'ADD_DOMAIN';
const ADD_SUBDOMAIN = 'ADD_SUBDOMAIN';
const SET_PATH = 'SET_PATH';
const ADD_DOCUMENT = 'ADD_DOCUMENT';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';
const SET_CONFIG = 'SET_CONFIG';
const RESET_DATA = 'RESET_DATA';
const SET_INITIAL_DOMAINS = 'SET_INITIAL_DOMAINS';
const CLEAR_DOCUMENTS = 'CLEAR_DOCUMENTS';

// Reducer function
const domainReducer = (state, action) => {
  switch (action.type) {
    case SET_INITIAL_DOMAINS:
      // Completely replace the initial domains with the provided ones
      return {
        ...state,
        domains: {
          ...state.domains,
          items: action.payload
        }
      };

    case CLEAR_DOCUMENTS:
      return {
        ...state,
        documents: {}
      };

    case ADD_DOMAIN:
      if (state.domains.items.includes(action.payload)) {
        return state; // Don't add duplicates
      }
      return {
        ...state,
        domains: {
          ...state.domains,
          items: [...state.domains.items, action.payload]
        }
      };
    
    case ADD_SUBDOMAIN:
      const { parentPath, subdomain } = action.payload;
      const updatedChildren = { ...state.domains.children };
      
      if (!updatedChildren[parentPath]) {
        updatedChildren[parentPath] = [];
      }
      
      if (!updatedChildren[parentPath].includes(subdomain)) {
        updatedChildren[parentPath] = [...updatedChildren[parentPath], subdomain];
      }
      
      return {
        ...state,
        domains: {
          ...state.domains,
          children: updatedChildren
        }
      };
      
    case SET_PATH:
      return {
        ...state,
        currentPath: action.payload
      };
      
    case ADD_DOCUMENT:
      const { path, document } = action.payload;
      const updatedDocuments = { ...state.documents };
      
      if (!updatedDocuments[path]) {
        updatedDocuments[path] = [];
      }
      
      // Check if document with same name already exists
      const documentExists = updatedDocuments[path].some(
        doc => doc.name === document.name
      );
      
      if (!documentExists) {
        updatedDocuments[path] = [
          ...updatedDocuments[path],
          document
        ];
      }
      
      return {
        ...state,
        documents: updatedDocuments
      };
      
    case SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
      
    case SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
      
    case SET_CONFIG:
      return {
        ...state,
        config: {
          ...state.config,
          ...action.payload
        }
      };
      
    case RESET_DATA:
      return {
        ...initialState,
        config: state.config, // Preserve user configuration
        domains: {
          items: [],  // Explicitly set to empty array
          children: {}
        }
      };
      
    default:
      return state;
  }
};

// Create context
const DomainContext = createContext();

// Context provider component
export const DomainProvider = ({ children }) => {
  const [state, dispatch] = useReducer(domainReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Load state from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedState = await loadDomainState();
        
        if (savedState && savedState.domains && Array.isArray(savedState.domains.items) && savedState.domains.items.length >= 3) {
          console.log('Loaded state from IndexedDB:', savedState);
          
          // Restore root domains if they exist
          dispatch({
            type: SET_INITIAL_DOMAINS,
            payload: savedState.domains.items
          });
          
          // Restore subdomains
          if (savedState.domains.children) {
            Object.keys(savedState.domains.children).forEach(path => {
              savedState.domains.children[path].forEach(subdomain => {
                dispatch({
                  type: ADD_SUBDOMAIN,
                  payload: { parentPath: path, subdomain }
                });
              });
            });
          }
          
          // Restore documents
          if (savedState.documents) {
            Object.keys(savedState.documents).forEach(path => {
              savedState.documents[path].forEach(doc => {
                dispatch({
                  type: ADD_DOCUMENT,
                  payload: { path, document: doc }
                });
              });
            });
          }
          
          // Restore config
          if (savedState.config) {
            dispatch({
              type: SET_CONFIG,
              payload: savedState.config
            });
          }
        } else {
          console.log('No valid saved state found in IndexedDB, will show splash page');
          // Clear any invalid state
          await clearDomainState();
        }
      } catch (error) {
        console.error('Error loading from IndexedDB:', error);
        dispatch({
          type: SET_ERROR,
          payload: 'Failed to load saved data. Starting with default settings.'
        });
        // Clear any corrupted state
        await clearDomainState();
      } finally {
        setIsInitialized(true);
      }
    };
    
    loadData();
  }, []);
  
  // Save state to IndexedDB on changes
  useEffect(() => {
    if (isInitialized) {
      const stateToSave = {
        domains: state.domains,
        documents: state.documents,
        config: state.config
      };
      
      saveDomainState(stateToSave)
        .then(success => {
          if (!success) {
            console.warn('Failed to save domain state to IndexedDB');
          }
        });
    }
  }, [state.domains, state.documents, state.config, isInitialized]);
  
  // Helper functions
  const getPathString = (path = state.currentPath) => {
    return arrayToPathString(path);
  };
  
  const getCurrentDomain = () => {
    return getCurrentDomainFromPath(state.currentPath);
  };
  
  const getCurrentDomains = () => {
    if (state.currentPath.length === 0) {
      return state.domains.items || [];
    } else {
      const parentPath = getPathString();
      return state.domains.children[parentPath] || [];
    }
  };
  
  const getCurrentDocuments = () => {
    const pathString = getPathString();
    return state.documents[pathString] || [];
  };
  
  // Check if a domain already exists at the current path
  const domainExists = (domain) => {
    const currentDomains = getCurrentDomains();
    return currentDomains.includes(domain);
  };
  
  // Check if current depth exceeds maximum allowed depth
  const canAddMoreLevels = () => {
    return state.currentPath.length < state.config.maxDepth;
  };
  
  // Action creators
  const addDomain = (domain) => {
    if (domain && !domainExists(domain)) {
      dispatch({
        type: ADD_DOMAIN,
        payload: domain
      });
    }
  };
  
  const addSubdomain = (subdomain) => {
    if (
      subdomain && 
      getCurrentDomain() && 
      canAddMoreLevels() && 
      !domainExists(subdomain)
    ) {
      const parentPath = getPathString();
      dispatch({
        type: ADD_SUBDOMAIN,
        payload: { parentPath, subdomain }
      });
    }
  };
  
  const setPath = (path) => {
    dispatch({
      type: SET_PATH,
      payload: path
    });
  };
  
  const navigateTo = (level) => {
    if (level === 0) {
      setPath([]);
    } else {
      setPath(state.currentPath.slice(0, level));
    }
  };
  
  const selectDomain = (domain) => {
    setPath([...state.currentPath, domain]);
  };
  
  const addDocument = (name, content) => {
    const path = getPathString();
    dispatch({
      type: ADD_DOCUMENT,
      payload: {
        path,
        document: { name, content }
      }
    });
  };
  
  const setLoading = (loading) => {
    dispatch({
      type: SET_LOADING,
      payload: loading
    });
  };
  
  const setError = (error) => {
    dispatch({
      type: SET_ERROR,
      payload: error
    });
  };
  
  const setConfig = (config) => {
    dispatch({
      type: SET_CONFIG,
      payload: config
    });
  };
  
  const resetData = async () => {
    await clearDomainState();
    dispatch({ type: RESET_DATA });
  };
  
  // New function to set initial domains from splash page
  const setInitialDomains = (domains) => {
    if (Array.isArray(domains) && domains.length >= 3) {
      dispatch({
        type: SET_INITIAL_DOMAINS,
        payload: domains
      });
    } else {
      console.error('Invalid domains array. Must provide at least 3 domains.');
      setError('Invalid domains. Please provide at least 3 domains.');
    }
  };
  
  return (
    <DomainContext.Provider value={{
      // State
      currentPath: state.currentPath,
      domains: state.domains,
      documents: state.documents,
      loading: state.loading,
      error: state.error,
      config: state.config,
      isInitialized,
      
      // Helper functions
      getPathString,
      getCurrentDomain,
      getCurrentDomains,
      getCurrentDocuments,
      domainExists,
      canAddMoreLevels,
      
      // Actions
      addDomain,
      addSubdomain,
      setPath,
      navigateTo,
      selectDomain,
      addDocument,
      setLoading,
      setError,
      setConfig,
      resetData,
      setInitialDomains,
      clearDocuments: () => dispatch({ type: CLEAR_DOCUMENTS })
    }}>
      {children}
    </DomainContext.Provider>
  );
};

// Custom hook for using the domain context
export const useDomains = () => {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error('useDomains must be used within a DomainProvider');
  }
  return context;
};