import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { addPropertyControls, ControlType } from "framer";
import { useState, useEffect } from "react";

interface AIProcessorProps {
    placeholder?: string;
    buttonText?: string;
}

export default function AIProcessor(props: AIProcessorProps) {
    const [input, setInput] = useState("");
    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState("");

    useEffect(() => {
        // Generate a random conversation ID on component mount
        const randomId = Math.random().toString(36).substring(2, 15);
        setConversationId(randomId);
    }, []);

    const handleSubmit = async () => {
        if (!input.trim()) return;

        setIsLoading(true);
        setError("");
        setResult("");

        // Maximum number of retries
        const maxRetries = 3;
        // Initial wait time in milliseconds (1 second)
        const initialWaitTime = 1000;
        let retryCount = 0;
        let waitTime = initialWaitTime;

        while (retryCount <= maxRetries) {
            try {
                const response = await fetch('https://igor-safonov.replit.app/api/process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    mode: 'cors',
                    credentials: 'omit',
                    body: JSON.stringify({ 
                        input: input.trim(),
                        conversation_id: conversationId
                    })
                });

                if (!response.ok) {
                    // If we hit rate limit (429), retry with exponential backoff
                    if (response.status === 429 && retryCount < maxRetries) {
                        retryCount++;
                        
                        // Calculate wait time with exponential backoff: 1s, 2s, 4s
                        waitTime = initialWaitTime * Math.pow(2, retryCount - 1);
                        
                        console.log(`Rate limited (429). Retry ${retryCount}/${maxRetries} after ${waitTime}ms`);
                        
                        // Show user we're retrying
                        setError(`Rate limit reached. Retrying in ${waitTime/1000} seconds... (${retryCount}/${maxRetries})`);
                        
                        // Wait before retrying
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        
                        // Continue to the next iteration of the loop
                        continue;
                    }
                    
                    // For other errors, or if we've exhausted retries, throw an error
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    setResult(data.result);
                } else if (data.status === 'rejected') {
                    setError(`Input rejected: ${data.reason}`);
                } else {
                    setError(data.error || 'An error occurred');
                }
                
                // If we get here, the request was successful, so break out of the retry loop
                break;
                
            } catch (err) {
                console.error('API Error:', err);
                
                // If we've tried the maximum number of times or this isn't a 429 error
                if (retryCount >= maxRetries) {
                    setError(`Failed to connect to the API: ${err.message}. Please try again later.`);
                    break;
                }
                
                // For other unexpected errors, only retry if we haven't reached max
                if (!err.message.includes('429') && retryCount < maxRetries) {
                    retryCount++;
                    waitTime = initialWaitTime * Math.pow(2, retryCount - 1);
                    console.log(`Error encountered. Retry ${retryCount}/${maxRetries} after ${waitTime}ms`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                
                // If this is a non-429 error and we've tried the maximum times, give up
                setError(`Failed to connect to the API: ${err.message}. Please try again later.`);
                break;
            }
        }
        
        setIsLoading(false);
    };

    return (
        <div style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
        }}>
            <motion.input
                style={{
                    width: "100%",
                    padding: "12px 15px",
                    fontSize: "16px",
                    border: "1px solid #e1e1e1",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={props.placeholder}
                whileFocus={{ scale: 1.01 }}
            />

            <motion.button
                style={{
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "500",
                    backgroundColor: "#007AFF",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                }}
                onClick={handleSubmit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
            >
                {isLoading ? "Processing..." : props.buttonText}
            </motion.button>

            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        style={{
                            textAlign: "center",
                            color: "#666",
                            marginTop: "10px",
                        }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        Processing your request...
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        style={{
                            padding: "12px",
                            backgroundColor: "#ffebee",
                            color: "#c62828",
                            borderRadius: "8px",
                            marginTop: "10px",
                        }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        {error}
                    </motion.div>
                )}

                {result && (
                    <motion.div
                        style={{
                            marginTop: "20px",
                            padding: "15px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px",
                            whiteSpace: "pre-wrap",
                        }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        {result}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Default props
AIProcessor.defaultProps = {
    placeholder: "Enter your question...",
    buttonText: "Process",
};

// Property Controls
addPropertyControls(AIProcessor, {
    placeholder: {
        type: ControlType.String,
        title: "Input Placeholder",
        defaultValue: "Enter your question...",
    },
    buttonText: {
        type: ControlType.String,
        title: "Button Text",
        defaultValue: "Process",
    },
}); 