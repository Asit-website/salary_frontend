import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={{
        token: {
          colorPrimary: "#2563eb", // modern blue
          borderRadius: 8,
          fontSize: 14,
        }
      }}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
