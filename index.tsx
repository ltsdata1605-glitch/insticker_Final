import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Mounts the application to a given DOM element.
 * This function can be imported and used by a host application to embed this app.
 * @param {HTMLElement} element The DOM element to mount the application into.
 */
export function mount(element: HTMLElement): void {
  const root = ReactDOM.createRoot(element);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// To allow the app to run standalone, we check for a 'root' element
// and mount the app automatically if it exists.
const rootElement = document.getElementById('root');
if (rootElement) {
  mount(rootElement);
} else {
  // If no 'root' element is found, we assume the app is being used as a module.
  // The host application is then responsible for calling the `mount` function.
  console.info(
    'Product Sticker App module loaded. Call the exported `mount(element)` function to render the application.'
  );
}
