import { useEffect, useRef, useState, useCallback } from 'react';
import { useProcessStore } from '@/stores/processStore';
import { useLogStore } from '@/stores/logStore';
import { WSMessage, Process, LogEntry } from '@/types';

interface WebSocketHookOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: WebSocketHookOptions = {}) {
  const {
    url = `ws://${window.location.hostname}:3001/ws`,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const setProcesses = useProcessStore((state) => state.setProcesses);
  const addLog = useLogStore((state) => state.addLog);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnecting(true);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setConnecting(false);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setConnecting(false);
      wsRef.current = null;

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay =
          reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1);
        console.log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
        );
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const handleMessage = useCallback(
    (message: WSMessage) => {
      switch (message.type) {
        case 'PROCESS_LIST_UPDATE': {
          const { processes } = message.data as { processes: Process[] };
          setProcesses(processes);
          break;
        }
        case 'LOG_MESSAGE': {
          const logEntry = message.data as LogEntry;
          addLog(logEntry);
          break;
        }
        case 'PROCESS_EVENT': {
          // Process events are handled by PROCESS_LIST_UPDATE
          break;
        }
        case 'CONNECTION_STATUS': {
          // Handle connection status
          break;
        }
        case 'ERROR': {
          const { message: errorMessage } = message.data as { message: string };
          console.error('WebSocket error:', errorMessage);
          break;
        }
        default:
          console.warn('Unknown message type:', message.type);
      }
    },
    [setProcesses, addLog]
  );

  const sendMessage = useCallback((message: Omit<WSMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          ...message,
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only connect once on mount

  return {
    connected,
    connecting,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
