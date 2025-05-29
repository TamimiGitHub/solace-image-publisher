// /Users/tamimi/hack/image_publisher/demo/src/components/SolaceClient.js
import { useEffect, useState, useCallback } from 'react';
import solace from 'solclientjs';

// Initialize Solace client factory outside of the component
const factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);
solace.SolclientFactory.setLogLevel(solace.LogLevel.INFO);

/**
 * Cleans and processes binary data for proper base64 encoding
 * @param {string|ArrayBuffer|Uint8Array} binaryData - The binary data to process
 * @returns {string} - Cleaned base64 string
 */
const processBinaryData = (binaryData) => {
  let base64Data;
  
  // For solclientjs, binary attachments are typically returned as strings
  if (typeof binaryData === 'string') {
    // Use the string directly - it should already be base64 encoded from the Python publisher
    base64Data = binaryData;
    
    // Remove any whitespace or newlines that might be in the data
    base64Data = base64Data.replace(/\s/g, '');
    
    // Check for known prefixes that need to be removed
    if (base64Data.startsWith('Kn/9j/')) {
      // The 'Kn' prefix needs to be removed to get a valid JPEG base64 string
      base64Data = base64Data.substring(2);
      console.log('Removed prefix "Kn" from base64 data');
    }
    
    // Handle URL-encoded characters if present
    if (base64Data.includes('%')) {
      try {
        base64Data = decodeURIComponent(base64Data);
        console.log('Decoded URL-encoded characters in base64 data');
      } catch (decodeErr) {
        console.log('Failed to decode URL-encoded characters:', decodeErr);
        // Continue with the data as-is if decoding fails
      }
    }

    // Look for JPEG header marker somewhere in the data
    const jpegHeaderIndex = base64Data.indexOf('/9j/');
    if (jpegHeaderIndex > 0) {
      // Found JPEG header somewhere in the string, but not at the beginning
      // Cut off everything before it
      console.log(`Found JPEG header at position ${jpegHeaderIndex}, truncating data`);
      base64Data = base64Data.substring(jpegHeaderIndex);
    }
    
    // Look for PNG header marker 
    const pngHeaderIndex = base64Data.indexOf('iVBORw0K');
    if (pngHeaderIndex > 0) {
      console.log(`Found PNG header at position ${pngHeaderIndex}, truncating data`);
      base64Data = base64Data.substring(pngHeaderIndex);
    }
    
  } else if (binaryData instanceof ArrayBuffer || binaryData instanceof Uint8Array) {
    // This path is less common but handles binary buffer types
    console.log('Converting ArrayBuffer to base64');
    const bytes = new Uint8Array(binaryData instanceof ArrayBuffer ? binaryData : binaryData.buffer);
    let binary = '';
    const chunkSize = 1024;
    // Process in chunks to avoid call stack errors with large images
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.byteLength));
      binary += String.fromCharCode.apply(null, chunk);
    }
    base64Data = btoa(binary);
  } else {
    // Fallback for other types
    console.log('Using fallback string conversion');
    base64Data = String(binaryData);
  }
  
  return base64Data;
};

// Default configuration
const defaultConfig = {
  url: 'ws://localhost:8008',
  vpnName: 'default',
  userName: 'default',
  password: 'default',
  topicName: 'solace/images/>'
};

// Local storage key for saving config
const STORAGE_KEY = 'solace_image_viewer_config';

// Load stored configuration from localStorage
const loadStoredConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error loading stored config:', err);
  }
  return defaultConfig;
};

// Save configuration to localStorage
const saveConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving config:', err);
  }
};

const useSolaceClient = (props) => {
  // Merge props with stored config or defaults
  const config = {
    ...defaultConfig,
    ...loadStoredConfig(),
    ...props
  };

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  // Save the current config whenever it changes
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // Function to handle message reception
  const handleMessage = useCallback((message) => {
    if (message && message.getBinaryAttachment()) {
      try {
        // Get message binary attachment (could be string or binary)
        const binaryData = message.getBinaryAttachment();
        console.log('Binary attachment received:', binaryData);
        console.log('Binary attachment type:', typeof binaryData);
        
        // Process the binary data using our utility function
        const base64Data = processBinaryData(binaryData);
        
        // Don't log the entire base64 string as it can be very large
        console.log('Base64 data length:', base64Data.length);
        if (base64Data.length > 0) {
          console.log('First 30 chars:', base64Data.substring(0, 30));
        }

        // Create image object with just the essential data
        const imgData = {
          id: message.getApplicationMessageId() || `img-${Date.now()}`,
          base64Data,
          timestamp: new Date().toISOString(),
        };

        // Pass the image data to the parent component
        if (props.onMessageReceived) {
          props.onMessageReceived(imgData);
        }
      } catch (err) {
        console.error('Error processing image data:', err);
      }
    }
  }, [props.onMessageReceived]);

  // Function to connect to Solace broker
  const connect = useCallback(() => {
    // Skip if already connected or connecting
    if (session || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Create session properties
      const sessionProperties = {
        url: config.url,
        vpnName: config.vpnName,
        userName: config.userName,
        password: config.password,
        connectRetries: 1,
        reconnectRetries: 1,
        connectTimeoutInMsecs: 5000,
        reconnectRetryWaitInMsecs: 1000,
      };

      console.log('Connecting with properties:', sessionProperties);

      // Create and setup session
      const solaceSession = solace.SolclientFactory.createSession(sessionProperties);

      // Session event handlers
      solaceSession.on(solace.SessionEventCode.UP_NOTICE, () => {
        console.log('Connected to Solace message router.');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        setSession(solaceSession);

        // Subscribe to topic
        try {
          solaceSession.subscribe(
            solace.SolclientFactory.createTopicDestination(config.topicName),
            true,
            config.topicName,
            10000
          );
          console.log(`Subscribed to topic: ${config.topicName}`);
        } catch (err) {
          console.error('Error subscribing to topic:', err);
          setError(`Failed to subscribe: ${err.message}`);
        }
      });

      solaceSession.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (event) => {
        console.error('Connection failed:', event.infoStr);
        setError(`Connection failed: ${event.infoStr}`);
        setIsConnecting(false);
        setIsConnected(false);
      });

      solaceSession.on(solace.SessionEventCode.DISCONNECTED, () => {
        console.log('Disconnected from Solace message router.');
        setIsConnected(false);
        setSession(null);
      });

      solaceSession.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, (event) => {
        console.error('Subscription error:', event.infoStr);
        setError(`Subscription error: ${event.infoStr}`);
      });

      solaceSession.on(solace.SessionEventCode.MESSAGE, (message) => {
        try {
          console.log('Received message on topic:', message.getDestination().getName());
          // Log additional message details to help with debugging
          console.log('Message ID:', message.getApplicationMessageId());
          
          // Try to detect if the message has binary content
          if (message.getBinaryAttachment()) {
            console.log('Message has binary attachment');
            const binaryData = message.getBinaryAttachment();
            if (binaryData && typeof binaryData === 'string') {
              console.log('Binary attachment preview (first 30 chars):', 
                binaryData.substring(0, 30));
            }
          } else {
            console.log('Message has no binary attachment');
          }
          
          handleMessage(message);
        } catch (err) {
          console.error('Error processing message:', err);
        }
      });

      // Connect to broker
      console.log('Initiating connection to Solace message router...');
      solaceSession.connect();

    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [config.url, config.vpnName, config.userName, config.password, config.topicName, handleMessage, session, isConnecting, props.onMessageReceived]);

  // Function to manually disconnect
  const disconnect = useCallback(() => {
    if (session) {
      try {
        // Check if the session is connected (property, not a function)
        if (session.isConnected) {
          session.unsubscribe(
            solace.SolclientFactory.createTopicDestination(config.topicName),
            true,
            config.topicName,
            10000
          );
          session.disconnect();
        }
        setSession(null);
        setIsConnected(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to disconnect');
      }
    }
  }, [session, config.topicName]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (session && session.isConnected) {
        try {
          session.unsubscribe(
            solace.SolclientFactory.createTopicDestination(config.topicName),
            true,
            config.topicName,
            10000
          );
          session.disconnect();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, [session, config.topicName]);

  return { 
    isConnected, 
    isConnecting, 
    error, 
    connect,
    disconnect 
  };
};

export default useSolaceClient;
