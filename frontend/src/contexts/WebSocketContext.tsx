import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

interface WebSocketContextType {
  isConnected: boolean
  lastMessage: WebSocketMessage | null
  sendMessage: (message: any) => void
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  const connect = () => {
    if (!isAuthenticated || !token) {
      return
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      
      // Use environment variable or fallback to localhost
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
      const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`
      
      wsRef.current = new WebSocket(wsUrlWithToken)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        
        // Send initial heartbeat
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }))
        }
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Handle different message types
          switch (message.type) {
            case 'alarm':
              if (message.data.severity === 'critical') {
                toast.error(`Critical Alert: ${message.data.message}`, {
                  duration: 6000,
                })
              } else if (message.data.severity === 'warning') {
                toast.error(`Warning: ${message.data.message}`, {
                  duration: 4000,
                })
              }
              break
              
            case 'ml_alert':
              toast(`ML Prediction: ${message.data.fault_type}`, {
                icon: '🤖',
                duration: 5000,
              })
              break
              
            case 'system_notification':
              toast(message.data.message, {
                icon: '🔔',
              })
              break
              
            case 'command_response':
              if (message.data.success) {
                toast.success(`Command executed: ${message.data.command}`)
              } else {
                toast.error(`Command failed: ${message.data.error}`)
              }
              break
              
            case 'heartbeat':
              // Silent heartbeat handling
              break
              
            default:
              console.log('Received WebSocket message:', message)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay * reconnectAttemptsRef.current)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionStatus('error')
          toast.error('WebSocket connection failed. Please refresh the page.')
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setConnectionStatus('error')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User logout')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
    reconnectAttemptsRef.current = 0
  }

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }))
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message)
      toast.error('Connection lost. Please refresh the page.')
    }
  }

  useEffect(() => {
    if (isAuthenticated && token) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, token])

  // Heartbeat interval
  useEffect(() => {
    if (!isConnected) return

    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'heartbeat' })
      }
    }, 30000) // Send heartbeat every 30 seconds

    return () => clearInterval(heartbeatInterval)
  }, [isConnected])

  const value: WebSocketContextType = {
    isConnected,
    lastMessage,
    sendMessage,
    connectionStatus,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}