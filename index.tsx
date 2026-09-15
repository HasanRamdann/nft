
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Removing StrictMode because @hello-pangea/dnd (and react-beautiful-dnd)
// has known compatibility issues with StrictMode in React 18+,
// which often leads to the 'useId' or dispatcher null errors during double-mount.
root.render(<App />);
