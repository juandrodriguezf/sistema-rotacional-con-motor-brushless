import { useState, useRef, useCallback } from 'react';

const BAUD_RATE = 115200;

export default function useSerial({ onData }) {
  const [isConnected, setIsConnected] = useState(false);
  const [portInfo, setPortInfo] = useState(null);
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const readLoopRef = useRef(false);
  const bufferRef = useRef('');

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      alert('Web Serial API no es soportada en este navegador.\nUsa Google Chrome o Microsoft Edge.');
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: BAUD_RATE });

      portRef.current = port;
      writerRef.current = port.writable.getWriter();

      const info = port.getInfo();
      setPortInfo(info);
      setIsConnected(true);
      readLoopRef.current = true;

      // Start reading
      const decoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();
      readerRef.current = { reader, readableStreamClosed };

      (async () => {
        try {
          while (readLoopRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              bufferRef.current += value;
              const lines = bufferRef.current.split('\n');
              // Keep the last incomplete line in the buffer
              bufferRef.current = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.replace('\r', '').trim();
                if (trimmed) {
                  onData(trimmed);
                }
              }
            }
          }
        } catch (err) {
          if (readLoopRef.current) {
            console.error('Serial read error:', err);
          }
        }
      })();

    } catch (err) {
      console.error('Connection error:', err);
    }
  }, [onData]);

  const disconnect = useCallback(async () => {
    readLoopRef.current = false;

    try {
      if (readerRef.current) {
        await readerRef.current.reader.cancel();
        await readerRef.current.readableStreamClosed.catch(() => {});
        readerRef.current = null;
      }
      if (writerRef.current) {
        writerRef.current.releaseLock();
        writerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }

    bufferRef.current = '';
    setIsConnected(false);
    setPortInfo(null);
  }, []);

  const send = useCallback(async (text) => {
    if (writerRef.current) {
      const encoder = new TextEncoder();
      await writerRef.current.write(encoder.encode(text));
    }
  }, []);

  return { isConnected, portInfo, connect, disconnect, send };
}
