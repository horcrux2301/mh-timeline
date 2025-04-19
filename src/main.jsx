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

// Only render the app if it's inside an iframe or if the URL has a parameter to force display
// e.g., ?display=true
const shouldDisplay = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const forceDisplay = urlParams.get("display") === "true";
  return isInsideIframe() || forceDisplay;
};

if (shouldDisplay()) {
  // Render the app normally
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  // If not in an iframe and not forced to display, show a message
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h2>Modern India Timeline</h2>
      <p>This content is designed to be embedded as an iframe.</p>
      <p>To view it directly, <a href="?display=true">click here</a>.</p>
      <h3>Embed Code:</h3>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; overflow: auto; max-width: 600px; margin: 0 auto;">
&lt;iframe 
  src="${window.location.href.split("?")[0]}" 
  width="100%" 
  height="800" 
  frameborder="0" 
  allowfullscreen
&gt;&lt;/iframe&gt;</pre>
    </div>
  `;
}
