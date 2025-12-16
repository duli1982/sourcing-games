
import React, { useState, useRef, useEffect } from 'react';
import { getGeminiResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

const CoachPage: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            sender: 'coach',
            text: "Hello! I'm your AI Sourcing Coach, powered by Gemini. Ask me for advice on sourcing strategies, how to improve a search string, or anything else you need to win the league!"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const userInput = input.trim();
        if (!userInput || isLoading) return;

        const newMessages: ChatMessage[] = [...messages, { sender: 'user', text: userInput }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setMessages(prev => [...prev, { sender: 'coach', text: '...', isTyping: true }]);

        const prompt = `You are a helpful and encouraging AI Sourcing Coach for recruiters participating in a competition. A user has asked you the following question. Provide a concise, helpful, and friendly answer. Question: "${userInput}"`;

        const responseText = await getGeminiResponse(prompt);
        
        setMessages(prev => {
            const updatedMessages = [...prev];
            const typingMessageIndex = updatedMessages.findIndex(m => m.isTyping);
            if (typingMessageIndex !== -1) {
                updatedMessages[typingMessageIndex] = { sender: 'coach', text: responseText };
            }
            return updatedMessages;
        });

        setIsLoading(false);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">AI Sourcing Coach</h2>
            <div className="bg-gray-800 rounded-lg shadow-xl h-[70vh] flex flex-col">
                <div ref={chatBoxRef} id="chatBox" className="chat-box flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-lg ${msg.sender === 'user' ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                                {msg.isTyping ? (
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                    </div>
                                ) : (
                                    <p>{msg.text}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-gray-700 border-t border-gray-600">
                    <form id="coachForm" className="flex items-center space-x-2" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-gray-600 border border-gray-500 rounded-full px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Ask your coach..."
                            disabled={isLoading}
                        />
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold p-2.5 rounded-full disabled:bg-gray-500" disabled={isLoading}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CoachPage;
