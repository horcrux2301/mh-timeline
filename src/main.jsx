import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Function to check if the page is loaded inside an iframe
const isInsideIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If we can't access window.top due to same-origin policy,
    // we're definitely inside an iframe
    return true;
  }
};

// Get the root element
const rootElement = document.getElementById("root");

// Only render the app if it's inside an iframe
const shouldDisplay = () => {
  return isInsideIframe();
};

if (shouldDisplay()) {
  // Render the app normally
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  // If not in an iframe, show an error message directing to upsckata.com
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h2>Error</h2>
      <p>To view this website, please go to <a href="https://upsckata.com" target="_blank">upsckata.com</a></p>
    </div>
  `;
}
