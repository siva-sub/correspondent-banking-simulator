import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <MantineProvider
            defaultColorScheme="light"
            theme={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                headings: { fontFamily: 'DM Sans, sans-serif' },
                fontFamilyMonospace: 'JetBrains Mono, monospace',
            }}
        >
            <App />
        </MantineProvider>
    </StrictMode>
);
