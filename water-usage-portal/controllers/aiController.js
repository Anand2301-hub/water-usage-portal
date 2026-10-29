
const W = require('../models/WaterUsage');
const G = require('../models/ConservationGoal');

const CATS = W.CATEGORIES || [
  'Bathing',
  'Laundry',
  'Cooking',
  'Drinking',
  'Cleaning',
  'Gardening',
  'Other'
];

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_MODEL =
  process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

// --------------------------------------------------
// 1. Anthropic API helper
// --------------------------------------------------

async function ask(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: API_MODEL,
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || 'Anthropic API request failed'
    );
  }

  return data.content
    ?.filter(item => item.type === 'text')
    .map(item => item.text)
    .join('\n')
    .trim() || '';
}

// --------------------------------------------------
// 2. Water usage estimation
// --------------------------------------------------

function estimate(category, activity, quantity) {
  const rates = {
    Bathing: 60,
    Laundry: 50,
    Cooking: 10,
    Drinking: 3,
    Cleaning: 15,
    Gardening: 25,
    Other: 10
  };

  const normalizedCategory = CATS.find(
    item => item.toLowerCase() ===
      String(category || '').toLowerCase()
  ) || 'Other';

  const amount = Number(quantity) || 1;
  const rate = rates[normalizedCategory] || 10;

  return {
    category: normalizedCategory,
    activity: String(activity || normalizedCategory),
    quantity: amount,
    estimatedLitres: Math.max(0, amount * rate),
    estimationMethod: 'rule-based'
  };
}

// --------------------------------------------------
// 3. English-only water coach fallback
// --------------------------------------------------

function coachFallback(question, ctx) {
  const q = String(question || '').toLowerCase();

  const categories = ctx.last14DaysByCategory || [];
  const dailyData = ctx.last14DaysDaily || [];
  const target = Number(ctx.dailyTargetLitres) || 150;

  const totalWater = categories.reduce(
    (sum, item) => sum + Number(item.totalLitres || 0),
    0
  );

  const averageDaily = totalWater / 14;

  const highestCategory = categories.length
    ? categories.reduce((a, b) =>
        Number(a.totalLitres || 0) >
        Number(b.totalLitres || 0) ? a : b
      )
    : null;

  if (
    q.includes('garden') ||
    q.includes('plant') ||
    q.includes('irrigation')
  ) {
    return 'Water plants early in the morning or in the evening to reduce evaporation. Use drip irrigation where possible, and reuse suitable household water for gardening.';
  }

  if (
    q.includes('bath') ||
    q.includes('shower')
  ) {
    return 'Reduce shower time by two minutes and turn off the tap while soaping. Using a bucket instead of a long shower can also help reduce water consumption.';
  }

  if (
    q.includes('laundry') ||
    q.includes('washing machine') ||
    q.includes('washing clothes')
  ) {
    return 'Run your washing machine only with a full load. Choose an eco-friendly cycle when available, and avoid unnecessary washing to save water.';
  }

  if (
    q.includes('leak') ||
    q.includes('tap') ||
    q.includes('toilet')
  ) {
    return 'Check taps, pipes, and toilet flushes for leaks. Repairing leaks promptly can prevent unnecessary water waste.';
  }

  if (
    q.includes('save water') ||
    q.includes('reduce water') ||
    q.includes('water saving') ||
    q.includes('tips')
  ) {
    return 'Start by fixing leaks, shortening showers, turning off taps while brushing, and running appliances with full loads. Track your daily usage to identify where you can save the most water.';
  }

  if (
    q.includes('average') ||
    q.includes('daily usage') ||
    q.includes('how much water') ||
    q.includes('usage')
  ) {
    return `Your recorded water usage over the last 14 days is approximately ${averageDaily.toFixed(1)} litres per day, based on the available category totals. Your daily target is ${target} litres. Compare your actual usage with this target to identify opportunities to save water.`;
  }

  if (
    q.includes('highest') ||
    q.includes('most water') ||
    q.includes('category')
  ) {
    if (highestCategory) {
      return `Your highest recorded water-use category is ${highestCategory._id}, with approximately ${Number(highestCategory.totalLitres || 0).toFixed(1)} litres over the last 14 days. Focus on reducing consumption in this category first.`;
    }

    return 'There is not enough recorded usage data to identify your highest water-use category yet. Continue logging your daily water consumption to receive more specific recommendations.';
  }

  if (
    q.includes('goal') ||
    q.includes('target') ||
    q.includes('limit')
  ) {
    return `Your daily water-use target is ${target} litres. Review your usage regularly, identify high-consumption activities, and make small changes to stay within your target.`;
  }

  if (
    q.includes('today') ||
    q.includes('daily report') ||
    q.includes('daily total')
  ) {
    if (dailyData.length) {
      return `Your recent usage records contain ${dailyData.length} daily data entries, with approximately ${totalWater.toFixed(1)} litres recorded across the available category totals for the last 14 days. Compare your daily records with your ${target}-litre target to track progress.`;
    }

    return 'No recent daily usage records are available. Start recording your water consumption to receive personalized recommendations.';
  }

  return 'I can help you reduce water consumption. Ask me about your average usage, highest-use category, daily target, bathing habits, laundry, gardening, or practical water-saving tips.';
}

// --------------------------------------------------
// 4. Parse water usage information
// --------------------------------------------------

exports.parse = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid text description.'
      });
    }

    const prompt = `
Extract water usage information from the following text.

Available categories: ${CATS.join(', ')}.

Return only valid JSON with these fields:
{
  "category": "category name",
  "activity": "short activity description",
  "quantity": number,
  "estimatedLitres": number
}

Use a reasonable estimate if the exact water quantity is not provided.
Do not include Markdown or explanations.

Text: ${text}
`;

    let result;

    try {
      const answer = await ask(prompt);
      const cleaned = answer
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      result = JSON.parse(cleaned);

      if (
        !result.category ||
        !Number.isFinite(Number(result.estimatedLitres))
      ) {
        throw new Error('Invalid parsed result');
      }

      result.source = 'ai';
    } catch (error) {
      const lower = text.toLowerCase();

      let category = 'Other';

      const matches = {
        Bathing: ['bath', 'shower'],
        Laundry: ['laundry', 'washing clothes', 'washing machine'],
        Cooking: ['cook', 'cooking', 'food preparation'],
        Drinking: ['drink', 'drinking'],
        Cleaning: ['clean', 'mop'],
        Gardening: ['garden', 'plant', 'watering plants']
      };

      for (const [name, keywords] of Object.entries(matches)) {
        if (keywords.some(keyword => lower.includes(keyword))) {
          category = name;
          break;
        }
      }

      const quantityMatch = text.match(/\d+(\.\d+)?/);
      const quantity = quantityMatch
        ? Number(quantityMatch[0])
        : 1;

      result = {
        ...estimate(category, text, quantity),
        source: 'rules'
      };
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Water usage parse error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to process water usage information.'
    });
  }
};

// --------------------------------------------------
// 5. AI Water Coach
// --------------------------------------------------

exports.coach = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a question.'
      });
    }

    // Support common authentication middleware patterns.
    const userId =
      req.user?._id ||
      req.user?.id ||
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to use the Water Coach.'
      });
    }

    const since = new Date();
    since.setDate(since.getDate() - 14);

    // Retrieve water usage grouped by category.
    const last14DaysByCategory = await W.aggregate([
      {
        $match: {
          userId: userId,
          usageDate: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$category',
          totalLitres: {
            $sum: '$quantityLitres'
          }
        }
      },
      {
        $sort: {
          totalLitres: -1
        }
      }
    ]);

    // Retrieve water usage grouped by day.
    const last14DaysDaily = await W.aggregate([
      {
        $match: {
          userId: userId,
          usageDate: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$usageDate'
            }
          },
          totalLitres: {
            $sum: '$quantityLitres'
          }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    // Retrieve the user's water conservation goal.
    const goal = await G.findOne({
      userId: userId
    }).lean();

    const dailyTargetLitres = Number(
      goal?.targetDailyLitres
    ) || 150;

    const ctx = {
      last14DaysByCategory,
      last14DaysDaily,
      dailyTargetLitres
    };

    let answer;
    let source = 'rules';

    // Try the API first; use the fallback if it fails.
    try {
      const prompt = `
You are a practical Water Conservation Coach.

Answer in English only.
Give specific, actionable, easy-to-understand advice.
Use the user's recorded data when relevant.
Do not invent usage statistics.
Keep the answer concise.

User's question:
${question}

Daily water target:
${dailyTargetLitres} litres

Category usage over the last 14 days:
${JSON.stringify(last14DaysByCategory)}

Daily usage records:
${JSON.stringify(last14DaysDaily)}

Respond directly to the user's question.
`;

      answer = await ask(prompt);

      if (!answer) {
        throw new Error('The AI returned an empty response');
      }

      source = 'ai';
    } catch (error) {
      console.error(
        'Water Coach API unavailable:',
        error.message
      );

      answer = coachFallback(question, ctx);
    }

    return res.json({
      success: true,
      answer,
      source,
      data: {
        dailyTargetLitres,
        last14DaysByCategory,
        last14DaysDaily
      }
    });
  } catch (error) {
    console.error('Water Coach error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to generate water-saving advice.'
    });
  }
};
