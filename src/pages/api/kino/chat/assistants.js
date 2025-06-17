import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import OpenAI from 'openai';

// Correct the path to the .env file by replacing '/.next/server/' with '/src'
dotenv.config({ path: path.resolve(__dirname.replace('/.next/server/', '/src/'), '.env') });

const CHATWOOT_API_BASE_URL = process.env.CHATWOOT_API_BASE_URL || 'https://chat.mashup.services';
const CHATWOOT_API_KEY = process.env.CHATWOOT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_BFNlmB0kXMGfDYLrW3rSCAlG';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const threadStore = {};

async function sendReply(accountId, conversationId, message) {
  try {
    const url = `${CHATWOOT_API_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    await axios.post(
      url,
      {
        content: message,
        message_type: 'outgoing',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_API_KEY,
        },
      }
    );
  } catch (error) {
    console.error('Error sending reply:', error.response?.data || error.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const eventData = req.body;
  if (!eventData || eventData.message_type !== 'incoming' || !eventData.content) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  const conversationId = eventData.conversation.id;
  const userMessage = eventData.content;

  try {
    let threadId = threadStore[conversationId];
    if (!threadId) {
      const thread = await openai.beta.threads.create({
        messages: [
          {
            role: 'user',
            content: `My name is ${eventData.sender.name} my email is ${eventData.sender.email}`,
          },
        ],
      });
      threadId = thread.id;
      threadStore[conversationId] = threadId;
      console.log('New thread created:', threadId);
    } else {
      console.log('Using existing thread:', threadId);
    }

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userMessage,
    });
    console.log('User message added to thread');

    const aiResponse = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: OPENAI_ASSISTANT_ID,
    });
    console.dir(aiResponse, { depth: null });

    let messages = [];
    if (aiResponse.status === 'completed') {
      messages = await openai.beta.threads.messages.list(threadId);
    }

    const assistantMessage = messages.data?.[0]?.content?.[0]?.text?.value;
    if (assistantMessage) {
      await sendReply(1, conversationId, assistantMessage);
      console.log('AI reply sent successfully');
      return res.status(200).json({ success: true });
    } else {
      console.error('No message content found in AI response');
      return res.status(500).json({ error: 'Failed to retrieve AI response.' });
    }
  } catch (error) {
    console.error('Error processing the message:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to process the message.' });
  }
}
