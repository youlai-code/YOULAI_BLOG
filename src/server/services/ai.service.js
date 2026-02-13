const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DOUBAO_IMAGE_API_KEY = process.env.DOUBAO_IMAGE_API_KEY;
const DOUBAO_IMAGE_ENDPOINT = process.env.DOUBAO_IMAGE_ENDPOINT;
const DOUBAO_IMAGE_MODEL = process.env.DOUBAO_IMAGE_MODEL;

const AI_CONFIG = {
    deepseek: {
        name: 'DeepSeek',
        type: 'text',
        available: () => Boolean(DEEPSEEK_API_KEY)
    },
    doubaoImage: {
        name: 'Doubao Image',
        type: 'image',
        available: () => Boolean(DOUBAO_IMAGE_API_KEY && DOUBAO_IMAGE_ENDPOINT && DOUBAO_IMAGE_MODEL)
    }
};

function getAvailableModels() {
    const models = {};
    for (const [key, config] of Object.entries(AI_CONFIG)) {
        models[key] = {
            name: config.name,
            type: config.type,
            available: config.available()
        };
    }
    return models;
}

async function generateMetadata(content) {
    if (!DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY_NOT_SET');
    }

    if (!content) {
        throw new Error('NO_CONTENT');
    }

    console.log('[AI] Calling DeepSeek...');

    const systemPrompt = `
你是一个专业的技术博客助手。请分析用户输入的 Markdown 文章内容，并提取/生成以下元数据。
请严格按照 JSON 格式返回，不要包含 markdown 代码块标记（如 \`\`\`json）。
JSON 结构如下：
{
    "title": "提取或生成一个吸引人的标题",
    "summary": "生成一段80字以内的精炼摘要",
    "tags": "提取1-3个相关技术标签(优先单标签)，首字母大写，用 ' / ' 分隔 (例如: Unity / Shader / C#)"
}
`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: content }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("[AI] DeepSeek API Error:", errText);
        throw new Error(`API_REQUEST_FAILED: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content.trim();

    let cleanJson = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();

    let metaData;
    try {
        metaData = JSON.parse(cleanJson);
    } catch (e) {
        console.error("[AI] JSON Parse Error. AI returned:", aiContent);
        metaData = {
            title: "AI Parsing Error",
            summary: aiContent,
            tags: "ERROR"
        };
    }

    console.log("[AI] DeepSeek response:", metaData);

    return {
        title: metaData.title,
        summary: metaData.summary,
        tags: metaData.tags
    };
}

async function generateImage(prompt, options = {}) {
    if (!DOUBAO_IMAGE_API_KEY || !DOUBAO_IMAGE_ENDPOINT || !DOUBAO_IMAGE_MODEL) {
        throw new Error('DOUBAO_IMAGE_NOT_CONFIGURED');
    }

    if (!prompt) {
        throw new Error('NO_PROMPT');
    }

    console.log('[AI] Calling Doubao Image...');

    const requestBody = {
        model: options.model || DOUBAO_IMAGE_MODEL,
        prompt: prompt,
        sequential_image_generation: options.sequential_image_generation || 'disabled',
        response_format: options.response_format || 'url',
        size: options.size || '1024x1024',
        stream: false,
        watermark: options.watermark !== false
    };

    const response = await fetch(DOUBAO_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DOUBAO_IMAGE_API_KEY}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("[AI] Doubao Image API Error:", errText);
        throw new Error(`IMAGE_API_REQUEST_FAILED: ${response.status}`);
    }

    const data = await response.json();
    console.log("[AI] Doubao Image response received");

    return {
        images: data.data || [],
        model: data.model,
        created: data.created
    };
}

module.exports = {
    generateMetadata,
    generateImage,
    getAvailableModels
};
