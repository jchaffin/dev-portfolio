'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useElevenLabsRealtime } from '@/hooks/useElevenLabsRealtime';
import { useElevenLabsVoice } from '@/hooks/useElevenLabsVoice';
import { allAgentSets, defaultAgentSetKey } from '@/app/agentConfigs';
import { SessionStatus } from '@/types';

const ElevenLabsVoiceSection = () => {
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('21m00Tcm4TlvDq8ikWAM'); // Rachel
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');
  const [userText, setUserText] = useState('');
  const [currentText, setCurrentText] = useState('');

  const { getVoices } = useElevenLabsVoice({
    apiKey: elevenlabsApiKey,
    defaultVoiceId: selectedVoiceId,
  });

  const {
    status,
    connect,
    disconnect,
    sendUserText,
    isProcessing,
    currentText: processingText,
    clearAudioQueue,
  } = useElevenLabsRealtime({
    elevenlabsApiKey,
    voiceId: selectedVoiceId,
    onConnectionChange: setSessionStatus,
  });

  // Fetch available voices when API key is set
  useEffect(() => {
    if (elevenlabsApiKey) {
      getVoices().then(setAvailableVoices);
    }
  }, [elevenlabsApiKey, getVoices]);

  // Fetch API keys on component mount
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch('/api/get-api-keys');
        const data = await response.json();
        setElevenlabsApiKey(data.elevenlabsApiKey || '');
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      }
    };

    fetchApiKeys();
  }, []);

  const connectToSession = async () => {
    if (!elevenlabsApiKey) {
      alert('Please set your ElevenLabs API key');
      return;
    }

    const fetchEphemeralKey = async (): Promise<string> => {
      const response = await fetch('/api/session');
      const data = await response.json();
      return data.client_secret.value;
    };

    const agents = allAgentSets[defaultAgentSetKey];
    
    await connect({
      getEphemeralKey: fetchEphemeralKey,
      initialAgents: agents,
      extraContext: {
        language: 'en',
        systemLanguage: 'English',
      },
    });
  };

  const handleSendText = () => {
    if (userText.trim()) {
      sendUserText(userText);
      setUserText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          ElevenLabs + OpenAI Realtime Integration
        </h2>
        
        {/* API Key Configuration */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ElevenLabs API Key
          </label>
          <input
            type="password"
            value={elevenlabsApiKey}
            onChange={(e) => setElevenlabsApiKey(e.target.value)}
            placeholder="Enter your ElevenLabs API key"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Voice Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Voice
          </label>
          <select
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableVoices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name} ({voice.labels?.accent || 'Unknown accent'})
              </option>
            ))}
          </select>
        </div>

        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${
              status === 'CONNECTED' ? 'bg-green-500' : 
              status === 'CONNECTING' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-white">
              Status: {status}
            </span>
          </div>
        </div>

        {/* Connection Controls */}
        <div className="mb-6">
          {status === 'DISCONNECTED' ? (
            <button
              onClick={connectToSession}
              disabled={!elevenlabsApiKey}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect to Session
            </button>
          ) : (
            <div className="space-x-4">
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Disconnect
              </button>
              <button
                onClick={clearAudioQueue}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear Audio Queue
              </button>
            </div>
          )}
        </div>

        {/* Text Input */}
        {status === 'CONNECTED' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Send Message
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendText}
                disabled={!userText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="mb-6 p-4 bg-blue-900 rounded-md">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-white">Processing with ElevenLabs...</span>
            </div>
            {processingText && (
              <p className="text-gray-300 mt-2 text-sm">{processingText}</p>
            )}
          </div>
        )}

        {/* Current Text Display */}
        {currentText && (
          <div className="mb-6 p-4 bg-gray-800 rounded-md">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Current Response:</h3>
            <p className="text-white">{currentText}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How it works:</h3>
        <ul className="text-gray-300 space-y-2 text-sm">
          <li>• OpenAI Realtime handles the conversation and generates text responses</li>
          <li>• ElevenLabs converts the text responses to high-quality speech</li>
          <li>• Audio is queued and played automatically</li>
          <li>• You can select from available ElevenLabs voices</li>
          <li>• The system maintains the conversation flow while using ElevenLabs for voice output</li>
        </ul>
      </div>
    </div>
  );
};

export default ElevenLabsVoiceSection;
