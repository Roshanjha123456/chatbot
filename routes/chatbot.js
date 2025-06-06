// const express = require('express');
// const OpenAI = require('openai');
// const systemPrompts = require('../config/ prompts');
// const router = express.Router();
// const dotenv = require('dotenv');

// // Load environment variables
// dotenv.config();
// // Initialize OpenAI with updated syntax
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // Validation middleware
// const validateChatRequest = (req, res, next) => {
//   const { messages } = req.body;

//   // Check if messages exist and is an array
//   if (!messages || !Array.isArray(messages) || messages.length === 0) {
//     return res.status(400).json({ 
//       error: 'Valid messages array is required',
//       example: {
//         messages: [
//           { role: 'user', content: 'Hello' }
//         ]
//       }
//     });
//   }

//   // Validate message structure
//   const isValidMessages = messages.every(msg => 
//     msg.role && 
//     msg.content && 
//     typeof msg.content === 'string' &&
//     ['user', 'assistant', 'system'].includes(msg.role)
//   );
  
//   if (!isValidMessages) {
//     return res.status(400).json({ 
//       error: 'Invalid message format. Each message must have role and content',
//       example: {
//         role: 'user',
//         content: 'Your message here'
//       }
//     });
//   }

//   // Limit message history to prevent token overflow
//   if (messages.length > 20) {
//     req.body.messages = messages.slice(-20);
//   }

//   // Check message length
//   const totalLength = messages.reduce((acc, msg) => acc + msg.content.length, 0);
//   if (totalLength > 10000) {
//     return res.status(400).json({ 
//       error: 'Messages too long. Please keep conversation concise.' 
//     });
//   }

//   next();
// };

// // Main chatbot endpoint
// router.post('/', validateChatRequest, async (req, res) => {
//   const { messages } = req.body;

//   try {
//     console.log(`📨 Received ${messages.length} messages from ${req.ip}`);

//     const completion = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: systemPrompts.edubot
//         },
//         ...messages,
//       ],
//       temperature: 0.8,
//       max_tokens: 300, // Limit response length
//       top_p: 0.9,
//       frequency_penalty: 0.1,
//       presence_penalty: 0.1,
//     });

//     const reply = completion.choices[0].message.content;
    
//     console.log(`✅ Successfully generated response (${reply.length} chars)`);
    
//     res.json({ 
//       reply,
//       timestamp: new Date().toISOString(),
//       model: 'gpt-3.5-turbo'
//     });

//   } catch (error) {
//     console.error('❌ OpenAI Error:', error.message);
    
//     // Handle specific OpenAI errors
//     if (error.status === 429) {
//       return res.status(429).json({ 
//         error: 'Rate limit exceeded. Please try again in a moment.',
//         retryAfter: '60 seconds'
//       });
//     }
    
//     if (error.status === 401) {
//       console.error('🔑 API Key authentication failed');
//       return res.status(500).json({ 
//         error: 'AI service temporarily unavailable. Please try again later.' 
//       });
//     }
    
//     if (error.status === 400) {
//       return res.status(400).json({ 
//         error: 'Invalid request. Please check your message format.' 
//       });
//     }
    
//     if (error.code === 'context_length_exceeded') {
//       return res.status(400).json({ 
//         error: 'Conversation too long. Please start a new conversation.' 
//       });
//     }

//     // Generic error response
//     res.status(500).json({ 
//       error: 'AI service is temporarily unavailable. Please try again later.',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// // Get bot info endpoint
// router.get('/info', (req, res) => {
//   res.json({
//     name: 'EduBot',
//     version: '1.0.0',
//     description: 'AI assistant for Edustoke school onboarding',
//     capabilities: [
//       'School information collection',
//       'Hinglish conversations',
//       'Objection handling',
//       'Lead qualification'
//     ],
//     limits: {
//       maxMessages: 20,
//       maxTokens: 300,
//       rateLimit: '20 requests per minute'
//     }
//   });
// });

// module.exports = router;