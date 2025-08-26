#!/usr/bin/env node

// Set environment defaults for terminal automation
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.TERM = process.env.TERM || 'xterm-256color';

// Dynamic import to support ES modules
const { createServer } = await import('../dist/server.js');

// Create and start the InTerm server
const server = createServer();
server.run().catch(console.error);