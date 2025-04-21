import { WebSocketServer } from "ws";
import fs from "fs"; // Import the file system module

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();
const chatLogFile = "chat.log"; // File where messages will be stored

// Function to save a message to the chat log file
function saveMessage(name, content) {
  const timestamp = new Date().toISOString();
  const message = { name, timestamp, content };
  fs.appendFile(chatLogFile, JSON.stringify(message) + "\n", (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    }
  });
}

// Function to load chat history from the file
function loadHistory() {
  try {
    const data = fs.readFileSync(chatLogFile, "utf8");
    return data
      .split("\n")
      .filter((line) => line.trim() !== "") // Remove empty lines
      .map((line) => JSON.parse(line)); // Parse each line as JSON
  } catch (err) {
    if (err.code === "ENOENT") {
      return []; // File doesn’t exist yet, return empty history
    }
    console.error("Error reading file:", err);
    return [];
  }
}

// WebSocket server logic
wss.on("connection", (ws) => {
  clients.set(ws, null);
  console.log("New client connected.");

  ws.on("message", (message) => {
    const messageStr = message.toString();
    try {
      const data = JSON.parse(messageStr);
      if (data.type === "join") {
        const name = data.name;
        clients.set(ws, name);
        console.log(`Client joined with name: ${name}`);

        // Send chat history to the newly joined client
        const history = loadHistory();
        history.forEach((msg) => {
          ws.send(`${msg.name}: ${msg.content}`);
        });
      } else if (data.type === "message") {
        const name = clients.get(ws);
        if (name) {
          // Save the message before broadcasting
          saveMessage(name, data.content);

          const broadcastMessage = `${name}: ${data.content}`;
          // Broadcast the message to all other clients
          for (let [client, clientName] of clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(broadcastMessage);
            }
          }
        }
      }
    } catch (error) {
      console.error("Invalid message received:", messageStr);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("Client disconnected.");
  });
});

console.log("WebSocket server running on ws://localhost:8080");
