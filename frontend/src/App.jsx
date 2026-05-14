import { useEffect, useRef, useState } from "react";
import api from "./api";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [email, setEmail] = useState("");

  const bottomRef = useRef(null);

  const welcomeMessage = {
    sender: "bot",
    text: `Welcome to YumBot

Select 1 to Place an order
Select 99 to checkout order
Select 98 to see order history
Select 97 to see current order
Select 0 to cancel order`
  };

  useEffect(() => {
    const savedMessages = localStorage.getItem("foodie_chat");

    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);

      if (parsed.length > 0) {
        setMessages(parsed);
      } else {
        setMessages([welcomeMessage]);
      }
    } else {
      setMessages([welcomeMessage]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("foodie_chat", JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");

    if (!reference) return;

    const alreadyVerified = sessionStorage.getItem(`verified_${reference}`);

    if (!alreadyVerified) {
      sessionStorage.setItem(`verified_${reference}`, "true");
      verifyPayment(reference);
    }
  }, []);

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  const sendMessage = async (forcedValue = null) => {
    const userInput = forcedValue || input.trim();

    if (!userInput) return;

    const displayText = userInput === "start_order" ? "1" : userInput;

    addMessage("user", displayText);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/chat", {
        message: userInput
      });

      addMessage("bot", response.data.reply);

      if (response.data.checkout) {
        setShowPayment(true);
      }
    } catch (error) {
      addMessage("bot", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startPayment = async () => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      addMessage("bot", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/payment/init", {
        email
      });

      window.location.href = response.data.authorizationUrl;
    } catch (error) {
      addMessage(
        "bot",
        error.response?.data?.message || "Payment initialization failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference) => {
    setLoading(true);

    try {
      const response = await api.get(`/payment/verify?reference=${reference}`);

      addMessage("bot", response.data.message);

      window.history.replaceState({}, document.title, "/");
      setShowPayment(false);
    } catch (error) {
      addMessage("bot", "Payment verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  const resetChat = () => {
    localStorage.removeItem("foodie_chat");
    setMessages([welcomeMessage]);
    setShowPayment(false);
    setEmail("");
  };

  const quickSend = (value) => {
    sendMessage(value);
  };

  return (
    <div className="app">
      <div className="chat-card">
        <div className="chat-header">
          <div className="header-text">
            <h2>Yumbot</h2>
            <p>Nigerian food ordering assistant</p>
          </div>

          <button onClick={resetChat} className="reset-btn">
            Reset
          </button>
        </div>

        <div className="chat-body">
          {messages.map((msg, index) => (
            <div key={index} className={`message-row ${msg.sender}`}>
              <div className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row bot">
              <div className="message bot">Typing...</div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        {showPayment && (
          <div className="payment-box">
            <input
              type="email"
              placeholder="Enter email for Paystack payment"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button onClick={startPayment}>
              Pay with Paystack
            </button>
          </div>
        )}

        <div className="quick-actions">
          <button onClick={() => quickSend("start_order")}>🍽️ Order</button>
          <button onClick={() => quickSend("97")}>🧾 Current</button>
          <button onClick={() => quickSend("99")}>💳 Checkout</button>
          <button onClick={() => quickSend("98")}>📜 History</button>
          <button onClick={() => quickSend("0")}>🚫 Cancel</button>
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a number..."
          />

          <button onClick={() => sendMessage()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}