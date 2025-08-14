require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const chalk = require('chalk');

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_BASE = 'Your API';

async function getRate(from, to) {
  try {
    const res = await axios.get(`${API_BASE}/latest`, {
      params: { from: from.toUpperCase(), to: to.toUpperCase() },
      timeout: 5000,
    });
    const rate = res.data?.rates?.[to.toUpperCase()];
    if (rate) {
      return { ok: true, rate };
    }
    return { ok: false, error: '💔 نرخ یافت نشد!' };
  } catch (err) {
    return { ok: false, error: `⛔ ${err.message}` };
  }
}

function logInfo(msg) {
  console.log(chalk.cyanBright(`[ℹ️ INFO]`), msg);
}

function logError(msg) {
  console.log(chalk.redBright(`[❌ ERROR]`), msg);
}

bot.start((ctx) => {
  logInfo(`User : ${ctx.from.username || ctx.from.id} Started Bot !`);

  ctx.reply(
    `👋 سلام ${ctx.from.first_name} عزیز!\n` +
    `📊 من می‌تونم نرخ لحظه‌ای ارز رو با کلی جزئیات بهت بدم.\n\n` +
    `برای شروع کافیه یکی از جفت‌های زیر رو انتخاب کنی ⬇️`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🇺🇸 USD → 🇮🇷 IRR', callback_data: 'Q_USD_IRR' }],
          [{ text: '🇪🇺 EUR → 🇮🇷 IRR', callback_data: 'Q_EUR_IRR' }],
          [{ text: '🇺🇸 USD → 🇪🇺 EUR', callback_data: 'Q_USD_EUR' }],
        ],
      },
    }
  );
});


bot.command('price', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 3) {
    return ctx.reply('⚠️ فرمت اشتباه!\nمثال: `/price USD IRR`', { parse_mode: 'Markdown' });
  }

  const [_, from, to] = parts;
  logInfo(`درخواست نرخ: ${from} → ${to} از ${ctx.from.username || ctx.from.id}`);

  const loading = await ctx.reply(`⏳ در حال دریافت نرخ *${from.toUpperCase()} → ${to.toUpperCase()}* ...`, { parse_mode: 'Markdown' });
  const { ok, rate, error } = await getRate(from, to);

  if (!ok) {
    logError(`خطا برای ${from} → ${to}: ${error}`);
    return ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, undefined, `🚫 خطا: ${error}`, { parse_mode: 'Markdown' });
  }

  const formatted = rate.toLocaleString('en-US');
  const msg =
    `💱 *${from.toUpperCase()} → ${to.toUpperCase()}*\n` +
    `💰 نرخ فعلی: *${formatted}*\n` +
    `📅 تاریخ به‌روزرسانی: ${new Date().toLocaleDateString('fa-IR')}`;

  await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, undefined, msg, { parse_mode: 'Markdown' });
  logInfo(`نرخ ${from} → ${to}: ${formatted}`);
});

bot.command('quick', (ctx) => {
  ctx.reply('🔥 جفت‌های محبوب:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇺🇸 USD → 🇮🇷 IRR', callback_data: 'Q_USD_IRR' }],
        [{ text: '🇪🇺 EUR → 🇮🇷 IRR', callback_data: 'Q_EUR_IRR' }],
        [{ text: '🇺🇸 USD → 🇪🇺 EUR', callback_data: 'Q_USD_EUR' }],
      ],
    },
  });
});

bot.on('callback_query', async (ctx) => {
  const map = {
    Q_USD_IRR: ['USD', 'IRR'],
    Q_EUR_IRR: ['EUR', 'IRR'],
    Q_USD_EUR: ['USD', 'EUR'],
  };
  const pair = map[ctx.callbackQuery.data];
  if (!pair) return ctx.answerCbQuery();

  await ctx.answerCbQuery();
  logInfo(`درخواست سریع: ${pair[0]} → ${pair[1]} توسط ${ctx.from.username || ctx.from.id}`);

  const loading = await ctx.reply(`🔍 در حال دریافت نرخ *${pair[0]} → ${pair[1]}* ...`, { parse_mode: 'Markdown' });
  const { ok, rate, error } = await getRate(pair[0], pair[1]);

  if (!ok) {
    logError(`خطا در دکمه سریع ${pair[0]} → ${pair[1]}: ${error}`);
    return ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, undefined, `🚫 خطا: ${error}`, { parse_mode: 'Markdown' });
  }

  const formatted = rate.toLocaleString('en-US');
  const msg =
    `💱 *${pair[0]} → ${pair[1]}*\n` +
    `💰 نرخ فعلی: *${formatted}*\n` +
    `📅 تاریخ به‌روزرسانی: ${new Date().toLocaleDateString('fa-IR')}`;

  await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, undefined, msg, { parse_mode: 'Markdown' });
  logInfo(`نرخ ${pair[0]} → ${pair[1]}: ${formatted}`);
});

bot.launch().then(() => {
  console.log(chalk.greenBright(`🚀 Bot started in polling mode...`));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
