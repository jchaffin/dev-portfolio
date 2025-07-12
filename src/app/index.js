import React from 'react';
import App from "./components/App";
import {createRoot} from 'react-dom/client';
import './style.css'

let container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
	