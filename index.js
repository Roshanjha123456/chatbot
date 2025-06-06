const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a friendly AI chatbot for a school listing website. Help school principals/managers understand the value of listing their school.

Key Points:
- School listing is FREE right now
- Takes less than 2 minutes to list
- Benefits: 50,000+ monthly visitors, SEO boost, direct parent leads
- No hidden charges

Website: https://www.edustoke.com/
When users ask for website link, platform link, or want to see the website, share this URL.

Contact Information (when asked):
📞 Phone: 8595128367
📧 Email: jha8447632759@gmail.com
📍 Address: Gurugram, Haryana, Edustoke

When users ask for contact details, phone number, email, or address, provide the above information in a friendly way.

Speak in polite Hinglish (Hindi + English). Be warm and conversational.`;

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limiting function
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const userLimit = rateLimitStore.get(ip);

  if (now > userLimit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes("429") && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        success: false,
        error: "Thoda ruk jaiye, bahut fast type kar rahe hain! 😅",
        details: "Rate limit exceeded",
      });
    }

    // Check if user is asking for contact details
    const contactKeywords = [
      "contact",
      "phone",
      "number",
      "email",
      "address",
      "detail",
      "sampark",
      "mobile",
    ];
    const isContactQuery = contactKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isContactQuery) {
      const contactResponse = `Bilkul! Yahan hai humare contact details: 😊

📞 Phone: 8595128367
📧 Email: jha8447632759@gmail.com  
📍 Address: Gurugram, Haryana, Edustoke

Koi bhi doubt ho ya school listing ke baare mein aur jaanna ho toh call kar sakte hain! 🙏`;

      return res.json({
        success: true,
        message: contactResponse,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user is asking for website link
    const websiteKeywords = [
      "website",
      "link",
      "platform",
      "site",
      "url",
      "dekho",
      "dikhao",
      "kahan",
      "where",
    ];
    const isWebsiteQuery = websiteKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isWebsiteQuery) {
      const websiteResponse = `Yahan dekh sakte hain humara platform: 🌐

🔗 **Website:** https://www.edustoke.com/

Yahan aap:
✅ 25,000+ schools browse kar sakte hain
✅ FREE mein apna school list kar sakte hain  
✅ Direct parents se connect ho sakte hain

Website par jakar explore kariye! 🚀`;

      return res.json({
        success: true,
        message: websiteResponse,
        timestamp: new Date().toISOString(),
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 500,
      },
    });

    const limitedHistory = conversationHistory.slice(-4);

    let prompt = SYSTEM_PROMPT + "\n\n";

    if (limitedHistory.length > 0) {
      limitedHistory.forEach((msg) => {
        prompt += `${msg.role === "user" ? "User" : "Bot"}: ${msg.content}\n`;
      });
    }

    prompt += `\nUser: ${message}\nBot:`;

    // Generate response with retry logic
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    });

    const response = await result.response;
    const botMessage = response.text();

    res.json({
      success: true,
      message: botMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Gemini AI Error:", error);

    // Handle specific error types
    if (error.message.includes("429")) {
      return res.status(429).json({
        success: false,
        error: "Server busy hai, 30 seconds baad try karein! 🙏",
        details: "API quota exceeded",
      });
    }

    res.status(500).json({
      success: false,
      error: "Sorry, technical issue hai. Thoda wait karke try karein.",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "School Listing Chatbot Server is running!",
    timestamp: new Date().toISOString(),
  });
});

// Default greeting endpoint
app.get("/api/greeting", (req, res) => {
  const greeting = `Namaste ji! 

Apne school ki visibility badhana chahte hain? 

Humare platform par **FREE** listing kariye:
✅ 50,000+ parents ko reach
✅ Google pe better ranking  
✅ Direct admission leads

Sirf 2 minutes lagenge! 

Website dekhiye: https://www.edustoke.com/ 🌐
Contact details chahiye? Bas puchiye! 📞`;

  res.json({
    success: true,
    message: greeting,
    timestamp: new Date().toISOString(),
  });
});

// Contact details endpoint
app.get("/api/contact", (req, res) => {
  const contactInfo = `📞 **Phone:** 8595128367
📧 **Email:** jha8447632759@gmail.com  
📍 **Address:** Gurugram, Haryana, Edustoke

Koi bhi sawal ho toh call kariye! `;

  res.json({
    success: true,
    message: contactInfo,
    timestamp: new Date().toISOString(),
  });
});

// Website link endpoint
app.get("/api/website", (req, res) => {
  const websiteInfo = `🌐 **Website:** https://www.edustoke.com/

Yahan aap dekh sakte hain:
✅ 25,000+ schools ki listing
✅ FREE school registration  
✅ Parent leads aur inquiries

Platform explore kariye! 🚀`;

  res.json({
    success: true,
    message: websiteInfo,
    url: "https://www.edustoke.com/",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/api/health`);
  console.log(`📞 Contact: http://localhost:${PORT}/api/contact`);
  console.log(`🌐 Website: http://localhost:${PORT}/api/website`);
});

module.exports = app;
