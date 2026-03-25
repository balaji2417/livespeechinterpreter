import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import reportWebVitals from './reportWebVitals';
// Add this at the very top of index.js, before other imports
const link = document.createElement('link');
link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/dist/tailwind.min.css';
link.rel = 'stylesheet';
document.head.appendChild(link);
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
